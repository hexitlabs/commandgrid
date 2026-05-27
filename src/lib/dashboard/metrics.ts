import { and, count, desc, eq, sql } from "drizzle-orm";
import type { CommandGridDb } from "@/lib/db/client";
import {
  agentRuns,
  approvals,
  auditLogs,
  incidents,
  knowledgeDocuments,
  knowledgeSnippets,
  knowledgeSources,
  organizations,
  reports,
  roles,
  supportTickets,
  systemLogs,
  users
} from "@/lib/db/schema";

export type DashboardMetrics = Awaited<ReturnType<typeof getDashboardMetrics>>;

const centsToDollars = (cents: number) => cents / 100;

export async function getOrganizationBySlug(db: CommandGridDb, organizationSlug = "northstar-logistics") {
  const [organization] = await db.select().from(organizations).where(eq(organizations.slug, organizationSlug)).limit(1);

  if (!organization) {
    throw new Error(`Organization not found: ${organizationSlug}`);
  }

  return organization;
}

export async function getActiveIncidentSummary(db: CommandGridDb, organizationSlug = "northstar-logistics") {
  const organization = await getOrganizationBySlug(db, organizationSlug);
  const [incident] = await db
    .select({
      id: incidents.id,
      slug: incidents.slug,
      title: incidents.title,
      status: incidents.status,
      severity: incidents.severity,
      delayedOrders: incidents.delayedOrders,
      revenueAtRiskCents: incidents.revenueAtRiskCents,
      customerImpactSummary: incidents.customerImpactSummary,
      startedAt: incidents.startedAt
    })
    .from(incidents)
    .where(and(eq(incidents.organizationId, organization.id), eq(incidents.status, "active")))
    .orderBy(desc(incidents.startedAt))
    .limit(1);

  if (!incident) {
    throw new Error(`No active incident found for ${organizationSlug}`);
  }

  return {
    ...incident,
    revenueAtRiskDollars: centsToDollars(incident.revenueAtRiskCents)
  };
}

export async function getIncidentCountsByStatusSeverity(db: CommandGridDb, organizationSlug = "northstar-logistics") {
  const organization = await getOrganizationBySlug(db, organizationSlug);

  return db
    .select({
      status: incidents.status,
      severity: incidents.severity,
      count: count()
    })
    .from(incidents)
    .where(eq(incidents.organizationId, organization.id))
    .groupBy(incidents.status, incidents.severity)
    .orderBy(incidents.status, incidents.severity);
}

export async function getAgentRunStatusSummary(db: CommandGridDb, organizationSlug = "northstar-logistics") {
  const organization = await getOrganizationBySlug(db, organizationSlug);

  return db
    .select({
      status: agentRuns.status,
      count: count()
    })
    .from(agentRuns)
    .where(eq(agentRuns.organizationId, organization.id))
    .groupBy(agentRuns.status)
    .orderBy(agentRuns.status);
}

export async function getApprovalQueueCounts(db: CommandGridDb, organizationSlug = "northstar-logistics") {
  const organization = await getOrganizationBySlug(db, organizationSlug);

  return db
    .select({
      status: approvals.status,
      riskLevel: approvals.riskLevel,
      count: count()
    })
    .from(approvals)
    .where(eq(approvals.organizationId, organization.id))
    .groupBy(approvals.status, approvals.riskLevel)
    .orderBy(approvals.status, approvals.riskLevel);
}

export async function getKnowledgeCitationCounts(db: CommandGridDb, organizationSlug = "northstar-logistics") {
  const organization = await getOrganizationBySlug(db, organizationSlug);
  const [result] = await db
    .select({
      sources: count(sql`distinct ${knowledgeSources.id}`),
      documents: count(sql`distinct ${knowledgeDocuments.id}`),
      snippets: count(sql`distinct ${knowledgeSnippets.id}`),
      supportTickets: count(sql`distinct ${supportTickets.id}`),
      systemLogs: count(sql`distinct ${systemLogs.id}`)
    })
    .from(organizations)
    .leftJoin(knowledgeSources, eq(knowledgeSources.organizationId, organizations.id))
    .leftJoin(knowledgeDocuments, eq(knowledgeDocuments.organizationId, organizations.id))
    .leftJoin(knowledgeSnippets, eq(knowledgeSnippets.documentId, knowledgeDocuments.id))
    .leftJoin(supportTickets, eq(supportTickets.organizationId, organizations.id))
    .leftJoin(systemLogs, eq(systemLogs.organizationId, organizations.id))
    .where(eq(organizations.id, organization.id));

  return result ?? { sources: 0, documents: 0, snippets: 0, supportTickets: 0, systemLogs: 0 };
}

export async function getAuditActivityCounts(db: CommandGridDb, organizationSlug = "northstar-logistics") {
  const organization = await getOrganizationBySlug(db, organizationSlug);

  return db
    .select({
      action: auditLogs.action,
      count: count()
    })
    .from(auditLogs)
    .where(eq(auditLogs.organizationId, organization.id))
    .groupBy(auditLogs.action)
    .orderBy(auditLogs.action);
}

export async function getDemoWorldCounts(db: CommandGridDb, organizationSlug = "northstar-logistics") {
  const organization = await getOrganizationBySlug(db, organizationSlug);
  const [roleCount] = await db.select({ count: count() }).from(roles).where(eq(roles.organizationId, organization.id));
  const [userCount] = await db.select({ count: count() }).from(users).where(eq(users.organizationId, organization.id));
  const [incidentCount] = await db.select({ count: count() }).from(incidents).where(eq(incidents.organizationId, organization.id));
  const [reportCount] = await db.select({ count: count() }).from(reports).where(eq(reports.organizationId, organization.id));

  return {
    roles: roleCount?.count ?? 0,
    users: userCount?.count ?? 0,
    incidents: incidentCount?.count ?? 0,
    reports: reportCount?.count ?? 0
  };
}

export async function getDashboardMetrics(db: CommandGridDb, organizationSlug = "northstar-logistics") {
  const [
    activeIncident,
    incidentCounts,
    agentRunStatus,
    approvalQueue,
    knowledgeCitations,
    auditActivity,
    demoWorldCounts
  ] = await Promise.all([
    getActiveIncidentSummary(db, organizationSlug),
    getIncidentCountsByStatusSeverity(db, organizationSlug),
    getAgentRunStatusSummary(db, organizationSlug),
    getApprovalQueueCounts(db, organizationSlug),
    getKnowledgeCitationCounts(db, organizationSlug),
    getAuditActivityCounts(db, organizationSlug),
    getDemoWorldCounts(db, organizationSlug)
  ]);

  return {
    activeIncident,
    incidentCounts,
    agentRunStatus,
    approvalQueue,
    knowledgeCitations,
    auditActivity,
    demoWorldCounts
  };
}
