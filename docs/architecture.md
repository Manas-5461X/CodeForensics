# CodeForensics — System Architecture & Component Design

## 1. Architectural Overview

CodeForensics is structured as a typed, modular monorepo that strictly decouples the client user interface, the authenticated HTTP API, the relational persistence layer, and the asynchronous worker processing engine.

```text
┌─────────────────────────────────────────────────────────────────┐
│                     Client Browser (apps/web)                   │
│   React 18 + Vite + Tailwind CSS + TanStack Query + React Router│
└────────────────┬────────────────────────────────────────────────┘
                 │ HTTPS + Firebase Bearer ID Token
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Fastify API (apps/api)                      │
│   - Firebase Admin token verification                           │
│   - Resource-level authorization & membership check             │
│   - Zod runtime boundary validation                             │
│   - Consistent JSON error & success envelope                    │
└───────┬──────────────────────┬──────────────────────┬───────────┘
        │                      │                      │
        ▼                      ▼                      ▼
┌──────────────┐       ┌──────────────┐       ┌───────────────────┐
│  PostgreSQL  │       │  GitHub App  │       │  Redis + BullMQ   │
│  (Prisma)    │       │  REST/GraphQL│       │  Queue Scheduler  │
└───────▲──────┘       └──────────────┘       └─────────┬─────────┘
        │                                               │
        │                                               ▼
        │                                     ┌───────────────────┐
        │                                     │ Worker Process    │
        │                                     │ (apps/worker)     │
        └─────────────────────────────────────┤ - Sync ingestion  │
                                              │ - AST analysis    │
                                              │ - Lineage ranking │
                                              └───────────────────┘
```

## 2. Component Responsibilities

### 2.1 Web Frontend (`apps/web`)
- **Role:** Presentation, user navigation, client-side caching, and forensic investigation interaction.
- **Constraints:** Zero server secrets, zero Firebase Admin keys, zero database credentials.
- **Design System:** Follows `skills.md` — warm light mode (`--canvas: #f7f6f2`, `--surface: #ffffff`, `--accent: #a64427`), IBM Plex typography, restrained borders, and clear semantic status cues.
- **State Handling:** Handles all asynchronous states: loading skeletons, empty states with clear calls to action, inline field errors, permission denial, and partial data notices.

### 2.2 Backend HTTP API (`apps/api`)
- **Role:** Secure gateway for client requests, authentication verification, tenant authorization, and job dispatching.
- **Endpoints:**
  - `GET /health`: Liveness probe reporting database and Redis connectivity.
  - `GET /ready`: Readiness probe for deployment health checks.
  - `GET /api/v1/meta`: Engine and service metadata.
- **Error Envelope:**
  ```json
  {
    "success": false,
    "error": {
      "code": "BAD_REQUEST",
      "message": "Detailed description without secret exposure"
    },
    "meta": {
      "timestamp": "2026-10-14T10:00:00.000Z",
      "requestId": "uuid"
    }
  }
  ```

### 2.3 Shared Contract Library (`packages/shared`)
- **Role:** Universal TypeScript definitions and Zod schemas shared between frontend, backend, and background workers.
- **Contracts:**
  - Claim taxonomy: `FACT`, `INFERENCE`, `HYPOTHESIS`, `UNKNOWN`.
  - Relationship types: `DUPLICATES`, `RELATED_TO`, `BLOCKS`, `ADDRESSES`, `SUPERSEDES`, `FIXED_BY`, `REVERTS`, etc.
  - Assessment confidence: `HIGH`, `MEDIUM`, `LOW`, `NOT_ASSESSED`.
  - Response envelopes and pagination parameters.

### 2.4 Background Processing Engine (`apps/worker`)
- **Role:** Offloads heavy pagination, GraphQL queries, Git cloning, and AST analysis from HTTP request threads.
- **Queue System:** BullMQ backed by Redis with exponential backoff (initial delay 5s, 3 attempts), progress updates, and structured failure records.
- **Workspaces:** Isolated temporary checkout directories for Git operations with automatic cleanup.

### 2.5 Database Persistence Layer (`prisma`)
- **Role:** Primary durable system of record using PostgreSQL.
- **Integrity:** Enforces compound unique constraints (e.g. `[repositoryId, number]`) to guarantee idempotent imports and eliminate duplicate records.

## 3. Decoupled Identity and Authorization Model

1. **User Identity:** Authenticated via Firebase Authentication. A user record in PostgreSQL is keyed by their unique `firebaseUid`.
2. **GitHub Authorization:** Managed separately through a configured GitHub App installation or OAuth grant. Signing in to CodeForensics does **not** grant access to private repositories until explicit GitHub authorization is established.
3. **Resource Guarding:** The API verifies the Firebase ID token and enforces repository ownership before granting access to sync states, issues, code diffs, or investigations.
