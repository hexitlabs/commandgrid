# CommandGrid Phase 6A Governance/Audit Backend Contract

Backend scope for Pixel Phase 6B. All routes are dynamic and return `cache-control: no-store`.

## Demo role enforcement

The public role switcher is **not auth**. Backend routes still require a selected demo role and validate it server-side against:

- `executive`
- `ops-manager`
- `engineer`
- `support-lead`
- `finance-reviewer`
- `admin`

Send the role either as query `?role=ops-manager`, JSON body `role`, or header `x-commandgrid-demo-role` depending on route. Unauthorized or unknown roles return `403`.

## Approval action types and risk semantics

`governance.actionType` values:

- `technical_remediation` — operational/simulated remediation state changes.
- `financial_credit` — customer credits, revenue exposure, or finance policy.
- `customer_communication` — customer-facing incident communication.
- `executive_escalation` — executive review/escalation workflow.
- `workspace_admin` — demo workspace governance/integration changes.

`governance.riskLevel`: `low | medium | high | critical`.

## Permission matrix summary

- Ops Manager: decides low/medium/high technical remediation; reviews customer comms and finance exposure.
- Engineer: reviews technical actions; cannot approve remediation.
- Finance Reviewer: decides financial-credit actions; cannot approve technical remediation.
- Executive: reviews all and decides executive escalations.
- Support Lead: decides customer communications; cannot approve remediation.
- Admin: broad demo governance authority for all action/risk types.

All approve/reject checks use this server-side matrix. UI disabling is optional and never trusted.

## Routes

### `GET /api/approvals?role=<demo-role>&status=pending&limit=50`

Returns approval queue filtered by role relevance (`owner`, `permitted`, or `review`). Non-relevant approvals are omitted.

```ts
type ApprovalQueueResponse = {
  ok: true;
  role: DemoRoleSlug;
  approvals: ApprovalQueueItem[];
};
```

### `GET /api/approvals/:id?role=<demo-role>`

Returns approval detail only if the role can own/decide/review the approval.

Includes:

- approval card fields
- linked incident
- linked recommendation
- required role/action/risk semantics
- evidence summaries by citation label
- existing decision history
- linked audit context for approval/incident

### `POST /api/approvals/:id/decide`

Body:

```json
{
  "role": "ops-manager",
  "decision": "approved",
  "rationale": "Safe to resume simulated buffer-mode remediation."
}
```

Behavior:

- validates role allowlist server-side
- checks permission matrix server-side
- rejects unauthorized direct calls with `403`
- requires pending approval, otherwise `409`
- inserts immutable decision record
- inserts append-only audit log record
- updates approval status to `approved` or `rejected`
- approve resumes continuation (`phase5-remediation`, flagship remediation, finance/comms record)
- reject records stop impact, updates recommendation to `rejected`, and leaves incident active for alternate handling

Response:

```ts
type ApprovalDecisionResult = {
  ok: true;
  approvalId: string;
  decisionId: string;
  auditLogId: string;
  status: "approved" | "rejected";
  actorRole: DemoRoleSlug;
  actorUserId: string | null;
  continuation: {
    status: "resumed" | "stopped" | "recorded";
    action: "phase5-remediation" | "flagship-remediation" | "financial-review" | "customer-comms" | "manual-review";
    impact: string;
  };
};
```

### `GET /api/audit?role=<demo-role>&limit=50`

Required `role` is the viewer role. Optional filters:

- `actorUserId`
- `actorRole`
- `action`
- `actionType`
- `incidentId`
- `targetType`
- `targetId`
- `status`
- `outcome`
- `search`
- `limit`

Response logs include sanitized summaries only:

```ts
type AuditLogListItem = {
  id: string;
  action: string;
  actionType: string | null;
  targetType: string;
  targetId: string;
  incidentId: string | null;
  occurredAt: string;
  outcome: "approved" | "rejected" | "requested" | "completed" | "started" | "simulated" | "generated" | "blocked" | "unknown";
  status: string | null;
  actor: { id: string; name: string; title: string } | null;
  actorRole: DemoRoleSlug | null;
  metadataSummary: string;
};
```

## Sensitive metadata handling

Audit UI contracts must use `metadataSummary`. The backend redacts sensitive-looking keys such as tokens, secrets, passwords, authorization, cookies, API keys, DSNs, credentials, raw payloads, and log dumps. Arrays/objects are summarized rather than returned raw.

## Pixel integration notes

- Queue page: call `GET /api/approvals` with current demo role.
- Detail page/drawer: call `GET /api/approvals/:id` with current demo role.
- Approve/reject form: call `POST /api/approvals/:id/decide`; surface `403` as “role not permitted”.
- Audit page: call `GET /api/audit`; render filters using the optional query params above.
- Incident-linked audit: call `/api/audit?role=<role>&incidentId=<incident.id>`.
- Do not render raw `metadata`; only render `metadataSummary` and typed fields.
