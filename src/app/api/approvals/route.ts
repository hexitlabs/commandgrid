import { NextRequest, NextResponse } from "next/server";
import { openCommandGridDb } from "@/lib/db/server";
import { demoRoleRequestHeader } from "@/modules/demo-role/request-role-header";
import { getApprovalQueue } from "@/modules/approvals/queries";
import { parseDemoRole } from "@/modules/permissions/governance";

export const dynamic = "force-dynamic";

function roleFromRequest(request: NextRequest) {
  const url = new URL(request.url);
  return url.searchParams.get("role") ?? request.headers.get(demoRoleRequestHeader);
}

export async function GET(request: NextRequest) {
  const role = parseDemoRole(roleFromRequest(request));
  if (!role) {
    return NextResponse.json({ ok: false, error: "Invalid or missing demo role." }, { status: 403, headers: { "cache-control": "no-store" } });
  }

  const url = new URL(request.url);
  const commandGrid = await openCommandGridDb();

  try {
    const approvals = await getApprovalQueue(commandGrid.db, {
      role,
      status: (url.searchParams.get("status") as "pending" | "approved" | "rejected" | "cancelled" | "all" | null) ?? "pending",
      limit: Number(url.searchParams.get("limit") ?? 50)
    });

    return NextResponse.json({ ok: true, role, approvals }, { headers: { "cache-control": "no-store" } });
  } finally {
    await commandGrid.sql.end({ timeout: 1 });
  }
}
