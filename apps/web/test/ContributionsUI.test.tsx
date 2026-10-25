import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContributionsPage } from '../src/pages/ContributionsPage.js';
import type {
  ContributionAnalysisResult,
  RepositoryInfo,
  RepositorySyncStateInfo,
} from '@codeforensics/shared';

// Mock apiClient
const mockGet = vi.fn();
vi.mock('../src/utils/apiClient.js', () => ({
  useApiClient: () => ({
    get: mockGet,
    post: vi.fn(),
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

describe('Phase 7: Contribution Finder Frontend Experience', () => {
  const sampleRepo: RepositoryInfo = {
    id: 'repo-100',
    githubRepoId: 998877,
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

  const mockAnalysis: ContributionAnalysisResult = {
    targetItem: {
      number: 28719,
      type: 'issue',
      title: 'Profiler timeline drops commits under high CPU load',
      subsystem: 'devtools',
      labels: ['Component: Developer Tools'],
    },
    subsystem: 'devtools',
    totalContributorsAnalyzed: 3,
    recommendations: [
      {
        login: 'brian_devtools',
        avatarUrl: 'https://github.com/brian_devtools.png?size=64',
        rank: 1,
        normalizedScore: 85,
        experienceTier: 'PRIMARY_MAINTAINER',
        recencySignal: 'RECENT',
        lastActiveAt: '2024-05-20T12:00:00.000Z',
        signals: [
          {
            type: 'DIRECT_FIX',
            label: 'Direct Fix Pull Request',
            description: 'Authored pull request #28720 with verified closing directives targeting this issue.',
            weight: 35,
            count: 1,
            referenceNumbers: [28720],
          },
          {
            type: 'SUBSYSTEM_PR',
            label: 'Subsystem Pull Requests',
            description: 'Authored 4 merged pull requests in the devtools subsystem.',
            weight: 26,
            count: 4,
            referenceNumbers: [28720, 28600],
          },
          {
            type: 'RECENCY_BOOST',
            label: 'Recent Activity',
            description: 'Active within the last 14 days.',
            weight: 20,
            count: 1,
          },
        ],
        relevantWorkItems: [
          {
            number: 28720,
            type: 'pull_request',
            title: 'Fix dropped commits on high CPU load',
            state: 'merged',
            merged: true,
            closedAt: '2024-05-20T12:00:00.000Z',
            updatedAt: '2024-05-20T12:00:00.000Z',
            subsystem: 'devtools',
          },
        ],
        limitations: [
          'Reviewer activity (approvals and comments) was not ingested in metadata tier sync.',
        ],
      },
      {
        login: 'alice_specialist',
        avatarUrl: 'https://github.com/alice_specialist.png?size=64',
        rank: 2,
        normalizedScore: 46,
        experienceTier: 'ACTIVE_CONTRIBUTOR',
        recencySignal: 'RECENT',
        lastActiveAt: '2024-05-15T12:00:00.000Z',
        signals: [
          {
            type: 'SUBSYSTEM_PR',
            label: 'Subsystem Pull Requests',
            description: 'Authored 2 merged pull requests in the devtools subsystem.',
            weight: 20,
            count: 2,
            referenceNumbers: [28650],
          },
        ],
        relevantWorkItems: [],
        limitations: [],
      },
    ],
    maintenanceRisks: [
      {
        riskType: 'CONCENTRATED_OWNERSHIP',
        severity: 'HIGH',
        subsystem: 'devtools',
        title: 'Concentrated Subsystem Ownership in devtools',
        description: 'Contributor @brian_devtools authored 80% of merged pull requests in devtools (4 of 5 PRs).',
        dominantContributor: 'brian_devtools',
        concentrationRatio: 0.8,
        lastActivityAt: '2024-05-20T12:00:00.000Z',
        recommendationHint: 'Involve additional reviewers on upcoming changes to reduce single maintainer dependency.',
      },
      {
        riskType: 'STALE_MAINTENANCE',
        severity: 'MEDIUM',
        subsystem: 'react-native',
        title: 'Stale Subsystem Maintenance in react-native',
        description: 'No merged pull requests detected in the react-native subsystem for 195 days.',
        daysInactive: 195,
        recommendationHint: 'Verify that this subsystem is still actively supported.',
      },
    ],
    coverageNotes: [
      'Rankings are derived deterministically from persisted pull request and issue metadata.',
      'Reviewer approvals were not ingested in initial metadata tier sync.',
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepoState = {
      activeRepo: sampleRepo,
      syncState: sampleSyncState,
      triggerSync: vi.fn(),
      isSyncing: false,
    };

    mockGet.mockImplementation((url: string) => {
      if (url.includes('/contributors/recommendations')) {
        return Promise.resolve({ data: mockAnalysis });
      }
      if (url.includes('/items')) {
        return Promise.resolve({
          data: {
            items: [
              {
                id: '28719',
                number: 28719,
                title: 'Profiler timeline drops commits',
                type: 'issue',
                state: 'open',
                labels: ['Component: Developer Tools'],
                htmlUrl: 'https://github.com/facebook/react/issues/28719',
              },
            ],
            total: 1,
            page: 1,
            limit: 20,
            totalPages: 1,
          },
        });
      }
      return Promise.resolve({ data: null });
    });
  });

  it('renders "No Repository Selected" empty state when no repo is active', () => {
    mockRepoState.activeRepo = null;
    render(<ContributionsPage />);
    expect(screen.getByText('No Repository Selected')).toBeDefined();
  });

  it('renders "Repository Not Synchronized" empty state when syncState is IDLE', () => {
    mockRepoState.syncState = {
      ...sampleSyncState,
      status: 'IDLE',
    };
    render(<ContributionsPage />);
    expect(screen.getByText('Repository Not Synchronized')).toBeDefined();
    expect(screen.getByText('Start Synchronization')).toBeDefined();
  });

  it('renders ranked contributor cards with explainable scores, tiers, and recency', async () => {
    render(<ContributionsPage />);

    await waitFor(() => {
      expect(screen.getByText('@brian_devtools')).toBeDefined();
    });

    // Check rank badge
    expect(screen.getByText('#1')).toBeDefined();
    // Check score
    expect(screen.getByText('Score: 85')).toBeDefined();
    // Check experience tier
    expect(screen.getByText('PRIMARY MAINTAINER')).toBeDefined();
    // Check recency
    const recentBadges = screen.getAllByText('RECENT');
    expect(recentBadges.length).toBeGreaterThanOrEqual(1);

    // Check why recommended signals
    expect(screen.getByText('+35')).toBeDefined();
    expect(screen.getByText(/Authored pull request #28720/)).toBeDefined();
    expect(screen.getByText('+26')).toBeDefined();
  });

  it('renders subsystem maintenance and ownership risks banner', async () => {
    render(<ContributionsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Subsystem Maintenance & Ownership Risks/i)).toBeDefined();
    });

    expect(screen.getByText('Concentrated Subsystem Ownership in devtools')).toBeDefined();
    expect(screen.getByText(/HIGH RISK/i)).toBeDefined();
    expect(screen.getByText('Stale Subsystem Maintenance in react-native')).toBeDefined();
    expect(screen.getByText(/MEDIUM RISK/i)).toBeDefined();
  });

  it('allows expanding relevant authored work items for a contributor', async () => {
    render(<ContributionsPage />);

    await waitFor(() => {
      expect(screen.getByText('@brian_devtools')).toBeDefined();
    });

    const toggleBtns = screen.getAllByText(/View Relevant Items/i);
    fireEvent.click(toggleBtns[0]);

    expect(screen.getByText(/Recent Authored Work in this Subsystem/i)).toBeDefined();
    expect(screen.getByText('Fix dropped commits on high CPU load')).toBeDefined();
    expect(screen.getByText('MERGED')).toBeDefined();
  });

  it('displays data coverage limitations caveat without opaque guessing', async () => {
    render(<ContributionsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Data Coverage Note:/i)).toBeDefined();
    });

    expect(
      screen.getByText(/Reviewer activity \(approvals and comments\) was not ingested/i)
    ).toBeDefined();
  });

  it('renders target issue selection and allows clearing target', async () => {
    render(<ContributionsPage />);

    await waitFor(() => {
      const targetTags = screen.getAllByText('#28719');
      expect(targetTags.length).toBeGreaterThanOrEqual(1);
    });

    const resetBtn = screen.getByText('Reset Target');
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/api/v1/repositories/facebook/react/contributors/recommendations',
        {}
      );
    });
  });

  it('handles query error state gracefully with retry button', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/contributors/recommendations')) {
        return Promise.reject(new Error('Network error querying contributor rankings'));
      }
      return Promise.resolve({ data: { items: [], total: 0 } });
    });

    render(<ContributionsPage />);

    await waitFor(() => {
      expect(
        screen.getByText('Network error querying contributor rankings')
      ).toBeDefined();
    });

    expect(screen.getByText('Retry Query')).toBeDefined();
  });
});
