# CodeForensics — Environment Variables & Configuration Reference

This document provides a comprehensive audit of all environment variables used by CodeForensics across the frontend client (`apps/web`), backend API (`apps/api`), and background worker (`apps/worker`).

---

## 1. Security Boundaries: Frontend vs. Server Secrets

> [!CAUTION]
> Variables prefixed with `VITE_` are bundled directly into client JavaScript code and visible to end-users via the browser. **NEVER prefix server secrets, private keys, database URLs, or webhook secrets with `VITE_`.**

---

## 2. Environment Variables Matrix

### 2.1 Backend API Server (`apps/api`)

| Variable | Type | Default | Description |
|---|---|---|---|
| `NODE_ENV` | `development \| test \| production` | `development` | Runtime environment mode |
| `PORT` | `number` | `4000` | Port for the Fastify HTTP API server |
| `HOST` | `string` | `127.0.0.1` | Network interface address for server binding |
| `CORS_ORIGIN` | `string` | `http://localhost:5173` | Allowed CORS origins (comma-separated for multiple domains) |
| `PUBLIC_WEB_URL` | `string (URL)` | `http://localhost:5173` | Canonical public URL of the web workbench |
| `DATABASE_URL` | `string (URL)` | `""` | PostgreSQL connection string (`postgresql://user:pass@host:port/db?schema=public`) |
| `REDIS_URL` | `string (URL)` | `""` | Redis connection string (`redis://localhost:6379` or `rediss://...` for TLS) |

### 2.2 Firebase Admin SDK (`apps/api`)

| Variable | Type | Default | Description |
|---|---|---|---|
| `FIREBASE_PROJECT_ID` | `string` | `""` | Google Cloud / Firebase project identifier (e.g. `codeforensics-dev`) |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | `string (filepath)` | `""` | Path to downloaded Firebase service account JSON key on disk |
| `FIREBASE_CLIENT_EMAIL` | `string` | `""` | Service account client email (alternative to JSON file) |
| `FIREBASE_PRIVATE_KEY` | `string` | `""` | RSA private key PEM string with literal `\n` (alternative to JSON file) |
| `FIREBASE_AUTH_EMULATOR_HOST` | `string` | `""` | Optional host for local Firebase Auth emulator (e.g. `127.0.0.1:9099`) |

### 2.3 GitHub App Integration (`apps/api` & `apps/worker`)

| Variable | Type | Default | Description |
|---|---|---|---|
| `GITHUB_APP_ID` | `string` | `""` | Numerical App ID from GitHub Developer Settings |
| `GITHUB_CLIENT_ID` | `string` | `""` | OAuth Client ID starting with `Iv1.` |
| `GITHUB_CLIENT_SECRET` | `string` | `""` | Generated OAuth Client Secret |
| `GITHUB_WEBHOOK_SECRET` | `string` | `""` | 32+ character secret for verifying HMAC-SHA256 webhook signatures |
| `GITHUB_PRIVATE_KEY_PATH` | `string (filepath)` | `""` | Path to downloaded `.pem` private key file (e.g. `./secrets/github-private-key.pem`) |
| `GITHUB_PRIVATE_KEY` | `string` | `""` | Raw or base64-encoded RSA private key PEM string |

### 2.4 Background Sync Worker (`apps/worker`)

| Variable | Type | Default | Description |
|---|---|---|---|
| `REDIS_URL` | `string (URL)` | `redis://localhost:6379` | Redis broker connection string for BullMQ queue polling |
| `WORKER_CONCURRENCY` | `number` | `5` | Maximum number of concurrent repository sync jobs processed |
| `WORKER_WORKSPACE_DIR` | `string` | `./tmp/workspaces` | Directory for isolated checkout workspaces |
| `DATABASE_URL` | `string (URL)` | `""` | PostgreSQL connection string for persisting ingested entities |

### 2.5 Frontend Web Client (`apps/web`)

| Variable | Type | Default | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | `string (URL)` | `http://localhost:4000` | URL of the backend Fastify API |
| `VITE_FIREBASE_API_KEY` | `string` | `placeholder-api-key` | Public Web API key from Firebase Console |
| `VITE_FIREBASE_AUTH_DOMAIN` | `string` | `codeforensics-dev.firebaseapp.com` | Firebase Auth domain for OAuth callbacks |
| `VITE_FIREBASE_PROJECT_ID` | `string` | `codeforensics-dev` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | `string` | `codeforensics-dev.appspot.com` | Storage bucket identifier |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `string` | `""` | FCM Sender ID |
| `VITE_FIREBASE_APP_ID` | `string` | `""` | Firebase Web App ID (`1:679...:web:...`) |

---

## 3. Safe Defaults & Fallbacks

- **Offline / Test Mode**: If `DATABASE_URL` or `GITHUB_APP_ID` are omitted, the API automatically falls back to `InMemoryRepositoryStore` and `MockGitHubService`, allowing unit and component tests to execute without external infrastructure dependencies.
- **Missing Token Verifier**: In `NODE_ENV=test`, if no Firebase credentials are provided, `createTokenVerifier()` defaults to `MockTokenVerifier`, allowing simulated tokens for automated testing.
