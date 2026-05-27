import { LoadingState } from "@/components/ui/state-views";

export default function IncidentsLoading() {
  return <LoadingState title="Loading incidents" description="Applying severity, status, sorting, and impact summaries from the data contract." />;
}
