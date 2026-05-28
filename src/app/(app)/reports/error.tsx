"use client";

import { ErrorState } from "@/components/ui/state-views";

export default function ReportsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState title="Reports failed to load" description={error.message || "Refresh to retry the reports route."} actionLabel="Retry" onAction={reset} />;
}
