import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { MetricCard } from "@/components/ui/metric-card";
import { SeverityPill, type Severity } from "@/components/ui/severity-pill";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { openCommandGridDb } from "@/lib/db/server";
import { formatDateTime, formatInteger, formatMoney, minutesLabel, titleCase } from "@/modules/dashboard/formatters";
import { getIncidentDetail } from "@/modules/incidents/queries";
import type { IncidentAffectedCustomer, IncidentAffectedOrder, IncidentCitation, IncidentDetail } from "@/modules/incidents/types";
import { resolveRoleParam, resolveRoleView } from "@/modules/roles/route-role";

export const dynamic = "force-dynamic";

type IncidentDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type RoleHref = {
  pathname: string;
  query?: { role: string };
};

function roleHref(pathname: string, role: string): RoleHref {
  return { pathname, query: { role } };
}

function statusTone(status: string): StatusTone {
  if (["healthy", "resolved", "completed", "approved"].includes(status)) return "healthy";
  if (["degraded", "monitoring", "mitigated"].includes(status)) return "degraded";
  if (["pending", "pending-approval", "queued"].includes(status)) return "pending";
  if (["active", "running", "in-progress"].includes(status)) return "active";
  return "neutral";
}

function citationTone(sourceType: IncidentCitation["sourceType"]) {
  switch (sourceType) {
    case "log":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100";
    case "ticket":
      return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-100";
    case "runbook":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100";
    default:
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-100";
  }
}

function timelineTone(eventType: string): TimelineItem["tone"] {
  if (eventType.includes("detect") || eventType.includes("alert")) return "amber";
  if (eventType.includes("agent") || eventType.includes("analysis")) return "blue";
  if (eventType.includes("approve") || eventType.includes("mitig")) return "emerald";
  return "slate";
}


function RolePanel({ roleView }: { roleView: ReturnType<typeof resolveRoleView> }) {
  return (
    <Card className="border-blue-200/80 bg-blue-50/75 dark:border-blue-400/20 dark:bg-blue-400/10">
      <CardHeader>
        <CardTitle>{roleView.label} detail view</CardTitle>
        <CardDescription>{roleView.persona}</CardDescription>
      </CardHeader>
      <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">{roleView.emphasis}</p>
      <div className="mt-5 grid gap-2">
        {roleView.primaryActions.slice(0, 4).map((action) => (
          <Button key={action} type="button" variant="secondary" disabled className="justify-start">
            Preview: {action} · coming phase
          </Button>
        ))}
      </div>
    </Card>
  );
}

function Hero({ detail, role }: { detail: IncidentDetail; role: string }) {
  const { overview } = detail;

  return (
    <section className="overflow-hidden rounded-[2.25rem] border border-slate-200/80 bg-white/90 p-6 shadow-sm shadow-slate-950/[0.03] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] sm:p-8">
      <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-4xl">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <SeverityPill severity={overview.severity as Severity} />
            <StatusBadge status={overview.status} tone={statusTone(overview.status)} />
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">Warehouse API story</span>
          </div>
          <h2 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">{overview.title}</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">{overview.narrative}</p>
          <div className="mt-5 grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-3">
            <span><strong className="text-slate-950 dark:text-white">Commander:</strong> {overview.commander?.name ?? "Unassigned"}</span>
            <span><strong className="text-slate-950 dark:text-white">Started:</strong> {formatDateTime(overview.startedAt)}</span>
            <span><strong className="text-slate-950 dark:text-white">Detected:</strong> {formatDateTime(overview.detectedAt)}</span>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
          <Link href={roleHref("/incidents", role)} className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:border-white/20">
            Back to incident queue
          </Link>
          <Link href={{ pathname: "/copilot", query: { role, question: `What caused ${overview.title} and what evidence supports it?` } }} className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
            Ask Copilot about this incident
          </Link>
          <Link href={{ pathname: "/reports", query: { role, incidentId: overview.id } }} className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:border-white/20">
            Generate report
          </Link>
          <Button type="button" disabled>
            Preview: publish update · Phase 6
          </Button>
        </div>
      </div>
    </section>
  );
}

function ImpactCards({ detail }: { detail: IncidentDetail }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Revenue at risk" value={formatMoney(detail.businessImpact.revenueAtRiskCents)} trend="Finance approval preview" detail={detail.businessImpact.customerImpactSummary} tone="risk" icon="$" />
      <MetricCard label="Delayed orders" value={formatInteger(detail.businessImpact.totalDelayedOrders)} trend={`${minutesLabel(detail.businessImpact.maxDelayMinutes)} max delay`} detail="Warehouse confirmations slipping" tone="risk" icon="↗" />
      <MetricCard label="Affected customers" value={formatInteger(detail.businessImpact.affectedCustomers)} trend={`${detail.affectedCustomers.filter((customer) => customer.priority === "platinum").length} platinum`} detail="Support updates queued" tone="info" icon="◆" />
      <MetricCard label="Affected services" value={formatInteger(detail.businessImpact.affectedServices)} trend={detail.affectedServices.map((service) => service.name).join(", ") || "None"} detail="SLO evidence attached" tone="default" icon="◌" />
    </section>
  );
}

function TimelinePanel({ detail }: { detail: IncidentDetail }) {
  const items: TimelineItem[] = detail.timeline.map((event) => ({
    time: formatDateTime(event.occurredAt, { hour: "2-digit", minute: "2-digit" }),
    title: event.title,
    description: `${event.body}${event.actor ? ` — ${event.actor.name}` : ""}`,
    meta: <StatusBadge status={titleCase(event.eventType)} tone="neutral" />,
    tone: timelineTone(event.eventType)
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Incident timeline</CardTitle>
        <CardDescription>Chronological command history from incident timeline events.</CardDescription>
      </CardHeader>
      <Timeline items={items} />
    </Card>
  );
}

function ServicesPanel({ detail }: { detail: IncidentDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Affected services</CardTitle>
        <CardDescription>SLO and ownership context for the Warehouse API incident.</CardDescription>
      </CardHeader>
      <div className="space-y-3">
        {detail.affectedServices.map((service) => (
          <div key={service.id} className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-slate-950 dark:text-white">{service.name}</p>
              <StatusBadge status={service.status} tone={statusTone(service.status)} />
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{service.ownerTeam} · {service.tier} · SLO {service.sloTargetMs ? `${service.sloTargetMs}ms` : "not set"}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CustomersAndOrders({ detail }: { detail: IncidentDetail }) {
  const customerColumns: Array<DataTableColumn<IncidentAffectedCustomer>> = [
    { key: "customer", header: "Customer", render: (row) => <span className="font-semibold text-slate-950 dark:text-white">{row.name}</span> },
    { key: "priority", header: "Priority", render: (row) => <StatusBadge status={row.priority} tone={row.priority === "platinum" ? "pending" : "neutral"} /> },
    { key: "orders", header: "Orders", align: "right", render: (row) => <span className="font-semibold text-slate-900 dark:text-slate-100">{formatInteger(row.delayedOrders)}</span> },
    { key: "revenue", header: "Exposure", align: "right", render: (row) => <span className="font-semibold text-slate-900 dark:text-slate-100">{formatMoney(row.revenueAtRiskCents)}</span> }
  ];

  const orderColumns: Array<DataTableColumn<IncidentAffectedOrder>> = [
    { key: "order", header: "Order", render: (row) => <span className="font-semibold text-slate-950 dark:text-white">{row.orderNumber}</span> },
    { key: "customer", header: "Customer", render: (row) => <span className="text-slate-600 dark:text-slate-300">{row.customer.name}</span> },
    { key: "delay", header: "Delay", align: "right", render: (row) => <span className="font-semibold text-slate-900 dark:text-slate-100">{minutesLabel(row.delayedMinutes)}</span> },
    { key: "impact", header: "Impact", align: "right", render: (row) => <span className="font-semibold text-slate-900 dark:text-slate-100">{formatMoney(row.impactCents)}</span> }
  ];

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Affected customers</CardTitle>
          <CardDescription>Customer impact summary grouped from affected order data.</CardDescription>
        </CardHeader>
        <DataTable columns={customerColumns} rows={detail.affectedCustomers} getRowKey={(row) => row.id} caption="Affected customers" />
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Affected orders sample</CardTitle>
          <CardDescription>Highest-delay and highest-value order samples behind the 312 delayed order total.</CardDescription>
        </CardHeader>
        <DataTable columns={orderColumns} rows={detail.affectedOrders.slice(0, 8)} getRowKey={(row) => row.id} caption="Affected orders" />
      </Card>
    </div>
  );
}

function EvidencePanel({ detail }: { detail: IncidentDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evidence previews</CardTitle>
        <CardDescription>Logs, support tickets, docs, and runbooks normalized as citations.</CardDescription>
      </CardHeader>
      <div className="grid gap-3 md:grid-cols-2">
        {detail.citations.slice(0, 10).map((citation) => (
          <div key={citation.id} className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-[0.14em] ${citationTone(citation.sourceType)}`}>{citation.sourceType}</span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{citation.citationLabel}</span>
            </div>
            <p className="mt-3 font-semibold text-slate-950 dark:text-white">{citation.title}</p>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{citation.excerpt}</p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{citation.sourceName} · {formatDateTime(citation.observedAt)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AgentPanel({ detail }: { detail: IncidentDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent activity & recommendations</CardTitle>
        <CardDescription>Investigation runs and recommended actions. Execution remains preview-only for later phases.</CardDescription>
      </CardHeader>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-3">
          {detail.agentActivity.runs.map((run) => (
            <div key={run.id} className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-950 dark:text-white">{run.agentName}</p>
                <StatusBadge status={run.status} tone={statusTone(run.status)} />
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{run.objective}</p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{run.events.length} events · {run.outputSummary}</p>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {detail.agentActivity.recommendations.map((recommendation) => (
            <div key={recommendation.id} className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-950 dark:text-white">{recommendation.title}</p>
                <StatusBadge status={recommendation.status} tone={statusTone(recommendation.status)} />
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{recommendation.body}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{Math.round(recommendation.confidence * 100)}% confidence · cites {recommendation.citationLabels.join(", ") || "seeded evidence"}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function ApprovalReportAuditPanel({ detail, role }: { detail: IncidentDetail; role: string }) {
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Approval / decision trail</CardTitle>
          <CardDescription>Governed decisions link into the Phase 6 approval queue. Server-side permission checks remain authoritative.</CardDescription>
        </CardHeader>
        <div className="space-y-3">
          {detail.approvals.map((approval) => (
            <div key={approval.id} className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-950 dark:text-white">{approval.title}</p>
                <StatusBadge status={approval.status} tone={statusTone(approval.status)} />
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{approval.description}</p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{approval.assignedRole?.name ?? "Unassigned"} · {approval.riskLevel} risk · due {formatDateTime(approval.dueAt)}</p>
              {approval.decisions[0] ? <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-200">Decision: {titleCase(approval.decisions[0].decision)} — {approval.decisions[0].rationale}</p> : null}
              <Link href={roleHref(`/approvals/${approval.id}`, role)} className="mt-3 inline-flex text-xs font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-200">Open approval detail →</Link>
            </div>
          ))}
          <Link href={roleHref("/approvals", role)} className="inline-flex text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-200">Open approval queue →</Link>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Report previews</CardTitle>
          <CardDescription>Generated report artifacts available for audit and executive review.</CardDescription>
        </CardHeader>
        <div className="space-y-3">
          {detail.reports.map((report) => (
            <div key={report.id} className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-950 dark:text-white">{report.title}</p>
                <StatusBadge status={report.status} tone={statusTone(report.status)} />
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{report.summary}</p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{titleCase(report.reportType)} · generated {formatDateTime(report.generatedAt)}</p>
              <Link href={{ pathname: `/reports/${report.id}`, query: { role } }} className="mt-3 inline-flex text-xs font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-200">Open report detail →</Link>
            </div>
          ))}
          <Link href={{ pathname: "/reports", query: { role, incidentId: detail.overview.id } }} className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:border-white/20">Generate Phase 7 report →</Link>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit trail</CardTitle>
          <CardDescription>Recent governance trail for linked incident actions with full audit filtering.</CardDescription>
        </CardHeader>
        <div className="space-y-3">
          {detail.auditTrail.slice(0, 6).map((audit) => (
            <div key={audit.id} className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="font-semibold text-slate-950 dark:text-white">{titleCase(audit.action)}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{titleCase(audit.targetType)} · {audit.actor?.name ?? "System"}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDateTime(audit.occurredAt)}</p>
            </div>
          ))}
          <Link href={{ pathname: "/audit", query: { role, incidentId: detail.overview.id } }} className="inline-flex text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-200">Open full incident audit trail →</Link>
        </div>
      </Card>
    </div>
  );
}

export default async function IncidentDetailPage({ params, searchParams }: IncidentDetailPageProps) {
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const role = resolveRoleParam(resolvedSearchParams?.role);
  const roleView = resolveRoleView(resolvedSearchParams?.role);
  const commandGrid = await openCommandGridDb();

  try {
    const detail = await getIncidentDetail(commandGrid.db, id, { role });

    if (!detail) {
      notFound();
    }

    const emphasized = roleView.role === "engineer";
    const executive = roleView.role === "executive" || roleView.role === "finance-reviewer";
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Link href={roleHref("/dashboard", role)} className="font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-200">Dashboard</Link>
          <span>/</span>
          <Link href={roleHref("/incidents", role)} className="font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-200">Incidents</Link>
          <span>/</span>
          <span>{detail.overview.slug}</span>
        </div>

        <Hero detail={detail} role={role} />
        <ImpactCards detail={detail} />

        <section className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
          <RolePanel roleView={roleView} />
          {executive ? <CustomersAndOrders detail={{ ...detail, affectedOrders: detail.affectedOrders.slice(0, 5) }} /> : <TimelinePanel detail={detail} />}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          {emphasized ? <EvidencePanel detail={detail} /> : <TimelinePanel detail={detail} />}
          <ServicesPanel detail={detail} />
        </section>

        {!executive ? <CustomersAndOrders detail={detail} /> : null}
        {!emphasized ? <EvidencePanel detail={detail} /> : null}
        <AgentPanel detail={detail} />
        <ApprovalReportAuditPanel detail={detail} role={role} />
      </div>
    );
  } finally {
    await commandGrid.sql.end({ timeout: 1 });
  }
}
