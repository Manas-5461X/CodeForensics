import type {
  ContributorRecommendation,
  ContributorSignal,
  ContributorExperienceTier,
  RecencySignal,
  MaintenanceRisk,
  ContributionAnalysisResult,
  RelevantWorkItem,
  TargetItemSummary,
  RelationshipInfo,
} from '@codeforensics/shared';
import type { RawIssueRecord, RawPullRequestRecord } from './relationshipEngine.js';
import type { RepositorySyncStateRecord } from '../db/repositoryStore.js';

export interface ContributorEngineOptions {
  itemNumber?: number;
  subsystem?: string;
  limit?: number;
  now?: Date;
}

interface ContributorStats {
  login: string;
  directFixPRs: RawPullRequestRecord[];
  directAddressPRs: RawPullRequestRecord[];
  subsystemMergedPRs: RawPullRequestRecord[];
  subsystemOpenPRs: RawPullRequestRecord[];
  subsystemIssues: RawIssueRecord[];
  otherMergedPRs: RawPullRequestRecord[];
  otherIssues: RawIssueRecord[];
  isTargetIssueAuthor: boolean;
  latestActivityAt: Date;
  allRelevantItems: RelevantWorkItem[];
}

/**
 * Deterministic, Explainable Contributor Discovery and Maintenance Risk Engine
 */
export class ContributionEngine {
  /**
   * Identifies candidate subsystem from labels, title, or body
   */
  public static extractSubsystem(item: {
    title: string;
    body?: string | null;
    labels?: unknown;
  }): string | null {
    // 1. Check labels
    if (Array.isArray(item.labels)) {
      for (const label of item.labels) {
        const name = (
          typeof label === 'string' ? label : (label as { name?: string })?.name || ''
        ).toLowerCase();

        if (name.startsWith('component:') || name.startsWith('package:') || name.startsWith('area:')) {
          const parts = name.split(':');
          if (parts[1]?.trim()) {
            return normalizeSubsystem(parts[1].trim());
          }
        }
        if (['devtools', 'compiler', 'reconciler', 'react-dom', 'suspense', 'scheduler', 'hooks', 'cli'].includes(name)) {
          return normalizeSubsystem(name);
        }
      }
    }

    // 2. Check title prefixes
    const title = item.title;
    const bracketMatch = title.match(/^\[([a-zA-Z0-9_-]+)\]/);
    if (bracketMatch && bracketMatch[1]) {
      return normalizeSubsystem(bracketMatch[1]);
    }

    const colonMatch = title.match(/^(?:fix|feat|chore|refactor)?\(?([a-zA-Z0-9_-]+)\)?:\s+/i);
    if (colonMatch && colonMatch[1]) {
      const tag = colonMatch[1].toLowerCase();
      if (!['fix', 'feat', 'chore', 'docs', 'test', 'ci', 'refactor'].includes(tag)) {
        return normalizeSubsystem(tag);
      }
    }

    // 3. Check body path references
    if (item.body) {
      const pathMatch = item.body.match(/packages\/([a-zA-Z0-9_-]+)/i);
      if (pathMatch && pathMatch[1]) {
        return normalizeSubsystem(pathMatch[1]);
      }
    }

    return null;
  }

  /**
   * Main contributor ranking and maintenance risk assessment
   */
  public static rankContributors(
    repositoryId: string,
    options: ContributorEngineOptions,
    issues: RawIssueRecord[],
    pullRequests: RawPullRequestRecord[],
    relationships: RelationshipInfo[],
    syncState: RepositorySyncStateRecord | null
  ): ContributionAnalysisResult {
    const { itemNumber, subsystem: requestedSubsystem, limit = 10, now = new Date() } = options;

    // 1. Resolve Target Item and Target Subsystem
    let targetItemSummary: TargetItemSummary | null = null;
    let targetSubsystem: string | null = requestedSubsystem ? normalizeSubsystem(requestedSubsystem) : null;

    if (itemNumber !== undefined) {
      const issue = issues.find((i) => i.number === itemNumber);
      if (issue) {
        const detectedSubsystem = this.extractSubsystem(issue);
        if (!targetSubsystem && detectedSubsystem) {
          targetSubsystem = detectedSubsystem;
        }
        const labelsList = Array.isArray((issue as any).labels)
          ? (issue as any).labels.map((l: any) => (typeof l === 'string' ? l : l.name || String(l)))
          : [];

        targetItemSummary = {
          number: issue.number,
          type: 'issue',
          title: issue.title,
          subsystem: targetSubsystem || undefined,
          labels: labelsList,
        };
      } else {
        const pr = pullRequests.find((p) => p.number === itemNumber);
        if (pr) {
          const detectedSubsystem = this.extractSubsystem(pr);
          if (!targetSubsystem && detectedSubsystem) {
            targetSubsystem = detectedSubsystem;
          }
          targetItemSummary = {
            number: pr.number,
            type: 'pull_request',
            title: pr.title,
            subsystem: targetSubsystem || undefined,
            labels: [],
          };
        }
      }
    }

    // 2. Identify Direct Relationships to Target Item
    const directFixPrNumbers = new Set<number>();
    const directAddressPrNumbers = new Set<number>();

    if (itemNumber !== undefined) {
      for (const rel of relationships) {
        if (rel.targetNumber === itemNumber && rel.sourceNumber) {
          if (rel.relationshipType === 'FIXED_BY') {
            directFixPrNumbers.add(rel.sourceNumber);
          } else if (rel.relationshipType === 'ADDRESSES') {
            directAddressPrNumbers.add(rel.sourceNumber);
          }
        }
        if (rel.sourceNumber === itemNumber && rel.targetNumber) {
          if (rel.relationshipType === 'FIXED_BY') {
            directFixPrNumbers.add(rel.targetNumber);
          } else if (rel.relationshipType === 'ADDRESSES') {
            directAddressPrNumbers.add(rel.targetNumber);
          }
        }
      }
    }

    // 3. Aggregate Contributor Stats
    const statsMap = new Map<string, ContributorStats>();

    const getOrCreateStats = (login: string, initialDate: Date): ContributorStats => {
      let stats = statsMap.get(login);
      if (!stats) {
        stats = {
          login,
          directFixPRs: [],
          directAddressPRs: [],
          subsystemMergedPRs: [],
          subsystemOpenPRs: [],
          subsystemIssues: [],
          otherMergedPRs: [],
          otherIssues: [],
          isTargetIssueAuthor: false,
          latestActivityAt: initialDate,
          allRelevantItems: [],
        };
        statsMap.set(login, stats);
      }
      return stats;
    };

    // Process Pull Requests
    for (const pr of pullRequests) {
      const author = pr.author?.trim();
      if (!author || author.endsWith('[bot]') || author === 'dependabot') continue;

      const prDate = new Date(pr.mergedAt || pr.updatedAt || pr.createdAt);
      const stats = getOrCreateStats(author, prDate);
      if (prDate > stats.latestActivityAt) {
        stats.latestActivityAt = prDate;
      }

      const prSubsystem = this.extractSubsystem(pr);
      const isSubsystemMatch = Boolean(
        targetSubsystem && prSubsystem && prSubsystem === targetSubsystem
      );

      const isMerged = Boolean(pr.merged || pr.mergedAt !== null || pr.state.toLowerCase() === 'merged');
      const prState: 'open' | 'closed' | 'merged' = isMerged
        ? 'merged'
        : pr.state.toLowerCase() === 'open'
        ? 'open'
        : 'closed';

      const workItem: RelevantWorkItem = {
        number: pr.number,
        type: 'pull_request',
        title: pr.title,
        state: prState,
        merged: isMerged,
        closedAt: isMerged ? (pr.mergedAt ? new Date(pr.mergedAt).toISOString() : null) : null,
        updatedAt: new Date(pr.updatedAt).toISOString(),
        subsystem: prSubsystem || undefined,
      };

      if (directFixPrNumbers.has(pr.number)) {
        stats.directFixPRs.push(pr);
        stats.allRelevantItems.push(workItem);
        if (isSubsystemMatch && isMerged) {
          stats.subsystemMergedPRs.push(pr);
        }
      } else if (directAddressPrNumbers.has(pr.number)) {
        stats.directAddressPRs.push(pr);
        stats.allRelevantItems.push(workItem);
        if (isSubsystemMatch && isMerged) {
          stats.subsystemMergedPRs.push(pr);
        }
      } else if (isSubsystemMatch) {
        if (isMerged) {
          stats.subsystemMergedPRs.push(pr);
        } else {
          stats.subsystemOpenPRs.push(pr);
        }
        stats.allRelevantItems.push(workItem);
      } else {
        if (isMerged) {
          stats.otherMergedPRs.push(pr);
        }
      }
    }

    // Process Issues
    for (const issue of issues) {
      const author = issue.author?.trim();
      if (!author || author.endsWith('[bot]') || author === 'dependabot') continue;

      const issueDate = new Date(issue.updatedAt || issue.createdAt);
      const stats = getOrCreateStats(author, issueDate);
      if (issueDate > stats.latestActivityAt) {
        stats.latestActivityAt = issueDate;
      }

      if (itemNumber !== undefined && issue.number === itemNumber) {
        stats.isTargetIssueAuthor = true;
      }

      const issueSubsystem = this.extractSubsystem(issue);
      const isSubsystemMatch = Boolean(
        targetSubsystem && issueSubsystem && issueSubsystem === targetSubsystem
      );

      if (isSubsystemMatch) {
        stats.subsystemIssues.push(issue);
        stats.allRelevantItems.push({
          number: issue.number,
          type: 'issue',
          title: issue.title,
          state: issue.state.toLowerCase() === 'open' ? 'open' : 'closed',
          closedAt: issue.closedAt ? new Date(issue.closedAt).toISOString() : null,
          updatedAt: new Date(issue.updatedAt).toISOString(),
          subsystem: issueSubsystem || undefined,
        });
      } else {
        stats.otherIssues.push(issue);
      }
    }

    // 4. Score Each Contributor with Normalized, Explainable Signals
    const recommendations: ContributorRecommendation[] = [];

    for (const stats of statsMap.values()) {
      const signals: ContributorSignal[] = [];
      let rawScore = 0;

      // Signal A: Direct Fix Pull Request (+35)
      if (stats.directFixPRs.length > 0) {
        const count = stats.directFixPRs.length;
        const weight = 35;
        rawScore += weight;
        signals.push({
          type: 'DIRECT_FIX',
          label: 'Direct Fix Pull Request',
          description: `Authored pull request #${stats.directFixPRs[0].number} with verified closing directives targeting this issue.`,
          weight,
          count,
          lastActiveAt: new Date(stats.directFixPRs[0].mergedAt || stats.directFixPRs[0].updatedAt).toISOString(),
          referenceNumbers: stats.directFixPRs.map((p) => p.number),
        });
      }

      // Signal B: Direct Addresses Pull Request (+20)
      if (stats.directAddressPRs.length > 0 && stats.directFixPRs.length === 0) {
        const count = stats.directAddressPRs.length;
        const weight = 20;
        rawScore += weight;
        signals.push({
          type: 'DIRECT_ADDRESS',
          label: 'Direct Addressing Work Item',
          description: `Authored pull request #${stats.directAddressPRs[0].number} explicitly referencing this issue.`,
          weight,
          count,
          lastActiveAt: new Date(stats.directAddressPRs[0].updatedAt).toISOString(),
          referenceNumbers: stats.directAddressPRs.map((p) => p.number),
        });
      }

      // Signal C: Subsystem Merged Pull Requests (Log-dampened, max 30)
      const mergedCount = stats.subsystemMergedPRs.length;
      if (mergedCount > 0) {
        // Log-dampened frequency so volume does not dominate
        const weight = Math.min(30, Math.round(30 * (Math.log2(1 + mergedCount) / Math.log2(1 + 5))));
        rawScore += weight;
        signals.push({
          type: 'SUBSYSTEM_PR',
          label: 'Subsystem Pull Requests',
          description: `Authored ${mergedCount} merged pull request${mergedCount > 1 ? 's' : ''} in the '${targetSubsystem}' subsystem.`,
          weight,
          count: mergedCount,
          referenceNumbers: stats.subsystemMergedPRs.slice(0, 5).map((p) => p.number),
        });
      }

      // Signal D: Subsystem Issues Authored (+5 per issue, max 10)
      if (stats.subsystemIssues.length > 0) {
        const issueCount = stats.subsystemIssues.length;
        const weight = Math.min(10, issueCount * 5);
        rawScore += weight;
        signals.push({
          type: 'SUBSYSTEM_ISSUE',
          label: 'Subsystem Issue Context',
          description: `Documented or authored ${issueCount} issue${issueCount > 1 ? 's' : ''} in the '${targetSubsystem}' subsystem.`,
          weight,
          count: issueCount,
          referenceNumbers: stats.subsystemIssues.slice(0, 5).map((i) => i.number),
        });
      }

      // Signal E: Recency Evaluation
      const daysAgo = Math.max(
        0,
        Math.floor((now.getTime() - stats.latestActivityAt.getTime()) / (1000 * 60 * 60 * 24))
      );

      let recencySignal: RecencySignal = 'DORMANT';
      if (daysAgo <= 90) {
        recencySignal = 'RECENT';
        const weight = 20;
        rawScore += weight;
        signals.push({
          type: 'RECENCY_BOOST',
          label: 'Recent Activity',
          description: `Active within the last ${daysAgo} days (${stats.latestActivityAt.toISOString().split('T')[0]}).`,
          weight,
          count: 1,
          lastActiveAt: stats.latestActivityAt.toISOString(),
        });
      } else if (daysAgo <= 180) {
        recencySignal = 'STALE';
        const weight = 8;
        rawScore += weight;
        signals.push({
          type: 'RECENCY_BOOST',
          label: 'Moderate Recency',
          description: `Last active ${daysAgo} days ago (${stats.latestActivityAt.toISOString().split('T')[0]}).`,
          weight,
          count: 1,
          lastActiveAt: stats.latestActivityAt.toISOString(),
        });
      } else {
        recencySignal = 'DORMANT';
        signals.push({
          type: 'HISTORICAL_EXPERIENCE',
          label: 'Historical Activity',
          description: `Historical contributor with activity older than 180 days (${stats.latestActivityAt.toISOString().split('T')[0]}).`,
          weight: 0,
          count: 1,
          lastActiveAt: stats.latestActivityAt.toISOString(),
        });
      }

      // General Repository Activity (up to 5 points)
      if (stats.otherMergedPRs.length > 0 && signals.length <= 2) {
        const generalWeight = Math.min(5, stats.otherMergedPRs.length * 2);
        rawScore += generalWeight;
      }

      // Normalize score between 1 and 100
      const normalizedScore = Math.min(100, Math.max(0, rawScore));

      // Classify Experience Tier
      let experienceTier: ContributorExperienceTier = 'INCIDENTAL';
      if (normalizedScore >= 65 && mergedCount >= 2 && daysAgo <= 180) {
        experienceTier = 'PRIMARY_MAINTAINER';
      } else if (daysAgo <= 90 && (mergedCount >= 1 || stats.directFixPRs.length > 0)) {
        experienceTier = 'ACTIVE_CONTRIBUTOR';
      } else if (mergedCount >= 1 && daysAgo > 180) {
        experienceTier = 'HISTORICAL_CONTRIBUTOR';
      } else {
        experienceTier = 'INCIDENTAL';
      }

      // Deduplicate relevant work items by number
      const seenItemNumbers = new Set<number>();
      const dedupedItems: RelevantWorkItem[] = [];
      for (const item of stats.allRelevantItems) {
        if (!seenItemNumbers.has(item.number)) {
          seenItemNumbers.add(item.number);
          dedupedItems.push(item);
        }
      }

      // Limitations
      const limitations: string[] = [
        'Reviewer activity (approvals and comments) was not ingested in metadata tier sync.',
        'Scores reflect authored pull requests and relationship records, not verified code blame or line-level edits.',
      ];
      if (recencySignal === 'DORMANT') {
        limitations.push('Contributor has no recorded activity in the last 180 days; current availability is unconfirmed.');
      }

      // Only include candidate if they have at least 1 signal or normalizedScore > 0
      if (normalizedScore > 0) {
        recommendations.push({
          login: stats.login,
          avatarUrl: `https://github.com/${stats.login}.png?size=64`,
          rank: 0, // Will be set after sorting
          normalizedScore,
          experienceTier,
          recencySignal,
          lastActiveAt: stats.latestActivityAt.toISOString(),
          signals,
          relevantWorkItems: dedupedItems.slice(0, 10),
          limitations,
        });
      }
    }

    // 5. Deterministic Tie-Breaking
    recommendations.sort((a, b) => {
      // 1. Normalized Score DESC
      if (b.normalizedScore !== a.normalizedScore) {
        return b.normalizedScore - a.normalizedScore;
      }
      // 2. Latest Activity Date DESC
      const bDate = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
      const aDate = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
      if (bDate !== aDate) {
        return bDate - aDate;
      }
      // 3. Direct fix presence DESC
      const bDirectFix = b.signals.some((s) => s.type === 'DIRECT_FIX') ? 1 : 0;
      const aDirectFix = a.signals.some((s) => s.type === 'DIRECT_FIX') ? 1 : 0;
      if (bDirectFix !== aDirectFix) {
        return bDirectFix - aDirectFix;
      }
      // 4. Login ASC (alphabetical tie-breaker)
      return a.login.localeCompare(b.login);
    });

    // Assign final rank
    recommendations.forEach((rec, idx) => {
      rec.rank = idx + 1;
    });

    const topRecommendations = recommendations.slice(0, limit);

    // 6. Detect Ownership & Maintenance Risks
    const maintenanceRisks: MaintenanceRisk[] = [];

    // Group all merged PRs by detected subsystem
    const subsystemMergedMap = new Map<string, { totalPRs: number; authors: Map<string, number>; latestPrDate: Date }>();

    for (const pr of pullRequests) {
      const isMerged = Boolean(pr.merged || pr.mergedAt !== null || pr.state.toLowerCase() === 'merged');
      if (!isMerged) continue;

      const sub = this.extractSubsystem(pr);
      if (!sub) continue;

      let subData = subsystemMergedMap.get(sub);
      if (!subData) {
        subData = { totalPRs: 0, authors: new Map(), latestPrDate: new Date(0) };
        subsystemMergedMap.set(sub, subData);
      }

      subData.totalPRs++;
      const prDate = new Date(pr.mergedAt || pr.updatedAt || pr.createdAt);
      if (prDate > subData.latestPrDate) {
        subData.latestPrDate = prDate;
      }

      const author = pr.author?.trim();
      if (author && !author.endsWith('[bot]')) {
        subData.authors.set(author, (subData.authors.get(author) || 0) + 1);
      }
    }

    // Evaluate each subsystem for risks
    for (const [subsystemName, data] of subsystemMergedMap.entries()) {
      // Risk A: Concentrated Ownership (Bus Factor)
      if (data.totalPRs >= 2) {
        let maxAuthor = '';
        let maxCount = 0;
        for (const [author, count] of data.authors.entries()) {
          if (count > maxCount) {
            maxCount = count;
            maxAuthor = author;
          }
        }

        const concentrationRatio = maxCount / data.totalPRs;
        if (concentrationRatio >= 0.6) {
          const isHigh = concentrationRatio >= 0.75;
          maintenanceRisks.push({
            riskType: 'CONCENTRATED_OWNERSHIP',
            severity: isHigh ? 'HIGH' : 'MEDIUM',
            subsystem: subsystemName,
            title: `Concentrated Subsystem Ownership in '${subsystemName}'`,
            description: `Contributor @${maxAuthor} authored ${Math.round(concentrationRatio * 100)}% of merged pull requests in '${subsystemName}' (${maxCount} of ${data.totalPRs} PRs).`,
            dominantContributor: maxAuthor,
            concentrationRatio: Math.round(concentrationRatio * 100) / 100,
            lastActivityAt: data.latestPrDate.toISOString(),
            recommendationHint: 'High concentration risk. Involve additional reviewers and pair on upcoming changes to distribute architectural knowledge.',
          });
        }
      }

      // Risk B: Stale Subsystem Maintenance
      const daysSinceLatest = Math.max(
        0,
        Math.floor((now.getTime() - data.latestPrDate.getTime()) / (1000 * 60 * 60 * 24))
      );
      if (daysSinceLatest > 180) {
        const isHigh = daysSinceLatest > 365;
        maintenanceRisks.push({
          riskType: 'STALE_MAINTENANCE',
          severity: isHigh ? 'HIGH' : 'MEDIUM',
          subsystem: subsystemName,
          title: `Stale Subsystem Maintenance in '${subsystemName}'`,
          description: `No merged pull requests detected in the '${subsystemName}' subsystem for ${daysSinceLatest} days.`,
          lastActivityAt: data.latestPrDate.toISOString(),
          daysInactive: daysSinceLatest,
          recommendationHint: 'Verify that this subsystem is still active and has responsive reviewers before scheduling major changes.',
        });
      }
    }

    // Risk C: Incomplete Synchronization History
    if (syncState?.status === 'PARTIAL' || syncState?.status === 'FAILED') {
      maintenanceRisks.push({
        riskType: 'INCOMPLETE_HISTORY',
        severity: 'MEDIUM',
        subsystem: targetSubsystem || 'all',
        title: 'Incomplete Synchronization Coverage',
        description: 'Repository synchronization was partial. Ownership analysis and contributor rankings may omit un-ingested commits, pull requests, and discussions.',
        recommendationHint: 'Trigger a full repository synchronization to import complete historical activity.',
      });
    }

    // 7. General Coverage Notes
    const coverageNotes: string[] = [
      'Rankings are derived deterministically from persisted pull request and issue metadata.',
      'Raw commit count is normalized using logarithmic frequency to prevent high-volume contributors from overshadowing subsystem specialists.',
      'Reviewer approvals, code review comments, and line-level Git blame were not ingested in initial metadata synchronization.',
      'Relevance scores reflect historical evidence, not verified contributor availability.',
    ];

    return {
      targetItem: targetItemSummary,
      subsystem: targetSubsystem,
      totalContributorsAnalyzed: statsMap.size,
      recommendations: topRecommendations,
      maintenanceRisks,
      coverageNotes,
    };
  }
}

function normalizeSubsystem(raw: string): string {
  const clean = raw.toLowerCase().trim().replace(/^(?:react-|packages\/)/, '');
  if (clean.includes('devtools') || clean.includes('developer tools')) return 'devtools';
  if (clean.includes('reconciler')) return 'reconciler';
  if (clean.includes('compiler')) return 'compiler';
  if (clean.includes('dom') || clean.includes('react-dom')) return 'react-dom';
  if (clean.includes('suspense')) return 'suspense';
  if (clean.includes('native')) return 'react-native';
  if (clean.includes('scheduler')) return 'scheduler';
  if (clean.includes('hook')) return 'hooks';
  return clean.replace(/[^a-zA-Z0-9_-]/g, '-');
}
