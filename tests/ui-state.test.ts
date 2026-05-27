import { describe, expect, it } from "vitest";
import { demoRoleOptions } from "../src/modules/demo-role/demo-role-config";
import { demoRoleStorageKey, parseDemoRole, persistDemoRole, readStoredDemoRole } from "../src/modules/demo-role/demo-role-storage";
import { resolveInitialTheme, themeStorageKey } from "../src/modules/theme/theme-storage";

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    dump: () => Object.fromEntries(values)
  };
}

describe("demo role state", () => {
  it("exposes every public Northstar demo role", () => {
    expect(demoRoleOptions.map((role) => role.label)).toEqual([
      "Executive",
      "Ops Manager",
      "Engineer",
      "Support Lead",
      "Finance Reviewer",
      "Admin"
    ]);
  });

  it("falls back to Ops Manager for unknown stored roles", () => {
    expect(parseDemoRole("not-a-role")).toBe("ops-manager");
    expect(readStoredDemoRole(createStorage({ [demoRoleStorageKey]: "executive" }))).toBe("executive");
  });

  it("persists selected role values", () => {
    const storage = createStorage();

    persistDemoRole(storage, "finance-reviewer");

    expect(storage.dump()).toMatchObject({ [demoRoleStorageKey]: "finance-reviewer" });
  });
});

describe("theme state", () => {
  it("prefers stored theme over system preference", () => {
    expect(resolveInitialTheme(createStorage({ [themeStorageKey]: "light" }), { matches: true })).toBe("light");
  });

  it("falls back to the system dark preference when no stored theme exists", () => {
    expect(resolveInitialTheme(createStorage(), { matches: true })).toBe("dark");
    expect(resolveInitialTheme(createStorage(), { matches: false })).toBe("light");
  });
});
