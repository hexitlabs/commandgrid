const FALLBACK_MESSAGE = "AI Gateway is configured for CommandGrid routing; deterministic fallback is active for Phase 1 smoke tests.";

type FetchLike = typeof fetch;

export type AiGatewaySmokeResult = {
  ok: boolean;
  mode: "gateway-configured" | "fallback";
  gatewayId?: string;
  message: string;
};

export type AiGenerationEnv = {
  COMMANDGRID_AI_GATEWAY_ID?: string;
  COMMANDGRID_AI_GATEWAY_URL?: string;
  COMMANDGRID_AI_DISABLED?: string;
};

export type AiGenerationRequest = {
  system: string;
  prompt: string;
  fallback: string;
  timeoutMs?: number;
  retries?: number;
  fetcher?: FetchLike;
};

export type AiGenerationResult = {
  text: string;
  mode: "gateway" | "fallback";
  attempts: number;
  error?: string;
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

function sanitizeError(error: unknown) {
  if (error instanceof Error) {
    return error.name === "AbortError" ? "AI gateway request timed out" : error.message.slice(0, 180);
  }

  return "AI gateway request failed";
}

function parseGatewayResponse(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const output = record.output;
  if (typeof output === "string") return output;

  const response = record.response;
  if (typeof response === "string") return response;

  const choices = record.choices;
  if (Array.isArray(choices)) {
    const [choice] = choices;
    if (choice && typeof choice === "object") {
      const choiceRecord = choice as Record<string, unknown>;
      const text = choiceRecord.text;
      if (typeof text === "string") return text;
      const message = choiceRecord.message;
      if (message && typeof message === "object") {
        const content = (message as Record<string, unknown>).content;
        if (typeof content === "string") return content;
      }
    }
  }

  return null;
}

export async function generateWithAiGateway(env: AiGenerationEnv = {}, request: AiGenerationRequest): Promise<AiGenerationResult> {
  const timeoutMs = request.timeoutMs ?? 2_500;
  const retries = request.retries ?? 1;
  const fetcher = request.fetcher ?? fetch;

  if (env.COMMANDGRID_AI_DISABLED === "true" || !env.COMMANDGRID_AI_GATEWAY_URL) {
    return { text: request.fallback, mode: "fallback", attempts: 0, error: "AI gateway disabled or not configured" };
  }

  let lastError = "AI gateway request failed";

  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetcher(env.COMMANDGRID_AI_GATEWAY_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: request.system },
            { role: "user", content: request.prompt }
          ]
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        lastError = `AI gateway HTTP ${response.status}`;
        continue;
      }

      const text = parseGatewayResponse(await response.json());
      if (text?.trim()) {
        return { text: text.trim(), mode: "gateway", attempts: attempt };
      }

      lastError = "AI gateway returned no text";
    } catch (error) {
      lastError = sanitizeError(error);
    } finally {
      clearTimeout(timeout);
    }
  }

  return { text: request.fallback, mode: "fallback", attempts: retries + 1, error: lastError };
}
