import { LoadingState } from "@/components/ui/state-views";

export default function ApprovalsLoading() {
  return <LoadingState title="Loading approvals" description="Fetching governed approval queue." />;
}
