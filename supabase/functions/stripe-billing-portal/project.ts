import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

import { AuthorizationError, NotFoundError } from '../_shared/errors.ts'

interface Project {
	id: string
	stripe_customer_id: string
}

export async function findProject(
	supabaseAdmin: SupabaseClient,
	supabaseUser: SupabaseClient,
	projectId: string
): Promise<Project> {
	// Step 1: Try to find existing project
	const { data: project } = await supabaseAdmin
		.from('projects')
		.select('id,stripe_customer_id')
		.eq('id', projectId)
		.maybeSingle()

	if (!project) {
		throw new NotFoundError(`Project with ID "${projectId}" not found`)
	}

	// Check if project has a Stripe customer ID
	if (!project.stripe_customer_id) {
		throw new NotFoundError(
			`Project "${projectId}" does not have a Stripe customer. Please upgrade to a paid plan first.`
		)
	}

	// SECURITY: Verify user has access to existing project using RPC
	// Use authenticated user client (not service role) for auth.uid() context
	const { data: canManage, error } = await supabaseUser.rpc('can_manage_project', {
		project_id_param: project.id
	})

	if (error || !canManage) {
		throw new AuthorizationError(
			'Access denied: You do not have permission to manage billing for this project'
		)
	}

	console.log(`✅ Project found: ${project.id}`)
	return project
}
