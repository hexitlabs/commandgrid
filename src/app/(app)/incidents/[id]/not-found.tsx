import Link from "next/link";
import { EmptyState } from "@/components/ui/state-views";

export default function IncidentNotFound() {
  return (
    <EmptyState title="Incident not found" description="That incident is not available in the seeded Northstar dataset or the URL slug is incorrect.">
      <Link
        href="/incidents"
        className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:border-white/20"
      >
        Back to incident queue
      </Link>
    </EmptyState>
  );
}
