import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  BookOpen,
  Search,
  ChevronRight,
  ChevronLeft,
  Shield,
  GitBranch,
  Sparkles,
  GitPullRequest,
  Database,
  KeyRound,
  AlertTriangle,
  Copy,
  Check,
  Compass,
} from 'lucide-react';
import { cn } from '../utils/cn.js';

interface DocChapter {
  id: string;
  title: string;
  category: 'Fundamentals' | 'Intelligence Engines' | 'Operations & Security';
  icon: typeof BookOpen;
  summary: string;
  content: {
    lead: string;
    sections: {
      heading: string;
      body: string;
      codeSnippet?: string;
      callout?: {
        type: 'note' | 'tip' | 'warning';
        text: string;
      };
    }[];
  };
}

const DOC_CHAPTERS: DocChapter[] = [
  {
    id: 'overview',
    title: 'Product Overview & Philosophy',
    category: 'Fundamentals',
    icon: Compass,
    summary: 'The core mission, evidentiary taxonomy, and architectural boundaries of CodeForensics.',
    content: {
      lead: 'CodeForensics is an evidence-backed repository intelligence platform. It treats source code and historical metadata as untrusted inputs, connecting issues, pull requests, commits, and AST symbols with traceable provenance.',
      sections: [
        {
          heading: 'The Non-Negotiable Evidentiary Hierarchy',
          body: 'CodeForensics explicitly distinguishes between provider facts, deterministic detections, heuristic inferences, and unverified hypotheses. Conflicting evidence is preserved rather than smoothed over.',
          callout: {
            type: 'note',
            text: 'When available information cannot support a conclusion, CodeForensics honestly returns UNKNOWN rather than guessing.',
          },
        },
        {
          heading: 'Core Differentiators',
          body: 'Unlike generic AI code assistants that guess intent, CodeForensics requires hard citations. Every relationship link, contributor ranking, and code revision milestone links directly back to verified GitHub entities.',
        },
      ],
    },
  },
  {
    id: 'github-setup',
    title: 'Connecting GitHub & Permissions',
    category: 'Fundamentals',
    icon: KeyRound,
    summary: 'Configuring the GitHub App integration with least-privilege read permissions.',
    content: {
      lead: 'CodeForensics integrates with GitHub via an official GitHub App. This provides high rate limits (5,000 requests per hour) and fine-grained repository authorization without storing personal access tokens.',
      sections: [
        {
          heading: 'Required Repository Permissions',
          body: 'CodeForensics strictly requests Read-only permissions across 4 repository resources:',
          codeSnippet: `Issues: Read-only          # To inspect issue threads and closing keywords
Pull requests: Read-only   # To inspect PR descriptions, branches, and merges
Contents: Read-only        # To inspect commit trees, file contents, and line ranges
Metadata: Read-only        # Mandatory base repository metadata`,
        },
        {
          heading: 'Webhook Integration',
          body: 'Real-time webhook events (installation, issues, pull_request) allow instant synchronization. In local environments where public URLs are not accessible, manual on-demand sync is fully supported.',
          callout: {
            type: 'tip',
            text: 'For local webhook forwarding, you can use a public proxy like Smee.io pointing to your local /webhooks/github endpoint.',
          },
        },
      ],
    },
  },
  {
    id: 'sync',
    title: 'Repository Synchronization',
    category: 'Fundamentals',
    icon: Database,
    summary: 'How background BullMQ workers stream, index, and checkpoint repository data.',
    content: {
      lead: 'Repository synchronization runs asynchronously in background BullMQ workers backed by Redis, ensuring heavy Git and GitHub API workloads never block the web workbench.',
      sections: [
        {
          heading: 'The Ingestion Pipeline',
          body: 'When you trigger a sync, a job is pushed to the repository-sync BullMQ queue. The worker executes three distinct stages: (1) Repository metadata verification, (2) Paginated issues ingestion with rate-limit backoff, and (3) Pull requests and merge commit inspection.',
          codeSnippet: `// Trigger a repository sync via API
POST /api/v1/repositories/:owner/:repo/sync
Authorization: Bearer <FIREBASE_ID_TOKEN>`,
        },
        {
          heading: 'Idempotency and Checkpoints',
          body: 'All database writes use Prisma upserts. Repeated sync runs update existing records without creating duplicates. If an ingestion is interrupted, coverage complete flags indicate partial coverage honestly.',
        },
      ],
    },
  },
  {
    id: 'issues-prs',
    title: 'Issues & Pull Requests Explorer',
    category: 'Intelligence Engines',
    icon: GitPullRequest,
    summary: 'Navigating, searching, and inspecting synchronized work items and discussion threads.',
    content: {
      lead: 'The Issue and PR Explorer presents a unified table of all indexed work items with real-time state badges, author attribution, creation recency, and deep relationship drawers.',
      sections: [
        {
          heading: 'Filtering & Search',
          body: 'Filter items by type (Issue vs. PR), state (Open vs. Closed), or author. Full-text search queries issue titles and body descriptions.',
        },
        {
          heading: 'Drawer Inspection & GitHub Verification',
          body: 'Clicking any row opens the WorkItemDetailDrawer, displaying the full body content, raw metadata, resolution assessment, detected relationships, and direct links to the official GitHub discussion thread.',
        },
      ],
    },
  },
  {
    id: 'relationships',
    title: 'Relationship Intelligence',
    category: 'Intelligence Engines',
    icon: Sparkles,
    summary: 'Deterministic detection of ADDRESSES, SUPERSEDES, and FIXED_BY relationships.',
    content: {
      lead: 'CodeForensics discovers causal and historical connections between issues and pull requests using transparent, explainable heuristic and deterministic rules.',
      sections: [
        {
          heading: 'Supported Relationship Types',
          body: 'The engine categorizes relationships into three primary types:',
          codeSnippet: `ADDRESSES   # PR references an open issue (e.g., "fixes #42", "closes #108")
SUPERSEDES  # A newer PR or commit replaces an earlier abandoned or closed PR
FIXED_BY    # Confirmed resolution where a merged PR definitively closed an issue`,
        },
        {
          heading: 'Explainable "Why Linked?" Cards',
          body: 'Every detected relationship displays an explainable evidence summary detailing the exact closing keyword, source branch, commit SHA, and confidence score (HIGH, MEDIUM, LOW, or NOT_ASSESSED).',
          callout: {
            type: 'note',
            text: 'If an issue was closed without a linked pull request or closing commit, CodeForensics flags it as UNKNOWN CLOSURE rather than guessing resolution.',
          },
        },
      ],
    },
  },
  {
    id: 'contributions',
    title: 'Contribution Finder',
    category: 'Intelligence Engines',
    icon: Sparkles,
    summary: 'Discovering relevant code maintainers and assessing subsystem maintenance risk.',
    content: {
      lead: 'The Contribution Finder identifies the most qualified engineers to review a problem or collaborate on a subsystem based on historical commits, recency, and pull request activity.',
      sections: [
        {
          heading: 'Scoring Signals & Tiers',
          body: 'Contributors are ranked into 4 clear tiers: DOMAIN EXPERT (score >= 70), ACTIVE CONTRIBUTOR (>= 40), HISTORICAL CONTRIBUTOR (>= 15), and OCCASIONAL CONTRIBUTOR (< 15). Signals include file touch frequency, author recency, and review participation.',
        },
        {
          heading: 'Subsystem Maintenance Risk',
          body: 'The engine computes bus-factor and maintenance concentration risks. When a subsystem relies disproportionately on an inactive contributor, warning badges alert investigators to single-maintainer risks.',
        },
      ],
    },
  },
  {
    id: 'archaeology',
    title: 'Code Archaeology & AST Discovery',
    category: 'Intelligence Engines',
    icon: GitBranch,
    summary: 'Safe source analysis, TypeScript Compiler AST symbol extraction, and revision history.',
    content: {
      lead: 'Code Archaeology traces the evolution of source code files and functions over time without executing untrusted repository code or build scripts.',
      sections: [
        {
          heading: 'TypeScript Compiler API In-Memory Parsing',
          body: 'Source files are parsed into an Abstract Syntax Tree (AST) in memory using ts.createSourceFile. The engine identifies functions, React hooks, classes, methods, and interfaces with exact 1-indexed line spans.',
        },
        {
          heading: 'Safe Source Analysis Boundaries',
          body: 'Strict security limits prevent repository abuse: file sizes are constrained to 1MB, path traversal characters (..), absolute paths, and null bytes are rejected at the API boundary, and no arbitrary shell code is executed.',
          codeSnippet: `// Code Archaeology Trace Query
GET /api/v1/repositories/:owner/:repo/archaeology/trace?filePath=packages/shared/src/index.ts&symbolName=useDeferredValue`,
        },
      ],
    },
  },
  {
    id: 'investigations',
    title: 'Saved Investigations Workbench',
    category: 'Operations & Security',
    icon: BookOpen,
    summary: 'Managing forensic records, working hypotheses, observations, and structured citations.',
    content: {
      lead: 'Saved Investigations allow researchers to capture what they observed, why it mattered, and which evidence supported their conclusion.',
      sections: [
        {
          heading: 'Structured Evidence Bundles',
          body: 'An investigation preserves structured citations referencing issues, PRs, commit SHAs, file paths, and detected relationships alongside timestamps, provenance notes, and uncertainty disclosures.',
        },
        {
          heading: 'Server-Side User Ownership Enforcement',
          body: 'Investigations are private to the investigator. Every read, update, and delete request verifies server-side ownership (userId === authenticatedUser.uid). Spoofed user IDs are rejected with 403 Forbidden.',
        },
      ],
    },
  },
  {
    id: 'security',
    title: 'Authentication & Security Boundaries',
    category: 'Operations & Security',
    icon: Shield,
    summary: 'Multi-tenant isolation, token verification, input sanitization, and secret protection.',
    content: {
      lead: 'CodeForensics enforces defense-in-depth across the web client, API server, background workers, and PostgreSQL database.',
      sections: [
        {
          heading: 'Token Verification Architecture',
          body: 'The client authenticates via the Firebase Web SDK. On every private API request, the Bearer ID token is cryptographically verified by the Firebase Admin SDK on Fastify. No client-supplied identity claim is trusted without verification.',
        },
        {
          heading: 'Security Headers & CORS Hardening',
          body: 'The API enforces strict CORS origin matching, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, and Referrer-Policy: strict-origin-when-cross-origin. All client secrets remain strictly server-side.',
        },
      ],
    },
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting & Diagnostics',
    category: 'Operations & Security',
    icon: AlertTriangle,
    summary: 'Resolving database connectivity, Redis queue delays, and GitHub App integration errors.',
    content: {
      lead: 'Actionable recovery guidance for common local setup and infrastructure failures.',
      sections: [
        {
          heading: 'Database Connection Failures (500 / degraded health)',
          body: 'If the /health endpoint reports database: disconnected, ensure PostgreSQL is running and DATABASE_URL matches your credentials. For Docker: run docker compose up -d postgres.',
        },
        {
          heading: 'Redis Queue Stalls or Missing Worker',
          body: 'If sync jobs remain in QUEUED state, verify that the worker process is running (npm run dev:worker) and connected to REDIS_URL.',
        },
        {
          heading: 'GitHub App "Not Configured" Warning',
          body: 'If repository discovery returns an empty list, ensure GITHUB_APP_ID and GITHUB_PRIVATE_KEY_PATH are configured in .env and that the GitHub App has been installed on your GitHub account.',
        },
      ],
    },
  },
];

export function DocsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterQuery, setFilterQuery] = useState('');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [isMobileChaptersOpen, setIsMobileChaptersOpen] = useState(false);

  const activeChapterId = searchParams.get('chapter') || 'overview';

  const activeChapter = useMemo(() => {
    return DOC_CHAPTERS.find((c) => c.id === activeChapterId) || DOC_CHAPTERS[0]!;
  }, [activeChapterId]);

  const activeIndex = DOC_CHAPTERS.findIndex((c) => c.id === activeChapter.id);
  const prevChapter = activeIndex > 0 ? DOC_CHAPTERS[activeIndex - 1] : null;
  const nextChapter = activeIndex < DOC_CHAPTERS.length - 1 ? DOC_CHAPTERS[activeIndex + 1] : null;

  const filteredChapters = useMemo(() => {
    if (!filterQuery.trim()) return DOC_CHAPTERS;
    const q = filterQuery.toLowerCase();
    return DOC_CHAPTERS.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [filterQuery]);

  const handleCopy = (snippet: string) => {
    void navigator.clipboard.writeText(snippet);
    setCopiedSnippet(snippet);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const handleSelectChapter = (id: string) => {
    setSearchParams({ chapter: id });
    setIsMobileChaptersOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6">
      {/* Top Breadcrumb & Header */}
      <div className="mb-6 pb-4 border-b border-border-subtle">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-mono text-primary-muted mb-2 flex-wrap">
          <Link to="/app" className="hover:text-primary transition-colors">
            Workbench
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-primary font-medium">In-App Documentation</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-accent font-semibold truncate max-w-[200px] sm:max-w-none">{activeChapter.title}</span>
        </nav>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary flex items-center gap-2.5">
              <BookOpen className="w-5 sm:w-6 h-5 sm:h-6 text-accent shrink-0" />
              <span>Developer Reference & System Guide</span>
            </h1>
            <p className="text-xs text-primary-secondary mt-1">
              Evidence-backed explanations, architecture boundaries, and operating procedures.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-surface-subtle border border-border-subtle text-primary-muted">
              Release v0.1.0
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Chapter Selector Toggle (<lg) */}
      <div className="lg:hidden mb-4">
        <button
          type="button"
          onClick={() => setIsMobileChaptersOpen((prev) => !prev)}
          className="w-full flex items-center justify-between p-3 rounded-lg bg-surface border border-border-strong text-xs font-medium text-primary shadow-xs"
        >
          <div className="flex items-center gap-2 truncate">
            <activeChapter.icon className="w-4 h-4 text-accent shrink-0" />
            <span className="text-primary-muted font-mono">Chapter:</span>
            <span className="font-semibold text-primary truncate">{activeChapter.title}</span>
          </div>
          <span className="text-xs text-accent font-mono ml-2 shrink-0">
            {isMobileChaptersOpen ? 'Hide Menu ▲' : 'Browse All ▼'}
          </span>
        </button>
      </div>

      {/* Main Layout: Sidebar & Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Navigation Sidebar */}
        <aside className={cn('lg:col-span-4 bg-surface border border-border-subtle rounded-lg p-4 space-y-4', !isMobileChaptersOpen && 'hidden lg:block')}>
          {/* Quick Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-primary-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search documentation..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-surface-subtle border border-border-strong rounded text-xs font-mono text-primary placeholder:text-primary-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link transition-colors"
            />
          </div>

          {/* Chapter Links Grouped by Category */}
          <div className="space-y-4">
            {(['Fundamentals', 'Intelligence Engines', 'Operations & Security'] as const).map(
              (category) => {
                const chaptersInCategory = filteredChapters.filter((c) => c.category === category);
                if (chaptersInCategory.length === 0) return null;

                return (
                  <div key={category} className="space-y-1">
                    <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-primary-muted px-2 py-1">
                      {category}
                    </div>
                    {chaptersInCategory.map((chapter) => {
                      const Icon = chapter.icon;
                      const isActive = chapter.id === activeChapter.id;
                      return (
                        <button
                          key={chapter.id}
                          type="button"
                          onClick={() => handleSelectChapter(chapter.id)}
                          className={cn(
                            'w-full text-left px-2.5 py-2 rounded text-xs font-medium flex items-center gap-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link',
                            isActive
                              ? 'bg-surface-selected text-accent font-semibold border-l-2 border-accent'
                              : 'text-primary-secondary hover:text-primary hover:bg-surface-subtle'
                          )}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{chapter.title}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              }
            )}
          </div>
        </aside>

        {/* Documentation Content Panel */}
        <main className="lg:col-span-8 bg-surface border border-border-subtle rounded-lg p-6 sm:p-8 space-y-8">
          {/* Chapter Header */}
          <div className="space-y-3 pb-6 border-b border-border-subtle">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-surface-subtle border border-border-subtle text-accent">
              <activeChapter.icon className="w-3 h-3" />
              <span>{activeChapter.category}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
              {activeChapter.title}
            </h2>
            <p className="text-sm text-primary-secondary leading-relaxed">
              {activeChapter.content.lead}
            </p>
          </div>

          {/* Chapter Body Sections */}
          <div className="space-y-8">
            {activeChapter.content.sections.map((section, idx) => (
              <div key={idx} className="space-y-3">
                <h3 className="text-base font-semibold text-primary tracking-tight">
                  {section.heading}
                </h3>
                <p className="text-xs sm:text-sm text-primary-secondary leading-relaxed whitespace-pre-line">
                  {section.body}
                </p>

                {/* Callout Notice */}
                {section.callout && (
                  <div
                    className={cn(
                      'p-3.5 rounded border text-xs leading-relaxed flex items-start gap-2.5',
                      section.callout.type === 'note' && 'bg-surface-subtle border-border-strong text-primary',
                      section.callout.type === 'tip' && 'bg-surface-selected/30 border-accent/30 text-primary',
                      section.callout.type === 'warning' && 'bg-warning/10 border-warning/30 text-warning'
                    )}
                  >
                    <span className="font-mono font-bold text-[10px] uppercase shrink-0 px-1.5 py-0.5 rounded bg-surface border border-border-subtle">
                      {section.callout.type}
                    </span>
                    <span>{section.callout.text}</span>
                  </div>
                )}

                {/* Code Snippet Box */}
                {section.codeSnippet && (
                  <div className="relative rounded bg-slate-950 border border-border-strong overflow-hidden my-3">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-border-subtle text-[10px] font-mono text-primary-muted">
                      <span>Syntax / Contract</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(section.codeSnippet!)}
                        className="flex items-center gap-1 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-link"
                      >
                        {copiedSnippet === section.codeSnippet ? (
                          <>
                            <Check className="w-3 h-3 text-success" />
                            <span className="text-success">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-3.5 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
                      <code>{section.codeSnippet}</code>
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Previous / Next Chapter Navigation Footer */}
          <div className="pt-6 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
            {prevChapter ? (
              <button
                type="button"
                onClick={() => handleSelectChapter(prevChapter.id)}
                className="w-full sm:w-auto inline-flex items-center gap-2 px-3 py-2 rounded bg-surface border border-border-strong text-xs font-medium text-primary hover:bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link"
              >
                <ChevronLeft className="w-4 h-4 text-primary-muted" />
                <div className="text-left">
                  <div className="text-[10px] font-mono text-primary-muted uppercase">Previous</div>
                  <div className="font-medium text-primary truncate max-w-[200px]">{prevChapter.title}</div>
                </div>
              </button>
            ) : (
              <div />
            )}

            {nextChapter && (
              <button
                type="button"
                onClick={() => handleSelectChapter(nextChapter.id)}
                className="w-full sm:w-auto inline-flex items-center justify-end gap-2 px-3 py-2 rounded bg-surface border border-border-strong text-xs font-medium text-primary hover:bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link ml-auto"
              >
                <div className="text-right">
                  <div className="text-[10px] font-mono text-primary-muted uppercase">Next</div>
                  <div className="font-medium text-primary truncate max-w-[200px]">{nextChapter.title}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-primary-muted" />
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
export default DocsPage;
