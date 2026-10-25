# CodeForensics

<div align="center">

**Evidence-backed repository intelligence, AST code archaeology, and project lineage platform.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green?logo=node.js)](https://nodejs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.2-black?logo=fastify)](https://www.fastify.io/)
[![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646CFF?logo=vite)](https://vitejs.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-6.3-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)](https://redis.io/)
[![BullMQ](https://img.shields.io/badge/BullMQ-5.39-E53E3E)](https://bullmq.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

*Investigate unfamiliar codebases, debug silent regressions, trace causal PR links, uncover true domain experts, and preserve audit-ready evidence—with zero hallucinations.*

</div>

---

## Table of Contents

1. [Executive Summary & Purpose](#1-executive-summary--purpose)
2. [The Real-World Problem](#2-the-real-world-problem)
3. [What CodeForensics Solves](#3-what-codeforensics-solves)
4. [Core Workbenches & Features](#4-core-workbenches--features)
5. [System Architecture & Ingestion Flow](#5-system-architecture--ingestion-flow)
6. [Monorepo Structure](#6-monorepo-structure)
7. [Prerequisites](#7-prerequisites)
8. [Quickstart: Local Development](#8-quickstart-local-development)
9. [Environment Configuration Reference](#9-environment-configuration-reference)
10. [Authentication Architecture (Firebase Auth)](#10-authentication-architecture-firebase-auth)
11. [GitHub App Integration Setup](#11-github-app-integration-setup)
12. [Database Schema & Prisma Migrations](#12-database-schema--prisma-migrations)
13. [Redis & Background Job Worker (BullMQ)](#13-redis--background-job-worker-bullmq)
14. [Full REST API Specification](#14-full-rest-api-specification)
15. [Security, Sandboxing & Threat Model](#15-security-sandboxing--threat-model)
16. [Mathematical Contributor Scoring Formula](#16-mathematical-contributor-scoring-formula)
17. [Testing & Quality Assurance](#17-testing--quality-assurance)
18. [Troubleshooting Common Issues](#18-troubleshooting-common-issues)
19. [Production Deployment Guidelines](#19-production-deployment-guidelines)
20. [License & Acknowledgments](#20-license--acknowledgments)

---

## 1. Executive Summary & Purpose

Modern software repositories contain far more critical context than the current `HEAD` commit reveals. The rationale behind architectural decisions is often fragmented across abandoned issue threads, deleted branches, squash-merged pull requests, and subtle bug regressions.

**CodeForensics** connects source code, Abstract Syntax Trees (AST), issues, pull requests, commit graphs, and contributor activity into an explainable, navigable evidence graph. It distinguishes provider facts from inferences, presents explicit confidence ratings, and eliminates guesswork by providing verifiable citations for every claim.

---

## 2. The Real-World Problem

Software development teams, security auditors, and open-source maintainers routinely struggle with four systemic challenges:

### Problem 1: The "Git Blame" Blindness & Context Evaporation
- `git blame` only tells you *who touched a line last*, not *why* it was introduced.
- In modern enterprise repositories using squash merges, automated refactors, and formatting passes (e.g. Prettier, Biome), up to **80% of lines point to non-informative commits** (`"chore: reformat"`, `"squash merge PR #1420"`).
- When a critical regression occurs, engineers spend hours searching through dozens of GitHub tabs trying to determine:
  - *Which issue originally reported this bug?*
  - *Was this function designed to handle nested concurrent transitions?*
  - *Did an intermediate commit fix tearing, only to be reverted in a subsequent hotfix?*

### Problem 2: The Hallucination Hazard in AI Coding Assistants
- Standard LLM coding assistants generate convincing, highly fluent explanations of legacy code.
- However, when context is missing, LLMs **confidently hallucinate architectural intent**, fabricating explanations of why code was written.
- In mission-critical production outages, compliance audits, or vulnerability analyses, relying on unverified AI text creates catastrophic regressions and liability risks.

### Problem 3: Distorted Contribution Metrics & "Bus Factor" Risks
- Traditional contribution metrics rely on naive line churn (lines added/deleted) or raw commit counts.
- A developer who renames a directory, updates third-party dependencies, or runs an automated codemod appears as the "top contributor", while the true domain architect who designed the state machine or concurrency logic remains invisible.
- When key maintainers transition off a project, teams are left vulnerable with unidentified single points of failure (bus factor risk).

### Problem 4: Ephemeral Branches & Vanishing Intermediate Steps
- Once a PR branch is merged and deleted, the chronological sequence of intermediate commits, discarded hypotheses, and reviewer feedback vanishes from standard git logs.
- When an edge-case regression re-emerges 18 months later, engineers have to restart the entire forensic investigation from scratch.

---

## 3. What CodeForensics Solves

CodeForensics transforms disjointed software artifacts into a cohesive, evidence-backed forensic platform:

| Dimension | Legacy Tools & AI Chatbots | CodeForensics Evidence Platform |
|---|---|---|
| **Code Reasoning** | Confidently hallucinates why code exists. | **Provable Citations**: Every claim links to an issue, PR, commit SHA, or AST line span. |
| **Uncertainty & Ambiguity** | Flattens missing data and guesses conclusions. | **Calibrated Confidence**: Returns `FACT`, `INFERENCE`, `UNKNOWN` with `HIGH`, `MEDIUM`, or `LOW` ratings. |
| **Code Safety & Sandboxing** | Runs untrusted build scripts or package hooks. | **Static In-Memory AST**: Analyzes source code using TypeScript Compiler API without executing repository scripts. |
| **Contributor Ownership** | Naive line-churn counts (distorted by refactors). | **Weighted Impact Scoring**: Balances PR merges, commit cadence, line churn, reviews, and time decay. |
| **Investigation Persistence** | Scattered notes, Slack threads, mental state. | **Evidence Vault**: Persists hypotheses, observations, code citations, and verified case findings. |
| **Ingestion Experience** | Blocking syncs that lock up the interface. | **Multi-Tier Background Pipeline**: BullMQ + Redis delivers instant Tier 1 stats while streaming deep crawls. |

---

## 4. Core Workbenches & Features

### 01. Workbench Workflow Guide (`/app/workflow`)
An interactive, 5-stage visual onboarding guide that walks new engineers through connecting a repository, searching symbols via AST, tracing PR lineage, identifying domain experts, and filing evidence-backed investigations.

### 02. Repository Overview & Health (`/app`)
Global repository health dashboard displaying synchronized work items, causal relationship counts, sync progress metrics, and direct links into deep forensic views.

### 03. Issue & PR Lineage Explorer (`/app/issues`)
A unified data grid tracking all issues, pull requests, authors, and states (`OPEN`, `CLOSED`, `MERGED`). Includes a slide-over detail drawer exposing the complete chronological thread, causal links (`ADDRESSES`, `SUPERSEDES`, `FIXED_BY`), and direct GitHub links.

### 04. Contribution Finder & Team Risk (`/app/contributions`)
Identifies true subsystem experts using our mathematical impact formula. Categorizes maintainers into Domain Experts, Active Maintainers, Historical Contributors, and Occasional Reviewers, while flagging single-point-of-failure risks.

### 05. Code Archaeology & AST Blast Radius (`/app/archaeology`)
Uses the official TypeScript AST Compiler in memory (`ts.createSourceFile`) to extract functions, classes, and React hooks with exact 1-indexed line spans. Pinpoints which commits and pull requests modified an exact symbol over the project's lifetime.

### 06. Forensic Investigations & Evidence Vault (`/app/investigations`)
A structured research workspace for diagnosing bugs, auditing pull requests, and benchmarking subsystems. Allows engineers to formulate testable hypotheses, log observations, attach immutable citations (commit SHAs, AST lines, PR links), and publish verified findings.

### 07. User Profile & Account Settings (`/app/profile`)
Directly integrated in the TopBar and accessible via modal dialog: allows users to update their display name, change their password, view authentication provider credentials, and manage account sessions.

### 08. In-App Technical Documentation (`/app/docs`)
A comprehensive, 10-chapter developer reference covering architecture, REST API contracts, database schemas, scoring formulas, and troubleshooting procedures.

---

## 5. System Architecture & Ingestion Flow

CodeForensics follows an event-driven, decoupled monorepo architecture:

```mermaid
graph TD
    User([Browser Client]) -->|HTTPS / Port 5173| Web[apps/web: Vite React SPA]
    Web -->|ID Token Auth| FirebaseClient[Firebase Auth Service]
    Web -->|REST API / Port 4000| API[apps/api: Fastify Gateway]
    
    API -->|Verify Bearer ID Token| FirebaseAdmin[Firebase Admin SDK]
    API -->|Query & Persist| Postgres[(PostgreSQL 16+ Database)]
    API -->|Enqueue Ingestion Jobs| Redis[(Redis 7+ Queue Broker)]
    API -->|Repo Metadata & Webhooks| GitHubApp[GitHub App REST/GraphQL]

    Worker[apps/worker: BullMQ Worker] -->|Poll Sync Jobs| Redis
    Worker -->|Stream Issues/PRs/Commits| GitHubApp
    Worker -->|Store Entities & Relationships| Postgres
```

### Ingestion Lifecycle:
1. **Repository Authorization**: The user selects or authorizes a GitHub repository via the GitHub App.
2. **Job Enqueueing**: Fastify enqueues a `repository-sync` job in Redis via BullMQ.
3. **Tier 1 Quick Ingestion**: The worker immediately fetches recent issues and PRs, saving them to PostgreSQL so the user can begin investigating within seconds.
4. **Tier 2 Deep Background Crawl**: The worker transparently streams historical commits, comment threads, and code revisions without blocking client interaction.
5. **AST Symbol Indexing**: When an engineer searches for a symbol, CodeForensics reads the target source file and parses its AST in memory, mapping line spans to commit SHAs.

---

## 6. Monorepo Structure

```text
codeforensics/
├── apps/
│   ├── api/             # Fastify 5 REST API gateway (port 4000)
│   │   ├── src/auth/    # Firebase Admin token verification & authorization
│   │   ├── src/routes/  # REST API route handlers (repos, issues, archaeology, investigations)
│   │   └── src/services/# Database access and business logic
│   ├── web/             # React 18 SPA built with Vite 6 (port 5173)
│   │   ├── src/pages/   # Overview, Workflow, Archaeology, Issues, Contributions, Investigations
│   │   ├── src/context/ # AuthContext (Firebase Auth) & RepositoryContext
│   │   └── src/components/ # Design system components, modals, drawers
│   └── worker/          # BullMQ background consumer for GitHub data ingestion
│       └── src/ingestion/ # Multi-tier GitHub API streaming pipeline
├── packages/
│   └── shared/          # Universal TypeScript types, Zod schemas, claim taxonomy
├── prisma/
│   ├── schema.prisma    # PostgreSQL relational schema and compound unique indexes
│   └── migrations/      # Version-controlled SQL migrations
├── docs/                # In-depth architectural documentation
├── docker-compose.yml   # PostgreSQL 16 and Redis 7 local orchestration
├── setup.md             # End-to-end setup and deployment guide
└── package.json         # Monorepo workspaces manifest
```

---

## 7. Prerequisites

- **Node.js**: `v20.x` or higher (LTS recommended)
- **npm**: `v10.x` or higher
- **Docker Desktop** (or locally running PostgreSQL 16+ and Redis 7+)
- **Git**

---

## 8. Quickstart: Local Development

### Step 1: Clone and Install Dependencies
```bash
git clone https://github.com/Manas-5461X/CodeForensics.git
cd CodeForensics
npm install
```

### Step 2: Start Infrastructure via Docker
```bash
# Starts PostgreSQL 16 (port 5432) and Redis 7 (port 6379)
docker compose up -d

# Verify container health
docker ps
```

### Step 3: Configure Environment Variables
```bash
# Copy example configuration template
cp .env.example .env
```
*(Review Section 9 below to configure your `.env` credentials).*

### Step 4: Run Database Migrations
```bash
# Generate Prisma Client and apply migrations
npm run db:generate
npm run db:migrate
```

### Step 5: Start All Monorepo Workspaces
Open separate terminal tabs or use the individual scripts:
```bash
npm run dev:api     # Fastify REST API -> http://localhost:4000
npm run dev:worker  # BullMQ background worker
npm run dev:web     # React Vite workbench -> http://localhost:5173
```

Visit **http://localhost:5173** to launch the CodeForensics Workbench.

---

## 9. Environment Configuration Reference

The root `.env` file governs all monorepo workspaces:

```bash
# ==============================================================================
# SERVER API & NETWORKING
# ==============================================================================
NODE_ENV=development
PORT=4000
HOST=127.0.0.1
CORS_ORIGIN=http://localhost:5173

# ==============================================================================
# DATABASE & BACKGROUND QUEUE
# ==============================================================================
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/codeforensics_dev?schema=public"
REDIS_URL="redis://localhost:6379"

# ==============================================================================
# FRONTEND FIREBASE AUTHENTICATION (Public - Bundled into Client)
# ==============================================================================
VITE_API_BASE_URL="http://localhost:4000"
VITE_FIREBASE_API_KEY="your-firebase-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"

# ==============================================================================
# BACKEND FIREBASE ADMIN (Server Only - Never Expose to Client)
# ==============================================================================
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_SERVICE_ACCOUNT_PATH="./secrets/firebase-service-account.json"

# ==============================================================================
# GITHUB APP INTEGRATION (Server Only)
# ==============================================================================
GITHUB_APP_ID="123456"
GITHUB_CLIENT_ID="Iv1.xxxxxxxxxxxx"
GITHUB_CLIENT_SECRET="your-client-secret"
GITHUB_WEBHOOK_SECRET="your-32-char-random-secret"
GITHUB_PRIVATE_KEY_PATH="./secrets/github-private-key.pem"
```

For complete documentation on every variable, see [docs/environment-variables.md](docs/environment-variables.md).

---

## 10. Authentication Architecture (Firebase Auth)

CodeForensics utilizes Firebase Authentication for secure client sessions and Firebase Admin SDK for server-side cryptographic token verification.

### Setup Instructions:
1. Open the [Firebase Console](https://console.firebase.google.com/) and create a project.
2. In **Build > Authentication > Sign-in method**, enable **Email/Password**, **Google**, and **GitHub**.
3. Under **Project Settings > General > Your apps**, register a Web App and paste the configuration into the `VITE_FIREBASE_*` variables in `.env`.
4. Under **Project Settings > Service accounts**, click **Generate new private key**. Save the downloaded JSON file as:
   ```
   secrets/firebase-service-account.json
   ```
5. In **Authentication > Settings > Authorized domains**, ensure `localhost` is listed.

---

## 11. GitHub App Integration Setup

CodeForensics interfaces with GitHub via an official GitHub App, providing higher rate limits and fine-grained permissions:

1. In GitHub, go to **Settings > Developer settings > GitHub Apps > New GitHub App**.
2. Configure URLs:
   - **Homepage URL**: `http://localhost:5173`
   - **Callback URL**: `http://localhost:4000/auth/github/callback`
   - **Webhook URL**: `http://localhost:4000/webhooks/github` (optional for local dev)
3. Set **Repository Permissions**:
   - `Issues`: Read-only
   - `Pull requests`: Read-only
   - `Contents`: Read-only
   - `Metadata`: Read-only
4. Generate a **Private Key** (`.pem` file) and save it as:
   ```
   secrets/github-private-key.pem
   ```
5. Install the GitHub App on your user account or organization.

For detailed configuration steps, see [docs/github-integration.md](docs/github-integration.md).

---

## 12. Database Schema & Prisma Migrations

The relational schema in `prisma/schema.prisma` models software repositories, issues, PRs, comments, commits, and user investigations:

```bash
# Inspect relational models in browser
npx prisma studio

# Generate client code
npm run db:generate

# Apply pending schema migrations
npm run db:migrate
```

Key models include:
- `Repository`: Metadata, sync tier states, and synchronization progress.
- `WorkItem`: Normalized issues and pull requests with resolution states and labels.
- `WorkItemComment`: Chronological discussion threads for lineage analysis.
- `Relationship`: Explicit causal connections (`ADDRESSES`, `SUPERSEDES`, `FIXED_BY`) with confidence ratings.
- `Investigation`: User-owned research records with hypotheses, observations, and citations.

---

## 13. Redis & Background Job Worker (BullMQ)

The worker process (`apps/worker`) processes background tasks from the `repository-sync` queue:

```bash
# Launch worker process
npm run dev:worker
```

### Worker Features:
- **Rate-Limit Resilience**: Detects GitHub API rate limit thresholds and applies exponential backoff.
- **Log Sanitization**: Redacts sensitive OAuth tokens, private keys, and user credentials.
- **Automatic Cleanup**: Cleans temporary disk workspaces after completing static analysis.

---

## 14. Full REST API Specification

All JSON responses follow a standardized API envelope (`{ success: boolean, data?: T, error?: ApiError, meta?: ApiMeta }`):

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Liveness probe reporting database and Redis connection states |
| `GET` | `/ready` | Readiness probe for container orchestrators and load balancers |
| `GET` | `/api/v1/auth/me` | Returns authenticated user profile and token claims |
| `GET` | `/api/v1/repositories` | Lists accessible repositories with sync statuses |
| `POST` | `/api/v1/repositories/:owner/:repo/sync` | Triggers or reschedules background repository sync |
| `GET` | `/api/v1/repositories/:owner/:repo/items` | Lists issues and PRs with filters (state, author, search) |
| `GET` | `/api/v1/repositories/:owner/:repo/relationships` | Returns detected cross-entity relationships and confidence |
| `GET` | `/api/v1/repositories/:owner/:repo/contributions` | Returns ranked contributors and single-point-of-failure risks |
| `GET` | `/api/v1/repositories/:owner/:repo/archaeology/trace` | AST symbol catalog, line spans, and commit history |
| `GET` | `/api/v1/investigations` | Lists saved investigations owned by caller |
| `POST` | `/api/v1/investigations` | Creates a new forensic investigation record |
| `GET` | `/api/v1/investigations/:id` | Retrieves investigation details with verification |
| `PATCH` | `/api/v1/investigations/:id` | Updates investigation status, hypotheses, or findings |
| `DELETE` | `/api/v1/investigations/:id` | Permanently deletes an investigation |

For complete payload schemas and error codes, see [docs/api.md](docs/api.md).

---

## 15. Security, Sandboxing & Threat Model

CodeForensics is engineered with strict defensive security principles:

1. **Zero Arbitrary Execution**: Repository source code is strictly treated as untrusted data. Build scripts (`npm run build`), package installation hooks (`postinstall`), and tests are **never executed**.
2. **Static AST Parsing**: Files are parsed in memory using the official TypeScript Compiler API (`ts.createSourceFile`) as text ASTs.
3. **Path Traversal Defense**: File paths are validated by `sanitizeFilePath`. Absolute paths, parent directory sequences (`..`), and null bytes (`\0`) are rejected.
4. **File Size Bounds**: Source code analysis is strictly capped at 1MB per file to mitigate algorithmic complexity attacks.
5. **Strict User Isolation**: Object-level authorization guarantees that investigations can only be created, read, or modified by the authenticated owner (`userId === token.uid`).
6. **Hardened HTTP Headers**: Fastify enforces `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: strict-origin-when-cross-origin`.

For the complete security architecture, see [docs/security.md](docs/security.md).

---

## 16. Mathematical Contributor Scoring Formula

To prevent distorted rankings caused by automated formatting passes or dependency bumps, the **Contribution Finder** applies a balanced multi-signal formula:

$$\text{Impact Score} = \left[ w_{\text{pr}} \cdot \text{PRsMerged} + w_{\text{commit}} \cdot \text{Commits} + w_{\text{churn}} \cdot \ln(1 + \text{LinesChanged}) + w_{\text{review}} \cdot \text{Reviews} \right] \times \text{FreshnessDecay}$$

### Signal Weights:
- **$w_{\text{pr}} = 25$**: High weight awarded to merged pull requests that passed code review.
- **$w_{\text{commit}} = 15$**: Weight awarded to individual commits in the default branch.
- **$w_{\text{churn}} = 10$**: Logarithmic dampening ($\ln(1 + \text{LinesChanged})$) prevents automated renames or large asset updates from dominating the score.
- **$w_{\text{review}} = 20$**: Recognizes architectural guidance, reviews, and mentorship.
- **$\text{FreshnessDecay}$**: Exponential time-decay ($e^{-\lambda t}$) rewards current, active maintainers over contributors who left years ago.

---

## 17. Testing & Quality Assurance

CodeForensics maintains automated test suites across all monorepo workspaces:

```bash
# Run all automated tests
npm test

# Run strict type checking across all workspaces
npm run typecheck

# Run linting rules
npm run lint

# Run specific workspace tests
npm test --workspace=@codeforensics/api
npm test --workspace=@codeforensics/web
```

---

## 18. Troubleshooting Common Issues

| Issue / Error | Likely Root Cause | Solution |
|---|---|---|
| `auth/invalid-api-key` | Placeholder Firebase key in `.env`. | Add your real Firebase API key to `VITE_FIREBASE_API_KEY` in `.env` and restart Vite. |
| `Can't reach database server at 5432` | PostgreSQL container is stopped. | Run `docker compose up -d postgres` and verify health with `docker ps`. |
| `Sync job remains in QUEUED` | Background worker is not running. | Run `npm run dev:worker` in a separate terminal. |
| `GitHub App not configured (401/403)` | Missing PEM file or incorrect App ID. | Verify `GITHUB_APP_ID` and `secrets/github-private-key.pem` match your registered GitHub App. |
| `Port 4000 or 5173 already in use` | Zombie process from previous run. | Kill the occupying process: `npx kill-port 4000 5173` or restart your terminal. |

For extended diagnostics, see [docs/troubleshooting.md](docs/troubleshooting.md).

---

## 19. Production Deployment Guidelines

Before deploying CodeForensics to production:

1. **Frontend**: Deploy `apps/web` to Vercel or Cloudflare Pages. Configure environment variables (`VITE_API_BASE_URL`, `VITE_FIREBASE_*`).
2. **Backend API & Worker**: Deploy `apps/api` and `apps/worker` as Node containers on Render, Fly.io, or AWS ECS.
3. **Database & Queue**: Provision managed PostgreSQL 16+ (e.g. Neon, Supabase) and managed Redis (e.g. Upstash). Run `npx prisma migrate deploy` in your CI/CD pipeline.
4. **Domain Configuration**: Add your production domain to Firebase Authorized Domains and update GitHub App Webhook URLs.

For full deployment scripts and recipes, see [setup.md](setup.md).

---

## 20. License & Acknowledgments

- **License**: Released under the [MIT License](LICENSE).
- **Core Technologies**: Built with [Fastify](https://www.fastify.io/), [React](https://react.dev/), [Vite](https://vitejs.dev/), [Prisma](https://www.prisma.io/), [BullMQ](https://bullmq.io/), [Tailwind CSS](https://tailwindcss.com/), [TypeScript Compiler API](https://github.com/microsoft/TypeScript), and [Firebase](https://firebase.google.com/).
