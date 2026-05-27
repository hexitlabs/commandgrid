import { LoadingState } from "@/components/ui/state-views";

export default function IncidentDetailLoading() {
  return <LoadingState title="Loading incident detail" description="Assembling timeline, impact, evidence, agents, approvals, reports, and audit previews." />;
}
