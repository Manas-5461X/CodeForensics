# CodeForensics

**Evidence-backed repository intelligence for understanding code,
issues, pull requests, and project history.**

CodeForensics is designed to help developers investigate unfamiliar
repositories without manually stitching together information from GitHub
issues, pull requests, commits, reviews, source files, and tests. It
brings those records into one workspace and connects them with traceable
evidence so engineers can understand prior decisions, investigate
whether a reported problem was addressed, and assess where a
contribution would be useful.

The central idea is simple: **repository intelligence should show its
evidence, distinguish facts from inferences, and make uncertainty
visible.**

------------------------------------------------------------------------

## Contents

-   [Overview](#overview)
-   [The problem](#the-problem)
-   [Core capabilities](#core-capabilities)
-   [How CodeForensics works](#how-codeforensics-works)
-   [Technology stack](#technology-stack)
-   [System architecture](#system-architecture)
-   [Data model and evidence](#data-model-and-evidence)
-   [Security model](#security-model)
-   [Local development](#local-development)
-   [Configuration](#configuration)
-   [Engineering standards](#engineering-standards)
-   [Project documentation](#project-documentation)
-   [License](#license)

## Overview

Modern software repositories contain far more context than the source
tree alone. The reason a function behaves a certain way may be buried in
an old issue. A proposed fix may have been abandoned in a pull request.
A later commit may have reverted an earlier change. A test may document
the behavior that a discussion never clearly explained.

CodeForensics is intended to connect this information into a navigable,
evidence-backed view of a repository.

It is built around five product areas:

  -----------------------------------------------------------------------
  Product area                        Purpose
  ----------------------------------- -----------------------------------
  Repository intelligence             Synchronize and explore accessible
                                      repository records and their
                                      context

  Issue and PR lineage                Identify and inspect relationships
                                      between reports, changes, and prior
                                      attempts

  Resolution intelligence             Assess whether an issue appears
                                      addressed, partially addressed,
                                      unresolved, or uncertain

  Contribution finder                 Help contributors evaluate issues
                                      using context, prior work, relevant
                                      code, and activity

  Code archaeology and investigations Trace code history and preserve
                                      evidence-backed technical
                                      investigations
  -----------------------------------------------------------------------

CodeForensics is **not intended to be a generic chatbot over a
repository**. Structured data, Git metadata, deterministic analysis, and
source-linked evidence form the foundation. AI assistance can help
explain or explore that evidence, but should not be the source of truth
for repository facts.

## The problem

Repository investigation is fragmented across different tools and
records. To understand one issue, a developer may need to:

1.  Read the original issue and its discussion.
2.  Find linked, duplicate, or related issues.
3.  Locate pull requests that attempted to address the behavior.
4.  Inspect reviews, commits, changed files, and tests.
5.  Determine whether a change was merged, reverted, superseded, or
    followed by another attempt.
6.  Check whether the original problem was actually resolved.
7.  Identify missing context and decide what to investigate next.

This process is slow and easy to get wrong. Closed issues are not
necessarily fixed, merged pull requests do not necessarily resolve every
part of an issue, and similar titles do not establish that two reports
describe the same problem.

CodeForensics aims to make that investigation more efficient,
consistent, and auditable.

## Core capabilities

### Repository intelligence

Bring accessible repository metadata and development activity into a
single workspace.

The intended data includes:

-   Repository metadata and source links
-   Issues and pull requests
-   Issue and pull-request comments
-   Reviews and review comments
-   Labels, milestones, and cross-references where available
-   Commits, parent relationships, and changed-file metadata
-   Relevant synchronization and permission information

Repository data should be synchronized through the GitHub API with
pagination, rate-limit handling, retries, and idempotent persistence.
The application should show synchronization status, last successful
sync, failures, and known coverage limitations. It must not imply that
all history was imported if some data was inaccessible or a sync failed.

### Issue and pull-request lineage

CodeForensics models relationships between work items so developers can
navigate from a report to the work that may explain or address it.

Supported relationship concepts include:

-   `DUPLICATES` and `RELATED_TO`
-   `BLOCKS` and `BLOCKED_BY`
-   `ADDRESSES` and `PARTIALLY_ADDRESSES`
-   `SUPERSEDES` and `FOLLOWS_UP_ON`
-   `REOPENS` and `REGRESSION_OF`
-   `INTRODUCED_BY` and `FIXED_BY`
-   `REVERTS`, `BACKPORT_OF`, and `CHERRY_PICK_OF`

Relationships should preserve their origin and supporting evidence. An
explicit GitHub reference or verifiable Git relationship is different
from a candidate relationship inferred from text similarity. Heuristic
matches must remain inspectable and must not be presented as established
facts.

### Resolution intelligence

Investigate whether an issue appears to be:

-   Resolved
-   Partially addressed
-   Unresolved
-   A duplicate
-   Obsolete
-   Unknown because the available evidence is insufficient

These are CodeForensics assessments, not replacements for the official
GitHub issue or pull-request state. Each assessment should explain its
supporting evidence and disclose important counterevidence, missing
records, or limitations.

For example, a closed issue is evidence of a provider state---not proof
that the underlying bug was fixed. A merged pull request is evidence
that code was merged---not proof that every reported symptom was
resolved.

### Contribution finder

Help contributors evaluate potential work before investing time in it.

Useful signals include:

-   Issue state and recent activity
-   Related reports and likely duplicates
-   Linked pull requests and signs of active work
-   Previous attempts and their outcomes
-   Relevant files, symbols, commits, and tests
-   Scope, likely complexity, and prerequisites
-   Missing information that should be clarified before implementation

Recommendations should explain why an issue was surfaced. A
`good first issue` label may be useful context, but is not sufficient by
itself to determine difficulty or readiness.

### Code archaeology

Trace files and symbols through repository history to understand how
behavior evolved.

The initial analysis focus is JavaScript and TypeScript, using Git
history and the TypeScript Compiler API. Where data permits, a code
location can be connected to:

-   Commits and diffs
-   Pull requests and reviews
-   Issues and discussions
-   Tests and related changes
-   Earlier or later implementations

Historical explanations must distinguish documented rationale from
inferred intent. Additional language support can be added through
language-specific analyzers or Tree-sitter as the implementation
requires.

### Investigations and evidence

Preserve an investigation as a structured record rather than leaving its
reasoning scattered across browser tabs or chat history.

An investigation can capture:

-   The question and scope
-   Repository and revision context
-   Observations and source references
-   Competing hypotheses
-   Findings and conclusions
-   Contradictory evidence
-   Uncertainty and limitations

The objective is reproducibility: another engineer should be able to
revisit the investigation, inspect the cited material, and understand
how its conclusions were reached.

## How CodeForensics works

The application separates user interaction, authentication and
authorization, repository synchronization, persistence, and analysis.

1.  **Authenticate the user.** Firebase Authentication establishes the
    user's CodeForensics identity.
2.  **Authorize GitHub access.** The GitHub integration grants access
    only to repositories and data allowed by its configured permissions.
    Signing in to CodeForensics does not itself grant GitHub access.
3.  **Synchronize repository data.** Background jobs fetch accessible
    records and handle pagination, retries, rate limits, and partial
    failures.
4.  **Normalize and store records.** PostgreSQL stores normalized
    repository entities and their provider identifiers. Repeated
    synchronization should update existing records rather than create
    duplicates.
5.  **Analyze relationships.** Deterministic rules and Git/code analysis
    identify explicit links and candidate relationships. Heuristic
    results retain provenance and uncertainty.
6.  **Present evidence.** The interface links findings to the records,
    commits, or other sources that support them.
7.  **Preserve investigations.** Users can save the question, evidence,
    findings, and limitations for later review.

## Technology stack

The selected stack provides a typed frontend, a validated API,
relational persistence, and asynchronous repository processing.

  -----------------------------------------------------------------------
  Layer                   Technology              Responsibility
  ----------------------- ----------------------- -----------------------
  Frontend                React, TypeScript, Vite Application interface
                                                  and build tooling

  UI and styling          Tailwind CSS, shadcn/ui Reusable components and
                                                  consistent styling

  Routing                 React Router            Application navigation

  Server-state management TanStack Query          API data fetching,
                                                  caching, and
                                                  invalidation

  Authentication          Firebase Authentication User sign-in and
                                                  identity

  Backend API             Node.js, TypeScript,    HTTP endpoints and
                          Fastify                 application services

  Request validation      Zod                     Runtime validation at
                                                  system boundaries

  Database                PostgreSQL              Repository data,
                                                  relationships, sync
                                                  state, investigations

  ORM and migrations      Prisma                  Typed database access
                                                  and schema migrations

  Background processing   Redis, BullMQ           Synchronization,
                                                  retries, and analysis
                                                  jobs

  GitHub integration      GitHub REST/GraphQL     Repository access,
                          APIs and GitHub App     events, and metadata

  Code analysis           Git and TypeScript      Commit history, diffs,
                          Compiler API            and symbol analysis

  Testing                 Vitest, React Testing   Unit, component,
                          Library, Playwright     integration, and
                                                  browser tests

  Optional artifact       S3-compatible storage   Larger artifacts when a
  storage                                         concrete feature needs
                                                  them
  -----------------------------------------------------------------------

The existing repository configuration is authoritative for exact
dependency versions and available scripts. Do not replace a working
implementation merely to make its folder structure match an example.

## System architecture

``` mermaid
flowchart TD
    User[User] --> Web[React + TypeScript frontend]
    Web -->|HTTPS and Firebase ID token| API[Fastify API]
    API --> Auth[Authentication and authorization]
    Auth --> DB[(PostgreSQL / Prisma)]
    API --> GH[GitHub App and GitHub APIs]
    API --> Queue[Redis + BullMQ]
    Queue --> Worker[Background worker]
    Worker --> GH
    Worker --> Git[Git history and code analysis]
    Worker --> DB
    Git --> DB
    DB --> Web
```

### Frontend

The frontend owns presentation, navigation, interaction, and client-side
server-state handling. It must not contain privileged GitHub
credentials, database connection strings, Firebase Admin credentials, or
server-only operations.

The interface should prioritize evidence inspection, repository
navigation, readable technical details, and useful filtering over
decorative dashboards. Every interactive control should perform a real
action or be clearly presented as unavailable.

### API

The API is responsible for:

-   Verifying authentication tokens
-   Enforcing resource-level authorization
-   Validating inputs and outputs
-   Applying domain rules
-   Reading and writing persistent data
-   Scheduling background jobs
-   Returning consistent, actionable errors

Authentication alone is not authorization. Every private repository,
investigation, job, and artifact must be checked against the requesting
user's access rights.

### Background processing

Repository synchronization and expensive analysis belong in background
workers rather than long-running HTTP requests.

Jobs should be observable, retryable, and idempotent where practical.
They should record progress and failure reasons, respect rate limits,
and clean up temporary checkouts and artifacts. Repository analysis must
run in controlled workspaces with appropriate resource limits.

### Persistence

PostgreSQL is the primary system of record. Relationships can initially
be stored as typed relational records and edges; a separate graph
database is not required for the initial architecture. Redis supports
job processing rather than serving as the durable source of repository
facts.

## Data model and evidence

The domain model is expected to represent these entities. Exact table
and field names should follow the Prisma schema in the codebase.

  -----------------------------------------------------------------------
  Entity                              Purpose
  ----------------------------------- -----------------------------------
  User                                CodeForensics identity and account
                                      metadata

  GitHub connection or installation   Authorization context, installation
                                      state, and permissions

  Repository                          Stable GitHub identifier,
                                      owner/name, URL, and available
                                      metadata

  Sync state                          Checkpoints, progress, last
                                      attempt, last success, errors, and
                                      coverage

  Issue and pull request              Provider identifiers, number,
                                      title, body, state, timestamps,
                                      labels, and source URL

  Comment and review                  Discussion content, author,
                                      timestamps, and source references

  Commit and changed file             Commit hash, parent information
                                      where available, file path, change
                                      metadata, and diff reference

  Relationship                        Typed source and target entities,
                                      evidence, method, provenance,
                                      assessment, and freshness

  Investigation                       Scope, revision context,
                                      observations, hypotheses, findings,
                                      conclusions, and limitations

  Job                                 Processing state, retries,
                                      progress, and diagnostics
  -----------------------------------------------------------------------

### Evidence and assessment rules

CodeForensics should distinguish the following categories:

-   **Provider fact:** information explicitly reported by GitHub, such
    as an issue's current state.
-   **Direct relationship:** a link or relationship supported by
    explicit metadata or verifiable Git information.
-   **Deterministic result:** a result produced by a documented rule.
-   **Heuristic assessment:** a candidate relationship or ranking based
    on indirect signals.
-   **AI-assisted hypothesis:** a generated explanation that requires
    inspection or verification.
-   **Coverage limitation:** relevant evidence that is missing,
    inaccessible, stale, or not yet synchronized.

Every meaningful assessment should make its source and method
inspectable. Where confidence is displayed, its meaning should be
documented and calibrated; avoid false precision. Conflicting evidence
should remain visible. If the available information cannot support a
conclusion, the correct result is **unknown**.

## Security model

Repository content is untrusted input. Security applies to ingestion,
storage, analysis, AI-assisted workflows, and the user interface.

### Authentication and access control

-   Verify Firebase ID tokens on the server using Firebase Admin SDK or
    the configured trusted verification mechanism.
-   Enforce authorization on every private API operation and background
    job.
-   Keep CodeForensics identity separate from GitHub authorization.
-   Request the minimum GitHub permissions required for each feature.
-   Respect permission revocation and avoid assuming access from a
    repository URL alone.
-   Scope repository records, investigations, and artifacts to the
    correct user or authorized installation.

### Safe repository processing

-   Do not execute arbitrary repository scripts, build steps, Git hooks,
    or package installation by default.
-   Isolate Git operations and analyzers in controlled workspaces.
-   Validate paths and defend against path traversal.
-   Apply time, memory, process, and storage limits where practical.
-   Clean up temporary files and define artifact retention behavior.
-   Verify webhook signatures before processing GitHub events.

### AI and prompt-injection safety

Issue descriptions, comments, README files, source code, logs, and
commit messages may contain malicious or misleading instructions. Treat
this content as data, not as instructions for the system. AI-assisted
analysis must not be allowed to bypass authorization, reveal secrets, or
trigger arbitrary execution based on repository content.

### Secrets and operational safety

-   Keep private credentials and API keys on the server.
-   Never commit real environment files or service credentials.
-   Redact secrets from logs and error responses.
-   Use TLS and secure production configuration.
-   Record partial failures accurately; do not label incomplete
    synchronization as complete.
-   Document data retention and deletion behavior before handling
    production repositories.

## Local development

The precise commands depend on the scripts and workspace configuration
in the repository. Use the actual `package.json`, lockfile, Prisma
configuration, and `.env.example` as the source of truth; do not assume
that an illustrative command exists in the project.

### Prerequisites

For the intended full-stack setup, prepare:

-   Node.js LTS compatible with the project dependencies
-   The package manager specified by the repository lockfile
-   PostgreSQL
-   Redis for BullMQ background jobs
-   A Firebase project for authentication
-   A configured GitHub App or supported GitHub authorization flow
-   Git for code-history analysis

### 1. Clone the repository

``` bash
git clone <repository-url>
cd <repository-directory>
```

Replace the placeholders with the actual repository URL and directory.

### 2. Install dependencies

Use the package manager selected by the repository. If the project uses
npm and an npm lockfile, the usual command is:

``` bash
npm install
```

Do not mix package managers or regenerate lockfiles without a reason.

### 3. Configure environment variables

Copy the example environment file if it exists:

``` bash
cp .env.example .env
```

Fill in the values required by the services being run. Keep `.env` local
and never commit real secrets. See [Configuration](#configuration) for
the configuration categories.

### 4. Start required services

Start PostgreSQL and Redis using the repository's documented local
setup, Compose configuration, or managed development services. Confirm
that the API and worker can reach them.

### 5. Prepare the database

Use the Prisma commands defined by the current repository. For a
development database configured for Prisma Migrate, a common command is:

``` bash
npx prisma migrate dev
```

Run this only after checking the Prisma schema, migration setup, and
database URL. Do not point development migration commands at production.

### 6. Run the application

Inspect available scripts before starting the frontend, API, or worker:

``` bash
npm run
```

Use the actual scripts declared in the root and app-level package files.
If separate processes are required, run each using the documented
command for that workspace.

### 7. Verify the environment

Before connecting a real repository, verify that:

-   The frontend starts and navigation works.
-   The API can connect to PostgreSQL.
-   Database migrations complete successfully.
-   Redis and the worker can process a test job.
-   Private endpoints reject unauthenticated requests.
-   Repository access respects GitHub permissions.
-   Sync failures and incomplete coverage are visible.

If a required script, environment example, migration, or local-service
definition is missing, add and document it as part of setup rather than
assuming it exists.

## Configuration

Exact environment variable names must be defined by the application and
documented in `.env.example`. The following table lists configuration
categories, not literal variable names.

  -----------------------------------------------------------------------
  Category                Purpose                 Where it belongs
  ----------------------- ----------------------- -----------------------
  Application             Runtime environment,    Relevant app processes
                          API origin, allowed web 
                          origins                 

  PostgreSQL              Database connection     API and worker

  Redis                   Queue connection        API and worker

  Firebase client         Client app              Frontend, limited to
                          configuration           values intended for
                                                  client use

  Firebase Admin          Trusted token           Server only
                          verification            
                          credentials or workload 
                          identity                

  GitHub App              App identity, private   Server and worker only
                          key or secure key       
                          reference, webhook      
                          secret, installation    
                          configuration           

  AI provider (optional)  Provider selection and  Server only
                          API key for optional    
                          assistance              

  Artifact storage        Bucket, endpoint, and   Server and worker only
  (optional)              access credentials      

  Observability           Error reporting and     Relevant app processes
  (optional)              environment metadata    
  -----------------------------------------------------------------------

Configuration requirements:

-   Validate required variables at startup.
-   Fail with a useful error message that does not reveal secret values.
-   Keep `.env` out of version control.
-   Include non-secret placeholders in `.env.example`.
-   Use separate credentials and infrastructure for development,
    testing, and production.
-   Rotate credentials immediately if they are exposed.

## Engineering standards

### Type safety and validation

Use TypeScript across application boundaries where supported. Validate
untrusted input at runtime with Zod or the validation layer already
established in the codebase. Share API types and schemas where doing so
prevents client/server drift.

### Reliability

-   Make synchronization idempotent where practical.
-   Handle API pagination, rate limits, retries, and partial failures.
-   Use database constraints and transactions for related writes.
-   Record job progress and failure details.
-   Make stale and incomplete data visible to users.
-   Avoid treating a transient error as an empty result.

### User experience

The application should behave like a professional engineering workbench:

-   Clear hierarchy for repositories, issues, pull requests, code, and
    evidence
-   Dense but readable technical information
-   Useful filters, search, sorting, and source links
-   Consistent loading, empty, error, permission-denied, stale, and
    partial-data states
-   Keyboard accessibility and clear focus states
-   Purposeful motion and restrained visual effects
-   No fabricated metrics, fake testimonials, decorative charts
    unsupported by data, or controls that do nothing

See [`skills.md`](./skills.md) for the UI and UX design contract.

### Testing

Use tests to verify behavior and evidence quality, not just rendering.

  -----------------------------------------------------------------------
  Test level                          Areas to cover
  ----------------------------------- -----------------------------------
  Unit                                Relationship detection, resolution
                                      rules, ranking, parsers,
                                      validation, and evidence
                                      classification

  Integration                         API authorization, persistence
                                      constraints, synchronization
                                      idempotency, job processing, and
                                      webhooks

  Component                           Filters, evidence panels, status
                                      states, keyboard behavior, and
                                      error handling

  End-to-end                          Sign-in, repository connection,
                                      sync status, issue/PR exploration,
                                      and investigation workflows

  Security                            Cross-user access, invalid webhook
                                      signatures, path traversal, prompt
                                      injection, and secret redaction

  Evaluation fixtures                 Confirmed fixes, partial fixes,
                                      duplicates, reverts, backports,
                                      superseded pull requests, and
                                      ambiguous cases
  -----------------------------------------------------------------------

Include negative and ambiguous examples. An analysis system should be
tested on cases where the correct answer is unknown, not only on cases
where a relationship is obvious. Prefer deterministic fixtures for
repeatability and use live GitHub integration tests where they add
meaningful coverage.

Before merging a change, run the lint, type-check, test, and build
commands supported by the repository. Document checks that could not be
run.

## Project documentation

-   [`documentation.md`](./documentation.md) --- product requirements,
    system architecture, functional behavior, data model, security
    requirements, testing, and acceptance criteria.
-   [`skills.md`](./skills.md) --- frontend design principles,
    interaction standards, accessibility, and guidance for avoiding
    generic AI-generated UI patterns.

Keep these documents aligned with the actual implementation. If the
implementation differs from the intended design, document the real
behavior rather than leaving misleading instructions.

## License

This project is licensed under the **MIT License**. See the
[`LICENSE`](./LICENSE) file for the full license text.
