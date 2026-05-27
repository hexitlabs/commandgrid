import { eq } from "drizzle-orm";
import { createCommandGridDb } from "../src/lib/db/client";
import { approvals, auditLogs, decisions, incidents, recommendations } from "../src/lib/db/schema";
import { decideApproval, GovernancePermissionError } from "../src/modules/approvals/service";
import { getApprovalDetail, getApprovalQueue } from "../src/modules/approvals/queries";
import { queryAuditLogs } from "../src/modules/audit/queries";
import { getDatabaseUrl } from "./db";

const commandGrid = createCommandGridDb(getDatabaseUrl());

async function expectSingle<T>(label: string, values: T[]) {
  if (values.length !== 1) {
    throw new Error(`${label}: expected one row, got ${values.length}`);
  }

  return values[0];
}

try {
  const queue = await getApprovalQueue(commandGrid.db, { role: "ops-manager", status: "pending" });
  if (!queue.some((approval) => approval.id === "approval_buffer_mode" && approval.canDecide)) {
    throw new Error("Ops Manager queue did not include decidable buffer-mode approval.");
  }

  const detail = await getApprovalDetail(commandGrid.db, "approval_buffer_mode", { role: "ops-manager" });
  if (!detail?.evidence.length || detail.governance.actionType !== "technical_remediation") {
    throw new Error("Approval detail did not include governance/evidence context.");
  }

  let unauthorizedBlocked = false;
  try {
    await decideApproval(commandGrid.db, {
      approvalId: "approval_buffer_mode",
      selectedRole: "engineer",
      decision: "approved",
      rationale: "Engineer should not be able to approve remediation in the smoke test.",
      decisionId: "decision_smoke_unauthorized_should_not_write",
      auditLogId: "audit_smoke_unauthorized_should_not_write"
    });
  } catch (error) {
    unauthorizedBlocked = error instanceof GovernancePermissionError;
  }

  if (!unauthorizedBlocked) {
    throw new Error("Unauthorized engineer approval was not blocked.");
  }

  const result = await decideApproval(commandGrid.db, {
    approvalId: "approval_buffer_mode",
    selectedRole: "ops-manager",
    decision: "approved",
    rationale: "Phase 6 smoke: approve simulated buffer-mode remediation.",
    decisionId: "decision_smoke_approval_buffer_mode",
    auditLogId: "audit_smoke_approval_buffer_mode",
    now: new Date("2025-02-18T16:31:00.000Z")
  });

  if (result.continuation.status !== "resumed") {
    throw new Error("Approved remediation did not report a resumed continuation.");
  }

  const [approval] = await commandGrid.db.select({ status: approvals.status }).from(approvals).where(eq(approvals.id, "approval_buffer_mode"));
  const [recommendation] = await commandGrid.db.select({ status: recommendations.status }).from(recommendations).where(eq(recommendations.id, "rec_enable_buffer_mode"));
  const [incident] = await commandGrid.db.select({ status: incidents.status }).from(incidents).where(eq(incidents.id, "inc_warehouse_api_latency_2025_02_18"));
  await expectSingle("decision", await commandGrid.db.select({ id: decisions.id }).from(decisions).where(eq(decisions.id, "decision_smoke_approval_buffer_mode")));
  await expectSingle("audit", await commandGrid.db.select({ id: auditLogs.id }).from(auditLogs).where(eq(auditLogs.id, "audit_smoke_approval_buffer_mode")));

  if (approval?.status !== "approved" || recommendation?.status !== "implemented" || incident?.status !== "resolved") {
    throw new Error("Approve side effects did not update approval/recommendation/incident state.");
  }

  const audit = await queryAuditLogs(commandGrid.db, {
    actorRole: "ops-manager",
    actionType: "technical_remediation",
    incidentId: "inc_warehouse_api_latency_2025_02_18",
    outcome: "approved",
    search: "buffer",
    limit: 20
  });

  if (!audit.logs.some((log) => log.id === "audit_smoke_approval_buffer_mode" && !log.metadataSummary.includes("sk-"))) {
    throw new Error("Audit filters did not return sanitized approval audit record.");
  }

  console.log("governance_audit_smoke ok=true approvals=1 decisions=1 audit=1 unauthorized_blocked=true continuation=resumed");
} finally {
  await commandGrid.sql.end({ timeout: 1 });
}
