import slugify from 'slugify'

import { AuthorizationError, ValidationError } from '../_shared/errors.ts'

export async function findOrCreateProject(
	supabaseAdmin,
	supabaseUser,
	ownerId,
	projectName,
	projectId = null,
	projectSlug = null
) {
	// Step 1: Try to find existing project
	let existingProject = null

	if (projectId) {
		const { data } = await supabaseAdmin
			.from('projects')
			.select('*')
			.eq('id', projectId)
			.maybeSingle()
		existingProject = data
	}

	if (!existingProject && projectSlug) {
		const { data } = await supabaseAdmin
			.from('projects')
			.select('*')
			.eq('slug', projectSlug)
			.maybeSingle()
		existingProject = data
	}

	if (existingProject) {
		// SECURITY: Verify user has access to existing project using RPC
		// Use authenticated user client (not service role) for auth.uid() context
		const { data: canManage, error } = await supabaseUser.rpc('can_manage_project', {
			project_id_param: existingProject.id
		})

		if (error || !canManage) {
			throw new AuthorizationError(
				'Access denied: You do not have permission to manage billing for this project'
			)
		}

		console.log(`✅ Project found: ${existingProject.id}`)
		return existingProject
	}

	// Step 2: Project doesn't exist, create it
	// Generate slug if not provided
	const finalSlug = projectSlug || slugify(projectName, { lowercase: true })

	// Check if generated slug is unique
	const { data: slugExists } = await supabaseAdmin
		.from('projects')
		.select('id')
		.eq('slug', finalSlug)
		.maybeSingle()

	if (slugExists) {
		throw new ValidationError(`Project slug "${finalSlug}" is already taken`)
	}

	// Create project (let DB generate ID if not provided)
	const newProject = {
		...(projectId && { id: projectId }),
		name: projectName,
		owner_id: ownerId,
		slug: finalSlug
	}

	const { data, error } = await supabaseAdmin
		.from('projects')
		.insert(newProject)
		.select('*')
		.single()

	if (error) {
		throw new Error(`Failed to create project: ${error.message}`)
	}

	console.log(`✅ Project created: ${data.id} (slug: ${finalSlug})`)
	return data
}

/**
 * Update project with stripe_customer_id if not already set
 */
export async function updateProjectStripeCustomer(supabaseAdmin, projectId, customerId) {
	const { error } = await supabaseAdmin
		.from('projects')
		.update({ stripe_customer_id: customerId })
		.eq('id', projectId)
		.throwOnError()

	if (error) {
		throw new Error(`Failed to update project stripe_customer_id: ${error.message}`)
	}

	console.log(`✅ Project ${projectId} updated with stripe_customer_id: ${customerId}`)
}
