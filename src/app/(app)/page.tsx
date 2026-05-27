import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { MetricCard } from "@/components/ui/metric-card";
import { SeverityPill } from "@/components/ui/severity-pill";
import { StatusBadge } from "@/components/ui/status-badge";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";

type ServiceRow = {
  service: string;
  owner: string;
  status: "degraded" | "healthy" | "active";
  p95: string;
  slo: string;
};

const serviceRows: ServiceRow[] = [
  { service: "Warehouse API", owner: "Platform Engineering", status: "degraded", p95: "1,840ms", slo: "450ms" },
  { service: "Order Router", owner: "Fulfillment Systems", status: "degraded", p95: "740ms", slo: "600ms" },
  { service: "Inventory Sync", owner: "Warehouse Systems", status: "healthy", p95: "180ms", slo: "900ms" },
  { service: "Carrier Gateway", owner: "Transportation", status: "healthy", p95: "240ms", slo: "800ms" }
];

const serviceColumns: Array<DataTableColumn<ServiceRow>> = [
  {
    key: "service",
    header: "Service",
    render: (row) => <span className="font-semibold text-slate-950 dark:text-white">{row.service}</span>
  },
  {
    key: "owner",
    header: "Owner",
    render: (row) => <span className="text-slate-600 dark:text-slate-300">{row.owner}</span>
  },
  {
    key: "status",
    header: "Status",
    render: (row) => <StatusBadge status={row.status} tone={row.status} />
  },
  {
    key: "p95",
    header: "P95",
    align: "right",
    render: (row) => <span className="font-semibold text-slate-900 dark:text-slate-100">{row.p95}</span>
  },
  {
    key: "slo",
    header: "SLO",
    align: "right",
    render: (row) => <span className="text-slate-500 dark:text-slate-400">{row.slo}</span>
  }
];

const timelineItems: TimelineItem[] = [
  {
    time: "13:17",
    title: "Warehouse API latency spike detected",
    description: "p95 routeAssignment.create latency crossed 1.8s in the midwest fulfillment cluster.",
    meta: <SeverityPill severity="sev2" />,
    tone: "amber"
  },
  {
    time: "13:21",
    title: "CommandGrid mapped order and revenue exposure",
    description: "312 delayed orders across six enterprise customers; $48,200 revenue at risk awaiting finance review.",
    tone: "blue"
  },
  {
    time: "13:28",
    title: "Support update prepared",
    description: "Customer-facing status copy drafted with citations from the incident communications playbook.",
    tone: "emerald"
  }
];

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2.25rem] border border-slate-200/80 bg-white/85 p-6 shadow-sm shadow-slate-950/[0.03] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.055] sm:p-8">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <SeverityPill severity="sev2" />
              <StatusBadge status="active incident" tone="active" />
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">Northstar Logistics</span>
            </div>
            <h2 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">Warehouse API latency spike</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
              CommandGrid is staging the incident command surface for Northstar Logistics: impact summary, role-aware response context, and reusable primitives for the next workflow phases.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
            <Button type="button" disabled>
              Command plan arrives Phase 4
            </Button>
            <Button type="button" variant="secondary" disabled>
              Runbook links arrive Phase 7
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Delayed orders" value="312" trend="+118 in 20m" detail="Warehouse confirmations slipping" tone="risk" icon="!" />
        <MetricCard label="Revenue at risk" value="$48,200" trend="Finance approval ready" detail="Credit matrix applies" tone="info" icon="$" />
        <MetricCard label="Customers impacted" value="6" trend="2 platinum" detail="Support updates every 30m" tone="success" icon="↗" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Service health</CardTitle>
              <CardDescription>Responsive data table primitive with typed rows and status badges.</CardDescription>
            </div>
            <StatusBadge status="live telemetry" tone="active" />
          </CardHeader>
          <DataTable columns={serviceColumns} rows={serviceRows} getRowKey={(row) => row.service} caption="Northstar service health" />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incident timeline</CardTitle>
            <CardDescription>Phase 4 can wire real timeline events into this component without reshaping the shell.</CardDescription>
          </CardHeader>
          <Timeline items={timelineItems} />
        </Card>
      </section>
    </div>
  );
}
