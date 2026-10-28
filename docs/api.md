# CodeForensics — REST API Reference & Specification

All API endpoints are hosted under `http://localhost:4000/api/v1` (unless otherwise noted). All responses adhere to the standard JSON API envelope.

---

## 1. Universal Response Envelope

### Success Response Format:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-10-25T18:00:00.000Z",
    "requestId": "uuid"
  }
}
```

### Error Response Format:
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST | NOT_FOUND | UNAUTHORIZED | FORBIDDEN | INTERNAL_SERVER_ERROR",
    "message": "Human-readable error description"
  },
  "meta": {
    "timestamp": "2026-10-25T18:00:00.000Z",
    "requestId": "uuid"
  }
}
```

---

## 2. Health & Diagnostic Endpoints

### `GET /health`
- **Auth:** None (Public)
- **Description:** Liveness probe returning component connectivity states.
- **Response:**
  ```json
  {
    "status": "ok | degraded",
    "version": "0.1.0",
    "uptimeSeconds": 1240,
    "services": {
      "database": "connected | disconnected | disabled",
      "redis": "connected | disconnected | disabled"
    }
  }
  ```

### `GET /ready`
- **Auth:** None (Public)
- **Description:** Readiness probe for load balancers. Returns `200 OK` when ready to receive traffic.

### `GET /api/v1/meta`
- **Auth:** None (Public)
- **Description:** Engine metadata and platform version information.

---

## 3. Authentication & User Profile

### `GET /api/v1/auth/me`
- **Auth:** Bearer Token (Required)
- **Description:** Returns the authenticated user record from the database.
- **Headers:** `Authorization: Bearer <FIREBASE_ID_TOKEN>`

### `GET /api/v1/auth/verify`
- **Auth:** Bearer Token (Required)
- **Description:** Fast verification of current token validity and claims.

---

## 4. Repository Discovery & Synchronization

### `GET /api/v1/repositories/installations`
- **Auth:** Bearer Token (Required)
- **Description:** Lists GitHub App installations accessible to the authenticated user.

### `GET /api/v1/repositories`
- **Auth:** Bearer Token (Required)
- **Query Params:** `installationId?: number`
- **Description:** Lists repositories accessible to the GitHub App installation.

### `GET /api/v1/repositories/:owner/:repo`
- **Auth:** Bearer Token (Required)
- **Description:** Retrieves repository metadata, default branch, and sync status.

### `POST /api/v1/repositories/:owner/:repo/sync`
- **Auth:** Bearer Token (Required)
- **Body:** `{ "force": boolean }`
- **Description:** Enqueues a synchronization job to BullMQ queue `repository-sync`.

### `GET /api/v1/repositories/:owner/:repo/sync/status`
- **Auth:** Bearer Token (Required)
- **Description:** Returns real-time sync progress, imported record counts, and last completed timestamp.

---

## 5. Issues & Pull Requests Explorer

### `GET /api/v1/repositories/:owner/:repo/items`
- **Auth:** Bearer Token (Required)
- **Query Parameters:**
  - `type?: "issue" | "pull_request"`
  - `state?: "open" | "closed"`
  - `query?: string` (search text in title and body)
  - `limit?: number` (default: 50, max: 100)
  - `offset?: number` (default: 0)
- **Description:** Returns a paginated list of synchronized issues and pull requests.

### `GET /api/v1/repositories/:owner/:repo/items/:number`
- **Auth:** Bearer Token (Required)
- **Description:** Retrieves complete item details including body text, resolution assessment, detected relationships, and raw GitHub metadata.

---

## 6. Relationship Intelligence & Resolution Assessment

### `GET /api/v1/repositories/:owner/:repo/relationships`
- **Auth:** Bearer Token (Required)
- **Query Parameters:**
  - `sourceId?: string`
  - `targetId?: string`
  - `type?: "ADDRESSES" | "SUPERSEDES" | "FIXED_BY"`
- **Description:** Returns detected relationships, confidence levels, closing keywords, and explainable citations.

---

## 7. Contribution Finder

### `GET /api/v1/repositories/:owner/:repo/contributions`
- **Auth:** Bearer Token (Required)
- **Query Parameters:**
  - `targetIssueNumber?: number`
  - `subsystem?: string`
- **Description:** Returns ranked contributor profiles with score breakdowns, recency signals, tier classifications, and subsystem maintenance risk alerts.

---

## 8. Code Archaeology & AST Tracing

### `GET /api/v1/repositories/:owner/:repo/archaeology/trace`
- **Auth:** Bearer Token (Required)
- **Query Parameters:**
  - `filePath: string` (Relative path within repo, e.g. `packages/shared/src/index.ts`)
  - `symbolName?: string` (Optional function, hook, class, or type name)
- **Description:** Parses source file using TypeScript Compiler AST in-memory. Returns symbol catalog with 1-indexed line spans, commit revision milestones, and limitation notes.

---

## 9. Saved Investigations Workbench

### `GET /api/v1/investigations`
- **Auth:** Bearer Token (Required)
- **Query Parameters:**
  - `repositoryId?: string`
  - `status?: "open" | "in_progress" | "resolved" | "inconclusive"`
  - `query?: string`
- **Description:** Lists saved investigations owned by the authenticated user.

### `POST /api/v1/investigations`
- **Auth:** Bearer Token (Required)
- **Body:**
  ```json
  {
    "repositoryId": "uuid",
    "question": "Was issue #42 fixed by PR #108?",
    "scope": "packages/shared",
    "status": "open",
    "hypotheses": ["Fix merged in v0.1.0"],
    "observations": ["Line 42 changed in commit abc1234"],
    "evidenceItems": [
      {
        "id": "item-1",
        "type": "PULL_REQUEST",
        "identifier": "PR #108",
        "title": "Fix regression in sync pipeline",
        "sourceUrl": "https://github.com/owner/repo/pull/108",
        "recordedAt": "2026-10-25T18:00:00Z"
      }
    ]
  }
  ```

### `GET /api/v1/investigations/:id`
- **Auth:** Bearer Token (Required)
- **Description:** Fetches a single investigation with full evidence citations. Enforces server-side ownership (`404/403` if owned by another user).

### `PATCH /api/v1/investigations/:id`
- **Auth:** Bearer Token (Required)
- **Body:** `{ "status"?: string, "hypotheses"?: string[], "observations"?: string[], "findings"?: string[] }`
- **Description:** Updates status and appends working observations or hypotheses.

### `DELETE /api/v1/investigations/:id`
- **Auth:** Bearer Token (Required)
- **Description:** Deletes an investigation record. Requires server-side ownership.

---

## 10. Webhooks

### `POST /webhooks/github`
- **Auth:** HMAC-SHA256 Signature Header (`X-Hub-Signature-256`)
- **Description:** Ingests live GitHub webhook events (`installation`, `installation_repositories`, `issues`, `pull_request`). Automatically verified against `GITHUB_WEBHOOK_SECRET`.

---

## 11. Architecture Map & Forensic Analysis Workbench

### `GET /api/v1/repositories/:owner/:repo/map`
- **Auth:** Bearer Token (Required)
- **Description:** Compiles repository directory hierarchy, subsystem groupings, file sizes, commit touch frequencies, and 0–100 churn volatility scores.

### `GET /api/v1/repositories/:owner/:repo/map/dossier`
- **Auth:** Bearer Token (Required)
- **Description:** Generates a standalone, air-gapped single-file HTML Forensic Audit Dossier with embedded vector flowcharts, co-change matrices, bus factor registers, and issue verification cards. Zero external dependencies.

### `GET /api/v1/repositories/:owner/:repo/map/co-change`
- **Auth:** Bearer Token (Required)
- **Description:** Computes statistical temporal coupling across pull requests using Jaccard similarity. Flags cross-subsystem boundary violations where mutations leak across architectural tiers.

### `GET /api/v1/repositories/:owner/:repo/map/timeline`
- **Auth:** Bearer Token (Required)
- **Description:** Retrieves historical architectural milestone snapshots across 4 release eras (6 Months Ago, 3 Months Ago, 1 Month Ago, Present) for time-machine scrubbers.

### `GET /api/v1/repositories/:owner/:repo/map/knowledge-loss`
- **Auth:** Bearer Token (Required)
- **Description:** Correlates file churn with maintainer activity to identify single-maintainer dependencies (Bus Factor = 1) and Zombie Hotspots (high churn authored by departed/dormant engineers).

### `POST /api/v1/repositories/:owner/:repo/map/blast-radius`
- **Auth:** Bearer Token (Required)
- **Body:**
  ```json
  {
    "targetFiles": ["apps/api/src/db/repositoryStore.ts"]
  }
  ```
- **Description:** Simulates pre-commit ripple hazards (0–100 score), downstream coupled companion files, affected unit/integration test suites marked `MUST PASS`, and recommended peer reviewers.
