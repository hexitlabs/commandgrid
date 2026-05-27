import { and, count, desc, eq, ne, sql } from "drizzle-orm";
import type { CommandGridDb } from "../../lib/db/client";
import {
  agentRuns,
  approvals,
  incidentImpacts,
  incidents,
  orders,
  recommendations,
  roles,
  services,
  supportTickets,
  users
} from "../../lib/db/schema";
import { getRoleViewRule } from "../roles/view-rules";
import type { DashboardOverview, GetDashboardOverviewOptions } from "./types";
import { DEFAULT_ORGANIZATION_SLUG, getOrganizationOrThrow, metadataRecord, readNumberMetadata, toIsoString } from "../shared/query-utils";

function safeCount(value: number | null | undefined) {
  return Number(value ?? 0);
}

function buildOperationalSummary(degradedServiceNames: string[]) {
  if (degradedServiceNames.length === 0) {
    return "All seeded Northstar services are reporting healthy status.";
  }

  return `${degradedServiceNames.join(", ")} ${degradedServiceNames.length === 1 ? "is" : "are"} degraded in the seeded operational model.`;
}

function supportSentiment(openTickets: number, urgentTickets: number): "stable" | "watch" | "negative" {
  if (urgentTickets >= 2 || openTickets >= 5) {
    return "negative";
  }

  if (urgentTickets > 0 || openTickets > 0) {
    return "watch";
  }

  return "stable";
}

export async function getDashboardOverview(db: CommandGridDb, options: GetDashboardOverviewOptions = {}): Promise<DashboardOverview> {
  const organizationSlug = options.organizationSlug ?? DEFAULT_ORGANIZATION_SLUG;
  const organization = await getOrganizationOrThrow(db, organizationSlug);
  const activeStatusSql = sql`${incidents.status} in ('active', 'monitoring', 'mitigated')`;

  const [
    serviceRows,
    incidentTotals,
    incidentStatusRows,
    incidentSeverityRows,
    activeIncidentRows,
    activeImpactRows,
    delayedOrderRows,
    supportRows,
    agentStatusRows,
    recentAgentRows,
    recommendationTotals,
    approvalTotals,
    dueSoonApprovals,
    trendRows,
    flagshipRows
  ] = await Promise.all([
    db
      .select({
        id: services.id,
        slug: services.slug,
        name: services.name,
        tier: services.tier,
        ownerTeam: services.ownerTeam,
        status: services.status,
        sloTargetMs: services.sloTargetMs,
        metadata: services.metadata
      })
      .from(services)
      .where(eq(services.organizationId, organization.id))
      .orderBy(services.tier, services.name),
    db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${incidents.status} in ('active', 'monitoring', 'mitigated'))::int`,
        resolved: sql<number>`count(*) filter (where ${incidents.status} = 'resolved')::int`,
        sev1Active: sql<number>`count(*) filter (where ${incidents.severity} = 'sev1' and ${incidents.status} in ('active', 'monitoring', 'mitigated'))::int`,
        activeRevenueAtRiskCents: sql<number>`coalesce(sum(${incidents.revenueAtRiskCents}) filter (where ${incidents.status} in ('active', 'monitoring', 'mitigated')), 0)::int`,
        activeDelayedOrders: sql<number>`coalesce(sum(${incidents.delayedOrders}) filter (where ${incidents.status} in ('active', 'monitoring', 'mitigated')), 0)::int`,
        activeIncidentCount: sql<number>`count(*) filter (where ${incidents.status} in ('active', 'monitoring', 'mitigated'))::int`
      })
      .from(incidents)
      .where(eq(incidents.organizationId, organization.id)),
    db
      .select({ status: incidents.status, count: count() })
      .from(incidents)
      .where(eq(incidents.organizationId, organization.id))
      .groupBy(incidents.status)
      .orderBy(incidents.status),
    db
      .select({ severity: incidents.severity, count: count() })
      .from(incidents)
      .where(eq(incidents.organizationId, organization.id))
      .groupBy(incidents.severity)
      .orderBy(incidents.severity),
    db
      .select({ id: incidents.id })
      .from(incidents)
      .where(and(eq(incidents.organizationId, organization.id), activeStatusSql)),
    db
      .select({
        serviceId: services.id,
        serviceSlug: services.slug,
        serviceName: services.name,
        serviceStatus: services.status,
        sloTargetMs: services.sloTargetMs,
        impactMetadata: incidentImpacts.metadata
      })
      .from(incidentImpacts)
      .innerJoin(incidents, eq(incidents.id, incidentImpacts.incidentId))
      .leftJoin(services, eq(services.id, incidentImpacts.serviceId))
      .where(and(eq(incidents.organizationId, organization.id), activeStatusSql)),
    db
      .select({
        delayedOrderSampleCount: sql<number>`count(*) filter (where ${orders.delayedMinutes} > 0)::int`,
        averageDelayMinutes: sql<number>`coalesce(avg(${orders.delayedMinutes}) filter (where ${orders.delayedMinutes} > 0), 0)::float`
      })
      .from(orders)
      .where(eq(orders.organizationId, organization.id)),
    db
      .select({
        openTickets: sql<number>`count(*) filter (where ${supportTickets.closedAt} is null)::int`,
        urgentTickets: sql<number>`count(*) filter (where ${supportTickets.closedAt} is null and ${supportTickets.priority} = 'urgent')::int`,
        highPriorityTickets: sql<number>`count(*) filter (where ${supportTickets.closedAt} is null and ${supportTickets.priority} in ('urgent', 'high'))::int`,
        affectedCustomers: sql<number>`count(distinct ${supportTickets.customerId}) filter (where ${supportTickets.closedAt} is null)::int`
      })
      .from(supportTickets)
      .where(eq(supportTickets.organizationId, organization.id)),
    db
      .select({ status: agentRuns.status, count: count() })
      .from(agentRuns)
      .where(eq(agentRuns.organizationId, organization.id))
      .groupBy(agentRuns.status)
      .orderBy(agentRuns.status),
    db
      .select({
        id: agentRuns.id,
        agentName: agentRuns.agentName,
        objective: agentRuns.objective,
        status: agentRuns.status,
        startedAt: agentRuns.startedAt,
        completedAt: agentRuns.completedAt,
        outputSummary: agentRuns.outputSummary
      })
      .from(agentRuns)
      .where(eq(agentRuns.organizationId, organization.id))
      .orderBy(desc(agentRuns.startedAt))
      .limit(5),
    db
      .select({
        total: sql<number>`count(*)::int`,
        pendingApproval: sql<number>`count(*) filter (where ${recommendations.status} = 'pending-approval')::int`,
        inProgress: sql<number>`count(*) filter (where ${recommendations.status} = 'in-progress')::int`
      })
      .from(recommendations)
      .where(eq(recommendations.organizationId, organization.id)),
    db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where ${approvals.status} = 'pending')::int`,
        approved: sql<number>`count(*) filter (where ${approvals.status} = 'approved')::int`,
        highRiskPending: sql<number>`count(*) filter (where ${approvals.status} = 'pending' and ${approvals.riskLevel} = 'high')::int`
      })
      .from(approvals)
      .where(eq(approvals.organizationId, organization.id)),
    db
      .select({
        id: approvals.id,
        title: approvals.title,
        status: approvals.status,
        riskLevel: approvals.riskLevel,
        dueAt: approvals.dueAt,
        incidentSlug: incidents.slug,
        assignedRole: roles.name
      })
      .from(approvals)
      .leftJoin(incidents, eq(incidents.id, approvals.incidentId))
      .leftJoin(roles, eq(roles.id, approvals.assignedRoleId))
      .where(and(eq(approvals.organizationId, organization.id), ne(approvals.status, "approved")))
      .orderBy(approvals.dueAt)
      .limit(5),
    db
      .select({
        period: sql<string>`to_char(date_trunc('month', ${incidents.startedAt}), 'YYYY-MM')`,
        incidentCount: sql<number>`count(*)::int`,
        resolvedCount: sql<number>`count(*) filter (where ${incidents.status} = 'resolved')::int`,
        activeCount: sql<number>`count(*) filter (where ${incidents.status} in ('active', 'monitoring', 'mitigated'))::int`,
        delayedOrders: sql<number>`coalesce(sum(${incidents.delayedOrders}), 0)::int`,
        revenueAtRiskCents: sql<number>`coalesce(sum(${incidents.revenueAtRiskCents}), 0)::int`,
        sev1Count: sql<number>`count(*) filter (where ${incidents.severity} = 'sev1')::int`,
        sev2Count: sql<number>`count(*) filter (where ${incidents.severity} = 'sev2')::int`,
        sev3Count: sql<number>`count(*) filter (where ${incidents.severity} = 'sev3')::int`
      })
      .from(incidents)
      .where(eq(incidents.organizationId, organization.id))
      .groupBy(sql`date_trunc('month', ${incidents.startedAt})`)
      .orderBy(sql`date_trunc('month', ${incidents.startedAt})`),
    db
      .select({
        id: incidents.id,
        slug: incidents.slug,
        title: incidents.title,
        summary: incidents.summary,
        status: incidents.status,
        severity: incidents.severity,
        delayedOrders: incidents.delayedOrders,
        revenueAtRiskCents: incidents.revenueAtRiskCents,
        customerImpactSummary: incidents.customerImpactSummary,
        startedAt: incidents.startedAt,
        detectedAt: incidents.detectedAt,
        commanderName: users.name
      })
      .from(incidents)
      .leftJoin(users, eq(users.id, incidents.commanderUserId))
      .where(and(eq(incidents.organizationId, organization.id), activeStatusSql))
      .orderBy(desc(incidents.startedAt))
      .limit(1)
  ]);

  const totals = incidentTotals[0] ?? {
    total: 0,
    active: 0,
    resolved: 0,
    sev1Active: 0,
    activeRevenueAtRiskCents: 0,
    activeDelayedOrders: 0,
    activeIncidentCount: 0
  };
  const delayedOrderStats = delayedOrderRows[0] ?? { delayedOrderSampleCount: 0, averageDelayMinutes: 0 };
  const supportStats = supportRows[0] ?? { openTickets: 0, urgentTickets: 0, highPriorityTickets: 0, affectedCustomers: 0 };
  const recommendationStats = recommendationTotals[0] ?? { total: 0, pendingApproval: 0, inProgress: 0 };
  const approvalStats = approvalTotals[0] ?? { total: 0, pending: 0, approved: 0, highRiskPending: 0 };

  const healthyServices = serviceRows.filter((service) => service.status === "healthy").length;
  const degradedServices = serviceRows.filter((service) => service.status !== "healthy");
  const totalServices = serviceRows.length;
  const healthScore = totalServices > 0 ? Math.round((healthyServices / totalServices) * 100) : 100;
  const level = totals.sev1Active > 0 ? "critical" : degradedServices.length > 0 ? "degraded" : "healthy";
  const degradedTier0Services = degradedServices.filter((service) => service.tier === "tier-0").length;
  const breachedServices = activeImpactRows
    .filter((row) => row.serviceId)
    .map((row) => {
      const metadata = metadataRecord(row.impactMetadata);
      return {
        serviceId: row.serviceId ?? "",
        serviceSlug: row.serviceSlug ?? "unknown-service",
        serviceName: row.serviceName ?? "Unknown service",
        currentP95Ms: readNumberMetadata(metadata, "p95Ms"),
        sloTargetMs: row.sloTargetMs,
        status: row.serviceStatus ?? "unknown"
      };
    });

  const agentStatusCounts = new Map(agentStatusRows.map((row) => [row.status, safeCount(row.count)]));
  const runningRuns = agentStatusCounts.get("running") ?? 0;
  const completedRuns = agentStatusCounts.get("completed") ?? 0;

  return {
    organization: {
      id: organization.id,
      slug: organization.slug,
      name: organization.name,
      timezone: organization.timezone
    },
    generatedAt: new Date().toISOString(),
    roleView: options.role ? getRoleViewRule(options.role).role : null,
    operationalHealth: {
      level,
      score: healthScore,
      healthyServices,
      degradedServices: degradedServices.length,
      totalServices,
      degradedServiceNames: degradedServices.map((service) => service.name),
      summary: buildOperationalSummary(degradedServices.map((service) => service.name))
    },
    incidents: {
      active: safeCount(totals.active),
      resolved: safeCount(totals.resolved),
      total: safeCount(totals.total),
      sev1Active: safeCount(totals.sev1Active),
      byStatus: incidentStatusRows.map((row) => ({ status: row.status, count: safeCount(row.count) })),
      bySeverity: incidentSeverityRows.map((row) => ({ severity: row.severity, count: safeCount(row.count) }))
    },
    revenueAtRisk: {
      cents: safeCount(totals.activeRevenueAtRiskCents),
      currency: "USD",
      activeIncidentCents: safeCount(totals.activeRevenueAtRiskCents),
      activeIncidentCount: safeCount(totals.activeIncidentCount)
    },
    delayedOrders: {
      count: safeCount(totals.activeDelayedOrders),
      activeIncidentCount: activeIncidentRows.length,
      delayedOrderSampleCount: safeCount(delayedOrderStats.delayedOrderSampleCount),
      averageDelayMinutes: Number(delayedOrderStats.averageDelayMinutes ?? 0)
    },
    slaAvailability: {
      availabilityPercent: totalServices > 0 ? Number(((healthyServices / totalServices) * 100).toFixed(1)) : 100,
      degradedTier0Services,
      breachedServices,
      summary:
        breachedServices.length > 0
          ? `${breachedServices.length} active service impact${breachedServices.length === 1 ? "" : "s"} linked to SLO or availability risk.`
          : "No active SLO breach is linked to seeded incidents."
    },
    supportSignal: {
      openTickets: safeCount(supportStats.openTickets),
      urgentTickets: safeCount(supportStats.urgentTickets),
      highPriorityTickets: safeCount(supportStats.highPriorityTickets),
      affectedCustomers: safeCount(supportStats.affectedCustomers),
      sentiment: supportSentiment(safeCount(supportStats.openTickets), safeCount(supportStats.urgentTickets)),
      summary: `${safeCount(supportStats.openTickets)} open support tickets across ${safeCount(supportStats.affectedCustomers)} affected customers.`
    },
    agentActivity: {
      totalRuns: Array.from(agentStatusCounts.values()).reduce((total, value) => total + value, 0),
      runningRuns,
      completedRuns,
      recommendations: {
        total: safeCount(recommendationStats.total),
        pendingApproval: safeCount(recommendationStats.pendingApproval),
        inProgress: safeCount(recommendationStats.inProgress)
      },
      recentRuns: recentAgentRows.map((run) => ({
        ...run,
        startedAt: toIsoString(run.startedAt) ?? "",
        completedAt: toIsoString(run.completedAt)
      }))
    },
    approvals: {
      pending: safeCount(approvalStats.pending),
      approved: safeCount(approvalStats.approved),
      total: safeCount(approvalStats.total),
      highRiskPending: safeCount(approvalStats.highRiskPending),
      dueSoon: dueSoonApprovals.map((approval) => ({
        id: approval.id,
        title: approval.title,
        status: approval.status,
        riskLevel: approval.riskLevel,
        dueAt: toIsoString(approval.dueAt),
        incidentSlug: approval.incidentSlug,
        assignedRole: approval.assignedRole
      }))
    },
    incidentTrend: trendRows.map((point) => ({
      period: point.period,
      incidentCount: safeCount(point.incidentCount),
      resolvedCount: safeCount(point.resolvedCount),
      activeCount: safeCount(point.activeCount),
      delayedOrders: safeCount(point.delayedOrders),
      revenueAtRiskCents: safeCount(point.revenueAtRiskCents),
      sev1Count: safeCount(point.sev1Count),
      sev2Count: safeCount(point.sev2Count),
      sev3Count: safeCount(point.sev3Count)
    })),
    flagshipIncident: flagshipRows[0]
      ? {
          ...flagshipRows[0],
          startedAt: toIsoString(flagshipRows[0].startedAt) ?? "",
          detectedAt: toIsoString(flagshipRows[0].detectedAt) ?? ""
        }
      : null
  };
}
