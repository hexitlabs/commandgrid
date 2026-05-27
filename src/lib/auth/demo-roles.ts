import { and, eq } from "drizzle-orm";
import type { CommandGridDb } from "@/lib/db/client";
import { permissions, rolePermissions, roles } from "@/lib/db/schema";

export const DEMO_ROLE_SLUGS = [
  "executive",
  "ops-manager",
  "engineer",
  "support-lead",
  "finance-reviewer",
  "admin"
] as const;

export type DemoRoleSlug = (typeof DEMO_ROLE_SLUGS)[number];

export const DEMO_ROLE_LABELS: Record<DemoRoleSlug, string> = {
  executive: "Executive",
  "ops-manager": "Ops Manager",
  engineer: "Engineer",
  "support-lead": "Support Lead",
  "finance-reviewer": "Finance Reviewer",
  admin: "Admin"
};

export function isDemoRoleSlug(value: string): value is DemoRoleSlug {
  return DEMO_ROLE_SLUGS.includes(value as DemoRoleSlug);
}

export async function getDemoRolePermissions(db: CommandGridDb, roleSlug: DemoRoleSlug, organizationId: string) {
  return db
    .select({
      roleSlug: roles.slug,
      permissionSlug: permissions.slug,
      permissionName: permissions.name,
      category: permissions.category
    })
    .from(roles)
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(and(eq(roles.organizationId, organizationId), eq(roles.slug, roleSlug), eq(roles.isPublicDemoRole, true)))
    .orderBy(permissions.category, permissions.slug);
}

export async function roleHasPermission(
  db: CommandGridDb,
  roleSlug: DemoRoleSlug,
  organizationId: string,
  permissionSlug: string
) {
  const [match] = await db
    .select({ id: permissions.id })
    .from(roles)
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(
      and(
        eq(roles.organizationId, organizationId),
        eq(roles.slug, roleSlug),
        eq(roles.isPublicDemoRole, true),
        eq(permissions.slug, permissionSlug)
      )
    )
    .limit(1);

  return Boolean(match);
}
