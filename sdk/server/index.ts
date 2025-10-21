// import { type Request as ExpressRequest } from 'express';
//
// type MiddlewareOptions = {
// 	blockOnFail?: boolean;
// 	emailField?: string;
// 	required?: boolean;
// 	strictMode?: boolean;
// }
//
// type ValidationResponse = {
// 	checks: Record<string, any>;
// 	isValid: boolean;
// 	metadata: {
// 		fingerprintId: null | string;
// 		previousSignups: number;
// 		totalLatency: number;
// 	};
// 	recommendation: string;
// 	riskScore: number;
// 	signals: string[];
// }
//
// type VouchServerConfig = {
// 	apiKey: string;
// 	baseUrl?: string;
// }
//
// export class ValidationError extends Error {
// 	code: string;
//
// 	constructor(message: string, code: string) {
// 		super(message);
// 		this.name = 'ValidationError';
// 		this.code = code;
// 	}
// }
//
// export class Vouch {
// 	private apiKey: string;
// 	private baseUrl: string;
//
// 	constructor(config: VouchServerConfig) {
// 		this.apiKey = config.apiKey;
// 		this.baseUrl = config.baseUrl || 'https://api.vouch.com';
//
// 		if (!this.apiKey.startsWith('sk_')) {
// 			throw new Error('Server SDK requires a server API key (sk_...)');
// 		}
// 	}
//
// 	async validate(email: string, request?: any): Promise<ValidationResponse> {
// 		const ip = this.extractIP(request);
// 		const userAgent = this.extractUserAgent(request);
// 		const response = await fetch(`${this.baseUrl}/v1/validate`, {
// 			body: JSON.stringify({
// 				email,
// 				ip,
// 				userAgent,
// 			}),
// 			headers: {
// 				Authorization: `Bearer ${this.apiKey}`,
// 				'Content-Type': 'application/json',
// 			},
// 			method: 'POST',
// 		});
//
// 		if (!response.ok) {
// 			const error = await response.json();
// 			throw new ValidationError(error.message, error.error);
// 		}
//
// 		return response.json();
// 	}
//
// 	// Express middleware
// 	validateMiddleware(options: MiddlewareOptions = {}) {
// 		return async (req: ExpressRequest, res: any, next: any) => {
// 			const email = this.extractEmail(req, options);
//
// 			if (!email) {
// 				if (options.required) {
// 					return res.status(400).json({ error: 'Email required' });
// 				}
// 				return next();
// 			}
//
// 			try {
// 				const result = await this.validate(email, req);
//
// 				// Attach result to request
// 				(req as any).vouchResult = result;
//
// 				// Block if configured
// 				if (options.blockOnFail && result.recommendation === 'block') {
// 					return res.status(422).json({
// 						error: 'invalid_email',
// 						message: 'This email address cannot be used',
// 						signals: result.signals,
// 					});
// 				}
//
// 				next();
// 			} catch (err) {
// 				// Fail open unless strictMode
// 				if (options.strictMode) {
// 					return res.status(500).json({ error: 'Validation failed' });
// 				}
// 				console.error('Vouch validation error:', err);
// 				next();
// 			}
// 		};
// 	}
//
// 	async verify(email: string, request?: any): Promise<boolean> {
// 		const result = await this.validate(email, request);
// 		return result.isValid && result.recommendation !== 'block';
// 	}
//
// 	private extractEmail(req: any, options: MiddlewareOptions): null | string {
// 		const emailField = options.emailField || 'email';
// 		return req.body?.[emailField] || req.query?.[emailField] || null;
// 	}
//
// 	private extractIP(request?: any): null | string {
// 		if (!request) return null;
//
// 		// Express/Connect-style
// 		if (request.ip) return request.ip;
// 		if (request.socket?.remoteAddress) return request.socket.remoteAddress;
//
// 		// Check headers for proxy/CDN IP
// 		const headers = request.headers || {};
// 		return (
// 			headers['cf-connecting-ip'] || // Cloudflare
// 			headers['x-real-ip'] ||
// 			headers['x-forwarded-for']?.split(',')[0]?.trim() ||
// 			null
// 		);
// 	}
//
// 	private extractUserAgent(request?: any): null | string {
// 		if (!request) return null;
// 		const headers = request.headers || {};
// 		return headers['user-agent'] || null;
// 	}
// }

export {}
