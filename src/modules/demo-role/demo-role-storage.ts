import { defaultDemoRole, isDemoRoleSlug, type DemoRoleSlug } from "./demo-role-config";

export const demoRoleStorageKey = "commandgrid.demoRole";

type DemoRoleStorage = Pick<Storage, "getItem" | "setItem">;

export function parseDemoRole(value: string | null | undefined): DemoRoleSlug {
  return value && isDemoRoleSlug(value) ? value : defaultDemoRole;
}

export function readStoredDemoRole(storage: DemoRoleStorage | undefined): DemoRoleSlug {
  if (!storage) {
    return defaultDemoRole;
  }

  try {
    return parseDemoRole(storage.getItem(demoRoleStorageKey));
  } catch {
    return defaultDemoRole;
  }
}

export function persistDemoRole(storage: DemoRoleStorage | undefined, role: DemoRoleSlug) {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(demoRoleStorageKey, role);
  } catch {
    // Local storage can be unavailable in private or embedded contexts; the UI state still updates in memory.
  }
}
