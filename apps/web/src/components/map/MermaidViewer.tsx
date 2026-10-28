import { useEffect, useState, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Copy,
  Check,
  FileCode,
  AlertCircle,
  Network,
} from 'lucide-react';

export interface MermaidViewerProps {
  chart: string;
  title?: string;
  filename?: string;
  onNodeClick?: (nodeId: string, nodeText?: string) => void;
  className?: string;
}

export function MermaidViewer({
  chart,
  title = 'Repository Architecture Flowchart',
  filename = 'architecture-map',
  onNodeClick,
  className = '',
}: MermaidViewerProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [copied, setCopied] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamically render Mermaid chart into SVG
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    async function renderMermaid() {
      try {
        // Dynamically load Mermaid ESM from reliable CDN
        const loadDynamicModule = new Function('url', 'return import(url)') as (
          url: string
        ) => Promise<{ default?: any; render: any; initialize: any }>;
        const mermaidModule = await loadDynamicModule(
          'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs'
        );
        const mermaid = mermaidModule.default || mermaidModule;

        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
          securityLevel: 'loose',
          fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
          flowchart: {
            curve: 'basis',
            htmlLabels: true,
            padding: 16,
            useMaxWidth: false,
          },
        });

        const uniqueId = `mermaid-svg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const { svg } = await mermaid.render(uniqueId, chart);

        if (isMounted) {
          setSvgContent(svg);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          console.error('[MermaidViewer] Render error:', err);
          setError(
            err instanceof Error ? err.message : 'Failed to compile and render architecture flowchart'
          );
          setIsLoading(false);
        }
      }
    }

    void renderMermaid();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(2.5, Math.round((z + 0.15) * 100) / 100));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.4, Math.round((z - 0.15) * 100) / 100));
  const handleResetZoom = () => setZoomLevel(1);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(chart);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleDownloadSvg = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle interactive clicks on SVG nodes (folders & files)
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onNodeClick) return;
    const target = e.target as HTMLElement | SVGElement | null;
    if (!target) return;
    const nodeEl = target.closest('.node');
    if (!nodeEl) return;

    const rawId = nodeEl.getAttribute('id') || '';
    let cleanId = rawId;
    const match = rawId.match(/^flowchart-([a-zA-Z0-9_]+?)(?:-\d+)?$/);
    if (match && match[1]) {
      cleanId = match[1];
    } else {
      cleanId = rawId.replace(/^flowchart-/, '').replace(/-\d+$/, '');
    }

    const textContent = nodeEl.textContent?.trim() || '';
    onNodeClick(cleanId, textContent);
  };

  return (
    <div className={`flex flex-col h-full space-y-2.5 ${className}`}>
      {/* Sleek, Space-Saving Header Controls */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border-subtle">
        {/* Left: Small, clean written title */}
        <div className="flex items-center gap-1.5 min-w-0">
          <Network className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="text-xs font-mono font-medium text-primary truncate max-w-[220px] sm:max-w-md">
            {title}
          </span>
          <span className="hidden sm:inline-block text-[9px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono border border-emerald-500/20 shrink-0">
            SVG
          </span>
        </div>

        {/* Right: Compact Visual/Code Toggle & Logo/Icon Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {/* Visual vs Code Mode Toggle */}
          <div className="flex items-center p-0.5 bg-surface-subtle border border-border-subtle rounded text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setActiveTab('visual')}
              className={`px-2 py-0.5 rounded transition-colors ${
                activeTab === 'visual'
                  ? 'bg-surface text-primary shadow-xs font-semibold'
                  : 'text-primary-muted hover:text-primary'
              }`}
            >
              Graph
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`px-2 py-0.5 rounded transition-colors ${
                activeTab === 'code'
                  ? 'bg-surface text-primary shadow-xs font-semibold'
                  : 'text-primary-muted hover:text-primary'
              }`}
            >
              Code
            </button>
          </div>

          {/* Download Logo Button */}
          {activeTab === 'visual' && svgContent && (
            <button
              type="button"
              onClick={handleDownloadSvg}
              title="Download SVG Vector Image"
              aria-label="Download SVG"
              className="p-1.5 text-primary-muted hover:text-primary hover:bg-surface-subtle border border-border-subtle rounded transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Copy Logo Button */}
          <button
            type="button"
            onClick={handleCopyCode}
            title={copied ? 'Copied code to clipboard!' : 'Copy Mermaid Code'}
            aria-label="Copy Code"
            className="p-1.5 text-primary-muted hover:text-primary hover:bg-surface-subtle border border-border-subtle rounded transition-colors relative"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      {activeTab === 'visual' ? (
        <div
          ref={containerRef}
          onClick={handleContainerClick}
          className="relative flex-1 min-h-[520px] max-h-[720px] overflow-auto bg-slate-50/50 dark:bg-slate-900/40 border border-border-subtle rounded-lg p-6 flex items-center justify-center select-none mermaid-canvas"
        >
          {/* Interactive Node Hover CSS */}
          <style>{`
            .mermaid-canvas .node {
              cursor: pointer !important;
              transition: filter 0.15s ease, opacity 0.15s ease;
            }
            .mermaid-canvas .node:hover {
              filter: brightness(1.25);
              opacity: 0.95;
            }
            .mermaid-canvas .node:active {
              filter: brightness(0.92);
            }
          `}</style>

          {/* Helper hint inside canvas */}
          {!isLoading && !error && svgContent && (
            <div className="absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-surface/90 backdrop-blur-md border border-border-subtle text-[10px] font-mono text-primary-muted shadow-xs pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span>Click folder to expand/collapse • Files show churn score</span>
            </div>
          )}

          {/* In-Image Floating Zoom Overlay */}
          {!isLoading && !error && svgContent && (
            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 bg-surface/90 backdrop-blur-md border border-border-subtle rounded-md px-1.5 py-1 shadow-md text-xs font-mono">
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1 text-primary-muted hover:text-primary hover:bg-surface-subtle rounded transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-primary-muted font-mono min-w-[34px] text-center select-none">
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
              <div className="h-3 w-px bg-border-subtle mx-0.5" />
              <button
                type="button"
                onClick={handleResetZoom}
                className="p-1 text-primary-muted hover:text-primary hover:bg-surface-subtle rounded transition-colors"
                title="Reset Zoom (100%)"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center space-y-3 py-16 text-primary-muted font-mono text-xs">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p>Synthesizing visual architecture flowchart...</p>
            </div>
          ) : error ? (
            <div className="max-w-md p-6 text-center space-y-3 bg-surface border border-rose-200 rounded-md">
              <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
              <h4 className="text-xs font-bold text-primary font-mono">Flowchart Compilation Fallback</h4>
              <p className="text-[11px] text-primary-muted font-mono leading-relaxed">{error}</p>
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className="px-3 py-1.5 rounded bg-surface border border-border-subtle text-xs font-mono hover:bg-surface-subtle"
              >
                View Mermaid Source Code
              </button>
            </div>
          ) : svgContent ? (
            <div
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out',
              }}
              className="w-full flex justify-center py-4"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-[11px] text-primary-muted font-mono flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5 text-accent" />
            <span>Mermaid Specification (Compatible with GitHub Markdown, Notion, and Mermaid Live Editor):</span>
          </div>
          <pre className="p-4 bg-canvas border border-border-subtle rounded-md text-xs font-mono text-primary overflow-x-auto leading-relaxed whitespace-pre select-all">
            {chart}
          </pre>
        </div>
      )}
    </div>
  );
}
