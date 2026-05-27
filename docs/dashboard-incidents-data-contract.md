# Dashboard + Incidents Data Contract

Phase 4A adds server-safe typed query helpers for the Phase 4 dashboard and incident UI. Pixel should consume these modules from server components/actions instead of writing raw SQL in UI files.

## Modules

- `src/modules/dashboard/queries.ts`
  - `getDashboardOverview(db, options)`
- `src/modules/dashboard/types.ts`
  - Dashboard response interfaces.
- `src/modules/incidents/queries.ts`
  - `getIncidentList(db, filters)`
  - `getIncidentDetail(db, incidentIdOrSlug, options)`
- `src/modules/incidents/filters.ts`
  - `normalizeIncidentListFilters(filters)`
- `src/modules/incidents/types.ts`
  - Incident list/detail response interfaces.
- `src/modules/roles/view-rules.ts`
  - `getRoleViewRule(role)`
  - `isDemoRoleSlug(value)`

## Dashboard overview

```ts
const overview = await getDashboardOverview(db, {
  organizationSlug: "northstar-logistics",
  role: "executive"
});
```

Returns real seeded DB aggregates for:

- `operationalHealth`: service health score, degraded service names, health level.
- `incidents`: active/resolved/total counts, SEV1 active count, status/severity buckets.
- `revenueAtRisk`: active incident exposure in cents (`USD`).
- `delayedOrders`: active delayed-order total and seeded affected-order sample stats.
- `slaAvailability`: availability percentage, degraded tier-0 count, breached service rows.
- `supportSignal`: open/urgent/high support tickets, affected customers, sentiment label.
- `agentActivity`: agent run counts, recommendation counts, recent runs.
- `approvals`: pending/approved/high-risk counts and due-soon approval previews.
- `incidentTrend`: monthly chart dataset from seeded incidents.
- `flagshipIncident`: active Northstar flagship incident summary.

All date fields are serialized ISO strings. Money is returned as integer cents; UI owns formatting.

## Incident list

```ts
const list = await getIncidentList(db, {
  status: "active,resolved",
  severity: ["sev1", "sev2"],
  sortBy: "startedAt",
  sortDirection: "desc",
  limit: 50
});
```

Supported filters:

- `status?: string | string[]`
- `severity?: string | string[]`
- `sortBy?: "startedAt" | "detectedAt" | "severity" | "status" | "revenueAtRisk" | "delayedOrders"`
- `sortDirection?: "asc" | "desc"`
- `limit?: number` (clamped to `100`)

Each `IncidentListItem` includes impact summary fields for list cards/tables: affected customers/services, support ticket count, pending approval count, agent run count, delayed orders, and revenue at risk.

## Incident detail

```ts
const detail = await getIncidentDetail(db, "warehouse-api-latency-spike", {
  role: "engineer"
});
```

Returns `null` if the incident is not found. The flagship seeded incident detail includes:

- `overview`: summary, narrative, commander, status/severity, impact headline, metadata.
- `timeline`: typed incident events with actors.
- `businessImpact`: total delayed orders/revenue at risk, impact rows, service refs.
- `affectedCustomers`, `affectedOrders`, `affectedServices`.
- `citations`: normalized evidence from system logs, support tickets, knowledge docs, and runbooks.
- `agentActivity`: agent runs with events plus recommendations and citation labels.
- `approvals`: approval previews with requested-by/assigned-role and decision previews.
- `reports`: generated report placeholders/previews where seeded.
- `auditTrail`: audit preview rows for governance/audit panels.

## Role view helper

```ts
const view = getRoleViewRule("ops-manager");
```

Supported roles:

- `executive`
- `ops-manager`
- `engineer`
- `support-lead`
- `finance-reviewer`
- `admin`

The helper returns `dashboardPriority`, `incidentDetailPriority`, `primaryActions`, `hiddenSections`, `readOnly`, and `emphasis` metadata so UI can reorder/emphasize panels without embedding role policy in components.

## Runtime notes

- Query helpers accept the existing Drizzle `CommandGridDb` and are Cloudflare-compatible (no Node-only APIs in query modules).
- Aggregates are queried from Phase 2 seeded Postgres data; no hardcoded UI metric values are used.
- Query modules avoid N+1 loops by batching detail child collections and grouping events/decisions in memory after bulk fetches.
