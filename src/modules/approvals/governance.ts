import { PHASE5_WORKFLOW } from "../workflows/incident-response/constants";
import type { DemoRoleSlug } from "../roles/view-rules";
import { approvalRiskSummary, coerceRisk, isApprovalActionType, roleLabel } from "../permissions/governance";
import type { ApprovalActionType, ApprovalGovernance, ApprovalRiskLevel } from "./types";

type ApprovalLike = {
  id: string;
  title: string;
  riskLevel: string;
  assignedRoleSlug: string | null;
  metadata: Record<string, unknown> | null;
  recommendationMetadata?: Record<string, unknown> | null;
};

function isDemoRole(value: string | null | undefined): value is DemoRoleSlug {
  return (
    value === "executive" ||
    value === "ops-manager" ||
    value === "engineer" ||
    value === "support-lead" ||
    value === "finance-reviewer" ||
    value === "admin"
  );
}

function actionTypeFromApproval(approval: ApprovalLike): ApprovalActionType {
  const metadata = approval.metadata ?? {};
  const metadataAction = metadata.actionType;

  if (isApprovalActionType(metadataAction)) {
    return metadataAction;
  }

  if (approval.id === PHASE5_WORKFLOW.approvalId) {
    return "technical_remediation";
  }

  const title = approval.title.toLowerCase();
  if (title.includes("credit") || title.includes("finance")) return "financial_credit";
  if (title.includes("customer update") || title.includes("comms") || title.includes("communication")) return "customer_communication";
  if (title.includes("executive") || title.includes("escalation")) return "executive_escalation";
  if (title.includes("admin") || title.includes("workspace")) return "workspace_admin";
  return "technical_remediation";
}

function requiredRoleFromApproval(actionType: ApprovalActionType, assignedRoleSlug: string | null): DemoRoleSlug {
  if (isDemoRole(assignedRoleSlug)) {
    return assignedRoleSlug;
  }

  const fallback: Record<ApprovalActionType, DemoRoleSlug> = {
    technical_remediation: "ops-manager",
    financial_credit: "finance-reviewer",
    customer_communication: "support-lead",
    executive_escalation: "executive",
    workspace_admin: "admin"
  };

  return fallback[actionType];
}

function continuationFromApproval(approval: ApprovalLike, actionType: ApprovalActionType): ApprovalGovernance["continuation"] {
  const continuation = approval.metadata?.continuation;
  if (
    continuation === "phase5-remediation" ||
    continuation === "flagship-remediation" ||
    continuation === "financial-review" ||
    continuation === "customer-comms" ||
    continuation === "manual-review"
  ) {
    return continuation;
  }

  if (approval.id === PHASE5_WORKFLOW.approvalId) return "phase5-remediation";
  if (actionType === "technical_remediation") return "flagship-remediation";
  if (actionType === "financial_credit") return "financial-review";
  if (actionType === "customer_communication") return "customer-comms";
  return "manual-review";
}

function evidenceLabelsFromApproval(approval: ApprovalLike) {
  const labels = new Set<string>();
  const metadata = approval.metadata ?? {};
  const recommendationMetadata = approval.recommendationMetadata ?? {};

  for (const source of [metadata.evidenceLabels, metadata.citationLabels, recommendationMetadata.citationLabels]) {
    if (Array.isArray(source)) {
      for (const item of source) {
        if (typeof item === "string") {
          labels.add(item);
        }
      }
    }
  }

  return [...labels];
}

export function deriveApprovalGovernance(approval: ApprovalLike): ApprovalGovernance {
  const actionType = actionTypeFromApproval(approval);
  const riskLevel = coerceRisk(approval.riskLevel, "medium") as ApprovalRiskLevel;
  const requiredRole = requiredRoleFromApproval(actionType, approval.assignedRoleSlug);

  return {
    actionType,
    riskLevel,
    requiredRole,
    requiredRoleLabel: roleLabel(requiredRole),
    riskSummary: approvalRiskSummary(actionType, riskLevel),
    continuation: continuationFromApproval(approval, actionType),
    evidenceLabels: evidenceLabelsFromApproval(approval)
  };
}
