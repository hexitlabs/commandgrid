# CommandGrid Infrastructure

CommandGrid is designed as a Cloudflare-native enterprise AI demo.

## Runtime

- Next.js App Router
- OpenNext Cloudflare adapter
- Cloudflare Workers runtime
- Wrangler config: `wrangler.jsonc`

`wrangler.jsonc` is used instead of `wrangler.toml` because current OpenNext Cloudflare templates and docs use JSONC for typed binding configuration.

## Local secrets

Never commit real secrets.

Local files currently used by Ralph:

- `/root/ralph/.secrets/cloudflare.env`
- `/root/ralph/.secrets/commandgrid-neon.env`
- `/root/ralph/repos/commandgrid/.env.local` ignored by git

## Cloudflare bindings

Phase 1 prepares bindings for:

- Hyperdrive: `COMMANDGRID_DB`
- KV: `COMMANDGRID_CONFIG`
- R2: `COMMANDGRID_REPORTS`
- Queue producer: `COMMANDGRID_EVENTS`

Workflows and Durable Objects are intentionally documented as Phase 5 runtime work because binding them before classes exist would make Phase 1 deploys fragile.

## AI Gateway

AI Gateway is configured by convention with gateway id `commandgrid` and URL:

`https://gateway.ai.cloudflare.com/v1/<account-id>/commandgrid`

The Phase 1 app includes a deterministic fallback smoke test. Live provider/model calls are deferred until model routing and provider credentials are intentionally configured.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run cf:build
npm run db:check
npm run ai:smoke
```

## Phase 1 Cloudflare resources

Created for CommandGrid Phase 1:

- Worker preview service: `commandgrid-preview`
- Preview URL: `https://commandgrid-preview.oppenstam-robin.workers.dev`
- Hyperdrive: `commandgrid-neon-primary-nocache`
  - Binding: `COMMANDGRID_DB`
  - Config ID: `ccec67513012470c984d5e6f16d70d52`
  - Caching: disabled
- KV namespace: `commandgrid-config`
  - Binding: `COMMANDGRID_CONFIG`
  - ID: `54e0292de25945e2ad761f2a444fbf92`
- R2 bucket: `commandgrid-reports`
  - Binding: `COMMANDGRID_REPORTS`
  - Location hint: `apac`
- Queue: `commandgrid-events`
  - Producer binding: `COMMANDGRID_EVENTS`
- AI Gateway convention:
  - Gateway ID: `commandgrid`
  - Live provider routing deferred until model/provider policy is configured

## Preview smoke endpoints

```bash
curl https://commandgrid-preview.oppenstam-robin.workers.dev/api/health
curl https://commandgrid-preview.oppenstam-robin.workers.dev/api/db-smoke
```

Expected results:

- `/api/health`: all Phase 1 bindings present, AI Gateway configured mode
- `/api/db-smoke`: `ok=true`, database `neondb`, user `neondb_owner`, schema `public`

## Automated preview deployment

GitHub Actions deploys the Cloudflare preview Worker after the CI `check` job succeeds on `push` to `main`. The deploy job runs:

```bash
npm ci
npm run cf:build
npx wrangler deploy --env preview
```

A manual `workflow_dispatch` run is also available, but the deploy job is guarded to run only from `refs/heads/main`. Pull requests and non-`main` branches never deploy.

Required GitHub Actions secrets/config for preview deploy:

- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with permission to deploy the `commandgrid-preview` Worker and read/write the configured preview resources as required by Wrangler.
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID used by Wrangler during non-interactive deploys.
- `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_COMMANDGRID_DB`: deploy-time Hyperdrive local connection string for the `COMMANDGRID_DB` binding. Use the safe preview/deploy equivalent of `COMMANDGRID_DATABASE_URL`; never commit or print the value.

If any required secret is missing, the deploy job fails during the `Verify deploy configuration` step with the missing secret name only. Secret values are never printed.

This automation targets only the `preview` Wrangler environment (`commandgrid-preview`). It does not deploy production.

## Deployment caveats

OpenNext/Cloudflare requires a local Hyperdrive emulation connection string during build/deploy. Use the local secret only:

```bash
set -a
. /root/ralph/.secrets/cloudflare.env
. /root/ralph/.secrets/commandgrid-neon.env
set +a
export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_COMMANDGRID_DB="$COMMANDGRID_DATABASE_URL"
npm run cf:build
npx wrangler deploy --env preview
```

Do not commit `.env.local`, `.dev.vars`, or any real connection string.
