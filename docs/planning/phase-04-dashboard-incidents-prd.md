# Phase 04: Dashboard + Incident Management

## PRD

### Objective
Build the core product screens: executive dashboard, incident list, incident detail, timeline, impact panels, and linked agent/approval/report previews.

### Primary user value
This gives the demo its main visual and workflow backbone. A visitor can immediately understand business impact and drill into the flagship incident.

### Users / roles affected
- Executive views business impact.
- Ops Manager manages incident status/actions.
- Engineer reviews technical root cause/log evidence.
- Support Lead reviews customer complaint clusters.
- Finance Reviewer reviews revenue/SLA impact.

### In scope
- Executive dashboard with real seeded metrics.
- Incident list with severity/status filters.
- Incident detail route.
- Incident timeline from database.
- Business/customer impact panels.
- Related logs/tickets/docs preview.
- Agent activity preview panel.
- Approval preview panel.
- Basic status updates if safe for V1.

### Out of scope
- Full autonomous workflow execution; Phase 5 owns that.
- Final approval system; Phase 6 owns that.
- Copilot chat; Phase 7 owns that.

### Functional requirements
- Dashboard cards query real DB aggregates.
- Charts use seeded historical data.
- Incident list supports filtering/sorting.
- Incident detail shows full flagship incident narrative.
- Role switcher changes dashboard emphasis and visible action affordances.
- Incident pages link to audit/approval/report placeholders where appropriate.

### Non-functional requirements
- Dashboard loads quickly from optimized queries.
- Empty/error states exist.
- Charts are readable in light and dark mode.
- URLs are shareable/bookmarkable.
- No fake hardcoded metric values in UI once Phase 2 data exists.

### Acceptance criteria
- [ ] Dashboard displays operational health, active incidents, revenue at risk, delayed orders, SLA, sentiment, AI actions, pending approvals.
- [ ] Incident list displays seeded incidents and filters work.
- [ ] Flagship incident detail page tells the Warehouse API story clearly.
- [ ] Timeline, impact, customers, agent preview, and approval preview render from DB.
- [ ] Role switcher affects at least executive vs ops/engineer views.
- [ ] Build/tests pass and Scout returns `merge-ready`.

## Implementation Plan

### Owner split
- Pixel: dashboard/incident UI and charts.
- Node: query helpers/API endpoints/server actions.
- Ralph: demo narrative and UX review.
- Scout: PR review and smoke test.

### Dependencies
- Phase 2 seeded data complete.
- Phase 3 UI shell/components complete.

### Technical approach
- Start with server-rendered dashboard queries for simplicity.
- Use typed module query functions instead of raw queries in components.
- Make incident detail modular: overview, timeline, impact, evidence, agents, approvals.
- Use seeded metric snapshots for trend charts if live aggregation is too heavy initially.

### Task checklist
- [ ] Implement dashboard metric query functions.
- [ ] Implement dashboard route.
- [ ] Implement chart datasets.
- [ ] Implement incident list query/filter UI.
- [ ] Implement incident detail route.
- [ ] Implement timeline component integration.
- [ ] Implement impact/customer panels.
- [ ] Implement related evidence previews.
- [ ] Wire role-specific display rules.
- [ ] Add tests for query functions.
- [ ] Add Playwright smoke for dashboard → incident path.

### Files / modules likely touched
- `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/incidents/page.tsx`
- `src/app/(app)/incidents/[id]/page.tsx`
- `src/modules/dashboard/*`
- `src/modules/incidents/*`
- `src/components/charts/*`

### Verification plan
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- Playwright smoke: open dashboard, filter incidents, open flagship incident
- Preview deploy manual check

### Risks / open questions
- Dashboard can become visually busy; prioritize executive clarity.
- Seed metrics and incident details must stay consistent with workflow outputs later.

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
