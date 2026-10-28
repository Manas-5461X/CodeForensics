import { useEffect, useState, useRef, useMemo } from 'react';
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
  showDependencies?: boolean;
  onToggleDependencies?: () => void;
  className?: string;
}

export function MermaidViewer({
  chart,
  title = 'Repository Architecture Flowchart',
  filename = 'architecture-map',
  onNodeClick,
  showDependencies = false,
  onToggleDependencies,
  className = '',
}: MermaidViewerProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [copied, setCopied] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const mouseDownPosRef = useRef({ x: 0, y: 0, time: 0 });

  // Extract intrinsic dimensions and offset from the SVG viewBox to prevent clipping and negative coordinate bugs
  const svgDimensions = useMemo(() => {
    if (!svgContent) return null;
    const match = svgContent.match(/viewBox=["']([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)["']/);
    if (match) {
      const minX = parseFloat(match[1]) || 0;
      const minY = parseFloat(match[2]) || 0;
      const width = parseFloat(match[3]);
      const height = parseFloat(match[4]);
      if (width > 0 && height > 0) {
        // If minX is negative, the graph content extends into negative X space.
        // We add Math.abs(minX) + 140px to ensure the entire left branch is fully visible and scrollable.
        const leftPadding = minX < 0 ? Math.abs(minX) + 140 : 140;
        return { minX, minY, width, height, leftPadding };
      }
    }
    return null;
  }, [svgContent]);
  // Dynamically compile and render Mermaid chart into SVG
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    async function renderMermaid() {
      try {
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

  // Wheel & Trackpad Pinch-to-Zoom Handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Touchpad pinch (sends e.ctrlKey === true) OR Ctrl/Meta/Alt + mouse wheel
      if (e.ctrlKey || e.metaKey || e.altKey) {
        e.preventDefault();
        e.stopPropagation();

        // Dampen trackpad pinch and wheel events to prevent high sensitivity
        const normalizedDelta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 16);
        const zoomStep = Math.max(-0.025, Math.min(0.025, -normalizedDelta * 0.001));

        setZoomLevel((prevZoom) => {
          const nextZoom = Math.min(2.5, Math.max(0.35, Math.round((prevZoom + zoomStep) * 1000) / 1000));
          if (Math.abs(nextZoom - prevZoom) < 0.001) return prevZoom;

          const rect = container.getBoundingClientRect();
          const cursorX = e.clientX - rect.left;
          const cursorY = e.clientY - rect.top;
          const factor = nextZoom / prevZoom;

          container.scrollLeft = Math.max(0, (container.scrollLeft + cursorX) * factor - cursorX);
          container.scrollTop = Math.max(0, (container.scrollTop + cursorY) * factor - cursorY);

          return nextZoom;
        });
      }
    };

    // Touch device pinch zoom support
    let initialDistance = 0;
    let startZoom = 1;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const [t1, t2] = [e.touches[0], e.touches[1]];
        initialDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        startZoom = zoomLevel;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDistance > 0) {
        e.preventDefault();
        const [t1, t2] = [e.touches[0], e.touches[1]];
        const currentDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const scale = currentDistance / initialDistance;
        const nextZoom = Math.min(2.5, Math.max(0.35, Math.round(startZoom * scale * 100) / 100));
        setZoomLevel(nextZoom);
      }
    };

    const handleTouchEnd = () => {
      initialDistance = 0;
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [zoomLevel]);

  // Auto-center scroll view when chart renders or expands
  useEffect(() => {
    if (svgContent && containerRef.current) {
      const container = containerRef.current;
      requestAnimationFrame(() => {
        if (container.scrollWidth > container.clientWidth) {
          container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
        }
      });
    }
  }, [svgContent]);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(2.5, Math.round((z + 0.1) * 100) / 100));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.35, Math.round((z - 0.1) * 100) / 100));
  const handleResetZoom = () => {
    setZoomLevel(1);
    if (containerRef.current) {
      const container = containerRef.current;
      requestAnimationFrame(() => {
        container.scrollLeft = Math.max(0, (container.scrollWidth - container.clientWidth) / 2);
        container.scrollTop = 0;
      });
    }
  };

  // Double-click zoom at the specific clicked place with gentle zoom step
  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    // If already zoomed in (>= 1.5x), double-click smoothly resets back to 1.0x (100%)
    if (zoomLevel >= 1.5) {
      handleResetZoom();
      return;
    }

    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const targetZoom = Math.min(2.2, Math.round((zoomLevel + 0.3) * 10) / 10);
    const factor = targetZoom / zoomLevel;

    // Center the double-clicked coordinates in the viewport
    const targetScrollLeft = (container.scrollLeft + clickX) * factor - clickX;
    const targetScrollTop = (container.scrollTop + clickY) * factor - clickY;

    setZoomLevel(targetZoom);

    requestAnimationFrame(() => {
      const left = Math.max(0, targetScrollLeft);
      const top = Math.max(0, targetScrollTop);
      if (typeof container.scrollTo === 'function') {
        container.scrollTo({ left, top, behavior: 'smooth' });
      } else {
        container.scrollLeft = left;
        container.scrollTop = top;
      }
    });
  };

  // Drag-to-pan handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };

    // Don't drag if clicking buttons
    if ((e.target as HTMLElement)?.closest('button')) {
      return;
    }
    const container = containerRef.current;
    if (!container) return;

    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const container = containerRef.current;
    if (!container) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      container.style.cursor = 'grabbing';
    }

    container.scrollLeft = dragStartRef.current.scrollLeft - dx;
    container.scrollTop = dragStartRef.current.scrollTop - dy;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    if (containerRef.current) {
      containerRef.current.style.cursor = '';
    }
  };

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
    // Check total movement distance between mousedown and click
    const dist = Math.hypot(
      e.clientX - mouseDownPosRef.current.x,
      e.clientY - mouseDownPosRef.current.y
    );
    // If user dragged more than 5px or double-clicked, ignore as a click
    if (dist > 5 || e.detail > 1) {
      return;
    }
    if (!onNodeClick) return;
    const target = e.target as HTMLElement | SVGElement | null;
    if (!target) return;
    const nodeEl = target.closest('.node');
    if (!nodeEl) return;

    const rawId = nodeEl.getAttribute('id') || '';
    // Strip flowchart- prefix and trailing -number (e.g. flowchart-n_packages-1 -> n_packages)
    const cleanId = rawId.replace(/^flowchart-/, '').replace(/-\d+$/, '');
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
          {/* Dependency Flow Overlay Toggle */}
          {onToggleDependencies && (
            <button
              type="button"
              onClick={onToggleDependencies}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                showDependencies
                  ? 'bg-accent/15 text-accent border-accent/40 font-bold'
                  : 'bg-surface text-primary-muted hover:text-primary border-border-subtle'
              }`}
              title="Toggle subsystem import dependency flow overlay"
            >
              <Network className="w-3 h-3 text-accent" />
              <span className="hidden sm:inline">Dependency Flow</span>
            </button>
          )}

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
          onDoubleClick={handleDoubleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="relative flex-1 min-h-[520px] max-h-[720px] overflow-auto bg-slate-50/50 dark:bg-slate-900/40 border border-border-subtle rounded-lg select-none mermaid-canvas"
        >
          {/* Interactive Node Hover CSS & Canvas Overflow Fix */}
          <style>{`
            .mermaid-canvas svg {
              overflow: visible !important;
              max-width: none !important;
            }
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

          {/* Helper hint placed at TOP-LEFT so it NEVER interferes with diagram nodes below */}
          {!isLoading && !error && svgContent && showHint && (
            <div className="absolute top-3 left-3 z-10 hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface/90 backdrop-blur-md border border-border-subtle text-[10px] font-mono text-primary-muted shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span>Click folder to expand • Double-click or trackpad pinch to zoom</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHint(false);
                }}
                className="ml-1 text-primary-muted hover:text-primary transition-colors font-bold"
                title="Dismiss hint"
              >
                ✕
              </button>
            </div>
          )}

          {/* In-Image Floating Zoom Overlay placed at TOP-RIGHT so it NEVER interferes with diagram nodes */}
          {!isLoading && !error && svgContent && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-surface/90 backdrop-blur-md border border-border-subtle rounded-md px-1.5 py-1 shadow-md text-xs font-mono">
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1 text-primary-muted hover:text-primary hover:bg-surface-subtle rounded transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-primary-muted font-mono min-w-[34px] text-center select-none font-semibold">
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
            <div className="flex flex-col items-center justify-center space-y-3 py-24 text-primary-muted font-mono text-xs">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p>Synthesizing visual architecture flowchart...</p>
            </div>
          ) : error ? (
            <div className="max-w-md mx-auto my-12 p-6 text-center space-y-3 bg-surface border border-rose-200 rounded-md">
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
              className="inline-block select-none"
              style={{
                width: svgDimensions
                  ? `${Math.ceil((svgDimensions.width + (svgDimensions.leftPadding || 140) + 140) * zoomLevel)}px`
                  : 'max-content',
                height: svgDimensions
                  ? `${Math.ceil((svgDimensions.height + 96) * zoomLevel)}px`
                  : 'max-content',
                minWidth: '100%',
                paddingLeft: `${Math.ceil((svgDimensions?.leftPadding || 140) * zoomLevel)}px`,
                paddingRight: `${Math.ceil(140 * zoomLevel)}px`,
                paddingTop: `${Math.ceil(48 * zoomLevel)}px`,
                paddingBottom: `${Math.ceil(48 * zoomLevel)}px`,
              }}
            >
              <div
                style={{
                  width: svgDimensions ? `${svgDimensions.width}px` : undefined,
                  height: svgDimensions ? `${svgDimensions.height}px` : undefined,
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: '0 0',
                  transition: isDraggingRef.current ? 'none' : 'transform 0.12s ease-out',
                }}
                className="inline-block"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            </div>
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
