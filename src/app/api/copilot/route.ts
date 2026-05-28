import { NextRequest, NextResponse } from "next/server";
import { getCommandGridCloudflareContext } from "@/lib/cloudflare/context";
import { openCommandGridDb } from "@/lib/db/server";
import { demoRoleRequestHeader } from "@/modules/demo-role/request-role-header";
import { demoCopilotPrompts, askKnowledgeCopilot } from "@/modules/knowledge/service";
import { DEFAULT_KNOWLEDGE_ORGANIZATION_ID } from "@/modules/knowledge/prompts";
import { parseDemoRole } from "@/modules/permissions/governance";
import type { AiGenerationEnv } from "@/lib/ai/gateway";

export const dynamic = "force-dynamic";

const localRateLimit = new Map<string, number>();
const RATE_WINDOW_SECONDS = 10;

type CopilotBody = {
  question?: unknown;
  role?: unknown;
  organizationId?: unknown;
  actorUserId?: unknown;
  limit?: unknown;
};

function ipFromRequest(request: NextRequest) {
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

async function rateLimit(request: NextRequest) {
  const context = await getCommandGridCloudflareContext();
  const ip = ipFromRequest(request);
  const key = `rate:copilot:${ip}`;

  if (context?.env.COMMANDGRID_CONFIG) {
    const existing = await context.env.COMMANDGRID_CONFIG.get(key);
    if (existing) return { ok: false as const, status: 429, error: "Copilot is rate limited. Try again shortly.", context };
    await context.env.COMMANDGRID_CONFIG.put(key, "1", { expirationTtl: RATE_WINDOW_SECONDS });
    return { ok: true as const, context, ip };
  }

  const now = Date.now();
  const lastSeen = localRateLimit.get(key) ?? 0;
  if (now - lastSeen < RATE_WINDOW_SECONDS * 1_000) {
    return { ok: false as const, status: 429, error: "Copilot is rate limited. Try again shortly.", context };
  }
  localRateLimit.set(key, now);
  return { ok: true as const, context, ip };
}

function roleFromRequest(request: NextRequest, bodyRole?: unknown) {
  return parseDemoRole(typeof bodyRole === "string" ? bodyRole : null) ?? parseDemoRole(request.headers.get(demoRoleRequestHeader)) ?? "executive";
}

function aiEnv(env: AiGenerationEnv | null | undefined): AiGenerationEnv {
  return {
    COMMANDGRID_AI_GATEWAY_ID: env?.COMMANDGRID_AI_GATEWAY_ID ?? process.env.COMMANDGRID_AI_GATEWAY_ID,
    COMMANDGRID_AI_GATEWAY_URL: env?.COMMANDGRID_AI_GATEWAY_URL ?? process.env.COMMANDGRID_AI_GATEWAY_URL,
    COMMANDGRID_AI_DISABLED: env?.COMMANDGRID_AI_DISABLED ?? process.env.COMMANDGRID_AI_DISABLED
  };
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const role = parseDemoRole(url.searchParams.get("role") ?? request.headers.get(demoRoleRequestHeader)) ?? undefined;
  return NextResponse.json(
    {
      ok: true,
      organizationId: DEFAULT_KNOWLEDGE_ORGANIZATION_ID,
      prompts: demoCopilotPrompts(role),
      roleBehavior: {
        role: role ?? "all",
        citationsRequired: true,
        aiFallback: "deterministic safe fallback when AI Gateway is disabled or fails"
      }
    },
    { headers: { "cache-control": "no-store" } }
  );
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request);
  if (!limited.ok) {
    return NextResponse.json({ ok: false, error: limited.error }, { status: limited.status, headers: { "cache-control": "no-store" } });
  }

  let body: CopilotBody;
  try {
    body = (await request.json()) as CopilotBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Expected JSON body." }, { status: 400, headers: { "cache-control": "no-store" } });
  }

  if (typeof body.question !== "string" || body.question.trim().length < 3) {
    return NextResponse.json({ ok: false, error: "Question must be at least 3 characters." }, { status: 400, headers: { "cache-control": "no-store" } });
  }

  const commandGrid = await openCommandGridDb();
  try {
    const result = await askKnowledgeCopilot(commandGrid.db, aiEnv(limited.context?.env), {
      question: body.question,
      role: roleFromRequest(request, body.role),
      organizationId: typeof body.organizationId === "string" ? body.organizationId : undefined,
      actorUserId: typeof body.actorUserId === "string" ? body.actorUserId : null,
      limit: typeof body.limit === "number" ? body.limit : undefined,
      ipAddress: limited.ip
    });

    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } finally {
    await commandGrid.sql.end({ timeout: 1 });
  }
}
