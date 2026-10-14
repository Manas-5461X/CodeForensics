# ADR 0001: Technology Stack and Architectural Boundaries

## Context and Problem Statement

CodeForensics is an evidence-backed repository intelligence platform designed to help developers investigate code history, issue/PR relationships, and resolution status without relying on unverified assumptions or ungrounded generative AI hallucinations.

The system requires:
1. A typed, high-performance web interface adhering to a calm, technical "forensic workbench" aesthetic.
2. Distinct user identity decoupled from third-party GitHub authorizations.
3. A reliable, validated HTTP API that enforces resource-level authorization.
4. Durable relational storage with compound uniqueness constraints for repository records and evidence graphs.
5. An asynchronous job processing engine with retries, exponential backoff, and progress reporting for long-running GitHub synchronizations.
6. Rigorous security boundaries preventing untrusted repository content from triggering arbitrary execution or leaking server credentials.

## Decision Drivers

- **Evidence First:** Clear separation of observed GitHub provider facts from inferred CodeForensics assessments.
- **Tenant & Ownership Security:** Client tokens must be cryptographically verified on the backend; authorization enforced on every private resource.
- **Developer Ergonomics:** TypeScript monorepo with native npm workspaces, shared types/schemas, and fast local feedback loops.
- **Aesthetic Quality:** Adherence to `skills.md` — semantic design tokens, IBM Plex typography, no fake metrics or generic SaaS gradient blobs.

## Considered Options

- **Frontend:** Next.js vs. React + Vite SPA.
- **Backend:** Express vs. NestJS vs. Fastify.
- **Database / ORM:** TypeORM vs. Drizzle vs. Prisma.
- **Queue / Worker:** RabbitMQ vs. Kafka vs. Redis + BullMQ.
- **Identity:** Direct OAuth vs. Firebase Authentication with backend token verification.

## Decision Outcome

Chosen Option:
1. **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui design tokens, React Router, and TanStack Query.
   - *Rationale:* Vite provides instant HMR and lightweight bundle size. React Router enables clear client-side navigation. TanStack Query manages caching and invalidation cleanly.
2. **Identity & Authentication:** Firebase Authentication (client Web SDK) paired with Firebase Admin SDK token verification on the Fastify backend.
   - *Rationale:* Firebase manages identity, passwordless/OAuth flows, and session tokens. Crucially, **CodeForensics identity is decoupled from GitHub repository permissions**.
3. **Backend API:** Node.js, TypeScript, and Fastify.
   - *Rationale:* Fastify offers superior throughput, built-in schema serialization, plugin architecture, request ID tracking, and standard error handling.
4. **Validation:** Zod at all system boundaries (runtime environment variables, HTTP parameters, request bodies).
5. **Persistence:** PostgreSQL with Prisma ORM.
   - *Rationale:* Relational integrity, compound unique constraints (e.g., `[repositoryId, number]`), typed client generation, and versioned migrations. Relational tables represent nodes and edges effectively without needing a dedicated graph database initially.
6. **Background Worker:** Redis and BullMQ.
   - *Rationale:* Dedicated asynchronous queue for GitHub pagination, rate-limit backoff, and code-history analysis outside HTTP request cycles.
7. **Monorepo Layout:** Native npm workspaces:
   - `apps/web`: Frontend application
   - `apps/api`: Fastify HTTP API
   - `apps/worker`: BullMQ background job processor
   - `packages/shared`: Shared TypeScript types, enums, and Zod validation schemas
   - `prisma`: Centralized database schema and migrations

## Consequences

- **Positive:** Clear separation of concerns, strong type safety, shared validation rules preventing client-server drift, and isolated worker environments.
- **Negative:** Requires running PostgreSQL and Redis for full integration in local development, though unit and smoke test suites run in isolation with mock adapters.
