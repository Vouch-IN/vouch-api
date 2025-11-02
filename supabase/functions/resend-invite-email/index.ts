import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { authenticateUser, initSupabaseClients, verifyProjectAccess } from '../_shared/auth.ts'
import { handleCors } from '../_shared/cors.ts'
import { generateInviteEmail, sendEmail } from '../_shared/email.ts'
import { errorResponse, handleError, successResponse } from '../_shared/errors.ts'
import { isValidUUID, validateRequired } from '../_shared/validation.ts'

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
		validateRequired(body, ['memberId', 'projectId'])

		const { memberId, projectId } = body

		// Validate input formats
		if (!isValidUUID(memberId)) {
			return errorResponse('Invalid member ID')
		}
		if (!isValidUUID(projectId)) {
			return errorResponse('Invalid project ID')
		}

		// Verify user can manage this project
		await verifyProjectAccess(supabaseClient, projectId, 'resend invites')

		// Get member details
		const { data: member } = await supabaseAdmin
			.from('project_members')
			.select('*, user:users!project_members_user_id_fkey(email)')
			.eq('project_id', projectId)
			.eq('user_id', memberId)
			.single()

		if (!member) {
			return errorResponse('Member not found', 404)
		}

		// Check if already accepted
		if (member.accepted_at) {
			return errorResponse('Member has already accepted the invite')
		}

		// Get project details
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
			role: member.role,
			inviteLink
		})

		await sendEmail({
			to: member.user?.email,
			subject: `Reminder: You've been invited to join ${project.name} on Vouch`,
			html: emailHtml
		})

		return successResponse({
			success: true,
			message: 'Invite email resent successfully'
		})
	} catch (error) {
		return handleError(error)
	}
})
