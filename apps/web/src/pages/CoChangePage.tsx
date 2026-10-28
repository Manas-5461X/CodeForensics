import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Panel } from '../components/ui/Panel.js';
import { Button } from '../components/ui/Button.js';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton.js';
import { useRepository } from '../context/RepositoryContext.js';
import { useApiClient } from '../utils/apiClient.js';
import type { CoChangeReport } from '@codeforensics/shared';
import {
  GitMerge,
  AlertTriangle,
  Zap,
  FolderGit2,
  RefreshCw,
  Compass,
} from 'lucide-react';

export function CoChangePage() {
  const { activeRepo, isLoadingRepos } = useRepository();
  const { get } = useApiClient();
  const navigate = useNavigate();

  const [coChangeReport, setCoChangeReport] = useState<CoChangeReport | null>(null);
  const [filter, setFilter] = useState<'all' | 'cross' | 'high'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadCoChange = () => {
    if (!activeRepo) return;
    setIsLoading(true);
    setError(null);
    get<CoChangeReport>(
      `/api/v1/repositories/${encodeURIComponent(activeRepo.owner)}/${encodeURIComponent(activeRepo.name)}/map/co-change`
    )
      .then((res) => {
        if (res.success && res.data) {
          setCoChangeReport(res.data);
        } else {
          setError(res.error?.message || 'Failed to analyze co-change coupling matrix');
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Network error loading co-change matrix');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadCoChange();
  }, [activeRepo?.owner, activeRepo?.name]);

  if (isLoadingRepos && !activeRepo) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="p-10 border border-border-strong rounded-2xl bg-surface shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent mx-auto animate-pulse">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-primary">Restoring Co-Change Matrix</h3>
            <p className="text-xs text-primary-secondary max-w-md mx-auto leading-relaxed">
              Connecting to repository synchronization and restoring coupling telemetry...
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

  if (!activeRepo) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 text-center">
        <div className="p-8 border border-dashed border-border-strong rounded-xl bg-surface-subtle/30 space-y-3">
          <GitMerge className="w-10 h-10 text-primary-muted mx-auto" />
          <h3 className="text-base font-semibold text-primary">No Repository Selected</h3>
          <p className="text-xs text-primary-secondary max-w-sm mx-auto">
            Select a synchronized repository to analyze temporal co-change frequencies and architectural coupling leaks.
          </p>
          <Link to="/app" className="inline-block mt-2">
            <Button size="sm" variant="primary">
              Return to Repository Overview
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const filteredPairs = (coChangeReport?.pairs || []).filter((pair) => {
    if (filter === 'cross') return pair.crossSubsystem;
    if (filter === 'high') return pair.couplingPercentage >= 70;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
              Temporal Co-Change & Coupling Matrix
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border border-border-subtle bg-surface-subtle text-primary">
              <FolderGit2 className="w-3 h-3 text-accent mr-0.5" />
              {activeRepo.fullName}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-primary-secondary mt-1 max-w-3xl">
            Detects files that frequently modify together across pull requests. Uncovers hidden architectural leaks, cross-subsystem coupling, and forgotten file revisions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadCoChange}
            disabled={isLoading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh Coupling Analysis
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 space-y-4">
          <LoadingSkeleton className="h-6 w-1/4" />
          <LoadingSkeleton className="h-24 w-full" />
          <LoadingSkeleton className="h-64 w-full" />
        </div>
      ) : error ? (
        <div className="p-6 text-center text-rose-600 font-mono text-xs border border-rose-200 rounded-lg bg-surface">
          <p>{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={loadCoChange}>
            Retry
          </Button>
        </div>
      ) : coChangeReport ? (
        <>
          {/* Top KPI Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Panel className="p-4">
              <div className="text-[10px] uppercase font-mono tracking-wider text-primary-muted font-semibold">
                Total Coupled File Pairs
              </div>
              <div className="text-2xl font-bold font-mono text-primary mt-1">
                {coChangeReport.totalCoupledPairs}
              </div>
              <div className="text-xs text-primary-muted mt-0.5">
                Analyzed across historical pull request batches
              </div>
            </Panel>

            <Panel className="p-4 border-rose-500/30">
              <div className="text-[10px] uppercase font-mono tracking-wider text-rose-500 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                Cross-Subsystem Leaks
              </div>
              <div className="text-2xl font-bold font-mono text-rose-500 mt-1">
                {coChangeReport.crossSubsystemPairsCount}
              </div>
              <div className="text-xs text-primary-muted mt-0.5">
                Pairs breaching root architectural boundaries
              </div>
            </Panel>

            <Panel className="p-4">
              <div className="text-[10px] uppercase font-mono tracking-wider text-primary-muted font-semibold">
                Peak Coupling Strength
              </div>
              <div className="text-2xl font-bold font-mono text-accent mt-1">
                {Math.max(...(coChangeReport.pairs?.map((p) => p.couplingPercentage) || [0]))}%
              </div>
              <div className="text-xs text-primary-muted mt-0.5">
                Highest co-occurrence probability in merged PRs
              </div>
            </Panel>
          </div>

          {/* Filter Bar & Table */}
          <Panel className="p-4 space-y-4 font-mono text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                  Coupling Pairs Filter:
                </span>
                <span className="text-primary-muted font-normal text-xs">
                  ({filteredPairs.length} {filteredPairs.length === 1 ? 'pair' : 'pairs'} shown)
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    filter === 'all'
                      ? 'bg-accent/15 text-accent border border-accent/40 font-bold'
                      : 'bg-surface-subtle text-primary-muted hover:text-primary border border-border-subtle'
                  }`}
                >
                  All Pairs ({coChangeReport.pairs?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('cross')}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    filter === 'cross'
                      ? 'bg-rose-500/15 text-rose-500 border border-rose-500/40 font-bold'
                      : 'bg-surface-subtle text-primary-muted hover:text-primary border border-border-subtle'
                  }`}
                >
                  Cross-Subsystem ({coChangeReport.crossSubsystemPairsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('high')}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    filter === 'high'
                      ? 'bg-amber-500/15 text-amber-500 border border-amber-500/40 font-bold'
                      : 'bg-surface-subtle text-primary-muted hover:text-primary border border-border-subtle'
                  }`}
                >
                  Coupling ≥ 70%
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="border border-border-subtle rounded-lg overflow-hidden bg-surface">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-subtle border-b border-border-subtle text-primary-muted text-[10px] uppercase">
                      <th className="py-3 px-3.5">Primary / Source File</th>
                      <th className="py-3 px-3.5">Coupled Companion File</th>
                      <th className="py-3 px-3.5">Coupling Probability</th>
                      <th className="py-3 px-3.5">Shared PRs</th>
                      <th className="py-3 px-3.5">Boundary Classification</th>
                      <th className="py-3 px-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/60">
                    {filteredPairs.map((pair, idx) => (
                      <tr key={idx} className="hover:bg-surface-subtle/60 transition-colors">
                        <td className="py-3 px-3.5 font-semibold text-primary max-w-[240px] truncate" title={pair.sourceFile}>
                          {pair.sourceFile}
                        </td>
                        <td className="py-3 px-3.5 text-primary-secondary max-w-[240px] truncate" title={pair.targetFile}>
                          {pair.targetFile}
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  pair.couplingPercentage >= 80
                                    ? 'bg-rose-500'
                                    : pair.couplingPercentage >= 65
                                    ? 'bg-amber-500'
                                    : 'bg-accent'
                                }`}
                                style={{ width: `${pair.couplingPercentage}%` }}
                              />
                            </div>
                            <span className="font-bold text-xs text-primary">{pair.couplingPercentage}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-primary-muted">{pair.coChangeCount} PRs</td>
                        <td className="py-3 px-3.5">
                          {pair.crossSubsystem ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-semibold">
                              <AlertTriangle className="w-3 h-3" />
                              Cross-Subsystem Leak
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-primary-muted border border-border-subtle">
                              Intra-Module
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs py-1 px-2.5"
                            onClick={() => {
                              navigate(`/app/blast-radius?target=${encodeURIComponent(pair.sourceFile)}`);
                            }}
                            leftIcon={<Zap className="w-3.5 h-3.5 text-amber-500" />}
                          >
                            Simulate Blast
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredPairs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-primary-muted">
                          No co-change pairs match the selected filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Panel>

          {/* Forensic Methodology Explanation Card */}
          <Panel className="p-4 bg-surface-subtle/30 border-border-subtle space-y-2">
            <h4 className="text-xs font-bold font-mono text-primary flex items-center gap-1.5 uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5 text-accent" />
              How Temporal Co-Change is Computed
            </h4>
            <p className="text-xs text-primary-secondary leading-relaxed">
              Temporal Co-Change measures the mathematical Jaccard similarity of file modifications across historical pull request batches. When modifying File A almost always coincides with editing File B (even across different directories), it signals tight logical coupling, shared implicit contracts, or potential architectural leaks that a developer might overlook during a pull request review.
            </p>
          </Panel>
        </>
      ) : null}
    </div>
  );
}
export default CoChangePage;
