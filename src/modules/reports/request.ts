import type { DemoRoleSlug } from "../roles/view-rules";
import { parseDemoRole } from "../permissions/governance";

const defaultReportLimit = 25;
const maxReportLimit = 100;

export function parseReportLimit(value: string | null | undefined) {
  const parsed = Number(value ?? defaultReportLimit);
  if (!Number.isFinite(parsed)) return defaultReportLimit;
  return Math.min(maxReportLimit, Math.max(1, Math.trunc(parsed)));
}

export function reportRoleFromValues(values: Array<string | null | undefined>, fallback: DemoRoleSlug): DemoRoleSlug {
  for (const value of values) {
    const role = parseDemoRole(value);
    if (role) return role;
  }

  return fallback;
}
