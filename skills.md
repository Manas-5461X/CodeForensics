# CodeForensics — Frontend Design & UX Skill Contract

**Applies to:** every React/TypeScript screen, interaction, component, empty state, dashboard, graph, onboarding flow, responsive layout, and visual refactor in CodeForensics.

**Priority:** This document is product-specific guidance. It does not override user requirements, data correctness, security, accessibility, or an existing coherent design system. Inspect the repository first; reuse working design tokens and components unless a documented issue justifies changing them.

**Intent:** The product should look like a carefully designed repository investigation workbench—not a generic AI-generated SaaS template. Quality comes from product-specific information hierarchy, believable data, restrained styling, precise interactions, consistent typography, and real rendered QA—not from adding more gradients, animations, badges, or cards.

## 1. Product and user model

The primary user is a developer, repository maintainer, or first-time contributor trying to understand a codebase and its history. They value trust, information density, speed, source links, and knowing what is fact versus inference.

Design for the tasks people came to do:

- Find an issue or PR quickly.
- Understand the timeline and current status.
- Follow why an issue, PR, commit, file, or symbol is linked to another item.
- Tell whether a fix is verified, suggested, incomplete, or unknown.
- Discover a useful contribution without duplicating work.
- Preserve and revisit an investigation with evidence.

Every screen must have one dominant primary task and a small number of supporting actions. Do not make users decode a wall of instructions before using a feature.

## 2. Design direction: “Forensic workbench”

### Personality

Precise, calm, editorial, technical, evidence-first. The visual language should feel closer to a well-crafted research notebook and developer tool than a flashy AI landing page. Use typography, alignment, borders, hierarchy, and meaningful information architecture as the visual identity.

### Default palette

Use semantic design tokens, not ad-hoc color values throughout components. The default direction is **warm light mode** with a restrained rust/terracotta action color. A dark theme can be added later only if it receives equivalent contrast, component-state and QA treatment.

```css
:root {
  color-scheme: light;
  --canvas: #f7f6f2;
  --surface: #ffffff;
  --surface-subtle: #f0efe9;
  --surface-selected: #f5e8e1;
  --text-primary: #202320;
  --text-secondary: #5d645e;
  --text-muted: #788078;
  --border-subtle: #e2dfd7;
  --border-strong: #c8c3b8;
  --accent: #a64427;
  --accent-hover: #87371f;
  --accent-foreground: #ffffff;
  --link: #176767;
  --success: #23704f;
  --warning: #8e641b;
  --danger: #b23a32;
  --focus-ring: #176767;
  --radius-sm: 4px;
  --radius-md: 7px;
  --radius-lg: 10px;
  --shadow-popover: 0 10px 28px rgb(32 35 32 / 10%);
}
```

The tokens are a starting art direction, not permission to ignore contrast. Validate text, statuses, borders and focus rings against the actual rendered UI. Do not create one-off colors just to make each screen appear different. Semantic statuses must use both color and textual/icon cues, never color alone.

### Typography

- Use at most two font families: a highly legible UI sans and a monospace for code, SHAs, file paths, IDs and tabular technical data.
- Preferred direction: **IBM Plex Sans + IBM Plex Mono** or the equivalent already installed in the project. Check `package.json` before adding fonts/dependencies; provide system fallbacks.
- Do not use monospace for all body copy. Use it where characters, code or identifiers need to align or be distinguished.
- Use a clear type scale with consistent weights. Page titles should be strong but not enormous; repository tools need space for content.
- Use tabular numerals for counts and timestamps when columns need to align.
- Use sentence case for most labels. Avoid tracked-out uppercase eyebrow labels above every section.
- Keep long prose comfortably readable (roughly 65–75 characters per line where practical); use compact text only for metadata.
- Use deliberate line-height and truncation. Never truncate issue titles or key evidence without a way to inspect the full content.

### Density and geometry

- Use a consistent 4px base / 8px rhythm: 4, 8, 12, 16, 24, 32, 40, 48.
- Keep borders subtle and alignment exact. Prefer meaningful whitespace to a border around every block.
- Use restrained radii (generally 4–10px). Do not make every control a pill.
- Application shell baseline: sidebar around 224–248px (collapsible), compact top bar around 56–64px, and a flexible work area. Adjust to actual content and viewport.
- Dense data views should prioritize legibility and scanability over oversized padding.
- Do not make every section a card. Use tables, timelines, split panes, grouped lists, file trees and typography-led sections where those structures fit the task.

## 3. Banned generic UI patterns

Do not ship these unless a deliberate, documented product reason exists:

- Purple/indigo radial gradient blobs behind a dark dashboard.
- Neon glows, gratuitous glassmorphism, excessive blur, floating cards, or animated 3D effects on routine data screens.
- The repeated “three identical cards with icons” layout for every section.
- Fake KPI metrics, invented user counts, false uptime figures, fabricated customer logos, generated testimonials, or made-up repository activity.
- Emoji used as functional icons. Use the project's consistent vector icon set (Lucide is the default recommendation).
- One arbitrary italic or gradient-highlighted word in each heading.
- Pills/badges for every label, status, technology, and metadata value. Use badges only when they improve scanning.
- Repeating the same metric in multiple panels, or repeating identical filters in each card.
- Giant decorative charts, world maps, terminal mockups, graph visualizations or empty space that do not support a user task.
- “AI assistant” chat as the entire product experience. CodeForensics is an investigation workbench with search, evidence and workflows—not a chat textbox wrapped around an API.
- Fake clickable elements, buttons with no action, placeholder links, or success messages for failed/unconfigured API calls.
- Placeholder avatars/images from unreliable URLs. Use an available GitHub avatar, monogram, or simple neutral fallback.

If the screen looks like a template, do not add more decoration. Revisit hierarchy, content structure, density, labels, typography, and the actual user task.

## 4. Product-specific information design

### Global application shell

- Sidebar: Overview, Issues & PRs, Contribution Finder, Repository/Code History, Investigations; include only routes that exist and work.
- Global repository context must be explicit. Users should know which repository they are analyzing.
- Show connection/sync health unobtrusively: last successful sync, partial import, permission loss or failed job should be visible when relevant.
- Search and global repository switching should be easy to reach without dominating the page.
- Navigation active states must be unambiguous. Do not rely on icons alone where a label fits.

### Overview

Prioritize actionable repository context: sync health, issues needing attention, recent meaningful changes, linked PR/issue work, and contribution opportunities. Use real persisted metrics only. Avoid a row of vanity KPIs followed by generic filler charts.

### Issues & PRs

- Use a readable table/list with title as the strongest field, number/state/author/labels as supporting fields, and update time as a useful scan anchor.
- Put filters in one page-level control area; reflect active filters and allow a clear reset.
- Keep sort, page and filters in URL query parameters when doing so supports deep links and browser navigation.
- Keep rows compact but not cramped. Make row hover/focus states clear, and don't require clicking a tiny icon to open a detail page.
- Differentiate GitHub's actual status from CodeForensics' inferred resolution assessment.

### Issue/PR relationships and history

- Use a timeline or relationship list for sequential history; use a graph when it reveals non-linear relationships better than a list.
- Clearly label edges: “explicitly references”, “likely follow-up”, “possible duplicate”, “possible fix”, etc. The source of a claim should be one click away.
- Every inferred relationship should expose “Why linked?” with supporting commit/PR/comment/file details and any uncertainty.
- Include a list/table alternative to the visual graph, with keyboard navigation and accessible labels.
- Do not visually give all relationships equal confidence. Explicit GitHub links and heuristic suggestions need different but consistent treatment.

### Contribution Finder

- Explain why an issue is recommended (e.g. open, no likely active PR found, relevant files identified, previous attempt exists).
- Separate source facts from estimated difficulty/suitability.
- Make ongoing work, likely duplicates, historical failed attempts and missing information easy to see.
- Never promise an issue is “easy” merely because it has a `good first issue` label.

### Code archaeology and investigations

- File paths, symbols and commit SHAs should be legible and copyable, with truncation only where needed.
- Evidence should have a source label, revision/commit context where available, and an obvious link to the original GitHub item.
- Visually distinguish FACT, INFERENCE, HYPOTHESIS and UNKNOWN using text labels plus restrained semantic colors.
- Keep the active question, repository/revision scope, findings and evidence panel visible without overwhelming the source content.
- Do not make a graph a background decoration. Graph nodes/edges need a reason, labels, selection details, filters and a path to source evidence.

## 5. Layout by content, not template

Choose layout according to the real task:

- **Repository lists:** searchable table or dense list.
- **Issue detail:** two-column layout when useful (main discussion plus contextual relationships/sidebar); collapse to one column responsively.
- **Timelines:** chronological vertical list with clear timestamps, event types and links.
- **Code history:** source/content area paired with a history/evidence panel, with adjustable or responsive panes if necessary.
- **Investigations:** question and scope header, findings/evidence in the main area, related objects and metadata in a secondary pane.
- **Repository overview:** one prominent useful summary plus a few meaningful work queues; do not force a chart if the data is categorical or sparse.
- **Graph:** contextual, bounded, and navigable; offer a textual relationship view.

Do not reuse the same composition for each route merely to keep implementation easy. Reuse components and tokens, but preserve the semantics of each page.

## 6. Component and interaction rules

Before adding dependencies, inspect `package.json`, the existing shadcn setup, and primitive libraries. Reuse the project's component primitives. Do not mix multiple primitive systems inside a single interaction surface without a clear reason.

Use accessible semantic HTML and robust primitives for dialogs, menus, tooltips, tabs, comboboxes and popovers. Do not hand-roll keyboard/focus management for complex controls if a suitable installed primitive exists.

Every interactive control needs the applicable states:

1. Default
2. Hover
3. Focus-visible
4. Active/pressed
5. Disabled
6. Loading/in progress
7. Error
8. Success/complete

These states must be semantically correct; not every static element needs all eight. For each real async action:

- Disable or guard duplicate submission while a request is in flight.
- Show progress near the action or affected content.
- Show success only after the operation actually succeeds.
- Put validation errors next to relevant fields and operation errors close to the action.
- Provide retry when recovery is sensible.
- Preserve useful existing data during background refresh where possible; don't flash a full-screen spinner for every refetch.
- Use skeletons when content shape is known; reserve small spinners for local actions or indeterminate waits.
- Confirm destructive/irreversible actions and provide undo when sensible.
- Never block copy/paste in text fields.

Animation is optional, not a quality requirement. Use short, restrained feedback transitions, respect `prefers-reduced-motion`, do not animate layout properties, avoid scroll hijacking, and never add looping motion to a data-heavy dashboard merely to make it feel “alive.”

## 7. Responsive design

Support realistic widths, not just a desktop screenshot.

- At narrow widths, convert the sidebar to a usable drawer/menu and keep the active repository context accessible.
- Toolbars must wrap or collapse predictably; don't let labels and buttons overlap.
- Wide tables may scroll horizontally only if that is genuinely usable; for priority issue/PR lists, prefer a compact alternate card/list presentation on mobile.
- Move secondary panels below primary content on small screens rather than shrinking them beyond readability.
- Keep graph controls accessible and offer a relationship-list alternative on touch/small screens.
- Use responsive padding, not fixed page widths. Avoid `h-screen` for layouts that need to account for dynamic browser UI; use the appropriate viewport unit for the installed CSS/Tailwind version.
- Prevent accidental horizontal page overflow, clipped dialogs, and focus traps that strand keyboard users.

## 8. Accessibility baseline

Target WCAG 2.2 AA as the practical design goal; validate actual behavior rather than claiming compliance based on the checklist alone.

- Use semantic headings and landmarks; maintain a logical heading order.
- Every field has a programmatic label, helpful error association, and suitable autocomplete where relevant.
- All actions work by keyboard; focus order follows reading/order of interaction; focus-visible is clear and not hidden behind sticky elements.
- Icon-only buttons require accessible names. Decorative icons are hidden from screen readers where appropriate.
- Use textual status labels and sufficient contrast; color cannot be the only signal.
- Respect reduced motion; never require animation to understand a state change.
- Make dialogs/menu behavior keyboard accessible and return focus to the invoking element when closed.
- Tables have appropriate headers; graph relationships have a text equivalent.
- Announce important background task status to assistive technology without flooding live regions.
- Do not remove browser focus outlines without replacing them.

## 9. React and data-state discipline

- Keep server state in TanStack Query (or the existing established equivalent); avoid copying the same server result into Zustand/local state unnecessarily.
- Use local component state for local presentation. Introduce global client state only when multiple distant components genuinely share it.
- Avoid `useEffect` for values that can be derived during render. Effects are for synchronizing with external systems, not for duplicating derived state.
- Keep API calls in a typed client/service layer, not scattered across presentational components.
- Validate responses at trust boundaries when appropriate. Handle `null`, missing optional fields, partial sync and permission loss.
- Keep filtering/pagination server-side for large repositories.
- Avoid unstable keys, large component files that mix request logic and visual layout, and unnecessary rerenders.
- A catch block must not silently swallow a user-relevant error.

## 10. Real data, demo data and trust

- Production screens must be powered by real persisted application data.
- Demo/test fixtures must be seeded, stable, realistic enough to exercise behavior, and explicitly marked as demo data in the UI and documentation.
- Never mix demo rows into real repository results without a visible boundary.
- Do not manufacture a “resolved” label for a closed issue. Show GitHub state and CodeForensics assessment separately.
- Do not invent last-synced timestamps, completeness percentages, or counts.
- Empty state should explain the next genuine action (connect repo, run import, adjust filter, or retry) without pretending something is broken when there is simply no data.
- If source access is missing, explain what is unavailable and what can still be viewed.

## 11. The required UI workflow

For any new screen or major visual change, follow this sequence:

1. **Inspect:** Read relevant routes, components, tokens, dependencies, neighboring screens and data contracts. Understand the screen's primary task and main user.
2. **Design contract:** Write a short checklist for hierarchy, primary action, content fields, states, responsive behavior and observable acceptance criteria.
3. **Implement:** Reuse the design system; change only what is required; preserve business logic, request behavior and permissions.
4. **Run:** Start the app and execute its build/typecheck/tests. Open the actual rendered screen when browser tooling is available.
5. **Exercise:** Perform the primary task, including at least one empty/error/loading or permission case where relevant. Test wide and narrow viewports.
6. **Audit:** Check hierarchy, alignment, content density, copy, focus states, keyboard access, responsive overflow and consistency with neighboring screens.
7. **Fix and recheck:** Correct observed issues, then render/test again. A description of intended appearance is not evidence that it works.
8. **Report truthfully:** State which commands and UI states were actually verified and identify anything not tested.

For usability, assess the rendered interface against these practical questions:

- Can a first-time user identify the primary task without reading a long instruction paragraph?
- Is system status visible during slow operations?
- Can users reverse/cancel/exit actions when appropriate?
- Are conventions consistent across pages?
- Does the interface prevent mistakes and expose useful errors?
- Are options visible and recognizable rather than dependent on memorization?
- Is repeated navigation and filtering efficient?
- Does the design avoid irrelevant information and redundant controls?
- Can keyboard and screen-reader users discover the same important information?
- Does the product remain usable when data is empty, partial or stale?

## 12. Pre-ship scorecard

Score each axis from 1–5 based on the rendered UI and working behavior, not on the code author's intention. Fix any axis below 4 before calling a screen complete.

| Axis | Score 4–5 means |
|---|---|
| Product specificity | Screen reflects CodeForensics' repository/evidence workflow; no generic filler. |
| Hierarchy | Primary task and next action are obvious; secondary actions do not compete. |
| Information design | Data density, sorting, grouping, labels and evidence hierarchy fit the task. |
| Consistency | Tokens, typography, controls, icons, statuses and spacing behave consistently. |
| Interaction completeness | Relevant loading, empty, error, disabled, success and permission states work. |
| Responsive behavior | No overlap/clipping; content adapts at wide, medium and narrow widths. |
| Accessibility | Keyboard, focus, labels, contrast and non-color status cues are present. |
| Trust and factuality | Real data is distinguished from demo data and inferred conclusions; sources are linked. |
| Craft | Alignment, type scale, copy, table geometry and small details appear deliberate. |

## 13. Reference skills from the linked collection

This local contract synthesizes selected ideas from the following skills. Read the upstream materials when doing a specialized review; do not blindly copy another product's branding or every opinionated default.

- [anti-slop-design](https://github.com/sickn33/agentic-awesome-skills/tree/main/skills/anti-slop-design) — eliminate generic patterns, improve hierarchy, token consistency, spacing, states and quality gating.
- [anti-ui-slop](https://github.com/sickn33/agentic-awesome-skills/tree/main/skills/anti-ui-slop) — work from product context, reuse the existing design system, define acceptance criteria, inspect rendered output, avoid invented data.
- [build-ui](https://github.com/sickn33/agentic-awesome-skills/tree/main/skills/build-ui) — inspect the project, use a screen-appropriate workflow, render, fix, and verify.
- [design-ux](https://github.com/sickn33/agentic-awesome-skills/tree/main/skills/design-ux) — judge usability through real tasks and a fresh review of the rendered interface.
- [design-taste-frontend](https://github.com/sickn33/agentic-awesome-skills/tree/main/skills/design-taste-frontend) — typography, responsive layouts, restrained motion, and frontend craftsmanship.
- [baseline-ui](https://github.com/sickn33/agentic-awesome-skills/tree/main/skills/baseline-ui) — accessibility primitives, interaction feedback, layout consistency and anti-slop baseline.
- [design-system](https://github.com/sickn33/agentic-awesome-skills/tree/main/skills/design-system) — design-system consistency and reusable components.
- [accessibility-compliance-accessibility-audit](https://github.com/sickn33/agentic-awesome-skills/tree/main/skills/accessibility-compliance-accessibility-audit) — accessibility audits and remediation.
- [code-showcase-react-ui-patterns](https://github.com/sickn33/agentic-awesome-skills/tree/main/skills/code-showcase-react-ui-patterns) — async data patterns, clear errors, loading/empty states and graceful degradation.
- [Frontend UI design QA notes](https://github.com/sickn33/agentic-awesome-skills/blob/main/design-qa.md) — compare rendered output and validate functional behavior rather than relying on a design description.

Upstream source collection: https://github.com/sickn33/agentic-awesome-skills

This file is an original, CodeForensics-specific synthesis. It is not a verbatim copy of the upstream `SKILL.md` files. Check each upstream skill's license and instructions before copying or installing it separately.
