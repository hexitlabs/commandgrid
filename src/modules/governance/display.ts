import type { DemoRoleSlug } from "@/modules/roles/view-rules";

export const governanceRoleLabels: Record<DemoRoleSlug, string> = {
  executive: "Executive",
  "ops-manager": "Ops Manager",
  engineer: "Engineer",
  "support-lead": "Support Lead",
  "finance-reviewer": "Finance Reviewer",
  admin: "Admin"
};

export function governanceRoleLabel(role: DemoRoleSlug | string | null | undefined) {
  return role && role in governanceRoleLabels ? governanceRoleLabels[role as DemoRoleSlug] : "System";
}

export function humanizeGovernanceValue(value: string | null | undefined) {
  if (!value) return "—";
  return value
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function governanceStatusTone(status: string | null | undefined) {
  if (!status) return "neutral" as const;
  if (["approved", "completed", "resolved", "implemented", "resumed"].includes(status)) return "healthy" as const;
  if (["rejected", "blocked", "stopped", "failed", "active"].includes(status)) return "active" as const;
  if (["pending", "requested", "queued", "started"].includes(status)) return "pending" as const;
  if (["simulated", "generated", "recorded", "review"].includes(status)) return "degraded" as const;
  return "neutral" as const;
}

export function summarizeCount(count: number, singular: string, plural = `${singular}s`) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(count)} ${count === 1 ? singular : plural}`;
}
