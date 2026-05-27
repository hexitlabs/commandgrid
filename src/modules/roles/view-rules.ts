export const DEMO_ROLE_SLUGS = ["executive", "ops-manager", "engineer", "support-lead", "finance-reviewer", "admin"] as const;

export type DemoRoleSlug = (typeof DEMO_ROLE_SLUGS)[number];

export type DashboardSectionKey =
  | "operationalHealth"
  | "incidents"
  | "revenueAtRisk"
  | "delayedOrders"
  | "slaAvailability"
  | "supportSignal"
  | "agentActivity"
  | "approvals"
  | "incidentTrend"
  | "evidence"
  | "audit";

export interface RoleViewRule {
  role: DemoRoleSlug;
  label: string;
  persona: string;
  dashboardPriority: DashboardSectionKey[];
  incidentDetailPriority: DashboardSectionKey[];
  primaryActions: string[];
  hiddenSections: DashboardSectionKey[];
  readOnly: boolean;
  emphasis: string;
}

export const ROLE_VIEW_RULES: Record<DemoRoleSlug, RoleViewRule> = {
  executive: {
    role: "executive",
    label: "Executive",
    persona: "Maya Chen, Chief Operating Officer",
    dashboardPriority: ["revenueAtRisk", "slaAvailability", "operationalHealth", "incidentTrend", "approvals"],
    incidentDetailPriority: ["revenueAtRisk", "delayedOrders", "supportSignal", "incidentTrend", "approvals"],
    primaryActions: ["Open executive brief", "Review customer impact", "Track SLA exposure"],
    hiddenSections: [],
    readOnly: true,
    emphasis: "Business impact, customer trust, SLA exposure, and executive-ready narrative."
  },
  "ops-manager": {
    role: "ops-manager",
    label: "Ops Manager",
    persona: "Diego Alvarez, Director of Fulfillment Operations",
    dashboardPriority: ["incidents", "operationalHealth", "approvals", "agentActivity", "delayedOrders"],
    incidentDetailPriority: ["incidents", "agentActivity", "approvals", "delayedOrders", "supportSignal"],
    primaryActions: ["Declare/update incident", "Run triage agent", "Approve operational mitigations", "Publish timeline update"],
    hiddenSections: [],
    readOnly: false,
    emphasis: "Incident command, operational queue, approvals, and mitigation progress."
  },
  engineer: {
    role: "engineer",
    label: "Engineer",
    persona: "Priya Natarajan, Staff Platform Engineer",
    dashboardPriority: ["operationalHealth", "slaAvailability", "agentActivity", "incidents", "evidence"],
    incidentDetailPriority: ["evidence", "slaAvailability", "agentActivity", "incidents", "audit"],
    primaryActions: ["Inspect logs", "Open runbook", "Run investigation agent", "Add remediation note"],
    hiddenSections: [],
    readOnly: false,
    emphasis: "Technical root cause, logs, runbooks, service SLOs, and remediation evidence."
  },
  "support-lead": {
    role: "support-lead",
    label: "Support Lead",
    persona: "Jordan Ellis, Support Lead",
    dashboardPriority: ["supportSignal", "delayedOrders", "incidents", "approvals", "revenueAtRisk"],
    incidentDetailPriority: ["supportSignal", "delayedOrders", "approvals", "evidence", "incidentTrend"],
    primaryActions: ["Review customer tickets", "Draft customer update", "Publish approved comms", "Add customer timeline note"],
    hiddenSections: [],
    readOnly: false,
    emphasis: "Customer complaint clusters, ticket priority, communication readiness, and affected accounts."
  },
  "finance-reviewer": {
    role: "finance-reviewer",
    label: "Finance Reviewer",
    persona: "Leah Brooks, Finance Controller",
    dashboardPriority: ["revenueAtRisk", "approvals", "delayedOrders", "supportSignal", "audit"],
    incidentDetailPriority: ["revenueAtRisk", "approvals", "delayedOrders", "audit", "supportSignal"],
    primaryActions: ["Review credit approval", "Inspect exposure evidence", "Record finance decision"],
    hiddenSections: [],
    readOnly: false,
    emphasis: "Revenue at risk, credit thresholds, customer exposure, and auditable decisions."
  },
  admin: {
    role: "admin",
    label: "Admin",
    persona: "Alex Morgan, CommandGrid Admin",
    dashboardPriority: ["operationalHealth", "incidents", "agentActivity", "approvals", "audit", "evidence"],
    incidentDetailPriority: ["incidents", "evidence", "agentActivity", "approvals", "audit"],
    primaryActions: ["Manage workspace", "Inspect integrations", "Review audit log", "Run/administer agents"],
    hiddenSections: [],
    readOnly: false,
    emphasis: "Full workspace visibility, governance, integrations, and auditability."
  }
};

export function isDemoRoleSlug(value: string | null | undefined): value is DemoRoleSlug {
  return DEMO_ROLE_SLUGS.includes(value as DemoRoleSlug);
}

export function getRoleViewRule(role: DemoRoleSlug = "executive") {
  return ROLE_VIEW_RULES[role];
}
