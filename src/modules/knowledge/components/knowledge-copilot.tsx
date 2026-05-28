"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/state-views";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { getRoleViewRule, type DemoRoleSlug } from "@/modules/roles/view-rules";
import type { CopilotAskResult, CopilotPrompt, KnowledgeCitation } from "@/modules/knowledge/types";

type CopilotCatalogResponse = {
  ok: true;
  organizationId: string;
  prompts: CopilotPrompt[];
  roleBehavior: {
    role: string;
    citationsRequired: boolean;
    aiFallback: string;
  };
};

type CopilotErrorResponse = { ok: false; error: string };

type KnowledgeCopilotProps = {
  role: DemoRoleSlug;
  initialQuestion?: string;
};

function inputClassName() {
  return "rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500";
}

function titleCase(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function aiTone(mode: string | undefined): StatusTone {
  if (mode === "gateway") return "healthy";
  if (mode === "fallback") return "degraded";
  return "neutral";
}

function uniquePrompts(primary: CopilotPrompt[], fallback: CopilotPrompt[]) {
  const seen = new Set<string>();
  return [...primary, ...fallback].filter((prompt) => {
    if (seen.has(prompt.id)) return false;
    seen.add(prompt.id);
    return true;
  });
}

function CitationCard({ citation, index }: { citation: KnowledgeCitation; index: number }) {
  return (
    <details className="group rounded-2xl border border-slate-200 bg-white/75 p-4 open:border-blue-200 open:bg-blue-50/60 dark:border-white/10 dark:bg-white/[0.04] dark:open:border-blue-400/20 dark:open:bg-blue-400/10">
      <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.14em] text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-100">{citation.label}</span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">{titleCase(citation.sourceType)}</span>
          </div>
          <p className="mt-3 font-semibold text-slate-950 dark:text-white">{citation.title}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Source {index + 1} · {citation.sourceName} · {citation.documentType}</p>
        </div>
        <span className="text-xs font-semibold text-blue-700 group-open:text-blue-800 dark:text-blue-200">Details</span>
      </summary>
      <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-white/10">
        <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">{citation.excerpt}</p>
        <dl className="grid gap-3 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-2">
          <div>
            <dt className="font-semibold uppercase tracking-[0.16em]">URI</dt>
            <dd className="mt-1 break-all text-slate-700 dark:text-slate-200">{citation.uri}</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-[0.16em]">Version</dt>
            <dd className="mt-1 text-slate-700 dark:text-slate-200">{citation.version}</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-[0.16em]">Document</dt>
            <dd className="mt-1 text-slate-700 dark:text-slate-200">{citation.documentId}</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-[0.16em]">Snippet</dt>
            <dd className="mt-1 text-slate-700 dark:text-slate-200">{citation.snippetId}</dd>
          </div>
        </dl>
      </div>
    </details>
  );
}

function AnswerPanel({ result }: { result: CopilotAskResult }) {
  return (
    <Card className="border-blue-200/80 bg-blue-50/70 dark:border-blue-400/20 dark:bg-blue-400/10">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={result.ai.mode === "fallback" ? "Fallback answer" : "AI answer"} tone={aiTone(result.ai.mode)} />
          <StatusBadge status={`${result.retrieval.matchCount} matches`} tone="active" />
          <StatusBadge status={`Top score ${result.retrieval.topScore}`} tone="neutral" />
          {result.matchedPromptId ? <StatusBadge status={titleCase(result.matchedPromptId)} tone="pending" /> : null}
        </div>
        <CardTitle>Copilot answer</CardTitle>
        <CardDescription>Every citation below is returned by the Phase 7A retrieval contract; the UI does not synthesize source records.</CardDescription>
      </CardHeader>
      <div className="whitespace-pre-wrap rounded-2xl border border-white/70 bg-white/80 p-5 text-sm leading-7 text-slate-800 shadow-sm dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-100">
        {result.answer}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">AI mode</p>
          <p className="mt-2 font-semibold text-slate-950 dark:text-white">{titleCase(result.ai.mode)}</p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Attempts</p>
          <p className="mt-2 font-semibold text-slate-950 dark:text-white">{result.ai.attempts}</p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Citations</p>
          <p className="mt-2 font-semibold text-slate-950 dark:text-white">{result.citations.length}</p>
        </div>
      </div>
      {result.ai.error ? <p className="mt-3 text-xs leading-5 text-amber-700 dark:text-amber-100">Fallback detail: {result.ai.error}</p> : null}
    </Card>
  );
}

export function KnowledgeCopilot({ role, initialQuestion }: KnowledgeCopilotProps) {
  const roleView = getRoleViewRule(role);
  const searchParams = useSearchParams();
  const [catalog, setCatalog] = useState<CopilotCatalogResponse | null>(null);
  const [allPrompts, setAllPrompts] = useState<CopilotPrompt[]>([]);
  const [question, setQuestion] = useState(initialQuestion ?? "");
  const [result, setResult] = useState<CopilotAskResult | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const queryQuestion = searchParams.get("question")?.trim() ?? searchParams.get("q")?.trim();
    if (queryQuestion) setQuestion(queryQuestion);
  }, [searchParams]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalog() {
      setLoadingCatalog(true);
      setError(null);
      try {
        const [roleResponse, allResponse] = await Promise.all([
          fetch(`/api/copilot?role=${encodeURIComponent(role)}`, { signal: controller.signal, headers: { "x-commandgrid-demo-role": role } }),
          fetch("/api/copilot", { signal: controller.signal })
        ]);
        const rolePayload = (await roleResponse.json()) as CopilotCatalogResponse | CopilotErrorResponse;
        const allPayload = (await allResponse.json()) as CopilotCatalogResponse | CopilotErrorResponse;

        if (!roleResponse.ok || !rolePayload.ok) throw new Error("error" in rolePayload ? rolePayload.error : "Unable to load role prompts.");
        if (allResponse.ok && allPayload.ok) setAllPrompts(allPayload.prompts);
        setCatalog(rolePayload);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "Unable to load Copilot prompts.");
      } finally {
        setLoadingCatalog(false);
      }
    }

    loadCatalog();
    return () => controller.abort();
  }, [role]);

  const prompts = useMemo(() => uniquePrompts(catalog?.prompts ?? [], allPrompts).slice(0, 8), [catalog?.prompts, allPrompts]);
  const rolePromptIds = useMemo(() => new Set((catalog?.prompts ?? []).map((prompt) => prompt.id)), [catalog?.prompts]);

  async function askCopilot(nextQuestion = question) {
    const trimmed = nextQuestion.trim();
    if (trimmed.length < 3) {
      setError("Ask a question with at least 3 characters.");
      return;
    }

    setQuestion(trimmed);
    setAsking(true);
    setError(null);
    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-commandgrid-demo-role": role
        },
        body: JSON.stringify({ question: trimmed, role, limit: 6 })
      });
      const payload = (await response.json()) as CopilotAskResult | CopilotErrorResponse;

      if (!response.ok || !payload.ok) {
        setError("error" in payload ? payload.error : "Copilot request failed.");
        return;
      }

      setResult(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Copilot request failed.");
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={`${roleView.label} mode`} tone="active" />
            <StatusBadge status="Citations required" tone="healthy" />
            <StatusBadge status="Phase 7B" tone="pending" />
          </div>
          <CardTitle>Ask trusted Northstar knowledge</CardTitle>
          <CardDescription>{roleView.emphasis} Prompt suggestions are role-aware, but backend retrieval and citation validation remain authoritative.</CardDescription>
        </CardHeader>
        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Question</span>
            <textarea
              className={cn(inputClassName(), "min-h-32")}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask about warehouse API delays, customer updates, finance thresholds, or operational mitigation."
            />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">POST /api/copilot sends the selected demo role and displays retrieval metadata plus source cards.</p>
            <Button type="button" onClick={() => askCopilot()} disabled={asking || question.trim().length < 3}>
              {asking ? "Asking Copilot…" : "Ask Copilot"}
            </Button>
          </div>
        </div>
      </Card>

      {loadingCatalog ? <LoadingState title="Loading prompt suggestions" description="Reading GET /api/copilot for the selected demo role." /> : null}
      {error ? <ErrorState title="Copilot needs attention" description={error} /> : null}

      {!loadingCatalog && prompts.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Demo prompt suggestions</CardTitle>
            <CardDescription>
              {catalog?.prompts.length ? `${catalog.prompts.length} prompt(s) are recommended for ${roleView.label}; the full demo library is included so reviewers can exercise all five seeded answers.` : "Use seeded prompts to validate fallback answers and real citations."}
            </CardDescription>
          </CardHeader>
          <div className="flex flex-wrap gap-2">
            {prompts.map((prompt) => {
              const recommended = rolePromptIds.has(prompt.id);
              return (
                <button
                  key={prompt.id}
                  type="button"
                  onClick={() => askCopilot(prompt.prompt)}
                  disabled={asking}
                  className={cn(
                    "inline-flex max-w-full items-center rounded-2xl border px-4 py-2 text-left text-sm font-semibold transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-blue-500/15 disabled:pointer-events-none disabled:opacity-50",
                    recommended
                      ? "border-blue-200 bg-blue-50 text-blue-800 shadow-sm dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-100"
                      : "border-slate-200 bg-white text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                  )}
                  title={prompt.prompt}
                >
                  {prompt.label}
                  <span className="ml-2 rounded-full bg-white/75 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.14em] text-slate-500 dark:bg-white/10 dark:text-slate-300">{recommended ? "role" : titleCase(prompt.role)}</span>
                </button>
              );
            })}
          </div>
        </Card>
      ) : null}

      {!loadingCatalog && !prompts.length && !error ? (
        <EmptyState title="No Copilot prompts returned" description="GET /api/copilot returned an empty set for this role. You can still type a custom question above." />
      ) : null}

      {result ? <AnswerPanel result={result} /> : null}

      {result?.citations.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Citation sources</CardTitle>
            <CardDescription>Expandable source cards show title, label, source type, URI, excerpt, and version from seeded knowledge records.</CardDescription>
          </CardHeader>
          <div className="grid gap-3 xl:grid-cols-2">
            {result.citations.map((citation, index) => <CitationCard key={citation.id} citation={citation} index={index} />)}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
