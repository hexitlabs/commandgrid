import { NextResponse } from "next/server";
import { smokeAiGateway } from "@/lib/ai/gateway";
import { getCommandGridCloudflareContext } from "@/lib/cloudflare/context";

export const dynamic = "force-dynamic";

type HealthPayload = {
  ok: true;
  service: "commandgrid";
  phase: "01-infrastructure-foundation";
  runtime: "cloudflare-workers-opennext";
  environment: string;
  demoMode: boolean;
  bindings: {
    hyperdrive: boolean;
    kv: boolean;
    r2: boolean;
    queue: boolean;
    aiGateway: boolean;
  };
  aiGateway: ReturnType<typeof smokeAiGateway>;
  timestamp: string;
};

export async function GET() {
  const context = await getCommandGridCloudflareContext();
  const env = context?.env ?? {};

  const payload: HealthPayload = {
    ok: true,
    service: "commandgrid",
    phase: "01-infrastructure-foundation",
    runtime: "cloudflare-workers-opennext",
    environment: env.ENVIRONMENT ?? process.env.NODE_ENV ?? "unknown",
    demoMode: env.DEMO_MODE === "true" || process.env.DEMO_MODE === "true",
    bindings: {
      hyperdrive: Boolean(env.COMMANDGRID_DB),
      kv: Boolean(env.COMMANDGRID_CONFIG),
      r2: Boolean(env.COMMANDGRID_REPORTS),
      queue: Boolean(env.COMMANDGRID_EVENTS),
      aiGateway: Boolean(env.COMMANDGRID_AI_GATEWAY_ID)
    },
    aiGateway: smokeAiGateway({ COMMANDGRID_AI_GATEWAY_ID: env.COMMANDGRID_AI_GATEWAY_ID }),
    timestamp: new Date().toISOString()
  };

  return NextResponse.json(payload, {
    headers: {
      "cache-control": "no-store"
    }
  });
}
