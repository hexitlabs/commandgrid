import { getRoleViewRule, isDemoRoleSlug, type DemoRoleSlug } from "@/modules/roles/view-rules";

export function resolveRoleParam(value: string | string[] | undefined): DemoRoleSlug {
  const candidate = Array.isArray(value) ? value[0] : value;
  return isDemoRoleSlug(candidate) ? candidate : "ops-manager";
}

export function resolveRoleView(value: string | string[] | undefined) {
  return getRoleViewRule(resolveRoleParam(value));
}
