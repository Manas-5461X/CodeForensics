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
import { Button } from '../ui/Button.js';

export interface MermaidViewerProps {
  chart: string;
  title?: string;
  filename?: string;
  onNodeClick?: (nodeId: string) => void;
  className?: string;
}

export function MermaidViewer({
  chart,
  title = 'Repository Architecture Flowchart',
  filename = 'architecture-map',
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

  return (
    <div className={`flex flex-col h-full space-y-3 ${className}`}>
      {/* Viewer Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-accent" />
          <span className="text-xs font-semibold text-primary font-mono">{title}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
            SVG Vector Graph
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {/* Visual vs Code Mode Toggle */}
          <div className="flex items-center p-0.5 bg-surface-subtle border border-border-subtle rounded-md text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveTab('visual')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'visual'
                  ? 'bg-surface text-primary shadow-xs font-semibold'
                  : 'text-primary-muted hover:text-primary'
              }`}
            >
              Visual Graph
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'code'
                  ? 'bg-surface text-primary shadow-xs font-semibold'
                  : 'text-primary-muted hover:text-primary'
              }`}
            >
              Mermaid Syntax
            </button>
          </div>

          {/* Zoom Controls (only in visual mode) */}
          {activeTab === 'visual' && !isLoading && !error && (
            <div className="flex items-center gap-1 border border-border-subtle rounded-md px-1 py-0.5 bg-surface">
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1 text-primary-muted hover:text-primary hover:bg-surface-subtle rounded"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-primary-muted font-mono min-w-[34px] text-center">
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
                title="Reset Zoom (100%)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Action Buttons */}
          {activeTab === 'visual' && svgContent && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadSvg}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Download SVG
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyCode}
            leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            {copied ? 'Copied!' : 'Copy Code'}
          </Button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      {activeTab === 'visual' ? (
        <div
          ref={containerRef}
          className="relative flex-1 min-h-[520px] max-h-[720px] overflow-auto bg-slate-50/50 dark:bg-slate-900/40 border border-border-subtle rounded-lg p-6 flex items-center justify-center select-none"
        >
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
              <Button variant="secondary" size="sm" onClick={() => setActiveTab('code')}>
                View Mermaid Source Code
              </Button>
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
