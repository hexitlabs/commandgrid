import { seedNorthstarDemo } from "../src/lib/demo/northstar-seed";
import { createScriptSql } from "./db";

const sql = createScriptSql();

try {
  const result = await seedNorthstarDemo(sql, { resetExisting: true });
  console.log(
    `seeded organization=${result.organizationSlug}; flagship=${result.flagshipIncidentSlug}; roles=${result.roles}; historical_incidents=${result.historicalIncidents}; knowledge_docs=${result.knowledgeDocuments}; support_tickets=${result.supportTickets}; system_logs=${result.systemLogs}; ok=true`
  );
} finally {
  await sql.end({ timeout: 1 });
}
