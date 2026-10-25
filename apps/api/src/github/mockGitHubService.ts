import type { Octokit } from 'octokit';
import type { IGitHubService, GitHubInstallationSummary, GitHubRepoSummary } from './githubApp.js';
import { verifyWebhookSignature } from './githubApp.js';

export interface MockIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  user: { login: string } | null;
  labels: Array<{ name: string }>;
  html_url: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  pull_request?: { url: string };
}

export interface MockPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  draft: boolean;
  merged: boolean;
  merged_at: string | null;
  user: { login: string } | null;
  base: { ref: string };
  head: { ref: string };
  html_url: string;
  created_at: string;
  updated_at: string;
}

export interface MockCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string } | null;
  };
  author: { login: string } | null;
  html_url: string;
}

export class MockGitHubService implements IGitHubService {
  public installations: GitHubInstallationSummary[] = [
    {
      id: 'inst-1001',
      installationId: 1001,
      accountLogin: 'octocat-org',
      accountType: 'Organization',
      targetType: 'Organization',
      permissions: {
        issues: 'read',
        pull_requests: 'read',
        contents: 'read',
        metadata: 'read',
      },
    },
  ];

  public repositories: GitHubRepoSummary[] = [
    {
      id: 9001,
      name: 'test-repo',
      fullName: 'octocat-org/test-repo',
      owner: 'octocat-org',
      private: false,
      htmlUrl: 'https://github.com/octocat-org/test-repo',
      description: 'Test repository for forensic sync',
      defaultBranch: 'main',
      installationId: 1001,
    },
    {
      id: 9002,
      name: 'private-service',
      fullName: 'octocat-org/private-service',
      owner: 'octocat-org',
      private: true,
      htmlUrl: 'https://github.com/octocat-org/private-service',
      description: 'Private backend service',
      defaultBranch: 'main',
      installationId: 1001,
    },
  ];

  public issuesMap: Map<string, MockIssue[]> = new Map();
  public prsMap: Map<string, MockPullRequest[]> = new Map();
  public commitsMap: Map<string, MockCommit[]> = new Map();

  public rateLimitRemaining = 5000;
  public simulateRateLimitError = false;
  public simulateTransientError = false;
  public retryAfterSeconds = 1;
  public webhookSecret = 'test-webhook-secret';

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    const defaultRepoKey = 'octocat-org/test-repo';
    this.issuesMap.set(defaultRepoKey, [
      {
        id: 101,
        number: 1,
        title: 'Buffer overflow in network packet parser',
        body: 'Investigating potential memory leak when parsing malformed TCP packets.',
        state: 'closed',
        user: { login: 'developer-alice' },
        labels: [{ name: 'bug' }, { name: 'security' }],
        html_url: 'https://github.com/octocat-org/test-repo/issues/1',
        closed_at: '2026-10-10T14:00:00Z',
        created_at: '2026-10-01T10:00:00Z',
        updated_at: '2026-10-10T14:00:00Z',
      },
      {
        id: 102,
        number: 2,
        title: 'Support HTTP/3 protocol multiplexing',
        body: 'Feature request for QUIC and HTTP/3 support.',
        state: 'open',
        user: { login: 'developer-bob' },
        labels: [{ name: 'enhancement' }],
        html_url: 'https://github.com/octocat-org/test-repo/issues/2',
        closed_at: null,
        created_at: '2026-10-05T12:00:00Z',
        updated_at: '2026-10-05T12:00:00Z',
      },
      // Note: GitHub issues endpoint returns PRs too, but with pull_request object present
      {
        id: 103,
        number: 3,
        title: 'PR #3 as returned in issues API',
        body: 'This should be filtered out by issues sync because pull_request is present',
        state: 'closed',
        user: { login: 'developer-alice' },
        labels: [],
        html_url: 'https://github.com/octocat-org/test-repo/pull/3',
        closed_at: '2026-10-10T14:00:00Z',
        created_at: '2026-10-02T10:00:00Z',
        updated_at: '2026-10-10T14:00:00Z',
        pull_request: { url: 'https://api.github.com/repos/octocat-org/test-repo/pulls/3' },
      },
    ]);

    this.prsMap.set(defaultRepoKey, [
      {
        id: 201,
        number: 3,
        title: 'Fix packet buffer boundary check',
        body: 'Fixes #1 by adding bounds check before memcpy.',
        state: 'closed',
        draft: false,
        merged: true,
        merged_at: '2026-10-10T14:00:00Z',
        user: { login: 'developer-alice' },
        base: { ref: 'main' },
        head: { ref: 'fix/packet-buffer' },
        html_url: 'https://github.com/octocat-org/test-repo/pull/3',
        created_at: '2026-10-02T10:00:00Z',
        updated_at: '2026-10-10T14:00:00Z',
      },
    ]);

    this.commitsMap.set(defaultRepoKey, [
      {
        sha: 'abc1234def5678',
        commit: {
          message: 'Fix packet buffer boundary check (fixes #1)',
          author: { name: 'Alice', date: '2026-10-10T13:55:00Z' },
        },
        author: { login: 'developer-alice' },
        html_url: 'https://github.com/octocat-org/test-repo/commit/abc1234def5678',
      },
    ]);
  }

  public isConfigured(): boolean {
    return true;
  }

  public async listInstallations(): Promise<GitHubInstallationSummary[]> {
    return this.installations;
  }

  public async listRepositoriesForInstallation(installationId: number): Promise<GitHubRepoSummary[]> {
    const inst = this.installations.find((i) => i.installationId === installationId);
    if (!inst) {
      throw new Error(`Installation ${installationId} not found.`);
    }
    return this.repositories.filter((r) => r.installationId === installationId);
  }

  public async getRepository(
    owner: string,
    repo: string,
    installationId?: number
  ): Promise<GitHubRepoSummary> {
    const found = this.repositories.find(
      (r) =>
        r.owner.toLowerCase() === owner.toLowerCase() &&
        r.name.toLowerCase() === repo.toLowerCase() &&
        (!installationId || r.installationId === installationId)
    );

    if (!found) {
      const err = new Error(`Repository ${owner}/${repo} not found on GitHub or accessible to installation.`);
      (err as unknown as { status: number }).status = 404;
      throw err;
    }

    return found;
  }

  public async getInstallationOctokit(installationId: number): Promise<Octokit> {
    // Return a mock Octokit-compatible object with paginated rest endpoints
    const self = this;
    const mockOctokit = {
      rest: {
        apps: {
          listReposAccessibleToInstallation: async () => ({
            data: {
              repositories: self.repositories
                .filter((r) => r.installationId === installationId)
                .map((r) => ({
                  id: r.id,
                  name: r.name,
                  full_name: r.fullName,
                  owner: { login: r.owner },
                  private: r.private,
                  html_url: r.htmlUrl,
                  description: r.description,
                  default_branch: r.defaultBranch,
                })),
            },
          }),
        },
        repos: {
          get: async ({ owner, repo }: { owner: string; repo: string }) => {
            const r = await self.getRepository(owner, repo, installationId);
            return {
              data: {
                id: r.id,
                name: r.name,
                full_name: r.fullName,
                owner: { login: r.owner },
                private: r.private,
                html_url: r.htmlUrl,
                description: r.description,
                default_branch: r.defaultBranch,
              },
            };
          },
          listCommits: async ({ owner, repo }: { owner: string; repo: string }) => {
            self.checkRateLimitAndTransientErrors();
            const key = `${owner}/${repo}`;
            const commits = self.commitsMap.get(key) || [];
            return { data: commits };
          },
        },
        issues: {
          listForRepo: async ({
            owner,
            repo,
            page = 1,
            per_page = 100,
          }: {
            owner: string;
            repo: string;
            page?: number;
            per_page?: number;
          }) => {
            self.checkRateLimitAndTransientErrors();
            const key = `${owner}/${repo}`;
            const all = self.issuesMap.get(key) || [];
            const start = (page - 1) * per_page;
            const slice = all.slice(start, start + per_page);
            return {
              data: slice,
              headers: {
                'x-ratelimit-remaining': String(self.rateLimitRemaining),
                'x-ratelimit-limit': '5000',
              },
            };
          },
        },
        pulls: {
          list: async ({
            owner,
            repo,
            page = 1,
            per_page = 100,
          }: {
            owner: string;
            repo: string;
            page?: number;
            per_page?: number;
          }) => {
            self.checkRateLimitAndTransientErrors();
            const key = `${owner}/${repo}`;
            const all = self.prsMap.get(key) || [];
            const start = (page - 1) * per_page;
            const slice = all.slice(start, start + per_page);
            return {
              data: slice,
              headers: {
                'x-ratelimit-remaining': String(self.rateLimitRemaining),
                'x-ratelimit-limit': '5000',
              },
            };
          },
        },
      },
      paginate: async (endpoint: (args: Record<string, unknown>) => Promise<{ data: unknown[] }>, args: Record<string, unknown>) => {
        let page = 1;
        const per_page = (args.per_page as number) || 100;
        const results: unknown[] = [];

        while (true) {
          const res = await endpoint({ ...args, page, per_page });
          if (!res.data || res.data.length === 0) break;
          results.push(...res.data);
          if (res.data.length < per_page) break;
          page++;
        }

        return results;
      },
    };

    return mockOctokit as unknown as Octokit;
  }

  private checkRateLimitAndTransientErrors() {
    if (this.simulateRateLimitError) {
      const err = new Error('API rate limit exceeded for installation.');
      (err as unknown as { status: number; response: { headers: Record<string, string> } }).status = 403;
      (err as unknown as { response: { headers: Record<string, string> } }).response = {
        headers: {
          'x-ratelimit-remaining': '0',
          'retry-after': String(this.retryAfterSeconds),
        },
      };
      throw err;
    }

    if (this.simulateTransientError) {
      // Simulate transient 502/503 network error
      const err = new Error('Bad Gateway: GitHub API temporarily unavailable.');
      (err as unknown as { status: number }).status = 502;
      throw err;
    }
  }

  public verifyWebhookSignature(payload: string, signature: string): boolean {
    return verifyWebhookSignature(payload, signature, this.webhookSecret);
  }
}
