"use client";

import { ErrorState } from "@/components/ui/state-views";

export default function CopilotError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState title="Knowledge Copilot failed to load" description={error.message || "Refresh to retry the Copilot route."} actionLabel="Retry" onAction={reset} />;
}
