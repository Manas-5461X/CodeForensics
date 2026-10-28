# CodeForensics — Setup, Deployment & Infrastructure Guide

This guide covers everything required to configure, connect, run, and deploy the entire **CodeForensics** platform across local development and production cloud environments, along with a comprehensive troubleshooting runbook.

---

## Table of Contents

1. [Architecture Overview: Processes & Services](#1-architecture-overview-processes--services)
2. [Prerequisites](#2-prerequisites)
3. [Local Development Setup](#3-local-development-setup)
4. [External Services Configuration](#4-external-services-configuration)
   - [4.1 Firebase Authentication](#41-firebase-authentication)
   - [4.2 GitHub App Integration](#42-github-app-integration)
   - [4.3 PostgreSQL Database](#43-postgresql-database)
   - [4.4 Redis & BullMQ Queue](#44-redis--bullmq-queue)
5. [Environment Variables Reference](#5-environment-variables-reference)
6. [Database Schema & Migrations](#6-database-schema--migrations)
7. [Production Cloud Deployment](#7-production-cloud-deployment)
   - [7.1 Frontend (Vercel)](#71-frontend-vercel)
   - [7.2 API & Background Worker (Render / Railway / Docker)](#72-api--background-worker-render--railway--docker)
   - [7.3 Production Checklist](#73-production-checklist)
8. [Troubleshooting & Diagnostics Runbook](#8-troubleshooting--diagnostics-runbook)

---

## 1. Architecture Overview: Processes & Services

CodeForensics is structured as a TypeScript monorepo with three internal application processes and four external infrastructure services:

```mermaid
graph TD
    User([User Browser]) -->|HTTPS / Port 5173| Web[apps/web: Vite React SPA]
    Web -->|ID Token Auth| FirebaseClient[Firebase Auth Service]
    Web -->|REST API / Port 4000| API[apps/api: Fastify Gateway]
  
    API -->|Verify Bearer ID Token| FirebaseAdmin[Firebase Admin SDK]
    API -->|Query & Persist| Postgres[(PostgreSQL 16+ Database)]
    API -->|Enqueue Sync Jobs| Redis[(Redis 7+ Queue Broker)]
    API -->|Repo Metadata & Webhooks| GitHubApp[GitHub App API]

    Worker[apps/worker: BullMQ Worker] -->|Poll Sync Jobs| Redis
    Worker -->|Fetch Issues/PRs/Commits| GitHubApp
    Worker -->|Store Ingested Entities| Postgres
```

### The 3 Internal Monorepo Apps

1. **`apps/web` (Frontend Workbench)**: React 18 + Vite SPA running on port `5173`. Uses the Firebase Web SDK to authenticate users and talks to the Fastify API with Bearer tokens.
2. **`apps/api` (Backend Gateway)**: Fastify server running on port `4000`. Cryptographically verifies Firebase ID tokens, manages user data in PostgreSQL, detects relationships/contributions/archaeology, and enqueues sync jobs.
3. **`apps/worker` (Background Job Worker)**: Node.js worker powered by BullMQ and Redis. Ingests GitHub repositories (issues, PRs, comments, commits) asynchronously without blocking web requests.

### The 4 External Services

| Service | Purpose | Recommended Setup | Free Tier? |
|---|---|---|---|
| **Firebase Project** | User Authentication (Google & Email/Password). Issues client ID tokens verified by backend. | [Firebase Console](https://console.firebase.google.com/) | Yes (Spark Plan 100% free) |
| **GitHub App** | Authenticated GitHub integration. High hourly rate limits (5,000 req/hr). | [GitHub Developer Settings](https://github.com/settings/apps) | Yes (100% free) |
| **PostgreSQL (16+)** | Relational data store for users, repos, work items, relationships, citations. | Local Docker OR Neon / Supabase | Yes (Local Docker or cloud free tier) |
| **Redis (7+)** | In-memory message broker for BullMQ repository ingestion queues. | Local Docker OR Upstash | Yes (Local Docker or Upstash free tier) |

---

## 2. Prerequisites

- **Node.js**: `v20.x` or higher (LTS recommended)
- **npm**: `v10.x` or higher
- **Docker Desktop** (or locally running PostgreSQL 16+ and Redis 7+)
- **Git**

---

## 3. Local Development Setup

### Step 1: Clone Repository & Install Dependencies

```bash
git clone https://github.com/Manas-5461X/CodeForensics.git
cd CodeForensics
npm install
```

### Step 2: Start Infrastructure via Docker Compose

```bash
# Starts PostgreSQL 16 (port 5432) and Redis 7 (port 6379)
docker compose up -d

# Verify healthy containers
docker compose ps
```

### Step 3: Copy Environment Configuration Template

```bash
cp .env.example .env
```
*(Populate your `.env` following Section 4 and Section 5 below).*

### Step 4: Run Prisma Migrations & Generate Client

```bash
npm run db:generate
npm run db:migrate
```

### Step 5: Start All Applications

Open three terminal tabs:

```bash
# Terminal 1: Fastify REST API
npm run dev:api     # http://localhost:4000

# Terminal 2: BullMQ Background Worker
npm run dev:worker  # Polls Redis queues

# Terminal 3: Vite React Web Client
npm run dev:web     # http://localhost:5173
```

Visit **http://localhost:5173** to access the CodeForensics Workbench.

---

## 4. External Services Configuration

### 4.1 Firebase Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project (e.g. `codeforensics-dev`).
2. Navigate to **Authentication** -> **Sign-in method** and enable:
   - **Email/Password**
   - **Google**
3. In **Settings** -> **Authorized domains**, ensure `localhost` is listed. When deploying to production, add your production domain (e.g. `your-app.vercel.app`).
4. In **Project settings** -> **General** -> **Your apps**, register a Web App:
   - Copy `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`.
   - Set these as `VITE_FIREBASE_*` variables in `.env`.
5. In **Project settings** -> **Service accounts**:
   - Click **Generate new private key** to download your service account JSON.
   - Set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` in `.env`.

### 4.2 GitHub App Integration

1. Go to [GitHub Developer Settings -> GitHub Apps -> New GitHub App](https://github.com/settings/apps/new).
2. Configure general settings:
   - **GitHub App name**: `CodeForensics-YourName`
   - **Homepage URL**: `http://localhost:5173` (or production URL)
   - **Callback URL**: `http://localhost:4000/auth/github/callback`
   - **Webhook URL**: `http://localhost:4000/webhooks/github` (use a placeholder or Smee.io for local testing)
   - **Webhook secret**: Enter a secure random string and set as `GITHUB_WEBHOOK_SECRET` in `.env`.
3. Configure repository permissions (**Read-only** across all four):
   - **Issues**: Read-only
   - **Pull requests**: Read-only
   - **Contents**: Read-only
   - **Metadata**: Read-only
4. Generate and download a private key (`.pem` file):
   - Save the key (e.g. `secrets/github-app.private-key.pem`).
   - Set `GITHUB_APP_ID`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `GITHUB_PRIVATE_KEY_PATH` in `.env`.
5. Click **Install App** in the left sidebar and install it on your personal account or organization.

### 4.3 PostgreSQL Database

- **Local Development**: Docker Compose provides PostgreSQL on `localhost:5432`.
- **Cloud Database (Serverless)**: Neon Postgres or Supabase:
  - Connection string: `postgresql://user:password@ep-xyz.neon.tech/codeforensics?sslmode=require`

### 4.4 Redis & BullMQ Queue

- **Local Development**: Docker Compose provides Redis on `localhost:6379`.
- **Cloud Broker**: Upstash Redis:
  - Connection string: `rediss://default:password@xyz.upstash.io:6379`

---

## 5. Environment Variables Reference

```env
# ------------------------------------------------------------------------------
# Server & Network Configuration
# ------------------------------------------------------------------------------
PORT=4000
HOST=0.0.0.0
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# ------------------------------------------------------------------------------
# Database & Message Broker
# ------------------------------------------------------------------------------
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/codeforensics?schema=public"
REDIS_URL="redis://localhost:6379"

# ------------------------------------------------------------------------------
# Firebase Admin SDK (Backend Token Verification)
# ------------------------------------------------------------------------------
FIREBASE_PROJECT_ID="codeforensics-dev"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@codeforensics-dev.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"

# ------------------------------------------------------------------------------
# GitHub App Credentials
# ------------------------------------------------------------------------------
GITHUB_APP_ID=123456
GITHUB_CLIENT_ID="Iv1.xxxxxxxxxxxx"
GITHUB_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
GITHUB_WEBHOOK_SECRET="super-secret-webhook-key-here"
GITHUB_PRIVATE_KEY_PATH="./secrets/github-app.private-key.pem"

# ------------------------------------------------------------------------------
# Web Client (Vite Environment Variables)
# ------------------------------------------------------------------------------
VITE_API_URL=http://localhost:4000
VITE_FIREBASE_API_KEY="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
VITE_FIREBASE_AUTH_DOMAIN="codeforensics-dev.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="codeforensics-dev"
VITE_FIREBASE_STORAGE_BUCKET="codeforensics-dev.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789012"
VITE_FIREBASE_APP_ID="1:123456789012:web:xxxxxxxxxxxxxxxx"
```

---

## 6. Database Schema & Migrations

The database schema is managed via Prisma in `prisma/schema.prisma`.

### Available Database Scripts

```bash
npm run db:generate   # Generates Prisma Client TypeScript bindings
npm run db:migrate    # Creates and applies new migrations locally
npm run db:studio     # Opens Prisma Studio graphical database viewer (port 5555)
npx prisma migrate deploy # Safely applies pending migrations in production CI/CD
```

---

## 7. Production Cloud Deployment

### 7.1 Frontend (Vercel)

1. Connect your repository to [Vercel](https://vercel.com).
2. Set Root Directory to `apps/web`.
3. Framework preset: **Vite**.
4. Build command: `npm run build:web` (or `cd ../.. && npm run build --workspace=@codeforensics/shared && cd apps/web && vite build`).
5. Output directory: `dist`.
6. Add all `VITE_*` environment variables in Vercel Project Settings.
7. **Important**: Add your production Vercel domain to Firebase Authorized Domains!

### 7.2 API & Background Worker (Render / Railway / Docker)

Deploy `apps/api` and `apps/worker` as independent container services:

- **API Service**:
  - Build command: `npm ci && npm run build --workspace=@codeforensics/shared && npm run db:generate && npm run build --workspace=@codeforensics/api`
  - Start command: `node apps/api/dist/server.js`
  - Port: `4000`
- **Worker Service**:
  - Build command: `npm ci && npm run build --workspace=@codeforensics/shared && npm run db:generate && npm run build --workspace=@codeforensics/worker`
  - Start command: `node apps/worker/dist/index.js`

### 7.3 Production Checklist

- [ ] `CORS_ORIGIN` matches production frontend domain exactly.
- [ ] No server secrets (`FIREBASE_PRIVATE_KEY`, `GITHUB_PRIVATE_KEY`, `DATABASE_URL`) are prefixed with `VITE_`.
- [ ] Production Vercel domain added to Firebase Console Authorized Domains.
- [ ] Database connection pooling configured (e.g. `?pgbouncer=true` for Neon).
- [ ] GitHub App Homepage, Callback, and Webhook URLs updated to production domains.

---

## 8. Troubleshooting & Diagnostics Runbook

### Issue 1: Firebase "auth/unauthorized-domain" Error

- **Symptom**: Sign-in displays `auth/unauthorized-domain` in production or on a custom domain.
- **Root Cause**: The current domain (e.g., your Vercel deployment URL) is not yet whitelisted in Firebase Console.
- **Resolution**:
  1. Open [Firebase Console](https://console.firebase.google.com/).
  2. Navigate to **Authentication** -> **Settings** -> **Authorized domains**.
  3. Click **Add domain**.
  4. Paste your production domain (e.g., `codeforensics.vercel.app`) without `https://`.
  5. Wait 30 seconds and refresh the application.

### Issue 2: Database Connection Failures (500 / Degraded Health)

- **Symptom**: Fastify `/health` endpoint reports `database: disconnected` or logs `PrismaClientInitializationError: Can't reach database server`.
- **Root Cause**: PostgreSQL is offline, network credentials are invalid, or cloud pooler timed out.
- **Resolution**:
  - For local Docker: Run `docker compose up -d` and check `docker ps` to verify container `codeforensics-postgres` is running.
  - For cloud databases (Neon, Supabase): Verify `DATABASE_URL` matches your credentials and that SSL parameters (`?sslmode=require`) are appended.
  - For cold-start timeouts: Ensure health check timeouts accommodate cold serverless connections (3000ms+).

### Issue 3: Redis Queue Stalls or Missing Worker

- **Symptom**: Repository sync jobs remain stuck in `QUEUED` state indefinitely without progressing to `RUNNING`.
- **Root Cause**: The BullMQ worker process is not running or is disconnected from Redis.
- **Resolution**:
  1. Check if the worker process is running: `npm run dev:worker` (locally) or verify worker service status in cloud dashboard.
  2. Test Redis connectivity: `redis-cli -u $REDIS_URL ping` (should respond with `PONG`).
  3. If Redis queue has stalled jobs, restart the worker process; BullMQ will automatically claim active stalled jobs.

### Issue 4: GitHub App "Not Configured" Warning

- **Symptom**: Repository discovery returns an empty list, or syncing throws "GitHub App is not configured".
- **Root Cause**: `GITHUB_APP_ID` or private key (`.pem`) is missing or unreadable.
- **Resolution**:
  1. Verify `GITHUB_APP_ID` is set to a valid integer in `.env`.
  2. Verify that `GITHUB_PRIVATE_KEY_PATH` points to a readable `.pem` file on disk, or that `GITHUB_PRIVATE_KEY` contains the multiline RSA key.
  3. Ensure the GitHub App is installed on your account or organization via GitHub App settings.

### Issue 5: CORS Policy Rejection in Browser

- **Symptom**: Web console shows `Access to fetch has been blocked by CORS policy`.
- **Root Cause**: `CORS_ORIGIN` in the backend API `.env` does not match the frontend URL.
- **Resolution**: Update `CORS_ORIGIN` on the API server to match your exact client URL (e.g., `http://localhost:5173` for dev, `https://your-domain.vercel.app` for production).
