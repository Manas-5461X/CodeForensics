import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArchaeologyPage } from '../src/pages/ArchaeologyPage.js';
import type { ArchaeologyTraceResult, RepositoryInfo, RepositorySyncStateInfo } from '@codeforensics/shared';
import { MemoryRouter } from 'react-router-dom';

// Mock apiClient
const mockGet = vi.fn();
vi.mock('../src/utils/apiClient.js', () => ({
  useApiClient: () => ({
    get: mockGet,
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
  }),
}));

// Mock repository context
let mockRepoState: {
  activeRepo: RepositoryInfo | null;
  syncState: RepositorySyncStateInfo | null;
  triggerSync: () => Promise<void>;
  isSyncing: boolean;
};

vi.mock('../src/context/RepositoryContext.js', () => ({
  useRepository: () => mockRepoState,
}));

describe('Phase 8: Code Archaeology Frontend Experience', () => {
  const sampleRepo: RepositoryInfo = {
    id: 'repo-100',
    githubRepoId: 102030,
    installationId: '1001',
    owner: 'facebook',
    name: 'react',
    fullName: 'facebook/react',
    defaultBranch: 'main',
    isPrivate: false,
    htmlUrl: 'https://github.com/facebook/react',
    description: 'The library for web and native user interfaces.',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    syncState: null,
  };

  const sampleSyncState: RepositorySyncStateInfo = {
    id: 'sync-100',
    repositoryId: 'repo-100',
    status: 'COMPLETED',
    startedAt: '2024-01-01T00:00:00.000Z',
    completedAt: '2024-01-01T00:05:00.000Z',
    lastSuccessfulSyncAt: '2024-01-01T00:05:00.000Z',
    recordsImported: 20,
    issuesCount: 5,
    prsCount: 10,
    progress: 100,
    checkpoints: null,
    errorSummary: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:05:00.000Z',
  };

  const sampleTraceResult: ArchaeologyTraceResult = {
    query: 'useDeferredValue',
    targetType: 'symbol',
    symbol: {
      name: 'useDeferredValue',
      kind: 'hook',
      filePath: 'packages/react/src/ReactHooks.js',
      startLine: 184,
      endLine: 210,
      startColumn: 1,
      endColumn: 2,
      exported: true,
      signature: 'export function useDeferredValue<T>(value: T, initialValue?: T): T',
    },
    filePath: 'packages/react/src/ReactHooks.js',
    gitHubFileUrl: 'https://github.com/facebook/react/blob/main/packages/react/src/ReactHooks.js#L184-L210',
    revisions: [
      {
        sha: 'b84f291abcd',
        shortSha: 'b84f291',
        message: 'Fix memory leak in useDeferredValue concurrent lane scheduler',
        author: 'acdlite',
        timestamp: '2024-05-15T10:00:00Z',
        url: 'https://github.com/facebook/react/commit/b84f291abcd',
        prNumber: 29012,
        prTitle: 'Fix tearing in useDeferredValue by snapshotting transition lanes',
        changedFiles: ['packages/react/src/ReactHooks.js'],
        isHead: true,
      },
      {
        sha: '10e42d7abcd',
        shortSha: '10e42d7',
        message: 'Initial introduction of useDeferredValue hook primitive',
        author: 'acdlite',
        timestamp: '2022-03-29T10:00:00Z',
        url: 'https://github.com/facebook/react/commit/10e42d7abcd',
        prNumber: 21401,
        changedFiles: ['packages/react/src/ReactHooks.js'],
        isOrigin: true,
      },
    ],
    linkedWorkItems: [
      {
        number: 29012,
        type: 'pull_request',
        title: 'Fix tearing in useDeferredValue by snapshotting transition lanes',
        state: 'merged',
        htmlUrl: 'https://github.com/facebook/react/pull/29012',
      },
    ],
    coverageNotes: [
      'Direct Git commit log not locally mirrored; revision history synthesized from merged pull request records.',
    ],
    evidenceDisclaimer:
      'CodeForensics observes commit and revision lineage without inferring defect introduction or fixing without explicit verified evidence.',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepoState = {
      activeRepo: sampleRepo,
      syncState: sampleSyncState,
      triggerSync: vi.fn(),
      isSyncing: false,
    };
    mockGet.mockResolvedValue({ success: true, data: sampleTraceResult });
  });

  it('renders empty state when no active repository is selected', () => {
    mockRepoState.activeRepo = null;
    render(
      <MemoryRouter>
        <ArchaeologyPage />
      </MemoryRouter>
    );

    expect(screen.getByText('No Repository Selected')).toBeDefined();
    expect(screen.getByText(/Select an authorized repository/)).toBeDefined();
  });

  it('renders unsynced banner when repository has not been indexed', () => {
    mockRepoState.syncState = {
      ...sampleSyncState,
      status: 'IDLE',
    };

    render(
      <MemoryRouter>
        <ArchaeologyPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/This repository has not been indexed yet/)).toBeDefined();
    expect(screen.getByText('Sync Repository')).toBeDefined();
  });

  it('renders symbol search input and search controls', () => {
    render(
      <MemoryRouter>
        <ArchaeologyPage />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText(/e.g. useDeferredValue/)).toBeDefined();
    expect(screen.getByText('Trace History')).toBeDefined();
  });

  it('displays AST symbol details, line ranges, and GitHub source link after trace', async () => {
    render(
      <MemoryRouter>
        <ArchaeologyPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('HOOK')).toBeDefined();
    });

    expect(screen.getByText('EXPORTED')).toBeDefined();
    expect(screen.getByText('L184 to L210')).toBeDefined();
    expect(screen.getByText('View Source on GitHub')).toBeDefined();
  });

  it('displays historical revision timeline with commit SHAs, authors, and linked PR pills', async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: sampleTraceResult });

    render(
      <MemoryRouter>
        <ArchaeologyPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('commit b84f291')).toBeDefined();
      expect(screen.getByText('commit 10e42d7')).toBeDefined();
    });

    expect(screen.getByText('HEAD REVISION')).toBeDefined();
    expect(screen.getByText('ORIGIN COMMIT')).toBeDefined();
    expect(screen.getByText(/Fix memory leak in useDeferredValue/)).toBeDefined();
    expect(screen.getByText('Linked PR #29012')).toBeDefined();
  });

  it('renders honest evidentiary disclaimer and limitation notes', async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: sampleTraceResult });

    render(
      <MemoryRouter>
        <ArchaeologyPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Evidentiary Discipline & Interpretation Limits')).toBeDefined();
    });

    expect(
      screen.getByText(/without inferring defect introduction or fixing without explicit verified evidence/)
    ).toBeDefined();
    expect(
      screen.getByText(/Direct Git commit log not locally mirrored/)
    ).toBeDefined();
  });

  it('handles API error state with retry action', async () => {
    mockGet.mockRejectedValueOnce(new Error('Symbol not found in repository index'));

    render(
      <MemoryRouter>
        <ArchaeologyPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Symbol not found in repository index')).toBeDefined();
    });

    expect(screen.getByText('Retry')).toBeDefined();
  });
});
