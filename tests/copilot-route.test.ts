import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DEFAULT_COPILOT_RETRIEVAL_LIMIT, MAX_COPILOT_RETRIEVAL_LIMIT } from "../src/modules/knowledge/limits";

const openCommandGridDbMock = vi.hoisted(() => vi.fn());
const getCommandGridCloudflareContextMock = vi.hoisted(() => vi.fn());
const askKnowledgeCopilotMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/server", () => ({
  openCommandGridDb: openCommandGridDbMock
}));

vi.mock("@/lib/cloudflare/context", () => ({
  getCommandGridCloudflareContext: getCommandGridCloudflareContextMock
}));

vi.mock("@/modules/knowledge/service", () => ({
  askKnowledgeCopilot: askKnowledgeCopilotMock,
  demoCopilotPrompts: vi.fn(() => [])
}));

const { POST: askCopilot } = await import("../src/app/api/copilot/route");

function request(body: Record<string, unknown>, ip: string) {
  return new NextRequest("http://localhost/api/copilot", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": ip },
    body: JSON.stringify(body)
  });
}

async function askWithLimit(limit: unknown, index: number) {
  const end = vi.fn();
  const db = { tag: `db_${index}` };
  const commandGridConfig = { get: vi.fn().mockResolvedValue(null), put: vi.fn().mockResolvedValue(undefined) };
  getCommandGridCloudflareContextMock.mockResolvedValue({ env: { COMMANDGRID_CONFIG: commandGridConfig } });
  openCommandGridDbMock.mockResolvedValue({ db, sql: { end } });
  askKnowledgeCopilotMock.mockResolvedValue({ ok: true, answer: "ok" });

  const body: Record<string, unknown> = { question: "What caused the warehouse API delays?" };
  if (limit !== undefined) body.limit = limit;

  const response = await askCopilot(request(body, `203.0.113.${index}`));
  expect(response.status).toBe(200);
  expect(end).toHaveBeenCalledWith({ timeout: 1 });
  return askKnowledgeCopilotMock.mock.calls.at(-1)?.[2] as { limit: number };
}

describe("copilot API route limit safety", () => {
  beforeEach(() => {
    openCommandGridDbMock.mockReset();
    getCommandGridCloudflareContextMock.mockReset();
    askKnowledgeCopilotMock.mockReset();
  });

  it("clamps and defaults retrieval limits before asking the service", async () => {
    await expect(askWithLimit(undefined, 1)).resolves.toMatchObject({ limit: DEFAULT_COPILOT_RETRIEVAL_LIMIT });
    await expect(askWithLimit(0, 2)).resolves.toMatchObject({ limit: 1 });
    await expect(askWithLimit(-10, 3)).resolves.toMatchObject({ limit: 1 });
    await expect(askWithLimit(3.9, 4)).resolves.toMatchObject({ limit: 3 });
    await expect(askWithLimit(10_000, 5)).resolves.toMatchObject({ limit: MAX_COPILOT_RETRIEVAL_LIMIT });
  });
});
