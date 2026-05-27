import type { CSSProperties } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardTrendPoint } from "@/modules/dashboard/types";
import { formatMonth, formatMoney } from "@/modules/dashboard/formatters";

export function IncidentTrendChart({ points }: { points: DashboardTrendPoint[] }) {
  const maxIncidents = Math.max(...points.map((point) => point.incidentCount), 1);
  const maxRevenue = Math.max(...points.map((point) => point.revenueAtRiskCents), 1);
  const totalIncidents = points.reduce((sum, point) => sum + point.incidentCount, 0);
  const totalRevenueAtRisk = points.reduce((sum, point) => sum + point.revenueAtRiskCents, 0);
  const latestPoint = points.at(-1);
  const trendSummary = latestPoint
    ? `${points.length} month incident trend: ${totalIncidents} total incidents and ${formatMoney(totalRevenueAtRisk)} cumulative revenue at risk. Latest month ${formatMonth(latestPoint.period)} has ${latestPoint.incidentCount} incidents, ${latestPoint.activeCount} active, ${latestPoint.resolvedCount} resolved, and ${formatMoney(latestPoint.revenueAtRiskCents)} revenue at risk.`
    : "No incident trend data is available.";

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
        <p id="incident-trend-summary" className="sr-only">{trendSummary}</p>
        <div aria-describedby="incident-trend-summary" className="flex h-52 items-end gap-2 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.035] sm:gap-3">
          {points.map((point) => {
            const incidentHeight = Math.max(12, (point.incidentCount / maxIncidents) * 100);
            const revenueHeight = Math.max(8, (point.revenueAtRiskCents / maxRevenue) * 100);

            return (
              <div
                key={point.period}
                className="flex min-w-0 flex-1 flex-col items-center gap-2"
                style={{ "--incident-height": `${incidentHeight}%`, "--revenue-height": `${revenueHeight}%` } as CSSProperties}
              >
                <div className="flex h-36 w-full items-end justify-center gap-1" aria-hidden="true">
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
          <span className="text-slate-500 dark:text-slate-400">Latest active: {latestPoint?.activeCount ?? 0}</span>
        </div>
        <table className="sr-only">
          <caption>Historical incident trend data by month</caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">Incidents</th>
              <th scope="col">Active</th>
              <th scope="col">Resolved</th>
              <th scope="col">Delayed orders</th>
              <th scope="col">Revenue at risk</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.period}>
                <th scope="row">{formatMonth(point.period)}</th>
                <td>{point.incidentCount}</td>
                <td>{point.activeCount}</td>
                <td>{point.resolvedCount}</td>
                <td>{point.delayedOrders}</td>
                <td>{formatMoney(point.revenueAtRiskCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
