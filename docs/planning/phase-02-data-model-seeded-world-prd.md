# Phase 02: Data Model + Seeded Enterprise World

## PRD

### Objective
Design and implement the relational database model plus deterministic seed/reset scripts that make Northstar Logistics feel like a real enterprise.

### Primary user value
Every later screen and workflow has credible data to read/write. This prevents CommandGrid from becoming a fake dashboard and gives demos repeatable state.

### Users / roles affected
- Executive
- Ops Manager
- Engineer
- Support Lead
- Finance Reviewer
- Admin

### In scope
- Define Drizzle schema for core entities.
- Create migrations.
- Seed Northstar Logistics organization data.
- Seed users/roles/permissions for public role switching.
- Seed incidents, affected customers, orders, system logs, support tickets, runbooks, integrations, reports, audit logs.
- Create deterministic demo reset script.
- Create query helpers for dashboard metrics.
- Document entity relationships and seed assumptions.

### Out of scope
- Complex real authentication.
- Vector search/pgvector implementation unless it is trivial to include later.
- Real third-party integrations.
- Full autonomous workflow execution.

### Functional requirements
- Seed script creates a complete demo world from an empty DB.
- Reset script restores known deterministic demo state.
- Dashboard query helpers return consistent aggregate metrics.
- Entities support the flagship warehouse incident scenario.
- Role permissions exist server-side, not only in UI.
- Knowledge docs include citation metadata.

### Non-functional requirements
- Migrations must be repeatable.
- Seed data must contain no real customer/private data.
- IDs/slugs should be stable enough for demo scripts.
- Query helpers should avoid excessive N+1 patterns.
- Schema should leave room for future real integrations and pgvector.

### Acceptance criteria
- [ ] `npm run db:migrate` succeeds.
- [ ] `npm run db:seed` succeeds from empty DB.
- [ ] `npm run demo:reset` restores the flagship incident baseline.
- [ ] At least 6 demo roles exist with permissions.
- [ ] At least 1 flagship active incident and 5+ historical incidents exist.
- [ ] At least 20 knowledge documents/tickets/log snippets exist with citation metadata.
- [ ] Dashboard metric queries return non-empty results.
- [ ] Scout reviews schema/seed PR and returns `merge-ready`.

## Implementation Plan

### Owner split
- Node: schema, migrations, seed/reset, queries.
- Ralph: data realism, product narrative validation.
- Scout: review schema integrity, seed safety, migration reliability.

### Dependencies
- Phase 1 app/DB scaffold complete.
- Neon/Hyperdrive accessible from local or preview environment.
- Repo CI available.

### Technical approach
- Use domain-first schema names matching product modules.
- Use JSONB only for flexible metadata, not as a replacement for core relational tables.
- Create `demo_sessions` if public users need isolated runs later.
- Keep the flagship incident deterministic for demo reliability.
- Add seed factories/helpers rather than one massive unstructured script.

### Task checklist
- [ ] Create schema for users/roles/permissions.
- [ ] Create schema for incidents/timeline/events/impacts.
- [ ] Create schema for agent runs/events/recommendations.
- [ ] Create schema for approvals/decisions.
- [ ] Create schema for audit logs.
- [ ] Create schema for knowledge documents/sources/queries.
- [ ] Create schema for reports.
- [ ] Create schema for integrations/events/notifications.
- [ ] Write migrations.
- [ ] Write seed data for Northstar Logistics.
- [ ] Write reset script.
- [ ] Write dashboard query helpers.
- [ ] Write data model documentation.
- [ ] Run migrations/seeds locally and in preview/staging.

### Files / modules likely touched
- `src/lib/db/schema/*`
- `src/lib/db/client.ts`
- `src/modules/*/queries.ts`
- `scripts/seed.ts`
- `scripts/reset-demo.ts`
- `drizzle/*` or `migrations/*`
- `docs/data-model.md`

### Verification plan
- `npm run db:migrate`
- `npm run db:seed`
- `npm run demo:reset`
- `npm run test -- data`
- Manual SQL/query smoke for dashboard aggregates
- Cloudflare preview DB smoke if supported

### Risks / open questions
- Over-modeling can slow build; keep V1 schema complete but pragmatic.
- Resetting demo data in public environment needs guardrails.
- Role switcher should not imply real auth security until we add auth.

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
