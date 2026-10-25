/**
 * CodeForensics Code Archaeology & Source Tracing Types
 */

export type SymbolKind =
  | 'function'
  | 'hook'
  | 'class'
  | 'interface'
  | 'variable'
  | 'type'
  | 'method';

export interface SourceSymbol {
  name: string;
  kind: SymbolKind;
  filePath: string;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  exported: boolean;
  signature?: string;
  documentation?: string;
}

export interface FileSymbolCatalog {
  filePath: string;
  language: 'typescript' | 'javascript' | 'unsupported';
  symbols: SourceSymbol[];
  totalLines: number;
  sizeBytes: number;
}

export interface CommitRevision {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  timestamp: string;
  url: string;
  prNumber?: number;
  prTitle?: string;
  changedFiles?: string[];
  isHead?: boolean;
  isOrigin?: boolean;
}

export interface LineHistoryEntry {
  line: number;
  content: string;
  commitSha: string;
  author: string;
  date: string;
}

export interface ArchaeologyTraceResult {
  query: string;
  targetType: 'symbol' | 'file';
  symbol?: SourceSymbol;
  fileCatalog?: FileSymbolCatalog;
  filePath?: string;
  gitHubFileUrl?: string;
  revisions: CommitRevision[];
  lineHistory?: LineHistoryEntry[];
  linkedWorkItems: {
    number: number;
    type: 'issue' | 'pull_request';
    title: string;
    state: string;
    htmlUrl: string;
  }[];
  coverageNotes: string[];
  evidenceDisclaimer: string;
}
