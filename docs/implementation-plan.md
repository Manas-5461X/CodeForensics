# CodeForensics — Phased Implementation Plan

## Overview & Execution Strategy

CodeForensics is delivered through deliberate, testable phases. Each phase represents a discrete vertical slice that preserves existing functionality and verifies behavior with automated tests before advancing.

---

### Phase 0: Repository Audit & Foundation Setup (Current Phase)
- **Goal:** Audit existing repository, establish monorepo structure, build foundational Fastify API, worker queue abstractions, React frontend shell, Prisma schema, and initial test suites.
- **Deliverables:**
  - Monorepo structure (`apps/web`, `apps/api`, `apps/worker`, `packages/shared`, `prisma`, `docs`).
  - Strict TypeScript configurations, `.env.example`, `.gitignore`.
  - Fastify API with health checks and consistent error envelopes.
  - BullMQ sync queue and retry configuration.
  - React workbench shell adhering to `skills.md` design tokens.
  - Core Prisma schema foundation.
- **Completion Gate:** Type checking, unit tests, and production builds pass cleanly across all workspaces.

---

### Phase 1: Workspace Foundation, App Shell & Design System
- **Goal:** Deepen frontend components with complete shadcn/ui primitives, keyboard navigation, accessible states, and responsive layouts.
- **Prerequisites:** Phase 0 foundation.
- **Completion Gate:** All core routes render without placeholders, UI passes responsive checks, and zero lint/type errors exist.

---

### Phase 2: Firebase Authentication & Real Authorization (Completed)
- **Goal:** End-to-end user identity via Firebase Web SDK and backend token verification using Firebase Admin SDK.
- **Deliverables:**
  - Sign-in, sign-out, session restoration in `apps/web` via `AuthContext` and `useAuth`.
  - Protected workbench routes via `ProtectedRoute` guard while preserving 100% public access to `/`.
  - Reusable `apiClient` injecting bearer ID tokens automatically.
  - Fastify Bearer token verification hook in `apps/api` via `authPlugin` and `TokenVerifier`.
  - Server-side resource ownership checks denying cross-user access with 403 `FORBIDDEN`.
- **Completion Gate:** Unauthenticated requests rejected with 401; cross-user resource manipulation rejected with 403; public landing page preserved; automated tests passing across workspaces.

---

### Phase 3: Database Migrations & Durable Job Foundation (Completed)
- **Goal:** Versioned Prisma schema and migration preparation for PostgreSQL, dynamic database connectivity probes, BullMQ queue and worker infrastructure with exponential backoff retry policies, and clean resource disposal.
- **Deliverables:**
  - Prisma schema validated with PostgreSQL models (`users`, `github_installations`, `repositories`, `repository_sync_states`, `issues`, `pull_requests`, `relationships`, `investigations`, `job_records`).
  - Generated initial versioned migration: `prisma/migrations/20261023000000_init/migration.sql` and `migration_lock.toml`.
  - Generated `@prisma/client` artifacts (v6.19.3).
  - Database connectivity probe module in `apps/api/src/db/prisma.ts` with graceful query timeout and clean disconnect on shutdown.
  - Dynamic service health checks in Fastify `/health` probe (reporting `connected`, `disconnected`, or `disabled`).
  - BullMQ queue and worker infrastructure in `apps/worker` with exponential backoff (3 attempts, 5s delay), progress reporting, secret redaction, and clean connection teardown.
  - Automated test suites verifying database probes, queue policies, job validation, and worker teardown.
- **Completion Gate:** Migrations verified, BullMQ queue lifecycle and worker shutdown tested, automated test suites passing across all workspaces.

---

### Phase 4: GitHub Integration & Observable Synchronization (Completed)
- **Goal:** Connect authorized GitHub repositories via GitHub App credentials and import metadata with pagination, rate-limit backoff, and coverage indicators.
- **Deliverables:**
  - GitHub App integration service (`GitHubAppService`) in `apps/api` using maintained `@octokit` library with automatic token rotation, installation repository discovery, and HMAC-SHA256 webhook signature verification.
  - Server-side authorization check enforcing repository ownership and installation access; never trusting client-supplied IDs without server verification.
  - Repository and sync state persistence layer (`RepositoryStore` with `PrismaRepositoryStore` and isolated `InMemoryRepositoryStore`).
  - Fastify API endpoints under `/api/v1`:
    - `GET /github/installations` (authenticated installation discovery)
    - `GET /github/installations/:installationId/repositories` (accessible repos)
    - `POST /repositories/select` (server-side verification and registration)
    - `GET /repositories` and `GET /repositories/:owner/:repo` (tracked repository inspection)
    - `POST /repositories/:owner/:repo/sync` (asynchronous sync job triggering with deduplication)
    - `GET /repositories/:owner/:repo/sync` (observable live sync status, progress, checkpoints, error summary)
    - `POST /github/webhook` (verified webhook event handler)
  - Observable worker sync pipeline (`executeRepositorySync`) in `apps/worker` with paginated issues and PRs ingestion, rate-limit remaining and retry-after inspection, honest `PARTIAL` status reporting, idempotent storage upserts, and BullMQ progress reporting.
  - Interactive workbench UI in `apps/web` with `RepositoryContext`, `RepositorySelectModal` supporting installation discovery and custom entry, and live sync triggering and polling in `TopBar` and `OverviewPage`.
  - Comprehensive automated test suites verifying GitHub installation discovery, repository authorization, webhook signature verification, pagination, rate limit backoff, sync idempotency, and partial failure handling.
- **Completion Gate:** Repository records persist idempotently; partial imports report honest coverage limitations; test suites passing across all workspaces.

---

### Phase 5: Issue & PR Explorer (Completed)
- **Goal:** Search, filter, and inspect persisted issues and pull requests with full metadata, discussion timelines, and diff inspection.
- **Deliverables:**
  - Shared API contracts and Zod validation schemas in `@codeforensics/shared` (`WorkItemSummary`, `WorkItemDetail`, `WorkItemQuerySchema`, `TimelineEvent`, `DiffSummary`).
  - Unified repository data store methods (`listWorkItems` and `getWorkItem`) with multi-key sorting, search, state normalization (`open`, `closed`, `merged`, `draft`), and deterministic server-side pagination for both `InMemoryRepositoryStore` and `PrismaRepositoryStore`.
  - Fastify API endpoints under `/api/v1`:
    - `GET /repositories/:owner/:repo/items` (server-side filtering by type, state, label, search query, multi-key sort, pagination, and sync coverage warning headers).
    - `GET /repositories/:owner/:repo/items/:number` (detailed issue and pull request record with branch metadata, draft status, and live GitHub App integration enrichment where available).
    - `GET /repositories/:owner/:repo/items/:number/timeline` (discussion events or honest un-ingested notice).
    - `GET /repositories/:owner/:repo/items/:number/diff` (pull request file changes or honest un-ingested notice).
  - Modern, accessible, antislop-guided workbench explorer in `apps/web`:
    - `IssuesPage.tsx`: unified table with search, type tabs, state filters, sort dropdown, loading skeletons, empty states, and pagination controls.
    - `WorkItemDetailDrawer.tsx`: slide-over investigation drawer with overview, description body, labels cloud, discussion timeline, and PR diff views, with keyboard accessibility (Escape) and authoritative provenance badges.
    - Honest state handling: unsynced repository warnings, partial sync banners, and honest explanations when timelines or diffs were not part of initial tier metadata ingestion.
  - Comprehensive automated test suites:
    - `apps/api/test/items.test.ts`: 19 automated tests verifying authorization, 404 handling, pagination, filtering by type/state/label, search, sorting, and detail endpoints.
    - `apps/web/test/IssuesExplorer.test.tsx`: 5 automated tests verifying empty states, unsynced repository actions, table rendering, drawer interactions, and honest API error states.
- **Completion Gate:** Fast, paginated search powered by persisted records with clear separation of observed GitHub provider state from inferred forensic verification; test suites passing across all workspaces.

---

### Phase 6: Relationship Intelligence & Resolution Assessment (Completed)
- **Goal:** Deterministic analysis detecting explicit and inferred relationships (`ADDRESSES`, `SUPERSEDES`, `FIXED_BY`) with provenance, evidence citations, and conservative uncertainty.
- **Deliverables:**
  - Deterministic relationship intelligence engine (`RelationshipEngine`) in `apps/api/src/intelligence/relationshipEngine.ts` supporting:
    - `ADDRESSES`: PR references or closing directives targeting issues.
    - `SUPERSEDES`: PR explicitly replaces or obsoletes an earlier PR.
    - `FIXED_BY`: Merged PR targeting an issue with verified closing keyword directive.
    - Strict evidentiary discipline: Shared titles/keywords alone never establish relationships; closed issues without linked PRs in ingested records produce `UNKNOWN` resolution status with `NOT_ASSESSED` confidence.
  - Conservative resolution assessment (`assessIssueResolution`):
    - Categorizes issues as `RESOLVED`, `PARTIALLY_ADDRESSED`, `UNRESOLVED`, or `UNKNOWN`.
    - Distinguishes direct GitHub facts from CodeForensics inferences (`ClaimCategory`).
    - Assigns confidence tiers (`HIGH`, `MEDIUM`, `LOW`, `NOT_ASSESSED`) with explicit rationales and limitation disclosures.
  - Idempotent relationship persistence in `InMemoryRepositoryStore` and `PrismaRepositoryStore` with deterministic unique keys preventing duplicate creation during repeated synchronization runs.
  - Authenticated Fastify API endpoints with Zod schema validation:
    - `GET /api/v1/repositories/:owner/:repo/relationships` (filterable by `itemNumber` and relationship `type`).
    - `GET /api/v1/repositories/:owner/:repo/items/:number/relationships` (work-item specific relationships).
    - `GET /api/v1/repositories/:owner/:repo/items/:number/resolution` (issue-specific resolution assessment with coverage notes).
  - Modern, accessible, antislop-crafted workbench UI in `apps/web`:
    - `IssuesPage.tsx`: table rows display resolution status badges (`RESOLVED`, `PARTIALLY_ADDRESSED`, `UNRESOLVED`, `UNKNOWN`) and relationship count pills.
    - `WorkItemDetailDrawer.tsx`: Overview tab summary card and dedicated **"Relationships & Resolution"** tab.
    - **"Why Linked?" Deep Inspection Experience**: Expandable drawer card displaying exact rule ID, rule description, verbatim text excerpt with matched keyword, confidence rationale, why not classified more strongly, and honest limitation disclosures.
    - Interactive cross-entity navigation: Click any source or target entity badge to jump directly to its investigation drawer.
  - Comprehensive automated test suites:
    - `apps/api/test/relationships.test.ts`: 16 automated tests covering deterministic closing references, unmerged PR confidence downgrading, superseding directives, bare references, duplicate prevention, incomplete sync coverage handling, and API security/validation.
    - `apps/web/test/RelationshipsUI.test.tsx`: 3 automated tests verifying resolution badges, "Why Linked?" evidence disclosure toggle, and unknown closure states.
- **Completion Gate:** Inferred relationships display explainable "Why Linked?" evidence details; conservative resolution assessments report honest data-coverage limitations; test suites passing across all workspaces.

---

### Phase 7: Contribution Finder (Completed)
- **Goal:** Actionable contributor discovery and open-issue ranking with deterministic explainable scoring, volume dampening, and subsystem ownership risk indicators.
- **Deliverables:**
  - Shared contributor intelligence contracts and Zod validation schemas in `@codeforensics/shared`:
    - `ContributorRecommendation`, `ContributorSignal`, `ContributorExperienceTier`, `RecencySignal`, `MaintenanceRisk`, `ContributionAnalysisResult`, `TargetItemSummary`, `RelevantWorkItem`.
    - `ContributorQuerySchema` supporting `itemNumber`, `subsystem`, and `limit` parameters.
  - Deterministic recommendation and ownership risk engine (`ContributionEngine`) in `apps/api/src/intelligence/contributionEngine.ts`:
    - Subsystem extraction from issue/PR labels, titles (`[devtools]`, `compiler:`), and file path patterns.
    - Deterministic signals: direct fixes (+35), direct references (+20), log-dampened subsystem frequency (+13 to +30), recency multipliers (+20 for recent, +8 for stale, +0 for dormant), and issue authorship.
    - Volume dampening using logarithmic scaling (`log2(1 + count)`) ensuring prolific raw commit counts do not drown out specialized subsystem experts.
    - Deterministic tie-breaking by `(normalizedScore DESC, latestActivityDate DESC, directFixCount DESC, login ASC)`.
    - Subsystem ownership and maintenance risk signals: concentrated ownership alerts (bus factor when >= 60% of merged subsystem PRs authored by a single contributor), stale maintenance alerts (> 180 days without merged activity), and incomplete sync coverage caveats.
    - Transparent evidentiary explanations: every recommendation details exact signal weights, timestamps, and data coverage notes.
  - Repository store methods (`getContributorRecommendations`) implemented in both `InMemoryRepositoryStore` and `PrismaRepositoryStore`.
  - Authenticated Fastify API endpoints with Zod schema validation:
    - `GET /api/v1/repositories/:owner/:repo/contributors/recommendations` (repository-wide or filtered by target issue and subsystem).
    - `GET /api/v1/repositories/:owner/:repo/items/:number/contributors` (work-item specific contributor recommendations).
  - Modern, accessible, antislop-crafted workbench UI in `apps/web`:
    - `ContributionsPage.tsx`: interactive target issue selector, subsystem quick filters, maintenance and ownership risk banners, ranked contributor cards with score gauges (0-100), experience tiers (`PRIMARY_MAINTAINER`, `ACTIVE_CONTRIBUTOR`, `HISTORICAL_CONTRIBUTOR`, `INCIDENTAL`), recency badges (`RECENT`, `STALE`, `DORMANT`), "Why Recommended?" point breakdown, expandable relevant authored work items, and actionable open opportunities explorer.
    - Honest state handling: unsynced repository empty states, loading skeletons, error states with retry actions, and data coverage limitation caveats.
  - Comprehensive automated test suites:
    - `apps/api/test/contributions.test.ts`: 10 automated tests verifying direct fix prioritization, logarithmic volume dampening, deterministic alphabetical tie-breaking, concentrated ownership detection, stale maintenance alerts, partial sync caveats, authentication, and 400/404 parameter validation.
    - `apps/web/test/ContributionsUI.test.tsx`: 8 automated tests verifying unsynced states, ranked cards, score gauges, risk banners, expandable work items, coverage notes, filter resets, and error handling.
- **Completion Gate:** Maintainer-friendly recommendation engine with transparent criteria, deterministic tie-breaking, ownership risk indicators, and honest data coverage disclosures; all 126 automated tests passing across workspaces.

---

### Phase 8: Code Archaeology & Saved Investigations (Completed)
- **Goal:** AST and Git revision tracing for JavaScript/TypeScript symbols, connecting functions to historical commits and preserved investigations.
- **Deliverables:**
  - Shared archaeology and persistent investigation contracts and Zod validation schemas in `@codeforensics/shared`:
    - `SymbolKind`, `SourceSymbol`, `FileSymbolCatalog`, `CommitRevision`, `LineHistoryEntry`, `ArchaeologyTraceResult`.
    - `InvestigationStatus`, `InvestigationEvidenceItem`, `InvestigationRecord`, `CreateInvestigationInput`, `UpdateInvestigationInput`.
    - `ArchaeologyQuerySchema`, `InvestigationStatusSchema`, `InvestigationEvidenceItemSchema`, `CreateSavedInvestigationSchema`, `UpdateSavedInvestigationSchema`, `InvestigationQuerySchema`.
  - Safe Code Archaeology and AST Symbol Discovery Engine (`ArchaeologyEngine`) in `apps/api/src/intelligence/archaeologyEngine.ts`:
    - Static analysis of JavaScript/TypeScript using the TypeScript Compiler API (`ts.createSourceFile`) without arbitrary repository code execution.
    - Path traversal prevention: strictly rejects parent directory escapes (`..`), absolute drive letters, and null-byte injection.
    - Multi-kind symbol extraction: functions, React hooks, classes, class methods, interfaces, type aliases, and exported variables with 1-indexed line and column ranges.
    - Git revision lineage: synthesizes chronological revisions from ingested pull requests and commits, generating valid GitHub commit and file URLs with exact line ranges (`#L184-L210`).
    - Evidentiary discipline: distinguishes source-code facts from historical interpretations, including explicit disclaimers and data coverage caveats.
  - Persistent Saved Investigation CRUD and Repository Store integration:
    - `traceArchaeology`, `listInvestigations`, `getInvestigation`, `createInvestigation`, `updateInvestigation`, and `deleteInvestigation` implemented in both `InMemoryRepositoryStore` and `PrismaRepositoryStore`.
    - Server-side user ownership enforced on every investigation operation (`userId === authenticatedUser.uid`), preventing spoofing and cross-user data leakage.
    - Structured evidence citations linking issues, pull requests, commits, files, and symbols with claim categories (`FACT`, `INFERENCE`, `HYPOTHESIS`, `UNKNOWN`) and uncertainty notes.
  - Authenticated Fastify API endpoints with Zod validation:
    - `GET /api/v1/repositories/:owner/:repo/archaeology/trace` (symbol and file tracing).
    - `GET /api/v1/investigations` (list user investigations with repository and status filters).
    - `POST /api/v1/investigations` (create new saved investigation).
    - `GET /api/v1/investigations/:id` (retrieve investigation with ownership check).
    - `PATCH /api/v1/investigations/:id` (update investigation with ownership check).
    - `DELETE /api/v1/investigations/:id` (delete investigation with ownership check).
  - Modern, accessible, antislop-crafted workbench UI in `apps/web`:
    - `ArchaeologyPage.tsx`: interactive search input with quick suggestion pills, AST symbol overview card, GitHub file link, chronological revision timeline, and one-click "Preserve in Investigation" action.
    - `InvestigationsPage.tsx`: master-detail forensic investigation workbench, filterable by status (`all`, `open`, `in_progress`, `resolved`, `inconclusive`), search by query, modal creation form with auto-prefill support, inline hypothesis/observation/finding publishing, and delete confirmation dialog.
    - Honest state handling: unsynced repository empty states, loading skeletons, error retry actions, and coverage limitation caveats.
  - Comprehensive automated test suites:
    - `apps/api/test/archaeology.test.ts`: 11 automated tests covering AST symbol discovery, path traversal rejection, absolute path blocking, null-byte rejection, unsupported language handling, and API integration.
    - `apps/api/test/investigations.test.ts`: 8 automated tests covering complete CRUD lifecycle, cross-user isolation (User B cannot view/update/delete User A's record), and spoofed userId rejection.
    - `apps/web/test/ArchaeologyUI.test.tsx`: 7 automated tests verifying empty states, unsynced banner, AST metadata rendering, revision timeline, and disclaimer notes.
    - `apps/web/test/InvestigationsUI.test.tsx`: 6 automated tests verifying empty states, investigation list rendering, modal form submission, hypothesis additions, and delete confirmation.
- **Completion Gate:** Users can create, save, and revisit structured investigation records; AST symbol discovery and revision tracing operate safely on untrusted repositories; 165 automated tests passing across workspaces.

---

### Phase 9: Final Product Hardening & Release Readiness (Completed)
- **Goal:** Production quality pass, in-app documentation, security headers, comprehensive README, supporting technical documentation, and release readiness verification.
- **Deliverables:**
  - Agentic Awesome Skills application (`design-taste-frontend`, `design-ux`, `design-system`, `ui-states`, `fixing-accessibility`, `readme`):
    - Strict visual discipline: deep slate blue, charcoal, muted cyan, intentional whitespace, zero decorative AI clichés, no em dashes in UI copy.
    - Responsive layouts across mobile (390px), tablet (768px), and desktop (1024px+), eliminating unintended horizontal overflow.
  - In-App Developer Documentation (`apps/web/src/pages/DocsPage.tsx` at `/app/docs`):
    - 10 comprehensive chapters: Product Overview, GitHub Connection & Permissions, Repository Synchronization, Issues & PRs, Relationship Intelligence, Contribution Recommendations, Code Archaeology, Saved Investigations, Authentication & Security, and Troubleshooting.
    - Interactive chapter search, breadcrumbs, previous/next chapter navigation, and copyable code snippets.
    - Integrated with `Sidebar.tsx` navigation, `TopBar.tsx` action bar, and `LandingPage.tsx` navbar.
  - HTTP Gateway Hardening & Security Headers (`apps/api/src/app.ts`):
    - `X-Content-Type-Options: nosniff` (MIME sniffing defense).
    - `X-Frame-Options: DENY` (clickjacking defense).
    - `Referrer-Policy: strict-origin-when-cross-origin` (referrer token leakage protection).
    - `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
  - Comprehensive Repository Documentation:
    - Root `README.md` completely rewritten to cover all 20 specified sections: purpose, differentiators, capabilities, architecture diagram, stack, quickstart, environment variables, Firebase setup, GitHub App setup, Prisma migrations, BullMQ worker, commands, API reference, security, limitations, and deployment.
    - Supporting technical docs created/updated in `docs/`: `architecture.md`, `development-setup.md`, `environment-variables.md`, `security.md`, `api.md`, `data-model.md`, `github-integration.md`, `troubleshooting.md`, and `release-readiness.md`.
  - Orchestration & Quickstart:
    - `docker-compose.yml` for local PostgreSQL 16 and Redis 7 with container healthchecks.
    - `setup.md` complete walkthrough from zero to live deployment.
  - Automated Verification:
    - Added `apps/api/test/api.test.ts` security headers and degraded health check tests.
    - Added `apps/web/test/DocsUI.test.tsx` (6 tests) covering documentation rendering, chapter switching, search filtering, breadcrumbs, and snippet copying.
    - Total: 173 automated tests passing across 21 test files (shared: 7, api: 106, web: 45, worker: 15).
    - Clean typechecks (`tsc --noEmit`) and production builds (`vite build` + `tsc`) across all 4 workspaces.
- **Completion Gate:** Codebase is hardened, fully documented, resiliently tested, and conditionally ready for cloud deployment.

