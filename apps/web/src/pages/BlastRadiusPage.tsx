import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Panel } from '../components/ui/Panel.js';
import { Button } from '../components/ui/Button.js';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton.js';
import { useRepository } from '../context/RepositoryContext.js';
import { useApiClient } from '../utils/apiClient.js';
import type { BlastRadiusImpact } from '@codeforensics/shared';
import {
  Zap,
  AlertTriangle,
  FolderGit2,
  GitMerge,
  ShieldCheck,
  User,
} from 'lucide-react';

export function BlastRadiusPage() {
  const { activeRepo } = useRepository();
  const { post } = useApiClient();
  const [searchParams] = useSearchParams();

  const initialTarget = searchParams.get('target') || 'apps/api/src/routes/repositoryRoutes.ts';
  const [filePathInput, setFilePathInput] = useState<string>(initialTarget);
  const [impactData, setImpactData] = useState<BlastRadiusImpact | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = (targetPath?: string) => {
    const path = (targetPath || filePathInput).trim();
    if (!activeRepo || !path) return;

    setIsSimulating(true);
    setError(null);

    post<BlastRadiusImpact>(
      `/api/v1/repositories/${encodeURIComponent(activeRepo.owner)}/${encodeURIComponent(activeRepo.name)}/map/blast-radius`,
      { targetFiles: [path] }
    )
      .then((res) => {
        if (res.success && res.data) {
          setImpactData(res.data);
        } else {
          setError(res.error?.message || 'Failed to calculate architectural blast radius');
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Network failure simulating blast radius');
      })
      .finally(() => setIsSimulating(false));
  };

  useEffect(() => {
    if (activeRepo) {
      runSimulation(initialTarget);
    }
  }, [activeRepo?.owner, activeRepo?.name]);

  if (!activeRepo) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 text-center">
        <div className="p-8 border border-dashed border-border-strong rounded-xl bg-surface-subtle/30 space-y-3">
          <Zap className="w-10 h-10 text-primary-muted mx-auto" />
          <h3 className="text-base font-semibold text-primary">No Repository Selected</h3>
          <p className="text-xs text-primary-secondary max-w-sm mx-auto">
            Select a synchronized repository to simulate downstream architectural ripple effects and test coverage hazards.
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
              Architectural Blast-Radius Simulator
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border border-border-subtle bg-surface-subtle text-primary">
              <FolderGit2 className="w-3 h-3 text-accent mr-0.5" />
              {activeRepo.fullName}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-primary-secondary mt-1 max-w-3xl">
            Predict downstream ripple impacts before merging. Evaluates co-changed companion files, regression test suites at risk, subsystem boundary crossings, and recommended PR reviewers.
          </p>
        </div>
      </div>

      {/* Simulator Input Bar */}
      <Panel className="p-5 font-mono text-xs space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <span className="font-bold text-primary text-sm uppercase tracking-wider">
            Simulate Proposed Change Impact
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={filePathInput}
              onChange={(e) => setFilePathInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runSimulation();
              }}
              placeholder="Enter target file path (e.g. apps/api/src/routes/repositoryRoutes.ts)..."
              className="w-full px-3.5 py-2 bg-canvas border border-border-subtle rounded-lg text-xs font-mono text-primary placeholder:text-primary-muted focus:border-link focus:outline-none"
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => runSimulation()}
            disabled={isSimulating || !filePathInput.trim()}
            leftIcon={<Zap className="w-3.5 h-3.5 text-amber-300" />}
          >
            {isSimulating ? 'Simulating Impact...' : 'Simulate Blast Radius'}
          </Button>
        </div>

        {/* Quick Simulator Hotspots */}
        <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px]">
          <span className="text-primary-muted uppercase font-semibold">Quick Hotspots:</span>
          {[
            'apps/api/src/routes/repositoryRoutes.ts',
            'apps/web/src/pages/RepositoryMapPage.tsx',
            'packages/shared/src/types/api.ts',
            'apps/worker/src/ingestion/githubIngestion.ts',
          ].map((samplePath) => (
            <button
              key={samplePath}
              type="button"
              onClick={() => {
                setFilePathInput(samplePath);
                runSimulation(samplePath);
              }}
              className="px-2.5 py-1 rounded-md bg-surface-subtle border border-border-subtle text-primary-secondary hover:text-accent hover:border-accent/40 transition-colors"
            >
              {samplePath.split('/').pop()}
            </button>
          ))}
        </div>
      </Panel>

      {isSimulating ? (
        <div className="p-8 space-y-4">
          <LoadingSkeleton className="h-6 w-1/4" />
          <LoadingSkeleton className="h-28 w-full" />
          <LoadingSkeleton className="h-48 w-full" />
        </div>
      ) : error ? (
        <div className="p-6 text-center text-rose-600 font-mono text-xs border border-rose-200 rounded-lg bg-surface">
          <p>{error}</p>
        </div>
      ) : impactData ? (
        <div className="space-y-4 font-mono">
          {/* Main Predicted Hazard Banner */}
          <Panel className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase font-bold text-primary-muted tracking-wider">
                Predicted Blast Radius Score
              </div>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-3xl font-bold font-mono text-primary">
                  {impactData.blastRadiusScore}/100
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    impactData.riskLevel === 'CRITICAL'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                      : impactData.riskLevel === 'HIGH'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {impactData.riskLevel} HAZARD
                </span>
              </div>
              <p className="text-xs text-primary-muted mt-1.5 font-sans">
                Affects {impactData.affectedSubsystems?.length || 1} architectural subsystems:{' '}
                <strong className="text-primary font-mono">{impactData.affectedSubsystems?.join(', ')}</strong>
              </p>
            </div>

            <div className="flex items-center gap-6 text-xs font-mono border-t sm:border-t-0 sm:border-l border-border-subtle pt-3 sm:pt-0 sm:pl-6">
              <div>
                <span className="text-[10px] text-primary-muted uppercase tracking-wider block">Downstream Files</span>
                <span className="text-xl font-bold text-primary">{impactData.coupledCompanions?.length || 0}</span>
              </div>
              <div>
                <span className="text-[10px] text-amber-500 uppercase tracking-wider block">Tests at Risk</span>
                <span className="text-xl font-bold text-amber-500">{impactData.affectedTests?.length || 0}</span>
              </div>
            </div>
          </Panel>

          {/* Boundary Crossing Warning */}
          {impactData.architecturalBoundaryCrossings && impactData.architecturalBoundaryCrossings.length > 0 && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-700 dark:text-rose-400 text-xs flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <div className="space-y-1">
                <strong className="font-bold">Architectural Layer Boundary Crossing:</strong>
                <p className="text-[11px] leading-relaxed">
                  Modifying this file bridges disparate root layers ({impactData.architecturalBoundaryCrossings.join(' ↔ ')}). Require strict code review and verify that public API contracts remain backwards-compatible.
                </p>
              </div>
            </div>
          )}

          {/* 2-Column: Coupled Files & Affected Test Suites */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Downstream Coupled Companions */}
            <Panel className="p-4 space-y-3">
              <h4 className="font-bold text-primary text-xs flex items-center justify-between uppercase tracking-wider border-b border-border-subtle pb-2">
                <span className="flex items-center gap-1.5">
                  <GitMerge className="w-3.5 h-3.5 text-accent" />
                  Downstream Coupled Files
                </span>
                <span className="text-primary-muted font-normal text-[11px]">
                  {impactData.coupledCompanions?.length || 0} files
                </span>
              </h4>

              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {impactData.coupledCompanions?.map((comp, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-surface-subtle/50 rounded-md border border-border-subtle flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="font-semibold text-primary truncate" title={comp.file}>
                        {comp.file}
                      </div>
                      <div className="text-[10px] text-primary-muted truncate mt-0.5">{comp.reason}</div>
                    </div>
                    <span className="font-bold text-accent shrink-0 text-xs">{comp.couplingPercentage}%</span>
                  </div>
                ))}
                {(!impactData.coupledCompanions || impactData.coupledCompanions.length === 0) && (
                  <div className="py-6 text-center text-primary-muted text-xs">
                    No downstream coupled companion files discovered.
                  </div>
                )}
              </div>
            </Panel>

            {/* Regression Test Suites at Risk */}
            <Panel className="p-4 space-y-3">
              <h4 className="font-bold text-primary text-xs flex items-center justify-between uppercase tracking-wider border-b border-border-subtle pb-2">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Regression Test Suites at Risk
                </span>
                <span className="text-primary-muted font-normal text-[11px]">
                  {impactData.affectedTests?.length || 0} suites
                </span>
              </h4>

              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {impactData.affectedTests?.map((testFile, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-surface-subtle/50 rounded-md border border-border-subtle flex items-center justify-between text-xs"
                  >
                    <span className="font-mono text-primary truncate" title={testFile}>
                      {testFile}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20 shrink-0">
                      MUST PASS
                    </span>
                  </div>
                ))}
                {(!impactData.affectedTests || impactData.affectedTests.length === 0) && (
                  <div className="py-6 text-center text-primary-muted text-xs">
                    No direct unit test dependencies identified for this file.
                  </div>
                )}
              </div>
            </Panel>
          </div>

          {/* Recommended Reviewers */}
          {impactData.recommendedReviewers && impactData.recommendedReviewers.length > 0 && (
            <Panel className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-accent" />
                <span className="font-bold text-primary text-xs uppercase tracking-wider">
                  Recommended PR Reviewers:
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {impactData.recommendedReviewers.map((rev) => (
                  <span
                    key={rev.name}
                    title={rev.relevance}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-surface-subtle border border-border-subtle text-primary font-semibold text-xs"
                  >
                    @{rev.name}
                    <span className="text-[10px] text-primary-muted font-normal">({rev.relevance})</span>
                  </span>
                ))}
              </div>
            </Panel>
          )}
        </div>
      ) : null}
    </div>
  );
}
export default BlastRadiusPage;
