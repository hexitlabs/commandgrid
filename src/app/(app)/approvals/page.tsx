import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/state-views";
import { StatusBadge } from "@/components/ui/status-badge";
import { openCommandGridDb } from "@/lib/db/server";
import { getApprovalQueue } from "@/modules/approvals/queries";
import type { ApprovalStatus } from "@/modules/approvals/types";
import { ApprovalCard } from "@/modules/approvals/components/approval-card";
import { GovernanceRoleBanner } from "@/modules/governance/components/governance-role-banner";
import { governanceRoleLabel, summarizeCount } from "@/modules/governance/display";
import { resolveRoleParam } from "@/modules/roles/route-role";

export const dynamic = "force-dynamic";

type ApprovalsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const statuses = ["pending", "approved", "rejected", "cancelled", "all"] as const;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function resolveStatus(value: string | string[] | undefined): ApprovalStatus | "all" {
  const candidate = first(value);
  return statuses.includes(candidate as ApprovalStatus | "all") ? (candidate as ApprovalStatus | "all") : "pending";
}

function href(status: ApprovalStatus | "all", role: string) {
  return { pathname: "/approvals", query: { role, status } };
}

export default async function ApprovalsPage({ searchParams }: ApprovalsPageProps) {
  const resolvedSearchParams = await searchParams;
  const role = resolveRoleParam(resolvedSearchParams?.role);
  const status = resolveStatus(resolvedSearchParams?.status);
  const commandGrid = await openCommandGridDb();

  try {
    const approvals = await getApprovalQueue(commandGrid.db, { role, status, limit: 50 });
    const decisionCount = approvals.filter((approval) => approval.canDecide).length;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Link href={{ pathname: "/dashboard", query: { role } }} className="font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-200">Dashboard</Link>
          <span>/</span>
          <span>Approvals</span>
        </div>

        <section className="rounded-[2.25rem] border border-slate-200/80 bg-white/90 p-6 shadow-sm shadow-slate-950/[0.03] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <StatusBadge status="Phase 6B" tone="active" />
                <StatusBadge status={status} tone={status === "pending" ? "pending" : "neutral"} />
              </div>
              <h2 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">Approval governance queue</h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                Real pending approvals from the Phase 6A backend contract. The selected demo-mode governance role controls queue relevance and submit permissions, but server-side checks remain authoritative.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-80">
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Visible to role</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{summarizeCount(approvals.length, "item")}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Can decide</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{summarizeCount(decisionCount, "item")}</p>
              </Card>
            </div>
          </div>
        </section>

        <GovernanceRoleBanner role={role} context="approvals" />

        <Card>
          <CardHeader>
            <CardTitle>Queue filters</CardTitle>
            <CardDescription>Switch status scope for {governanceRoleLabel(role)}. Non-relevant approvals are omitted by the backend query.</CardDescription>
          </CardHeader>
          <div className="flex flex-wrap gap-2">
            {statuses.map((option) => (
              <Link
                key={option}
                href={href(option, role)}
                className={option === status
                  ? "inline-flex h-10 items-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
                  : "inline-flex h-10 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-white/20"}
              >
                {option}
              </Link>
            ))}
          </div>
        </Card>

        {approvals.length ? (
          <section className="grid gap-6">
            {approvals.map((approval) => <ApprovalCard key={approval.id} approval={approval} role={role} />)}
          </section>
        ) : (
          <EmptyState
            title="No approvals visible for this role and status"
            description="Try another demo-mode governance role or status. The Phase 6A query returns only owner, permitted, or review-relevant approvals."
          />
        )}
      </div>
    );
  } finally {
    await commandGrid.sql.end({ timeout: 1 });
  }
}
