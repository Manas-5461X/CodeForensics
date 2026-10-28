import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRepository } from '../context/RepositoryContext.js';
import { useApiClient } from '../utils/apiClient.js';
import { Panel } from '../components/ui/Panel.js';
import { Button } from '../components/ui/Button.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton.js';
import type {
  RepositoryMapData,
  RepositoryMapNode,
} from '@codeforensics/shared';
import {
  Network,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Download,
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  Flame,
  User,
  GitBranch,
  ChevronRight,
  ChevronDown,
  Compass,
  Layers,
  Code2,
  Check,
} from 'lucide-react';

export function RepositoryMapPage() {
  const { activeRepo } = useRepository();
  const { get } = useApiClient();
  const navigate = useNavigate();

  const [mapData, setMapData] = useState<RepositoryMapData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubsystem, setSelectedSubsystem] = useState<string>('all');
  const [minChurn, setMinChurn] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'tree' | 'mermaid' | 'text'>('tree');

  // Zoom & Pan Canvas State
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root', 'apps', 'packages', 'apps/api', 'apps/web', 'packages/shared']));
  const [selectedNode, setSelectedNode] = useState<RepositoryMapNode | null>(null);

  // Export Feedback
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);

  // Fetch repository architecture map data
  useEffect(() => {
    if (!activeRepo) {
      setMapData(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    get<RepositoryMapData>(`/repositories/${activeRepo.owner}/${activeRepo.name}/map`)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setMapData(res.data);
          // Auto-expand root and first level directories
          const initialExpanded = new Set<string>(['root']);
          if (res.data.root.children) {
            for (const child of res.data.root.children) {
              if (child.type === 'directory') {
                initialExpanded.add(child.path);
                child.children?.forEach((sub) => {
                  if (sub.type === 'directory') initialExpanded.add(sub.path);
                });
              }
            }
          }
          setExpandedNodes(initialExpanded);
        } else {
          setError(res.error?.message || 'Failed to load repository architecture map');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Network failure loading architecture map');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeRepo?.owner, activeRepo?.name, get]);

  // Toggle folder expansion
  const toggleExpand = (path: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (!mapData) return;
    const allDirs = new Set<string>(['root']);
    const collectDirs = (node: RepositoryMapNode) => {
      if (node.type === 'directory') {
        allDirs.add(node.path);
        node.children?.forEach(collectDirs);
      }
    };
    collectDirs(mapData.root);
    setExpandedNodes(allDirs);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set(['root']));
  };

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((z) => Math.min(2, Math.round((z + 0.15) * 100) / 100));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.5, Math.round((z - 0.15) * 100) / 100));
  const handleResetZoom = () => setZoomLevel(1);

  // Multi-format Downloads
  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadMarkdown = () => {
    if (!mapData) return;
    const md = generateMarkdownExport(mapData);
    downloadFile(md, `${activeRepo?.name || 'repo'}-architecture-map.md`, 'text/markdown;charset=utf-8');
    setCopiedStatus('Markdown map downloaded!');
    setTimeout(() => setCopiedStatus(null), 3000);
  };

  const handleDownloadMermaid = () => {
    if (!mapData) return;
    const mmd = generateMermaidExport(mapData);
    downloadFile(mmd, `${activeRepo?.name || 'repo'}-architecture.mmd`, 'text/plain;charset=utf-8');
    setCopiedStatus('Mermaid diagram downloaded!');
    setTimeout(() => setCopiedStatus(null), 3000);
  };

  const handleDownloadTextTree = () => {
    if (!mapData) return;
    const txt = generateTextTreeExport(mapData);
    downloadFile(txt, `${activeRepo?.name || 'repo'}-tree.txt`, 'text/plain;charset=utf-8');
    setCopiedStatus('Text tree downloaded!');
    setTimeout(() => setCopiedStatus(null), 3000);
  };

  // Export generators
  const generateMermaidExport = (data: RepositoryMapData): string => {
    const lines: string[] = ['graph TD', `  root["📁 ${data.fullName}"]:::rootClass`];
    for (const sub of data.root.children || []) {
      const subId = sub.name.replace(/[^a-zA-Z0-9]/g, '_');
      const churnLabel = sub.churnScore >= 65 ? ' 🔥 HOTSPOT' : '';
      lines.push(`  root --> ${subId}["📁 ${sub.name} (${sub.fileCount} files)${churnLabel}"]`);
      if (sub.children) {
        for (const child of sub.children.slice(0, 8)) {
          const childId = `${subId}_${child.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
          const icon = child.type === 'directory' ? '📁' : '📄';
          const badge = child.churnScore >= 75 ? ' [High Churn]' : '';
          lines.push(`  ${subId} --> ${childId}["${icon} ${child.name}${badge}"]`);
        }
      }
    }
    lines.push('  classDef rootClass fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#f8fafc;');
    return lines.join('\n');
  };

  const generateTextTreeExport = (data: RepositoryMapData): string => {
    const lines: string[] = [
      `${data.fullName} (Branch: ${data.defaultBranch})`,
      `Generated by CodeForensics Architecture Map Engine - ${data.analyzedAt}`,
      '─'.repeat(70),
    ];
    const renderNode = (node: RepositoryMapNode, prefix = '', isLast = true) => {
      if (node.id === 'root') {
        node.children?.forEach((c, idx) => {
          renderNode(c, '', idx === (node.children?.length || 0) - 1);
        });
        return;
      }
      const connector = isLast ? '└── ' : '├── ';
      const churnTag = node.churnScore >= 70 ? ` [🔥 Churn: ${node.churnScore}/100]` : ` [Churn: ${node.churnScore}/100]`;
      const maintainer = node.topMaintainer ? ` (lead: @${node.topMaintainer})` : '';
      if (node.type === 'directory') {
        lines.push(`${prefix}${connector}📁 ${node.name}/ (${node.fileCount} files)${churnTag}${maintainer}`);
        const childPrefix = prefix + (isLast ? '    ' : '│   ');
        node.children?.forEach((c, idx) => {
          renderNode(c, childPrefix, idx === (node.children?.length || 0) - 1);
        });
      } else {
        lines.push(`${prefix}${connector}📄 ${node.name}${churnTag}${maintainer}`);
      }
    };
    renderNode(data.root);
    return lines.join('\n');
  };

  const generateMarkdownExport = (data: RepositoryMapData): string => {
    return [
      `# Architecture Map: ${data.fullName}`,
      `> **Analyzed at**: ${new Date(data.analyzedAt).toUTCString()}`,
      `> **Default Branch**: \`${data.defaultBranch}\` | **Total Files**: ${data.summary.totalFiles} | **Hotspots**: ${data.summary.hotspotCount}`,
      '',
      '## Subsystem Breakdown',
      '| Subsystem Path | Total Files | Churn Score | Risk Level | Lead Maintainer |',
      '|:---------------|:------------|:------------|:-----------|:----------------|',
      ...data.summary.topSubsystems.map(
        (sub) =>
          `| \`${sub.path}\` | ${sub.fileCount} | ${sub.churnScore}/100 | ${
            sub.churnScore >= 70 ? '🔴 High Activity' : sub.churnScore >= 40 ? '🟡 Moderate' : '🟢 Stable'
          } | @${sub.topMaintainer || 'team'} |`
      ),
      '',
      '## Architecture Graph (Mermaid)',
      '```mermaid',
      generateMermaidExport(data),
      '```',
      '',
      '## Directory Hierarchy (ASCII Tree)',
      '```text',
      generateTextTreeExport(data),
      '```',
    ].join('\n');
  };

  // Node filtering logic
  const isNodeVisible = (node: RepositoryMapNode): boolean => {
    // 1. Min Churn filter
    if (node.type === 'file' && minChurn > 0 && node.churnScore < minChurn) {
      return false;
    }

    // 2. Subsystem filter
    if (selectedSubsystem !== 'all') {
      const isMatch = node.path.startsWith(selectedSubsystem) || node.subsystem === selectedSubsystem;
      if (!isMatch && !selectedSubsystem.startsWith(node.path)) {
        return false;
      }
    }

    // 3. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = node.name.toLowerCase().includes(q) || node.path.toLowerCase().includes(q);
      if (nameMatch) return true;

      // If directory, check if any descendant matches
      if (node.type === 'directory' && node.children) {
        return node.children.some(isNodeVisible);
      }
      return false;
    }

    return true;
  };

  // Recursive Tree Node component
  const TreeNode = ({ node, level = 0 }: { node: RepositoryMapNode; level?: number }) => {
    if (!isNodeVisible(node)) return null;

    const isDir = node.type === 'directory';
    const isExpanded = expandedNodes.has(node.path);
    const isSelected = selectedNode?.path === node.path;
    const isHotspot = node.churnScore >= 65;
    const isModerate = node.churnScore >= 40 && node.churnScore < 65;

    return (
      <div className="select-none">
        <div
          onClick={() => {
            if (isDir) {
              toggleExpand(node.path);
            }
            setSelectedNode(node);
          }}
          style={{ paddingLeft: `${Math.max(8, level * 20)}px` }}
          className={`flex items-center justify-between py-1.5 px-3 rounded-md cursor-pointer transition-colors text-xs font-mono group ${
            isSelected
              ? 'bg-primary/10 border border-primary/20 text-primary font-bold'
              : 'hover:bg-surface-subtle text-primary'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isDir ? (
              <span className="text-primary-muted group-hover:text-primary transition-colors">
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </span>
            ) : (
              <span className="w-3.5 h-3.5" />
            )}

            {isDir ? (
              isExpanded ? (
                <FolderOpen className="w-4 h-4 text-accent shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-accent shrink-0" />
              )
            ) : (
              <FileCode className="w-3.5 h-3.5 text-primary-muted shrink-0" />
            )}

            <span className="truncate">
              {node.name}
              {isDir && <span className="text-[10px] text-primary-muted ml-1.5">({node.fileCount})</span>}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-3">
            {/* Churn Badge */}
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                isHotspot
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : isModerate
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {isHotspot && <Flame className="w-2.5 h-2.5 text-rose-600" />}
              {node.churnScore}/100
            </span>

            {/* Size or Lead */}
            {node.type === 'file' && node.size ? (
              <span className="text-[10px] text-primary-muted hidden sm:inline">
                {(node.size / 1024).toFixed(1)} KB
              </span>
            ) : null}

            {node.topMaintainer && (
              <span className="text-[10px] text-primary-muted hidden md:inline">
                @{node.topMaintainer}
              </span>
            )}
          </div>
        </div>

        {isDir && isExpanded && node.children && (
          <div className="border-l border-border-subtle/60 ml-3.5 my-0.5 space-y-0.5">
            {node.children.map((child) => (
              <TreeNode key={child.path} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!activeRepo) {
    return (
      <EmptyState
        icon={<Network className="w-8 h-8 text-primary-muted" />}
        title="No Repository Selected"
        description="Select a synchronized repository to generate its architectural map, directory hierarchy, and code churn heatmap."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
              Repository Architecture Map
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border border-border-subtle bg-surface-subtle text-primary">
              <GitBranch className="w-3 h-3 text-accent mr-0.5" />
              {mapData?.defaultBranch || 'main'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-primary-secondary mt-1 max-w-3xl">
            Interactive hierarchical representation of codebase subsystems, directory structures, and churn hotspot distributions.
          </p>
        </div>

        {/* Global Export & Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadMarkdown}
            disabled={!mapData}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export Markdown (.md)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadMermaid}
            disabled={!mapData}
            leftIcon={<Code2 className="w-3.5 h-3.5" />}
          >
            Mermaid Diagram
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTextTree}
            disabled={!mapData}
            leftIcon={<FileText className="w-3.5 h-3.5" />}
          >
            ASCII Tree
          </Button>
        </div>
      </div>

      {copiedStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs font-mono flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          {copiedStatus}
        </div>
      )}

      {/* Metrics Banner */}
      {mapData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Panel className="p-3.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-primary-muted font-semibold">
              Total Code Files
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-primary mt-1">
              {mapData.summary.totalFiles}
            </div>
            <div className="text-[11px] text-primary-secondary mt-0.5">
              Across {mapData.summary.totalDirectories} directories
            </div>
          </Panel>

          <Panel className="p-3.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-rose-700 font-semibold flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-rose-600" />
              Churn Hotspots
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-rose-600 mt-1">
              {mapData.summary.hotspotCount}
            </div>
            <div className="text-[11px] text-primary-secondary mt-0.5">
              High-volatility change files (≥60)
            </div>
          </Panel>

          <Panel className="p-3.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-primary-muted font-semibold">
              Primary Subsystems
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-primary mt-1">
              {mapData.summary.topSubsystems.length}
            </div>
            <div className="text-[11px] text-primary-secondary mt-0.5">
              {mapData.summary.topSubsystems[0]?.name || 'root'} (largest)
            </div>
          </Panel>

          <Panel className="p-3.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-primary-muted font-semibold">
              Analyzed Snapshot
            </div>
            <div className="text-xs sm:text-sm font-bold font-mono text-primary mt-1.5 truncate">
              {new Date(mapData.analyzedAt).toLocaleDateString()}
            </div>
            <div className="text-[11px] text-primary-secondary mt-0.5">
              Provenanced Git structure
            </div>
          </Panel>
        </div>
      )}

      {/* Main Interactive Workbench Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 Columns: Map Controls & Interactive Canvas */}
        <div className="lg:col-span-3 space-y-3">
          {/* Controls Bar */}
          <Panel className="p-3 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-primary-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter files or folders (e.g. auth, routes, server)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-canvas border border-border-subtle rounded-md text-xs font-mono text-primary placeholder:text-primary-muted focus:border-link focus:outline-none"
                />
              </div>

              {/* View Switcher */}
              <div className="flex items-center gap-1 p-0.5 bg-surface-subtle border border-border-subtle rounded-md self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('tree')}
                  className={`px-2.5 py-1 text-xs font-mono font-medium rounded transition-colors ${
                    viewMode === 'tree' ? 'bg-surface text-primary shadow-xs' : 'text-primary-muted hover:text-primary'
                  }`}
                >
                  Interactive Tree
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('mermaid')}
                  className={`px-2.5 py-1 text-xs font-mono font-medium rounded transition-colors ${
                    viewMode === 'mermaid' ? 'bg-surface text-primary shadow-xs' : 'text-primary-muted hover:text-primary'
                  }`}
                >
                  Mermaid Graph
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('text')}
                  className={`px-2.5 py-1 text-xs font-mono font-medium rounded transition-colors ${
                    viewMode === 'text' ? 'bg-surface text-primary shadow-xs' : 'text-primary-muted hover:text-primary'
                  }`}
                >
                  ASCII Tree
                </button>
              </div>
            </div>

            {/* Filter Pills & Zoom Actions */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-border-subtle/60 text-xs font-mono">
              {/* Churn Filter */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-primary-muted uppercase tracking-wider font-semibold mr-1">
                  Churn Hotspot Filter:
                </span>
                <button
                  type="button"
                  onClick={() => setMinChurn(0)}
                  className={`px-2 py-0.5 rounded text-[11px] ${
                    minChurn === 0 ? 'bg-primary text-canvas font-bold' : 'bg-surface-subtle text-primary-muted hover:text-primary'
                  }`}
                >
                  All (0+)
                </button>
                <button
                  type="button"
                  onClick={() => setMinChurn(40)}
                  className={`px-2 py-0.5 rounded text-[11px] ${
                    minChurn === 40 ? 'bg-amber-600 text-white font-bold' : 'bg-surface-subtle text-primary-muted hover:text-primary'
                  }`}
                >
                  Moderate+ (≥40)
                </button>
                <button
                  type="button"
                  onClick={() => setMinChurn(65)}
                  className={`px-2 py-0.5 rounded text-[11px] ${
                    minChurn === 65 ? 'bg-rose-600 text-white font-bold' : 'bg-surface-subtle text-primary-muted hover:text-primary'
                  }`}
                >
                  Hotspots Only (≥65)
                </button>
              </div>

              {/* Tree Expansion & Zoom controls */}
              {viewMode === 'tree' && (
                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    type="button"
                    onClick={expandAll}
                    className="px-2 py-0.5 text-[11px] text-primary-muted hover:text-primary hover:underline"
                  >
                    Expand All
                  </button>
                  <span className="text-border-subtle">|</span>
                  <button
                    type="button"
                    onClick={collapseAll}
                    className="px-2 py-0.5 text-[11px] text-primary-muted hover:text-primary hover:underline"
                  >
                    Collapse All
                  </button>
                  <span className="text-border-subtle">|</span>
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    className="p-1 text-primary-muted hover:text-primary hover:bg-surface-subtle rounded"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] text-primary-muted min-w-[36px] text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    className="p-1 text-primary-muted hover:text-primary hover:bg-surface-subtle rounded"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    className="p-1 text-primary-muted hover:text-primary hover:bg-surface-subtle rounded"
                    title="Reset Zoom"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </Panel>

          {/* Interactive Canvas Viewport */}
          <Panel className="p-4 min-h-[500px] max-h-[700px] overflow-auto bg-surface-subtle/20 relative">
            {isLoading ? (
              <div className="p-8 space-y-4">
                <LoadingSkeleton className="h-6 w-1/3" />
                <LoadingSkeleton className="h-4 w-2/3" />
                <LoadingSkeleton className="h-48 w-full" />
              </div>
            ) : error ? (
              <div className="p-8 text-center text-rose-600 font-mono text-xs space-y-2">
                <p>Failed to generate architecture map: {error}</p>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                  Retry Analysis
                </Button>
              </div>
            ) : mapData ? (
              viewMode === 'tree' ? (
                <div
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'top left',
                    transition: 'transform 0.15s ease-out',
                  }}
                  className="space-y-1"
                >
                  <TreeNode node={mapData.root} level={0} />
                </div>
              ) : viewMode === 'mermaid' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-primary-muted pb-2 border-b border-border-subtle">
                    <span>Mermaid Graph Flowchart Notation</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(generateMermaidExport(mapData));
                        setCopiedStatus('Mermaid syntax copied to clipboard!');
                        setTimeout(() => setCopiedStatus(null), 3000);
                      }}
                      className="text-link hover:underline"
                    >
                      Copy Syntax
                    </button>
                  </div>
                  <pre className="p-4 bg-canvas border border-border-subtle rounded-md text-xs font-mono text-primary overflow-x-auto leading-relaxed">
                    {generateMermaidExport(mapData)}
                  </pre>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-primary-muted pb-2 border-b border-border-subtle">
                    <span>ASCII Directory Tree</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(generateTextTreeExport(mapData));
                        setCopiedStatus('ASCII tree copied to clipboard!');
                        setTimeout(() => setCopiedStatus(null), 3000);
                      }}
                      className="text-link hover:underline"
                    >
                      Copy Tree
                    </button>
                  </div>
                  <pre className="p-4 bg-canvas border border-border-subtle rounded-md text-xs font-mono text-primary overflow-x-auto leading-relaxed whitespace-pre">
                    {generateTextTreeExport(mapData)}
                  </pre>
                </div>
              )
            ) : null}
          </Panel>
        </div>

        {/* Right 1 Column: Node Inspector & Subsystems */}
        <div className="space-y-4">
          {/* Node Inspector Card */}
          <Panel className="p-4 space-y-3.5">
            <h3 className="text-xs font-bold text-primary font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-accent" />
              Architecture Inspector
            </h3>

            {selectedNode ? (
              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 bg-surface-subtle/80 rounded border border-border-subtle space-y-1">
                  <div className="text-[10px] text-primary-muted uppercase font-semibold">
                    {selectedNode.type === 'directory' ? 'Directory Path' : 'File Path'}
                  </div>
                  <div className="text-xs font-bold text-primary break-all">
                    {selectedNode.path || selectedNode.name}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-surface-subtle/50 rounded border border-border-subtle/60">
                    <span className="text-[10px] text-primary-muted block">Churn Hotspot Score</span>
                    <span
                      className={`font-bold text-sm ${
                        selectedNode.churnScore >= 65
                          ? 'text-rose-600'
                          : selectedNode.churnScore >= 40
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {selectedNode.churnScore}/100
                    </span>
                  </div>

                  <div className="p-2.5 bg-surface-subtle/50 rounded border border-border-subtle/60">
                    <span className="text-[10px] text-primary-muted block">
                      {selectedNode.type === 'directory' ? 'Total Files' : 'File Size'}
                    </span>
                    <span className="font-bold text-sm text-primary">
                      {selectedNode.type === 'directory'
                        ? `${selectedNode.fileCount || 0} files`
                        : `${((selectedNode.size || 1024) / 1024).toFixed(1)} KB`}
                    </span>
                  </div>
                </div>

                {selectedNode.topMaintainer && (
                  <div className="p-2.5 bg-surface-subtle/50 rounded border border-border-subtle/60">
                    <span className="text-[10px] text-primary-muted block">Primary Maintainer</span>
                    <span className="font-bold text-xs text-primary flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3 text-primary-muted" />
                      @{selectedNode.topMaintainer}
                    </span>
                  </div>
                )}

                {/* Quick Forensic Actions */}
                <div className="pt-2 border-t border-border-subtle space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs font-mono"
                    onClick={() =>
                      navigate(`/app/archaeology?query=${encodeURIComponent(selectedNode.path)}`)
                    }
                    leftIcon={<Code2 className="w-3.5 h-3.5 text-accent" />}
                  >
                    Trace in Archaeology
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs font-mono"
                    onClick={() =>
                      navigate(`/app/issues?search=${encodeURIComponent(selectedNode.name)}`)
                    }
                    leftIcon={<Search className="w-3.5 h-3.5 text-primary-muted" />}
                  >
                    Search Issues & PRs
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center border border-dashed border-border-subtle rounded-md bg-surface-subtle/20 text-xs text-primary-muted font-mono space-y-1">
                <Compass className="w-4 h-4 mx-auto text-primary-muted mb-1" />
                <p>Click any file or directory in the map to inspect churn provenance, file statistics, and archaeology links.</p>
              </div>
            )}
          </Panel>

          {/* Subsystems Breakdown List */}
          {mapData && (
            <Panel className="p-4 space-y-3">
              <h3 className="text-xs font-bold text-primary font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-accent" />
                Subsystems ({mapData.summary.topSubsystems.length})
              </h3>

              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedSubsystem('all')}
                  className={`w-full text-left p-2 rounded text-xs font-mono flex items-center justify-between transition-colors ${
                    selectedSubsystem === 'all'
                      ? 'bg-primary/10 border border-primary/20 text-primary font-bold'
                      : 'hover:bg-surface-subtle text-primary-secondary'
                  }`}
                >
                  <span>All Subsystems</span>
                  <span className="text-[10px] text-primary-muted">{mapData.summary.totalFiles} files</span>
                </button>

                {mapData.summary.topSubsystems.map((sub) => (
                  <button
                    key={sub.name}
                    type="button"
                    onClick={() => setSelectedSubsystem(sub.name)}
                    className={`w-full text-left p-2 rounded text-xs font-mono flex items-center justify-between transition-colors ${
                      selectedSubsystem === sub.name
                        ? 'bg-primary/10 border border-primary/20 text-primary font-bold'
                        : 'hover:bg-surface-subtle text-primary-secondary'
                    }`}
                  >
                    <span className="truncate">{sub.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-primary-muted">{sub.fileCount}</span>
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded ${
                          sub.churnScore >= 65 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {sub.churnScore}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
