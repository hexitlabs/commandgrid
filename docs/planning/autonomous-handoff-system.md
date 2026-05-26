# CommandGrid — Autonomous Handoff System

This is the operating protocol for moving CommandGrid through phases without improvising each time.

## Core loop

```txt
START BUILD
  ↓
HANDOFF PACKAGE
  ↓
IMPLEMENTATION
  ↓
PUSH PR
  ↓
SCOUT REVIEW PR
  ↓
APPROVE? ── yes ──> NEXT BUILD HANDOFF
    │
    no
    ↓
FIX HANDOFF
  ↓
IMPLEMENTATION FIX
  ↓
REPUBLISH / UPDATE PR
  ↓
SCOUT RE-REVIEW
  ↓
loop until approved
```

## Non-negotiables

- Every phase or fix loop has a written handoff package.
- Every implementation happens on a branch from clean `main` unless Ralph explicitly assigns otherwise.
- Every PR is reviewed by Scout.
- `merge-ready` from Scout is required before phase completion.
- No phase is considered complete until the PR URL, commit hash, verification run, and Scout verdict are logged.
- If Scout returns `needs-fix`, Ralph creates a fix handoff instead of vague “address feedback” instructions.
- If the same lane fails 3 times, stop and re-plan.

## Roles in the loop

### Ralph

- Owns phase sequencing.
- Creates handoff packages.
- Spawns/assigns specialist agents.
- Verifies handoffs include repo/path/branch/test expectations.
- Starts Scout review after PR.
- Converts Scout feedback into fix handoffs.
- Approves moving to next phase only after Scout `merge-ready` and checks pass.
- Logs status in `ACTIVE.md`, `state.json`, and daily memory.

### Implementing agent: Ghost / Node / Pixel / Forge if needed

- Reads the phase PRD and handoff package.
- Verifies repo remote and branch state.
- Implements only assigned scope.
- Runs required verification.
- Pushes branch and opens PR.
- Returns structured implementation handoff.

### Scout

- Reviews PR against the phase PRD and handoff package.
- Runs or verifies relevant checks.
- Returns one explicit verdict:
  - `merge-ready`
  - `needs-fix`
  - `blocked`
- Lists blockers, medium issues, verification, confidence, and coverage gaps.


## Agent ping / callback contract

Subagents do **not** silently finish work. Every agent lane must explicitly ping Ralph through the session handoff when a state changes.

### Required pings to Ralph

Implementing agents must ping Ralph when:

1. **Started:** repo/remote verified, branch created, implementation begun.
2. **Blocked:** any blocker appears that prevents progress for more than ~10 minutes.
3. **PR opened:** branch pushed and PR URL is available.
4. **Verification failed:** tests/build/deploy checks fail and the agent needs direction or is beginning a fix.
5. **Implementation complete:** final implementation handoff is ready.
6. **Fix pushed:** requested fixes are committed/pushed and PR is ready for Scout re-review.

Scout must ping Ralph when:

1. **Review started:** Scout has the PR, phase PRD, and implementation handoff.
2. **Review blocked:** missing access, missing PR, missing docs, failed checkout, or unclear scope.
3. **Verdict ready:** `merge-ready`, `needs-fix`, or `blocked` with details.
4. **Re-review verdict ready:** after fix loops.

### Ralph routing obligations

Ralph must route state changes immediately:

- Implementation PR opened → Ralph pings Scout with review package.
- Scout `needs-fix` → Ralph writes fix handoff and pings original implementer.
- Implementer pushes fix → Ralph pings Scout for re-review.
- Scout `merge-ready` + CI green → Ralph marks `MERGE_READY`, logs it, and moves to merge/next handoff depending on authority.
- Scout `blocked` → Ralph logs blocker and pings Robin only if a decision/access/action is needed.

### Ping message format

Use this short prefix format so status is machine/human scannable:

```txt
[CommandGrid][Phase XX][STATE] short summary
```

Examples:

```txt
[CommandGrid][Phase 01][STARTED] Repo verified, branch infra/cloudflare-foundation created, infra scaffold underway.
[CommandGrid][Phase 01][PR_OPEN] PR #12 opened, CI running, implementation handoff saved.
[CommandGrid][Phase 01][SCOUT_REVIEW_STARTED] Reviewing PR #12 against Phase 1 PRD and handoff.
[CommandGrid][Phase 01][NEEDS_FIX] Scout found 1 blocker: Hyperdrive smoke not verified from preview runtime.
[CommandGrid][Phase 01][FIX_PUSHED] Commit abc123 pushed, Hyperdrive preview smoke added, ready for Scout re-review.
[CommandGrid][Phase 01][MERGE_READY] Scout merge-ready and CI green.
```

### Timeout / monitor rule

Ralph monitors active subagent lanes:

- If an implementing agent is quiet for >30 minutes during active work, Ralph checks session status/history.
- If Scout is quiet for >30 minutes after review request, Ralph checks review status.
- If CI is pending >30 minutes, Ralph checks GitHub checks/runs.
- If any lane is stale >2 hours, Ralph marks it stale in tracker and either re-pings or replans.

### Session linkage

Every run artifact should record:

- implementing agent session key/id
- Scout session key/id
- PR URL
- branch
- latest commit
- current owner of next action

## Workflow states

Use these exact states in `ACTIVE.md`, `state.json`, and phase tracker:

1. `PLANNED`
2. `HANDOFF_READY`
3. `IMPLEMENTING`
4. `PR_OPEN`
5. `IN_REVIEW`
6. `NEEDS_FIX`
7. `FIXING`
8. `MERGE_READY`
9. `MERGED`
10. `PHASE_COMPLETE`
11. `BLOCKED`

## Artifact structure

Each phase gets a run folder once execution starts:

```txt
plans/commandgrid/runs/
└── phase-01-infrastructure-foundation/
    ├── handoff.md
    ├── implementation-handoff.md
    ├── scout-review.md
    ├── fix-handoff-01.md
    ├── fix-result-01.md
    └── final-closeout.md
```

For later phases:

```txt
plans/commandgrid/runs/phase-XX-name/
```

## Phase tracker

Maintain:

`/root/ralph/plans/commandgrid/phase-tracker.md`

The tracker records:

- phase
- owner
- branch
- PR URL
- current state
- latest commit
- CI status
- Scout verdict
- blockers
- next action

## 1. Start Build

Ralph starts a phase by checking:

- previous phase is complete or explicitly waived
- phase PRD exists
- dependencies are available
- repo is clean/synced
- right specialist is selected
- risk level is understood

Output:

- phase state becomes `HANDOFF_READY`
- handoff package is written

## 2. Handoff Package

Every handoff package must include:

```md
# CommandGrid Phase X Handoff — [Phase Name]

## Mission
- What this phase must accomplish.

## Source docs
- Phase PRD path:
- Roadmap path:
- Relevant architecture docs:

## Repo discipline
- Repo/path:
- Expected remote:
- Base branch:
- Working branch:
- Must run `git remote -v` and confirm repo.
- Must fetch/prune and branch from clean `main` unless told otherwise.

## Scope
### In scope
- ...

### Out of scope
- ...

## Acceptance criteria
- ...

## Implementation tasks
- [ ] ...

## Required verification
- [ ] lint
- [ ] typecheck
- [ ] tests
- [ ] build
- [ ] phase-specific smoke

## Guardrails
- No secrets in repo.
- No direct push to main.
- No unapproved production mutations.
- Preserve Cloudflare/Neon/AI Gateway separation.

## PR expectations
- Push branch.
- Open PR with summary, tests, risks.
- Include screenshots/preview URL if UI changes.

## Required implementation handoff
[template below]
```

## 3. Implementation

Implementing agent must:

1. Confirm repo:

```bash
git remote -v
git status
git fetch --prune
```

2. Create branch from clean `main` unless instructed otherwise.
3. Implement scoped work only.
4. Run required verification.
5. Push branch.
6. Open PR.
7. Return implementation handoff.

## 4. Implementation Handoff Template

```md
## Implementation Handoff
- Phase:
- Task:
- Repo/path:
- Remote verified:
- Branch:
- Base branch:
- PR URL:
- Latest commit:
- Files changed:
- What was implemented:
- Acceptance criteria status:
- Verification run:
  - lint:
  - typecheck:
  - tests:
  - build:
  - phase-specific smoke:
- Preview/deploy URL:
- Screenshots/artifacts:
- Open issues / risks:
- Anything intentionally deferred:
- Recommended next step:
```

## 5. Push PR

PR body should include:

```md
## Summary
- ...

## Phase
- Phase X: ...
- PRD: ...

## Acceptance Criteria
- [ ] ...

## Verification
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] phase-specific smoke

## Screenshots / Preview
- ...

## Risks / Notes
- ...
```

## 6. Review PR

Ralph starts Scout review with:

```md
Review CommandGrid PR #[number] against:
- Phase PRD: [path]
- Handoff package: [path]
- Implementation handoff: [path]

Required verdict: `merge-ready`, `needs-fix`, or `blocked`.

Check:
- acceptance criteria
- scoped implementation
- no secrets
- repo discipline
- tests/build evidence
- Cloudflare runtime compatibility where relevant
- UI/UX quality where relevant
- security/permission/audit safety where relevant
```

## 7. Scout Verdict Handling

### If Scout says `merge-ready`

Ralph:

1. Records verdict in run folder.
2. Checks CI status.
3. If CI is green, marks state `MERGE_READY`.
4. Merges only if merge authority is clear for this repo/project.
5. After merge, verifies post-merge state if needed.
6. Writes final closeout.
7. Creates next phase handoff.

### If Scout says `needs-fix`

Ralph:

1. Marks state `NEEDS_FIX`.
2. Creates a fix handoff with explicit required changes.
3. Sends fix handoff to original implementer unless another agent is better.
4. Agent updates same PR branch.
5. Agent returns fix result.
6. Scout re-reviews.
7. Loop continues until `merge-ready` or 3-strike re-plan.

### If Scout says `blocked`

Ralph:

1. Marks state `BLOCKED`.
2. Identifies exact external blocker.
3. Stops implementation loop.
4. Reports blocker to Robin with required decision/access/action.

## 8. Fix Handoff Template

```md
# CommandGrid Fix Handoff — Phase X / PR #Y

## Context
- Phase:
- PR:
- Branch:
- Scout verdict:
- Review artifact:

## Required fixes
### Blockers
- [ ] ...

### Medium issues
- [ ] ...

## Do not change
- ...

## Verification required after fixes
- [ ] lint
- [ ] typecheck
- [ ] tests
- [ ] build
- [ ] targeted regression/smoke

## Expected fix result handoff
- Files changed:
- Fixes made:
- Verification run:
- New commit:
- Remaining risks:
```

## 9. Fix Result Template

```md
## Fix Result
- Phase:
- PR:
- Branch:
- New commit:
- Files changed:
- Fixes completed:
- Scout blockers addressed:
- Medium issues addressed:
- Verification run:
- Remaining risks:
- Ready for Scout re-review: yes/no
```

## 10. Final Closeout Template

```md
## Phase Closeout
- Phase:
- Status: PHASE_COMPLETE
- Repo/path:
- Branch:
- PR URL:
- Merge commit:
- Scout verdict:
- CI status:
- Verification run:
- What shipped:
- Known limitations:
- Next phase:
- Next handoff path:
```

## 11. 3-Strike Rule

If a phase/fix loop fails 3 times:

- stop implementation
- mark state `BLOCKED` or `REPLAN_REQUIRED`
- summarize failure pattern
- propose new approach
- ask Robin only if a product/infra/access decision is needed

Strike examples:

- same test suite fails after fix attempts
- Cloudflare deployment still broken after three config attempts
- Scout repeatedly finds the same architectural problem
- agent keeps changing out-of-scope files

## 12. Autonomous progression rules

Ralph may automatically move to the next phase when:

- current phase PR is merged or explicitly accepted as complete
- Scout verdict is `merge-ready`
- CI is green
- no unresolved blocker exists
- next phase dependencies are satisfied

Ralph must stop and ask Robin when:

- new paid service/account/plan change is needed
- production-impacting DNS/domain change is irreversible or unclear
- architecture direction changes materially
- security risk is found
- Scout returns `blocked`
- merge/deploy authority is unclear

## 13. Required logging

For every phase transition, update:

- `ACTIVE.md`
- `state.json`
- `memory/YYYY-MM-DD.md`
- `plans/commandgrid/phase-tracker.md`
- current run folder artifact

## 14. Phase tracker template

```md
# CommandGrid Phase Tracker

| Phase | State | Owner | Branch | PR | Commit | CI | Scout | Next Action |
|---|---|---|---|---|---|---|---|---|
| 01 Infra Foundation | PLANNED | Ghost/Node | TBD | TBD | TBD | TBD | TBD | Create handoff |
| 02 Data Model/Seeded World | PLANNED | Node | TBD | TBD | TBD | TBD | TBD | Wait for Phase 1 |
| 03 UI Shell/Design System | PLANNED | Pixel | TBD | TBD | TBD | TBD | TBD | Wait for Phase 1 |
| 04 Dashboard/Incidents | PLANNED | Pixel/Node | TBD | TBD | TBD | TBD | TBD | Wait for Phases 2–3 |
| 05 Autonomous Workflows | PLANNED | Node/Ghost | TBD | TBD | TBD | TBD | TBD | Wait for Phase 4 |
| 06 Governance/Audit | PLANNED | Node/Pixel | TBD | TBD | TBD | TBD | TBD | Wait for Phase 5 |
| 07 Copilot/Reports | PLANNED | Node/Pixel | TBD | TBD | TBD | TBD | TBD | Wait for Phase 6 |
| 08 Polish/QA/Launch | PLANNED | Scout/Ghost/Pixel/Node | TBD | TBD | TBD | TBD | TBD | Wait for Phase 7 |
```
