import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
  trend?: string;
  tone?: "default" | "risk" | "success" | "info";
  icon?: ReactNode;
};

const toneClasses = {
  default: "from-slate-100 to-white text-slate-500 dark:from-white/10 dark:to-white/[0.03] dark:text-slate-400",
  risk: "from-orange-100 to-white text-orange-600 dark:from-orange-400/15 dark:to-white/[0.03] dark:text-orange-200",
  success: "from-emerald-100 to-white text-emerald-600 dark:from-emerald-400/15 dark:to-white/[0.03] dark:text-emerald-200",
  info: "from-blue-100 to-white text-blue-600 dark:from-blue-400/15 dark:to-white/[0.03] dark:text-blue-200"
};

export function MetricCard({ label, value, detail, trend, tone = "default", icon }: MetricCardProps) {
  return (
    <article className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-5 shadow-sm shadow-slate-950/[0.03] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.055]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{value}</p>
        </div>
        {icon ? (
          <div className={cn("grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br", toneClasses[tone])}>{icon}</div>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        {trend ? <span className="font-semibold text-slate-900 dark:text-slate-100">{trend}</span> : null}
        {detail ? <span className="text-slate-500 dark:text-slate-400">{detail}</span> : null}
      </div>
    </article>
  );
}
