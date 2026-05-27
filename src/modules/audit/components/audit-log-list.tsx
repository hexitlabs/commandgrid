import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/state-views";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime, titleCase } from "@/modules/dashboard/formatters";
import { governanceRoleLabel, governanceStatusTone, humanizeGovernanceValue } from "@/modules/governance/display";
import type { AuditLogListItem } from "@/modules/audit/types";
import type { DemoRoleSlug } from "@/modules/roles/view-rules";

function href(pathname: string, query: Record<string, string>) {
  return { pathname, query };
}

export function AuditLogList({ logs, role }: { logs: AuditLogListItem[]; role: DemoRoleSlug }) {
  if (!logs.length) {
    return (
      <EmptyState
        title="No audit records match these filters"
        description="Try broadening the actor, action type, incident, status, or search filters. Newly recorded approval decisions appear here immediately after the backend writes the append-only audit log."
      />
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <Card key={log.id}>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={log.outcome} tone={governanceStatusTone(log.outcome)} />
              {log.actionType ? <StatusBadge status={humanizeGovernanceValue(log.actionType)} tone="neutral" /> : null}
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                {formatDateTime(log.occurredAt)}
              </span>
            </div>
            <CardTitle>{titleCase(log.action)}</CardTitle>
            <CardDescription>
              {log.actor?.name ?? "System"}{log.actor?.title ? ` · ${log.actor.title}` : ""} · actor role {governanceRoleLabel(log.actorRole)}
            </CardDescription>
          </CardHeader>

          <div className="grid gap-4 lg:grid-cols-[1fr_0.75fr]">
            <div className="space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              <p><strong className="text-slate-950 dark:text-white">Target:</strong> {titleCase(log.targetType)} · {log.targetId}</p>
              <p><strong className="text-slate-950 dark:text-white">Status:</strong> {log.status ? humanizeGovernanceValue(log.status) : "Not set"}</p>
              <p><strong className="text-slate-950 dark:text-white">Sanitized metadata summary:</strong> {log.metadataSummary}</p>
              <div className="flex flex-wrap gap-3">
                {log.incidentId ? <Link href={href(`/incidents/${log.incidentId}`, { role })} className="font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-200">Open incident</Link> : null}
                {log.targetType === "approval" ? <Link href={href(`/approvals/${log.targetId}`, { role })} className="font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-200">Open approval</Link> : null}
                {log.incidentId ? <Link href={href("/audit", { role, incidentId: log.incidentId })} className="font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-200">Filter this incident</Link> : null}
              </div>
            </div>

            <details className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <summary className="cursor-pointer text-sm font-semibold text-slate-950 dark:text-white">Audit detail</summary>
              <dl className="mt-4 grid gap-3 text-sm text-slate-600 dark:text-slate-300">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Audit ID</dt>
                  <dd className="mt-1 break-all">{log.id}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Actor user ID</dt>
                  <dd className="mt-1 break-all">{log.actor?.id ?? "system"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Incident ID</dt>
                  <dd className="mt-1 break-all">{log.incidentId ?? "not linked"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Summary only</dt>
                  <dd className="mt-1">Raw metadata is intentionally not exposed in this UI.</dd>
                </div>
              </dl>
            </details>
          </div>
        </Card>
      ))}
    </div>
  );
}
