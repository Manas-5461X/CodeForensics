import { useState, useEffect, useCallback } from 'react';
import { Panel } from '../components/ui/Panel.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton.js';
import { useRepository } from '../context/RepositoryContext.js';
import { useApiClient } from '../utils/apiClient.js';
import type { ArchaeologyTraceResult } from '@codeforensics/shared';
import {
  Search,
  ExternalLink,
  AlertTriangle,
  FolderGit2,
  FileCode,
  ShieldCheck,
  RefreshCw,
  BookmarkPlus,
  History,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DEFAULT_SUGGESTIONS = [
  'useDeferredValue',
  'packages/react/src/ReactHooks.js',
  'LaneScheduler',
  'createScheduler',
];

export function ArchaeologyPage() {
  const { activeRepo, syncState, triggerSync, isSyncing } = useRepository();
  const { get } = useApiClient();
  const navigate = useNavigate();

  const [symbolQuery, setSymbolQuery] = useState<string>('useDeferredValue');
  const [filePathInput, setFilePathInput] = useState<string>('');
  const [traceResult, setTraceResult] = useState<ArchaeologyTraceResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const performTrace = useCallback(
    async (queryToTrace?: string, fileToTrace?: string) => {
      if (!activeRepo) return;
      const targetQuery = queryToTrace || symbolQuery;
      if (!targetQuery.trim()) return;

      setIsLoading(true);
      setError(null);

      try {
        const params: Record<string, string> = { query: targetQuery.trim() };
        const fileParam = fileToTrace || filePathInput;
        if (fileParam.trim()) {
          params.filePath = fileParam.trim();
        }

        const res = await get<ArchaeologyTraceResult>(
          `/api/v1/repositories/${activeRepo.owner}/${activeRepo.name}/archaeology/trace`,
          params
        );

        if (res.data) {
          setTraceResult(res.data);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to trace symbol history';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [activeRepo, symbolQuery, filePathInput, get]
  );

  // Initial load trace
  useEffect(() => {
    if (activeRepo && !traceResult && !isLoading) {
      void performTrace('useDeferredValue');
    }
  }, [activeRepo]);

  const handleSuggestionClick = (suggestion: string) => {
    setSymbolQuery(suggestion);
    void performTrace(suggestion);
  };

  const handleCreateInvestigationFromTrace = () => {
    if (!traceResult || !activeRepo) return;
    const initialQuestion = `What is the historical evolution and rationale of ${traceResult.query}?`;
    const scope = `${activeRepo.fullName} • ${traceResult.filePath || traceResult.query}`;
    navigate('/workbench/investigations', {
      state: {
        prefillQuestion: initialQuestion,
        prefillScope: scope,
        prefillEvidence: traceResult.revisions[0]
          ? {
              type: 'commit',
              identifier: traceResult.revisions[0].shortSha,
              title: traceResult.revisions[0].message,
              url: traceResult.revisions[0].url,
              category: 'FACT',
              summary: `Latest observed commit in revision lineage for ${traceResult.query}.`,
            }
          : undefined,
      },
    });
  };

  if (!activeRepo) {
    return (
      <EmptyState
        icon={<FolderGit2 className="w-8 h-8 text-primary-muted" />}
        title="No Repository Selected"
        description="Select an authorized repository from the workspace header to trace source code symbols and Git revisions."
      />
    );
  }

  const isUnsynced = !syncState || syncState.status === 'IDLE';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-primary tracking-tight">
              Code Archaeology
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/15 text-accent border border-accent/20">
              PR & Commit History Trace
            </span>
          </div>
          <p className="text-xs text-primary-secondary mt-1 max-w-3xl leading-relaxed">
            In simple words: <strong>search for any keyword, function, or file in this repo to find which PRs and commits touched it over time and get its full historical evolution and rationale.</strong>
          </p>
        </div>
        {traceResult && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCreateInvestigationFromTrace}
            leftIcon={<BookmarkPlus className="w-3.5 h-3.5 text-accent" />}
          >
            Preserve in Investigation
          </Button>
        )}
      </div>

      {/* In Simple Words: How It Works Guide */}
      <div className="p-4 rounded-lg bg-surface border border-border-subtle shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-accent" />
            <h3 className="text-xs font-bold text-primary tracking-tight">
              What is Code Archaeology used for?
            </h3>
          </div>
          <span className="text-[11px] text-primary-muted font-mono">
            Repo: {activeRepo.fullName}
          </span>
        </div>
        <p className="text-xs text-primary-secondary leading-relaxed">
          Standard <code className="px-1.5 py-0.5 rounded bg-surface-subtle font-mono text-[11px] text-primary border border-border-subtle">git blame</code> only shows the last person who edited a line (often just a formatting change or bulk rename). <strong>Code Archaeology connects the whole story:</strong> it searches pull requests, commit revisions, and AST code symbols to reveal <em>why</em> code was written, who originally designed it, and which PRs modified it over time.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-md bg-surface-subtle border border-border-subtle flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-accent/15 text-accent font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
              <span className="text-xs font-semibold text-primary">Search Any Keyword</span>
            </div>
            <p className="text-[11px] text-primary-muted leading-relaxed">
              Type any keyword, function name, hook, class, or file path you want to investigate in this repo.
            </p>
          </div>

          <div className="p-3 rounded-md bg-surface-subtle border border-border-subtle flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-accent/15 text-accent font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
              <span className="text-xs font-semibold text-primary">Find Which PRs Touched It</span>
            </div>
            <p className="text-[11px] text-primary-muted leading-relaxed">
              The engine matches commits and merged pull requests that introduced, modified, or discussed that code.
            </p>
          </div>

          <div className="p-3 rounded-md bg-surface-subtle border border-border-subtle flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-accent/15 text-accent font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
              <span className="text-xs font-semibold text-primary">Get the Full History & Context</span>
            </div>
            <p className="text-[11px] text-primary-muted leading-relaxed">
              Explore the chronological timeline, review linked PRs, and understand technical decisions in minutes.
            </p>
          </div>
        </div>
      </div>

      {/* Unsynced Banner */}
      {isUnsynced && (
        <div className="p-3.5 rounded-md bg-surface-subtle border border-border-subtle flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-primary-secondary">
            <AlertTriangle className="w-4 h-4 text-[#8e641b] shrink-0" />
            <span>
              This repository has not been indexed yet. Initial synchronization will ingest commits, pull requests, and file metadata.
            </span>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void triggerSync()}
            disabled={isSyncing}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />}
          >
            {isSyncing ? 'Synchronizing...' : 'Sync Repository'}
          </Button>
        </div>
      )}

      {/* Symbol / File Search Input Panel */}
      <Panel className="p-3.5 sm:p-4 bg-surface space-y-3">
        <label className="text-xs font-semibold text-primary block">
          Keyword, Function Name, or File Path to Search
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-primary-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={symbolQuery}
              onChange={(e) => setSymbolQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void performTrace();
              }}
              placeholder="e.g. useDeferredValue, LaneScheduler, or packages/react/src/ReactHooks.js"
              className="w-full bg-surface-subtle text-xs font-mono text-primary rounded-md pl-9 pr-3 py-2 border border-border-strong focus:outline-none focus:border-link"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={filePathInput}
              onChange={(e) => setFilePathInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void performTrace();
              }}
              placeholder="Optional file path"
              className="flex-1 sm:w-56 bg-surface-subtle text-xs font-mono text-primary rounded-md px-3 py-2 border border-border-strong focus:outline-none focus:border-link"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => performTrace()}
              disabled={isLoading || !symbolQuery.trim()}
              leftIcon={isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : undefined}
              className="shrink-0"
            >
              Trace
            </Button>
          </div>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 pt-1 text-[11px] no-scrollbar">
          <span className="text-primary-muted font-medium shrink-0">Quick suggestions:</span>
          {DEFAULT_SUGGESTIONS.map((sug) => (
            <button
              key={sug}
              type="button"
              onClick={() => handleSuggestionClick(sug)}
              className="px-2 py-0.5 rounded bg-surface-subtle border border-border-subtle font-mono text-primary-secondary hover:text-primary hover:border-accent transition-colors shrink-0"
            >
              {sug}
            </button>
          ))}
        </div>
      </Panel>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4">
          <LoadingSkeleton className="h-24 w-full" />
          <LoadingSkeleton className="h-64 w-full" />
        </div>
      )}

      {/* Error Banner */}
      {error && !isLoading && (
        <div className="p-3.5 rounded-md bg-[#fdf2f2] border border-[#f8b4b4] text-xs text-[#9b1c1c] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => performTrace()}>
            Retry
          </Button>
        </div>
      )}

      {/* Trace Results */}
      {!isLoading && !error && traceResult && (
        <div className="space-y-6">
          {/* Symbol & File Target Card */}
          <div className="p-4 rounded-md border border-border-subtle bg-surface shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <FileCode className="w-4 h-4 text-accent" />
                <h3 className="font-mono text-sm font-bold text-primary">
                  {traceResult.symbol?.name || traceResult.query}
                </h3>
                {traceResult.symbol && (
                  <Badge category="FACT">
                    {traceResult.symbol.kind.toUpperCase()}
                  </Badge>
                )}
                {traceResult.symbol?.exported && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-accent/10 text-accent font-semibold">
                    EXPORTED
                  </span>
                )}
              </div>
              {traceResult.gitHubFileUrl && (
                <a
                  href={traceResult.gitHubFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-link hover:underline font-mono"
                >
                  <span>View Source on GitHub</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded bg-surface-subtle border border-border-subtle font-mono">
                <span className="text-[10px] text-primary-muted block uppercase">File Path</span>
                <span className="text-primary truncate block mt-0.5">
                  {traceResult.filePath || traceResult.symbol?.filePath || 'Repository scope'}
                </span>
              </div>
              <div className="p-2.5 rounded bg-surface-subtle border border-border-subtle font-mono">
                <span className="text-[10px] text-primary-muted block uppercase">AST Line Range</span>
                <span className="text-primary block mt-0.5">
                  {traceResult.symbol
                    ? `L${traceResult.symbol.startLine} to L${traceResult.symbol.endLine}`
                    : 'File level analysis'}
                </span>
              </div>
              <div className="p-2.5 rounded bg-surface-subtle border border-border-subtle font-mono">
                <span className="text-[10px] text-primary-muted block uppercase">Identified Revisions</span>
                <span className="text-primary block mt-0.5">
                  {traceResult.revisions.length} historical milestone(s)
                </span>
              </div>
            </div>

            {traceResult.symbol?.signature && (
              <div className="p-2.5 rounded bg-surface-subtle border border-border-subtle">
                <span className="text-[10px] text-primary-muted block uppercase font-mono mb-1">
                  Signature Representation
                </span>
                <pre className="text-xs font-mono text-primary overflow-x-auto">
                  {traceResult.symbol.signature}
                </pre>
              </div>
            )}
          </div>

          {/* Historical Lineage Timeline */}
          <Panel
            title={`Evolution of "${traceResult.query}"`}
            subtitle={`AST analysis and Git history trace across ${traceResult.revisions.length} revision(s)`}
          >
            {traceResult.revisions.length === 0 ? (
              <div className="py-6 text-center text-xs text-primary-muted font-mono">
                No commit revisions directly matched this target in ingested records.
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-strong">
                {traceResult.revisions.map((rev) => (
                  <div key={rev.sha} className="relative">
                    <div
                      className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full border-2 border-surface ${
                        rev.isHead
                          ? 'bg-accent'
                          : rev.isOrigin
                          ? 'bg-border-strong'
                          : 'bg-primary-muted'
                      }`}
                    />
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-primary">
                          commit {rev.shortSha}
                        </span>
                        {rev.isHead && <Badge category="FACT">HEAD REVISION</Badge>}
                        {rev.isOrigin && <Badge category="FACT">ORIGIN COMMIT</Badge>}
                        <span className="text-xs text-primary-muted font-mono">
                          {new Date(rev.timestamp).toLocaleDateString()}
                        </span>
                        {rev.author && (
                          <span className="text-xs text-primary-secondary font-mono">
                            by {rev.author}
                          </span>
                        )}
                        <a
                          href={rev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-link hover:underline ml-auto inline-flex items-center gap-1 font-mono"
                        >
                          <span>GitHub</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <p className="text-xs font-medium text-primary">
                        {rev.message}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap text-xs text-primary-secondary font-mono bg-surface-subtle p-2 rounded border border-border-subtle">
                        {rev.prNumber && (
                          <span className="font-semibold text-primary">
                            Linked PR #{rev.prNumber}
                          </span>
                        )}
                        {rev.changedFiles && rev.changedFiles.length > 0 && (
                          <span>• Touched: {rev.changedFiles.join(', ')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Linked Work Items (PRs referencing this symbol or file) */}
          {traceResult.linkedWorkItems && traceResult.linkedWorkItems.length > 0 && (
            <Panel
              title="Referenced Pull Requests & Issues"
              subtitle="Work items mentioning this symbol or path in title, description, or changes"
            >
              <div className="divide-y divide-border-subtle border border-border-subtle rounded-md bg-surface overflow-hidden">
                {traceResult.linkedWorkItems.map((item) => (
                  <div
                    key={item.number}
                    className="p-3 text-xs flex items-center justify-between gap-3 hover:bg-surface-subtle transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-primary">
                          #{item.number}
                        </span>
                        <Badge
                          category={
                            item.state === 'merged'
                              ? 'FACT'
                              : item.state === 'closed'
                              ? 'UNKNOWN'
                              : 'INFERENCE'
                          }
                        >
                          {item.state.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-primary font-medium">{item.title}</p>
                    </div>
                    <a
                      href={item.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-link hover:underline shrink-0 inline-flex items-center gap-1 font-mono text-[11px]"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* Evidentiary Disclaimer and Limitations */}
          <div className="p-3.5 rounded-md bg-[#fcf4e6] border border-[#ebd6a9] text-xs text-[#8e641b] space-y-2">
            <div className="flex items-center gap-1.5 font-semibold">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Evidentiary Discipline & Interpretation Limits</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              {traceResult.evidenceDisclaimer}
            </p>
            {traceResult.coverageNotes && traceResult.coverageNotes.length > 0 && (
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-[#8e641b]/90">
                {traceResult.coverageNotes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
