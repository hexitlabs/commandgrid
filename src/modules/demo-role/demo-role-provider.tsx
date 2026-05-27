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
  isRoleReady: boolean;
  setRoleSlug: (role: DemoRoleSlug) => void;
};

const DemoRoleContext = createContext<DemoRoleContextValue | null>(null);

export function DemoRoleProvider({ children, initialRole = defaultDemoRole }: { children: ReactNode; initialRole?: DemoRoleSlug }) {
  const [roleSlug, setRoleSlugState] = useState<DemoRoleSlug>(initialRole);
  const [isRoleReady, setIsRoleReady] = useState(false);

  useEffect(() => {
    const syncRoleFromUrl = () => {
      const urlRole = new URLSearchParams(window.location.search).get("role");
      const nextRole = urlRole ? parseDemoRole(urlRole) : readStoredDemoRole(window.localStorage);

      setRoleSlugState(nextRole);
      if (urlRole) {
        persistDemoRole(window.localStorage, nextRole);
      }
      setIsRoleReady(true);
    };

    syncRoleFromUrl();
    window.addEventListener("popstate", syncRoleFromUrl);

    return () => window.removeEventListener("popstate", syncRoleFromUrl);
  }, []);

  const value = useMemo<DemoRoleContextValue>(() => {
    const setRoleSlug = (nextRole: DemoRoleSlug) => {
      setRoleSlugState(nextRole);
      persistDemoRole(window.localStorage, nextRole);
    };

    return {
      roleSlug,
      role: getDemoRoleOption(roleSlug),
      isRoleReady,
      setRoleSlug
    };
  }, [isRoleReady, roleSlug]);

  return <DemoRoleContext.Provider value={value}>{children}</DemoRoleContext.Provider>;
}

export function useDemoRole() {
  const context = useContext(DemoRoleContext);

  if (!context) {
    throw new Error("useDemoRole must be used within DemoRoleProvider");
  }

  return context;
}
