import { NextRequest, NextResponse } from "next/server";
import { getCommandGridCloudflareContext } from "@/lib/cloudflare/context";
import { openCommandGridDb } from "@/lib/db/server";
import { createEventEnvelope } from "@/modules/events/envelope";
import { publishCommandGridEvent } from "@/modules/events/publisher";
import { approveDemoRemediation } from "@/modules/workflows/incident-response/service";
import { PHASE5_WORKFLOW } from "@/modules/workflows/incident-response/constants";
import { validateDemoAutomationRequest } from "../_guard";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const context = await getCommandGridCloudflareContext();
  const guard = await validateDemoAutomationRequest(request, context?.env, "approve-remediation");

  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status, headers: { "cache-control": "no-store" } });
  }

  const event = createEventEnvelope({
    id: "event_phase5_approval_approved",
    type: "incident.approval.approved",
    entityType: "approval",
    entityId: PHASE5_WORKFLOW.approvalId,
    actor: { type: "user", id: PHASE5_WORKFLOW.actorUserId },
    metadata: { runId: PHASE5_WORKFLOW.runId, source: "api.demo.approve-remediation" }
  });

  const queue = await publishCommandGridEvent(context?.env, event);
  const commandGrid = await openCommandGridDb();

  try {
    const result = await approveDemoRemediation(commandGrid.db, {
      actorUserId: PHASE5_WORKFLOW.actorUserId,
      rationale: "Approved from the public demo endpoint to resume the simulated CommandGrid workflow."
    });

    return NextResponse.json(
      {
        ...result,
        queue,
        next: "/incidents/warehouse-api-latency-spike"
      },
      { status: 202, headers: { "cache-control": "no-store" } }
    );
  } finally {
    await commandGrid.sql.end({ timeout: 1 });
  }
}
