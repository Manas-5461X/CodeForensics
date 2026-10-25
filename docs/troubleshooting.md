# CodeForensics — Troubleshooting & Operational Diagnostics

This guide provides troubleshooting workflows and actionable recovery steps for common local setup, connectivity, and data synchronization issues.

---

## 1. Firebase Authentication Issues

### Problem: `auth/invalid-api-key` in the browser
- **Symptoms**: Frontend loads, but clicking Login or Register throws an invalid API key error in the console.
- **Root Cause**: `VITE_FIREBASE_API_KEY` in `.env` is either missing or set to the default placeholder.
- **Solution**:
  1. Open [Firebase Console](https://console.firebase.google.com/) > Project Settings > General > Your apps > Web app.
  2. Copy the real `apiKey` value into `VITE_FIREBASE_API_KEY` in `.env`.
  3. Restart the Vite dev server (`npm run dev:web`), as Vite caches environment variables at startup.

### Problem: `auth/unauthorized-domain`
- **Symptoms**: Google Sign-In popup opens and immediately closes with an unauthorized domain error.
- **Root Cause**: The current hostname is not in the Firebase authorized domains whitelist.
- **Solution**:
  1. Go to Firebase Console > Authentication > Settings > Authorized domains.
  2. Add `localhost` and `127.0.0.1` (for local development) or your custom production domain (e.g. `codeforensics.vercel.app`).

### Problem: API returns `401 Unauthorized` on all protected endpoints
- **Symptoms**: User is signed in on the frontend, but all workbench data queries fail with `401`.
- **Root Cause**: `apps/api` cannot verify the Bearer token because the Firebase Admin SDK private key is missing or invalid.
- **Solution**:
  1. Verify that `secrets/firebase-service-account.json` exists and is readable.
  2. Ensure `FIREBASE_PROJECT_ID` in `.env` matches the project ID in the service account JSON.

---

## 2. PostgreSQL & Prisma Persistence Issues

### Problem: `Can't reach database server at localhost:5432`
- **Symptoms**: Running `npm run db:migrate` or starting the API fails with `PrismaClientInitializationError`.
- **Root Cause**: PostgreSQL is offline or Docker container is not running.
- **Solution**:
  ```bash
  # Check if PostgreSQL container is running
  docker ps
  
  # Start local containers
  docker compose up -d postgres
  ```

### Problem: `Database migration pending` or drift error
- **Symptoms**: API logs warning about unapplied migrations.
- **Solution**:
  ```bash
  npm run db:generate
  npm run db:migrate
  ```

---

## 3. Redis & BullMQ Background Worker Issues

### Problem: Sync job stays in `QUEUED` indefinitely
- **Symptoms**: Clicking "Sync" in the top bar creates a job, but progress remains at 0% and never moves to `RUNNING`.
- **Root Cause**: The background worker process (`apps/worker`) is not running.
- **Solution**:
  1. Start the worker process in a separate terminal:
     ```bash
     npm run dev:worker
     ```
  2. Verify that `REDIS_URL` in `.env` points to an active Redis broker (run `docker compose up -d redis`).

### Problem: `ECONNREFUSED 127.0.0.1:6379`
- **Symptoms**: Worker crashes with Redis connection refused error.
- **Solution**:
  1. Start Redis: `docker compose up -d redis`.
  2. Test connectivity using redis-cli: `docker exec -it codeforensics-redis redis-cli ping` (should reply `PONG`).

---

## 4. GitHub App Integration Issues

### Problem: "GitHub App is not configured"
- **Symptoms**: Selecting repositories shows "No installations found" or API returns an empty repository list.
- **Root Cause**: `GITHUB_APP_ID` or private key path is missing from `.env`.
- **Solution**:
  1. Verify that `GITHUB_APP_ID` is set in `.env`.
  2. Verify that `secrets/github-private-key.pem` exists on disk.
  3. Ensure the app has been installed on your account via GitHub App settings > **Install App**.

### Problem: "Webhook URL is not reachable over the public Internet (localhost)"
- **Symptoms**: GitHub settings rejects `http://localhost:4000/webhooks/github`.
- **Solution**:
  - In GitHub App settings, uncheck the **Active** checkbox under Webhooks for local development. On-demand sync via REST API does not require live webhooks.
  - Alternatively, use a proxy like [Smee.io](https://smee.io/) to forward webhooks to localhost.
