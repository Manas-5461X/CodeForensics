import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  Plus,
  RefreshCw,
  Search,
  Check,
  X,
  AlertCircle,
  Lock,
  Globe,
  ExternalLink,
  Sparkles,
  Info,
} from 'lucide-react';
import { Button } from '../ui/Button.js';
import { useRepository } from '../../context/RepositoryContext.js';
import { useApiClient } from '../../utils/apiClient.js';
import type { RepositoryInfo } from '@codeforensics/shared';

interface RepositorySelectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const POPULAR_REPOS = [
  { owner: 'Manas-5461X', repo: 'shopkart', label: 'Manas-5461X/shopkart' },
  { owner: 'facebook', repo: 'react', label: 'facebook/react' },
  { owner: 'vercel', repo: 'next.js', label: 'vercel/next.js' },
  { owner: 'expressjs', repo: 'express', label: 'expressjs/express' },
];

export const RepositorySelectModal: React.FC<RepositorySelectModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    activeRepo,
    repositories,
    installations,
    selectRepository,
    trackNewRepository,
  } = useRepository();
  const { request } = useApiClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstallationId, setSelectedInstallationId] = useState<number | null>(null);
  const [discoveredRepos, setDiscoveredRepos] = useState<RepositoryInfo[]>([]);
  const [isLoadingDiscovered, setIsLoadingDiscovered] = useState(false);
  const [customOwner, setCustomOwner] = useState('');
  const [customRepo, setCustomRepo] = useState('');
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Default to first installation if available
  useEffect(() => {
    if (installations.length > 0 && selectedInstallationId === null) {
      setSelectedInstallationId(installations[0].installationId);
    }
  }, [installations, selectedInstallationId]);

  // Fetch discovered repos when installation changes (silently if app not configured)
  useEffect(() => {
    if (!selectedInstallationId) return;

    let isMounted = true;
    setIsLoadingDiscovered(true);

    request<RepositoryInfo[]>(`/api/v1/github/installations/${selectedInstallationId}/repositories`)
      .then((res) => {
        if (isMounted && res.data) {
          setDiscoveredRepos(res.data);
        }
      })
      .catch(() => {
        // Silently clear discovered repos if installation discovery fails
        if (isMounted) {
          setDiscoveredRepos([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingDiscovered(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedInstallationId, request]);

  if (!isOpen) return null;

  const handleSelectTracked = (repo: RepositoryInfo) => {
    selectRepository(repo);
    onClose();
  };

  const handleSelectDiscovered = async (repo: RepositoryInfo) => {
    try {
      setModalError(null);
      setIsSubmittingCustom(true);
      await trackNewRepository(repo.owner, repo.name, selectedInstallationId || undefined);
      onClose();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to select repository');
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  const handleAddCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customOwner.trim() || !customRepo.trim()) return;

    try {
      setModalError(null);
      setIsSubmittingCustom(true);
      await trackNewRepository(
        customOwner.trim(),
        customRepo.trim(),
        selectedInstallationId || undefined
      );
      setCustomOwner('');
      setCustomRepo('');
      onClose();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to track repository');
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  const handleSelectPreset = (owner: string, repo: string) => {
    setCustomOwner(owner);
    setCustomRepo(repo);
    setModalError(null);
  };

  // Filter tracked repositories by search
  const filteredTracked = repositories.filter(
    (r) =>
      r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-surface border border-border-strong rounded-lg shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-accent" />
            <h2 className="text-sm font-bold text-primary tracking-tight">Select Repository</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-primary-muted hover:text-primary rounded-md transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
            aria-label="Close repository modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {modalError && (
          <div className="px-4 sm:px-5 py-2.5 bg-danger-subtle/30 border-b border-danger/30 text-xs text-danger flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">{modalError}</div>
            <button
              type="button"
              onClick={() => setModalError(null)}
              className="text-danger hover:opacity-80 p-0.5"
              aria-label="Dismiss error"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-5">
          {/* 1. Track Custom Repository (Public Access, No App Needed) */}
          <div className="p-3.5 sm:p-4 bg-surface-subtle/40 rounded-lg border border-border-subtle space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-accent" />
                <span>Track Custom Repository</span>
              </label>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-success-subtle/30 text-success border border-success/30 font-semibold">
                No GitHub App Required
              </span>
            </div>

            <p className="text-[11px] text-primary-secondary leading-relaxed">
              Analyze any public repository on GitHub — including your personal projects or open-source libraries. Verified directly via GitHub REST API.
            </p>

            {/* Quick Preset Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-primary-muted font-mono flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-accent" /> Suggestions:
              </span>
              {POPULAR_REPOS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleSelectPreset(preset.owner, preset.repo)}
                  className="px-2 py-0.5 rounded text-[11px] font-mono bg-surface hover:bg-surface-subtle border border-border-subtle hover:border-accent text-primary transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleAddCustom} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  placeholder="Owner (e.g. facebook)"
                  value={customOwner}
                  onChange={(e) => setCustomOwner(e.target.value)}
                  className="flex-1 bg-surface text-xs text-primary rounded-md px-3 py-2 border border-border-strong placeholder:text-primary-muted focus:outline-none focus:border-link font-mono"
                  required
                />
                <span className="text-primary-muted font-mono">/</span>
                <input
                  type="text"
                  placeholder="Repo (e.g. react)"
                  value={customRepo}
                  onChange={(e) => setCustomRepo(e.target.value)}
                  className="flex-1 bg-surface text-xs text-primary rounded-md px-3 py-2 border border-border-strong placeholder:text-primary-muted focus:outline-none focus:border-link font-mono"
                  required
                />
              </div>
              <Button
                type="submit"
                size="sm"
                variant="primary"
                disabled={isSubmittingCustom || !customOwner.trim() || !customRepo.trim()}
                leftIcon={isSubmittingCustom ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                className="justify-center sm:justify-start"
              >
                {isSubmittingCustom ? 'Verifying...' : 'Add'}
              </Button>
            </form>
          </div>

          {/* 2. Tracked Repositories Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-semibold text-primary-muted uppercase tracking-wider block">
                Tracked Repositories ({filteredTracked.length})
              </label>
              {repositories.length > 3 && (
                <span className="text-[10px] text-primary-muted font-mono">
                  {repositories.length} total
                </span>
              )}
            </div>

            {/* Search Filter for Tracked Repositories */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-primary-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter tracked repositories..."
                className="w-full bg-surface-subtle text-xs text-primary rounded-md pl-9 pr-3 py-1.5 border border-border-subtle placeholder:text-primary-muted focus:outline-none focus:border-link font-mono"
              />
            </div>

            {filteredTracked.length === 0 ? (
              <div className="p-4 border border-dashed border-border-subtle rounded-md text-center text-xs text-primary-muted">
                {searchQuery ? 'No tracked repositories match your search.' : 'No repositories tracked yet. Track your first public repository above.'}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {filteredTracked.map((repo) => {
                  const isCurrent = activeRepo?.id === repo.id;
                  return (
                    <button
                      key={repo.id}
                      type="button"
                      onClick={() => handleSelectTracked(repo)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-md text-xs font-mono transition-colors text-left ${
                        isCurrent
                          ? 'bg-surface-selected border border-accent text-accent font-semibold'
                          : 'bg-surface hover:bg-surface-subtle border border-border-subtle text-primary'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {repo.isPrivate ? (
                          <Lock className="w-3.5 h-3.5 text-primary-muted shrink-0" />
                        ) : (
                          <Globe className="w-3.5 h-3.5 text-accent shrink-0" />
                        )}
                        <span className="truncate">{repo.fullName}</span>
                      </div>
                      {isCurrent && <Check className="w-4 h-4 text-accent shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. GitHub App Discovered Repositories & Private Access */}
          <div className="pt-3 border-t border-border-subtle space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-semibold text-primary-muted uppercase tracking-wider block">
                Private Repositories & GitHub App
              </label>
              <a
                href="https://github.com/settings/apps"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-mono text-link hover:underline"
              >
                <span>Install / Connect App</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {installations.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-primary-muted text-[11px]">Selected Installation:</span>
                  <select
                    value={selectedInstallationId || ''}
                    onChange={(e) => setSelectedInstallationId(Number(e.target.value))}
                    className="bg-surface-subtle text-primary border border-border-subtle rounded px-2 py-0.5 text-xs font-mono"
                  >
                    {installations.map((inst) => (
                      <option key={inst.installationId} value={inst.installationId}>
                        {inst.accountLogin} ({inst.accountType})
                      </option>
                    ))}
                  </select>
                </div>

                {isLoadingDiscovered ? (
                  <div className="p-4 flex items-center justify-center gap-2 text-xs text-primary-muted">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Discovering accessible repositories...</span>
                  </div>
                ) : discoveredRepos.length === 0 ? (
                  <div className="p-3 border border-border-subtle rounded text-center text-xs text-primary-muted">
                    No additional repositories discovered for this installation.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {discoveredRepos.map((repo) => {
                      const isTracked = repositories.some((r) => r.fullName === repo.fullName);
                      return (
                        <div
                          key={repo.fullName}
                          className="flex items-center justify-between p-2.5 bg-surface-subtle/40 border border-border-subtle rounded-md text-xs font-mono"
                        >
                          <div className="flex items-center gap-2 truncate">
                            {repo.isPrivate ? (
                              <Lock className="w-3.5 h-3.5 text-primary-muted shrink-0" />
                            ) : (
                              <Globe className="w-3.5 h-3.5 text-primary-muted shrink-0" />
                            )}
                            <span className="text-primary truncate">{repo.fullName}</span>
                          </div>
                          {isTracked ? (
                            <span className="text-[10px] text-primary-muted uppercase font-sans font-semibold">
                              Tracked
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleSelectDiscovered(repo)}
                              disabled={isSubmittingCustom}
                              leftIcon={<Plus className="w-3 h-3" />}
                            >
                              Track
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-surface-subtle/30 border border-border-subtle rounded-md text-xs text-primary-muted space-y-1.5">
                <div className="flex items-center gap-1.5 font-medium text-primary text-[11px]">
                  <Info className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>Looking to analyze private repositories?</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Install our GitHub App on your GitHub account or organization to unlock private repository investigations and real-time webhook updates.
                </p>
                <div className="pt-1">
                  <a
                    href="https://github.com/settings/apps"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface hover:bg-surface-subtle border border-border-strong rounded text-[11px] font-mono text-primary transition-colors"
                  >
                    <span>Connect GitHub App</span>
                    <ExternalLink className="w-3 h-3 text-accent" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border-subtle bg-surface-subtle/30 flex justify-end">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
