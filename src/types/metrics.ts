export type MetricLabels = {
	[key: string]: string | undefined
	error_type?: string
	project_id?: string
	result?: string
	tier?: string
}

export type PrometheusMetric = {
	labels: MetricLabels
	name: string
	timestamp: number
	value: number
}
