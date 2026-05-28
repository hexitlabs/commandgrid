# CommandGrid Phase 7A — Knowledge Copilot + Reports API Contract

Backend scope for Pixel Phase 7B UI. All endpoints are dynamic and return `cache-control: no-store`.

## Common demo context

- Default organization: `org_northstar_logistics`.
- Role is read from JSON body `role`, query `role` for GET endpoints, or the existing demo-role header (`x-commandgrid-demo-role`).
- Valid roles: `executive`, `ops-manager`, `engineer`, `support-lead`, `finance-reviewer`, `admin`.
- AI Gateway is optional. If `COMMANDGRID_AI_DISABLED=true` or no gateway URL is configured, responses use deterministic fallback content.
- Every returned citation is assembled from seeded `knowledge_documents` + `knowledge_snippets` and includes `id`, `snippetId`, `documentId`, `sourceId`, `label`, `title`, `sourceName`, `sourceType`, `documentType`, `uri`, `excerpt`, and `version`.

## Copilot prompts

`GET /api/copilot?role=engineer`

Returns five predefined demo prompts, optionally filtered to the role prompt (admin receives all). Pixel can use these for suggestion chips.

```json
{
  "ok": true,
  "organizationId": "org_northstar_logistics",
  "prompts": [
    {
      "id": "warehouse-root-cause",
      "role": "engineer",
      "label": "Explain the Warehouse API root cause",
      "prompt": "What caused the warehouse API delays and what evidence supports it?"
    }
  ],
  "roleBehavior": {
    "role": "engineer",
    "citationsRequired": true,
    "aiFallback": "deterministic safe fallback when AI Gateway is disabled or fails"
  }
}
```

## Ask Copilot

`POST /api/copilot`

Request:

```json
{
  "question": "What caused the warehouse API delays and what evidence supports it?",
  "role": "engineer",
  "organizationId": "org_northstar_logistics",
  "actorUserId": "user_priya_natarajan",
  "limit": 6
}
```

Response:

```json
{
  "ok": true,
  "question": "What caused the warehouse API delays and what evidence supports it?",
  "role": "engineer",
  "answer": "The strongest supported cause is Warehouse API connection-pool saturation... [RUN-WH-API-004] [ENG-WMS-117]",
  "matchedPromptId": "warehouse-root-cause",
  "retrieval": { "matchCount": 6, "topScore": 68 },
  "ai": { "mode": "fallback", "attempts": 0, "error": "AI gateway disabled or not configured" },
  "citations": [
    {
      "id": "snippet_kdoc_warehouse_latency_runbook_primary",
      "snippetId": "snippet_kdoc_warehouse_latency_runbook_primary",
      "documentId": "kdoc_warehouse_latency_runbook",
      "sourceId": "ksrc_confluence",
      "label": "RUN-WH-API-004",
      "title": "Warehouse API latency triage",
      "sourceName": "Northstar Confluence",
      "sourceType": "wiki",
      "documentType": "runbook",
      "uri": "commandgrid://confluence/runbooks/warehouse-api-latency",
      "excerpt": "Check p95 latency, queue depth...",
      "version": "v4"
    }
  ]
}
```

Failure responses:

- `400` if JSON is invalid or `question` is missing/too short.
- `429` if public demo throttling is active for the caller IP.

Audit behavior: successful asks write `audit_logs` with action `copilot.asked`, target type `knowledge_query`, citation IDs/labels, role, matched prompt ID, retrieval count, and AI mode.

## List reports

`GET /api/reports?role=executive&limit=25`

Response:

```json
{
  "ok": true,
  "organizationId": "org_northstar_logistics",
  "role": "executive",
  "capabilities": {
    "postmortem": { "canGenerate": false },
    "executive-summary": { "canGenerate": true },
    "customer-impact": { "canGenerate": false }
  },
  "reports": [
    {
      "id": "report_flagship_exec_brief",
      "organizationId": "org_northstar_logistics",
      "incidentId": "inc_warehouse_api_latency_2025_02_18",
      "slug": "warehouse-api-latency-exec-brief",
      "title": "Warehouse API latency executive brief",
      "reportType": "executive-brief",
      "status": "draft",
      "generatedByUserId": "user_maya_chen",
      "generatedAt": "2025-02-18T16:10:00.000Z",
      "storageUri": "r2://commandgrid-reports/demo/warehouse-api-latency-exec-brief.md",
      "summary": "Active SEV1: 312 delayed orders...",
      "metadata": { "citationCount": 11 }
    }
  ]
}
```

## Generate report

`POST /api/reports`

Supported `reportType` values:

- `postmortem`
- `executive-summary`
- `customer-impact`

Role behavior:

- `ops-manager` and `admin`: can generate all three report types.
- `executive`: can generate `executive-summary`.
- `support-lead`: can generate `customer-impact`.
- `engineer` and `finance-reviewer`: read-only for this Phase 7A contract.

Request:

```json
{
  "reportType": "customer-impact",
  "incidentId": "inc_warehouse_api_latency_2025_02_18",
  "role": "support-lead",
  "actorUserId": "user_jordan_ellis",
  "persist": true
}
```

Response:

```json
{
  "ok": true,
  "role": "support-lead",
  "report": {
    "id": "report_phase7a_customer_impact_inc_warehouse_api_latency_2025_02_18",
    "organizationId": "org_northstar_logistics",
    "incidentId": "inc_warehouse_api_latency_2025_02_18",
    "slug": "warehouse-api-latency-spike-customer-impact",
    "title": "Warehouse API latency customer impact report",
    "reportType": "customer-impact",
    "status": "draft",
    "generatedAt": "2026-05-28T00:00:00.000Z",
    "storageUri": "commandgrid://reports/org_northstar_logistics/warehouse-api-latency-spike-customer-impact.md",
    "summary": "Customer impact report: 10 sampled impacted orders across priority accounts...",
    "markdown": "# Warehouse API latency customer impact report\n\n## Customer impact...",
    "persisted": true,
    "ai": { "mode": "fallback", "attempts": 0, "error": "AI gateway disabled or not configured" },
    "citations": [
      { "id": "snippet_kdoc_incident_comms_playbook_primary", "documentId": "kdoc_incident_comms_playbook", "sourceId": "ksrc_confluence", "label": "SUP-COMMS-002" }
    ]
  }
}
```

Failure responses:

- `400` invalid JSON or invalid `reportType`.
- `403` role cannot generate requested report type.
- `404` incident not found for the organization.
- `500` unexpected report-generation failure.

Persistence: generated Phase 7A reports are upserted into the existing `reports` table. The full markdown body and citation IDs/labels are stored in `reports.metadata` because the current table has no body/content column. `storageUri` uses a deterministic `commandgrid://reports/...` URI until R2 export is added.

Audit behavior: successful generation writes `audit_logs` with action `report.generated`, target type `report`, report type, role, incident ID, persisted flag, citation IDs/labels, and AI mode.

## Read report by ID

`GET /api/reports/{id}?role=executive`

Response:

```json
{
  "ok": true,
  "role": "executive",
  "report": {
    "id": "report_phase7a_executive_summary_inc_warehouse_api_latency_2025_02_18",
    "metadata": {
      "markdown": "# Warehouse API latency executive summary...",
      "citationLabels": ["RUN-WH-API-004", "OPS-BUF-006", "SUP-COMMS-002"]
    }
  }
}
```

Use `report.metadata.markdown` to render the persisted body when the response came from the list/detail routes.
