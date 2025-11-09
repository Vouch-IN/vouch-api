import { flushAllLogQueues, syncDisposableDomains, syncIPLists } from '../crons'
import { addRoleEmail, flushAllUsage, getRoleEmails, removeRoleEmail, setRoleEmails } from '../kv'
import { errorResponse } from '../utils'

export async function handleDebugAddRoleEmail(request: Request, env: Env): Promise<Response> {
	try {
		const body = (await request.json())
		const { localPart } = body

		if (!localPart || typeof localPart !== 'string') {
			return errorResponse('invalid_body', 'localPart (string) is required', 400)
		}

		await addRoleEmail(env, localPart)
		return Response.json({
			added: localPart.toLowerCase().trim(),
			success: true
		})
	} catch (error) {
		return errorResponse('error', String(error), 500)
	}
}

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

export async function handleDebugGetRoleEmails(request: Request, env: Env): Promise<Response> {
	try {
		const roleEmails = await getRoleEmails(env)
		return Response.json({
			count: roleEmails.length,
			roleEmails
		})
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
		const namespace = getNamespace(name, env)
		if (!namespace) {
			return errorResponse('invalid_namespace', 'Invalid KV namespace', 400)
		}
		await namespace.delete(key)
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
		const namespace = getNamespace(name, env)
		if (!namespace) {
			return errorResponse('invalid_namespace', 'Invalid KV namespace', 400)
		}
		const value = await namespace.get(key, { type: 'json' })
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
		const namespace = getNamespace(name, env)
		if (!namespace) {
			return errorResponse('invalid_namespace', 'Invalid KV namespace', 400)
		}
		const prefix = searchParams.get('prefix') ?? undefined
		const limitStr = searchParams.get('limit')
		const limit: number = limitStr ? parseInt(limitStr, 10) : 1000
		const list = await namespace.list({ limit, prefix })
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

export async function handleDebugGetRoleEmails(request: Request, env: Env): Promise<Response> {
	try {
		const roleEmails = await getRoleEmails(env)
		return Response.json({
			count: roleEmails.length,
			roleEmails
		})
	} catch (error) {
		return errorResponse('error', String(error), 500)
	}
}

export async function handleDebugAddRoleEmail(request: Request, env: Env): Promise<Response> {
	try {
		const body = (await request.json()) as { localPart: string }
		const { localPart } = body

		if (!localPart || typeof localPart !== 'string') {
			return errorResponse('invalid_body', 'localPart (string) is required', 400)
		}

		await addRoleEmail(env, localPart)
		return Response.json({
			added: localPart.toLowerCase().trim(),
			success: true
		})
	} catch (error) {
		return errorResponse('error', String(error), 500)
	}
}

export async function handleDebugRemoveRoleEmail(request: Request, env: Env): Promise<Response> {
	try {
		const body = (await request.json())
		const { localPart } = body

		if (!localPart || typeof localPart !== 'string') {
			return errorResponse('invalid_body', 'localPart (string) is required', 400)
		}

		await removeRoleEmail(env, localPart)
		return Response.json({
			removed: localPart.toLowerCase().trim(),
			success: true
		})
	} catch (error) {
		return errorResponse('error', String(error), 500)
	}
}

export async function handleDebugSetRoleEmails(request: Request, env: Env): Promise<Response> {
	try {
		const body = (await request.json())
		const { roleEmails } = body

		if (!Array.isArray(roleEmails)) {
			return errorResponse('invalid_body', 'roleEmails must be an array', 400)
		}

		if (roleEmails.some((email) => typeof email !== 'string')) {
			return errorResponse('invalid_body', 'All roleEmails must be strings', 400)
		}

		await setRoleEmails(env, roleEmails)
		return Response.json({
			count: roleEmails.length,
			roleEmails,
			success: true,
			updated: true
		})
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

export async function handleDebugSyncIPLists(request: Request, env: Env): Promise<Response> {
	try {
		const response = await syncIPLists(env)
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
		case name.startsWith('role'):
			return env.ROLE_EMAILS
	}
}
