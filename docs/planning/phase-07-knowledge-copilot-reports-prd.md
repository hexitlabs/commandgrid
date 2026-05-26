# Phase 07: Knowledge Copilot + Reports

## PRD

### Objective
Add the AI-facing knowledge and reporting layer: cited answers over seeded enterprise documents plus generated incident postmortems and executive reports.

### Primary user value
This demonstrates useful enterprise AI beyond workflow automation: trusted answers, citations, and board-ready outputs.

### Users / roles affected
- Executive asks high-level impact questions.
- Ops Manager asks incident/runbook questions.
- Engineer asks technical root-cause questions.
- Support Lead asks complaint/customer questions.
- Finance Reviewer asks revenue/SLA questions.

### In scope
- Knowledge Copilot UI.
- Prompt examples.
- Retrieval/query over seeded knowledge docs.
- Citation assembly.
- AI Gateway answer generation.
- Fallback answer generation.
- Report generation UI.
- Incident postmortem report.
- Executive summary report.
- Customer impact report.
- Optional R2 export for report artifacts.

### Out of scope
- Full vector search unless added as stretch.
- User-uploaded documents for V1.
- Real email/PDF delivery.
- Enterprise compliance certification.

### Functional requirements
- Copilot accepts questions and returns useful answers.
- Answers include citations with source titles/types.
- Copilot can answer flagship prompts about Berlin/warehouse delays.
- Role affects prompt suggestions and possibly visible source detail.
- Reports can be generated from incident data.
- Generated reports are stored and visible later.
- AI Gateway failures use deterministic report/answer fallbacks.

### Non-functional requirements
- No hallucinated citations; citations must correspond to seeded records.
- AI prompts should constrain output to available sources.
- Rate limiting for public copilot endpoint.
- Report output should be clean, readable, and enterprise-formatted.
- Fallbacks must be obvious in logs but not jarring in UI.

### Acceptance criteria
- [ ] Copilot answers at least 5 predefined demo prompts with citations.
- [ ] Citation links/drawers open source snippets.
- [ ] Postmortem generation works for flagship incident.
- [ ] Executive summary report works.
- [ ] Customer impact report works or is explicitly deferred.
- [ ] Reports are persisted.
- [ ] AI disabled fallback smoke passes.
- [ ] Scout returns `merge-ready`.

## Implementation Plan

### Owner split
- Node: retrieval, AI Gateway prompt pipeline, report services.
- Pixel: copilot/report UI.
- Ralph: prompt quality and demo script.
- Scout: citation trust and failure-mode review.

### Dependencies
- Phase 2 knowledge docs seeded.
- Phase 5 AI Gateway wrapper exists.
- Phase 6 audit logging exists for searches/reports.

### Technical approach
- Start with keyword/metadata retrieval over seeded docs; add pgvector later if needed.
- Build prompt context from top matched documents and require citation IDs.
- Validate that returned citation IDs exist; otherwise fallback/repair.
- Store knowledge queries and report generation actions in audit logs.
- Use R2 for exported artifacts only if Phase 1 R2 is ready and time allows.

### Task checklist
- [ ] Implement knowledge retrieval service.
- [ ] Implement citation formatter.
- [ ] Implement copilot API/server action.
- [ ] Implement AI prompt templates.
- [ ] Implement fallback answer map for demo prompts.
- [ ] Build copilot UI.
- [ ] Build source citation drawer.
- [ ] Implement report generation service.
- [ ] Implement report storage/read UI.
- [ ] Optional: implement R2 export.
- [ ] Add tests for citation validity.
- [ ] Add Playwright smoke for copilot prompt and report generation.

### Files / modules likely touched
- `src/modules/knowledge/*`
- `src/modules/reports/*`
- `src/lib/ai-gateway/*`
- `src/app/(app)/copilot/*`
- `src/app/(app)/reports/*`
- `src/modules/audit/*`

### Verification plan
- Unit tests for retrieval/citation validation.
- AI disabled fallback smoke.
- Manual prompt tests for predefined questions.
- Playwright: ask prompt → view cited answer → generate report.
- Build/typecheck/lint.

### Risks / open questions
- Citations must not be fake; enforce source IDs.
- Public AI endpoint abuse; add rate limits and demo-mode throttles.
- pgvector can wait; keyword + curated source matching is enough for V1 demo.

### Phase handoff format
```md
## Handoff
- Phase:
- Repo/path:
- Branch:
- PR:
- Files changed:
- What was done:
- Verification run:
- Preview/deploy URL:
- Open issues / risks:
- Scout verdict:
- Recommended next step:
```
