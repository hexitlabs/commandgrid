import { DEMO_USERS } from "../../lib/demo/northstar-data";

export const seededDemoUserIds = new Set<string>(DEMO_USERS.map(([id]) => id));

export function coerceSeededDemoUserId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return seededDemoUserIds.has(trimmed) ? trimmed : null;
}
