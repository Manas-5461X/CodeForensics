import { useState, useId, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Panel } from '../components/ui/Panel.js';
import { Button } from '../components/ui/Button.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { TableSkeleton } from '../components/ui/LoadingSkeleton.js';
import { WorkItemDetailDrawer } from '../components/issues/WorkItemDetailDrawer.js';
import { useRepository } from '../context/RepositoryContext.js';
import { useApiClient } from '../utils/apiClient.js';
import type { WorkItemSummary, PaginatedResult } from '@codeforensics/shared';
import {
  Search,
  ExternalLink,
  GitPullRequest,
  CircleDot,
  GitMerge,
  AlertTriangle,
  RotateCw,
  FolderGit2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  X,
  CheckCircle2,
  Link2,
} from 'lucide-react';

export function IssuesPage() {
  const searchInputId = useId();
  const sortSelectId = useId();
  const { activeRepo, syncState, isSyncing, triggerSync } = useRepository();
  const { get } = useApiClient();

  // Filters & Pagination State
  const [typeFilter, setTypeFilter] = useState<'all' | 'issue' | 'pull_request'>('all');
  const [stateFilter, setStateFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortOption, setSortOption] = useState<
    'created_desc' | 'created_asc' | 'updated_desc' | 'updated_asc' | 'number_desc' | 'number_asc'
  >('created_desc');
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  // Selected item for detail drawer
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);

  // Debounce search query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filters change
  const handleTypeChange = (newType: 'all' | 'issue' | 'pull_request') => {
    setTypeFilter(newType);
    setPage(1);
  };

  const handleStateChange = (newState: 'all' | 'open' | 'closed') => {
    setStateFilter(newState);
    setPage(1);
  };

  const handleSortChange = (
    newSort: 'created_desc' | 'created_asc' | 'updated_desc' | 'updated_asc' | 'number_desc' | 'number_asc'
  ) => {
    setSortOption(newSort);
    setPage(1);
  };

  // TanStack Query for server-side paginated items
  const {
    data: itemsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'workItems',
      activeRepo?.owner,
      activeRepo?.name,
      typeFilter,
      stateFilter,
      debouncedSearch,
      sortOption,
      page,
      limit,
    ],
    queryFn: async () => {
      if (!activeRepo) return null;
      const res = await get<PaginatedResult<WorkItemSummary>>(
        `/api/v1/repositories/${encodeURIComponent(activeRepo.owner)}/${encodeURIComponent(activeRepo.name)}/items`,
        {
          type: typeFilter,
          state: stateFilter,
          search: debouncedSearch || undefined,
          sort: sortOption,
          page,
          limit,
        }
      );
      if (!res.success || !res.data) {
        throw new Error(res.error?.message || 'Failed to fetch repository work items');
      }
      return res.data;
    },
    enabled: Boolean(activeRepo),
  });

  // State 1: No active repository selected
  if (!activeRepo) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-primary tracking-tight">
            Issue & Pull Request Explorer
          </h2>
          <p className="text-xs text-primary-secondary mt-0.5">
            Inspect unified issue threads and pull request lifecycles with verified evidence provenance.
          </p>
        </div>
        <EmptyState
          icon={<FolderGit2 className="w-8 h-8 text-primary-muted" />}
          title="No Repository Selected"
          description="Select or track a GitHub repository from the top navigation bar to explore its issues and pull requests."
        />
      </div>
    );
  }

  // State 2: Active repo is not yet synchronized (status IDLE or 0 imported)
  const isUnsynced = !syncState || syncState.status === 'IDLE';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-primary tracking-tight">
              Issue & Pull Request Explorer
            </h2>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-surface border border-border-subtle text-primary-secondary">
              {activeRepo.fullName}
            </span>
          </div>
          <p className="text-xs text-primary-secondary mt-0.5">
            Unified investigation of issues and pull requests, distinguishing observed GitHub state from forensic verification.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => triggerSync(true)}
            disabled={isSyncing}
            leftIcon={
              <RotateCw
                className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-accent' : ''}`}
              />
            }
            className="shrink-0 text-xs px-3"
          >
            {isSyncing ? 'Synchronizing...' : 'Resync Repository'}
          </Button>
        </div>
      </div>

      {/* Sync Status Warning Banners */}
      {isSyncing && (
        <div className="bg-[#f0f9ff] border border-[#bae6fd] p-3 rounded-md flex items-center gap-2.5 text-xs text-[#0369a1]">
          <RotateCw className="w-4 h-4 animate-spin text-[#0284c7] shrink-0" />
          <span>
            Background synchronization in progress ({syncState?.progress || 0}%). Results will update dynamically.
          </span>
        </div>
      )}

      {syncState?.status === 'PARTIAL' && (
        <div className="bg-[#fffbeb] border border-[#fde68a] p-3 rounded-md flex items-start gap-2.5 text-xs text-[#92400e]">
          <AlertTriangle className="w-4 h-4 text-[#d97706] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold">Partial Sync Coverage:</span> The last synchronization reached rate limits or encountered partial errors. Some items may be missing. Run a forced resync when rate limits reset.
          </div>
        </div>
      )}

      {syncState?.status === 'FAILED' && (
        <div className="bg-[#fff1f2] border border-[#fecdd3] p-3 rounded-md flex items-start gap-2.5 text-xs text-[#be123c]">
          <AlertTriangle className="w-4 h-4 text-[#e11d48] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold">Sync Failed:</span> {syncState.errorSummary || 'The last synchronization run failed. Displayed records may be out of date.'}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-border-subtle p-3 rounded-md space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-80 md:w-96">
            <label htmlFor={searchInputId} className="sr-only">Search issues and pull requests</label>
            <Search className="w-3.5 h-3.5 text-primary-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id={searchInputId}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, description, or #number..."
              className="w-full bg-surface-subtle text-xs text-primary rounded-md pl-8 pr-8 py-1.5 border border-border-subtle placeholder:text-primary-muted focus:outline-none focus:border-link transition-colors font-sans"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary-muted hover:text-primary p-0.5"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <label htmlFor={sortSelectId} className="text-xs text-primary-muted font-mono shrink-0">Sort:</label>
            <select
              id={sortSelectId}
              value={sortOption}
              onChange={(e) => handleSortChange(e.target.value as any)}
              className="bg-surface-subtle text-xs text-primary border border-border-subtle rounded-md px-2.5 py-1.5 focus:outline-none focus:border-link font-mono"
            >
              <option value="created_desc">Newest created</option>
              <option value="created_asc">Oldest created</option>
              <option value="updated_desc">Recently updated</option>
              <option value="updated_asc">Least recently updated</option>
              <option value="number_desc">Highest #</option>
              <option value="number_asc">Lowest #</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border-subtle/60">
          {/* Type Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0">
            <span className="text-xs text-primary-muted mr-1 font-mono shrink-0">Type:</span>
            <Button
              size="sm"
              variant={typeFilter === 'all' ? 'primary' : 'ghost'}
              onClick={() => handleTypeChange('all')}
              className="text-xs h-7 px-2.5 shrink-0"
            >
              All Items
            </Button>
            <Button
              size="sm"
              variant={typeFilter === 'issue' ? 'primary' : 'ghost'}
              onClick={() => handleTypeChange('issue')}
              className="text-xs h-7 px-2.5 flex items-center gap-1 shrink-0"
            >
              <CircleDot className="w-3 h-3 text-emerald-600" />
              Issues
            </Button>
            <Button
              size="sm"
              variant={typeFilter === 'pull_request' ? 'primary' : 'ghost'}
              onClick={() => handleTypeChange('pull_request')}
              className="text-xs h-7 px-2.5 flex items-center gap-1 shrink-0"
            >
              <GitPullRequest className="w-3 h-3 text-purple-600" />
              Pull Requests
            </Button>
          </div>

          {/* State Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0">
            <span className="text-xs text-primary-muted mr-1 font-mono shrink-0">State:</span>
            <Button
              size="sm"
              variant={stateFilter === 'all' ? 'secondary' : 'ghost'}
              onClick={() => handleStateChange('all')}
              className={`text-xs h-7 px-2.5 shrink-0 ${stateFilter === 'all' ? 'bg-surface-selected font-semibold' : ''}`}
            >
              All States
            </Button>
            <Button
              size="sm"
              variant={stateFilter === 'open' ? 'secondary' : 'ghost'}
              onClick={() => handleStateChange('open')}
              className={`text-xs h-7 px-2.5 shrink-0 ${stateFilter === 'open' ? 'bg-surface-selected font-semibold text-emerald-700' : ''}`}
            >
              Open
            </Button>
            <Button
              size="sm"
              variant={stateFilter === 'closed' ? 'secondary' : 'ghost'}
              onClick={() => handleStateChange('closed')}
              className={`text-xs h-7 px-2.5 shrink-0 ${stateFilter === 'closed' ? 'bg-surface-selected font-semibold text-purple-700' : ''}`}
            >
              Closed / Merged
            </Button>
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      {isUnsynced ? (
        <EmptyState
          icon={<FolderGit2 className="w-8 h-8 text-primary-muted" />}
          title="Repository Not Synchronized"
          description={`Repository "${activeRepo.fullName}" has not been ingested yet. Run initial synchronization to index its issues and pull requests.`}
          action={
            <Button
              variant="primary"
              onClick={() => triggerSync(false)}
              disabled={isSyncing}
              className="flex items-center gap-2"
            >
              <RotateCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Synchronizing...' : 'Sync Repository Now'}
            </Button>
          }
        />
      ) : isLoading ? (
        <Panel className="p-4">
          <TableSkeleton rows={8} />
        </Panel>
      ) : isError ? (
        <Panel className="p-8 text-center space-y-3">
          <div className="p-3 bg-rose-50 text-rose-700 rounded-full w-12 h-12 flex items-center justify-center mx-auto border border-rose-200">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-primary">Failed to load work items</h3>
          <p className="text-xs text-primary-secondary max-w-md mx-auto">
            {error instanceof Error ? error.message : 'An unexpected error occurred while querying repository items.'}
          </p>
          <Button size="sm" variant="secondary" onClick={() => refetch()}>
            Retry Query
          </Button>
        </Panel>
      ) : !itemsData || itemsData.items.length === 0 ? (
        <EmptyState
          title="No Work Items Found"
          description={
            debouncedSearch || typeFilter !== 'all' || stateFilter !== 'all'
              ? 'No issues or pull requests matched your active filter and search criteria.'
              : 'This repository has no indexed issues or pull requests recorded in the database.'
          }
          action={
            (debouncedSearch || typeFilter !== 'all' || stateFilter !== 'all') ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSearchQuery('');
                  setTypeFilter('all');
                  setStateFilter('all');
                }}
              >
                Reset All Filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Table Container */}
          <Panel className="p-0 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-subtle/80 text-primary-muted font-mono font-medium">
                    <th scope="col" className="py-2.5 px-3 sm:px-4 w-20 sm:w-28">Item</th>
                    <th scope="col" className="py-2.5 px-3 sm:px-4">Title & Context</th>
                    <th scope="col" className="hidden md:table-cell py-2.5 px-4 w-32">Author</th>
                    <th scope="col" className="hidden sm:table-cell py-2.5 px-4 w-36">Timestamps</th>
                    <th scope="col" className="py-2.5 px-3 sm:px-4 w-24 sm:w-28 text-right">State</th>
                    <th scope="col" className="py-2.5 px-2 sm:px-4 w-10 sm:w-12 text-center">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {itemsData.items.map((item) => {
                    const isPR = item.type === 'pull_request';
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedNumber(item.number)}
                        className="hover:bg-surface-subtle/60 transition-colors cursor-pointer group"
                      >
                        {/* Type & Number */}
                        <td className="py-3 px-3 sm:px-4 font-mono whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {isPR ? (
                              <GitPullRequest className="w-3.5 h-3.5 text-purple-600 shrink-0" aria-label="Pull Request" />
                            ) : (
                              <CircleDot className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-label="Issue" />
                            )}
                            <span className="font-semibold text-primary group-hover:text-link transition-colors">
                              #{item.number}
                            </span>
                          </div>
                        </td>

                        {/* Title & Description Excerpt + Labels */}
                        <td className="py-3 px-3 sm:px-4 max-w-md">
                          <div className="font-medium text-primary leading-snug group-hover:text-link transition-colors line-clamp-1">
                            {item.title}
                          </div>
                          {item.body && (
                            <p className="text-[11px] text-primary-muted line-clamp-1 mt-0.5">
                              {item.body}
                            </p>
                          )}

                          {/* Mobile-only author & timestamp chip */}
                          <div className="flex sm:hidden items-center gap-2 text-[10px] text-primary-muted font-mono mt-1">
                            {item.author && <span>@{item.author}</span>}
                            <span>•</span>
                            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {/* Resolution Status Badge (for issues) */}
                            {!isPR && item.resolutionStatus && (
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${
                                  item.resolutionStatus === 'RESOLVED'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : item.resolutionStatus === 'PARTIALLY_ADDRESSED'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : item.resolutionStatus === 'UNKNOWN'
                                    ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-300'
                                }`}
                              >
                                {item.resolutionStatus}
                              </span>
                            )}

                            {/* Relationships Count Badge */}
                            {item.relationshipsCount !== undefined && item.relationshipsCount > 0 && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-50 text-cyan-800 border border-cyan-200">
                                <Link2 className="w-2.5 h-2.5" />
                                {item.relationshipsCount} linked
                              </span>
                            )}

                            {/* Labels */}
                            {item.labels &&
                              item.labels.slice(0, 2).map((lbl, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-surface-subtle border border-border-subtle text-primary-secondary"
                                >
                                  {lbl}
                                </span>
                              ))}
                            {item.labels && item.labels.length > 2 && (
                              <span className="text-[10px] text-primary-muted font-mono">
                                +{item.labels.length - 2}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Author */}
                        <td className="hidden md:table-cell py-3 px-4 text-primary-secondary font-mono whitespace-nowrap">
                          {item.author || <span className="text-primary-muted">—</span>}
                        </td>

                        {/* Timestamps */}
                        <td className="hidden sm:table-cell py-3 px-4 text-primary-muted font-mono whitespace-nowrap text-[11px]">
                          <div>Created {new Date(item.createdAt).toLocaleDateString()}</div>
                          {item.closedAt && (
                            <div className="text-[10px] text-primary-muted/80">
                              Closed {new Date(item.closedAt).toLocaleDateString()}
                            </div>
                          )}
                        </td>

                        {/* State Indicator */}
                        <td className="py-3 px-3 sm:px-4 text-right whitespace-nowrap">
                          {isPR ? (
                            item.state === 'merged' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200 font-mono">
                                <GitMerge className="w-3 h-3 text-purple-600" />
                                Merged
                              </span>
                            ) : item.isDraft ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-300 font-mono">
                                Draft
                              </span>
                            ) : item.state === 'open' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Open
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 font-mono">
                                Closed
                              </span>
                            )
                          ) : item.state === 'open' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Open
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200 font-mono">
                              <CheckCircle2 className="w-3 h-3 text-purple-600" />
                              Closed
                            </span>
                          )}
                        </td>

                        {/* GitHub External Link */}
                        <td className="py-3 px-2 sm:px-4 text-center">
                          <a
                            href={item.htmlUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-primary-muted hover:text-link inline-flex p-1.5 rounded hover:bg-surface transition-colors min-w-[32px] min-h-[32px] items-center justify-center"
                            title="Open on GitHub"
                            aria-label={`Open #${item.number} on GitHub`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Pagination & Summary Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-primary-muted font-mono pt-1">
            <div>
              Showing {Math.min((page - 1) * limit + 1, itemsData.total)} to{' '}
              {Math.min(page * limit, itemsData.total)} of {itemsData.total} items
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 px-2.5 flex items-center gap-1"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </Button>

              <span className="px-2 font-medium text-primary">
                Page {page} of {itemsData.totalPages || 1}
              </span>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPage((p) => Math.min(itemsData.totalPages, p + 1))}
                disabled={page >= itemsData.totalPages}
                className="h-8 px-2.5 flex items-center gap-1"
                aria-label="Next page"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Forensic Disclaimer Footer */}
      <div className="p-3 bg-surface-subtle border border-border-subtle rounded-md text-[11px] text-primary-muted flex items-center gap-2 font-mono">
        <ShieldAlert className="w-4 h-4 text-primary-muted shrink-0" />
        <span>
          CodeForensics records authoritative GitHub repository state. In later phases, relationship intelligence engines map claims and commits. Closed issues or merged pull requests do not constitute verified fixes without forensic code regression analysis.
        </span>
      </div>

      {/* Slide-over Detail Drawer */}
      <WorkItemDetailDrawer
        owner={activeRepo.owner}
        repo={activeRepo.name}
        itemNumber={selectedNumber}
        onClose={() => setSelectedNumber(null)}
        onSelectItem={(num) => setSelectedNumber(num)}
      />
    </div>
  );
}
