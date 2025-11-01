export class ValidationError extends Error {
  constructor(message){
    super(message);
    this.name = 'ValidationError';
  }
}
export class AuthenticationError extends Error {
  constructor(message){
    super(message);
    this.name = 'AuthenticationError';
  }
}
export class StripeError extends Error {
  constructor(message){
    super(message);
    this.name = 'StripeError';
  }
}
export function handleError(error) {
  console.error('❌ Error:', error);
  if (error instanceof ValidationError) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  if (error instanceof AuthenticationError) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  const message = error instanceof Error ? error.message : 'Internal server error';
  return new Response(JSON.stringify({
    error: message
  }), {
    status: 500,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
