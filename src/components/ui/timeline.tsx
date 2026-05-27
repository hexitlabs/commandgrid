import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TimelineItem = {
  time: string;
  title: string;
  description: string;
  meta?: ReactNode;
  tone?: "blue" | "amber" | "emerald" | "slate";
};

type TimelineProps = {
  items: TimelineItem[];
};

const dotClasses = {
  blue: "bg-blue-500 ring-blue-500/15",
  amber: "bg-amber-500 ring-amber-500/15",
  emerald: "bg-emerald-500 ring-emerald-500/15",
  slate: "bg-slate-400 ring-slate-400/15"
};

export function Timeline({ items }: TimelineProps) {
  return (
    <ol className="relative space-y-5 before:absolute before:bottom-2 before:left-[0.5625rem] before:top-2 before:w-px before:bg-slate-200 dark:before:bg-white/10">
      {items.map((item) => (
        <li key={`${item.time}-${item.title}`} className="relative grid grid-cols-[1.25rem_1fr] gap-4">
          <span className={cn("mt-1.5 h-2.5 w-2.5 rounded-full ring-8", dotClasses[item.tone ?? "slate"])} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <time className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{item.time}</time>
              {item.meta}
            </div>
            <p className="mt-1 font-semibold text-slate-950 dark:text-white">{item.title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
