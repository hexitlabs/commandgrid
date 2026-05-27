import { headers } from "next/headers";
import { AppProviders } from "@/components/layout/app-providers";
import { AppShell } from "@/components/layout/app-shell";
import { parseDemoRole } from "@/modules/demo-role/demo-role-storage";
import { demoRoleRequestHeader } from "@/modules/demo-role/request-role-header";

export default async function CommandGridLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const initialRole = parseDemoRole(requestHeaders.get(demoRoleRequestHeader));

  return (
    <AppProviders initialRole={initialRole}>
      <AppShell>{children}</AppShell>
    </AppProviders>
  );
}
