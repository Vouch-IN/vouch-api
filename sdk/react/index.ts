// import { ValidationResponse, Vouch } from '@vouch/client';
// import { useCallback, useState } from 'react';
//
// // Yup integration
// export function createVouchYupTest(vouch: Vouch) {
// 	return {
// 		message: 'Invalid or suspicious email address',
// 		name: 'vouch-email',
// 		test: async (email: string) => {
// 			try {
// 				const result = await vouch.validate(email);
// 				return result.isValid && result.recommendation !== 'block';
// 			} catch (err) {
// 				// Fail open
// 				console.error('Vouch validation error:', err);
// 				return true;
// 			}
// 		},
// 	};
// }
//
// // Zod integration
// export function createVouchZodValidator(vouch: Vouch) {
// 	return async (email: string, ctx: any) => {
// 		try {
// 			const result = await vouch.validate(email);
//
// 			if (!result.isValid || result.recommendation === 'block') {
// 				ctx.addIssue({
// 					code: 'custom',
// 					message: `Invalid or suspicious email: ${result.signals.join(', ')}`,
// 					path: [],
// 				});
// 			}
// 		} catch (err) {
// 			// Fail open
// 			console.error('Vouch validation error:', err);
// 		}
// 	};
// }
//
// export function useVouch(vouch: Vouch) {
// 	const [isValidating, setIsValidating] = useState(false);
// 	const [error, setError] = useState<Error | null>(null);
//
// 	const validate = useCallback(
// 		async (email: string) => {
// 			setIsValidating(true);
// 			setError(null);
//
// 			try {
// 				const result = await vouch.validate(email);
// 				return result;
// 			} catch (err) {
// 				setError(err as Error);
// 				throw err;
// 			} finally {
// 				setIsValidating(false);
// 			}
// 		},
// 		[vouch],
// 	);
//
// 	const verify = useCallback(
// 		async (email: string) => {
// 			return vouch.verify(email);
// 		},
// 		[vouch],
// 	);
//
// 	return {
// 		error,
// 		isValidating,
// 		validate,
// 		verify,
// 	};
// }
//
// // React Hook Form validator
// export function vouchValidator(vouch: Vouch) {
// 	return async (email: string) => {
// 		try {
// 			const result = await vouch.validate(email);
//
// 			if (!result.isValid || result.recommendation === 'block') {
// 				return `This email appears to be invalid or suspicious: ${result.signals.join(', ')}`;
// 			}
//
// 			if (result.recommendation === 'flag') {
// 				// Optional: allow but warn
// 				// return `Warning: This email may be suspicious: ${result.signals.join(', ')}`;
// 				return true;
// 			}
//
// 			return true;
// 		} catch (err) {
// 			// Fail open - don't block on validation errors
// 			console.error('Vouch validation error:', err);
// 			return true;
// 		}
// 	};
// }
//
// export { ValidationResponse, Vouch };

export {}
