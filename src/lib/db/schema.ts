import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";

const lifecycleColumns = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
};

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  industry: text("industry").notNull(),
  timezone: text("timezone").notNull().default("America/Chicago"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...lifecycleColumns
});

export const permissions = pgTable("permissions", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  ...lifecycleColumns
});

export const roles = pgTable(
  "roles",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    demoPersona: text("demo_persona").notNull(),
    isPublicDemoRole: boolean("is_public_demo_role").notNull().default(false),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ...lifecycleColumns
  },
  (table) => ({
    organizationSlugIdx: uniqueIndex("roles_organization_slug_idx").on(table.organizationId, table.slug)
  })
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: text("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roleId, table.permissionId] })
  })
);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    title: text("title").notNull(),
    avatarInitials: text("avatar_initials").notNull(),
    isDemoUser: boolean("is_demo_user").notNull().default(true),
    ...lifecycleColumns
  },
  (table) => ({
    organizationIdx: index("users_organization_idx").on(table.organizationId)
  })
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.roleId] })
  })
);

export const services = pgTable(
  "services",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    tier: text("tier").notNull(),
    ownerTeam: text("owner_team").notNull(),
    status: text("status").notNull(),
    sloTargetMs: integer("slo_target_ms"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ...lifecycleColumns
  },
  (table) => ({
    serviceSlugIdx: uniqueIndex("services_organization_slug_idx").on(table.organizationId, table.slug)
  })
);

export const customers = pgTable(
  "customers",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    externalRef: text("external_ref").notNull(),
    name: text("name").notNull(),
    segment: text("segment").notNull(),
    region: text("region").notNull(),
    priority: text("priority").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ...lifecycleColumns
  },
  (table) => ({
    customerRefIdx: uniqueIndex("customers_organization_external_ref_idx").on(table.organizationId, table.externalRef)
  })
);

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    orderNumber: text("order_number").notNull(),
    status: text("status").notNull(),
    revenueCents: integer("revenue_cents").notNull(),
    delayedMinutes: integer("delayed_minutes").notNull().default(0),
    promisedAt: timestamp("promised_at", { withTimezone: true }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ...lifecycleColumns
  },
  (table) => ({
    orderNumberIdx: uniqueIndex("orders_organization_order_number_idx").on(table.organizationId, table.orderNumber),
    customerIdx: index("orders_customer_idx").on(table.customerId)
  })
);

export const incidents = pgTable(
  "incidents",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    status: text("status").notNull(),
    severity: text("severity").notNull(),
    commanderUserId: text("commander_user_id").references(() => users.id, { onDelete: "set null" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    delayedOrders: integer("delayed_orders").notNull().default(0),
    revenueAtRiskCents: integer("revenue_at_risk_cents").notNull().default(0),
    customerImpactSummary: text("customer_impact_summary").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ...lifecycleColumns
  },
  (table) => ({
    incidentSlugIdx: uniqueIndex("incidents_organization_slug_idx").on(table.organizationId, table.slug),
    incidentStatusIdx: index("incidents_status_idx").on(table.status),
    incidentSeverityIdx: index("incidents_severity_idx").on(table.severity)
  })
);

export const incidentTimelineEvents = pgTable(
  "incident_timeline_events",
  {
    id: text("id").primaryKey(),
    incidentId: text("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    eventType: text("event_type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ...lifecycleColumns
  },
  (table) => ({
    incidentTimelineIdx: index("incident_timeline_incident_idx").on(table.incidentId, table.occurredAt)
  })
);

export const incidentImpacts = pgTable(
  "incident_impacts",
  {
    id: text("id").primaryKey(),
    incidentId: text("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    serviceId: text("service_id").references(() => services.id, { onDelete: "set null" }),
    impactType: text("impact_type").notNull(),
    severity: text("severity").notNull(),
    description: text("description").notNull(),
    affectedCount: integer("affected_count").notNull().default(0),
    revenueAtRiskCents: integer("revenue_at_risk_cents").notNull().default(0),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ...lifecycleColumns
  },
  (table) => ({
    incidentImpactIdx: index("incident_impacts_incident_idx").on(table.incidentId)
  })
);

export const incidentAffectedOrders = pgTable(
  "incident_affected_orders",
  {
    incidentId: text("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    impactCents: integer("impact_cents").notNull(),
    linkedAt: timestamp("linked_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.incidentId, table.orderId] })
  })
);

export const agentRuns = pgTable(
  "agent_runs",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    incidentId: text("incident_id").references(() => incidents.id, { onDelete: "cascade" }),
    agentName: text("agent_name").notNull(),
    objective: text("objective").notNull(),
    status: text("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    outputSummary: text("output_summary").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ...lifecycleColumns
  },
  (table) => ({
    agentRunsOrgStatusIdx: index("agent_runs_org_status_idx").on(table.organizationId, table.status)
  })
);

export const agentEvents = pgTable(
  "agent_events",
  {
    id: text("id").primaryKey(),
    agentRunId: text("agent_run_id")
      .notNull()
      .references(() => agentRuns.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    message: text("message").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ...lifecycleColumns
  },
  (table) => ({
    agentEventsRunIdx: index("agent_events_run_idx").on(table.agentRunId, table.occurredAt)
  })
);

export const recommendations = pgTable(
  "recommendations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    incidentId: text("incident_id").references(() => incidents.id, { onDelete: "cascade" }),
    agentRunId: text("agent_run_id").references(() => agentRuns.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    priority: text("priority").notNull(),
    status: text("status").notNull(),
    confidence: numeric("confidence", { precision: 4, scale: 3 }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ...lifecycleColumns
  },
  (table) => ({
    recommendationsOrgStatusIdx: index("recommendations_org_status_idx").on(table.organizationId, table.status)
  })
);

export const approvals = pgTable(
  "approvals",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    incidentId: text("incident_id").references(() => incidents.id, { onDelete: "cascade" }),
    recommendationId: text("recommendation_id").references(() => recommendations.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    requestedByUserId: text("requested_by_user_id").references(() => users.id, { onDelete: "set null" }),
    assignedRoleId: text("assigned_role_id").references(() => roles.id, { onDelete: "set null" }),
    status: text("status").notNull(),
    riskLevel: text("risk_level").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ...lifecycleColumns
  },
  (table) => ({
    approvalsOrgStatusIdx: index("approvals_org_status_idx").on(table.organizationId, table.status)
  })
);

export const decisions = pgTable(
  "decisions",
  {
    id: text("id").primaryKey(),
    approvalId: text("approval_id")
      .notNull()
      .references(() => approvals.id, { onDelete: "cascade" }),
    decidedByUserId: text("decided_by_user_id").references(() => users.id, { onDelete: "set null" }),
    decision: text("decision").notNull(),
    rationale: text("rationale").notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ...lifecycleColumns
  },
  (table) => ({
    decisionsApprovalIdx: index("decisions_approval_idx").on(table.approvalId)
  })
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ...lifecycleColumns
  },
  (table) => ({
    auditOrgOccurredIdx: index("audit_logs_org_occurred_idx").on(table.organizationId, table.occurredAt)
  })
);

export const knowledgeSources = pgTable(
  "knowledge_sources",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    sourceType: text("source_type").notNull(),
    uri: text("uri").notNull(),
    ownerTeam: text("owner_team").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ...lifecycleColumns
  },
  (table) => ({
    sourceSlugIdx: uniqueIndex("knowledge_sources_organization_slug_idx").on(table.organizationId, table.slug)
  })
);

export const knowledgeDocuments = pgTable(
  "knowledge_documents",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => knowledgeSources.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    documentType: text("document_type").notNull(),
    content: text("content").notNull(),
    citationLabel: text("citation_label").notNull(),
    citationUri: text("citation_uri").notNull(),
    version: text("version").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ...lifecycleColumns
  },
  (table) => ({
    documentSlugIdx: uniqueIndex("knowledge_documents_organization_slug_idx").on(table.organizationId, table.slug),
    documentSourceIdx: index("knowledge_documents_source_idx").on(table.sourceId)
  })
);

export const knowledgeSnippets = pgTable(
  "knowledge_snippets",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id")
      .notNull()
      .references(() => knowledgeDocuments.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    excerpt: text("excerpt").notNull(),
    citationLabel: text("citation_label").notNull(),
    citationUri: text("citation_uri").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ...lifecycleColumns
  },
  (table) => ({
    snippetDocumentIdx: uniqueIndex("knowledge_snippets_document_ordinal_idx").on(table.documentId, table.ordinal)
  })
);

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    incidentId: text("incident_id").references(() => incidents.id, { onDelete: "set null" }),
    customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
    ticketNumber: text("ticket_number").notNull(),
    subject: text("subject").notNull(),
    status: text("status").notNull(),
    priority: text("priority").notNull(),
    channel: text("channel").notNull(),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    citationLabel: text("citation_label").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ...lifecycleColumns
  },
  (table) => ({
    ticketNumberIdx: uniqueIndex("support_tickets_organization_ticket_number_idx").on(table.organizationId, table.ticketNumber)
  })
);

export const systemLogs = pgTable(
  "system_logs",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    serviceId: text("service_id").references(() => services.id, { onDelete: "set null" }),
    incidentId: text("incident_id").references(() => incidents.id, { onDelete: "set null" }),
    logLevel: text("log_level").notNull(),
    message: text("message").notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    traceId: text("trace_id").notNull(),
    citationLabel: text("citation_label").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ...lifecycleColumns
  },
  (table) => ({
    systemLogsOrgObservedIdx: index("system_logs_org_observed_idx").on(table.organizationId, table.observedAt)
  })
);

export const runbooks = pgTable(
  "runbooks",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    serviceId: text("service_id").references(() => services.id, { onDelete: "set null" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    ownerTeam: text("owner_team").notNull(),
    currentVersion: text("current_version").notNull(),
    content: text("content").notNull(),
    citationLabel: text("citation_label").notNull(),
    citationUri: text("citation_uri").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ...lifecycleColumns
  },
  (table) => ({
    runbooksSlugIdx: uniqueIndex("runbooks_organization_slug_idx").on(table.organizationId, table.slug)
  })
);

export const reports = pgTable(
  "reports",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    incidentId: text("incident_id").references(() => incidents.id, { onDelete: "set null" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    reportType: text("report_type").notNull(),
    status: text("status").notNull(),
    generatedByUserId: text("generated_by_user_id").references(() => users.id, { onDelete: "set null" }),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull(),
    storageUri: text("storage_uri").notNull(),
    summary: text("summary").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ...lifecycleColumns
  },
  (table) => ({
    reportsSlugIdx: uniqueIndex("reports_organization_slug_idx").on(table.organizationId, table.slug)
  })
);

export const integrations = pgTable(
  "integrations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    provider: text("provider").notNull(),
    displayName: text("display_name").notNull(),
    status: text("status").notNull(),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ...lifecycleColumns
  },
  (table) => ({
    integrationsSlugIdx: uniqueIndex("integrations_organization_slug_idx").on(table.organizationId, table.slug)
  })
);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    incidentId: text("incident_id").references(() => incidents.id, { onDelete: "cascade" }),
    integrationId: text("integration_id").references(() => integrations.id, { onDelete: "set null" }),
    channel: text("channel").notNull(),
    recipient: text("recipient").notNull(),
    subject: text("subject").notNull(),
    status: text("status").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ...lifecycleColumns
  },
  (table) => ({
    notificationsOrgStatusIdx: index("notifications_org_status_idx").on(table.organizationId, table.status)
  })
);

export const integrationEvents = pgTable(
  "integration_events",
  {
    id: text("id").primaryKey(),
    integrationId: text("integration_id")
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    status: text("status").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
    ...lifecycleColumns
  },
  (table) => ({
    integrationEventsIntegrationIdx: index("integration_events_integration_idx").on(table.integrationId, table.occurredAt)
  })
);

export const commandGridTables = {
  organizations,
  permissions,
  roles,
  rolePermissions,
  users,
  userRoles,
  services,
  customers,
  orders,
  incidents,
  incidentTimelineEvents,
  incidentImpacts,
  incidentAffectedOrders,
  agentRuns,
  agentEvents,
  recommendations,
  approvals,
  decisions,
  auditLogs,
  knowledgeSources,
  knowledgeDocuments,
  knowledgeSnippets,
  supportTickets,
  systemLogs,
  runbooks,
  reports,
  integrations,
  notifications,
  integrationEvents
};
