import { useState } from 'react';
import { Panel } from '../components/ui/Panel.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import {
  Search,
  ExternalLink,
} from 'lucide-react';

interface MockIssue {
  id: string;
  number: number;
  title: string;
  githubState: 'open' | 'closed';
  forensicAssessment: 'RESOLVED' | 'UNRESOLVED' | 'UNKNOWN' | 'PARTIALLY_ADDRESSED';
  claimCategory: 'FACT' | 'INFERENCE' | 'HYPOTHESIS' | 'UNKNOWN';
  author: string;
  labels: string[];
  updatedAt: string;
  linkedPr?: number;
  evidenceSnippet: string;
}

const mockIssues: MockIssue[] = [
  {
    id: '1',
    number: 28941,
    title: 'useDeferredValue causes tearing in concurrent root transitions',
    githubState: 'closed',
    forensicAssessment: 'PARTIALLY_ADDRESSED',
    claimCategory: 'INFERENCE',
    author: 'gaearon',
    labels: ['Component: Concurrent', 'Resolution: Uncertain'],
    updatedAt: '2h ago',
    linkedPr: 29012,
    evidenceSnippet: 'PR #29012 merged fix for initial render only; concurrent fallback path not covered by tests.',
  },
  {
    id: '2',
    number: 28810,
    title: 'Memory leak in Suspense list during early unmount',
    githubState: 'closed',
    forensicAssessment: 'RESOLVED',
    claimCategory: 'FACT',
    author: 'acdlite',
    labels: ['Component: Suspense', 'Type: Bug'],
    updatedAt: '1d ago',
    linkedPr: 28840,
    evidenceSnippet: 'Closed via commit f9281a with explicit regression test in ReactSuspenseList-test.internal.js.',
  },
  {
    id: '3',
    number: 28719,
    title: 'DevTools profiler timeline drops commits under high CPU load',
    githubState: 'open',
    forensicAssessment: 'UNRESOLVED',
    claimCategory: 'FACT',
    author: 'bvaughn',
    labels: ['Component: DevTools', 'good first issue'],
    updatedAt: '3d ago',
    evidenceSnippet: 'No active pull requests or branches found touching ReactDevToolsProfiler.',
  },
  {
    id: '4',
    number: 28650,
    title: 'SSR streaming hydration mismatch with inline scripts',
    githubState: 'closed',
    forensicAssessment: 'UNKNOWN',
    claimCategory: 'UNKNOWN',
    author: 'sebmarkbage',
    labels: ['Component: SSR'],
    updatedAt: '5d ago',
    evidenceSnippet: 'Closed by bot as stale. No commit or PR referenced in discussion.',
  },
];

export function IssuesPage() {
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredIssues = mockIssues.filter((issue) => {
    if (filter === 'open' && issue.githubState !== 'open') return false;
    if (filter === 'closed' && issue.githubState !== 'closed') return false;
    if (
      searchQuery &&
      !issue.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !issue.number.toString().includes(searchQuery)
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-primary tracking-tight">
            Issues & Pull Requests Lineage
          </h2>
          <p className="text-xs text-primary-secondary mt-0.5">
            Differentiating observed GitHub provider state from CodeForensics evidence assessments.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-border-subtle p-3 rounded-md flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-primary-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by issue #, title, or label..."
            className="w-full bg-surface-subtle text-xs text-primary rounded-md pl-8 pr-3 py-1.5 border border-border-subtle placeholder:text-primary-muted focus:outline-none focus:border-link"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          <Button
            size="sm"
            variant={filter === 'all' ? 'primary' : 'ghost'}
            onClick={() => setFilter('all')}
          >
            All Items ({mockIssues.length})
          </Button>
          <Button
            size="sm"
            variant={filter === 'open' ? 'primary' : 'ghost'}
            onClick={() => setFilter('open')}
          >
            Open ({mockIssues.filter((i) => i.githubState === 'open').length})
          </Button>
          <Button
            size="sm"
            variant={filter === 'closed' ? 'primary' : 'ghost'}
            onClick={() => setFilter('closed')}
          >
            Closed ({mockIssues.filter((i) => i.githubState === 'closed').length})
          </Button>
        </div>
      </div>

      {/* Issues Table */}
      <Panel className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-subtle/50 text-[11px] font-semibold text-primary-muted uppercase tracking-wider font-mono">
                <th className="py-2.5 px-4">Work Item</th>
                <th className="py-2.5 px-4">GitHub State</th>
                <th className="py-2.5 px-4">Forensic Assessment</th>
                <th className="py-2.5 px-4">Evidence & Provenance</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-xs">
              {filteredIssues.map((issue) => (
                <tr
                  key={issue.id}
                  className="hover:bg-surface-subtle/40 transition-colors"
                >
                  {/* Item Title and Metadata */}
                  <td className="py-3 px-4 max-w-md">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-primary">
                        #{issue.number}
                      </span>
                      <span className="font-medium text-primary line-clamp-1">
                        {issue.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-primary-muted">
                      <span>opened by {issue.author}</span>
                      <span>•</span>
                      <span>{issue.updatedAt}</span>
                      {issue.labels.map((lbl) => (
                        <span
                          key={lbl}
                          className="px-1.5 py-0.2 bg-surface-subtle rounded border border-border-subtle text-[10px]"
                        >
                          {lbl}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Official GitHub State */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium border ${
                        issue.githubState === 'open'
                          ? 'bg-[#e3f0e9] text-[#1a573d] border-[#b4dbca]'
                          : 'bg-surface-subtle text-primary-secondary border-border-subtle'
                      }`}
                    >
                      {issue.githubState === 'open' ? 'Open' : 'Closed'}
                    </span>
                  </td>

                  {/* Forensic Assessment */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <Badge category={issue.claimCategory}>
                      {issue.forensicAssessment}
                    </Badge>
                  </td>

                  {/* Evidentiary Details */}
                  <td className="py-3 px-4 text-primary-secondary text-[11px] max-w-xs">
                    <p className="line-clamp-2 leading-relaxed">
                      {issue.evidenceSnippet}
                    </p>
                  </td>

                  {/* Source Links */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <a
                      href={`https://github.com/facebook/react/issues/${issue.number}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-link hover:underline text-xs font-medium"
                    >
                      GitHub <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
