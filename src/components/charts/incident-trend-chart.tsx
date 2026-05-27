import type { CSSProperties } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardTrendPoint } from "@/modules/dashboard/types";
import { formatMonth, formatMoney } from "@/modules/dashboard/formatters";

export function IncidentTrendChart({ points }: { points: DashboardTrendPoint[] }) {
  const maxIncidents = Math.max(...points.map((point) => point.incidentCount), 1);
  const maxRevenue = Math.max(...points.map((point) => point.revenueAtRiskCents), 1);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Historical incident trend</CardTitle>
          <CardDescription>Seeded incident history with active/resolved split and revenue exposure.</CardDescription>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
          {points.length} months
        </span>
      </CardHeader>
      <div className="grid gap-4">
        <div className="flex h-52 items-end gap-2 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.035] sm:gap-3">
          {points.map((point) => {
            const incidentHeight = Math.max(12, (point.incidentCount / maxIncidents) * 100);
            const revenueHeight = Math.max(8, (point.revenueAtRiskCents / maxRevenue) * 100);

            return (
              <div
                key={point.period}
                className="flex min-w-0 flex-1 flex-col items-center gap-2"
                style={{ "--incident-height": `${incidentHeight}%`, "--revenue-height": `${revenueHeight}%` } as CSSProperties}
              >
                <div className="flex h-36 w-full items-end justify-center gap-1">
                  <span
                    className="h-[var(--incident-height)] w-3 rounded-t-full bg-blue-500/85 shadow-sm shadow-blue-500/20 dark:bg-blue-300/80 sm:w-4"
                    title={`${point.incidentCount} incidents`}
                  />
                  <span
                    className="h-[var(--revenue-height)] w-3 rounded-t-full bg-orange-500/80 shadow-sm shadow-orange-500/20 dark:bg-orange-300/75 sm:w-4"
                    title={formatMoney(point.revenueAtRiskCents)}
                  />
                </div>
                <span className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{formatMonth(point.period)}</span>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" />Incident count</span>
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" />Revenue at risk</span>
          <span className="text-slate-500 dark:text-slate-400">Latest active: {points.at(-1)?.activeCount ?? 0}</span>
        </div>
      </div>
    </Card>
  );
}
