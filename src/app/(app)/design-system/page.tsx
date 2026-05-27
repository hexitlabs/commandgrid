import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/state-views";
import { MetricCard } from "@/components/ui/metric-card";
import { SeverityPill } from "@/components/ui/severity-pill";
import { StatusBadge } from "@/components/ui/status-badge";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";

type ApprovalRow = {
  request: string;
  owner: string;
  risk: "sev1" | "sev2" | "sev3";
  status: "pending" | "active" | "resolved";
};

const approvalRows: ApprovalRow[] = [
  { request: "Customer credit package", owner: "Finance Reviewer", risk: "sev2", status: "pending" },
  { request: "Regional buffer mode", owner: "Ops Manager", risk: "sev2", status: "active" },
  { request: "Support banner copy", owner: "Support Lead", risk: "sev3", status: "resolved" }
];

const approvalColumns: Array<DataTableColumn<ApprovalRow>> = [
  {
    key: "request",
    header: "Request",
    render: (row) => <span className="font-semibold text-slate-950 dark:text-white">{row.request}</span>
  },
  {
    key: "owner",
    header: "Owner",
    render: (row) => <span className="text-slate-600 dark:text-slate-300">{row.owner}</span>
  },
  {
    key: "risk",
    header: "Risk",
    render: (row) => <SeverityPill severity={row.risk} />
  },
  {
    key: "status",
    header: "Status",
    render: (row) => <StatusBadge status={row.status} tone={row.status} />
  }
];

const timelineItems: TimelineItem[] = [
  {
    time: "13:17",
    title: "Signal detected",
    description: "Latency anomaly grouped with delayed order evidence and supporting logs.",
    tone: "blue"
  },
  {
    time: "13:24",
    title: "Finance gate prepared",
    description: "$48,200 revenue exposure routed to the Finance Reviewer role for later approval workflows.",
    tone: "amber"
  },
  {
    time: "13:31",
    title: "Customer communication staged",
    description: "Support update composed with citations from incident communications playbook.",
    tone: "emerald"
  }
];

export default function DesignSystemPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2.25rem] border border-slate-200/80 bg-white/85 p-6 shadow-sm shadow-slate-950/[0.03] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.055] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-300">Phase 3 design system</p>
        <div className="mt-3 max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">Reusable CommandGrid primitives</h2>
          <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
            A lightweight showcase for the premium app shell, role-aware demo controls, light/dark theme, and enterprise UI pieces that future incident, workflow, governance, and copilot screens can reuse.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Metric card" value="312" trend="Delayed orders" detail="Northstar Logistics" tone="risk" icon="△" />
        <MetricCard label="Revenue exposure" value="$48,200" trend="Approval queued" detail="Finance review" tone="info" icon="$" />
        <MetricCard label="Status" value="SEV2" trend="Active response" detail="Warehouse API" tone="success" icon="✓" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Badges, pills, and buttons</CardTitle>
            <CardDescription>Compact indicators with restrained color and WCAG-conscious contrast.</CardDescription>
          </CardHeader>
          <div className="flex flex-wrap gap-3">
            <StatusBadge status="healthy" tone="healthy" />
            <StatusBadge status="degraded" tone="degraded" />
            <StatusBadge status="pending" tone="pending" />
            <StatusBadge status="resolved" tone="resolved" />
            <SeverityPill severity="sev1" />
            <SeverityPill severity="sev2" />
            <SeverityPill severity="sev3" />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button">Primary action</Button>
            <Button type="button" variant="secondary">Secondary</Button>
            <Button type="button" variant="ghost">Ghost</Button>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>Incident event rail ready for Phase 4 and audit-backed workflows.</CardDescription>
          </CardHeader>
          <Timeline items={timelineItems} />
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Data table wrapper</CardTitle>
          <CardDescription>Typed columns, responsive overflow, and table semantics for operational records.</CardDescription>
        </CardHeader>
        <DataTable columns={approvalColumns} rows={approvalRows} getRowKey={(row) => row.request} caption="Approval requests component sample" />
      </Card>

      <section className="grid gap-6 xl:grid-cols-3">
        <LoadingState title="Loading incident graph" description="Fetching agent evidence and service telemetry." />
        <EmptyState title="No governed actions yet" description="When CommandGrid proposes a high-risk remediation, approvals will appear here with owner, risk, and audit context." />
        <ErrorState title="Telemetry source unavailable" description="Warehouse API logs could not be refreshed. Existing evidence remains available for review." />
      </section>
    </div>
  );
}
