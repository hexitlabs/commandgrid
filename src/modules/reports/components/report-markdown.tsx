import { Fragment } from "react";
import { cn } from "@/lib/utils";

type ReportMarkdownProps = {
  markdown: string;
  compact?: boolean;
};

type MarkdownSection = {
  id: string;
  heading?: string;
  level: number;
  lines: string[];
};

function slug(value: string, index: number) {
  return `${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "section"}-${index}`;
}

function parseMarkdown(markdown: string): MarkdownSection[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const sections: MarkdownSection[] = [];
  let current: MarkdownSection = { id: "summary-0", level: 2, lines: [] };

  lines.forEach((line) => {
    const heading = /^(#{1,3})\s+(.+)$/.exec(line.trim());
    if (heading) {
      if (current.heading || current.lines.some((item) => item.trim())) sections.push(current);
      current = { id: slug(heading[2], sections.length), heading: heading[2], level: heading[1].length, lines: [] };
      return;
    }

    current.lines.push(line);
  });

  if (current.heading || current.lines.some((item) => item.trim())) sections.push(current);
  return sections.length ? sections : [{ id: "body-0", level: 2, lines: [markdown] }];
}

function renderLine(line: string, index: number) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("- ")) {
    return (
      <li key={index} className="ml-5 list-disc text-sm leading-7 text-slate-700 dark:text-slate-200">
        {trimmed.slice(2)}
      </li>
    );
  }

  return (
    <p key={index} className="text-sm leading-7 text-slate-700 dark:text-slate-200">
      {trimmed}
    </p>
  );
}

export function ReportMarkdown({ markdown, compact = false }: ReportMarkdownProps) {
  const sections = parseMarkdown(markdown);

  return (
    <div className={cn("grid gap-4", compact ? "" : "xl:grid-cols-2")}>
      {sections.map((section, sectionIndex) => {
        const rendered = section.lines.map(renderLine).filter(Boolean);
        return (
          <section key={section.id} className="rounded-2xl border border-slate-200 bg-white/75 p-5 dark:border-white/10 dark:bg-white/[0.04]">
            {section.heading ? (
              section.level <= 1 ? (
                <h2 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">{section.heading}</h2>
              ) : (
                <h3 className="text-base font-semibold tracking-tight text-slate-950 dark:text-white">{section.heading}</h3>
              )
            ) : sectionIndex === 0 ? (
              <h3 className="text-base font-semibold tracking-tight text-slate-950 dark:text-white">Report body</h3>
            ) : null}
            <div className="mt-3 space-y-2">
              {rendered.length ? rendered : <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">No section text returned.</p>}
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer text-xs font-semibold text-blue-700 dark:text-blue-200">Show raw safe text</summary>
              <pre className="mt-3 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200">
                {section.heading ? <Fragment>{`${"#".repeat(section.level)} ${section.heading}\n`}</Fragment> : null}
                {section.lines.join("\n")}
              </pre>
            </details>
          </section>
        );
      })}
    </div>
  );
}
