type StatusCardProps = {
  label: string;
  value: string;
  detail: string;
};

export function StatusCard({ label, value, detail }: StatusCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{detail}</p>
    </div>
  );
}
