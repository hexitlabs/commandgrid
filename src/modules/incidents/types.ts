import type { DemoRoleSlug } from "../roles/view-rules";

export const INCIDENT_STATUSES = ["active", "resolved", "mitigated", "monitoring"] as const;
export const INCIDENT_SEVERITIES = ["sev1", "sev2", "sev3", "sev4"] as const;

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number] | string;
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number] | string;
export type IncidentSortKey = "startedAt" | "detectedAt" | "severity" | "status" | "revenueAtRisk" | "delayedOrders";
export type IncidentSortDirection = "asc" | "desc";

export interface IncidentListFilters {
  organizationSlug?: string;
  status?: string | string[];
  severity?: string | string[];
  sortBy?: IncidentSortKey;
  sortDirection?: IncidentSortDirection;
  limit?: number;
}

export interface IncidentListItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  status: string;
  severity: string;
  commanderName: string | null;
  startedAt: string;
  detectedAt: string;
  resolvedAt: string | null;
  delayedOrders: number;
  revenueAtRiskCents: number;
  customerImpactSummary: string;
  affectedCustomers: number;
  affectedServices: number;
  supportTickets: number;
  pendingApprovals: number;
  agentRuns: number;
}

export interface IncidentListResult {
  organizationSlug: string;
  filters: Required<Pick<IncidentListFilters, "sortBy" | "sortDirection">> & Pick<IncidentListFilters, "status" | "severity" | "limit">;
  summary: {
    total: number;
    active: number;
    resolved: number;
    revenueAtRiskCents: number;
    delayedOrders: number;
  };
  incidents: IncidentListItem[];
}

export interface IncidentDetailOverview {
  id: string;
  slug: string;
  title: string;
  summary: string;
  narrative: string;
  status: string;
  severity: string;
  commander: {
    id: string;
    name: string;
    title: string;
    avatarInitials: string;
  } | null;
  startedAt: string;
  detectedAt: string;
  resolvedAt: string | null;
  delayedOrders: number;
  revenueAtRiskCents: number;
  customerImpactSummary: string;
  metadata: Record<string, unknown>;
}

export interface IncidentTimelineItem {
  id: string;
  eventType: string;
  title: string;
  body: string;
  occurredAt: string;
  actor: {
    id: string;
    name: string;
    title: string;
    avatarInitials: string;
  } | null;
  metadata: Record<string, unknown>;
}

export interface IncidentBusinessImpact {
  totalDelayedOrders: number;
  revenueAtRiskCents: number;
  affectedCustomers: number;
  affectedServices: number;
  maxDelayMinutes: number;
  customerImpactSummary: string;
  impacts: Array<{
    id: string;
    impactType: string;
    severity: string;
    description: string;
    affectedCount: number;
    revenueAtRiskCents: number;
    service: IncidentServiceRef | null;
    metadata: Record<string, unknown>;
  }>;
}

export interface IncidentServiceRef {
  id: string;
  slug: string;
  name: string;
  tier: string;
  ownerTeam: string;
  status: string;
  sloTargetMs: number | null;
}

export interface IncidentAffectedCustomer {
  id: string;
  externalRef: string;
  name: string;
  segment: string;
  region: string;
  priority: string;
  delayedOrders: number;
  revenueAtRiskCents: number;
  maxDelayMinutes: number;
}

export interface IncidentAffectedOrder {
  id: string;
  orderNumber: string;
  status: string;
  delayedMinutes: number;
  promisedAt: string;
  revenueCents: number;
  reason: string;
  impactCents: number;
  customer: {
    id: string;
    externalRef: string;
    name: string;
    segment: string;
    priority: string;
  };
}

export interface IncidentCitation {
  id: string;
  citationLabel: string;
  citationUri: string | null;
  title: string;
  sourceType: "log" | "ticket" | "document" | "runbook";
  sourceName: string;
  excerpt: string;
  observedAt: string | null;
  metadata: Record<string, unknown>;
}

export interface IncidentAgentRun {
  id: string;
  agentName: string;
  objective: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  outputSummary: string;
  metadata: Record<string, unknown>;
  events: Array<{
    id: string;
    eventType: string;
    message: string;
    occurredAt: string;
    metadata: Record<string, unknown>;
  }>;
}

export interface IncidentRecommendation {
  id: string;
  title: string;
  body: string;
  priority: string;
  status: string;
  confidence: number;
  agentRunId: string | null;
  citationLabels: string[];
  metadata: Record<string, unknown>;
}

export interface IncidentApprovalPreview {
  id: string;
  title: string;
  description: string;
  status: string;
  riskLevel: string;
  dueAt: string | null;
  requestedBy: { id: string; name: string; title: string } | null;
  assignedRole: { id: string; slug: string; name: string } | null;
  recommendationId: string | null;
  decisions: Array<{
    id: string;
    decision: string;
    rationale: string;
    decidedAt: string;
    decidedBy: { id: string; name: string; title: string } | null;
  }>;
  metadata: Record<string, unknown>;
}

export interface IncidentReportPreview {
  id: string;
  slug: string;
  title: string;
  reportType: string;
  status: string;
  generatedAt: string;
  storageUri: string;
  summary: string;
  generatedBy: { id: string; name: string; title: string } | null;
  metadata: Record<string, unknown>;
}

export interface IncidentAuditPreview {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  occurredAt: string;
  actor: { id: string; name: string; title: string } | null;
  metadata: Record<string, unknown>;
}

export interface IncidentDetail {
  organizationSlug: string;
  roleView: DemoRoleSlug | null;
  overview: IncidentDetailOverview;
  timeline: IncidentTimelineItem[];
  businessImpact: IncidentBusinessImpact;
  affectedCustomers: IncidentAffectedCustomer[];
  affectedOrders: IncidentAffectedOrder[];
  affectedServices: IncidentServiceRef[];
  citations: IncidentCitation[];
  agentActivity: {
    runs: IncidentAgentRun[];
    recommendations: IncidentRecommendation[];
  };
  approvals: IncidentApprovalPreview[];
  reports: IncidentReportPreview[];
  auditTrail: IncidentAuditPreview[];
}
