import "dotenv/config";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", override: false });
config({ path: ".env", override: false });

export function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  return databaseUrl;
}

export function createScriptSql() {
  return postgres(getDatabaseUrl(), { max: 1, prepare: false });
}
