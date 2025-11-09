import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

import type { Database } from '../src/types/database.types'

// Load from .dev.vars
config({ path: '.env' })

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_KEY!
const LOCAL_WEBHOOK_URL = process.env.LOCAL_WEBHOOK_URL || 'http://localhost:8787/webhook'
const WEBHOOK_TOKEN = process.env.WEBHOOK_SECRET

if (!SUPABASE_URL || !SUPABASE_KEY) {
	console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY in environment')
	process.exit(1)
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY)

async function main() {
	console.log('🚀 Syncing remote Supabase to local Cloudflare KV\n')
	console.log(`📡 Supabase: ${SUPABASE_URL}`)
	console.log(`🎯 Webhook: ${LOCAL_WEBHOOK_URL}\n`)

	try {
		const projectCount = await syncProjects()
		const apiKeyCount = await syncApiKeys()

		console.log('\n✨ Sync complete!')
		console.log(`   • ${projectCount} projects synced`)
		console.log(`   • ${apiKeyCount} API keys synced`)
	} catch (error) {
		console.error('\n❌ Sync failed:', error)
		process.exit(1)
	}
}

async function syncApiKeys() {
	console.log('\n🔑 Fetching API keys from Supabase...')

	const { data: apiKeys, error } = await supabase.from('api_keys').select('*')

	if (error) {
		throw new Error(`Failed to fetch API keys: ${error.message}`)
	}

	console.log(`✅ Found ${apiKeys.length} API keys`)

	// Trigger webhook for each API key
	for (const apiKey of apiKeys) {
		try {
			await fetch(LOCAL_WEBHOOK_URL, {
				body: JSON.stringify({
					new_row: apiKey,
					old_row: apiKey,
					operation: 'UPDATE',
					table: 'api_keys',
					timestamp: new Date().toISOString()
				}),
				headers: {
					'Content-Type': 'application/json',
					'x-webhook-token': WEBHOOK_TOKEN
				},
				method: 'POST'
			})
			console.log(`   ✓ Synced API key: ${apiKey.name || apiKey.id}`)
		} catch (error) {
			console.error(`   ✗ Failed to sync API key ${apiKey.id}:`, error)
		}
	}

	return apiKeys.length
}

async function syncProjects() {
	console.log('📊 Fetching projects from Supabase...')

	const { data: projects, error } = await supabase
		.from('projects')
		.select('*')
		.is('deleted_at', null)

	if (error) {
		throw new Error(`Failed to fetch projects: ${error.message}`)
	}

	console.log(`✅ Found ${projects.length} projects`)

	// Trigger webhook for each project
	for (const project of projects) {
		try {
			await fetch(LOCAL_WEBHOOK_URL, {
				body: JSON.stringify({
					new_row: project,
					old_row: project,
					operation: 'UPDATE',
					table: 'projects',
					timestamp: new Date().toISOString()
				}),
				headers: {
					'Content-Type': 'application/json',
					'x-webhook-token': WEBHOOK_TOKEN
				},
				method: 'POST'
			})
			console.log(`   ✓ Synced project: ${project.name}`)
		} catch (error) {
			console.error(`   ✗ Failed to sync project ${project.name}:`, error)
		}
	}

	return projects.length
}

main()
