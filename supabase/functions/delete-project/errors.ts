export class AuthenticationError extends Error {
	constructor(message){
		super(message);
		this.name = 'AuthenticationError';
	}
}
export class AuthorizationError extends Error {
	constructor(message){
		super(message);
		this.name = 'AuthorizationError';
	}
}
export class NotFoundError extends Error {
	constructor(message){
		super(message);
		this.name = 'NotFoundError';
	}
}
export class ValidationError extends Error {
	constructor(message){
		super(message);
		this.name = 'ValidationError';
	}
}
export function handleError(error) {
	console.error('❌ Error:', error);
	if (error instanceof ValidationError) {
		return new Response(JSON.stringify({
			error: error.message
		}), {
			headers: {
				'Content-Type': 'application/json'
			},
			status: 400
		});
	}
	if (error instanceof AuthenticationError) {
		return new Response(JSON.stringify({
			error: error.message
		}), {
			headers: {
				'Content-Type': 'application/json'
			},
			status: 401
		});
	}
	if (error instanceof AuthorizationError) {
		return new Response(JSON.stringify({
			error: error.message
		}), {
			headers: {
				'Content-Type': 'application/json'
			},
			status: 403
		});
	}
	if (error instanceof NotFoundError) {
		return new Response(JSON.stringify({
			error: error.message
		}), {
			headers: {
				'Content-Type': 'application/json'
			},
			status: 404
		});
	}
	const message = error instanceof Error ? error.message : 'Internal server error';
	return new Response(JSON.stringify({
		error: message
	}), {
		headers: {
			'Content-Type': 'application/json'
		},
		status: 500
	});
}
