import { eq, inArray } from "drizzle-orm";
import { createCommandGridDb } from "../src/lib/db/client";
import { approvals, auditLogs, reports } from "../src/lib/db/schema";
import { seedNorthstarDemo } from "../src/lib/demo/northstar-seed";
import { approveDemoRemediation, startDemoIncidentWorkflow } from "../src/modules/workflows/incident-response/service";
import { PHASE5_WORKFLOW } from "../src/modules/workflows/incident-response/constants";
import { createScriptSql, getDatabaseUrl } from "./db";

console.log("workflow smoke: resetting Northstar demo");
const seedSql = createScriptSql();
await seedNorthstarDemo(seedSql, { resetExisting: true });
await seedSql.end({ timeout: 1 });

console.log("workflow smoke: starting autonomous workflow with AI fallback");
const commandGrid = createCommandGridDb(getDatabaseUrl());

try {
  const start = await startDemoIncidentWorkflow(commandGrid.db, { COMMANDGRID_AI_DISABLED: "true" });

  const [approval] = await commandGrid.db
    .select({ status: approvals.status })
    .from(approvals)
    .where(eq(approvals.id, PHASE5_WORKFLOW.approvalId))
    .limit(1);

  const [prematureReport] = await commandGrid.db.select({ id: reports.id }).from(reports).where(eq(reports.id, PHASE5_WORKFLOW.reportId)).limit(1);

  if (start.status !== "paused-for-approval" || approval?.status !== "pending" || prematureReport) {
    throw new Error("Workflow approval gate failed: remediation artifacts appeared before approval.");
  }

  console.log("workflow smoke: approving remediation continuation");
  const approve = await approveDemoRemediation(commandGrid.db, { actorUserId: PHASE5_WORKFLOW.actorUserId });
  const rerun = await startDemoIncidentWorkflow(commandGrid.db, { COMMANDGRID_AI_DISABLED: "true" });

  const auditRows = await commandGrid.db
    .select({ id: auditLogs.id })
    .from(auditLogs)
    .where(
      inArray(auditLogs.id, [
        "audit_phase5_demo_incident_requested",
        "audit_phase5_workflow_started",
        "audit_phase5_agents_completed",
        "audit_phase5_approval_requested",
        "audit_phase5_approval_approved",
        "audit_phase5_remediation_simulated",
        "audit_phase5_postmortem_generated"
      ])
    );

  if (auditRows.length < 7) {
    throw new Error(`Workflow audit smoke failed: expected at least 7 Phase 5 audit rows, got ${auditRows.length}.`);
  }

  console.log(
    `workflow smoke ok=true start=${start.status} approval=${approval.status} approve=${approve.status} rerun=${rerun.status} audit_seen=${auditRows.length}`
  );
} finally {
  await commandGrid.sql.end({ timeout: 1 });
}
