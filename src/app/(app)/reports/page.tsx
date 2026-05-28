import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { ReportsConsole } from "@/modules/reports/components/reports-console";
import { resolveRoleParam } from "@/modules/roles/route-role";

export const dynamic = "force-dynamic";

type ReportsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const resolvedSearchParams = await searchParams;
  const role = resolveRoleParam(resolvedSearchParams?.role);
  const initialIncidentId = first(resolvedSearchParams?.incidentId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link href={{ pathname: "/dashboard", query: { role } }} className="font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-200">Dashboard</Link>
        <span>/</span>
        <span>Reports</span>
      </div>

      <section className="rounded-[2.25rem] border border-slate-200/80 bg-white/90 p-6 shadow-sm shadow-slate-950/[0.03] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] sm:p-8">
        <div className="max-w-4xl">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <StatusBadge status="Phase 7B" tone="active" />
            <StatusBadge status="Live API" tone="healthy" />
            <StatusBadge status="Safe markdown" tone="pending" />
          </div>
          <h2 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">Reports</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
            Browse seeded and generated report artifacts, generate authorized postmortem/executive/customer-impact reports, and inspect safely rendered markdown with citation metadata.
          </p>
        </div>
      </section>

      <ReportsConsole role={role} initialIncidentId={initialIncidentId} />
    </div>
  );
}
