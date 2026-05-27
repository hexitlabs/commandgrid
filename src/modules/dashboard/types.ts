import type { DemoRoleSlug } from "../roles/view-rules";

export type DashboardHealthLevel = "healthy" | "degraded" | "critical";

export type DashboardMetricTone = "neutral" | "success" | "warning" | "danger" | "info";

export interface DashboardOrganization {
  id: string;
  slug: string;
  name: string;
  timezone: string;
}

export interface DashboardOperationalHealth {
  level: DashboardHealthLevel;
  score: number;
  healthyServices: number;
  degradedServices: number;
  totalServices: number;
  degradedServiceNames: string[];
  summary: string;
}

export interface DashboardIncidentKpis {
  active: number;
  resolved: number;
  total: number;
  sev1Active: number;
  byStatus: Array<{ status: string; count: number }>;
  bySeverity: Array<{ severity: string; count: number }>;
}

export interface DashboardRevenueAtRisk {
  cents: number;
  currency: "USD";
  activeIncidentCents: number;
  activeIncidentCount: number;
}

export interface DashboardDelayedOrders {
  count: number;
  activeIncidentCount: number;
  delayedOrderSampleCount: number;
  averageDelayMinutes: number;
}

export interface DashboardSlaAvailability {
  availabilityPercent: number;
  degradedTier0Services: number;
  breachedServices: Array<{
    serviceId: string;
    serviceSlug: string;
    serviceName: string;
    currentP95Ms: number | null;
    sloTargetMs: number | null;
    status: string;
  }>;
  summary: string;
}

export interface DashboardSupportSignal {
  openTickets: number;
  urgentTickets: number;
  highPriorityTickets: number;
  affectedCustomers: number;
  sentiment: "stable" | "watch" | "negative";
  summary: string;
}

export interface DashboardAgentActivity {
  totalRuns: number;
  runningRuns: number;
  completedRuns: number;
  recommendations: {
    total: number;
    pendingApproval: number;
    inProgress: number;
  };
  recentRuns: Array<{
    id: string;
    agentName: string;
    objective: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    outputSummary: string;
  }>;
}

export interface DashboardApprovalSummary {
  pending: number;
  approved: number;
  total: number;
  highRiskPending: number;
  dueSoon: Array<{
    id: string;
    title: string;
    status: string;
    riskLevel: string;
    dueAt: string | null;
    incidentSlug: string | null;
    assignedRole: string | null;
  }>;
}

export interface DashboardTrendPoint {
  period: string;
  incidentCount: number;
  resolvedCount: number;
  activeCount: number;
  delayedOrders: number;
  revenueAtRiskCents: number;
  sev1Count: number;
  sev2Count: number;
  sev3Count: number;
}

export interface DashboardFlagshipIncidentSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  status: string;
  severity: string;
  delayedOrders: number;
  revenueAtRiskCents: number;
  customerImpactSummary: string;
  startedAt: string;
  detectedAt: string;
  commanderName: string | null;
}

export interface DashboardOverview {
  organization: DashboardOrganization;
  generatedAt: string;
  roleView: DemoRoleSlug | null;
  operationalHealth: DashboardOperationalHealth;
  incidents: DashboardIncidentKpis;
  revenueAtRisk: DashboardRevenueAtRisk;
  delayedOrders: DashboardDelayedOrders;
  slaAvailability: DashboardSlaAvailability;
  supportSignal: DashboardSupportSignal;
  agentActivity: DashboardAgentActivity;
  approvals: DashboardApprovalSummary;
  incidentTrend: DashboardTrendPoint[];
  flagshipIncident: DashboardFlagshipIncidentSummary | null;
}

export interface GetDashboardOverviewOptions {
  organizationSlug?: string;
  role?: DemoRoleSlug;
}
