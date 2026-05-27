import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { CommandGridDb } from "../../lib/db/client";
import { approvals, auditLogs, incidents, recommendations, roles, userRoles, users } from "../../lib/db/schema";
import { DEFAULT_ORGANIZATION_SLUG, getOrganizationOrThrow, metadataRecord, toIsoString } from "../shared/query-utils";
import { isDemoRoleSlug, type DemoRoleSlug } from "../roles/view-rules";
import { auditMetadataSummary } from "./sanitize";
import type { AuditLogListItem, AuditOutcome, AuditQueryFilters, AuditQueryResult } from "./types";

function clampLimit(limit: number | undefined) {
  if (!limit || !Number.isFinite(limit)) {
    return 50;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), 200);
}

function actorRoleFromMetadata(metadata: Record<string, unknown>): DemoRoleSlug | null {
  const value = metadata.actorRole;
  return typeof value === "string" && isDemoRoleSlug(value) ? value : null;
}

function actionTypeFromMetadata(metadata: Record<string, unknown>) {
  const value = metadata.actionType;
  return typeof value === "string" ? value : null;
}

function incidentIdFromRow(row: {
  targetType: string;
  targetId: string;
  incidentId: string | null;
  approvalIncidentId: string | null;
  recommendationIncidentId: string | null;
  metadata: Record<string, unknown>;
}) {
  if (row.targetType === "incident") {
    return row.targetId;
  }

  const metadataIncidentId = row.metadata.incidentId;
  if (typeof metadataIncidentId === "string") {
    return metadataIncidentId;
  }

  return row.incidentId ?? row.approvalIncidentId ?? row.recommendationIncidentId;
}

function outcomeFromAction(action: string, metadata: Record<string, unknown>): AuditOutcome {
  const metadataOutcome = metadata.outcome ?? metadata.decision ?? metadata.status;
  if (typeof metadataOutcome === "string") {
    if (["approved", "rejected", "requested", "completed", "started", "simulated", "generated", "blocked"].includes(metadataOutcome)) {
      return metadataOutcome as AuditOutcome;
    }
  }

  if (action.endsWith(".approved")) return "approved";
  if (action.endsWith(".rejected")) return "rejected";
  if (action.endsWith(".requested")) return "requested";
  if (action.endsWith(".completed")) return "completed";
  if (action.endsWith(".started")) return "started";
  if (action.endsWith(".simulated")) return "simulated";
  if (action.endsWith(".generated")) return "generated";
  if (action.endsWith(".blocked")) return "blocked";
  return "unknown";
}

function statusFromMetadata(metadata: Record<string, unknown>) {
  const value = metadata.status ?? metadata.outcome ?? metadata.decision;
  return typeof value === "string" ? value : null;
}

function roleMatches(metadataRole: DemoRoleSlug | null, derivedRole: string | null, filterRole: DemoRoleSlug | undefined) {
  if (!filterRole) {
    return true;
  }

  return metadataRole === filterRole || derivedRole === filterRole;
}

export function filterAuditRowsForContract<T extends AuditLogListItem>(rows: T[], filters: Pick<AuditQueryFilters, "actorRole" | "actionType" | "incidentId" | "status" | "outcome" | "search">) {
  const search = filters.search?.trim().toLowerCase();

  return rows.filter((row) => {
    if (filters.actorRole && row.actorRole !== filters.actorRole) return false;
    if (filters.actionType && row.actionType !== filters.actionType) return false;
    if (filters.incidentId && row.incidentId !== filters.incidentId) return false;
    if (filters.status && row.status !== filters.status && row.outcome !== filters.status) return false;
    if (filters.outcome && row.outcome !== filters.outcome) return false;

    if (search) {
      const haystack = `${row.action} ${row.actionType ?? ""} ${row.targetType} ${row.targetId} ${row.incidentId ?? ""} ${row.actor?.name ?? ""} ${row.metadataSummary}`.toLowerCase();
      return haystack.includes(search);
    }

    return true;
  });
}

export async function queryAuditLogs(db: CommandGridDb, filters: AuditQueryFilters = {}): Promise<AuditQueryResult> {
  const organization = await getOrganizationOrThrow(db, filters.organizationSlug ?? DEFAULT_ORGANIZATION_SLUG);
  const limit = clampLimit(filters.limit);
  const conditions: SQL[] = [eq(auditLogs.organizationId, organization.id)];

  if (filters.actorUserId) {
    conditions.push(eq(auditLogs.actorUserId, filters.actorUserId));
  }

  if (filters.action) {
    conditions.push(eq(auditLogs.action, filters.action));
  }

  if (filters.targetType) {
    conditions.push(eq(auditLogs.targetType, filters.targetType));
  }

  if (filters.targetId) {
    conditions.push(eq(auditLogs.targetId, filters.targetId));
  }

  if (filters.actorRole) {
    conditions.push(or(sql`${auditLogs.metadata}->>'actorRole' = ${filters.actorRole}`, eq(roles.slug, filters.actorRole)) ?? sql`true`);
  }

  if (filters.actionType) {
    conditions.push(sql`${auditLogs.metadata}->>'actionType' = ${filters.actionType}`);
  }

  if (filters.status) {
    conditions.push(
      or(
        sql`${auditLogs.metadata}->>'status' = ${filters.status}`,
        sql`${auditLogs.metadata}->>'outcome' = ${filters.status}`,
        sql`${auditLogs.metadata}->>'decision' = ${filters.status}`,
        ilike(auditLogs.action, `%.${filters.status}`)
      ) ?? sql`true`
    );
  }

  if (filters.outcome) {
    conditions.push(
      or(
        sql`${auditLogs.metadata}->>'outcome' = ${filters.outcome}`,
        sql`${auditLogs.metadata}->>'decision' = ${filters.outcome}`,
        sql`${auditLogs.metadata}->>'status' = ${filters.outcome}`,
        ilike(auditLogs.action, `%.${filters.outcome}`)
      ) ?? sql`true`
    );
  }

  if (filters.search?.trim()) {
    const pattern = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(auditLogs.action, pattern),
        ilike(auditLogs.targetType, pattern),
        ilike(auditLogs.targetId, pattern),
        ilike(users.name, pattern),
        ilike(users.title, pattern),
        ilike(roles.slug, pattern),
        sql`${auditLogs.metadata}->>'actorRole' ILIKE ${pattern}`,
        sql`${auditLogs.metadata}->>'actionType' ILIKE ${pattern}`,
        sql`${auditLogs.metadata}->>'status' ILIKE ${pattern}`,
        sql`${auditLogs.metadata}->>'outcome' ILIKE ${pattern}`,
        sql`${auditLogs.metadata}->>'decision' ILIKE ${pattern}`,
        sql`${auditLogs.metadata}->>'incidentId' ILIKE ${pattern}`
      ) ?? sql`true`
    );
  }

  if (filters.incidentId) {
    conditions.push(
      or(
        eq(auditLogs.targetId, filters.incidentId),
        eq(incidents.id, filters.incidentId),
        eq(approvals.incidentId, filters.incidentId),
        eq(recommendations.incidentId, filters.incidentId),
        sql`${auditLogs.metadata}->>'incidentId' = ${filters.incidentId}`
      ) ?? sql`true`
    );
  }

  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      targetType: auditLogs.targetType,
      targetId: auditLogs.targetId,
      occurredAt: auditLogs.occurredAt,
      metadata: auditLogs.metadata,
      actorId: users.id,
      actorName: users.name,
      actorTitle: users.title,
      derivedActorRole: roles.slug,
      incidentId: incidents.id,
      approvalIncidentId: approvals.incidentId,
      recommendationIncidentId: recommendations.incidentId
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorUserId))
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .leftJoin(incidents, and(eq(auditLogs.targetType, "incident"), eq(incidents.id, auditLogs.targetId)))
    .leftJoin(approvals, and(eq(auditLogs.targetType, "approval"), eq(approvals.id, auditLogs.targetId)))
    .leftJoin(recommendations, and(eq(auditLogs.targetType, "recommendation"), eq(recommendations.id, auditLogs.targetId)))
    .where(and(...conditions))
    .orderBy(desc(auditLogs.occurredAt))
    .limit(limit * 2);

  const logs = rows
    .map((row): AuditLogListItem | null => {
      const metadata = metadataRecord(row.metadata);
      const metadataRole = actorRoleFromMetadata(metadata);
      const actorRole = metadataRole ?? (isDemoRoleSlug(row.derivedActorRole ?? "") ? (row.derivedActorRole as DemoRoleSlug) : null);

      if (!roleMatches(metadataRole, row.derivedActorRole, filters.actorRole)) {
        return null;
      }

      return {
        id: row.id,
        action: row.action,
        actionType: actionTypeFromMetadata(metadata),
        targetType: row.targetType,
        targetId: row.targetId,
        incidentId: incidentIdFromRow({
          targetType: row.targetType,
          targetId: row.targetId,
          incidentId: row.incidentId,
          approvalIncidentId: row.approvalIncidentId,
          recommendationIncidentId: row.recommendationIncidentId,
          metadata
        }),
        occurredAt: toIsoString(row.occurredAt) ?? "",
        outcome: outcomeFromAction(row.action, metadata),
        status: statusFromMetadata(metadata),
        actor: row.actorId && row.actorName && row.actorTitle ? { id: row.actorId, name: row.actorName, title: row.actorTitle } : null,
        actorRole,
        metadataSummary: auditMetadataSummary(metadata)
      };
    })
    .filter((row): row is AuditLogListItem => Boolean(row));

  const filtered = filterAuditRowsForContract(logs, filters).slice(0, limit);

  return {
    organizationSlug: organization.slug,
    filters: {
      ...filters,
      limit
    },
    logs: filtered
  };
}
