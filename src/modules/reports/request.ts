import type { DemoRoleSlug } from "../roles/view-rules";
import { coerceSeededDemoUserId } from "../roles/demo-users";
import { parseDemoRole } from "../permissions/governance";

const defaultReportLimit = 25;
const maxReportLimit = 100;
const demoIdPattern = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;

export type ParsedOptionalId =
  | { ok: true; value?: string }
  | { ok: false; error: string };

export function parseReportLimit(value: string | null | undefined) {
  const parsed = Number(value ?? defaultReportLimit);
  if (!Number.isFinite(parsed)) return defaultReportLimit;
  return Math.min(maxReportLimit, Math.max(1, Math.trunc(parsed)));
}

export function reportRoleFromValues(values: Array<string | null | undefined>): DemoRoleSlug | null {
  for (const value of values) {
    const role = parseDemoRole(value);
    if (role) return role;
  }

  return null;
}

export function parseOptionalDemoId(value: unknown, field: "organizationId" | "actorUserId", prefix: "org_" | "user_"): ParsedOptionalId {
  if (value === null || value === undefined) {
    return { ok: true };
  }

  if (typeof value !== "string") {
    return { ok: false, error: `${field} must be a string.` };
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 80 || !trimmed.startsWith(prefix) || !demoIdPattern.test(trimmed)) {
    return { ok: false, error: `Invalid ${field}.` };
  }

  return { ok: true, value: trimmed };
}

export function parseOptionalDemoActorUserId(value: unknown): ParsedOptionalId {
  const parsed = parseOptionalDemoId(value, "actorUserId", "user_");
  if (!parsed.ok || !parsed.value) return parsed;

  return { ok: true, value: coerceSeededDemoUserId(parsed.value) ?? undefined };
}
