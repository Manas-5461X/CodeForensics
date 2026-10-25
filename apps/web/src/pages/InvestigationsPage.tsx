import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Panel } from '../components/ui/Panel.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton.js';
import { useRepository } from '../context/RepositoryContext.js';
import { useApiClient } from '../utils/apiClient.js';
import type {
  InvestigationRecord,
  InvestigationStatus,
  InvestigationEvidenceItem,
} from '@codeforensics/shared';
import {
  Plus,
  Search,
  AlertTriangle,
  GitCommit,
  Trash2,
  ExternalLink,
  FileQuestion,
  X,
  FolderGit2,
} from 'lucide-react';

export interface ScopePresetOption {
  id: string;
  icon: string;
  label: string;
  description: string;
  format: (repo: string) => string;
}

export const SCOPE_PRESETS: ScopePresetOption[] = [
  {
    id: 'whole_repo',
    icon: '📁',
    label: 'Entire Repository',
    description: 'Whole codebase, broad architecture, or general audit',
    format: (repo: string) => `${repo} (Whole Repo)`,
  },
  {
    id: 'bug_defect',
    icon: '🐛',
    label: 'Bug / Defect Root-Cause',
    description: 'Investigating broken behavior, error throws, or regressions',
    format: (repo: string) => `${repo} • Bug / Defect Analysis`,
  },
  {
    id: 'pr_review',
    icon: '🔀',
    label: 'Pull Request & Commit Review',
    description: 'Investigating changes, merge impact, or regressions from a PR',
    format: (repo: string) => `${repo} • PR / Commit Review`,
  },
  {
    id: 'performance',
    icon: '⚡',
    label: 'Performance & Memory',
    description: 'Memory leaks, latency spikes, re-renders, or bundle size',
    format: (repo: string) => `${repo} • Performance & Latency`,
  },
  {
    id: 'security',
    icon: '🔒',
    label: 'Security & Auth Audit',
    description: 'Authentication, token handling, permissions, or security flaws',
    format: (repo: string) => `${repo} • Security & Auth`,
  },
  {
    id: 'backend_api',
    icon: '🧩',
    label: 'Backend & API Subsystem',
    description: 'Server endpoints, business logic, middleware, routes',
    format: (repo: string) => `${repo} • API & Backend`,
  },
  {
    id: 'frontend_ui',
    icon: '🎨',
    label: 'Frontend & UI Subsystem',
    description: 'React components, client state, styling, user interactions',
    format: (repo: string) => `${repo} • Frontend & UI`,
  },
  {
    id: 'database',
    icon: '🗄️',
    label: 'Database & Models',
    description: 'Schemas, ORM models, migrations, queries, caching',
    format: (repo: string) => `${repo} • Database & Storage`,
  },
  {
    id: 'build_ci',
    icon: '⚙️',
    label: 'Build, CI/CD & Tooling',
    description: 'Build configs, bundlers, GitHub Actions, workflows',
    format: (repo: string) => `${repo} • Build & CI/CD`,
  },
  {
    id: 'dependencies',
    icon: '📦',
    label: 'Dependencies & Upgrades',
    description: 'External packages, breaking library updates, CVE patches',
    format: (repo: string) => `${repo} • Dependencies`,
  },
  {
    id: 'custom',
    icon: '📝',
    label: 'Custom Specific Scope',
    description: 'Target a specific source code file, function, or PR #',
    format: (repo: string) => `${repo} • Custom Scope`,
  },
];

export function getScopeCategoryInfo(scope: string): { icon: string; label: string } {
  const s = scope.toLowerCase();
  if (s.includes('bug') || s.includes('defect') || s.includes('error')) {
    return { icon: '🐛', label: 'Bug Analysis' };
  }
  if (s.includes('pr') || s.includes('pull') || s.includes('commit') || s.includes('review')) {
    return { icon: '🔀', label: 'PR Review' };
  }
  if (s.includes('perf') || s.includes('latency') || s.includes('leak') || s.includes('memory')) {
    return { icon: '⚡', label: 'Performance' };
  }
  if (s.includes('sec') || s.includes('auth') || s.includes('token') || s.includes('vulnerab')) {
    return { icon: '🔒', label: 'Security' };
  }
  if (s.includes('api') || s.includes('backend') || s.includes('server') || s.includes('route')) {
    return { icon: '🧩', label: 'API Backend' };
  }
  if (s.includes('ui') || s.includes('front') || s.includes('component') || s.includes('render')) {
    return { icon: '🎨', label: 'Frontend UI' };
  }
  if (s.includes('data') || s.includes('db') || s.includes('model') || s.includes('schema') || s.includes('query')) {
    return { icon: '🗄️', label: 'Database' };
  }
  if (s.includes('ci') || s.includes('build') || s.includes('workflow') || s.includes('action')) {
    return { icon: '⚙️', label: 'Build CI/CD' };
  }
  if (s.includes('dep') || s.includes('package') || s.includes('upgrade') || s.includes('version')) {
    return { icon: '📦', label: 'Dependencies' };
  }
  return { icon: '📁', label: 'Whole Repo' };
}

interface LocationState {
  prefillQuestion?: string;
  prefillScope?: string;
  prefillEvidence?: Partial<InvestigationEvidenceItem>;
}

export function InvestigationsPage() {
  const { activeRepo } = useRepository();
  const { get, post, patch, del } = useApiClient();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | undefined;

  const [investigations, setInvestigations] = useState<InvestigationRecord[]>([]);
  const [selectedInv, setSelectedInv] = useState<InvestigationRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

  // New Investigation Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedScopePreset, setSelectedScopePreset] = useState<string>('whole_repo');
  const [newQuestion, setNewQuestion] = useState<string>('');
  const [newScope, setNewScope] = useState<string>('');
  const [newStatus, setNewStatus] = useState<InvestigationStatus>('open');
  const [newHypothesis, setNewHypothesis] = useState<string>('');
  const [newObservation, setNewObservation] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Add Item States for Selected Investigation
  const [addHypothesisInput, setAddHypothesisInput] = useState<string>('');
  const [addObservationInput, setAddObservationInput] = useState<string>('');
  const [addFindingInput, setAddFindingInput] = useState<string>('');

  // Delete Confirmation State
  const [invToDelete, setInvToDelete] = useState<InvestigationRecord | null>(null);

  const handleScopePresetChange = (presetKey: string) => {
    setSelectedScopePreset(presetKey);
    const repoName = activeRepo?.fullName || 'Repository';
    const found = SCOPE_PRESETS.find((p) => p.id === presetKey);
    if (found) {
      setNewScope(found.format(repoName));
    } else {
      setNewScope(`${repoName} (Whole Repo)`);
    }
  };

  const filteredInvestigations = investigations.filter((inv) => {
    if (scopeFilter === 'all') return true;
    const s = inv.scope.toLowerCase();
    if (scopeFilter === 'bug') return s.includes('bug') || s.includes('defect') || s.includes('error');
    if (scopeFilter === 'pr') return s.includes('pr') || s.includes('pull') || s.includes('commit') || s.includes('review');
    if (scopeFilter === 'perf') return s.includes('perf') || s.includes('latency') || s.includes('leak') || s.includes('memory');
    if (scopeFilter === 'security') return s.includes('sec') || s.includes('auth') || s.includes('token') || s.includes('vulnerab');
    if (scopeFilter === 'api') return s.includes('api') || s.includes('backend') || s.includes('server') || s.includes('route');
    if (scopeFilter === 'ui') return s.includes('ui') || s.includes('front') || s.includes('component') || s.includes('render');
    if (scopeFilter === 'database') return s.includes('data') || s.includes('db') || s.includes('model') || s.includes('schema') || s.includes('query');
    if (scopeFilter === 'ci') return s.includes('ci') || s.includes('build') || s.includes('workflow') || s.includes('action');
    if (scopeFilter === 'deps') return s.includes('dep') || s.includes('package') || s.includes('upgrade') || s.includes('version');
    if (scopeFilter === 'whole') return s.includes('whole') || s.includes('repo');
    return true;
  });

  // Handle location prefill
  useEffect(() => {
    if (locationState?.prefillQuestion) {
      setNewQuestion(locationState.prefillQuestion);
      setNewScope(locationState.prefillScope || '');
      setSelectedScopePreset('custom');
      setIsCreateModalOpen(true);
    }
  }, [locationState]);

  // Fetch investigations
  const fetchInvestigations = useCallback(async () => {
    if (!activeRepo) return;
    setIsLoading(true);
    setError(null);

    try {
      const params: Record<string, string> = {
        repositoryId: activeRepo.id,
      };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await get<InvestigationRecord[]>('/api/v1/investigations', params);
      if (res.data) {
        setInvestigations(res.data);
        if (res.data.length > 0) {
          // Keep current selection or default to first
          setSelectedInv((prev) => {
            if (prev) {
              const matched = res.data?.find((i) => i.id === prev.id);
              if (matched) return matched;
            }
            return res.data![0];
          });
        } else {
          setSelectedInv(null);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch investigations';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [activeRepo, statusFilter, searchQuery, get]);

  useEffect(() => {
    void fetchInvestigations();
  }, [fetchInvestigations]);

  // Handle creation
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRepo) return;
    if (!newQuestion.trim()) {
      setFormError('Question is required');
      return;
    }
    const scopeToUse =
      newScope.trim() ||
      (activeRepo ? `${activeRepo.fullName} (Whole Repo)` : 'Whole Repository');

    setIsSubmitting(true);
    setFormError(null);

    try {
      const hypotheses = newHypothesis.trim() ? [newHypothesis.trim()] : [];
      const observations = newObservation.trim() ? [newObservation.trim()] : [];
      const evidenceItems: InvestigationEvidenceItem[] = [];

      if (locationState?.prefillEvidence) {
        evidenceItems.push({
          id: `ev-${Date.now()}`,
          type: (locationState.prefillEvidence.type as any) || 'commit',
          identifier: locationState.prefillEvidence.identifier || 'Initial Ref',
          title: locationState.prefillEvidence.title || 'Referenced Evidence',
          url: locationState.prefillEvidence.url,
          category: locationState.prefillEvidence.category || 'FACT',
          summary: locationState.prefillEvidence.summary,
          addedAt: new Date().toISOString(),
        });
      }

      const res = await post<InvestigationRecord>('/api/v1/investigations', {
        repositoryId: activeRepo.id,
        question: newQuestion.trim(),
        scope: scopeToUse,
        status: newStatus,
        hypotheses,
        observations,
        evidenceItems,
      });

      if (res.data) {
        setIsCreateModalOpen(false);
        setNewQuestion('');
        setNewScope('');
        setNewHypothesis('');
        setNewObservation('');
        setSelectedInv(res.data);
        void fetchInvestigations();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create investigation';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update status
  const handleStatusChange = async (newStat: InvestigationStatus) => {
    if (!selectedInv) return;
    try {
      const res = await patch<InvestigationRecord>(`/api/v1/investigations/${selectedInv.id}`, {
        status: newStat,
      });
      if (res.data) {
        setSelectedInv(res.data);
        setInvestigations((prev) =>
          prev.map((i) => (i.id === res.data!.id ? res.data! : i))
        );
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  // Handle add hypothesis
  const handleAddHypothesis = async () => {
    if (!selectedInv || !addHypothesisInput.trim()) return;
    const updatedHypotheses = [...selectedInv.hypotheses, addHypothesisInput.trim()];
    try {
      const res = await patch<InvestigationRecord>(`/api/v1/investigations/${selectedInv.id}`, {
        hypotheses: updatedHypotheses,
      });
      if (res.data) {
        setSelectedInv(res.data);
        setInvestigations((prev) =>
          prev.map((i) => (i.id === res.data!.id ? res.data! : i))
        );
        setAddHypothesisInput('');
      }
    } catch (err) {
      console.error('Failed to add hypothesis', err);
    }
  };

  // Handle add observation
  const handleAddObservation = async () => {
    if (!selectedInv || !addObservationInput.trim()) return;
    const updatedObservations = [...selectedInv.observations, addObservationInput.trim()];
    try {
      const res = await patch<InvestigationRecord>(`/api/v1/investigations/${selectedInv.id}`, {
        observations: updatedObservations,
      });
      if (res.data) {
        setSelectedInv(res.data);
        setInvestigations((prev) =>
          prev.map((i) => (i.id === res.data!.id ? res.data! : i))
        );
        setAddObservationInput('');
      }
    } catch (err) {
      console.error('Failed to add observation', err);
    }
  };

  // Handle add finding
  const handleAddFinding = async () => {
    if (!selectedInv || !addFindingInput.trim()) return;
    const updatedFindings = [...selectedInv.findings, addFindingInput.trim()];
    try {
      const res = await patch<InvestigationRecord>(`/api/v1/investigations/${selectedInv.id}`, {
        findings: updatedFindings,
      });
      if (res.data) {
        setSelectedInv(res.data);
        setInvestigations((prev) =>
          prev.map((i) => (i.id === res.data!.id ? res.data! : i))
        );
        setAddFindingInput('');
      }
    } catch (err) {
      console.error('Failed to add finding', err);
    }
  };

  // Handle deletion
  const handleDeleteConfirm = async () => {
    if (!invToDelete) return;
    try {
      await del(`/api/v1/investigations/${invToDelete.id}`);
      setInvToDelete(null);
      void fetchInvestigations();
    } catch (err) {
      console.error('Failed to delete investigation', err);
    }
  };

  const getStatusBadge = (status: InvestigationStatus) => {
    switch (status) {
      case 'resolved':
        return <Badge category="FACT">RESOLVED</Badge>;
      case 'in_progress':
        return <Badge category="INFERENCE">IN PROGRESS</Badge>;
      case 'inconclusive':
        return <Badge category="UNKNOWN">INCONCLUSIVE</Badge>;
      default:
        return <Badge category="HYPOTHESIS">OPEN</Badge>;
    }
  };

  if (!activeRepo) {
    return (
      <EmptyState
        icon={<FolderGit2 className="w-8 h-8 text-primary-muted" />}
        title="No Repository Selected"
        description="Select an authorized repository from the workspace header to view and manage persistent investigation records."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-primary tracking-tight">
            Investigations & Evidence
          </h2>
          <p className="text-xs text-primary-secondary mt-0.5">
            Preserve questions, hypotheses, observations, and source citations as reproducible forensic records.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setFormError(null);
            if (!newScope && activeRepo) {
              setNewScope(`${activeRepo.fullName} (Whole Repo)`);
              setSelectedScopePreset('whole_repo');
            }
            setIsCreateModalOpen(true);
          }}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          New Investigation
        </Button>
      </div>

      {/* Explainer Banner */}
      <div className="p-4 rounded-lg bg-surface border border-border-subtle shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-accent" />
            <h3 className="text-xs font-bold text-primary">
              How Investigations & Target Scopes Work
            </h3>
          </div>
          <span className="text-[11px] text-primary-muted font-mono">
            Repo: {activeRepo.fullName}
          </span>
        </div>
        <p className="text-xs text-primary-secondary leading-relaxed">
          An <strong>Investigation</strong> is a structured workspace for diagnosing a tricky bug, understanding a controversial PR, or preserving architectural evidence. <strong>Target Scope</strong> categorizes the boundary of your investigation (e.g. 🐛 Bug Defect, 🔀 PR Review, ⚡ Performance, or 🧩 API Backend) so your hypotheses, facts, and code citations stay organized and filterable.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-2.5 rounded bg-surface-subtle border border-border-subtle space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-primary text-xs">
              <span className="w-4 h-4 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center">1</span>
              <span>Pick Scope Category</span>
            </div>
            <p className="text-[11px] text-primary-muted leading-relaxed">
              Select whether this case is about a bug, PR review, performance, or subsystem.
            </p>
          </div>
          <div className="p-2.5 rounded bg-surface-subtle border border-border-subtle space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-primary text-xs">
              <span className="w-4 h-4 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center">2</span>
              <span>Collect Clues & Hypotheses</span>
            </div>
            <p className="text-[11px] text-primary-muted leading-relaxed">
              Formulate competing theories and record facts found during code inspection.
            </p>
          </div>
          <div className="p-2.5 rounded bg-surface-subtle border border-border-subtle space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-primary text-xs">
              <span className="w-4 h-4 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center">3</span>
              <span>Cite Evidence & Conclude</span>
            </div>
            <p className="text-[11px] text-primary-muted leading-relaxed">
              Attach commits and PRs from Archaeology. Publish the verified finding once solved.
            </p>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-md bg-[#fdf2f2] border border-[#f8b4b4] text-xs text-[#9b1c1c] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void fetchInvestigations()}>
            Retry
          </Button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 md:pb-0">
          {(['all', 'open', 'in_progress', 'resolved', 'inconclusive'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-accent text-white font-semibold'
                  : 'bg-surface text-primary-secondary hover:text-primary border border-border-subtle'
              }`}
            >
              {st === 'in_progress' ? 'In Progress' : st}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            className="bg-surface text-xs text-primary rounded-md px-2.5 py-1.5 border border-border-strong focus:outline-none focus:border-link font-medium"
          >
            <option value="all">Filter: All Scopes</option>
            <option value="bug">🐛 Bugs & Defects</option>
            <option value="pr">🔀 PR & Commits</option>
            <option value="perf">⚡ Performance</option>
            <option value="security">🔒 Security & Auth</option>
            <option value="api">🧩 API & Backend</option>
            <option value="ui">🎨 UI & Frontend</option>
            <option value="database">🗄️ Database</option>
            <option value="ci">⚙️ Build & CI/CD</option>
            <option value="deps">📦 Dependencies</option>
            <option value="whole">📁 Whole Repository</option>
          </select>
          <div className="relative sm:w-56">
            <Search className="w-3.5 h-3.5 text-primary-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search question or scope..."
              className="w-full bg-surface text-xs text-primary rounded-md pl-9 pr-3 py-1.5 border border-border-strong focus:outline-none focus:border-link"
            />
          </div>
        </div>
      </div>

      {/* Main Workbench Layout */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <LoadingSkeleton className="h-96 w-full" />
          <div className="lg:col-span-2">
            <LoadingSkeleton className="h-96 w-full" />
          </div>
        </div>
      ) : investigations.length === 0 ? (
        <EmptyState
          icon={<FileQuestion className="w-8 h-8 text-primary-muted" />}
          title="No Investigations Found"
          description="Formulate a forensic question and preserve traceable evidence records for this repository."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Start Investigation
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Mobile View Switcher (<lg) */}
          <div className="flex lg:hidden items-center p-0.5 bg-surface-subtle border border-border-subtle rounded-md text-xs font-mono">
            <button
              type="button"
              onClick={() => setMobileView('list')}
              className={`flex-1 py-1.5 rounded transition-colors text-center font-medium ${
                mobileView === 'list'
                  ? 'bg-surface text-primary shadow-xs font-bold'
                  : 'text-primary-muted hover:text-primary'
              }`}
            >
              Records ({investigations.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileView('detail')}
              disabled={!selectedInv}
              className={`flex-1 py-1.5 rounded transition-colors text-center font-medium ${
                mobileView === 'detail'
                  ? 'bg-surface text-primary shadow-xs font-bold'
                  : 'text-primary-muted hover:text-primary disabled:opacity-40'
              }`}
            >
              Record Detail
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Saved Investigations List Column */}
            <div className={`space-y-3 lg:col-span-1 ${mobileView === 'detail' ? 'hidden lg:block' : 'block'}`}>
              <div className="flex items-center justify-between px-1">
                <label className="text-xs font-semibold text-primary-muted uppercase tracking-wider block">
                  Saved Records ({filteredInvestigations.length})
                </label>
              </div>

              <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
                {filteredInvestigations.map((inv) => {
                  const scopeInfo = getScopeCategoryInfo(inv.scope);
                  return (
                    <div
                      key={inv.id}
                      onClick={() => {
                        setSelectedInv(inv);
                        setMobileView('detail');
                      }}
                      className={`p-3.5 rounded-md border cursor-pointer transition-all ${
                        selectedInv?.id === inv.id
                          ? 'bg-surface border-accent shadow-xs'
                          : 'bg-surface border-border-subtle hover:border-border-strong'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {getStatusBadge(inv.status)}
                        <span className="text-[11px] font-mono text-primary-muted">
                          {new Date(inv.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-primary mt-2 line-clamp-2 leading-snug">
                        {inv.question}
                      </h4>
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-surface-subtle border border-border-subtle text-primary truncate max-w-full inline-flex items-center gap-1">
                          <span>{scopeInfo.icon}</span>
                          <span className="truncate">{inv.scope}</span>
                        </span>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-border-subtle flex items-center justify-between text-[11px] text-primary-muted font-mono">
                        <span>{inv.evidenceItems.length} evidence citation(s)</span>
                        <span>{inv.hypotheses.length} hypotheses</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Investigation Detail Workbench */}
            {selectedInv ? (
              <div className={`lg:col-span-2 space-y-4 ${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}>
                {/* Mobile Back Link */}
                <div className="lg:hidden">
                  <button
                    type="button"
                    onClick={() => setMobileView('list')}
                    className="inline-flex items-center gap-1.5 text-xs text-link hover:underline font-mono py-1"
                  >
                    ← Back to Records List
                  </button>
                </div>

                <Panel
                  title="Forensic Investigation Record"
                  subtitle={`ID: ${selectedInv.id} • Updated ${new Date(selectedInv.updatedAt).toLocaleDateString()}`}
                  action={
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedInv.status}
                        onChange={(e) => handleStatusChange(e.target.value as InvestigationStatus)}
                        className="bg-surface-subtle text-xs font-semibold text-primary rounded border border-border-strong px-2 py-1 focus:outline-none"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="inconclusive">Inconclusive</option>
                      </select>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setInvToDelete(selectedInv)}
                        leftIcon={<Trash2 className="w-3.5 h-3.5 text-danger" />}
                      >
                        Delete
                      </Button>
                    </div>
                  }
                >
                <div className="space-y-6">
                  {/* Question & Scope Header */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-primary leading-snug">
                      {selectedInv.question}
                    </h3>
                    <div className="p-3 bg-surface-subtle rounded-md border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-primary-muted uppercase font-mono tracking-wider">
                          Scope:
                        </span>
                        <span className="px-2.5 py-1 rounded bg-surface border border-border-subtle font-mono text-xs font-semibold text-primary inline-flex items-center gap-1.5 shadow-2xs">
                          <span>{getScopeCategoryInfo(selectedInv.scope).icon}</span>
                          <span>{selectedInv.scope}</span>
                        </span>
                      </div>
                      <span className="text-[11px] text-primary-muted">
                        Boundaries & focus area for evidence collection
                      </span>
                    </div>
                  </div>

                  {/* Competing Hypotheses */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">
                        Competing Hypotheses ({selectedInv.hypotheses.length})
                      </h4>
                    </div>
                    {selectedInv.hypotheses.length === 0 ? (
                      <div className="p-3 rounded-md bg-surface-subtle border border-border-subtle text-xs space-y-1.5">
                        <p className="text-primary font-medium">💡 What is a Hypothesis?</p>
                        <p className="text-primary-muted text-[11px] leading-relaxed">
                          A candidate theory for why this issue happened. For example: <em>"The store throws because getState() is invoked before hydration completes."</em>
                        </p>
                        <button
                          type="button"
                          onClick={() => setAddHypothesisInput(`H1: Potential root-cause in ${selectedInv.scope}`)}
                          className="text-xs text-link hover:underline font-mono inline-flex items-center gap-1 pt-0.5"
                        >
                          + Autofill Starter Hypothesis
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedInv.hypotheses.map((h, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded bg-surface border border-border-subtle text-xs text-primary flex items-start gap-2.5"
                          >
                            <GitCommit className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{h}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Add Hypothesis Input */}
                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={addHypothesisInput}
                        onChange={(e) => setAddHypothesisInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleAddHypothesis();
                        }}
                        placeholder="Add candidate hypothesis..."
                        className="flex-1 bg-surface-subtle text-xs text-primary rounded px-3 py-1.5 border border-border-strong focus:outline-none focus:border-link"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleAddHypothesis}
                        disabled={!addHypothesisInput.trim()}
                      >
                        Add Hypothesis
                      </Button>
                    </div>
                  </div>

                  {/* Observations */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">
                      Recorded Observations ({selectedInv.observations.length})
                    </h4>
                    {selectedInv.observations.length === 0 ? (
                      <div className="p-3 rounded-md bg-surface-subtle border border-border-subtle text-xs space-y-1.5">
                        <p className="text-primary font-medium">📋 What is an Observation?</p>
                        <p className="text-primary-muted text-[11px] leading-relaxed">
                          A verified factual clue discovered while inspecting code, running tests, or analyzing logs (e.g. <em>"Error occurs in store.ts line 84 when auto-detection runs"</em>).
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedInv.observations.map((obs, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded bg-surface-subtle border border-border-subtle text-xs text-primary-secondary leading-relaxed"
                          >
                            {obs}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Add Observation Input */}
                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={addObservationInput}
                        onChange={(e) => setAddObservationInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleAddObservation();
                        }}
                        placeholder="Note new factual observation..."
                        className="flex-1 bg-surface-subtle text-xs text-primary rounded px-3 py-1.5 border border-border-strong focus:outline-none focus:border-link"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleAddObservation}
                        disabled={!addObservationInput.trim()}
                      >
                        Add Observation
                      </Button>
                    </div>
                  </div>

                  {/* Evidence Citations */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">
                      Evidentiary Citations ({selectedInv.evidenceItems.length})
                    </h4>
                    {selectedInv.evidenceItems.length === 0 ? (
                      <div className="p-3.5 rounded-md bg-surface-subtle border border-border-subtle text-xs space-y-2">
                        <p className="text-primary font-medium">🔍 No Evidence Linked Yet</p>
                        <p className="text-primary-muted text-[11px] leading-relaxed">
                          Forensic investigations rely on concrete proof (commits, pull requests, and file traces). You can search any keyword or symbol in Code Archaeology and click <strong>"Preserve in Investigation"</strong> to link evidence here.
                        </p>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate('/app/archaeology')}
                          leftIcon={<Search className="w-3.5 h-3.5 text-accent" />}
                        >
                          Search Code Archaeology for Evidence
                        </Button>
                      </div>
                    ) : (
                      <div className="divide-y divide-border-subtle border border-border-subtle rounded-md bg-surface overflow-hidden">
                        {selectedInv.evidenceItems.map((ev) => (
                          <div key={ev.id} className="p-3 text-xs space-y-1.5 hover:bg-surface-subtle/50 transition-colors">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Badge category={ev.category}>{ev.type.toUpperCase()}</Badge>
                                <span className="font-mono font-bold text-primary">
                                  {ev.identifier}
                                </span>
                              </div>
                              {ev.url && (
                                <a
                                  href={ev.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-link hover:underline font-mono text-[11px] inline-flex items-center gap-1"
                                >
                                  <span>Source Link</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                            <p className="text-primary font-medium">{ev.title}</p>
                            {ev.summary && (
                              <p className="text-primary-secondary text-[11px]">{ev.summary}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Findings */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">
                      Forensic Findings ({selectedInv.findings.length})
                    </h4>
                    {selectedInv.findings.length === 0 ? (
                      <div className="p-3 rounded-md bg-surface-subtle border border-border-subtle text-xs space-y-1">
                        <p className="text-primary font-medium">🎯 What is a Forensic Finding?</p>
                        <p className="text-primary-muted text-[11px] leading-relaxed">
                          Once your evidence verifies or disproves a hypothesis, publish your final verified conclusion and remediation advice here.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedInv.findings.map((f, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded bg-surface border border-accent/30 text-xs text-primary leading-relaxed"
                          >
                            {f}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Add Finding Input */}
                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={addFindingInput}
                        onChange={(e) => setAddFindingInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleAddFinding();
                        }}
                        placeholder="Publish verified finding..."
                        className="flex-1 bg-surface-subtle text-xs text-primary rounded px-3 py-1.5 border border-border-strong focus:outline-none focus:border-link"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleAddFinding}
                        disabled={!addFindingInput.trim()}
                      >
                        Publish Finding
                      </Button>
                    </div>
                  </div>

                  {/* Honest Uncertainty & Coverage Limitations */}
                  <div className="p-3.5 rounded-md bg-[#fcf4e6] border border-[#ebd6a9] text-xs text-[#8e641b] space-y-1.5">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Uncertainty & Coverage Limitations</span>
                    </div>
                    {selectedInv.limitations.length === 0 ? (
                      <p className="text-[11px] leading-relaxed">
                        Assessments reflect ingested repository records. In the absence of an automated regression fixture in CI, resolution remains classified conservatively.
                      </p>
                    ) : (
                      <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                        {selectedInv.limitations.map((lim, idx) => (
                          <li key={idx}>{lim}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </Panel>
            </div>
          ) : null}
        </div>
      </div>
    )}

      {/* New Investigation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg border border-border-strong shadow-lg max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h3 className="text-sm font-bold text-primary">
                New Forensic Investigation
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-primary-muted hover:text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded bg-[#fdf2f2] border border-[#f8b4b4] text-xs text-[#9b1c1c]">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">
                  Investigation Question *
                </label>
                <textarea
                  rows={2}
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="e.g. Did PR #29012 fully resolve the concurrent tearing issue reported in #28941?"
                  className="w-full bg-surface-subtle text-xs text-primary rounded px-3 py-2 border border-border-strong focus:outline-none focus:border-link"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-primary">
                    Target Scope Category
                  </label>
                  <span className="text-[11px] text-primary-muted">
                    What area is this case focused on?
                  </span>
                </div>

                {/* Scope Category Dropdown Menu */}
                <select
                  value={selectedScopePreset}
                  onChange={(e) => handleScopePresetChange(e.target.value)}
                  className="w-full bg-surface-subtle text-xs text-primary font-medium rounded px-3 py-2 border border-border-strong focus:outline-none focus:border-link mb-2"
                >
                  {SCOPE_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.icon} {preset.label} — {preset.description}
                    </option>
                  ))}
                </select>

                {/* Scope String Input with Placeholder matching test expectations */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-primary-muted">
                      Scope Target String (auto-formatted from dropdown):
                    </span>
                    <span className="text-primary-secondary font-mono text-[10px]">
                      Editable
                    </span>
                  </div>
                  <input
                    type="text"
                    value={newScope}
                    onChange={(e) => setNewScope(e.target.value)}
                    placeholder="e.g. Entire repo, Auth subsystem, or React 19 RC • packages/react/src/ReactHooks.js"
                    className="w-full bg-surface-subtle text-xs text-primary rounded px-3 py-2 border border-border-strong focus:outline-none focus:border-link font-mono"
                  />
                </div>

                {/* 1-Click Quick Preset Pills */}
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <span className="text-[10px] text-primary-muted font-medium">Quick Presets:</span>
                  {SCOPE_PRESETS.slice(0, 7).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleScopePresetChange(preset.id)}
                      className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                        selectedScopePreset === preset.id
                          ? 'bg-accent/15 border-accent text-accent font-semibold'
                          : 'bg-surface-subtle border-border-subtle text-primary-secondary hover:text-primary hover:border-accent'
                      }`}
                    >
                      {preset.icon} {preset.label.split('/')[0]?.trim()}
                    </button>
                  ))}
                </div>

                <div className="mt-2 p-2.5 rounded bg-surface border border-border-subtle text-[11px] text-primary-secondary leading-relaxed space-y-1">
                  <p className="font-semibold text-primary">💡 What is Target Scope used for?</p>
                  <p>
                    Target Scope categorizes and isolates your investigation. It defines whether you are diagnosing a <strong>🐛 Bug Defect</strong>, reviewing a <strong>🔀 Pull Request</strong>, auditing <strong>⚡ Performance</strong>, or inspecting a <strong>🧩 Subsystem</strong>. It groups evidence, filters saved cases, and keeps findings reproducible.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-primary block mb-1">
                  Initial Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as InvestigationStatus)}
                  className="w-full bg-surface-subtle text-xs text-primary rounded px-3 py-2 border border-border-strong focus:outline-none focus:border-link"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="inconclusive">Inconclusive</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-primary block mb-1">
                  Initial Hypothesis (Optional)
                </label>
                <input
                  type="text"
                  value={newHypothesis}
                  onChange={(e) => setNewHypothesis(e.target.value)}
                  placeholder="e.g. PR only addressed single-transition tearing, leaving nested transitions vulnerable"
                  className="w-full bg-surface-subtle text-xs text-primary rounded px-3 py-2 border border-border-strong focus:outline-none focus:border-link"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-primary block mb-1">
                  Initial Observation (Optional)
                </label>
                <input
                  type="text"
                  value={newObservation}
                  onChange={(e) => setNewObservation(e.target.value)}
                  placeholder="e.g. Snapshotting logic introduced without nested transition assertion"
                  className="w-full bg-surface-subtle text-xs text-primary rounded px-3 py-2 border border-border-strong focus:outline-none focus:border-link"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Investigation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {invToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg border border-border-strong shadow-lg max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-danger">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-primary">
                Delete Investigation?
              </h3>
            </div>
            <p className="text-xs text-primary-secondary leading-relaxed">
              Are you sure you want to delete investigation <strong>"{invToDelete.question}"</strong>? This will permanently remove all associated hypotheses, observations, and findings.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setInvToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDeleteConfirm}
                className="bg-danger hover:bg-danger/90 border-danger"
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
