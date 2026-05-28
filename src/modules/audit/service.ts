import { auditLogs } from "../../lib/db/schema";
import type { CommandGridDbLike } from "../../lib/db/client";
import { coerceSeededDemoUserId } from "../roles/demo-users";

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
  const actorUserId = coerceSeededDemoUserId(input.actorUserId);

  await db
    .insert(auditLogs)
    .values({
      id: input.id,
      organizationId: input.organizationId,
      actorUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      occurredAt: input.occurredAt,
      ipAddress: input.ipAddress ?? null,
      metadata: input.metadata ?? {}
    })
    .onConflictDoNothing();
}
