import type { IncidentAgentSlug } from "../workflows/incident-response/constants";

export type AgentFallbackResponse = {
  summary: string;
  eventMessage: string;
  recommendation?: {
    title: string;
    body: string;
    priority: "urgent" | "high" | "medium" | "low";
    confidence: string;
  };
  metadata: Record<string, unknown>;
};

export const AGENT_OBJECTIVES: Record<IncidentAgentSlug, string> = {
  ops: "Correlate Warehouse API latency, order impact, and runbook options for operations command.",
  support: "Summarize affected customers and support ticket posture for the Support Lead.",
  finance: "Quantify revenue exposure and identify finance approval thresholds.",
  security: "Verify the incident looks operational rather than security-related before remediation.",
  comms: "Draft internal and customer-safe status messaging from confirmed facts.",
  governance: "Create the governed approval request and pause before remediation."
};

export const AGENT_DISPLAY_NAMES: Record<IncidentAgentSlug, string> = {
  ops: "Ops Response Agent",
  support: "Support Impact Agent",
  finance: "Finance Exposure Agent",
  security: "Security Review Agent",
  comms: "Comms Drafting Agent",
  governance: "Governance Approval Agent"
};

export function deterministicAgentFallback(agent: IncidentAgentSlug): AgentFallbackResponse {
  switch (agent) {
    case "ops":
      return {
        summary:
          "Warehouse API p95 remains above SLO with connection-pool saturation signals. Recommended safe mitigation is MSP-02 regional buffer mode while pods scale out.",
        eventMessage: "Matched latency spike against RUN-WH-API-004 and OPS-BUF-006; mitigation requires approval before execution.",
        recommendation: {
          title: "Enable MSP-02 regional buffer mode",
          body:
            "Queue route assignments locally for MSP-02 and replay when Warehouse API p95 stays below 500ms for ten minutes. This is simulated for the public demo.",
          priority: "urgent",
          confidence: "0.884"
        },
        metadata: { mode: "deterministic-fallback", citations: ["RUN-WH-API-004", "OPS-BUF-006", "LOG-2"] }
      };
    case "support":
      return {
        summary:
          "Six open support tickets map to platinum/gold customers. Support should send a factual 30-minute update and avoid root-cause speculation.",
        eventMessage: "Grouped affected customers by priority and prepared Support Lead review notes for the proactive update.",
        metadata: { mode: "deterministic-fallback", ticketCount: 6, segments: ["platinum", "gold", "silver"] }
      };
    case "finance":
      return {
        summary:
          "$48,200 remains at risk. Finance policy requires governed review before proactive credits or customer promise adjustments.",
        eventMessage: "Calculated revenue exposure and linked the customer credit matrix for approval context.",
        metadata: { mode: "deterministic-fallback", revenueAtRiskCents: 4820000, citation: "FIN-CRED-009" }
      };
    case "security":
      return {
        summary:
          "No security indicators are present in the demo evidence. Logs point to capacity saturation, not abuse or credential activity.",
        eventMessage: "Checked incident telemetry for security red flags and cleared the remediation simulation for governance review.",
        metadata: { mode: "deterministic-fallback", securityFinding: "no-indicators-of-compromise" }
      };
    case "comms":
      return {
        summary:
          "Prepared internal executive summary and customer-safe language with confirmed impact: 312 delayed orders and mitigation under approval.",
        eventMessage: "Drafted customer and executive updates from approved incident facts.",
        metadata: { mode: "deterministic-fallback", drafts: ["executive", "customer"] }
      };
    case "governance":
      return {
        summary:
          "Approval required before remediation. Workflow is paused at the governance gate until Ops approves regional buffer mode.",
        eventMessage: "Created remediation approval and paused the autonomous workflow before any simulated action.",
        metadata: { mode: "deterministic-fallback", approvalGate: true }
      };
  }
}
