import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Panel } from '../components/ui/Panel.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import {
  CheckCircle2,
  AlertCircle,
  FileSearch,
  ArrowRight,
  ShieldAlert,
  RefreshCw,
  FolderGit2,
  Link2,
  Compass,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRepository } from '../context/RepositoryContext.js';
import { useApiClient } from '../utils/apiClient.js';
import { RepositorySelectModal } from '../components/repository/RepositorySelectModal.js';
import type { RelationshipInfo } from '@codeforensics/shared';

export function OverviewPage() {
  const { activeRepo, syncState, isSyncing, triggerSync, syncError } = useRepository();
  const { get } = useApiClient();
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);

  const repoTitle = activeRepo?.fullName || 'No Repository Selected';
  const repoDesc =
    activeRepo?.description ||
    (activeRepo
      ? `Default branch '${activeRepo.defaultBranch}' • Tracked in CodeForensics`
      : 'Select or track an authorized repository to begin forensic sync.');

  const issuesCount = syncState?.issuesCount ?? 0;
  const prsCount = syncState?.prsCount ?? 0;
  const syncStatus = syncState?.status || 'IDLE';
  const currentProgress = syncState?.progress ?? (syncStatus === 'COMPLETED' ? 100 : 0);

  // Fetch real evidence-backed relationships for active repository
  const {
    data: relationships = [],
    isLoading: isLoadingRelationships,
  } = useQuery({
    queryKey: ['repositoryRelationships', activeRepo?.owner, activeRepo?.name],
    queryFn: async () => {
      if (!activeRepo) return [];
      const res = await get<RelationshipInfo[]>(
        `/api/v1/repositories/${encodeURIComponent(activeRepo.owner)}/${encodeURIComponent(activeRepo.name)}/relationships`
      );
      return res.data || [];
    },
    enabled: Boolean(activeRepo),
    refetchInterval: isSyncing ? 2500 : false,
  });

  return (
    <div className="space-y-6">
      {/* Sync Warning or Error Banner */}
      {syncError && (
        <div className="bg-warning-subtle/30 border border-warning/40 p-4 rounded-md flex items-start gap-3 text-xs text-warning">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-semibold">Sync Coverage Notice:</strong> {syncError}
          </div>
        </div>
      )}

      {/* Workflow Guide & Documentation Quick Banner */}
      <div className="bg-surface rounded-md border border-border-strong p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-surface to-surface-subtle shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-accent/15 border border-accent/30 text-accent flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-primary flex items-center gap-2">
              <span>New to CodeForensics?</span>
              <span className="text-[10px] text-accent font-semibold px-1.5 py-0.2 rounded bg-accent/10 border border-accent/20">Guided Workflow</span>
            </div>
            <p className="text-[11px] text-primary-secondary mt-0.5">
              Learn how to trace symbols with AST Code Archaeology, evaluate causal PR links, and cite evidence.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Link to="/app/workflow" className="w-full sm:w-auto">
            <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="w-3 h-3" />} className="w-full sm:w-auto text-xs">
              Workflow Guide
            </Button>
          </Link>
          <Link to="/docs" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs">
              Docs
            </Button>
          </Link>
        </div>
      </div>

      {/* Scope and Repository Banner */}
      <div className="bg-surface border border-border-subtle p-4 sm:p-5 rounded-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-medium text-primary-muted">
              Target Repository
            </span>
            {activeRepo ? (
              <Badge category="FACT">VERIFIED REPO</Badge>
            ) : (
              <Badge category="UNKNOWN">PENDING SELECTION</Badge>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-primary mt-1 font-mono flex items-center gap-2 break-all sm:break-normal">
            <FolderGit2 className="w-5 h-5 text-accent shrink-0" />
            <span>{repoTitle}</span>
          </h2>
          <p className="text-xs text-primary-secondary mt-1 max-w-2xl">{repoDesc}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto shrink-0">
          {!activeRepo && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsSelectModalOpen(true)}
              leftIcon={<FolderGit2 className="w-3.5 h-3.5 text-accent" />}
              className="w-full sm:w-auto justify-center"
            >
              Select / Track Repository
            </Button>
          )}
          {activeRepo && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => triggerSync(true)}
              disabled={isSyncing && currentProgress < 100}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />}
              className="w-full sm:w-auto justify-center"
            >
              {isSyncing ? `Syncing (${currentProgress}%)...` : 'Sync Repository'}
            </Button>
          )}
          <Link to="/app/issues" className="w-full sm:w-auto">
            <Button
              variant="primary"
              size="sm"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="w-full sm:w-auto justify-center"
            >
              Explore Issues & PRs
            </Button>
          </Link>
        </div>
      </div>

      {/* Forensic Metrics Grid - Restrained, Real-data aligned */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Panel className="p-3.5 sm:p-4">
          <div className="text-xs text-primary-muted font-medium">Synchronized Issues</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-primary mt-1">
            {issuesCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-primary-secondary mt-1 flex items-center gap-1">
            {syncStatus === 'COMPLETED' ? (
              <span className="text-success font-medium">Full coverage verified</span>
            ) : syncStatus === 'PARTIAL' ? (
              <span className="text-warning font-medium">Partial coverage</span>
            ) : syncStatus === 'RUNNING' || syncStatus === 'QUEUED' ? (
              <span className="text-accent font-medium">Ingesting...</span>
            ) : (
              <span className="text-primary-muted">Awaiting sync</span>
            )}
          </div>
        </Panel>

        <Panel className="p-3.5 sm:p-4">
          <div className="text-xs text-primary-muted font-medium">Pull Requests Tracked</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-primary mt-1">
            {prsCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-primary-secondary mt-1">
            {prsCount > 0 ? (
              <span className="font-mono text-primary">Tracked via GitHub Ingestion</span>
            ) : (
              <span className="text-primary-muted">No PRs imported yet</span>
            )}
          </div>
        </Panel>

        <Panel className="p-3.5 sm:p-4">
          <div className="text-xs text-primary-muted font-medium">Sync Status</div>
          <div className="text-lg sm:text-xl font-bold font-mono text-accent mt-1 uppercase">
            {isSyncing ? `RUNNING (${currentProgress}%)` : syncStatus}
          </div>
          <div className="text-[11px] text-primary-secondary mt-1 flex items-center gap-1 truncate">
            {syncState?.completedAt ? (
              <span>Last: {new Date(syncState.completedAt).toLocaleTimeString()}</span>
            ) : (
              <span>Not synchronized yet</span>
            )}
          </div>
        </Panel>

        <Panel className="p-3.5 sm:p-4">
          <div className="text-xs text-primary-muted font-medium">Actionable Opportunities</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-link mt-1">
            {issuesCount > 0 ? issuesCount.toLocaleString() : isSyncing ? '...' : '0'}
          </div>
          <div className="text-[11px] text-primary-secondary mt-1">
            {issuesCount > 0 ? 'Evaluated by Contribution Finder' : 'Awaiting repository sync'}
          </div>
        </Panel>
      </div>

      {/* Main Evidence Summary and Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel
          className="lg:col-span-2"
          title="Recent Evidence-Backed Lineage Findings"
          subtitle="Direct links and inferred relationships with provenance"
          action={
            <Link to="/app/issues">
              <Button size="sm" variant="ghost">View all</Button>
            </Link>
          }
        >
          {isLoadingRelationships ? (
            <div className="py-8 text-center text-xs text-primary-muted">
              Loading lineage relationships...
            </div>
          ) : relationships.length > 0 ? (
            <div className="divide-y divide-border-subtle">
              {relationships.slice(0, 5).map((rel) => {
                const sourceLabel = rel.sourceNumber ? `#${rel.sourceNumber}` : rel.sourceType;
                const targetLabel = rel.targetNumber
                  ? `via ${rel.targetType === 'PULL_REQUEST' ? 'PR ' : ''}#${rel.targetNumber}`
                  : rel.method
                  ? `via ${rel.method}`
                  : '';

                const statusBadge =
                  rel.confidence === 'HIGH' ? (
                    <Badge category="RESOLVED">Verified Fix</Badge>
                  ) : rel.confidence === 'MEDIUM' ? (
                    <Badge category="FACT">Documented Link</Badge>
                  ) : (
                    <Badge category="UNKNOWN">Resolution Uncertain</Badge>
                  );

                return (
                  <div
                    key={rel.id}
                    className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-semibold text-primary">
                          {sourceLabel}
                        </span>
                        <Badge category={rel.category}>{rel.relationshipType}</Badge>
                        {targetLabel && (
                          <span className="text-xs text-primary-muted font-mono">{targetLabel}</span>
                        )}
                      </div>
                      <div className="text-xs font-medium text-primary">
                        {rel.sourceTitle || rel.targetTitle || 'Correlated Evidence Artifact'}
                      </div>
                      <div className="text-[11px] text-primary-secondary">
                        Evidence: {rel.evidenceSummary}
                      </div>
                    </div>
                    <div className="shrink-0 self-start sm:self-auto">{statusBadge}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 px-4 text-center flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-surface-subtle border border-border-subtle flex items-center justify-center text-primary-muted mb-3">
                <Link2 className="w-5 h-5 text-accent/70" />
              </div>
              <h4 className="text-sm font-semibold text-primary">
                No Lineage Findings Discovered Yet
              </h4>
              <p className="text-xs text-primary-secondary max-w-md mt-1 mb-4 leading-relaxed">
                {isSyncing
                  ? 'Repository sync is actively ingesting issues and PRs. Findings will appear once cross-references are analyzed.'
                  : issuesCount > 0
                  ? 'Cross-reference analysis evaluates closing keywords, commit SHAs, and PR diffs. No direct links were identified in the current sample.'
                  : 'Synchronize this repository to evaluate evidence-backed causal links, closing keywords, and commit provenance.'}
              </p>
              {activeRepo && !isSyncing && issuesCount === 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => triggerSync(true)}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Sync Repository
                </Button>
              )}
            </div>
          )}
        </Panel>

        {/* Evidence Rules & Ingestion Health */}
        <Panel
          title="Data Integrity & Security"
          subtitle="Non-negotiable evidentiary constraints"
        >
          <div className="space-y-3.5 text-xs text-primary-secondary">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <div>
                <strong className="text-primary font-medium">Provider Facts vs Inferences:</strong>{' '}
                GitHub state is strictly decoupled from resolution assessments.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <div>
                <strong className="text-primary font-medium">Honest Uncertainty:</strong>{' '}
                Closed issues without verifiable commits are reported as uncertain, never assumed fixed.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <div>
                <strong className="text-primary font-medium">Untrusted Repository Input:</strong>{' '}
                Issues and code comments are treated strictly as data, neutralizing prompt injection.
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-border-subtle">
            <Link to="/app/investigations">
              <Button size="sm" variant="outline" className="w-full" leftIcon={<FileSearch className="w-3.5 h-3.5" />}>
                Start New Investigation
              </Button>
            </Link>
          </div>
        </Panel>
      </div>

      <RepositorySelectModal
        isOpen={isSelectModalOpen}
        onClose={() => setIsSelectModalOpen(false)}
      />
    </div>
  );
}
