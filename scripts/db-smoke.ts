import { createCommandGridDb } from "../src/lib/db/client";
import { getDashboardMetrics } from "../src/lib/dashboard/metrics";
import { createScriptSql, getDatabaseUrl } from "./db";

const sql = createScriptSql();

try {
  const [row] = await sql<{ database: string; user: string; schema: string }[]>`
    select current_database() as database, current_user as user, current_schema() as schema
  `;

  const commandGrid = createCommandGridDb(getDatabaseUrl());
  try {
    const metrics = await getDashboardMetrics(commandGrid.db);

    console.log(
      `db=${row.database}; user=${row.user}; schema=${row.schema}; active_incident=${metrics.activeIncident.slug}; delayed_orders=${metrics.activeIncident.delayedOrders}; revenue_at_risk_cents=${metrics.activeIncident.revenueAtRiskCents}; roles=${metrics.demoWorldCounts.roles}; incidents=${metrics.demoWorldCounts.incidents}; knowledge_docs=${metrics.knowledgeCitations.documents}; snippets=${metrics.knowledgeCitations.snippets}; ok=true`
    );
  } finally {
    await commandGrid.sql.end({ timeout: 1 });
  }
} finally {
  await sql.end({ timeout: 1 });
}
