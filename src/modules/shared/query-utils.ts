import { eq } from "drizzle-orm";
import type { CommandGridDb } from "../../lib/db/client";
import { organizations } from "../../lib/db/schema";

export const DEFAULT_ORGANIZATION_SLUG = "northstar-logistics";

export function centsToDollars(cents: number) {
  return cents / 100;
}

export function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function metadataRecord(value: Record<string, unknown> | null | undefined) {
  return value ?? {};
}

export async function getOrganizationOrThrow(db: CommandGridDb, organizationSlug = DEFAULT_ORGANIZATION_SLUG) {
  const [organization] = await db.select().from(organizations).where(eq(organizations.slug, organizationSlug)).limit(1);

  if (!organization) {
    throw new Error(`Organization not found: ${organizationSlug}`);
  }

  return organization;
}

export function readNumberMetadata(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function readStringArrayMetadata(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}
