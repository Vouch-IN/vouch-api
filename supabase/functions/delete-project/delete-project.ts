import { AuthorizationError, NotFoundError } from './errors.ts';

export async function deleteProjectCascade(supabaseAdmin, projectId) {
	console.log(`🗑️ Deleting project: ${projectId}`);
	// Call Postgres function (transactional!)
	const { data: result, error: deleteError } = await supabaseAdmin.rpc('delete_project_cascade', {
		project_id_param: projectId
	});
	if (deleteError) {
		console.error('Delete error:', deleteError);
		throw new Error('Failed to delete project');
	}
	return result;
}
export async function verifyProjectOwnership(supabaseAdmin, projectId, userId) {
	const { data: project, error } = await supabaseAdmin.from('projects').select('name, owner_id').eq('id', projectId).is('deleted_at', null).single();
	if (error || !project) {
		throw new NotFoundError('Project not found');
	}
	if (project.owner_id !== userId) {
		throw new AuthorizationError('Only the project owner can delete this project');
	}
	return {
		name: project.name
	};
}
