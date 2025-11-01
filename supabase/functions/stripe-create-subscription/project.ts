export async function createProject(
	supabaseAdmin,
	projectId,
	projectSlug,
	projectName,
	ownerId,
	customerId
) {
	const project = {
		id: projectId,
		name: projectName,
		owner_id: ownerId,
		slug: projectSlug,
		stripe_customer_id: customerId
	}
	const { error } = await supabaseAdmin
		.from('projects')
		.upsert([project])
		.select('*')
		.single()
		.throwOnError()
	if (error) {
		throw new Error(`Failed to create project: ${error.message}`)
	}
	console.log(`✅ Project created: ${projectId}`)
}
