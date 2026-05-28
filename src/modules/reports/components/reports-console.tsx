"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/state-views";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { getRoleViewRule, type DemoRoleSlug } from "@/modules/roles/view-rules";
import type { GeneratedReport, ReportListItem, ReportType } from "@/modules/reports/types";
import { REPORT_TYPES } from "@/modules/reports/types";
import { ReportMarkdown } from "./report-markdown";

type ReportCapability = { canGenerate: boolean };

type ReportListResponse = {
  ok: true;
  organizationId: string;
  role: DemoRoleSlug;
  capabilities: Record<ReportType, ReportCapability>;
  reports: ReportListItem[];
};

type GenerateReportResponse = { ok: true; role: DemoRoleSlug; report: GeneratedReport } | { ok: false; error: string; role?: string; reportType?: string };

type ReportsConsoleProps = {
  role: DemoRoleSlug;
  initialIncidentId?: string;
};

const reportTypeLabels: Record<ReportType, string> = {
  postmortem: "Incident postmortem",
  "executive-summary": "Executive summary",
  "customer-impact": "Customer impact"
};

const reportTypeDescriptions: Record<ReportType, string> = {
  postmortem: "Timeline, root cause, decisions, customer comms, and follow-up owners.",
  "executive-summary": "Board-ready business impact, mitigation path, and governance watchpoints.",
  "customer-impact": "Priority customer exposure, communication plan, and credit/SLA guardrails."
};

const actorByRole: Partial<Record<DemoRoleSlug, string>> = {
  executive: "user_maya_chen",
  "ops-manager": "user_diego_alvarez",
  engineer: "user_priya_natarajan",
  "support-lead": "user_jordan_ellis",
  "finance-reviewer": "user_leah_brooks",
  admin: "user_alex_morgan"
};

function titleCase(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusTone(status: string): StatusTone {
  if (["draft", "generated", "complete"].includes(status)) return "healthy";
  if (["deferred", "pending"].includes(status)) return "pending";
  return "neutral";
}

function metadataStringArray(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function reportMarkdown(report: ReportListItem | GeneratedReport) {
  if ("markdown" in report && report.markdown) return report.markdown;
  const metadata = "metadata" in report ? report.metadata : {};
  const markdown = metadata.markdown;
  return typeof markdown === "string" && markdown.trim() ? markdown : report.summary;
}

function ReportTypeCapabilityCard({ type, capability, selected, onSelect }: { type: ReportType; capability?: ReportCapability; selected: boolean; onSelect: () => void }) {
  const canGenerate = Boolean(capability?.canGenerate);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-blue-500/15",
        selected
          ? "border-blue-300 bg-blue-50 shadow-sm dark:border-blue-400/30 dark:bg-blue-400/10"
          : "border-slate-200 bg-white/75 dark:border-white/10 dark:bg-white/[0.04]"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-slate-950 dark:text-white">{reportTypeLabels[type]}</p>
        <StatusBadge status={canGenerate ? "Can generate" : "Read-only"} tone={canGenerate ? "healthy" : "neutral"} />
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{reportTypeDescriptions[type]}</p>
    </button>
  );
}

function ReportListCard({ report, role }: { report: ReportListItem; role: DemoRoleSlug }) {
  const labels = metadataStringArray(report.metadata, "citationLabels");
  const citationCount = typeof report.metadata.citationCount === "number" ? report.metadata.citationCount : labels.length;
  const markdownAvailable = typeof report.metadata.markdown === "string" && report.metadata.markdown.trim().length > 0;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white/75 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={report.status} tone={statusTone(report.status)} />
            <StatusBadge status={titleCase(report.reportType)} tone="active" />
            {markdownAvailable ? <StatusBadge status="Body stored" tone="healthy" /> : null}
          </div>
          <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">{report.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{report.summary}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Generated {formatDateTime(report.generatedAt)}</span>
            {report.incidentId ? <span>· Incident {report.incidentId}</span> : null}
            {report.storageUri ? <span className="break-all">· {report.storageUri}</span> : null}
          </div>
          {labels.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {labels.slice(0, 8).map((label) => <span key={label} className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-100">{label}</span>)}
            </div>
          ) : citationCount ? <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">{citationCount} citations stored in metadata.</p> : null}
        </div>
        <Link href={{ pathname: `/reports/${report.id}`, query: { role } }} className="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:border-white/20">
          Open report
        </Link>
      </div>
    </article>
  );
}

function GeneratedReportCard({ report }: { report: GeneratedReport }) {
  return (
    <Card className="border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-400/20 dark:bg-emerald-400/10">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status="Generated" tone="healthy" />
          <StatusBadge status={titleCase(report.reportType)} tone="active" />
          <StatusBadge status={report.ai.mode === "fallback" ? "Fallback" : "AI Gateway"} tone={report.ai.mode === "fallback" ? "degraded" : "healthy"} />
        </div>
        <CardTitle>{report.title}</CardTitle>
        <CardDescription>{report.summary}</CardDescription>
      </CardHeader>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Storage URI</p>
          <p className="mt-2 break-all text-sm font-semibold text-slate-950 dark:text-white">{report.storageUri}</p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Persisted</p>
          <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{report.persisted ? "Yes" : "No"}</p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Citations</p>
          <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{report.citations.length}</p>
        </div>
      </div>
      <div className="mt-5">
        <ReportMarkdown markdown={report.markdown} compact />
      </div>
      {report.citations.length ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {report.citations.map((citation) => <span key={citation.id} title={citation.excerpt} className="rounded-full border border-blue-200 bg-white/80 px-2.5 py-1 text-xs font-bold text-blue-700 dark:border-blue-400/20 dark:bg-white/10 dark:text-blue-100">{citation.label}</span>)}
        </div>
      ) : null}
    </Card>
  );
}

export function ReportsConsole({ role, initialIncidentId }: ReportsConsoleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleView = getRoleViewRule(role);
  const [list, setList] = useState<ReportListResponse | null>(null);
  const [selectedType, setSelectedType] = useState<ReportType>("postmortem");
  const [incidentId, setIncidentId] = useState(initialIncidentId ?? "inc_warehouse_api_latency_2025_02_18");
  const [generated, setGenerated] = useState<GeneratedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const queryIncidentId = searchParams.get("incidentId")?.trim();
    if (queryIncidentId) setIncidentId(queryIncidentId);
  }, [searchParams]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadReports() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/reports?role=${encodeURIComponent(role)}&limit=50`, { signal: controller.signal, headers: { "x-commandgrid-demo-role": role } });
        const payload = (await response.json()) as ReportListResponse | { ok: false; error: string };
        if (!response.ok || !payload.ok) throw new Error("error" in payload ? payload.error : "Unable to load reports.");
        setList(payload);
        const firstAllowed = REPORT_TYPES.find((type) => payload.capabilities[type]?.canGenerate);
        if (firstAllowed) setSelectedType(firstAllowed);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "Unable to load reports.");
      } finally {
        setLoading(false);
      }
    }

    loadReports();
    return () => controller.abort();
  }, [role]);

  const canGenerateSelected = Boolean(list?.capabilities[selectedType]?.canGenerate);
  const readOnly = useMemo(() => list ? REPORT_TYPES.every((type) => !list.capabilities[type]?.canGenerate) : false, [list]);

  async function refreshReports() {
    const response = await fetch(`/api/reports?role=${encodeURIComponent(role)}&limit=50`, { headers: { "x-commandgrid-demo-role": role } });
    const payload = (await response.json()) as ReportListResponse | { ok: false; error: string };
    if (response.ok && payload.ok) setList(payload);
  }

  async function generateReport() {
    setGenerating(true);
    setError(null);
    setGenerated(null);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-commandgrid-demo-role": role
        },
        body: JSON.stringify({
          role,
          reportType: selectedType,
          incidentId: incidentId.trim() || undefined,
          actorUserId: actorByRole[role],
          persist: true
        })
      });
      const payload = (await response.json()) as GenerateReportResponse;
      if (!response.ok || !payload.ok) {
        setError("error" in payload ? payload.error : "Report generation failed.");
        return;
      }
      setGenerated(payload.report);
      await refreshReports();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Report generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={`${roleView.label} mode`} tone="active" />
            <StatusBadge status={readOnly ? "Read-only role" : "Generate enabled"} tone={readOnly ? "neutral" : "healthy"} />
            <StatusBadge status="Phase 7B" tone="pending" />
          </div>
          <CardTitle>Generate cited reports</CardTitle>
          <CardDescription>
            {roleView.emphasis} Capabilities come from GET /api/reports; UI affordances are explanatory only and backend authorization remains authoritative.
          </CardDescription>
        </CardHeader>
        <div className="grid gap-4 xl:grid-cols-3">
          {REPORT_TYPES.map((type) => (
            <ReportTypeCapabilityCard key={type} type={type} capability={list?.capabilities[type]} selected={selectedType === type} onSelect={() => setSelectedType(type)} />
          ))}
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Incident ID</span>
            <input
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
              value={incidentId}
              onChange={(event) => setIncidentId(event.target.value)}
              placeholder="inc_warehouse_api_latency_2025_02_18"
            />
          </label>
          <Button type="button" onClick={generateReport} disabled={generating || !canGenerateSelected || incidentId.trim().length < 3}>
            {generating ? "Generating…" : `Generate ${reportTypeLabels[selectedType]}`}
          </Button>
        </div>
        {!canGenerateSelected ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
            {roleView.label} cannot generate {reportTypeLabels[selectedType].toLowerCase()} reports in Phase 7A. This is a visible capability state; POST /api/reports still enforces the permission server-side.
          </div>
        ) : null}
      </Card>

      {loading ? <LoadingState title="Loading reports" description="Reading seeded and generated reports from GET /api/reports." /> : null}
      {error ? <ErrorState title="Reports need attention" description={error} /> : null}
      {generated ? <GeneratedReportCard report={generated} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Report library</CardTitle>
          <CardDescription>Seeded and generated artifacts from the Phase 7A report API. Storage URIs are displayed, but export/download is out of scope for Phase 7B.</CardDescription>
        </CardHeader>
        {!loading && list?.reports.length ? (
          <div className="grid gap-4">
            {list.reports.map((report) => <ReportListCard key={report.id} report={report} role={role} />)}
          </div>
        ) : null}
        {!loading && list && !list.reports.length ? (
          <EmptyState title="No reports found" description="Generate a report with an authorized role, or reset the demo seed to reload seeded artifacts." />
        ) : null}
      </Card>
    </div>
  );
}

export { reportMarkdown, metadataStringArray, formatDateTime, titleCase };
