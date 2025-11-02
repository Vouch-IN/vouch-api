import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { authenticateUser, initSupabaseClients, verifyProjectAccess } from '../_shared/auth.ts'
import { handleCors } from '../_shared/cors.ts'
import { generateInviteEmail, sendEmail } from '../_shared/email.ts'
import { errorResponse, handleError, successResponse } from '../_shared/errors.ts'
import { isValidEmail, isValidRole, isValidUUID, validateRequired } from '../_shared/validation.ts'

const SITE_URL = Deno.env.get('SITE_URL')!

Deno.serve(async (req) => {
	// Handle CORS preflight
	if (req.method === 'OPTIONS') {
		return handleCors()
	}

	// Only allow POST
	if (req.method !== 'POST') {
		return errorResponse('Method not allowed', 405)
	}

	try {
		// Authenticate user
		const { user, supabaseClient } = await authenticateUser(req)
		const { supabaseAdmin } = initSupabaseClients(req.headers.get('Authorization'))

		// Parse and validate request
		const body = await req.json()
		validateRequired(body, ['email', 'projectId', 'role'])

		const { email, projectId, role } = body

		// Validate input formats
		if (!isValidEmail(email)) {
			return errorResponse('Invalid email format')
		}
		if (!isValidUUID(projectId)) {
			return errorResponse('Invalid project ID')
		}
		if (!isValidRole(role)) {
			return errorResponse('Invalid role. Must be: admin, member, or viewer')
		}

		// Verify user can manage this project
		await verifyProjectAccess(supabaseClient, projectId, 'invite team members')

		// Check team member limit
		const { data: activeEntitlements } = await supabaseAdmin
			.from('active_entitlements')
			.select('team_limit')
			.eq('project_id', projectId)
			.single()

		const maxMembers = activeEntitlements?.team_limit ?? 1

		const { count: currentCount } = await supabaseAdmin
			.from('project_members')
			.select('*', { count: 'exact', head: true })
			.eq('project_id', projectId)

		if ((currentCount ?? 0) >= maxMembers) {
			return errorResponse(`Team member limit (${maxMembers}) reached. Please upgrade your plan.`)
		}

		// Get or create user by email
		const { data: existingUsers } = await supabaseAdmin.rpc('get_user_id_by_email', { email })

		let userId: string
		if (existingUsers && existingUsers.length > 0) {
			userId = existingUsers[0].id
		} else {
			// Create new user account
			const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
				email,
				email_confirm: false
			})

			if (createError) {
				throw new Error(`Failed to create user: ${createError.message}`)
			}

			userId = newUser.user.id
		}

		// Check if user is already a member
		const { data: existingMember } = await supabaseAdmin
			.from('project_members')
			.select('id')
			.eq('project_id', projectId)
			.eq('user_id', userId)
			.maybeSingle()

		if (existingMember) {
			return errorResponse('User is already a member of this project')
		}

		// Add to project_members
		const { error: memberError } = await supabaseAdmin.from('project_members').insert({
			user_id: userId,
			project_id: projectId,
			role,
			invited_by: user.id
		})

		if (memberError) {
			throw new Error(`Failed to add member: ${memberError.message}`)
		}

		// Get project details for email
		const { data: project } = await supabaseAdmin
			.from('projects')
			.select('name, slug')
			.eq('id', projectId)
			.single()

		if (!project) {
			throw new Error('Project not found')
		}

		// Send invite email
		const inviteLink = `${SITE_URL}/dashboard/projects/${project.slug}/accept-invite`
		const emailHtml = generateInviteEmail({
			inviterEmail: user.email!,
			projectName: project.name,
			role,
			inviteLink
		})

		try {
			await sendEmail({
				to: email,
				subject: `You've been invited to join ${project.name} on Vouch`,
				html: emailHtml
			})
		} catch (emailError) {
			// Don't fail the whole operation if email fails
			console.error('Failed to send invite email:', emailError)
		}

		return successResponse({
			success: true,
			message: 'Team member invited successfully'
		})
	} catch (error) {
		return handleError(error)
	}
})
