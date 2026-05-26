import { NextResponse } from "next/server";
import { smokeHyperdrive } from "@/lib/db/hyperdrive";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await smokeHyperdrive();

  return NextResponse.json(
    {
      ok: result.ok,
      configured: result.configured,
      database: result.database,
      user: result.user,
      schema: result.schema,
      error: result.ok ? undefined : result.error,
      timestamp: new Date().toISOString()
    },
    {
      status: result.ok ? 200 : 503,
      headers: {
        "cache-control": "no-store"
      }
    }
  );
}
