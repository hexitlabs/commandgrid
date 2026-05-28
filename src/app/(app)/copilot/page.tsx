import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { KnowledgeCopilot } from "@/modules/knowledge/components/knowledge-copilot";
import { resolveRoleParam } from "@/modules/roles/route-role";

export const dynamic = "force-dynamic";

type CopilotPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CopilotPage({ searchParams }: CopilotPageProps) {
  const resolvedSearchParams = await searchParams;
  const role = resolveRoleParam(resolvedSearchParams?.role);
  const initialQuestion = first(resolvedSearchParams?.question) ?? first(resolvedSearchParams?.q);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link href={{ pathname: "/dashboard", query: { role } }} className="font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-200">Dashboard</Link>
        <span>/</span>
        <span>Knowledge Copilot</span>
      </div>

      <section className="rounded-[2.25rem] border border-slate-200/80 bg-white/90 p-6 shadow-sm shadow-slate-950/[0.03] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] sm:p-8">
        <div className="max-w-4xl">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <StatusBadge status="Phase 7B" tone="active" />
            <StatusBadge status="Live API" tone="healthy" />
            <StatusBadge status="Cited answers" tone="pending" />
          </div>
          <h2 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">Knowledge Copilot</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
            Ask role-aware operational questions over seeded Northstar runbooks, engineering notes, support playbooks, and governance docs. Answers show AI/fallback mode, retrieval metadata, and expandable source citations.
          </p>
        </div>
      </section>

      <KnowledgeCopilot role={role} initialQuestion={initialQuestion} />
    </div>
  );
}
