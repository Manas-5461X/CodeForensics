import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Panel } from '../components/ui/Panel.js';
import { Button } from '../components/ui/Button.js';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton.js';
import { useRepository } from '../context/RepositoryContext.js';
import { useApiClient } from '../utils/apiClient.js';
import type { KnowledgeLossSummary } from '@codeforensics/shared';
import {
  ShieldAlert,
  Flame,
  AlertTriangle,
  FolderGit2,
  RefreshCw,
  Code2,
  HelpCircle,
} from 'lucide-react';

export function BusFactorPage() {
  const { activeRepo, isLoadingRepos } = useRepository();
  const { get } = useApiClient();
  const navigate = useNavigate();

  const [knowledgeData, setKnowledgeData] = useState<KnowledgeLossSummary | null>(null);
  const [filter, setFilter] = useState<'all' | 'zombie' | 'critical'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadKnowledge = () => {
    if (!activeRepo) return;
    setIsLoading(true);
    setError(null);
    get<KnowledgeLossSummary>(
      `/api/v1/repositories/${encodeURIComponent(activeRepo.owner)}/${encodeURIComponent(activeRepo.name)}/map/knowledge-loss`
    )
      .then((res) => {
        if (res.success && res.data) {
          setKnowledgeData(res.data);
        } else {
          setError(res.error?.message || 'Failed to analyze bus factor and knowledge loss risks');
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Network error loading bus factor data');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadKnowledge();
  }, [activeRepo?.owner, activeRepo?.name]);

  if (isLoadingRepos && !activeRepo) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="p-10 border border-border-strong rounded-2xl bg-surface shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent mx-auto animate-pulse">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-primary">Restoring Bus Factor Intelligence</h3>
            <p className="text-xs text-primary-secondary max-w-md mx-auto leading-relaxed">
              Connecting to repository synchronization and restoring maintainer risk telemetry...
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
          <ShieldAlert className="w-10 h-10 text-primary-muted mx-auto" />
          <h3 className="text-base font-semibold text-primary">No Repository Selected</h3>
          <p className="text-xs text-primary-secondary max-w-sm mx-auto">
            Select a synchronized repository to calculate bus factors, evaluate maintainer dormancy, and highlight Zombie Hotspots.
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

  const filteredItems = (knowledgeData?.riskItems || []).filter((item) => {
    if (filter === 'zombie') return item.isZombieHotspot;
    if (filter === 'critical') return item.riskLevel === 'CRITICAL' || item.riskLevel === 'HIGH';
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
              Bus Factor & Knowledge Loss Heatmap
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border border-border-subtle bg-surface-subtle text-primary">
              <FolderGit2 className="w-3 h-3 text-accent mr-0.5" />
              {activeRepo.fullName}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-primary-secondary mt-1 max-w-3xl">
            Correlates code churn velocity with contributor activity to highlight Zombie Hotspots (high-churn files whose authors have left) and single-maintainer vulnerabilities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadKnowledge}
            disabled={isLoading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Recalculate Bus Factors
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
          <Button variant="outline" size="sm" className="mt-3" onClick={loadKnowledge}>
            Retry
          </Button>
        </div>
      ) : knowledgeData ? (
        <>
          {/* Top 4 KPI Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Panel className="p-4 border-rose-500/30">
              <div className="text-[10px] uppercase font-mono tracking-wider text-rose-500 font-semibold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                Zombie Hotspots
              </div>
              <div className="text-2xl font-bold font-mono text-rose-500 mt-1">
                {knowledgeData.zombieHotspotsCount}
              </div>
              <div className="text-xs text-primary-muted mt-0.5">
                High churn, inactive authors
              </div>
            </Panel>

            <Panel className="p-4 border-amber-500/30">
              <div className="text-[10px] uppercase font-mono tracking-wider text-amber-500 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Single-Maintainer
              </div>
              <div className="text-2xl font-bold font-mono text-amber-500 mt-1">
                {knowledgeData.singleMaintainerFilesCount}
              </div>
              <div className="text-xs text-primary-muted mt-0.5">
                Bus Factor = 1 critical files
              </div>
            </Panel>

            <Panel className="p-4">
              <div className="text-[10px] uppercase font-mono tracking-wider text-primary-muted font-semibold">
                Average Bus Factor
              </div>
              <div className="text-2xl font-bold font-mono text-primary mt-1">
                {knowledgeData.averageBusFactor.toFixed(1)}
              </div>
              <div className="text-xs text-primary-muted mt-0.5">
                Active maintainers per module
              </div>
            </Panel>

            <Panel className="p-4">
              <div className="text-[10px] uppercase font-mono tracking-wider text-primary-muted font-semibold">
                Attributed Files
              </div>
              <div className="text-2xl font-bold font-mono text-primary mt-1">
                {knowledgeData.totalAnalyzedFiles}
              </div>
              <div className="text-xs text-primary-muted mt-0.5">
                With verified authorship lineage
              </div>
            </Panel>
          </div>

          {/* Table of At-Risk Files */}
          <Panel className="p-4 space-y-4 font-mono text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                  Knowledge Risk Register:
                </span>
                <span className="text-primary-muted font-normal text-xs">
                  ({filteredItems.length} {filteredItems.length === 1 ? 'file' : 'files'} shown)
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
                  All Files ({knowledgeData.riskItems?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('zombie')}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    filter === 'zombie'
                      ? 'bg-rose-500/15 text-rose-500 border border-rose-500/40 font-bold'
                      : 'bg-surface-subtle text-primary-muted hover:text-primary border border-border-subtle'
                  }`}
                >
                  🧟 Zombie Hotspots ({knowledgeData.zombieHotspotsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('critical')}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    filter === 'critical'
                      ? 'bg-amber-500/15 text-amber-500 border border-amber-500/40 font-bold'
                      : 'bg-surface-subtle text-primary-muted hover:text-primary border border-border-subtle'
                  }`}
                >
                  Critical & High Risk
                </button>
              </div>
            </div>

            <div className="border border-border-subtle rounded-lg overflow-hidden bg-surface">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-subtle border-b border-border-subtle text-primary-muted text-[10px] uppercase">
                      <th className="py-3 px-3.5">File Path</th>
                      <th className="py-3 px-3.5">Risk Tier</th>
                      <th className="py-3 px-3.5">Churn Score</th>
                      <th className="py-3 px-3.5">Primary Author</th>
                      <th className="py-3 px-3.5">Activity Status</th>
                      <th className="py-3 px-3.5">Diagnostic Rationale</th>
                      <th className="py-3 px-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/60">
                    {filteredItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-surface-subtle/60 transition-colors">
                        <td className="py-3 px-3.5 font-semibold text-primary max-w-[240px] truncate" title={item.path}>
                          {item.path}
                        </td>
                        <td className="py-3 px-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.riskLevel === 'CRITICAL'
                                ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                                : item.riskLevel === 'HIGH'
                                ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-primary-muted'
                            }`}
                          >
                            {item.riskLevel}
                          </span>
                        </td>
                        <td className="py-3 px-3.5">
                          <span
                            className={`font-semibold ${
                              item.churnScore >= 65 ? 'text-rose-500' : item.churnScore >= 40 ? 'text-amber-500' : 'text-primary'
                            }`}
                          >
                            {item.churnScore}/100
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-primary-secondary">@{item.primaryMaintainer}</td>
                        <td className="py-3 px-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                              item.maintainerStatus === 'DEPARTED'
                                ? 'bg-rose-500/15 text-rose-500'
                                : item.maintainerStatus === 'DORMANT'
                                ? 'bg-amber-500/15 text-amber-500'
                                : 'bg-emerald-500/15 text-emerald-500'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {item.maintainerStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-primary-secondary max-w-[280px] text-[11px] leading-tight">
                          {item.reason}
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs py-1 px-2.5"
                            onClick={() => navigate(`/app/archaeology?query=${encodeURIComponent(item.path)}`)}
                            leftIcon={<Code2 className="w-3.5 h-3.5 text-accent" />}
                          >
                            Trace AST
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredItems.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-primary-muted">
                          No files match the selected knowledge loss filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Panel>

          {/* Diagnostic Advice */}
          <Panel className="p-4 bg-surface-subtle/30 border-border-subtle space-y-2">
            <h4 className="text-xs font-bold font-mono text-primary flex items-center gap-1.5 uppercase tracking-wider">
              <HelpCircle className="w-3.5 h-3.5 text-accent" />
              What is a Zombie Hotspot?
            </h4>
            <p className="text-xs text-primary-secondary leading-relaxed">
              A <strong>Zombie Hotspot</strong> is a file with a high churn score (≥ 60/100) where 80%+ of original lines were authored by engineers who have left the project or have had zero recent activity. When incoming developers modify these files without institutional knowledge, regressions and boundary breaches occur at 3x the normal rate.
            </p>
          </Panel>
        </>
      ) : null}
    </div>
  );
}
export default BusFactorPage;
