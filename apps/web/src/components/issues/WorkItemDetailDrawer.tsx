import { useEffect, useState } from 'react';
import type { WorkItemDetail } from '@codeforensics/shared';
import { useApiClient } from '../../utils/apiClient.js';
import { Button } from '../ui/Button.js';
import { Skeleton } from '../ui/LoadingSkeleton.js';
import {
  X,
  ExternalLink,
  GitPullRequest,
  CircleDot,
  GitMerge,
  Clock,
  User,
  Calendar,
  GitBranch,
  FileCode,
  MessageSquare,
  ShieldAlert,
  Info,
  CheckCircle2,
  FileText,
  Link2,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  History,
  Files,
  Layers,
  AlertOctagon,
  BookmarkPlus,
} from 'lucide-react';

export interface WorkItemDetailDrawerProps {
  owner: string;
  repo: string;
  itemNumber: number | null;
  onClose: () => void;
  onSelectItem?: (itemNumber: number) => void;
}

export function WorkItemDetailDrawer({
  owner,
  repo,
  itemNumber,
  onClose,
  onSelectItem,
}: WorkItemDetailDrawerProps) {
  const { get } = useApiClient();
  const [item, setItem] = useState<WorkItemDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'relationships' | 'timeline' | 'diff'>('overview');
  const [expandedRelId, setExpandedRelId] = useState<string | null>(null);
  const [copiedPrecedentId, setCopiedPrecedentId] = useState<string | null>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Fetch detail whenever itemNumber changes
  useEffect(() => {
    if (!itemNumber) {
      setItem(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    get<WorkItemDetail>(`/api/v1/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/items/${itemNumber}`)
      .then((res) => {
        if (!isMounted) return;
        if (res.data) {
          setItem(res.data);
        } else {
          setError(res.error?.message || 'Failed to load item detail');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to retrieve item detail');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [owner, repo, itemNumber, get]);

  if (!itemNumber) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item ? `${item.type === 'pull_request' ? 'Pull Request' : 'Issue'} #${item.number}` : 'Work Item Detail'}
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-full sm:max-w-xl md:max-w-2xl bg-surface border-l border-border-subtle shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-border-subtle bg-surface-subtle/40 flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold px-2 py-0.5 rounded bg-surface border border-border-subtle text-primary">
                  {item?.type === 'pull_request' ? (
                    <>
                      <GitPullRequest className="w-3.5 h-3.5 text-purple-600" />
                      PR #{itemNumber}
                    </>
                  ) : (
                    <>
                      <CircleDot className="w-3.5 h-3.5 text-emerald-600" />
                      Issue #{itemNumber}
                    </>
                  )}
                </span>

                {item && (
                  <>
                    {item.type === 'pull_request' ? (
                      item.state === 'merged' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 font-mono">
                          <GitMerge className="w-3 h-3 text-purple-600" />
                          Merged
                        </span>
                      ) : item.isDraft ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300 font-mono">
                          Draft
                        </span>
                      ) : item.state === 'open' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Open
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 font-mono">
                          Closed
                        </span>
                      )
                    ) : item.state === 'open' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Open
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 font-mono">
                        <CheckCircle2 className="w-3 h-3 text-purple-600" />
                        Closed
                      </span>
                    )}
                  </>
                )}
              </div>

              {isLoading ? (
                <Skeleton className="h-6 w-3/4 mb-2" />
              ) : (
                <h2 className="text-base font-bold text-primary tracking-tight leading-snug">
                  {item?.title || `Item #${itemNumber}`}
                </h2>
              )}

              {item && (
                <div className="flex items-center gap-3 text-xs text-primary-muted mt-2 flex-wrap font-mono">
                  {item.author && (
                    <span className="flex items-center gap-1 text-primary-secondary">
                      <User className="w-3.5 h-3.5" />
                      {item.author}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Created {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                  {item.closedAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Closed {new Date(item.closedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {item?.htmlUrl && (
                <a
                  href={item.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-primary-muted hover:text-link hover:bg-surface rounded-md border border-transparent hover:border-border-subtle transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                  title="Open on GitHub"
                  aria-label="Open on GitHub"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-primary-muted hover:text-primary hover:bg-surface rounded-md border border-transparent hover:border-border-subtle transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Forensic Evidence Provenance Banner */}
          <div className="bg-[#f0f9ff] border-b border-[#bae6fd] px-4 sm:px-5 py-2.5 flex items-start gap-2.5 text-xs text-[#0369a1]">
            <ShieldAlert className="w-4 h-4 text-[#0284c7] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-[#0c4a6e]">Forensic Provenance:</span> Observed GitHub provider state. State markers (closed/merged) indicate repository lifecycle events, not confirmed defect resolution or code verification.
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-border-subtle px-4 sm:px-5 bg-surface flex items-center gap-4 sm:gap-6 text-xs font-medium overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-3 border-b-2 font-medium transition-colors shrink-0 ${
                activeTab === 'overview'
                  ? 'border-link text-link font-semibold'
                  : 'border-transparent text-primary-secondary hover:text-primary'
              }`}
            >
              Overview & Description
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('relationships')}
              className={`py-3 border-b-2 font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                activeTab === 'relationships'
                  ? 'border-link text-link font-semibold'
                  : 'border-transparent text-primary-secondary hover:text-primary'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              Relationships & Resolution
              {item?.relationships && item.relationships.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full text-[10px] font-mono">
                  {item.relationships.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={`py-3 border-b-2 font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                activeTab === 'timeline'
                  ? 'border-link text-link font-semibold'
                  : 'border-transparent text-primary-secondary hover:text-primary'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Discussion Timeline
              {item?.timelineEvents && item.timelineEvents.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-surface-subtle border border-border-subtle rounded-full text-[10px] font-mono">
                  {item.timelineEvents.length}
                </span>
              )}
            </button>
            {item?.type === 'pull_request' && (
              <button
                type="button"
                onClick={() => setActiveTab('diff')}
                className={`py-3 border-b-2 font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'diff'
                    ? 'border-link text-link font-semibold'
                    : 'border-transparent text-primary-secondary hover:text-primary'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                Changes & Diff
                {item.diffSummary && (
                  <span className="ml-1 px-1.5 py-0.2 bg-surface-subtle border border-border-subtle rounded-full text-[10px] font-mono">
                    {item.diffSummary.changedFiles}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Drawer Body Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : error ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-md text-rose-800 text-xs">
                <div className="font-semibold mb-1">Failed to load item detail</div>
                <div>{error}</div>
              </div>
            ) : item ? (
              <>
                {/* TAB 1: OVERVIEW */}
                {activeTab === 'overview' && (
                  <div className="space-y-5">
                    {/* Pull Request Branch Info */}
                    {item.type === 'pull_request' && (item.baseRef || item.headRef) && (
                      <div className="p-3 bg-surface-subtle rounded-md border border-border-subtle flex items-center gap-2 text-xs font-mono">
                        <GitBranch className="w-4 h-4 text-primary-muted shrink-0" />
                        <span className="text-primary-muted">Branches:</span>
                        <span className="px-1.5 py-0.5 bg-surface border border-border-subtle rounded text-primary font-semibold">
                          {item.baseRef || 'main'}
                        </span>
                        <span className="text-primary-muted">←</span>
                        <span className="px-1.5 py-0.5 bg-surface border border-border-subtle rounded text-primary font-semibold">
                          {item.headRef || 'unknown'}
                        </span>
                        {item.mergedAt && (
                          <span className="ml-auto text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            Merged on {new Date(item.mergedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Resolution & Relationship Summary Box */}
                    {item.type === 'issue' && item.resolutionAssessment && (
                      <div className="p-4 rounded-md border border-border-subtle bg-surface-subtle/50 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-semibold text-primary">Resolution Assessment:</span>
                            {item.resolutionAssessment.status === 'RESOLVED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                RESOLVED
                              </span>
                            )}
                            {item.resolutionAssessment.status === 'PARTIALLY_ADDRESSED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                PARTIALLY ADDRESSED
                              </span>
                            )}
                            {item.resolutionAssessment.status === 'UNRESOLVED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                                <CircleDot className="w-3 h-3 text-slate-500" />
                                UNRESOLVED
                              </span>
                            )}
                            {item.resolutionAssessment.status === 'UNKNOWN' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                                <HelpCircle className="w-3 h-3 text-sky-600" />
                                UNKNOWN CLOSURE
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border-subtle text-primary-muted">
                            CONFIDENCE: {item.resolutionAssessment.confidence}
                          </span>
                        </div>
                        <p className="text-xs text-primary leading-relaxed font-sans">
                          {item.resolutionAssessment.rationale}
                        </p>
                        <div className="pt-1 flex items-center justify-between text-xs">
                          <span className="text-primary-muted font-mono text-[11px]">
                            {item.relationships?.length || 0} linked relationship{item.relationships?.length === 1 ? '' : 's'} detected
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveTab('relationships')}
                            className="inline-flex items-center gap-1 text-link hover:underline font-mono text-xs"
                          >
                            Inspect Evidence & Why Linked?
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Description Body */}
                    <div>
                      <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-primary-muted" />
                        Description Body
                      </h3>
                      {item.body ? (
                        <div className="p-4 bg-surface rounded-md border border-border-subtle text-xs text-primary font-sans leading-relaxed whitespace-pre-wrap selection:bg-cyan-100">
                          {item.body}
                        </div>
                      ) : (
                        <div className="p-6 text-center border border-dashed border-border-subtle rounded-md text-xs text-primary-muted bg-surface-subtle/30 font-mono">
                          No description provided for this {item.type === 'pull_request' ? 'pull request' : 'issue'}.
                        </div>
                      )}
                    </div>

                    {/* Labels Cloud */}
                    {item.labels && item.labels.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 font-mono">
                          Labels ({item.labels.length})
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                          {item.labels.map((label, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded text-xs font-mono bg-surface-subtle border border-border-subtle text-primary-secondary"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Source Provenance Metadata Card */}
                    <div className="p-4 bg-surface-subtle/50 border border-border-subtle rounded-md text-xs space-y-2">
                      <div className="font-semibold text-primary flex items-center gap-1.5 font-mono">
                        <Info className="w-3.5 h-3.5 text-primary-muted" />
                        Provider Record Metadata
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-primary-secondary font-mono text-[11px]">
                        <div>
                          <span className="text-primary-muted">Internal ID:</span> {item.id}
                        </div>
                        <div>
                          <span className="text-primary-muted">Repository:</span> {owner}/{repo}
                        </div>
                        <div>
                          <span className="text-primary-muted">Provider:</span> GitHub
                        </div>
                        <div>
                          <span className="text-primary-muted">Last Updated:</span>{' '}
                          {new Date(item.updatedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: RELATIONSHIPS & RESOLUTION */}
                {activeTab === 'relationships' && (
                  <div className="space-y-6">
                    {/* Resolution Assessment Detailed Section (for Issues) */}
                    {item.type === 'issue' && item.resolutionAssessment && (
                      <div className="p-4 bg-surface border border-border-subtle rounded-md shadow-xs space-y-3.5">
                        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border-subtle/60 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-primary">Resolution Assessment:</span>
                            {item.resolutionAssessment.status === 'RESOLVED' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                RESOLVED
                              </span>
                            )}
                            {item.resolutionAssessment.status === 'PARTIALLY_ADDRESSED' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                PARTIALLY ADDRESSED
                              </span>
                            )}
                            {item.resolutionAssessment.status === 'UNRESOLVED' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                                <CircleDot className="w-3.5 h-3.5 text-slate-500" />
                                UNRESOLVED
                              </span>
                            )}
                            {item.resolutionAssessment.status === 'UNKNOWN' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                                <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
                                UNKNOWN CLOSURE
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-subtle border border-border-subtle text-primary-muted">
                              [{item.resolutionAssessment.category}]
                            </span>
                            <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                              item.resolutionAssessment.confidence === 'HIGH'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : item.resolutionAssessment.confidence === 'MEDIUM'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-600 border-slate-300'
                            }`}>
                              {item.resolutionAssessment.confidence} CONFIDENCE
                            </span>
                          </div>
                        </div>

                        {/* Rationale */}
                        <div className="space-y-1">
                          <h4 className="text-[11px] font-mono uppercase tracking-wider text-primary-muted font-semibold">
                            Assessment Rationale
                          </h4>
                          <p className="text-xs text-primary leading-relaxed">
                            {item.resolutionAssessment.rationale}
                          </p>
                        </div>

                        {/* Coverage Notes & Explicit Disclosures */}
                        {item.resolutionAssessment.coverageNotes && item.resolutionAssessment.coverageNotes.length > 0 && (
                          <div className="p-3 bg-surface-subtle/80 rounded border border-border-subtle/80 space-y-1.5 text-xs">
                            <h5 className="font-mono text-[11px] font-semibold text-primary-secondary flex items-center gap-1">
                              <ShieldAlert className="w-3.5 h-3.5 text-primary-muted" />
                              Forensic Limitations & Evidence Disclosures:
                            </h5>
                            <ul className="list-disc list-inside space-y-1 text-primary-muted font-sans text-[11px] leading-relaxed">
                              {item.resolutionAssessment.coverageNotes.map((note, idx) => (
                                <li key={idx}>{note}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Detected Relationships List */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-primary uppercase tracking-wider font-mono flex items-center gap-1.5">
                          <Link2 className="w-3.5 h-3.5 text-primary-muted" />
                          Detected Relationships ({item.relationships?.length || 0})
                        </h3>
                        <span className="text-[11px] font-mono text-primary-muted">
                          Deterministic Engine
                        </span>
                      </div>

                      {item.relationships && item.relationships.length > 0 ? (
                        <div className="space-y-3">
                          {item.relationships.map((rel) => {
                            const isExpanded = expandedRelId === rel.id;
                            const isPRSource = rel.sourceType === 'PULL_REQUEST';
                            const isPRTarget = rel.targetType === 'PULL_REQUEST';

                            return (
                              <div
                                key={rel.id}
                                className="p-4 bg-surface border border-border-subtle rounded-md shadow-xs space-y-3"
                              >
                                {/* Relationship Header: Source -> Type -> Target */}
                                <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {/* Source Item */}
                                    <button
                                      type="button"
                                      onClick={() => rel.sourceNumber && onSelectItem && onSelectItem(rel.sourceNumber)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-subtle border border-border-subtle text-primary font-semibold hover:border-link hover:text-link transition-colors"
                                      title={rel.sourceTitle || undefined}
                                    >
                                      {isPRSource ? <GitPullRequest className="w-3 h-3 text-purple-600" /> : <CircleDot className="w-3 h-3 text-emerald-600" />}
                                      {isPRSource ? 'PR' : 'Issue'} #{rel.sourceNumber}
                                    </button>

                                    {/* Relationship Type Badge */}
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                      rel.relationshipType === 'FIXED_BY'
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                        : rel.relationshipType === 'ADDRESSES'
                                        ? 'bg-sky-50 text-sky-800 border border-sky-300'
                                        : rel.relationshipType === 'SUPERSEDES'
                                        ? 'bg-purple-50 text-purple-800 border border-purple-300'
                                        : 'bg-slate-100 text-slate-800 border border-slate-300'
                                    }`}>
                                      {rel.relationshipType}
                                    </span>

                                    {/* Target Item */}
                                    <button
                                      type="button"
                                      onClick={() => rel.targetNumber && onSelectItem && onSelectItem(rel.targetNumber)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-subtle border border-border-subtle text-primary font-semibold hover:border-link hover:text-link transition-colors"
                                      title={rel.targetTitle || undefined}
                                    >
                                      {isPRTarget ? <GitPullRequest className="w-3 h-3 text-purple-600" /> : <CircleDot className="w-3 h-3 text-emerald-600" />}
                                      {isPRTarget ? 'PR' : 'Issue'} #{rel.targetNumber}
                                    </button>
                                  </div>

                                  {/* Confidence & Category */}
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-primary-muted font-mono px-1.5 py-0.5 rounded bg-surface-subtle border border-border-subtle">
                                      [{rel.category}]
                                    </span>
                                    <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                                      rel.confidence === 'HIGH'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : rel.confidence === 'MEDIUM'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : 'bg-slate-100 text-slate-600 border-slate-300'
                                    }`}>
                                      {rel.confidence} CONFIDENCE
                                    </span>
                                  </div>
                                </div>

                                {/* Summary */}
                                <p className="text-xs text-primary leading-relaxed font-sans">
                                  {rel.evidenceSummary}
                                </p>

                                {/* "Why Linked?" Inspection Toggle Button */}
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedRelId(isExpanded ? null : rel.id)}
                                    className="inline-flex items-center gap-1.5 text-xs text-link hover:underline font-mono"
                                  >
                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    <span>{isExpanded ? 'Hide Evidence Details' : 'Why Linked? Inspect Evidence Details'}</span>
                                  </button>
                                </div>

                                {/* "Why Linked?" Deep Inspection Card */}
                                {isExpanded && (
                                  <div className="p-3.5 bg-surface-subtle/80 border border-border-subtle rounded-md space-y-3 animate-in fade-in duration-150">
                                    {/* Detection Rule */}
                                    {rel.evidenceDetails?.ruleId && (
                                      <div className="space-y-1">
                                        <div className="text-[10px] font-mono uppercase tracking-wider text-primary-muted font-semibold">
                                          Deterministic Detection Rule
                                        </div>
                                        <div className="text-xs font-mono font-medium text-cyan-800 bg-cyan-50 p-2 rounded border border-cyan-200">
                                          {rel.evidenceDetails.ruleId}: {rel.evidenceDetails.ruleDescription}
                                        </div>
                                      </div>
                                    )}

                                    {/* Observed Text Evidence */}
                                    {rel.evidenceDetails?.references && rel.evidenceDetails.references.length > 0 && (
                                      <div className="space-y-1.5">
                                        <div className="text-[10px] font-mono uppercase tracking-wider text-primary-muted font-semibold">
                                          Observed Text Evidence ({rel.evidenceDetails.references[0].type})
                                        </div>
                                        <div className="p-2.5 bg-slate-900 text-slate-100 rounded text-xs font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                                          {rel.evidenceDetails.references[0].sourceText}
                                        </div>
                                        <div className="text-[11px] font-mono text-primary-muted">
                                          Matched Keyword: <span className="font-semibold text-primary">"{rel.evidenceDetails.references[0].matchedText}"</span> (Location: {rel.evidenceDetails.references[0].location || 'BODY'})
                                        </div>
                                      </div>
                                    )}

                                    {/* Confidence Assessment & Rationale */}
                                    {rel.evidenceDetails?.confidenceRationale && (
                                      <div className="space-y-1">
                                        <div className="text-[10px] font-mono uppercase tracking-wider text-primary-muted font-semibold">
                                          Confidence Assessment & Rationale
                                        </div>
                                        <p className="text-xs text-primary-secondary leading-relaxed font-sans">
                                          {rel.evidenceDetails.confidenceRationale}
                                        </p>
                                      </div>
                                    )}

                                    {/* Why Not Stronger Explanation (For MEDIUM or LOW) */}
                                    {rel.confidence !== 'HIGH' && (
                                      <div className="p-2.5 bg-amber-50/80 border border-amber-200/80 rounded text-xs space-y-1">
                                        <div className="font-semibold text-amber-900 font-mono text-[11px] flex items-center gap-1">
                                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                          Why this relationship is not classified more strongly:
                                        </div>
                                        <p className="text-amber-800 font-sans text-[11px] leading-relaxed">
                                          {rel.confidence === 'MEDIUM'
                                            ? 'The pull request declares intent or context targeting the issue, but has not been merged into the default branch or lacks an explicit GitHub closing directive.'
                                            : 'The item contains a bare numeric reference without an actionable verb. Bare citations indicate potential relevance but do not confirm intent to solve or supersede.'}
                                        </p>
                                      </div>
                                    )}

                                    {/* Limitations & Caveats */}
                                    {rel.evidenceDetails?.limitations && rel.evidenceDetails.limitations.length > 0 && (
                                      <div className="space-y-1">
                                        <div className="text-[10px] font-mono uppercase tracking-wider text-primary-muted font-semibold">
                                          Limitations & Caveats
                                        </div>
                                        <ul className="list-disc list-inside space-y-0.5 text-primary-muted font-sans text-[11px]">
                                          {rel.evidenceDetails.limitations.map((lim, lIdx) => (
                                            <li key={lIdx}>{lim}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-8 text-center border border-dashed border-border-subtle rounded-md bg-surface-subtle/30 space-y-2">
                          <div className="inline-flex p-2 bg-surface rounded-full border border-border-subtle text-primary-muted mb-1">
                            <Link2 className="w-5 h-5" />
                          </div>
                          <h4 className="text-xs font-semibold text-primary font-mono">
                            Zero Relationships Detected
                          </h4>
                          <p className="text-xs text-primary-secondary max-w-md mx-auto leading-relaxed">
                            No explicit closing keywords (fixes, closes, resolves), citations, or superseding directives were found connecting this item to other ingested records.
                          </p>
                          <p className="text-[11px] text-primary-muted max-w-sm mx-auto font-mono pt-1">
                            Conservative Rule: CodeForensics strictly requires verified textual directives. Shared keywords or title similarities alone never establish relationships.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* SECTION 2: HISTORICAL PRECEDENTS & PRIOR ART */}
                    <div className="space-y-3 pt-5 border-t border-border-subtle">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-semibold text-primary uppercase tracking-wider font-mono flex items-center gap-1.5">
                            <History className="w-3.5 h-3.5 text-accent" />
                            Historical Precedents & Prior Art ({item.historicalPrecedents?.length || 0})
                          </h3>
                        </div>
                        <span className="text-[11px] font-mono text-primary-muted">
                          Multi-Factor Match
                        </span>
                      </div>

                      <p className="text-xs text-primary-secondary leading-relaxed">
                        Past merged changes and closed issues that touched overlapping files, shared subsystem scopes, or matched recurring error signatures.
                      </p>

                      {item.historicalPrecedents && item.historicalPrecedents.length > 0 ? (
                        <div className="space-y-3">
                          {item.historicalPrecedents.map((prec) => {
                            const isPR = prec.targetType === 'PULL_REQUEST';
                            const isMerged = prec.state === 'merged';
                            const isClosed = prec.state === 'closed';

                            return (
                              <div
                                key={prec.id}
                                className="p-4 bg-surface border border-border-subtle rounded-md shadow-xs space-y-3 hover:border-border-strong transition-colors"
                              >
                                <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => onSelectItem && onSelectItem(prec.targetNumber)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-subtle border border-border-subtle text-primary font-semibold hover:border-link hover:text-link transition-colors"
                                      title={prec.targetTitle}
                                    >
                                      {isPR ? <GitPullRequest className="w-3 h-3 text-purple-600" /> : <CircleDot className="w-3 h-3 text-emerald-600" />}
                                      {isPR ? 'PR' : 'Issue'} #{prec.targetNumber}
                                    </button>

                                    {/* Match Reason Tag */}
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                      prec.matchReason === 'SHARED_FILES'
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : prec.matchReason === 'ERROR_KEYWORD'
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : prec.matchReason === 'SUBSYSTEM_SCOPE'
                                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                                        : 'bg-slate-100 text-slate-700 border-slate-300'
                                    }`}>
                                      {prec.matchReason === 'SHARED_FILES' && <Files className="w-3 h-3 text-blue-600" />}
                                      {prec.matchReason === 'ERROR_KEYWORD' && <AlertOctagon className="w-3 h-3 text-rose-600" />}
                                      {prec.matchReason === 'SUBSYSTEM_SCOPE' && <Layers className="w-3 h-3 text-purple-600" />}
                                      {prec.matchReason.replace('_', ' ')}
                                    </span>

                                    {/* State Badge */}
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                                      isMerged
                                        ? 'bg-purple-100/70 text-purple-800'
                                        : isClosed
                                        ? 'bg-slate-100 text-slate-700'
                                        : 'bg-emerald-100/70 text-emerald-800'
                                    }`}>
                                      {prec.state}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                                      prec.confidence === 'HIGH'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}>
                                      {prec.confidence} CONFIDENCE
                                    </span>
                                  </div>
                                </div>

                                {/* Target Title */}
                                <div className="text-xs font-semibold text-primary font-sans">
                                  {prec.targetTitle}
                                </div>

                                {/* Match detail narrative */}
                                <p className="text-xs text-primary-secondary leading-relaxed font-sans">
                                  {prec.matchDetail}
                                </p>

                                {/* Shared Items Pills */}
                                {prec.sharedItems && prec.sharedItems.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {prec.sharedItems.map((itemStr, sIdx) => (
                                      <span
                                        key={sIdx}
                                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-subtle text-primary border border-border-subtle"
                                      >
                                        {itemStr}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Footer metadata & Attach action */}
                                <div className="flex items-center justify-between pt-2 border-t border-border-subtle/60 text-[11px] text-primary-muted font-mono flex-wrap gap-2">
                                  <span>
                                    {prec.author ? `by @${prec.author}` : 'Anonymous'} • {prec.mergedAt ? `Merged ${new Date(prec.mergedAt).toLocaleDateString()}` : `Created ${new Date(prec.createdAt).toLocaleDateString()}`}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const text = `Historical Precedent [${prec.targetType} #${prec.targetNumber}: ${prec.targetTitle}] - ${prec.matchDetail}`;
                                      navigator.clipboard?.writeText(text);
                                      setCopiedPrecedentId(prec.id);
                                      setTimeout(() => setCopiedPrecedentId(null), 2500);
                                    }}
                                    className="inline-flex items-center gap-1 text-[11px] text-link hover:underline font-mono"
                                  >
                                    <BookmarkPlus className="w-3 h-3" />
                                    <span>{copiedPrecedentId === prec.id ? 'Copied Evidence Citation!' : 'Copy Evidence Citation'}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-6 text-center border border-dashed border-border-subtle rounded-md bg-surface-subtle/20 space-y-1.5">
                          <History className="w-4 h-4 text-primary-muted mx-auto" />
                          <div className="text-xs font-mono text-primary font-medium">
                            No Historical Precedents Discovered
                          </div>
                          <p className="text-[11px] text-primary-secondary max-w-sm mx-auto">
                            No earlier pull requests or issues modified identical files or shared this subsystem's conventional scope prefix.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: TIMELINE */}
                {activeTab === 'timeline' && (
                  <div className="space-y-4">
                    {item.timelineAvailable && item.timelineEvents && item.timelineEvents.length > 0 ? (
                      <div className="space-y-3">
                        {item.timelineEvents.map((event) => (
                          <div
                            key={event.id}
                            className="p-3.5 bg-surface border border-border-subtle rounded-md space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs text-primary-muted font-mono">
                              <span className="font-semibold text-primary">
                                {event.author || 'Anonymous'}
                              </span>
                              <span>{new Date(event.createdAt).toLocaleString()}</span>
                            </div>
                            {event.body && (
                              <p className="text-xs text-primary whitespace-pre-wrap leading-relaxed">
                                {event.body}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center border border-dashed border-border-subtle rounded-md bg-surface-subtle/40 space-y-2">
                        <div className="inline-flex p-2 bg-surface rounded-full border border-border-subtle text-primary-muted mb-1">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <h4 className="text-xs font-semibold text-primary font-mono">
                          Timeline History Not Ingested
                        </h4>
                        <p className="text-xs text-primary-secondary max-w-md mx-auto leading-relaxed">
                          {item.timelineNotes ||
                            'Discussion events and review comments were not collected during the initial metadata synchronization tier.'}
                        </p>
                        <div className="pt-2">
                          <a
                            href={item.htmlUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-link hover:underline font-mono"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Inspect full discussion thread on GitHub
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: DIFF */}
                {activeTab === 'diff' && item.type === 'pull_request' && (
                  <div className="space-y-4">
                    {item.diffAvailable && item.diffSummary ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-surface-subtle rounded-md border border-border-subtle flex items-center justify-between text-xs font-mono">
                          <span>
                            {item.diffSummary.changedFiles} changed files
                          </span>
                          <span className="flex items-center gap-3">
                            <span className="text-emerald-700 font-semibold">
                              +{item.diffSummary.additions}
                            </span>
                            <span className="text-rose-700 font-semibold">
                              -{item.diffSummary.deletions}
                            </span>
                          </span>
                        </div>

                        {item.diffSummary.files.map((file, idx) => (
                          <div
                            key={idx}
                            className="border border-border-subtle rounded-md overflow-hidden bg-surface"
                          >
                            <div className="p-2.5 bg-surface-subtle/60 border-b border-border-subtle flex items-center justify-between text-xs font-mono">
                              <span className="font-semibold text-primary truncate max-w-md">
                                {file.filename}
                              </span>
                              <span className="text-primary-muted flex items-center gap-2">
                                <span className="text-emerald-700">+{file.additions}</span>
                                <span className="text-rose-700">-{file.deletions}</span>
                              </span>
                            </div>
                            {file.patch && (
                              <pre className="p-3 bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto whitespace-pre leading-tight">
                                {file.patch}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center border border-dashed border-border-subtle rounded-md bg-surface-subtle/40 space-y-2">
                        <div className="inline-flex p-2 bg-surface rounded-full border border-border-subtle text-primary-muted mb-1">
                          <FileCode className="w-5 h-5" />
                        </div>
                        <h4 className="text-xs font-semibold text-primary font-mono">
                          Diff Content Not Ingested
                        </h4>
                        <p className="text-xs text-primary-secondary max-w-md mx-auto leading-relaxed">
                          {item.diffNotes ||
                            'Code patch diffs and per-file changes were not collected in the initial repository metadata synchronization tier.'}
                        </p>
                        <div className="pt-2">
                          <a
                            href={`${item.htmlUrl}/files`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-link hover:underline font-mono"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View pull request file changes on GitHub
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border-subtle bg-surface-subtle/40 flex items-center justify-between">
            <span className="text-xs text-primary-muted font-mono">
              Press <kbd className="px-1.5 py-0.5 bg-surface border border-border-subtle rounded text-[10px]">Esc</kbd> to close
            </span>
            <Button size="sm" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
