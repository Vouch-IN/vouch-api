/**
 * Shared CORS headers for all Supabase Edge Functions
 */
export const corsHeaders = {
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
	'Access-Control-Allow-Origin': '*',
	'Content-Type': 'application/json'
}

/**
 * Handle OPTIONS preflight requests
 */
export function handleCors() {
	return new Response('ok', { headers: corsHeaders })
}
