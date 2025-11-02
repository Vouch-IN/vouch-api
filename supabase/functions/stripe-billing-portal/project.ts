import { AuthorizationError, NotFoundError } from '../_shared/errors.ts'

export async function findProject(supabaseAdmin, supabaseUser, projectId) {
	// Step 1: Try to find existing project
	const { data: project } = await supabaseAdmin
		.from('projects')
		.select('id,stripe_customer_id')
		.eq('id', projectId)
		.maybeSingle()

	if (!project) {
		throw new NotFoundError('Not Found: The project with id "' + projectId + '" was found.')
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
