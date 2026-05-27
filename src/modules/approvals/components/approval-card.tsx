import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime, formatMoney, titleCase } from "@/modules/dashboard/formatters";
import { governanceRoleLabel, governanceStatusTone, humanizeGovernanceValue } from "@/modules/governance/display";
import type { ApprovalQueueItem } from "@/modules/approvals/types";
import type { DemoRoleSlug } from "@/modules/roles/view-rules";
import { ApprovalDecisionForm } from "./approval-decision-form";

type RoleHref = {
  pathname: string;
  query?: Record<string, string>;
};

function href(pathname: string, query: Record<string, string>): RoleHref {
  return { pathname, query };
}

export function ApprovalCard({ approval, role }: { approval: ApprovalQueueItem; role: DemoRoleSlug }) {
  return (
    <Card className={approval.canDecide ? "border-violet-200/90 dark:border-violet-400/20" : undefined}>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={approval.status} tone={governanceStatusTone(approval.status)} />
          <StatusBadge status={titleCase(approval.roleRelevance)} tone={approval.canDecide ? "healthy" : "neutral"} />
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            {humanizeGovernanceValue(approval.governance.actionType)} · {approval.governance.riskLevel} risk
          </span>
        </div>
        <CardTitle>{approval.title}</CardTitle>
        <CardDescription>{approval.description}</CardDescription>
      </CardHeader>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.82fr]">
        <div className="space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          <p><strong className="text-slate-950 dark:text-white">Required role:</strong> {approval.governance.requiredRoleLabel}</p>
          <p><strong className="text-slate-950 dark:text-white">Why approval is required:</strong> {approval.governance.riskSummary}</p>
          <p><strong className="text-slate-950 dark:text-white">Continuation:</strong> {humanizeGovernanceValue(approval.governance.continuation)}</p>
          <p><strong className="text-slate-950 dark:text-white">Due:</strong> {formatDateTime(approval.dueAt)} · requested {formatDateTime(approval.createdAt)}</p>
          {approval.incident ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-950 dark:text-white">{approval.incident.title}</p>
                <StatusBadge status={approval.incident.status} tone={governanceStatusTone(approval.incident.status)} />
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {approval.incident.delayedOrders.toLocaleString()} delayed orders · {formatMoney(approval.incident.revenueAtRiskCents)} at risk
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={href(`/incidents/${approval.incident.id}`, { role })} className="text-xs font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-200">
                  Open incident
                </Link>
                <Link href={href("/audit", { role, incidentId: approval.incident.id })} className="text-xs font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-200">
                  Linked audit trail
                </Link>
              </div>
            </div>
          ) : null}
          {approval.recommendation ? (
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="font-semibold text-slate-950 dark:text-white">{approval.recommendation.title}</p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Priority {approval.recommendation.priority} · confidence {approval.recommendation.confidence}</p>
            </div>
          ) : null}
          <Link href={href(`/approvals/${approval.id}`, { role })} className="inline-flex text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-200">
            Open approval detail →
          </Link>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Acting as {governanceRoleLabel(role)}
          </p>
          <ApprovalDecisionForm approval={approval} role={role} compact />
        </div>
      </div>
    </Card>
  );
}
