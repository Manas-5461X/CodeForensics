import type {
  RelationshipInfo,
  RelationshipType,
  ClaimCategory,
  AssessmentConfidence,
  EntityType,
  EvidenceReference,
  RelationshipEvidence,
  ResolutionAssessment,
  ResolutionStatus,
  HistoricalPrecedent,
  PrecedentMatchReason,
} from '@codeforensics/shared';

export interface RawIssueRecord {
  id: string;
  number: number;
  title: string;
  body: string | null;
  state: string;
  author?: string | null;
  labels?: unknown;
  closedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface RawPullRequestRecord {
  id: string;
  number: number;
  title: string;
  body: string | null;
  state: string;
  isDraft: boolean;
  merged: boolean;
  mergedAt: Date | string | null;
  author?: string | null;
  baseRef: string | null;
  headRef: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Regex patterns for deterministic evidence extraction
const CLOSING_REGEX =
  /\b(close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+(?:https?:\/\/github\.com\/[^/\s]+\/[^/\s]+\/(?:issues|pull)\/|#|GH-)([0-9]+)\b/gi;

const SUPERSEDES_REGEX =
  /\b(supersedes|superseded\s+by|replaces|replaced\s+by|obsoletes|continuation\s+of|take\s+over|takes\s+over)\s+(?:https?:\/\/github\.com\/[^/\s]+\/[^/\s]+\/(?:issues|pull)\/|#|GH-)([0-9]+)\b/gi;

const ADDRESSES_REGEX =
  /\b(addresses|addressing|re|ref|refs|see|related\s+to|towards)\s+(?:https?:\/\/github\.com\/[^/\s]+\/[^/\s]+\/(?:issues|pull)\/|#|GH-)([0-9]+)\b/gi;

const BARE_NUM_REGEX =
  /(?:^|[\s(])(?:#|GH-)([0-9]+)\b/gi;

/**
 * Deterministic Relationship Intelligence Engine
 */
export class RelationshipEngine {
  /**
   * Evaluates issues and pull requests in a repository to extract deterministic relationships
   */
  public static detectRelationships(
    repositoryId: string,
    issues: RawIssueRecord[],
    pullRequests: RawPullRequestRecord[]
  ): RelationshipInfo[] {
    const issueMap = new Map<number, RawIssueRecord>();
    for (const issue of issues) {
      issueMap.set(issue.number, issue);
    }

    const prMap = new Map<number, RawPullRequestRecord>();
    for (const pr of pullRequests) {
      prMap.set(pr.number, pr);
    }

    const relationshipsMap = new Map<string, RelationshipInfo>();

    const addOrUpgradeRelationship = (rel: RelationshipInfo) => {
      const key = `${rel.sourceId}:${rel.targetId}:${rel.relationshipType}`;
      const existing = relationshipsMap.get(key);
      if (!existing) {
        relationshipsMap.set(key, rel);
        return;
      }

      // Upgrade confidence if new relationship has higher confidence
      const confidenceRank: Record<AssessmentConfidence, number> = {
        HIGH: 3,
        MEDIUM: 2,
        LOW: 1,
        NOT_ASSESSED: 0,
      };

      if (confidenceRank[rel.confidence] > confidenceRank[existing.confidence]) {
        relationshipsMap.set(key, rel);
      }
    };

    // 1. Process Pull Requests -> Issues / other PRs
    for (const pr of pullRequests) {
      const text = `${pr.title}\n${pr.body || ''}`;
      const isPRMerged = Boolean(
        pr.merged || pr.mergedAt !== null || pr.state.toLowerCase() === 'merged'
      );
      const isPROpen = pr.state.toLowerCase() === 'open';

      const seenTargets = new Set<number>();

      // 1A. Closing directives (e.g. "fixes #123", "closes #123")
      let match: RegExpExecArray | null;
      CLOSING_REGEX.lastIndex = 0;
      while ((match = CLOSING_REGEX.exec(text)) !== null) {
        const keyword = match[1].toLowerCase();
        const targetNumber = parseInt(match[2], 10);
        seenTargets.add(targetNumber);

        const targetIssue = issueMap.get(targetNumber);
        if (targetIssue) {
          const confidence: AssessmentConfidence = isPRMerged ? 'HIGH' : 'MEDIUM';
          const ruleId = isPRMerged ? 'RULE_MERGED_CLOSING_DIRECTIVE' : 'RULE_UNMERGED_CLOSING_DIRECTIVE';
          const confidenceRationale = isPRMerged
            ? `Assigned HIGH confidence because pull request #${pr.number} was merged into the default branch with explicit closing keyword "${keyword}".`
            : `Assigned MEDIUM confidence because pull request #${pr.number} declared intent to close issue #${targetNumber} via "${keyword}", but the PR is ${pr.state.toLowerCase()} (unmerged).`;

          const ref: EvidenceReference = {
            type: 'CLOSING_KEYWORD',
            keyword,
            matchedText: match[0],
            sourceText: text.substring(
              Math.max(0, match.index - 30),
              Math.min(text.length, match.index + match[0].length + 30)
            ),
            location: 'BODY',
          };

          const evidence: RelationshipEvidence = {
            summary: `PR #${pr.number} declares "${match[0]}" targeting issue #${targetNumber}.`,
            ruleId,
            ruleDescription: 'Matches explicit GitHub closing keywords (fixes, closes, resolves).',
            references: [ref],
            confidenceRationale,
            limitations: [
              'CodeForensics does not assume merged code resolved the defect without verified test execution.',
            ],
          };

          // PR -> Issue (ADDRESSES)
          addOrUpgradeRelationship({
            id: `rel-${repositoryId}-pr${pr.number}-issue${targetNumber}-addresses`,
            repositoryId,
            sourceId: pr.id,
            sourceType: 'PULL_REQUEST',
            sourceNumber: pr.number,
            sourceTitle: pr.title,
            targetId: targetIssue.id,
            targetType: 'ISSUE',
            targetNumber: targetIssue.number,
            targetTitle: targetIssue.title,
            relationshipType: 'ADDRESSES',
            category: 'INFERENCE',
            confidence,
            method: 'DETERMINISTIC_CLOSING_KEYWORD',
            evidenceSummary: evidence.summary,
            evidenceDetails: evidence,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          // If PR is merged, create inverse Issue -> PR (FIXED_BY)
          if (isPRMerged) {
            addOrUpgradeRelationship({
              id: `rel-${repositoryId}-issue${targetNumber}-pr${pr.number}-fixed_by`,
              repositoryId,
              sourceId: targetIssue.id,
              sourceType: 'ISSUE',
              sourceNumber: targetIssue.number,
              sourceTitle: targetIssue.title,
              targetId: pr.id,
              targetType: 'PULL_REQUEST',
              targetNumber: pr.number,
              targetTitle: pr.title,
              relationshipType: 'FIXED_BY',
              category: 'INFERENCE',
              confidence: 'HIGH',
              method: 'DETERMINISTIC_MERGED_CLOSING_KEYWORD',
              evidenceSummary: `Issue #${targetNumber} is claimed fixed by merged PR #${pr.number} ("${match[0]}").`,
              evidenceDetails: {
                ...evidence,
                summary: `Issue #${targetNumber} targeted by merged PR #${pr.number} via "${match[0]}".`,
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      // 1B. Superseding directives (e.g. "supersedes #120", "replaces #120")
      SUPERSEDES_REGEX.lastIndex = 0;
      while ((match = SUPERSEDES_REGEX.exec(text)) !== null) {
        const keyword = match[1].toLowerCase();
        const targetNumber = parseInt(match[2], 10);
        seenTargets.add(targetNumber);

        const targetPR = prMap.get(targetNumber);
        if (targetPR && targetPR.number !== pr.number) {
          const ref: EvidenceReference = {
            type: 'SUPERSEDES_KEYWORD',
            keyword,
            matchedText: match[0],
            sourceText: text.substring(
              Math.max(0, match.index - 30),
              Math.min(text.length, match.index + match[0].length + 30)
            ),
            location: 'BODY',
          };

          const evidence: RelationshipEvidence = {
            summary: `PR #${pr.number} explicitly supersedes earlier PR #${targetNumber} ("${match[0]}").`,
            ruleId: 'RULE_EXPLICIT_SUPERSEDES',
            ruleDescription: 'Matches explicit superseding directives (supersedes, replaces, obsoletes).',
            references: [ref],
            confidenceRationale: `Assigned HIGH confidence because author explicitly documented replacement of pull request #${targetNumber}.`,
            limitations: [
              'Supersession reflects author intent; branch conflict or partial cherry-picks are not automatically ruled out.',
            ],
          };

          addOrUpgradeRelationship({
            id: `rel-${repositoryId}-pr${pr.number}-pr${targetNumber}-supersedes`,
            repositoryId,
            sourceId: pr.id,
            sourceType: 'PULL_REQUEST',
            sourceNumber: pr.number,
            sourceTitle: pr.title,
            targetId: targetPR.id,
            targetType: 'PULL_REQUEST',
            targetNumber: targetPR.number,
            targetTitle: targetPR.title,
            relationshipType: 'SUPERSEDES',
            category: 'INFERENCE',
            confidence: 'HIGH',
            method: 'DETERMINISTIC_SUPERSEDES_KEYWORD',
            evidenceSummary: evidence.summary,
            evidenceDetails: evidence,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // 1C. Explicit contextual references (e.g. "addresses #123", "re #123", "related to #123")
      ADDRESSES_REGEX.lastIndex = 0;
      while ((match = ADDRESSES_REGEX.exec(text)) !== null) {
        const keyword = match[1].toLowerCase();
        const targetNumber = parseInt(match[2], 10);
        if (seenTargets.has(targetNumber)) continue;
        seenTargets.add(targetNumber);

        const targetIssue = issueMap.get(targetNumber);
        if (targetIssue) {
          const ref: EvidenceReference = {
            type: 'ISSUE_REFERENCE',
            keyword,
            matchedText: match[0],
            sourceText: text.substring(
              Math.max(0, match.index - 30),
              Math.min(text.length, match.index + match[0].length + 30)
            ),
            location: 'BODY',
          };

          const evidence: RelationshipEvidence = {
            summary: `PR #${pr.number} cites issue #${targetNumber} with contextual keyword "${keyword}".`,
            ruleId: 'RULE_CONTEXTUAL_REFERENCE',
            ruleDescription: 'Matches contextual issue citations (addresses, re, related to, towards).',
            references: [ref],
            confidenceRationale:
              'Assigned MEDIUM confidence because reference documents work context but does not use closing syntax.',
            limitations: ['Does not assert that the referenced issue was completely solved.'],
          };

          addOrUpgradeRelationship({
            id: `rel-${repositoryId}-pr${pr.number}-issue${targetNumber}-addresses`,
            repositoryId,
            sourceId: pr.id,
            sourceType: 'PULL_REQUEST',
            sourceNumber: pr.number,
            sourceTitle: pr.title,
            targetId: targetIssue.id,
            targetType: 'ISSUE',
            targetNumber: targetIssue.number,
            targetTitle: targetIssue.title,
            relationshipType: 'ADDRESSES',
            category: 'INFERENCE',
            confidence: 'MEDIUM',
            method: 'DETERMINISTIC_CONTEXTUAL_REFERENCE',
            evidenceSummary: evidence.summary,
            evidenceDetails: evidence,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // 1D. Bare numeric mentions (e.g. "#101")
      BARE_NUM_REGEX.lastIndex = 0;
      while ((match = BARE_NUM_REGEX.exec(text)) !== null) {
        const targetNumber = parseInt(match[1], 10);
        if (seenTargets.has(targetNumber)) continue;
        seenTargets.add(targetNumber);

        const targetIssue = issueMap.get(targetNumber);
        if (targetIssue) {
          const ref: EvidenceReference = {
            type: 'BARE_REFERENCE',
            matchedText: match[0].trim(),
            sourceText: text.substring(
              Math.max(0, match.index - 30),
              Math.min(text.length, match.index + match[0].length + 30)
            ),
            location: 'BODY',
          };

          const evidence: RelationshipEvidence = {
            summary: `PR #${pr.number} mentions issue #${targetNumber} without explicit action verb.`,
            ruleId: 'RULE_BARE_REFERENCE',
            ruleDescription: 'Matches bare issue number citations.',
            references: [ref],
            confidenceRationale:
              'Assigned LOW confidence because bare issue mention indicates potential relevance without explicit relationship semantics.',
            limitations: ['Weakest explicit signal; requires manual developer confirmation.'],
          };

          addOrUpgradeRelationship({
            id: `rel-${repositoryId}-pr${pr.number}-issue${targetNumber}-addresses`,
            repositoryId,
            sourceId: pr.id,
            sourceType: 'PULL_REQUEST',
            sourceNumber: pr.number,
            sourceTitle: pr.title,
            targetId: targetIssue.id,
            targetType: 'ISSUE',
            targetNumber: targetIssue.number,
            targetTitle: targetIssue.title,
            relationshipType: 'ADDRESSES',
            category: 'INFERENCE',
            confidence: 'LOW',
            method: 'DETERMINISTIC_BARE_REFERENCE',
            evidenceSummary: evidence.summary,
            evidenceDetails: evidence,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    return Array.from(relationshipsMap.values());
  }

  /**
   * Evaluates resolution status and confidence for an issue based on evidence and relationships
   */
  public static assessIssueResolution(
    issue: RawIssueRecord,
    relationships: RelationshipInfo[],
    syncState?: { status: string } | null
  ): ResolutionAssessment {
    const isClosed = issue.state.toLowerCase() === 'closed';

    // Filter relationships involving this issue
    const issueRelationships = relationships.filter(
      (r) =>
        (r.sourceType === 'ISSUE' && r.sourceId === issue.id) ||
        (r.targetType === 'ISSUE' && r.targetId === issue.id)
    );

    const limitations: string[] = [];
    if (!syncState || syncState.status !== 'COMPLETED') {
      limitations.push('Repository sync data coverage is incomplete or unverified. Additional referencing pull requests may exist.');
    }

    // Check for high-confidence FIXED_BY relationship
    const fixedByRel = issueRelationships.find(
      (r) => r.relationshipType === 'FIXED_BY' && r.confidence === 'HIGH'
    );

    if (fixedByRel) {
      if (isClosed) {
        return {
          issueId: issue.id,
          status: 'RESOLVED',
          category: 'INFERENCE',
          confidence: 'HIGH',
          assessedAt: new Date().toISOString(),
          rationale: `Issue #${issue.number} is closed and was explicitly targeted by merged pull request #${fixedByRel.targetNumber || fixedByRel.sourceNumber}.`,
          evidenceSummary: fixedByRel.evidenceSummary,
          evidence: [
            {
              id: `ev-${issue.id}-merged-fix`,
              category: 'INFERENCE',
              sourceType: 'GITHUB_FACT',
              sourceUrl: issue.id,
              summary: fixedByRel.evidenceSummary,
              confidence: 'HIGH',
              provenance: fixedByRel.method,
              recordedAt: new Date().toISOString(),
            },
          ],
          coverageNotes: limitations,
          linkedRelationships: issueRelationships,
        };
      } else {
        return {
          issueId: issue.id,
          status: 'PARTIALLY_ADDRESSED',
          category: 'INFERENCE',
          confidence: 'MEDIUM',
          assessedAt: new Date().toISOString(),
          rationale: `Targeted by merged pull request #${fixedByRel.targetNumber || fixedByRel.sourceNumber}, but issue remains open in provider records.`,
          evidenceSummary: fixedByRel.evidenceSummary,
          evidence: [],
          coverageNotes: limitations,
          linkedRelationships: issueRelationships,
        };
      }
    }

    // Check for ADDRESSES relationship
    const addressingRel = issueRelationships.find((r) => r.relationshipType === 'ADDRESSES');
    if (addressingRel) {
      if (isClosed) {
        return {
          issueId: issue.id,
          status: 'PARTIALLY_ADDRESSED',
          category: 'INFERENCE',
          confidence: 'MEDIUM',
          assessedAt: new Date().toISOString(),
          rationale: `Issue #${issue.number} is closed on GitHub and was addressed by pull request #${addressingRel.sourceNumber}, but lacked an explicit closing directive.`,
          evidenceSummary: addressingRel.evidenceSummary,
          evidence: [],
          coverageNotes: limitations,
          linkedRelationships: issueRelationships,
        };
      } else {
        return {
          issueId: issue.id,
          status: 'UNRESOLVED',
          category: 'INFERENCE',
          confidence: addressingRel.confidence,
          assessedAt: new Date().toISOString(),
          rationale: `Issue #${issue.number} is open and currently targeted by in-flight pull request #${addressingRel.sourceNumber}.`,
          evidenceSummary: addressingRel.evidenceSummary,
          evidence: [],
          coverageNotes: limitations,
          linkedRelationships: issueRelationships,
        };
      }
    }

    // No relationships found
    if (isClosed) {
      return {
        issueId: issue.id,
        status: 'UNKNOWN',
        category: 'UNKNOWN',
        confidence: 'NOT_ASSESSED',
        assessedAt: new Date().toISOString(),
        rationale: `Issue #${issue.number} is closed on GitHub, but no referencing pull request or commit was found in synchronized repository data. It may have been closed as stale, duplicated, or resolved via external commit.`,
        evidenceSummary: 'Closed state observed without linked pull request in repository.',
        evidence: [],
        coverageNotes: [
          'No referencing pull requests or commits found in synchronized records.',
          ...limitations,
        ],
        linkedRelationships: [],
      };
    }

    return {
      issueId: issue.id,
      status: 'UNRESOLVED',
      category: 'FACT',
      confidence: 'HIGH',
      assessedAt: new Date().toISOString(),
      rationale: `Issue #${issue.number} is open on GitHub with zero linked pull requests addressing it.`,
      evidenceSummary: 'Open issue observed with no linking pull requests.',
      evidence: [],
      coverageNotes: limitations,
      linkedRelationships: [],
    };
  }

  /**
   * Discovers historical precedents and past similar changes:
   * Identifies prior pull requests or issues that modified the same files,
   * targeted the same subsystem scope tag, or matched recurring error signatures.
   */
  public static detectHistoricalPrecedents(
    currentItem: {
      number: number;
      title: string;
      body: string | null;
      type: 'issue' | 'pull_request';
      labels?: string[];
      changedFiles?: string[];
    },
    issues: RawIssueRecord[],
    pullRequests: RawPullRequestRecord[],
    directRelationshipTargetNumbers: number[] = []
  ): HistoricalPrecedent[] {
    const directSet = new Set<number>(directRelationshipTargetNumbers);
    directSet.add(currentItem.number);

    // 1. Extract subsystem scope from title or labels
    const scopeMatch = currentItem.title.match(/(?:fix|feat|chore|refactor|perf|test|docs|build|ci)\(([^)]+)\):/i)
      || currentItem.title.match(/^\[([^\]]+)\]/i);
    const extractedScope = scopeMatch ? scopeMatch[1].trim().toLowerCase() : null;

    // 2. Extract error signatures / failure keywords from title and body
    const textCorpus = `${currentItem.title} ${currentItem.body || ''}`;
    const errorPattern = /\b([A-Za-z]+Error|[A-Z_]{5,}|ECONNRESET|ETIMEDOUT|SIGTERM|deadlock|hydration|unauthorized|cors|memory\s*leak)\b/gi;
    const rawErrorTokens = Array.from(new Set(textCorpus.match(errorPattern) || [])).map((t) => t.trim());
    // Filter out common false positives
    const errorTokens = rawErrorTokens.filter(
      (t) => !['GITHUB', 'HTTP', 'HTTPS', 'README', 'PULL_REQUEST', 'ISSUE'].includes(t.toUpperCase())
    );

    // 3. Extract target file paths
    const filePathPattern = /\b(?:[\w.-]+\/)+[\w.-]+\.(?:ts|tsx|js|jsx|json|sql|py|go|rs|md)\b/gi;
    const bodyFiles = Array.from(new Set(textCorpus.match(filePathPattern) || []));
    const targetFiles = new Set<string>([
      ...(currentItem.changedFiles || []),
      ...bodyFiles,
    ]);

    const precedents: HistoricalPrecedent[] = [];
    const seenNumbers = new Set<number>();

    // Helper to evaluate a candidate
    const evaluateCandidate = (
      number: number,
      title: string,
      body: string | null,
      type: 'ISSUE' | 'PULL_REQUEST',
      state: 'open' | 'closed' | 'merged',
      author?: string | null,
      mergedAt?: Date | string | null,
      closedAt?: Date | string | null,
      createdAt?: Date | string,
      candidateLabels?: string[]
    ) => {
      if (directSet.has(number) || seenNumbers.has(number)) {
        return;
      }

      const candidateText = `${title} ${body || ''}`;
      const candidateFiles = Array.from(new Set(candidateText.match(filePathPattern) || []));

      // A. Check shared files
      const sharedFiles: string[] = [];
      for (const f of targetFiles) {
        if (candidateText.includes(f) || candidateFiles.includes(f)) {
          sharedFiles.push(f);
        }
      }

      if (sharedFiles.length > 0) {
        seenNumbers.add(number);
        precedents.push({
          id: `prec-file-${number}`,
          targetNumber: number,
          targetTitle: title,
          targetType: type,
          state,
          matchReason: 'SHARED_FILES',
          matchDetail: `Historical change touched ${sharedFiles.length} overlapping file(s): ${sharedFiles.slice(0, 3).join(', ')}${sharedFiles.length > 3 ? '...' : ''}`,
          confidence: 'HIGH',
          subsystem: extractedScope || undefined,
          author: author || null,
          mergedAt: mergedAt ? new Date(mergedAt).toISOString() : null,
          closedAt: closedAt ? new Date(closedAt).toISOString() : null,
          createdAt: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
          sharedItems: sharedFiles,
        });
        return;
      }

      // B. Check shared error tokens
      if (errorTokens.length > 0) {
        const matchedToken = errorTokens.find((tok) =>
          new RegExp(`\\b${tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(candidateText)
        );
        if (matchedToken) {
          seenNumbers.add(number);
          precedents.push({
            id: `prec-err-${number}`,
            targetNumber: number,
            targetTitle: title,
            targetType: type,
            state,
            matchReason: 'ERROR_KEYWORD',
            matchDetail: `Matched identical failure signature '${matchedToken}' in historical records`,
            confidence: 'MEDIUM',
            subsystem: extractedScope || undefined,
            author: author || null,
            mergedAt: mergedAt ? new Date(mergedAt).toISOString() : null,
            closedAt: closedAt ? new Date(closedAt).toISOString() : null,
            createdAt: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
            sharedItems: [matchedToken],
          });
          return;
        }
      }

      // C. Check shared subsystem scope
      if (extractedScope) {
        const candidateScopeMatch = title.match(/(?:fix|feat|chore|refactor|perf|test|docs|build|ci)\(([^)]+)\):/i)
          || title.match(/^\[([^\]]+)\]/i);
        const candidateScope = candidateScopeMatch ? candidateScopeMatch[1].trim().toLowerCase() : null;
        const matchesScope = candidateScope === extractedScope
          || candidateLabels?.some((l) => l.toLowerCase().includes(extractedScope));

        if (matchesScope) {
          seenNumbers.add(number);
          precedents.push({
            id: `prec-scope-${number}`,
            targetNumber: number,
            targetTitle: title,
            targetType: type,
            state,
            matchReason: 'SUBSYSTEM_SCOPE',
            matchDetail: `Shared historical subsystem scope '(${extractedScope})' with identical architectural boundary`,
            confidence: 'MEDIUM',
            subsystem: extractedScope,
            author: author || null,
            mergedAt: mergedAt ? new Date(mergedAt).toISOString() : null,
            closedAt: closedAt ? new Date(closedAt).toISOString() : null,
            createdAt: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
            sharedItems: [extractedScope],
          });
        }
      }
    };

    // Evaluate pull requests (historical changes)
    for (const pr of pullRequests) {
      const isMerged = Boolean(pr.merged || pr.mergedAt !== null || pr.state.toLowerCase() === 'merged');
      const state = isMerged ? 'merged' : pr.state.toLowerCase() === 'open' ? 'open' : 'closed';
      evaluateCandidate(
        pr.number,
        pr.title,
        pr.body,
        'PULL_REQUEST',
        state,
        pr.author,
        pr.mergedAt,
        null,
        pr.createdAt
      );
    }

    // Evaluate issues (historical problem reports)
    for (const issue of issues) {
      const labels = Array.isArray(issue.labels)
        ? (issue.labels as any[]).map((l) => (typeof l === 'string' ? l : l.name || String(l)))
        : [];
      evaluateCandidate(
        issue.number,
        issue.title,
        issue.body,
        'ISSUE',
        issue.state.toLowerCase() === 'open' ? 'open' : 'closed',
        issue.author,
        null,
        issue.closedAt,
        issue.createdAt,
        labels
      );
    }

    // Sort: HIGH confidence first, then latest createdAt / mergedAt
    precedents.sort((a, b) => {
      const confRank = { HIGH: 2, MEDIUM: 1, LOW: 0, NOT_ASSESSED: -1 };
      const diff = confRank[a.confidence] - confRank[b.confidence];
      if (diff !== 0) return -diff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return precedents.slice(0, 8);
  }
}
