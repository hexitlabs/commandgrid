import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { demoRoleRequestHeader } from "../src/modules/demo-role/request-role-header";

const openCommandGridDbMock = vi.hoisted(() => vi.fn());
const getCommandGridCloudflareContextMock = vi.hoisted(() => vi.fn());
const listReportsMock = vi.hoisted(() => vi.fn());
const getReportMock = vi.hoisted(() => vi.fn());
const generateIncidentReportMock = vi.hoisted(() => vi.fn());
const canGenerateReportMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/server", () => ({
  openCommandGridDb: openCommandGridDbMock
}));

vi.mock("@/lib/cloudflare/context", () => ({
  getCommandGridCloudflareContext: getCommandGridCloudflareContextMock
}));

vi.mock("@/modules/reports/service", () => ({
  canGenerateReport: canGenerateReportMock,
  generateIncidentReport: generateIncidentReportMock,
  getReport: getReportMock,
  listReports: listReportsMock
}));

const { GET: listReports } = await import("../src/app/api/reports/route");
const { POST: createReport } = await import("../src/app/api/reports/route");
const { GET: readReport } = await import("../src/app/api/reports/[id]/route");

function request(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init);
}

async function json(response: Response) {
  return (await response.json()) as { ok: boolean; error?: string };
}

describe("reports API route safety", () => {
  beforeEach(() => {
    openCommandGridDbMock.mockReset();
    getCommandGridCloudflareContextMock.mockReset();
    listReportsMock.mockReset();
    getReportMock.mockReset();
    generateIncidentReportMock.mockReset();
    canGenerateReportMock.mockReset();
    canGenerateReportMock.mockReturnValue(false);
  });

  it("rejects report list reads without a valid demo role before opening the DB", async () => {
    const missingRole = await listReports(request("http://localhost/api/reports"));
    expect(missingRole.status).toBe(403);
    expect(await json(missingRole)).toMatchObject({ ok: false, error: "A valid demo role is required." });

    const invalidRole = await listReports(request("http://localhost/api/reports?role=workspace-owner"));
    expect(invalidRole.status).toBe(403);
    expect(await json(invalidRole)).toMatchObject({ ok: false, error: "A valid demo role is required." });
    expect(openCommandGridDbMock).not.toHaveBeenCalled();
  });

  it("rejects report detail reads without a valid demo role before opening the DB", async () => {
    const response = await readReport(request("http://localhost/api/reports/report_123?role=bad-role"), { params: Promise.resolve({ id: "report_123" }) });

    expect(response.status).toBe(403);
    expect(await json(response)).toMatchObject({ ok: false, error: "A valid demo role is required." });
    expect(openCommandGridDbMock).not.toHaveBeenCalled();
  });

  it("uses a valid header role when query role is invalid", async () => {
    const end = vi.fn();
    const db = { tag: "db" };
    listReportsMock.mockResolvedValue([]);
    openCommandGridDbMock.mockResolvedValue({ db, sql: { end } });

    const response = await listReports(
      request("http://localhost/api/reports?role=workspace-owner", { headers: { [demoRoleRequestHeader]: "executive" } })
    );
    const payload = (await response.json()) as { ok: boolean; role: string };

    expect(response.status).toBe(200);
    expect(payload.role).toBe("executive");
    expect(listReportsMock).toHaveBeenCalledWith(db, "org_northstar_logistics", 25);
    expect(end).toHaveBeenCalledWith({ timeout: 1 });
  });

  it("clamps report list limits before querying", async () => {
    const end = vi.fn();
    const db = { tag: "db" };
    listReportsMock.mockResolvedValue([]);
    openCommandGridDbMock.mockResolvedValue({ db, sql: { end } });

    const response = await listReports(request("http://localhost/api/reports?limit=999", { headers: { [demoRoleRequestHeader]: "executive" } }));

    expect(response.status).toBe(200);
    expect(listReportsMock).toHaveBeenCalledWith(db, "org_northstar_logistics", 100);
    expect(end).toHaveBeenCalledWith({ timeout: 1 });
  });

  it("rejects invalid organization ids on read routes before opening the DB", async () => {
    const headers = { [demoRoleRequestHeader]: "executive" };
    const listResponse = await listReports(request("http://localhost/api/reports?organizationId=../secrets", { headers }));
    expect(listResponse.status).toBe(400);
    expect(await json(listResponse)).toMatchObject({ ok: false, error: "Invalid organizationId." });

    const detailResponse = await readReport(request("http://localhost/api/reports/report_123?organizationId=tenant-x", { headers }), {
      params: Promise.resolve({ id: "report_123" })
    });
    expect(detailResponse.status).toBe(400);
    expect(await json(detailResponse)).toMatchObject({ ok: false, error: "Invalid organizationId." });
    expect(openCommandGridDbMock).not.toHaveBeenCalled();
  });

  it("rejects report generation without a valid demo role before side effects", async () => {
    const response = await createReport(
      request("http://localhost/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reportType: "postmortem" })
      })
    );

    expect(response.status).toBe(403);
    expect(await json(response)).toMatchObject({ ok: false, error: "A valid demo role is required." });
    expect(getCommandGridCloudflareContextMock).not.toHaveBeenCalled();
    expect(openCommandGridDbMock).not.toHaveBeenCalled();
  });

  it("uses a valid header role when body role is invalid", async () => {
    const end = vi.fn();
    const db = { tag: "db" };
    canGenerateReportMock.mockReturnValue(true);
    generateIncidentReportMock.mockResolvedValue({ id: "report_123", role: "ops-manager" });
    getCommandGridCloudflareContextMock.mockResolvedValue(null);
    openCommandGridDbMock.mockResolvedValue({ db, sql: { end } });

    const response = await createReport(
      request("http://localhost/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json", [demoRoleRequestHeader]: "ops-manager" },
        body: JSON.stringify({ reportType: "postmortem", role: "bad-role" })
      })
    );

    expect(response.status).toBe(200);
    expect(canGenerateReportMock).toHaveBeenCalledWith("ops-manager", "postmortem");
    expect(generateIncidentReportMock).toHaveBeenCalledWith(
      db,
      expect.any(Object),
      expect.objectContaining({ role: "ops-manager" })
    );
    expect(end).toHaveBeenCalledWith({ timeout: 1 });
  });

  it("coerces valid-looking unknown actor user ids to null before FK-backed writes", async () => {
    const end = vi.fn();
    const db = { tag: "db" };
    canGenerateReportMock.mockReturnValue(true);
    generateIncidentReportMock.mockResolvedValue({ id: "report_123", role: "ops-manager" });
    getCommandGridCloudflareContextMock.mockResolvedValue(null);
    openCommandGridDbMock.mockResolvedValue({ db, sql: { end } });

    const response = await createReport(
      request("http://localhost/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json", [demoRoleRequestHeader]: "ops-manager" },
        body: JSON.stringify({ reportType: "postmortem", actorUserId: "user_valid_but_not_seeded" })
      })
    );

    expect(response.status).toBe(200);
    expect(generateIncidentReportMock).toHaveBeenCalledWith(
      db,
      expect.any(Object),
      expect.objectContaining({ actorUserId: null, role: "ops-manager" })
    );
    expect(end).toHaveBeenCalledWith({ timeout: 1 });
  });

  it("rejects bad organization and actor user ids before report generation side effects", async () => {
    const headers = { "content-type": "application/json", [demoRoleRequestHeader]: "ops-manager" };
    const badOrg = await createReport(
      request("http://localhost/api/reports", {
        method: "POST",
        headers,
        body: JSON.stringify({ reportType: "postmortem", organizationId: "bad org", actorUserId: "user_diego_alvarez" })
      })
    );
    expect(badOrg.status).toBe(400);
    expect(await json(badOrg)).toMatchObject({ ok: false, error: "Invalid organizationId." });

    const badUser = await createReport(
      request("http://localhost/api/reports", {
        method: "POST",
        headers,
        body: JSON.stringify({ reportType: "postmortem", organizationId: "org_northstar_logistics", actorUserId: "../user" })
      })
    );
    expect(badUser.status).toBe(400);
    expect(await json(badUser)).toMatchObject({ ok: false, error: "Invalid actorUserId." });
    expect(getCommandGridCloudflareContextMock).not.toHaveBeenCalled();
    expect(openCommandGridDbMock).not.toHaveBeenCalled();
  });
});
