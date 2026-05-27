export const demoRoleSlugs = [
  "executive",
  "ops-manager",
  "engineer",
  "support-lead",
  "finance-reviewer",
  "admin"
] as const;

export type DemoRoleSlug = (typeof demoRoleSlugs)[number];

export type DemoRoleOption = {
  slug: DemoRoleSlug;
  label: string;
  persona: string;
  emphasis: string;
};

export const demoRoleOptions: DemoRoleOption[] = [
  {
    slug: "executive",
    label: "Executive",
    persona: "Maya Chen",
    emphasis: "Revenue exposure, customer impact, and board-ready status."
  },
  {
    slug: "ops-manager",
    label: "Ops Manager",
    persona: "Diego Alvarez",
    emphasis: "Incident command, SLA protection, and cross-team coordination."
  },
  {
    slug: "engineer",
    label: "Engineer",
    persona: "Priya Natarajan",
    emphasis: "Service health, logs, runbooks, and remediation planning."
  },
  {
    slug: "support-lead",
    label: "Support Lead",
    persona: "Jordan Ellis",
    emphasis: "Customer communications, escalations, and support workload."
  },
  {
    slug: "finance-reviewer",
    label: "Finance Reviewer",
    persona: "Leah Brooks",
    emphasis: "Revenue-at-risk review, credits, and approval guardrails."
  },
  {
    slug: "admin",
    label: "Admin",
    persona: "Alex Morgan",
    emphasis: "Workspace setup, policies, integrations, and role controls."
  }
];

export const defaultDemoRole: DemoRoleSlug = "ops-manager";

export function isDemoRoleSlug(value: string): value is DemoRoleSlug {
  return demoRoleSlugs.includes(value as DemoRoleSlug);
}

export function getDemoRoleOption(slug: DemoRoleSlug) {
  return demoRoleOptions.find((role) => role.slug === slug) ?? demoRoleOptions[1];
}
