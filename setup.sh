#!/bin/bash

# Create project structure in kebab-case

echo "🛠️ Creating Vouch Cloudflare Worker folder structure..."

# Main folders
mkdir -p src/{types,durable-objects,handlers,middleware,services,crons,utils,constants}

# Subfolders for types
touch src/types/{env.ts,validation.ts,auth.ts,project.ts,metrics.ts,index.ts}

# Durable Objects
mkdir -p src/durable-objects
touch \
  src/durable-objects/{fingerprint-store.ts,log-queue.ts,usage-counter.ts,index.ts}

# Handlers
mkdir -p src/handlers
touch src/handlers/{validate.ts,health.ts,index.ts}

# Middleware
mkdir -p src/middleware
touch \
  src/middleware/{auth.ts,rate-limit.ts,cors.ts,error-handler.ts,index.ts}

# Services
mkdir -p src/services/{validation,email-validation,device-validation,ip-validation,risk,project,logging,metrics}
touch src/services/index.ts

# Email validation sub-modules
touch \
  src/services/email-validation/{syntax.ts,mx.ts,disposable.ts,alias.ts,role.ts,smtp.ts,catchall.ts,index.ts}

# Device validation sub-module
touch \
  src/services/device-validation/{fingerprint.ts,index.ts}

# IP validation sub-module
touch \
  src/services/ip-validation/{reputation.ts,index.ts}

# Risk scoring
touch \
  src/services/risk/{scoring.ts,recommendation.ts,index.ts}

# Project services
touch \
  src/services/project/{settings.ts,quota.ts,index.ts}

# Logging & metrics services
touch \
  src/services/logging/{validation.ts,encryption.ts,index.ts}
touch \
  src/services/metrics/{prometheus.ts,index.ts}

# Crons
mkdir -p src/crons
touch \
  src/crons/{sync-disposable-domains.ts,flush-log-queue.ts,index.ts}

# Utils
mkdir -p src/utils
touch \
  src/utils/{crypto.ts,cache.ts,response.ts,index.ts}

# Constants
mkdir -p src/constants
touch \
  src/constants/{validation.ts,limits.ts,index.ts}

# Core files
touch src/index.ts
#touch wrangler.jsonc
#touch package.json
#touch tsconfig.json
#touch vitest.config.ts
touch README.md

echo "✅ Folder structure created successfully!"
