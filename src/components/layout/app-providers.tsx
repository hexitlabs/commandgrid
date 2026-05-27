"use client";

import { type ReactNode } from "react";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { DemoRoleProvider } from "@/modules/demo-role/demo-role-provider";
import type { DemoRoleSlug } from "@/modules/demo-role/demo-role-config";

export function AppProviders({ children, initialRole }: { children: ReactNode; initialRole: DemoRoleSlug }) {
  return (
    <ThemeProvider>
      <DemoRoleProvider initialRole={initialRole}>{children}</DemoRoleProvider>
    </ThemeProvider>
  );
}
