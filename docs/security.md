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

## 3. Worker Isolation

1. **Controlled Filesystem:** Git clone and checkout operations run in isolated directories under `WORKER_WORKSPACE_DIR` (e.g., `./tmp/workspaces/`).
2. **Path Sanitization:** All relative file paths are strictly validated against directory traversal (`../`) attacks.
3. **Resource Quotas:** Jobs are limited by maximum runtime timeouts, memory boundaries, and retry limits (maximum 3 attempts with exponential backoff).
4. **Cleanup:** Temporary checkouts are automatically pruned following analysis completion or failure.
