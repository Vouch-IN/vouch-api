import { createClient } from 'jsr:@supabase/supabase-js@2'

/**
 * Initialize Supabase clients
 */
export function initSupabaseClients(authHeader: string | null) {
	const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
	const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
	const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

	const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

	const supabaseClient = authHeader
		? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
				global: {
					headers: {
						Authorization: authHeader
					}
				}
		  })
		: null

	return { supabaseAdmin, supabaseClient }
}

/**
 * Authenticate user from request
 * @throws {Error} if authentication fails
 */
export async function authenticateUser(req: Request) {
	const authHeader = req.headers.get('Authorization')
	if (!authHeader) {
		throw new Error('Missing authorization header')
	}

	const { supabaseClient } = initSupabaseClients(authHeader)
	if (!supabaseClient) {
		throw new Error('Failed to initialize Supabase client')
	}

	const {
		data: { user },
		error: userError
	} = await supabaseClient.auth.getUser()

	if (userError || !user) {
		throw new Error('Unauthorized')
	}

	return { user, supabaseClient }
}

/**
 * Verify user can manage project (is owner or admin)
 * Uses the existing can_manage_project RPC
 */
export async function verifyProjectAccess(
	supabaseClient: any,
	projectId: string,
	action: string = 'manage this project'
) {
	const { data: canManage, error } = await supabaseClient.rpc('can_manage_project', {
		project_id_param: projectId
	})

	if (error || !canManage) {
		throw new Error(`Access denied: You do not have permission to ${action}`)
	}

	return true
}
