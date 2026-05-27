"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/state-views";
import type { ApprovalDecisionResult, ApprovalQueueItem } from "@/modules/approvals/types";
import type { DemoRoleSlug } from "@/modules/roles/view-rules";
import { governanceRoleLabel } from "@/modules/governance/display";

type DecisionResponse = ApprovalDecisionResult | { ok: false; error: string };

export function ApprovalDecisionForm({ approval, role, compact = false }: { approval: ApprovalQueueItem; role: DemoRoleSlug; compact?: boolean }) {
  const router = useRouter();
  const [rationale, setRationale] = useState("");
  const [pendingDecision, setPendingDecision] = useState<"approved" | "rejected" | null>(null);
  const [result, setResult] = useState<ApprovalDecisionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = approval.canDecide && approval.status === "pending";
  const placeholder = useMemo(() => {
    if (approval.governance.continuation === "phase5-remediation" || approval.governance.continuation === "flagship-remediation") {
      return "Example: Safe to resume simulated buffer-mode remediation after reviewing evidence.";
    }

    return "Record the business reason for this governed decision.";
  }, [approval.governance.continuation]);

  async function submit(decision: "approved" | "rejected") {
    setPendingDecision(decision);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/approvals/${approval.id}/decide`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-commandgrid-demo-role": role
        },
        body: JSON.stringify({ role, decision, rationale })
      });
      const payload = (await response.json()) as DecisionResponse;

      if (!response.ok || !payload.ok) {
        setError("error" in payload ? payload.error : "Approval decision failed.");
        return;
      }

      setResult(payload);
      setRationale("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Approval decision failed.");
    } finally {
      setPendingDecision(null);
    }
  }

  if (!canSubmit) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <p className="text-sm font-semibold text-slate-950 dark:text-white">Decision unavailable for {governanceRoleLabel(role)}</p>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {approval.status !== "pending"
            ? `This approval is ${approval.status}; backend only accepts decisions while pending.`
            : "This selected demo-mode governance role can review this item, but the server contract does not permit it to approve or reject."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/75 p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div>
        <label htmlFor={`rationale-${approval.id}`} className="text-sm font-semibold text-slate-950 dark:text-white">
          Decision rationale
        </label>
        <textarea
          id={`rationale-${approval.id}`}
          className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
          value={rationale}
          onChange={(event) => setRationale(event.target.value)}
          placeholder={placeholder}
          maxLength={1000}
        />
        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Sent to Phase 6A decision API with the selected demo-mode governance role. Backend enforcement is authoritative.
        </p>
      </div>

      <div className={compact ? "mt-4 grid gap-2 sm:grid-cols-2" : "mt-4 flex flex-col gap-2 sm:flex-row"}>
        <Button type="button" onClick={() => submit("approved")} disabled={Boolean(pendingDecision) || rationale.trim().length < 3}>
          {pendingDecision === "approved" ? "Approving…" : "Approve and resume"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => submit("rejected")} disabled={Boolean(pendingDecision) || rationale.trim().length < 3}>
          {pendingDecision === "rejected" ? "Rejecting…" : "Reject and stop"}
        </Button>
      </div>

      {result ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100">
          <p className="font-semibold">Decision recorded: {result.status}</p>
          <p className="mt-1 leading-6">{result.continuation.impact}</p>
          <p className="mt-1 text-xs">Audit log: {result.auditLogId}</p>
        </div>
      ) : null}

      {error ? <div className="mt-4"><ErrorState title="Decision blocked" description={error} /></div> : null}
    </div>
  );
}
