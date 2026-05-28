"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/state-views";
import { StatusBadge } from "@/components/ui/status-badge";
import type { DemoRoleSlug } from "@/modules/roles/view-rules";
import type { ReportListItem } from "@/modules/reports/types";
import { ReportMarkdown } from "./report-markdown";
import { formatDateTime, metadataStringArray, reportMarkdown, titleCase } from "./reports-console";

type ReportDetailResponse = { ok: true; role: DemoRoleSlug; report: ReportListItem } | { ok: false; error: string };

export function ReportDetail({ id, role }: { id: string; role: DemoRoleSlug }) {
  const [report, setReport] = useState<ReportListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadReport() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/reports/${encodeURIComponent(id)}?role=${encodeURIComponent(role)}`, { signal: controller.signal, headers: { "x-commandgrid-demo-role": role } });
        const payload = (await response.json()) as ReportDetailResponse;
        if (!response.ok || !payload.ok) throw new Error("error" in payload ? payload.error : "Unable to load report.");
        setReport(payload.report);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "Unable to load report.");
      } finally {
        setLoading(false);
      }
    }

    loadReport();
    return () => controller.abort();
  }, [id, role]);

  const labels = report ? metadataStringArray(report.metadata, "citationLabels") : [];
  const ids = report ? metadataStringArray(report.metadata, "citationIds") : [];
  const aiMode = report && typeof report.metadata.aiMode === "string" ? report.metadata.aiMode : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link href={{ pathname: "/dashboard", query: { role } }} className="font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-200">Dashboard</Link>
        <span>/</span>
        <Link href={{ pathname: "/reports", query: { role } }} className="font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-200">Reports</Link>
        <span>/</span>
        <span>{id}</span>
      </div>

      {loading ? <LoadingState title="Loading report detail" description="Reading GET /api/reports/{id} for persisted metadata and markdown." /> : null}
      {error ? <ErrorState title="Report detail unavailable" description={error} /> : null}

      {report ? (
        <>
          <section className="rounded-[2.25rem] border border-slate-200/80 bg-white/90 p-6 shadow-sm shadow-slate-950/[0.03] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] sm:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-4xl">
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <StatusBadge status="Phase 7B" tone="active" />
                  <StatusBadge status={report.status} tone="healthy" />
                  <StatusBadge status={titleCase(report.reportType)} tone="pending" />
                  {aiMode ? <StatusBadge status={titleCase(aiMode)} tone={aiMode === "fallback" ? "degraded" : "healthy"} /> : null}
                </div>
                <h2 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">{report.title}</h2>
                <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">{report.summary}</p>
              </div>
              <Link href={{ pathname: "/reports", query: { role, incidentId: report.incidentId ?? undefined } }} className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:border-white/20">
                Back to report library
              </Link>
            </div>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Report metadata</CardTitle>
              <CardDescription>Persisted report fields and current artifact pointer. R2 export controls are intentionally out of scope.</CardDescription>
            </CardHeader>
            <dl className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Generated</dt>
                <dd className="mt-2 font-semibold text-slate-950 dark:text-white">{formatDateTime(report.generatedAt)}</dd>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Incident</dt>
                <dd className="mt-2 break-all font-semibold text-slate-950 dark:text-white">{report.incidentId ?? "Not linked"}</dd>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Generated by</dt>
                <dd className="mt-2 break-all font-semibold text-slate-950 dark:text-white">{report.generatedByUserId ?? "System"}</dd>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Storage URI</dt>
                <dd className="mt-2 break-all font-semibold text-slate-950 dark:text-white">{report.storageUri}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Safe report body</CardTitle>
              <CardDescription>Markdown is rendered as structured React text and lists only. No raw HTML is injected.</CardDescription>
            </CardHeader>
            <ReportMarkdown markdown={reportMarkdown(report)} />
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Citations</CardTitle>
              <CardDescription>Labels and IDs persisted in report metadata. Full source cards are shown in Copilot answers and generated-report responses when available.</CardDescription>
            </CardHeader>
            {labels.length || ids.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {labels.map((label, index) => (
                  <div key={`${label}-${index}`} className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-400/20 dark:bg-blue-400/10">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-100">Citation label</p>
                    <p className="mt-2 font-semibold text-slate-950 dark:text-white">{label}</p>
                    {ids[index] ? <p className="mt-1 break-all text-xs text-slate-600 dark:text-slate-300">{ids[index]}</p> : null}
                  </div>
                ))}
                {!labels.length ? ids.map((citationId) => (
                  <div key={citationId} className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-400/20 dark:bg-blue-400/10">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-100">Citation ID</p>
                    <p className="mt-2 break-all font-semibold text-slate-950 dark:text-white">{citationId}</p>
                  </div>
                )) : null}
              </div>
            ) : (
              <EmptyState title="No citation metadata found" description="This seeded report may only expose a citation count. Generate a Phase 7A report to persist citation labels and markdown." />
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
