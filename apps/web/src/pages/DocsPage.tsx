import { useState, useMemo, useEffect } from 'react';
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
  ArrowRight,
  ExternalLink,
  Menu,
  X,
  FileCode,
  Terminal,
  Activity,
  UserCheck,
  FolderGit2,
  Network,
} from 'lucide-react';
import { cn } from '../utils/cn.js';

export interface DocChapter {
  id: string;
  title: string;
  category: 'Fundamentals' | 'Intelligence Engines' | 'Operations & Security';
  icon: typeof BookOpen;
  summary: string;
  readTime: string;
  tags: string[];
  content: {
    lead: string;
    sections: {
      heading: string;
      body: string;
      stepNumber?: number;
      codeSnippet?: string;
      callout?: {
        type: 'note' | 'tip' | 'warning' | 'security';
        text: string;
      };
    }[];
  };
}

export const DOC_CHAPTERS: DocChapter[] = [
  // ============================================================================
  // 1. Fundamentals
  // ============================================================================
  {
    id: 'overview',
    title: 'Product Overview & Philosophy',
    category: 'Fundamentals',
    icon: Compass,
    summary: 'The core mission, evidentiary taxonomy, and architectural boundaries of CodeForensics.',
    readTime: '3 min read',
    tags: ['Architecture', 'Evidentiary Hierarchy', 'Philosophy'],
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
          heading: 'The 4-Tier Evidence Classification',
          body: 'Every entity, relationship, and closure assertion is stamped with one of four evidentiary tiers:\n\n• FACT: Direct observation from source provider APIs (e.g., GitHub commit SHA, author identity, verified merge timestamp).\n• INFERENCE: Deterministic AST derivation, explicit closing keywords ("fixes #42"), or commit-diff symbol overlap.\n• HYPOTHESIS: Heuristic or probabilistic match requiring human verification (e.g., semantic similarity or tentative PR relevance).\n• UNKNOWN: Honest abstention when evidence is missing, unverified, or ambiguous.',
        },
        {
          heading: 'Core Differentiators from Generic AI Assistants',
          body: 'Unlike LLM code tools that hallucinate intent or fabricate nonexistent PR connections, CodeForensics demands verifiable citations. Every relationship link, contributor score, and revision milestone points to immutable cryptographic commit SHAs and verified GitHub events.',
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
    readTime: '4 min read',
    tags: ['GitHub App', 'Security', 'Permissions'],
    content: {
      lead: 'CodeForensics integrates with GitHub via an official GitHub App rather than personal access tokens (PAT). This provides high hourly rate limits (5,000+ req/hr) and repository-scoped authorization.',
      sections: [
        {
          heading: 'Required Repository Permissions',
          body: 'CodeForensics strictly requests Read-only permissions across four repository resources:',
          codeSnippet: `Issues: Read-only          # To inspect issue threads, comments, and closing keywords
Pull requests: Read-only   # To inspect PR descriptions, base/head branches, and merges
Contents: Read-only        # To read commit trees, line ranges, and AST symbols
Metadata: Read-only        # Mandatory base repository metadata (name, owner, visibility)`,
        },
        {
          heading: 'Least-Privilege Security Guarantee',
          body: 'All administrative, secret, action, package, and write permissions must remain set to "No access". CodeForensics never requests write or delete permissions on any repository.',
          callout: {
            type: 'security',
            text: 'CodeForensics never stores personal access tokens in databases. Temporary 1-hour installation tokens are minted on-demand using an RSA private key and held in ephemeral memory.',
          },
        },
        {
          heading: 'Webhook Delivery & HMAC-SHA256 Verification',
          body: 'Live webhook events (issues, pull_request, installation) are signed with HMAC-SHA256 using GITHUB_WEBHOOK_SECRET. Fastify verifies the x-hub-signature-256 header using timing-safe comparisons to prevent timing attacks.',
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
    readTime: '4 min read',
    tags: ['BullMQ', 'Redis', 'Sync Pipeline', 'Postgres'],
    content: {
      lead: 'Repository synchronization runs asynchronously in background BullMQ workers backed by Redis, ensuring heavy Git and GitHub API workloads never block the web workbench.',
      sections: [
        {
          heading: 'The Multi-Stage Ingestion Pipeline',
          body: 'When synchronization is triggered, a job is pushed to the repository-sync queue. The background worker executes through distinct stages with real-time checkpointing:',
          codeSnippet: `// Synchronize repository via API
POST /api/v1/repositories/:owner/:repo/sync
Authorization: Bearer <FIREBASE_ID_TOKEN>

// Pipeline Execution Stages:
Stage 1: Verify repository metadata and installation token validity
Stage 2: Ingest paginated issues with rate-limit exponential backoff
Stage 3: Ingest pull requests, merge proofs, and linked commit SHAs
Stage 4: Compute deterministic cross-entity relationships and cache results`,
        },
        {
          heading: 'Idempotency and Checkpoints',
          body: 'All database writes utilize Prisma upserts keyed by GitHub IDs. Repeated sync runs update existing records without creating duplicates. If an ingestion is interrupted, coverage complete flags indicate partial coverage honestly.',
          callout: {
            type: 'tip',
            text: 'You can check real-time synchronization progress on any repository in the workbench TopBar status badge or via GET /api/v1/repositories/:owner/:repo/sync.',
          },
        },
      ],
    },
  },

  // ============================================================================
  // 2. Intelligence Engines & Full How-To-Use Workflows
  // ============================================================================
  {
    id: 'workflow-guide',
    title: 'Complete Step-by-Step Workbench Workflow',
    category: 'Intelligence Engines',
    icon: Activity,
    summary: 'A complete practical walkthrough: from selecting a repository to forensic analysis.',
    readTime: '6 min read',
    tags: ['Workflow', 'Step-by-Step', 'Practical Guide', 'How-To'],
    content: {
      lead: 'This guide walks you through the complete end-to-end workflow of investigating an open-source codebase using CodeForensics, from initial repository selection to exporting audit-grade evidence bundles.',
      sections: [
        {
          heading: 'Step 1: Select or Track Your Target Repository',
          stepNumber: 1,
          body: 'Open the workbench at /app. Click the repository dropdown in the header or sidebar to open the Repository Selection modal. If your GitHub App is installed, select any discovered repository from the list. Alternatively, enter a custom public repository (e.g., facebook/react, vercel/next.js) and click "Track Repository".',
        },
        {
          heading: 'Step 2: Trigger and Monitor Forensic Synchronization',
          stepNumber: 2,
          body: 'Once a repository is active, verify its sync state. Click the "Sync" button in the TopBar. The BullMQ worker will stream issues, PRs, comments, and commit logs into Postgres. The TopBar shows an active spinning indicator ("Syncing..."), transitioning to "Synchronized" once completed.',
          callout: {
            type: 'tip',
            text: 'Initial synchronization of large repositories indexes the latest 100 issues and PRs first for immediate exploration while background workers complete historical backfill.',
          },
        },
        {
          heading: 'Step 3: Map Codebase Topography & Churn Hotspots',
          stepNumber: 3,
          body: 'Navigate to "Architecture Map" (/app/map) in the sidebar. CodeForensics compiles the directory hierarchy into an interactive client-side Mermaid vector flowchart and 2D Churn Heatmap. Click "What is Code Churn & Hotspot?" to understand churn volatility thresholds (🔥 score ≥ 65/100). Use the neatly aligned side toolbar to export Markdown (.md), Mermaid (.mmd), ASCII Tree (.txt), or a single-file Offline Audit Dossier (.html).',
        },
        {
          heading: 'Step 4: Conduct Deep Forensic Analytics in the Workbench',
          stepNumber: 4,
          body: 'Navigate to "Forensic Analysis" (/app/analysis) in the sidebar. Switch between 4 dedicated forensic engines:\n\n• Co-Change Matrix: Detect statistical co-occurrence and cross-subsystem leaks.\n• Time-Machine: Scrub across historical milestone eras to observe codebase growth.\n• Bus Factor Risk: Identify single-maintainer dependencies and Zombie Hotspots.\n• Blast Radius: Simulate proposed changes to predict companion files and test suites at risk.\n\nClick the "What is ...?" explanation buttons at the top of each tab for quick guides, and consult the downside remediation playbooks at the bottom for concrete engineering tactics.',
        },
        {
          heading: 'Step 5: Explore Issues & PRs with Evidentiary Confidence',
          stepNumber: 5,
          body: 'Navigate to "Issues & PRs" in the sidebar. Use the search bar to query keywords (e.g. "memory leak", "auth bypass", "hydration"). The table displays type icons, issue numbers, titles, and real-time state badges. Click any row to slide out the WorkItemDetailDrawer.',
        },
        {
          heading: 'Step 6: Inspect "Why Linked?" Cards and Closure Proofs',
          stepNumber: 6,
          body: 'Inside the drawer, switch to the "Relationships & Resolution" tab. CodeForensics analyzes why this work item is linked to other PRs or issues. Look for the "Why Linked?" card:\n\n• If closed by a verified commit with "fixes #123", the badge displays FACT with 100% confidence.\n• If linked via PR branch name or title keyword, it displays INFERENCE.\n• If closed without an associated PR, it displays UNKNOWN CLOSURE.',
        },
        {
          heading: 'Step 7: Trace Function Evolution with Code Archaeology',
          stepNumber: 7,
          body: 'Navigate to "Code Archaeology". Enter a file path (e.g. packages/shared/src/index.ts) and a function or symbol name. Click "Trace Symbol History". CodeForensics parses the file AST in memory, extracts exact line spans, and overlays historical git blame revisions with linked PR pills.',
        },
        {
          heading: 'Step 8: Assess Contributor Expertise & Ownership Risks',
          stepNumber: 8,
          body: 'Navigate to "Contribution Finder". Review the ranked list of maintainers categorized into DOMAIN EXPERT, ACTIVE, and HISTORICAL. Inspect the Subsystem Ownership Risk banner at the top to discover single-maintainer dependencies and bus-factor vulnerabilities.',
        },
        {
          heading: 'Step 9: Record and Export Saved Forensic Investigations',
          stepNumber: 9,
          body: 'Navigate to "Investigations". Click "+ New Investigation" to create an audit record. Attach observed issue/PR citations, add hypothesis cards (e.g. "Fix was reverted in commit #a1b2c3d"), and record uncertainty notes. Your investigation is cryptographically secured to your user account.',
          callout: {
            type: 'note',
            text: 'All investigation records can be referenced later or shared with incident response teams as audit-grade verification briefs.',
          },
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
    readTime: '4 min read',
    tags: ['Explorer', 'Work Items', 'Filtering', 'Detail Drawer'],
    content: {
      lead: 'The Issue and PR Explorer presents a unified table of all indexed work items with real-time state badges, author attribution, creation recency, and deep relationship drawers.',
      sections: [
        {
          heading: 'Filtering & Precision Search',
          body: 'Filter items by type (Issue vs. PR), state (Open vs. Closed), or author. Full-text search queries issue titles and body descriptions with instant debounced updates.',
        },
        {
          heading: 'Drawer Inspection & GitHub Verification',
          body: 'Clicking any row opens the WorkItemDetailDrawer, displaying the full body content, raw metadata, resolution assessment, detected relationships, and direct links to the official GitHub discussion thread.',
        },
        {
          heading: 'Mobile Responsive Table Reflow',
          body: 'On mobile and tablet displays (< 640px), the table automatically collapses non-essential columns (Author, Timestamps) into compact metadata chips beneath the title, ensuring zero horizontal overflow while preserving complete attribution data.',
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
    readTime: '5 min read',
    tags: ['Relationships', 'Why Linked', 'Evidence Cards', 'Closure'],
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
        {
          heading: 'Historical Precedents & Prior Art Engine',
          body: 'Beyond direct closing links, CodeForensics analyzes historical changes to uncover prior art and past precedents. When evaluating an issue or PR, the engine performs multi-factor matching against historical repository records:\n\n• SHARED_FILES: Discovers merged PRs that touched the exact same file paths or modified overlapping symbols.\n• SUBSYSTEM_SCOPE: Identifies prior changes that targeted identical architectural boundaries (e.g., conventional commit tags like "fix(auth)" or "feat(server)").\n• ERROR_KEYWORD: Matches specific recurring error tokens, stack trace signatures, or failure codes (e.g., TokenExpiredError, ECONNRESET, hydration failures).\n• SIMILAR_DESCRIPTION: Surfaces prior closed issues with correlated symptoms.',
          callout: {
            type: 'tip',
            text: 'Investigators can click "Copy Evidence Citation" on any historical precedent card to instantly reference the prior art in an active audit dossier.',
          },
        },
      ],
    },
  },
  {
    id: 'repository-map',
    title: 'Repository Architecture Map & Churn Heatmap',
    category: 'Intelligence Engines',
    icon: Network,
    summary: 'Interactive hierarchical graph of codebase architecture, modules, and code churn hotspot distribution.',
    readTime: '4 min read',
    tags: ['Architecture Map', 'Tree View', 'Churn Heatmap', 'Side Downloads', 'Mermaid Export', 'Codebase Navigation'],
    content: {
      lead: 'The Repository Architecture Map visualizes the complete structural hierarchy of a repository, calculates code churn volatility (0-100) per file and directory, and exports multi-format diagrams from an aligned side toolbar.',
      sections: [
        {
          heading: 'What is Code Churn and Why Do Hotspots Matter?',
          body: 'Code Churn measures the velocity and volume of modifications across a file or module over time. While new code is often harmless, frequently churned code is the #1 leading indicator of software defects.\n\nEmpirical code forensics research reveals that files in the top 10% of churn accumulate over 60% of all regression bugs and merge conflicts. When multiple developers repeatedly rewrite the same file across sprints, it signals architectural ambiguity, tight coupling, or insufficient unit test coverage.\n\nClick the prominent, vibrant "What is Code Churn & Hotspot?" educational button right below the page heading to toggle a deep-dive walkthrough explaining churn mathematics and refactoring heuristics.',
          callout: {
            type: 'note',
            text: 'Code churn is not inherently bad — during early feature incubation, high churn is normal. However, persistent high churn in mature code indicates a technical debt hotspot requiring refactoring.',
          },
        },
        {
          heading: '0–100 Churn Volatility Scoring Formula',
          body: 'CodeForensics normalizes code churn into a standardized 0–100 index computed from three weighted signals:\n\n• 40% Commit Frequency: The number of distinct commits touching the file relative to the repository maximum.\n• 35% Line Turnover: Cumulative volume of lines added and deleted (delta churn volume).\n• 25% Pull Request Velocity: Number of distinct PR reviews and merges modifying this file.\n\nThe resulting score maps to three forensic tiers:\n\n• 🔴 Critical Hotspot (≥ 65/100): Crimson node with flame icon. High defect risk, frequent rewrites, architectural bottleneck.\n• 🟡 Moderate Churn (40–64/100): Amber node. Active feature evolution requiring watchful review.\n• 🟢 Stable Core (< 40/100): Slate/emerald node. Foundational, battle-tested utilities with low volatility.',
          codeSnippet: `// 0–100 Churn Score Calculation Formula:
ChurnScore = Normalize(
  (0.40 * CommitTouches) +
  (0.35 * LineTurnoverDelta) +
  (0.25 * PRTouchVelocity)
)`,
        },
        {
          heading: 'Visual Code Churn & Hotspot Heatmap (2D Matrix)',
          body: 'Located directly above the Mermaid flowchart, the visual Churn Heatmap displays a dense 2D grid matrix of all repository files grouped by architectural subsystem. Each file block is color-coded using a continuous chromatic gradient from emerald (0 - Stable Core) to deep crimson (100 - Extreme Hotspot). Hovering over any cell reveals exact churn score, line turnover, and commit count, while clicking loads the file into the Architecture Inspector.',
        },
        {
          heading: 'Interactive Vector Flowchart, Folder Drill-Down & Smooth Zoom',
          body: 'The Architecture Map compiles the repository directory hierarchy into an interactive vector flowchart rendered with Mermaid:\n\n• Folder Drill-Down: Click any directory node directly inside the flowchart to expand its child folders and files inline. Click again to collapse.\n• Smooth Pan & Damped Zoom: Pinch with two fingers on a trackpad or hold Ctrl and scroll with a mouse wheel. Smooth logarithmic damping prevents jarring zoom jumps.\n• Double-Click Zoom: Double-click any area to smoothly zoom into that exact location, or double-click when zoomed in to reset back to 100%.\n• Drag to Pan: Click and drag anywhere on the canvas to inspect large codebases without scrollbar boundaries.\n• Negative-Coordinate Protection: All scaled diagram nodes are bounded in positive layout space, ensuring the left half of wide diagrams is never cut off.',
        },
        {
          heading: 'Side-Aligned Multi-Format Export Toolbar',
          body: 'All 4 export and download actions are neatly aligned together on the side of the header in a symmetrical 2x2 grid on medium displays and a unified row on desktop:\n\n• Markdown (.md): Complete documentation briefing with executive summary, subsystem table, and embedded Mermaid graph.\n• Mermaid (.mmd): Ready-to-embed flowchart diagram compatible with GitHub, Notion, and Obsidian markdown renderers.\n• ASCII Tree (.txt): Clean formatted text tree with file sizes, counts, and churn badges.\n• Standalone Audit Dossier (.html): A single-file, air-gapped forensic audit pack with embedded SVG vector flowcharts, co-change matrices, bus factor registers, and issue verification cards with zero external dependencies.',
          codeSnippet: `// Export endpoints:
GET /api/v1/repositories/:owner/:repo/map
GET /api/v1/repositories/:owner/:repo/map/dossier      # Standalone single-file HTML audit pack`,
        },
        {
          heading: 'Subsystem Import Dependency Flow Overlay',
          body: 'In the Architecture flowchart, click the "Dependency Flow" toolbar button to overlay directional dependency arrows between subsystems based on static import/export analysis:\n\n• Directional Arrows: Renders dashed links showing import frequency between subsystems (e.g., apps/web → packages/shared).\n• Layer Boundary Compliance: Validates architectural layering, ensuring shared packages do not illegally import from application roots.',
        },
      ],
    },
  },
  {
    id: 'forensic-analysis',
    title: 'Forensic Analysis Workbench',
    category: 'Intelligence Engines',
    icon: Activity,
    summary: 'Dedicated forensic deep-dive laboratory for temporal co-change, time-machine scrubbers, bus factor risk heatmaps, and blast-radius simulators.',
    readTime: '6 min read',
    tags: ['Forensic Analysis', 'Co-Change Matrix', 'Time-Machine', 'Bus Factor', 'Blast Radius', 'Downside Playbooks'],
    content: {
      lead: 'The Forensic Analysis Workbench (/app/analysis) is a dedicated investigation laboratory providing focused analytics for temporal coupling, architectural evolution milestones, bus factor knowledge-loss risks, and blast radius simulations—free from visual clutter.',
      sections: [
        {
          heading: 'Unified Forensic Workbench Architecture (/app/analysis)',
          body: 'To avoid visual clutter on the Repository Map, the 4 forensic deep-dive engines are unified in their own dedicated workbench accessible from the sidebar. Each engine is accessed via segmented tabs with URL query parameter persistence (?tab=co-change, ?tab=timeline, ?tab=bus-factor, ?tab=blast-radius):\n\n• Seamless Navigation: Switch between engines instantly without reloading.\n• Header Explanation Buttons: Every tab features a prominent "What is ...?" explanation toggle button next to the engine title.\n• Downside Analysis & Remediation Playbooks: Every tab includes a comprehensive downside guide at the bottom detailing why the risk matters, what negative consequences happen if ignored, and concrete engineering actions.',
        },
        {
          heading: '1. Temporal Co-Change & Coupling Matrix',
          body: 'Temporal co-change measures statistical commit co-occurrence across pull requests to detect invisible architectural dependencies:\n\n• Jaccard Similarity Coupling: Quantifies how often file pairs mutate together across historical PR batches (e.g., 92% coupling between an API store and database schema).\n• Cross-Subsystem Leak Detection: Flags files in different architectural tiers that co-change frequently in crimson with a warning badge, signaling leaky abstractions.\n• One-Click Blast Radius Simulation: Click "Blast Radius" on any coupled pair to test ripple impact.\n• Downside Playbook: The bottom guide outlines how high co-change drives regression loops and merge conflicts, and provides refactoring tactics like event buses and domain boundary enforcement.',
          codeSnippet: `// API Endpoint for Temporal Co-Change:
GET /api/v1/repositories/:owner/:repo/map/co-change`,
        },
        {
          heading: '2. Time-Machine Architecture Timeline Scrubber',
          body: 'The Time-Machine feature provides an interactive playback scrubber across 4 chronological milestones (6 Months Ago → 3 Months Ago → 1 Month Ago → Present Snapshot):\n\n• Architectural Evolution: Tracks how file count, directory depth, and subsystem count expanded across release eras.\n• Hotspot Migration Tracking: Identifies exactly when stable files became volatile churn hotspots during rapid feature expansion or major refactors.\n• Automated Playback: Click "Play Timeline" to automatically scrub through milestones with 2.8s intervals.\n• Downside Playbook: The bottom guide details how unmanaged codebase sprawl increases cognitive load and onboarding overhead, advising architecture freezes and modular sub-packaging.',
          codeSnippet: `// API Endpoint for Historical Timeline Milestones:
GET /api/v1/repositories/:owner/:repo/map/timeline`,
        },
        {
          heading: '3. Bus Factor Risk & Zombie Hotspots Heatmap',
          body: 'Correlates Churn Hotspot velocity with Contribution Finder maintainer activity to uncover organizational vulnerabilities:\n\n• Visual Risk Heatmap: Files are color-coded into Critical Risk (crimson), Moderate Risk (amber), and Healthy Distribution (emerald).\n• Zombie Hotspots: High-churn files (score ≥ 60) where 80%+ of original lines were authored by engineers who are dormant or departed.\n• Single-Maintainer Dependencies: Critical files with a Bus Factor of 1 where institutional knowledge resides with a single engineer.\n• Downside Playbook: The bottom guide highlights project paralysis risks when lead maintainers take leave, recommending pair programming, mandatory rotational reviews, and targeted documentation briefs.',
          codeSnippet: `// API Endpoint for Bus Factor & Knowledge Loss:
GET /api/v1/repositories/:owner/:repo/map/knowledge-loss`,
        },
        {
          heading: '4. Automated Architectural Blast-Radius Predictor',
          body: 'An interactive pre-commit simulator where engineers input target files or branches to calculate ripple impacts before merging:\n\n• Hazard Score (0–100): Categorizes proposed modifications into CRITICAL, HIGH, MODERATE, or LOW hazard.\n• Downstream Coupled Files: Pinpoints hidden companion files that should likely be updated in the same PR.\n• Regression Test Suites at Risk: Surfaces unit, integration, and e2e test files marked MUST PASS.\n• Boundary Crossing Warnings: Highlights changes that breach subsystem tiers.\n• Recommended Reviewers: Identifies verified domain experts to invite to the PR review.\n• Downside Playbook: The bottom guide explains how undetected blast ripples cause silent production regressions, recommending regression test additions and feature flag gating.',
          codeSnippet: `// API Endpoint for Blast Radius Simulation:
POST /api/v1/repositories/:owner/:repo/map/blast-radius
Body: { "targetFiles": ["apps/api/src/db/repositoryStore.ts"] }`,
        },
        {
          heading: 'Interactive Educational Guides & Actionable Downside Playbooks',
          body: 'Every tab in the Forensic Analysis Workbench includes:\n\n1. "What is [Engine]?" Toggle Button: Positioned directly beside the engine heading with vibrant high-contrast styling. Clicking opens an expandable quick guide.\n2. Comprehensive Downside Playbook: Positioned at the bottom of the active tab, providing four structured panels:\n   - ⚠️ What Happens If Ignored: Real-world risks like regression loops, project stalls, and merge conflicts.\n   - 🔍 Key Indicators to Watch: Thresholds (e.g. coupling ≥ 60%, bus factor = 1, zombie hotspots).\n   - 🛡️ Recommended Engineering Actions: Practical steps for refactoring, test coverage, and documentation.\n   - 🚀 Verification & Safety Checks: Pre-merge validation steps.',
        },
      ],
    },
  },
  {
    id: 'contributions',
    title: 'Contribution Finder',
    category: 'Intelligence Engines',
    icon: UserCheck,
    summary: 'Discovering relevant code maintainers and assessing subsystem maintenance risk.',
    readTime: '4 min read',
    tags: ['Maintainers', 'Risk Analysis', 'Bus Factor', 'Ownership'],
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
    readTime: '5 min read',
    tags: ['AST', 'TypeScript', 'Git Blame', 'Security Sandbox'],
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
    icon: FolderGit2,
    summary: 'Managing forensic records, working hypotheses, observations, and structured citations.',
    readTime: '4 min read',
    tags: ['Investigations', 'Audit Trails', 'Hypotheses', 'Citations'],
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

  // ============================================================================
  // 3. Operations & Security
  // ============================================================================
  {
    id: 'security',
    title: 'Authentication & Security Boundaries',
    category: 'Operations & Security',
    icon: Shield,
    summary: 'Multi-tenant isolation, token verification, input sanitization, and secret protection.',
    readTime: '4 min read',
    tags: ['Firebase', 'Auth', 'CORS', 'Security Headers'],
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
];

export function DocsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterQuery, setFilterQuery] = useState('');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const activeChapterId = searchParams.get('chapter') || 'overview';

  const activeChapter = useMemo(() => {
    return DOC_CHAPTERS.find((c) => c.id === activeChapterId) || DOC_CHAPTERS[0]!;
  }, [activeChapterId]);

  const activeIndex = DOC_CHAPTERS.findIndex((c) => c.id === activeChapter.id);
  const prevChapter = activeIndex > 0 ? DOC_CHAPTERS[activeIndex - 1] : null;
  const nextChapter = activeIndex < DOC_CHAPTERS.length - 1 ? DOC_CHAPTERS[activeIndex + 1] : null;

  // Filter chapters across title, summary, category, or tags
  const filteredChapters = useMemo(() => {
    if (!filterQuery.trim()) return DOC_CHAPTERS;
    const q = filterQuery.toLowerCase();
    return DOC_CHAPTERS.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [filterQuery]);

  // Group filtered chapters by category
  const categories = useMemo(() => {
    const map = new Map<'Fundamentals' | 'Intelligence Engines' | 'Operations & Security', DocChapter[]>();
    map.set('Fundamentals', []);
    map.set('Intelligence Engines', []);
    map.set('Operations & Security', []);

    for (const ch of filteredChapters) {
      const list = map.get(ch.category);
      if (list) list.push(ch);
    }
    return map;
  }, [filteredChapters]);

  const handleCopy = (snippet: string) => {
    void navigator.clipboard.writeText(snippet);
    setCopiedSnippet(snippet);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const handleSelectChapter = (id: string) => {
    setSearchParams({ chapter: id });
    setIsMobileSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Keyboard shortcut listener for quick search ('/')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        document.getElementById('docs-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-800 flex flex-col font-sans selection:bg-cyan-100 selection:text-cyan-900">
      {/* ---------------------------------------------------------------------- */}
      {/* 1. Global Standalone Documentation Header Navigation (Light Theme)     */}
      {/* ---------------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          {/* Mobile Sidebar Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-md border border-slate-200 hover:border-slate-300 bg-white shadow-xs min-w-[38px] min-h-[38px] flex items-center justify-center transition-colors"
            aria-label="Toggle Documentation Navigation"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Logo & Docs Lockup */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-slate-900 border border-slate-800 text-[#38bdf8] flex items-center justify-center font-mono font-bold text-xs sm:text-sm shadow-sm">
              CF
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 group-hover:text-cyan-700 transition-colors">
                CodeForensics
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-50 text-cyan-700 border border-cyan-200">
                DOCS
              </span>
            </div>
          </Link>
        </div>

        {/* Global Search Bar (Center / Right) */}
        <div className="flex-1 max-w-xs sm:max-w-md mx-3 hidden sm:block">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="docs-search-input"
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search documentation..."
              className="w-full h-9 pl-8 pr-12 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 font-mono transition-all"
            />
            {filterQuery ? (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-mono"
              >
                ✕
              </button>
            ) : (
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 border border-slate-200 rounded">
                /
              </kbd>
            )}
          </div>
        </div>

        {/* Direct Action Links */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            to="/"
            className="hidden md:inline-flex items-center text-xs font-mono text-slate-600 hover:text-slate-900 transition-colors px-2 py-1"
          >
            Home
          </Link>
          <a
            href="https://github.com/Manas-5461X/CodeForensics"
            target="_blank"
            rel="noreferrer"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 bg-white shadow-xs transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-600" />
            <span>GitHub</span>
          </a>
          <Link
            to="/app"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 bg-slate-900 hover:bg-slate-800 text-white font-mono font-semibold text-xs uppercase tracking-wider rounded-lg transition-all duration-200 shadow-xs hover:-translate-y-0.5"
          >
            <span>Workbench</span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
          </Link>
        </div>
      </header>

      {/* ---------------------------------------------------------------------- */}
      {/* 2. Main Documentation Layout: Categorized Sidebar + Content Article   */}
      {/* ---------------------------------------------------------------------- */}
      <div className="flex-1 w-full max-w-[1440px] mx-auto flex relative">
        {/* Mobile Sidebar Off-Canvas Backdrop */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Left Sticky Sidebar (<aside>) */}
        <aside
          className={cn(
            'fixed lg:sticky top-16 z-50 lg:z-10 h-[calc(100vh-4rem)] w-72 sm:w-80 border-r border-slate-200 bg-white lg:bg-slate-50/60 overflow-y-auto p-4 sm:p-5 flex flex-col shrink-0 transition-transform duration-300 ease-in-out',
            isMobileSidebarOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full lg:translate-x-0'
          )}
        >
          {/* Mobile Sidebar Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 lg:hidden">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-600" />
              <span className="font-bold text-sm text-slate-900">Documentation Index</span>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-1 text-slate-500 hover:text-slate-800 rounded min-w-[32px] min-h-[32px] flex items-center justify-center"
              aria-label="Close Documentation Index"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Search input inside drawer */}
          <div className="mb-4 sm:hidden">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter chapters..."
                className="w-full h-8 pl-7 pr-3 bg-white border border-slate-200 rounded text-xs text-slate-900 placeholder:text-slate-400 font-mono shadow-xs"
              />
            </div>
          </div>

          {/* Categorized Chapter Navigation */}
          <nav className="space-y-6 flex-1">
            {(['Fundamentals', 'Intelligence Engines', 'Operations & Security'] as const).map((categoryKey) => {
              const chapters = categories.get(categoryKey) || [];
              if (chapters.length === 0) return null;

              return (
                <div key={categoryKey} className="space-y-1.5">
                  <div className="px-2.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                    <span>{categoryKey}</span>
                    <span className="text-slate-400 font-mono">{chapters.length}</span>
                  </div>

                  <div className="space-y-0.5">
                    {chapters.map((chapter) => {
                      const isActive = activeChapter.id === chapter.id;
                      const Icon = chapter.icon;

                      return (
                        <button
                          key={chapter.id}
                          type="button"
                          onClick={() => handleSelectChapter(chapter.id)}
                          className={cn(
                            'w-full text-left flex items-start gap-2.5 px-3 py-2 rounded-lg text-xs transition-all duration-150 group',
                            isActive
                              ? 'bg-cyan-50 text-cyan-900 font-semibold border border-cyan-200 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
                          )}
                        >
                          <Icon
                            className={cn(
                              'w-4 h-4 shrink-0 mt-0.5 transition-colors',
                              isActive ? 'text-cyan-700' : 'text-slate-400 group-hover:text-slate-600'
                            )}
                          />
                          <div className="flex-1 truncate">
                            <div className="truncate">{chapter.title}</div>
                          </div>
                          {isActive && <ChevronRight className="w-3 h-3 text-cyan-700 shrink-0 mt-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Sidebar Footer Link to Developer Setup & Cloud Deployment */}
          <div className="pt-4 mt-4 border-t border-slate-200 text-[11px] font-mono text-slate-500">
            <a
              href="https://github.com/Manas-5461X/CodeForensics/blob/main/docs/setup-and-deployment.md"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between text-slate-600 hover:text-cyan-700 transition-colors group"
            >
              <span>Setup & Cloud Deployment</span>
              <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-cyan-700 transition-colors" />
            </a>
          </div>
        </aside>

        {/* Right Article Main Content (Crisp Light Background) */}
        <main className="flex-1 min-w-0 px-4 sm:px-8 lg:px-12 py-8 lg:py-10 bg-white">
          {/* Breadcrumb Row */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-4 flex-wrap">
            <Link to="/" className="hover:text-slate-900 transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Link to="/docs" className="hover:text-slate-900 transition-colors">
              Docs
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">{activeChapter.category}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-cyan-700 font-semibold truncate max-w-[220px] sm:max-w-none">
              {activeChapter.title}
            </span>
          </nav>

          {/* Chapter Header Title & Meta */}
          <div className="pb-6 mb-8 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-cyan-50 border border-cyan-200 text-[10px] font-mono text-cyan-800 uppercase tracking-wider font-semibold">
                <activeChapter.icon className="w-3 h-3 text-cyan-600" />
                <span>{activeChapter.category}</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
                <span>{activeChapter.readTime}</span>
                <span>•</span>
                <span className="text-slate-600">Developer Reference & System Guide</span>
              </div>
            </div>

            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-3">
              {activeChapter.title}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">
              {activeChapter.content.lead}
            </p>

            {/* Tag Pills */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {activeChapter.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 rounded text-[10px] font-mono text-slate-600 bg-slate-100 border border-slate-200"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Chapter Content Sections */}
          <div className="space-y-10">
            {activeChapter.content.sections.map((section, idx) => (
              <section key={idx} className="space-y-3.5 scroll-mt-20" id={`section-${idx}`}>
                <div className="flex items-baseline gap-3">
                  {section.stepNumber && (
                    <span className="w-6 h-6 rounded bg-cyan-100 border border-cyan-300 text-cyan-800 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      {section.stepNumber}
                    </span>
                  )}
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                    {section.heading}
                  </h3>
                </div>

                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-line">
                  {section.body}
                </div>

                {/* Callout Box (Light Mode Tinted Cards) */}
                {section.callout && (
                  <div
                    className={cn(
                      'p-3.5 sm:p-4 rounded-lg border text-xs sm:text-sm leading-relaxed flex items-start gap-3 my-3 shadow-xs',
                      section.callout.type === 'note' &&
                        'bg-blue-50/90 border-blue-200 text-blue-950',
                      section.callout.type === 'tip' &&
                        'bg-emerald-50/90 border-emerald-200 text-emerald-950',
                      section.callout.type === 'warning' &&
                        'bg-amber-50/90 border-amber-200 text-amber-950',
                      section.callout.type === 'security' &&
                        'bg-purple-50/90 border-purple-200 text-purple-950'
                    )}
                  >
                    {section.callout.type === 'note' && <Compass className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
                    {section.callout.type === 'tip' && <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                    {section.callout.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
                    {section.callout.type === 'security' && <Shield className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <strong className="font-semibold block mb-0.5 uppercase tracking-wider text-[10px] font-mono">
                        {section.callout.type}:
                      </strong>
                      <span>{section.callout.text}</span>
                    </div>
                  </div>
                )}

                {/* Code Block Snippet (Crisp Syntax Container) */}
                {section.codeSnippet && (
                  <div className="relative group rounded-lg overflow-hidden border border-slate-800 bg-[#0f172a] my-3 shadow-sm">
                    <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900 border-b border-slate-800 text-[11px] font-mono text-slate-400">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Snippet Reference</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(section.codeSnippet!)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                        aria-label="Copy code snippet to clipboard"
                      >
                        {copiedSnippet === section.codeSnippet ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-semibold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-slate-100 overflow-x-auto leading-relaxed selection:bg-cyan-500/30">
                      <code>{section.codeSnippet}</code>
                    </pre>
                  </div>
                )}
              </section>
            ))}
          </div>

          {/* Interactive Next & Previous Chapter Navigation Footer */}
          <div className="mt-14 pt-8 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {prevChapter ? (
              <button
                type="button"
                onClick={() => handleSelectChapter(prevChapter.id)}
                className="flex flex-col items-start p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all text-left group shadow-xs"
                aria-label={`Previous ${prevChapter.title}`}
              >
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 mb-1">
                  <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-slate-400" />
                  <span>Previous</span>
                </div>
                <div className="font-semibold text-sm text-slate-900 group-hover:text-cyan-700 transition-colors truncate w-full">
                  {prevChapter.title}
                </div>
              </button>
            ) : (
              <div className="hidden sm:block" />
            )}

            {nextChapter ? (
              <button
                type="button"
                onClick={() => handleSelectChapter(nextChapter.id)}
                className="flex flex-col items-end p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all text-right group sm:col-start-2 shadow-xs"
                aria-label={`Next ${nextChapter.title}`}
              >
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 mb-1">
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-slate-400" />
                </div>
                <div className="font-semibold text-sm text-slate-900 group-hover:text-cyan-700 transition-colors truncate w-full">
                  {nextChapter.title}
                </div>
              </button>
            ) : (
              <div className="hidden sm:block" />
            )}
          </div>

          {/* Launch Workbench Banner at Bottom */}
          <div className="mt-10 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
            <div>
              <h4 className="text-sm sm:text-base font-bold text-white mb-1">
                Ready to analyze code with traceable provenance?
              </h4>
              <p className="text-xs text-slate-300 font-light">
                Launch the interactive workbench to investigate issues, inspect PR closure proofs, and trace symbols.
              </p>
            </div>
            <Link
              to="/app"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider rounded-lg transition-all shrink-0 shadow-md"
            >
              <span>Open Workbench</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}

export default DocsPage;
