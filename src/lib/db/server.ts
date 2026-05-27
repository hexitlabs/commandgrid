import { getCommandGridCloudflareContext } from "@/lib/cloudflare/context";
import { createCommandGridDb } from "@/lib/db/client";

function readLocalDatabaseUrl() {
  return typeof process !== "undefined" ? process.env.DATABASE_URL : undefined;
}

export async function openCommandGridDb() {
  const context = await getCommandGridCloudflareContext();
  const connectionString = context?.env.COMMANDGRID_DB?.connectionString ?? readLocalDatabaseUrl();

  if (!connectionString) {
    throw new Error("CommandGrid database is not configured. Set DATABASE_URL locally or COMMANDGRID_DB in Cloudflare.");
  }

  return createCommandGridDb(connectionString);
}
