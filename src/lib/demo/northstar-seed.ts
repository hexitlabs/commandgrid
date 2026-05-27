import type { Sql } from "postgres";
import {
  CUSTOMERS,
  DEMO_PERMISSION_DEFINITIONS,
  DEMO_ROLES,
  DEMO_USERS,
  FLAGSHIP_INCIDENT,
  HISTORICAL_INCIDENTS,
  KNOWLEDGE_DOCUMENTS,
  NORTHSTAR_ORG,
  ORDERS,
  SERVICES,
  SUPPORT_TICKETS,
  SYSTEM_LOG_MESSAGES
} from "./northstar-data";

type InsertValue = string | number | boolean | null | Record<string, unknown>;
type InsertRow = Record<string, InsertValue>;

const permissionIdBySlug = new Map(DEMO_PERMISSION_DEFINITIONS.map((permission) => [permission[1], permission[0]]));
const roleIdBySlug = new Map(DEMO_ROLES.map((role) => [role.slug, role.id]));

async function insertRow(sql: Sql, table: string, row: InsertRow, onConflict?: string) {
  await sql`insert into ${sql(table)} ${sql(row)} ${onConflict ? sql.unsafe(onConflict) : sql``}`;
}

async function insertRows(sql: Sql, table: string, rows: InsertRow[], onConflict?: string) {
  if (rows.length === 0) {
    return;
  }

  await sql`insert into ${sql(table)} ${sql(rows)} ${onConflict ? sql.unsafe(onConflict) : sql``}`;
}

export async function resetNorthstarDemo(sql: Sql) {
  await sql`delete from organizations where slug = ${NORTHSTAR_ORG.slug}`;
}

export async function seedNorthstarDemo(sql: Sql, options: { resetExisting?: boolean } = {}) {
  if (options.resetExisting ?? true) {
    await resetNorthstarDemo(sql);
  }

  await insertRows(
    sql,
    "permissions",
    DEMO_PERMISSION_DEFINITIONS.map(([id, slug, name, description, category]) => ({
      id,
      slug,
      name,
      description,
      category
    })),
    `on conflict (id) do update set slug = excluded.slug, name = excluded.name, description = excluded.description, category = excluded.category, updated_at = now()`
  );

  await insertRow(sql, "organizations", NORTHSTAR_ORG);

  await insertRows(
    sql,
    "roles",
    DEMO_ROLES.map((role) => ({
      id: role.id,
      organization_id: NORTHSTAR_ORG.id,
      slug: role.slug,
      name: role.name,
      description: role.description,
      demo_persona: role.demoPersona,
      is_public_demo_role: true,
      metadata: {
        publicSwitcher: true,
        seededPermissionSlugs: [...role.permissionSlugs]
      }
    }))
  );

  await insertRows(
    sql,
    "role_permissions",
    DEMO_ROLES.flatMap((role) =>
      role.permissionSlugs.map((permissionSlug) => ({
        role_id: role.id,
        permission_id: permissionIdBySlug.get(permissionSlug) ?? permissionSlug
      }))
    )
  );

  await insertRows(
    sql,
    "users",
    DEMO_USERS.map(([id, email, name, title, avatarInitials]) => ({
      id,
      organization_id: NORTHSTAR_ORG.id,
      email,
      name,
      title,
      avatar_initials: avatarInitials,
      is_demo_user: true
    }))
  );

  await insertRows(
    sql,
    "user_roles",
    DEMO_USERS.map(([userId, , , , , roleSlug]) => ({
      user_id: userId,
      role_id: roleIdBySlug.get(roleSlug) ?? roleSlug
    }))
  );

  await insertRows(
    sql,
    "services",
    SERVICES.map(([id, slug, name, tier, ownerTeam, status, sloTargetMs]) => ({
      id,
      organization_id: NORTHSTAR_ORG.id,
      slug,
      name,
      tier,
      owner_team: ownerTeam,
      status,
      slo_target_ms: sloTargetMs,
      metadata: {
        dashboardOrder: SERVICES.findIndex((service) => service[0] === id) + 1
      }
    }))
  );

  await insertRows(
    sql,
    "customers",
    CUSTOMERS.map(([id, externalRef, name, segment, region, priority]) => ({
      id,
      organization_id: NORTHSTAR_ORG.id,
      external_ref: externalRef,
      name,
      segment,
      region,
      priority,
      metadata: {
        demoAccount: true
      }
    }))
  );

  await insertRows(
    sql,
    "orders",
    ORDERS.map(([id, customerId, orderNumber, status, revenueCents, delayedMinutes, promisedAt]) => ({
      id,
      organization_id: NORTHSTAR_ORG.id,
      customer_id: customerId,
      order_number: orderNumber,
      status,
      revenue_cents: revenueCents,
      delayed_minutes: delayedMinutes,
      promised_at: promisedAt,
      metadata: {
        fulfillmentNode: "MSP-02",
        demoFlagshipSample: status !== "processing"
      }
    }))
  );

  await insertRow(sql, "incidents", {
    id: FLAGSHIP_INCIDENT.id,
    organization_id: NORTHSTAR_ORG.id,
    slug: FLAGSHIP_INCIDENT.slug,
    title: FLAGSHIP_INCIDENT.title,
    summary:
      "Warehouse API p95 latency spiked above 1.8s in the central fulfillment cluster, delaying route assignments and putting customer promise windows at risk.",
    status: "active",
    severity: "sev1",
    commander_user_id: "user_diego_alvarez",
    started_at: "2025-02-18T15:42:00.000Z",
    detected_at: "2025-02-18T15:47:00.000Z",
    resolved_at: null,
    delayed_orders: FLAGSHIP_INCIDENT.delayedOrders,
    revenue_at_risk_cents: FLAGSHIP_INCIDENT.revenueAtRiskCents,
    customer_impact_summary: "312 delayed orders across eight demo customers; $48,200 revenue at risk.",
    metadata: {
      tagline: "Warehouse API latency spike causing 312 delayed orders and $48,200 revenue at risk",
      currentP95Ms: 1840,
      suspectedRootCause: "connection pool saturation after regional pick wave surge"
    }
  });

  await insertRows(
    sql,
    "incidents",
    HISTORICAL_INCIDENTS.map(([id, slug, title, status, severity, startedAt, detectedAt, resolvedAt, delayedOrders, revenueAtRiskCents]) => ({
      id,
      organization_id: NORTHSTAR_ORG.id,
      slug,
      title,
      summary: `${title} impacted Northstar fulfillment operations and was restored through the documented runbook path.`,
      status,
      severity,
      commander_user_id: "user_diego_alvarez",
      started_at: startedAt,
      detected_at: detectedAt,
      resolved_at: resolvedAt,
      delayed_orders: delayedOrders,
      revenue_at_risk_cents: revenueAtRiskCents,
      customer_impact_summary: `${delayedOrders} delayed orders; revenue exposure ${(revenueAtRiskCents / 100).toLocaleString("en-US", {
        style: "currency",
        currency: "USD"
      })}.`,
      metadata: {
        historicalDemoIncident: true
      }
    }))
  );

  await insertRows(sql, "incident_impacts", [
    {
      id: "impact_warehouse_api_latency",
      incident_id: FLAGSHIP_INCIDENT.id,
      service_id: "svc_warehouse_api",
      impact_type: "latency",
      severity: "critical",
      description: "Warehouse API route assignment latency above SLO in central cluster.",
      affected_count: 312,
      revenue_at_risk_cents: 4820000,
      metadata: { p95Ms: 1840, sloTargetMs: 450 }
    },
    {
      id: "impact_order_router_callbacks",
      incident_id: FLAGSHIP_INCIDENT.id,
      service_id: "svc_order_router",
      impact_type: "order-delay",
      severity: "high",
      description: "Order Router callbacks waiting on Warehouse API acknowledgement.",
      affected_count: 176,
      revenue_at_risk_cents: 2815000,
      metadata: { callbackLagMinutes: 18 }
    },
    ...HISTORICAL_INCIDENTS.map(([incidentId, slug, title, , severity, , , , delayedOrders, revenueAtRiskCents]) => ({
      id: `impact_${slug}`,
      incident_id: incidentId,
      service_id: slug.includes("carrier") ? "svc_carrier_gateway" : slug.includes("inventory") ? "svc_inventory_sync" : "svc_warehouse_api",
      impact_type: "historical",
      severity,
      description: `${title} recorded for demo trend baselines.`,
      affected_count: delayedOrders,
      revenue_at_risk_cents: revenueAtRiskCents,
      metadata: { historical: true }
    }))
  ]);

  await insertRows(
    sql,
    "incident_affected_orders",
    ORDERS.filter((order) => order[3] !== "processing").map(([orderId, , , , revenueCents]) => ({
      incident_id: FLAGSHIP_INCIDENT.id,
      order_id: orderId,
      reason: "Warehouse API route assignment delayed",
      impact_cents: revenueCents
    }))
  );

  await insertRows(sql, "incident_timeline_events", [
    {
      id: "tl_flagship_detected",
      incident_id: FLAGSHIP_INCIDENT.id,
      actor_user_id: "user_priya_natarajan",
      event_type: "detected",
      title: "Latency anomaly detected",
      body: "Warehouse API p95 crossed 1.8s for six consecutive minutes in MSP-02.",
      occurred_at: "2025-02-18T15:47:00.000Z",
      metadata: { source: "Datadog synthetic monitor" }
    },
    {
      id: "tl_flagship_declared",
      incident_id: FLAGSHIP_INCIDENT.id,
      actor_user_id: "user_diego_alvarez",
      event_type: "declared",
      title: "SEV1 declared",
      body: "Ops command opened a SEV1 due to delayed customer promise windows.",
      occurred_at: "2025-02-18T15:52:00.000Z",
      metadata: { severity: "sev1" }
    },
    {
      id: "tl_flagship_agent_started",
      incident_id: FLAGSHIP_INCIDENT.id,
      actor_user_id: "user_diego_alvarez",
      event_type: "agent-started",
      title: "Triage agent started",
      body: "CommandGrid incident agent started correlating WMS logs, support tickets, and order impact.",
      occurred_at: "2025-02-18T15:55:00.000Z",
      metadata: { agentRunId: "agent_run_flagship_triage" }
    },
    {
      id: "tl_flagship_customer_update",
      incident_id: FLAGSHIP_INCIDENT.id,
      actor_user_id: "user_jordan_ellis",
      event_type: "customer-update",
      title: "Customer update drafted",
      body: "Support prepared proactive messages for platinum and gold accounts with affected promise windows.",
      occurred_at: "2025-02-18T16:05:00.000Z",
      metadata: { ticketCount: 6 }
    },
    ...HISTORICAL_INCIDENTS.map(([incidentId, slug, title, , , startedAt]) => ({
      id: `tl_${slug}_closed`,
      incident_id: incidentId,
      actor_user_id: "user_diego_alvarez",
      event_type: "closed",
      title: `${title} closed`,
      body: "Historical incident seeded with final closure event for trend and reporting demos.",
      occurred_at: startedAt,
      metadata: { historical: true }
    }))
  ]);

  await insertRows(sql, "agent_runs", [
    {
      id: "agent_run_flagship_triage",
      organization_id: NORTHSTAR_ORG.id,
      incident_id: FLAGSHIP_INCIDENT.id,
      agent_name: "Incident Triage Agent",
      objective: "Correlate delayed orders, Warehouse API logs, support tickets, and runbooks.",
      status: "running",
      started_at: "2025-02-18T15:55:00.000Z",
      completed_at: null,
      output_summary: "Likely connection pool saturation; recommends buffer mode and finance-reviewed customer credit envelope.",
      metadata: { model: "demo-deterministic", citationsUsed: 8 }
    },
    {
      id: "agent_run_customer_comms",
      organization_id: NORTHSTAR_ORG.id,
      incident_id: FLAGSHIP_INCIDENT.id,
      agent_name: "Customer Communications Agent",
      objective: "Draft segmented customer updates with approved incident facts.",
      status: "completed",
      started_at: "2025-02-18T16:00:00.000Z",
      completed_at: "2025-02-18T16:03:00.000Z",
      output_summary: "Drafted messages for platinum, gold, and silver customers referencing current ETA windows.",
      metadata: { draftsCreated: 3 }
    },
    {
      id: "agent_run_finance_exposure",
      organization_id: NORTHSTAR_ORG.id,
      incident_id: FLAGSHIP_INCIDENT.id,
      agent_name: "Finance Exposure Agent",
      objective: "Estimate revenue at risk and flag approval thresholds.",
      status: "completed",
      started_at: "2025-02-18T16:02:00.000Z",
      completed_at: "2025-02-18T16:04:30.000Z",
      output_summary: "$48,200 revenue at risk; platinum-credit approval required before proactive credits.",
      metadata: { revenueAtRiskCents: 4820000 }
    }
  ]);

  await insertRows(sql, "agent_events", [
    {
      id: "agent_event_triage_logs",
      agent_run_id: "agent_run_flagship_triage",
      event_type: "retrieval",
      message: "Retrieved eight Warehouse API and Order Router logs with citation labels.",
      occurred_at: "2025-02-18T15:56:00.000Z",
      metadata: { citationLabels: ["LOG-WH-001", "LOG-WH-002", "LOG-OR-001"] }
    },
    {
      id: "agent_event_triage_runbook",
      agent_run_id: "agent_run_flagship_triage",
      event_type: "retrieval",
      message: "Matched latency pattern against Warehouse API latency triage runbook.",
      occurred_at: "2025-02-18T15:57:00.000Z",
      metadata: { citationLabel: "RUN-WH-API-004" }
    },
    {
      id: "agent_event_comms_done",
      agent_run_id: "agent_run_customer_comms",
      event_type: "completed",
      message: "Generated customer communication drafts for support review.",
      occurred_at: "2025-02-18T16:03:00.000Z",
      metadata: { approverRole: "support-lead" }
    },
    {
      id: "agent_event_finance_done",
      agent_run_id: "agent_run_finance_exposure",
      event_type: "completed",
      message: "Calculated aggregate exposure and approval requirement.",
      occurred_at: "2025-02-18T16:04:30.000Z",
      metadata: { approvalId: "approval_customer_credit_envelope" }
    }
  ]);

  await insertRows(sql, "recommendations", [
    {
      id: "rec_enable_buffer_mode",
      organization_id: NORTHSTAR_ORG.id,
      incident_id: FLAGSHIP_INCIDENT.id,
      agent_run_id: "agent_run_flagship_triage",
      title: "Enable regional buffer mode for MSP-02",
      body: "Temporarily queue route assignments locally and replay when Warehouse API p95 remains below 500ms for ten minutes.",
      priority: "urgent",
      status: "pending-approval",
      confidence: "0.860",
      metadata: { citationLabels: ["OPS-BUF-006", "RUN-WH-API-004"] }
    },
    {
      id: "rec_expand_pool",
      organization_id: NORTHSTAR_ORG.id,
      incident_id: FLAGSHIP_INCIDENT.id,
      agent_run_id: "agent_run_flagship_triage",
      title: "Increase Warehouse API connection pool by 25%",
      body: "Raise regional pool ceiling from 90 to 112 while autoscaling two additional pods.",
      priority: "high",
      status: "in-progress",
      confidence: "0.780",
      metadata: { citationLabels: ["ENG-WMS-117", "LOG-WH-002"] }
    },
    {
      id: "rec_customer_credit_envelope",
      organization_id: NORTHSTAR_ORG.id,
      incident_id: FLAGSHIP_INCIDENT.id,
      agent_run_id: "agent_run_finance_exposure",
      title: "Pre-approve $12,500 customer credit envelope",
      body: "Finance approval required for platinum accounts if proactive credits are offered before resolution.",
      priority: "medium",
      status: "pending-approval",
      confidence: "0.720",
      metadata: { citationLabels: ["FIN-CRED-009"] }
    }
  ]);

  await insertRows(sql, "approvals", [
    {
      id: "approval_buffer_mode",
      organization_id: NORTHSTAR_ORG.id,
      incident_id: FLAGSHIP_INCIDENT.id,
      recommendation_id: "rec_enable_buffer_mode",
      title: "Enable regional buffer mode",
      description: "Requires Ops Manager approval because buffered route assignment changes customer promise calculations.",
      requested_by_user_id: "user_priya_natarajan",
      assigned_role_id: "role_ops_manager",
      status: "pending",
      risk_level: "medium",
      due_at: "2025-02-18T16:25:00.000Z",
      metadata: {
        recommendationId: "rec_enable_buffer_mode",
        actionType: "technical_remediation",
        continuation: "flagship-remediation",
        evidenceLabels: ["OPS-BUF-006", "RUN-WH-API-004"]
      }
    },
    {
      id: "approval_customer_credit_envelope",
      organization_id: NORTHSTAR_ORG.id,
      incident_id: FLAGSHIP_INCIDENT.id,
      recommendation_id: "rec_customer_credit_envelope",
      title: "Customer credit envelope",
      description: "Finance review for proactive credit envelope tied to $48,200 revenue-at-risk exposure.",
      requested_by_user_id: "user_jordan_ellis",
      assigned_role_id: "role_finance_reviewer",
      status: "pending",
      risk_level: "high",
      due_at: "2025-02-18T17:00:00.000Z",
      metadata: {
        maxCreditCents: 1250000,
        actionType: "financial_credit",
        continuation: "financial-review",
        evidenceLabels: ["FIN-CRED-009"]
      }
    },
    {
      id: "approval_publish_customer_update",
      organization_id: NORTHSTAR_ORG.id,
      incident_id: FLAGSHIP_INCIDENT.id,
      recommendation_id: null,
      title: "Publish proactive customer update",
      description: "Support Lead approval for first external update to affected platinum and gold customers.",
      requested_by_user_id: "user_jordan_ellis",
      assigned_role_id: "role_support_lead",
      status: "approved",
      risk_level: "low",
      due_at: "2025-02-18T16:15:00.000Z",
      metadata: {
        communicationBatch: "flagship-initial",
        actionType: "customer_communication",
        continuation: "customer-comms",
        evidenceLabels: ["SUP-COMMS-002"]
      }
    }
  ]);

  await insertRow(sql, "decisions", {
    id: "decision_publish_customer_update",
    approval_id: "approval_publish_customer_update",
    decided_by_user_id: "user_jordan_ellis",
    decision: "approved",
    rationale: "Message matches current impact facts and avoids root-cause speculation.",
    decided_at: "2025-02-18T16:12:00.000Z",
    metadata: { channel: "email" }
  });

  await insertRows(sql, "knowledge_sources", [
    {
      id: "ksrc_confluence",
      organization_id: NORTHSTAR_ORG.id,
      slug: "confluence",
      name: "Northstar Confluence",
      source_type: "wiki",
      uri: "commandgrid://confluence",
      owner_team: "Operations Enablement",
      metadata: { citationAuthority: "internal-wiki" }
    },
    {
      id: "ksrc_github",
      organization_id: NORTHSTAR_ORG.id,
      slug: "github",
      name: "Engineering GitHub",
      source_type: "repository",
      uri: "commandgrid://github",
      owner_team: "Platform Engineering",
      metadata: { citationAuthority: "source-control" }
    },
    {
      id: "ksrc_drive",
      organization_id: NORTHSTAR_ORG.id,
      slug: "drive",
      name: "Northstar Drive",
      source_type: "document-store",
      uri: "commandgrid://drive",
      owner_team: "Finance and Compliance",
      metadata: { citationAuthority: "controlled-doc" }
    }
  ]);

  await insertRows(
    sql,
    "knowledge_documents",
    KNOWLEDGE_DOCUMENTS.map(([id, sourceId, slug, title, documentType, content, citationLabel, citationUri, version, publishedAt]) => ({
      id,
      organization_id: NORTHSTAR_ORG.id,
      source_id: sourceId,
      slug,
      title,
      document_type: documentType,
      content,
      citation_label: citationLabel,
      citation_uri: citationUri,
      version,
      published_at: publishedAt,
      metadata: { seeded: true, citationMetadata: { sourceId, version } }
    }))
  );

  await insertRows(
    sql,
    "knowledge_snippets",
    KNOWLEDGE_DOCUMENTS.flatMap(([documentId, , , title, , content, citationLabel, citationUri], index) => [
      {
        id: `snippet_${documentId}_primary`,
        document_id: documentId,
        ordinal: 1,
        excerpt: content,
        citation_label: citationLabel,
        citation_uri: citationUri,
        metadata: { snippetType: "primary", title }
      },
      {
        id: `snippet_${documentId}_operational`,
        document_id: documentId,
        ordinal: 2,
        excerpt: `Operational citation ${index + 1}: ${title} is available for incident copilot grounding and report evidence.`,
        citation_label: `${citationLabel}#op`,
        citation_uri: `${citationUri}#operational-note`,
        metadata: { snippetType: "operational-note" }
      }
    ])
  );

  await insertRows(
    sql,
    "support_tickets",
    SUPPORT_TICKETS.map(([id, ticketNumber, subject, status, priority, channel, customerId], index) => ({
      id,
      organization_id: NORTHSTAR_ORG.id,
      incident_id: FLAGSHIP_INCIDENT.id,
      customer_id: customerId,
      ticket_number: ticketNumber,
      subject,
      status,
      priority,
      channel,
      opened_at: new Date(Date.UTC(2025, 1, 18, 16, index * 4)).toISOString(),
      closed_at: null,
      citation_label: `TICKET-${ticketNumber}`,
      metadata: {
        citation: {
          system: "Zendesk demo",
          url: `commandgrid://support/${ticketNumber}`
        }
      }
    }))
  );

  await insertRows(
    sql,
    "system_logs",
    SYSTEM_LOG_MESSAGES.map(([id, serviceId, logLevel, message, traceId], index) => ({
      id,
      organization_id: NORTHSTAR_ORG.id,
      service_id: serviceId,
      incident_id: FLAGSHIP_INCIDENT.id,
      log_level: logLevel,
      message,
      observed_at: new Date(Date.UTC(2025, 1, 18, 15, 47 + index)).toISOString(),
      trace_id: traceId,
      citation_label: `LOG-${index + 1}`,
      metadata: {
        citation: {
          system: "Datadog demo",
          query: `trace_id:${traceId}`
        }
      }
    }))
  );

  await insertRows(sql, "runbooks", [
    {
      id: "runbook_warehouse_latency",
      organization_id: NORTHSTAR_ORG.id,
      service_id: "svc_warehouse_api",
      slug: "warehouse-api-latency",
      title: "Warehouse API latency response",
      owner_team: "Platform Engineering",
      current_version: "v4",
      content: "Diagnose pool saturation, enable buffer mode if order delay exposure exceeds 200 orders, and validate replay health before disabling buffer mode.",
      citation_label: "RUN-WH-API-004",
      citation_uri: "commandgrid://confluence/runbooks/warehouse-api-latency",
      metadata: { escalation: "SEV1" }
    },
    {
      id: "runbook_customer_comms",
      organization_id: NORTHSTAR_ORG.id,
      service_id: "svc_customer_portal",
      slug: "customer-incident-comms",
      title: "Customer incident communications",
      owner_team: "Support",
      current_version: "v5",
      content: "Segment customer updates by priority, cite confirmed impact only, and refresh the status banner every 30 minutes.",
      citation_label: "SUP-COMMS-002",
      citation_uri: "commandgrid://confluence/playbooks/incident-comms",
      metadata: { reviewRole: "support-lead" }
    }
  ]);

  await insertRows(sql, "reports", [
    {
      id: "report_flagship_exec_brief",
      organization_id: NORTHSTAR_ORG.id,
      incident_id: FLAGSHIP_INCIDENT.id,
      slug: "warehouse-api-latency-exec-brief",
      title: "Warehouse API latency executive brief",
      report_type: "executive-brief",
      status: "draft",
      generated_by_user_id: "user_maya_chen",
      generated_at: "2025-02-18T16:10:00.000Z",
      storage_uri: "r2://commandgrid-reports/demo/warehouse-api-latency-exec-brief.md",
      summary: "Active SEV1: 312 delayed orders and $48,200 revenue at risk. Primary mitigation is regional buffer mode.",
      metadata: { citationCount: 11 }
    },
    {
      id: "report_january_ops_review",
      organization_id: NORTHSTAR_ORG.id,
      incident_id: "inc_carrier_webhook_retries_2025_01_30",
      slug: "january-ops-review",
      title: "January operations incident review",
      report_type: "monthly-review",
      status: "published",
      generated_by_user_id: "user_diego_alvarez",
      generated_at: "2025-02-02T12:00:00.000Z",
      storage_uri: "r2://commandgrid-reports/demo/january-ops-review.pdf",
      summary: "January incident trend baseline for demo analytics.",
      metadata: { historical: true }
    }
  ]);

  await insertRows(sql, "integrations", [
    {
      id: "int_datadog",
      organization_id: NORTHSTAR_ORG.id,
      slug: "datadog",
      provider: "datadog",
      display_name: "Datadog Observability",
      status: "connected",
      last_sync_at: "2025-02-18T16:08:00.000Z",
      metadata: { demo: true }
    },
    {
      id: "int_zendesk",
      organization_id: NORTHSTAR_ORG.id,
      slug: "zendesk",
      provider: "zendesk",
      display_name: "Zendesk Support",
      status: "connected",
      last_sync_at: "2025-02-18T16:07:00.000Z",
      metadata: { demo: true }
    },
    {
      id: "int_slack",
      organization_id: NORTHSTAR_ORG.id,
      slug: "slack",
      provider: "slack",
      display_name: "Slack Incident Channel",
      status: "connected",
      last_sync_at: "2025-02-18T16:06:00.000Z",
      metadata: { channel: "#sev1-warehouse-api" }
    }
  ]);

  await insertRows(sql, "notifications", [
    {
      id: "notif_exec_brief",
      organization_id: NORTHSTAR_ORG.id,
      incident_id: FLAGSHIP_INCIDENT.id,
      integration_id: "int_slack",
      channel: "slack",
      recipient: "#exec-ops",
      subject: "SEV1 Warehouse API latency: 312 delayed orders",
      status: "sent",
      sent_at: "2025-02-18T16:11:00.000Z",
      metadata: { messageTs: "demo-1739895060" }
    },
    {
      id: "notif_customer_status",
      organization_id: NORTHSTAR_ORG.id,
      incident_id: FLAGSHIP_INCIDENT.id,
      integration_id: "int_zendesk",
      channel: "email",
      recipient: "affected-customers:platinum-gold",
      subject: "Warehouse processing delay update",
      status: "queued",
      sent_at: null,
      metadata: { approvalId: "approval_publish_customer_update" }
    }
  ]);

  await insertRows(sql, "integration_events", [
    {
      id: "ie_datadog_latency_alert",
      integration_id: "int_datadog",
      event_type: "monitor.alert",
      status: "received",
      occurred_at: "2025-02-18T15:47:00.000Z",
      payload: { monitor: "Warehouse API p95", p95Ms: 1840 }
    },
    {
      id: "ie_zendesk_ticket_sync",
      integration_id: "int_zendesk",
      event_type: "ticket.sync",
      status: "processed",
      occurred_at: "2025-02-18T16:04:00.000Z",
      payload: { syncedTickets: SUPPORT_TICKETS.length }
    },
    {
      id: "ie_slack_notification",
      integration_id: "int_slack",
      event_type: "message.sent",
      status: "processed",
      occurred_at: "2025-02-18T16:11:00.000Z",
      payload: { notificationId: "notif_exec_brief" }
    }
  ]);

  await insertRows(sql, "audit_logs", [
    {
      id: "audit_incident_declared",
      organization_id: NORTHSTAR_ORG.id,
      actor_user_id: "user_diego_alvarez",
      action: "incident.declared",
      target_type: "incident",
      target_id: FLAGSHIP_INCIDENT.id,
      occurred_at: "2025-02-18T15:52:00.000Z",
      ip_address: "10.24.18.45",
      metadata: { severity: "sev1" }
    },
    {
      id: "audit_agent_started",
      organization_id: NORTHSTAR_ORG.id,
      actor_user_id: "user_diego_alvarez",
      action: "agent.started",
      target_type: "agent_run",
      target_id: "agent_run_flagship_triage",
      occurred_at: "2025-02-18T15:55:00.000Z",
      ip_address: "10.24.18.45",
      metadata: { agentName: "Incident Triage Agent" }
    },
    {
      id: "audit_approval_requested",
      organization_id: NORTHSTAR_ORG.id,
      actor_user_id: "user_priya_natarajan",
      action: "approval.requested",
      target_type: "approval",
      target_id: "approval_buffer_mode",
      occurred_at: "2025-02-18T16:06:00.000Z",
      ip_address: "10.24.22.18",
      metadata: { riskLevel: "medium" }
    },
    {
      id: "audit_customer_update_approved",
      organization_id: NORTHSTAR_ORG.id,
      actor_user_id: "user_jordan_ellis",
      action: "approval.approved",
      target_type: "approval",
      target_id: "approval_publish_customer_update",
      occurred_at: "2025-02-18T16:12:00.000Z",
      ip_address: "10.24.31.9",
      metadata: { decisionId: "decision_publish_customer_update" }
    }
  ]);

  return {
    organizationSlug: NORTHSTAR_ORG.slug,
    flagshipIncidentSlug: FLAGSHIP_INCIDENT.slug,
    roles: DEMO_ROLES.length,
    historicalIncidents: HISTORICAL_INCIDENTS.length,
    knowledgeDocuments: KNOWLEDGE_DOCUMENTS.length,
    supportTickets: SUPPORT_TICKETS.length,
    systemLogs: SYSTEM_LOG_MESSAGES.length
  };
}
