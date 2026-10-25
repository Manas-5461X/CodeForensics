import { App, Octokit } from 'octokit';
import fs from 'node:fs';
import crypto from 'node:crypto';

export interface GitHubInstallationSummary {
  id: string;
  installationId: number;
  accountLogin: string;
  accountType: string;
  targetType: string;
  permissions: Record<string, string>;
}

export interface GitHubRepoSummary {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  htmlUrl: string;
  description: string | null;
  defaultBranch: string;
  installationId?: number;
}

export interface IGitHubService {
  isConfigured(): boolean;
  listInstallations(): Promise<GitHubInstallationSummary[]>;
  listRepositoriesForInstallation(installationId: number): Promise<GitHubRepoSummary[]>;
  getRepository(owner: string, repo: string, installationId?: number): Promise<GitHubRepoSummary>;
  getInstallationOctokit(installationId: number): Promise<Octokit>;
  verifyWebhookSignature(payload: string, signature: string): boolean;
}

export function normalizePrivateKey(rawKey: string): string {
  const trimmed = rawKey.trim();
  // Check if it's base64 encoded
  if (!trimmed.includes('-----BEGIN') && !trimmed.includes('\n') && trimmed.length > 100) {
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf-8');
      if (decoded.includes('-----BEGIN')) {
        return decoded;
      }
    } catch {
      // Fall through to literal replacement
    }
  }

  // Replace literal '\n' sequences with real newlines if present
  if (trimmed.includes('\\n')) {
    return trimmed.replace(/\\n/g, '\n');
  }

  return trimmed;
}

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

export class GitHubAppService implements IGitHubService {
  private app: App | null = null;
  private webhookSecret?: string;

  constructor(options?: {
    appId?: string;
    privateKey?: string;
    privateKeyPath?: string;
    webhookSecret?: string;
  }) {
    const appId = options?.appId || process.env.GITHUB_APP_ID;
    const webhookSecret = options?.webhookSecret || process.env.GITHUB_WEBHOOK_SECRET;
    this.webhookSecret = webhookSecret;

    let privateKey = options?.privateKey || process.env.GITHUB_PRIVATE_KEY;
    const privateKeyPath = options?.privateKeyPath || process.env.GITHUB_PRIVATE_KEY_PATH;

    if (!privateKey && privateKeyPath && fs.existsSync(privateKeyPath)) {
      try {
        privateKey = fs.readFileSync(privateKeyPath, 'utf8');
      } catch (err) {
        console.error(`[GitHubAppService] Failed to read private key from ${privateKeyPath}:`, err);
      }
    }

    if (privateKey) {
      privateKey = normalizePrivateKey(privateKey);
    }

    if (appId && privateKey) {
      try {
        this.app = new App({
          appId,
          privateKey,
          webhooks: webhookSecret ? { secret: webhookSecret } : undefined,
        });
      } catch (err) {
        console.error('[GitHubAppService] Failed to initialize GitHub App:', err);
      }
    }
  }

  public isConfigured(): boolean {
    return this.app !== null;
  }

  public async listInstallations(): Promise<GitHubInstallationSummary[]> {
    if (!this.app) {
      throw new Error('GitHub App is not configured. Set GITHUB_APP_ID and GITHUB_PRIVATE_KEY.');
    }

    const { data: installations } = await this.app.octokit.request('GET /app/installations', {
      per_page: 100,
    });

    return installations.map((inst) => {
      const account = inst.account as { login?: string; type?: string } | undefined;
      return {
        id: String(inst.id),
        installationId: inst.id,
        accountLogin: account?.login || `account-${inst.id}`,
        accountType: account?.type || 'User',
        targetType: inst.target_type || 'User',
        permissions: (inst.permissions as Record<string, string>) || {},
      };
    });
  }

  public async getInstallationOctokit(installationId: number): Promise<Octokit> {
    if (!this.app) {
      throw new Error('GitHub App is not configured. Set GITHUB_APP_ID and GITHUB_PRIVATE_KEY.');
    }
    return await this.app.getInstallationOctokit(installationId);
  }

  public async listRepositoriesForInstallation(installationId: number): Promise<GitHubRepoSummary[]> {
    if (!this.app) {
      return [];
    }
    const octokit = await this.getInstallationOctokit(installationId);
    const { data } = await octokit.rest.apps.listReposAccessibleToInstallation({
      per_page: 100,
    });

    return data.repositories.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      private: repo.private,
      htmlUrl: repo.html_url,
      description: repo.description,
      defaultBranch: repo.default_branch,
      installationId,
    }));
  }

  public async getRepository(
    owner: string,
    repo: string,
    installationId?: number
  ): Promise<GitHubRepoSummary> {
    // 1. If explicit installationId provided, use installation Octokit
    if (installationId) {
      const octokit = await this.getInstallationOctokit(installationId);
      const { data } = await octokit.rest.repos.get({ owner, repo });
      return {
        id: data.id,
        name: data.name,
        fullName: data.full_name,
        owner: data.owner.login,
        private: data.private,
        htmlUrl: data.html_url,
        description: data.description,
        defaultBranch: data.default_branch,
        installationId,
      };
    }

    // 2. High-speed Direct Public REST API Lookup (Resolves in <1 second with zero Octokit retry loops)
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'CodeForensics/0.1.0',
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const resp = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
        { headers, signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (resp.status === 200) {
        const data = (await resp.json()) as {
          id: number;
          name: string;
          full_name: string;
          owner: { login: string };
          private: boolean;
          html_url: string;
          description: string | null;
          default_branch: string;
        };

        return {
          id: data.id,
          name: data.name,
          fullName: data.full_name,
          owner: data.owner?.login || owner,
          private: Boolean(data.private),
          htmlUrl: data.html_url,
          description: data.description,
          defaultBranch: data.default_branch || 'main',
          installationId: undefined,
        };
      }

      if (resp.status === 404) {
        // If 404, check if it's a private repository under an installed GitHub App
        if (this.app) {
          try {
            const { data: installation } = await this.app.octokit.rest.apps.getRepoInstallation({
              owner,
              repo,
            });
            if (installation?.id) {
              const octokit = await this.getInstallationOctokit(installation.id);
              const { data } = await octokit.rest.repos.get({ owner, repo });
              return {
                id: data.id,
                name: data.name,
                fullName: data.full_name,
                owner: data.owner.login,
                private: data.private,
                htmlUrl: data.html_url,
                description: data.description,
                defaultBranch: data.default_branch,
                installationId: installation.id,
              };
            }
          } catch {
            // Not in GitHub App
          }
        }

        const notFoundErr = new Error(
          `Repository '${owner}/${repo}' was not found on GitHub. Please check that the repository is public and spelled correctly.`
        );
        (notFoundErr as unknown as { status: number }).status = 404;
        throw notFoundErr;
      }

      if (resp.status === 403 || resp.status === 401 || resp.status === 429) {
        // High-speed fallback: Directly verify public repository via web HTML + git info refs
        const webRepo = await this.verifyPublicRepoWeb(owner, repo);
        if (webRepo) {
          return webRepo;
        }

        // If web lookup returns 404/null, check if it's a private repository under installed GitHub App
        if (this.app) {
          try {
            const { data: installation } = await this.app.octokit.rest.apps.getRepoInstallation({
              owner,
              repo,
            });
            if (installation?.id) {
              const octokit = await this.getInstallationOctokit(installation.id);
              const { data } = await octokit.rest.repos.get({ owner, repo });
              return {
                id: data.id,
                name: data.name,
                fullName: data.full_name,
                owner: data.owner.login,
                private: data.private,
                htmlUrl: data.html_url,
                description: data.description,
                defaultBranch: data.default_branch,
                installationId: installation.id,
              };
            }
          } catch {
            // Not in GitHub App
          }
        }

        const notFoundErr = new Error(
          `Repository '${owner}/${repo}' was not found on GitHub. Please check that the repository is public and spelled correctly.`
        );
        (notFoundErr as unknown as { status: number }).status = 404;
        throw notFoundErr;
      }
    } catch (err: unknown) {
      if ((err as { status?: number })?.status) {
        throw err;
      }
      // If direct fetch timed out or network error, attempt direct web verification
      try {
        const webRepo = await this.verifyPublicRepoWeb(owner, repo);
        if (webRepo) {
          return webRepo;
        }
      } catch {
        // Ignore
      }
      // If direct fetch timed out or failed, attempt GitHub App installation fallback
      if (this.app) {
        try {
          const { data: installation } = await this.app.octokit.rest.apps.getRepoInstallation({
            owner,
            repo,
          });
          if (installation?.id) {
            const octokit = await this.getInstallationOctokit(installation.id);
            const { data } = await octokit.rest.repos.get({ owner, repo });
            return {
              id: data.id,
              name: data.name,
              fullName: data.full_name,
              owner: data.owner.login,
              private: data.private,
              htmlUrl: data.html_url,
              description: data.description,
              defaultBranch: data.default_branch,
              installationId: installation.id,
            };
          }
        } catch {
          // Ignore
        }
      }
      throw err;
    }

    throw new Error(`Failed to verify repository ${owner}/${repo}`);
  }

  /**
   * Directly verifies a public GitHub repository via web HTML and git info refs.
   * Completely bypasses GitHub REST API IP rate limits (60 requests/hr).
   */
  public async verifyPublicRepoWeb(
    owner: string,
    repo: string
  ): Promise<GitHubRepoSummary | null> {
    const cleanOwner = owner.trim();
    const cleanRepo = repo.trim();
    const repoUrl = `https://github.com/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const [pageResp, gitResp] = await Promise.all([
        fetch(repoUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: controller.signal,
          redirect: 'follow',
        }),
        fetch(`${repoUrl}/info/refs?service=git-upload-pack`, {
          headers: {
            'User-Agent': 'git/2.40.0',
          },
          signal: controller.signal,
        }).catch(() => null),
      ]);

      if (pageResp.status !== 200) {
        return null;
      }

      const html = await pageResp.text();

      // Extract repository ID from GitHub's octolytics meta tags or data attributes
      const idMatch =
        html.match(/octolytics-dimension-repository_id"\s+content="(\d+)"/i) ||
        html.match(/data-scope-id="(\d+)"/i) ||
        html.match(/"repository":\{"id":(\d+)/i);

      let repoId: number;
      if (idMatch && idMatch[1]) {
        repoId = parseInt(idMatch[1], 10);
      } else {
        let hash = 0;
        const str = `${cleanOwner.toLowerCase()}/${cleanRepo.toLowerCase()}`;
        for (let i = 0; i < str.length; i++) {
          hash = (hash << 5) - hash + str.charCodeAt(i);
          hash |= 0;
        }
        repoId = Math.abs(hash) + 1000000;
      }

      // Extract canonical owner and name if present
      const nwoMatch = html.match(/octolytics-dimension-repository_nwo"\s+content="([^"]+)"/i);
      let resolvedOwner = cleanOwner;
      let resolvedRepo = cleanRepo;
      if (nwoMatch && nwoMatch[1] && nwoMatch[1].includes('/')) {
        const parts = nwoMatch[1].split('/');
        resolvedOwner = parts[0];
        resolvedRepo = parts[1];
      }

      // Extract description
      const descMatch =
        html.match(/<meta\s+name="description"\s+content="([^"]+)"/i) ||
        html.match(/<p\s+class="f4\s+my-3"[^>]*>([^<]+)<\/p>/i);
      let description: string | null = null;
      if (descMatch && descMatch[1]) {
        description = descMatch[1].replace(/^GitHub\s*-\s*[^:]+:\s*/i, '').trim();
      }

      // Extract default branch from git info refs
      let defaultBranch = 'main';
      if (gitResp && gitResp.status === 200) {
        const gitInfo = await gitResp.text();
        const branchMatch = gitInfo.match(/symref=HEAD:refs\/heads\/([^\s]+)/);
        if (branchMatch && branchMatch[1]) {
          defaultBranch = branchMatch[1];
        }
      }

      return {
        id: repoId,
        name: resolvedRepo,
        fullName: `${resolvedOwner}/${resolvedRepo}`,
        owner: resolvedOwner,
        private: false,
        htmlUrl: `https://github.com/${resolvedOwner}/${resolvedRepo}`,
        description,
        defaultBranch,
        installationId: undefined,
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  public verifyWebhookSignature(payload: string, signature: string): boolean {
    return verifyWebhookSignature(payload, signature, this.webhookSecret);
  }
}
