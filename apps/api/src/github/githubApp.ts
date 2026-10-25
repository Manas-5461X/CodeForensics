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
    let octokit: Octokit;

    if (installationId) {
      octokit = await this.getInstallationOctokit(installationId);
    } else {
      if (!this.app) {
        throw new Error('GitHub App is not configured.');
      }
      // Look up installation ID for the specified repository
      const { data: installation } = await this.app.octokit.rest.apps.getRepoInstallation({
        owner,
        repo,
      });
      installationId = installation.id;
      octokit = await this.getInstallationOctokit(installationId);
    }

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

  public verifyWebhookSignature(payload: string, signature: string): boolean {
    return verifyWebhookSignature(payload, signature, this.webhookSecret);
  }
}
