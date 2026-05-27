import { deterministicAgentFallback, AGENT_DISPLAY_NAMES, AGENT_OBJECTIVES } from "../../agents/fallbacks";
import { PHASE5_AGENT_ORDER, PHASE5_AGENT_RUN_IDS, PHASE5_WORKFLOW, type IncidentAgentSlug } from "./constants";

export type WorkflowAuditAction =
  | "demo.incident.requested"
  | "workflow.started"
  | "agent.completed"
  | "approval.requested"
  | "approval.approved"
  | "remediation.simulated"
  | "postmortem.generated";

export type WorkflowPlan = {
  runId: string;
  agentRuns: Array<{
    slug: IncidentAgentSlug;
    id: string;
    name: string;
    objective: string;
    summary: string;
    eventMessage: string;
    metadata: Record<string, unknown>;
  }>;
  auditActions: WorkflowAuditAction[];
  approvalId: string;
  recommendationId: string;
  reportId: string;
};

export function buildIncidentResponsePlan(): WorkflowPlan {
  return {
    runId: PHASE5_WORKFLOW.runId,
    agentRuns: PHASE5_AGENT_ORDER.map((slug) => {
      const fallback = deterministicAgentFallback(slug);

      return {
        slug,
        id: PHASE5_AGENT_RUN_IDS[slug],
        name: AGENT_DISPLAY_NAMES[slug],
        objective: AGENT_OBJECTIVES[slug],
        summary: fallback.summary,
        eventMessage: fallback.eventMessage,
        metadata: fallback.metadata
      };
    }),
    auditActions: ["demo.incident.requested", "workflow.started", "agent.completed", "approval.requested"],
    approvalId: PHASE5_WORKFLOW.approvalId,
    recommendationId: PHASE5_WORKFLOW.recommendationId,
    reportId: PHASE5_WORKFLOW.reportId
  };
}

export function approvalContinuationAuditActions(): WorkflowAuditAction[] {
  return ["approval.approved", "remediation.simulated", "postmortem.generated"];
}
