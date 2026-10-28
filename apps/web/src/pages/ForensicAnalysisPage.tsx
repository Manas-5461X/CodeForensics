import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Panel } from '../components/ui/Panel.js';
import { Button } from '../components/ui/Button.js';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton.js';
import { useRepository } from '../context/RepositoryContext.js';
import { useApiClient } from '../utils/apiClient.js';
import type {
  CoChangeReport,
  RepositoryMapTimeline,
  KnowledgeLossSummary,
  BlastRadiusImpact,
} from '@codeforensics/shared';
import {
  GitMerge,
  Clock,
  ShieldAlert,
  Zap,
  Play,
  Pause,
  FolderGit2,
  RefreshCw,
  Sparkles,
  Flame,
  AlertTriangle,
  Code2,
  HelpCircle,
  ShieldCheck,
  User,
  Activity,
  Layers,
  BookOpen,
} from 'lucide-react';

export type ForensicTab = 'co-change' | 'timeline' | 'bus-factor' | 'blast-radius';

export function ForensicAnalysisPage() {
  const { activeRepo } = useRepository();
  const { get, post } = useApiClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Tab State
  const initialTab = (searchParams.get('tab') as ForensicTab) || 'co-change';
  const [activeTab, setActiveTab] = useState<ForensicTab>(
    ['co-change', 'timeline', 'bus-factor', 'blast-radius'].includes(initialTab)
      ? initialTab
      : 'co-change'
  );

  // Explanation Guide State per Tab
  const [showGuide, setShowGuide] = useState<Record<ForensicTab, boolean>>({
    'co-change': false,
    'timeline': false,
    'bus-factor': false,
    'blast-radius': false,
  });

  const toggleGuide = (tab: ForensicTab) => {
    setShowGuide((prev) => ({ ...prev, [tab]: !prev[tab] }));
  };

  // Sync tab with URL
  const handleTabChange = (tab: ForensicTab) => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    setSearchParams(newParams, { replace: true });
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab') as ForensicTab;
    if (tabParam && ['co-change', 'timeline', 'bus-factor', 'blast-radius'].includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // ==========================================
  // TAB 1: CO-CHANGE STATE & ACTIONS
  // ==========================================
  const [coChangeReport, setCoChangeReport] = useState<CoChangeReport | null>(null);
  const [coChangeFilter, setCoChangeFilter] = useState<'all' | 'cross' | 'high'>('all');
  const [isCoChangeLoading, setIsCoChangeLoading] = useState<boolean>(false);
  const [coChangeError, setCoChangeError] = useState<string | null>(null);

  const loadCoChange = () => {
    if (!activeRepo) return;
    setIsCoChangeLoading(true);
    setCoChangeError(null);
    get<CoChangeReport>(
      `/api/v1/repositories/${encodeURIComponent(activeRepo.owner)}/${encodeURIComponent(activeRepo.name)}/map/co-change`
    )
      .then((res) => {
        if (res.success && res.data) {
          setCoChangeReport(res.data);
        } else {
          setCoChangeError(res.error?.message || 'Failed to analyze co-change coupling matrix');
        }
      })
      .catch((err) => {
        setCoChangeError(err instanceof Error ? err.message : 'Network error loading co-change matrix');
      })
      .finally(() => setIsCoChangeLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'co-change' && !coChangeReport && activeRepo) {
      loadCoChange();
    }
  }, [activeTab, activeRepo?.owner, activeRepo?.name]);

  const filteredCoChangePairs = useMemo(() => {
    if (!coChangeReport?.pairs) return [];
    if (coChangeFilter === 'cross') {
      return coChangeReport.pairs.filter((p) => p.crossSubsystem);
    }
    if (coChangeFilter === 'high') {
      return coChangeReport.pairs.filter((p) => p.couplingPercentage >= 60);
    }
    return coChangeReport.pairs;
  }, [coChangeReport, coChangeFilter]);

  // ==========================================
  // TAB 2: TIMELINE STATE & ACTIONS
  // ==========================================
  const [timelineData, setTimelineData] = useState<RepositoryMapTimeline | null>(null);
  const [activeMilestoneId, setActiveMilestoneId] = useState<string>('milestone-now');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isTimelineLoading, setIsTimelineLoading] = useState<boolean>(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  const loadTimeline = () => {
    if (!activeRepo) return;
    setIsTimelineLoading(true);
    setTimelineError(null);
    get<RepositoryMapTimeline>(
      `/api/v1/repositories/${encodeURIComponent(activeRepo.owner)}/${encodeURIComponent(activeRepo.name)}/map/timeline`
    )
      .then((res) => {
        if (res.success && res.data) {
          setTimelineData(res.data);
          setActiveMilestoneId(res.data.milestones[res.data.milestones.length - 1]?.id || 'milestone-now');
        } else {
          setTimelineError(res.error?.message || 'Failed to load architectural timeline');
        }
      })
      .catch((err) => {
        setTimelineError(err instanceof Error ? err.message : 'Network error loading timeline');
      })
      .finally(() => setIsTimelineLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'timeline' && !timelineData && activeRepo) {
      loadTimeline();
    }
  }, [activeTab, activeRepo?.owner, activeRepo?.name]);

  useEffect(() => {
    if (!isPlaying || !timelineData) return;
    const interval = setInterval(() => {
      setActiveMilestoneId((prev) => {
        const milestones = timelineData.milestones;
        const currentIdx = milestones.findIndex((m) => m.id === prev);
        const nextIdx = (currentIdx + 1) % milestones.length;
        return milestones[nextIdx].id;
      });
    }, 1800);
    return () => clearInterval(interval);
  }, [isPlaying, timelineData]);

  const activeMilestone = useMemo(() => {
    if (!timelineData) return null;
    return timelineData.milestones.find((m) => m.id === activeMilestoneId) || timelineData.milestones[0];
  }, [timelineData, activeMilestoneId]);

  // ==========================================
  // TAB 3: BUS FACTOR STATE & ACTIONS
  // ==========================================
  const [knowledgeData, setKnowledgeData] = useState<KnowledgeLossSummary | null>(null);
  const [busFilter, setBusFilter] = useState<'all' | 'zombie' | 'critical'>('all');
  const [selectedBusCell, setSelectedBusCell] = useState<string | null>(null);
  const [isBusLoading, setIsBusLoading] = useState<boolean>(false);
  const [busError, setBusError] = useState<string | null>(null);

  const loadKnowledge = () => {
    if (!activeRepo) return;
    setIsBusLoading(true);
    setBusError(null);
    get<KnowledgeLossSummary>(
      `/api/v1/repositories/${encodeURIComponent(activeRepo.owner)}/${encodeURIComponent(activeRepo.name)}/map/knowledge-loss`
    )
      .then((res) => {
        if (res.success && res.data) {
          setKnowledgeData(res.data);
        } else {
          setBusError(res.error?.message || 'Failed to analyze bus factor and knowledge loss risks');
        }
      })
      .catch((err) => {
        setBusError(err instanceof Error ? err.message : 'Network error loading bus factor data');
      })
      .finally(() => setIsBusLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'bus-factor' && !knowledgeData && activeRepo) {
      loadKnowledge();
    }
  }, [activeTab, activeRepo?.owner, activeRepo?.name]);

  const filteredBusItems = useMemo(() => {
    if (!knowledgeData?.riskItems) return [];
    if (busFilter === 'zombie') {
      return knowledgeData.riskItems.filter((item) => item.isZombieHotspot);
    }
    if (busFilter === 'critical') {
      return knowledgeData.riskItems.filter(
        (item) => item.riskLevel === 'CRITICAL' || item.riskLevel === 'HIGH'
      );
    }
    return knowledgeData.riskItems;
  }, [knowledgeData, busFilter]);

  // ==========================================
  // TAB 4: BLAST RADIUS STATE & ACTIONS
  // ==========================================
  const targetParam = searchParams.get('target') || 'apps/api/src/routes/repositoryRoutes.ts';
  const [filePathInput, setFilePathInput] = useState<string>(targetParam);
  const [impactData, setImpactData] = useState<BlastRadiusImpact | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [blastError, setBlastError] = useState<string | null>(null);

  const runSimulation = (targetPath?: string) => {
    const path = (targetPath || filePathInput).trim();
    if (!activeRepo || !path) return;

    setIsSimulating(true);
    setBlastError(null);

    post<BlastRadiusImpact>(
      `/api/v1/repositories/${encodeURIComponent(activeRepo.owner)}/${encodeURIComponent(activeRepo.name)}/map/blast-radius`,
      { targetFiles: [path] }
    )
      .then((res) => {
        if (res.success && res.data) {
          setImpactData(res.data);
        } else {
          setBlastError(res.error?.message || 'Failed to calculate architectural blast radius');
        }
      })
      .catch((err) => {
        setBlastError(err instanceof Error ? err.message : 'Network failure simulating blast radius');
      })
      .finally(() => setIsSimulating(false));
  };

  useEffect(() => {
    if (activeTab === 'blast-radius' && activeRepo && !impactData) {
      runSimulation(filePathInput);
    }
  }, [activeTab, activeRepo?.owner, activeRepo?.name]);

  // If URL changes with target param
  useEffect(() => {
    const target = searchParams.get('target');
    if (target && target !== filePathInput) {
      setFilePathInput(target);
      if (activeRepo) {
        runSimulation(target);
      }
    }
  }, [searchParams]);

  // ==========================================
  // RENDER: NO REPOSITORY SELECTED
  // ==========================================
  if (!activeRepo) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 text-center">
        <div className="p-8 border border-dashed border-border-strong rounded-xl bg-surface-subtle/30 space-y-3">
          <Activity className="w-10 h-10 text-primary-muted mx-auto" />
          <h3 className="text-base font-semibold text-primary">No Repository Selected</h3>
          <p className="text-xs text-primary-secondary max-w-sm mx-auto">
            Select a synchronized repository to perform deep-dive forensic analysis across co-change matrices, timeline scrubbers, bus factor heatmaps, and blast-radius predictors.
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Unified Workbench Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-primary-muted mb-1">
            <FolderGit2 className="w-3.5 h-3.5 text-accent" />
            <span>{activeRepo.fullName}</span>
            <span>/</span>
            <span className="text-primary font-semibold">Forensic Analysis</span>
          </div>
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent" />
            Forensic Analysis Workbench
          </h2>
          <p className="text-xs text-primary-secondary mt-1 max-w-2xl">
            Unified deep-dive laboratory for temporal co-change coupling, architectural time-machine scrubbers, bus factor knowledge risk heatmaps, and blast-radius impact simulators.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link to="/app/map">
            <Button size="sm" variant="outline" leftIcon={<Layers className="w-3.5 h-3.5 text-accent" />}>
              Architecture Map
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (activeTab === 'co-change') loadCoChange();
              if (activeTab === 'timeline') loadTimeline();
              if (activeTab === 'bus-factor') loadKnowledge();
              if (activeTab === 'blast-radius') runSimulation();
            }}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Telemetry
          </Button>
        </div>
      </div>

      {/* 4-in-1 Forensic Engine Segmented Tab Bar */}
      <div className="flex items-center gap-2 border-b border-border-subtle pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => handleTabChange('co-change')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === 'co-change'
              ? 'bg-accent text-accent-contrast shadow-sm'
              : 'text-primary-muted hover:text-primary hover:bg-surface-subtle'
          }`}
        >
          <GitMerge className="w-4 h-4" />
          <span>Co-Change Matrix</span>
          {coChangeReport?.pairs && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                activeTab === 'co-change' ? 'bg-black/20 text-white' : 'bg-surface-subtle text-primary-muted'
              }`}
            >
              {coChangeReport.pairs.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('timeline')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === 'timeline'
              ? 'bg-accent text-accent-contrast shadow-sm'
              : 'text-primary-muted hover:text-primary hover:bg-surface-subtle'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Time-Machine</span>
          {timelineData?.milestones && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                activeTab === 'timeline' ? 'bg-black/20 text-white' : 'bg-surface-subtle text-primary-muted'
              }`}
            >
              {timelineData.milestones.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('bus-factor')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === 'bus-factor'
              ? 'bg-accent text-accent-contrast shadow-sm'
              : 'text-primary-muted hover:text-primary hover:bg-surface-subtle'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Bus Factor Risk</span>
          {knowledgeData?.zombieHotspotsCount !== undefined && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                activeTab === 'bus-factor' ? 'bg-black/20 text-white' : 'bg-surface-subtle text-primary-muted'
              }`}
            >
              {knowledgeData.zombieHotspotsCount} 🧟
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('blast-radius')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === 'blast-radius'
              ? 'bg-accent text-accent-contrast shadow-sm'
              : 'text-primary-muted hover:text-primary hover:bg-surface-subtle'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Blast Radius</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
              activeTab === 'blast-radius' ? 'bg-black/20 text-white' : 'bg-surface-subtle text-primary-muted'
            }`}
          >
            Predictor
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: CO-CHANGE MATRIX VIEW                              */}
      {/* ========================================================= */}
      {activeTab === 'co-change' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Tab Engine Header & Explanation Button */}
          <div className="p-4 bg-surface border border-border-subtle rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <GitMerge className="w-4 h-4 text-accent" />
                <h3 className="font-bold text-primary text-sm font-mono">Temporal Co-Change Coupling Engine</h3>
              </div>
              <p className="text-xs text-primary-secondary mt-0.5">
                Measures statistical commit co-occurrence across pull requests to discover hidden architectural coupling leaks.
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleGuide('co-change')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold border border-cyan-500/50 bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 hover:bg-cyan-500/25 transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span>{showGuide['co-change'] ? 'Hide Co-Change Guide' : 'What is Co-Change Matrix?'}</span>
            </button>
          </div>

          {/* Expandable Overview Guide */}
          {showGuide['co-change'] && (
            <Panel className="p-4 bg-cyan-500/5 border-cyan-500/30 text-xs space-y-2 animate-in fade-in">
              <div className="font-bold text-primary flex items-center gap-2 font-mono">
                <BookOpen className="w-4 h-4 text-accent" />
                <span>Quick Guide: Why Temporal Co-Change Matters</span>
              </div>
              <p className="text-primary-secondary leading-relaxed">
                Unlike static code analysis that only checks <code className="text-accent font-mono">import</code> statements, <strong>Temporal Co-Change</strong> analyzes historical pull requests to detect files that are always modified together in the same PRs. If changing an API route repeatedly requires editing a database schema or UI screen, they share high coupling. When this coupling crosses top-level boundaries, it represents an <strong>Architectural Leak</strong> that frequently causes forgotten file updates and production regressions.
              </p>
            </Panel>
          )}

          {isCoChangeLoading ? (
            <div className="space-y-4">
              <LoadingSkeleton className="h-28 w-full" />
              <LoadingSkeleton className="h-64 w-full" />
            </div>
          ) : coChangeError ? (
            <Panel className="p-6 text-center border-rose-500/30 bg-rose-500/5 space-y-2">
              <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
              <div className="text-sm font-semibold text-rose-500">{coChangeError}</div>
              <Button size="sm" variant="outline" onClick={loadCoChange} className="mt-2">
                Retry Analysis
              </Button>
            </Panel>
          ) : coChangeReport ? (
            <>
              {/* Co-Change Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Panel className="p-4">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-primary-muted font-semibold">
                    Analyzed Merged PRs
                  </div>
                  <div className="text-2xl font-bold font-mono text-primary mt-1">
                    {coChangeReport.analyzedPrCount}
                  </div>
                  <div className="text-xs text-primary-muted mt-0.5">Statistical PR history</div>
                </Panel>

                <Panel className="p-4">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-primary-muted font-semibold">
                    Coupling Pairs
                  </div>
                  <div className="text-2xl font-bold font-mono text-primary mt-1">
                    {coChangeReport.pairs?.length || 0}
                  </div>
                  <div className="text-xs text-primary-muted mt-0.5">Correlated file mutations</div>
                </Panel>

                <Panel className="p-4 border-amber-500/30 bg-amber-500/5">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-amber-500 font-semibold">
                    Cross-Subsystem Leaks
                  </div>
                  <div className="text-2xl font-bold font-mono text-amber-500 mt-1">
                    {coChangeReport.crossSubsystemPairsCount}
                  </div>
                  <div className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                    Coupled across architectural tiers
                  </div>
                </Panel>

                <Panel className="p-4 border-rose-500/30 bg-rose-500/5">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-rose-500 font-semibold">
                    Highest Coupling
                  </div>
                  <div className="text-2xl font-bold font-mono text-rose-500 mt-1">
                    {Math.max(...(coChangeReport.pairs?.map((p) => p.couplingPercentage) || [0]))}%
                  </div>
                  <div className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">
                    Maximum mutation linkage
                  </div>
                </Panel>
              </div>

              {/* Pairs Register Table */}
              <Panel className="p-4 space-y-4 font-mono text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                      Temporal Coupling Register:
                    </span>
                    <span className="text-primary-muted font-normal text-xs">
                      ({filteredCoChangePairs.length} {filteredCoChangePairs.length === 1 ? 'pair' : 'pairs'} shown)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setCoChangeFilter('all')}
                      className={`px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                        coChangeFilter === 'all'
                          ? 'bg-accent/15 text-accent border border-accent/40 font-bold'
                          : 'bg-surface-subtle text-primary-muted hover:text-primary border border-border-subtle'
                      }`}
                    >
                      All Pairs ({coChangeReport.pairs?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoChangeFilter('cross')}
                      className={`px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                        coChangeFilter === 'cross'
                          ? 'bg-amber-500/15 text-amber-500 border border-amber-500/40 font-bold'
                          : 'bg-surface-subtle text-primary-muted hover:text-primary border border-border-subtle'
                      }`}
                    >
                      Cross-Subsystem Leaks ({coChangeReport.crossSubsystemPairsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoChangeFilter('high')}
                      className={`px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                        coChangeFilter === 'high'
                          ? 'bg-rose-500/15 text-rose-500 border border-rose-500/40 font-bold'
                          : 'bg-surface-subtle text-primary-muted hover:text-primary border border-border-subtle'
                      }`}
                    >
                      High Risk (&ge;60%)
                    </button>
                  </div>
                </div>

                <div className="border border-border-subtle rounded-lg overflow-hidden bg-surface">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-surface-subtle border-b border-border-subtle text-primary-muted text-[10px] uppercase">
                          <th className="py-3 px-3.5">Source Artifact</th>
                          <th className="py-3 px-3.5">Target Artifact</th>
                          <th className="py-3 px-3.5 text-center">Coupling</th>
                          <th className="py-3 px-3.5 text-center">Co-Commits</th>
                          <th className="py-3 px-3.5">Subsystem Scope</th>
                          <th className="py-3 px-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle/60">
                        {filteredCoChangePairs.map((pair, idx) => (
                          <tr key={idx} className="hover:bg-surface-subtle/60 transition-colors">
                            <td className="py-3 px-3.5 font-semibold text-primary max-w-[200px] truncate" title={pair.sourceFile}>
                              {pair.sourceFile}
                            </td>
                            <td className="py-3 px-3.5 font-semibold text-primary max-w-[200px] truncate" title={pair.targetFile}>
                              {pair.targetFile}
                            </td>
                            <td className="py-3 px-3.5 text-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                  pair.couplingPercentage >= 70
                                    ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                                    : pair.couplingPercentage >= 50
                                    ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                                    : 'bg-slate-100 dark:bg-slate-800 text-primary-muted'
                                }`}
                              >
                                {pair.couplingPercentage}%
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-center text-primary-secondary font-mono">
                              {pair.coChangeCount}
                            </td>
                            <td className="py-3 px-3.5">
                              {pair.crossSubsystem ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 text-[10px] font-bold border border-amber-500/30">
                                  <AlertTriangle className="w-3 h-3 inline" />
                                  CROSS-SUBSYSTEM LEAK
                                </span>
                              ) : (
                                <span className="text-[10px] text-primary-muted font-medium">
                                  Intra-module
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3.5 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs py-1 px-2.5"
                                onClick={() => {
                                  handleTabChange('blast-radius');
                                  setFilePathInput(pair.sourceFile);
                                  runSimulation(pair.sourceFile);
                                }}
                                leftIcon={<Zap className="w-3.5 h-3.5 text-amber-500" />}
                              >
                                Blast Radius
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {filteredCoChangePairs.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-primary-muted">
                              No pairs match the selected coupling criteria.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Panel>

              {/* Comprehensive Forensic Analysis & Remediation Guide (Downside) */}
              <div className="p-4 bg-surface border border-border-subtle rounded-lg shadow-xs space-y-4 font-sans text-xs">
                <div className="flex items-center gap-2 pb-2.5 border-b border-border-subtle">
                  <BookOpen className="w-4 h-4 text-accent" />
                  <h4 className="font-bold text-primary text-sm font-mono">Co-Change Coupling Analysis &amp; Remediation Playbook</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-surface-subtle/40 rounded-md border border-border-subtle/70 space-y-2">
                    <div className="font-bold text-primary flex items-center gap-1.5 font-mono">
                      <GitMerge className="w-3.5 h-3.5 text-accent" />
                      <span>1. Statistical Formulation</span>
                    </div>
                    <p className="text-[11px] text-primary-secondary leading-relaxed">
                      Coupling probability is computed using Jaccard similarity across merged PR commit sets:
                    </p>
                    <div className="p-2 bg-canvas border border-border-subtle rounded text-[10px] space-y-1 font-mono text-primary-muted">
                      <div>Coupling% = (PRs(A ∩ B) / PRs(A ∪ B)) × 100</div>
                      <div><span className="text-rose-500 font-bold">&ge;70%</span> • Critical tight mutation linkage</div>
                      <div><span className="text-amber-500 font-bold">50–69%</span> • High co-occurrence correlation</div>
                    </div>
                  </div>

                  <div className="p-3 bg-surface-subtle/40 rounded-md border border-border-subtle/70 space-y-2">
                    <div className="font-bold text-primary flex items-center gap-1.5 font-mono">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span>2. Cross-Subsystem Leaks</span>
                    </div>
                    <p className="text-[11px] text-primary-secondary leading-relaxed">
                      When coupled files belong to separate root modules (e.g. <span className="font-mono text-primary">apps/api</span> and <span className="font-mono text-primary">packages/shared</span>), modifying one forces developer cognitive overhead across repository domains.
                    </p>
                    <p className="text-[10px] text-primary-muted">
                      This breach of separation of concerns is the #1 reason PR authors forget companion test updates.
                    </p>
                  </div>

                  <div className="p-3 bg-surface-subtle/40 rounded-md border border-border-subtle/70 space-y-2">
                    <div className="font-bold text-primary flex items-center gap-1.5 font-mono">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>3. Decoupling Remediation</span>
                    </div>
                    <p className="text-[11px] text-primary-secondary leading-relaxed">
                      Recommended engineering remediation strategies:
                    </p>
                    <ul className="text-[10px] text-primary-muted space-y-1 list-disc pl-3">
                      <li>Extract shared data transfer models into <span className="font-mono text-accent">packages/shared</span></li>
                      <li>Implement publish/subscribe events to eliminate synchronous file dependencies</li>
                      <li>Click "Blast Radius" on high-risk pairs to simulate regression fallout</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: TIME-MACHINE TIMELINE VIEW                         */}
      {/* ========================================================= */}
      {activeTab === 'timeline' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Tab Engine Header & Explanation Button */}
          <div className="p-4 bg-surface border border-border-subtle rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent" />
                <h3 className="font-bold text-primary text-sm font-mono">Time-Machine Architecture Timeline Engine</h3>
              </div>
              <p className="text-xs text-primary-secondary mt-0.5">
                Reconstructs codebase topology, directory footprints, and hotspot migrations across historical release eras.
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleGuide('timeline')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold border border-cyan-500/50 bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 hover:bg-cyan-500/25 transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span>{showGuide['timeline'] ? 'Hide Timeline Guide' : 'What is Time-Machine Timeline?'}</span>
            </button>
          </div>

          {/* Expandable Overview Guide */}
          {showGuide['timeline'] && (
            <Panel className="p-4 bg-cyan-500/5 border-cyan-500/30 text-xs space-y-2 animate-in fade-in">
              <div className="font-bold text-primary flex items-center gap-2 font-mono">
                <BookOpen className="w-4 h-4 text-accent" />
                <span>Quick Guide: Understanding Codebase Evolution</span>
              </div>
              <p className="text-primary-secondary leading-relaxed">
                Codebases are not static artifacts. The <strong>Time-Machine Timeline</strong> scrubs through chronological milestone eras (e.g., initial baseline &rarr; v0.5.0 &rarr; v1.0.0 &rarr; present) to show when architectural complexity expanded. Use this to determine if a hotspot is recent experimental feature churn or entrenched architectural debt.
              </p>
            </Panel>
          )}

          {isTimelineLoading ? (
            <div className="space-y-4">
              <LoadingSkeleton className="h-28 w-full" />
              <LoadingSkeleton className="h-64 w-full" />
            </div>
          ) : timelineError ? (
            <Panel className="p-6 text-center border-rose-500/30 bg-rose-500/5 space-y-2">
              <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
              <div className="text-sm font-semibold text-rose-500">{timelineError}</div>
              <Button size="sm" variant="outline" onClick={loadTimeline} className="mt-2">
                Retry Loading Timeline
              </Button>
            </Panel>
          ) : timelineData && activeMilestone ? (
            <>
              {/* Timeline Scrubber Controller */}
              <Panel className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase font-mono tracking-wider text-accent font-bold">
                        Architecture Evolution Scrubber
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-subtle text-primary-muted border border-border-subtle font-mono">
                        {timelineData.milestones.length} Historical Eras
                      </span>
                    </div>
                    <div className="text-base font-bold text-primary mt-1 flex items-center gap-2">
                      <span>{activeMilestone.label}</span>
                      <span className="text-xs text-primary-muted font-normal font-mono">
                        ({activeMilestone.relativeTime})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={isPlaying ? 'primary' : 'outline'}
                      onClick={() => setIsPlaying(!isPlaying)}
                      leftIcon={isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    >
                      {isPlaying ? 'Pause Auto-Play' : 'Simulate Evolution'}
                    </Button>
                  </div>
                </div>

                {/* Range Slider */}
                <div className="space-y-2 pt-2">
                  <input
                    type="range"
                    min={0}
                    max={timelineData.milestones.length - 1}
                    value={timelineData.milestones.findIndex((m) => m.id === activeMilestoneId)}
                    onChange={(e) => {
                      setIsPlaying(false);
                      const idx = parseInt(e.target.value, 10);
                      setActiveMilestoneId(timelineData.milestones[idx].id);
                    }}
                    className="w-full accent-accent h-2 bg-surface-subtle rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-primary-muted">
                    <span>{timelineData.milestones[0]?.label}</span>
                    <span className="text-accent font-semibold">{activeMilestone.label}</span>
                    <span>{timelineData.milestones[timelineData.milestones.length - 1]?.label}</span>
                  </div>
                </div>
              </Panel>

              {/* Active Era Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Panel className="p-4">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-primary-muted font-semibold">
                    Files in Era
                  </div>
                  <div className="text-2xl font-bold font-mono text-primary mt-1">
                    {activeMilestone.totalFiles}
                  </div>
                  <div className="text-xs text-primary-muted mt-0.5">Codebase footprint</div>
                </Panel>

                <Panel className="p-4">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-primary-muted font-semibold">
                    Total Directories
                  </div>
                  <div className="text-2xl font-bold font-mono text-primary mt-1">
                    {activeMilestone.totalDirectories}
                  </div>
                  <div className="text-xs text-primary-muted mt-0.5">Directory hierarchy depth</div>
                </Panel>

                <Panel className="p-4 border-rose-500/30 bg-rose-500/5">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-rose-500 font-semibold">
                    Hotspots Count
                  </div>
                  <div className="text-2xl font-bold font-mono text-rose-500 mt-1">
                    {activeMilestone.hotspotCount}
                  </div>
                  <div className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">
                    High volatility files in era
                  </div>
                </Panel>

                <Panel className="p-4">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-primary-muted font-semibold">
                    Subsystems
                  </div>
                  <div className="text-2xl font-bold font-mono text-accent mt-1">
                    {activeMilestone.topSubsystems?.length || 1}
                  </div>
                  <div className="text-xs text-primary-muted mt-0.5">Architectural domains</div>
                </Panel>
              </div>

              {/* Milestone Timeline Card List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary font-mono flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                  Chronological Architectural Eras
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {timelineData.milestones.map((m) => {
                    const isSelected = m.id === activeMilestoneId;
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          setIsPlaying(false);
                          setActiveMilestoneId(m.id);
                        }}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-accent/10 border-accent shadow-sm'
                            : 'bg-surface border-border-subtle hover:border-border-strong'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                          <span className={`font-bold ${isSelected ? 'text-accent' : 'text-primary'}`}>
                            {m.label}
                          </span>
                          <span className="text-[10px] text-primary-muted">
                            {m.relativeTime}
                          </span>
                        </div>
                        <p className="text-xs text-primary-secondary line-clamp-2 leading-relaxed">
                          {m.summaryText}
                        </p>
                        <div className="mt-3 pt-2 border-t border-border-subtle/60 flex items-center justify-between text-[10px] font-mono text-primary-muted">
                          <span>{m.totalFiles} files</span>
                          <span>{m.totalDirectories} dirs</span>
                          <span className="font-semibold text-rose-500">{m.hotspotCount} hotspots</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Comprehensive Time-Machine Analysis Guide (Downside) */}
              <div className="p-4 bg-surface border border-border-subtle rounded-lg shadow-xs space-y-4 font-sans text-xs">
                <div className="flex items-center gap-2 pb-2.5 border-b border-border-subtle">
                  <BookOpen className="w-4 h-4 text-accent" />
                  <h4 className="font-bold text-primary text-sm font-mono">Time-Machine Evolution &amp; Architectural Drift Guide</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-surface-subtle/40 rounded-md border border-border-subtle/70 space-y-2">
                    <div className="font-bold text-primary flex items-center gap-1.5 font-mono">
                      <Clock className="w-3.5 h-3.5 text-accent" />
                      <span>1. Era Reconstruction</span>
                    </div>
                    <p className="text-[11px] text-primary-secondary leading-relaxed">
                      CodeForensics buckets Git history into distinct architectural eras based on release tags and quarterly commit clusters.
                    </p>
                    <p className="text-[10px] text-primary-muted">
                      Allows comparing historical baseline complexity against current head states.
                    </p>
                  </div>

                  <div className="p-3 bg-surface-subtle/40 rounded-md border border-border-subtle/70 space-y-2">
                    <div className="font-bold text-primary flex items-center gap-1.5 font-mono">
                      <Flame className="w-3.5 h-3.5 text-rose-500" />
                      <span>2. Hotspot Trajectories</span>
                    </div>
                    <p className="text-[11px] text-primary-secondary leading-relaxed">
                      Watch files migrate from emerald (stable) to crimson (hotspot). If a core engine suddenly sparks high churn in a recent era, inspect recent PRs for feature bloat.
                    </p>
                  </div>

                  <div className="p-3 bg-surface-subtle/40 rounded-md border border-border-subtle/70 space-y-2">
                    <div className="font-bold text-primary flex items-center gap-1.5 font-mono">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>3. Historical Remediation</span>
                    </div>
                    <p className="text-[11px] text-primary-secondary leading-relaxed">
                      Use milestone telemetry to schedule refactoring sprints immediately after rapid feature expansions before technical debt solidifies.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: BUS FACTOR RISK & KNOWLEDGE LOSS VIEW              */}
      {/* ========================================================= */}
      {activeTab === 'bus-factor' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Tab Engine Header & Explanation Button */}
          <div className="p-4 bg-surface border border-border-subtle rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <h3 className="font-bold text-primary text-sm font-mono">Bus Factor &amp; Knowledge Loss Risk Engine</h3>
              </div>
              <p className="text-xs text-primary-secondary mt-0.5">
                Correlates code churn velocity with maintainer activity to uncover single-points-of-failure and abandoned Zombie Hotspots.
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleGuide('bus-factor')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold border border-cyan-500/50 bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 hover:bg-cyan-500/25 transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span>{showGuide['bus-factor'] ? 'Hide Bus Factor Guide' : 'What is Bus Factor & Zombie Hotspot?'}</span>
            </button>
          </div>

          {/* Expandable Overview Guide */}
          {showGuide['bus-factor'] && (
            <Panel className="p-4 bg-cyan-500/5 border-cyan-500/30 text-xs space-y-2 animate-in fade-in">
              <div className="font-bold text-primary flex items-center gap-2 font-mono">
                <BookOpen className="w-4 h-4 text-accent" />
                <span>Quick Guide: Maintainer Dormancy &amp; Institutional Risk</span>
              </div>
              <p className="text-primary-secondary leading-relaxed">
                <strong>Bus Factor</strong> measures how many engineers can leave before a module becomes unmaintainable. When a file has a Bus Factor of 1, only one person understands its edge cases. If that maintainer is <em>departed or dormant</em>, modifying that file is high-risk. We classify these as <strong>Zombie Hotspots</strong>: files with rapid code churn where 80%+ of original authorship belongs to inactive developers.
              </p>
            </Panel>
          )}

          {isBusLoading ? (
            <div className="space-y-4">
              <LoadingSkeleton className="h-28 w-full" />
              <LoadingSkeleton className="h-64 w-full" />
            </div>
          ) : busError ? (
            <Panel className="p-6 text-center border-rose-500/30 bg-rose-500/5 space-y-2">
              <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
              <div className="text-sm font-semibold text-rose-500">{busError}</div>
              <Button size="sm" variant="outline" onClick={loadKnowledge} className="mt-2">
                Retry Bus Factor Calculation
              </Button>
            </Panel>
          ) : knowledgeData ? (
            <>
              {/* Bus Factor Stat Panels */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Panel className="p-4 border-rose-500/30 bg-rose-500/5">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-rose-500 font-semibold flex items-center justify-between">
                    <span>Zombie Hotspots</span>
                    <Flame className="w-3.5 h-3.5 text-rose-500" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-rose-500 mt-1">
                    {knowledgeData.zombieHotspotsCount}
                  </div>
                  <div className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">
                    High churn + departed maintainers
                  </div>
                </Panel>

                <Panel className="p-4 border-amber-500/30 bg-amber-500/5">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-amber-500 font-semibold">
                    Single-Maintainer
                  </div>
                  <div className="text-2xl font-bold font-mono text-amber-500 mt-1">
                    {knowledgeData.singleMaintainerFilesCount}
                  </div>
                  <div className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                    Files with bus factor = 1
                  </div>
                </Panel>

                <Panel className="p-4">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-primary-muted font-semibold">
                    Average Bus Factor
                  </div>
                  <div className="text-2xl font-bold font-mono text-primary mt-1">
                    {knowledgeData.averageBusFactor.toFixed(1)}
                  </div>
                  <div className="text-xs text-primary-muted mt-0.5">Active maintainers per module</div>
                </Panel>

                <Panel className="p-4">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-primary-muted font-semibold">
                    Attributed Files
                  </div>
                  <div className="text-2xl font-bold font-mono text-primary mt-1">
                    {knowledgeData.totalAnalyzedFiles}
                  </div>
                  <div className="text-xs text-primary-muted mt-0.5">With verified authorship lineage</div>
                </Panel>
              </div>

              {/* Visual Bus Factor Risk Heatmap Matrix */}
              <Panel className="p-4 space-y-3 font-mono text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border-subtle">
                  <div>
                    <h4 className="font-bold text-primary text-sm flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-500" />
                      Visual Knowledge Loss & Bus Factor Heatmap
                    </h4>
                    <p className="text-[11px] text-primary-secondary mt-0.5">
                      Visual risk density cells shaded by maintainer abandonment hazard. Hover any cell for risk diagnostics.
                    </p>
                  </div>

                  {/* Heatmap Legend */}
                  <div className="flex items-center gap-3 text-[11px] shrink-0 font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-rose-600 inline-block" />
                      <span className="text-primary font-semibold">Critical (Zombie)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-amber-500 inline-block" />
                      <span className="text-primary font-semibold">High Risk</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                      <span className="text-primary font-semibold">Normal</span>
                    </div>
                  </div>
                </div>

                {/* Visual Cells Grid */}
                <div className="pt-2">
                  <div className="flex flex-wrap gap-2">
                    {filteredBusItems.map((item, idx) => {
                      const isCritical = item.riskLevel === 'CRITICAL' || item.isZombieHotspot;
                      const isHigh = item.riskLevel === 'HIGH';
                      const isSelected = selectedBusCell === item.path;

                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedBusCell(isSelected ? null : item.path)}
                          title={`${item.path}\nRisk: ${item.riskLevel}\nMaintainer: @${item.primaryMaintainer} (${item.maintainerStatus})\nChurn: ${item.churnScore}/100\n${item.reason}`}
                          className={`w-11 h-11 rounded-md flex flex-col items-center justify-center cursor-pointer transition-all relative group select-none shadow-xs border ${
                            isSelected ? 'ring-2 ring-accent ring-offset-2 ring-offset-canvas scale-110 z-20' : ''
                          } ${
                            isCritical
                              ? 'bg-rose-500/25 border-rose-500/60 text-rose-400 hover:bg-rose-500/40 hover:scale-110'
                              : isHigh
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/35 hover:scale-110'
                              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 hover:scale-110'
                          }`}
                        >
                          <span className="text-[10px] font-bold font-mono">
                            {item.churnScore}
                          </span>
                          {isCritical && (
                            <span className="text-[8px] font-bold text-rose-500 leading-none">
                              🧟
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Panel>

              {/* Table of At-Risk Files */}
              <Panel className="p-4 space-y-4 font-mono text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                      Knowledge Risk Register:
                    </span>
                    <span className="text-primary-muted font-normal text-xs">
                      ({filteredBusItems.length} {filteredBusItems.length === 1 ? 'file' : 'files'} shown)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setBusFilter('all')}
                      className={`px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                        busFilter === 'all'
                          ? 'bg-accent/15 text-accent border border-accent/40 font-bold'
                          : 'bg-surface-subtle text-primary-muted hover:text-primary border border-border-subtle'
                      }`}
                    >
                      All Files ({knowledgeData.riskItems?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBusFilter('zombie')}
                      className={`px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                        busFilter === 'zombie'
                          ? 'bg-rose-500/15 text-rose-500 border border-rose-500/40 font-bold'
                          : 'bg-surface-subtle text-primary-muted hover:text-primary border border-border-subtle'
                      }`}
                    >
                      🧟 Zombie Hotspots ({knowledgeData.zombieHotspotsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBusFilter('critical')}
                      className={`px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                        busFilter === 'critical'
                          ? 'bg-amber-500/15 text-amber-500 border border-amber-500/40 font-bold'
                          : 'bg-surface-subtle text-primary-muted hover:text-primary border border-border-subtle'
                      }`}
                    >
                      Critical &amp; High Risk
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
                        {filteredBusItems.map((item, idx) => (
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
                        {filteredBusItems.length === 0 && (
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

              {/* Comprehensive Bus Factor & Knowledge Loss Guide (Downside) */}
              <div className="p-4 bg-surface border border-border-subtle rounded-lg shadow-xs space-y-4 font-sans text-xs">
                <div className="flex items-center gap-2 pb-2.5 border-b border-border-subtle">
                  <BookOpen className="w-4 h-4 text-accent" />
                  <h4 className="font-bold text-primary text-sm font-mono">Bus Factor &amp; Zombie Hotspot Remediation Guide</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-surface-subtle/40 rounded-md border border-border-subtle/70 space-y-2">
                    <div className="font-bold text-primary flex items-center gap-1.5 font-mono">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                      <span>1. Zombie Hotspots</span>
                    </div>
                    <p className="text-[11px] text-primary-secondary leading-relaxed">
                      A <strong>Zombie Hotspot</strong> is a file with high mutation churn (&ge;60/100) where 80%+ of original lines were authored by engineers who have left the team or have been dormant for &gt;12 months.
                    </p>
                    <p className="text-[10px] text-primary-muted">
                      Modifying these files without institutional memory causes regressions at 3x the normal rate.
                    </p>
                  </div>

                  <div className="p-3 bg-surface-subtle/40 rounded-md border border-border-subtle/70 space-y-2">
                    <div className="font-bold text-primary flex items-center gap-1.5 font-mono">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span>2. Bus Factor = 1 Hazards</span>
                    </div>
                    <p className="text-[11px] text-primary-secondary leading-relaxed">
                      When a single engineer authored almost the entire logic of a critical file, the project is exposed to knowledge evaporation if that engineer becomes unavailable.
                    </p>
                  </div>

                  <div className="p-3 bg-surface-subtle/40 rounded-md border border-border-subtle/70 space-y-2">
                    <div className="font-bold text-primary flex items-center gap-1.5 font-mono">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>3. Knowledge Transfer Playbook</span>
                    </div>
                    <p className="text-[11px] text-primary-secondary leading-relaxed">
                      Recommended risk mitigation protocols:
                    </p>
                    <ul className="text-[10px] text-primary-muted space-y-1 list-disc pl-3">
                      <li>Click "Trace AST" to understand exact symbol lineage in Code Archaeology</li>
                      <li>Assign co-reviewers to all PRs modifying Zombie Hotspots</li>
                      <li>Schedule targeted architectural documentation passes</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: BLAST RADIUS PREDICTOR VIEW                        */}
      {/* ========================================================= */}
      {activeTab === 'blast-radius' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Tab Engine Header & Explanation Button */}
          <div className="p-4 bg-surface border border-border-subtle rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-primary text-sm font-mono">Architectural Blast Radius Predictor</h3>
              </div>
              <p className="text-xs text-primary-secondary mt-0.5">
                Simulate mutation ripple effects, transitively coupled files, and regression test suites before committing modifications.
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleGuide('blast-radius')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold border border-cyan-500/50 bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 hover:bg-cyan-500/25 transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span>{showGuide['blast-radius'] ? 'Hide Blast Guide' : 'What is Blast Radius Predictor?'}</span>
            </button>
          </div>

          {/* Expandable Overview Guide */}
          {showGuide['blast-radius'] && (
            <Panel className="p-4 bg-cyan-500/5 border-cyan-500/30 text-xs space-y-2 animate-in fade-in">
              <div className="font-bold text-primary flex items-center gap-2 font-mono">
                <BookOpen className="w-4 h-4 text-accent" />
                <span>Quick Guide: Pre-Commit Hazard Simulation</span>
              </div>
              <p className="text-primary-secondary leading-relaxed">
                The <strong>Blast Radius Predictor</strong> analyzes static dependencies and historical co-change linkages to simulate what breaks if you modify a specific file. It flags which downstream companion files must be updated, highlights regression test suites marked <strong>MUST PASS</strong>, and recommends active maintainers who should review the pull request.
              </p>
            </Panel>
          )}

          {/* Target File Input Simulator */}
          <Panel className="p-5 space-y-4">
            <div>
              <h4 className="text-xs font-bold text-primary font-mono uppercase tracking-wider">
                Select or Enter Target Source File
              </h4>
              <p className="text-xs text-primary-secondary mt-1">
                Enter any file path in the repository to simulate its architectural blast radius.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                runSimulation();
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={filePathInput}
                  onChange={(e) => setFilePathInput(e.target.value)}
                  placeholder="e.g. apps/api/src/routes/repositoryRoutes.ts"
                  className="w-full px-3 py-2 bg-canvas border border-border-strong rounded-lg text-xs font-mono text-primary placeholder:text-primary-muted focus:outline-hidden focus:ring-2 focus:ring-accent"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSimulating || !filePathInput.trim()}
                leftIcon={<Zap className="w-3.5 h-3.5" />}
              >
                {isSimulating ? 'Simulating...' : 'Run Simulation'}
              </Button>
            </form>
          </Panel>

          {isSimulating ? (
            <div className="space-y-4">
              <LoadingSkeleton className="h-28 w-full" />
              <LoadingSkeleton className="h-64 w-full" />
            </div>
          ) : blastError ? (
            <Panel className="p-6 text-center border-rose-500/30 bg-rose-500/5 space-y-2">
              <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
              <div className="text-sm font-semibold text-rose-500">{blastError}</div>
              <Button size="sm" variant="outline" onClick={() => runSimulation()} className="mt-2">
                Retry Simulation
              </Button>
            </Panel>
          ) : impactData ? (
            <>
              {/* Hazard Level Summary Banner */}
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  impactData.riskLevel === 'CRITICAL'
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-500'
                    : impactData.riskLevel === 'HIGH'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-500'
                    : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 shrink-0" />
                  <div>
                    <div className="text-xs uppercase font-mono tracking-wider font-bold">
                      Hazard Classification: {impactData.riskLevel}
                    </div>
                    <div className="text-xs text-primary-secondary mt-0.5">
                      Changing <span className="font-mono font-semibold text-primary">{impactData.targetFiles?.join(', ')}</span> triggers architectural side-effects.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="px-2.5 py-1 rounded bg-surface border border-border-subtle font-bold text-primary">
                    Blast Score: {impactData.blastRadiusScore}/100
                  </span>
                </div>
              </div>

              {/* Blast Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Panel className="p-4">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-primary-muted font-semibold">
                    Direct Impact
                  </div>
                  <div className="text-2xl font-bold font-mono text-primary mt-1">
                    {impactData.directImpactCount}
                  </div>
                  <div className="text-xs text-primary-muted mt-0.5">Immediate file dependencies</div>
                </Panel>

                <Panel className="p-4">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-primary-muted font-semibold">
                    Indirect Ripple
                  </div>
                  <div className="text-2xl font-bold font-mono text-primary mt-1">
                    {impactData.indirectImpactCount}
                  </div>
                  <div className="text-xs text-primary-muted mt-0.5">Downstream secondary nodes</div>
                </Panel>

                <Panel className="p-4">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-primary-muted font-semibold">
                    Coupled Companions
                  </div>
                  <div className="text-2xl font-bold font-mono text-primary mt-1">
                    {impactData.coupledCompanions?.length || 0}
                  </div>
                  <div className="text-xs text-primary-muted mt-0.5">Co-change temporal links</div>
                </Panel>

                <Panel className="p-4">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-primary-muted font-semibold">
                    Suites at Risk
                  </div>
                  <div className="text-2xl font-bold font-mono text-rose-500 mt-1">
                    {impactData.affectedTests?.length || 0}
                  </div>
                  <div className="text-xs text-primary-muted mt-0.5">Regression tests to run</div>
                </Panel>
              </div>

              {/* Side by side: Coupled Companions & Test Suites */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Coupled Companions */}
                <Panel className="p-4 space-y-3">
                  <h4 className="font-bold text-primary text-xs flex items-center justify-between uppercase tracking-wider border-b border-border-subtle pb-2">
                    <span className="flex items-center gap-1.5">
                      <GitMerge className="w-3.5 h-3.5 text-accent" />
                      Coupled Companion Artifacts
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

                {/* Regression Test Suites */}
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

              {/* Comprehensive Blast Radius Simulation Guide (Downside) */}
              <div className="p-4 bg-surface border border-border-subtle rounded-lg shadow-xs space-y-4 font-sans text-xs">
                <div className="flex items-center gap-2 pb-2.5 border-b border-border-subtle">
                  <BookOpen className="w-4 h-4 text-accent" />
                  <h4 className="font-bold text-primary text-sm font-mono">Blast Radius &amp; Safe Release Playbook</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-surface-subtle/40 rounded-md border border-border-subtle/70 space-y-2">
                    <div className="font-bold text-primary flex items-center gap-1.5 font-mono">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>1. Simulation Mechanism</span>
                    </div>
                    <p className="text-[11px] text-primary-secondary leading-relaxed">
                      Combines Abstract Syntax Tree symbol import graphs with historical PR commit linkages to identify both direct and transitive fallout.
                    </p>
                  </div>

                  <div className="p-3 bg-surface-subtle/40 rounded-md border border-border-subtle/70 space-y-2">
                    <div className="font-bold text-primary flex items-center gap-1.5 font-mono">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>2. Required Verification</span>
                    </div>
                    <p className="text-[11px] text-primary-secondary leading-relaxed">
                      Always execute the test suites marked <span className="font-semibold text-emerald-600 dark:text-emerald-400">MUST PASS</span> locally or in CI before requesting code review.
                    </p>
                  </div>

                  <div className="p-3 bg-surface-subtle/40 rounded-md border border-border-subtle/70 space-y-2">
                    <div className="font-bold text-primary flex items-center gap-1.5 font-mono">
                      <User className="w-3.5 h-3.5 text-accent" />
                      <span>3. Recommended Approvers</span>
                    </div>
                    <p className="text-[11px] text-primary-secondary leading-relaxed">
                      Tag the recommended PR reviewers derived from recent merged PRs and domain expertise scoring to ensure safe deployment.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default ForensicAnalysisPage;
