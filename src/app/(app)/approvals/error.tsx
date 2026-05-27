"use client";

import { ErrorState } from "@/components/ui/state-views";

export default function ApprovalsError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorState title="Approvals failed to load" description={error.message} actionLabel="Retry" onAction={reset} />;
}
