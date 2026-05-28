import { generateWithAiGateway, type AiGenerationEnv, type AiGenerationResult } from "../../lib/ai/gateway";
import type { CommandGridDbLike } from "../../lib/db/client";
import { writeAuditLog } from "../audit/service";
import { getRoleViewRule, type DemoRoleSlug } from "../roles/view-rules";
import { DEMO_COPILOT_PROMPTS, DEFAULT_KNOWLEDGE_ORGANIZATION_ID, matchDemoPrompt, roleForPrompt } from "./prompts";
import { repairAnswerCitations, searchKnowledge } from "./retrieval";
import type { CopilotAskInput, CopilotAskResult, KnowledgeCitation } from "./types";

export type CopilotEnv = AiGenerationEnv;

type DemoFallback = {
  answer: string;
  citationLabels: string[];
};

const fallbackAnswers: Record<string, DemoFallback> = {
  "warehouse-root-cause": {
    answer:
      "The strongest supported cause is Warehouse API connection-pool saturation during the pick-wave surge. The runbook says to check p95 latency, queue depth, Postgres saturation, and autoscaling before buffer mode, and the engineering note says each regional pool is capped at 90 connections with brownout protection above 250ms pool wait. [RUN-WH-API-004] [ENG-WMS-117]",
    citationLabels: ["RUN-WH-API-004", "ENG-WMS-117"]
  },
  "ops-next-action": {
    answer:
      "Ops should use regional buffer mode as the safest mitigation while engineering stabilizes the pool. Buffer mode queues route assignments locally and replays only after Warehouse API p95 remains below 500ms for ten minutes, which reduces customer-promise risk without inventing an unapproved fix. [OPS-BUF-006] [RUN-WH-API-004]",
    citationLabels: ["OPS-BUF-006", "RUN-WH-API-004"]
  },
  "support-comms": {
    answer:
      "Support should publish proactive customer updates every 30 minutes during the SEV1/SEV2 incident, using confirmed facts only. The post-incident template also expects customer communications and timeline evidence to be captured for follow-up. [SUP-COMMS-002] [TPL-PIR-001]",
    citationLabels: ["SUP-COMMS-002", "TPL-PIR-001"]
  },
  "finance-credit-threshold": {
    answer:
      "Finance review is required when platinum accounts exceed $25,000 aggregate exposure or any manual credit is over $2,500. For this incident, the $48,200 revenue-at-risk context means credits should stay governed rather than being issued ad hoc. [FIN-CRED-009] [TPL-PIR-001]",
    citationLabels: ["FIN-CRED-009", "TPL-PIR-001"]
  },
  "executive-impact": {
    answer:
      "Executive brief: the active Warehouse API incident is delaying route assignments, with seeded demo impact of 312 delayed orders and $48,200 revenue at risk. Mitigation centers on buffer mode while engineering addresses connection-pool saturation, with customer updates every 30 minutes and finance governance for any proactive credits. [RUN-WH-API-004] [OPS-BUF-006] [SUP-COMMS-002] [FIN-CRED-009]",
    citationLabels: ["RUN-WH-API-004", "OPS-BUF-006", "SUP-COMMS-002", "FIN-CRED-009"]
  }
};

const genericFallback =
  "I found relevant Northstar knowledge sources, but the question is outside the five curated demo prompts. Based only on retrieved sources, review the attached citations and use the operational owner for final action.";

function stableId(prefix: string, values: Array<string | null | undefined>, now = new Date()) {
  const input = values.filter(Boolean).join("|");
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return `${prefix}_${now.getTime().toString(36)}_${hash.toString(36)}`;
}

function citationsByPreferredLabels(citations: KnowledgeCitation[], labels: string[]) {
  const byLabel = new Map(citations.map((citation) => [citation.label, citation]));
  const selected = labels.map((label) => byLabel.get(label)).filter((citation): citation is KnowledgeCitation => Boolean(citation));
  return selected.length > 0 ? selected : citations.slice(0, 4);
}

function fallbackForQuestion(question: string, citations: KnowledgeCitation[]) {
  const prompt = matchDemoPrompt(question);
  if (prompt) {
    const fallback = fallbackAnswers[prompt.id];
    return {
      prompt,
      answer: fallback.answer,
      citations: citationsByPreferredLabels(citations, fallback.citationLabels)
    };
  }

  return {
    prompt,
    answer: citations.length > 0 ? `${genericFallback}\n\nSources: ${citations.slice(0, 4).map((citation) => `[${citation.label}]`).join(" ")}` : "No seeded Northstar source matched that question closely enough to answer safely.",
    citations: citations.slice(0, 4)
  };
}

function contextForPrompt(citations: KnowledgeCitation[]) {
  return citations
    .map(
      (citation, index) =>
        `${index + 1}. id=${citation.id}; label=${citation.label}; documentId=${citation.documentId}; sourceId=${citation.sourceId}; title=${citation.title}; excerpt=${citation.excerpt}`
    )
    .join("\n");
}

async function generateCopilotAnswer(env: CopilotEnv, question: string, role: DemoRoleSlug, citations: KnowledgeCitation[], fallback: string): Promise<AiGenerationResult> {
  const roleRule = getRoleViewRule(role);
  return generateWithAiGateway(env, {
    system:
      "You are CommandGrid Knowledge Copilot. Answer only from supplied Northstar source excerpts. Cite using only bracketed citation labels present in the context, never unknown ids. If evidence is insufficient, say so.",
    prompt: `Role: ${roleRule.label}\nRole focus: ${roleRule.emphasis}\nQuestion: ${question}\nAllowed citations:\n${contextForPrompt(citations)}\n\nWrite a concise enterprise answer with citations in square brackets.`,
    fallback,
    timeoutMs: 2_000,
    retries: 0
  });
}

export function demoCopilotPrompts(role?: DemoRoleSlug) {
  return role ? DEMO_COPILOT_PROMPTS.filter((prompt) => prompt.role === role || role === "admin") : DEMO_COPILOT_PROMPTS;
}

export async function askKnowledgeCopilot(db: CommandGridDbLike, env: CopilotEnv = {}, input: CopilotAskInput): Promise<CopilotAskResult> {
  const organizationId = input.organizationId ?? DEFAULT_KNOWLEDGE_ORGANIZATION_ID;
  const question = input.question.trim();
  const search = await searchKnowledge(db, { query: question, organizationId, limit: input.limit ?? 6 });
  const fallback = fallbackForQuestion(question, search.citations);
  const role = input.role ?? roleForPrompt(fallback.prompt?.id, "executive");
  const answerCitations = fallback.citations;
  const ai = await generateCopilotAnswer(env, question, role, answerCitations, fallback.answer);
  const answer = repairAnswerCitations(ai.text, answerCitations);
  const now = new Date();
  const targetId = stableId("copilot_query", [organizationId, question, role], now);

  await writeAuditLog(db, {
    id: stableId("audit_copilot", [targetId], now),
    organizationId,
    actorUserId: input.actorUserId ?? null,
    action: "copilot.asked",
    targetType: "knowledge_query",
    targetId,
    occurredAt: now,
    ipAddress: input.ipAddress ?? null,
    metadata: {
      question,
      role,
      matchedPromptId: fallback.prompt?.id,
      citationIds: answerCitations.map((citation) => citation.id),
      citationLabels: answerCitations.map((citation) => citation.label),
      aiMode: ai.mode,
      aiAttempts: ai.attempts,
      retrievalMatchCount: search.matches.length
    }
  });

  return {
    ok: true,
    question,
    role,
    answer,
    citations: answerCitations,
    matchedPromptId: fallback.prompt?.id,
    retrieval: {
      matchCount: search.matches.length,
      topScore: search.matches[0]?.score ?? 0
    },
    ai: {
      mode: ai.mode,
      attempts: ai.attempts,
      error: ai.error
    }
  };
}
