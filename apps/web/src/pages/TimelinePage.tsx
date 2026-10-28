import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Panel } from '../components/ui/Panel.js';
import { Button } from '../components/ui/Button.js';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton.js';
import { useRepository } from '../context/RepositoryContext.js';
import { useApiClient } from '../utils/apiClient.js';
import type { RepositoryMapTimeline } from '@codeforensics/shared';
import {
  Clock,
  Play,
  Pause,
  FolderGit2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export function TimelinePage() {
  const { activeRepo } = useRepository();
  const { get } = useApiClient();

  const [timelineData, setTimelineData] = useState<RepositoryMapTimeline | null>(null);
  const [activeMilestoneId, setActiveMilestoneId] = useState<string>('milestone-now');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadTimeline = () => {
    if (!activeRepo) return;
    setIsLoading(true);
    setError(null);
    get<RepositoryMapTimeline>(
      `/api/v1/repositories/${encodeURIComponent(activeRepo.owner)}/${encodeURIComponent(activeRepo.name)}/map/timeline`
    )
      .then((res) => {
        if (res.success && res.data) {
          setTimelineData(res.data);
          setActiveMilestoneId(res.data.milestones[res.data.milestones.length - 1]?.id || 'milestone-now');
        } else {
          setError(res.error?.message || 'Failed to load architectural timeline');
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Network error loading timeline');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadTimeline();
  }, [activeRepo?.owner, activeRepo?.name]);

  // Auto playback interval
  useEffect(() => {
    if (!isPlaying || !timelineData) return;
    const interval = setInterval(() => {
      setActiveMilestoneId((prev) => {
        const milestones = timelineData.milestones;
        const currentIdx = milestones.findIndex((m) => m.id === prev);
        const nextIdx = (currentIdx + 1) % milestones.length;
        return milestones[nextIdx]?.id || milestones[0]!.id;
      });
    }, 2800);

    return () => clearInterval(interval);
  }, [isPlaying, timelineData]);

  if (!activeRepo) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 text-center">
        <div className="p-8 border border-dashed border-border-strong rounded-xl bg-surface-subtle/30 space-y-3">
          <Clock className="w-10 h-10 text-primary-muted mx-auto" />
          <h3 className="text-base font-semibold text-primary">No Repository Selected</h3>
          <p className="text-xs text-primary-secondary max-w-sm mx-auto">
            Select a synchronized repository to scrub through monthly architectural milestones and observe codebase evolution.
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

  const currentMilestone =
    timelineData?.milestones.find((m) => m.id === activeMilestoneId) ||
    timelineData?.milestones[timelineData.milestones.length - 1];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
              Architecture Time-Machine Timeline
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border border-border-subtle bg-surface-subtle text-primary">
              <FolderGit2 className="w-3 h-3 text-accent mr-0.5" />
              {activeRepo.fullName}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-primary-secondary mt-1 max-w-3xl">
            Scrub between chronological milestones to see how files, subsystems, and code churn hotspots expanded over the project's lifetime.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={isPlaying ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setIsPlaying((p) => !p)}
            leftIcon={
              isPlaying ? (
                <Pause className="w-3.5 h-3.5 text-amber-300" />
              ) : (
                <Play className="w-3.5 h-3.5 text-emerald-500" />
              )
            }
          >
            {isPlaying ? 'Pause Playback' : 'Play Timeline'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadTimeline}
            disabled={isLoading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 space-y-4">
          <LoadingSkeleton className="h-6 w-1/4" />
          <LoadingSkeleton className="h-28 w-full" />
          <LoadingSkeleton className="h-48 w-full" />
        </div>
      ) : error ? (
        <div className="p-6 text-center text-rose-600 font-mono text-xs border border-rose-200 rounded-lg bg-surface">
          <p>{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={loadTimeline}>
            Retry
          </Button>
        </div>
      ) : timelineData && currentMilestone ? (
        <>
          {/* Milestone Era Scrubber Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {timelineData.milestones.map((milestone, idx) => {
              const isActive = milestone.id === activeMilestoneId;
              return (
                <button
                  key={milestone.id}
                  type="button"
                  onClick={() => {
                    setActiveMilestoneId(milestone.id);
                    setIsPlaying(false);
                  }}
                  className={`p-4 rounded-xl text-left transition-all border ${
                    isActive
                      ? 'bg-accent/10 border-accent text-primary shadow-sm ring-1 ring-accent scale-[1.02]'
                      : 'bg-surface border-border-subtle text-primary-muted hover:text-primary hover:border-accent/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase font-mono tracking-wider text-accent">
                      Era {idx + 1}
                    </span>
                    <span className="text-[11px] font-mono text-primary-muted">{milestone.relativeTime}</span>
                  </div>
                  <div className="text-sm font-bold text-primary mt-1 font-mono">{milestone.label}</div>
                  <div className="text-xs font-mono text-primary-secondary mt-2 flex items-center justify-between pt-2 border-t border-border-subtle/60">
                    <span>{milestone.totalFiles} files</span>
                    <span className="text-rose-500 font-semibold">{milestone.hotspotCount} hotspots</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Milestone Card & Subsystem Composition */}
          <Panel className="p-5 font-mono space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
              <div>
                <span className="text-[10px] uppercase font-bold text-accent tracking-wider">
                  Active Milestone Snapshot
                </span>
                <h3 className="text-base font-bold text-primary mt-0.5">
                  {currentMilestone.label} — {currentMilestone.relativeTime}
                </h3>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-primary-muted block">Total Files</span>
                  <span className="font-bold text-primary text-base">{currentMilestone.totalFiles}</span>
                </div>
                <div>
                  <span className="text-[10px] text-primary-muted block">Directories</span>
                  <span className="font-bold text-primary text-base">{currentMilestone.totalDirectories}</span>
                </div>
                <div>
                  <span className="text-[10px] text-rose-500 block">Churn Hotspots</span>
                  <span className="font-bold text-rose-500 text-base">{currentMilestone.hotspotCount}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-primary-secondary leading-relaxed font-sans">
              {currentMilestone.summaryText}
            </p>

            {/* Subsystems during this era */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] uppercase font-mono text-primary-muted font-semibold block">
                Subsystems & Volatility in this Era:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {currentMilestone.topSubsystems?.map((sub) => (
                  <div
                    key={sub.name}
                    className="p-3 bg-surface-subtle/50 rounded-lg border border-border-subtle flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-primary block truncate max-w-[160px]">{sub.name}</span>
                      <span className="text-[10px] text-primary-muted">{sub.fileCount} tracked files</span>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          sub.churnScore >= 60
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            : 'bg-slate-200 dark:bg-slate-800 text-primary-muted'
                        }`}
                      >
                        {sub.churnScore}/100
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          {/* Evolution Insights Card */}
          <Panel className="p-4 bg-surface-subtle/30 border-border-subtle space-y-2">
            <h4 className="text-xs font-bold font-mono text-primary flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              Architectural Evolution Takeaway
            </h4>
            <p className="text-xs text-primary-secondary leading-relaxed">
              Tracking architecture across monthly milestones reveals when foundational modules become technical debt magnets. Codebases that scale file count without refactoring volatile hotspots suffer from exponential regression hazards.
            </p>
          </Panel>
        </>
      ) : null}
    </div>
  );
}
export default TimelinePage;
