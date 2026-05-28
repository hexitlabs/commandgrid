"use server";

import { getCommandGridCloudflareContext } from "@/lib/cloudflare/context";
import { openCommandGridDb } from "@/lib/db/server";
import type { AiGenerationEnv } from "@/lib/ai/gateway";
import { parseDemoRole } from "@/modules/permissions/governance";
import { askKnowledgeCopilot } from "./service";

function aiEnv(env: AiGenerationEnv | null | undefined): AiGenerationEnv {
  return {
    COMMANDGRID_AI_GATEWAY_ID: env?.COMMANDGRID_AI_GATEWAY_ID ?? process.env.COMMANDGRID_AI_GATEWAY_ID,
    COMMANDGRID_AI_GATEWAY_URL: env?.COMMANDGRID_AI_GATEWAY_URL ?? process.env.COMMANDGRID_AI_GATEWAY_URL,
    COMMANDGRID_AI_DISABLED: env?.COMMANDGRID_AI_DISABLED ?? process.env.COMMANDGRID_AI_DISABLED
  };
}

export async function askKnowledgeCopilotAction(input: { question: string; role?: string }) {
  const question = input.question.trim();
  if (question.length < 3) {
    return { ok: false as const, error: "Question must be at least 3 characters." };
  }

  const commandGrid = await openCommandGridDb();
  const context = await getCommandGridCloudflareContext();

  try {
    return await askKnowledgeCopilot(commandGrid.db, aiEnv(context?.env), {
      question,
      role: parseDemoRole(input.role) ?? "ops-manager"
    });
  } finally {
    await commandGrid.sql.end({ timeout: 1 });
  }
}
