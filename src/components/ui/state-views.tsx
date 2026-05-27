import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type StateViewProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
};

export function LoadingState({ title = "Loading CommandGrid", description = "Preparing the operational picture." }: Partial<StateViewProps>) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white/70 p-6 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-center gap-4">
        <span className="h-10 w-10 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
        <div className="space-y-2">
          <p className="font-semibold text-slate-950 dark:text-white">{title}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <span className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/10" />
        <span className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/10" />
        <span className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/10" />
      </div>
    </div>
  );
}

export function EmptyState({ title, description, actionLabel, onAction, children }: StateViewProps) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white/60 p-8 text-center dark:border-white/15 dark:bg-white/[0.035]">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-400/10 dark:text-blue-200">⌁</div>
      <h3 className="mt-4 text-base font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      {children}
      {actionLabel ? (
        <Button type="button" variant="secondary" onClick={onAction} className="mt-5">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function ErrorState({ title, description, actionLabel, onAction }: StateViewProps) {
  return (
    <div className="rounded-[1.5rem] border border-red-200 bg-red-50/80 p-6 dark:border-red-400/20 dark:bg-red-400/10">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-red-600 dark:text-red-200">Needs attention</p>
      <h3 className="mt-3 text-base font-semibold text-red-950 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-red-700 dark:text-red-100/80">{description}</p>
      {actionLabel ? (
        <Button type="button" variant="secondary" onClick={onAction} className="mt-5 border-red-200 text-red-700 dark:border-red-400/20 dark:text-red-100">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
