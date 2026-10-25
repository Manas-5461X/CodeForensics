# CodeForensics — Comprehensive Setup & Deployment Guide

This guide walks you through everything required to configure, connect, run, and deploy the entire **CodeForensics** platform from scratch.

---

## 1. Executive Architecture: Which Apps & Services Are Needed?

CodeForensics is an evidence-backed repository intelligence platform organized as a TypeScript monorepo with 3 application processes and 4 external services:

```mermaid
graph TD
    User([User Browser]) -->|HTTPS / Port 5173| Web[apps/web: Vite React SPA]
    Web -->|ID Token Auth| FirebaseClient[Firebase Auth Service]
    Web -->|REST API / Port 4000| API[apps/api: Fastify Server]
  
    API -->|Verify ID Token| FirebaseAdmin[Firebase Admin SDK]
    API -->|Query & Persist| Postgres[(PostgreSQL 16+)]
    API -->|Enqueue Sync Jobs| Redis[(Redis 7+ Queue)]
    API -->|Repo Metadata & Webhooks| GitHubApp[GitHub App API]

    Worker[apps/worker: BullMQ Worker] -->|Poll Sync Jobs| Redis
    Worker -->|Fetch Issues/PRs/Commits| GitHubApp
    Worker -->|Store Ingested Entities| Postgres
```

### The 3 Internal Monorepo Apps:

1. **`apps/web` (Frontend)**: React 18 + Vite SPA running on port `5173`. Uses Firebase Web SDK to sign users in, and communicates with the backend Fastify API using Bearer tokens.
2. **`apps/api` (Backend API)**: Fastify server running on port `4000`. Verifies Firebase authentication tokens, manages user data in PostgreSQL, detects relationships/contributions/archaeology, and enqueues repository sync jobs into Redis.
3. **`apps/worker` (Background Job Worker)**: Node.js worker powered by BullMQ and Redis. Ingests GitHub repositories (issues, PRs, commits), computes resolution relationships, and persists structured data into PostgreSQL without blocking the web API.

---

### The 4 External Services You Need to Connect:

| Service                       | What It Does for CodeForensics                                                                                                                       | Where to Set Up                                              | Free Tier Available?                           |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------- |
| **1. Firebase Project** | User Authentication (Google Sign-In & Email/Password). Issues client ID tokens verified by the backend.                                              | [Firebase Console](https://console.firebase.google.com/)      | Yes (Spark Plan is 100% free)                  |
| **2. GitHub App**       | Authenticated GitHub integration. Provides read-only access to repositories, issues, PRs, and commit history with higher rate limits (5,000 req/hr). | [GitHub Developer Settings](https://github.com/settings/apps) | Yes (100% free)                                |
| **3. PostgreSQL (16+)** | System of record database. Stores users, installations, repositories, work items, relationships, contributor stats, and investigations.              | Local Docker OR Cloud (Neon / Supabase / Render)             | Yes (Local Docker or Neon/Supabase free tiers) |
| **4. Redis (7+)**       | In-memory message broker for BullMQ. Manages repository synchronization queues, worker job states, retries, and progress updates.                    | Local Docker OR Cloud (Upstash / Redis Cloud)                | Yes (Local Docker or Upstash free tier)        |

---

## 2. Step-by-Step External Services Setup Guide

Follow these 4 walkthroughs in order to generate the exact keys and secrets needed for your `.env` file.

---

### Step 2.1: Firebase Project Setup (Authentication)

CodeForensics uses Firebase for user sign-in and session management.

#### 1. Create a Firebase Project

1. Navigate to the [Firebase Console](https://console.firebase.google.com/) and click **Add project**.
2. Name the project `codeforensics-dev` (or any name you prefer).
3. Disable Google Analytics (optional, not required) and click **Create project**.

#### 2. Enable Authentication Providers

1. In the left sidebar, click **Build** > **Authentication** > **Get started**.
2. Go to the **Sign-in method** tab:
   - Click **Email/Password** > Enable the first toggle ("Email/Password") > click **Save**.
   - Click **Add new provider** > Select **Google** > Enable the toggle > Select your support email > click **Save**.

#### 3. Register the Web App (Frontend Credentials)

1. In Project Overview, click the Web icon (`</>`) to add an app.
2. Name the app `CodeForensics Web`. Do not check "Firebase Hosting" for now. Click **Register app**.
3. Firebase will display your `firebaseConfig` object:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "codeforensics-dev.firebaseapp.com",
     projectId: "codeforensics-dev",
     storageBucket: "codeforensics-dev.firebasestorage.app",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef123456"
   };
   ```
4. Keep this tab open. These values will be mapped to `VITE_FIREBASE_*` in your `.env`.

#### 4. Generate Backend Admin SDK Service Account Key

The Fastify API (`apps/api`) needs a service account key to verify client tokens server-side:

1. Click the **Gear icon (Project settings)** in the top-left sidebar.
2. Go to the **Service accounts** tab.
3. Select **Firebase Admin SDK** > **Node.js**.
4. Click **Generate new private key** and confirm. A JSON file will download to your computer.
5. Open the downloaded JSON file. You will see:
   - `"project_id"`
   - `"client_email"`
   - `"private_key"`
6. Keep these three values handy for `apps/api`.

#### 5. Configure Authorized Domains

1. In Firebase Console, go to **Authentication** > **Settings** > **Authorized domains**.
2. Ensure `localhost` and `127.0.0.1` are present (they are added by default). When you deploy to production later, you will add your production web domain here.

---

### Step 2.2: GitHub App Setup (Repository Ingestion)

CodeForensics connects to GitHub via a custom **GitHub App** to discover repositories and sync metadata with high rate limits.

#### 1. Register a New GitHub App

1. Log into your GitHub account and go to [GitHub App Settings](https://github.com/settings/apps).
   *(If deploying for an organization, go to `https://github.com/organizations/<YOUR_ORG>/settings/apps`).*
2. Click **New GitHub App**.
3. Fill in the basic information:
   - **GitHub App name**: `codeforensics-<your-name>` (must be globally unique on GitHub).
   - **Homepage URL**: `http://localhost:5173` (or your production frontend URL).
   - **Callback URL**: `http://localhost:4000/auth/github/callback`
   - **Expire user authorization tokens**: Checked (recommended).

#### 2. Configure Webhooks

1. Under **Webhook**:
   - Check **Active**.
   - **Webhook URL**: `http://localhost:4000/webhooks/github`*(For local development testing with real GitHub webhooks, you can use [Smee.io](https://smee.io/) or [ngrok](https://ngrok.com/), or leave it as localhost for initial manual sync).*
   - **Webhook secret**: Enter a secure random string (minimum 32 characters), e.g. run in PowerShell/terminal:
     ```bash
     openssl rand -hex 20
     ```

     Copy this secret for `GITHUB_WEBHOOK_SECRET`.

#### 3. Set Permissions (Repository Permissions)

Scroll down to **Repository permissions** and set the following:

- **Issues**: `Read-only` (to inspect issues, discussion, and closing references).
- **Pull requests**: `Read-only` (to inspect PR titles, descriptions, branches, and merges).
- **Contents**: `Read-only` (to read commit history and verify files for code archaeology).
- **Metadata**: `Read-only` (automatically set by GitHub).

*Leave all other permissions as "No access".*

#### 4. Subscribe to Webhook Events

Under **Subscribe to events**, select:

- [X] **Installation**
- [X] **Installation repositories**
- [X] **Issues** *(optional, for real-time live sync)*
- [X] **Pull request** *(optional, for real-time live sync)*

#### 5. Choose Installation Audience

- Under **Where can this GitHub App be installed?**:
  - Select **Only on this account** (for private personal use) OR **Any account** (if you want other users to install your app on their own repos).
- Click **Create GitHub App**.

#### 6. Generate Keys and Credentials

Once created, GitHub will open your App's settings page:

1. Note your **App ID** (e.g. `123456`) -> `GITHUB_APP_ID`.
2. Note your **Client ID** (e.g. `Iv1.8a2b3c4d5e...`) -> `GITHUB_CLIENT_ID`.
3. Under **Client secrets**, click **Generate a new client secret** and copy it -> `GITHUB_CLIENT_SECRET`.
4. Scroll down to **Private keys** and click **Generate a private key**:
   - GitHub will generate and download a `.pem` file (e.g., `codeforensics.2026-10-25.private-key.pem`).
   - Move or copy this file into your project root or an isolated secrets folder (e.g., `./secrets/github-private-key.pem`).
   - Add this path to `GITHUB_PRIVATE_KEY_PATH` in `.env`.

#### 7. Install the App on Your Repositories

1. In the left navigation of your GitHub App page, click **Install App**.
2. Click **Install** next to your personal account or organization.
3. Choose **All repositories** or **Only select repositories** (select the repositories you want to analyze in CodeForensics).
4. Click **Install**.
5. Once installed, CodeForensics will automatically recognize your installations and repositories.

---

### Step 2.3: Database & Queue Infrastructure (PostgreSQL & Redis)

You have two options: **Local Docker (easiest)** or **Managed Free Cloud Services**.

#### Option A: 1-Command Local Setup with Docker Compose (Recommended)

A `docker-compose.yml` file is provided in the project root.

1. Ensure Docker Desktop is installed and running.
2. In the repository root, start PostgreSQL and Redis in the background:
   ```bash
   docker compose up -d
   ```
3. Verify containers are healthy:
   ```bash
   docker ps
   ```

   You will see:- `codeforensics-postgres` on port `5432`
   - `codeforensics-redis` on port `6379`

#### Option B: Cloud Database & Redis (Free Tiers)

If you prefer not to use Docker:

- **PostgreSQL**: Create a free PostgreSQL instance on [Neon](https://neon.tech/) or [Supabase](https://supabase.com/). Copy the connection string:
  ```
  DATABASE_URL="postgresql://user:password@ep-xyz.aws.neon.tech/neondb?sslmode=require"
  ```
- **Redis**: Create a free database on [Upstash](https://upstash.com/) or [Redis Cloud](https://redis.io/cloud/). Copy the connection string:
  ```
  REDIS_URL="rediss://default:password@xyz.upstash.io:6379"
  ```

---

## 3. Environment Configuration (`.env`)

Create your `.env` file in the root of the project:

```bash
cp .env.example .env
```

Open `.env` and fill in the values you obtained in Step 2:

```bash
# ==============================================================================
# CodeForensics — Master Environment Configuration
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. API Server Configuration (apps/api)
# ------------------------------------------------------------------------------
NODE_ENV=development
PORT=4000
HOST=127.0.0.1
CORS_ORIGIN=http://localhost:5173
PUBLIC_WEB_URL=http://localhost:5173

# ------------------------------------------------------------------------------
# 2. Database Persistence (PostgreSQL & Prisma)
# ------------------------------------------------------------------------------
# Local Docker URL:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/codeforensics_dev?schema=public"
# Or Cloud (e.g. Neon/Supabase):
# DATABASE_URL="postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require"

# ------------------------------------------------------------------------------
# 3. Background Job Queue (Redis & BullMQ)
# ------------------------------------------------------------------------------
# Local Docker URL:
REDIS_URL="redis://localhost:6379"
# Or Cloud (e.g. Upstash):
# REDIS_URL="rediss://default:token@xyz.upstash.io:6379"

# ------------------------------------------------------------------------------
# 4. Firebase Authentication — Frontend Client (apps/web)
# ------------------------------------------------------------------------------
# Extracted from Firebase Console > Project Settings > Web App (firebaseConfig)
VITE_API_BASE_URL="http://localhost:4000"
VITE_FIREBASE_API_KEY="AIzaSyYourRealApiKeyHere"
VITE_FIREBASE_AUTH_DOMAIN="codeforensics-dev.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="codeforensics-dev"
VITE_FIREBASE_STORAGE_BUCKET="codeforensics-dev.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789012"
VITE_FIREBASE_APP_ID="1:123456789012:web:abcdef123456"

# ------------------------------------------------------------------------------
# 5. Firebase Admin SDK — Backend Token Verification (apps/api)
# ------------------------------------------------------------------------------
# Extracted from the downloaded Firebase Service Account JSON file
FIREBASE_PROJECT_ID="codeforensics-dev"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@codeforensics-dev.iam.gserviceaccount.com"
# You can paste the raw private key (newlines escaped with \n) OR set the path:
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
# Alternatively, point directly to the JSON file on disk:
# FIREBASE_SERVICE_ACCOUNT_PATH="./secrets/firebase-service-account.json"

# ------------------------------------------------------------------------------
# 6. GitHub App Integration (apps/api & apps/worker)
# ------------------------------------------------------------------------------
# Extracted from GitHub Settings > Developer Settings > GitHub Apps
GITHUB_APP_ID="123456"
GITHUB_CLIENT_ID="Iv1.xxxxxxxxxxxx"
GITHUB_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
GITHUB_WEBHOOK_SECRET="your-32-char-random-webhook-secret"

# Provide path to the downloaded GitHub .pem file:
GITHUB_PRIVATE_KEY_PATH="./secrets/github-private-key.pem"
# OR paste the raw/base64 PEM string directly:
# GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0...\n-----END RSA PRIVATE KEY-----\n"

# ------------------------------------------------------------------------------
# 7. Background Worker Configuration (apps/worker)
# ------------------------------------------------------------------------------
WORKER_CONCURRENCY=5
WORKER_WORKSPACE_DIR="./tmp/workspaces"
```

> [!NOTE]
> Ensure `./secrets/` is listed in your `.gitignore` so your private key files are never committed to git.

---

## 4. Local Execution: Running the Monorepo

Follow these steps to initialize the database and run all 3 applications simultaneously.

### Step 4.1: Install Dependencies

```bash
npm install
```

### Step 4.2: Start Database & Redis (if using Docker)

```bash
docker compose up -d
```

### Step 4.3: Initialize PostgreSQL Schema with Prisma

Apply the database migrations to create all tables:

```bash
# Generate the Prisma Client types
npm run db:generate

# Apply migrations to PostgreSQL
npm run db:migrate
```

*(Optional) You can open the Prisma Studio visual database browser at any time with:*

```bash
npx prisma studio
```

### Step 4.4: Run Automated Tests

Verify that all packages and services pass tests:

```bash
npm test
```

All 165 automated tests across `@codeforensics/shared`, `@codeforensics/api`, `@codeforensics/web`, and `@codeforensics/worker` should pass.

### Step 4.5: Start the Development Servers

Open **three separate terminal windows** (or use your IDE's multi-terminal feature):

#### Terminal 1 — Backend API:

```bash
npm run dev:api
```

*Starts Fastify server at `http://localhost:4000`. You will see `[Server] API listening on http://127.0.0.1:4000`.*

#### Terminal 2 — Background Sync Worker:

```bash
npm run dev:worker
```

*Connects BullMQ to Redis and begins listening on queue `repository-sync`. You will see `[Worker:Active] Worker listening for synchronization jobs`.*

#### Terminal 3 — Frontend Web Workbench:

```bash
npm run dev:web
```

*Starts the Vite dev server at `http://localhost:5173`.*

---

## 5. Verification: Testing the Live Platform

1. **Open the Web App**: Open your browser at `http://localhost:5173`.
2. **Sign In**: Click **Sign In** or **Register**. Create an account using Email/Password or Google Sign-In.
3. **Select Repository**: In the top bar, click the repository selector. Your authorized GitHub App installations will appear in the dropdown. Select a repository.
4. **Trigger Sync**: Click the **Sync** button.
   - The API pushes a job to Redis.
   - The background worker pulls the job, downloads repository issues, PRs, and commits from GitHub, evaluates resolution relationships, and saves records into PostgreSQL.
   - The frontend displays real-time progress.
5. **Explore Features**:
   - **Issues & PR Explorer**: View and filter synchronized issues and pull requests.
   - **Relationships & Resolution Intelligence**: Inspect explainable links (`ADDRESSES`, `FIXED_BY`, `SUPERSEDES`).
   - **Contribution Finder**: Discover key maintainers and subsystem risk.
   - **Code Archaeology**: Search TypeScript files/symbols, view AST metadata and line numbers, and inspect historical revision timelines.
   - **Saved Investigations**: Create evidence-backed research investigations and log observations, hypotheses, and citations.

---

## 6. Production Deployment Guide

When taking CodeForensics to production, deploy each tier to appropriate cloud hosting providers.

```mermaid
graph LR
    subgraph CDN / Edge
        Vercel[Vercel / Cloudflare Pages<br/>apps/web Static SPA]
    end

    subgraph Container PaaS
        APIContainer[Render / Fly.io / AWS ECS<br/>apps/api Node Container]
        WorkerContainer[Render / Fly.io / AWS ECS<br/>apps/worker Node Container]
    end

    subgraph Managed Cloud DB
        Supabase[(Neon / Supabase<br/>PostgreSQL 16+)]
        Upstash[(Upstash / Redis Cloud<br/>Redis 7+ TLS)]
    end

    Vercel -->|REST API| APIContainer
    APIContainer --> Supabase
    APIContainer --> Upstash
    WorkerContainer --> Upstash
    WorkerContainer --> Supabase
```

---

### Step 6.1: Hosting Recommendations

| Service                              | Recommended Host                                         | Alternative Hosts                     |
| ------------------------------------ | -------------------------------------------------------- | ------------------------------------- |
| **Frontend (`apps/web`)**    | **Vercel** or **Cloudflare Pages**           | Netlify, AWS S3 + CloudFront          |
| **Backend API (`apps/api`)** | **Render (Web Service)** or **Fly.io**       | Railway, AWS App Runner, DigitalOcean |
| **Worker (`apps/worker`)**   | **Render (Background Worker)** or **Fly.io** | Railway, AWS ECS Fargate              |
| **PostgreSQL**                 | **Neon** or **Supabase**                     | AWS RDS, Render Postgres              |
| **Redis**                      | **Upstash Redis**                                  | Redis Cloud, AWS ElastiCache          |

---

### Step 6.2: Deploying the Frontend (`apps/web`) to Vercel

1. Push your repository to GitHub.
2. In [Vercel](https://vercel.com/), click **Add New Project** and import your repository.
3. Configure project settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `apps/web` (or leave root and set build command below)
   - **Build Command**: `npm run build --workspace=@codeforensics/shared && npm run build --workspace=@codeforensics/web`
   - **Output Directory**: `apps/web/dist`
4. Add **Environment Variables** in Vercel:
   - `VITE_API_BASE_URL`: `https://api.yourdomain.com` (your production API URL)
   - `VITE_FIREBASE_API_KEY`: Your Firebase API Key
   - `VITE_FIREBASE_AUTH_DOMAIN`: `codeforensics-dev.firebaseapp.com`
   - `VITE_FIREBASE_PROJECT_ID`: `codeforensics-dev`
   - `VITE_FIREBASE_STORAGE_BUCKET`: `codeforensics-dev.firebasestorage.app`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`: Your Sender ID
   - `VITE_FIREBASE_APP_ID`: Your App ID
5. Click **Deploy**.
6. Once deployed, copy your production domain (e.g. `https://codeforensics.vercel.app`) and:
   - Add it to **Firebase Console > Authentication > Settings > Authorized domains**.
   - Add it as `CORS_ORIGIN` and `PUBLIC_WEB_URL` in the Backend API environment.

---

### Step 6.3: Deploying the Backend API & Worker via Docker

Below are standard, production-ready multi-stage Dockerfiles for the API and Worker.

#### Dockerfile for API (`apps/api/Dockerfile`):

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package manifests
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
COPY prisma ./prisma/

RUN npm ci

# Copy source files
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Build shared package and API
RUN npm run build --workspace=@codeforensics/shared
RUN npm run db:generate
RUN npm run build --workspace=@codeforensics/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/prisma ./prisma

EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
```

#### Dockerfile for Background Worker (`apps/worker/Dockerfile`):

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/worker/package*.json ./apps/worker/
COPY prisma ./prisma/

RUN npm ci

COPY packages/shared ./packages/shared
COPY apps/worker ./apps/worker

RUN npm run build --workspace=@codeforensics/shared
RUN npm run db:generate
RUN npm run build --workspace=@codeforensics/worker

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/apps/worker/package.json ./apps/worker/package.json
COPY --from=builder /app/prisma ./prisma

CMD ["node", "apps/worker/dist/index.js"]
```

---

### Step 6.4: Production CI/CD Database Migration Strategy

In production CI/CD pipelines (e.g. GitHub Actions, Render deploy hooks), never run `prisma migrate dev`. Use the non-interactive production command:

```bash
# Applies all pending migrations safely to production PostgreSQL
npx prisma migrate deploy
```

Add this command to your build or pre-deploy step in your cloud hosting provider.

---

### Step 6.5: Production Checklist & Security Hardening

Before opening CodeForensics to production users, verify this security checklist:

- [ ] **No Client Secrets Exposed**: Verify that `GITHUB_PRIVATE_KEY`, `GITHUB_CLIENT_SECRET`, `FIREBASE_PRIVATE_KEY`, `DATABASE_URL`, and `REDIS_URL` are set **only** on the backend API and worker, never prefixed with `VITE_`.
- [ ] **CORS Restricted**: Set `CORS_ORIGIN=https://your-frontend-domain.com` (do not allow `*` in production).
- [ ] **GitHub App URLs Updated**:
  - Update **Homepage URL** to your production frontend URL.
  - Update **Callback URL** to `https://api.yourdomain.com/auth/github/callback`.
  - Update **Webhook URL** to `https://api.yourdomain.com/webhooks/github`.
- [ ] **Firebase Authorized Domains**: Add your production domain in Firebase Console (`https://your-app.vercel.app`).
- [ ] **Database Connection Pooling**: When connecting to serverless PostgreSQL (such as Neon or Supabase), append `?pgbouncer=true` or use a connection pooler URL for high concurrency.
- [ ] **Worker Health**: Monitor BullMQ job completions in Redis using tools like Bull-Board or Redis CLI monitor.

---

## 7. Troubleshooting Common Setup Issues

### Issue 1: "Firebase: Error (auth/invalid-api-key)" in the browser

- **Cause**: `VITE_FIREBASE_API_KEY` in `.env` is either missing or set to the default placeholder.
- **Fix**: Copy the exact API key from your Firebase Console Web App settings and restart the Vite dev server (`npm run dev:web`). Vite caches environment variables on startup.

### Issue 2: "GitHub App is not configured" when syncing a repository

- **Cause**: Either `GITHUB_APP_ID` or `GITHUB_PRIVATE_KEY` / `GITHUB_PRIVATE_KEY_PATH` is missing from `.env`.
- **Fix**: Check that `GITHUB_APP_ID` matches your App ID, and that the path in `GITHUB_PRIVATE_KEY_PATH` points to a readable `.pem` file on disk.

### Issue 3: "Connection refused 127.0.0.1:5432" or "127.0.0.1:6379"

- **Cause**: PostgreSQL or Redis is not running.
- **Fix**: Run `docker compose up -d` in the project root, or verify that your local service or cloud URL is accessible.

### Issue 4: "PrismaClientInitializationError: Can't reach database server"

- **Cause**: Incorrect `DATABASE_URL` format or database service offline.
- **Fix**: Verify your credentials format: `postgresql://user:password@host:port/database?schema=public`. If using Docker, ensure container `codeforensics-postgres` is running.
