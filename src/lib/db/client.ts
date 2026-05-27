import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function createPostgresClient(connectionString: string) {
  return postgres(connectionString, { max: 1, prepare: false });
}

export function createCommandGridDb(connectionString: string) {
  const sql = createPostgresClient(connectionString);

  return {
    sql,
    db: drizzle(sql, { schema })
  };
}

export type CommandGridDb = ReturnType<typeof createCommandGridDb>["db"];
export type CommandGridTransaction = Parameters<Parameters<CommandGridDb["transaction"]>[0]>[0];
export type CommandGridDbLike = CommandGridDb | CommandGridTransaction;
