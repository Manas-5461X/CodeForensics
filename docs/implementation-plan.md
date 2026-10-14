# CodeForensics — Phased Implementation Plan

## Overview & Execution Strategy

CodeForensics is delivered through deliberate, testable phases. Each phase represents a discrete vertical slice that preserves existing functionality and verifies behavior with automated tests before advancing.

---

### Phase 0: Repository Audit & Foundation Setup (Current Phase)
- **Goal:** Audit existing repository, establish monorepo structure, build foundational Fastify API, worker queue abstractions, React frontend shell, Prisma schema, and initial test suites.
- **Deliverables:**
  - Monorepo structure (`apps/web`, `apps/api`, `apps/worker`, `packages/shared`, `prisma`, `docs`).
  - Strict TypeScript configurations, `.env.example`, `.gitignore`.
  - Fastify API with health checks and consistent error envelopes.
  - BullMQ sync queue and retry configuration.
  - React workbench shell adhering to `skills.md` design tokens.
  - Core Prisma schema foundation.
- **Completion Gate:** Type checking, unit tests, and production builds pass cleanly across all workspaces.

---

### Phase 1: Workspace Foundation, App Shell & Design System
- **Goal:** Deepen frontend components with complete shadcn/ui primitives, keyboard navigation, accessible states, and responsive layouts.
- **Prerequisites:** Phase 0 foundation.
- **Completion Gate:** All core routes render without placeholders, UI passes responsive checks, and zero lint/type errors exist.

---

### Phase 2: Firebase Authentication & Real Authorization
- **Goal:** End-to-end user identity via Firebase Web SDK and backend token verification using Firebase Admin SDK.
- **Deliverables:**
  - Sign-in, sign-out, session restoration in `apps/web`.
  - Bearer token verification hook in `apps/api`.
  - Resource ownership checks denying cross-user access.
- **Completion Gate:** Unauthenticated requests rejected with 401; cross-user resource manipulation rejected with 403.

---

### Phase 3: Database Migrations & Durable Job Foundation
- **Goal:** Apply versioned Prisma migrations against local/managed PostgreSQL, verify idempotent sync state persistence, and test BullMQ job lifecycles.
- **Completion Gate:** Migrations run cleanly; durable job records track attempts and errors without data loss.

---

### Phase 4: GitHub Integration & Observable Synchronization
- **Goal:** Connect authorized GitHub repositories via GitHub App credentials and import metadata with pagination, rate-limit backoff, and coverage indicators.
- **Completion Gate:** Real repository records persist in PostgreSQL; partial imports report honest coverage limitations.

---

### Phase 5: Issue & PR Explorer
- **Goal:** Search, filter, and inspect persisted issues and pull requests with full discussion timelines and linked reviews.
- **Completion Gate:** Fast, paginated search powered by PostgreSQL with clear separation of GitHub state from inferred assessments.

---

### Phase 6: Relationship Intelligence & Resolution Assessment
- **Goal:** Deterministic analysis detecting explicit and inferred relationships (`ADDRESSES`, `SUPERSEDES`, `DUPLICATES`, `FIXED_BY`) with provenance and uncertainty.
- **Completion Gate:** Inferred relationships display "Why Linked?" modal with supporting diff and comment citations.

---

### Phase 7: Contribution Finder
- **Goal:** Actionable open-issue ranking with explainable scoring, historical attempts, and ongoing-work risk indicators.
- **Completion Gate:** Maintainer-friendly recommendation engine with transparent criteria.

---

### Phase 8: Code Archaeology & Saved Investigations
- **Goal:** AST and Git revision tracing for JavaScript/TypeScript symbols, connecting functions to historical commits and preserved investigations.
- **Completion Gate:** Users can create, save, and revisit structured investigation records.

---

### Phase 9: Quality, Security, Deployment & Demo
- **Goal:** End-to-end integration tests, secret redaction validation, deployment to Vercel/Node host, and verified public demo.
- **Completion Gate:** Clean production run in incognito browser with zero console errors.
