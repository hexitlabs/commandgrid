import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { formatDateTime, titleCase } from "@/modules/dashboard/formatters";
import { governanceRoleLabel, governanceStatusTone, humanizeGovernanceValue } from "@/modules/governance/display";
import type { ApprovalDetail as ApprovalDetailType } from "@/modules/approvals/types";
import type { DemoRoleSlug } from "@/modules/roles/view-rules";
import { ApprovalDecisionForm } from "./approval-decision-form";

function roleHref(pathname: string, query: Record<string, string>) {
  return { pathname, query };
}

function timelineItems(approval: ApprovalDetailType): TimelineItem[] {
  const decisions = approval.decisions.map((decision) => ({
    time: formatDateTime(decision.decidedAt, { hour: "2-digit", minute: "2-digit" }),
    title: `${titleCase(decision.decision)} by ${governanceRoleLabel(decision.role)}`,
    description: `${decision.rationale} · ${decision.metadataSummary}`,
    meta: <StatusBadge status={decision.decision} tone={governanceStatusTone(decision.decision)} />,
    tone: decision.decision === "approved" ? "emerald" : "amber"
  } satisfies TimelineItem));

  const audit = approval.auditContext.map((entry) => ({
    time: formatDateTime(entry.occurredAt, { hour: "2-digit", minute: "2-digit" }),
    title: titleCase(entry.action),
    description: `${titleCase(entry.targetType)} ${entry.targetId} · ${entry.actor?.name ?? "System"} · ${entry.metadataSummary}`,
    meta: <StatusBadge status="audit" tone="neutral" />,
    tone: "blue" as const
  } satisfies TimelineItem));

  return [...decisions, ...audit].slice(0, 12);
}

export function ApprovalDetailView({ approval, role }: { approval: ApprovalDetailType; role: DemoRoleSlug }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
      <div className="space-y-6">
        <Card>
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
          <div className="grid gap-4 text-sm leading-6 text-slate-600 dark:text-slate-300 md:grid-cols-2">
            <p><strong className="text-slate-950 dark:text-white">Required role:</strong> {approval.governance.requiredRoleLabel}</p>
            <p><strong className="text-slate-950 dark:text-white">Selected role:</strong> {governanceRoleLabel(role)}</p>
            <p><strong className="text-slate-950 dark:text-white">Continuation:</strong> {humanizeGovernanceValue(approval.governance.continuation)}</p>
            <p><strong className="text-slate-950 dark:text-white">Due:</strong> {formatDateTime(approval.dueAt)}</p>
          </div>
          <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50/80 p-4 dark:border-violet-400/20 dark:bg-violet-400/10">
            <p className="text-sm font-semibold text-violet-950 dark:text-violet-100">Why human approval is required</p>
            <p className="mt-2 text-sm leading-6 text-violet-800 dark:text-violet-100/80">{approval.governance.riskSummary}</p>
          </div>
        </Card>

        {approval.recommendation ? (
          <Card>
            <CardHeader>
              <CardTitle>Recommended action</CardTitle>
              <CardDescription>AI recommendation queued behind governance approval.</CardDescription>
            </CardHeader>
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-950 dark:text-white">{approval.recommendation.title}</p>
                <StatusBadge status={approval.recommendation.status} tone={governanceStatusTone(approval.recommendation.status)} />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{approval.recommendation.body}</p>
              <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                Priority {approval.recommendation.priority} · confidence {approval.recommendation.confidence} · cites {approval.recommendation.evidenceLabels.join(", ") || "seeded evidence"}
              </p>
            </div>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Evidence summaries</CardTitle>
            <CardDescription>Sanitized context by citation label. Raw secrets, payloads, and log dumps are not rendered.</CardDescription>
          </CardHeader>
          <div className="grid gap-3 md:grid-cols-2">
            {approval.evidence.length ? approval.evidence.map((evidence) => (
              <div key={evidence.id} className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={evidence.type} tone="neutral" />
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{evidence.label}</span>
                </div>
                <p className="mt-3 font-semibold text-slate-950 dark:text-white">{evidence.title}</p>
                <p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{evidence.excerpt}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Source: {evidence.source}</p>
              </div>
            )) : (
              <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-white/15 dark:text-slate-300">No evidence summaries are attached to this approval.</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Decision and audit timeline</CardTitle>
            <CardDescription>Immutable decisions and linked audit context for this approval.</CardDescription>
          </CardHeader>
          {timelineItems(approval).length ? <Timeline items={timelineItems(approval)} /> : <p className="text-sm text-slate-600 dark:text-slate-300">No decisions have been recorded yet.</p>}
        </Card>
      </div>

      <aside className="space-y-6">
        <Card className="xl:sticky xl:top-28">
          <CardHeader>
            <CardTitle>Decision controls</CardTitle>
            <CardDescription>Approve or reject via Phase 6A API. Unauthorized direct requests remain blocked server-side.</CardDescription>
          </CardHeader>
          <ApprovalDecisionForm approval={approval} role={role} />
        </Card>

        {approval.incident ? (
          <Card>
            <CardHeader>
              <CardTitle>Linked incident</CardTitle>
              <CardDescription>{approval.incident.title}</CardDescription>
            </CardHeader>
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p>{approval.incident.delayedOrders.toLocaleString()} delayed orders · status {approval.incident.status}</p>
              <Link href={roleHref(`/incidents/${approval.incident.id}`, { role })} className="block font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-200">Open incident detail →</Link>
              <Link href={roleHref("/audit", { role, incidentId: approval.incident.id })} className="block font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-200">Open incident audit trail →</Link>
            </div>
          </Card>
        ) : null}
      </aside>
    </div>
  );
}
