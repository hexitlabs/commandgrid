import { NextRequest } from "next/server";

type DemoGuardEnv = {
  DEMO_MODE?: string;
  COMMANDGRID_CONFIG?: KVNamespace;
};

const localRateLimit = new Map<string, number>();
const RATE_WINDOW_SECONDS = 30;

export async function validateDemoAutomationRequest(request: NextRequest, env: DemoGuardEnv | null | undefined, action: string) {
  if (env?.DEMO_MODE !== "true" && process.env.DEMO_MODE !== "true") {
    return { ok: false as const, status: 403, error: "Demo automation is disabled for this environment." };
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return { ok: false as const, status: 400, error: "Expected JSON body." };
  }

  if (body.demo !== "northstar" || body.action !== action) {
    return { ok: false as const, status: 400, error: "Request must be scoped to the Northstar demo and explicit action." };
  }

  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `rate:${action}:${ip}`;

  if (env?.COMMANDGRID_CONFIG) {
    const existing = await env.COMMANDGRID_CONFIG.get(key);
    if (existing) {
      return { ok: false as const, status: 429, error: "Demo action is rate limited. Try again shortly." };
    }
    await env.COMMANDGRID_CONFIG.put(key, "1", { expirationTtl: RATE_WINDOW_SECONDS });
  } else {
    const now = Date.now();
    const lastSeen = localRateLimit.get(key) ?? 0;
    if (now - lastSeen < RATE_WINDOW_SECONDS * 1_000) {
      return { ok: false as const, status: 429, error: "Demo action is rate limited. Try again shortly." };
    }
    localRateLimit.set(key, now);
  }

  return { ok: true as const, body };
}
