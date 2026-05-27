import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { openCommandGridDb } from "@/lib/db/server";
import { getApprovalDetail } from "@/modules/approvals/queries";
import { ApprovalDetailView } from "@/modules/approvals/components/approval-detail";
import { GovernanceRoleBanner } from "@/modules/governance/components/governance-role-banner";
import { governanceStatusTone, humanizeGovernanceValue } from "@/modules/governance/display";
import { resolveRoleParam } from "@/modules/roles/route-role";

export const dynamic = "force-dynamic";

type ApprovalDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ApprovalDetailPage({ params, searchParams }: ApprovalDetailPageProps) {
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const role = resolveRoleParam(resolvedSearchParams?.role);
  const commandGrid = await openCommandGridDb();

  try {
    const approval = await getApprovalDetail(commandGrid.db, id, { role });
    if (!approval) {
      notFound();
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Link href={{ pathname: "/dashboard", query: { role } }} className="font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-200">Dashboard</Link>
          <span>/</span>
          <Link href={{ pathname: "/approvals", query: { role } }} className="font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-200">Approvals</Link>
          <span>/</span>
          <span>{approval.id}</span>
        </div>

        <section className="rounded-[2.25rem] border border-slate-200/80 bg-white/90 p-6 shadow-sm shadow-slate-950/[0.03] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] sm:p-8">
          <div className="max-w-4xl">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <StatusBadge status={approval.status} tone={governanceStatusTone(approval.status)} />
              <StatusBadge status={humanizeGovernanceValue(approval.governance.actionType)} tone="neutral" />
              <StatusBadge status={`${approval.governance.riskLevel} risk`} tone="pending" />
            </div>
            <h2 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">{approval.title}</h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">{approval.description}</p>
          </div>
        </section>

        <GovernanceRoleBanner role={role} context="approvals" />
        <ApprovalDetailView approval={approval} role={role} />
      </div>
    );
  } finally {
    await commandGrid.sql.end({ timeout: 1 });
  }
}
