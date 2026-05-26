# CommandGrid

CommandGrid is HexIT Labs' enterprise AI Operations Command Center demo: a fully functional Cloudflare-native SaaS platform for AI-assisted incident response, governance, audit logs, knowledge search, and executive reporting.

## Phase 1 foundation

This repo is scaffolded for:

- Next.js + TypeScript + Tailwind
- OpenNext on Cloudflare Workers
- Neon Postgres via Cloudflare Hyperdrive
- Cloudflare KV/R2/Queues bindings
- Cloudflare AI Gateway routing with deterministic fallback smoke
- CI for lint/typecheck/test/build/Cloudflare build

## Local setup

```bash
npm install
cp .dev.vars.example .dev.vars
# keep real DATABASE_URL in .env.local only; never commit it
npm run dev
```

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

## Cloudflare

Wrangler config lives in `wrangler.jsonc` following the current OpenNext Cloudflare template structure.

## Planning docs

See `docs/planning/` for the phase PRDs, execution roadmap, and autonomous handoff system.

## Security

Do not commit secrets. `.env`, `.env.*`, `.dev.vars`, `.wrangler/`, and `.open-next/` are ignored.
