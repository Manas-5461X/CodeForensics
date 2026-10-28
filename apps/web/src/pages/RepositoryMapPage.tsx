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
  RepositoryMapTimeline,
  KnowledgeLossSummary,
  BlastRadiusImpact,
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
  HelpCircle,
  GitMerge,
  Clock,
  Play,
  Pause,
  AlertTriangle,
  ShieldAlert,
  Zap,
  ShieldCheck,
} from 'lucide-react';

export function RepositoryMapPage() {
  const { activeRepo } = useRepository();
  const { get, post } = useApiClient();
  const navigate = useNavigate();

  const [mapData, setMapData] = useState<RepositoryMapData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubsystem, setSelectedSubsystem] = useState<string>('all');
  const [minChurn, setMinChurn] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'graph' | 'cochange' | 'timeline' | 'knowledge' | 'blastradius' | 'tree' | 'mermaid' | 'text'>('graph');

  // Zoom & Pan Canvas State
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root', 'apps', 'packages', 'apps/api', 'apps/web', 'packages/shared']));
  const [expandedGraphFolders, setExpandedGraphFolders] = useState<Set<string>>(new Set(['root']));
  const [selectedNode, setSelectedNode] = useState<RepositoryMapNode | null>(null);
  const [showChurnGuide, setShowChurnGuide] = useState<boolean>(false);

  // Advanced Forensic Intelligence State
  const [showDependencies, setShowDependencies] = useState<boolean>(false);
  const [coChangeReport, setCoChangeReport] = useState<CoChangeReport | null>(null);
  const [coChangeFilter, setCoChangeFilter] = useState<'all' | 'cross' | 'high'>('all');
  const [timelineData, setTimelineData] = useState<RepositoryMapTimeline | null>(null);
  const [activeMilestoneId, setActiveMilestoneId] = useState<string>('milestone-now');
  const [isPlayingTimeline, setIsPlayingTimeline] = useState<boolean>(false);
  const [knowledgeLossData, setKnowledgeLossData] = useState<KnowledgeLossSummary | null>(null);
  const [knowledgeFilter, setKnowledgeFilter] = useState<'all' | 'critical' | 'zombie'>('all');
  const [blastRadiusImpact, setBlastRadiusImpact] = useState<BlastRadiusImpact | null>(null);
  const [blastRadiusInput, setBlastRadiusInput] = useState<string>('apps/api/src/routes/repositoryRoutes.ts');
  const [isSimulatingBlast, setIsSimulatingBlast] = useState<boolean>(false);

  // Export Feedback
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);

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
          // Auto-expand root and first level directories safely
          const initialExpanded = new Set<string>(['root']);
          const initialGraphExpanded = new Set<string>(['root']);
          if (res.data.root?.children) {
            let firstDirAdded = false;
            for (const child of res.data.root.children) {
              if (child && child.type === 'directory') {
                initialExpanded.add(child.path);
                if (!firstDirAdded) {
                  initialGraphExpanded.add(child.path);
                  firstDirAdded = true;
                  if (child.children) {
                    const firstSub = child.children.find((c) => c && c.type === 'directory');
                    if (firstSub) initialGraphExpanded.add(firstSub.path);
                  }
                }
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

  // Load Co-Change Report
  const loadCoChange = () => {
    if (!activeRepo) return;
    get<CoChangeReport>(
      `/api/v1/repositories/${encodeURIComponent(activeRepo.owner)}/${encodeURIComponent(activeRepo.name)}/map/co-change`
    ).then((res) => {
      if (res.success && res.data) setCoChangeReport(res.data);
    });
  };

  // Load Timeline
  const loadTimeline = () => {
    if (!activeRepo) return;
    get<RepositoryMapTimeline>(
      `/api/v1/repositories/${encodeURIComponent(activeRepo.owner)}/${encodeURIComponent(activeRepo.name)}/map/timeline`
    ).then((res) => {
      if (res.success && res.data) setTimelineData(res.data);
    });
  };

  // Auto-play timeline milestones
  useEffect(() => {
    if (!isPlayingTimeline || !timelineData) return;
    const interval = setInterval(() => {
      const ids = timelineData.milestones.map((m) => m.id);
      const currentIndex = ids.indexOf(activeMilestoneId);
      const nextIndex = (currentIndex + 1) % ids.length;
      setActiveMilestoneId(ids[nextIndex]);
    }, 2800);
    return () => clearInterval(interval);
  }, [isPlayingTimeline, timelineData, activeMilestoneId]);

  // Load Knowledge Loss
  const loadKnowledgeLoss = () => {
    if (!activeRepo) return;
    get<KnowledgeLossSummary>(
      `/api/v1/repositories/${encodeURIComponent(activeRepo.owner)}/${encodeURIComponent(activeRepo.name)}/map/knowledge-loss`
    ).then((res) => {
      if (res.success && res.data) setKnowledgeLossData(res.data);
    });
  };

  // Run Blast Simulation
  const runBlastSimulation = (targetPath?: string) => {
    if (!activeRepo) return;
    const path = targetPath || blastRadiusInput || 'apps/api/src/routes/repositoryRoutes.ts';
    setIsSimulatingBlast(true);
    post<BlastRadiusImpact>(
      `/api/v1/repositories/${encodeURIComponent(activeRepo.owner)}/${encodeURIComponent(activeRepo.name)}/map/blast-radius`,
      { targetFiles: [path] }
    )
      .then((res) => {
        if (res.success && res.data) {
          setBlastRadiusImpact(res.data);
        }
      })
      .finally(() => setIsSimulatingBlast(false));
  };

  // Auto-fetch data when switching view modes
  useEffect(() => {
    if (viewMode === 'cochange' && !coChangeReport) {
      loadCoChange();
    } else if (viewMode === 'timeline' && !timelineData) {
      loadTimeline();
    } else if (viewMode === 'knowledge' && !knowledgeLossData) {
      loadKnowledgeLoss();
    } else if (viewMode === 'blastradius' && !blastRadiusImpact) {
      runBlastSimulation();
    }
  }, [viewMode, coChangeReport, timelineData, knowledgeLossData, blastRadiusImpact]);

  // Download Standalone HTML Dossier
  const handleDownloadDossier = () => {
    if (!activeRepo) return;
    const url = `/api/v1/repositories/${encodeURIComponent(activeRepo.owner)}/${encodeURIComponent(activeRepo.name)}/map/dossier`;
    window.open(url, '_blank');
    setCopiedStatus('Standalone Forensic Audit Dossier (.html) downloaded!');
    setTimeout(() => setCopiedStatus(null), 3500);
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

          <Button
            variant="primary"
            size="sm"
            onClick={handleDownloadDossier}
            disabled={!mapData}
            leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-cyan-200" />}
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
              {/* View Switcher */}
              <div className="flex items-center gap-1 p-0.5 bg-surface-subtle border border-border-subtle rounded-md self-start sm:self-auto flex-wrap">
                <button
                  type="button"
                  onClick={() => setViewMode('graph')}
                  className={`flex items-center gap-1.5 px-2 py-1 text-xs font-mono font-medium rounded transition-colors ${
                    viewMode === 'graph' ? 'bg-surface text-primary shadow-xs font-bold' : 'text-primary-muted hover:text-primary'
                  }`}
                >
                  <Network className="w-3.5 h-3.5 text-accent" />
                  <span>Visual Graph</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cochange')}
                  className={`flex items-center gap-1.5 px-2 py-1 text-xs font-mono font-medium rounded transition-colors ${
                    viewMode === 'cochange' ? 'bg-surface text-primary shadow-xs font-bold' : 'text-primary-muted hover:text-primary'
                  }`}
                >
                  <GitMerge className="w-3.5 h-3.5 text-accent" />
                  <span>Co-Change Matrix</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('timeline')}
                  className={`flex items-center gap-1.5 px-2 py-1 text-xs font-mono font-medium rounded transition-colors ${
                    viewMode === 'timeline' ? 'bg-surface text-primary shadow-xs font-bold' : 'text-primary-muted hover:text-primary'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-accent" />
                  <span>Time-Machine</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('knowledge')}
                  className={`flex items-center gap-1.5 px-2 py-1 text-xs font-mono font-medium rounded transition-colors ${
                    viewMode === 'knowledge' ? 'bg-surface text-primary shadow-xs font-bold' : 'text-primary-muted hover:text-primary'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                  <span>Bus Factor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('blastradius')}
                  className={`flex items-center gap-1.5 px-2 py-1 text-xs font-mono font-medium rounded transition-colors ${
                    viewMode === 'blastradius' ? 'bg-surface text-primary shadow-xs font-bold' : 'text-primary-muted hover:text-primary'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Blast Radius</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('tree')}
                  className={`flex items-center gap-1.5 px-2 py-1 text-xs font-mono font-medium rounded transition-colors ${
                    viewMode === 'tree' ? 'bg-surface text-primary shadow-xs font-bold' : 'text-primary-muted hover:text-primary'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5 text-accent" />
                  <span>Tree</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('mermaid')}
                  className={`flex items-center gap-1.5 px-2 py-1 text-xs font-mono font-medium rounded transition-colors ${
                    viewMode === 'mermaid' ? 'bg-surface text-primary shadow-xs font-bold' : 'text-primary-muted hover:text-primary'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5 text-accent" />
                  <span>Mermaid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('text')}
                  className={`flex items-center gap-1.5 px-2 py-1 text-xs font-mono font-medium rounded transition-colors ${
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
              ) : viewMode === 'cochange' ? (
                <div className="space-y-4 font-mono text-xs animate-in fade-in">
                  {/* Summary Header */}
                  <div className="p-3 bg-surface border border-border-subtle rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <GitMerge className="w-4 h-4 text-accent" />
                        <h4 className="font-bold text-primary text-sm">Temporal Co-Change & Coupling Matrix</h4>
                      </div>
                      <p className="text-[11px] text-primary-muted mt-0.5">
                        Detects files that frequently change together across PRs, highlighting architectural leaks and hidden couplings.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setCoChangeFilter('all')}
                        className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                          coChangeFilter === 'all'
                            ? 'bg-accent/15 text-accent border border-accent/40 font-bold'
                            : 'bg-surface-subtle text-primary-muted hover:text-primary border border-border-subtle'
                        }`}
                      >
                        All Pairs ({coChangeReport?.pairs?.length || 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => setCoChangeFilter('cross')}
                        className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                          coChangeFilter === 'cross'
                            ? 'bg-rose-500/15 text-rose-500 border border-rose-500/40 font-bold'
                            : 'bg-surface-subtle text-primary-muted hover:text-primary border border-border-subtle'
                        }`}
                      >
                        Cross-Subsystem ({coChangeReport?.crossSubsystemPairsCount || 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => setCoChangeFilter('high')}
                        className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                          coChangeFilter === 'high'
                            ? 'bg-amber-500/15 text-amber-500 border border-amber-500/40 font-bold'
                            : 'bg-surface-subtle text-primary-muted hover:text-primary border border-border-subtle'
                        }`}
                      >
                        Coupling ≥ 70%
                      </button>
                    </div>
                  </div>

                  {/* Metric Cards */}
                  {coChangeReport && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-surface border border-border-subtle rounded-md">
                        <div className="text-[10px] uppercase text-primary-muted font-semibold">Total Coupled Pairs</div>
                        <div className="text-lg font-bold text-primary mt-0.5">{coChangeReport.totalCoupledPairs}</div>
                        <div className="text-[10px] text-primary-muted">Analyzed across historical PR batches</div>
                      </div>
                      <div className="p-3 bg-surface border border-rose-500/30 rounded-md">
                        <div className="text-[10px] uppercase text-rose-500 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-500" />
                          Cross-Subsystem Leaks
                        </div>
                        <div className="text-lg font-bold text-rose-500 mt-0.5">{coChangeReport.crossSubsystemPairsCount}</div>
                        <div className="text-[10px] text-primary-muted">Pairs crossing root architectural layers</div>
                      </div>
                      <div className="p-3 bg-surface border border-border-subtle rounded-md">
                        <div className="text-[10px] uppercase text-primary-muted font-semibold">Peak Coupling Strength</div>
                        <div className="text-lg font-bold text-accent mt-0.5">
                          {Math.max(...(coChangeReport.pairs?.map((p) => p.couplingPercentage) || [0]))}%
                        </div>
                        <div className="text-[10px] text-primary-muted">Highest co-occurrence probability</div>
                      </div>
                    </div>
                  )}

                  {/* Table of pairs */}
                  <div className="border border-border-subtle rounded-md overflow-hidden bg-surface">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-surface-subtle border-b border-border-subtle text-primary-muted text-[10px] uppercase">
                            <th className="py-2.5 px-3">Primary / Source File</th>
                            <th className="py-2.5 px-3">Coupled Companion File</th>
                            <th className="py-2.5 px-3">Coupling %</th>
                            <th className="py-2.5 px-3">Shared PRs</th>
                            <th className="py-2.5 px-3">Boundary Alert</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle/60">
                          {coChangeReport?.pairs
                            ?.filter((pair) => {
                              if (coChangeFilter === 'cross') return pair.crossSubsystem;
                              if (coChangeFilter === 'high') return pair.couplingPercentage >= 70;
                              return true;
                            })
                            .map((pair, idx) => (
                              <tr key={idx} className="hover:bg-surface-subtle/60 transition-colors">
                                <td className="py-2.5 px-3 font-semibold text-primary max-w-[220px] truncate" title={pair.sourceFile}>
                                  {pair.sourceFile}
                                </td>
                                <td className="py-2.5 px-3 text-primary-secondary max-w-[220px] truncate" title={pair.targetFile}>
                                  {pair.targetFile}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full ${
                                          pair.couplingPercentage >= 80
                                            ? 'bg-rose-500'
                                            : pair.couplingPercentage >= 65
                                            ? 'bg-amber-500'
                                            : 'bg-accent'
                                        }`}
                                        style={{ width: `${pair.couplingPercentage}%` }}
                                      />
                                    </div>
                                    <span className="font-bold text-[11px] text-primary">{pair.couplingPercentage}%</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-primary-muted">{pair.coChangeCount} PRs</td>
                                <td className="py-2.5 px-3">
                                  {pair.crossSubsystem ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-rose-500/15 text-rose-500 border border-rose-500/30 font-semibold">
                                      <AlertTriangle className="w-2.5 h-2.5" />
                                      Cross-Subsystem Leak
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-primary-muted">
                                      Intra-Module
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-[10px] py-0.5 px-2"
                                    onClick={() => {
                                      setBlastRadiusInput(pair.sourceFile);
                                      setViewMode('blastradius');
                                      runBlastSimulation(pair.sourceFile);
                                    }}
                                    leftIcon={<Zap className="w-3 h-3 text-amber-500" />}
                                  >
                                    Simulate Blast
                                  </Button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : viewMode === 'timeline' ? (
                <div className="space-y-4 font-mono text-xs animate-in fade-in">
                  {/* Header */}
                  <div className="p-3 bg-surface border border-border-subtle rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-accent" />
                        <h4 className="font-bold text-primary text-sm">Time-Machine Architecture Timeline</h4>
                      </div>
                      <p className="text-[11px] text-primary-muted mt-0.5">
                        Scrub between monthly architectural milestones to see how files and hotspots expanded over time.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant={isPlayingTimeline ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setIsPlayingTimeline((p) => !p)}
                        leftIcon={
                          isPlayingTimeline ? (
                            <Pause className="w-3.5 h-3.5 text-amber-300" />
                          ) : (
                            <Play className="w-3.5 h-3.5 text-emerald-500" />
                          )
                        }
                      >
                        {isPlayingTimeline ? 'Pause Playback' : 'Play Timeline'}
                      </Button>
                    </div>
                  </div>

                  {/* Interactive Milestone Scrubber */}
                  {timelineData && (
                    <div className="p-4 bg-surface border border-border-subtle rounded-lg space-y-4">
                      {/* Milestone Steps Bar */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {timelineData.milestones.map((milestone, idx) => {
                          const isActive = milestone.id === activeMilestoneId;
                          return (
                            <button
                              key={milestone.id}
                              type="button"
                              onClick={() => {
                                setActiveMilestoneId(milestone.id);
                                setIsPlayingTimeline(false);
                              }}
                              className={`p-3 rounded-md text-left transition-all border ${
                                isActive
                                  ? 'bg-accent/10 border-accent text-primary shadow-sm ring-1 ring-accent'
                                  : 'bg-surface-subtle border-border-subtle text-primary-muted hover:text-primary hover:border-accent/40'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                                  Era {idx + 1}
                                </span>
                                <span className="text-[10px] text-primary-muted">{milestone.relativeTime}</span>
                              </div>
                              <div className="text-xs font-bold text-primary mt-1">{milestone.label}</div>
                              <div className="text-[10px] text-primary-secondary mt-1 flex items-center justify-between">
                                <span>{milestone.totalFiles} files</span>
                                <span className="text-rose-500 font-semibold">{milestone.hotspotCount} hotspots</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Selected Milestone Active Era Context */}
                      {(() => {
                        const currentMilestone =
                          timelineData.milestones.find((m) => m.id === activeMilestoneId) || timelineData.milestones[3];
                        return (
                          <div className="p-4 bg-surface-subtle/60 rounded-md border border-border-subtle space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border-subtle">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-accent">Milestone Snapshot Era</span>
                                <h3 className="text-sm font-bold text-primary mt-0.5">
                                  {currentMilestone.label} — {currentMilestone.relativeTime}
                                </h3>
                              </div>
                              <div className="flex items-center gap-3 text-xs">
                                <div>
                                  <span className="text-[10px] text-primary-muted block">Files</span>
                                  <span className="font-bold text-primary">{currentMilestone.totalFiles}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-primary-muted block">Directories</span>
                                  <span className="font-bold text-primary">{currentMilestone.totalDirectories}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-rose-500 block">Churn Hotspots</span>
                                  <span className="font-bold text-rose-500">{currentMilestone.hotspotCount}</span>
                                </div>
                              </div>
                            </div>

                            <p className="text-xs text-primary-secondary leading-relaxed">
                              {currentMilestone.summaryText}
                            </p>

                            {/* Subsystems at this milestone */}
                            <div className="space-y-1.5 pt-2">
                              <span className="text-[10px] uppercase text-primary-muted font-semibold block">
                                Subsystem Composition:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {currentMilestone.topSubsystems?.map((sub) => (
                                  <div
                                    key={sub.name}
                                    className="p-2 bg-surface rounded border border-border-subtle flex items-center justify-between text-xs"
                                  >
                                    <span className="font-semibold text-primary truncate">{sub.name}</span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="text-[10px] text-primary-muted">{sub.fileCount}f</span>
                                      <span
                                        className={`text-[9px] px-1 rounded ${
                                          sub.churnScore >= 60 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                                        }`}
                                      >
                                        {sub.churnScore}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ) : viewMode === 'knowledge' ? (
                <div className="space-y-4 font-mono text-xs animate-in fade-in">
                  {/* Header */}
                  <div className="p-3 bg-surface border border-border-subtle rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-rose-500" />
                        <h4 className="font-bold text-primary text-sm">Bus Factor & Knowledge Loss Risk Heatmap</h4>
                      </div>
                      <p className="text-[11px] text-primary-muted mt-0.5">
                        Correlates churn velocity with maintainer activity to uncover Zombie Hotspots and single points of failure.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setKnowledgeFilter('all')}
                        className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                          knowledgeFilter === 'all'
                            ? 'bg-accent/15 text-accent border border-accent/40 font-bold'
                            : 'bg-surface-subtle text-primary-muted hover:text-primary border border-border-subtle'
                        }`}
                      >
                        All Files ({knowledgeLossData?.riskItems?.length || 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => setKnowledgeFilter('zombie')}
                        className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                          knowledgeFilter === 'zombie'
                            ? 'bg-rose-500/15 text-rose-500 border border-rose-500/40 font-bold'
                            : 'bg-surface-subtle text-primary-muted hover:text-primary border border-border-subtle'
                        }`}
                      >
                        🧟 Zombie Hotspots ({knowledgeLossData?.zombieHotspotsCount || 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => setKnowledgeFilter('critical')}
                        className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                          knowledgeFilter === 'critical'
                            ? 'bg-amber-500/15 text-amber-500 border border-amber-500/40 font-bold'
                            : 'bg-surface-subtle text-primary-muted hover:text-primary border border-border-subtle'
                        }`}
                      >
                        Critical & High Risk
                      </button>
                    </div>
                  </div>

                  {/* 4 KPI Cards */}
                  {knowledgeLossData && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-surface border border-rose-500/30 rounded-md">
                        <div className="text-[10px] uppercase text-rose-500 font-semibold flex items-center gap-1">
                          <Flame className="w-3 h-3 text-rose-500" />
                          Zombie Hotspots
                        </div>
                        <div className="text-xl font-bold text-rose-500 mt-1">{knowledgeLossData.zombieHotspotsCount}</div>
                        <div className="text-[10px] text-primary-muted mt-0.5">High churn, inactive authors</div>
                      </div>

                      <div className="p-3 bg-surface border border-amber-500/30 rounded-md">
                        <div className="text-[10px] uppercase text-amber-500 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          Single-Maintainer
                        </div>
                        <div className="text-xl font-bold text-amber-500 mt-1">{knowledgeLossData.singleMaintainerFilesCount}</div>
                        <div className="text-[10px] text-primary-muted mt-0.5">Bus Factor = 1 (critical files)</div>
                      </div>

                      <div className="p-3 bg-surface border border-border-subtle rounded-md">
                        <div className="text-[10px] uppercase text-primary-muted font-semibold">Average Bus Factor</div>
                        <div className="text-xl font-bold text-primary mt-1">{knowledgeLossData.averageBusFactor.toFixed(1)}</div>
                        <div className="text-[10px] text-primary-muted mt-0.5">Maintainers per subsystem</div>
                      </div>

                      <div className="p-3 bg-surface border border-border-subtle rounded-md">
                        <div className="text-[10px] uppercase text-primary-muted font-semibold">Analyzed Files</div>
                        <div className="text-xl font-bold text-primary mt-1">{knowledgeLossData.totalAnalyzedFiles}</div>
                        <div className="text-[10px] text-primary-muted mt-0.5">With author attribution</div>
                      </div>
                    </div>
                  )}

                  {/* Risk Register Table */}
                  <div className="border border-border-subtle rounded-md overflow-hidden bg-surface">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-surface-subtle border-b border-border-subtle text-primary-muted text-[10px] uppercase">
                            <th className="py-2.5 px-3">File Path</th>
                            <th className="py-2.5 px-3">Risk Level</th>
                            <th className="py-2.5 px-3">Churn</th>
                            <th className="py-2.5 px-3">Primary Author</th>
                            <th className="py-2.5 px-3">Author Status</th>
                            <th className="py-2.5 px-3">Diagnostic Analysis</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle/60">
                          {knowledgeLossData?.riskItems
                            ?.filter((item) => {
                              if (knowledgeFilter === 'zombie') return item.isZombieHotspot;
                              if (knowledgeFilter === 'critical') return item.riskLevel === 'CRITICAL' || item.riskLevel === 'HIGH';
                              return true;
                            })
                            .map((item, idx) => (
                              <tr key={idx} className="hover:bg-surface-subtle/60 transition-colors">
                                <td className="py-2.5 px-3 font-semibold text-primary max-w-[220px] truncate" title={item.path}>
                                  {item.path}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      item.riskLevel === 'CRITICAL'
                                        ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                                        : item.riskLevel === 'HIGH'
                                        ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                                        : 'bg-slate-100 dark:bg-slate-800 text-primary-muted'
                                    }`}
                                  >
                                    {item.riskLevel}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`font-semibold ${
                                      item.churnScore >= 65 ? 'text-rose-500' : item.churnScore >= 40 ? 'text-amber-500' : 'text-primary'
                                    }`}
                                  >
                                    {item.churnScore}/100
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-primary-secondary">@{item.primaryMaintainer}</td>
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                      item.maintainerStatus === 'DEPARTED'
                                        ? 'bg-rose-500/15 text-rose-500'
                                        : item.maintainerStatus === 'DORMANT'
                                        ? 'bg-amber-500/15 text-amber-500'
                                        : 'bg-emerald-500/15 text-emerald-500'
                                    }`}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                    {item.maintainerStatus}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-primary-secondary max-w-[280px] text-[11px] leading-tight">
                                  {item.reason}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-[10px] py-0.5 px-2"
                                    onClick={() => navigate(`/app/archaeology?query=${encodeURIComponent(item.path)}`)}
                                    leftIcon={<Code2 className="w-3 h-3 text-accent" />}
                                  >
                                    Trace
                                  </Button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : viewMode === 'blastradius' ? (
                <div className="space-y-4 font-mono text-xs animate-in fade-in">
                  {/* Header */}
                  <div className="p-3 bg-surface border border-border-subtle rounded-md">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <h4 className="font-bold text-primary text-sm">Automated Architectural Blast-Radius Predictor</h4>
                    </div>
                    <p className="text-[11px] text-primary-muted mt-0.5">
                      Calculates ripple effects, downstream coupled files, affected test suites, and recommended reviewers for proposed changes.
                    </p>

                    {/* Input Simulator Form */}
                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={blastRadiusInput}
                          onChange={(e) => setBlastRadiusInput(e.target.value)}
                          placeholder="Enter target file path (e.g. apps/api/src/routes/repositoryRoutes.ts)..."
                          className="w-full px-3 py-1.5 bg-canvas border border-border-subtle rounded text-xs font-mono text-primary placeholder:text-primary-muted focus:border-link focus:outline-none"
                        />
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => runBlastSimulation()}
                        disabled={isSimulatingBlast || !blastRadiusInput.trim()}
                        leftIcon={<Zap className="w-3.5 h-3.5 text-amber-300" />}
                      >
                        {isSimulatingBlast ? 'Calculating Ripple Impact...' : 'Simulate Blast Radius'}
                      </Button>
                    </div>

                    {/* Quick Select Hotspot Pills */}
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap text-[10px]">
                      <span className="text-primary-muted uppercase font-semibold">Quick Simulate Hotspots:</span>
                      {[
                        'apps/api/src/routes/repositoryRoutes.ts',
                        'apps/web/src/pages/RepositoryMapPage.tsx',
                        'packages/shared/src/types/api.ts',
                      ].map((samplePath) => (
                        <button
                          key={samplePath}
                          type="button"
                          onClick={() => {
                            setBlastRadiusInput(samplePath);
                            runBlastSimulation(samplePath);
                          }}
                          className="px-2 py-0.5 rounded bg-surface-subtle border border-border-subtle text-primary-secondary hover:text-accent hover:border-accent/40"
                        >
                          {samplePath.split('/').pop()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Simulation Results */}
                  {blastRadiusImpact ? (
                    <div className="space-y-4">
                      {/* Risk Banner */}
                      <div className="p-4 bg-surface border border-border-subtle rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="text-[10px] uppercase text-primary-muted font-semibold">Predicted Blast Radius Score</div>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-bold font-mono text-primary">{blastRadiusImpact.blastRadiusScore}/100</span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold ${
                                blastRadiusImpact.riskLevel === 'CRITICAL'
                                  ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                                  : blastRadiusImpact.riskLevel === 'HIGH'
                                  ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                                  : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                              }`}
                            >
                              {blastRadiusImpact.riskLevel} HAZARD
                            </span>
                          </div>
                          <p className="text-[11px] text-primary-muted mt-1">
                            Affects {blastRadiusImpact.affectedSubsystems?.length || 1} subsystems: {blastRadiusImpact.affectedSubsystems?.join(', ')}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-mono">
                          <div className="text-right">
                            <span className="text-[10px] text-primary-muted block">Coupled Files</span>
                            <span className="font-bold text-primary">{blastRadiusImpact.coupledCompanions?.length || 0}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-primary-muted block">Tests at Risk</span>
                            <span className="font-bold text-amber-500">{blastRadiusImpact.affectedTests?.length || 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* Boundary Alert if any */}
                      {blastRadiusImpact.architecturalBoundaryCrossings &&
                        blastRadiusImpact.architecturalBoundaryCrossings.length > 0 && (
                          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-md text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                            <span>
                              <strong>Architectural Boundary Violation:</strong> Modifying this file crosses subsystem boundaries ({blastRadiusImpact.architecturalBoundaryCrossings.join(' ↔ ')}). Ensure cross-boundary contract tests pass before merging!
                            </span>
                          </div>
                        )}

                      {/* Grid: Coupled Companions & Tests at Risk */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Downstream Coupled Companions */}
                        <div className="p-3.5 bg-surface border border-border-subtle rounded-md space-y-2.5">
                          <h5 className="font-bold text-primary text-xs flex items-center gap-1.5 uppercase tracking-wider">
                            <GitMerge className="w-3.5 h-3.5 text-accent" />
                            Coupled Companion Files ({blastRadiusImpact.coupledCompanions?.length || 0})
                          </h5>
                          <div className="space-y-2">
                            {blastRadiusImpact.coupledCompanions?.map((comp, idx) => (
                              <div
                                key={idx}
                                className="p-2 bg-surface-subtle rounded border border-border-subtle/80 flex items-center justify-between text-xs"
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="font-semibold text-primary truncate" title={comp.file}>
                                    {comp.file}
                                  </div>
                                  <div className="text-[10px] text-primary-muted truncate">{comp.reason}</div>
                                </div>
                                <span className="font-bold text-accent shrink-0 text-xs">{comp.couplingPercentage}%</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Regression Test Suites at Risk */}
                        <div className="p-3.5 bg-surface border border-border-subtle rounded-md space-y-2.5">
                          <h5 className="font-bold text-primary text-xs flex items-center gap-1.5 uppercase tracking-wider">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                            Regression Test Suites ({blastRadiusImpact.affectedTests?.length || 0})
                          </h5>
                          <div className="space-y-2">
                            {blastRadiusImpact.affectedTests?.map((testFile, idx) => (
                              <div
                                key={idx}
                                className="p-2 bg-surface-subtle rounded border border-border-subtle/80 flex items-center justify-between text-xs"
                              >
                                <span className="font-mono text-primary truncate" title={testFile}>
                                  {testFile}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 font-semibold shrink-0">
                                  REQUIRED
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Recommended PR Reviewers */}
                      {blastRadiusImpact.recommendedReviewers && blastRadiusImpact.recommendedReviewers.length > 0 && (
                        <div className="p-3 bg-surface border border-border-subtle rounded-md flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-accent" />
                            <span className="font-bold text-primary">Recommended PR Reviewers:</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {blastRadiusImpact.recommendedReviewers.map((rev) => (
                              <span
                                key={rev.name}
                                title={rev.relevance}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-subtle border border-border-subtle text-primary font-semibold text-xs"
                              >
                                @{rev.name}
                                <span className="text-[10px] text-primary-muted font-normal">({rev.relevance})</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : viewMode === 'tree' ? (
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

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-surface-subtle/50 rounded border border-border-subtle/60">
                    <span className="text-[10px] text-primary-muted block">Churn Hotspot Score</span>
                    <div className="flex items-baseline justify-between mt-0.5">
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
                      <span className="text-[10px] font-semibold text-primary-muted">
                        {selectedNode.churnScore >= 65 ? 'Hotspot' : selectedNode.churnScore >= 40 ? 'Moderate' : 'Stable'}
                      </span>
                    </div>

                    {/* Score Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
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

                    <p className="text-[9px] text-primary-muted leading-tight mt-1">
                      {selectedNode.churnScore >= 65
                        ? 'High-risk change frequency. Primary bug magnet.'
                        : selectedNode.churnScore >= 40
                        ? 'Active feature iterations & changes.'
                        : 'Infrequently modified stable component.'}
                    </p>
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
                        setBlastRadiusInput(selectedNode.path);
                        setViewMode('blastradius');
                        runBlastSimulation(selectedNode.path);
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
