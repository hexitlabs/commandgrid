"use client";

import { ErrorState } from "@/components/ui/state-views";

export default function AuditError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorState title="Audit log failed to load" description={error.message} actionLabel="Retry" onAction={reset} />;
}
