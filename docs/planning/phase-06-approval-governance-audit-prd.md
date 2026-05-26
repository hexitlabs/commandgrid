# Phase 06: Approval Governance + Audit

## PRD

### Objective
Build the enterprise trust layer: approval queue, permission checks, decision capture, audit log browser, and linked evidence for AI/human actions.

### Primary user value
This phase turns CommandGrid from an AI toy into enterprise-grade software by showing human-in-the-loop governance and traceability.

### Users / roles affected
- Ops Manager approves remediation.
- Finance Reviewer approves financial actions.
- Executive reviews escalations.
- Admin reviews audit trail.
- Engineer sees technical action history.

### In scope
- Approval queue page.
- Approval detail/card UI.
- Approve/reject actions.
- Role-based permission checks server-side.
- Decision records.
- Audit log page with filters/search.
- Audit details drawer/page.
- Linked audit trail from incident pages.
- Governance copy explaining why approval is required.

### Out of scope
- Real auth provider.
- Legally compliant audit export certification.
- External approval notifications.

### Functional requirements
- Pending approvals are listed by role relevance.
- Only permitted demo roles can approve/reject specific action types.
- Approve/reject creates decision record and audit log.
- Rejected actions explain impact and stop/remap workflow.
- Approved remediation action can resume the pending workflow path.
- Audit log can filter by actor/type/incident/status.
- Audit records include AI data sources and confidence where available.

### Non-functional requirements
- Permission checks must run on server, not only UI.
- Audit records should be append-only for V1 behavior.
- Audit UI should handle large-ish seeded data gracefully.
- Sensitive metadata should be summarized, not raw secret/log dumps.

### Acceptance criteria
- [ ] Approval queue renders real pending approvals.
- [ ] Ops Manager can approve warehouse restart; Executive/Finance/Admin rules behave as defined.
- [ ] Unauthorized role cannot approve via UI or direct request.
- [ ] Approval decision resumes/remediates flagship workflow or updates incident state.
- [ ] Audit log records decision with actor/role/timestamp/outcome.
- [ ] Audit page filters work.
- [ ] Scout returns `merge-ready`.

## Implementation Plan

### Owner split
- Node: approval services, permissions, audit records.
- Pixel: approval/audit UI.
- Ralph: governance rules and demo flow.
- Scout: security/permission review.

### Dependencies
- Phase 5 workflow creates approval requests.
- Phase 2 permissions schema exists.
- Phase 3/4 UI components available.

### Technical approach
- Create a permission matrix by role and action type.
- Use server actions/API routes that require a demo role token/header/state value validated against allowlist.
- For public demo, do not pretend role switcher is secure auth; still enforce permissions based on selected role.
- Represent every approval decision as immutable history.

### Task checklist
- [ ] Define approval action types.
- [ ] Define role permission matrix.
- [ ] Implement approval queue queries.
- [ ] Implement approve/reject service.
- [ ] Implement workflow continuation hook/signal.
- [ ] Implement audit log query/filter service.
- [ ] Build approval queue UI.
- [ ] Build approval detail/card UI.
- [ ] Build audit log UI.
- [ ] Build audit detail drawer.
- [ ] Add unauthorized action tests.
- [ ] Add Playwright smoke for role switch → approve → audit.

### Files / modules likely touched
- `src/modules/approvals/*`
- `src/modules/permissions/*`
- `src/modules/audit/*`
- `src/app/(app)/approvals/*`
- `src/app/(app)/audit/*`
- `src/modules/incidents/*`

### Verification plan
- Unit tests for permission matrix.
- Unit tests for approval service.
- Playwright: Engineer cannot approve, Ops Manager can approve.
- Manual workflow continuation smoke.
- Audit filter smoke.
- Build/typecheck/lint.

### Risks / open questions
- Public role switcher can be misunderstood; label it as demo mode.
- Workflow continuation after approval may need a pragmatic implementation if Workflows wait/signal support differs from assumptions.

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
