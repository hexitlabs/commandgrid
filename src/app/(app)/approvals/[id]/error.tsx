"use client";

import { ErrorState } from "@/components/ui/state-views";

export default function ApprovalDetailError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorState title="Approval detail failed to load" description={error.message} actionLabel="Retry" onAction={reset} />;
}
