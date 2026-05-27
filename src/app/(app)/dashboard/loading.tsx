import { LoadingState } from "@/components/ui/state-views";

export default function DashboardLoading() {
  return <LoadingState title="Loading dashboard" description="Querying Northstar operational health, incidents, approvals, and agent activity." />;
}
