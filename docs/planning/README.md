# CommandGrid Execution Pack

This folder contains the phase-by-phase PRDs and implementation plans for **CommandGrid**, HexIT Labs' fully functional enterprise AI Operations Command Center demo.

## Locked direction

- Product: **CommandGrid**
- Fictional client: **Northstar Logistics**
- Domain: `commandgrid.hexitlabs.com`
- Repo: new GitHub repo under HexIT org via Robin account
- Infrastructure: Cloudflare-first
- Database: Neon Postgres via Cloudflare Hyperdrive
- AI: Cloudflare AI Gateway / shared billing
- Demo access: public demo with role switcher
- UX: fresh clean enterprise SaaS, Apple-like polish, light and dark mode
- Backend: fully working autonomous backend, not mock-only

## Phase order

1. [Infrastructure Foundation](./phase-01-infrastructure-foundation-prd.md)
2. [Data Model + Seeded Enterprise World](./phase-02-data-model-seeded-world-prd.md)
3. [UI Shell + Design System](./phase-03-ui-shell-design-system-prd.md)
4. [Dashboard + Incident Management](./phase-04-dashboard-incidents-prd.md)
5. [Autonomous Backend Workflows](./phase-05-autonomous-backend-workflows-prd.md)
6. [Approval Governance + Audit](./phase-06-approval-governance-audit-prd.md)
7. [Knowledge Copilot + Reports](./phase-07-knowledge-copilot-reports-prd.md)
8. [Polish, QA + Public Launch](./phase-08-polish-qa-launch-prd.md)


## Autonomous handoff system

Use [`autonomous-handoff-system.md`](./autonomous-handoff-system.md) as the mandatory execution protocol for every phase.

Flow:

```txt
Start build → handoff package → implementation → push PR → Scout review → approve/request changes → next build handoff or fix handoff → republish PR loop until approved
```

Tracker:

- [`phase-tracker.md`](./phase-tracker.md)
- run artifacts under `runs/phase-XX-name/`

## Execution rules

- Every phase gets its own branch and PR unless Ralph explicitly combines low-risk adjacent work.
- Scout reviews every PR before merge.
- No direct push to `main`.
- No secrets in repo.
- Every phase must pass its own acceptance criteria before moving forward.
- Backend/demo reliability beats flashy autonomy. AI Gateway failures must have deterministic fallback paths.

## Recommended parallelization

- **Phase 1:** Ghost leads infra, Node assists DB/app scaffold.
- **Phase 2:** Node leads schema/seed data.
- **Phase 3:** Pixel leads design system while Node completes data APIs.
- **Phase 4:** Pixel + Node split UI/data endpoints.
- **Phase 5:** Node leads workflows; Ghost supports Cloudflare primitives.
- **Phase 6:** Node + Pixel implement governance UX/API.
- **Phase 7:** Node handles AI/report backend; Pixel handles copilot/report UI.
- **Phase 8:** Scout leads QA; Ghost handles launch/domain; Pixel polishes UX.

## Definition of V1 done

CommandGrid is V1-ready when:

- `commandgrid.hexitlabs.com` is live.
- Public demo role switcher works.
- Dashboard and incident screens use real seeded database records.
- Run Demo Incident triggers real backend workflows.
- AI agent events, approval gates, remediation simulation, audit logs, and reports are created by backend code.
- AI Gateway is integrated with safe deterministic fallbacks.
- Knowledge Copilot returns cited answers from seeded sources.
- Light/dark mode is polished.
- CI passes.
- Scout returns `merge-ready`.
