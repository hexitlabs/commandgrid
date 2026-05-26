# Phase 01: Infrastructure Foundation

## PRD

### Objective
Create the real Cloudflare-native foundation for CommandGrid: repo, app scaffold, deployment path, Neon database, Hyperdrive, AI Gateway, and baseline CI.

### Primary user value
Robin and the team can start building on a real deployable foundation instead of speculative architecture. This phase proves that Cloudflare + Neon + AI Gateway can run the app end-to-end.

### Users / roles affected
- Admin/developer operators
- Ghost as infra owner
- Node as app/DB scaffold owner
- Scout as review gate

### In scope
- Create new GitHub repo under HexIT org through Robin account.
- Scaffold Next.js + TypeScript + Tailwind app for Cloudflare deployment.
- Configure OpenNext/Cloudflare Pages or Workers deployment path.
- Provision/configure Neon Postgres.
- Create Cloudflare Hyperdrive binding to Neon.
- Create Cloudflare AI Gateway route/config for shared billing.
- Prepare Cloudflare resources: KV, R2 bucket, Queues, Workflows, Durable Object namespace placeholders.
- Set up wrangler config with staging/production separation.
- Create CI with lint/typecheck/test/build/dry-run checks.
- Add `.env.example` with no secrets.
- Add first health endpoint/page and DB connectivity smoke endpoint protected from leaking secrets.

### Out of scope
- Full product UI beyond scaffold/health page.
- Complete data model.
- Actual AI incident workflows.
- Production launch to final domain unless DNS/access is already ready.

### Functional requirements
- App can deploy to a Cloudflare preview environment.
- App can query Neon through Hyperdrive from the Cloudflare runtime.
- App can call AI Gateway or execute a verified fallback path.
- CI runs on PR and blocks broken builds.
- Wrangler config defines required bindings without committing secrets.
- Health endpoint returns runtime/build status without exposing sensitive values.

### Non-functional requirements
- No secrets committed.
- Cloudflare environment separation is explicit: local/preview/production.
- The app scaffold must be compatible with Workers runtime.
- All setup steps documented in README or infra notes.
- Config must be reproducible by Ghost/Node from a clean clone.

### Acceptance criteria
- [ ] GitHub repo exists and is cloned to `/root/ralph/repos/commandgrid`.
- [ ] Preview deployment succeeds on Cloudflare.
- [ ] Database migration/check command succeeds against Neon.
- [ ] Hyperdrive connectivity smoke passes from Cloudflare preview.
- [ ] AI Gateway smoke or deterministic fallback path is verified.
- [ ] CI passes lint/typecheck/test/build/dry-run.
- [ ] Scout reviews the PR and returns `merge-ready` before merge.

## Implementation Plan

### Owner split
- Ghost: Cloudflare project, DNS plan, resources, wrangler config, deploy pipeline.
- Node: Next.js scaffold, Drizzle setup, health checks, DB connectivity smoke.
- Ralph: architecture decisions, repo discipline, PR coordination.
- Scout: review infra safety, secret handling, runtime compatibility.

### Dependencies
- Robin/HexIT GitHub org access.
- Cloudflare account access with Pages/Workers, Hyperdrive, Queues, Workflows, KV, R2, AI Gateway.
- Neon project/database access.
- Domain zone access for `hexitlabs.com` or target DNS zone.

### Technical approach
- Use Drizzle instead of Prisma for edge compatibility.
- Use OpenNext for Cloudflare if Next.js App Router is selected.
- Keep all bindings in `wrangler.toml` with placeholder IDs until provisioned.
- Create a minimal `health` route that checks app version and optional DB query.
- Separate infrastructure docs from app docs so credential-dependent steps are clear.
- Do not expose raw connection strings or binding IDs in user-facing UI.

### Task checklist
- [ ] Create repo and baseline branch.
- [ ] Initialize Next.js/TypeScript/Tailwind.
- [ ] Install Cloudflare/OpenNext tooling.
- [ ] Create `wrangler.toml` with environments.
- [ ] Provision Neon DB and create initial schema placeholder.
- [ ] Create Hyperdrive config pointing to Neon.
- [ ] Create AI Gateway config and document model routing.
- [ ] Create KV namespace, R2 bucket, Queue, Workflow placeholder, Durable Object placeholder if required by tooling.
- [ ] Add CI workflow.
- [ ] Add health page/API.
- [ ] Add docs: setup, env vars, deploy, secrets.
- [ ] Run local build and Cloudflare preview deploy.
- [ ] Open PR and request Scout review.

### Files / modules likely touched
- `package.json`
- `wrangler.toml`
- `open-next.config.*` if applicable
- `src/app/*`
- `src/lib/db/*`
- `src/lib/cloudflare/*`
- `drizzle.config.ts`
- `.github/workflows/ci.yml`
- `.env.example`
- `README.md`
- `docs/infra/*`

### Verification plan
- `npm install`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run cf:dry-run` or equivalent wrangler dry-run/preview deploy
- `npm run db:check`
- Cloudflare preview URL smoke test

### Risks / open questions
- Cloudflare Workflows availability/limits may affect implementation details.
- OpenNext runtime compatibility must be proven immediately.
- Hyperdrive requires correct Cloudflare token permissions.
- AI Gateway shared billing configuration may need Robin/Cloudflare admin action.

### Phase handoff format
```md
## Handoff
- Phase:
- Repo/path:
- Branch:
- PR:
- Files changed:
- What was done:
- Verification run:
- Preview/deploy URL:
- Open issues / risks:
- Scout verdict:
- Recommended next step:
```
