"use client";

import { ErrorState } from "@/components/ui/state-views";

export default function IncidentDetailError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorState title="Incident detail could not load" description={error.message} actionLabel="Retry incident detail" onAction={reset} />;
}
