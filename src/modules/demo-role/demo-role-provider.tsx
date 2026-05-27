"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  defaultDemoRole,
  getDemoRoleOption,
  type DemoRoleOption,
  type DemoRoleSlug
} from "@/modules/demo-role/demo-role-config";
import { parseDemoRole, persistDemoRole, readStoredDemoRole } from "@/modules/demo-role/demo-role-storage";

type DemoRoleContextValue = {
  roleSlug: DemoRoleSlug;
  role: DemoRoleOption;
  setRoleSlug: (role: DemoRoleSlug) => void;
};

const DemoRoleContext = createContext<DemoRoleContextValue | null>(null);

export function DemoRoleProvider({ children }: { children: ReactNode }) {
  const [roleSlug, setRoleSlugState] = useState<DemoRoleSlug>(defaultDemoRole);

  useEffect(() => {
    const urlRole = new URLSearchParams(window.location.search).get("role");
    setRoleSlugState(urlRole ? parseDemoRole(urlRole) : readStoredDemoRole(window.localStorage));
  }, []);

  const value = useMemo<DemoRoleContextValue>(() => {
    const setRoleSlug = (nextRole: DemoRoleSlug) => {
      setRoleSlugState(nextRole);
      persistDemoRole(window.localStorage, nextRole);
    };

    return {
      roleSlug,
      role: getDemoRoleOption(roleSlug),
      setRoleSlug
    };
  }, [roleSlug]);

  return <DemoRoleContext.Provider value={value}>{children}</DemoRoleContext.Provider>;
}

export function useDemoRole() {
  const context = useContext(DemoRoleContext);

  if (!context) {
    throw new Error("useDemoRole must be used within DemoRoleProvider");
  }

  return context;
}
