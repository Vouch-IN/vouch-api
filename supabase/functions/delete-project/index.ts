import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { createClient } from 'jsr:@supabase/supabase-js@2'

import {
	deleteProjectCascade,
	verifyProjectOwnership
} from './delete-project.ts'
import { AuthenticationError, handleError } from './errors.ts'
import { validateRequest } from './validations.ts'

const supabaseAdmin = createClient(
	Deno.env.get('SUPABASE_URL'),
	Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
)
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
	try {
		// Authenticate user
		const authHeader = req.headers.get('Authorization')
		if (!authHeader) {
			throw new AuthenticationError('Missing authorization header')
		}
		const supabaseClient = createClient(
			Deno.env.get('SUPABASE_URL'),
			Deno.env.get('SUPABASE_ANON_KEY'),
			{
				global: {
					headers: {
						Authorization: authHeader
					}
				}
			}
		)
		const {
			data: { user },
			error: userError
		} = await supabaseClient.auth.getUser()
		if (userError || !user) {
			throw new AuthenticationError('Unauthorized')
		}
		// Parse and validate request
		const body = await req.json()
		const request = validateRequest(body)
		// Verify ownership
		const project = await verifyProjectOwnership(supabaseAdmin, request.id, user.id)
		// Delete project (transactional)
		await deleteProjectCascade(supabaseAdmin, request.id)
		console.log(`✅ Project ${request.id} deleted`)
		const response = {
			message: `${project.name} has been deleted`,
			success: true
		}
		return new Response(JSON.stringify(response), {
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json'
			},
			status: 200
		})
	} catch (error) {
		return handleError(error)
	}
})
