import { useState } from 'react';
import { Panel } from '../components/ui/Panel.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Search } from 'lucide-react';

export function ArchaeologyPage() {
  const [symbolQuery, setSymbolQuery] = useState('useDeferredValue');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-primary tracking-tight">
          Code Archaeology
        </h2>
        <p className="text-xs text-primary-secondary mt-0.5">
          Trace JavaScript and TypeScript symbols, functions, and files through Git revisions to understand historical rationale and linked decisions.
        </p>
      </div>

      {/* Symbol / File Search */}
      <Panel className="p-4 bg-surface">
        <label className="text-xs font-semibold text-primary block mb-1.5">
          Symbol or File Path to Trace
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-primary-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={symbolQuery}
              onChange={(e) => setSymbolQuery(e.target.value)}
              placeholder="e.g. useDeferredValue or packages/react/src/ReactHooks.js"
              className="w-full bg-surface-subtle text-xs font-mono text-primary rounded-md pl-9 pr-3 py-2 border border-border-strong focus:outline-none focus:border-link"
            />
          </div>
          <Button variant="primary">
            Trace History
          </Button>
        </div>
      </Panel>

      {/* Symbol Historical Lineage Timeline */}
      <Panel
        title={`Evolution of symbol "${symbolQuery}"`}
        subtitle="TypeScript Compiler AST & Git history trace across 4 major milestones"
      >
        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-strong">
          <div className="relative">
            <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-accent border-2 border-surface"></div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-primary">commit b84f291</span>
                <Badge category="FACT">HEAD REVISION</Badge>
                <span className="text-xs text-primary-muted font-mono">2 weeks ago</span>
              </div>
              <p className="text-xs font-medium text-primary">
                Fix memory leak in useDeferredValue concurrent lane scheduler
              </p>
              <p className="text-xs text-primary-secondary font-mono bg-surface-subtle p-2 rounded border border-border-subtle">
                Linked PR #29012 • Touched packages/react/src/ReactHooks.js:L184-L210
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-border-strong border-2 border-surface"></div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-primary">commit 4a91c20</span>
                <Badge category="FACT">API ENHANCEMENT</Badge>
                <span className="text-xs text-primary-muted font-mono">8 months ago</span>
              </div>
              <p className="text-xs font-medium text-primary">
                Add initialValue parameter to useDeferredValue hook signature
              </p>
              <p className="text-xs text-primary-secondary font-mono bg-surface-subtle p-2 rounded border border-border-subtle">
                Linked PR #27514 • Documented RFC in reactjs/rfcs#219
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-border-strong border-2 border-surface"></div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-primary">commit 10e42d7</span>
                <Badge category="FACT">ORIGIN COMMIT</Badge>
                <span className="text-xs text-primary-muted font-mono">React 18.0</span>
              </div>
              <p className="text-xs font-medium text-primary">
                Initial introduction of useDeferredValue hook primitive
              </p>
              <p className="text-xs text-primary-secondary font-mono bg-surface-subtle p-2 rounded border border-border-subtle">
                Original author: Andrew Clark (acdlite) • Linked PR #21401
              </p>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
