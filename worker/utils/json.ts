// Type-safe JSON parse with error handling
export function safeParse<T>(jsonString: null | string | undefined, fallback: T): T {
	if (!jsonString) {
		return fallback
	}

	try {
		return (JSON.parse(jsonString) as T) || fallback
	} catch {
		return fallback
	}
}

// Type-safe JSON stringify with error handling
export function safeStringify<T>(value: null | T | undefined): null | string {
	if (value === null || value === undefined) {
		return null
	}

	try {
		return JSON.stringify(value)
	} catch {
		return null
	}
}
