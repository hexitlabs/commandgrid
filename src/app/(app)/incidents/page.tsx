import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/state-views";
import { MetricCard } from "@/components/ui/metric-card";
import { SeverityPill, type Severity } from "@/components/ui/severity-pill";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { openCommandGridDb } from "@/lib/db/server";
import { formatDateTime, formatInteger, formatMoney, titleCase } from "@/modules/dashboard/formatters";
import { INCIDENT_SEVERITIES, INCIDENT_STATUSES, type IncidentListFilters, type IncidentSortKey } from "@/modules/incidents/types";
import { getIncidentList } from "@/modules/incidents/queries";
import { resolveRoleParam, resolveRoleView } from "@/modules/roles/route-role";

export const dynamic = "force-dynamic";

type IncidentsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type RoleHref = {
  pathname: string;
  query?: { role: string };
};

function roleHref(pathname: string, role: string): RoleHref {
  return { pathname, query: { role } };
}

const sortOptions: Array<{ value: IncidentSortKey; label: string }> = [
  { value: "startedAt", label: "Started" },
  { value: "detectedAt", label: "Detected" },
  { value: "severity", label: "Severity" },
  { value: "status", label: "Status" },
  { value: "revenueAtRisk", label: "Revenue risk" },
  { value: "delayedOrders", label: "Delayed orders" }
];

function statusTone(status: string): StatusTone {
  if (status === "resolved") return "resolved";
  if (status === "monitoring" || status === "mitigated") return "degraded";
  if (status === "active") return "active";
  return "neutral";
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildHref(searchParams: Record<string, string | string[] | undefined> | undefined, key: string, value: string | null) {
  const params = new URLSearchParams();

  for (const [paramKey, paramValue] of Object.entries(searchParams ?? {})) {
    if (!paramValue || paramKey === key) continue;
    if (Array.isArray(paramValue)) {
      for (const item of paramValue) params.append(paramKey, item);
    } else {
      params.set(paramKey, paramValue);
    }
  }

  if (value) {
    params.set(key, value);
  }

  const query = params.toString();
  return `/incidents${query ? `?${query}` : ""}`;
}

function FilterPill({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white shadow-sm dark:bg-white dark:text-slate-950"
          : "rounded-full border border-slate-200 bg-white/75 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:border-white/20 dark:hover:text-white"
      }
    >
      {label}
    </Link>
  );
}

export default async function IncidentsPage({ searchParams }: IncidentsPageProps) {
  const resolvedSearchParams = await searchParams;
  const status = firstParam(resolvedSearchParams?.status);
  const severity = firstParam(resolvedSearchParams?.severity);
  const sortBy = firstParam(resolvedSearchParams?.sortBy) as IncidentSortKey | undefined;
  const sortDirection = firstParam(resolvedSearchParams?.sortDirection) === "asc" ? "asc" : "desc";
  const role = resolveRoleParam(resolvedSearchParams?.role);
  const roleView = resolveRoleView(resolvedSearchParams?.role);
  const commandGrid = await openCommandGridDb();

  const filters: IncidentListFilters = {
    status,
    severity,
    sortBy,
    sortDirection,
    limit: 50
  };

  try {
    const list = await getIncidentList(commandGrid.db, filters);

    return (
      <div className="space-y-6">
        <section className="rounded-[2.25rem] border border-slate-200/80 bg-white/90 p-6 shadow-sm shadow-slate-950/[0.03] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-300">Incident management</p>
              <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">Incident queue</h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
                Seeded Northstar incidents with real Phase 4A filters, sorting, impact summaries, and role-aware emphasis for {roleView.label.toLowerCase()} review.
              </p>
            </div>
            <div className="rounded-3xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-900 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-100 xl:max-w-md">
              <p className="font-semibold">{roleView.label} focus</p>
              <p className="mt-1 leading-6">{roleView.emphasis}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Incidents shown" value={formatInteger(list.summary.total)} trend={`${formatInteger(list.summary.active)} active`} detail={`${formatInteger(list.summary.resolved)} resolved`} tone={list.summary.active ? "risk" : "success"} />
          <MetricCard label="Revenue at risk" value={formatMoney(list.summary.revenueAtRiskCents)} trend="Filtered exposure" detail="From real incident rows" tone={list.summary.revenueAtRiskCents ? "risk" : "success"} />
          <MetricCard label="Delayed orders" value={formatInteger(list.summary.delayedOrders)} trend="Filtered total" detail="Across current list" tone={list.summary.delayedOrders ? "risk" : "success"} />
          <MetricCard label="Sort" value={sortOptions.find((option) => option.value === list.filters.sortBy)?.label ?? titleCase(list.filters.sortBy)} trend={list.filters.sortDirection.toUpperCase()} detail="Shareable URL state" tone="info" />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Filters and sorting</CardTitle>
            <CardDescription>Server-rendered filters use the Phase 4A incident list contract.</CardDescription>
          </CardHeader>
          <div className="grid gap-5 xl:grid-cols-3">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Status</p>
              <div className="flex flex-wrap gap-2">
                <FilterPill href={buildHref(resolvedSearchParams, "status", null)} label="All" active={!status} />
                {INCIDENT_STATUSES.map((item) => (
                  <FilterPill key={item} href={buildHref(resolvedSearchParams, "status", item)} label={titleCase(item)} active={status === item} />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Severity</p>
              <div className="flex flex-wrap gap-2">
                <FilterPill href={buildHref(resolvedSearchParams, "severity", null)} label="All" active={!severity} />
                {INCIDENT_SEVERITIES.map((item) => (
                  <FilterPill key={item} href={buildHref(resolvedSearchParams, "severity", item)} label={item.toUpperCase()} active={severity === item} />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Sort</p>
              <div className="flex flex-wrap gap-2">
                {sortOptions.map((option) => (
                  <FilterPill key={option.value} href={buildHref(resolvedSearchParams, "sortBy", option.value)} label={option.label} active={list.filters.sortBy === option.value} />
                ))}
                <FilterPill href={buildHref(resolvedSearchParams, "sortDirection", list.filters.sortDirection === "asc" ? "desc" : "asc")} label={list.filters.sortDirection === "asc" ? "Asc ↑" : "Desc ↓"} active />
              </div>
            </div>
          </div>
        </Card>

        {list.incidents.length ? (
          <section className="grid gap-4">
            {list.incidents.map((incident) => (
              <Link
                key={incident.id}
                href={roleHref(`/incidents/${incident.slug}`, role)}
                className="group rounded-[2rem] border border-slate-200/80 bg-white/85 p-5 shadow-sm shadow-slate-950/[0.03] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-950/[0.05] dark:border-white/10 dark:bg-white/[0.055] dark:hover:border-blue-300/30"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <SeverityPill severity={incident.severity as Severity} />
                      <StatusBadge status={incident.status} tone={statusTone(incident.status)} />
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Detected {formatDateTime(incident.detectedAt)}</span>
                    </div>
                    <h3 className="text-xl font-semibold tracking-tight text-slate-950 group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-200">{incident.title}</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{incident.summary}</p>
                    <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">{incident.customerImpactSummary}</p>
                  </div>
                  <div className="grid min-w-[18rem] gap-3 sm:grid-cols-3 xl:grid-cols-2">
                    <Impact label="Revenue" value={formatMoney(incident.revenueAtRiskCents)} />
                    <Impact label="Orders" value={formatInteger(incident.delayedOrders)} />
                    <Impact label="Customers" value={formatInteger(incident.affectedCustomers)} />
                    <Impact label="Services" value={formatInteger(incident.affectedServices)} />
                    <Impact label="Tickets" value={formatInteger(incident.supportTickets)} />
                    <Impact label="Approvals" value={formatInteger(incident.pendingApprovals)} />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm dark:border-white/10">
                  <span className="text-slate-500 dark:text-slate-400">Commander: <strong className="font-semibold text-slate-800 dark:text-slate-100">{incident.commanderName ?? "Unassigned"}</strong></span>
                  <span className="font-semibold text-blue-700 dark:text-blue-200">Open detail →</span>
                </div>
              </Link>
            ))}
          </section>
        ) : (
          <EmptyState title="No incidents match these filters" description="Try clearing status or severity filters to view the seeded Northstar incident history." />
        )}
      </div>
    );
  } finally {
    await commandGrid.sql.end({ timeout: 1 });
  }
}

function Impact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/[0.035]">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}
