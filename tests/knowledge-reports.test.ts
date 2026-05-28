import { describe, expect, it } from "vitest";
import { KNOWLEDGE_DOCUMENTS } from "../src/lib/demo/northstar-data";
import { DEMO_COPILOT_PROMPTS } from "../src/modules/knowledge/prompts";
import { rankKnowledgeRows, repairAnswerCitations, validateCitationIds } from "../src/modules/knowledge/retrieval";
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
});

describe("report generation authorization contract", () => {
  it("allows expected demo roles to generate scoped report types", () => {
    expect(canGenerateReport("ops-manager", "postmortem")).toBe(true);
    expect(canGenerateReport("admin", "customer-impact")).toBe(true);
    expect(canGenerateReport("executive", "executive-summary")).toBe(true);
    expect(canGenerateReport("support-lead", "customer-impact")).toBe(true);
    expect(canGenerateReport("engineer", "executive-summary")).toBe(false);
    expect(canGenerateReport("finance-reviewer", "postmortem")).toBe(false);
  });
});
