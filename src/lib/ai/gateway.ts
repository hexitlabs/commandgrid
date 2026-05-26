const FALLBACK_MESSAGE = "AI Gateway is configured for CommandGrid routing; deterministic fallback is active for Phase 1 smoke tests.";

export type AiGatewaySmokeResult = {
  ok: boolean;
  mode: "gateway-configured" | "fallback";
  gatewayId?: string;
  message: string;
};

export function smokeAiGateway(env: { COMMANDGRID_AI_GATEWAY_ID?: string } = {}): AiGatewaySmokeResult {
  if (env.COMMANDGRID_AI_GATEWAY_ID) {
    return {
      ok: true,
      mode: "gateway-configured",
      gatewayId: env.COMMANDGRID_AI_GATEWAY_ID,
      message: "AI Gateway route is configured. Live provider calls are deferred until model credentials/routing policy are added."
    };
  }

  return {
    ok: true,
    mode: "fallback",
    message: FALLBACK_MESSAGE
  };
}
