import { afterAll, describe, expect, it } from "vitest";
import { and, count, eq, inArray } from "drizzle-orm";
import { config } from "dotenv";
import { createCommandGridDb } from "../src/lib/db/client";
import { approvals, auditLogs, decisions, incidentTimelineEvents, organizations, recommendations } from "../src/lib/db/schema";
import { auditMetadataSummary, sanitizeAuditMetadata } from "../src/modules/audit/sanitize";
import { filterAuditRowsForContract } from "../src/modules/audit/queries";
import { ApprovalDecisionError, buildDecisionSideEffects, decideApproval, decisionAuditAction } from "../src/modules/approvals/service";
import { deriveApprovalGovernance } from "../src/modules/approvals/governance";
import { evaluateGovernancePermission } from "../src/modules/permissions/governance";
import type { AuditLogListItem } from "../src/modules/audit/types";

config({ path: ".env.local", override: false, quiet: true });
config({ path: ".env", override: false, quiet: true });

const databaseUrl = process.env.DATABASE_URL;
const runDatabaseDecisionTests = databaseUrl && process.env.COMMANDGRID_RUN_DB_QUERY_TESTS === "1";
const describeWithDatabase = runDatabaseDecisionTests ? describe : describe.skip;

const technicalApproval = {
  id: "approval_buffer_mode",
  title: "Enable regional buffer mode",
  riskLevel: "medium",
  assignedRoleSlug: "ops-manager",
  metadata: {
    actionType: "technical_remediation",
    continuation: "flagship-remediation",
    evidenceLabels: ["OPS-BUF-006"]
  },
  recommendationMetadata: { citationLabels: ["RUN-WH-API-004"] }
};

const financeApproval = {
  id: "approval_customer_credit_envelope",
  title: "Customer credit envelope",
  riskLevel: "high",
  assignedRoleSlug: "finance-reviewer",
  metadata: { actionType: "financial_credit", continuation: "financial-review" },
  recommendationMetadata: { citationLabels: ["FIN-CRED-009"] }
};

describe("governance permission matrix", () => {
  it("allows Ops Manager to approve warehouse remediation and blocks Engineer/Finance direct approval", () => {
    const governance = deriveApprovalGovernance(technicalApproval);

    expect(evaluateGovernancePermission("ops-manager", governance, "decide")).toMatchObject({ allowed: true });
    expect(evaluateGovernancePermission("admin", governance, "decide")).toMatchObject({ allowed: true });
    expect(evaluateGovernancePermission("engineer", governance, "decide")).toMatchObject({ allowed: false });
    expect(evaluateGovernancePermission("finance-reviewer", governance, "decide")).toMatchObject({ allowed: false });
  });

  it("allows Finance Reviewer to approve financial impact and blocks technical remediation", () => {
    const financeGovernance = deriveApprovalGovernance(financeApproval);
    const technicalGovernance = deriveApprovalGovernance(technicalApproval);

    expect(evaluateGovernancePermission("finance-reviewer", financeGovernance, "decide")).toMatchObject({ allowed: true });
    expect(evaluateGovernancePermission("finance-reviewer", technicalGovernance, "decide")).toMatchObject({ allowed: false });
  });

  it("allows Support Lead to review customer comms but not remediation approval", () => {
    const commsGovernance = deriveApprovalGovernance({
      id: "approval_publish_customer_update",
      title: "Publish proactive customer update",
      riskLevel: "low",
      assignedRoleSlug: "support-lead",
      metadata: { actionType: "customer_communication" },
      recommendationMetadata: null
    });
    const technicalGovernance = deriveApprovalGovernance(technicalApproval);

    expect(evaluateGovernancePermission("support-lead", commsGovernance, "decide")).toMatchObject({ allowed: true });
    expect(evaluateGovernancePermission("support-lead", technicalGovernance, "decide")).toMatchObject({ allowed: false });
  });

  it("uses assigned role before title keywords for legacy approvals without metadata action types", () => {
    const governance = deriveApprovalGovernance({
      id: "approval_legacy_finance_with_remediation_title",
      title: "Review remediation credit exception",
      riskLevel: "high",
      assignedRoleSlug: "finance-reviewer",
      metadata: {},
      recommendationMetadata: null
    });

    expect(governance.actionType).toBe("financial_credit");
    expect(governance.requiredRole).toBe("finance-reviewer");
    expect(evaluateGovernancePermission("finance-reviewer", governance, "decide")).toMatchObject({ allowed: true });
    expect(evaluateGovernancePermission("ops-manager", governance, "decide")).toMatchObject({ allowed: false });
  });
});

describe("approval decision side effects", () => {
  it("plans approve side effects with decision/audit semantics", () => {
    const effects = buildDecisionSideEffects({
      approvalId: "approval_buffer_mode",
      decision: "approved",
      actorRole: "ops-manager",
      actionType: "technical_remediation",
      continuation: "flagship-remediation"
    });

    expect(effects).toMatchObject({
      approvalStatus: "approved",
      recommendationStatus: "implemented",
      auditAction: "approval.approved",
      continuationStatus: "resumed"
    });
    expect(decisionAuditAction("approved")).toBe("approval.approved");
  });

  it("plans rejection side effects that stop continuation", () => {
    const effects = buildDecisionSideEffects({
      approvalId: "approval_buffer_mode",
      decision: "rejected",
      actorRole: "ops-manager",
      actionType: "technical_remediation",
      continuation: "flagship-remediation"
    });

    expect(effects).toMatchObject({
      approvalStatus: "rejected",
      recommendationStatus: "rejected",
      auditAction: "approval.rejected",
      continuationStatus: "stopped"
    });
    expect(effects.impact).toContain("continuation path is stopped");
  });

  it("records manual-review approvals without claiming a resumed workflow continuation", () => {
    const effects = buildDecisionSideEffects({
      approvalId: "approval_workspace_policy_exception",
      decision: "approved",
      actorRole: "admin",
      actionType: "workspace_admin",
      continuation: "manual-review"
    });

    expect(effects).toMatchObject({
      approvalStatus: "approved",
      recommendationStatus: "implemented",
      auditAction: "approval.approved",
      continuationStatus: "recorded"
    });
    expect(effects.impact).toContain("recorded the decision");
  });
});

describe("audit contract filters and metadata sanitization", () => {
  const rows: AuditLogListItem[] = [
    {
      id: "audit_1",
      action: "approval.approved",
      actionType: "technical_remediation",
      targetType: "approval",
      targetId: "approval_buffer_mode",
      incidentId: "inc_warehouse_api_latency_2025_02_18",
      occurredAt: "2025-02-18T16:31:00.000Z",
      outcome: "approved",
      status: "approved",
      actor: { id: "user_diego_alvarez", name: "Diego Alvarez", title: "Director of Fulfillment Operations" },
      actorRole: "ops-manager",
      metadataSummary: "actionType: technical_remediation · impact: released continuation path"
    },
    {
      id: "audit_2",
      action: "approval.rejected",
      actionType: "financial_credit",
      targetType: "approval",
      targetId: "approval_customer_credit_envelope",
      incidentId: "inc_warehouse_api_latency_2025_02_18",
      occurredAt: "2025-02-18T16:32:00.000Z",
      outcome: "rejected",
      status: "rejected",
      actor: { id: "user_leah_brooks", name: "Leah Brooks", title: "Finance Controller" },
      actorRole: "finance-reviewer",
      metadataSummary: "actionType: financial_credit · impact: stopped"
    }
  ];

  it("filters audit logs by actor role, action type, status/outcome, incident, and text search", () => {
    expect(filterAuditRowsForContract(rows, { actorRole: "ops-manager" })).toHaveLength(1);
    expect(filterAuditRowsForContract(rows, { actionType: "financial_credit" })[0]?.id).toBe("audit_2");
    expect(filterAuditRowsForContract(rows, { outcome: "approved" })[0]?.id).toBe("audit_1");
    expect(filterAuditRowsForContract(rows, { incidentId: "inc_warehouse_api_latency_2025_02_18" })).toHaveLength(2);
    expect(filterAuditRowsForContract(rows, { search: "Leah" })[0]?.id).toBe("audit_2");
  });

  it("sanitizes sensitive metadata instead of exposing raw values", () => {
    const sanitized = sanitizeAuditMetadata({
      actorRole: "ops-manager",
      apiToken: "sk-secret-token",
      rawLogDump: "line1\nline2",
      evidenceLabels: ["RUN-WH-API-004", "OPS-BUF-006"],
      nested: { should: "not leak" }
    });

    expect(sanitized.apiToken).toBe("[redacted]");
    expect(sanitized.rawLogDump).toBe("[redacted]");
    expect(sanitized.evidenceLabels).toBe("2 items");
    expect(sanitized.nested).toBe("summary object");
    expect(auditMetadataSummary({ apiToken: "sk-secret-token" })).not.toContain("sk-secret-token");
  });
});

describeWithDatabase("approval decision atomicity", () => {
  const primary = createCommandGridDb(databaseUrl ?? "");
  const concurrent = createCommandGridDb(databaseUrl ?? "");
  const approvalId = "approval_concurrency_regression_phase6a";
  const recommendationId = "rec_concurrency_regression_phase6a";
  const crossOrgId = "org_phase6a_cross_scope";
  const crossOrgSlug = "phase6a-cross-scope";
  const crossOrgApprovalId = "approval_cross_scope_regression_phase6a";
  const timelineIds = [
    `tl_${approvalId}_approved`.replace(/[^a-zA-Z0-9_]/g, "_"),
    `tl_${approvalId}_rejected`.replace(/[^a-zA-Z0-9_]/g, "_")
  ];

  async function seedCrossOrg() {
    await primary.db
      .insert(organizations)
      .values({
        id: crossOrgId,
        slug: crossOrgSlug,
        name: "Cross Scope Regression Org",
        industry: "Logistics",
        timezone: "America/Chicago",
        metadata: { test: "phase6a-cross-scope" }
      })
      .onConflictDoNothing();
  }

  async function cleanup() {
    await primary.db.delete(auditLogs).where(inArray(auditLogs.targetId, [approvalId, crossOrgApprovalId]));
    await primary.db.delete(decisions).where(inArray(decisions.approvalId, [approvalId, crossOrgApprovalId]));
    await primary.db.delete(incidentTimelineEvents).where(inArray(incidentTimelineEvents.id, timelineIds));
    await primary.db.delete(approvals).where(inArray(approvals.id, [approvalId, crossOrgApprovalId]));
    await primary.db.delete(recommendations).where(eq(recommendations.id, recommendationId));
    await primary.db.delete(organizations).where(eq(organizations.id, crossOrgId));
  }

  afterAll(async () => {
    await cleanup();
    await Promise.all([primary.sql.end({ timeout: 1 }), concurrent.sql.end({ timeout: 1 })]);
  });

  it("allows only one concurrent terminal decision and continuation side effect", async () => {
    await cleanup();

    await seedCrossOrg();

    await primary.db.insert(recommendations).values({
      id: recommendationId,
      organizationId: crossOrgId,
      incidentId: null,
      agentRunId: null,
      title: "Concurrency regression remediation",
      body: "Exercise approval decision atomicity under racing decisions.",
      priority: "high",
      status: "pending-approval",
      confidence: "0.950",
      metadata: { test: "phase6a-concurrency" }
    });

    await primary.db.insert(approvals).values({
      id: approvalId,
      organizationId: crossOrgId,
      incidentId: null,
      recommendationId,
      title: "Concurrency regression approval",
      description: "Approval used to prove terminal decisions are atomic.",
      requestedByUserId: null,
      assignedRoleId: null,
      status: "pending",
      riskLevel: "medium",
      dueAt: new Date("2025-02-18T17:00:00.000Z"),
      metadata: { actionType: "technical_remediation", continuation: "flagship-remediation" }
    });

    const results = await Promise.allSettled([
      decideApproval(primary.db, {
        approvalId,
        selectedRole: "ops-manager",
        decision: "approved",
        rationale: "Approve the safe simulated remediation path.",
        organizationSlug: crossOrgSlug,
        now: new Date("2025-02-18T16:45:00.000Z"),
        decisionId: "decision_concurrency_regression_approved",
        auditLogId: "audit_concurrency_regression_approved"
      }),
      decideApproval(concurrent.db, {
        approvalId,
        selectedRole: "ops-manager",
        decision: "rejected",
        rationale: "Reject the racing decision to prove atomicity.",
        organizationSlug: crossOrgSlug,
        now: new Date("2025-02-18T16:45:00.000Z"),
        decisionId: "decision_concurrency_regression_rejected",
        auditLogId: "audit_concurrency_regression_rejected"
      })
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toBeInstanceOf(ApprovalDecisionError);
    expect((rejected[0] as PromiseRejectedResult | undefined)?.reason.status).toBe(409);

    const [decisionCount] = await primary.db.select({ value: count() }).from(decisions).where(eq(decisions.approvalId, approvalId));
    const [auditCount] = await primary.db
      .select({ value: count() })
      .from(auditLogs)
      .where(and(eq(auditLogs.targetType, "approval"), eq(auditLogs.targetId, approvalId)));
    const [timelineCount] = await primary.db.select({ value: count() }).from(incidentTimelineEvents).where(inArray(incidentTimelineEvents.id, timelineIds));
    const [approval] = await primary.db.select({ status: approvals.status }).from(approvals).where(eq(approvals.id, approvalId)).limit(1);
    const [recommendation] = await primary.db.select({ status: recommendations.status }).from(recommendations).where(eq(recommendations.id, recommendationId)).limit(1);

    expect(decisionCount?.value).toBe(1);
    expect(auditCount?.value).toBe(1);
    expect(timelineCount?.value).toBe(0);
    expect(["approved", "rejected"]).toContain(approval?.status);
    expect(["implemented", "rejected"]).toContain(recommendation?.status);
  }, 30_000);

  it("does not decide an approval ID outside the default organization scope", async () => {
    await cleanup();

    await seedCrossOrg();

    await primary.db.insert(approvals).values({
      id: crossOrgApprovalId,
      organizationId: crossOrgId,
      incidentId: null,
      recommendationId: null,
      title: "Cross-org approval must not be decided by default scope",
      description: "Regression fixture for organization-scoped decision lookup.",
      requestedByUserId: null,
      assignedRoleId: null,
      status: "pending",
      riskLevel: "medium",
      dueAt: new Date("2025-02-18T17:00:00.000Z"),
      metadata: { actionType: "technical_remediation", continuation: "manual-review" }
    });

    await expect(
      decideApproval(primary.db, {
        approvalId: crossOrgApprovalId,
        selectedRole: "ops-manager",
        decision: "approved",
        rationale: "Attempt to decide without the matching organization scope.",
        now: new Date("2025-02-18T16:45:00.000Z"),
        decisionId: "decision_cross_scope_regression",
        auditLogId: "audit_cross_scope_regression"
      })
    ).rejects.toMatchObject({ status: 404 });

    const [approval] = await primary.db.select({ status: approvals.status }).from(approvals).where(eq(approvals.id, crossOrgApprovalId)).limit(1);
    const [decisionCount] = await primary.db.select({ value: count() }).from(decisions).where(eq(decisions.approvalId, crossOrgApprovalId));
    const [auditCount] = await primary.db.select({ value: count() }).from(auditLogs).where(eq(auditLogs.targetId, crossOrgApprovalId));

    expect(approval?.status).toBe("pending");
    expect(decisionCount?.value).toBe(0);
    expect(auditCount?.value).toBe(0);
  }, 30_000);

});
