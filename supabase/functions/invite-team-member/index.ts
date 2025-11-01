// supabase/functions/invite-team-member/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { createClient } from 'jsr:@supabase/supabase-js@2'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SITE_URL = Deno.env.get('SITE_URL')
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const corsHeaders = {
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
	'Access-Control-Allow-Origin': '*'
}
Deno.serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response('ok', {
			headers: corsHeaders
		})
	}
	if (req.method !== 'POST') {
		return new Response('Method not allowed', {
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json'
			},
			status: 405
		})
	}
	try {
		const authHeader = req.headers.get('Authorization')
		if (!authHeader) {
			return new Response(
				JSON.stringify({
					error: 'Missing authorization header'
				}),
				{
					headers: {
						...corsHeaders,
						'Content-Type': 'application/json'
					},
					status: 401
				}
			)
		}
		const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
			global: {
				headers: {
					Authorization: authHeader
				}
			}
		})
		const {
			data: { user },
			error: userError
		} = await supabaseClient.auth.getUser()
		if (userError || !user) {
			return new Response(
				JSON.stringify({
					error: 'Unauthorized'
				}),
				{
					headers: {
						...corsHeaders,
						'Content-Type': 'application/json'
					},
					status: 401
				}
			)
		}
		const { email, projectId, role } = await req.json()
		// Check authorization
		const { data: isOwner } = await supabaseClient.rpc('is_project_owner', {
			project_id_param: projectId
		})
		const { data: isAdmin } = await supabaseClient.rpc('is_project_admin', {
			project_id_param: projectId
		})
		if (!isOwner && !isAdmin) {
			return new Response(
				JSON.stringify({
					error: 'Forbidden'
				}),
				{
					headers: {
						...corsHeaders,
						'Content-Type': 'application/json'
					},
					status: 403
				}
			)
		}
		// Check team member limit
		const { data: activeEntitlements } = await supabaseAdmin
			.from('active_entitlements')
			.select('team_limit')
			.eq('project_id', projectId)
			.single()
		const maxMembers = activeEntitlements?.team_limit ?? 1
		const { count: currentCount } = await supabaseAdmin
			.from('project_members')
			.select('*', {
				count: 'exact',
				head: true
			})
			.eq('project_id', projectId)
		if ((currentCount ?? 0) >= maxMembers) {
			return new Response(
				JSON.stringify({
					error: `Team member limit (${maxMembers}) reached`
				}),
				{
					headers: {
						...corsHeaders,
						'Content-Type': 'application/json'
					},
					status: 400
				}
			)
		}
		// Get or create user
		const { data: existingUsers } = await supabaseAdmin.rpc('get_user_id_by_email', {
			email
		})
		let userId
		if (existingUsers && existingUsers.length > 0) {
			userId = existingUsers[0].id
		} else {
			const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
				email,
				email_confirm: false
			})
			if (createError) {
				return new Response(
					JSON.stringify({
						error: createError.message
					}),
					{
						headers: {
							...corsHeaders,
							'Content-Type': 'application/json'
						},
						status: 400
					}
				)
			}
			userId = newUser.user.id
		}
		// Add to project_members
		const { error: memberError } = await supabaseAdmin.from('project_members').insert({
			invited_by: user.id,
			project_id: projectId,
			role,
			user_id: userId
		})
		if (memberError) {
			return new Response(
				JSON.stringify({
					error: memberError.message
				}),
				{
					headers: {
						...corsHeaders,
						'Content-Type': 'application/json'
					},
					status: 400
				}
			)
		}
		// Get project name
		const { data: project } = await supabaseAdmin
			.from('projects')
			.select('name,slug')
			.eq('id', projectId)
			.single()
		const inviteLink = `${SITE_URL}/dashboard/projects/${project?.slug}/accept-invite`
		// Send invite email via Resend
		const emailRes = await fetch('https://api.resend.com/emails', {
			body: JSON.stringify({
				from: 'noreply@vouch.expert',
				html: `
					<h2>You're invited!</h2>
					<p>${user.email} invited you to join ${project?.name} as a ${role}.</p>
					<a href="${inviteLink}" style="padding: 10px 20px; background: #000; color: #fff; text-decoration: none; border-radius: 5px; display: inline-block;">
						Accept Invite
					</a>
				`,
				subject: `You've been invited to join ${project?.name} on Vouch`,
				to: email
			}),
			headers: {
				Authorization: `Bearer ${RESEND_API_KEY}`,
				'Content-Type': 'application/json'
			},
			method: 'POST'
		})
		if (!emailRes.ok) {
			console.error('Failed to send email:', await emailRes.text())
		}
		return new Response(
			JSON.stringify({
				success: true
			}),
			{
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json'
				},
				status: 200
			}
		)
	} catch (error) {
		return new Response(
			JSON.stringify({
				error: error.message
			}),
			{
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json'
				},
				status: 500
			}
		)
	}
})
