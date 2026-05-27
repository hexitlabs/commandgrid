export type NavigationItem = {
  label: string;
  description: string;
  href?: string;
  status: "live" | "showcase" | "planned";
  phase: string;
};

export const primaryNavigation: NavigationItem[] = [
  {
    label: "Command Center",
    description: "Northstar incident overview and operating picture.",
    href: "/",
    status: "live",
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
    label: "Incidents",
    description: "Timeline, impact, response owners, and customer status.",
    status: "planned",
    phase: "Phase 4"
  },
  {
    label: "Autonomous Agents",
    description: "Runbooks, investigation tasks, and governed remediation.",
    status: "planned",
    phase: "Phase 5"
  },
  {
    label: "Approvals",
    description: "Finance, support, and operations decision queue.",
    status: "planned",
    phase: "Phase 6"
  },
  {
    label: "Knowledge Copilot",
    description: "Cited answers from runbooks, logs, tickets, and reports.",
    status: "planned",
    phase: "Phase 7"
  },
  {
    label: "Audit & Reports",
    description: "Executive summaries, audit trail, and post-incident review.",
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
