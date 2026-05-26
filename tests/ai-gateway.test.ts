import { describe, expect, it } from "vitest";
import { smokeAiGateway } from "../src/lib/ai/gateway";

describe("AI Gateway smoke fallback", () => {
  it("returns deterministic fallback when no gateway id is configured", () => {
    expect(smokeAiGateway()).toMatchObject({ ok: true, mode: "fallback" });
  });

  it("reports configured mode when a gateway id is present", () => {
    expect(smokeAiGateway({ COMMANDGRID_AI_GATEWAY_ID: "commandgrid" })).toMatchObject({
      ok: true,
      mode: "gateway-configured",
      gatewayId: "commandgrid"
    });
  });
});
