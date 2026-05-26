import postgres from "postgres";
import { getCommandGridCloudflareContext } from "@/lib/cloudflare/context";

export type DbSmokeResult = {
  configured: boolean;
  ok: boolean;
  database?: string;
  user?: string;
  schema?: string;
  error?: string;
};

export async function smokeHyperdrive(): Promise<DbSmokeResult> {
  const context = await getCommandGridCloudflareContext();
  const connectionString = context?.env.COMMANDGRID_DB?.connectionString;

  if (!connectionString) {
    return { configured: false, ok: false, error: "COMMANDGRID_DB Hyperdrive binding is not configured" };
  }

  const sql = postgres(connectionString, { max: 1, prepare: false });

  try {
    const [row] = await sql<{ database: string; user: string; schema: string }[]>`
      select current_database() as database, current_user as user, current_schema() as schema
    `;

    return {
      configured: true,
      ok: true,
      database: row?.database,
      user: row?.user,
      schema: row?.schema
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      error: error instanceof Error ? error.message : "Unknown database smoke error"
    };
  } finally {
    await sql.end({ timeout: 1 });
  }
}
