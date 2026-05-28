import { eq } from "drizzle-orm";
import type { CommandGridDbLike } from "../../lib/db/client";
import { knowledgeDocuments, knowledgeSnippets, knowledgeSources } from "../../lib/db/schema";
import { DEFAULT_KNOWLEDGE_ORGANIZATION_ID, matchDemoPrompt } from "./prompts";
import type { KnowledgeCitation, KnowledgeSearchResult } from "./types";

export type KnowledgeRow = {
  snippetId: string;
  documentId: string;
  sourceId: string;
  sourceName: string;
  sourceType: string;
  title: string;
  documentType: string;
  documentContent: string;
  documentLabel: string;
  documentUri: string;
  version: string;
  excerpt: string;
  snippetLabel: string;
  snippetUri: string;
};

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "give",
  "how",
  "in",
  "is",
  "it",
  "me",
  "of",
  "on",
  "or",
  "should",
  "the",
  "this",
  "to",
  "what",
  "when",
  "with"
]);

const demoBoosts: Record<string, string[]> = {
  "warehouse-root-cause": ["kdoc_warehouse_latency_runbook", "kdoc_wms_connection_pool", "kdoc_buffer_mode_sop", "kdoc_order_router_slo"],
  "ops-next-action": ["kdoc_buffer_mode_sop", "kdoc_warehouse_latency_runbook", "kdoc_wms_connection_pool", "kdoc_order_router_slo"],
  "support-comms": ["kdoc_incident_comms_playbook", "kdoc_post_incident_template", "kdoc_buffer_mode_sop"],
  "finance-credit-threshold": ["kdoc_customer_credit_matrix", "kdoc_post_incident_template", "kdoc_incident_comms_playbook"],
  "executive-impact": ["kdoc_warehouse_latency_runbook", "kdoc_order_router_slo", "kdoc_customer_credit_matrix", "kdoc_incident_comms_playbook"]
};

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !stopWords.has(token));
}

function countMatches(tokens: string[], text: string, weight: number) {
  const normalized = text.toLowerCase();
  return tokens.reduce((score, token) => score + (normalized.includes(token) ? weight : 0), 0);
}

function citationFromRow(row: KnowledgeRow): KnowledgeCitation {
  return {
    id: row.snippetId,
    snippetId: row.snippetId,
    documentId: row.documentId,
    sourceId: row.sourceId,
    label: row.snippetLabel,
    title: row.title,
    sourceName: row.sourceName,
    sourceType: row.sourceType,
    documentType: row.documentType,
    uri: row.snippetUri,
    excerpt: row.excerpt,
    version: row.version
  };
}

export function rankKnowledgeRows(rows: KnowledgeRow[], query: string, limit = 5): KnowledgeSearchResult["matches"] {
  const tokens = tokenize(query);
  const prompt = matchDemoPrompt(query);
  const boosts = prompt ? demoBoosts[prompt.id] ?? [] : [];

  return rows
    .map((row) => {
      const score =
        countMatches(tokens, row.title, 8) +
        countMatches(tokens, row.documentType, 5) +
        countMatches(tokens, row.documentContent, 4) +
        countMatches(tokens, row.excerpt, 6) +
        countMatches(tokens, `${row.documentLabel} ${row.snippetLabel} ${row.sourceName} ${row.sourceType}`, 3) +
        (boosts.includes(row.documentId) ? 30 - boosts.indexOf(row.documentId) * 3 : 0) +
        (row.snippetId.endsWith("_primary") ? 2 : 0);

      return { score, citation: citationFromRow(row) };
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || a.citation.documentId.localeCompare(b.citation.documentId) || a.citation.snippetId.localeCompare(b.citation.snippetId))
    .slice(0, limit);
}

export async function loadKnowledgeRows(db: CommandGridDbLike, organizationId = DEFAULT_KNOWLEDGE_ORGANIZATION_ID): Promise<KnowledgeRow[]> {
  return db
    .select({
      snippetId: knowledgeSnippets.id,
      documentId: knowledgeDocuments.id,
      sourceId: knowledgeSources.id,
      sourceName: knowledgeSources.name,
      sourceType: knowledgeSources.sourceType,
      title: knowledgeDocuments.title,
      documentType: knowledgeDocuments.documentType,
      documentContent: knowledgeDocuments.content,
      documentLabel: knowledgeDocuments.citationLabel,
      documentUri: knowledgeDocuments.citationUri,
      version: knowledgeDocuments.version,
      excerpt: knowledgeSnippets.excerpt,
      snippetLabel: knowledgeSnippets.citationLabel,
      snippetUri: knowledgeSnippets.citationUri
    })
    .from(knowledgeSnippets)
    .innerJoin(knowledgeDocuments, eq(knowledgeSnippets.documentId, knowledgeDocuments.id))
    .innerJoin(knowledgeSources, eq(knowledgeDocuments.sourceId, knowledgeSources.id))
    .where(eq(knowledgeDocuments.organizationId, organizationId));
}

export async function searchKnowledge(
  db: CommandGridDbLike,
  input: { query: string; organizationId?: string; limit?: number }
): Promise<KnowledgeSearchResult> {
  const organizationId = input.organizationId ?? DEFAULT_KNOWLEDGE_ORGANIZATION_ID;
  const rows = await loadKnowledgeRows(db, organizationId);
  const matches = rankKnowledgeRows(rows, input.query, input.limit ?? 5);

  return {
    query: input.query,
    organizationId,
    matches,
    citations: matches.map((match) => match.citation)
  };
}

export function validateCitationIds(citations: KnowledgeCitation[], requestedIds: string[]) {
  const valid = new Set(citations.flatMap((citation) => [citation.id, citation.snippetId, citation.documentId, citation.sourceId, citation.label]));
  return requestedIds.filter((id) => valid.has(id));
}

export function repairAnswerCitations(answer: string, citations: KnowledgeCitation[]) {
  const known = new Set(citations.flatMap((citation) => [citation.id, citation.snippetId, citation.documentId, citation.sourceId, citation.label]));
  const citationPattern = /\[([^\]]+)\]/g;
  let repaired = answer.replace(citationPattern, (match, id: string) => (known.has(id.trim()) ? match : ""));
  repaired = repaired.replace(/\s+([.,;:])/g, "$1").replace(/ {2,}/g, " ").trim();

  if (citations.length > 0 && !citations.some((citation) => repaired.includes(`[${citation.label}]`) || repaired.includes(`[${citation.id}]`))) {
    repaired = `${repaired}\n\nSources: ${citations.slice(0, 4).map((citation) => `[${citation.label}]`).join(" ")}`;
  }

  return repaired;
}
