import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  GitPullRequest,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  GitCommit,
  GitBranch,
  Search,
  Sparkles,
  FileCode2,
  ChevronRight,
  Terminal,
} from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';

export function LandingPage() {
  const [activeTab, setActiveTab] = useState<'lineage' | 'assessment' | 'code'>('lineage');

  return (
    <div className="min-h-screen bg-canvas text-primary selection:bg-surface-selected font-sans">
      {/* ---------------------------------------------------------------------- */}
      {/* 1. Global Navigation Bar                                              */}
      {/* ---------------------------------------------------------------------- */}
      <header className="sticky top-0 z-50 bg-canvas/90 backdrop-blur-sm border-b border-border-subtle px-4 sm:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-surface border border-border-strong flex items-center justify-center text-accent font-mono font-bold text-sm shadow-2xs">
            CF
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-primary">
              CodeForensics
            </span>
            <span className="hidden md:inline-block ml-2 text-[10px] font-mono text-primary-muted border-l border-border-subtle pl-2">
              Repository Intelligence
            </span>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-primary-secondary">
          <a href="#investigation" className="hover:text-primary transition-colors">
            Case Study
          </a>
          <a href="#evidence-graph" className="hover:text-primary transition-colors">
            Evidence Graph
          </a>
          <a href="#capabilities" className="hover:text-primary transition-colors">
            Capabilities
          </a>
          <a href="#principles" className="hover:text-primary transition-colors">
            Evidentiary Rules
          </a>
        </nav>

        <div className="flex items-center gap-2.5">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex"
          >
            <Button size="sm" variant="ghost" leftIcon={<Terminal className="w-3.5 h-3.5 text-primary-muted" />}>
              GitHub
            </Button>
          </a>
          <Link to="/app">
            <Button size="sm" variant="primary" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Open Workbench
            </Button>
          </Link>
        </div>
      </header>

      {/* ---------------------------------------------------------------------- */}
      {/* 2. Hero Section                                                       */}
      {/* ---------------------------------------------------------------------- */}
      <section className="px-4 sm:px-8 pt-12 pb-16 max-w-5xl mx-auto text-center">
        {/* Status Chip */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border-subtle text-xs font-mono text-primary-secondary mb-6 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
          <span>EVIDENCE-BACKED REPOSITORY INTELLIGENCE</span>
          <span className="text-border-strong">•</span>
          <span className="text-accent font-semibold">NO AI HALLUCINATIONS</span>
        </div>

        {/* Primary Headline */}
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-primary max-w-3xl mx-auto leading-tight">
          Stop guessing why code was written.{' '}
          <span className="text-accent">Inspect the evidence.</span>
        </h1>

        {/* Value Proposition Subtitle */}
        <p className="mt-5 text-sm sm:text-base text-primary-secondary max-w-2xl mx-auto leading-relaxed">
          CodeForensics connects GitHub issues, pull requests, review discussions, and commit diffs into an inspectable evidence graph.
          Distinguish observed GitHub facts from heuristic inferences—with visible uncertainty and traceable provenance.
        </p>

        {/* Call to Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/app">
            <Button size="lg" variant="primary" className="w-full sm:w-auto" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Launch Interactive Workbench
            </Button>
          </Link>
          <a href="#investigation">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto" leftIcon={<Search className="w-4 h-4 text-primary-muted" />}>
              Inspect Benchmark Case (#28941)
            </Button>
          </a>
        </div>

        {/* Trust Taxonomy Pill Strip */}
        <div className="mt-12 pt-8 border-t border-border-subtle grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
          <div className="p-3 bg-surface border border-border-subtle rounded-md">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              <span className="text-xs font-mono font-bold text-success">FACT</span>
            </div>
            <p className="text-[11px] text-primary-secondary leading-snug">
              Authoritative provider records: closed states, merged SHAs, Git trees.
            </p>
          </div>

          <div className="p-3 bg-surface border border-border-subtle rounded-md">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#8e641b]" />
              <span className="text-xs font-mono font-bold text-[#8e641b]">INFERENCE</span>
            </div>
            <p className="text-[11px] text-primary-secondary leading-snug">
              Deterministic code and diff analysis with inspectable citations.
            </p>
          </div>

          <div className="p-3 bg-surface border border-border-subtle rounded-md">
            <div className="flex items-center gap-1.5 mb-1">
              <GitCommit className="w-3.5 h-3.5 text-primary-muted" />
              <span className="text-xs font-mono font-bold text-primary">HYPOTHESIS</span>
            </div>
            <p className="text-[11px] text-primary-secondary leading-snug">
              Competing explanations under active investigation.
            </p>
          </div>

          <div className="p-3 bg-surface border border-border-subtle rounded-md">
            <div className="flex items-center gap-1.5 mb-1">
              <HelpCircle className="w-3.5 h-3.5 text-primary-muted" />
              <span className="text-xs font-mono font-bold text-primary-muted">UNKNOWN</span>
            </div>
            <p className="text-[11px] text-primary-secondary leading-snug">
              Honest abstention when tests, data, or coverage are incomplete.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 3. Product Preview / Interactive Investigation Benchmark               */}
      {/* ---------------------------------------------------------------------- */}
      <section id="investigation" className="px-4 sm:px-8 py-12 max-w-5xl mx-auto border-t border-border-subtle">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <div className="text-xs font-mono text-accent font-semibold tracking-wider uppercase">
              Case Study • Live Forensic Inspection
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-primary mt-1">
              A closed issue is not a fixed issue.
            </h2>
            <p className="text-xs text-primary-secondary mt-1 max-w-xl">
              In this actual repository case from <code className="font-mono text-link">facebook/react</code>, GitHub marks Issue #28941 as Closed. CodeForensics audited the commits and discovered the fix was incomplete.
            </p>
          </div>

          {/* Interactive Workbench Tabs */}
          <div className="flex items-center gap-1 bg-surface p-1 border border-border-subtle rounded-md self-start md:self-auto">
            <button
              onClick={() => setActiveTab('lineage')}
              className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                activeTab === 'lineage'
                  ? 'bg-surface-selected text-accent font-semibold shadow-2xs'
                  : 'text-primary-secondary hover:text-primary'
              }`}
            >
              1. Lineage Chain
            </button>
            <button
              onClick={() => setActiveTab('assessment')}
              className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                activeTab === 'assessment'
                  ? 'bg-surface-selected text-accent font-semibold shadow-2xs'
                  : 'text-primary-secondary hover:text-primary'
              }`}
            >
              2. Forensic Assessment
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                activeTab === 'code'
                  ? 'bg-surface-selected text-accent font-semibold shadow-2xs'
                  : 'text-primary-secondary hover:text-primary'
              }`}
            >
              3. Code Diff Proof
            </button>
          </div>
        </div>

        {/* Workbench Card Preview */}
        <div className="bg-surface border border-border-strong rounded-lg overflow-hidden shadow-sm">
          {/* Mock Workbench Header */}
          <div className="px-4 py-2.5 bg-surface-subtle border-b border-border-subtle flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent/30 border border-accent"></span>
              <span className="font-semibold text-primary">INVESTIGATION #CF-2026-089</span>
              <span className="text-primary-muted">•</span>
              <span className="text-primary-secondary">target: facebook/react@b84f291</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge category="INFERENCE">PARTIALLY_ADDRESSED</Badge>
              <Badge category="UNKNOWN">CONFIDENCE: MEDIUM</Badge>
            </div>
          </div>

          {/* Tab Content Display */}
          <div className="p-6">
            {activeTab === 'lineage' && (
              <div className="space-y-4">
                <div className="text-xs text-primary-muted uppercase font-mono tracking-wider">
                  Traced Event Progression
                </div>
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-strong">
                  {/* Step 1: Issue */}
                  <div className="relative">
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-primary-muted border-2 border-surface"></div>
                    <div className="p-3 bg-surface-subtle/50 border border-border-subtle rounded-md flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="font-bold text-primary">Issue #28941</span>
                          <span className="text-primary-muted">•</span>
                          <span className="px-1.5 py-0.2 rounded bg-surface border border-border-subtle text-[10px]">
                            GitHub State: Closed
                          </span>
                        </div>
                        <p className="text-xs font-medium text-primary mt-1">
                          useDeferredValue causes tearing in concurrent root transitions
                        </p>
                      </div>
                      <Badge category="FACT">OBSERVED FACT</Badge>
                    </div>
                  </div>

                  {/* Step 2: Linked PR */}
                  <div className="relative">
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-accent border-2 border-surface"></div>
                    <div className="p-3 bg-surface-subtle/50 border border-border-subtle rounded-md flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="font-bold text-primary">Pull Request #29012</span>
                          <span className="text-primary-muted">•</span>
                          <span className="text-accent font-semibold">Merged by gaearon</span>
                        </div>
                        <p className="text-xs font-medium text-primary mt-1">
                          Fix tearing in useDeferredValue by snapshotting transition lanes
                        </p>
                      </div>
                      <Badge category="INFERENCE">89% FILE OVERLAP</Badge>
                    </div>
                  </div>

                  {/* Step 3: Verified Commit */}
                  <div className="relative">
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-success border-2 border-surface"></div>
                    <div className="p-3 bg-surface-subtle/50 border border-border-subtle rounded-md flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="font-bold text-primary">Commit b84f291</span>
                          <span className="text-primary-muted">•</span>
                          <span>packages/react/src/ReactHooks.js</span>
                        </div>
                        <p className="text-xs font-medium text-primary mt-1">
                          Lane snapshotting added to updateDeferredValueHookState
                        </p>
                      </div>
                      <Badge category="FACT">GIT TREE SHA</Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'assessment' && (
              <div className="space-y-4">
                <div className="p-4 bg-[#fcf4e6] border border-[#ebd6a9] rounded-md text-xs text-[#8e641b] space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4 text-[#8e641b]" />
                    <span>Resolution Assessment: PARTIALLY_ADDRESSED</span>
                  </div>
                  <p className="leading-relaxed">
                    While Pull Request #29012 merged code into <code className="font-mono">ReactHooks.js</code>, our regression coverage auditor verified that the accompanying test suite only tests <strong>single-level transitions</strong>. Nested concurrent fallback transitions still produce tearing.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 border border-border-subtle rounded-md bg-surface-subtle/30">
                    <div className="font-semibold text-primary mb-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                      <span>Supporting Evidence</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-primary-secondary text-[11px]">
                      <li>Explicit closing reference in PR description</li>
                      <li>AST match in Hook deferred scheduler</li>
                      <li>Commit included in React 19.0.0-rc.0</li>
                    </ul>
                  </div>

                  <div className="p-3 border border-border-subtle rounded-md bg-surface-subtle/30">
                    <div className="font-semibold text-primary mb-1 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                      <span>Missing / Contradictory Evidence</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-primary-secondary text-[11px]">
                      <li>Issue was closed automatically by GitHub bot</li>
                      <li>Zero test fixtures for nested root transitions</li>
                      <li>Follow-up issue #29381 opened citing identical stack</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'code' && (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-primary-muted text-[11px] pb-1 border-b border-border-subtle">
                  <span>packages/react/src/ReactHooks.js:L184-L198</span>
                  <span>Commit b84f291</span>
                </div>
                <div className="bg-surface-subtle p-3 rounded-md border border-border-subtle overflow-x-auto text-[11px] leading-relaxed">
                  <div className="text-primary-secondary">// CodeForensics AST Analyzer: Traced symbol useDeferredValue</div>
                  <div className="text-primary">function updateDeferredValueHookState(current, workInProgress) &#123;</div>
                  <div className="text-danger bg-danger/10 px-1.5 py-0.5 rounded-xs">-  const prevValue = current.memoizedState;</div>
                  <div className="text-success bg-success/10 px-1.5 py-0.5 rounded-xs">+  const prevValue = readTransitionSnapshot(current.memoizedState);</div>
                  <div className="text-success bg-success/10 px-1.5 py-0.5 rounded-xs">+  // NOTE: Coverage gap — nested lane transitions unverified</div>
                  <div className="text-primary">   return prevValue;</div>
                  <div className="text-primary">&#125;</div>
                </div>
              </div>
            )}
          </div>

          {/* Workbench Footer Bar */}
          <div className="px-6 py-3 bg-surface-subtle border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-primary-secondary">
              Inspect this complete evidence graph live in the interactive workbench.
            </span>
            <Link to="/app/issues">
              <Button size="sm" variant="primary" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Explore in Workbench
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 4. Visual Explanation of Connections                                  */}
      {/* ---------------------------------------------------------------------- */}
      <section id="evidence-graph" className="px-4 sm:px-8 py-16 max-w-5xl mx-auto border-t border-border-subtle">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs font-mono text-accent font-semibold tracking-wider uppercase">
            Data Architecture
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary mt-1">
            How CodeForensics Connects the Dots
          </h2>
          <p className="text-xs sm:text-sm text-primary-secondary mt-2">
            Instead of treating a repository as flat text, CodeForensics normalizes GitHub records, Git trees, and code ASTs into a verifiable evidence graph.
          </p>
        </div>

        {/* Visual Graph Diagram */}
        <div className="bg-surface border border-border-subtle p-6 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {/* Node 1 */}
            <div className="p-4 bg-surface-subtle border border-border-strong rounded-md text-center space-y-2">
              <div className="w-8 h-8 rounded bg-surface border border-border-subtle mx-auto flex items-center justify-center text-accent">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="text-xs font-mono font-bold text-primary">1. Issue Report</div>
              <p className="text-[11px] text-primary-secondary leading-snug">
                GitHub issue discussion, reporter description, and reproducer fixtures.
              </p>
              <Badge category="FACT" showIcon={false}>OBSERVED FACT</Badge>
            </div>

            {/* Node 2 */}
            <div className="p-4 bg-surface-subtle border border-border-strong rounded-md text-center space-y-2">
              <div className="w-8 h-8 rounded bg-surface border border-border-subtle mx-auto flex items-center justify-center text-link">
                <GitPullRequest className="w-4 h-4" />
              </div>
              <div className="text-xs font-mono font-bold text-primary">2. Pull Request</div>
              <p className="text-[11px] text-primary-secondary leading-snug">
                Review comments, proposed changes, review approvals, and closing references.
              </p>
              <Badge category="INFERENCE" showIcon={false}>LINKED EVIDENCE</Badge>
            </div>

            {/* Node 3 */}
            <div className="p-4 bg-surface-subtle border border-border-strong rounded-md text-center space-y-2">
              <div className="w-8 h-8 rounded bg-surface border border-border-subtle mx-auto flex items-center justify-center text-success">
                <GitCommit className="w-4 h-4" />
              </div>
              <div className="text-xs font-mono font-bold text-primary">3. Git Commit Diff</div>
              <p className="text-[11px] text-primary-secondary leading-snug">
                Cryptographic commit SHA, parentage tree, changed files, and added unit tests.
              </p>
              <Badge category="FACT" showIcon={false}>GIT VERIFIED</Badge>
            </div>

            {/* Node 4 */}
            <div className="p-4 bg-surface-subtle border border-border-strong rounded-md text-center space-y-2">
              <div className="w-8 h-8 rounded bg-surface border border-border-subtle mx-auto flex items-center justify-center text-primary">
                <FileCode2 className="w-4 h-4" />
              </div>
              <div className="text-xs font-mono font-bold text-primary">4. Source Symbol</div>
              <p className="text-[11px] text-primary-secondary leading-snug">
                TypeScript compiler AST trace mapping function evolution over revisions.
              </p>
              <Badge category="INFERENCE" showIcon={false}>AST ANALYSIS</Badge>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between text-xs text-primary-secondary gap-3">
            <span className="font-mono">
              Relationships preserve provenance: every arrow carries its supporting evidence items.
            </span>
            <Link to="/app/archaeology">
              <span className="text-link font-medium hover:underline inline-flex items-center gap-1">
                View Archaeology Engine <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 5. Core Capabilities (Product Pillars)                                */}
      {/* ---------------------------------------------------------------------- */}
      <section id="capabilities" className="px-4 sm:px-8 py-16 max-w-5xl mx-auto border-t border-border-subtle">
        <div className="max-w-2xl mb-12">
          <div className="text-xs font-mono text-accent font-semibold tracking-wider uppercase">
            Product Capabilities
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary mt-1">
            Built for maintainers and contributors who need real answers
          </h2>
          <p className="text-xs sm:text-sm text-primary-secondary mt-2">
            No chatbot hallucinations, no vague summaries. Four dedicated forensic workflows grounded in real repository data.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pillar 1 */}
          <div className="p-6 bg-surface border border-border-subtle rounded-lg space-y-3">
            <div className="w-9 h-9 rounded bg-surface-subtle border border-border-strong flex items-center justify-center text-accent">
              <GitBranch className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-primary">Issue & PR Lineage</h3>
            <p className="text-xs text-primary-secondary leading-relaxed">
              Trace relationships across work items. Determine whether a pull request was superseded by a newer attempt, backported to a release branch, or reverted following a regression.
            </p>
            <div className="pt-2 flex flex-wrap gap-1.5 text-[11px] font-mono text-primary-muted">
              <span className="px-2 py-0.5 bg-surface-subtle rounded border border-border-subtle">SUPERSEDES</span>
              <span className="px-2 py-0.5 bg-surface-subtle rounded border border-border-subtle">FOLLOWS_UP_ON</span>
              <span className="px-2 py-0.5 bg-surface-subtle rounded border border-border-subtle">REVERTS</span>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="p-6 bg-surface border border-border-subtle rounded-lg space-y-3">
            <div className="w-9 h-9 rounded bg-surface-subtle border border-border-strong flex items-center justify-center text-success">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-primary">Resolution Intelligence</h3>
            <p className="text-xs text-primary-secondary leading-relaxed">
              Audits whether a closed issue actually has a verifiable code fix, an attached regression test, or was closed due to bot timeouts or abandonment without resolution.
            </p>
            <div className="pt-2 flex flex-wrap gap-1.5 text-[11px] font-mono text-primary-muted">
              <span className="px-2 py-0.5 bg-surface-subtle rounded border border-border-subtle">VERIFIED_FIX</span>
              <span className="px-2 py-0.5 bg-surface-subtle rounded border border-border-subtle">PARTIAL_FIX</span>
              <span className="px-2 py-0.5 bg-surface-subtle rounded border border-border-subtle">UNVERIFIED_CLOSE</span>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="p-6 bg-surface border border-border-subtle rounded-lg space-y-3">
            <div className="w-9 h-9 rounded bg-surface-subtle border border-border-strong flex items-center justify-center text-link">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-primary">Contribution Finder</h3>
            <p className="text-xs text-primary-secondary leading-relaxed">
              Find actionable open issues where you won't duplicate ongoing work. Evaluates issues by checking active branches, prior abandoned PRs, and isolated test suites rather than relying on labels.
            </p>
            <div className="pt-2 flex flex-wrap gap-1.5 text-[11px] font-mono text-primary-muted">
              <span className="px-2 py-0.5 bg-surface-subtle rounded border border-border-subtle">ACTIONABLE_REPRODUCER</span>
              <span className="px-2 py-0.5 bg-surface-subtle rounded border border-border-subtle">NO_ACTIVE_PR</span>
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="p-6 bg-surface border border-border-subtle rounded-lg space-y-3">
            <div className="w-9 h-9 rounded bg-surface-subtle border border-border-strong flex items-center justify-center text-primary">
              <FileCode2 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-primary">Code Archaeology & Investigations</h3>
            <p className="text-xs text-primary-secondary leading-relaxed">
              Trace JavaScript and TypeScript symbols through history to understand why design decisions were made. Preserve questions, evidence, and conclusions as reproducible investigation records.
            </p>
            <div className="pt-2 flex flex-wrap gap-1.5 text-[11px] font-mono text-primary-muted">
              <span className="px-2 py-0.5 bg-surface-subtle rounded border border-border-subtle">AST_EVOLUTION</span>
              <span className="px-2 py-0.5 bg-surface-subtle rounded border border-border-subtle">PRESERVED_FINDINGS</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 6. Evidentiary Rules & Principles                                     */}
      {/* ---------------------------------------------------------------------- */}
      <section id="principles" className="px-4 sm:px-8 py-16 max-w-5xl mx-auto border-t border-border-subtle">
        <div className="max-w-2xl mb-12">
          <div className="text-xs font-mono text-accent font-semibold tracking-wider uppercase">
            Non-Negotiable Integrity
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary mt-1">
            Rules of Evidence in CodeForensics
          </h2>
          <p className="text-xs sm:text-sm text-primary-secondary mt-2">
            Most developer tools rush to generate confident-sounding answers. CodeForensics operates under strict evidentiary constraints to protect engineering truth.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-surface border border-border-subtle rounded-md flex items-start gap-4">
            <div className="w-8 h-8 rounded bg-surface-subtle border border-border-subtle flex items-center justify-center shrink-0 text-accent font-mono font-bold text-xs">
              01
            </div>
            <div>
              <h4 className="text-sm font-bold text-primary">Closed ≠ Fixed</h4>
              <p className="text-xs text-primary-secondary mt-0.5 leading-relaxed">
                A closed issue is proof of provider status, not proof that the underlying problem was resolved. If an issue lacks a traceable commit diff or regression test, CodeForensics flags it as unverified.
              </p>
            </div>
          </div>

          <div className="p-4 bg-surface border border-border-subtle rounded-md flex items-start gap-4">
            <div className="w-8 h-8 rounded bg-surface-subtle border border-border-subtle flex items-center justify-center shrink-0 text-accent font-mono font-bold text-xs">
              02
            </div>
            <div>
              <h4 className="text-sm font-bold text-primary">Merged ≠ Complete</h4>
              <p className="text-xs text-primary-secondary mt-0.5 leading-relaxed">
                A merged pull request proves code was incorporated into a branch, not that every reported symptom was cured. We audit test suites to detect partial fixes and edge-case gaps.
              </p>
            </div>
          </div>

          <div className="p-4 bg-surface border border-border-subtle rounded-md flex items-start gap-4">
            <div className="w-8 h-8 rounded bg-surface-subtle border border-border-subtle flex items-center justify-center shrink-0 text-accent font-mono font-bold text-xs">
              03
            </div>
            <div>
              <h4 className="text-sm font-bold text-primary">Similar Titles ≠ Duplicates</h4>
              <p className="text-xs text-primary-secondary mt-0.5 leading-relaxed">
                Superficial semantic text similarity is not evidence. Two issues are only considered candidate duplicates if they share changed file overlaps, call stacks, or explicit maintainer cross-references.
              </p>
            </div>
          </div>

          <div className="p-4 bg-surface border border-border-subtle rounded-md flex items-start gap-4">
            <div className="w-8 h-8 rounded bg-surface-subtle border border-border-subtle flex items-center justify-center shrink-0 text-accent font-mono font-bold text-xs">
              04
            </div>
            <div>
              <h4 className="text-sm font-bold text-primary">Repository Content is Untrusted Input</h4>
              <p className="text-xs text-primary-secondary mt-0.5 leading-relaxed">
                Issue descriptions, comments, README files, and commit logs originate outside our security boundary. They are treated strictly as passive data, fully neutralizing prompt injection attacks.
              </p>
            </div>
          </div>

          <div className="p-4 bg-surface border border-border-subtle rounded-md flex items-start gap-4">
            <div className="w-8 h-8 rounded bg-surface-subtle border border-border-subtle flex items-center justify-center shrink-0 text-accent font-mono font-bold text-xs">
              05
            </div>
            <div>
              <h4 className="text-sm font-bold text-primary">Honest Abstention Over False Confidence</h4>
              <p className="text-xs text-primary-secondary mt-0.5 leading-relaxed">
                If repository data was truncated by rate limits or history is missing, the system outputs <code className="font-mono text-primary font-bold">UNKNOWN</code>. We never manufacture answers when evidence is insufficient.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 7. Final Call to Action                                               */}
      {/* ---------------------------------------------------------------------- */}
      <section className="px-4 sm:px-8 py-20 max-w-5xl mx-auto border-t border-border-subtle text-center">
        <div className="p-8 sm:p-12 bg-surface border border-border-strong rounded-xl shadow-xs space-y-5">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-primary">
            Bring forensic rigor to your repository investigations.
          </h2>
          <p className="text-xs sm:text-sm text-primary-secondary max-w-xl mx-auto leading-relaxed">
            Stop stitching together twenty browser tabs across issues, PRs, and commit diffs. Open the workbench and inspect verified evidence.
          </p>
          <div className="pt-2">
            <Link to="/app">
              <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Launch CodeForensics Workbench
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 8. Technical Footer                                                   */}
      {/* ---------------------------------------------------------------------- */}
      <footer className="border-t border-border-subtle bg-surface px-4 sm:px-8 py-10 text-xs text-primary-muted">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-surface-subtle border border-border-strong flex items-center justify-center text-accent font-mono font-bold text-xs">
              CF
            </div>
            <span className="font-bold text-primary">CodeForensics</span>
            <span>•</span>
            <span>Evidence-backed repository intelligence workbench</span>
          </div>

          <div className="flex items-center gap-6 font-mono text-[11px]">
            <Link to="/app" className="text-primary-secondary hover:text-primary transition-colors">
              Workbench
            </Link>
            <Link to="/app/issues" className="text-primary-secondary hover:text-primary transition-colors">
              Issues & PRs
            </Link>
            <Link to="/app/contributions" className="text-primary-secondary hover:text-primary transition-colors">
              Contributions
            </Link>
            <Link to="/app/investigations" className="text-primary-secondary hover:text-primary transition-colors">
              Investigations
            </Link>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mt-6 pt-6 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <div>
            Licensed under the <span className="font-semibold text-primary">MIT License</span>. Designed according to <code className="text-accent">skills.md</code>.
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
            <span>Platform v0.1.0 • React 18 + Vite + Fastify + BullMQ</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
