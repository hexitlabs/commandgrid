# CommandGrid — Agent Handoff Prompt Templates

Use these when spawning agents. Always include the specific phase file.

## Mandatory callback rules for all spawned agents

Every implementing agent must ping Ralph with these state changes:

```txt
[CommandGrid][Phase XX][STARTED] repo verified, branch created, work started.
[CommandGrid][Phase XX][BLOCKED] exact blocker + what is needed.
[CommandGrid][Phase XX][PR_OPEN] PR URL + implementation handoff path/summary.
[CommandGrid][Phase XX][VERIFY_FAILED] failed command + next action.
[CommandGrid][Phase XX][DONE] implementation handoff complete.
[CommandGrid][Phase XX][FIX_PUSHED] fix commit pushed + ready for Scout re-review.
```

Do not silently finish. Do not wait for Ralph to discover a PR. When PR is open, explicitly request: **"Ralph, please start Scout review."**

Scout must ping Ralph with:

```txt
[CommandGrid][Phase XX][SCOUT_REVIEW_STARTED] PR #X review started.
[CommandGrid][Phase XX][SCOUT_BLOCKED] missing access/docs/checkout issue.
[CommandGrid][Phase XX][SCOUT_VERDICT] merge-ready | needs-fix | blocked.
```


## Ghost — Phase 1 Infra

```md
Work in `/root/ralph/repos/commandgrid` after repo creation. Run `git remote -v` and confirm you are in the HexIT CommandGrid repo. Fetch/prune and branch from clean `main`.

Task: Execute CommandGrid Phase 1 Infrastructure Foundation from `/root/ralph/plans/commandgrid/phase-01-infrastructure-foundation-prd.md`.

Acceptance criteria:
- Cloudflare preview deploy works.
- Neon Postgres + Hyperdrive smoke works from Cloudflare runtime.
- AI Gateway smoke or fallback verified.
- CI checks exist and pass.
- No secrets committed.

Run tests/build/dry-runs before PR. Create PR, ping Ralph with `[CommandGrid][Phase 01][PR_OPEN]`, and explicitly request Scout review. Use the implementation handoff format.
```

## Node — Backend/Data/Workflow Phases

```md
Work in `/root/ralph/repos/commandgrid`. Run `git remote -v` and confirm repo. Fetch/prune and branch from clean `main`.

Task: Execute CommandGrid Phase X from `/root/ralph/plans/commandgrid/phase-XX-...-prd.md`.

Focus on backend correctness, typed services, Drizzle schema/queries, Cloudflare runtime compatibility, AI Gateway fallback safety, and auditability.

Run lint/typecheck/tests/build and any DB/workflow smoke checks before PR. Create PR, ping Ralph with `[CommandGrid][Phase XX][PR_OPEN]`, and explicitly request Scout review. Use the implementation handoff format.
```

## Pixel — UI Phases

```md
Work in `/root/ralph/repos/commandgrid`. Run `git remote -v` and confirm repo. Fetch/prune and branch from clean `main`.

Task: Execute UI portions of CommandGrid Phase X from `/root/ralph/plans/commandgrid/phase-XX-...-prd.md`.

Design direction: fresh clean enterprise SaaS, Apple-like polish, first-class light/dark mode, Tailwind only, no inline styles.

Run lint/typecheck/build and provide screenshots/preview URL if available. Create PR, ping Ralph with `[CommandGrid][Phase XX][PR_OPEN]`, and explicitly request Scout review. Use the implementation handoff format.
```

## Scout — Review

```md
Review CommandGrid PR #X against phase PRD `/root/ralph/plans/commandgrid/phase-XX-...-prd.md`.

Check:
- acceptance criteria
- no secrets
- Cloudflare runtime compatibility
- role/approval/audit safety where relevant
- tests/build verification
- UX quality if user-facing

Ping Ralph when review starts, if blocked, and when verdict is ready. Return explicit verdict: `merge-ready`, `needs-fix`, or `blocked`.
Include blockers, medium issues, verification run, confidence, and coverage gaps.
```
