export async function createProject(supabaseAdmin, projectId, projectSlug, projectName, ownerId, billingEmail) {
  const project = {
    id: projectId,
    slug: projectSlug,
    name: projectName,
    owner_id: ownerId,
    billing_email: billingEmail
  };
  const { error } = await supabaseAdmin.from('projects').upsert([
    project
  ]).select('*').single().throwOnError();
  if (error) {
    throw new Error(`Failed to create project: ${error.message}`);
  }
  console.log(`✅ Project created: ${projectId}`);
}
