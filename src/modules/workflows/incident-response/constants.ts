export const PHASE5_WORKFLOW = {
  runId: "workflow_run_phase5_warehouse_latency",
  incidentId: "inc_warehouse_api_latency_2025_02_18",
  organizationId: "org_northstar_logistics",
  incidentSlug: "warehouse-api-latency-spike",
  actorUserId: "user_diego_alvarez",
  engineerUserId: "user_priya_natarajan",
  supportUserId: "user_jordan_ellis",
  financeUserId: "user_leah_brooks",
  governanceRoleId: "role_ops_manager",
  recommendationId: "rec_phase5_enable_buffer_mode",
  approvalId: "approval_phase5_buffer_mode_remediation",
  decisionId: "decision_phase5_buffer_mode_remediation",
  reportId: "report_phase5_postmortem_warehouse_latency",
  reportSlug: "warehouse-api-latency-phase5-postmortem",
  notificationId: "notif_phase5_customer_update",
  occurredAt: "2025-02-18T16:18:00.000Z",
  approvedAt: "2025-02-18T16:31:00.000Z",
  resolvedAt: "2025-02-18T16:38:00.000Z"
} as const;

export type IncidentAgentSlug = "ops" | "support" | "finance" | "security" | "comms" | "governance";

export const PHASE5_AGENT_ORDER: IncidentAgentSlug[] = ["ops", "support", "finance", "security", "comms", "governance"];

export const PHASE5_AGENT_RUN_IDS: Record<IncidentAgentSlug, string> = {
  ops: "agent_run_phase5_ops_triage",
  support: "agent_run_phase5_support_impact",
  finance: "agent_run_phase5_finance_exposure",
  security: "agent_run_phase5_security_review",
  comms: "agent_run_phase5_comms_draft",
  governance: "agent_run_phase5_governance_gate"
};
