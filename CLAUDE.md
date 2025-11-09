# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Run the Worker in dev mode (with hot reload)
pnpm dev
# or
wrangler dev
```

### Type Generation
```bash
# Generate all types (Cloudflare + Database)
pnpm types

# Generate Cloudflare Worker types only
pnpm types:cf

# Generate Supabase database types only
pnpm types:db
```

### Code Quality
```bash
# Type check (no emit)
pnpm type-check

# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Check formatting
pnpm format:check

# Run all checks (type-check + lint + format:check)
pnpm check

# Fix all issues (lint:fix + format)
pnpm fix
```

### Deployment
```bash
# Deploy to development environment
wrangler deploy --env development

# Deploy to production environment
pnpm deploy:production
# or
wrangler deploy --env production
```

### Supabase
```bash
# Start local Supabase stack
supabase start

# Apply all migrations (local)
supabase db reset --force

# Serve Edge Functions locally
supabase functions serve stripe-webhook --no-verify-jwt

# Deploy Edge Function to Supabase
supabase functions deploy stripe-webhook --no-verify-jwt
```

## Architecture

### Tech Stack
- **Runtime**: Cloudflare Workers (edge compute)
- **Language**: TypeScript with strict mode
- **Database**: Supabase (Postgres)
- **Billing**: Stripe (subscriptions + webhooks)
- **Storage**: KV Namespaces for caching and real-time data
- **Cron Jobs**: Cloudflare Workers scheduled tasks

### Request Flow
1. **Entry Point** (`src/index.ts`): Main Worker fetch handler with simple path-based routing
2. **Middleware** (`src/middleware/`): Authentication, CORS, rate limiting, error handling
3. **Handlers** (`src/handlers/`): Route-specific request handling (validate, webhook, health, debug)
4. **Services** (`src/services/`): Business logic organized by domain
5. **KV Stores** (`src/kv/`): KV namespace abstractions for caching and state

### Core Validation Pipeline

The `/validate` endpoint (`src/handlers/validate.ts`) orchestrates the main validation flow:

1. **Authentication** (`src/middleware/auth.ts`): Validates API key hash, checks revocation, enforces server/client key security (server keys blocked from browsers)
2. **Rate Limiting** (`src/middleware/rate-limit.ts`): Per-project limits with separate thresholds for client vs server keys
3. **Quota Check** (`src/services/project/quota.ts`): Verifies monthly usage against entitlements
4. **Project Settings** (`src/utils/cache.ts`): Cached settings from `PROJECT_SETTINGS` KV namespace (validations, thresholds, risk weights, whitelist/blacklist)
5. **Run Validations** (`src/services/validation/run.ts`): Executes all enabled checks in parallel with smart early-exit optimization
6. **Apply Overrides** (`src/services/validation/overrides.ts`): Whitelist/blacklist enforcement
7. **Risk Scoring** (`src/services/risk/scoring.ts`): Calculates weighted risk score from signals
8. **Recommendation** (`src/services/risk/recommendation.ts`): Maps risk score to action (allow/flag/block)
9. **Logging & Metrics**: Async recording to log queue and Prometheus metrics

### Validation Services (`src/services/email-validation/`)

All validation checks implement parallel execution with early-exit for BLOCK actions:

- **Syntax** (`syntax.ts`): Email format validation (synchronous)
- **Alias** (`alias.ts`): Detects plus-addressing and subaddressing patterns (synchronous)
- **Disposable** (`disposable.ts`): Checks against KV-cached disposable domain list
- **Role Email** (`role.ts`): Detects role-based emails (admin@, support@) using KV storage
- **MX Records** (`mx.ts`): DNS MX lookup with KV caching and timeout protection
- **SMTP** (`smtp.ts`): Mailbox verification via SMTP RCPT TO command with timeout
- **Catch-all** (`catchall.ts`): Detects domains that accept all addresses via randomized SMTP test
- **Device Fingerprint** (`src/services/device-validation/fingerprint.ts`): Tracks device reuse across emails
- **IP Reputation** (`src/services/ip-validation/reputation.ts`): VPN/fraud detection

### Validation Strategy: Smart Early Exit

The validation pipeline (`src/services/validation/run.ts:61-329`) implements an optimization strategy:
- All validations (both BLOCK and FLAG) start executing **immediately in parallel**
- BLOCK validations use `Promise.race()` to return as soon as **any** BLOCK check fails
- If all BLOCK validations pass, waits for all FLAG validations to complete
- This minimizes latency when blocking invalid requests while maximizing information for valid requests

### KV Namespaces (`wrangler.jsonc`)

Each environment (development/production) has separate KV namespaces:

- **DISPOSABLE_DOMAINS**: Cached disposable email domain list (synced daily via cron)
- **MX_CACHE**: MX record lookup cache with TTL
- **PROJECT_SETTINGS**: Per-project configuration (validations, thresholds, weights)
- **RATE_LIMITS**: Rate limit state per project/key
- **FINGERPRINTS**: Device fingerprint tracking for reuse detection
- **LOG_QUEUE**: Batched validation logs (flushed hourly via cron)
- **USAGE_COUNTER**: Real-time usage tracking per project
- **ROLE_EMAILS**: Remote KV binding for role email patterns

### Cron Jobs (`src/crons/`)

Configured in `wrangler.jsonc` triggers:
- **Hourly** (`0 * * * *`): Flush log queue to Supabase (`flush-log-queue.ts`)
- **Daily at 2am UTC** (`0 2 * * *`): Sync disposable domains list (`sync-disposable-domains.ts`)

### Database Schema

Supabase migrations in `supabase/migrations/` define:
- **users**: User accounts
- **projects**: Project/workspace containers
- **project_members**: Team membership
- **api_keys**: Server and client API keys (hashed)
- **validation_logs**: Historical validation results (encrypted emails)
- **usage**: Monthly usage tracking
- **entitlements**: Subscription quota/features
- **stripe_products**, **stripe_prices**, **stripe_subscriptions**: Billing data
- **webhooks**: Webhook event log
- **disposable_domain_sync_log**: Disposable domain sync history

### Type Safety

- **worker-configuration.d.ts**: Auto-generated Cloudflare Worker bindings (DO NOT edit manually, regenerate with `pnpm types:cf`)
- **src/types/database.types.ts**: Auto-generated Supabase types (DO NOT edit manually, regenerate with `pnpm types:db`)
- **src/types/**: Application-level types for validation, auth, metrics, etc.

### Debug Endpoints

Available **only in development** environment (`env.ENVIRONMENT === 'development'`):
- `/debug/kv/list`: List KV namespace keys
- `/debug/kv/get`: Get KV value
- `/debug/kv/delete`: Delete KV key
- `/debug/sync-domains`: Manually trigger disposable domain sync
- `/debug/flush-logs`: Manually flush log queue
- `/debug/flush-usages`: Manually flush usage counters
- `/debug/role-emails/*`: Manage role email patterns in KV

## Important Patterns

### API Key Security
- Server keys (`type: 'server'`) are blocked from browsers (detected via Origin, Referer, User-Agent headers in `src/middleware/auth.ts:34-56`)
- Client keys (`type: 'client'`) require origin validation against allowed domains
- Keys are hashed with SHA-256 before lookup (`src/utils/auth.ts`)

### Caching Strategy
- Project settings cached in KV (`PROJECT_SETTINGS`) to avoid DB lookups on hot path
- MX records cached with TTL to reduce DNS queries
- API keys cached after first lookup
- Cache utilities in `src/utils/cache.ts`

### Error Handling
- All validation checks wrap errors and return `pass: true` with error metadata to avoid blocking on transient failures
- Global error handler in `src/middleware/error-handler.ts`
- Async operations (logging, metrics) use `.catch()` to prevent request failures

### Environment Variables
Required Worker secrets (set via `wrangler secret put`):
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_KEY`: Supabase service role key
- `ENVIRONMENT`: `development` or `production` (controls debug endpoints)

Additional Worker vars set in `wrangler.jsonc` per environment.

## SDK

Client SDK located in `./sdk` (separate package in monorepo). Use for integrating with the API from client applications.
