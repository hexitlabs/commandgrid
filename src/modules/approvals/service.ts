import { eq } from "drizzle-orm";
import type { CommandGridDb } from "../../lib/db/client";
import { approvals, decisions, incidentTimelineEvents, incidents, notifications, recommendations, roles, users } from "../../lib/db/schema";
import { writeAuditLog } from "../audit/service";
import { evaluateGovernancePermission, parseDemoRole } from "../permissions/governance";
import { metadataRecord } from "../shared/query-utils";
import { PHASE5_WORKFLOW } from "../workflows/incident-response/constants";
import { approveDemoRemediation } from "../workflows/incident-response/service";
import { deriveApprovalGovernance } from "./governance";
import type { ApprovalDecision, ApprovalDecisionResult } from "./types";

const roleUserIds = {
  executive: "user_maya_chen",
  "ops-manager": "user_diego_alvarez",
  engineer: "user_priya_natarajan",
  "support-lead": "user_jordan_ellis",
  "finance-reviewer": "user_leah_brooks",
  admin: "user_alex_morgan"
} as const;

export class GovernancePermissionError extends Error {
  readonly status = 403;

  constructor(message: string) {
    super(message);
    this.name = "GovernancePermissionError";
  }
}

export class ApprovalDecisionError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApprovalDecisionError";
    this.status = status;
  }
}

export type DecideApprovalInput = {
  approvalId: string;
  selectedRole: string;
  decision: ApprovalDecision;
  rationale: string;
  organizationSlug?: string;
  ipAddress?: string | null;
  now?: Date;
  decisionId?: string;
  auditLogId?: string;
};

function newId(prefix: string) {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${random}`;
}

function cleanRationale(value: string) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length < 3) {
    throw new ApprovalDecisionError("A short rationale is required to record an approval decision.");
  }

  return trimmed.slice(0, 1_000);
}

export function decisionAuditAction(decision: ApprovalDecision) {
  return decision === "approved" ? "approval.approved" : "approval.rejected";
}

export function buildDecisionSideEffects(input: {
  approvalId: string;
  decision: ApprovalDecision;
  actorRole: string;
  actionType: string;
  continuation: string;
}) {
  const approved = input.decision === "approved";
  const status = approved ? "approved" : "rejected";
  const continuationStatus = approved ? "resumed" : "stopped";
  const impact = approved
    ? `Approved ${input.actionType.replaceAll("_", " ")} and ${input.continuation === "manual-review" ? "recorded the decision" : "released the continuation path"}.`
    : `Rejected ${input.actionType.replaceAll("_", " ")}; continuation path is stopped for this demo action.`;

  return {
    approvalStatus: status,
    recommendationStatus: approved ? "implemented" : "rejected",
    auditAction: decisionAuditAction(input.decision),
    continuationStatus,
    impact
  } as const;
}

async function loadApprovalForDecision(db: CommandGridDb, approvalId: string) {
  const [row] = await db
    .select({
      id: approvals.id,
      title: approvals.title,
      description: approvals.description,
      status: approvals.status,
      riskLevel: approvals.riskLevel,
      organizationId: approvals.organizationId,
      incidentId: approvals.incidentId,
      recommendationId: approvals.recommendationId,
      metadata: approvals.metadata,
      assignedRoleSlug: roles.slug,
      recommendationMetadata: recommendations.metadata
    })
    .from(approvals)
    .leftJoin(roles, eq(roles.id, approvals.assignedRoleId))
    .leftJoin(recommendations, eq(recommendations.id, approvals.recommendationId))
    .where(eq(approvals.id, approvalId))
    .limit(1);

  return row ?? null;
}

async function actorUserIdForRole(db: CommandGridDb, role: keyof typeof roleUserIds) {
  const fallbackUserId = roleUserIds[role];
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, fallbackUserId)).limit(1);
  return user?.id ?? null;
}

function timelineEventId(approvalId: string, decision: ApprovalDecision) {
  return `tl_${approvalId}_${decision}`.replace(/[^a-zA-Z0-9_]/g, "_");
}

async function applyApprovedContinuation(
  db: CommandGridDb,
  approval: Awaited<ReturnType<typeof loadApprovalForDecision>> & {},
  actorUserId: string | null,
  rationale: string
) {
  if (approval.id === PHASE5_WORKFLOW.approvalId) {
    await approveDemoRemediation(db, { actorUserId: actorUserId ?? undefined, rationale });
    return;
  }

  if (approval.recommendationId) {
    await db.update(recommendations).set({ status: "implemented", updatedAt: new Date() }).where(eq(recommendations.id, approval.recommendationId));
  }

  if (approval.incidentId) {
    await db
      .insert(incidentTimelineEvents)
      .values({
        id: timelineEventId(approval.id, "approved"),
        incidentId: approval.incidentId,
        actorUserId,
        eventType: "approval-approved",
        title: "Governed action approved",
        body: "Server-side governance approved the action and CommandGrid resumed the safe demo continuation path.",
        occurredAt: new Date(),
        metadata: { approvalId: approval.id, decision: "approved" }
      })
      .onConflictDoNothing();
  }

  const governance = deriveApprovalGovernance(approval);
  if (governance.continuation === "flagship-remediation" && approval.incidentId) {
    await db
      .update(incidents)
      .set({
        status: "resolved",
        resolvedAt: new Date(),
        summary: "Governed remediation was approved and safely simulated by CommandGrid. No external systems were changed.",
        customerImpactSummary: "Demo impact stabilized after approved remediation simulation.",
        updatedAt: new Date()
      })
      .where(eq(incidents.id, approval.incidentId));
  }

  if (governance.continuation === "customer-comms" && approval.incidentId) {
    await db
      .insert(notifications)
      .values({
        id: `notif_${approval.id}_approved`.replace(/[^a-zA-Z0-9_]/g, "_"),
        organizationId: approval.organizationId,
        incidentId: approval.incidentId,
        integrationId: "int_slack",
        channel: "demo",
        recipient: "affected-customers",
        subject: approval.title,
        status: "sent",
        sentAt: new Date(),
        metadata: { approvalId: approval.id, simulated: true }
      })
      .onConflictDoNothing();
  }
}

async function applyRejectedContinuation(db: CommandGridDb, approval: Awaited<ReturnType<typeof loadApprovalForDecision>> & {}, actorUserId: string | null) {
  if (approval.recommendationId) {
    await db.update(recommendations).set({ status: "rejected", updatedAt: new Date() }).where(eq(recommendations.id, approval.recommendationId));
  }

  if (approval.incidentId) {
    await db
      .update(incidents)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(incidents.id, approval.incidentId));

    await db
      .insert(incidentTimelineEvents)
      .values({
        id: timelineEventId(approval.id, "rejected"),
        incidentId: approval.incidentId,
        actorUserId,
        eventType: "approval-rejected",
        title: "Governed action rejected",
        body: "Decision rejected the action. CommandGrid stopped the continuation path and left the incident active for alternate handling.",
        occurredAt: new Date(),
        metadata: { approvalId: approval.id, decision: "rejected", continuationStatus: "stopped" }
      })
      .onConflictDoNothing();
  }
}

export async function decideApproval(db: CommandGridDb, input: DecideApprovalInput): Promise<ApprovalDecisionResult> {
  const role = parseDemoRole(input.selectedRole);
  if (!role) {
    throw new GovernancePermissionError("Invalid demo role. Selected role must be one of the server allowlisted public demo roles.");
  }

  const approval = await loadApprovalForDecision(db, input.approvalId);
  if (!approval) {
    throw new ApprovalDecisionError(`Approval not found: ${input.approvalId}`, 404);
  }

  if (approval.status !== "pending") {
    throw new ApprovalDecisionError(`Approval is ${approval.status}; only pending approvals can be decided.`, 409);
  }

  const governance = deriveApprovalGovernance(approval);
  const permission = evaluateGovernancePermission(role, governance, "decide");
  if (!permission.allowed) {
    throw new GovernancePermissionError(permission.reason);
  }

  const actorUserId = await actorUserIdForRole(db, role);
  const decidedAt = input.now ?? new Date();
  const rationale = cleanRationale(input.rationale);
  const decisionId = input.decisionId ?? newId("decision");
  const auditLogId = input.auditLogId ?? newId("audit");
  const sideEffects = buildDecisionSideEffects({
    approvalId: approval.id,
    decision: input.decision,
    actorRole: role,
    actionType: governance.actionType,
    continuation: governance.continuation
  });
  const existingMetadata = metadataRecord(approval.metadata);
  const decisionMetadata = {
    actorRole: role,
    actionType: governance.actionType,
    riskLevel: governance.riskLevel,
    requiredRole: governance.requiredRole,
    continuation: governance.continuation,
    continuationStatus: sideEffects.continuationStatus,
    incidentId: approval.incidentId,
    recommendationId: approval.recommendationId,
    outcome: input.decision
  };

  await db.insert(decisions).values({
    id: decisionId,
    approvalId: approval.id,
    decidedByUserId: actorUserId,
    decision: input.decision,
    rationale,
    decidedAt,
    metadata: decisionMetadata
  });

  await db
    .update(approvals)
    .set({
      status: sideEffects.approvalStatus,
      metadata: {
        ...existingMetadata,
        actionType: governance.actionType,
        continuation: governance.continuation,
        continuationStatus: sideEffects.continuationStatus,
        rejectionImpact: input.decision === "rejected" ? sideEffects.impact : undefined,
        lastDecisionId: decisionId,
        decidedByRole: role
      },
      updatedAt: decidedAt
    })
    .where(eq(approvals.id, approval.id));

  await writeAuditLog(db, {
    id: auditLogId,
    organizationId: approval.organizationId,
    actorUserId,
    action: sideEffects.auditAction,
    targetType: "approval",
    targetId: approval.id,
    occurredAt: decidedAt,
    ipAddress: input.ipAddress ?? null,
    metadata: {
      ...decisionMetadata,
      decisionId,
      status: sideEffects.approvalStatus,
      impact: sideEffects.impact
    }
  });

  if (input.decision === "approved") {
    await applyApprovedContinuation(db, approval, actorUserId, rationale);
  } else {
    await applyRejectedContinuation(db, approval, actorUserId);
  }

  return {
    ok: true,
    approvalId: approval.id,
    decisionId,
    auditLogId,
    status: sideEffects.approvalStatus,
    actorRole: role,
    actorUserId,
    continuation: {
      status: sideEffects.continuationStatus,
      action: governance.continuation,
      impact: sideEffects.impact
    }
  };
}
