import { createClient as createSupClient, type SupabaseClient as SupClient } from '@supabase/supabase-js'

import type { Database } from '../types'

export type SupabaseClient = SupClient<Database>

export function createClient(env: Env) {
	return createSupClient<Database>(env.SUPABASE_URL, env.SUPABASE_KEY, {
		auth: {
			autoRefreshToken: false,
			detectSessionInUrl: false,
			persistSession: false
		}
	})
}
