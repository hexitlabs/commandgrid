"use client";

import { ErrorState } from "@/components/ui/state-views";

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorState title="Dashboard data could not load" description={error.message} actionLabel="Retry dashboard" onAction={reset} />;
}
