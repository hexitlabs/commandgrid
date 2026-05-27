# CommandGrid Phase 5 — Autonomous Backend Workflows

Phase 5 adds the demo-safe backend automation for the Northstar Logistics incident.

## Demo endpoints

Both endpoints are POST-only, demo-scoped, and require an explicit JSON action. They are guarded by `DEMO_MODE=true` and rate limited for 30 seconds per client/action with Cloudflare KV when available, falling back to isolate-local memory in local dev.

```bash
curl -X POST "$BASE_URL/api/demo/run-incident" \
  -H "content-type: application/json" \
  -d '{"demo":"northstar","action":"run-demo-incident"}'
```

This creates/updates deterministic Phase 5 workflow records and pauses at approval:

- Ops, Support, Finance, Security, Comms, and Governance agent runs.
- Agent events visible through the existing incident detail query.
- Recommendation for simulated MSP-02 regional buffer mode.
- Governance approval request: `approval_phase5_buffer_mode_remediation`.
- Timeline event proving the workflow stopped before remediation.
- Audit log rows for trigger, workflow start, agents complete, and approval requested.

```bash
curl -X POST "$BASE_URL/api/demo/approve-remediation" \
  -H "content-type: application/json" \
  -d '{"demo":"northstar","action":"approve-remediation"}'
```

This approves the governance gate and resumes via explicit continuation:

- Approval is marked approved and a decision row is written.
- Remediation is simulated only after approval; no external systems are changed.
- Incident status/timeline are updated.
- A postmortem report record is generated.
- Audit log rows are written for approval, simulated remediation, and report generation.

## Idempotency

The workflow uses deterministic IDs for Phase 5 user-visible records. Re-running the trigger or approval endpoints updates existing records rather than creating duplicates. If the approval is already approved, the trigger reports `already-approved` and does not reset the remediation state; use `npm run demo:reset` to return to the baseline demo.

## Queue and workflow shape

The API publishes an internal event envelope to the `COMMANDGRID_EVENTS` Queue binding when available, then processes synchronously as the strongest local/OpenNext-compatible path. `src/workflows/incident-response/queue-consumer.ts` contains the consumer-compatible handler for Cloudflare queue wiring when the OpenNext worker entrypoint is extended to export a queue handler.

## AI Gateway and fallback

Agent output uses `generateWithAiGateway` with timeout/retry controls. If AI is disabled, missing, timed out, or fails, deterministic fallback content from `src/modules/agents/fallbacks.ts` is used. This keeps the public demo stable and avoids secret or provider error leakage.

## Local smoke

```bash
npm run demo:reset
npm run workflow:smoke
```

The smoke resets the Northstar demo, runs the workflow with AI disabled, verifies the approval gate blocks postmortem generation, approves remediation, verifies audit rows, and confirms reruns are idempotent.
