import { cn } from "@/lib/utils";

export type Severity = "sev1" | "sev2" | "sev3" | "sev4";

type SeverityPillProps = {
  severity: Severity;
};

const severityClasses: Record<Severity, string> = {
  sev1: "border-red-300 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200",
  sev2: "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-400/30 dark:bg-orange-400/10 dark:text-orange-200",
  sev3: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200",
  sev4: "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-200"
};

export function SeverityPill({ severity }: SeverityPillProps) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-[0.16em]", severityClasses[severity])}>
      {severity}
    </span>
  );
}
