import type { DemoRoleSlug } from "../roles/view-rules";

export type AuditOutcome = "approved" | "rejected" | "requested" | "completed" | "started" | "simulated" | "generated" | "blocked" | "unknown";

export type AuditQueryFilters = {
  organizationSlug?: string;
  actorUserId?: string;
  actorRole?: DemoRoleSlug;
  action?: string;
  actionType?: string;
  incidentId?: string;
  targetType?: string;
  targetId?: string;
  status?: string;
  outcome?: string;
  search?: string;
  limit?: number;
};

export type AuditLogListItem = {
  id: string;
  action: string;
  actionType: string | null;
  targetType: string;
  targetId: string;
  incidentId: string | null;
  occurredAt: string;
  outcome: AuditOutcome;
  status: string | null;
  actor: {
    id: string;
    name: string;
    title: string;
  } | null;
  actorRole: DemoRoleSlug | null;
  metadataSummary: string;
};

export type AuditQueryResult = {
  organizationSlug: string;
  filters: Required<Pick<AuditQueryFilters, "limit">> & Omit<AuditQueryFilters, "limit">;
  logs: AuditLogListItem[];
};
