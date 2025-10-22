// Small helper to run an async op with timeout
export async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
	return await Promise.race([
		p,
		new Promise<T>((_, reject) =>
			setTimeout(() => {
				reject(new Error('timeout'))
			}, ms)
		)
	])
}
