export type NavigationItem = {
  label: string;
  description: string;
  href?: string;
  status: "live" | "showcase" | "planned";
  phase: string;
};

export const primaryNavigation: NavigationItem[] = [
  {
    label: "Dashboard",
    description: "Operational health, business impact, approvals, and trend signals.",
    href: "/dashboard",
    status: "live",
    phase: "Phase 4"
  },
  {
    label: "Incidents",
    description: "Timeline, impact, response owners, and customer status.",
    href: "/incidents",
    status: "live",
    phase: "Phase 4"
  },
  {
    label: "Approvals",
    description: "Governed decision queue and human-in-the-loop controls.",
    href: "/approvals",
    status: "live",
    phase: "Phase 6"
  },
  {
    label: "Audit",
    description: "Sanitized approval, workflow, and incident audit trail.",
    href: "/audit",
    status: "live",
    phase: "Phase 6"
  },
  {
    label: "Command Center",
    description: "Phase 3 shell and Northstar incident overview.",
    href: "/",
    status: "showcase",
    phase: "Phase 3"
  },
  {
    label: "Design System",
    description: "Reusable shell primitives for future phases.",
    href: "/design-system",
    status: "showcase",
    phase: "Phase 3"
  }
];

export const plannedNavigation: NavigationItem[] = [
  {
    label: "Autonomous Agents",
    description: "Runbooks, investigation tasks, and governed remediation.",
    status: "planned",
    phase: "Phase 5"
  },
  {
    label: "Knowledge Copilot",
    description: "Cited answers from runbooks, logs, tickets, and reports.",
    status: "planned",
    phase: "Phase 7"
  },
  {
    label: "Reports",
    description: "Executive summaries and post-incident review.",
    status: "planned",
    phase: "Phase 7"
  },
  {
    label: "Admin",
    description: "Workspace roles, integrations, policies, and configuration.",
    status: "planned",
    phase: "Phase 8"
  }
];
