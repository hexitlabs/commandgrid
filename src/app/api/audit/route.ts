import { NextRequest, NextResponse } from "next/server";
import { openCommandGridDb } from "@/lib/db/server";
import { queryAuditLogs } from "@/modules/audit/queries";
import { demoRoleRequestHeader } from "@/modules/demo-role/request-role-header";
import { parseDemoRole } from "@/modules/permissions/governance";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const selectedRole = parseDemoRole(url.searchParams.get("role") ?? request.headers.get(demoRoleRequestHeader));

  if (!selectedRole) {
    return NextResponse.json({ ok: false, error: "Invalid or missing demo role." }, { status: 403, headers: { "cache-control": "no-store" } });
  }

  const commandGrid = await openCommandGridDb();

  try {
    const result = await queryAuditLogs(commandGrid.db, {
      actorUserId: url.searchParams.get("actorUserId") ?? undefined,
      actorRole: parseDemoRole(url.searchParams.get("actorRole")) ?? undefined,
      action: url.searchParams.get("action") ?? undefined,
      actionType: url.searchParams.get("actionType") ?? undefined,
      incidentId: url.searchParams.get("incidentId") ?? undefined,
      targetType: url.searchParams.get("targetType") ?? undefined,
      targetId: url.searchParams.get("targetId") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      outcome: url.searchParams.get("outcome") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      limit: Number(url.searchParams.get("limit") ?? 50)
    });

    return NextResponse.json({ ok: true, role: selectedRole, ...result }, { headers: { "cache-control": "no-store" } });
  } finally {
    await commandGrid.sql.end({ timeout: 1 });
  }
}
