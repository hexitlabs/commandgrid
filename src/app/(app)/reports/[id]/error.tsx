"use client";

import { ErrorState } from "@/components/ui/state-views";

export default function ReportDetailError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState title="Report detail failed to load" description={error.message || "Refresh to retry the report detail route."} actionLabel="Retry" onAction={reset} />;
}
