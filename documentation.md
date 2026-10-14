# CodeForensics --- Product & Technical Documentation

> **Document purpose:** This document defines what CodeForensics is, who
> it serves, how its major capabilities should behave, and the technical
> architecture intended to support them. It is the product and
> engineering reference for implementation, testing, deployment, and
> future development.
>
> **Implementation companion:** Use [`README.md`](./README.md) for the
> phased development plan and copy-paste prompts. Use
> [`skills.md`](./skills.md) as the mandatory frontend design and UX
> contract.
>
> **Status:** Product/architecture specification. Any feature must be
> treated as implemented only after it exists in the codebase, is
> connected to its real data path, and passes its acceptance checks.

------------------------------------------------------------------------

## 1. Executive Summary

**CodeForensics is an evidence-backed repository intelligence workbench
for understanding how a software repository evolves and what work
remains.**

It helps maintainers and contributors explore a repository's issues,
pull requests, commits, code changes, discussions, and history as
connected evidence rather than disconnected GitHub pages. Its purpose is
to reduce the time required to understand an unfamiliar codebase,
determine whether a problem has already been addressed, trace previous
implementation attempts, and identify meaningful contribution
opportunities.

CodeForensics is not intended to be a generic chat interface placed on
top of a repository. Its core value is the structured collection,
linking, analysis, and presentation of repository evidence. Explanations
and inferred relationships must be traceable to the underlying records.

The system must clearly separate:

-   **Observed facts:** data directly obtained from GitHub, Git, source
    files, or user-provided artifacts.
-   **Assessments:** conclusions produced by deterministic rules or
    analysis.
-   **Hypotheses:** plausible explanations that still require
    verification.
-   **Unknowns and coverage gaps:** information the system could not
    establish from available evidence.

A closed issue is not automatically a fixed bug, and a merged pull
request is not automatic proof that an issue was fully resolved.
CodeForensics must communicate uncertainty instead of overstating
conclusions.

## 2. Problem Statement

Open-source repository information is distributed across issues, pull
requests, review comments, commits, branches, releases, source files,
tests, and documentation. A new contributor often has to manually
connect these records to answer basic but important questions:

-   Has this problem already been fixed?
-   Is another contributor working on it?
-   Was an earlier pull request replaced by a newer one?
-   Did a previous implementation attempt fail, get abandoned, or get
    reverted?
-   Which issues are duplicates or part of a larger problem?
-   Which parts of the code are relevant to an issue?
-   Why does a function or design decision exist?
-   Which issue is a sensible contribution for someone new to this
    repository?
-   What evidence supports an explanation, and what data is missing?

CodeForensics organizes the accessible history and surfaces these
connections with evidence and explicit uncertainty.

## 3. Product Goals

### 3.1 Primary goals

1.  Make repository history understandable without requiring users to
    manually open hundreds of GitHub pages.
2.  Import and explore accessible issue and pull-request history.
3.  Distinguish GitHub state from inferred resolution status.
4.  Identify meaningful relationships between issues, PRs, commits,
    files, tests, and discussions.
5.  Help contributors discover actionable issues while reducing
    duplicate work.
6.  Trace files and symbols to historical changes and documented intent.
7.  Preserve investigations as reproducible records with scope,
    evidence, findings, and limitations.
8.  Make all important conclusions inspectable and easy to verify.

### 3.2 Non-goals for the initial release

The initial release does not need to provide every possible developer
platform feature. The following are not core requirements:

-   Billing, subscriptions, or paid usage plans.
-   A full team chat or real-time collaborative editor.
-   Offline-first application behavior.
-   A dedicated graph database.
-   A separate search cluster before PostgreSQL search proves
    insufficient.
-   Vector search or embeddings before a clear retrieval need exists.
-   Comprehensive static analysis for every programming language.
-   Automatic code changes, automatic pull-request creation, or
    automatic merging.
-   Running arbitrary repository scripts or installing dependencies from
    untrusted repositories.
-   A guarantee that all repository history can always be retrieved.

Advanced incident investigation using logs, traces, deployments, and
production telemetry is a later product vertical, not a prerequisite for
the first working release.

## 4. Target Users and Use Cases

### 4.1 New open-source contributor

**Need:** Understand the repository quickly and choose a useful first
contribution.

Typical workflow: 1. Open or connect a repository. 2. Review the
repository overview and synchronization coverage. 3. Browse open issues
and relevant historical discussions. 4. Inspect related PRs, earlier
attempts, duplicate reports, and active work. 5. Review relevant source
files and tests. 6. Evaluate an issue's estimated scope and difficulty.
7. Open the original GitHub records and begin work with less guesswork.

### 4.2 Repository maintainer

**Need:** Understand unresolved work, recurring problems, and the
relationship between issue reports and implementation activity.

Typical workflow: 1. Review repository issue/PR statistics and sync
freshness. 2. Find issues that may have been addressed but remain open.
3. Identify closed issues without a verifiable implementation link. 4.
Review duplicate clusters, follow-up work, superseded PRs, and possible
regressions. 5. Inspect evidence supporting each assessment. 6. Use the
findings to prioritize triage and maintenance.

### 4.3 Experienced engineer investigating code history

**Need:** Understand why a code path exists and what might be affected
by a change.

Typical workflow: 1. Locate a file, function, class, or symbol. 2.
Inspect its history and relevant diffs. 3. Follow changes to commits,
PRs, issues, reviews, and tests. 4. Review the evidence for the original
intent and later modifications. 5. Save the investigation with source
versions and known limitations.

## 5. Product Pillars

### 5.1 Repository Intelligence

Imports and presents accessible repository metadata, issues, PRs,
comments, reviews, commits, labels, cross-references, and selected
changed-file information. The interface shows import progress, last
synchronization time, failures, and coverage gaps.

### 5.2 Issue & PR Lineage Intelligence

Finds and presents evidence-backed relationships between repository work
items. Examples include duplicate issues, PRs that address issues,
partial fixes, follow-up work, superseded PRs, backports, cherry-picks,
reverts, and potential regressions.

Relationships must be typed and inspectable. Similar titles alone are
not sufficient evidence for a strong relationship claim.

### 5.3 Contribution Finder

Ranks issues that appear actionable and helps a contributor understand
the context before starting. It considers issue state, activity, labels,
linked work, prior attempts, relevant code areas, test coverage signals,
and possible ongoing work.

A ranking must explain its reasons. Labels such as `good first issue`
may be useful signals but must not be the sole basis for a difficulty or
suitability estimate.

### 5.4 Code Archaeology

Connects files and symbols to meaningful changes in Git history, PR
discussions, issue context, and relevant tests. It helps answer why code
was introduced or changed, while distinguishing documented rationale
from inferred intent.

The first language-specific vertical should focus on
JavaScript/TypeScript using Git history and the TypeScript Compiler API.
Additional language support can be introduced through Tree-sitter or
language-specific analyzers later.

### 5.5 Investigations & Evidence

Stores a question, repository/version scope, relevant observations,
hypotheses, evidence references, findings, conclusions, and limitations
as a durable investigation record.

The same investigation should be understandable later without depending
on transient UI state. Evidence should retain stable references to the
original GitHub/Git objects and, when necessary, a versioned snapshot or
artifact.

### 5.6 Dev Autopsy --- Later Vertical

A later incident workflow may correlate uploaded logs, stack traces,
deployment records, source changes, commits, and tests to investigate
failures. Temporal proximity is not proof of causality. A causal
conclusion requires a plausible mechanism and supporting evidence, and
may include multiple contributing factors.

## 6. Core Functional Requirements

### 6.1 Identity and access

-   Support Firebase Authentication, initially with Google sign-in
    and/or email/password.
-   Verify Firebase ID tokens on the backend using Firebase Admin SDK.
-   Associate application-owned records with a stable Firebase UID.
-   Enforce authorization on every private resource at the backend.
-   Keep CodeForensics identity separate from GitHub authorization.
-   Never assume that signing in to CodeForensics grants access to a
    private GitHub repository.
-   Use least-privilege GitHub App permissions and honor repository
    access revocation.

### 6.2 Repository connection and synchronization

-   Connect GitHub through an appropriately scoped GitHub App or
    supported authorization flow.
-   Support repository selection and access checks.
-   Import repository metadata and supported issue/PR history with
    pagination.
-   Handle API rate limits, transient errors, retries, and partial
    responses.
-   Use webhooks for timely updates and scheduled reconciliation to
    recover missed events.
-   Make sync operations idempotent so repeating a job does not create
    duplicate records.
-   Persist sync status, progress, last successful sync, errors, and
    coverage information.
-   Show partial or incomplete coverage explicitly.
-   Do not represent inaccessible or unimported data as a complete
    history.

### 6.3 Issue and pull-request explorer

-   Provide repository-scoped search and filters for issues and PRs.
-   Support filtering by GitHub state, labels, author, assignee where
    available, activity, milestones, and relevant code area when
    indexed.
-   Display titles, identifiers, authors, timestamps, labels, state, and
    links to original GitHub records.
-   Display relevant comments, reviews, cross-references, commits, and
    changed files when available.
-   Make missing data and permission restrictions visible.
-   Preserve GitHub's original state separately from CodeForensics
    assessments.

### 6.4 Resolution intelligence

CodeForensics may assess an issue as one of the following, depending on
the available evidence:

-   Likely resolved
-   Partially addressed
-   Likely unresolved
-   Duplicate or consolidated
-   Possibly obsolete
-   Unknown / insufficient evidence

These are CodeForensics assessments, not GitHub's official issue states.

A resolution assessment should include: - The issue being assessed. -
Candidate PRs, commits, tests, or discussion records. - The evidence
that supports or contradicts the assessment. - The scope of the apparent
fix. - An assessment method and freshness. - Confidence as a qualitative
label when used: high, medium, low, or not assessed. - An explanation of
missing evidence or ambiguity.

Never equate `closed` with `fixed`, or `merged` with `fully resolved`. A
candidate fix may be incomplete, may target only one affected path, may
have been reverted, or may not have reached the relevant release.

### 6.5 PR lineage and issue relationships

The system should support relationship types where evidence justifies
them, including:

-   `DUPLICATES`
-   `RELATED_TO`
-   `BLOCKS`
-   `BLOCKED_BY`
-   `ADDRESSES`
-   `PARTIALLY_ADDRESSES`
-   `SUPERSEDES`
-   `FOLLOWS_UP_ON`
-   `REOPENS`
-   `REGRESSION_OF`
-   `INTRODUCED_BY`
-   `FIXED_BY`
-   `REVERTS`
-   `BACKPORT_OF`
-   `CHERRY_PICK_OF`

Each relationship should store its source and destination, type,
evidence references, discovery method, assessment status, freshness, and
provenance. Use stable GitHub/Git identifiers rather than titles as
identity.

Possible evidence signals include: - Explicit GitHub closing references
and cross-links. - Commit ancestry, patch equivalence, or matching
changes. - Changed file and symbol overlap. - Review discussions and
issue comments. - Revert or backport metadata. - Relevant tests and
source changes. - Temporal ordering as supporting context, never as sole
proof.

Automatically discovered relationships should be marked as inferred
until confirmed by an authoritative reference or a user action. Similar
titles alone should not produce a definitive link.

### 6.6 Contribution Finder

-   Find open issues that appear actionable.
-   Surface whether an issue has linked PRs, active work, earlier
    attempts, or potential duplicates.
-   Show relevant files, code areas, tests, prerequisites, and
    historical context where known.
-   Estimate difficulty with an explainable heuristic and explicit
    uncertainty.
-   Explain why an issue is recommended.
-   Allow filtering by status, labels, language, code area, activity,
    difficulty, and ongoing-work signals when data exists.
-   Prefer useful issues with no obvious active implementation, while
    avoiding a guarantee that no unobserved work exists.
-   Link users to the original GitHub issue and associated work.

### 6.7 Code archaeology

-   Fetch or clone repository history in a controlled worker
    environment.
-   Locate selected files and JavaScript/TypeScript symbols.
-   Trace relevant changes through commits and diffs.
-   Link changes to PRs, issues, reviews, and tests where supported.
-   Display the commit or repository revision used for analysis.
-   Distinguish direct evidence from inferred historical intent.
-   Handle missing history, renamed files, unavailable branches, and
    parser limitations explicitly.
-   Never execute untrusted repository code merely to inspect its
    history.

### 6.8 Investigations and evidence graph

-   Create and persist an investigation with a question and scope.
-   Attach evidence references, observations, hypotheses, findings, and
    conclusions.
-   Support typed graph relationships among repositories, issues, PRs,
    commits, files, symbols, tests, and investigation claims.
-   Make graph nodes navigable to their detail views or source records.
-   Allow users to inspect why a relationship or conclusion exists.
-   Preserve source versions, timestamps, and coverage limitations where
    needed for reproducibility.
-   Represent contradictory evidence and competing hypotheses rather
    than silently choosing one.
-   Provide an honest unknown/insufficient-evidence outcome.

### 6.9 User experience and application states

Every meaningful workflow must handle applicable: - Initial loading and
background progress. - Empty states. - Validation errors. - Network and
provider failures. - Unauthorized or forbidden access. - Partial data
and incomplete synchronization. - Retry and cancellation where
appropriate. - Success confirmation. - Disabled actions and unavailable
features. - Small-screen layouts and keyboard accessibility.

Do not use hardcoded demo data as if it were live repository data. Any
demo fixtures must be clearly labeled.

## 7. Technology Stack

The stack below is the selected default architecture. The implementation
should first inspect the existing repository and preserve working
equivalents when replacing them offers no concrete benefit.

  -----------------------------------------------------------------------
  Layer                   Technology              Responsibility
  ----------------------- ----------------------- -----------------------
  Frontend                React, Vite,            Application UI
                          TypeScript/TSX          

  Styling and components  Tailwind CSS, shadcn/ui Design tokens and
                                                  accessible UI
                                                  components

  Routing                 React Router            Page and route
                                                  management

  Server-state management TanStack Query          Fetching, caching,
                                                  retries, invalidation

  Shared client state     Zustand only where      Shared UI state such as
                          useful                  command palette or
                                                  global panels

  Authentication          Firebase Authentication User sign-in and
                                                  identity

  Backend API             Node.js, TypeScript,    Business logic,
                          Fastify                 integrations,
                                                  permissions

  Validation              Zod                     Request, response, and
                                                  configuration
                                                  validation

  Authentication          Firebase Admin SDK      Backend token
  verification                                    verification

  Primary database        PostgreSQL              Durable relational data

  ORM and migrations      Prisma                  Database access and
                                                  schema migrations

  GitHub integration      GitHub REST/GraphQL     Repository metadata,
                          APIs, GitHub App        issues, PRs, commits,
                                                  reviews

  Change notifications    GitHub webhooks         Timely data updates

  Background jobs         Redis and BullMQ        Import, indexing,
                                                  analysis, retry, and
                                                  job status

  Code history            Git and TypeScript      Commit, diff, file, and
                          Compiler API            symbol analysis

  Additional parsers      Tree-sitter, when       Broader language
                          justified               support

  Object storage          S3-compatible provider, Large uploaded logs,
                          optional initially      artifacts, or snapshots

  Frontend hosting        Vercel or equivalent    Web deployment

  API/worker hosting      Node-compatible service Backend and background
                          host                    workers

  Database hosting        Managed PostgreSQL      Durable production data

  Error monitoring        Sentry or equivalent    Runtime error
                                                  visibility

  Testing                 Vitest, React Testing   Unit, component, and
                          Library, Playwright     end-to-end tests
  -----------------------------------------------------------------------

### 7.1 Storage principles

PostgreSQL is the primary persistent store for application records and
relationships. Firebase Authentication does not replace the application
database.

Object storage is optional until a supported workflow needs uploaded
logs, large artifacts, or retained snapshots. Temporary Git checkouts
belong in isolated worker storage with cleanup and retention controls.
Do not store every repository file in object storage by default.

A dedicated graph database is not required for the initial release.
Typed node/edge tables in PostgreSQL are sufficient to begin with.
PostgreSQL full-text search is the initial search approach; add
embeddings or a dedicated search service only after measuring a real
need.

## 8. High-Level Architecture

``` text
Browser
  React + TypeScript + Vite
          |
          | HTTPS requests + Firebase ID token
          v
Fastify API
  - Verify Firebase ID token
  - Authorize the user and requested resource
  - Validate request data with Zod
  - Apply business rules
          |
          +------------------- PostgreSQL / Prisma
          |                     - repositories
          |                     - issues and PRs
          |                     - comments, reviews, commits
          |                     - relationships and evidence
          |                     - investigations and sync state
          |
          +------------------- GitHub App / REST / GraphQL
          |                     - initial import
          |                     - paginated history
          |                     - authorized record retrieval
          |
          +------------------- Redis / BullMQ
                                |
                                v
                         Background workers
                          - sync and reconciliation
                          - relationship analysis
                          - isolated Git fetch/checkout
                          - TypeScript symbol/history analysis
                          - artifact generation
```

### 8.1 Architectural boundaries

-   React components must not access database credentials or GitHub App
    private keys.
-   The frontend communicates with the backend through typed API
    contracts.
-   The backend owns authorization, data validation, integration calls,
    and business rules.
-   Workers handle expensive or long-running jobs outside interactive
    HTTP requests.
-   Database operations and relationship analysis should be separated
    into testable services.
-   External provider adapters should be isolated so integration logic
    is not spread through route handlers.
-   Shared types and validation schemas should be reused where doing so
    reduces contract drift.
-   Do not add microservices solely for appearance. Begin with a modular
    API and a separate worker process if needed.

## 9. Suggested Repository Structure

Adapt this structure to the existing repository rather than rewriting a
working codebase to match it exactly.

``` text
codeforensics/
├── apps/
│   ├── web/                       # React + Vite frontend
│   ├── api/                       # Fastify API
│   └── worker/                    # Background jobs and isolated analysis
├── packages/
│   └── shared/                    # Shared types and validation contracts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docs/
│   ├── architecture.md
│   ├── data-model.md
│   ├── security.md
│   ├── implementation-plan.md
│   ├── demo-script.md
│   └── decisions/
├── skills.md                      # Mandatory UI/UX implementation contract
├── documentation.md               # This document
├── README.md                      # Setup and phased development prompts
├── .env.example
└── package.json                   # Workspace scripts if using a monorepo
```

## 10. Core Data Model

The final schema should be designed and migrated in the implementation
phase. The following entities describe the intended domain; they are not
a claim that all models already exist.

### 10.1 Primary entities

-   **User:** application identity keyed by Firebase UID.
-   **GitHubInstallation / GitHubConnection:** installation or
    authorized connection metadata and access scope.
-   **Repository:** canonical provider ID, owner/name, default branch,
    visibility, URL, and indexing metadata.
-   **RepositoryMembership / AccessGrant:** association between a user
    or installation and accessible repository resources.
-   **SyncRun:** status, start/end time, counts, cursor or checkpoint
    information, errors, and coverage.
-   **Issue:** stable provider ID, repository ID, number, title, body,
    state, labels, author, assignee data where available, timestamps,
    and URL.
-   **PullRequest:** stable provider ID, repository ID, number, title,
    body, state, base/head references, author, timestamps, merge
    metadata, and URL.
-   **Comment / Review:** relevant discussion content and metadata
    needed by implemented workflows.
-   **Commit:** stable SHA, repository, parent references where
    available, author/committer metadata, timestamp, message, and URL.
-   **ChangedFile / SymbolRecord:** changed paths and optional
    symbol-level records tied to a specific revision.
-   **Relationship:** typed edge between two records with provenance and
    supporting evidence.
-   **EvidenceItem:** reference to a source record, code span, diff,
    test, uploaded artifact, or other inspectable evidence.
-   **Investigation:** owner, question, scope, status, timestamps, and
    reproducibility metadata.
-   **Finding / Hypothesis:** a claim, classification, explanation,
    evidence links, uncertainty, and status.
-   **SavedIssue / UserPreference:** optional user-specific bookmarks
    and preferences.
-   **JobRecord:** durable processing status and enough metadata to
    report progress and failure.

### 10.2 Data integrity rules

-   Prefer provider-issued stable IDs and Git SHAs over titles or
    mutable names.
-   Scope provider IDs correctly, especially where an API identifier is
    not globally unique.
-   Use unique constraints to make imports idempotent.
-   Add foreign keys and indexes for common repository-scoped queries.
-   Use transactions for coupled writes.
-   Track data freshness and source timestamps.
-   Retain original provider state separately from computed assessments.
-   Avoid storing unnecessary personal information from comments and
    user profiles.
-   Define deletion and retention behavior for disconnected repositories
    and user-owned records.

## 11. Evidence, Claims, and Confidence

CodeForensics should use a consistent claim model throughout issue/PR
intelligence, code archaeology, and investigations.

### 11.1 Claim categories

-   **FACT:** Directly supported by an authoritative record or
    deterministic observation.
-   **INFERENCE:** A conclusion drawn from multiple evidence signals.
-   **HYPOTHESIS:** A plausible explanation that has not been
    sufficiently verified.
-   **UNKNOWN:** The available evidence is insufficient to reach a
    useful conclusion.

### 11.2 Evidence requirements

Every non-trivial inferred claim should include: - The claim and its
category. - The evidence references supporting it. - Relevant evidence
that contradicts it, when found. - The analysis method or rule that
produced it. - A qualitative confidence label when appropriate. - The
repository revision or source timestamp relevant to the claim. -
Coverage gaps and known limitations. - A link to the original source
whenever possible.

Citations are not proof by themselves. A linked PR may mention an issue
without fully fixing it; the claim must explain the specific
relationship and its limits.

### 11.3 Confidence policy

Use qualitative confidence labels such as **high**, **medium**, **low**,
or **not assessed**. Do not present arbitrary percentages as calibrated
probabilities unless a validated calibration methodology exists.

### 11.4 Contradictions and abstention

If a candidate PR appears to fix an issue but a later revert or
regression exists, display that conflict. If evidence is too weak, say
that the relationship or resolution is unknown. It is preferable to
abstain than to create a confident but unsupported explanation.

## 12. Search, Filtering, and Ranking

### 12.1 Initial search

Begin with PostgreSQL full-text search and indexed filters across
imported issue/PR metadata and relevant indexed records. Use stable
pagination for large result sets. Consider trigram or other
database-supported matching only when needed and tested.

### 12.2 Contribution ranking

Start with a deterministic, explainable scoring model. Possible signals
include: - Open and actionable GitHub state. - No clearly linked active
PR. - Recent or meaningful maintainer activity. - Explicit contribution
labels. - Relevant code/test area and bounded change scope. - Prior
abandoned or superseded attempts. - Blockers, dependencies, and
duplicate risk. - Evidence coverage and freshness.

The ranking should expose its reasons and should not imply certainty
about unobserved work. Avoid training or embedding infrastructure until
there is enough evaluation evidence to justify it.

### 12.3 Filters

Support only filters that can be backed by stored data. Likely filters
include GitHub state, labels, author/assignee, language, code area,
milestone, activity, estimated difficulty, duplicate/related-work
signals, and active-PR status where those fields are available.

## 13. Background Jobs and Synchronization

Large repository imports and analysis should not run synchronously
inside normal page requests.

### 13.1 Job categories

-   Initial repository metadata import.
-   Issue/PR history import.
-   Comment/review/timeline import.
-   Incremental webhook processing.
-   Scheduled reconciliation.
-   Relationship detection.
-   Git history fetch and symbol analysis.
-   Investigation analysis and artifact generation.

### 13.2 Reliability requirements

-   Jobs must be idempotent or use deduplication keys.
-   Use bounded retries with backoff for transient failures.
-   Respect GitHub API rate limits and provider `Retry-After` guidance.
-   Distinguish retryable errors from permanent permission/configuration
    failures.
-   Track progress, attempts, timestamps, and last error.
-   Avoid running two conflicting full syncs for the same repository
    without coordination.
-   Make job failure visible and provide a safe retry path.
-   Keep expensive work out of request handlers.
-   Verify webhook signatures and handle duplicate webhook deliveries.
-   Use reconciliation to detect missed webhook updates.

## 14. Security and Privacy Requirements

Repository content is untrusted input. Issue bodies, comments, source
code, README files, commit messages, and uploaded logs may contain
prompt injection, secrets, malicious paths, or hostile instructions.

Required controls include:

1.  Keep GitHub App private keys, database URLs, Firebase Admin
    credentials, and other secrets on the server.
2.  Commit only an `.env.example` containing placeholders; never commit
    real credentials.
3.  Verify Firebase ID tokens on the backend and authorize each
    requested resource.
4.  Enforce repository ownership/access checks on every API path that
    reads or changes private data.
5.  Use least-privilege GitHub App permissions and honor revoked access.
6.  Verify webhook signatures and prevent replay/duplicate processing
    where applicable.
7.  Validate request bodies, query parameters, identifiers, and
    configuration with schemas.
8.  Apply rate limits and reasonable request/job resource limits.
9.  Treat repository content and user-supplied files as data, never as
    trusted instructions.
10. Do not execute arbitrary repository scripts, install packages, or
    run build steps by default.
11. Run Git operations in isolated workers with controlled paths and
    cleanup.
12. Prevent path traversal, unsafe archive extraction, and unbounded
    repository processing.
13. Redact secrets from logs and avoid retaining unnecessary sensitive
    artifacts.
14. Use tenant-aware database access patterns and test cross-user access
    denial.
15. Restrict outbound network access from analysis workers where
    feasible; do not fetch arbitrary URLs derived from repository text.
16. Apply upload size/type limits and access controls to stored
    artifacts.
17. Define retention and deletion behavior for disconnected repositories
    and user data.
18. Document known limitations and security-sensitive configuration.

## 15. UI/UX and Visual Design Requirements

The full design contract lives in [`skills.md`](./skills.md). All UI
implementation and redesign work must follow it.

At a high level, CodeForensics should look like a carefully designed
developer investigation workbench---not a generic AI-generated SaaS
template.

Requirements: - Product-specific hierarchy and restrained use of
color. - Consistent typography, spacing, borders, and iconography. -
Real data tables, timelines, diffs, code snippets, relationship views,
and evidence panels where they serve the task. - No fake metrics, fake
customer logos, fabricated testimonials, or pretend live activity. -
Avoid repeated identical card grids, decorative gradients, glowing
blobs, and irrelevant illustrations. - Keep repository status, data
coverage, evidence quality, and assessment uncertainty legible. - Use
accessible component primitives for dialogs, menus, popovers, and
keyboard interaction. - Provide visible focus indicators and meaningful
labels. - Support responsive layouts for desktop and smaller screens. -
Respect reduced-motion preferences. - Provide loading, empty, error,
success, disabled, permission-denied, and partial-data states. - Inspect
the rendered interface at wide and narrow viewports and correct
clipping, overlap, dead controls, and confusing workflows before
shipping.

## 16. Testing and Quality Strategy

Testing should verify actual behavior, not only that the application
compiles.

### 16.1 Unit tests

Test: - Relationship detection rules. - Resolution classification
rules. - Contribution scoring and reason generation. - Parsing and
normalization of GitHub API records. - Pagination and sync cursor
logic. - Validation schemas. - Authorization policies. - Evidence
formatting and stable source locators.

### 16.2 Integration tests

Test: - Database persistence and migrations. - Idempotent imports. -
Webhook signature validation and duplicate delivery. - Retry behavior
and rate-limit handling. - Firebase token verification with test
credentials or controlled test doubles. - Resource ownership and
cross-user denial. - Partial syncs and recoverable job failures.

### 16.3 Frontend tests

Test: - Authentication and protected routes. - Search, filters,
pagination, and detail navigation. - Loading, empty, error, and
partial-data states. - Keyboard navigation and accessible labels. -
Investigation creation and viewing. - Relationship and evidence
navigation. - Responsive layouts for key workflows.

### 16.4 End-to-end tests

Use Playwright for a small number of complete workflows: 1. Sign in
using a controlled test setup. 2. Connect or load an explicitly labeled
demo repository. 3. Observe import progress and completion/failure
states. 4. Search and filter issues/PRs. 5. Open an issue and inspect
its related PRs/commits. 6. Open a contribution recommendation and
inspect its reasoning. 7. Create or inspect an investigation with
evidence. 8. Verify authorization errors and recovery behavior.

### 16.5 Evaluation fixtures

Include fixtures for: - Merged PR with uncertain issue resolution. -
Closed issue with no verifiable fix. - A PR superseded by a newer
attempt. - Backport or cherry-pick relationships. - Duplicate issue
candidates. - Reverted fixes and possible regressions. - Incomplete
permissions or failed pagination. - Misleading titles that should not
produce strong relationships. - Contradictory evidence. - Prompt
injection embedded in comments or repository files.

Measure relationship precision, resolution-assessment quality,
usefulness of recommendations, citation/source validity, coverage
reporting, and correct abstention. Do not publish performance claims
without repeatable measurements.

## 17. Deployment and Operations

### 17.1 Environments

Keep local development, test, and production configuration separate. Use
environment variables or the hosting provider's secret manager for
credentials.

### 17.2 Required deployment components

-   Frontend hosting for the React/Vite application.
-   A Node-compatible host for the Fastify API.
-   A worker process for BullMQ jobs when background processing is
    enabled.
-   Managed PostgreSQL.
-   Redis when BullMQ is enabled.
-   Object storage only if implemented workflows require it.

### 17.3 Operational checks

-   Provide health and readiness endpoints.
-   Verify database connectivity and migrations during deployment.
-   Ensure the worker and API use compatible environment configuration.
-   Configure allowed frontend origins explicitly.
-   Monitor API errors, job failures, sync coverage, and provider rate
    limits.
-   Confirm that webhooks reach the deployed endpoint and signatures are
    validated.
-   Document backup and recovery expectations for production data.
-   Test the public deployment in a private/incognito browser window
    before submission.

## 18. Environment Configuration

The exact variable names must match the implementation. Keep
`.env.example` synchronized with the application and document which
variables are required for each workflow.

Potential configuration categories include:

  -----------------------------------------------------------------------
  Category                            Examples of configuration purpose
  ----------------------------------- -----------------------------------
  Application                         API port, runtime environment,
                                      public web URL, allowed CORS
                                      origins

  PostgreSQL                          Database connection URL

  Firebase                            Project ID and server-side
                                      credential configuration
                                      appropriate to the host

  GitHub App                          App ID, installation/private-key
                                      configuration, webhook secret,
                                      OAuth callback settings if used

  Redis                               Redis connection URL for BullMQ

  Object storage                      Endpoint, bucket, region, access
                                      credentials if artifact storage is
                                      enabled

  Monitoring                          Error-monitoring DSN or equivalent

  LLM provider, if implemented        Server-side API key and model
                                      configuration
  -----------------------------------------------------------------------

Never include actual credentials in documentation, screenshots, demo
videos, source control, or error messages. Browser Firebase
configuration is not a substitute for backend authorization; server-only
secrets must never be exposed in Vite client variables.

## 19. Phased Delivery Plan

Follow the detailed prompts and acceptance gates in
[`README.md`](./README.md). The phases below summarize the intended
order.

  ------------------------------------------------------------------------------
  Phase                        Deliverable               Completion principle
  ---------------------------- ------------------------- -----------------------
  0\. Reconnaissance           Repository audit, target  Reflects the actual
                               architecture, risks,      codebase
                               implementation plan       

  1\. Foundation               Workspace/API setup,      Build, lint, and type
                               design tokens, app shell, checks pass
                               routes, shared components 

  2\. Authentication           Firebase sign-in, backend Protected resources are
                               token verification,       enforced server-side
                               resource authorization    

  3\. Persistence and jobs     PostgreSQL schema,        Data survives sessions
                               migrations, repository    and jobs can be
                               ownership, durable job    observed
                               status                    

  4\. GitHub integration       Repository connection,    Sync is observable,
                               paginated imports,        idempotent, and honest
                               webhooks/reconciliation   about coverage

  5\. Issue/PR explorer        Search, filters, details, Real stored data powers
                               discussions, reviews,     the UI
                               sync state                

  6\. Relationship             Evidence-backed links,    Findings show evidence
  intelligence                 lineage, resolution       and uncertainty
                               assessments               

  7\. Contribution Finder      Actionable issue          Recommendations expose
                               discovery and explainable reasons and
                               ranking                   ongoing-work risk

  8\. Code                     File/symbol history,      Claims link to
  archaeology/investigations   evidence graph, saved     versioned evidence
                               investigations            

  9\. Release readiness        Security, tests,          Core workflows work
                               deployment, README, demo  end-to-end
  ------------------------------------------------------------------------------

The order represents dependencies. Complete and test a narrow vertical
slice before expanding. Do not implement all advanced features as
disconnected pages.

## 20. Acceptance Criteria for a Credible MVP

A CodeForensics MVP is credible when a user can:

1.  Authenticate and access only the resources they are authorized to
    use.
2.  Connect or select an authorized GitHub repository.
3.  Import supported repository and issue/PR history with visible
    progress, freshness, and coverage.
4.  Search and filter persisted issue/PR records.
5.  Open an issue or PR and inspect available discussions, commits, and
    changed-file context.
6.  See explicit relationships and inferred assessments separately from
    original GitHub facts.
7.  Inspect evidence supporting a relationship or resolution assessment.
8.  Find contribution opportunities with an explanation of why each item
    is suggested and what prior work may exist.
9.  Trace at least the supported JavaScript/TypeScript code-history path
    to commits and related GitHub records.
10. Save and revisit an investigation with evidence references and known
    limitations.
11. Recover appropriately from missing credentials, permission failures,
    API errors, partial imports, and failed jobs.
12. Use a deployed application and follow the documented local setup
    instructions.

A feature is not complete merely because a navigation item or static
screen exists. Its main workflow must function and be tested.

## 21. Known Limitations and Product Honesty

The system can only reason over data it can access and successfully
import. Private repository permissions, deleted records, GitHub API
limits, inaccessible forks, force pushes, missing historical branches,
and incomplete webhook delivery can limit conclusions.

Therefore: - Display import coverage and freshness. - Label demo data. -
Distinguish official provider facts from inferred assessments. - Never
claim a relationship is certain when the evidence is ambiguous. - Never
promise that an issue is unclaimed simply because no linked PR was
found. - Never promise that an issue is fixed solely because a PR
merged. - Explain when code history or parser coverage is incomplete. -
Prefer `unknown` over an unsupported answer. - Make it possible to open
the underlying source record.

## 22. Documentation and Submission Checklist

Before a release or academic submission, verify:

-   [ ] Product purpose, target users, and workflows are documented.
-   [ ] Actual tech stack and architecture are described.
-   [ ] Local setup instructions work on a clean environment.
-   [ ] `.env.example` lists required configuration without secrets.
-   [ ] Database migrations and setup are documented.
-   [ ] Authentication and authorization behavior is explained.
-   [ ] GitHub App setup, permissions, webhook setup, and limitations
    are documented.
-   [ ] Tests and exact test commands are documented.
-   [ ] Deployment instructions and public links are current.
-   [ ] Known limitations and data coverage behavior are documented.
-   [ ] README includes the problem statement, target users, solution,
    features, stack, architecture, setup, environment variables, and
    deployment.
-   [ ] Git history shows meaningful development.
-   [ ] Demo video demonstrates working workflows rather than mostly
    reading code.
-   [ ] Submitted links work for someone without project-owner access.

## 23. Reference Documents

-   [`README.md`](./README.md) --- phased development plan and
    implementation prompts.
-   [`skills.md`](./skills.md) --- required UI/UX design rules and
    quality gate.
-   `docs/architecture.md` --- implementation-specific architecture
    decisions.
-   `docs/data-model.md` --- implementation-specific schema and
    relationship details.
-   `docs/security.md` --- security model, threat considerations, and
    operational controls.
-   `docs/demo-script.md` --- repeatable product demonstration plan.

------------------------------------------------------------------------

**Guiding principle:** CodeForensics should help people understand
repository history and make better engineering decisions by connecting
evidence---not by presenting confident-sounding guesses. Every important
conclusion should be traceable, uncertainty should be visible, and the
core workflows should work end-to-end.
