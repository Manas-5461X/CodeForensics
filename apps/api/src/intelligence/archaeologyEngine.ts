import ts from 'typescript';
import path from 'node:path';
import type {
  SourceSymbol,
  SymbolKind,
  FileSymbolCatalog,
  CommitRevision,
  ArchaeologyTraceResult,
  LineHistoryEntry,
} from '@codeforensics/shared';
import type { RawPullRequestRecord } from './relationshipEngine.js';

export interface ArchaeologyEngineOptions {
  workspaceRoot?: string;
  maxFileSizeBytes?: number;
}

export interface RawCommitRecord {
  sha: string;
  message: string;
  author: string;
  timestamp: string | Date;
  prNumber?: number;
  prTitle?: string;
  changedFiles?: string[];
}

/**
 * Safe Code Archaeology and AST Symbol Discovery Engine
 * 
 * Analyzes JavaScript and TypeScript source files using the TypeScript Compiler API
 * without executing arbitrary untrusted repository code.
 * Enforces strict path traversal prevention and resource bounds.
 */
export class ArchaeologyEngine {
  private readonly workspaceRoot?: string;
  private readonly maxFileSizeBytes: number;

  constructor(options?: ArchaeologyEngineOptions) {
    this.workspaceRoot = options?.workspaceRoot;
    this.maxFileSizeBytes = options?.maxFileSizeBytes ?? 1024 * 1024; // 1 MB limit
  }

  /**
   * Validates and sanitizes a relative file path against directory traversal.
   * Rejects absolute paths, null bytes, and traversal sequences ('..').
   */
  public sanitizeFilePath(rawPath: string): { valid: boolean; normalizedPath?: string; error?: string } {
    if (!rawPath || typeof rawPath !== 'string') {
      return { valid: false, error: 'File path must be a non-empty string' };
    }

    // Reject null bytes
    if (rawPath.includes('\0')) {
      return { valid: false, error: 'File path contains illegal null bytes' };
    }

    // Normalize slashes
    const normalized = rawPath.replace(/\\/g, '/').trim();

    // Check for parent directory traversal
    const segments = normalized.split('/');
    if (segments.some((segment) => segment === '..' || segment === '.')) {
      return { valid: false, error: 'Path traversal detected: parent directory references are forbidden' };
    }

    // Disallow absolute paths (Windows drive letters or root slashes)
    if (path.isAbsolute(normalized) || /^[a-zA-Z]:/.test(normalized)) {
      return { valid: false, error: 'Absolute file paths are not permitted in repository workspace' };
    }

    return { valid: true, normalizedPath: normalized };
  }

  /**
   * Determine language support from file extension.
   */
  public detectLanguage(filePath: string): 'typescript' | 'javascript' | 'unsupported' {
    const ext = path.extname(filePath).toLowerCase();
    if (['.ts', '.tsx', '.mts', '.cts'].includes(ext)) {
      return 'typescript';
    }
    if (['.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
      return 'javascript';
    }
    return 'unsupported';
  }

  /**
   * Parse source code into AST symbols using TypeScript Compiler API without code execution.
   */
  public extractSymbols(sourceContent: string, filePath: string): FileSymbolCatalog {
    const byteLength = Buffer.byteLength(sourceContent, 'utf8');
    const language = this.detectLanguage(filePath);
    const totalLines = (sourceContent.match(/\r\n|\r|\n/g)?.length ?? 0) + 1;

    if (language === 'unsupported') {
      return {
        filePath,
        language: 'unsupported',
        symbols: [],
        totalLines,
        sizeBytes: byteLength,
      };
    }

    if (byteLength > this.maxFileSizeBytes) {
      return {
        filePath,
        language,
        symbols: [],
        totalLines,
        sizeBytes: byteLength,
      };
    }

    const scriptKind = filePath.endsWith('.tsx')
      ? ts.ScriptKind.TSX
      : filePath.endsWith('.jsx')
      ? ts.ScriptKind.JSX
      : filePath.endsWith('.ts')
      ? ts.ScriptKind.TS
      : ts.ScriptKind.JS;

    const sourceFile = ts.createSourceFile(
      filePath,
      sourceContent,
      ts.ScriptTarget.Latest,
      true,
      scriptKind
    );

    const symbols: SourceSymbol[] = [];

    const getPositionInfo = (node: ts.Node) => {
      const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
      return {
        startLine: start.line + 1,
        startColumn: start.character + 1,
        endLine: end.line + 1,
        endColumn: end.character + 1,
      };
    };

    const isNodeExported = (node: ts.Node): boolean => {
      return (
        (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0 ||
        (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile)
      );
    };

    const visit = (node: ts.Node) => {
      // 1. Function Declarations
      if (ts.isFunctionDeclaration(node) && node.name) {
        const name = node.name.text;
        const pos = getPositionInfo(node);
        const isHook = name.startsWith('use') && name.length > 3 && name[3] === name[3]?.toUpperCase();
        symbols.push({
          name,
          kind: isHook ? 'hook' : 'function',
          filePath,
          startLine: pos.startLine,
          endLine: pos.endLine,
          startColumn: pos.startColumn,
          endColumn: pos.endColumn,
          exported: isNodeExported(node),
          signature: node.getText(sourceFile).split('\n')[0]?.trim(),
        });
      }

      // 2. Class Declarations
      else if (ts.isClassDeclaration(node) && node.name) {
        const name = node.name.text;
        const pos = getPositionInfo(node);
        symbols.push({
          name,
          kind: 'class',
          filePath,
          startLine: pos.startLine,
          endLine: pos.endLine,
          startColumn: pos.startColumn,
          endColumn: pos.endColumn,
          exported: isNodeExported(node),
          signature: `class ${name}`,
        });

        // Scan methods inside class
        for (const member of node.members) {
          if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
            const methodName = member.name.text;
            const mPos = getPositionInfo(member);
            symbols.push({
              name: `${name}.${methodName}`,
              kind: 'method',
              filePath,
              startLine: mPos.startLine,
              endLine: mPos.endLine,
              startColumn: mPos.startColumn,
              endColumn: mPos.endColumn,
              exported: isNodeExported(node),
              signature: member.getText(sourceFile).split('\n')[0]?.trim(),
            });
          }
        }
      }

      // 3. Interface Declarations
      else if (ts.isInterfaceDeclaration(node)) {
        const name = node.name.text;
        const pos = getPositionInfo(node);
        symbols.push({
          name,
          kind: 'interface',
          filePath,
          startLine: pos.startLine,
          endLine: pos.endLine,
          startColumn: pos.startColumn,
          endColumn: pos.endColumn,
          exported: isNodeExported(node),
          signature: `interface ${name}`,
        });
      }

      // 4. Type Alias Declarations
      else if (ts.isTypeAliasDeclaration(node)) {
        const name = node.name.text;
        const pos = getPositionInfo(node);
        symbols.push({
          name,
          kind: 'type',
          filePath,
          startLine: pos.startLine,
          endLine: pos.endLine,
          startColumn: pos.startColumn,
          endColumn: pos.endColumn,
          exported: isNodeExported(node),
          signature: `type ${name}`,
        });
      }

      // 5. Variable Statement (const foo = () => {}, const useValue = ...)
      else if (ts.isVariableStatement(node)) {
        const isExported = isNodeExported(node);
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            const name = decl.name.text;
            const pos = getPositionInfo(decl);
            const isArrowOrFunc =
              decl.initializer &&
              (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer));
            const isHook =
              name.startsWith('use') && name.length > 3 && name[3] === name[3]?.toUpperCase();

            let kind: SymbolKind = 'variable';
            if (isHook) {
              kind = 'hook';
            } else if (isArrowOrFunc) {
              kind = 'function';
            }

            symbols.push({
              name,
              kind,
              filePath,
              startLine: pos.startLine,
              endLine: pos.endLine,
              startColumn: pos.startColumn,
              endColumn: pos.endColumn,
              exported: isExported,
              signature: decl.getText(sourceFile).split('\n')[0]?.trim(),
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return {
      filePath,
      language,
      symbols,
      totalLines,
      sizeBytes: byteLength,
    };
  }

  /**
   * Trace historical revisions from ingested Pull Requests and Commits.
   */
  public buildRevisionHistory(
    repoOwner: string,
    repoName: string,
    targetPath: string,
    symbolName?: string,
    pullRequests: RawPullRequestRecord[] = [],
    commitRecords: RawCommitRecord[] = []
  ): { revisions: CommitRevision[]; coverageNotes: string[] } {
    const revisions: CommitRevision[] = [];
    const coverageNotes: string[] = [];
    const seenShas = new Set<string>();

    const targetLower = targetPath.toLowerCase();
    const symbolLower = symbolName?.toLowerCase();

    // 1. Process explicit commit records first
    for (const commit of commitRecords) {
      if (seenShas.has(commit.sha)) continue;

      let isRelevant = false;

      // Check if commit touched the file
      if (commit.changedFiles && commit.changedFiles.length > 0) {
        if (commit.changedFiles.some((f) => f.toLowerCase().includes(targetLower))) {
          isRelevant = true;
        }
      } else {
        // If no file diffs ingested, check commit message for symbol or file mention
        if (
          commit.message.toLowerCase().includes(targetLower) ||
          (symbolLower && commit.message.toLowerCase().includes(symbolLower))
        ) {
          isRelevant = true;
        }
      }

      if (isRelevant) {
        seenShas.add(commit.sha);
        revisions.push({
          sha: commit.sha,
          shortSha: commit.sha.substring(0, 7),
          message: commit.message.split('\n')[0] ?? commit.message,
          author: commit.author,
          timestamp: new Date(commit.timestamp).toISOString(),
          url: `https://github.com/${repoOwner}/${repoName}/commit/${commit.sha}`,
          prNumber: commit.prNumber,
          prTitle: commit.prTitle,
          changedFiles: commit.changedFiles,
        });
      }
    }

    // 2. Synthesize revisions from merged pull requests referencing this file or symbol
    for (const pr of pullRequests) {
      const prText = `${pr.title} ${pr.body ?? ''}`.toLowerCase();
      const mentionsFile = prText.includes(targetLower);
      const mentionsSymbol = symbolLower ? prText.includes(symbolLower) : false;

      if ((mentionsFile || mentionsSymbol) && pr.merged) {
        // Create deterministic simulated revision from merged PR
        const pseudoSha = `pr${pr.number}_${Math.abs(
          pr.title.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)
        )
          .toString(16)
          .padStart(7, '0')
          .substring(0, 7)}`;

        if (!seenShas.has(pseudoSha)) {
          seenShas.add(pseudoSha);
          revisions.push({
            sha: pseudoSha,
            shortSha: pseudoSha.substring(0, 7),
            message: `Merge PR #${pr.number}: ${pr.title}`,
            author: pr.author ?? 'unknown',
            timestamp: new Date(pr.mergedAt ?? pr.updatedAt ?? pr.createdAt).toISOString(),
            url: `https://github.com/${repoOwner}/${repoName}/pull/${pr.number}`,
            prNumber: pr.number,
            prTitle: pr.title,
            changedFiles: [targetPath],
          });
        }
      }
    }

    // Sort revisions chronologically descending (newest first)
    revisions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (revisions.length > 0) {
      revisions[0]!.isHead = true;
      revisions[revisions.length - 1]!.isOrigin = true;
    }

    if (commitRecords.length === 0) {
      coverageNotes.push(
        'Direct Git commit log not locally mirrored; revision history synthesized from merged pull request records and sync checkpoints.'
      );
    }

    return { revisions, coverageNotes };
  }

  /**
   * Full archaeological trace combining AST discovery, revision lineage, and work-item citations.
   */
  public trace(options: {
    query: string;
    filePath?: string;
    repoOwner: string;
    repoName: string;
    defaultBranch?: string;
    sourceCode?: string;
    pullRequests?: RawPullRequestRecord[];
    commitRecords?: RawCommitRecord[];
    lineBlame?: LineHistoryEntry[];
  }): ArchaeologyTraceResult {
    const {
      query,
      filePath,
      repoOwner,
      repoName,
      defaultBranch = 'main',
      sourceCode,
      pullRequests = [],
      commitRecords = [],
      lineBlame,
    } = options;

    const coverageNotes: string[] = [];
    const disclaimer =
      'CodeForensics observes commit and revision lineage without inferring defect introduction or fixing without explicit verified evidence.';

    // Determine target path
    const resolvedPath = filePath || (query.includes('/') || query.endsWith('.js') || query.endsWith('.ts') ? query : undefined);

    let symbolCatalog: FileSymbolCatalog | undefined;
    let targetSymbol: SourceSymbol | undefined;

    if (resolvedPath && sourceCode) {
      const sanitized = this.sanitizeFilePath(resolvedPath);
      if (sanitized.valid && sanitized.normalizedPath) {
        symbolCatalog = this.extractSymbols(sourceCode, sanitized.normalizedPath);

        // Find symbol matching query if query isn't the file path
        if (query !== resolvedPath) {
          targetSymbol = symbolCatalog.symbols.find(
            (s) => s.name.toLowerCase() === query.toLowerCase()
          );
        } else if (symbolCatalog.symbols.length > 0) {
          // If query was file path, pick the top primary symbol if applicable
          targetSymbol = symbolCatalog.symbols[0];
        }
      } else {
        coverageNotes.push(`Safe path warning: ${sanitized.error}`);
      }
    } else if (!sourceCode) {
      coverageNotes.push(
        'Source code content was not directly loaded in current tier; analyzing available repository metadata and historical references.'
      );
    }

    // Build revision history
    const effectivePath = resolvedPath || targetSymbol?.filePath || query;
    const { revisions, coverageNotes: revNotes } = this.buildRevisionHistory(
      repoOwner,
      repoName,
      effectivePath,
      targetSymbol?.name || query,
      pullRequests,
      commitRecords
    );

    coverageNotes.push(...revNotes);

    // Linked work items from PRs
    const linkedWorkItems: ArchaeologyTraceResult['linkedWorkItems'] = [];
    const queryLower = query.toLowerCase();

    for (const pr of pullRequests) {
      const text = `${pr.title} ${pr.body ?? ''}`.toLowerCase();
      if (text.includes(queryLower) || (effectivePath && text.includes(effectivePath.toLowerCase()))) {
        linkedWorkItems.push({
          number: pr.number,
          type: 'pull_request',
          title: pr.title,
          state: pr.merged ? 'merged' : pr.state,
          htmlUrl: `https://github.com/${repoOwner}/${repoName}/pull/${pr.number}`,
        });
      }
    }

    // Construct valid GitHub file URL
    let gitHubFileUrl: string | undefined;
    if (resolvedPath) {
      if (targetSymbol) {
        gitHubFileUrl = `https://github.com/${repoOwner}/${repoName}/blob/${defaultBranch}/${resolvedPath}#L${targetSymbol.startLine}-L${targetSymbol.endLine}`;
      } else {
        gitHubFileUrl = `https://github.com/${repoOwner}/${repoName}/blob/${defaultBranch}/${resolvedPath}`;
      }
    }

    return {
      query,
      targetType: targetSymbol ? 'symbol' : resolvedPath ? 'file' : 'symbol',
      symbol: targetSymbol,
      fileCatalog: symbolCatalog,
      filePath: resolvedPath,
      gitHubFileUrl,
      revisions,
      lineHistory: lineBlame,
      linkedWorkItems: linkedWorkItems.slice(0, 10),
      coverageNotes,
      evidenceDisclaimer: disclaimer,
    };
  }
}
