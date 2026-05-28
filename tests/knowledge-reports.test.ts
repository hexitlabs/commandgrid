import { describe, expect, it } from "vitest";
import { KNOWLEDGE_DOCUMENTS } from "../src/lib/demo/northstar-data";
import type { CommandGridDbLike } from "../src/lib/db/client";
import { DEMO_COPILOT_PROMPTS } from "../src/modules/knowledge/prompts";
import { rankKnowledgeRows, repairAnswerCitations, validateCitationIds, type KnowledgeRow } from "../src/modules/knowledge/retrieval";
import { askKnowledgeCopilot, DEMO_FALLBACK_ANSWERS } from "../src/modules/knowledge/service";
import { parseReportLimit, reportRoleFromValues } from "../src/modules/reports/request";
import { canGenerateReport } from "../src/modules/reports/service";

function seededKnowledgeRows() {
  return KNOWLEDGE_DOCUMENTS.map(([documentId, sourceId, , title, documentType, content, citationLabel, citationUri, version]) => ({
    snippetId: `snippet_${documentId}_primary`,
    documentId,
    sourceId,
    sourceName: sourceId === "ksrc_github" ? "Engineering GitHub" : sourceId === "ksrc_drive" ? "Northstar Drive" : "Northstar Confluence",
    sourceType: sourceId === "ksrc_github" ? "repository" : sourceId === "ksrc_drive" ? "document-store" : "wiki",
    title,
    documentType,
    documentContent: content,
    documentLabel: citationLabel,
    documentUri: citationUri,
    version,
    excerpt: content,
    snippetLabel: citationLabel,
    snippetUri: citationUri
  }));
}

function seededKnowledgeSnippetRows(): KnowledgeRow[] {
  return KNOWLEDGE_DOCUMENTS.flatMap(([documentId, sourceId, , title, documentType, content, citationLabel, citationUri, version], index) => [
    {
      snippetId: `snippet_${documentId}_primary`,
      documentId,
      sourceId,
      sourceName: sourceId === "ksrc_github" ? "Engineering GitHub" : sourceId === "ksrc_drive" ? "Northstar Drive" : "Northstar Confluence",
      sourceType: sourceId === "ksrc_github" ? "repository" : sourceId === "ksrc_drive" ? "document-store" : "wiki",
      title,
      documentType,
      documentContent: content,
      documentLabel: citationLabel,
      documentUri: citationUri,
      version,
      excerpt: content,
      snippetLabel: citationLabel,
      snippetUri: citationUri
    },
    {
      snippetId: `snippet_${documentId}_operational`,
      documentId,
      sourceId,
      sourceName: sourceId === "ksrc_github" ? "Engineering GitHub" : sourceId === "ksrc_drive" ? "Northstar Drive" : "Northstar Confluence",
      sourceType: sourceId === "ksrc_github" ? "repository" : sourceId === "ksrc_drive" ? "document-store" : "wiki",
      title,
      documentType,
      documentContent: content,
      documentLabel: citationLabel,
      documentUri: citationUri,
      version,
      excerpt: `Operational citation ${index + 1}: ${title} is available for incident copilot grounding and report evidence.`,
      snippetLabel: `${citationLabel}#op`,
      snippetUri: `${citationUri}#operational-note`
    }
  ]);
}

function answerCitationLabels(answer: string) {
  return Array.from(answer.matchAll(/\[([^\]]+)\]/g), (match) => match[1]);
}

function createKnowledgeOnlyDb(rows: KnowledgeRow[]) {
  return {
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          innerJoin: () => ({
            where: async () => rows
          })
        })
      })
    }),
    insert: () => ({
      values: () => ({
        onConflictDoNothing: async () => undefined
      })
    })
  } as unknown as CommandGridDbLike;
}

const expectedFallbackCitationLabels: Record<string, string[]> = {
  "warehouse-root-cause": ["RUN-WH-API-004", "ENG-WMS-117"],
  "ops-next-action": ["OPS-BUF-006", "RUN-WH-API-004"],
  "support-comms": ["SUP-COMMS-002", "TPL-PIR-001"],
  "finance-credit-threshold": ["FIN-CRED-009", "TPL-PIR-001"],
  "executive-impact": ["RUN-WH-API-004", "OPS-BUF-006", "SUP-COMMS-002", "FIN-CRED-009"]
};

describe("knowledge retrieval and citations", () => {
  it("returns deterministic top citations for the five demo copilot prompts", () => {
    const rows = seededKnowledgeRows();

    for (const prompt of DEMO_COPILOT_PROMPTS) {
      const first = rankKnowledgeRows(rows, prompt.prompt, 4);
      const second = rankKnowledgeRows(rows, prompt.prompt, 4);

      expect(first.length).toBeGreaterThan(0);
      expect(second.map((match) => match.citation.id)).toEqual(first.map((match) => match.citation.id));
      expect(first.every((match) => match.citation.sourceId.startsWith("ksrc_"))).toBe(true);
      expect(first.every((match) => KNOWLEDGE_DOCUMENTS.some(([documentId]) => documentId === match.citation.documentId))).toBe(true);
    }
  });

  it("repairs unknown AI citations while retaining seeded source citations", () => {
    const citations = rankKnowledgeRows(seededKnowledgeRows(), "warehouse connection pool root cause", 3).map((match) => match.citation);
    const repaired = repairAnswerCitations("Pool saturation is supported [ENG-WMS-117] [FAKE-SOURCE-999].", citations);

    expect(repaired).toContain("[ENG-WMS-117]");
    expect(repaired).not.toContain("FAKE-SOURCE-999");
    expect(validateCitationIds(citations, ["ENG-WMS-117", "missing-source"])).toEqual(["ENG-WMS-117"]);
  });

  it("retains every declared fallback citation for the five service-level demo answers", async () => {
    const db = createKnowledgeOnlyDb(seededKnowledgeSnippetRows());

    for (const prompt of DEMO_COPILOT_PROMPTS) {
      const result = await askKnowledgeCopilot(db, { COMMANDGRID_AI_DISABLED: "true" }, { question: prompt.prompt, role: prompt.role, actorUserId: null });
      const expectedLabels = expectedFallbackCitationLabels[prompt.id];

      expect(DEMO_FALLBACK_ANSWERS[prompt.id]?.citationLabels).toEqual(expectedLabels);
      expect(result.ai.mode).toBe("fallback");
      expect(result.matchedPromptId).toBe(prompt.id);
      expect(result.citations.map((citation) => citation.label)).toEqual(expectedLabels);
      expect(answerCitationLabels(result.answer)).toEqual(expectedLabels);
    }
  });
});

describe("report request helpers and authorization contract", () => {
  it("parses report roles and limits defensively", () => {
    expect(reportRoleFromValues(["support-lead", "executive"], "ops-manager")).toBe("support-lead");
    expect(reportRoleFromValues(["not-a-role", "executive"], "ops-manager")).toBe("executive");
    expect(reportRoleFromValues([null, null], "ops-manager")).toBe("ops-manager");
    expect(parseReportLimit(null)).toBe(25);
    expect(parseReportLimit("0")).toBe(1);
    expect(parseReportLimit("250")).toBe(100);
    expect(parseReportLimit("12.8")).toBe(12);
    expect(parseReportLimit("not-a-number")).toBe(25);
  });

  it("allows expected demo roles to generate scoped report types", () => {
    expect(canGenerateReport("ops-manager", "postmortem")).toBe(true);
    expect(canGenerateReport("admin", "customer-impact")).toBe(true);
    expect(canGenerateReport("executive", "executive-summary")).toBe(true);
    expect(canGenerateReport("support-lead", "customer-impact")).toBe(true);
    expect(canGenerateReport("engineer", "executive-summary")).toBe(false);
    expect(canGenerateReport("finance-reviewer", "postmortem")).toBe(false);
  });
});
