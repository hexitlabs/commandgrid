import type { DemoRoleSlug } from "../roles/view-rules";

export const APPROVAL_ACTION_TYPES = [
  "technical_remediation",
  "financial_credit",
  "customer_communication",
  "executive_escalation",
  "workspace_admin"
] as const;

export type ApprovalActionType = (typeof APPROVAL_ACTION_TYPES)[number];

export const APPROVAL_RISK_LEVELS = ["low", "medium", "high", "critical"] as const;

export type ApprovalRiskLevel = (typeof APPROVAL_RISK_LEVELS)[number];

export type ApprovalDecision = "approved" | "rejected";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "cancelled";

export type ApprovalGovernance = {
  actionType: ApprovalActionType;
  riskLevel: ApprovalRiskLevel;
  requiredRole: DemoRoleSlug;
  requiredRoleLabel: string;
  riskSummary: string;
  continuation: "phase5-remediation" | "flagship-remediation" | "financial-review" | "customer-comms" | "manual-review";
  evidenceLabels: string[];
};

export type ApprovalQueueItem = {
  id: string;
  title: string;
  description: string;
  status: ApprovalStatus | string;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  governance: ApprovalGovernance;
  roleRelevance: "owner" | "permitted" | "review";
  canDecide: boolean;
  incident: {
    id: string;
    slug: string;
    title: string;
    severity: string;
    status: string;
    delayedOrders: number;
    revenueAtRiskCents: number;
  } | null;
  recommendation: {
    id: string;
    title: string;
    priority: string;
    confidence: string;
  } | null;
  requestedBy: {
    id: string;
    name: string;
    title: string;
  } | null;
};

export type ApprovalDetail = ApprovalQueueItem & {
  recommendation: (ApprovalQueueItem["recommendation"] & {
    body: string;
    status: string;
    evidenceLabels: string[];
  }) | null;
  evidence: Array<{
    id: string;
    label: string;
    title: string;
    type: string;
    source: string;
    excerpt: string;
  }>;
  decisions: Array<{
    id: string;
    decision: string;
    rationale: string;
    decidedAt: string;
    actor: { id: string; name: string; title: string } | null;
    role: DemoRoleSlug | null;
    metadataSummary: string;
  }>;
  auditContext: Array<{
    id: string;
    action: string;
    occurredAt: string;
    actor: { id: string; name: string; title: string } | null;
    targetType: string;
    targetId: string;
    metadataSummary: string;
  }>;
};

export type ApprovalDecisionResult = {
  ok: true;
  approvalId: string;
  decisionId: string;
  auditLogId: string;
  status: "approved" | "rejected";
  actorRole: DemoRoleSlug;
  actorUserId: string | null;
  continuation: {
    status: "resumed" | "stopped" | "recorded";
    action: ApprovalGovernance["continuation"];
    impact: string;
  };
};
