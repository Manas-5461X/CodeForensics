import { Link } from 'react-router-dom';
import {
  Compass,
  FolderGit2,
  GitBranch,
  GitPullRequest,
  Sparkles,
  BookOpen,
  FileText,
  ArrowRight,
  CheckCircle2,
  Layers,
  Terminal,
  ExternalLink,
  Network,
} from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { useRepository } from '../context/RepositoryContext.js';

export function WorkflowPage() {
  const { activeRepo } = useRepository();

  const workflowSteps = [
    {
      step: '01',
      title: 'Connect & Ingest Repository',
      category: 'Foundation & Synchronization',
      icon: FolderGit2,
      badge: 'Step 1',
      badgeColor: 'bg-accent/15 text-accent border-accent/30',
      description:
        'Select any active GitHub repository from the top selector. CodeForensics connects to GitHub and uses BullMQ workers to ingest issues, pull requests, commit trees, and contributor profiles into PostgreSQL.',
      details: [
        'Multi-Tier Synchronous Tier 1 Ingestion: Get immediate access to recent PRs and issues within seconds.',
        'Deep Background Tier 2 Crawl: Streams historical commits, comments, and relationships without blocking your workflow.',
        'Observable Status: Live spinning indicator and percentage progress in the workbench top bar.',
      ],
      actionLink: '/app',
      actionText: 'View Repository Overview',
    },
    {
      step: '02',
      title: 'Repository Architecture Map & Forensic Intelligence',
      category: 'Topography & Churn Risk',
      icon: Network,
      badge: 'Step 2',
      badgeColor: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
      description:
        'Visualize codebase topology with interactive vector flowcharts, temporal co-change matrices, timeline scrubbers, bus factor heatmaps, blast-radius predictors, and standalone offline audit dossiers.',
      details: [
        'Interactive Mermaid Vector Flowchart: Dynamic zoomable flowchart rendered client-side, showing root subsystems and directory relationships with deep folder drill-down.',
        'Temporal Co-Change & Coupling Matrix: Detects files frequently modified together across PRs, highlighting architectural leaks and predicting files forgotten during reviews.',
        'Time-Machine Architecture Timeline: Interactive scrubber allowing monthly milestone playback to observe codebase expansion and hotspot migrations over time.',
        'Bus Factor & Zombie Hotspot Heatmap: Correlates churn velocity with maintainer activity to uncover files maintained by departed/dormant authors.',
        'Automated Blast-Radius Predictor: Simulates downstream ripples for proposed file changes, predicting coupled companion files, affected test suites, and recommended reviewers.',
        'Subsystem Dependency Flow Overlay: Directional arrows visualize static import/export flow between subsystems and flag architectural layer violations.',
        'Standalone Offline Forensic Audit Dossier (.html): 1-click export generating an air-gapped single-file HTML audit dossier with embedded SVG vector flowcharts.',
      ],
      actionLink: '/app/map',
      actionText: 'Explore Architecture Map',
    },
    {
      step: '03',
      title: 'Code Archaeology & AST Blast Radius',
      category: 'Static Analysis & Code Forensics',
      icon: GitBranch,
      badge: 'Step 3',
      badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      description:
        'Instead of guessing with git blame, CodeForensics parses JavaScript and TypeScript source files in memory using the official TypeScript AST Compiler. Search functions, classes, and React hooks to trace exact line spans and commit histories.',
      details: [
        'Symbol Catalog: Automatically indexes functions, hooks (e.g. useTransition), methods, and exported interfaces.',
        'Blast Radius Discovery: Pinpoints which commits and pull requests modified an exact symbol over the project lifetime.',
        'Direct Evidence Preservation: One-click "Preserve in Investigation" button copies symbol metadata directly into your active case.',
      ],
      actionLink: '/app/archaeology',
      actionText: 'Launch Code Archaeology',
    },
    {
      step: '04',
      title: 'Issue & PR Lineage Tracing',
      category: 'Causal Relationship Detection',
      icon: GitPullRequest,
      badge: 'Step 4',
      badgeColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
      description:
        'Discover WHY a code decision was made. CodeForensics correlates issues and pull requests, surfacing deterministic references ("fixes #123", "closes #456") and heuristic links with explainable confidence ratings.',
      details: [
        'Full Thread Inspection: Slide-over drawer exposes complete conversation timelines and resolution states.',
        'Resolution Verification: Distinguishes whether a bug was truly resolved, partially superseded, or closed as duplicate.',
        'Evidentiary Confidence: Claims are tagged with HIGH, MEDIUM, or LOW confidence—never synthetic AI hallucinations.',
      ],
      actionLink: '/app/issues',
      actionText: 'Explore Issues & PRs',
    },
    {
      step: '05',
      title: 'Contribution & Mentorship Finder',
      category: 'Team Expertise & Risk Scoring',
      icon: Sparkles,
      badge: 'Step 5',
      badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      description:
        'Identify who actually knows the subsystem best. Our mathematical Contributor Impact score balances merged PRs, active commit velocity, code churn, review contributions, and time freshness.',
      details: [
        'Expertise Categorization: Domain Experts, Active Maintainers, Historical Contributors, and Occasional Reviewers.',
        'Single-Point-of-Failure Alerts: Identifies orphaned or critical code areas maintained by only one person.',
        'Transparent Mathematical Formula: Score formula and signal weights are visible directly on the page.',
      ],
      actionLink: '/app/contributions',
      actionText: 'View Contribution Finder',
    },
    {
      step: '06',
      title: 'Forensic Investigations & Evidence Vault',
      category: 'Hypothesis Formulation & Citable Cases',
      icon: BookOpen,
      badge: 'Step 6',
      badgeColor: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
      description:
        'Create structured investigation workspaces to diagnose regressions, audit pull requests, or benchmark subsystems. Log testable hypotheses, note observations, attach verified evidence citations, and publish immutable findings.',
      details: [
        'Scoped Contexts: Categorize cases under Bug Defect, PR Review, Performance, Security, or Subsystems.',
        'Citable Evidence Items: Attach commits, pull requests, issues, and AST symbol references directly to your case.',
        'Reproducible Findings: Write final verified root causes and actionable recommendations with full audit lineage.',
      ],
      actionLink: '/app/investigations',
      actionText: 'Open Investigations Workbench',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-surface rounded-xl border border-border-strong p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="max-w-3xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent/15 text-accent border border-accent/30">
            <Compass className="w-3.5 h-3.5" />
            <span>Workbench Forensic Workflow</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
            How to Use CodeForensics
          </h1>
          <p className="text-xs sm:text-sm text-primary-secondary leading-relaxed">
            CodeForensics bridges the gap between raw git histories, issue conversations, and source code ASTs. Follow this 6-stage workflow to investigate regressions, assess architecture changes, and preserve reproducible findings.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link to="/app">
              <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Go to Repository Overview
              </Button>
            </Link>
            <Link to="/docs">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<FileText className="w-3.5 h-3.5 text-accent" />}
                rightIcon={<ExternalLink className="w-3 h-3 text-primary-muted" />}
              >
                View Full Documentation
              </Button>
            </Link>
          </div>
        </div>

        {activeRepo && (
          <div className="mt-4 pt-4 border-t border-border-subtle flex items-center justify-between text-xs text-primary-muted">
            <span className="flex items-center gap-1.5">
              <FolderGit2 className="w-3.5 h-3.5 text-accent" />
              Active Target: <strong className="text-primary font-mono">{activeRepo.fullName}</strong>
            </span>
            <span className="hidden sm:inline text-primary-muted font-mono">Ready for Investigation</span>
          </div>
        )}
      </div>

      {/* 6-Stage Interactive Workflow Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent" />
            <span>The 6-Stage Investigative Lifecycle</span>
          </h2>
          <span className="text-xs text-primary-muted font-mono">End-to-End Forensics</span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {workflowSteps.map((ws) => {
            const Icon = ws.icon;
            return (
              <div
                key={ws.step}
                className="bg-surface rounded-xl border border-border-strong p-5 hover:border-accent/50 transition-colors shadow-sm flex flex-col md:flex-row gap-5 items-start"
              >
                {/* Step indicator */}
                <div className="flex items-center md:flex-col items-start gap-3 shrink-0">
                  <div className="w-10 h-10 rounded-lg bg-surface-subtle border border-border-subtle flex items-center justify-center text-accent">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="font-mono text-xs font-bold text-primary-muted">
                    {ws.step}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-3 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${ws.badgeColor}`}>
                      {ws.badge}
                    </span>
                    <span className="text-xs text-primary-muted font-mono">
                      {ws.category}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-primary">
                    {ws.title}
                  </h3>

                  <p className="text-xs text-primary-secondary leading-relaxed">
                    {ws.description}
                  </p>

                  <div className="space-y-1.5 bg-surface-subtle/50 p-3 rounded-lg border border-border-subtle text-xs text-primary-secondary">
                    {ws.details.map((detail, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                        <span className="leading-snug">{detail}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-1">
                    <Link to={ws.actionLink}>
                      <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                        {ws.actionText}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* For More Details -> Full Documentation Callout */}
      <div className="bg-surface rounded-xl border border-border-strong p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-5 bg-gradient-to-r from-surface to-surface-subtle">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2 text-accent">
            <FileText className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">In-Depth Technical Docs</span>
          </div>
          <h3 className="text-base font-bold text-primary">
            Need Full API References, Architecture Diagrams, or Formulas?
          </h3>
          <p className="text-xs text-primary-secondary leading-relaxed">
            The CodeForensics in-app documentation features 10 comprehensive chapters covering our AST parsing engine, Redis job queues, cryptographic evidence tokens, and REST API contracts.
          </p>
        </div>

        <Link to="/docs" className="shrink-0 w-full sm:w-auto">
          <Button
            variant="primary"
            size="md"
            leftIcon={<BookOpen className="w-4 h-4" />}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            Open Full Documentation
          </Button>
        </Link>
      </div>

      {/* Quick Action Matrix Table */}
      <div className="bg-surface rounded-xl border border-border-strong p-5 space-y-3">
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-accent" />
          <span>Quick Investigation Matrix</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border-subtle text-primary-muted font-semibold">
                <th className="py-2 px-3">Your Objective</th>
                <th className="py-2 px-3">Recommended Screen</th>
                <th className="py-2 px-3">Key Output</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-primary-secondary">
              <tr>
                <td className="py-2.5 px-3 font-medium text-primary">Map codebase structure & churn hotspots</td>
                <td className="py-2.5 px-3">Architecture Map</td>
                <td className="py-2.5 px-3 font-mono text-[11px]">Interactive Mermaid Flowchart + Churn Hotspots</td>
                <td className="py-2.5 px-3 text-right">
                  <Link to="/app/map" className="text-link hover:underline font-semibold">Open &rarr;</Link>
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-primary">Diagnose which PR broke a function</td>
                <td className="py-2.5 px-3">Code Archaeology</td>
                <td className="py-2.5 px-3 font-mono text-[11px]">Symbol AST Line Span + Commit History</td>
                <td className="py-2.5 px-3 text-right">
                  <Link to="/app/archaeology" className="text-link hover:underline font-semibold">Open &rarr;</Link>
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-primary">Trace if an issue was fixed or reverted</td>
                <td className="py-2.5 px-3">Issues & PR Lineage</td>
                <td className="py-2.5 px-3 font-mono text-[11px]">Causal Links + Thread Timeline</td>
                <td className="py-2.5 px-3 text-right">
                  <Link to="/app/issues" className="text-link hover:underline font-semibold">Open &rarr;</Link>
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-primary">Find who owns an abandoned file</td>
                <td className="py-2.5 px-3">Contribution Finder</td>
                <td className="py-2.5 px-3 font-mono text-[11px]">Calculated Impact Score + Bus Factor</td>
                <td className="py-2.5 px-3 text-right">
                  <Link to="/app/contributions" className="text-link hover:underline font-semibold">Open &rarr;</Link>
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-primary">Publish verifiable root-cause finding</td>
                <td className="py-2.5 px-3">Investigations</td>
                <td className="py-2.5 px-3 font-mono text-[11px]">Saved Hypotheses + Evidence Citations</td>
                <td className="py-2.5 px-3 text-right">
                  <Link to="/app/investigations" className="text-link hover:underline font-semibold">Open &rarr;</Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
