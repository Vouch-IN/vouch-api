# Vouch API

A TypeScript backend for Vouch running on Cloudflare Workers, with Supabase for data and Stripe for billing. This repo contains the Worker source, an SDK, and Supabase migrations/functions used by the API.

> Last updated: 2025-11-02

---

## Features
- Cloudflare Workers (Edge runtime) via Wrangler
- Supabase (Postgres, Auth, Edge Functions, SQL migrations)
- Stripe subscriptions and webhooks (prices, products, subscription events)
- TypeScript-first with strict types for Worker bindings (`worker-configuration.d.ts`)
- Monorepo-friendly setup with `pnpm`

## Tech Stack
- Runtime: Cloudflare Workers
- Language: TypeScript
- Data: Supabase (Postgres)
- Billing: Stripe
- Package manager: pnpm

## Repository Layout
```
/ (repo root)
├─ src/                        # Cloudflare Worker source (Request handlers, routing, utilities)
├─ sdk/                        # Client SDK for talking to this API
├─ supabase/
│  ├─ config.toml              # Supabase local config
│  ├─ migrations/              # SQL migrations for the database schema
│  └─ functions/
│     └─ stripe-webhook/       # Supabase Edge Function integrations for Stripe
├─ wrangler.jsonc              # Worker configuration for Cloudflare
├─ worker-configuration.d.ts   # Type-safe definition of Worker environment bindings
├─ package.json
├─ pnpm-workspace.yaml
├─ tsconfig.json
└─ README.md
```

## Prerequisites
- Node.js 18+ (LTS recommended) and pnpm 8+
- Cloudflare account + Wrangler CLI (`pnpm dlx wrangler --version`)
- Supabase account + Supabase CLI (`brew install supabase/tap/supabase` or see docs)
- Stripe account + Stripe CLI (optional but recommended for local webhook testing)

## Getting Started

### 1) Install dependencies
```
pnpm install
```

### 2) Configure environment variables
Create a `.env` file at the project root (never commit secrets). Example variables you will likely need:

```
# Supabase
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Stripe
STRIPE_SECRET_KEY=sk_live_or_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
VOUCH_ENV=local
```

Notes:
- For the complete and authoritative list of typed environment bindings used by the Worker, open `worker-configuration.d.ts`.
- You can also store sensitive runtime secrets in Cloudflare using `wrangler secret` (see Deployment section).

### 3) (Optional) Start Supabase locally
If you want a local database and Edge Functions runtime:
```
supabase start
# Apply all migrations
supabase db reset --force
```
Supabase will print local URLs and service keys you can use in `.env`.

### 4) Run the API locally (Cloudflare Worker)
You can use Wrangler to run the Worker in dev mode:
```
pnpm dlx wrangler dev
# or if you have wrangler installed globally
wrangler dev
```
This will watch for changes and serve the Worker on a local address (e.g. http://127.0.0.1:8787).

### 5) Stripe webhook (local testing)
If you use the Supabase Edge Function `stripe-webhook` or route Stripe webhooks directly to the Worker:
- With Stripe CLI, forward events to your local Worker:
  ```
  stripe login
  stripe listen --forward-to http://127.0.0.1:8787/stripe/webhook
  ```
- Set `STRIPE_WEBHOOK_SECRET` to the secret reported by `stripe listen`.
- Alternatively, you can target the Supabase Edge Function URL if you deploy that path.

## Database & Migrations
- Migrations live in `supabase/migrations`. To apply on local Supabase:
  ```
  supabase db reset --force
  ```
- In CI/production, apply these migrations using your preferred workflow or Supabase migrations tooling.

## Supabase Edge Functions
- Stripe-related logic is located under `supabase/functions/stripe-webhook/`.
- To serve locally (with Supabase local stack running):
  ```
  supabase functions serve stripe-webhook --no-verify-jwt
  ```
- To deploy to Supabase (requires project linked and auth):
  ```
  supabase functions deploy stripe-webhook --no-verify-jwt
  ```

## Configuration (Cloudflare Worker)
- Main configuration file: `wrangler.jsonc`
- Set secrets in Cloudflare (recommended for prod):
  ```
  wrangler secret put SUPABASE_URL
  wrangler secret put SUPABASE_ANON_KEY
  wrangler secret put SUPABASE_SERVICE_ROLE_KEY
  wrangler secret put STRIPE_SECRET_KEY
  wrangler secret put STRIPE_WEBHOOK_SECRET
  wrangler secret put VOUCH_ENV
  ```
- Configure any KV, D1, R2, Durable Objects, or Bindings here if/when used.

## Build
```
pnpm build
```
The command should compile TypeScript; if a specific build step is required it will be configured in `package.json`.

## Deploy
- Preview (recommended):
  ```
  wrangler deploy --env preview
  ```
- Production:
  ```
  wrangler deploy
  ```
Make sure all required secrets are set in the target environment before deploying.

## SDK
A client SDK lives in `./sdk`. Usage will vary based on its exports. Typical flow:
```
import { createClient } from "@vouch/sdk";

const client = createClient({ baseUrl: "https://api.yourdomain.com" });
const res = await client.someEndpoint(params);
```
Consult the `sdk/` directory for specific APIs and types.

## Project Scripts
Commonly useful commands (if defined in `package.json`):
- `pnpm dev` – run the Worker in dev mode
- `pnpm build` – compile TypeScript
- `pnpm lint` – lint the codebase
- `pnpm deploy` – deploy via Wrangler

Check `package.json` for the authoritative list of scripts.

## Troubleshooting
- 403/401 errors: verify Supabase keys and any JWT logic.
- Stripe webhook signature errors: ensure `STRIPE_WEBHOOK_SECRET` matches the endpoint you’re hitting (CLI vs dashboard).
- Worker failing to start: confirm Node version, reinstall deps (`pnpm install`), and check `wrangler.jsonc` for typos.
- Type errors on Env bindings: review `worker-configuration.d.ts` and align Wrangler `vars`/`secrets`.

## Contributing
- Open an issue or PR with a clear description and steps to reproduce.
- Follow existing code style and naming conventions.

## Security
If you discover a vulnerability, please email the maintainers privately. Do not open a public issue for security reports.

## License
Unless a LICENSE file states otherwise, this project is provided under the license selected by the repository owners. If missing, consider MIT.
