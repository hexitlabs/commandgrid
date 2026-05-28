import { NextRequest, NextResponse } from "next/server";
import { getCommandGridCloudflareContext } from "@/lib/cloudflare/context";
import { openCommandGridDb } from "@/lib/db/server";
import { demoRoleRequestHeader } from "@/modules/demo-role/request-role-header";
import { DEFAULT_KNOWLEDGE_ORGANIZATION_ID } from "@/modules/knowledge/prompts";
import { parseOptionalDemoActorUserId, parseOptionalDemoId, parseReportLimit, reportRoleFromValues } from "@/modules/reports/request";
import { canGenerateReport, generateIncidentReport, listReports } from "@/modules/reports/service";
import { REPORT_TYPES, type ReportType } from "@/modules/reports/types";
import type { AiGenerationEnv } from "@/lib/ai/gateway";

export const dynamic = "force-dynamic";

type ReportBody = {
  reportType?: unknown;
  type?: unknown;
  incidentId?: unknown;
  organizationId?: unknown;
  actorUserId?: unknown;
  role?: unknown;
  persist?: unknown;
};

function parseReportType(value: unknown): ReportType | null {
  return typeof value === "string" && (REPORT_TYPES as readonly string[]).includes(value) ? (value as ReportType) : null;
}

function ipFromRequest(request: NextRequest) {
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

function roleFromRequest(request: NextRequest, role?: unknown) {
  return reportRoleFromValues([typeof role === "string" ? role : null, request.headers.get(demoRoleRequestHeader)]);
}

function roleRequiredResponse() {
  return NextResponse.json({ ok: false, error: "A valid demo role is required." }, { status: 403, headers: { "cache-control": "no-store" } });
}

function badRequestResponse(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400, headers: { "cache-control": "no-store" } });
}

function aiEnv(env: AiGenerationEnv | null | undefined): AiGenerationEnv {
  return {
    COMMANDGRID_AI_GATEWAY_ID: env?.COMMANDGRID_AI_GATEWAY_ID ?? process.env.COMMANDGRID_AI_GATEWAY_ID,
    COMMANDGRID_AI_GATEWAY_URL: env?.COMMANDGRID_AI_GATEWAY_URL ?? process.env.COMMANDGRID_AI_GATEWAY_URL,
    COMMANDGRID_AI_DISABLED: env?.COMMANDGRID_AI_DISABLED ?? process.env.COMMANDGRID_AI_DISABLED
  };
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const role = reportRoleFromValues([url.searchParams.get("role"), request.headers.get(demoRoleRequestHeader)]);
  if (!role) {
    return roleRequiredResponse();
  }

  const parsedOrganizationId = parseOptionalDemoId(url.searchParams.get("organizationId"), "organizationId", "org_");
  if (!parsedOrganizationId.ok) {
    return badRequestResponse(parsedOrganizationId.error);
  }

  const organizationId = parsedOrganizationId.value ?? DEFAULT_KNOWLEDGE_ORGANIZATION_ID;
  const limit = parseReportLimit(url.searchParams.get("limit"));
  const commandGrid = await openCommandGridDb();

  try {
    const items = await listReports(commandGrid.db, organizationId, limit);
    return NextResponse.json(
      {
        ok: true,
        organizationId,
        role,
        reports: items,
        capabilities: Object.fromEntries(REPORT_TYPES.map((type) => [type, { canGenerate: canGenerateReport(role, type) }]))
      },
      { headers: { "cache-control": "no-store" } }
    );
  } finally {
    await commandGrid.sql.end({ timeout: 1 });
  }
}

export async function POST(request: NextRequest) {
  let body: ReportBody;
  try {
    body = (await request.json()) as ReportBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Expected JSON body." }, { status: 400, headers: { "cache-control": "no-store" } });
  }

  const role = roleFromRequest(request, body.role);
  if (!role) {
    return roleRequiredResponse();
  }

  const reportType = parseReportType(body.reportType ?? body.type);
  if (!reportType) {
    return NextResponse.json({ ok: false, error: "Invalid reportType." }, { status: 400, headers: { "cache-control": "no-store" } });
  }

  const parsedOrganizationId = parseOptionalDemoId(body.organizationId, "organizationId", "org_");
  if (!parsedOrganizationId.ok) {
    return badRequestResponse(parsedOrganizationId.error);
  }

  const parsedActorUserId = parseOptionalDemoActorUserId(body.actorUserId);
  if (!parsedActorUserId.ok) {
    return badRequestResponse(parsedActorUserId.error);
  }

  if (!canGenerateReport(role, reportType)) {
    return NextResponse.json(
      { ok: false, error: `Role ${role} cannot generate ${reportType} reports.`, role, reportType },
      { status: 403, headers: { "cache-control": "no-store" } }
    );
  }

  const context = await getCommandGridCloudflareContext();
  const commandGrid = await openCommandGridDb();

  try {
    const report = await generateIncidentReport(commandGrid.db, aiEnv(context?.env), {
      reportType,
      incidentId: typeof body.incidentId === "string" ? body.incidentId : undefined,
      organizationId: parsedOrganizationId.value,
      actorUserId: parsedActorUserId.value ?? null,
      role,
      ipAddress: ipFromRequest(request),
      persist: typeof body.persist === "boolean" ? body.persist : true
    });

    return NextResponse.json({ ok: true, role, report }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Report generation failed.";
    return NextResponse.json({ ok: false, error: message, role, reportType }, { status: message.includes("not found") ? 404 : 500, headers: { "cache-control": "no-store" } });
  } finally {
    await commandGrid.sql.end({ timeout: 1 });
  }
}
