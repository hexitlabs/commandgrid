import type { DemoRoleSlug } from "../roles/view-rules";
import type { AiGenerationResult } from "../../lib/ai/gateway";

export type KnowledgeCitation = {
  id: string;
  snippetId: string;
  documentId: string;
  sourceId: string;
  label: string;
  title: string;
  sourceName: string;
  sourceType: string;
  documentType: string;
  uri: string;
  excerpt: string;
  version: string;
};

export type KnowledgeSearchResult = {
  query: string;
  organizationId: string;
  matches: Array<{
    score: number;
    citation: KnowledgeCitation;
  }>;
  citations: KnowledgeCitation[];
};

export type CopilotPrompt = {
  id: string;
  label: string;
  prompt: string;
  role: DemoRoleSlug;
};

export type CopilotAskInput = {
  question: string;
  organizationId?: string;
  role?: DemoRoleSlug;
  actorUserId?: string | null;
  limit?: number;
  ipAddress?: string | null;
};

export type CopilotAskResult = {
  ok: true;
  question: string;
  role: DemoRoleSlug;
  answer: string;
  citations: KnowledgeCitation[];
  matchedPromptId?: string;
  retrieval: {
    matchCount: number;
    topScore: number;
  };
  ai: Pick<AiGenerationResult, "mode" | "attempts" | "error">;
};
