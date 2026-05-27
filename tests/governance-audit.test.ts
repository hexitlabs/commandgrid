import { describe, expect, it } from "vitest";
import { auditMetadataSummary, sanitizeAuditMetadata } from "../src/modules/audit/sanitize";
import { filterAuditRowsForContract } from "../src/modules/audit/queries";
import { buildDecisionSideEffects, decisionAuditAction } from "../src/modules/approvals/service";
import { deriveApprovalGovernance } from "../src/modules/approvals/governance";
import { evaluateGovernancePermission } from "../src/modules/permissions/governance";
import type { AuditLogListItem } from "../src/modules/audit/types";

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
