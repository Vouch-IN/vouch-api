export function recordMetric(
	env: Env,
	eventName: string,
	latency: number,
	data: Record<string, unknown>
) {
	// TODO: Send to prometheus
	console.log('recordMetric', env, eventName, latency, eventName, data)
}
