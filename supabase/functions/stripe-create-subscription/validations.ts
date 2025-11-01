import { ValidationError } from './errors.ts';
export function validateRequest(body) {
  const { project_id, project_slug, project_name, owner_id, billing_email, price_id, payment_method_id } = body;
  if (!project_id || typeof project_id !== 'string') {
    throw new ValidationError('project_id is required and must be a string');
  }
  if (!project_slug || typeof project_slug !== 'string') {
    throw new ValidationError('project_slug is required and must be a string');
  }
  if (!project_name || typeof project_name !== 'string') {
    throw new ValidationError('project_name is required and must be a string');
  }
  if (!owner_id || typeof owner_id !== 'string') {
    throw new ValidationError('owner_id is required and must be a string');
  }
  if (!billing_email || typeof billing_email !== 'string') {
    throw new ValidationError('billing_email is required and must be a string');
  }
  if (!price_id || typeof price_id !== 'string') {
    throw new ValidationError('price_id is required and must be a string');
  }
  // payment_method_id is optional (only required for paid plans)
  if (payment_method_id && typeof payment_method_id !== 'string') {
    throw new ValidationError('payment_method_id must be a string');
  }
  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billing_email)) {
    throw new ValidationError('Invalid email format');
  }
  // SLug format check
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project_slug)) {
    throw new ValidationError('Invalid slug format');
  }
  return {
    project_id,
    project_slug,
    project_name,
    owner_id,
    billing_email,
    price_id,
    payment_method_id: payment_method_id || '' // Allow empty string for free
  };
}
