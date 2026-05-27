import { auditLogs } from "../../lib/db/schema";
import type { CommandGridDbLike } from "../../lib/db/client";

export type AuditLogInput = {
  id: string;
  organizationId: string;
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  occurredAt: Date;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
};

export async function writeAuditLog(db: CommandGridDbLike, input: AuditLogInput) {
  await db
    .insert(auditLogs)
    .values({
      id: input.id,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      occurredAt: input.occurredAt,
      ipAddress: input.ipAddress ?? null,
      metadata: input.metadata ?? {}
    })
    .onConflictDoNothing();
}
