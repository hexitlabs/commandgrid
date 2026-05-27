import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getRoleViewRule, type DemoRoleSlug } from "@/modules/roles/view-rules";

export function GovernanceRoleBanner({ role, context }: { role: DemoRoleSlug; context: "approvals" | "audit" | "incident" }) {
  const roleView = getRoleViewRule(role);
  const contextCopy = {
    approvals: "Approval decisions are enforced by server-side governance. This page only mirrors whether the selected demo-mode role can decide.",
    audit: "Audit access uses the selected demo-mode governance role for visibility context. Records are append-only summaries; raw secrets and log dumps are not rendered.",
    incident: "Incident links preserve the selected demo-mode governance role so approval and audit routes can re-check permissions on the server."
  } satisfies Record<typeof context, string>;

  return (
    <Card className="border-blue-200/80 bg-blue-50/75 dark:border-blue-400/20 dark:bg-blue-400/10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <CardHeader className="mb-0 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status="Demo-mode governance role" tone="active" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-200">Not secure auth</span>
          </div>
          <CardTitle>{roleView.label} governance view</CardTitle>
          <CardDescription>{roleView.persona} · {roleView.emphasis}</CardDescription>
        </CardHeader>
        <p className="max-w-xl text-sm leading-6 text-slate-700 dark:text-slate-200">{contextCopy[context]}</p>
      </div>
    </Card>
  );
}
