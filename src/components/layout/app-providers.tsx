"use client";

import { type ReactNode } from "react";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { DemoRoleProvider } from "@/modules/demo-role/demo-role-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <DemoRoleProvider>{children}</DemoRoleProvider>
    </ThemeProvider>
  );
}
