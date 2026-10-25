# CodeForensics — Security Architecture & Threat Model

## 1. Threat Model & Principles

In CodeForensics, **all repository content is untrusted input**. Issue titles, bodies, comments, commit messages, and source files originate outside our security boundary and may contain adversarial prompts, path traversal attacks, or embedded secrets.

### 1.1 Non-Negotiable Security Rules
1. **Server-Side Authorization:** Every private API operation and background job must independently verify identity and resource ownership. Never rely on frontend route guards alone.
2. **Secret Isolation:** Firebase Admin private keys, GitHub App private keys, and database credentials exist strictly on the backend. They must never be exposed to the browser or client bundle.
3. **No Arbitrary Code Execution:** The platform must never execute build scripts, run `npm install`, or invoke untrusted repository code by default during analysis.
4. **Prompt Injection Neutralization:** Repository text is treated as data, never as system instructions. LLM-assisted workflows must be sandboxed and cannot trigger administrative actions or bypass authorization checks.
5. **Safe Logging:** Sensitive headers (`Authorization`, `Cookie`) and environment credentials are automatically redacted from server logs.

## 2. Authentication vs. Authorization

- **Authentication:** Verifies *who the user is* via Firebase ID tokens passed in the `Authorization: Bearer <token>` header.
- **Authorization:** Verifies *what the user can access*. Each repository, sync run, and investigation is checked against the user's explicit permissions or organization membership.

## 3. Worker & AST Isolation

1. **Controlled Filesystem:** Git clone and checkout operations run in isolated directories under `WORKER_WORKSPACE_DIR` (e.g., `./tmp/workspaces/`).
2. **Path Sanitization:** All relative file paths are strictly validated by `sanitizeFilePath`. Directory traversal (`..`), absolute drive letters, and null bytes (`\0`) are rejected at the boundary.
3. **Static Source Analysis:** TypeScript Compiler API parses files in-memory using `ts.createSourceFile`. Code is never executed, eval'd, or compiled into runnable bytecode.
4. **Resource Quotas:** Source analysis is constrained to 1MB per file. Jobs are limited by maximum runtime timeouts, memory boundaries, and retry limits (maximum 3 attempts with exponential backoff).
5. **Cleanup:** Temporary checkouts are automatically pruned following analysis completion or failure.

## 4. HTTP Gateway Hardening & Security Headers

The Fastify API automatically injects security headers on every response:
- `X-Content-Type-Options: nosniff` (prevents MIME type sniffing)
- `X-Frame-Options: DENY` (prevents iframe clickjacking)
- `Referrer-Policy: strict-origin-when-cross-origin` (prevents path and token leakage in referrers)
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` (disables unnecessary browser device features)

## 5. Object-Level Authorization & Multi-Tenancy

Every mutation and query against user-owned resources (such as saved investigations) strictly verifies `userId === authenticatedUser.uid`. Spoofed user IDs or foreign record UUIDs return `403 Forbidden` or `404 Not Found`. Users cannot inspect or tamper with records owned by another tenant.

