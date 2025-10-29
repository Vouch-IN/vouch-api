import { flushAllLogQueues, syncDisposableDomains } from '../crons'
import { flushAllUsage } from '../kv'
import { errorResponse } from '../utils'

export async function handleDebugFlushLogs(request: Request, env: Env): Promise<Response> {
	try {
		await flushAllLogQueues(env)
		return Response.json({ success: true })
	} catch (error) {
		return errorResponse('error', String(error), 500)
	}
}

export async function handleDebugFlushUsages(request: Request, env: Env): Promise<Response> {
	try {
		await flushAllUsage(env)
		return Response.json({ success: true })
	} catch (error) {
		return errorResponse('error', String(error), 500)
	}
}

export async function handleDebugKvDelete(request: Request, env: Env): Promise<Response> {
	try {
		const searchParams = new URL(request.url).searchParams
		const key = searchParams.get('key')
		const name = searchParams.get('name')
		if (!name) {
			return errorResponse('missing_name', 'Name parameter required', 400)
		}
		if (!key) {
			return errorResponse('missing_key', 'Key parameter required', 400)
		}
		await getNamespace(name, env).delete(key)
		return Response.json({ deleted: key, success: true })
	} catch (error) {
		return errorResponse('error', String(error), 500)
	}
}

export async function handleDebugKvGet(request: Request, env: Env): Promise<Response> {
	try {
		const searchParams = new URL(request.url).searchParams
		const key = searchParams.get('key')
		const name = searchParams.get('name')
		if (!name) {
			return errorResponse('missing_name', 'Name parameter required', 400)
		}
		if (!key) {
			return errorResponse('missing_key', 'Key parameter required', 400)
		}
		const value = await getNamespace(name, env).get(key, { type: 'json' })
		return Response.json({ key, value })
	} catch (error) {
		return errorResponse('error', String(error), 500)
	}
}

export async function handleDebugKvList(request: Request, env: Env): Promise<Response> {
	try {
		const searchParams = new URL(request.url).searchParams
		const name = searchParams.get('name')
		if (!name) {
			return errorResponse('missing_name', 'Name parameter required', 400)
		}
		const prefix = searchParams.get('prefix')
		let limit = searchParams.get('limit')
		limit = limit ? parseInt(limit, 10) : 1000
		const list = await getNamespace(name, env).list({ limit, prefix })
		return Response.json(list)
	} catch (error) {
		return errorResponse('error', String(error), 500)
	}
}

export async function handleDebugSyncDomains(request: Request, env: Env): Promise<Response> {
	try {
		const response = await syncDisposableDomains(env)
		const data = await response.json()
		return Response.json(data)
	} catch (error) {
		return errorResponse('error', String(error), 500)
	}
}

function getNamespace(name: string, env: Env) {
	name = name.toLowerCase()
	switch (true) {
		case name.startsWith('project'):
			return env.PROJECT_SETTINGS
		case name.startsWith('mx'):
			return env.MX_CACHE
		case name.startsWith('disposable'):
			return env.DISPOSABLE_DOMAINS
		case name.startsWith('rate'):
			return env.RATE_LIMITS
		case name.startsWith('fingerprint'):
			return env.FINGERPRINTS
		case name.startsWith('log'):
			return env.LOG_QUEUE
		case name.startsWith('usage'):
			return env.USAGE_COUNTER
	}
}
