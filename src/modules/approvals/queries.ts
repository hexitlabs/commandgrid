import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import type { CommandGridDb } from "../../lib/db/client";
import { approvals, auditLogs, decisions, incidents, knowledgeDocuments, recommendations, roles, users } from "../../lib/db/schema";
import { auditMetadataSummary } from "../audit/sanitize";
import { evaluateGovernancePermission, parseDemoRole, roleRelevance } from "../permissions/governance";
import { DEFAULT_ORGANIZATION_SLUG, getOrganizationOrThrow, metadataRecord, readStringArrayMetadata, toIsoString } from "../shared/query-utils";
import type { DemoRoleSlug } from "../roles/view-rules";
import { deriveApprovalGovernance } from "./governance";
import type { ApprovalDetail, ApprovalQueueItem, ApprovalStatus } from "./types";

export type ApprovalQueryOptions = {
  organizationSlug?: string;
  role: DemoRoleSlug | string;
  status?: ApprovalStatus | "all";
  limit?: number;
};

function simpleUser(row: { id: string | null; name: string | null; title: string | null }) {
  return row.id && row.name && row.title ? { id: row.id, name: row.name, title: row.title } : null;
}

function clampLimit(limit: number | undefined) {
  if (!limit || !Number.isFinite(limit)) return 50;
  return Math.min(Math.max(Math.trunc(limit), 1), 100);
}

type ApprovalBaseRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  riskLevel: string;
  dueAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
  assignedRoleSlug: string | null;
  incidentId: string | null;
  incidentSlug: string | null;
  incidentTitle: string | null;
  incidentSeverity: string | null;
  incidentStatus: string | null;
  delayedOrders: number | null;
  revenueAtRiskCents: number | null;
  recommendationId: string | null;
  recommendationTitle: string | null;
  recommendationBody?: string | null;
  recommendationPriority: string | null;
  recommendationStatus?: string | null;
  recommendationConfidence: string | null;
  recommendationMetadata: Record<string, unknown> | null;
  requesterId: string | null;
  requesterName: string | null;
  requesterTitle: string | null;
};

function mapQueueItem(row: ApprovalBaseRow, role: DemoRoleSlug): ApprovalQueueItem | null {
  const governance = deriveApprovalGovernance(row);
  const relevance = roleRelevance(role, governance);

  if (!relevance) {
    return null;
  }

  const permission = evaluateGovernancePermission(role, governance, "decide");

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    dueAt: toIsoString(row.dueAt),
    createdAt: toIsoString(row.createdAt) ?? "",
    updatedAt: toIsoString(row.updatedAt) ?? "",
    governance,
    roleRelevance: relevance,
    canDecide: permission.allowed && row.status === "pending",
    incident: row.incidentId && row.incidentSlug && row.incidentTitle && row.incidentSeverity && row.incidentStatus
      ? {
          id: row.incidentId,
          slug: row.incidentSlug,
          title: row.incidentTitle,
          severity: row.incidentSeverity,
          status: row.incidentStatus,
          delayedOrders: row.delayedOrders ?? 0,
          revenueAtRiskCents: row.revenueAtRiskCents ?? 0
        }
      : null,
    recommendation: row.recommendationId && row.recommendationTitle && row.recommendationPriority && row.recommendationConfidence
      ? {
          id: row.recommendationId,
          title: row.recommendationTitle,
          priority: row.recommendationPriority,
          confidence: String(row.recommendationConfidence)
        }
      : null,
    requestedBy: simpleUser({ id: row.requesterId, name: row.requesterName, title: row.requesterTitle })
  };
}

async function getApprovalRows(db: CommandGridDb, options: { organizationSlug?: string; status?: ApprovalStatus | "all"; limit?: number; id?: string }) {
  const organization = await getOrganizationOrThrow(db, options.organizationSlug ?? DEFAULT_ORGANIZATION_SLUG);
  const conditions = [eq(approvals.organizationId, organization.id)];

  if (options.id) {
    conditions.push(eq(approvals.id, options.id));
  }

  if (options.status && options.status !== "all") {
    conditions.push(eq(approvals.status, options.status));
  }

  return db
    .select({
      id: approvals.id,
      title: approvals.title,
      description: approvals.description,
      status: approvals.status,
      riskLevel: approvals.riskLevel,
      dueAt: approvals.dueAt,
      createdAt: approvals.createdAt,
      updatedAt: approvals.updatedAt,
      metadata: approvals.metadata,
      assignedRoleSlug: roles.slug,
      incidentId: incidents.id,
      incidentSlug: incidents.slug,
      incidentTitle: incidents.title,
      incidentSeverity: incidents.severity,
      incidentStatus: incidents.status,
      delayedOrders: incidents.delayedOrders,
      revenueAtRiskCents: incidents.revenueAtRiskCents,
      recommendationId: recommendations.id,
      recommendationTitle: recommendations.title,
      recommendationBody: recommendations.body,
      recommendationPriority: recommendations.priority,
      recommendationStatus: recommendations.status,
      recommendationConfidence: recommendations.confidence,
      recommendationMetadata: recommendations.metadata,
      requesterId: users.id,
      requesterName: users.name,
      requesterTitle: users.title
    })
    .from(approvals)
    .leftJoin(roles, eq(roles.id, approvals.assignedRoleId))
    .leftJoin(incidents, eq(incidents.id, approvals.incidentId))
    .leftJoin(recommendations, eq(recommendations.id, approvals.recommendationId))
    .leftJoin(users, eq(users.id, approvals.requestedByUserId))
    .where(and(...conditions))
    .orderBy(desc(approvals.createdAt))
    .limit(options.id ? 1 : clampLimit(options.limit));
}

export async function getApprovalQueue(db: CommandGridDb, options: ApprovalQueryOptions) {
  const role = parseDemoRole(String(options.role));
  if (!role) {
    throw new Error("Invalid demo role. Approval queue requires a server-validated demo role.");
  }

  const rows = await getApprovalRows(db, { organizationSlug: options.organizationSlug, status: options.status ?? "pending", limit: options.limit });
  return rows.map((row) => mapQueueItem(row, role)).filter((item): item is ApprovalQueueItem => Boolean(item));
}

async function getEvidenceRows(db: CommandGridDb, organizationId: string, labels: string[]) {
  if (labels.length === 0) return [];

  return db
    .select({
      id: knowledgeDocuments.id,
      label: knowledgeDocuments.citationLabel,
      title: knowledgeDocuments.title,
      type: knowledgeDocuments.documentType,
      source: knowledgeDocuments.citationUri,
      excerpt: knowledgeDocuments.content
    })
    .from(knowledgeDocuments)
    .where(and(eq(knowledgeDocuments.organizationId, organizationId), inArray(knowledgeDocuments.citationLabel, labels)))
    .limit(20);
}

export async function getApprovalDetail(db: CommandGridDb, approvalId: string, options: { organizationSlug?: string; role: DemoRoleSlug | string }) {
  const role = parseDemoRole(String(options.role));
  if (!role) {
    throw new Error("Invalid demo role. Approval detail requires a server-validated demo role.");
  }

  const organization = await getOrganizationOrThrow(db, options.organizationSlug ?? DEFAULT_ORGANIZATION_SLUG);
  const [row] = await getApprovalRows(db, { organizationSlug: organization.slug, status: "all", id: approvalId });
  if (!row) return null;

  const base = mapQueueItem(row, role);
  if (!base) return null;

  const recommendationMetadata = metadataRecord(row.recommendationMetadata);
  const evidenceLabels = [...new Set([...base.governance.evidenceLabels, ...readStringArrayMetadata(recommendationMetadata, "citationLabels")])];
  const [evidenceRows, decisionRows, auditRows] = await Promise.all([
    getEvidenceRows(db, organization.id, evidenceLabels),
    db
      .select({
        id: decisions.id,
        decision: decisions.decision,
        rationale: decisions.rationale,
        decidedAt: decisions.decidedAt,
        metadata: decisions.metadata,
        actorId: users.id,
        actorName: users.name,
        actorTitle: users.title
      })
      .from(decisions)
      .leftJoin(users, eq(users.id, decisions.decidedByUserId))
      .where(eq(decisions.approvalId, approvalId))
      .orderBy(desc(decisions.decidedAt))
      .limit(20),
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        occurredAt: auditLogs.occurredAt,
        metadata: auditLogs.metadata,
        targetType: auditLogs.targetType,
        targetId: auditLogs.targetId,
        actorId: users.id,
        actorName: users.name,
        actorTitle: users.title
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorUserId))
      .where(
        and(
          eq(auditLogs.organizationId, organization.id),
          or(eq(auditLogs.targetId, approvalId), row.incidentId ? eq(auditLogs.targetId, row.incidentId) : undefined, sql`${auditLogs.metadata}->>'approvalId' = ${approvalId}`)
        )
      )
      .orderBy(desc(auditLogs.occurredAt))
      .limit(30)
  ]);

  return {
    ...base,
    recommendation: row.recommendationId && row.recommendationTitle && row.recommendationBody && row.recommendationPriority && row.recommendationConfidence
      ? {
          id: row.recommendationId,
          title: row.recommendationTitle,
          body: row.recommendationBody,
          priority: row.recommendationPriority,
          status: row.recommendationStatus ?? "unknown",
          confidence: String(row.recommendationConfidence),
          evidenceLabels
        }
      : null,
    evidence: evidenceRows,
    decisions: decisionRows.map((decision) => {
      const metadata = metadataRecord(decision.metadata);
      const roleValue = metadata.actorRole;
      return {
        id: decision.id,
        decision: decision.decision,
        rationale: decision.rationale,
        decidedAt: toIsoString(decision.decidedAt) ?? "",
        actor: simpleUser({ id: decision.actorId, name: decision.actorName, title: decision.actorTitle }),
        role: typeof roleValue === "string" && parseDemoRole(roleValue) ? parseDemoRole(roleValue) : null,
        metadataSummary: auditMetadataSummary(metadata)
      };
    }),
    auditContext: auditRows.map((audit) => ({
      id: audit.id,
      action: audit.action,
      occurredAt: toIsoString(audit.occurredAt) ?? "",
      actor: simpleUser({ id: audit.actorId, name: audit.actorName, title: audit.actorTitle }),
      targetType: audit.targetType,
      targetId: audit.targetId,
      metadataSummary: auditMetadataSummary(metadataRecord(audit.metadata))
    }))
  } satisfies ApprovalDetail;
}
