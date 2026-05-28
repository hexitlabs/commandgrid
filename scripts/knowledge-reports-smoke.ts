import { count, eq, like } from "drizzle-orm";
import { createCommandGridDb } from "../src/lib/db/client";
import { auditLogs, reports } from "../src/lib/db/schema";
import { seedNorthstarDemo } from "../src/lib/demo/northstar-seed";
import { DEMO_COPILOT_PROMPTS } from "../src/modules/knowledge/prompts";
import { askKnowledgeCopilot } from "../src/modules/knowledge/service";
import { generateIncidentReport, getReport } from "../src/modules/reports/service";
import type { ReportType } from "../src/modules/reports/types";
import { createScriptSql, getDatabaseUrl } from "./db";

const commandGrid = createCommandGridDb(getDatabaseUrl());
const reportTypes: ReportType[] = ["postmortem", "executive-summary", "customer-impact"];

async function resetDemoData() {
  const sql = createScriptSql();
  try {
    await seedNorthstarDemo(sql, { resetExisting: true });
  } finally {
    await sql.end({ timeout: 1 });
  }
}

function assertCitationIntegrity(label: string, citations: Array<{ id: string; snippetId: string; documentId: string; sourceId: string }>) {
  if (citations.length === 0) {
    throw new Error(`${label}: expected at least one citation.`);
  }

  for (const citation of citations) {
    if (!citation.id || !citation.snippetId.startsWith("snippet_kdoc_") || !citation.documentId.startsWith("kdoc_") || !citation.sourceId.startsWith("ksrc_")) {
      throw new Error(`${label}: invalid seeded citation mapping ${JSON.stringify(citation)}`);
    }
  }
}

try {
  await resetDemoData();

  for (const prompt of DEMO_COPILOT_PROMPTS) {
    const result = await askKnowledgeCopilot(commandGrid.db, { COMMANDGRID_AI_DISABLED: "true" }, { question: prompt.prompt, role: prompt.role, actorUserId: null });
    if (!result.answer || result.ai.mode !== "fallback" || result.matchedPromptId !== prompt.id) {
      throw new Error(`copilot ${prompt.id}: fallback answer did not match expected prompt.`);
    }
    assertCitationIntegrity(`copilot ${prompt.id}`, result.citations);
  }

  const generatedReportIds: string[] = [];
  for (const reportType of reportTypes) {
    const role = reportType === "executive-summary" ? "executive" : reportType === "customer-impact" ? "support-lead" : "ops-manager";
    const report = await generateIncidentReport(commandGrid.db, { COMMANDGRID_AI_DISABLED: "true" }, { reportType, role, actorUserId: null });
    if (!report.persisted || !report.markdown.includes("# ") || report.ai.mode !== "fallback") {
      throw new Error(`report ${reportType}: expected persisted fallback markdown report.`);
    }
    assertCitationIntegrity(`report ${reportType}`, report.citations);
    generatedReportIds.push(report.id);

    const persisted = await getReport(commandGrid.db, report.id, report.organizationId);
    if (!persisted || persisted.id !== report.id || typeof persisted.metadata.markdown !== "string") {
      throw new Error(`report ${reportType}: persisted report is not readable.`);
    }
  }

  const [reportCount] = await commandGrid.db.select({ value: count() }).from(reports).where(like(reports.id, "report_phase7a_%"));
  const [copilotAuditCount] = await commandGrid.db.select({ value: count() }).from(auditLogs).where(eq(auditLogs.action, "copilot.asked"));
  const [reportAuditCount] = await commandGrid.db.select({ value: count() }).from(auditLogs).where(eq(auditLogs.action, "report.generated"));

  if ((reportCount?.value ?? 0) < reportTypes.length) {
    throw new Error(`expected at least ${reportTypes.length} Phase 7A reports, found ${reportCount?.value ?? 0}`);
  }
  if ((copilotAuditCount?.value ?? 0) < DEMO_COPILOT_PROMPTS.length || (reportAuditCount?.value ?? 0) < reportTypes.length) {
    throw new Error("expected copilot/report audit writes to be present.");
  }

  console.log(
    `knowledge_reports_smoke ok=true prompts=${DEMO_COPILOT_PROMPTS.length} reports=${generatedReportIds.length} citations=valid audits=copilot:${copilotAuditCount?.value ?? 0},reports:${reportAuditCount?.value ?? 0}`
  );
} finally {
  await commandGrid.sql.end({ timeout: 1 });
  await resetDemoData();
}
