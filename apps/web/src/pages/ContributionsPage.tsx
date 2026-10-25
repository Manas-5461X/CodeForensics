import React, { useState, useEffect, useCallback } from 'react';
import { Panel } from '../components/ui/Panel.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton.js';
import { useRepository } from '../context/RepositoryContext.js';
import { useApiClient } from '../utils/apiClient.js';
import type {
  ContributionAnalysisResult,
  WorkItemSummary,
  PaginatedResult,
} from '@codeforensics/shared';
import {
  Users,
  Search,
  ExternalLink,
  AlertTriangle,
  Clock,
  Award,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  HelpCircle,
  FolderGit2,
  ShieldAlert,
} from 'lucide-react';

export function ContributionsPage() {
  const { activeRepo, syncState, triggerSync, isSyncing } = useRepository();
  const { get } = useApiClient();

  const [analysisResult, setAnalysisResult] = useState<ContributionAnalysisResult | null>(null);
  const [candidateIssues, setCandidateIssues] = useState<WorkItemSummary[]>([]);
  const [selectedItemNumber, setSelectedItemNumber] = useState<number | undefined>(undefined);
  const [selectedSubsystem, setSelectedSubsystem] = useState<string>('all');
  const [itemSearchInput, setItemSearchInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedContributor, setExpandedContributor] = useState<string | null>(null);

  // 1. Fetch available open issues for target selection
  const fetchCandidateIssues = useCallback(async () => {
    if (!activeRepo) return;
    try {
      const res = await get<PaginatedResult<WorkItemSummary>>(
        `/api/v1/repositories/${activeRepo.owner}/${activeRepo.name}/items`,
        { type: 'issue', state: 'open', limit: 20 }
      );
      if (res.data?.items) {
        setCandidateIssues(res.data.items);
      }
    } catch {
      // In offline or testing mode, candidate issues may be empty
    }
  }, [activeRepo, get]);

  // 2. Fetch contributor recommendations and risk analysis
  const fetchRecommendations = useCallback(async () => {
    if (!activeRepo) return;
    setIsLoading(true);
    setError(null);

    try {
      const params: Record<string, string | number | undefined> = {};
      if (selectedItemNumber !== undefined) {
        params.itemNumber = selectedItemNumber;
      }
      if (selectedSubsystem !== 'all') {
        params.subsystem = selectedSubsystem;
      }

      const res = await get<ContributionAnalysisResult>(
        `/api/v1/repositories/${activeRepo.owner}/${activeRepo.name}/contributors/recommendations`,
        params
      );

      if (res.data) {
        setAnalysisResult(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to query contributor recommendations.');
    } finally {
      setIsLoading(false);
    }
  }, [activeRepo, selectedItemNumber, selectedSubsystem, get]);

  useEffect(() => {
    if (activeRepo) {
      fetchCandidateIssues();
      fetchRecommendations();
    }
  }, [activeRepo, fetchCandidateIssues, fetchRecommendations]);

  const handleSelectIssue = (num: number) => {
    setSelectedItemNumber(num);
    setItemSearchInput(String(num));
  };

  const handleClearTarget = () => {
    setSelectedItemNumber(undefined);
    setItemSearchInput('');
  };

  const handleApplyItemSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(itemSearchInput.trim().replace(/^#/, ''), 10);
    if (!isNaN(parsed) && parsed > 0) {
      setSelectedItemNumber(parsed);
    } else if (itemSearchInput.trim() === '') {
      setSelectedItemNumber(undefined);
    }
  };

  // If no repository is selected
  if (!activeRepo) {
    return (
      <EmptyState
        icon={<FolderGit2 className="w-8 h-8 text-primary-muted" />}
        title="No Repository Selected"
        description="Select a tracked GitHub repository from the top navigation to analyze contributor activity and maintenance risks."
      />
    );
  }

  // If repository has not completed synchronization
  const isUnsynced = !syncState || syncState.status === 'IDLE';
  if (isUnsynced) {
    return (
      <EmptyState
        icon={<RefreshCw className="w-8 h-8 text-accent" />}
        title="Repository Not Synchronized"
        description="Contributor intelligence and ownership risk analysis require ingested pull request and issue records."
        action={
          <Button
            size="sm"
            onClick={() => triggerSync()}
            disabled={isSyncing}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />}
          >
            {isSyncing ? 'Synchronizing...' : 'Start Synchronization'}
          </Button>
        }
      />
    );
  }

  const recommendations = analysisResult?.recommendations || [];
  const maintenanceRisks = analysisResult?.maintenanceRisks || [];
  const targetItem = analysisResult?.targetItem;

  return (
    <div className="space-y-6">
      {/* Header and Scope Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-primary tracking-tight">
              Contribution Finder
            </h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-subtle border border-border-subtle text-primary-muted">
              {activeRepo.fullName}
            </span>
          </div>
          <p className="text-xs text-primary-secondary mt-1">
            Deterministic, evidence-backed contributor discovery, subsystem ownership signals, and maintenance risks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchRecommendations()}
            disabled={isLoading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Target Item & Subsystem Filter Bar */}
      <Panel className="p-4 bg-surface-subtle/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Target Issue Search */}
          <form onSubmit={handleApplyItemSearch} className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-primary-muted" />
              <input
                type="text"
                placeholder="Target Issue or PR number (e.g. 28719)..."
                value={itemSearchInput}
                onChange={(e) => setItemSearchInput(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface border border-border-strong rounded-md text-primary placeholder:text-primary-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </div>
            <Button size="sm" type="submit" variant="secondary">
              Set Target
            </Button>
            {selectedItemNumber !== undefined && (
              <Button size="sm" variant="ghost" onClick={handleClearTarget}>
                Clear
              </Button>
            )}
          </form>

          {/* Subsystem Quick Filter */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-primary-muted font-medium">Subsystem:</span>
            {['all', 'devtools', 'reconciler', 'compiler', 'react-dom'].map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setSelectedSubsystem(sub)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors border ${
                  selectedSubsystem === sub
                    ? 'bg-accent/15 border-accent text-accent font-semibold'
                    : 'bg-surface border-border-subtle text-primary-secondary hover:border-border-strong'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Target Summary */}
        {targetItem && (
          <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-accent">Target Item:</span>
              <span className="font-mono text-primary font-semibold">#{targetItem.number}</span>
              <span className="text-primary truncate max-w-md">{targetItem.title}</span>
              {targetItem.subsystem && (
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface border border-border-subtle text-accent">
                  Subsystem: {targetItem.subsystem}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleClearTarget}
              className="text-primary-muted hover:text-primary underline text-xs shrink-0"
            >
              Reset Target
            </button>
          </div>
        )}
      </Panel>

      {/* Maintenance & Ownership Risks Section */}
      {maintenanceRisks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#b45309]" />
            <h2 className="text-xs font-bold text-primary uppercase tracking-wider">
              Subsystem Maintenance & Ownership Risks
            </h2>
            <span className="text-xs font-mono text-primary-muted">
              ({maintenanceRisks.length} signal{maintenanceRisks.length > 1 ? 's' : ''})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {maintenanceRisks.map((risk, idx) => {
              const isHigh = risk.severity === 'HIGH';
              return (
                <Panel
                  key={`risk-${idx}`}
                  className={`p-3.5 border ${
                    isHigh
                      ? 'border-[#fecdd3] bg-[#fff1f2]/20'
                      : 'border-[#fde68a] bg-[#fffbeb]/20'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isHigh ? 'text-[#be123c]' : 'text-[#b45309]'
                          }`}
                        />
                        <span className="font-mono text-xs font-bold text-primary">
                          {risk.subsystem}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase font-bold ${
                          isHigh
                            ? 'bg-[#ffe4e6] text-[#be123c] border-[#fecdd3]'
                            : 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]'
                        }`}
                      >
                        {risk.severity} RISK
                      </span>
                    </div>

                    <h3 className="text-xs font-semibold text-primary">{risk.title}</h3>
                    <p className="text-xs text-primary-secondary leading-relaxed">
                      {risk.description}
                    </p>

                    {risk.recommendationHint && (
                      <p className="text-[11px] text-primary-muted italic pt-1">
                        Recommendation: {risk.recommendationHint}
                      </p>
                    )}
                  </div>
                </Panel>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Recommendations List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" />
            <h2 className="text-xs font-bold text-primary uppercase tracking-wider">
              Recommended Contributors
            </h2>
            {recommendations.length > 0 && (
              <span className="text-xs font-mono text-primary-muted">
                (Ranked 1 to {recommendations.length})
              </span>
            )}
          </div>

          <div className="text-[11px] text-primary-muted">
            Deterministic ranking with volume dampening
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <LoadingSkeleton className="h-28 w-full" />
            <LoadingSkeleton className="h-28 w-full" />
            <LoadingSkeleton className="h-28 w-full" />
          </div>
        ) : error ? (
          <Panel className="p-6 text-center border-red-200 bg-red-50/20">
            <p className="text-xs text-red-600 font-medium">{error}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => fetchRecommendations()}>
              Retry Query
            </Button>
          </Panel>
        ) : recommendations.length === 0 ? (
          <EmptyState
            icon={<Users className="w-8 h-8 text-primary-muted" />}
            title="No Contributor Matches Found"
            description="No contributors with merged pull requests or activity matching the current filter criteria were found."
            action={
              <Button size="sm" variant="outline" onClick={handleClearTarget}>
                Reset Filter to All
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {recommendations.map((rec) => {
              const isExpanded = expandedContributor === rec.login;

              return (
                <Panel
                  key={rec.login}
                  className="p-4 hover:border-border-strong transition-colors space-y-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Left: Rank, Avatar, Login, Badges */}
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded bg-surface-subtle border border-border-subtle flex items-center justify-center font-mono font-bold text-xs text-accent shrink-0">
                        #{rec.rank}
                      </div>

                      <img
                        src={rec.avatarUrl || `https://github.com/${rec.login}.png?size=64`}
                        alt={rec.login}
                        className="w-8 h-8 rounded-full border border-border-subtle bg-surface-subtle shrink-0"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm text-primary">
                            @{rec.login}
                          </span>

                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-semibold ${
                              rec.experienceTier === 'PRIMARY_MAINTAINER'
                                ? 'bg-accent/10 text-accent border-accent/40'
                                : rec.experienceTier === 'ACTIVE_CONTRIBUTOR'
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                : rec.experienceTier === 'HISTORICAL_CONTRIBUTOR'
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                                : 'bg-surface-subtle text-primary-muted border-border-subtle'
                            }`}
                          >
                            {rec.experienceTier.replace('_', ' ')}
                          </span>

                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                              rec.recencySignal === 'RECENT'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : rec.recencySignal === 'STALE'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                : 'bg-surface-subtle text-primary-muted border-border-subtle'
                            }`}
                          >
                            {rec.recencySignal}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-primary-muted">
                          <Clock className="w-3 h-3" />
                          <span>
                            Last Active:{' '}
                            {rec.lastActiveAt
                              ? new Date(rec.lastActiveAt).toISOString().split('T')[0]
                              : 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Score Gauge & GitHub Link */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="font-mono font-bold text-sm text-accent">
                          Score: {rec.normalizedScore}
                          <span className="text-primary-muted text-xs">/100</span>
                        </div>
                        <div className="w-24 h-1.5 bg-surface-subtle border border-border-subtle rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-accent transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(5, rec.normalizedScore))}%` }}
                          />
                        </div>
                      </div>

                      <a
                        href={`https://github.com/${rec.login}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-primary-muted hover:text-primary rounded border border-border-subtle hover:border-border-strong transition-colors"
                        title="Open GitHub Profile"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Why Recommended: Signals Breakdown */}
                  <div className="p-3 bg-surface-subtle/40 rounded border border-border-subtle space-y-2 text-xs">
                    <div className="font-semibold text-primary flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-accent" />
                        Why Recommended:
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedContributor(isExpanded ? null : rec.login)
                        }
                        className="text-primary-muted hover:text-primary flex items-center gap-1 text-[11px] font-mono"
                      >
                        {isExpanded ? (
                          <>
                            Hide Items <ChevronUp className="w-3 h-3" />
                          </>
                        ) : (
                          <>
                            View Relevant Items ({rec.relevantWorkItems.length}){' '}
                            <ChevronDown className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5 pt-1">
                      {rec.signals.map((sig, sIdx) => (
                        <div key={`sig-${sIdx}`} className="flex items-start gap-2 text-primary-secondary">
                          <span className="font-mono text-[11px] font-bold text-accent shrink-0 pt-0.5">
                            +{sig.weight}
                          </span>
                          <div>
                            <strong className="text-primary font-medium">{sig.label}:</strong>{' '}
                            {sig.description}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Expandable Relevant Items */}
                    {isExpanded && rec.relevantWorkItems.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border-subtle space-y-1.5">
                        <div className="text-[11px] font-mono font-bold text-primary-muted uppercase">
                          Recent Authored Work in this Subsystem:
                        </div>
                        <div className="space-y-1">
                          {rec.relevantWorkItems.map((item) => (
                            <div
                              key={`${item.type}-${item.number}`}
                              className="flex items-center justify-between gap-2 p-1.5 rounded bg-surface border border-border-subtle text-xs"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="font-mono font-bold text-primary">
                                  #{item.number}
                                </span>
                                <span className="text-primary truncate">{item.title}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border uppercase text-primary-muted bg-surface-subtle">
                                  {item.merged ? 'MERGED' : item.state}
                                </span>
                                <a
                                  href={`https://github.com/${activeRepo.owner}/${activeRepo.name}/${
                                    item.type === 'pull_request' ? 'pull' : 'issues'
                                  }/${item.number}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary-muted hover:text-primary"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Data Limitations Caveat */}
                    {rec.limitations.length > 0 && (
                      <div className="pt-2 text-[11px] text-primary-muted flex items-start gap-1.5">
                        <HelpCircle className="w-3 h-3 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-medium">Data Coverage Note:</strong>{' '}
                          {rec.limitations.join(' ')}
                        </div>
                      </div>
                    )}
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
      </div>

      {/* Actionable Open Opportunities Section (Connected to Contributor Finder) */}
      <div className="space-y-3 pt-4 border-t border-border-subtle">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xs font-bold text-primary uppercase tracking-wider">
              Actionable Open Opportunities
            </h2>
            <p className="text-xs text-primary-secondary mt-0.5">
              Select an open issue below to identify the most relevant contributors and ownership risks for that problem.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {candidateIssues.slice(0, 4).map((issue) => {
            const isSelected = selectedItemNumber === issue.number;
            return (
              <Panel
                key={issue.id}
                className={`p-3.5 transition-colors border ${
                  isSelected
                    ? 'border-accent bg-accent/5'
                    : 'hover:border-border-strong bg-surface'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-primary">
                        #{issue.number}
                      </span>
                      <Badge category="INFERENCE">OPPORTUNITY</Badge>
                    </div>
                    {isSelected ? (
                      <span className="text-[11px] font-mono font-bold text-accent">
                        Currently Target
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSelectIssue(issue.number)}
                      >
                        Find Contributors
                      </Button>
                    )}
                  </div>

                  <h3 className="text-xs font-semibold text-primary truncate">
                    {issue.title}
                  </h3>

                  <div className="flex items-center gap-2 text-[11px] text-primary-muted">
                    <span className="font-mono">
                      Labels: {issue.labels.length > 0 ? issue.labels.join(', ') : 'None'}
                    </span>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      </div>
    </div>
  );
}
