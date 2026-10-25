import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkItemDetailDrawer } from '../src/components/issues/WorkItemDetailDrawer.js';
import type { WorkItemDetail, RelationshipInfo, ResolutionAssessment } from '@codeforensics/shared';

const mockGet = vi.fn();

vi.mock('../src/utils/apiClient.js', () => ({
  useApiClient: () => ({
    get: mockGet,
    post: vi.fn(),
  }),
}));

describe('Phase 6: Explainable "Why Linked?" & Resolution UI Experience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockResolvedIssueDetail: WorkItemDetail = {
    id: '101',
    type: 'issue',
    number: 101,
    title: 'Memory leak in Suspense list during early unmount',
    body: 'Boundary aborts prematurely without clean up.',
    state: 'closed',
    author: 'acdlite',
    labels: ['Bug'],
    htmlUrl: 'https://github.com/facebook/react/issues/101',
    closedAt: '2024-01-05T12:00:00Z',
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-05T12:00:00Z',
    timelineAvailable: false,
    diffAvailable: false,
    relationshipsCount: 1,
    resolutionStatus: 'RESOLVED',
    resolutionAssessment: {
      issueId: '101',
      status: 'RESOLVED',
      category: 'INFERENCE',
      confidence: 'HIGH',
      assessedAt: '2024-01-05T12:00:00Z',
      rationale: 'Issue #101 is closed and was explicitly targeted by merged pull request #201.',
      evidenceSummary: 'Issue #101 claimed fixed by merged PR #201 ("fixes #101").',
      evidence: [
        {
          id: 'ev-101-merged-fix',
          category: 'INFERENCE',
          sourceType: 'GITHUB_FACT',
          sourceUrl: '101',
          summary: 'Issue #101 claimed fixed by merged PR #201 ("fixes #101").',
          confidence: 'HIGH',
          provenance: 'DETERMINISTIC_MERGED_CLOSING_KEYWORD',
          recordedAt: '2024-01-05T12:00:00Z',
        },
      ],
      coverageNotes: [
        'CodeForensics does not assume merged code resolved the defect without verified test execution.',
      ],
    },
    relationships: [
      {
        id: 'rel-repo1-issue101-pr201-fixed_by',
        repositoryId: 'repo1',
        sourceId: '101',
        sourceType: 'ISSUE',
        sourceNumber: 101,
        sourceTitle: 'Memory leak in Suspense list during early unmount',
        targetId: '201',
        targetType: 'PULL_REQUEST',
        targetNumber: 201,
        targetTitle: 'Fix Suspense boundary leak on abort',
        relationshipType: 'FIXED_BY',
        category: 'INFERENCE',
        confidence: 'HIGH',
        method: 'DETERMINISTIC_MERGED_CLOSING_KEYWORD',
        evidenceSummary: 'Issue #101 is claimed fixed by merged PR #201 ("fixes #101").',
        evidenceDetails: {
          summary: 'PR #201 declares "fixes #101" targeting issue #101.',
          ruleId: 'RULE_MERGED_CLOSING_DIRECTIVE',
          ruleDescription: 'Matches explicit GitHub closing keywords (fixes, closes, resolves).',
          references: [
            {
              type: 'CLOSING_KEYWORD',
              keyword: 'fixes',
              matchedText: 'fixes #101',
              sourceText: 'This patch fixes #101 by resetting subscriber listener in abort signal.',
              location: 'BODY',
            },
          ],
          confidenceRationale: 'Assigned HIGH confidence because pull request #201 was merged into default branch with explicit closing keyword "fixes".',
          limitations: [
            'CodeForensics does not assume merged code resolved the defect without verified test execution.',
          ],
        },
        createdAt: '2024-01-05T12:00:00Z',
        updatedAt: '2024-01-05T12:00:00Z',
      },
    ],
  };

  const mockUnknownIssueDetail: WorkItemDetail = {
    id: '103',
    type: 'issue',
    number: 103,
    title: 'Mysterious closure without commit link',
    body: 'Closed directly via web UI by author.',
    state: 'closed',
    author: 'bvaughn',
    labels: ['Investigate'],
    htmlUrl: 'https://github.com/facebook/react/issues/103',
    closedAt: '2024-01-07T12:00:00Z',
    createdAt: '2024-01-03T10:00:00Z',
    updatedAt: '2024-01-07T12:00:00Z',
    timelineAvailable: false,
    diffAvailable: false,
    relationshipsCount: 0,
    resolutionStatus: 'UNKNOWN',
    resolutionAssessment: {
      issueId: '103',
      status: 'UNKNOWN',
      category: 'UNKNOWN',
      confidence: 'NOT_ASSESSED',
      assessedAt: '2024-01-07T12:00:00Z',
      rationale: 'Issue #103 is closed on GitHub, but no referencing pull request or commit was found in synchronized repository data.',
      evidenceSummary: 'Closed state observed without linked pull request in repository.',
      evidence: [],
      coverageNotes: [
        'No referencing pull requests or commits found in synchronized records.',
        'Closed issues are not automatically considered fixed without explicit evidence.',
      ],
      linkedRelationships: [],
    },
    relationships: [],
  };

  it('renders resolution assessment banner and confidence in overview tab', async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: mockResolvedIssueDetail,
    });

    render(
      <WorkItemDetailDrawer
        owner="facebook"
        repo="react"
        itemNumber={101}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Memory leak in Suspense list during early unmount')).toBeDefined();
    });

    // Check resolution summary in overview tab
    expect(screen.getByText('Resolution Assessment:')).toBeDefined();
    expect(screen.getByText('RESOLVED')).toBeDefined();
    expect(screen.getByText('CONFIDENCE: HIGH')).toBeDefined();
    expect(screen.getByText(/Issue #101 is closed and was explicitly targeted by merged pull request #201/)).toBeDefined();
  });

  it('navigates to Relationships & Resolution tab and reveals explainable "Why Linked?" details', async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: mockResolvedIssueDetail,
    });

    render(
      <WorkItemDetailDrawer
        owner="facebook"
        repo="react"
        itemNumber={101}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Memory leak in Suspense list during early unmount')).toBeDefined();
    });

    // Switch to Relationships tab
    const relsTabBtn = screen.getByRole('button', { name: /Relationships & Resolution/i });
    fireEvent.click(relsTabBtn);

    // Verify relationship header
    expect(screen.getByText('FIXED_BY')).toBeDefined();
    expect(screen.getAllByText('HIGH CONFIDENCE').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Issue #101 is claimed fixed by merged PR #201/)).toBeDefined();

    // Click "Why Linked?" toggle
    const whyLinkedBtn = screen.getByRole('button', { name: /Why Linked\? Inspect Evidence Details/i });
    fireEvent.click(whyLinkedBtn);

    // Verify explainable details
    expect(screen.getByText(/RULE_MERGED_CLOSING_DIRECTIVE/)).toBeDefined();
    expect(screen.getAllByText(/CodeForensics does not assume merged code resolved the defect/).length).toBeGreaterThanOrEqual(1);
  });

  it('displays conservative UNKNOWN CLOSURE state when closed issue has no linked PR', async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: mockUnknownIssueDetail,
    });

    render(
      <WorkItemDetailDrawer
        owner="facebook"
        repo="react"
        itemNumber={103}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Mysterious closure without commit link')).toBeDefined();
    });

    expect(screen.getByText('UNKNOWN CLOSURE')).toBeDefined();
    expect(screen.getByText('CONFIDENCE: NOT_ASSESSED')).toBeDefined();

    // Switch to Relationships tab
    const relsTabBtn = screen.getByRole('button', { name: /Relationships & Resolution/i });
    fireEvent.click(relsTabBtn);

    expect(screen.getByText('Zero Relationships Detected')).toBeDefined();
    expect(screen.getByText(/Conservative Rule: CodeForensics strictly requires verified textual directives/i)).toBeDefined();
    expect(screen.getByText(/No referencing pull requests or commits found in synchronized records/)).toBeDefined();
  });
});
