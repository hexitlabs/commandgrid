import { NextRequest, NextResponse } from "next/server";
import { openCommandGridDb } from "@/lib/db/server";
import { decideApproval, ApprovalDecisionError, GovernancePermissionError } from "@/modules/approvals/service";
import { demoRoleRequestHeader } from "@/modules/demo-role/request-role-header";

export const dynamic = "force-dynamic";

type DecisionBody = {
  role?: string;
  decision?: string;
  rationale?: string;
  organizationSlug?: string;
};

function requestIp(request: NextRequest) {
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let body: DecisionBody;

  try {
    body = (await request.json()) as DecisionBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Expected JSON body." }, { status: 400, headers: { "cache-control": "no-store" } });
  }

  if (body.decision !== "approved" && body.decision !== "rejected") {
    return NextResponse.json({ ok: false, error: "decision must be approved or rejected." }, { status: 400, headers: { "cache-control": "no-store" } });
  }

  const url = new URL(request.url);
  const selectedRole = body.role ?? request.headers.get(demoRoleRequestHeader) ?? "";
  const organizationSlug = body.organizationSlug ?? url.searchParams.get("organizationSlug") ?? undefined;
  const commandGrid = await openCommandGridDb();

  try {
    const result = await decideApproval(commandGrid.db, {
      approvalId: id,
      selectedRole,
      decision: body.decision,
      rationale: body.rationale ?? "",
      organizationSlug,
      ipAddress: requestIp(request)
    });

    return NextResponse.json(result, { status: 202, headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof GovernancePermissionError || error instanceof ApprovalDecisionError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status, headers: { "cache-control": "no-store" } });
    }

    throw error;
  } finally {
    await commandGrid.sql.end({ timeout: 1 });
  }
}
