import Link from "next/link";
import { IncidentTrendChart } from "@/components/charts/incident-trend-chart";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/state-views";
import { MetricCard } from "@/components/ui/metric-card";
import { SeverityPill, type Severity } from "@/components/ui/severity-pill";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { openCommandGridDb } from "@/lib/db/server";
import { getDashboardOverview } from "@/modules/dashboard/queries";
import { formatDateTime, formatInteger, formatMoney, formatPercent, minutesLabel, titleCase } from "@/modules/dashboard/formatters";
import { resolveRoleParam, resolveRoleView } from "@/modules/roles/route-role";
import type { DashboardOverview } from "@/modules/dashboard/types";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type BreachedService = DashboardOverview["slaAvailability"]["breachedServices"][number];


type RoleHref = {
  pathname: string;
  query?: { role: string };
};

function roleHref(pathname: string, role: string): RoleHref {
  return { pathname, query: { role } };
}

type DashboardMetric = {
  key: string;
  label: string;
  value: string;
  trend: string;
  detail: string;
  tone: "default" | "risk" | "success" | "info";
  icon: string;
};

const sectionCopy: Record<string, string> = {
  operationalHealth: "Health",
  incidents: "Incidents",
  revenueAtRisk: "Revenue",
  delayedOrders: "Orders",
  slaAvailability: "SLA",
  supportSignal: "Support",
  agentActivity: "AI agents",
  approvals: "Approvals",
  incidentTrend: "Trend",
  evidence: "Evidence",
  audit: "Audit"
};

function statusTone(status: string): StatusTone {
  if (["healthy", "resolved", "completed", "approved"].includes(status)) return "healthy";
  if (["degraded", "monitoring"].includes(status)) return "degraded";
  if (["pending", "pending-approval", "queued"].includes(status)) return "pending";
  if (["active", "running", "in-progress"].includes(status)) return "active";
  return "neutral";
}

function buildMetrics(overview: DashboardOverview): DashboardMetric[] {
  return [
    {
      key: "operationalHealth",
      label: "Operational health",
      value: `${overview.operationalHealth.score}/100`,
      trend: titleCase(overview.operationalHealth.level),
      detail: `${overview.operationalHealth.degradedServices}/${overview.operationalHealth.totalServices} services degraded`,
      tone: overview.operationalHealth.level === "healthy" ? "success" : "risk",
      icon: "◌"
    },
    {
      key: "incidents",
      label: "Active incidents",
      value: formatInteger(overview.incidents.active),
      trend: `${overview.incidents.sev1Active} SEV1 active`,
      detail: `${overview.incidents.resolved} resolved in seeded history`,
      tone: overview.incidents.active > 0 ? "risk" : "success",
      icon: "!"
    },
    {
      key: "revenueAtRisk",
      label: "Revenue at risk",
      value: formatMoney(overview.revenueAtRisk.cents),
      trend: `${overview.revenueAtRisk.activeIncidentCount} active incident`,
      detail: "Finance review surface ready",
      tone: overview.revenueAtRisk.cents > 0 ? "risk" : "success",
      icon: "$"
    },
    {
      key: "delayedOrders",
      label: "Delayed orders",
      value: formatInteger(overview.delayedOrders.count),
      trend: `${minutesLabel(Math.round(overview.delayedOrders.averageDelayMinutes))} avg sample delay`,
      detail: `${overview.delayedOrders.delayedOrderSampleCount} sampled affected orders`,
      tone: overview.delayedOrders.count > 0 ? "risk" : "success",
      icon: "↗"
    },
    {
      key: "slaAvailability",
      label: "SLA / availability",
      value: formatPercent(overview.slaAvailability.availabilityPercent),
      trend: `${overview.slaAvailability.degradedTier0Services} tier-0 degraded`,
      detail: overview.slaAvailability.summary,
      tone: overview.slaAvailability.degradedTier0Services > 0 ? "risk" : "success",
      icon: "%"
    },
    {
      key: "supportSignal",
      label: "Support signal",
      value: formatInteger(overview.supportSignal.openTickets),
      trend: titleCase(overview.supportSignal.sentiment),
      detail: `${overview.supportSignal.urgentTickets} urgent · ${overview.supportSignal.affectedCustomers} customers`,
      tone: overview.supportSignal.sentiment === "negative" ? "risk" : "info",
      icon: "✉"
    },
    {
      key: "agentActivity",
      label: "AI actions",
      value: formatInteger(overview.agentActivity.totalRuns),
      trend: `${overview.agentActivity.runningRuns} running`,
      detail: `${overview.agentActivity.recommendations.pendingApproval} recommendations need approval`,
      tone: overview.agentActivity.runningRuns > 0 ? "info" : "default",
      icon: "✦"
    },
    {
      key: "approvals",
      label: "Pending approvals",
      value: formatInteger(overview.approvals.pending),
      trend: `${overview.approvals.highRiskPending} high risk`,
      detail: `${overview.approvals.approved} already approved`,
      tone: overview.approvals.highRiskPending > 0 ? "risk" : "info",
      icon: "✓"
    }
  ];
}

function orderedMetrics(metrics: DashboardMetric[], priority: string[]) {
  const priorityIndex = new Map(priority.map((key, index) => [key, index]));
  return [...metrics].sort((a, b) => (priorityIndex.get(a.key) ?? 99) - (priorityIndex.get(b.key) ?? 99));
}

function RoleEmphasis({ roleView }: { roleView: ReturnType<typeof resolveRoleView> }) {
  return (
    <Card className="border-blue-200/80 bg-blue-50/75 dark:border-blue-400/20 dark:bg-blue-400/10">
      <CardHeader>
        <CardTitle>{roleView.label} emphasis</CardTitle>
        <CardDescription>{roleView.persona}</CardDescription>
      </CardHeader>
      <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">{roleView.emphasis}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {roleView.dashboardPriority.slice(0, 5).map((section) => (
          <span key={section} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm dark:bg-white/10 dark:text-blue-100">
            {sectionCopy[section] ?? section}
          </span>
        ))}
      </div>
      <div className="mt-5 grid gap-2">
        {roleView.primaryActions.slice(0, 3).map((action) => (
          <Button key={action} type="button" variant="secondary" disabled className="justify-start">
            Preview: {action} · coming Phase 5/6
          </Button>
        ))}
      </div>
    </Card>
  );
}

function FlagshipIncident({ overview, role }: { overview: DashboardOverview; role: string }) {
  const incident = overview.flagshipIncident;

  if (!incident) {
    return <EmptyState title="No active flagship incident" description="The dashboard is ready, but seeded active incidents are not available in the current database." />;
  }

  return (
    <section className="overflow-hidden rounded-[2.25rem] border border-slate-200/80 bg-white/90 p-6 shadow-sm shadow-slate-950/[0.03] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] sm:p-8">
      <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-4xl">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <SeverityPill severity={incident.severity as Severity} />
            <StatusBadge status={incident.status} tone={statusTone(incident.status)} />
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">{overview.organization.name}</span>
          </div>
          <h2 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">{incident.title}</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">{incident.summary}</p>
          <div className="mt-5 grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-3">
            <span><strong className="text-slate-950 dark:text-white">Commander:</strong> {incident.commanderName ?? "Unassigned"}</span>
            <span><strong className="text-slate-950 dark:text-white">Detected:</strong> {formatDateTime(incident.detectedAt)}</span>
            <span><strong className="text-slate-950 dark:text-white">Impact:</strong> {incident.customerImpactSummary}</span>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
          <Link href={roleHref(`/incidents/${incident.slug}`, role)} className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
            Open incident command view
          </Link>
          <Button type="button" variant="secondary" disabled>
            Preview: generate exec brief · Phase 7
          </Button>
        </div>
      </div>
    </section>
  );
}

function ServiceRiskTable({ services }: { services: BreachedService[] }) {
  const columns: Array<DataTableColumn<BreachedService>> = [
    {
      key: "service",
      header: "Service",
      render: (row) => <span className="font-semibold text-slate-950 dark:text-white">{row.serviceName}</span>
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} tone={statusTone(row.status)} />
    },
    {
      key: "p95",
      header: "P95",
      align: "right",
      render: (row) => <span className="font-semibold text-slate-900 dark:text-slate-100">{row.currentP95Ms ? `${row.currentP95Ms}ms` : "—"}</span>
    },
    {
      key: "slo",
      header: "SLO",
      align: "right",
      render: (row) => <span className="text-slate-500 dark:text-slate-400">{row.sloTargetMs ? `${row.sloTargetMs}ms` : "—"}</span>
    }
  ];

  return (
    <Card>
      <CardHeader className="sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>SLA / availability watch</CardTitle>
          <CardDescription>{services.length ? "Active service impacts linked to seeded incident data." : "No breached services in the current view."}</CardDescription>
        </div>
        <StatusBadge status={`${services.length} breached`} tone={services.length ? "degraded" : "healthy"} />
      </CardHeader>
      {services.length ? <DataTable columns={columns} rows={services} getRowKey={(row) => row.serviceId} caption="Breached services" /> : <EmptyState title="No active SLO breach" description="Service availability is healthy for this workspace." />}
    </Card>
  );
}

function ActivityAndApprovals({ overview, role }: { overview: DashboardOverview; role: string }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>AI actions / agent activity</CardTitle>
          <CardDescription>Recent DB-backed investigation and recommendation activity.</CardDescription>
        </CardHeader>
        <div className="space-y-3">
          {overview.agentActivity.recentRuns.map((run) => (
            <div key={run.id} className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-950 dark:text-white">{run.agentName}</p>
                <StatusBadge status={run.status} tone={statusTone(run.status)} />
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{run.objective}</p>
              <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{formatDateTime(run.startedAt)} · {run.outputSummary}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending approvals</CardTitle>
          <CardDescription>Decision previews only. Approval execution arrives in Phase 6.</CardDescription>
        </CardHeader>
        <div className="space-y-3">
          {overview.approvals.dueSoon.map((approval) => (
            <div key={approval.id} className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-950 dark:text-white">{approval.title}</p>
                <StatusBadge status={approval.riskLevel} tone={approval.riskLevel === "high" ? "pending" : "neutral"} />
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Assigned to {approval.assignedRole ?? "unassigned role"} · due {formatDateTime(approval.dueAt)}</p>
              {approval.incidentSlug ? <Link href={roleHref(`/incidents/${approval.incidentSlug}`, role)} className="mt-3 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-200">Open linked incident →</Link> : null}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = await searchParams;
  const role = resolveRoleParam(resolvedSearchParams?.role);
  const roleView = resolveRoleView(resolvedSearchParams?.role);
  const commandGrid = await openCommandGridDb();

  try {
    const overview = await getDashboardOverview(commandGrid.db, { role });
    const metrics = orderedMetrics(buildMetrics(overview), roleView.dashboardPriority);

    return (
      <div className="space-y-6">
        <FlagshipIncident overview={overview} role={role} />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.key} label={metric.label} value={metric.value} trend={metric.trend} detail={metric.detail} tone={metric.tone} icon={metric.icon} />
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
          <RoleEmphasis roleView={roleView} />
          <IncidentTrendChart points={overview.incidentTrend} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <ServiceRiskTable services={overview.slaAvailability.breachedServices} />
          <Card>
            <CardHeader>
              <CardTitle>Support signal</CardTitle>
              <CardDescription>{overview.supportSignal.summary}</CardDescription>
            </CardHeader>
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              <MetricCard label="Open tickets" value={formatInteger(overview.supportSignal.openTickets)} trend={`${overview.supportSignal.highPriorityTickets} high priority`} tone="info" />
              <MetricCard label="Urgent tickets" value={formatInteger(overview.supportSignal.urgentTickets)} trend="Customer comms watch" tone={overview.supportSignal.urgentTickets ? "risk" : "success"} />
              <MetricCard label="Customers" value={formatInteger(overview.supportSignal.affectedCustomers)} trend="Affected accounts" tone="default" />
            </div>
          </Card>
        </section>

        <ActivityAndApprovals overview={overview} role={role} />
      </div>
    );
  } finally {
    await commandGrid.sql.end({ timeout: 1 });
  }
}
