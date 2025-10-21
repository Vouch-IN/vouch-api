// type CachedResult = {
// 	response: ValidationResponse
// 	timestamp: number
// }
//
// type ClientCheckResult = {
// 	needsApiCheck: boolean
// 	response?: ValidationResponse
// }
//
// type Fingerprint = {
// 	canvas: string
// 	cpuCores: number
// 	deviceMemory: number
// 	fonts: string[]
// 	language: string
// 	screen: string
// 	timezone: string
// 	touchSupport: boolean
// 	userAgent: string
// 	webgl: string
// }
//
// type ValidationResponse = {
// 	checks: Record<string, any>
// 	isValid: boolean
// 	metadata: {
// 		fingerprintId: null | string
// 		previousSignups: number
// 		totalLatency: number
// 	}
// 	recommendation: string
// 	riskScore: number
// 	signals: string[]
// }
//
// type VouchConfig = {
// 	apiKey: string
// 	baseUrl?: string
// 	debounceMs?: number
// 	enableClientChecks?: boolean
// }
//
// export class ValidationError extends Error {
// 	code: string
//
// 	constructor(message: string, code: string) {
// 		super(message)
// 		this.name = 'ValidationError'
// 		this.code = code
// 	}
// }
//
// export class Vouch {
// 	private apiKey: string
// 	private baseUrl: string
// 	private cache: Map<string, CachedResult>
// 	private debounceMs: number
// 	private debounceTimers = new Map<string, number>()
// 	private disposableDomains: null | Set<string> = null
// 	private enableClientChecks: boolean
//
// 	constructor(config: VouchConfig) {
// 		this.apiKey = config.apiKey
// 		this.baseUrl = config.baseUrl || 'https://api.vouch.com'
// 		this.debounceMs = config.debounceMs || 500
// 		this.enableClientChecks = config.enableClientChecks !== false
// 		this.cache = new Map()
//
// 		// Initialize: fetch disposable domains list
// 		if (this.enableClientChecks) {
// 			this.initializeDisposableList()
// 		}
// 	}
//
// 	async check(email: string): Promise<boolean> {
// 		return this.verify(email)
// 	}
//
// 	async validate(email: string): Promise<ValidationResponse> {
// 		// Client-side checks first (if enabled)
// 		if (this.enableClientChecks) {
// 			const clientResult = this.clientSideValidation(email)
// 			if (!clientResult.needsApiCheck) {
// 				return clientResult.response
// 			}
// 		}
//
// 		// Check cache
// 		const cacheKey = email.toLowerCase()
// 		const cached = this.cache.get(cacheKey)
// 		if (cached && Date.now() - cached.timestamp < 300000) {
// 			// 5 min cache
// 			return cached.response
// 		}
//
// 		// Collect fingerprint
// 		const fingerprint = await this.collectFingerprint()
//
// 		// Make API request
// 		const response = await fetch(`${this.baseUrl}/v1/validate`, {
// 			body: JSON.stringify({
// 				email,
// 				fingerprint
// 			}),
// 			headers: {
// 				Authorization: `Bearer ${this.apiKey}`,
// 				'Content-Type': 'application/json'
// 			},
// 			method: 'POST'
// 		})
//
// 		if (!response.ok) {
// 			const error = await response.json()
// 			throw new ValidationError(error.message, error.error)
// 		}
//
// 		const result = await response.json()
//
// 		// Cache result
// 		this.cache.set(cacheKey, {
// 			response: result,
// 			timestamp: Date.now()
// 		})
//
// 		return result
// 	}
//
// 	async verify(email: string): Promise<boolean> {
// 		const result = await this.validate(email)
// 		return result.isValid && result.recommendation !== 'block'
// 	}
//
// 	private clientSideValidation(email: string): ClientCheckResult {
// 		// Syntax check
// 		if (!this.validateSyntax(email)) {
// 			return {
// 				needsApiCheck: false,
// 				response: {
// 					checks: {
// 						syntax: { latency: 0, pass: false }
// 					},
// 					isValid: false,
// 					metadata: {
// 						fingerprintId: null,
// 						previousSignups: 0,
// 						totalLatency: 0
// 					},
// 					recommendation: 'block',
// 					riskScore: 100,
// 					signals: ['invalid_syntax']
// 				}
// 			}
// 		}
//
// 		// Disposable check
// 		if (this.disposableDomains) {
// 			const domain = email.split('@')[1]?.toLowerCase()
// 			if (domain && this.disposableDomains.has(domain)) {
// 				return {
// 					needsApiCheck: false,
// 					response: {
// 						checks: {
// 							disposable: { latency: 0, pass: false },
// 							syntax: { latency: 0, pass: true }
// 						},
// 						isValid: false,
// 						metadata: {
// 							fingerprintId: null,
// 							previousSignups: 0,
// 							totalLatency: 0
// 						},
// 						recommendation: 'block',
// 						riskScore: 40,
// 						signals: ['disposable_email']
// 					}
// 				}
// 			}
// 		}
//
// 		// Alias pattern check
// 		if (this.detectAlias(email)) {
// 			// Don't auto-block, but still need API check for full validation
// 			// API will factor this into risk score
// 		}
//
// 		// Need full API check for MX, device fingerprint, IP, etc.
// 		return { needsApiCheck: true }
// 	}
//
// 	private async collectFingerprint(): Promise<Fingerprint> {
// 		// Browser fingerprinting
// 		const fingerprint: Fingerprint = {
// 			canvas: await this.getCanvasFingerprint(),
// 			cpuCores: navigator.hardwareConcurrency || 0,
// 			deviceMemory: (navigator as any).deviceMemory || 0,
// 			fonts: await this.getFontFingerprint(),
// 			language: navigator.language,
// 			screen: `${screen.width}x${screen.height}`,
// 			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
// 			touchSupport: 'ontouchstart' in window,
// 			userAgent: navigator.userAgent,
// 			webgl: await this.getWebGLFingerprint()
// 		}
//
// 		return fingerprint
// 	}
//
// 	private detectAlias(email: string): boolean {
// 		const localPart = email.split('@')[0]
// 		return localPart.includes('+') || /\d+$/.test(localPart)
// 	}
//
// 	private async getCanvasFingerprint(): Promise<string> {
// 		try {
// 			const canvas = document.createElement('canvas')
// 			const ctx = canvas.getContext('2d')
// 			if (!ctx) return ''
//
// 			canvas.width = 200
// 			canvas.height = 50
//
// 			ctx.textBaseline = 'top'
// 			ctx.font = '14px "Arial"'
// 			ctx.fillStyle = '#f60'
// 			ctx.fillRect(125, 1, 62, 20)
// 			ctx.fillStyle = '#069'
// 			ctx.fillText('Vouch fingerprint', 2, 15)
// 			ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
// 			ctx.fillText('Vouch fingerprint', 4, 17)
//
// 			const dataURL = canvas.toDataURL()
//
// 			// Hash the canvas data
// 			const encoder = new TextEncoder()
// 			const data = encoder.encode(dataURL)
// 			const hashBuffer = await crypto.subtle.digest('SHA-256', data)
// 			const hashArray = Array.from(new Uint8Array(hashBuffer))
// 			return hashArray
// 				.map((b) => b.toString(16).padStart(2, '0'))
// 				.join('')
// 				.substring(0, 16)
// 		} catch (err) {
// 			return ''
// 		}
// 	}
//
// 	private async getFontFingerprint(): Promise<string[]> {
// 		// Check for common fonts
// 		const baseFonts = ['monospace', 'sans-serif', 'serif']
// 		const testFonts = [
// 			'Arial',
// 			'Verdana',
// 			'Times New Roman',
// 			'Courier New',
// 			'Georgia',
// 			'Palatino',
// 			'Garamond',
// 			'Comic Sans MS',
// 			'Trebuchet MS',
// 			'Impact',
// 			'Arial Black'
// 		]
//
// 		const detectedFonts: string[] = []
//
// 		// Simple font detection (not comprehensive but lightweight)
// 		const testString = 'mmmmmmmmmmlli'
// 		const testSize = '72px'
//
// 		const canvas = document.createElement('canvas')
// 		const ctx = canvas.getContext('2d')
// 		if (!ctx) return []
//
// 		const baselines: Record<string, number> = {}
//
// 		// Measure baseline fonts
// 		for (const baseFont of baseFonts) {
// 			ctx.font = `${testSize} ${baseFont}`
// 			baselines[baseFont] = ctx.measureText(testString).width
// 		}
//
// 		// Test each font
// 		for (const font of testFonts) {
// 			let detected = false
// 			for (const baseFont of baseFonts) {
// 				ctx.font = `${testSize} "${font}", ${baseFont}`
// 				const width = ctx.measureText(testString).width
// 				if (width !== baselines[baseFont]) {
// 					detected = true
// 					break
// 				}
// 			}
// 			if (detected) {
// 				detectedFonts.push(font)
// 			}
// 		}
//
// 		return detectedFonts
// 	}
//
// 	private async getFromIndexedDB(key: string): Promise<any> {
// 		return new Promise((resolve, reject) => {
// 			const request = indexedDB.open('VouchCache', 1)
//
// 			request.onerror = () => {
// 				reject(request.error)
// 			}
//
// 			request.onsuccess = () => {
// 				const db = request.result
// 				const transaction = db.transaction(['cache'], 'readonly')
// 				const store = transaction.objectStore('cache')
// 				const getRequest = store.get(key)
//
// 				getRequest.onsuccess = () => {
// 					resolve(getRequest.result?.value || null)
// 				}
// 				getRequest.onerror = () => {
// 					reject(getRequest.error)
// 				}
// 			}
//
// 			request.onupgradeneeded = (event) => {
// 				const db = (event.target as IDBOpenDBRequest).result
// 				if (!db.objectStoreNames.contains('cache')) {
// 					db.createObjectStore('cache', { keyPath: 'key' })
// 				}
// 			}
// 		})
// 	}
//
// 	private async getWebGLFingerprint(): Promise<string> {
// 		try {
// 			const canvas = document.createElement('canvas')
// 			const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
//
// 			if (!gl) return ''
//
// 			const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
// 			if (!debugInfo) return ''
//
// 			const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
// 			const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
//
// 			return `${vendor}|${renderer}`.substring(0, 32)
// 		} catch (err) {
// 			return ''
// 		}
// 	}
//
// 	private async initializeDisposableList(): Promise<void> {
// 		try {
// 			// Check IndexedDB first
// 			const cached = await this.getFromIndexedDB('disposable-domains')
//
// 			if (cached && Date.now() - cached.timestamp < 86400000) {
// 				// 24 hours
// 				this.disposableDomains = new Set(cached.data)
//
// 				// Fetch update in background
// 				this.updateDisposableList().catch((err) => {
// 					console.error('Background update failed:', err)
// 				})
// 			} else {
// 				// Fetch fresh list
// 				await this.updateDisposableList()
// 			}
// 		} catch (err) {
// 			console.error('Failed to initialize disposable list:', err)
// 			this.disposableDomains = new Set() // Empty set, will rely on API
// 		}
// 	}
//
// 	private async saveToIndexedDB(key: string, value: any): Promise<void> {
// 		return new Promise((resolve, reject) => {
// 			const request = indexedDB.open('VouchCache', 1)
//
// 			request.onerror = () => {
// 				reject(request.error)
// 			}
//
// 			request.onsuccess = () => {
// 				const db = request.result
// 				const transaction = db.transaction(['cache'], 'readwrite')
// 				const store = transaction.objectStore('cache')
// 				const putRequest = store.put({ key, value })
//
// 				putRequest.onsuccess = () => {
// 					resolve()
// 				}
// 				putRequest.onerror = () => {
// 					reject(putRequest.error)
// 				}
// 			}
//
// 			request.onupgradeneeded = (event) => {
// 				const db = (event.target as IDBOpenDBRequest).result
// 				if (!db.objectStoreNames.contains('cache')) {
// 					db.createObjectStore('cache', { keyPath: 'key' })
// 				}
// 			}
// 		})
// 	}
//
// 	private async updateDisposableList(): Promise<void> {
// 		const response = await fetch(`${this.baseUrl}/v1/disposable-domains`, {
// 			headers: {
// 				Authorization: `Bearer ${this.apiKey}`
// 			}
// 		})
//
// 		if (!response.ok) {
// 			throw new Error('Failed to fetch disposable domains')
// 		}
//
// 		const domains = await response.json()
// 		this.disposableDomains = new Set(domains)
//
// 		// Store in IndexedDB
// 		await this.saveToIndexedDB('disposable-domains', {
// 			data: domains,
// 			timestamp: Date.now()
// 		})
// 	}
//
// 	private validateSyntax(email: string): boolean {
// 		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// 		return emailRegex.test(email)
// 	}
// }

export {}
