# Phase 05: Autonomous Backend Workflows

## PRD

### Objective
Implement the real backend automation that powers the flagship incident: event publishing, Cloudflare Queues, Workflows, agent runs, AI Gateway/fallback generation, approval pause, remediation simulation, and audit writes.

### Primary user value
This is the proof that CommandGrid is not just a pretty dashboard. The backend actually detects/executes a multi-step AI operations flow.

### Users / roles affected
- Ops Manager triggers/monitors workflow.
- Engineer reviews Ops/Security agent output.
- Support Lead reviews customer summaries.
- Finance Reviewer reviews impact.
- Executive sees generated summaries and progress.

### In scope
- Run Demo Incident trigger.
- Event model and event publisher.
- Cloudflare Queue producer/consumer.
- Cloudflare Workflow for incident response.
- Agent run lifecycle records.
- AI Gateway calls with fallback content.
- Workflow pause at approval request.
- Remediation simulation after approval signal.
- Postmortem generation trigger.
- Audit log writes for workflow steps.

### Out of scope
- Real external remediation actions.
- Real third-party API integrations.
- Multi-tenant production auth.
- Advanced vector RAG.

### Functional requirements
- Clicking Run Demo Incident creates/updates a real incident record.
- Workflow creates agent runs/events over time.
- Ops/Support/Finance/Security/Comms/Governance agents each produce useful output.
- AI Gateway is used for generation when available.
- Fallback content guarantees deterministic public demo.
- Workflow creates an approval request and waits/stops until approved.
- After approval, remediation simulation updates incident status and timeline.
- Every workflow step writes audit logs.

### Non-functional requirements
- Workflow is idempotent where possible.
- Failures are recorded visibly, not swallowed.
- Public trigger is rate-limited or demo-session scoped.
- No secrets leak into logs/output.
- AI timeouts have safe fallback.

### Acceptance criteria
- [ ] Run Demo Incident works in preview/staging.
- [ ] Agent events appear in UI from backend-created records.
- [ ] Approval request is created by workflow.
- [ ] Workflow does not continue remediation before approval.
- [ ] Approval signal resumes/remediates workflow or starts continuation safely.
- [ ] Postmortem/report record is generated.
- [ ] Audit log contains all major events.
- [ ] Fallback mode works with AI disabled/unavailable.
- [ ] Scout returns `merge-ready`.

## Implementation Plan

### Owner split
- Node: workflow/event/AI/backend implementation.
- Ghost: Cloudflare Queues/Workflows runtime config and deploy support.
- Pixel: live/progress UI support if needed.
- Scout: review failure modes and public-abuse risk.

### Dependencies
- Phase 1 Cloudflare primitives configured.
- Phase 2 data model supports workflows/agent runs/audit.
- Phase 4 incident UI can display generated records.

### Technical approach
- Define a small internal event envelope with type, entityId, actor, timestamp, metadata.
- Keep agent logic modular in `src/modules/agents` or `src/lib/ai-gateway`.
- Use AI Gateway wrapper with timeout, retries, logging, and fallback responses.
- Use workflow state checkpoints so retries do not duplicate user-visible records.
- Use a demo session or active demo run ID to avoid corrupting baseline seed data.

### Task checklist
- [ ] Define event types and event envelope.
- [ ] Implement Queue publisher.
- [ ] Implement Workflow entrypoint.
- [ ] Implement agent service interfaces.
- [ ] Implement AI Gateway client wrapper.
- [ ] Create fallback response library.
- [ ] Implement Ops Agent step.
- [ ] Implement Support Agent step.
- [ ] Implement Finance Agent step.
- [ ] Implement Security Agent step.
- [ ] Implement Comms Agent step.
- [ ] Implement Governance Agent approval request step.
- [ ] Implement approval wait/resume pattern.
- [ ] Implement remediation simulation.
- [ ] Implement postmortem generation call.
- [ ] Write audit logging middleware/helper.
- [ ] Add workflow smoke tests and preview verification.

### Files / modules likely touched
- `src/workflows/incident-response/*`
- `src/modules/agents/*`
- `src/modules/events/*`
- `src/lib/ai-gateway/*`
- `src/modules/audit/service.ts`
- `src/modules/incidents/actions.ts`
- `wrangler.toml`

### Verification plan
- Unit tests for event/agent services.
- Workflow dry-run or preview run.
- Manual Run Demo Incident smoke.
- AI disabled fallback smoke.
- Audit log verification query.
- Build/deploy preview smoke

### Risks / open questions
- Cloudflare Workflows patterns may require iteration.
- Async UI refresh needs polling/SSE-style workaround; keep simple with refresh/polling first.
- Duplicate workflow events can pollute demo state unless idempotency is handled.

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
