# CodeForensics — Local Development Setup Guide

This document details the local developer environment setup for CodeForensics, covering prerequisite tooling, Docker container orchestration, database migrations, service startup, and verification testing.

---

## 1. Prerequisites

Before running CodeForensics locally, ensure you have the following installed on your machine:
- **Node.js**: `v20.x` or higher (verified with Node.js v20/v22/v24).
- **npm**: `v10.x` or higher.
- **Docker & Docker Compose**: Docker Desktop (or local PostgreSQL 16+ and Redis 7+ services).
- **Git**: Installed and accessible in your shell.

---

## 2. Fast Track Local Quickstart (5 Minutes)

### Step 1: Clone and Install
```bash
git clone <repository-url>
cd CodeForensics
npm install
```

### Step 2: Initialize Docker Infrastructure
Start local PostgreSQL and Redis in the background:
```bash
docker compose up -d
```
Verify container health with `docker ps`. You should see `codeforensics-postgres` on port `5432` and `codeforensics-redis` on port `6379`.

### Step 3: Configure Environment Variables
Copy the template configuration:
```bash
cp .env.example .env
```
For local offline development and testing, the default values in `.env.example` point to your local Docker containers (`localhost:5432` and `localhost:6379`).

For live authentication and GitHub sync, populate:
- `VITE_FIREBASE_*`: Web client configuration from Firebase Console.
- `FIREBASE_SERVICE_ACCOUNT_PATH`: Path to your service account JSON file (`./secrets/firebase-service-account.json`).
- `GITHUB_APP_ID`, `GITHUB_CLIENT_ID`, `GITHUB_PRIVATE_KEY_PATH`: From GitHub App settings.

### Step 4: Run Database Migrations
Initialize the PostgreSQL schema with Prisma:
```bash
# Generate the Prisma Client types
npm run db:generate

# Apply migrations to the development database
npm run db:migrate
```

*(Optional) Launch the visual Prisma database viewer:*
```bash
npx prisma studio
```

### Step 5: Start Monorepo Services
Open three terminal tabs:
```bash
# Terminal 1 — Fastify API Gateway
npm run dev:api

# Terminal 2 — BullMQ Background Sync Worker
npm run dev:worker

# Terminal 3 — Vite Frontend Workbench
npm run dev:web
```

Open `http://localhost:5173` in your browser.

---

## 3. Monorepo Scripts Reference

All primary developer scripts are defined at the root `package.json`:

| Script | Command | Purpose |
|---|---|---|
| `npm run dev:web` | `npm run dev --workspace=@codeforensics/web` | Starts Vite dev server with Hot Module Replacement on port `5173` |
| `npm run dev:api` | `npm run dev --workspace=@codeforensics/api` | Starts Fastify server with `tsx watch` reload on port `4000` |
| `npm run dev:worker` | `npm run dev --workspace=@codeforensics/worker` | Starts BullMQ sync worker with `tsx watch` reload |
| `npm run build` | `npm run build --workspaces --if-present` | Compiles TypeScript across all 4 packages for production |
| `npm run typecheck` | `npm run typecheck --workspaces --if-present` | Strict `tsc --noEmit` type verification across all packages |
| `npm test` | `npm run test --workspaces --if-present` | Runs Vitest unit and integration suites across all packages |
| `npm run lint` | `npm run lint --workspaces --if-present` | Runs codebase linting and style compliance checks |
| `npm run db:generate` | `prisma generate` | Generates `@prisma/client` artifacts from `prisma/schema.prisma` |
| `npm run db:migrate` | `prisma migrate dev` | Applies new migrations to development PostgreSQL |

---

## 4. Testing & Verification

CodeForensics includes comprehensive unit and integration test coverage across all packages:
```bash
# Run all automated tests
npm test

# Run tests in watch mode for a single workspace
npm test --workspace=@codeforensics/api
npm test --workspace=@codeforensics/web
```

Tests run in-memory by default using mock verifiers and repository stores. They do not require live external credentials to pass.
