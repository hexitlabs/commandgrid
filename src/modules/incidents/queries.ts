import { and, asc, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import type { AnyColumn, SQL } from "drizzle-orm";
import type { CommandGridDb } from "../../lib/db/client";
import {
  agentEvents,
  agentRuns,
  approvals,
  auditLogs,
  customers,
  decisions,
  incidentAffectedOrders,
  incidentImpacts,
  incidentTimelineEvents,
  incidents,
  knowledgeDocuments,
  knowledgeSources,
  orders,
  recommendations,
  reports,
  roles,
  runbooks,
  services,
  supportTickets,
  systemLogs,
  users
} from "../../lib/db/schema";
import { getRoleViewRule } from "../roles/view-rules";
import type { DemoRoleSlug } from "../roles/view-rules";
import { normalizeIncidentListFilters } from "./filters";
import type {
  IncidentAffectedCustomer,
  IncidentAgentRun,
  IncidentApprovalPreview,
  IncidentAuditPreview,
  IncidentBusinessImpact,
  IncidentCitation,
  IncidentDetail,
  IncidentListFilters,
  IncidentListResult,
  IncidentRecommendation,
  IncidentReportPreview,
  IncidentServiceRef,
  IncidentTimelineItem
} from "./types";
import {
  DEFAULT_ORGANIZATION_SLUG,
  getOrganizationOrThrow,
  metadataRecord,
  readStringArrayMetadata,
  toIsoString
} from "../shared/query-utils";

function countNumber(value: number | null | undefined) {
  return Number(value ?? 0);
}

function orderExpression(sortBy: NonNullable<ReturnType<typeof normalizeIncidentListFilters>["sortBy"]>): AnyColumn | SQL {
  switch (sortBy) {
    case "detectedAt":
      return incidents.detectedAt;
    case "severity":
      return sql`case ${incidents.severity} when 'sev1' then 1 when 'sev2' then 2 when 'sev3' then 3 when 'sev4' then 4 else 99 end`;
    case "status":
      return incidents.status;
    case "revenueAtRisk":
      return incidents.revenueAtRiskCents;
    case "delayedOrders":
      return incidents.delayedOrders;
    case "startedAt":
    default:
      return incidents.startedAt;
  }
}

function citationUriFromMetadata(metadata: Record<string, unknown>, fallback: string | null) {
  const citation = metadata.citation;

  if (citation && typeof citation === "object" && !Array.isArray(citation)) {
    const citationRecord = citation as Record<string, unknown>;
    if (typeof citationRecord.url === "string") {
      return citationRecord.url;
    }

    if (typeof citationRecord.query === "string") {
      return `commandgrid://observability/logs?query=${encodeURIComponent(citationRecord.query)}`;
    }
  }

  return fallback;
}

function actorShape(actor: {
  actorId: string | null;
  actorName: string | null;
  actorTitle: string | null;
  actorInitials?: string | null;
}) {
  if (!actor.actorId || !actor.actorName || !actor.actorTitle) {
    return null;
  }

  return {
    id: actor.actorId,
    name: actor.actorName,
    title: actor.actorTitle,
    avatarInitials: actor.actorInitials ?? actor.actorName.slice(0, 2).toUpperCase()
  };
}

function simpleUserShape(user: { id: string | null; name: string | null; title: string | null }) {
  if (!user.id || !user.name || !user.title) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    title: user.title
  };
}

export async function getIncidentList(db: CommandGridDb, filters: IncidentListFilters = {}): Promise<IncidentListResult> {
  const normalized = normalizeIncidentListFilters(filters);
  const organization = await getOrganizationOrThrow(db, normalized.organizationSlug);
  const conditions = [eq(incidents.organizationId, organization.id)];

  if (normalized.status?.length) {
    conditions.push(inArray(incidents.status, normalized.status));
  }

  if (normalized.severity?.length) {
    conditions.push(inArray(incidents.severity, normalized.severity));
  }

  const whereClause = and(...conditions);
  const orderedBy = normalized.sortDirection === "asc" ? asc(orderExpression(normalized.sortBy)) : desc(orderExpression(normalized.sortBy));

  const rows = await db
    .select({
      id: incidents.id,
      slug: incidents.slug,
      title: incidents.title,
      summary: incidents.summary,
      status: incidents.status,
      severity: incidents.severity,
      commanderName: users.name,
      startedAt: incidents.startedAt,
      detectedAt: incidents.detectedAt,
      resolvedAt: incidents.resolvedAt,
      delayedOrders: incidents.delayedOrders,
      revenueAtRiskCents: incidents.revenueAtRiskCents,
      customerImpactSummary: incidents.customerImpactSummary,
      affectedCustomers: sql<number>`count(distinct ${customers.id})::int`,
      affectedServices: sql<number>`count(distinct ${incidentImpacts.serviceId})::int`,
      supportTickets: sql<number>`count(distinct ${supportTickets.id})::int`,
      pendingApprovals: sql<number>`count(distinct ${approvals.id}) filter (where ${approvals.status} = 'pending')::int`,
      agentRuns: sql<number>`count(distinct ${agentRuns.id})::int`
    })
    .from(incidents)
    .leftJoin(users, eq(users.id, incidents.commanderUserId))
    .leftJoin(incidentAffectedOrders, eq(incidentAffectedOrders.incidentId, incidents.id))
    .leftJoin(orders, eq(orders.id, incidentAffectedOrders.orderId))
    .leftJoin(customers, eq(customers.id, orders.customerId))
    .leftJoin(incidentImpacts, eq(incidentImpacts.incidentId, incidents.id))
    .leftJoin(supportTickets, eq(supportTickets.incidentId, incidents.id))
    .leftJoin(approvals, eq(approvals.incidentId, incidents.id))
    .leftJoin(agentRuns, eq(agentRuns.incidentId, incidents.id))
    .where(whereClause)
    .groupBy(
      incidents.id,
      incidents.slug,
      incidents.title,
      incidents.summary,
      incidents.status,
      incidents.severity,
      users.name,
      incidents.startedAt,
      incidents.detectedAt,
      incidents.resolvedAt,
      incidents.delayedOrders,
      incidents.revenueAtRiskCents,
      incidents.customerImpactSummary
    )
    .orderBy(orderedBy)
    .limit(normalized.limit);

  const incidentItems = rows.map((row) => ({
    ...row,
    startedAt: toIsoString(row.startedAt) ?? "",
    detectedAt: toIsoString(row.detectedAt) ?? "",
    resolvedAt: toIsoString(row.resolvedAt),
    affectedCustomers: countNumber(row.affectedCustomers),
    affectedServices: countNumber(row.affectedServices),
    supportTickets: countNumber(row.supportTickets),
    pendingApprovals: countNumber(row.pendingApprovals),
    agentRuns: countNumber(row.agentRuns)
  }));

  return {
    organizationSlug: organization.slug,
    filters: {
      status: normalized.status,
      severity: normalized.severity,
      sortBy: normalized.sortBy,
      sortDirection: normalized.sortDirection,
      limit: normalized.limit
    },
    summary: {
      total: incidentItems.length,
      active: incidentItems.filter((incident) => incident.status !== "resolved").length,
      resolved: incidentItems.filter((incident) => incident.status === "resolved").length,
      revenueAtRiskCents: incidentItems.reduce((total, incident) => total + incident.revenueAtRiskCents, 0),
      delayedOrders: incidentItems.reduce((total, incident) => total + incident.delayedOrders, 0)
    },
    incidents: incidentItems
  };
}

export async function getIncidentDetail(
  db: CommandGridDb,
  incidentIdOrSlug: string,
  options: { organizationSlug?: string; role?: DemoRoleSlug } = {}
): Promise<IncidentDetail | null> {
  const organizationSlug = options.organizationSlug ?? DEFAULT_ORGANIZATION_SLUG;
  const organization = await getOrganizationOrThrow(db, organizationSlug);

  const [incidentRow] = await db
    .select({
      id: incidents.id,
      slug: incidents.slug,
      title: incidents.title,
      summary: incidents.summary,
      status: incidents.status,
      severity: incidents.severity,
      commanderId: users.id,
      commanderName: users.name,
      commanderTitle: users.title,
      commanderInitials: users.avatarInitials,
      startedAt: incidents.startedAt,
      detectedAt: incidents.detectedAt,
      resolvedAt: incidents.resolvedAt,
      delayedOrders: incidents.delayedOrders,
      revenueAtRiskCents: incidents.revenueAtRiskCents,
      customerImpactSummary: incidents.customerImpactSummary,
      metadata: incidents.metadata
    })
    .from(incidents)
    .leftJoin(users, eq(users.id, incidents.commanderUserId))
    .where(and(eq(incidents.organizationId, organization.id), or(eq(incidents.id, incidentIdOrSlug), eq(incidents.slug, incidentIdOrSlug))))
    .limit(1);

  if (!incidentRow) {
    return null;
  }

  const [
    timelineRows,
    impactRows,
    affectedOrderRows,
    affectedCustomerRows,
    logRows,
    ticketRows,
    documentRows,
    runbookRows,
    agentRows,
    recommendationRows,
    approvalRows,
    reportRows,
    auditRows
  ] = await Promise.all([
    db
      .select({
        id: incidentTimelineEvents.id,
        eventType: incidentTimelineEvents.eventType,
        title: incidentTimelineEvents.title,
        body: incidentTimelineEvents.body,
        occurredAt: incidentTimelineEvents.occurredAt,
        actorId: users.id,
        actorName: users.name,
        actorTitle: users.title,
        actorInitials: users.avatarInitials,
        metadata: incidentTimelineEvents.metadata
      })
      .from(incidentTimelineEvents)
      .leftJoin(users, eq(users.id, incidentTimelineEvents.actorUserId))
      .where(eq(incidentTimelineEvents.incidentId, incidentRow.id))
      .orderBy(incidentTimelineEvents.occurredAt),
    db
      .select({
        id: incidentImpacts.id,
        impactType: incidentImpacts.impactType,
        severity: incidentImpacts.severity,
        description: incidentImpacts.description,
        affectedCount: incidentImpacts.affectedCount,
        revenueAtRiskCents: incidentImpacts.revenueAtRiskCents,
        metadata: incidentImpacts.metadata,
        serviceId: services.id,
        serviceSlug: services.slug,
        serviceName: services.name,
        serviceTier: services.tier,
        serviceOwnerTeam: services.ownerTeam,
        serviceStatus: services.status,
        serviceSloTargetMs: services.sloTargetMs
      })
      .from(incidentImpacts)
      .leftJoin(services, eq(services.id, incidentImpacts.serviceId))
      .where(eq(incidentImpacts.incidentId, incidentRow.id))
      .orderBy(desc(incidentImpacts.revenueAtRiskCents)),
    db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        delayedMinutes: orders.delayedMinutes,
        promisedAt: orders.promisedAt,
        revenueCents: orders.revenueCents,
        reason: incidentAffectedOrders.reason,
        impactCents: incidentAffectedOrders.impactCents,
        customerId: customers.id,
        customerExternalRef: customers.externalRef,
        customerName: customers.name,
        customerSegment: customers.segment,
        customerPriority: customers.priority
      })
      .from(incidentAffectedOrders)
      .innerJoin(orders, eq(orders.id, incidentAffectedOrders.orderId))
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(eq(incidentAffectedOrders.incidentId, incidentRow.id))
      .orderBy(desc(orders.delayedMinutes), desc(orders.revenueCents)),
    db
      .select({
        id: customers.id,
        externalRef: customers.externalRef,
        name: customers.name,
        segment: customers.segment,
        region: customers.region,
        priority: customers.priority,
        delayedOrders: sql<number>`count(${orders.id}) filter (where ${orders.delayedMinutes} > 0)::int`,
        revenueAtRiskCents: sql<number>`coalesce(sum(${incidentAffectedOrders.impactCents}), 0)::int`,
        maxDelayMinutes: sql<number>`coalesce(max(${orders.delayedMinutes}), 0)::int`
      })
      .from(incidentAffectedOrders)
      .innerJoin(orders, eq(orders.id, incidentAffectedOrders.orderId))
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(eq(incidentAffectedOrders.incidentId, incidentRow.id))
      .groupBy(customers.id, customers.externalRef, customers.name, customers.segment, customers.region, customers.priority)
      .orderBy(desc(sql`coalesce(sum(${incidentAffectedOrders.impactCents}), 0)`)),
    db
      .select({
        id: systemLogs.id,
        logLevel: systemLogs.logLevel,
        message: systemLogs.message,
        observedAt: systemLogs.observedAt,
        traceId: systemLogs.traceId,
        citationLabel: systemLogs.citationLabel,
        metadata: systemLogs.metadata,
        serviceName: services.name
      })
      .from(systemLogs)
      .leftJoin(services, eq(services.id, systemLogs.serviceId))
      .where(eq(systemLogs.incidentId, incidentRow.id))
      .orderBy(systemLogs.observedAt),
    db
      .select({
        id: supportTickets.id,
        ticketNumber: supportTickets.ticketNumber,
        subject: supportTickets.subject,
        status: supportTickets.status,
        priority: supportTickets.priority,
        channel: supportTickets.channel,
        openedAt: supportTickets.openedAt,
        citationLabel: supportTickets.citationLabel,
        metadata: supportTickets.metadata,
        customerName: customers.name
      })
      .from(supportTickets)
      .leftJoin(customers, eq(customers.id, supportTickets.customerId))
      .where(eq(supportTickets.incidentId, incidentRow.id))
      .orderBy(desc(supportTickets.openedAt)),
    db
      .select({
        id: knowledgeDocuments.id,
        title: knowledgeDocuments.title,
        documentType: knowledgeDocuments.documentType,
        content: knowledgeDocuments.content,
        citationLabel: knowledgeDocuments.citationLabel,
        citationUri: knowledgeDocuments.citationUri,
        version: knowledgeDocuments.version,
        publishedAt: knowledgeDocuments.publishedAt,
        metadata: knowledgeDocuments.metadata,
        sourceName: knowledgeSources.name
      })
      .from(knowledgeDocuments)
      .leftJoin(knowledgeSources, eq(knowledgeSources.id, knowledgeDocuments.sourceId))
      .where(eq(knowledgeDocuments.organizationId, organization.id))
      .orderBy(knowledgeDocuments.documentType, knowledgeDocuments.title),
    db
      .select({
        id: runbooks.id,
        title: runbooks.title,
        ownerTeam: runbooks.ownerTeam,
        currentVersion: runbooks.currentVersion,
        content: runbooks.content,
        citationLabel: runbooks.citationLabel,
        citationUri: runbooks.citationUri,
        metadata: runbooks.metadata,
        serviceName: services.name
      })
      .from(runbooks)
      .leftJoin(services, eq(services.id, runbooks.serviceId))
      .where(eq(runbooks.organizationId, organization.id))
      .orderBy(runbooks.title),
    db
      .select({
        id: agentRuns.id,
        agentName: agentRuns.agentName,
        objective: agentRuns.objective,
        status: agentRuns.status,
        startedAt: agentRuns.startedAt,
        completedAt: agentRuns.completedAt,
        outputSummary: agentRuns.outputSummary,
        metadata: agentRuns.metadata
      })
      .from(agentRuns)
      .where(eq(agentRuns.incidentId, incidentRow.id))
      .orderBy(agentRuns.startedAt),
    db
      .select({
        id: recommendations.id,
        title: recommendations.title,
        body: recommendations.body,
        priority: recommendations.priority,
        status: recommendations.status,
        confidence: recommendations.confidence,
        agentRunId: recommendations.agentRunId,
        metadata: recommendations.metadata
      })
      .from(recommendations)
      .where(eq(recommendations.incidentId, incidentRow.id))
      .orderBy(recommendations.priority, recommendations.title),
    db
      .select({
        id: approvals.id,
        title: approvals.title,
        description: approvals.description,
        status: approvals.status,
        riskLevel: approvals.riskLevel,
        dueAt: approvals.dueAt,
        requestedById: users.id,
        requestedByName: users.name,
        requestedByTitle: users.title,
        assignedRoleId: roles.id,
        assignedRoleSlug: roles.slug,
        assignedRoleName: roles.name,
        recommendationId: approvals.recommendationId,
        metadata: approvals.metadata
      })
      .from(approvals)
      .leftJoin(users, eq(users.id, approvals.requestedByUserId))
      .leftJoin(roles, eq(roles.id, approvals.assignedRoleId))
      .where(eq(approvals.incidentId, incidentRow.id))
      .orderBy(approvals.dueAt),
    db
      .select({
        id: reports.id,
        slug: reports.slug,
        title: reports.title,
        reportType: reports.reportType,
        status: reports.status,
        generatedAt: reports.generatedAt,
        storageUri: reports.storageUri,
        summary: reports.summary,
        metadata: reports.metadata,
        generatedById: users.id,
        generatedByName: users.name,
        generatedByTitle: users.title
      })
      .from(reports)
      .leftJoin(users, eq(users.id, reports.generatedByUserId))
      .where(eq(reports.incidentId, incidentRow.id))
      .orderBy(desc(reports.generatedAt)),
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        targetType: auditLogs.targetType,
        targetId: auditLogs.targetId,
        occurredAt: auditLogs.occurredAt,
        metadata: auditLogs.metadata,
        actorId: users.id,
        actorName: users.name,
        actorTitle: users.title
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorUserId))
      .where(and(eq(auditLogs.organizationId, organization.id), ne(auditLogs.targetType, "integration")))
      .orderBy(auditLogs.occurredAt)
  ]);

  const agentRunIds = agentRows.map((run) => run.id);
  const eventRows = agentRunIds.length
    ? await db
        .select({
          id: agentEvents.id,
          agentRunId: agentEvents.agentRunId,
          eventType: agentEvents.eventType,
          message: agentEvents.message,
          occurredAt: agentEvents.occurredAt,
          metadata: agentEvents.metadata
        })
        .from(agentEvents)
        .where(inArray(agentEvents.agentRunId, agentRunIds))
        .orderBy(agentEvents.occurredAt)
    : [];

  const approvalIds = approvalRows.map((approval) => approval.id);
  const decisionRows = approvalIds.length
    ? await db
        .select({
          id: decisions.id,
          approvalId: decisions.approvalId,
          decision: decisions.decision,
          rationale: decisions.rationale,
          decidedAt: decisions.decidedAt,
          decidedById: users.id,
          decidedByName: users.name,
          decidedByTitle: users.title
        })
        .from(decisions)
        .leftJoin(users, eq(users.id, decisions.decidedByUserId))
        .where(inArray(decisions.approvalId, approvalIds))
        .orderBy(decisions.decidedAt)
    : [];

  const affectedServices = new Map<string, IncidentServiceRef>();
  const impacts = impactRows.map((impact) => {
    const service = impact.serviceId
      ? {
          id: impact.serviceId,
          slug: impact.serviceSlug ?? "unknown-service",
          name: impact.serviceName ?? "Unknown service",
          tier: impact.serviceTier ?? "unknown",
          ownerTeam: impact.serviceOwnerTeam ?? "Unknown team",
          status: impact.serviceStatus ?? "unknown",
          sloTargetMs: impact.serviceSloTargetMs
        }
      : null;

    if (service) {
      affectedServices.set(service.id, service);
    }

    return {
      id: impact.id,
      impactType: impact.impactType,
      severity: impact.severity,
      description: impact.description,
      affectedCount: impact.affectedCount,
      revenueAtRiskCents: impact.revenueAtRiskCents,
      service,
      metadata: metadataRecord(impact.metadata)
    };
  });

  const timeline: IncidentTimelineItem[] = timelineRows.map((event) => ({
    id: event.id,
    eventType: event.eventType,
    title: event.title,
    body: event.body,
    occurredAt: toIsoString(event.occurredAt) ?? "",
    actor: actorShape({ actorId: event.actorId, actorName: event.actorName, actorTitle: event.actorTitle, actorInitials: event.actorInitials }),
    metadata: metadataRecord(event.metadata)
  }));

  const businessImpact: IncidentBusinessImpact = {
    totalDelayedOrders: incidentRow.delayedOrders,
    revenueAtRiskCents: incidentRow.revenueAtRiskCents,
    affectedCustomers: affectedCustomerRows.length,
    affectedServices: affectedServices.size,
    maxDelayMinutes: affectedCustomerRows.reduce((maxDelay, customer) => Math.max(maxDelay, countNumber(customer.maxDelayMinutes)), 0),
    customerImpactSummary: incidentRow.customerImpactSummary,
    impacts
  };

  const affectedCustomers: IncidentAffectedCustomer[] = affectedCustomerRows.map((customer) => ({
    id: customer.id,
    externalRef: customer.externalRef,
    name: customer.name,
    segment: customer.segment,
    region: customer.region,
    priority: customer.priority,
    delayedOrders: countNumber(customer.delayedOrders),
    revenueAtRiskCents: countNumber(customer.revenueAtRiskCents),
    maxDelayMinutes: countNumber(customer.maxDelayMinutes)
  }));

  const affectedOrders = affectedOrderRows.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    delayedMinutes: order.delayedMinutes,
    promisedAt: toIsoString(order.promisedAt) ?? "",
    revenueCents: order.revenueCents,
    reason: order.reason,
    impactCents: order.impactCents,
    customer: {
      id: order.customerId,
      externalRef: order.customerExternalRef,
      name: order.customerName,
      segment: order.customerSegment,
      priority: order.customerPriority
    }
  }));

  const citations: IncidentCitation[] = [
    ...logRows.map((log) => ({
      id: log.id,
      citationLabel: log.citationLabel,
      citationUri: citationUriFromMetadata(metadataRecord(log.metadata), `commandgrid://observability/traces/${log.traceId}`),
      title: `${log.logLevel.toUpperCase()} ${log.serviceName ?? "System log"}`,
      sourceType: "log" as const,
      sourceName: log.serviceName ?? "System log",
      excerpt: log.message,
      observedAt: toIsoString(log.observedAt),
      metadata: metadataRecord(log.metadata)
    })),
    ...ticketRows.map((ticket) => ({
      id: ticket.id,
      citationLabel: ticket.citationLabel,
      citationUri: citationUriFromMetadata(metadataRecord(ticket.metadata), `commandgrid://support/${ticket.ticketNumber}`),
      title: `${ticket.ticketNumber}: ${ticket.subject}`,
      sourceType: "ticket" as const,
      sourceName: ticket.customerName ?? ticket.channel,
      excerpt: `${ticket.priority} ${ticket.status} ticket via ${ticket.channel}`,
      observedAt: toIsoString(ticket.openedAt),
      metadata: metadataRecord(ticket.metadata)
    })),
    ...documentRows.map((document) => ({
      id: document.id,
      citationLabel: document.citationLabel,
      citationUri: document.citationUri,
      title: document.title,
      sourceType: "document" as const,
      sourceName: document.sourceName ?? document.documentType,
      excerpt: document.content,
      observedAt: toIsoString(document.publishedAt),
      metadata: { ...metadataRecord(document.metadata), documentType: document.documentType, version: document.version }
    })),
    ...runbookRows.map((runbook) => ({
      id: runbook.id,
      citationLabel: runbook.citationLabel,
      citationUri: runbook.citationUri,
      title: runbook.title,
      sourceType: "runbook" as const,
      sourceName: runbook.serviceName ?? runbook.ownerTeam,
      excerpt: runbook.content,
      observedAt: null,
      metadata: { ...metadataRecord(runbook.metadata), ownerTeam: runbook.ownerTeam, version: runbook.currentVersion }
    }))
  ];

  const eventsByAgentRunId = new Map<string, typeof eventRows>();
  for (const event of eventRows) {
    const existing = eventsByAgentRunId.get(event.agentRunId) ?? [];
    existing.push(event);
    eventsByAgentRunId.set(event.agentRunId, existing);
  }

  const runs: IncidentAgentRun[] = agentRows.map((run) => ({
    id: run.id,
    agentName: run.agentName,
    objective: run.objective,
    status: run.status,
    startedAt: toIsoString(run.startedAt) ?? "",
    completedAt: toIsoString(run.completedAt),
    outputSummary: run.outputSummary,
    metadata: metadataRecord(run.metadata),
    events: (eventsByAgentRunId.get(run.id) ?? []).map((event) => ({
      id: event.id,
      eventType: event.eventType,
      message: event.message,
      occurredAt: toIsoString(event.occurredAt) ?? "",
      metadata: metadataRecord(event.metadata)
    }))
  }));

  const recommendationItems: IncidentRecommendation[] = recommendationRows.map((recommendation) => ({
    id: recommendation.id,
    title: recommendation.title,
    body: recommendation.body,
    priority: recommendation.priority,
    status: recommendation.status,
    confidence: Number(recommendation.confidence),
    agentRunId: recommendation.agentRunId,
    citationLabels: readStringArrayMetadata(metadataRecord(recommendation.metadata), "citationLabels"),
    metadata: metadataRecord(recommendation.metadata)
  }));

  const decisionsByApprovalId = new Map<string, typeof decisionRows>();
  for (const decision of decisionRows) {
    const existing = decisionsByApprovalId.get(decision.approvalId) ?? [];
    existing.push(decision);
    decisionsByApprovalId.set(decision.approvalId, existing);
  }

  const approvalItems: IncidentApprovalPreview[] = approvalRows.map((approval) => ({
    id: approval.id,
    title: approval.title,
    description: approval.description,
    status: approval.status,
    riskLevel: approval.riskLevel,
    dueAt: toIsoString(approval.dueAt),
    requestedBy: simpleUserShape({ id: approval.requestedById, name: approval.requestedByName, title: approval.requestedByTitle }),
    assignedRole:
      approval.assignedRoleId && approval.assignedRoleSlug && approval.assignedRoleName
        ? { id: approval.assignedRoleId, slug: approval.assignedRoleSlug, name: approval.assignedRoleName }
        : null,
    recommendationId: approval.recommendationId,
    decisions: (decisionsByApprovalId.get(approval.id) ?? []).map((decision) => ({
      id: decision.id,
      decision: decision.decision,
      rationale: decision.rationale,
      decidedAt: toIsoString(decision.decidedAt) ?? "",
      decidedBy: simpleUserShape({ id: decision.decidedById, name: decision.decidedByName, title: decision.decidedByTitle })
    })),
    metadata: metadataRecord(approval.metadata)
  }));

  const reportItems: IncidentReportPreview[] = reportRows.map((report) => ({
    id: report.id,
    slug: report.slug,
    title: report.title,
    reportType: report.reportType,
    status: report.status,
    generatedAt: toIsoString(report.generatedAt) ?? "",
    storageUri: report.storageUri,
    summary: report.summary,
    generatedBy: simpleUserShape({ id: report.generatedById, name: report.generatedByName, title: report.generatedByTitle }),
    metadata: metadataRecord(report.metadata)
  }));

  const auditTrail: IncidentAuditPreview[] = auditRows.map((audit) => ({
    id: audit.id,
    action: audit.action,
    targetType: audit.targetType,
    targetId: audit.targetId,
    occurredAt: toIsoString(audit.occurredAt) ?? "",
    actor: simpleUserShape({ id: audit.actorId, name: audit.actorName, title: audit.actorTitle }),
    metadata: metadataRecord(audit.metadata)
  }));

  const incidentMetadata = metadataRecord(incidentRow.metadata);
  const tagline = typeof incidentMetadata.tagline === "string" ? incidentMetadata.tagline : incidentRow.customerImpactSummary;

  return {
    organizationSlug: organization.slug,
    roleView: options.role ? getRoleViewRule(options.role).role : null,
    overview: {
      id: incidentRow.id,
      slug: incidentRow.slug,
      title: incidentRow.title,
      summary: incidentRow.summary,
      narrative: `${tagline}. ${incidentRow.summary}`,
      status: incidentRow.status,
      severity: incidentRow.severity,
      commander: actorShape({
        actorId: incidentRow.commanderId,
        actorName: incidentRow.commanderName,
        actorTitle: incidentRow.commanderTitle,
        actorInitials: incidentRow.commanderInitials
      }),
      startedAt: toIsoString(incidentRow.startedAt) ?? "",
      detectedAt: toIsoString(incidentRow.detectedAt) ?? "",
      resolvedAt: toIsoString(incidentRow.resolvedAt),
      delayedOrders: incidentRow.delayedOrders,
      revenueAtRiskCents: incidentRow.revenueAtRiskCents,
      customerImpactSummary: incidentRow.customerImpactSummary,
      metadata: incidentMetadata
    },
    timeline,
    businessImpact,
    affectedCustomers,
    affectedOrders,
    affectedServices: Array.from(affectedServices.values()),
    citations,
    agentActivity: {
      runs,
      recommendations: recommendationItems
    },
    approvals: approvalItems,
    reports: reportItems,
    auditTrail
  };
}
