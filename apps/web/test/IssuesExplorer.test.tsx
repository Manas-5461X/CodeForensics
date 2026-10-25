import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IssuesPage } from '../src/pages/IssuesPage.js';
import { RepositoryProvider } from '../src/context/RepositoryContext.js';
import { AuthProvider } from '../src/context/AuthContext.js';
import type { User } from 'firebase/auth';
import type { RepositoryInfo, RepositorySyncStateInfo, PaginatedResult, WorkItemSummary, WorkItemDetail } from '@codeforensics/shared';

const mockUser = {
  uid: 'tester-phase5-user',
  email: 'tester@codeforensics.org',
  displayName: 'Phase 5 Investigator',
  getIdToken: async () => 'mock-auth-token',
} as unknown as User;

const mockRepo: RepositoryInfo = {
  id: 'repo-100',
  githubRepoId: '998877',
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

const mockSyncCompleted: RepositorySyncStateInfo = {
  id: 'sync-100',
  repositoryId: 'repo-100',
  status: 'COMPLETED',
  startedAt: '2024-01-01T00:00:00.000Z',
  completedAt: '2024-01-01T00:05:00.000Z',
  lastSuccessfulSyncAt: '2024-01-01T00:05:00.000Z',
  recordsImported: 2,
  issuesCount: 1,
  prsCount: 1,
  progress: 100,
  checkpoints: null,
  errorSummary: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:05:00.000Z',
};

const mockItems: WorkItemSummary[] = [
  {
    id: 'issue-101',
    type: 'issue',
    number: 101,
    title: 'Memory leak in Suspense list during unmount',
    body: 'Reproduction indicates subscription retention after unmounting.',
    state: 'closed',
    author: 'acdlite',
    labels: ['Component: Suspense', 'Type: Bug'],
    htmlUrl: 'https://github.com/facebook/react/issues/101',
    closedAt: '2024-01-15T12:00:00.000Z',
    createdAt: '2024-01-10T10:00:00.000Z',
    updatedAt: '2024-01-15T12:00:00.000Z',
  },
  {
    id: 'pr-201',
    type: 'pull_request',
    number: 201,
    title: 'Fix: clean up Suspense subscriptions on unmount',
    body: 'Properly calls dispose on unmount to prevent leaks.',
    state: 'merged',
    isDraft: false,
    merged: true,
    mergedAt: '2024-01-14T18:00:00.000Z',
    author: 'sebmarkbage',
    labels: ['Component: Suspense'],
    htmlUrl: 'https://github.com/facebook/react/pull/201',
    closedAt: '2024-01-14T18:00:00.000Z',
    createdAt: '2024-01-12T08:00:00.000Z',
    updatedAt: '2024-01-14T18:00:00.000Z',
  },
];

const mockPaginatedResult: PaginatedResult<WorkItemSummary> = {
  items: mockItems,
  total: 2,
  page: 1,
  limit: 20,
  totalPages: 1,
};

const mockDetailItem: WorkItemDetail = {
  ...mockItems[0],
  timelineAvailable: false,
  diffAvailable: false,
  timelineNotes: 'Discussion timeline was not collected in the initial sync tier.',
  timelineEvents: [],
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialUser={mockUser}>
        <RepositoryProvider>
          {ui}
        </RepositoryProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('Phase 5: Issue & PR Explorer Frontend Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders "No Repository Selected" empty state when no repo is active', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('/api/v1/repositories')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: [] }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: null }),
      } as Response;
    });

    renderWithProviders(<IssuesPage />);

    await waitFor(() => {
      expect(screen.getByText('No Repository Selected')).toBeDefined();
    });
  });

  it('renders "Repository Not Synchronized" when active repo has not been synced', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('/sync')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: { ...mockSyncCompleted, status: 'IDLE' },
          }),
        } as Response;
      }
      if (urlStr.includes('/api/v1/repositories')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: [mockRepo] }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: null }),
      } as Response;
    });

    renderWithProviders(<IssuesPage />);

    await waitFor(() => {
      expect(screen.getByText('Repository Not Synchronized')).toBeDefined();
      expect(screen.getByText('Sync Repository Now')).toBeDefined();
    });
  });

  it('renders work items table with type icons, numbers, titles, and state badges', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('/sync')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: mockSyncCompleted }),
        } as Response;
      }
      if (urlStr.includes('/items')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: mockPaginatedResult,
            meta: { coverage: { isComplete: true } },
          }),
        } as Response;
      }
      if (urlStr.includes('/api/v1/repositories')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: [mockRepo] }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: null }),
      } as Response;
    });

    renderWithProviders(<IssuesPage />);

    await waitFor(() => {
      expect(screen.getByText('#101')).toBeDefined();
      expect(screen.getByText('Memory leak in Suspense list during unmount')).toBeDefined();
      expect(screen.getByText('#201')).toBeDefined();
      expect(screen.getByText('Fix: clean up Suspense subscriptions on unmount')).toBeDefined();
      expect(screen.getByText('Merged')).toBeDefined();
      expect(screen.getByText('Showing 1 to 2 of 2 items')).toBeDefined();
    });
  });

  it('opens WorkItemDetailDrawer when clicking a table row', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('/sync')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: mockSyncCompleted }),
        } as Response;
      }
      if (urlStr.includes('/items/101')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: mockDetailItem,
            meta: { coverage: { isComplete: true } },
          }),
        } as Response;
      }
      if (urlStr.includes('/items')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: mockPaginatedResult,
            meta: { coverage: { isComplete: true } },
          }),
        } as Response;
      }
      if (urlStr.includes('/api/v1/repositories')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: [mockRepo] }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: null }),
      } as Response;
    });

    renderWithProviders(<IssuesPage />);

    await waitFor(() => {
      expect(screen.getByText('Memory leak in Suspense list during unmount')).toBeDefined();
    });

    // Click on row
    fireEvent.click(screen.getByText('Memory leak in Suspense list during unmount'));

    // Drawer opens
    await waitFor(() => {
      expect(screen.getByText('Forensic Provenance:')).toBeDefined();
      expect(screen.getByText('Description Body')).toBeDefined();
      expect(screen.getByText('Discussion Timeline')).toBeDefined();
    });

    // Close drawer
    fireEvent.click(screen.getByLabelText('Close drawer'));
    await waitFor(() => {
      expect(screen.queryByText('Description Body')).toBeNull();
    });
  });

  it('renders honest error state without mock substitution when query fails', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('/sync')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: mockSyncCompleted }),
        } as Response;
      }
      if (urlStr.includes('/items')) {
        return {
          ok: false,
          status: 500,
          json: async () => ({
            success: false,
            error: { code: 'DATABASE_ERROR', message: 'Failed to query database' },
          }),
        } as Response;
      }
      if (urlStr.includes('/api/v1/repositories')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: [mockRepo] }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: null }),
      } as Response;
    });

    renderWithProviders(<IssuesPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load work items')).toBeDefined();
      expect(screen.getByText('Retry Query')).toBeDefined();
    });
  });
});
