import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvestigationsPage } from '../src/pages/InvestigationsPage.js';
import type { InvestigationRecord, RepositoryInfo } from '@codeforensics/shared';
import { MemoryRouter } from 'react-router-dom';

// Mock apiClient
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDel = vi.fn();

vi.mock('../src/utils/apiClient.js', () => ({
  useApiClient: () => ({
    get: mockGet,
    post: mockPost,
    patch: mockPatch,
    del: mockDel,
  }),
}));

// Mock repository context
let mockRepoState: {
  activeRepo: RepositoryInfo | null;
};

vi.mock('../src/context/RepositoryContext.js', () => ({
  useRepository: () => mockRepoState,
}));

describe('Phase 8: Saved Investigations Frontend Experience', () => {
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

  const sampleInvestigations: InvestigationRecord[] = [
    {
      id: 'inv-1',
      userId: 'user-1',
      repositoryId: 'repo-100',
      repositoryName: 'facebook/react',
      question: 'Did PR #29012 fully resolve the concurrent tearing issue reported in #28941?',
      scope: 'React 19 RC • packages/react/src/ReactHooks.js • commit b84f291',
      status: 'inconclusive',
      hypotheses: [
        'H1: PR #29012 only addressed single-transition tearing, leaving nested transitions vulnerable.',
        'H2: The issue was superseded by lane scheduler rewrite in commit 8a129f.',
      ],
      observations: [
        'Observed commit b84f291 introduces snapshotting logic inside useDeferredValue.',
      ],
      findings: [
        'Snapshotting transition lanes prevents primary lane tearing but does not synchronize child fiber roots.',
      ],
      limitations: [
        'Without an end-to-end regression fixture in CI, resolution remains inconclusive.',
      ],
      evidenceItems: [
        {
          id: 'ev-1',
          type: 'pull_request',
          identifier: '#29012',
          title: 'Fix tearing in useDeferredValue by snapshotting transition lanes',
          url: 'https://github.com/facebook/react/pull/29012',
          category: 'FACT',
          confidence: 'HIGH',
          summary: 'Merged commit b84f291 with snapshot implementation.',
          addedAt: '2024-05-16T12:00:00Z',
        },
      ],
      createdAt: '2024-05-16T10:00:00Z',
      updatedAt: '2024-05-16T12:00:00Z',
    },
    {
      id: 'inv-2',
      userId: 'user-1',
      repositoryId: 'repo-100',
      repositoryName: 'facebook/react',
      question: 'What historical commit introduced the memory leak in Suspense list unmounting?',
      scope: 'React 18.2 to 18.3 • ReactSuspenseList.js',
      status: 'resolved',
      hypotheses: ['H1: Commit 41e9b2 removed cleanup callback during early abort.'],
      observations: [],
      findings: ['Verified fix in commit 7a8b9c.'],
      limitations: [],
      evidenceItems: [],
      createdAt: '2024-05-10T08:00:00Z',
      updatedAt: '2024-05-12T15:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepoState = {
      activeRepo: sampleRepo,
    };
    mockGet.mockResolvedValue({ success: true, data: sampleInvestigations });
  });

  it('renders empty state when no active repository is selected', () => {
    mockRepoState.activeRepo = null;
    render(
      <MemoryRouter>
        <InvestigationsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('No Repository Selected')).toBeDefined();
    expect(screen.getByText(/Select an authorized repository/)).toBeDefined();
  });

  it('renders empty state when no investigations exist for repository', async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: [] });

    render(
      <MemoryRouter>
        <InvestigationsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No Investigations Found')).toBeDefined();
    });

    expect(screen.getByText('Start Investigation')).toBeDefined();
  });

  it('renders list of saved investigations and selects the first record', async () => {
    render(
      <MemoryRouter>
        <InvestigationsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Did PR #29012 fully resolve/).length).toBeGreaterThan(0);
      expect(screen.getByText(/What historical commit introduced the memory leak/)).toBeDefined();
    });

    // Check detail panel renders selected investigation
    expect(screen.getByText('Forensic Investigation Record')).toBeDefined();
    expect(screen.getByText('Competing Hypotheses (2)')).toBeDefined();
    expect(screen.getByText(/PR #29012 only addressed single-transition tearing/)).toBeDefined();
    expect(screen.getByText('Evidentiary Citations (1)')).toBeDefined();
    expect(screen.getByText('#29012')).toBeDefined();
  });

  it('opens new investigation modal on button click and submits valid record', async () => {
    mockPost.mockResolvedValueOnce({
      success: true,
      data: {
        id: 'inv-3',
        userId: 'user-1',
        repositoryId: 'repo-100',
        question: 'Newly created forensic question?',
        scope: 'Test Scope',
        status: 'open',
        hypotheses: ['H1: Test Hypothesis'],
        observations: [],
        findings: [],
        limitations: [],
        evidenceItems: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    render(
      <MemoryRouter>
        <InvestigationsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Did PR #29012 fully resolve/).length).toBeGreaterThan(0);
    });

    // Click "New Investigation"
    const newBtn = screen.getByText('New Investigation');
    fireEvent.click(newBtn);

    expect(screen.getByText('New Forensic Investigation')).toBeDefined();

    // Fill form
    const questionInput = screen.getByPlaceholderText(/Did PR #29012 fully resolve/);
    const scopeInput = screen.getByPlaceholderText(/React 19 RC • packages/);
    fireEvent.change(questionInput, { target: { value: 'Newly created forensic question?' } });
    fireEvent.change(scopeInput, { target: { value: 'Test Scope' } });

    // Submit form
    const saveBtn = screen.getByText('Save Investigation');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/investigations',
        expect.objectContaining({
          repositoryId: 'repo-100',
          question: 'Newly created forensic question?',
          scope: 'Test Scope',
        })
      );
    });
  });

  it('allows adding a new hypothesis to active investigation', async () => {
    mockPatch.mockResolvedValueOnce({
      success: true,
      data: {
        ...sampleInvestigations[0],
        hypotheses: [
          ...sampleInvestigations[0].hypotheses,
          'H3: New hypothesis formulated during audit',
        ],
      },
    });

    render(
      <MemoryRouter>
        <InvestigationsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Competing Hypotheses (2)')).toBeDefined();
    });

    const hypInput = screen.getByPlaceholderText('Add candidate hypothesis...');
    fireEvent.change(hypInput, {
      target: { value: 'H3: New hypothesis formulated during audit' },
    });

    const addBtn = screen.getByRole('button', { name: 'Add Hypothesis' });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith(
        '/api/v1/investigations/inv-1',
        expect.objectContaining({
          hypotheses: expect.arrayContaining([
            'H3: New hypothesis formulated during audit',
          ]),
        })
      );
    });
  });

  it('opens confirmation modal and deletes investigation on confirm', async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: sampleInvestigations });
    mockDel.mockResolvedValueOnce({ success: true, data: { id: 'inv-1', deleted: true } });

    render(
      <MemoryRouter>
        <InvestigationsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeDefined();
    });

    const deleteBtn = screen.getByText('Delete');
    fireEvent.click(deleteBtn);

    expect(screen.getByText('Delete Investigation?')).toBeDefined();
    expect(screen.getByText('Confirm Delete')).toBeDefined();

    const confirmBtn = screen.getByText('Confirm Delete');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDel).toHaveBeenCalledWith('/api/v1/investigations/inv-1');
    });
  });
});
