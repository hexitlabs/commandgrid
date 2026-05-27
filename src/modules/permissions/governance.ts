import { isDemoRoleSlug, type DemoRoleSlug } from "../roles/view-rules";
import type { ApprovalActionType, ApprovalGovernance, ApprovalRiskLevel } from "../approvals/types";

export type GovernancePermission = "review" | "decide";

export type PermissionEvaluation = {
  role: DemoRoleSlug;
  actionType: ApprovalActionType;
  riskLevel: ApprovalRiskLevel;
  permission: GovernancePermission;
  allowed: boolean;
  reason: string;
};

type MatrixRule = {
  decide: Partial<Record<ApprovalActionType, ApprovalRiskLevel[] | "all">>;
  review: Partial<Record<ApprovalActionType, ApprovalRiskLevel[] | "all">> | "all";
};

const allRisks: ApprovalRiskLevel[] = ["low", "medium", "high", "critical"];

const roleLabels: Record<DemoRoleSlug, string> = {
  executive: "Executive",
  "ops-manager": "Ops Manager",
  engineer: "Engineer",
  "support-lead": "Support Lead",
  "finance-reviewer": "Finance Reviewer",
  admin: "Admin"
};

export const GOVERNANCE_PERMISSION_MATRIX: Record<DemoRoleSlug, MatrixRule> = {
  "ops-manager": {
    decide: {
      technical_remediation: ["low", "medium", "high"],
      executive_escalation: ["low", "medium"]
    },
    review: {
      technical_remediation: "all",
      customer_communication: ["low", "medium"],
      financial_credit: ["low", "medium"]
    }
  },
  engineer: {
    decide: {},
    review: {
      technical_remediation: "all",
      workspace_admin: ["low", "medium"]
    }
  },
  "finance-reviewer": {
    decide: {
      financial_credit: "all"
    },
    review: {
      technical_remediation: ["medium", "high", "critical"],
      executive_escalation: ["medium", "high", "critical"]
    }
  },
  executive: {
    decide: {
      executive_escalation: "all"
    },
    review: "all"
  },
  "support-lead": {
    decide: {
      customer_communication: ["low", "medium", "high"]
    },
    review: {
      customer_communication: "all",
      financial_credit: ["low", "medium"],
      technical_remediation: ["low", "medium"]
    }
  },
  admin: {
    decide: {
      technical_remediation: "all",
      financial_credit: "all",
      customer_communication: "all",
      executive_escalation: "all",
      workspace_admin: "all"
    },
    review: "all"
  }
};

export function parseDemoRole(value: string | null | undefined): DemoRoleSlug | null {
  return value && isDemoRoleSlug(value) ? value : null;
}

export function isApprovalActionType(value: unknown): value is ApprovalActionType {
  return (
    value === "technical_remediation" ||
    value === "financial_credit" ||
    value === "customer_communication" ||
    value === "executive_escalation" ||
    value === "workspace_admin"
  );
}

export function isApprovalRiskLevel(value: unknown): value is ApprovalRiskLevel {
  return value === "low" || value === "medium" || value === "high" || value === "critical";
}

function riskAllowed(allowed: ApprovalRiskLevel[] | "all" | undefined, riskLevel: ApprovalRiskLevel) {
  if (!allowed) {
    return false;
  }

  return allowed === "all" ? true : allowed.includes(riskLevel);
}

export function canRoleReviewAction(role: DemoRoleSlug, actionType: ApprovalActionType, riskLevel: ApprovalRiskLevel) {
  const reviewRules = GOVERNANCE_PERMISSION_MATRIX[role].review;

  if (reviewRules === "all") {
    return true;
  }

  return riskAllowed(reviewRules[actionType], riskLevel);
}

export function canRoleDecideAction(role: DemoRoleSlug, actionType: ApprovalActionType, riskLevel: ApprovalRiskLevel) {
  return riskAllowed(GOVERNANCE_PERMISSION_MATRIX[role].decide[actionType], riskLevel);
}

export function evaluateGovernancePermission(
  role: DemoRoleSlug,
  governance: Pick<ApprovalGovernance, "actionType" | "riskLevel" | "requiredRole">,
  permission: GovernancePermission = "decide"
): PermissionEvaluation {
  const actionAllowed = permission === "decide"
    ? canRoleDecideAction(role, governance.actionType, governance.riskLevel)
    : canRoleReviewAction(role, governance.actionType, governance.riskLevel);
  const assignedRoleOverride = permission === "decide" && role === governance.requiredRole && actionAllowed;
  const adminOverride = role === "admin" && permission === "decide";

  if (actionAllowed || assignedRoleOverride || adminOverride) {
    return {
      role,
      actionType: governance.actionType,
      riskLevel: governance.riskLevel,
      permission,
      allowed: true,
      reason: `${roleLabels[role]} is permitted to ${permission} ${governance.riskLevel} ${governance.actionType.replaceAll("_", " ")} actions.`
    };
  }

  return {
    role,
    actionType: governance.actionType,
    riskLevel: governance.riskLevel,
    permission,
    allowed: false,
    reason: `${roleLabels[role]} is not permitted to ${permission} ${governance.riskLevel} ${governance.actionType.replaceAll("_", " ")} actions.`
  };
}

export function roleRelevance(role: DemoRoleSlug, governance: Pick<ApprovalGovernance, "actionType" | "riskLevel" | "requiredRole">) {
  if (role === governance.requiredRole) {
    return "owner" as const;
  }

  if (canRoleDecideAction(role, governance.actionType, governance.riskLevel)) {
    return "permitted" as const;
  }

  if (canRoleReviewAction(role, governance.actionType, governance.riskLevel)) {
    return "review" as const;
  }

  return null;
}

export function approvalRiskSummary(actionType: ApprovalActionType, riskLevel: ApprovalRiskLevel) {
  const actionCopy: Record<ApprovalActionType, string> = {
    technical_remediation: "changes incident operations or simulated remediation state",
    financial_credit: "affects customer credits, revenue exposure, or finance policy",
    customer_communication: "publishes customer-facing incident communication",
    executive_escalation: "routes the incident into executive governance",
    workspace_admin: "changes demo workspace governance or integrations"
  };

  const riskCopy: Record<ApprovalRiskLevel, string> = {
    low: "Low risk: reversible demo action with narrow impact.",
    medium: "Medium risk: operational state changes require accountable approval.",
    high: "High risk: broad customer, revenue, or incident-control impact.",
    critical: "Critical risk: executive or admin authority required before continuation."
  };

  return `${riskCopy[riskLevel]} This approval ${actionCopy[actionType]}.`;
}

export function roleLabel(role: DemoRoleSlug) {
  return roleLabels[role];
}

export function coerceRisk(value: unknown, fallback: ApprovalRiskLevel = "medium"): ApprovalRiskLevel {
  return isApprovalRiskLevel(value) ? value : fallback;
}

export function normalizeRisk(value: string): ApprovalRiskLevel {
  return allRisks.includes(value as ApprovalRiskLevel) ? (value as ApprovalRiskLevel) : "medium";
}
