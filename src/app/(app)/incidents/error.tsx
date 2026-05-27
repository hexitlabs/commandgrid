"use client";

import { ErrorState } from "@/components/ui/state-views";

export default function IncidentsError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorState title="Incident list could not load" description={error.message} actionLabel="Retry incidents" onAction={reset} />;
}
