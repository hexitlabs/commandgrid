"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { StatusBadge } from "@/components/ui/status-badge";
import { primaryNavigation, plannedNavigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useDemoRole } from "@/modules/demo-role/demo-role-provider";
import { RoleSwitcher } from "@/modules/demo-role/role-switcher";
import { type ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { role } = useDemoRole();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_28rem),linear-gradient(135deg,#f8fafc_0%,#eef3f8_48%,#f8fafc_100%)] text-slate-950 dark:bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.13),transparent_28rem),linear-gradient(135deg,#05070b_0%,#0f172a_50%,#080b12_100%)] dark:text-white">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] grid-cols-1 lg:grid-cols-[19rem_1fr]">
        <aside className="border-b border-slate-200/80 bg-white/70 px-4 py-4 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/55 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div className="flex items-center justify-between gap-4 lg:block">
            <Link href="/" className="group flex items-center gap-3" aria-label="CommandGrid home">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition group-hover:-translate-y-0.5 dark:bg-white dark:text-slate-950">CG</span>
              <span>
                <span className="block text-base font-semibold tracking-tight text-slate-950 dark:text-white">CommandGrid</span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">AI Ops Command Center</span>
              </span>
            </Link>
            <div className="lg:hidden">
              <ThemeToggle />
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Workspace</p>
                <p className="mt-2 font-semibold text-slate-950 dark:text-white">Northstar Logistics</p>
              </div>
              <StatusBadge status="Demo" tone="active" />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">Warehouse API latency spike · 312 delayed orders · $48,200 revenue at risk.</p>
          </div>

          <nav className="mt-6 space-y-6" aria-label="CommandGrid navigation">
            <div>
              <p className="px-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Live now</p>
              <div className="mt-3 grid gap-1">
                {primaryNavigation.map((item) => {
                  const isActive = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href ?? "#");
                  return (
                    <Link
                      key={item.label}
                      href={item.href ?? "/"}
                      className={cn(
                        "rounded-2xl px-3 py-3 text-sm transition focus:outline-none focus:ring-4 focus:ring-blue-500/10",
                        isActive
                          ? "bg-slate-950 text-white shadow-lg shadow-slate-950/10 dark:bg-white dark:text-slate-950"
                          : "text-slate-600 hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                      )}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-semibold">{item.label}</span>
                        <span className="text-[0.65rem] font-bold uppercase tracking-[0.16em] opacity-70">{item.status}</span>
                      </span>
                      <span className="mt-1 block text-xs leading-5 opacity-75">{item.description}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="px-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Roadmap modules</p>
              <div className="mt-3 grid gap-1">
                {plannedNavigation.map((item) => (
                  <div key={item.label} className="rounded-2xl px-3 py-3 text-sm text-slate-500 dark:text-slate-400" aria-disabled="true">
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{item.label}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-slate-500 dark:bg-white/10 dark:text-slate-300">{item.phase}</span>
                    </span>
                    <span className="mt-1 block text-xs leading-5">{item.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/75 px-4 py-4 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/65 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-300">Public demo · visible role: {role.label}</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">Northstar Logistics command center</h1>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between xl:justify-end">
                <RoleSwitcher />
                <div className="hidden lg:block">
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
