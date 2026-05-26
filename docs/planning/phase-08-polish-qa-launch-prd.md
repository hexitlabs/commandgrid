# Phase 08: Polish, QA + Public Launch

## PRD

### Objective
Turn the working product into a reliable public flagship demo: polished UX, demo reset, smoke tests, docs, domain launch, and final Scout approval.

### Primary user value
Robin can confidently share CommandGrid publicly or use it in client demos without it breaking or feeling unfinished.

### Users / roles affected
- Public visitor
- Robin/client demo presenter
- All demo roles
- Developer/operator maintaining the demo

### In scope
- End-to-end demo script.
- Demo reset/admin-safe reset.
- Final responsive/design polish.
- Loading/error states pass.
- Public domain configuration.
- Production Cloudflare deploy.
- Sentry/logging/observability basics if selected.
- Playwright smoke suite.
- README/case study notes.
- Final Scout review.

### Out of scope
- Paid user onboarding.
- Real customer integrations.
- Production SLA obligations.
- Full SOC2/compliance docs.

### Functional requirements
- Public visitor can open app and understand demo quickly.
- Role switcher works across key pages.
- Run Demo Incident works reliably or reset restores state.
- Main demo path can be completed end-to-end.
- Production domain routes correctly.
- Known failure modes show friendly UI.
- Docs explain architecture and demo flow.

### Non-functional requirements
- Performance acceptable on public network.
- No console error spam.
- No leaked secrets/internal IDs beyond harmless demo IDs.
- Light/dark visual polish complete.
- CI and smoke tests protect future changes.
- Quiet, professional public copy.

### Acceptance criteria
- [ ] `commandgrid.hexitlabs.com` loads production app.
- [ ] End-to-end demo script passes manually.
- [ ] Playwright smoke passes.
- [ ] AI fallback mode verified in production/preview.
- [ ] Demo reset works with guardrails.
- [ ] README and case study notes complete.
- [ ] Final Scout verdict is `merge-ready`.
- [ ] Robin receives closeout with URL, PRs, verification, known limitations.

## Implementation Plan

### Owner split
- Scout: final QA, review verdict, coverage gaps.
- Ghost: domain/deploy/observability.
- Pixel: final UX polish.
- Node: smoke stability and demo reset.
- Ralph: final coordination and closeout.

### Dependencies
- Phases 1–7 complete.
- Domain/DNS access ready.
- Cloudflare production bindings configured.
- Scout available for final review.

### Technical approach
- Create a written demo script and test exactly that path repeatedly.
- Use Playwright to automate the core path: dashboard → incident → run workflow → approve → audit → report → copilot.
- Lock down public endpoints with rate limiting/fallbacks.
- Keep launch copy simple: this is a demo project showing HexIT execution capability.
- Do not mark done until production URL and verification evidence exist.

### Task checklist
- [ ] Write demo script.
- [ ] Implement/verify demo reset guardrails.
- [ ] Add Playwright smoke suite.
- [ ] Run visual polish pass.
- [ ] Run responsive pass.
- [ ] Configure production domain.
- [ ] Deploy production.
- [ ] Run production smoke.
- [ ] Review logs/errors.
- [ ] Complete README/case study notes.
- [ ] Spawn Scout final review.
- [ ] Address Scout findings.
- [ ] Send Robin final closeout.

### Files / modules likely touched
- `tests/e2e/*`
- `docs/demo-script.md`
- `README.md`
- `src/modules/demo-reset/*`
- `src/app/*` polish changes
- `wrangler.toml` production config

### Verification plan
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run test:e2e`
- Cloudflare production deploy
- Manual production demo path
- Scout final review

### Risks / open questions
- Production bindings can differ from preview; smoke production explicitly.
- Public AI usage/cost can spike; rate limit and fallback.
- Demo reset must not expose destructive primitives beyond demo data.

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
