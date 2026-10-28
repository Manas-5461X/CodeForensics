import React from 'react';
import { cn } from '../../utils/cn.js';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded bg-slate-200 dark:bg-slate-700/60', className)}
      {...props}
    />
  );
}

export function TableSkeleton({
  rows = 7,
  message = 'Loading repository work items...',
}: {
  rows?: number;
  message?: string;
}) {
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div className="flex items-center justify-between pb-2.5 border-b border-border-subtle">
        <div className="flex items-center gap-2 text-xs font-mono text-primary font-semibold">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-accent border-t-transparent animate-spin shrink-0" />
          <span>{message}</span>
        </div>
        <div className="w-24 h-4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
      </div>

      <div className="space-y-2">
        {/* Table header skeleton */}
        <div className="grid grid-cols-12 gap-3 h-8 items-center px-4 bg-surface-subtle/80 rounded border border-border-subtle/50">
          <div className="col-span-2 h-3.5 w-16 rounded bg-slate-300 dark:bg-slate-600 animate-pulse" />
          <div className="col-span-6 h-3.5 w-32 rounded bg-slate-300 dark:bg-slate-600 animate-pulse" />
          <div className="col-span-2 h-3.5 w-20 rounded bg-slate-300 dark:bg-slate-600 animate-pulse hidden md:block" />
          <div className="col-span-2 h-3.5 w-14 rounded bg-slate-300 dark:bg-slate-600 animate-pulse ml-auto" />
        </div>

        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-12 gap-3 p-3.5 bg-surface border border-border-subtle rounded items-center shadow-xs"
          >
            {/* Type icon & Number */}
            <div className="col-span-2 flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse shrink-0" />
              <div
                className="h-3.5 rounded bg-slate-200 dark:bg-slate-700 animate-pulse"
                style={{ width: `${32 + (i % 3) * 8}px` }}
              />
            </div>

            {/* Title & snippet */}
            <div className="col-span-10 md:col-span-6 space-y-1.5">
              <div
                className="h-3.5 rounded bg-slate-200 dark:bg-slate-700 animate-pulse"
                style={{ width: `${55 + (i % 4) * 12}%` }}
              />
              <div
                className="h-2.5 rounded bg-slate-100 dark:bg-slate-800 animate-pulse hidden sm:block"
                style={{ width: `${35 + (i % 3) * 15}%` }}
              />
            </div>

            {/* Author */}
            <div className="col-span-2 hidden md:flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse shrink-0" />
              <div className="w-16 h-3 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>

            {/* State badge */}
            <div className="col-span-2 hidden md:flex justify-end">
              <div className="w-16 h-5 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailDrawerSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title & Metadata */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <Skeleton className="w-20 h-5 rounded" />
          <Skeleton className="w-16 h-5 rounded-full" />
        </div>
        <Skeleton className="h-6 w-5/6 rounded" />
        <div className="flex items-center gap-3 pt-1">
          <Skeleton className="w-24 h-3.5 rounded" />
          <Skeleton className="w-32 h-3.5 rounded" />
        </div>
      </div>

      {/* Tab bar skeleton */}
      <div className="flex gap-4 border-b border-border-subtle pb-1">
        <Skeleton className="w-28 h-6 rounded" />
        <Skeleton className="w-32 h-6 rounded" />
        <Skeleton className="w-28 h-6 rounded" />
      </div>

      {/* Card 1: Description box */}
      <div className="p-4 bg-surface rounded-md border border-border-subtle space-y-3">
        <Skeleton className="w-28 h-4 rounded" />
        <div className="space-y-2 pt-1">
          <Skeleton className="w-full h-3.5 rounded" />
          <Skeleton className="w-11/12 h-3.5 rounded" />
          <Skeleton className="w-4/5 h-3.5 rounded" />
          <Skeleton className="w-2/3 h-3.5 rounded" />
        </div>
      </div>

      {/* Card 2: Metadata */}
      <div className="p-4 bg-surface-subtle/50 rounded-md border border-border-subtle space-y-2">
        <Skeleton className="w-36 h-4 rounded" />
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Skeleton className="h-3 rounded" />
          <Skeleton className="h-3 rounded" />
          <Skeleton className="h-3 rounded" />
          <Skeleton className="h-3 rounded" />
        </div>
      </div>
    </div>
  );
}

export function TimelineSkeleton({ count = 3 }: { count?: number } = {}) {
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div className="flex items-center gap-2 text-xs font-mono text-primary font-medium pb-2 border-b border-border-subtle">
        <div className="w-3.5 h-3.5 rounded-full border-2 border-accent border-t-transparent animate-spin shrink-0" />
        <span>Retrieving discussion timeline comments...</span>
      </div>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="p-4 bg-surface border border-border-subtle rounded-md space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="w-6 h-6 rounded-full" />
              <Skeleton className="w-24 h-3.5 rounded" />
            </div>
            <Skeleton className="w-28 h-3 rounded" />
          </div>
          <div className="space-y-1.5 pl-8">
            <Skeleton className="w-full h-3 rounded" />
            <Skeleton className="w-4/5 h-3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DiffSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div className="flex items-center justify-between p-3 bg-surface-subtle rounded-md border border-border-subtle">
        <div className="flex items-center gap-2 text-xs font-mono text-primary font-medium">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-accent border-t-transparent animate-spin shrink-0" />
          <span>Analyzing unified code diff & modified files...</span>
        </div>
        <Skeleton className="w-24 h-4 rounded" />
      </div>

      {Array.from({ length: 2 }).map((_, idx) => (
        <div key={idx} className="border border-border-subtle rounded-md overflow-hidden bg-surface">
          <div className="p-3 bg-surface-subtle/70 border-b border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="w-12 h-4 rounded" />
              <Skeleton className="w-48 h-3.5 rounded font-mono" />
            </div>
            <Skeleton className="w-16 h-3.5 rounded" />
          </div>
          <div className="p-3 font-mono space-y-1.5 bg-slate-950/5">
            <div className="h-3 w-3/4 rounded bg-emerald-500/10 animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-emerald-500/10 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-rose-500/10 animate-pulse" />
            <div className="h-3 w-5/6 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({
  rows = 3,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn('p-4 bg-surface border border-border-subtle rounded-md space-y-3', className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="w-32 h-4 rounded" />
        <Skeleton className="w-16 h-3 rounded" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-3.5 rounded"
            style={{ width: `${85 - (i % 3) * 15}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function GraphSkeleton({
  message = 'Generating architectural dependency graph...',
}: {
  message?: string;
}) {
  return (
    <div className="min-h-[420px] w-full flex flex-col items-center justify-center p-8 text-center space-y-4 bg-surface-subtle/30 rounded-lg border border-border-subtle animate-in fade-in duration-200">
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent animate-pulse">
          <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-primary font-mono">{message}</h4>
        <p className="text-xs text-primary-muted max-w-sm">
          Traversing file dependencies, calculating coupling strengths, and rendering topology...
        </p>
      </div>
      <div className="w-48 h-1.5 bg-surface-subtle rounded-full overflow-hidden">
        <div className="h-full bg-accent rounded-full animate-pulse w-2/3" />
      </div>
    </div>
  );
}

export function AnalysisSkeleton({
  message = 'Executing forensic analysis engine...',
  metricCards = 4,
  tableRows = 6,
}: {
  message?: string;
  metricCards?: number;
  tableRows?: number;
}) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner with Spinner & Status */}
      <div className="p-4 bg-surface border border-accent/20 rounded-lg flex items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center text-accent shrink-0 animate-pulse">
            <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-primary font-mono">{message}</h4>
            <p className="text-[11px] text-primary-muted">
              Analyzing repository commit logs, AST metadata, and causal dependency graphs...
            </p>
          </div>
        </div>
        <div className="hidden sm:block w-32 h-1.5 bg-surface-subtle rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full animate-pulse w-3/4" />
        </div>
      </div>

      {/* Metric Cards Skeleton */}
      {metricCards > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: metricCards }).map((_, i) => (
            <div key={i} className="p-4 bg-surface border border-border-subtle rounded-md space-y-2 shadow-xs">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
          ))}
        </div>
      )}

      {/* Main Analysis Data Skeleton */}
      <div className="p-4 bg-surface border border-border-subtle rounded-md space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-7 w-48 rounded-md" />
        </div>
        <div className="space-y-2.5">
          {Array.from({ length: tableRows }).map((_, i) => (
            <div
              key={i}
              className="p-3 bg-surface-subtle/50 border border-border-subtle/60 rounded flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Skeleton className="w-5 h-5 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ContributorSkeleton({
  count = 4,
}: {
  count?: number;
}) {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center gap-2 text-xs font-mono text-primary font-semibold pb-2 border-b border-border-subtle">
        <div className="w-3.5 h-3.5 rounded-full border-2 border-accent border-t-transparent animate-spin shrink-0" />
        <span>Evaluating contributor ownership and authorship metrics...</span>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="p-4 bg-surface border border-border-subtle rounded-md space-y-3 shadow-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
            <div className="pt-2 border-t border-border-subtle/60 flex items-center justify-between gap-4">
              <Skeleton className="h-3 w-40" />
              <div className="w-36 h-2 bg-surface-subtle rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full animate-pulse"
                  style={{ width: `${80 - i * 18}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ArchaeologySkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Symbol Target Card */}
      <div className="p-4 rounded-md border border-border-subtle bg-surface shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-2.5 bg-surface-subtle/50 rounded border border-border-subtle/60 space-y-1.5">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Code Snippet Box */}
      <div className="rounded-md border border-border-subtle bg-canvas overflow-hidden shadow-xs">
        <div className="p-3 bg-surface-subtle border-b border-border-subtle flex items-center justify-between">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3.5 w-20" />
        </div>
        <div className="p-4 space-y-2 font-mono">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>

      {/* Historical Lineage Timeline */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono text-primary font-semibold">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-accent border-t-transparent animate-spin shrink-0" />
          <span>Tracing historical commits, PR lifecycles, and causal modifications...</span>
        </div>
        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-subtle">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="relative p-3.5 bg-surface border border-border-subtle rounded-md space-y-2">
              <div className="absolute -left-[23px] top-4 w-2.5 h-2.5 rounded-full bg-accent border-2 border-surface" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function InvestigationSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
      {/* Left List Column */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-12" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-3.5 bg-surface border border-border-subtle rounded-md space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-3 w-14" />
            </div>
            <Skeleton className="h-3.5 w-5/6" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        ))}
      </div>

      {/* Right Workbench Column */}
      <div className="lg:col-span-2 space-y-4">
        <div className="p-5 bg-surface border border-border-subtle rounded-md space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-7 w-24 rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
          <div className="p-4 bg-surface-subtle/60 rounded-md border border-border-subtle/80 space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="space-y-2 pt-2">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-24 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

export { Skeleton as LoadingSkeleton };
