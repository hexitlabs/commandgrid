import { DEMO_ROLE_SLUGS, type DemoRoleSlug } from "@/modules/roles/view-rules";
import { APPROVAL_ACTION_TYPES } from "@/modules/approvals/types";
import { governanceRoleLabel, humanizeGovernanceValue } from "@/modules/governance/display";

const outcomes = ["approved", "rejected", "requested", "completed", "started", "simulated", "generated", "blocked", "unknown"];
const targetTypes = ["approval", "incident", "recommendation", "workflow", "agent-run", "notification"];

function inputClassName() {
  return "h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:hover:border-white/20";
}

export function AuditFilterForm({ role, filters }: { role: DemoRoleSlug; filters: Record<string, string | undefined> }) {
  const fieldClass = inputClassName();

  return (
    <form action="/audit" className="rounded-[1.5rem] border border-slate-200 bg-white/75 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <input type="hidden" name="role" value={role} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Search</span>
          <input className={fieldClass} name="search" defaultValue={filters.search} placeholder="actor, action, target…" />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Actor role</span>
          <select className={fieldClass} name="actorRole" defaultValue={filters.actorRole ?? ""}>
            <option value="">Any role</option>
            {DEMO_ROLE_SLUGS.map((option) => <option key={option} value={option}>{governanceRoleLabel(option)}</option>)}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Action type</span>
          <select className={fieldClass} name="actionType" defaultValue={filters.actionType ?? ""}>
            <option value="">Any action type</option>
            {APPROVAL_ACTION_TYPES.map((option) => <option key={option} value={option}>{humanizeGovernanceValue(option)}</option>)}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Outcome</span>
          <select className={fieldClass} name="outcome" defaultValue={filters.outcome ?? ""}>
            <option value="">Any outcome</option>
            {outcomes.map((option) => <option key={option} value={option}>{humanizeGovernanceValue(option)}</option>)}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Incident ID</span>
          <input className={fieldClass} name="incidentId" defaultValue={filters.incidentId} placeholder="inc_…" />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Action</span>
          <input className={fieldClass} name="action" defaultValue={filters.action} placeholder="approval.approved" />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Status</span>
          <input className={fieldClass} name="status" defaultValue={filters.status} placeholder="approved, blocked…" />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Target type</span>
          <select className={fieldClass} name="targetType" defaultValue={filters.targetType ?? ""}>
            <option value="">Any target</option>
            {targetTypes.map((option) => <option key={option} value={option}>{humanizeGovernanceValue(option)}</option>)}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Actor user ID</span>
          <input className={fieldClass} name="actorUserId" defaultValue={filters.actorUserId} placeholder="user_…" />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Target ID</span>
          <input className={fieldClass} name="targetId" defaultValue={filters.targetId} placeholder="approval, incident…" />
        </label>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">Filters call the Phase 6A audit query contract. Metadata shown below is sanitized summary text only.</p>
        <div className="flex gap-2">
          <a href={`/audit?role=${role}`} className="inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white">Reset</a>
          <button type="submit" className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-500/15 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">Apply filters</button>
        </div>
      </div>
    </form>
  );
}
