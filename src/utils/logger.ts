type LogContext = Record<string, unknown>

type LogLevel = 'debug' | 'error' | 'info' | 'warn'

type LogMessage = {
	context?: LogContext
	level: LogLevel
	message: string
	timestamp: string
}

/**
 * Structured logger for Cloudflare Workers
 * Outputs JSON logs that are automatically indexed by Workers Logs
 */
class Logger {
	private context: LogContext

	constructor(context: LogContext = {}) {
		this.context = context
	}

	/**
	 * Create a child logger with additional context
	 */
	child(context: LogContext): Logger {
		return new Logger({ ...this.context, ...context })
	}

	debug(message: string, context?: LogContext): void {
		this.log('debug', message, context)
	}

	error(message: string, error?: Error | unknown, context?: LogContext): void {
		const errorContext: LogContext = { ...context }

		if (error instanceof Error) {
			errorContext.error = {
				message: error.message,
				name: error.name,
				stack: error.stack
			}
		} else if (error) {
			errorContext.error = error
		}

		this.log('error', message, errorContext)
	}

	info(message: string, context?: LogContext): void {
		this.log('info', message, context)
	}

	warn(message: string, context?: LogContext): void {
		this.log('warn', message, context)
	}

	/**
	 * Log a message with additional context
	 */
	private log(level: LogLevel, message: string, context?: LogContext): void {
		const logMessage: LogMessage = {
			level,
			message,
			timestamp: new Date().toISOString()
		}

		// Merge logger context with log-specific context
		const mergedContext = { ...this.context, ...context }
		if (Object.keys(mergedContext).length > 0) {
			logMessage.context = mergedContext
		}

		// Output as JSON for Workers Logs indexing
		console.log(JSON.stringify(logMessage))
	}
}

/**
 * Create a new logger instance with optional context
 */
export function createLogger(context?: LogContext): Logger {
	return new Logger(context)
}

/**
 * Default logger instance
 */
export const logger = createLogger()
