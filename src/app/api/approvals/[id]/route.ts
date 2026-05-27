import { NextRequest, NextResponse } from "next/server";
import { openCommandGridDb } from "@/lib/db/server";
import { getApprovalDetail } from "@/modules/approvals/queries";
import { demoRoleRequestHeader } from "@/modules/demo-role/request-role-header";
import { parseDemoRole } from "@/modules/permissions/governance";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const role = parseDemoRole(url.searchParams.get("role") ?? request.headers.get(demoRoleRequestHeader));

  if (!role) {
    return NextResponse.json({ ok: false, error: "Invalid or missing demo role." }, { status: 403, headers: { "cache-control": "no-store" } });
  }

  const commandGrid = await openCommandGridDb();

  try {
    const approval = await getApprovalDetail(commandGrid.db, id, { role });
    if (!approval) {
      return NextResponse.json({ ok: false, error: "Approval not found or not relevant to selected role." }, { status: 404, headers: { "cache-control": "no-store" } });
    }

    return NextResponse.json({ ok: true, role, approval }, { headers: { "cache-control": "no-store" } });
  } finally {
    await commandGrid.sql.end({ timeout: 1 });
  }
}
