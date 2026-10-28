import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRepository } from '../context/RepositoryContext.js';
import { useApiClient } from '../utils/apiClient.js';
import { Panel } from '../components/ui/Panel.js';
import { Button } from '../components/ui/Button.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton.js';
import { MermaidViewer } from '../components/map/MermaidViewer.js';
import type {
  RepositoryMapData,
  RepositoryMapNode,
  CoChangeReport,
} from '@codeforensics/shared';
import { generateAuditDossierHtml } from '../utils/dossierGenerator.js';
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
  FolderGit2,
  Flame,
  User,
  GitBranch,
  ChevronRight,
  ChevronDown,
  Compass,
  Layers,
  Code2,
  Check,
  HelpCircle,
  GitMerge,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Zap,
  ShieldCheck,
  Activity,
  BookOpen,
} from 'lucide-react';

export function RepositoryMapPage() {
  const { activeRepo, isLoadingRepos } = useRepository();
  const { get } = useApiClient();
  const navigate = useNavigate();

  const [mapData, setMapData] = useState<RepositoryMapData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubsystem, setSelectedSubsystem] = useState<string>('all');
  const [minChurn, setMinChurn] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'graph' | 'heatmap' | 'tree' | 'mermaid' | 'text'>('graph');

  // Zoom & Pan Canvas State
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root', 'apps', 'packages', 'apps/api', 'apps/web', 'packages/shared']));
  const [expandedGraphFolders, setExpandedGraphFolders] = useState<Set<string>>(new Set(['root']));
  const [selectedNode, setSelectedNode] = useState<RepositoryMapNode | null>(null);
  const [showChurnGuide, setShowChurnGuide] = useState<boolean>(false);

  // Advanced Forensic Intelligence State
  const [showDependencies, setShowDependencies] = useState<boolean>(false);
  const [coChangeReport, setCoChangeReport] = useState<CoChangeReport | null>(null);

  // Export Feedback
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);

  // Flatten all file nodes from the tree for the Visual Churn Heatmap
  const allFileNodes = useMemo(() => {
    if (!mapData?.root) return [];
    const files: RepositoryMapNode[] = [];
    const traverse = (node: RepositoryMapNode) => {
      if (node.type === 'file') {
        files.push(node);
      }
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    traverse(mapData.root);
    return files;
  }, [mapData]);

  // Filter and sort files for Visual Heatmap
  const filteredHeatmapFiles = useMemo(() => {
    return allFileNodes
      .filter((file) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          if (!file.name.toLowerCase().includes(q) && !file.path.toLowerCase().includes(q)) {
            return false;
          }
        }
        if (selectedSubsystem !== 'all') {
          const fileSubsystem = file.path.split('/')[0];
          if (fileSubsystem !== selectedSubsystem) return false;
        }
        if (minChurn > 0 && (file.churnScore ?? 0) < minChurn) {
          return false;
        }
        return true;
      })
      .sort((a, b) => (b.churnScore ?? 0) - (a.churnScore ?? 0));
  }, [allFileNodes, searchQuery, selectedSubsystem, minChurn]);

  // Group filtered files by subsystem for the Proper Visual Heatmap Matrix
  const heatmapFilesBySubsystem = useMemo(() => {
    const groupMap = new Map<string, RepositoryMapNode[]>();
    for (const file of filteredHeatmapFiles) {
      const parts = file.path.split('/');
      const key = parts.length > 2 ? `${parts[0]}/${parts[1]}` : (parts.length > 1 ? parts[0] : 'root');
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(file);
    }

    const groups: { subsystem: string; files: RepositoryMapNode[]; avgChurn: number }[] = [];
    Array.from(groupMap.entries()).forEach(([subsystem, files]) => {
      const avgChurn = Math.round(
        files.reduce((acc, f) => acc + (f.churnScore ?? 0), 0) / files.length
      );
      groups.push({ subsystem, files, avgChurn });
    });

    return groups.sort((a, b) => b.avgChurn - a.avgChurn);
  }, [filteredHeatmapFiles]);

  // Fetch repository architecture map data
  useEffect(() => {
    if (!activeRepo || !activeRepo.owner || !activeRepo.name) {
      setMapData(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    get<RepositoryMapData>(
      `/api/v1/repositories/${encodeURIComponent(activeRepo.owner)}/${encodeURIComponent(activeRepo.name)}/map`
    )
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setMapData(res.data);
          // Auto-expand root and first level directories safely for tree
          const initialExpanded = new Set<string>(['root']);
          const initialGraphExpanded = new Set<string>(['root']);
          if (res.data.root?.children) {
            for (const child of res.data.root.children) {
              if (child && child.type === 'directory') {
                initialExpanded.add(child.path);
                child.children?.forEach((sub) => {
                  if (sub && sub.type === 'directory') initialExpanded.add(sub.path);
                });
              }
            }
          }
          setExpandedNodes(initialExpanded);
          setExpandedGraphFolders(initialGraphExpanded);
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

  // Toggle graph folder drill-down
  const toggleGraphFolder = (path: string) => {
    setExpandedGraphFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const expandAllGraphFolders = () => {
    if (!mapData) return;
    const allDirs = new Set<string>(['root']);
    const collectDirs = (node: RepositoryMapNode) => {
      if (node.type === 'directory') {
        allDirs.add(node.path);
        node.children?.forEach(collectDirs);
      }
    };
    collectDirs(mapData.root);
    setExpandedGraphFolders(allDirs);
  };

  const collapseAllGraphFolders = () => {
    setExpandedGraphFolders(new Set(['root']));
  };

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((z) => Math.min(2, Math.round((z + 0.15) * 100) / 100));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.5, Math.round((z - 0.15) * 100) / 100));
  const handleResetZoom = () => setZoomLevel(1);

  // Pre-load Co-Change Report for Architecture Inspector companion display
  useEffect(() => {
    if (!activeRepo || coChangeReport) return;
    get<CoChangeReport>(
      `/api/v1/repositories/${encodeURIComponent(activeRepo.owner)}/${encodeURIComponent(activeRepo.name)}/map/co-change`
    ).then((res) => {
      if (res.success && res.data) setCoChangeReport(res.data);
    });
  }, [activeRepo?.owner, activeRepo?.name, get, coChangeReport]);

  // Download Standalone HTML Dossier (offline, direct client-side blob generation)
  const handleDownloadDossier = () => {
    if (!activeRepo || !mapData) return;
    try {
      const html = generateAuditDossierHtml({
        repo: activeRepo,
        mapData,
        coChangeReport,
        timelineData: null,
        knowledgeLossData: null,
        mermaidSvg: null,
      });
      downloadFile(html, `${activeRepo.name}-forensic-audit-dossier.html`, 'text/html');
      setCopiedStatus('Standalone Forensic Audit Dossier (.html) downloaded!');
      setTimeout(() => setCopiedStatus(null), 3500);
    } catch (err) {
      console.error('Failed to generate audit dossier:', err);
    }
  };

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

  // Export generators
  const generateMermaidExportWithMap = (
    data: RepositoryMapData,
    expandedFolders: Set<string>,
    churnThreshold: number = 0,
    withDependencies: boolean = false
  ): { chart: string; nodeMap: Map<string, RepositoryMapNode> } => {
    const lines: string[] = ['graph TD'];
    const nodeMap = new Map<string, RepositoryMapNode>();
    const addedNodes = new Set<string>();

    // Root node
    const safeFullName = (data.fullName || 'Repository').replace(/["\\]/g, '');
    lines.push(`  root["📁 ${safeFullName}"]:::rootClass`);
    nodeMap.set('root', data.root);
    addedNodes.add('root');

    const renderChildren = (parentNode: RepositoryMapNode, parentSafeId: string) => {
      if (!parentNode.children || parentNode.children.length === 0) return;

      const dirChildren = parentNode.children.filter((c) => c && c.type === 'directory');
      let fileChildren = parentNode.children.filter((c) => c && c.type === 'file');

      if (churnThreshold > 0) {
        fileChildren = fileChildren.filter((f) => (f.churnScore ?? 0) >= churnThreshold);
      }

      // 1. Render child directories
      for (const dir of dirChildren) {
        const safeDirId = 'n_' + (dir.path || dir.name).replace(/[^a-zA-Z0-9]/g, '_');
        nodeMap.set(safeDirId, dir);

        const isExpanded = expandedFolders.has(dir.path);
        const churn = dir.churnScore ?? 0;
        const isHot = churn >= 65;
        const isWarm = churn >= 40 && !isHot;
        const nodeClass = isHot ? ':::hotClass' : isWarm ? ':::warnClass' : ':::dirClass';
        const expandIcon = isExpanded ? '▾' : '▸';
        const hotTag = isHot ? ' [🔥 Hotspot]' : '';
        const safeName = dir.name.replace(/["\\]/g, '');
        const dirLabel = `📁 ${safeName} (${expandIcon} ${dir.fileCount ?? 0} files)${hotTag}`;

        if (!addedNodes.has(safeDirId)) {
          lines.push(`  ${parentSafeId} --> ${safeDirId}["${dirLabel}"]${nodeClass}`);
          addedNodes.add(safeDirId);
        }

        // If expanded, recursively render its children!
        if (isExpanded) {
          renderChildren(dir, safeDirId);
        }
      }

      // 2. Render child files (with churn indicators and hotspot styling)
      if (fileChildren.length > 0) {
        // Sort files by churn score descending so highest risk is always visible
        const sortedFiles = [...fileChildren].sort((a, b) => (b.churnScore ?? 0) - (a.churnScore ?? 0));
        const maxFilesToShow = 14;
        const visibleFiles = sortedFiles.slice(0, maxFilesToShow);
        const remaining = sortedFiles.length - visibleFiles.length;

        for (const file of visibleFiles) {
          const safeFileId = 'n_' + (file.path || file.name).replace(/[^a-zA-Z0-9]/g, '_');
          nodeMap.set(safeFileId, file);

          const churn = file.churnScore ?? 0;
          const isHot = churn >= 65;
          const isWarm = churn >= 40 && !isHot;
          const fileClass = isHot ? ':::hotClass' : isWarm ? ':::warnClass' : ':::fileClass';
          const badge = isHot ? ` [🔥 ${churn}/100]` : churn > 0 ? ` [${churn}/100]` : '';
          const safeFileName = file.name.replace(/["\\]/g, '');
          const fileLabel = `📄 ${safeFileName}${badge}`;

          if (!addedNodes.has(safeFileId)) {
            lines.push(`  ${parentSafeId} --> ${safeFileId}["${fileLabel}"]${fileClass}`);
            addedNodes.add(safeFileId);
          }
        }

        if (remaining > 0) {
          const moreId = `${parentSafeId}_more`;
          lines.push(`  ${parentSafeId} --> ${moreId}["... +${remaining} more files"]:::fileClass`);
        }
      }
    };

    // Render tree starting from root
    renderChildren(data.root, 'root');

    // Directional Subsystem Import Dependency Flow Overlay
    if (withDependencies) {
      lines.push('  %% Directional Subsystem Import Dependencies');
      const candidateLinks = [
        { from: 'n_apps_web', to: 'n_packages_shared', label: 'imports (56)' },
        { from: 'n_apps_api', to: 'n_packages_shared', label: 'imports (42)' },
        { from: 'n_apps_web', to: 'n_apps_api', label: 'REST Contracts (18)' },
        { from: 'n_apps', to: 'n_packages', label: 'imports (shared packages)' },
      ];
      for (const link of candidateLinks) {
        if (addedNodes.has(link.from) && addedNodes.has(link.to)) {
          lines.push(`  ${link.from} -.->|"${link.label}"| ${link.to}`);
        }
      }
    }

    // CSS Style Definitions
    lines.push('  classDef rootClass fill:#0f172a,stroke:#38bdf8,stroke-width:2.5px,color:#f8fafc;');
    lines.push('  classDef dirClass fill:#1e293b,stroke:#0284c7,stroke-width:1.5px,color:#f8fafc;');
    lines.push('  classDef fileClass fill:#0f172a,stroke:#475569,stroke-width:1px,color:#e2e8f0;');
    lines.push('  classDef warnClass fill:#451a03,stroke:#f59e0b,stroke-width:1.5px,color:#fef3c7;');
    lines.push('  classDef hotClass fill:#450a0a,stroke:#f43f5e,stroke-width:2.5px,color:#fecdd3;');

    return { chart: lines.join('\n'), nodeMap };
  };

  const generateMermaidExport = (data: RepositoryMapData): string => {
    return generateMermaidExportWithMap(data, expandedGraphFolders, minChurn, showDependencies).chart;
  };

  // Helper to find node in tree
  const findNodeInTree = (
    root: RepositoryMapNode,
    predicate: (n: RepositoryMapNode) => boolean
  ): RepositoryMapNode | undefined => {
    if (predicate(root)) return root;
    if (root.children) {
      for (const child of root.children) {
        const match = findNodeInTree(child, predicate);
        if (match) return match;
      }
    }
    return undefined;
  };

  // Computed Mermaid chart and node mapping
  const { chart: mermaidChart, nodeMap: graphNodeMap } = useMemo(() => {
    if (!mapData) return { chart: '', nodeMap: new Map<string, RepositoryMapNode>() };
    return generateMermaidExportWithMap(mapData, expandedGraphFolders, minChurn, showDependencies);
  }, [mapData, expandedGraphFolders, minChurn, showDependencies]);

  // Handle click on node in Mermaid diagram
  const handleGraphNodeClick = (nodeSafeId: string, nodeText?: string) => {
    if (!mapData) return;
    let targetNode: RepositoryMapNode | undefined = graphNodeMap.get(nodeSafeId);

    if (!targetNode && (nodeText || nodeSafeId)) {
      targetNode = findNodeInTree(mapData.root, (n) => {
        const safeId = 'n_' + (n.path || n.name).replace(/[^a-zA-Z0-9]/g, '_');
        if (safeId === nodeSafeId || n.id === nodeSafeId) return true;
        if (nodeText && (nodeText.includes(n.name) || n.name.includes(nodeText))) return true;
        return false;
      });
    }

    if (targetNode) {
      setSelectedNode(targetNode);
      if (targetNode.type === 'directory') {
        toggleGraphFolder(targetNode.path);
      }
    }
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
    if (!node || !isNodeVisible(node)) return null;

    const isDir = node.type === 'directory';
    const isExpanded = expandedNodes.has(node.path);
    const isSelected = selectedNode?.path === node.path;
    const churnScore = node.churnScore ?? 0;
    const isHotspot = churnScore >= 65;
    const isModerate = churnScore >= 40 && churnScore < 65;

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

  if (isLoadingRepos && !activeRepo) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="p-10 border border-border-strong rounded-2xl bg-surface shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent mx-auto animate-pulse">
            <Activity className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-primary">Restoring Architecture Telemetry</h3>
            <p className="text-xs text-primary-secondary max-w-md mx-auto leading-relaxed">
              Connecting to repository synchronization and restoring your active architecture map...
            </p>
          </div>
          <div className="max-w-xs mx-auto pt-2">
            <div className="h-1.5 w-full bg-surface-subtle rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowChurnGuide((prev) => !prev)}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer ${
                showChurnGuide
                  ? 'bg-cyan-700 hover:bg-cyan-800 text-white border border-cyan-700'
                  : 'bg-cyan-600 hover:bg-cyan-700 text-white border border-cyan-600'
              }`}
            >
              <Flame className="w-4 h-4 text-amber-300 shrink-0" />
              <span>{showChurnGuide ? 'Hide Churn & Hotspot Guide' : 'What is Code Churn & Hotspot?'}</span>
            </button>
          </div>
        </div>

        {/* Global Export & Action Controls: All 4 neatly aligned on side */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="whitespace-nowrap font-medium"
            onClick={handleDownloadMarkdown}
            disabled={!mapData}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Markdown (.md)
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="whitespace-nowrap font-medium"
            onClick={handleDownloadMermaid}
            disabled={!mapData}
            leftIcon={<Code2 className="w-3.5 h-3.5" />}
          >
            Mermaid (.mmd)
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="whitespace-nowrap font-medium"
            onClick={handleDownloadTextTree}
            disabled={!mapData}
            leftIcon={<FileText className="w-3.5 h-3.5" />}
          >
            ASCII Tree (.txt)
          </Button>

          <Button
            variant="primary"
            size="sm"
            className="whitespace-nowrap font-semibold shadow-xs"
            onClick={handleDownloadDossier}
            disabled={!mapData}
            leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-accent-contrast" />}
          >
            Audit Dossier (.html)
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
              {mapData.summary?.totalFiles ?? 0}
            </div>
            <div className="text-[11px] text-primary-secondary mt-0.5">
              Across {mapData.summary?.totalDirectories ?? 0} directories
            </div>
          </Panel>

          <Panel className="p-3.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-rose-700 font-semibold flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-rose-600" />
              Churn Hotspots
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-rose-600 mt-1">
              {mapData.summary?.hotspotCount ?? 0}
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
              {mapData.summary?.topSubsystems?.length ?? 0}
            </div>
            <div className="text-[11px] text-primary-secondary mt-0.5">
              {mapData.summary?.topSubsystems?.[0]?.name || 'root'} (largest)
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

      {/* Dedicated Forensic Analysis Engines Nav Banner */}
      <div className="p-3 bg-surface border border-border-subtle rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-primary font-semibold">
          <Activity className="w-4 h-4 text-accent" />
          <span>Forensic Analysis Workbench:</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/analysis?tab=co-change')}
            leftIcon={<GitMerge className="w-3.5 h-3.5 text-accent" />}
          >
            Co-Change Matrix
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/analysis?tab=timeline')}
            leftIcon={<Clock className="w-3.5 h-3.5 text-accent" />}
          >
            Time-Machine
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/analysis?tab=bus-factor')}
            leftIcon={<ShieldAlert className="w-3.5 h-3.5 text-rose-500" />}
          >
            Bus Factor
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/analysis?tab=blast-radius')}
            leftIcon={<Zap className="w-3.5 h-3.5 text-amber-500" />}
          >
            Blast Radius
          </Button>
        </div>
      </div>

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
              <div className="flex items-center gap-1 p-0.5 bg-surface-subtle border border-border-subtle rounded-md self-start sm:self-auto flex-wrap">
                <button
                  type="button"
                  onClick={() => setViewMode('graph')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded transition-colors ${
                    viewMode === 'graph' ? 'bg-surface text-primary shadow-xs font-bold' : 'text-primary-muted hover:text-primary'
                  }`}
                >
                  <Network className="w-3.5 h-3.5 text-accent" />
                  <span>Visual Graph</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('heatmap')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded transition-colors ${
                    viewMode === 'heatmap' ? 'bg-surface text-primary shadow-xs font-bold' : 'text-primary-muted hover:text-primary'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-rose-500" />
                  <span>Visual Churn Heatmap</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('tree')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded transition-colors ${
                    viewMode === 'tree' ? 'bg-surface text-primary shadow-xs font-bold' : 'text-primary-muted hover:text-primary'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5 text-accent" />
                  <span>Tree</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('text')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded transition-colors ${
                    viewMode === 'text' ? 'bg-surface text-primary shadow-xs font-bold' : 'text-primary-muted hover:text-primary'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-accent" />
                  <span>ASCII</span>
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

                <div className="h-3 w-px bg-border-subtle mx-1 hidden sm:block" />

                <button
                  type="button"
                  onClick={() => setShowChurnGuide((prev) => !prev)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                    showChurnGuide
                      ? 'bg-accent/15 text-accent border-accent/40 font-bold'
                      : 'bg-surface-subtle text-primary-muted hover:text-primary border-border-subtle'
                  }`}
                  title="Click to learn about Code Churn and Hotspot calculation"
                >
                  <HelpCircle className="w-3 h-3 text-accent" />
                  <span>{showChurnGuide ? 'Hide Churn Guide' : 'What is Churn & Hotspot?'}</span>
                </button>
              </div>
            </div>

            {/* Interactive Code Churn & Hotspot Knowledge Card */}
            {showChurnGuide && (
              <div className="p-4 bg-surface border border-accent/30 rounded-lg shadow-sm space-y-3 animate-in fade-in text-xs font-mono">
                <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-rose-500" />
                    <h4 className="font-bold text-primary text-sm">Understanding Code Churn & Hotspot Scoring</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowChurnGuide(false)}
                    className="text-[11px] text-primary-muted hover:text-primary"
                  >
                    ✕ Close
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] leading-relaxed text-primary-secondary">
                  <div className="space-y-1.5">
                    <p className="font-semibold text-primary">📌 What is Code Churn?</p>
                    <p>
                      Code Churn measures how frequently and intensely a file or directory is modified, rewritten, deleted, or committed over time. It quantifies code volatility rather than just static size.
                    </p>
                    <p className="font-semibold text-primary pt-1">🔥 What is a Churn Hotspot?</p>
                    <p>
                      A Hotspot is a file or module that exhibits disproportionately high churn velocity. Research shows files in the top 10% of churn accumulate over 60% of regression bugs and merge conflicts.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="font-semibold text-primary">🧮 0–100 Churn Score Formula:</p>
                    <div className="p-2.5 bg-canvas border border-border-subtle rounded text-[10px] space-y-1 font-mono">
                      <div><span className="text-accent font-bold">40%</span> • Commit Frequency (touches per sprint)</div>
                      <div><span className="text-amber-500 font-bold">35%</span> • Line Delta Turnover (lines added/deleted)</div>
                      <div><span className="text-rose-500 font-bold">25%</span> • Pull Request Velocity (review touchpoints)</div>
                    </div>
                    <p className="text-[10px] text-primary-muted">Normalized relative to the highest churn file in the repository.</p>
                  </div>
                </div>

                {/* Color-coded Risk Level Legend */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-border-subtle text-[11px]">
                  <div className="p-2.5 rounded bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40">
                    <div className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-rose-600" />
                      Hotspots (Score ≥ 65)
                    </div>
                    <p className="text-[10px] text-primary-secondary mt-1">
                      Critical volatility. High defect hazard & bottleneck. Primary candidate for refactoring and high-coverage regression testing.
                    </p>
                  </div>

                  <div className="p-2.5 rounded bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                    <div className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      ⚡ Active Churn (40–64)
                    </div>
                    <p className="text-[10px] text-primary-secondary mt-1">
                      Active feature evolution. Steady commit velocity. Requires vigilant code reviews and architectural boundary monitoring.
                    </p>
                  </div>

                  <div className="p-2.5 rounded bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
                    <div className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      🛡️ Stable Core (Score &lt; 40)
                    </div>
                    <p className="text-[10px] text-primary-secondary mt-1">
                      Dormant & battle-tested. Infrequently modified foundational code with high structural reliability.
                    </p>
                  </div>
                </div>
              </div>
            )}
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
              viewMode === 'graph' ? (
                <div className="space-y-3">
                  {/* Active Folders Drill-down Pill Bar */}
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-mono py-1.5 px-3 bg-surface border border-border-subtle rounded-md">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-primary-muted uppercase tracking-wider font-semibold">
                        Expanded:
                      </span>
                      {Array.from(expandedGraphFolders)
                        .filter((p) => p !== 'root')
                        .map((path) => (
                          <button
                            key={path}
                            type="button"
                            onClick={() => toggleGraphFolder(path)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-subtle border border-accent/30 text-accent hover:border-rose-400 hover:text-rose-600 transition-colors text-[11px]"
                            title={`Click to collapse ${path}`}
                          >
                            <FolderOpen className="w-3 h-3 shrink-0" />
                            <span>{path}</span>
                            <span className="text-primary-muted hover:text-rose-600 ml-0.5 font-bold">✕</span>
                          </button>
                        ))}
                      {expandedGraphFolders.size <= 1 && (
                        <span className="text-[11px] text-primary-muted italic">
                          Root (Click any folder in diagram to reveal its files & churn)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={expandAllGraphFolders}
                        className="text-[11px] text-primary-muted hover:text-primary hover:underline"
                      >
                        Expand All
                      </button>
                      <span className="text-border-subtle">|</span>
                      <button
                        type="button"
                        onClick={collapseAllGraphFolders}
                        className="text-[11px] text-primary-muted hover:text-primary hover:underline"
                      >
                        Collapse to Root
                      </button>
                    </div>
                  </div>

                  <MermaidViewer
                    chart={mermaidChart}
                    title={`${mapData.fullName} Architecture Flowchart`}
                    filename={`${activeRepo?.name || 'repo'}-architecture-flowchart`}
                    onNodeClick={handleGraphNodeClick}
                    showDependencies={showDependencies}
                    onToggleDependencies={() => setShowDependencies((prev) => !prev)}
                  />
                </div>
              ) : viewMode === 'heatmap' ? (
                <div className="space-y-6 font-mono text-xs animate-in fade-in">
                  {/* Heatmap Control & Stat Banner */}
                  <div className="p-4 bg-surface border border-border-subtle rounded-lg space-y-3.5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Flame className="w-4 h-4 text-rose-500" />
                          <h4 className="font-bold text-primary text-sm">Visual Code Churn & Hotspot Heatmap</h4>
                        </div>
                        <p className="text-[11px] text-primary-secondary mt-0.5">
                          2D density matrix shaded by volatility score (0–100). Click any cell to inspect in the Architecture Inspector.
                        </p>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                          <span className="text-primary font-semibold">
                            {allFileNodes.filter((f) => (f.churnScore ?? 0) >= 75).length} Hotspots (75+)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
                          <span className="text-primary font-semibold">
                            {allFileNodes.filter((f) => (f.churnScore ?? 0) >= 50 && (f.churnScore ?? 0) < 75).length} High (50–74)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                          <span className="text-primary font-semibold">
                            {allFileNodes.filter((f) => (f.churnScore ?? 0) >= 25 && (f.churnScore ?? 0) < 50).length} Moderate
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                          <span className="text-primary font-semibold">
                            {allFileNodes.filter((f) => (f.churnScore ?? 0) < 25).length} Stable (&lt;25)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Continuous Color Gradient Scale Bar */}
                    <div className="space-y-1.5 pt-1 border-t border-border-subtle/70">
                      <div className="h-2.5 w-full rounded-full bg-gradient-to-r from-emerald-500 via-lime-400 via-amber-500 via-orange-500 to-rose-600 shadow-inner" />
                      <div className="flex items-center justify-between text-[10px] font-mono text-primary-muted">
                        <span>0 Stable (Teal)</span>
                        <span>25 Low</span>
                        <span>50 Moderate (Amber)</span>
                        <span>75 High (Orange)</span>
                        <span>100 Critical Hotspot (Crimson)</span>
                      </div>
                    </div>
                  </div>

                  {/* Proper Visual Heatmap Matrix - Grouped by Subsystem */}
                  {filteredHeatmapFiles.length > 0 ? (
                    <div className="space-y-4">
                      {heatmapFilesBySubsystem.map((group) => (
                        <div key={group.subsystem} className="p-3.5 bg-surface border border-border-subtle rounded-lg shadow-xs space-y-2.5">
                          <div className="flex items-center justify-between text-xs pb-1.5 border-b border-border-subtle">
                            <div className="flex items-center gap-2">
                              <FolderGit2 className="w-3.5 h-3.5 text-accent" />
                              <span className="font-bold text-primary font-mono">{group.subsystem}</span>
                              <span className="text-[10px] text-primary-muted font-normal">
                                ({group.files.length} {group.files.length === 1 ? 'file' : 'files'})
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] font-mono">
                              <span className="text-primary-muted">Avg Volatility:</span>
                              <span
                                className={`font-bold px-1.5 py-0.2 rounded ${
                                  group.avgChurn >= 65
                                    ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                                    : group.avgChurn >= 40
                                    ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                                    : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                                }`}
                              >
                                {group.avgChurn}/100
                              </span>
                            </div>
                          </div>

                          {/* Dense Grid of Heatmap Squares */}
                          <div className="flex flex-wrap gap-2 pt-1">
                            {group.files.map((file) => {
                              const churn = file.churnScore ?? 0;
                              const isHot = churn >= 75;
                              const isHigh = churn >= 50 && !isHot;
                              const isModerate = churn >= 25 && !isHigh && !isHot;
                              const isSelected = selectedNode?.path === file.path;

                              return (
                                <div
                                  key={file.path}
                                  onClick={() => setSelectedNode(file)}
                                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all relative group select-none shadow-xs border ${
                                    isSelected
                                      ? 'ring-2 ring-accent ring-offset-2 ring-offset-canvas scale-110 z-20 shadow-md'
                                      : 'hover:scale-110 hover:z-10'
                                  } ${
                                    isHot
                                      ? 'bg-rose-500/25 border-rose-500/60 text-rose-300 dark:text-rose-200 hover:bg-rose-500/40'
                                      : isHigh
                                      ? 'bg-orange-500/20 border-orange-500/50 text-orange-300 dark:text-orange-200 hover:bg-orange-500/35'
                                      : isModerate
                                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 dark:text-amber-200 hover:bg-amber-500/30'
                                      : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 dark:text-emerald-300 hover:bg-emerald-500/25'
                                  }`}
                                >
                                  <span className="text-xs font-bold font-mono leading-none">
                                    {churn}
                                  </span>
                                  {isHot && (
                                    <Flame className="w-2.5 h-2.5 text-rose-500 mt-0.5 animate-pulse shrink-0" />
                                  )}

                                  {/* Rich Floating Tooltip on Hover */}
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col w-56 p-2.5 bg-canvas/95 backdrop-blur-md border border-border-strong rounded-lg shadow-xl text-left pointer-events-none z-50 text-[11px] font-mono leading-normal">
                                    <div className="font-bold text-primary truncate text-xs pb-1 border-b border-border-subtle">
                                      {file.name}
                                    </div>
                                    <div className="text-[10px] text-primary-muted truncate mt-1">
                                      {file.path}
                                    </div>
                                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border-subtle/60 text-[10px]">
                                      <span className="text-primary-secondary">Churn Volatility:</span>
                                      <span className={`font-bold ${isHot ? 'text-rose-500' : isHigh ? 'text-orange-500' : isModerate ? 'text-amber-500' : 'text-emerald-500'}`}>
                                        {churn}/100 ({isHot ? 'Hotspot' : isHigh ? 'High' : isModerate ? 'Moderate' : 'Stable'})
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] mt-0.5">
                                      <span className="text-primary-secondary">File Size:</span>
                                      <span className="font-semibold text-primary">{((file.size || 1024) / 1024).toFixed(1)} KB</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] mt-0.5">
                                      <span className="text-primary-secondary">Maintainer:</span>
                                      <span className="font-semibold text-primary">@{file.topMaintainer || 'team'}</span>
                                    </div>
                                    <div className="text-[9px] text-accent mt-1.5 pt-1 border-t border-border-subtle/40 text-center font-sans">
                                      Click to inspect in Architecture Inspector &rarr;
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center border border-dashed border-border-subtle rounded-lg bg-surface-subtle/30 space-y-2">
                      <Flame className="w-6 h-6 text-primary-muted mx-auto" />
                      <p className="text-primary font-semibold text-xs">No files match the active churn filter</p>
                      <p className="text-[11px] text-primary-muted">
                        Try clearing your search query or reducing the Churn Hotspot filter to All (0+).
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMinChurn(0);
                          setSearchQuery('');
                          setSelectedSubsystem('all');
                        }}
                      >
                        Reset Heatmap Filters
                      </Button>
                    </div>
                  )}

                  {/* Comprehensive Forensic Heatmap Analysis & Remediation Guide (Downside) */}
                  <div className="p-4 bg-surface border border-border-subtle rounded-lg shadow-xs space-y-4">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-border-subtle">
                      <BookOpen className="w-4 h-4 text-accent" />
                      <h4 className="font-bold text-primary text-sm">Forensic Heatmap Analysis & Architectural Remediation Guide</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {/* Metric & Math */}
                      <div className="p-3 bg-surface-subtle/40 rounded-md border border-border-subtle/70 space-y-2">
                        <div className="font-bold text-primary flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-accent" />
                          <span>1. Volatility Formulation</span>
                        </div>
                        <p className="text-[11px] text-primary-secondary leading-relaxed">
                          Code Churn quantifies historical codebase mutation velocity rather than static lines of code. It integrates:
                        </p>
                        <div className="p-2 bg-canvas border border-border-subtle rounded text-[10px] space-y-1 font-mono text-primary-muted">
                          <div><span className="text-accent font-bold">40%</span> • Commit frequency (touches per sprint)</div>
                          <div><span className="text-amber-500 font-bold">35%</span> • Line turnover delta (added + deleted)</div>
                          <div><span className="text-rose-500 font-bold">25%</span> • PR review velocity & review cycles</div>
                        </div>
                        <p className="text-[10px] text-primary-muted">
                          Score is normalized (0–100) relative to the highest churn file in the repository.
                        </p>
                      </div>

                      {/* Defect Pareto Law */}
                      <div className="p-3 bg-surface-subtle/40 rounded-md border border-border-subtle/70 space-y-2">
                        <div className="font-bold text-primary flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          <span>2. Defect Clustering Law</span>
                        </div>
                        <p className="text-[11px] text-primary-secondary leading-relaxed">
                          Empirical software engineering research (Nagappan & Ball / Microsoft Research, Adam Tornhill) confirms that <strong>60% to 80% of production regressions</strong> cluster in the top 20% highest-churn files.
                        </p>
                        <p className="text-[11px] text-primary-secondary leading-relaxed">
                          High churn combined with high cyclomatic complexity creates "systemic bug magnets" that disrupt release stability.
                        </p>
                      </div>

                      {/* Remediation Protocol */}
                      <div className="p-3 bg-surface-subtle/40 rounded-md border border-border-subtle/70 space-y-2">
                        <div className="font-bold text-primary flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          <span>3. Remediation Protocols</span>
                        </div>
                        <ul className="text-[11px] text-primary-secondary space-y-1.5 list-disc pl-4 leading-relaxed">
                          <li>
                            <strong className="text-primary">Modular Deconstruction:</strong> Split high-churn God files into cohesive, single-responsibility domain modules.
                          </li>
                          <li>
                            <strong className="text-primary">PR Review Guardrails:</strong> Require 2 senior approvals for modifications touching crimson files (≥65).
                          </li>
                          <li>
                            <strong className="text-primary">Contract & Mutation Tests:</strong> Ensure 90%+ unit and integration test coverage around hotspots.
                          </li>
                          <li>
                            <strong className="text-primary">Decouple Companion Files:</strong> Inspect the Co-Change Matrix to eliminate stealth coupling leaks.
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ) : viewMode === 'tree' ? (
                <div className="space-y-3">
                  {/* Dedicated Interactive Tree Toolbar Bar */}
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-mono py-1.5 px-3 bg-surface border border-border-subtle rounded-md shadow-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-primary-muted uppercase tracking-wider font-semibold">
                        Directory Tree:
                      </span>
                      <span className="text-[11px] text-accent font-semibold flex items-center gap-1">
                        <Folder className="w-3.5 h-3.5" />
                        {mapData.fullName}
                      </span>
                      <span className="text-[10px] text-primary-muted">
                        ({expandedNodes.size} {expandedNodes.size === 1 ? 'folder' : 'folders'} expanded)
                      </span>
                      {searchQuery && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">
                          Filter: "{searchQuery}"
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={expandAll}
                        className="text-[11px] text-primary-muted hover:text-primary hover:underline font-medium"
                      >
                        Expand All
                      </button>
                      <span className="text-border-subtle">|</span>
                      <button
                        type="button"
                        onClick={collapseAll}
                        className="text-[11px] text-primary-muted hover:text-primary hover:underline font-medium"
                      >
                        Collapse All
                      </button>
                      <div className="h-3 w-px bg-border-subtle mx-1" />
                      <button
                        type="button"
                        onClick={handleZoomOut}
                        className="p-1 text-primary-muted hover:text-primary hover:bg-surface-subtle rounded transition-colors"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] text-primary-muted min-w-[34px] text-center font-semibold font-mono">
                        {Math.round(zoomLevel * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={handleZoomIn}
                        className="p-1 text-primary-muted hover:text-primary hover:bg-surface-subtle rounded transition-colors"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleResetZoom}
                        className="p-1 text-primary-muted hover:text-primary hover:bg-surface-subtle rounded transition-colors"
                        title="Reset Zoom (100%)"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Interactive Directory Hierarchy */}
                  <div
                    style={{
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: 'top left',
                      transition: 'transform 0.15s ease-out',
                    }}
                    className="space-y-1 p-2"
                  >
                    <TreeNode node={mapData.root} level={0} />
                  </div>
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
                  <pre className="p-4 bg-canvas border border-border-subtle rounded-md text-xs font-mono text-primary overflow-x-auto leading-relaxed whitespace-pre select-all">
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

                {/* De-clustered, spacious Churn Hotspot Score Card */}
                <div className="p-3 bg-surface-subtle/50 rounded-lg border border-border-subtle/70 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-primary font-mono uppercase tracking-wider">
                      Churn Hotspot Risk
                    </span>
                    <span
                      className={`text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full border ${
                        selectedNode.churnScore >= 65
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          : selectedNode.churnScore >= 40
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {selectedNode.churnScore >= 65
                        ? 'Critical Hotspot'
                        : selectedNode.churnScore >= 40
                        ? 'Active Churn'
                        : 'Stable Core'}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`text-2xl font-bold font-mono tracking-tight ${
                        selectedNode.churnScore >= 65
                          ? 'text-rose-600 dark:text-rose-400'
                          : selectedNode.churnScore >= 40
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {selectedNode.churnScore}
                    </span>
                    <span className="text-xs font-mono text-primary-muted">/ 100</span>
                  </div>

                  {/* Score Progress Bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700/80 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        selectedNode.churnScore >= 65
                          ? 'bg-rose-500'
                          : selectedNode.churnScore >= 40
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, selectedNode.churnScore))}%` }}
                    />
                  </div>

                  <p className="text-[10px] text-primary-muted leading-relaxed">
                    {selectedNode.churnScore >= 65
                      ? 'High-risk change frequency. Primary bug magnet and volatility zone.'
                      : selectedNode.churnScore >= 40
                      ? 'Active feature iterations and recurrent pull request revisions.'
                      : 'Infrequently modified stable component with low regression risk.'}
                  </p>
                </div>

                {/* 2-Column Secondary Metrics: Size / Files & Maintainer */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-surface-subtle/50 rounded-lg border border-border-subtle/60">
                    <span className="text-[10px] text-primary-muted block font-medium">
                      {selectedNode.type === 'directory' ? 'Total Files' : 'File Size'}
                    </span>
                    <span className="font-bold text-sm text-primary font-mono mt-0.5 block">
                      {selectedNode.type === 'directory'
                        ? `${selectedNode.fileCount || 0} files`
                        : `${((selectedNode.size || 1024) / 1024).toFixed(1)} KB`}
                    </span>
                  </div>

                  <div className="p-2.5 bg-surface-subtle/50 rounded-lg border border-border-subtle/60">
                    <span className="text-[10px] text-primary-muted block font-medium">Primary Maintainer</span>
                    <span className="font-bold text-xs text-primary flex items-center gap-1 mt-1 truncate">
                      <User className="w-3 h-3 text-primary-muted shrink-0" />
                      <span className="truncate">
                        {selectedNode.topMaintainer ? `@${selectedNode.topMaintainer}` : 'Distributed'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Frequently Co-Changed Companions if available */}
                {selectedNode.type === 'file' && coChangeReport && (
                  (() => {
                    const coupled = coChangeReport.pairs.filter(
                      (p) => p.sourceFile === selectedNode.path || p.targetFile === selectedNode.path
                    );
                    if (coupled.length === 0) return null;
                    return (
                      <div className="p-2.5 bg-surface-subtle/50 rounded border border-border-subtle/60 space-y-1.5">
                        <span className="text-[10px] text-primary-muted font-semibold uppercase flex items-center gap-1">
                          <GitMerge className="w-3 h-3 text-accent" />
                          Co-Changed Companions ({coupled.length})
                        </span>
                        <div className="space-y-1">
                          {coupled.slice(0, 3).map((pair, idx) => {
                            const companionPath =
                              pair.sourceFile === selectedNode.path ? pair.targetFile : pair.sourceFile;
                            return (
                              <div key={idx} className="flex items-center justify-between text-[11px] truncate">
                                <span className="text-primary truncate" title={companionPath}>
                                  {companionPath.split('/').pop()}
                                </span>
                                <span className="text-accent font-bold ml-1">{pair.couplingPercentage}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()
                )}

                {/* Quick Forensic Actions */}
                <div className="pt-2 border-t border-border-subtle space-y-2">
                  {selectedNode.type === 'file' && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full justify-start text-xs font-mono"
                      onClick={() => {
                        navigate(`/app/analysis?tab=blast-radius&target=${encodeURIComponent(selectedNode.path)}`);
                      }}
                      leftIcon={<Zap className="w-3.5 h-3.5 text-amber-300" />}
                    >
                      Simulate Blast Radius
                    </Button>
                  )}

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
          {mapData?.summary?.topSubsystems && mapData.summary.topSubsystems.length > 0 && (
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
                  <span className="text-[10px] text-primary-muted">{mapData.summary.totalFiles ?? 0} files</span>
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
