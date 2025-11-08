# Resync Cache Function

Triggers webhooks for all existing API keys and projects to resync Cloudflare KV cache with the database.

## Usage

### Resync Everything (Default)
```bash
curl -X POST https://your-project.supabase.co/functions/v1/resync-cache \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT" \
  -H "Content-Type: application/json"
```

### Resync Only Projects
```bash
curl -X POST https://your-project.supabase.co/functions/v1/resync-cache \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT" \
  -H "Content-Type: application/json" \
  -d '{"apiKeys": false, "projects": true}'
```

### Resync Only API Keys
```bash
curl -X POST https://your-project.supabase.co/functions/v1/resync-cache \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT" \
  -H "Content-Type: application/json" \
  -d '{"apiKeys": true, "projects": false}'
```

## Response

```json
{
  "message": "Cache resync completed",
  "results": {
    "apiKeys": {
      "synced": 150,
      "failed": 0
    },
    "projects": {
      "synced": 25,
      "failed": 0
    }
  }
}
```

## Environment Variables

Required in your Supabase Edge Function secrets:

- `WEBHOOK_URL` - Your Cloudflare Worker webhook endpoint (e.g., `https://vouch-api.workers.dev/webhook`)
- `WEBHOOK_SECRET` - Shared secret for webhook authentication

Set these with:
```bash
supabase secrets set WEBHOOK_URL=https://your-worker.workers.dev/webhook
supabase secrets set WEBHOOK_SECRET=your-webhook-secret
```

## When to Use

- After database migration or bulk updates
- When Cloudflare KV cache is out of sync
- After clearing KV cache manually
- Initial setup/deployment
