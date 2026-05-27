# CommandGrid Data Model

Phase 2 adds the relational foundation for the Northstar Logistics demo world. The model is intentionally domain-first and uses deterministic text IDs/slugs so later phases can rely on stable records.

## Core entity relationships

- `organizations` owns all tenant-scoped demo data. The seeded organization slug is `northstar-logistics`.
- `permissions`, `roles`, `role_permissions`, `users`, and `user_roles` provide server-side demo authorization for public role switching.
- `services`, `customers`, and `orders` describe Northstar's operational footprint.
- `incidents` stores the active and historical incident records. Related tables add timeline events, impacted services, and sampled affected orders:
  - `incident_timeline_events`
  - `incident_impacts`
  - `incident_affected_orders`
- `agent_runs`, `agent_events`, and `recommendations` store autonomous workflow evidence and suggested actions.
- `approvals` and `decisions` model governed actions such as enabling buffer mode or approving customer credits.
- `audit_logs` records important user and agent-driven actions.
- `knowledge_sources`, `knowledge_documents`, and `knowledge_snippets` store citation-backed knowledge for copilot/report grounding.
- `support_tickets`, `system_logs`, and `runbooks` add operational evidence with citation metadata.
- `reports`, `integrations`, `notifications`, and `integration_events` support later reporting and notification workflows.

## Seed assumptions

The seed is fictional and contains no real customer/private data. It creates a deterministic Northstar Logistics world with:

- Organization slug: `northstar-logistics`
- Flagship active incident slug: `warehouse-api-latency-spike`
- Flagship incident ID: `inc_warehouse_api_latency_2025_02_18`
- Narrative: Warehouse API latency spike causing **312 delayed orders** and **$48,200 revenue at risk**
- Six public demo roles:
  - `executive`
  - `ops-manager`
  - `engineer`
  - `support-lead`
  - `finance-reviewer`
  - `admin`
- Six demo users, one per role.
- Five historical incidents for trend baselines.
- Citation-backed knowledge corpus, support tickets, system logs, and runbooks.
- Agent runs, recommendations, approvals, decisions, audit logs, reports, integrations, and notifications for later phases.

Later phases should rely on slugs instead of display names when possible. The safest stable demo anchors are:

| Domain | Stable value |
| --- | --- |
| Organization | `northstar-logistics` |
| Active incident | `warehouse-api-latency-spike` |
| Warehouse service | `warehouse-api` |
| Ops Manager role | `ops-manager` |
| Finance role | `finance-reviewer` |
| Buffer-mode approval | `approval_buffer_mode` |
| Customer-credit approval | `approval_customer_credit_envelope` |

## Reset behavior

`npm run demo:reset` deletes only the organization with slug `northstar-logistics`. Tenant-scoped records are removed through explicit foreign-key cascades from that organization. Global permission rows are upserted, not truncated.

This avoids broad destructive behavior while still restoring a deterministic demo baseline. Do not point `DATABASE_URL` at a database where the `northstar-logistics` organization contains non-demo production data.

## Running migrations and seeds

Set `DATABASE_URL` in `.env.local`, `.env`, or the process environment. Do not commit environment files.

```bash
npm run db:generate   # create Drizzle migrations from src/lib/db/schema.ts
npm run db:migrate    # apply migrations
npm run db:seed       # seed/reset Northstar demo data
npm run demo:reset    # deterministic Northstar reset
npm run db:check      # DB smoke + dashboard metric smoke
```

## Dashboard and incident query helpers

Phase 4A typed dashboard/incident helpers live under `src/modules` and return non-empty results after seed/reset:

- `src/modules/dashboard/queries.ts` returns operational health, active incidents, delayed orders, revenue at risk, SLA/availability, support sentiment, agent activity, approvals, and historical trend datasets.
- `src/modules/incidents/queries.ts` returns filtered/sorted incident lists and flagship incident detail data for timeline, business/customer impact, affected orders/services, citations, agents, approvals, reports, and audit previews.
- `src/modules/roles/view-rules.ts` returns role-specific priority/action metadata for Executive, Ops Manager, Engineer, Support Lead, Finance Reviewer, and Admin views.

See `docs/dashboard-incidents-data-contract.md` for the Phase 4 Pixel-facing data contract.

Legacy DB smoke helpers in `src/lib/dashboard/metrics.ts` remain available for `npm run db:check`, which prints only non-secret operational counts.
