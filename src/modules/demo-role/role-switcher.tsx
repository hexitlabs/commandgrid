"use client";

import { usePathname, useRouter } from "next/navigation";
import { demoRoleOptions, type DemoRoleSlug } from "@/modules/demo-role/demo-role-config";
import { useDemoRole } from "@/modules/demo-role/demo-role-provider";

export function RoleSwitcher() {
  const { roleSlug, role, setRoleSlug } = useDemoRole();
  const pathname = usePathname();
  const router = useRouter();

  const updateRole = (nextRole: DemoRoleSlug) => {
    setRoleSlug(nextRole);

    const params = new URLSearchParams(window.location.search);
    params.set("role", nextRole);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <label className="grid gap-2 text-left">
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Public demo role</span>
      <select
        className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:hover:border-white/20"
        value={roleSlug}
        onChange={(event) => updateRole(event.target.value as DemoRoleSlug)}
        aria-label="Switch public demo role"
      >
        {demoRoleOptions.map((option) => (
          <option key={option.slug} value={option.slug}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="text-xs leading-5 text-slate-500 dark:text-slate-400">
        Viewing as <strong className="font-semibold text-slate-800 dark:text-slate-100">{role.label}</strong> · {role.persona}
      </span>
    </label>
  );
}
