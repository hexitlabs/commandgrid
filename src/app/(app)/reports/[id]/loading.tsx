import { LoadingState } from "@/components/ui/state-views";

export default function ReportDetailLoading() {
  return <LoadingState title="Loading report detail" description="Reading persisted report metadata and safe markdown sections." />;
}
