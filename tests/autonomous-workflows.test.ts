import { describe, expect, it } from "vitest";
import { generateWithAiGateway } from "../src/lib/ai/gateway";
import { deterministicAgentFallback } from "../src/modules/agents/fallbacks";
import { PHASE5_AGENT_ORDER, PHASE5_WORKFLOW } from "../src/modules/workflows/incident-response/constants";
import { approvalContinuationAuditActions, buildIncidentResponsePlan } from "../src/modules/workflows/incident-response/plan";

function ids(values: Array<{ id: string }>) {
  return values.map((value) => value.id);
}

describe("Phase 5 autonomous workflow plan", () => {
  it("builds deterministic idempotent agent runs for every required agent", () => {
    const first = buildIncidentResponsePlan();
    const second = buildIncidentResponsePlan();

    expect(first.runId).toBe(PHASE5_WORKFLOW.runId);
    expect(first.agentRuns.map((run) => run.slug)).toEqual(PHASE5_AGENT_ORDER);
    expect(new Set(ids(first.agentRuns)).size).toBe(PHASE5_AGENT_ORDER.length);
    expect(first).toEqual(second);
  });

  it("stops at the governance approval gate before remediation/postmortem actions", () => {
    const plan = buildIncidentResponsePlan();

    expect(plan.approvalId).toBe(PHASE5_WORKFLOW.approvalId);
    expect(plan.reportId).toBe(PHASE5_WORKFLOW.reportId);
    expect(plan.auditActions).toContain("approval.requested");
    expect(plan.auditActions).not.toContain("remediation.simulated");
    expect(plan.auditActions).not.toContain("postmortem.generated");
  });

  it("defines audit writes for approval continuation", () => {
    expect(approvalContinuationAuditActions()).toEqual(["approval.approved", "remediation.simulated", "postmortem.generated"]);
  });

  it("has deterministic fallback output for each required agent", () => {
    for (const agent of PHASE5_AGENT_ORDER) {
      const fallback = deterministicAgentFallback(agent);
      expect(fallback.summary).toContain(agent === "finance" ? "$48,200" : "");
      expect(fallback.eventMessage.length).toBeGreaterThan(20);
      expect(fallback.metadata.mode).toBe("deterministic-fallback");
    }
  });
});

describe("AI Gateway generation fallback", () => {
  it("uses deterministic fallback when AI is disabled", async () => {
    await expect(
      generateWithAiGateway(
        { COMMANDGRID_AI_DISABLED: "true", COMMANDGRID_AI_GATEWAY_URL: "https://gateway.example.invalid" },
        { system: "system", prompt: "prompt", fallback: "safe fallback" }
      )
    ).resolves.toMatchObject({ mode: "fallback", text: "safe fallback", attempts: 0 });
  });

  it("falls back after a gateway timeout/failure without leaking details", async () => {
    const result = await generateWithAiGateway(
      { COMMANDGRID_AI_GATEWAY_URL: "https://gateway.example.invalid" },
      {
        system: "system",
        prompt: "prompt",
        fallback: "safe fallback",
        retries: 0,
        timeoutMs: 10,
        fetcher: async () => {
          throw new Error("provider secret should not appear");
        }
      }
    );

    expect(result.mode).toBe("fallback");
    expect(result.text).toBe("safe fallback");
    expect(result.attempts).toBe(1);
    expect(result.error).not.toContain("sk-");
  });
});
