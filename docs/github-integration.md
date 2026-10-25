# CodeForensics — GitHub App Integration Specification

This document details the GitHub App architecture, permission requirements, authentication token exchange, rate limit management, and webhook handling.

---

## 1. Why GitHub App Instead of OAuth or Personal Access Tokens (PAT)?

CodeForensics deliberately uses a **GitHub App** for the following architectural reasons:
1. **High Rate Limits**: GitHub Apps receive an hourly rate limit of **5,000 requests per hour** per installation (scaling up for large organizations), compared to only 60 req/hr for unauthenticated calls and 1,000 for OAuth apps.
2. **Organization-Level Access**: Administrators can install the app on an organization and select specific repositories without granting access to their entire GitHub account.
3. **Short-Lived Installation Access Tokens**: Instead of long-lived personal access tokens stored in databases, CodeForensics signs a JWT with its RSA private key and requests short-lived (1-hour) installation access tokens on-demand.
4. **Least-Privilege Principle**: The app requests strictly read-only permissions on metadata, contents, issues, and pull requests.

---

## 2. Required Permissions Matrix

When creating your GitHub App in GitHub Developer Settings, configure these exact permissions:

### Repository Permissions

| Resource | Access Level | Why It Is Required |
|---|---|---|
| **Issues** | `Read-only` | Ingests issue titles, descriptions, closing references, labels, and state transitions. |
| **Pull requests** | `Read-only` | Ingests PR descriptions, branch references (`baseRef`, `headRef`), and merge commits. |
| **Contents** | `Read-only` | Reads commit logs, file contents, and line ranges for Code Archaeology. |
| **Metadata** | `Read-only` | Mandatory default for reading repository name, owner, and visibility. |

*All other permissions (Administration, Secrets, Checks, Actions, Packages, etc.) must remain set to **No access**.*

---

## 3. Webhook Events & Signature Verification

### Subscribed Events:
- `installation` (created, deleted)
- `installation_repositories` (added, removed)
- `issues` (opened, closed, labeled)
- `pull_request` (opened, closed, merged)

### Cryptographic Verification:
GitHub signs all webhook payloads using HMAC-SHA256 with the shared `GITHUB_WEBHOOK_SECRET`:
```typescript
import crypto from 'node:crypto';

export function verifyWebhookSignature(payload: string, signature: string, secret?: string): boolean {
  if (!signature || !secret) return false;
  try {
    const hmac = crypto.createHmac('sha256', secret);
    const expected = 'sha256=' + hmac.update(payload).digest('hex');
    const expectedBuf = Buffer.from(expected);
    const actualBuf = Buffer.from(signature);
    if (expectedBuf.length !== actualBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}
```

Timing-safe string comparison (`crypto.timingSafeEqual`) prevents timing attacks.

---

## 4. Key Management & Token Generation

1. **Private Key Storage**: The RSA private key (`.pem` format) is stored in `./secrets/github-private-key.pem` and referenced via `GITHUB_PRIVATE_KEY_PATH`.
2. **JWT Generation**: The `octokit` SDK signs a JSON Web Token with a maximum expiration of 10 minutes.
3. **Installation Token Exchange**: The JWT is exchanged with GitHub's `/app/installations/:installation_id/access_tokens` endpoint for a 1-hour bearer token.
4. **Zero Client Leakage**: Installation tokens are held strictly in memory by `apps/api` and `apps/worker` and never exposed over the REST API to `apps/web`.
