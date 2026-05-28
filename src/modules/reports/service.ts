import { asc, desc, eq } from "drizzle-orm";
import { generateWithAiGateway, type AiGenerationEnv, type AiGenerationResult } from "../../lib/ai/gateway";
import type { CommandGridDbLike } from "../../lib/db/client";
import {
  customers,
  incidentAffectedOrders,
  incidentImpacts,
  incidentTimelineEvents,
  incidents,
  orders,
  recommendations,
  reports
} from "../../lib/db/schema";
import { FLAGSHIP_INCIDENT } from "../../lib/demo/northstar-data";
import { writeAuditLog } from "../audit/service";
import { DEFAULT_KNOWLEDGE_ORGANIZATION_ID, matchDemoPrompt } from "../knowledge/prompts";
import { repairAnswerCitations, searchKnowledge } from "../knowledge/retrieval";
import type { KnowledgeCitation } from "../knowledge/types";
import type { DemoRoleSlug } from "../roles/view-rules";
import type { GeneratedReport, GenerateReportInput, ReportListItem, ReportType } from "./types";

export type ReportEnv = AiGenerationEnv;

type IncidentContext = {
  incident: {
    id: string;
    organizationId: string;
    slug: string;
    title: string;
    summary: string;
    status: string;
    severity: string;
    startedAt: Date;
    detectedAt: Date;
    resolvedAt: Date | null;
    delayedOrders: number;
    revenueAtRiskCents: number;
    customerImpactSummary: string;
  };
  timeline: Array<{ title: string; body: string; eventType: string; occurredAt: Date }>;
  impacts: Array<{ impactType: string; severity: string; description: string; affectedCount: number; revenueAtRiskCents: number }>;
  recommendations: Array<{ title: string; body: string; priority: string; status: string; metadata: Record<string, unknown> }>;
  affectedOrders: Array<{ orderNumber: string; status: string; revenueCents: number; delayedMinutes: number; customerName: string; priority: string; region: string }>;
};

const reportTitles: Record<ReportType, string> = {
  "postmortem": "Warehouse API latency incident postmortem",
  "executive-summary": "Warehouse API latency executive summary",
  "customer-impact": "Warehouse API latency customer impact report"
};

const reportQueries: Record<ReportType, string> = {
  "postmortem": "post incident report timeline root cause customer communications decisions follow-up owners warehouse api latency",
  "executive-summary": "executive summary warehouse delay impact mitigation revenue customer communications credit threshold",
  "customer-impact": "customer updates credit approval threshold support communications delayed orders platinum customers incident"
};

function cents(value: number) {
  return (value / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function stableId(prefix: string, values: Array<string | null | undefined>, now = new Date()) {
  const input = values.filter(Boolean).join("|");
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 33 + input.charCodeAt(index)) >>> 0;
  }
  return `${prefix}_${now.getTime().toString(36)}_${hash.toString(36)}`;
}

function slugFor(type: ReportType, incidentSlug: string) {
  return `${incidentSlug}-${type}`;
}

function reportIdFor(type: ReportType, incidentId: string) {
  return `report_phase7a_${type.replace(/-/g, "_")}_${incidentId}`;
}

function topCustomers(context: IncidentContext) {
  return [...context.affectedOrders]
    .sort((a, b) => b.revenueCents - a.revenueCents || b.delayedMinutes - a.delayedMinutes || a.customerName.localeCompare(b.customerName))
    .slice(0, 5);
}

function citationLine(citations: KnowledgeCitation[]) {
  return citations.slice(0, 5).map((citation) => `[${citation.label}]`).join(" ");
}

function markdownFallback(type: ReportType, context: IncidentContext, citations: KnowledgeCitation[]) {
  const incident = context.incident;
  const cited = citationLine(citations);
  const timeline = context.timeline.map((event) => `- ${event.occurredAt.toISOString()}: ${event.title} — ${event.body}`).join("\n");
  const impact = context.impacts
    .map((row) => `- ${row.description} (${row.affectedCount} affected, ${cents(row.revenueAtRiskCents)} at risk)`)
    .join("\n");
  const recs = context.recommendations.map((rec) => `- ${rec.title}: ${rec.body} (${rec.status}, ${rec.priority})`).join("\n");
  const customerRows = topCustomers(context)
    .map((order) => `- ${order.customerName} (${order.priority}, ${order.region}) order ${order.orderNumber}: ${order.delayedMinutes} min delay, ${cents(order.revenueCents)} exposure`)
    .join("\n");

  if (type === "postmortem") {
    return `# ${reportTitles[type]}\n\n## Summary\n${incident.summary} Current demo impact is ${incident.delayedOrders} delayed orders and ${cents(incident.revenueAtRiskCents)} revenue at risk. ${cited}\n\n## Timeline\n${timeline}\n\n## Impact\n${impact}\n\n## Root cause and mitigation\nEvidence points to Warehouse API latency and connection-pool saturation. The documented mitigation is regional buffer mode while p95 recovers below 500ms for ten minutes. ${cited}\n\n## Decisions and follow-up\n${recs}\n\n## Customer communications\nSupport should send factual updates every 30 minutes during SEV1/SEV2 response and record communications for the post-incident package. ${cited}`;
  }

  if (type === "executive-summary") {
    return `# ${reportTitles[type]}\n\n## Executive readout\nNorthstar Logistics has an active ${incident.severity.toUpperCase()} Warehouse API latency incident. The seeded impact is ${incident.delayedOrders} delayed orders and ${cents(incident.revenueAtRiskCents)} revenue at risk. ${cited}\n\n## Business impact\n${impact}\n\n## Mitigation path\nOperations should stabilize route assignments through regional buffer mode while engineering addresses pool saturation; Support keeps customers updated every 30 minutes. ${cited}\n\n## Governance watchpoints\nFinance approval is required before platinum-account credits exceed the documented threshold; Ops approval is required for remediation steps that alter route assignment behavior. ${cited}`;
  }

  return `# ${reportTitles[type]}\n\n## Customer impact\n${incident.customerImpactSummary} ${cited}\n\n## Priority customer exposure\n${customerRows}\n\n## Communication plan\nSupport should publish proactive customer updates every 30 minutes during the incident, cite confirmed facts only, and avoid speculative root-cause language. ${cited}\n\n## Credit and SLA guardrails\nFinance approval is required above $25,000 aggregate platinum exposure or any manual credit over $2,500. ${cited}`;
}

function summaryFor(type: ReportType, context: IncidentContext) {
  switch (type) {
    case "postmortem":
      return `Postmortem draft for ${context.incident.title}: ${context.incident.delayedOrders} delayed orders, ${cents(context.incident.revenueAtRiskCents)} revenue at risk, mitigation and follow-ups captured.`;
    case "executive-summary":
      return `Executive summary: ${context.incident.severity.toUpperCase()} ${context.incident.title}, ${context.incident.delayedOrders} delayed orders, ${cents(context.incident.revenueAtRiskCents)} at risk.`;
    case "customer-impact":
      return `Customer impact report: ${context.affectedOrders.length} sampled impacted orders across priority accounts with communication and credit guardrails.`;
  }
}

function reportPrompt(type: ReportType, context: IncidentContext, citations: KnowledgeCitation[]) {
  return `Report type: ${type}\nIncident: ${context.incident.title}\nStatus: ${context.incident.status}\nSeverity: ${context.incident.severity}\nSummary: ${context.incident.summary}\nImpact: ${context.incident.customerImpactSummary}; revenueAtRisk=${cents(context.incident.revenueAtRiskCents)}\nTimeline: ${context.timeline.map((event) => `${event.title}: ${event.body}`).join(" | ")}\nRecommendations: ${context.recommendations.map((rec) => `${rec.title}: ${rec.body}`).join(" | ")}\nAllowed citations: ${citations.map((citation) => `${citation.label}=${citation.excerpt}`).join(" | ")}\n\nGenerate a clean markdown report. Use only bracketed citation labels from the allowed citations.`;
}

async function loadIncidentContext(db: CommandGridDbLike, incidentId: string, organizationId: string): Promise<IncidentContext> {
  const [incident] = await db
    .select({
      id: incidents.id,
      organizationId: incidents.organizationId,
      slug: incidents.slug,
      title: incidents.title,
      summary: incidents.summary,
      status: incidents.status,
      severity: incidents.severity,
      startedAt: incidents.startedAt,
      detectedAt: incidents.detectedAt,
      resolvedAt: incidents.resolvedAt,
      delayedOrders: incidents.delayedOrders,
      revenueAtRiskCents: incidents.revenueAtRiskCents,
      customerImpactSummary: incidents.customerImpactSummary
    })
    .from(incidents)
    .where(eq(incidents.id, incidentId))
    .limit(1);

  if (!incident || incident.organizationId !== organizationId) {
    throw new Error(`Incident ${incidentId} was not found for organization ${organizationId}.`);
  }

  const [timeline, impacts, recs, affectedOrders] = await Promise.all([
    db
      .select({ title: incidentTimelineEvents.title, body: incidentTimelineEvents.body, eventType: incidentTimelineEvents.eventType, occurredAt: incidentTimelineEvents.occurredAt })
      .from(incidentTimelineEvents)
      .where(eq(incidentTimelineEvents.incidentId, incidentId))
      .orderBy(asc(incidentTimelineEvents.occurredAt)),
    db
      .select({
        impactType: incidentImpacts.impactType,
        severity: incidentImpacts.severity,
        description: incidentImpacts.description,
        affectedCount: incidentImpacts.affectedCount,
        revenueAtRiskCents: incidentImpacts.revenueAtRiskCents
      })
      .from(incidentImpacts)
      .where(eq(incidentImpacts.incidentId, incidentId)),
    db
      .select({ title: recommendations.title, body: recommendations.body, priority: recommendations.priority, status: recommendations.status, metadata: recommendations.metadata })
      .from(recommendations)
      .where(eq(recommendations.incidentId, incidentId)),
    db
      .select({
        orderNumber: orders.orderNumber,
        status: orders.status,
        revenueCents: orders.revenueCents,
        delayedMinutes: orders.delayedMinutes,
        customerName: customers.name,
        priority: customers.priority,
        region: customers.region
      })
      .from(incidentAffectedOrders)
      .innerJoin(orders, eq(incidentAffectedOrders.orderId, orders.id))
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(incidentAffectedOrders.incidentId, incidentId))
  ]);

  return { incident, timeline, impacts, recommendations: recs, affectedOrders };
}

async function generateReportMarkdown(env: ReportEnv, type: ReportType, context: IncidentContext, citations: KnowledgeCitation[], fallback: string): Promise<AiGenerationResult> {
  return generateWithAiGateway(env, {
    system:
      "You are CommandGrid Reports. Produce concise markdown reports from supplied incident facts and cited knowledge only. Do not invent dates, customers, source ids, or remediations.",
    prompt: reportPrompt(type, context, citations),
    fallback,
    timeoutMs: 2_500,
    retries: 0
  });
}

export function canGenerateReport(role: DemoRoleSlug, type: ReportType) {
  if (role === "admin" || role === "ops-manager") return true;
  if (role === "executive" && type === "executive-summary") return true;
  if (role === "support-lead" && type === "customer-impact") return true;
  return false;
}

export async function generateIncidentReport(db: CommandGridDbLike, env: ReportEnv = {}, input: GenerateReportInput): Promise<GeneratedReport> {
  const organizationId = input.organizationId ?? DEFAULT_KNOWLEDGE_ORGANIZATION_ID;
  const incidentId = input.incidentId ?? FLAGSHIP_INCIDENT.id;
  const role = input.role ?? "ops-manager";

  if (!canGenerateReport(role, input.reportType)) {
    throw new Error(`Role ${role} cannot generate ${input.reportType} reports in the demo contract.`);
  }

  const context = await loadIncidentContext(db, incidentId, organizationId);
  const search = await searchKnowledge(db, { query: reportQueries[input.reportType], organizationId, limit: 6 });
  const fallback = markdownFallback(input.reportType, context, search.citations);
  const ai = await generateReportMarkdown(env, input.reportType, context, search.citations, fallback);
  const markdown = repairAnswerCitations(ai.text, search.citations);
  const now = new Date();
  const id = reportIdFor(input.reportType, incidentId);
  const slug = slugFor(input.reportType, context.incident.slug);
  const summary = summaryFor(input.reportType, context);
  const storageUri = `commandgrid://reports/${organizationId}/${slug}.md`;

  if (input.persist ?? true) {
    await db
      .insert(reports)
      .values({
        id,
        organizationId,
        incidentId,
        slug,
        title: reportTitles[input.reportType],
        reportType: input.reportType,
        status: "draft",
        generatedByUserId: input.actorUserId ?? null,
        generatedAt: now,
        storageUri,
        summary,
        metadata: {
          phase: "7A",
          role,
          markdown,
          citationIds: search.citations.map((citation) => citation.id),
          citationLabels: search.citations.map((citation) => citation.label),
          aiMode: ai.mode,
          aiAttempts: ai.attempts,
          aiError: ai.error ?? null,
          matchedPromptId: matchDemoPrompt(reportQueries[input.reportType])?.id ?? null
        }
      })
      .onConflictDoUpdate({
        target: reports.id,
        set: {
          title: reportTitles[input.reportType],
          reportType: input.reportType,
          status: "draft",
          generatedByUserId: input.actorUserId ?? null,
          generatedAt: now,
          storageUri,
          summary,
          metadata: {
            phase: "7A",
            role,
            markdown,
            citationIds: search.citations.map((citation) => citation.id),
            citationLabels: search.citations.map((citation) => citation.label),
            aiMode: ai.mode,
            aiAttempts: ai.attempts,
            aiError: ai.error ?? null,
            matchedPromptId: matchDemoPrompt(reportQueries[input.reportType])?.id ?? null
          },
          updatedAt: now
        }
      });
  }

  await writeAuditLog(db, {
    id: stableId("audit_report", [id, input.reportType, role], now),
    organizationId,
    actorUserId: input.actorUserId ?? null,
    action: "report.generated",
    targetType: "report",
    targetId: id,
    occurredAt: now,
    ipAddress: input.ipAddress ?? null,
    metadata: {
      reportType: input.reportType,
      role,
      incidentId,
      persisted: input.persist ?? true,
      citationIds: search.citations.map((citation) => citation.id),
      citationLabels: search.citations.map((citation) => citation.label),
      aiMode: ai.mode
    }
  });

  return {
    id,
    organizationId,
    incidentId,
    slug,
    title: reportTitles[input.reportType],
    reportType: input.reportType,
    status: "draft",
    generatedAt: now.toISOString(),
    storageUri,
    summary,
    markdown,
    citations: search.citations,
    ai: { mode: ai.mode, attempts: ai.attempts, error: ai.error },
    persisted: input.persist ?? true
  };
}

function coerceMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export async function listReports(db: CommandGridDbLike, organizationId = DEFAULT_KNOWLEDGE_ORGANIZATION_ID, limit = 25): Promise<ReportListItem[]> {
  const rows = await db
    .select({
      id: reports.id,
      organizationId: reports.organizationId,
      incidentId: reports.incidentId,
      slug: reports.slug,
      title: reports.title,
      reportType: reports.reportType,
      status: reports.status,
      generatedByUserId: reports.generatedByUserId,
      generatedAt: reports.generatedAt,
      storageUri: reports.storageUri,
      summary: reports.summary,
      metadata: reports.metadata
    })
    .from(reports)
    .where(eq(reports.organizationId, organizationId))
    .orderBy(desc(reports.generatedAt))
    .limit(limit);

  return rows.map((row) => ({ ...row, generatedAt: row.generatedAt.toISOString(), metadata: coerceMetadata(row.metadata) }));
}

export async function getReport(db: CommandGridDbLike, id: string, organizationId = DEFAULT_KNOWLEDGE_ORGANIZATION_ID): Promise<ReportListItem | null> {
  const [row] = await db
    .select({
      id: reports.id,
      organizationId: reports.organizationId,
      incidentId: reports.incidentId,
      slug: reports.slug,
      title: reports.title,
      reportType: reports.reportType,
      status: reports.status,
      generatedByUserId: reports.generatedByUserId,
      generatedAt: reports.generatedAt,
      storageUri: reports.storageUri,
      summary: reports.summary,
      metadata: reports.metadata
    })
    .from(reports)
    .where(eq(reports.id, id))
    .limit(1);

  if (!row || row.organizationId !== organizationId) return null;
  return { ...row, generatedAt: row.generatedAt.toISOString(), metadata: coerceMetadata(row.metadata) };
}
