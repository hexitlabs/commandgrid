import { LoadingState } from "@/components/ui/state-views";

export default function AuditLoading() {
  return <LoadingState title="Loading audit log" description="Fetching sanitized governance records." />;
}
