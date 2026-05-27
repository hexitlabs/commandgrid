import { LoadingState } from "@/components/ui/state-views";

export default function ApprovalDetailLoading() {
  return <LoadingState title="Loading approval detail" description="Fetching governance context, evidence summaries, and linked audit trail." />;
}
