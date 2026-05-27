import { describe, expect, it } from "vitest";
import { governanceRoleLabel, governanceStatusTone, humanizeGovernanceValue } from "../src/modules/governance/display";

describe("governance UI display helpers", () => {
  it("labels public demo governance roles without implying auth", () => {
    expect(governanceRoleLabel("ops-manager")).toBe("Ops Manager");
    expect(governanceRoleLabel("finance-reviewer")).toBe("Finance Reviewer");
    expect(governanceRoleLabel(null)).toBe("System");
  });

  it("humanizes action, outcome, and continuation identifiers", () => {
    expect(humanizeGovernanceValue("technical_remediation")).toBe("Technical Remediation");
    expect(humanizeGovernanceValue("approval.approved")).toBe("Approval Approved");
    expect(humanizeGovernanceValue("phase5-remediation")).toBe("Phase5 Remediation");
  });

  it("maps governance states to existing status badge tones", () => {
    expect(governanceStatusTone("approved")).toBe("healthy");
    expect(governanceStatusTone("pending")).toBe("pending");
    expect(governanceStatusTone("blocked")).toBe("active");
    expect(governanceStatusTone(undefined)).toBe("neutral");
  });
});
