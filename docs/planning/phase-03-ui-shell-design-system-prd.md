# Phase 03: UI Shell + Design System

## PRD

### Objective
Create the polished application shell, role switcher, theme system, and reusable enterprise UI primitives needed for all screens.

### Primary user value
CommandGrid starts looking like a premium enterprise SaaS product early, with a consistent Apple-like visual language and first-class light/dark modes.

### Users / roles affected
- Public demo visitor
- Executive
- Ops Manager
- Engineer
- Support Lead
- Finance Reviewer
- Admin

### In scope
- App shell with sidebar/topbar.
- Navigation structure.
- Public demo role switcher.
- Light/dark mode.
- Reusable cards, tables, status badges, severity pills, timelines, metric cards, empty/error/loading states.
- Responsive layout rules.
- Design tokens: color, spacing, radius, typography, shadows.
- Demo landing/interstitial if needed before entering app.

### Out of scope
- Fully populated dashboard charts.
- Full incident workflow UI.
- Real approval actions.
- Knowledge copilot behavior.

### Functional requirements
- Users can switch demo role from the UI.
- Theme toggle persists locally.
- Navigation exposes planned modules without dead/confusing states.
- Reusable components can be used by phases 4–7.
- UI shell pulls current role/theme state consistently.

### Non-functional requirements
- Tailwind only for styling; no inline styles except dynamic CSS variables if justified.
- Light mode and dark mode must both look intentional.
- WCAG-conscious contrast.
- Responsive down to tablet/small laptop; mobile acceptable but not primary.
- Animations should be subtle and fast.

### Acceptance criteria
- [ ] App shell renders with sidebar/topbar.
- [ ] Role switcher changes role state and visible role label.
- [ ] Light/dark toggle works and persists.
- [ ] Core UI primitives documented or showcased on a dev/design page.
- [ ] No obvious layout breaks at common widths.
- [ ] Scout/Pixel review confirms visual direction is aligned.

## Implementation Plan

### Owner split
- Pixel: visual system, components, responsive shell.
- Ralph: UX/product review.
- Scout: accessibility/basic UX review.

### Dependencies
- Phase 1 scaffold complete.
- Phase 2 role data/permissions ideally available, but UI can start with typed constants.

### Technical approach
- Use shadcn/Radix primitives where useful, customized to CommandGrid brand.
- Build components with data props so later phases can wire backend data easily.
- Use CSS variables/Tailwind theme for light/dark mode.
- Keep the visual identity clean: white/soft-gray light mode, deep graphite dark mode, restrained blue/cyan accents.

### Task checklist
- [ ] Define design tokens.
- [ ] Build app shell.
- [ ] Build sidebar/topbar/nav config.
- [ ] Build role switcher.
- [ ] Build theme toggle.
- [ ] Build metric card component.
- [ ] Build status/severity badge components.
- [ ] Build timeline component.
- [ ] Build data table wrapper.
- [ ] Build loading/empty/error states.
- [ ] Create UI showcase route or Storybook-like page if lightweight.
- [ ] Run responsive pass.

### Files / modules likely touched
- `src/app/(app)/layout.tsx`
- `src/components/ui/*`
- `src/components/layout/*`
- `src/components/theme/*`
- `src/modules/demo-role/*`
- `src/styles/globals.css`
- `tailwind.config.*`

### Verification plan
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- Manual browser review in light/dark mode
- Screenshot review of shell and component states

### Risks / open questions
- Too much dashboard chrome can make the product feel generic; keep it premium and focused.
- Role switcher must be clear that this is public demo mode, not insecure production auth.

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
