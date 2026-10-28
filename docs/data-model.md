# CodeForensics — Data Model and Evidence Taxonomy

## 1. Domain Entities

The CodeForensics domain model stores normalized repository records, synchronization checkpoints, evidenced relationships, and user investigations in PostgreSQL via Prisma.

### 1.1 Core Entities

| Entity | Purpose | Key Constraints |
|---|---|---|
| **User** | Application identity keyed by external Firebase UID | `firebaseUid` UNIQUE |
| **GitHubInstallation** | Authorized GitHub App installation record | `installationId` UNIQUE |
| **Repository** | Synchronized GitHub repository metadata | `githubRepoId` UNIQUE, `[owner, name]` UNIQUE |
| **RepositorySyncState** | Durable checkpoint, coverage, and error summary | `repositoryId` UNIQUE |
| **Issue** | Normalized issue record | `githubIssueId` UNIQUE, `[repositoryId, number]` UNIQUE |
| **PullRequest** | Normalized pull request record with merge status | `githubPrId` UNIQUE, `[repositoryId, number]` UNIQUE |
| **Relationship** | Typed relationship edge between two work items | Indexes on `[repositoryId, sourceId]`, `[repositoryId, targetId]` |
| **Investigation** | User-preserved forensic investigation | Foreign keys to `User` and `Repository` |
| **JobRecord** | Durable background job status and diagnostics | `jobId` UNIQUE, Index on `[queueName, status]` |

## 2. Evidence Taxonomy and Claim Categories

CodeForensics enforces an evidentiary distinction between verified provider facts and heuristic inferences:

### 2.1 Claim Categories
- **`FACT`**: Explicitly documented in authoritative provider records (e.g., GitHub issue closed state, merged commit SHA in Git history, explicit git commit parent reference).
- **`INFERENCE`**: Derived from deterministic rules, commit diff analysis, or text citations with inspectable provenance.
- **`HYPOTHESIS`**: Plausible explanation under active investigation that has not been confirmed.
- **`UNKNOWN`**: Explicit acknowledgement that available evidence is insufficient to draw a conclusion.

### 2.2 Relationship Types
- **Direct Linkage:** `ADDRESSES`, `PARTIALLY_ADDRESSES`, `FIXED_BY`, `INTRODUCED_BY`
- **Lineage & Sequence:** `SUPERSEDES`, `FOLLOWS_UP_ON`, `REOPENS`, `REGRESSION_OF`
- **Equivalence & Backport:** `DUPLICATES`, `REVERTS`, `BACKPORT_OF`, `CHERRY_PICK_OF`
- **Dependency:** `BLOCKS`, `BLOCKED_BY`, `RELATED_TO`

### 2.3 Confidence Calibration
Confidence values are qualitative:
- `HIGH`: Supported by explicit closing keywords, exact code change matches, and passing regression test fixtures.
- `MEDIUM`: Supported by strong lexical/file overlap or maintainer comments without verified test verification.
- `LOW`: Weak heuristic correlation requiring manual developer confirmation.
- `NOT_ASSESSED`: Pending analysis or ambiguous evidence.

Arbitrary pseudo-precise percentages (e.g., "94.2% confidence") are prohibited unless backed by an empirical validation benchmark.

## 3. Repository Architecture Map & Code Churn Model

The Architecture Map engine evaluates directory topologies and files to identify architectural bottlenecks and high-churn risk areas.

### 3.1 Schemas

```typescript
export interface RepositoryMapNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;             // File size in bytes
  fileCount?: number;        // Directory recursive file count
  churnScore: number;        // Normalized volatility score (0–100)
  topMaintainer?: string;    // Primary git contributor
  children?: RepositoryMapNode[];
}

export interface RepositoryMapData {
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  analyzedAt: string;
  root: RepositoryMapNode;
  summary: {
    totalFiles: number;
    totalDirectories: number;
    hotspotCount: number;    // Files with churnScore >= 65
    topSubsystems: Array<{
      name: string;
      fileCount: number;
      churnScore: number;
    }>;
  };
}
```

### 3.2 Code Churn & Hotspot Scoring Methodology

- **Code Churn**: The temporal volatility of a code unit, measuring the frequency and volume of modifications, rewrites, and PR touches across recent development cycles.
- **Churn Hotspot**: A file or module exhibiting disproportionate churn velocity compared to the repository baseline. Research establishes that files in the top 10% of churn cause over 60% of regression defects and merge conflicts.
- **Scoring Formulation (0–100 Normalized)**:
  $$\text{Score} = \text{Norm}\left(0.40 \cdot C_{\text{commits}} + 0.35 \cdot \Delta_{\text{lines}} + 0.25 \cdot T_{\text{PRs}}\right)$$
  - **40% Commit Frequency**: Number of distinct git commits touching the file.
  - **35% Line Turnover**: Cumulative additions and deletions (churn volume).
  - **25% PR Touch Velocity**: Number of distinct pull request reviews and merges.

### 3.3 Volatility Risk Tiers

| Tier | Score Range | Classification | Engineering Guidance |
|---|---|---|---|
| 🔴 **Hotspot** | 65 – 100 | Critical Volatility / High Risk | Primary technical debt hazard; candidate for modular refactoring, interface stabilization, and high regression test coverage. |
| 🟡 **Moderate** | 40 – 64 | Active Feature Evolution | Steady iteration area; requires watchful code reviews and architectural boundary preservation. |
| 🟢 **Stable** | 0 – 39 | Foundational Core / Low Volatility | Battle-tested modules, foundational types, or dormant configurations with low regression hazard. |

