import "dotenv/config";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", override: false });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is not configured");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1, prepare: false });

try {
  const [row] = await sql<{ database: string; user: string; schema: string }[]>`
    select current_database() as database, current_user as user, current_schema() as schema
  `;

  console.log(`db=${row.database}; user=${row.user}; schema=${row.schema}; ok=true`);
} finally {
  await sql.end({ timeout: 1 });
}
