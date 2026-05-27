import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { openCommandGridDb } from "@/lib/db/server";
import { queryAuditLogs } from "@/modules/audit/queries";
import { AuditFilterForm } from "@/modules/audit/components/audit-filter-form";
import { AuditLogList } from "@/modules/audit/components/audit-log-list";
import { GovernanceRoleBanner } from "@/modules/governance/components/governance-role-banner";
import { summarizeCount } from "@/modules/governance/display";
import { parseDemoRole } from "@/modules/permissions/governance";
import { resolveRoleParam } from "@/modules/roles/route-role";

export const dynamic = "force-dynamic";

type AuditPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function clean(value: string | string[] | undefined) {
  const candidate = first(value)?.trim();
  return candidate ? candidate : undefined;
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const resolvedSearchParams = await searchParams;
  const role = resolveRoleParam(resolvedSearchParams?.role);
  const filters = {
    actorUserId: clean(resolvedSearchParams?.actorUserId),
    actorRole: parseDemoRole(clean(resolvedSearchParams?.actorRole)) ?? undefined,
    action: clean(resolvedSearchParams?.action),
    actionType: clean(resolvedSearchParams?.actionType),
    incidentId: clean(resolvedSearchParams?.incidentId),
    targetType: clean(resolvedSearchParams?.targetType),
    targetId: clean(resolvedSearchParams?.targetId),
    status: clean(resolvedSearchParams?.status),
    outcome: clean(resolvedSearchParams?.outcome),
    search: clean(resolvedSearchParams?.search),
    limit: Number(clean(resolvedSearchParams?.limit) ?? 50)
  };
  const commandGrid = await openCommandGridDb();

  try {
    const result = await queryAuditLogs(commandGrid.db, filters);
    const approvalEvents = result.logs.filter((log) => log.targetType === "approval" || log.action.startsWith("approval.")).length;
    const incidentLinks = result.logs.filter((log) => Boolean(log.incidentId)).length;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Link href={{ pathname: "/dashboard", query: { role } }} className="font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-200">Dashboard</Link>
          <span>/</span>
          <span>Audit</span>
        </div>

        <section className="rounded-[2.25rem] border border-slate-200/80 bg-white/90 p-6 shadow-sm shadow-slate-950/[0.03] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <StatusBadge status="Phase 6B" tone="active" />
                <StatusBadge status="Append-only summaries" tone="healthy" />
              </div>
              <h2 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">Governance audit log</h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                Browse sanitized audit records for approval decisions, workflow actions, incident updates, and generated evidence. Filters map to the Phase 6A audit contract.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[34rem]">
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Records</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{summarizeCount(result.logs.length, "log")}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Approvals</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{summarizeCount(approvalEvents, "event")}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Incident linked</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{summarizeCount(incidentLinks, "log")}</p>
              </Card>
            </div>
          </div>
        </section>

        <GovernanceRoleBanner role={role} context="audit" />
        <AuditFilterForm role={role} filters={{
          actorUserId: filters.actorUserId,
          actorRole: filters.actorRole,
          action: filters.action,
          actionType: filters.actionType,
          incidentId: filters.incidentId,
          targetType: filters.targetType,
          targetId: filters.targetId,
          status: filters.status,
          outcome: filters.outcome,
          search: filters.search
        }} />
        <AuditLogList logs={result.logs} role={role} />
      </div>
    );
  } finally {
    await commandGrid.sql.end({ timeout: 1 });
  }
}
