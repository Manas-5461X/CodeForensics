# CodeForensics — Product & Phased Development Guide

> **Purpose:** This document is the implementation contract for building CodeForensics in deliberate, testable phases. Give the coding agent **one phase prompt at a time**. Do not ask it to implement the entire product in one pass.
>
> **Companion UI rules:** Read [`skills.md`](./skills.md) before implementing or changing any interface. Treat it as the product's frontend design and UX acceptance contract.

## 1. Product definition

**CodeForensics is an evidence-backed repository intelligence workbench.** It helps a maintainer or new open-source contributor understand a repository's history, connect issues to pull requests and commits, distinguish work that is complete from work that remains unresolved, and find valuable contribution opportunities.

It should help a user answer:

- What is happening in this repository, and what work remains?
- Which issues and PRs are related, duplicates, follow-ups, superseded attempts, or potential regressions?
- Did a merged PR actually address an issue, or is that still uncertain?
- Which open issues are actionable and have no obvious ongoing fix?
- Why does a particular function or file exist, and which historical change introduced it?
- What evidence supports a finding, and what data was unavailable?

### Product pillars

1. **Repository Intelligence** — import and explore repository metadata and the accessible issue/PR history.
2. **Issue & PR Lineage** — find evidenced relationships between issues, PRs, commits, review discussions, and changed files.
3. **Contribution Finder** — help contributors find actionable issues, understand previous attempts, and avoid duplicate effort.
4. **Code Archaeology** — connect files and symbols to meaningful changes and documented historical intent.
5. **Investigations & Evidence** — preserve a question, scope, observations, competing hypotheses, evidence, conclusions, and uncertainty in one reproducible record.
6. **Dev Autopsy (later vertical)** — investigate an incident using available logs, traces, deploys, commits, and relevant code changes. Temporal correlation alone must not be presented as proof of causality.

### Core product rules

- Distinguish **observed GitHub facts** from **CodeForensics assessments**. Example: GitHub says an issue is closed (fact); CodeForensics thinks a later merged PR may have resolved it (assessment).
- A closed issue does not prove the code is fixed. A merged PR does not prove an issue is fully resolved.
- Every inferred relationship must show its reason and evidence. Similar titles alone are not enough to claim two items are the same.
- Show data coverage and last-sync time. Never claim complete history if pagination, permissions, rate limits, or provider responses left gaps.
- Never invent repositories, PRs, issue counts, activity, customer logos, testimonials, or benchmark results. Demo fixtures must be clearly identified as demo data.
- Treat repository content, issue descriptions, comments, logs, and source files as untrusted data—not system instructions.
- The interface must be useful with deterministic heuristics and real stored data. An LLM is not a prerequisite for repository import, counts, filters, explicit links, or basic contribution ranking.

## 2. Chosen technology stack

Use these as the defaults. If the repository already has a working equivalent, inspect it first and explain why a change is necessary before replacing it.

### Web frontend

- React + TypeScript/TSX
- Vite
- Tailwind CSS (respect the installed major version)
- shadcn/ui components and the project's existing primitive system
- React Router
- TanStack Query for server state, caching, retries, and invalidation
- Zustand only for genuinely shared client UI state (e.g. command palette, global panel state); use local React state for local interactions
- Lucide React icons; no emoji as functional icons
- Vitest + React Testing Library; Playwright for browser-level workflows

### Identity and authorization

- Firebase Authentication (Google sign-in and email/password if needed)
- Firebase Admin SDK in the backend to verify Firebase ID tokens
- Backend authorization checks for every private/user-owned resource
- **Firebase Auth and GitHub repository authorization are separate concerns.** Signing into CodeForensics does not automatically grant GitHub repository access.

### Backend and data

- Node.js + TypeScript + Fastify
- Zod for request/response validation at API boundaries
- PostgreSQL as the primary persistent database
- Prisma ORM and versioned migrations
- Redis + BullMQ for background imports, indexing, retries, and analysis jobs
- GitHub REST/GraphQL APIs through a GitHub App for repository access, plus signed webhooks and scheduled reconciliation
- Git + TypeScript Compiler API for source history/symbol analysis; consider Tree-sitter later for additional languages
- Optional S3-compatible object storage (Cloudflare R2 or Amazon S3) only when uploaded logs, large artifacts, or snapshots require it
- Sentry or equivalent error monitoring once deployed

### Deployment defaults

- Frontend: Vercel or an equivalent static/frontend host
- API and worker: Render, Railway, or another Node-compatible service host
- PostgreSQL: managed PostgreSQL (for example Neon or an equivalent provider)
- Redis: managed Redis (for example Upstash or an equivalent provider)
- Storage: optional; do not add until a workflow needs it

Check current package versions, commands, and hosting constraints before implementation. Do not assume a dependency exists just because it is named here.

## 3. Suggested repository structure

Adapt to the existing repo; this is a target shape, not a reason to rewrite a working project.

```text
codeforensics/
├── apps/
│   ├── web/                  # React + Vite frontend
│   ├── api/                  # Fastify HTTP API
│   └── worker/               # BullMQ processors / isolated Git analysis
├── packages/
│   └── shared/               # Shared API contracts, enums, validation schemas
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docs/
│   ├── architecture.md
│   ├── data-model.md
│   ├── security.md
│   ├── decisions/
│   └── demo-script.md
├── .env.example
├── skills.md
├── README.md
└── package.json              # Workspace scripts, if using a monorepo
```

Keep API routes, services, data access, GitHub integration, job processors, and analysis logic separated. Do not put GitHub API calls or database credentials directly in React components.

## 4. Architecture and data flow

```text
React + TypeScript UI
        │ HTTPS + Firebase ID token
        ▼
Fastify API ─── verify Firebase token + authorize every resource
        │
        ├── PostgreSQL / Prisma ── durable repository and investigation data
        ├── GitHub App/API ─────── repositories, issues, PRs, reviews, commits
        └── BullMQ enqueue ─────── Redis
                                      │
                                      ▼
                              Background worker
                              ├── pagination / sync
                              ├── relationship analysis
                              ├── isolated Git fetch/checkout
                              └── code-history analysis
```

### Data categories to persist

At minimum, the data model should represent:

- Users (Firebase UID as external identity key; do not store passwords yourself)
- GitHub installations/connections and repository records
- Repository sync state, cursors, timestamps, coverage and errors
- Issues and pull requests with stable GitHub IDs, number, title, body, state, labels, authors, timestamps and URLs
- Issue/PR comments, reviews and relevant timeline/cross-reference data needed by implemented workflows
- Commits and changed-file metadata as needed for lineage analysis
- Typed relationships with source, destination, relation type, evidence, method, assessment/confidence label, freshness, and provenance
- Investigation records, scope, findings, evidence references, hypotheses and conclusions
- Saved/bookmarked issues and user preferences, if implemented
- Background jobs or durable job status sufficient to show sync progress and failures

Prefer stable GitHub node/database IDs over titles as keys. Add database uniqueness constraints to prevent duplicate records from repeated syncs. Use transactions for coupled updates.

### Storage decision

PostgreSQL is required for the core product because it needs durable, queryable relationships across repositories, issues, PRs, commits, evidence and investigations. Object storage is optional for the first release. Do not copy every source file into object storage; fetch/cache only what the implemented analysis needs. Repository checkouts should live in controlled temporary worker directories and be removed after processing unless a clear retention policy requires otherwise.

## 5. Development rules for every phase

1. Read this README and `skills.md` before making changes.
2. Inspect the current repository, package files, existing design tokens, routes, auth setup, database schema, tests, and deployment files first.
3. Preserve working code and user-specified constraints. Do not replace the repo with a new scaffold just because it is easier.
4. Implement one coherent vertical slice at a time. Do not create inert pages for features that do not work yet.
5. Use real API/database state for completed features. If credentials are absent, provide a clearly labeled local demo adapter/fixture—not fake production success—and keep the real adapter implementable/testable.
6. Every async action must expose appropriate loading, empty, error, success, permission-denied, and partial-data states.
7. Validate all untrusted input at API boundaries. Never expose server secrets, Firebase Admin credentials, GitHub App private keys, or database connection strings to the browser.
8. Add tests for changed logic, run relevant tests, lint/typecheck/build, and fix the failures caused by the change before marking the phase complete.
9. Update `.env.example`, documentation, and migration/setup instructions when configuration or schema changes.
10. At the end of each phase, report: files changed, workflows completed, commands run and results, environment variables still needed, manual checks still required, and known limitations. Do not claim a test or UI verification happened if it did not.
11. Make a meaningful Git commit after a coherent phase (or instruct the developer to do so if the agent cannot commit). Avoid one giant final commit.
12. Do not silently change stack versions or add a dependency without checking compatibility and explaining why it is needed.

## 6. Phase overview and completion gates

| Phase | Outcome | Priority |
|---|---|---|
| 0. Reconnaissance & product contract | Existing repo assessed; architecture, boundaries and plan agreed | Required first |
| 1. Foundation & design system | Working workspace, app shell, routes, tokens, shared components, CI checks | Core |
| 2. Firebase authentication & authorization | Sign-in, session, protected routes, backend token verification and ownership checks | Core |
| 3. Database and job foundation | Prisma schema, migrations, repository/user ownership, durable jobs and health checks | Core |
| 4. GitHub integration & sync | Connect authorized repositories and import data with pagination, retries and coverage | Core |
| 5. Issue/PR explorer | Search, filters, detailed views, discussion/review history and sync status | Core |
| 6. Relationship intelligence | Evidence-backed issue/PR/commit links and resolution/lineage assessments | Core differentiator |
| 7. Contribution Finder | Explainable ranking of actionable issues, prior attempts and active work | Core differentiator |
| 8. Code archaeology & investigations | Symbol/file history, evidence graph, saved investigation record; incident work as a stretch vertical | Advanced |
| 9. Quality, security, deployment & demo | Reliable release, automated checks, documented setup and demo | Required for submission |

The phases are ordered dependencies, not a promise that every advanced feature should be finished before shipping a working MVP. If time is constrained, finish the core workflows and quality gate before adding incident integrations, vector search, extra languages, collaboration, billing, or offline mode.

---

# Phase prompts

Copy the relevant prompt below into your coding agent. Do not paste every phase simultaneously. The agent should read `README.md` and `skills.md` from the repository before starting.

## Phase 0 — Reconnaissance, scope and implementation plan

**Goal:** Understand the real repository before changing it. This phase is analysis/documentation first; do not implement the entire product yet.

**Prompt:**

```text
You are the senior engineer responsible for CodeForensics. Before writing implementation code, read README.md and skills.md fully. Inspect the existing repository, its Git history where available, package manifests, routes, UI components/tokens, Firebase setup, backend, database, tests, lint/typecheck/build scripts, environment templates and deployment files.

Do not assume the repository is empty. Do not overwrite or recreate working code. Do not install dependencies or make broad changes in this phase.

Product goal: CodeForensics is an evidence-backed repository intelligence workbench. Its priority workflows are (1) connect/index a GitHub repository, (2) explore issues/PRs and their history, (3) inspect evidence-backed issue/PR/commit relationships, (4) find actionable contribution opportunities, and (5) trace relevant source changes into a reproducible investigation.

Chosen defaults: React + Vite + TypeScript, Tailwind CSS, shadcn/ui, React Router, TanStack Query, Firebase Authentication, Node.js + TypeScript + Fastify, Zod, PostgreSQL + Prisma, GitHub App/API + webhooks, and Redis + BullMQ for background processing. Git + TypeScript Compiler API is the first code-history vertical. Object storage is optional, not mandatory.

Create or update these planning documents based on what you actually find:
- docs/implementation-plan.md: ordered phases, dependencies, acceptance criteria and risks.
- docs/architecture.md: actual current architecture plus target architecture and migration path.
- docs/decisions/0001-stack-and-boundaries.md: selected stack and why.
- docs/data-model.md: proposed entities and relationships with stable IDs and tenant/owner boundaries.

Identify conflicts between existing code and this plan. Call out missing credentials and which workflows can be tested without them. Identify risky assumptions and give a minimal path to the first real vertical slice. Do not add fake UI pages or pretend that unconfigured services work.

At completion, report a concise repo audit, the recommended implementation order, files created/updated, and the exact commands needed for the next phase. No product feature implementation in this phase unless a tiny documentation fix is necessary.
```

**Gate:** Architecture and migration plan reflect the existing repository, not an imagined greenfield app.

## Phase 1 — Workspace foundation, app shell and design system

**Goal:** Establish the real project structure and a distinctive, usable frontend foundation without building fake product features.

**Prompt:**

```text
Read README.md, skills.md and docs/implementation-plan.md first. Implement Phase 1 only. Preserve compatible existing code and use the versions/dependencies already present where possible.

Set up or complete the React + Vite + TypeScript frontend and Node.js + TypeScript + Fastify API structure according to the approved plan. If the repo is a monorepo, use the existing workspace manager; do not migrate package managers without a concrete reason. Add shared request/response types only where sharing is useful. Configure strict TypeScript, linting, formatting, test scripts, environment validation, and a simple health endpoint.

Frontend requirements:
- Establish the CodeForensics visual language from skills.md and encode it as semantic design tokens and reusable components.
- Build the actual application shell: sidebar/navigation, top bar, breadcrumb/page title region, global repository context, command/search entry point if implemented, main content area and responsive navigation.
- Add real routes and coherent placeholder-free empty states for the current workflows. Unimplemented routes should clearly say the feature is not available yet or be omitted from navigation; do not fake completed analysis.
- Configure shadcn/ui only in a way compatible with the existing Tailwind major version. Reuse one primitive system and Lucide icons; verify the installed dependencies before importing.
- Create reusable primitives for buttons, fields, badges/status labels, dialogs, table/list rows, skeletons, empty states, inline errors and toast feedback. Implement focus and disabled states.
- Add an error boundary and not-found page.

Backend requirements:
- Fastify bootstrap, typed configuration/environment validation, CORS configured from explicit allowed origins, request IDs, consistent error envelope, health/readiness endpoints, and request validation patterns with Zod.
- Do not add GitHub token handling or pretend auth is already secured; those arrive in later phases.

Add automated smoke tests and a README section for local setup. Run install, typecheck, lint, test and build commands that exist. Do not mark this phase complete if the app fails to start or build. Inspect the rendered UI at wide and narrow viewports if browser tooling is available. Follow skills.md; do not use generic gradient hero sections, meaningless KPI cards, raw emoji icons or duplicated navigation.

At completion, report actual routes, scripts, tests and known gaps.
```

**Gate:** Frontend and API start, routes render, design tokens are centralized, and build/typecheck/lint pass.

## Phase 2 — Firebase authentication and real authorization

**Goal:** Implement identity end-to-end and enforce permissions server-side.

**Prompt:**

```text
Read README.md, skills.md and the existing implementation plan. Implement Phase 2 only: Firebase Authentication and authorization. Do not begin GitHub repository ingestion yet.

Frontend:
- Configure Firebase Web SDK from public VITE_FIREBASE_* configuration values; include a clear .env.example and setup instructions.
- Implement Google sign-in and email/password only if both fit the chosen product scope. Include sign-in, sign-out, session restoration, auth-loading, auth-error and account states.
- Protect private routes without flashing protected content during session restoration. Provide usable redirect behavior and a helpful sign-in empty state.
- Do not put Firebase service-account JSON or privileged credentials in VITE_* variables.

Backend:
- Use Firebase Admin SDK to verify the Firebase ID token from the Authorization: Bearer header for protected routes.
- Derive the authenticated identity from the verified token, never from a client-supplied userId.
- Establish a user record keyed by Firebase UID using an idempotent upsert after verification or through a clearly defined profile initialization flow.
- Define authorization helpers that check resource ownership and membership at the API layer. Deny by default. Add tests for missing, malformed, expired/invalid tokens and cross-user access.
- Keep authentication (who the user is) separate from authorization (what they may access) and separate from future GitHub installation access.

Testing:
- Provide a development/test strategy that does not require committing Firebase credentials.
- Add tests for route guards and API authorization; mock the Firebase verifier in unit tests and document one manual emulator/real-project smoke test.
- Handle expired sessions, offline/network errors, and sign-out cleanly.

Never claim security based only on hiding UI buttons. Never log ID tokens or secrets. Run relevant checks and update docs.
```

**Gate:** An unauthenticated request cannot access protected API resources, and one user's resource cannot be read by another user by changing an ID.

## Phase 3 — PostgreSQL data model, migrations and background-job foundation

**Goal:** Create durable records and a reliable mechanism for long-running work.

**Prompt:**

```text
Read README.md, skills.md, docs/architecture.md and docs/data-model.md. Implement Phase 3 only.

Configure PostgreSQL + Prisma using a DATABASE_URL validated by the server. Create versioned migrations and a repeatable local development setup. Keep Firebase as the identity provider; PostgreSQL is the application's primary database. Do not introduce Firestore unless an explicit, reviewed requirement exists.

Design and implement the minimal durable schema needed for the next phases:
- User/profile keyed by Firebase UID.
- GitHub account/installation and repository records with stable external IDs and owner/membership data.
- RepositorySyncState (status, startedAt, completedAt, lastSuccessfulSyncAt, cursors/checkpoints, coverage metadata, error summary).
- Issue and PullRequest records with stable GitHub IDs, repository relationship, issue/PR number, title, body, state, author, labels, URLs and timestamps. Avoid duplicating issue and PR numbers across repos; use proper compound uniqueness.
- Commit/file metadata and typed relationship/evidence entities only to the degree required by the reviewed data model; document future extensions.
- Investigation and Finding/Evidence references as planned, without implementing analysis yet.
- Job metadata needed to present progress and retry state when appropriate.

Use normalized entities where updates and joins require consistency. Add indexes for repository ID, state, updatedAt, labels where appropriate, and issue/PR numbers. Add unique constraints for upstream IDs and idempotent sync. Use transactions when multiple records must change together.

Configure Redis + BullMQ only if the deployment/local environment can support it; isolate queue creation and worker registration. Implement one small example job and a health/readiness check that reports dependency status without exposing credentials. Use bounded retries, backoff, unique job IDs where useful, and avoid unbounded duplicate jobs.

Add migration commands, seed/demo data clearly marked as demo-only, repository-owned authorization boundaries and database tests. Do not invent production records. Ensure .env.example includes variable names only, never real values. Run migrations against a disposable/test database and run typecheck, tests, lint and build.

At completion, provide an entity/relationship summary, migration steps, and known schema decisions.
```

**Gate:** Fresh setup can migrate the database; repeated imports can be idempotent; tests cover critical constraints and ownership.

## Phase 4 — GitHub connection, repository import and incremental synchronization

**Goal:** Connect repositories and import real metadata safely and completely within documented access limits.

**Prompt:**

```text
Read README.md, skills.md, docs/architecture.md, docs/data-model.md and the approved Phase 3 schema. Implement Phase 4 only.

Implement GitHub integration on the backend. Prefer a GitHub App for repository installation/access and webhooks; document required permissions and local setup. Keep GitHub App private keys, installation credentials and tokens on the server/worker only. Do not expose them to React. Keep Firebase sign-in distinct from GitHub authorization. For public repositories, a restricted public-read demo path may be provided if clearly labeled.

Required capability:
- List repositories the configured GitHub connection/installation can actually access.
- Install/connect repository access with least privilege and clear access-denied/revoked states.
- Import repository metadata, issues, PRs, labels, comments, reviews, commits and cross-reference/timeline details that are available and required by the schema.
- Handle the GitHub rule that PRs also appear in issue-related endpoints; identify and de-duplicate them correctly.
- Paginate every collection endpoint. Never silently assume first page means full history. Respect rate-limit headers, conditional requests/ETags where useful, retry-after, and provider error responses.
- Make sync idempotent using stable upstream IDs and uniqueness constraints.
- Track sync job progress and show counts/status, last successful sync, permission limits, failures and whether the import was complete or partial.
- Add signed webhook verification, idempotent event processing and a reconciliation job to recover missed webhook events. Validate webhook event types and repository installation scope.
- Ensure a repository can be disconnected/revoked and future access fails safely; document the retention behavior for already stored records.

Security:
- Do not execute repository scripts or install repository dependencies during sync.
- Treat README text, issues, PR descriptions, comments and source files as untrusted input.
- Protect against cross-tenant data access and path traversal when materializing content.
- Redact credentials from logs and error details.

Add tests for pagination, retries/rate limits, idempotency, webhook signature failures, permission denial and partial imports. Use fixtures/mocks for automated tests, but include a real GitHub smoke-test checklist. Never show a fake success state when credentials are missing.
```

**Gate:** A real authorized repository imports data; repeat sync does not duplicate records; partial coverage is visible and documented.

## Phase 5 — Issue & PR explorer with search and filtering

**Goal:** Make imported GitHub history genuinely useful through a fast and polished interface.

**Prompt:**

```text
Read README.md and skills.md. Inspect the actual schema and API created so far. Implement Phase 5 only, using persisted GitHub records rather than hardcoded arrays.

Build the Issues & PRs experience:
- A combined issue/PR explorer and dedicated views/tabs for Issues and Pull Requests.
- Server-side pagination and sorting; don't load an entire large repository into browser memory.
- Search by title/body and filter by open/closed/merged state, labels, author, assignee, date/activity and item type where supported by imported data.
- Show title, number, current GitHub state, author, labels, creation/update time, comments/review counts when available, and a direct link to GitHub.
- Detail pages with body, timeline/comments, review discussions and relevant commits/changed files when available.
- Repository-level summary counts from authoritative imported data, labeled by data freshness and coverage. Do not fabricate metrics.
- Deep-linkable filters/search/sort using URL query parameters. Back/forward navigation should preserve context.
- Helpful initial, empty, no-results, loading, partial-sync, rate-limited, permission-denied and recoverable error states.
- Refresh/retry where appropriate without causing duplicate jobs.

Use keyboard-accessible filters, clear active-filter indicators, a one-click reset, compact but readable data density and responsive table/list behavior per skills.md. Use TanStack Query patterns consistently. Show current stale data during background refresh when useful instead of flashing a full-page spinner.

Add route/component/API tests for filters, pagination, loading/error/empty states, URL state and permissions. Include a Playwright happy path if test infrastructure supports it. Do not add unrelated marketing sections or dead action buttons.
```

**Gate:** Users can find and inspect real issues and PRs, paginate results, navigate to detail routes, and understand data freshness/failure states.

## Phase 6 — Issue/PR relationship and resolution intelligence

**Goal:** Connect issue/PR history using observable signals and explainable assessments.

**Prompt:**

```text
Read README.md, skills.md and the existing relationship/evidence data model. Implement Phase 6 only. This is a core differentiator: make repository history navigable and evidence-backed, not a generic chat response.

Create a deterministic relationship pipeline for available repository data. Support typed relationships such as:
- REFERENCES / MENTIONS
- ADDRESSES / PARTIALLY_ADDRESSES
- DUPLICATES / RELATED_TO
- SUPERSEDES / FOLLOWS_UP_ON
- REOPENS / POSSIBLE_REGRESSION_OF
- INTRODUCED_BY / FIXED_BY (only with adequate evidence)
- BLOCKS / BLOCKED_BY when supported by source data

Evidence sources can include explicit GitHub closing keywords/cross-references, PR/issue body references, comments, review discussion, linked commits, merge ancestry, changed file overlap, relevant symbol/diff data when available, and timestamps. Each edge must retain provenance (source type, URL/upstream IDs, excerpt or locator where legally/technically appropriate, detection method, timestamps and analysis version). Distinguish explicit provider links from heuristic suggestions.

Implement resolution assessments separately from GitHub state. Suggested outcomes: likely resolved, partially addressed, unresolved, duplicate, obsolete/not planned, possible regression, or unknown. Store reason/evidence and a qualitative confidence label with policy meaning; do not present confidence labels as calibrated probabilities. When evidence is weak, report unknown/possible relationship instead of forcing a conclusion.

Do not infer a fix solely because a PR title looks similar, files overlap, or a PR was merged. Consider negative evidence: closed without merge, a revert, a successor PR, incomplete history, default branch differences, and later reports that the bug persists. Avoid temporal coincidence as proof of causality.

Build a repository history panel showing linked items with relationship type and why the connection was proposed. From an issue detail page, surface candidate PRs and commits; from a PR, show issues it explicitly or possibly addresses, follow-up/superseding PRs and reverts when evidenced. Allow users to mark a heuristic relation correct/incorrect if feedback is in scope; store feedback separately from source facts.

Add a small, synthetic evaluation fixture set for: explicit closing reference, merged PR without issue reference, closed-unmerged PR, successor PR, duplicate issues, a revert, stale/incomplete sync, and similar title but unrelated change. Measure relationship precision on fixtures, evidence-link validity and abstention behavior. Do not claim universal accuracy from a tiny fixture set.
```

**Gate:** Every proposed connection states why it exists and can link to its source; uncertain cases remain uncertain.

## Phase 7 — Contribution Finder and newcomer onboarding

**Goal:** Help contributors find valuable work and understand how to approach it.

**Prompt:**

```text
Read README.md, skills.md and the current data/relationship APIs. Implement Phase 7 only.

Build a Contribution Finder over the actual imported repository data. Include filters for issue status, labels, language or code area where known, age/recent activity, assigned/unassigned status, related open PRs, linked historical attempts, and difficulty band. Keep the interface focused; do not expose every possible filter simultaneously on smaller screens.

Create a transparent initial ranking based on deterministic factors such as:
- Issue is open and not marked not-planned/duplicate.
- No clearly active PR already appears to address it.
- The issue has enough description/evidence to be actionable.
- A plausible code area and relevant files/tests can be identified.
- A maintainer or author has indicated a next step, if that data exists.
- Similar/duplicate issues and prior failed/superseded attempts are visible.

For each score, show a short explanation of factors used (and important missing data). Do not rely only on a `good first issue` label; do not treat label alone as truth. Difficulty labels must be described as estimates, not facts. Avoid pretending to know an issue is beginner-friendly if repo data is insufficient.

Each issue recommendation should show the original GitHub state and link, why it may be worth investigating, prior related issues/PRs, likely code areas, known prerequisites, and whether active work may already exist. Provide an onboarding path: repository overview, contribution instructions/CONTRIBUTING.md link, relevant architecture docs, test commands when grounded in repository files, and clear next actions.

Keep the ranking algorithm in a testable service with fixtures and documented weights/rules; don't put scoring logic in React components. Add tests for exclusions, duplicate detection, active PR risk, unknown data and stable ordering. UI must have empty states and explain when indexing has not yet gathered enough data.
```

**Gate:** A user can filter recommendations and understand both why an issue was surfaced and why it may not be suitable.

## Phase 8 — Code archaeology, evidence graph and investigations

**Goal:** Connect repository symbols and history to issue/PR history, then preserve the result as a reproducible investigation.

**Prompt:**

```text
Read README.md, skills.md and the implemented repository sync, relationships and schema. Implement Phase 8 in small vertical slices; avoid claiming broad multi-language support unless it works.

Part A — Code archaeology:
- Use an isolated worker to fetch/clone repository history into a temporary controlled directory; enforce size/time limits and cleanup.
- Never run repository scripts or package installation as part of analysis.
- Start with JavaScript/TypeScript using the TypeScript Compiler API. Identify files, exported symbols, definitions and references where practical. Store commit SHA, path and source-span/version locators for findings.
- Trace a selected symbol/file to meaningful history, changed lines, commits and linked PRs/issues. Explain what the evidence says vs what remains inferred. Preserve the specific revision used.
- Add a small test repository fixture with known changes so history traversal can be tested.

Part B — evidence graph:
- Represent nodes such as repository, file, symbol, commit, PR, issue, review/comment, test, deployment/incident (only if present), finding and investigation.
- Represent typed, directed edges. Every inferred edge must carry its evidence/provenance. Keep observed facts and inferred conclusions separate.
- Implement graph queries server-side with bounded depth/node counts. Prevent graph expansion from becoming an unbounded expensive request.
- Show a visual graph only when it helps navigation. Include filters, readable edge labels, source/evidence panel, selected-node details and a keyboard-accessible list/relationship alternative.

Part C — investigation record:
- Users can create an investigation with a question, selected repository/version scope, findings, evidence references, competing hypotheses, conclusion, unknowns and creation/update timestamps.
- Findings must cite their source records/URLs and versioned locators where available. Preserve the model/algorithm version or deterministic method used when necessary to reproduce the result.
- Distinguish FACT, INFERENCE, HYPOTHESIS and UNKNOWN. Citation presence alone does not make an inference true.
- Show coverage limitations and allow users to reopen an existing investigation without losing history.

Part D — Dev Autopsy (stretch vertical, only after A–C works):
- Accept a user-uploaded log/stack trace or manually entered incident description; object storage is optional for the first implementation.
- Correlate against available commits/PRs and repository changes within a selected time/version window. Present competing causes and counterevidence.
- Do not claim a causal chain unless each transition has a mechanism and supporting evidence. Label temporal correlations as candidates.
- Redact secrets and cap upload size/content length. Treat uploaded text as untrusted data. Do not fetch arbitrary URLs from it.

Add tests for file-history/symbol locators, graph bounds, authorization of evidence access, unsupported file types, temporary directory cleanup, and investigation persistence. Update UI states, documentation and known language limits.
```

**Gate:** The same investigation can be reopened with evidence intact; source findings are tied to a repository revision; unsupported inferences are not displayed as facts.

## Phase 9 — Reliability, security, UX audit, deployment and final demo

**Goal:** Ship a complete, testable application rather than a collection of partially working features.

**Prompt:**

```text
Read README.md and skills.md. Audit the implemented application against the acceptance criteria from all completed phases. Do not add a new major feature in this phase unless it fixes a blocker in a core workflow.

Reliability and testing:
- Run lint, TypeScript checks, unit/component tests, API/integration tests and production build; fix failures introduced by the project.
- Add/complete Playwright flows for sign-in, connect repository, import status, search/filter issue or PR, inspect a relation and save/reopen an investigation (only for workflows implemented).
- Verify loading, empty, no-results, permission-denied, partial-data, rate-limit, retry, success and unrecoverable error states.
- Check slow network behavior and ensure repeat clicks/webhook deliveries do not create duplicate records or jobs.
- Ensure background job failures are visible, retries are bounded and users can recover where appropriate.

Security:
- Verify Firebase token checks and backend ownership checks on all private routes.
- Verify GitHub App credentials and DB secrets are server-only; remove secrets from logs and sample files.
- Verify webhook signature validation and idempotency.
- Validate inputs and file paths; cap request/file/job sizes; prevent cross-user/cross-repository evidence access; handle revoked GitHub permissions.
- Treat repository contents, comments and logs as hostile input. Never execute code being analyzed or install dependencies from the repository.

UI/UX:
- Apply the entire skills.md contract. Render the actual application at the default state on wide and narrow viewports if browser tooling is available. Perform primary workflows instead of inspecting only a static screenshot. Fix clipping, unreadable data density, dead controls, poor focus states, duplicated metrics, fake placeholders, inconsistent spacing and confusing feedback.
- Run a separate usability/accessibility pass if another reviewer/agent is available. Re-render and re-test after changes; do not claim visual verification unless the rendered result was actually viewed.
- Check keyboard navigation, focus visibility, labels, contrast, semantic tables, reduced-motion preference and responsive overflow.

Deployment/docs:
- Configure production environment variables using secret management, apply migrations safely, deploy frontend/API/worker and managed services, configure CORS and GitHub App URLs/webhooks, and run post-deploy health checks.
- Update README with problem statement, target users, product workflows, accurate feature list, stack, architecture, local setup, environment variable names, migrations, tests, deployment and limitations.
- Create docs/security.md, docs/demo-script.md and a 3–5 minute product demo sequence. Ensure the demo is from the running application and show real functionality. Label demo-only data.

Report: commands and actual results, deployed URLs, variables still required, manual smoke tests performed, data/import coverage limitations, known defects, and features intentionally deferred. Do not mark an item complete without evidence.
```

**Gate:** The core workflows work end-to-end, are documented, and can be demonstrated without an evaluator reconstructing the environment.

---

## 7. Suggested MVP boundary

For the first public/student release, prioritize **three or four workflows deeply**:

1. Sign in and connect one accessible GitHub repository.
2. Import and browse real issue/PR history with search, filters, and honest sync status.
3. Follow evidenced issue → PR → commit relationships and view possible superseded/follow-up work.
4. Find candidate contribution issues and see why each was recommended.

Then add a smaller but real code-history slice: select a file/symbol, inspect its history and linked changes, and save that evidence in an investigation. Treat comprehensive multi-language analysis, incident integrations, semantic vector search, paid plans, collaboration, and offline mode as later work unless the core is already reliable.

## 8. Environment variable checklist

Use `.env.example` to document names only. Validate required variables during server startup, and never commit actual values.

```dotenv
# Web — public Firebase configuration only (safe to expose by design)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=

# API / worker — server-side secrets
DATABASE_URL=
REDIS_URL=
FIREBASE_PROJECT_ID=
GOOGLE_APPLICATION_CREDENTIALS=
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_APP_WEBHOOK_SECRET=
GITHUB_APP_CLIENT_ID=
GITHUB_APP_CLIENT_SECRET=
GITHUB_APP_CALLBACK_URL=
WEB_ORIGIN=
API_PUBLIC_URL=

# Optional object storage, only if implemented
OBJECT_STORAGE_ENDPOINT=
OBJECT_STORAGE_BUCKET=
OBJECT_STORAGE_ACCESS_KEY_ID=
OBJECT_STORAGE_SECRET_ACCESS_KEY=
```

Adjust names to the actual implementation and chosen hosting provider. Do not use a private service-account file in the frontend or commit it to Git. Prefer the platform's secret manager for production credentials.

## 9. Final definition of done

- [ ] A new developer can follow the documented local setup.
- [ ] The deployed frontend and API are accessible to evaluators.
- [ ] Sign-in and server-side authorization work.
- [ ] At least one real repository can be connected and imported.
- [ ] Import status and coverage limitations are visible.
- [ ] Issue/PR search, filters and detail pages use persisted data.
- [ ] Relationship claims show their evidence and distinguish facts from assessments.
- [ ] Contribution recommendations provide understandable reasons and expose uncertainty.
- [ ] Core test/build/typecheck/lint commands pass and actual output is reported.
- [ ] No secrets are committed or shipped to the browser.
- [ ] UI works at desktop and mobile widths and supports keyboard/focus states.
- [ ] README, architecture notes, environment template, demo script and known limitations are current.
- [ ] Git history reflects coherent development commits.

## 10. UI skill references

`skills.md` is the local, CodeForensics-specific contract. It is informed by these relevant skills from [`sickn33/agentic-awesome-skills`](https://github.com/sickn33/agentic-awesome-skills):

- [anti-slop-design](https://github.com/sickn33/agentic-awesome-skills/tree/main/skills/anti-slop-design)
- [anti-ui-slop](https://github.com/sickn33/agentic-awesome-skills/tree/main/skills/anti-ui-slop)
- [build-ui](https://github.com/sickn33/agentic-awesome-skills/tree/main/skills/build-ui)
- [design-ux](https://github.com/sickn33/agentic-awesome-skills/tree/main/skills/design-ux)
- [design-taste-frontend](https://github.com/sickn33/agentic-awesome-skills/tree/main/skills/design-taste-frontend)
- [baseline-ui](https://github.com/sickn33/agentic-awesome-skills/tree/main/skills/baseline-ui)
- [design-system](https://github.com/sickn33/agentic-awesome-skills/tree/main/skills/design-system)
- [accessibility-compliance-accessibility-audit](https://github.com/sickn33/agentic-awesome-skills/tree/main/skills/accessibility-compliance-accessibility-audit)
- [code-showcase-react-ui-patterns](https://github.com/sickn33/agentic-awesome-skills/tree/main/skills/code-showcase-react-ui-patterns)
- [Repository design QA notes](https://github.com/sickn33/agentic-awesome-skills/blob/main/design-qa.md)

The local document synthesizes selected guidance for this product; it does not reproduce the upstream skills wholesale. Check the upstream repository for license and current installation instructions before copying or installing individual skills.
