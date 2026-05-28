import type { DemoRoleSlug } from "../roles/view-rules";
import type { CopilotPrompt } from "./types";

export const DEFAULT_KNOWLEDGE_ORGANIZATION_ID = "org_northstar_logistics";

export const DEMO_COPILOT_PROMPTS: CopilotPrompt[] = [
  {
    id: "warehouse-root-cause",
    role: "engineer",
    label: "Explain the Warehouse API root cause",
    prompt: "What caused the warehouse API delays and what evidence supports it?"
  },
  {
    id: "ops-next-action",
    role: "ops-manager",
    label: "Pick the safest operational mitigation",
    prompt: "What should Ops do next to stabilize route assignments?"
  },
  {
    id: "support-comms",
    role: "support-lead",
    label: "Summarize customer communication guidance",
    prompt: "How often should Support update customers during this incident?"
  },
  {
    id: "finance-credit-threshold",
    role: "finance-reviewer",
    label: "Review credit approval threshold",
    prompt: "When does Finance need to approve customer credits for impacted accounts?"
  },
  {
    id: "executive-impact",
    role: "executive",
    label: "Brief executives on impact and mitigation",
    prompt: "Give me an executive summary of the warehouse delay impact and mitigation."
  }
];

const promptAliases: Record<string, string[]> = {
  "warehouse-root-cause": ["root cause", "caused", "warehouse api delays", "berlin warehouse", "warehouse delays", "connection pool"],
  "ops-next-action": ["what should ops", "next", "stabilize", "mitigation", "buffer mode", "route assignments"],
  "support-comms": ["support update", "customer update", "how often", "communicate", "comms", "customers during"],
  "finance-credit-threshold": ["finance", "credit", "approval", "threshold", "platinum", "customer credits"],
  "executive-impact": ["executive", "summary", "impact", "revenue", "mitigation", "brief"]
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

export function matchDemoPrompt(question: string): CopilotPrompt | undefined {
  const normalized = normalize(question);
  const exact = DEMO_COPILOT_PROMPTS.find((prompt) => normalize(prompt.prompt) === normalized);
  if (exact) return exact;

  let best: { prompt: CopilotPrompt; score: number } | null = null;
  for (const prompt of DEMO_COPILOT_PROMPTS) {
    const aliases = promptAliases[prompt.id] ?? [];
    const score = aliases.reduce((sum, alias) => (normalized.includes(alias) ? sum + alias.split(" ").length : sum), 0);
    if (score > (best?.score ?? 0)) {
      best = { prompt, score };
    }
  }

  return best && best.score >= 2 ? best.prompt : undefined;
}

export function roleForPrompt(promptId: string | undefined, fallback: DemoRoleSlug): DemoRoleSlug {
  return DEMO_COPILOT_PROMPTS.find((prompt) => prompt.id === promptId)?.role ?? fallback;
}
