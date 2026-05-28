import { NextRequest, NextResponse } from "next/server";
import { openCommandGridDb } from "@/lib/db/server";
import { demoRoleRequestHeader } from "@/modules/demo-role/request-role-header";
import { DEFAULT_KNOWLEDGE_ORGANIZATION_ID } from "@/modules/knowledge/prompts";
import { parseOptionalDemoId, reportRoleFromValues } from "@/modules/reports/request";
import { getReport } from "@/modules/reports/service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const url = new URL(request.url);
  const role = reportRoleFromValues([url.searchParams.get("role"), request.headers.get(demoRoleRequestHeader)]);
  if (!role) {
    return NextResponse.json({ ok: false, error: "A valid demo role is required." }, { status: 403, headers: { "cache-control": "no-store" } });
  }

  const parsedOrganizationId = parseOptionalDemoId(url.searchParams.get("organizationId"), "organizationId", "org_");
  if (!parsedOrganizationId.ok) {
    return NextResponse.json({ ok: false, error: parsedOrganizationId.error }, { status: 400, headers: { "cache-control": "no-store" } });
  }

  const organizationId = parsedOrganizationId.value ?? DEFAULT_KNOWLEDGE_ORGANIZATION_ID;
  const commandGrid = await openCommandGridDb();

  try {
    const report = await getReport(commandGrid.db, id, organizationId);
    if (!report) {
      return NextResponse.json({ ok: false, error: "Report not found." }, { status: 404, headers: { "cache-control": "no-store" } });
    }

    return NextResponse.json({ ok: true, role, report }, { headers: { "cache-control": "no-store" } });
  } finally {
    await commandGrid.sql.end({ timeout: 1 });
  }
}
