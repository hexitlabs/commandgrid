import { NextRequest, NextResponse } from "next/server";
import { getCommandGridCloudflareContext } from "@/lib/cloudflare/context";
import { openCommandGridDb } from "@/lib/db/server";
import { createEventEnvelope } from "@/modules/events/envelope";
import { publishCommandGridEvent } from "@/modules/events/publisher";
import { startDemoIncidentWorkflow } from "@/modules/workflows/incident-response/service";
import { PHASE5_WORKFLOW } from "@/modules/workflows/incident-response/constants";
import { validateDemoAutomationRequest } from "../_guard";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const context = await getCommandGridCloudflareContext();
  const guard = await validateDemoAutomationRequest(request, context?.env, "run-demo-incident");

  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status, headers: { "cache-control": "no-store" } });
  }

  const event = createEventEnvelope({
    id: "event_phase5_demo_incident_requested",
    type: "demo.incident.requested",
    entityType: "incident",
    entityId: PHASE5_WORKFLOW.incidentId,
    actor: { type: "user", id: PHASE5_WORKFLOW.actorUserId },
    metadata: { runId: PHASE5_WORKFLOW.runId, source: "api.demo.run-incident" }
  });

  const queue = await publishCommandGridEvent(context?.env, event);
  const commandGrid = await openCommandGridDb();

  try {
    const aiEnv = context?.env ?? {
      COMMANDGRID_AI_GATEWAY_ID: process.env.COMMANDGRID_AI_GATEWAY_ID,
      COMMANDGRID_AI_GATEWAY_URL: process.env.COMMANDGRID_AI_GATEWAY_URL,
      COMMANDGRID_AI_DISABLED: process.env.COMMANDGRID_AI_DISABLED
    };
    const result = await startDemoIncidentWorkflow(commandGrid.db, aiEnv);

    return NextResponse.json(
      {
        ...result,
        queue,
        next: result.status === "paused-for-approval" ? "/api/demo/approve-remediation" : "/incidents/warehouse-api-latency-spike"
      },
      { status: 202, headers: { "cache-control": "no-store" } }
    );
  } finally {
    await commandGrid.sql.end({ timeout: 1 });
  }
}
