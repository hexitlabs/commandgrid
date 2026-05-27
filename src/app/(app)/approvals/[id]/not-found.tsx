import Link from "next/link";
import { EmptyState } from "@/components/ui/state-views";

export default function ApprovalNotFound() {
  return (
    <EmptyState title="Approval not found" description="The selected demo-mode governance role may not be allowed to view this approval, or the approval ID does not exist.">
      <Link href="/approvals" className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-200">Back to approvals</Link>
    </EmptyState>
  );
}
