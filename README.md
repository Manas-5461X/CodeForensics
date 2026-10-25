# CodeForensics

**Evidence-backed repository intelligence for understanding code, issues, pull requests, and project history.**

CodeForensics connects software artifacts—source code, Abstract Syntax Trees (AST), issues, pull requests, commits, and contributor activity—into an explainable, navigable evidence graph. It distinguishes provider facts from inferences and makes uncertainty visible.

---

## Table of Contents

1. [Overview & Core Purpose](#1-overview--core-purpose)
2. [The Problem & Core Differentiators](#2-the-problem--core-differentiators)
3. [Implemented Capabilities](#3-implemented-capabilities)
4. [User Interface & Visual Evidence](#4-user-interface--visual-evidence)
5. [System Architecture](#5-system-architecture)
6. [Technology Stack & Repository Structure](#6-technology-stack--repository-structure)
7. [Prerequisites](#7-prerequisites)
8. [Docker Infrastructure Quickstart](#8-docker-infrastructure-quickstart)
9. [Environment Variables Reference](#9-environment-variables-reference)
10. [Firebase Authentication Setup](#10-firebase-authentication-setup)
11. [GitHub App Integration Setup](#11-github-app-integration-setup)
12. [Database Setup & Prisma Migrations](#12-database-setup--prisma-migrations)
13. [Redis & Background Job Worker](#13-redis--background-job-worker)
14. [Development, Build & Test Commands](#14-development-build--test-commands)
15. [API Overview & Specification](#15-api-overview--specification)
16. [Security & Threat Model](#16-security--threat-model)
17. [Current Limitations & Evidentiary Boundaries](#17-current-limitations--evidentiary-boundaries)
18. [Troubleshooting Common Issues](#18-troubleshooting-common-issues)
19. [Production Deployment Prerequisites](#19-production-deployment-prerequisites)
20. [License & Acknowledgements](#20-license--acknowledgements)

---

## 1. Overview & Core Purpose

Modern software repositories contain far more critical context than the current `HEAD` commit reveals. Why a function was modified is often buried in an abandoned issue thread, a reverted pull request, or a subtle bug regression.

CodeForensics is designed for engineers, security researchers, and maintainers to investigate unfamiliar codebases with verifiable proof. It eliminates guesswork by providing hard citations for every relationship, contributor ranking, and code revision milestone.

---

## 2. The Problem & Core Differentiators

| Traditional AI Assistants | CodeForensics Evidence Platform |
|---|---|
| **Opaque Hallucinations**: Confidently fabricates why code was written. | **Traceable Citations**: Every claim links to an issue, PR, commit SHA, or AST line span. |
| **Flattens Ambiguity**: Forces a conclusion even when data is missing. | **Honest Disclosures**: Returns `UNKNOWN` with confidence ratings (`HIGH`, `MEDIUM`, `LOW`, `NOT_ASSESSED`). |
| **Unsafe Script Execution**: Runs untrusted build scripts or package hooks. | **Static AST & Isolated Sandboxing**: Analyzes source code without executing repository code. |
| **Free-Text Notes**: Disjointed text scratchpads. | **Structured Investigations**: Persists observations, hypotheses, and evidence items with user ownership. |

---

## 3. Implemented Capabilities

1. **Repository Intelligence & Observable Ingestion**:
   - Streams issues, pull requests, labels, and commits via GitHub App API.
   - Background processing powered by BullMQ and Redis with real-time progress reporting.
   - Idempotent upserts in PostgreSQL with compound unique constraints preventing duplicates.
2. **Issue & PR Lineage Explorer**:
   - Unified work items table with state filters (`OPEN`, `CLOSED`, `MERGED`), author filters, and text search.
   - Slide-over detail drawer displaying full thread history, resolution assessments, and direct GitHub links.
3. **Relationship Intelligence & Resolution Assessment**:
   - Deterministic and heuristic detection of causal connections: `ADDRESSES`, `SUPERSEDES`, `FIXED_BY`.
   - Explainable "Why Linked?" cards detailing keywords (`fixes #12`, `closes #45`), branch refs, and confidence.
4. **Contribution Finder & Risk Assessment**:
   - Ranks maintainers into clear tiers (`DOMAIN EXPERT`, `ACTIVE`, `HISTORICAL`, `OCCASIONAL`).
   - Identifies single-maintainer risks, bus-factor vulnerability, and abandoned subsystems.
5. **Code Archaeology & Symbol AST Tracing**:
   - TypeScript Compiler API in-memory parsing (`ts.createSourceFile`) for `.ts`, `.tsx`, `.js`, `.jsx`.
   - Extracts functions, React hooks, classes, methods, and interfaces with exact 1-indexed line spans.
   - Historical commit revision lineage linking commit SHAs and authors to pull requests.
6. **Saved Investigations Workbench**:
   - Full CRUD lifecycle for persistent research records.
   - Structured citations (`FILE`, `SYMBOL`, `COMMIT`, `PULL_REQUEST`, `ISSUE`, `RELATIONSHIP`).
   - Strict server-side user ownership (`userId === token.uid`) preventing cross-user data leakage.
7. **In-App Documentation**:
   - Discoverable, searchable 10-chapter reference guide built right into `/app/docs`.

---

## 4. User Interface & Visual Evidence

The CodeForensics workbench follows a restrained editorial design: deep slate blue, charcoal, muted cyan, intentional whitespace, and zero decorative AI slop.

### Visual Workbenches:
- **Landing Page (`/`)**: Value proposition, evidence graph visualization, interactive case study preview, and non-negotiable evidentiary principles.
- **Forensic Workbench Overview (`/app`)**: Repository selector, sync status, work item metrics, and recent activity.
- **Issues Explorer (`/app/issues`)**: Filterable, searchable data grid with slide-over detail drawer.
- **Contribution Finder (`/app/contributions`)**: Contributor rankings, score signal breakdowns, and subsystem ownership risk alerts.
- **Code Archaeology (`/app/archaeology`)**: AST symbol catalog, line ranges, and chronological commit timeline.
- **Saved Investigations (`/app/investigations`)**: Master-detail investigation editor with interactive hypothesis and observation logging.
- **In-App Documentation (`/app/docs`)**: Developer guides, API contracts, syntax examples, and troubleshooting.

---

## 5. System Architecture

CodeForensics decouples client presentation, authenticated API gateway, relational storage, and background processing:

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

---

## 6. Technology Stack & Repository Structure

```text
codeforensics/
├── apps/
│   ├── api/             # Fastify 5 REST API, Firebase Admin auth, Zod validation, security hooks
│   ├── web/             # React 18, Vite 6, Tailwind CSS, TanStack Query, React Router 6
│   └── worker/          # BullMQ background queue consumer, GitHub ingestion pipeline
├── packages/
│   └── shared/          # Universal TypeScript types, Zod schemas, claim taxonomy, contracts
├── prisma/
│   ├── schema.prisma    # PostgreSQL relational schema and compound unique indexes
│   └── migrations/      # Version-controlled SQL migrations
├── docs/                # Supporting technical documentation
├── docker-compose.yml   # 1-command local PostgreSQL 16 & Redis 7 orchestration
├── setup.md             # End-to-end setup and deployment guide
└── package.json         # Monorepo workspaces manifest
```

---

## 7. Prerequisites

- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **Docker Desktop** (or local PostgreSQL 16+ and Redis 7+)
- **Git**

---

## 8. Docker Infrastructure Quickstart

CodeForensics includes a production-aligned `docker-compose.yml` for local development:

```bash
# Start PostgreSQL 16 and Redis 7 in the background
docker compose up -d

# Verify container health
docker ps
```

Containers initialized:
- `codeforensics-postgres`: Exposed on port `5432` (`codeforensics_dev` database).
- `codeforensics-redis`: Exposed on port `6379`.

---

## 9. Environment Variables Reference

Create your local `.env` file from the provided template:
```bash
cp .env.example .env
```

Key environment configuration:
```bash
# Server API & Networking
NODE_ENV=development
PORT=4000
HOST=127.0.0.1
CORS_ORIGIN=http://localhost:5173

# Database & Background Queue
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/codeforensics_dev?schema=public"
REDIS_URL="redis://localhost:6379"

# Frontend Firebase (Public - Bundled into Client)
VITE_API_BASE_URL="http://localhost:4000"
VITE_FIREBASE_API_KEY="your-firebase-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"

# Backend Firebase Admin (Server Only - Never Expose to Client)
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_SERVICE_ACCOUNT_PATH="./secrets/firebase-service-account.json"

# GitHub App Integration (Server Only)
GITHUB_APP_ID="123456"
GITHUB_CLIENT_ID="Iv1.xxxxxxxxxxxx"
GITHUB_CLIENT_SECRET="your-client-secret"
GITHUB_WEBHOOK_SECRET="your-32-char-random-secret"
GITHUB_PRIVATE_KEY_PATH="./secrets/github-private-key.pem"
```

For complete details on every variable, see [docs/environment-variables.md](docs/environment-variables.md).

---

## 10. Firebase Authentication Setup

1. Open the [Firebase Console](https://console.firebase.google.com/) and create a project.
2. In **Build > Authentication > Sign-in method**, enable **Email/Password** and **Google**.
3. Under **Project Settings > General > Your apps**, register a Web App and copy the `firebaseConfig` keys into the `VITE_FIREBASE_*` variables in `.env`.
4. Under **Project Settings > Service accounts**, click **Generate new private key**. Save the downloaded file as:
   ```
   secrets/firebase-service-account.json
   ```
5. In **Authentication > Settings > Authorized domains**, ensure `localhost` is listed.

---

## 11. GitHub App Integration Setup

1. In GitHub, go to **Settings > Developer settings > GitHub Apps > New GitHub App**.
2. Configure URLs:
   - **Homepage URL**: `http://localhost:5173`
   - **Callback URL**: `http://localhost:4000/auth/github/callback`
   - **Webhook URL**: `http://localhost:4000/webhooks/github` (or uncheck Active for local testing)
3. Set **Repository Permissions**:
   - `Issues`: Read-only
   - `Pull requests`: Read-only
   - `Contents`: Read-only
   - `Metadata`: Read-only
4. Generate and download a **Private Key** (`.pem` file). Save it as:
   ```
   secrets/github-private-key.pem
   ```
5. Install the app on your account via **Install App** in the left sidebar.

For deep configuration details, see [docs/github-integration.md](docs/github-integration.md).

---

## 12. Database Setup & Prisma Migrations

Apply the database migrations to configure all relational tables and compound indexes:

```bash
# Generate the Prisma Client
npm run db:generate

# Apply pending migrations to PostgreSQL
npm run db:migrate

# (Optional) Open Prisma Studio visual inspector
npx prisma studio
```

---

## 13. Redis & Background Job Worker

The background worker consumes sync jobs from Redis queue `repository-sync`:

```bash
# Start worker process
npm run dev:worker
```

Features:
- Rate-limit awareness with exponential retry backoff.
- Redaction of sensitive tokens from logs (`sanitizeLog`).
- Automatic cleanup of temporary clone workspaces.

---

## 14. Development, Build & Test Commands

```bash
# Run all automated test suites across the monorepo
npm test

# Run strict type checking across all 4 packages
npm run typecheck

# Run linting checks
npm run lint

# Compile production bundles
npm run build

# Start services individually
npm run dev:api     # Fastify API (http://localhost:4000)
npm run dev:worker  # BullMQ worker
npm run dev:web     # React Vite workbench (http://localhost:5173)
```

---

## 15. API Overview & Specification

Key endpoints (all JSON responses wrapped in the standard envelope):

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Liveness probe reporting database and Redis connection states |
| `GET` | `/ready` | Readiness probe for load balancers |
| `GET` | `/api/v1/auth/me` | Returns authenticated user record |
| `GET` | `/api/v1/repositories` | Lists accessible repositories |
| `POST` | `/api/v1/repositories/:owner/:repo/sync` | Enqueues background sync job |
| `GET` | `/api/v1/repositories/:owner/:repo/items` | Lists issues and pull requests with filters |
| `GET` | `/api/v1/repositories/:owner/:repo/relationships` | Returns detected relationships and confidence |
| `GET` | `/api/v1/repositories/:owner/:repo/contributions` | Returns ranked contributors and maintenance risks |
| `GET` | `/api/v1/repositories/:owner/:repo/archaeology/trace` | AST symbol catalog and commit history |
| `GET` | `/api/v1/investigations` | Lists saved investigations for user |
| `POST` | `/api/v1/investigations` | Creates a new investigation record |

For the complete API specification, see [docs/api.md](docs/api.md).

---

## 16. Security & Threat Model

- **Zero Arbitrary Execution**: Repository code is treated as untrusted input. Build scripts, npm hooks, and test runners are **never** executed.
- **Path Traversal Defense**: File paths are strictly validated by `sanitizeFilePath`. Absolute paths, parent directory references (`..`), and null bytes (`\0`) are rejected.
- **Resource Constraints**: Source analysis is capped at 1MB per file.
- **Security Headers**: Fastify enforces `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- **Cross-User Isolation**: Object-level authorization prevents reading, modifying, or deleting another user's investigations.

For the full security architecture, see [docs/security.md](docs/security.md).

---

## 17. Current Limitations & Evidentiary Boundaries

1. **Static Mock Fallbacks**:
   - In offline test environments without active database or GitHub credentials, the API automatically falls back to `InMemoryRepositoryStore` and `MockGitHubService`.
2. **Line Blame & Git History**:
   - Complete line-by-line blame requires a local clone mounted in the worker workspace. When only GitHub API metadata is available, CodeForensics displays revision milestones and commit links while honestly noting blame limitations.
3. **Supported AST Languages**:
   - AST symbol discovery currently supports TypeScript (`.ts`, `.tsx`) and JavaScript (`.js`, `.jsx`). Other extensions gracefully report revision history with an explicit limitation notice that AST parsing is unsupported.

---

## 18. Troubleshooting Common Issues

- **`auth/invalid-api-key`**: Update `VITE_FIREBASE_API_KEY` in `.env` with your real Firebase web key and restart the Vite server.
- **`Can't reach database server`**: Ensure the PostgreSQL Docker container is running (`docker compose up -d postgres`).
- **`Sync job remains in QUEUED`**: Verify the worker process is running (`npm run dev:worker`) and connected to Redis.
- **`GitHub App not configured`**: Check that `GITHUB_APP_ID` and `secrets/github-private-key.pem` are present in `.env`.

For additional diagnostic procedures, see [docs/troubleshooting.md](docs/troubleshooting.md).

---

## 19. Production Deployment Prerequisites

Before deploying to live cloud infrastructure:
1. **Frontend**: Deploy `apps/web` to Vercel or Cloudflare Pages.
2. **Backend**: Deploy `apps/api` and `apps/worker` as Node containers on Render, Fly.io, or AWS ECS using the provided Dockerfiles.
3. **Managed Services**: Provision managed PostgreSQL (e.g. Neon/Supabase) and managed Redis (e.g. Upstash). Run `npx prisma migrate deploy` in your build pipeline.
4. **Update URLs**: Update GitHub App Homepage, Callback, and Webhook URLs to your production domain, and add the domain to Firebase Authorized Domains.

For step-by-step deployment instructions, see [setup.md](setup.md).

---

## 20. License & Acknowledgements

- **License**: MIT License. See [LICENSE](LICENSE) for details.
- **Built With**: Fastify, React, Vite, Prisma, BullMQ, Tailwind CSS, TypeScript Compiler API, Octokit, and Firebase.
