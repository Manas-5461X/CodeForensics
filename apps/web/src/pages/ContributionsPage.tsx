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
  Calculator,
  CheckCircle2,
  GitPullRequest,
} from 'lucide-react';

export function ContributionsPage() {
  const { activeRepo, syncState, triggerSync, isSyncing, isLoadingRepos } = useRepository();
  const { get } = useApiClient();

  const [analysisResult, setAnalysisResult] = useState<ContributionAnalysisResult | null>(null);
  const [candidateIssues, setCandidateIssues] = useState<WorkItemSummary[]>([]);
  const [selectedItemNumber, setSelectedItemNumber] = useState<number | undefined>(undefined);
  const [selectedSubsystem, setSelectedSubsystem] = useState<string>('all');
  const [itemSearchInput, setItemSearchInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedContributor, setExpandedContributor] = useState<string | null>(null);
  const [showFormula, setShowFormula] = useState<boolean>(true);

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

  if (isLoadingRepos && !activeRepo) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="p-10 border border-border-strong rounded-2xl bg-surface shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent mx-auto animate-pulse">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-primary">Restoring Contribution Intelligence</h3>
            <p className="text-xs text-primary-secondary max-w-md mx-auto leading-relaxed">
              Connecting to repository synchronization and restoring authorship statistics...
            </p>
          </div>
          <div className="max-w-xs mx-auto pt-2">
            <div className="h-1.5 w-full bg-surface-subtle rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-primary tracking-tight">
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

        <div className="flex items-center gap-2 self-start sm:self-auto">
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
      <Panel className="p-3.5 sm:p-4 bg-surface-subtle/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Target Issue Search */}
          <form onSubmit={handleApplyItemSearch} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-primary-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Target Issue or PR number (e.g. 28719)..."
                value={itemSearchInput}
                onChange={(e) => setItemSearchInput(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface border border-border-strong rounded-md text-primary placeholder:text-primary-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" type="submit" variant="secondary" className="flex-1 sm:flex-initial justify-center">
                Set Target
              </Button>
              {selectedItemNumber !== undefined && (
                <Button size="sm" variant="ghost" onClick={handleClearTarget} className="flex-1 sm:flex-initial justify-center">
                  Clear
                </Button>
              )}
            </div>
          </form>

          {/* Subsystem Quick Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs no-scrollbar">
            <span className="text-primary-muted font-medium shrink-0">Subsystem:</span>
            {['all', 'devtools', 'reconciler', 'compiler', 'react-dom'].map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setSelectedSubsystem(sub)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors border shrink-0 ${
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

      {/* Forensic Scoring Metric & Formula Card */}
      <Panel className="p-4 sm:p-5 border-accent/30 bg-accent/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-accent/10 border border-accent/30 flex items-center justify-center text-accent shrink-0">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-primary">Forensic Routing Metric & Scoring Formula</h3>
                <Badge category="FACT">Deterministic 0–100</Badge>
              </div>
              <p className="text-xs text-primary-secondary mt-0.5">
                Multi-signal algorithm prioritizing proven domain verification and issue resolution over raw commit volume.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowFormula((prev) => !prev)}
            className="self-start sm:self-auto text-xs shrink-0"
          >
            {showFormula ? (
              <>Hide Formula <ChevronUp className="w-3.5 h-3.5 ml-1" /></>
            ) : (
              <>View Formula & Breakdown <ChevronDown className="w-3.5 h-3.5 ml-1" /></>
            )}
          </Button>
        </div>

        {showFormula && (
          <div className="mt-4 pt-4 border-t border-border-subtle space-y-4">
            {/* Mathematical Formula Box */}
            <div className="bg-surface p-3 sm:p-3.5 rounded border border-border-subtle font-mono text-xs flex flex-col md:flex-row md:items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-primary-muted font-bold">FORMULA:</span>
                <span className="text-accent font-bold">Score</span>
                <span className="text-primary-secondary">=</span>
                <span className="text-primary">min(100,</span>
                <span className="text-purple-600 dark:text-purple-400 font-semibold">S_resolution</span>
                <span className="text-primary-secondary">+</span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold">S_domain</span>
                <span className="text-primary-secondary">+</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">S_volume</span>
                <span className="text-primary-secondary">+</span>
                <span className="text-amber-600 dark:text-amber-400 font-semibold">S_recency</span>
                <span className="text-primary">)</span>
              </div>
              <div className="text-[11px] text-primary-muted shrink-0">
                Logarithmic dampening active
              </div>
            </div>

            {/* 4 Dimension Weights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded bg-surface border border-border-subtle space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Resolution Impact
                  </span>
                  <span className="text-xs font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded">
                    +25 to +35 pts
                  </span>
                </div>
                <div className="text-[11px] text-primary-secondary leading-snug">
                  <strong>Direct Fix (+35)</strong> for target issue, or <strong>Verified Fixes (+25)</strong> for proven track record of closing repository issues.
                </div>
              </div>

              <div className="p-3 rounded bg-surface border border-border-subtle space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <FolderGit2 className="w-3.5 h-3.5" /> Domain Expertise
                  </span>
                  <span className="text-xs font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
                    +15 to +30 pts
                  </span>
                </div>
                <div className="text-[11px] text-primary-secondary leading-snug">
                  <strong>Subsystem Expertise (+30)</strong> in target module (e.g. <code>compiler</code>), or <strong>Breadth (+15)</strong> across multiple subsystems.
                </div>
              </div>

              <div className="p-3 rounded bg-surface border border-border-subtle space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <GitPullRequest className="w-3.5 h-3.5" /> Merged PR Volume
                  </span>
                  <span className="text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                    up to +35 pts
                  </span>
                </div>
                <div className="text-[11px] text-primary-secondary leading-snug">
                  Log-dampened frequency: <code>35 × log2(1+N)/log2(1+8)</code>. Prevents high-volume cosmetic PRs from drowning out genuine technical depth.
                </div>
              </div>

              <div className="p-3 rounded bg-surface border border-border-subtle space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Recency & Decay
                  </span>
                  <span className="text-xs font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">
                    up to +20 pts
                  </span>
                </div>
                <div className="text-[11px] text-primary-secondary leading-snug">
                  Immediate 0–30d (<strong>+20</strong>), High 31–90d (<strong>+15</strong>), Moderate 91–180d (<strong>+8</strong>), Historical &gt;180d (<strong>0</strong>).
                </div>
              </div>
            </div>
          </div>
        )}
      </Panel>

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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Rank, Avatar, Login, Badges */}
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-7 h-7 rounded bg-surface-subtle border border-border-subtle flex items-center justify-center font-mono font-bold text-xs text-accent shrink-0 mt-0.5 sm:mt-0">
                        #{rec.rank}
                      </div>

                      <img
                        src={rec.avatarUrl || `https://github.com/${rec.login}.png?size=64`}
                        alt={rec.login}
                        className="w-8 h-8 rounded-full border border-border-subtle bg-surface-subtle shrink-0 mt-0.5 sm:mt-0"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />

                      <div className="space-y-0.5 min-w-0">
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
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-subtle/60">
                      <div className="text-left sm:text-right">
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
                        className="p-1.5 text-primary-muted hover:text-primary rounded border border-border-subtle hover:border-border-strong transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
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
