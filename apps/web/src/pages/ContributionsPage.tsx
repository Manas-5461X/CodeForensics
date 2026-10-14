import { Panel } from '../components/ui/Panel.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Sparkles, ExternalLink, GitBranch } from 'lucide-react';

interface ContributionItem {
  id: string;
  number: number;
  title: string;
  reason: string;
  confidence: 'HIGH' | 'MEDIUM';
  duplicateRisk: 'LOW' | 'MEDIUM';
  relevantFiles: string[];
  activePrDetected: boolean;
}

const mockContributions: ContributionItem[] = [
  {
    id: 'c1',
    number: 28719,
    title: 'DevTools profiler timeline drops commits under high CPU load',
    reason: 'Explicit reproduction steps provided; no active branch or PR modifying ReactDevToolsProfiler found in last 90 days.',
    confidence: 'HIGH',
    duplicateRisk: 'LOW',
    relevantFiles: ['packages/react-devtools-shared/src/devtools/views/Profiler/'],
    activePrDetected: false,
  },
  {
    id: 'c2',
    number: 28415,
    title: 'StrictMode double-invoke warning lacks line number in React Native Hermes',
    reason: 'Isolated error handler logic in ReactStrictModeWarnings.js; regression tests exist in ReactStrictMode-test.internal.js.',
    confidence: 'MEDIUM',
    duplicateRisk: 'LOW',
    relevantFiles: ['packages/react-reconciler/src/ReactStrictModeWarnings.js'],
    activePrDetected: false,
  },
  {
    id: 'c3',
    number: 28102,
    title: 'Hydration failure on SVG foreignObject with case-sensitive attributes',
    reason: 'Clear failing test fixture in issue comments; prior abandoned PR #27901 had valid test cases.',
    confidence: 'MEDIUM',
    duplicateRisk: 'MEDIUM',
    relevantFiles: ['packages/react-dom-bindings/src/client/ReactDOMComponent.js'],
    activePrDetected: false,
  },
];

export function ContributionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-primary tracking-tight">
          Contribution Finder
        </h2>
        <p className="text-xs text-primary-secondary mt-0.5">
          Surfacing actionable open issues with explainable scoring, historical attempts, and ongoing-work risk analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {mockContributions.map((item) => (
          <Panel key={item.id} className="p-5 hover:border-border-strong transition-colors">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono font-bold text-primary text-sm">
                    #{item.number}
                  </span>
                  <Badge category="INFERENCE">OPPORTUNITY</Badge>
                  <span className="text-xs font-mono text-primary-muted">
                    Confidence: {item.confidence}
                  </span>
                  <span className="text-xs font-mono text-primary-muted">
                    Duplicate Risk: {item.duplicateRisk}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-primary">
                  {item.title}
                </h3>

                <div className="p-3 bg-surface-subtle/50 rounded-md border border-border-subtle text-xs text-primary-secondary space-y-1.5">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-primary font-medium">Why Recommended:</strong>{' '}
                      {item.reason}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 text-xs text-primary-muted">
                  <GitBranch className="w-3.5 h-3.5 text-primary-muted shrink-0" />
                  <span className="font-mono text-[11px] truncate">
                    Relevant: {item.relevantFiles.join(', ')}
                  </span>
                </div>
              </div>

              <div className="flex md:flex-col items-center gap-2 shrink-0">
                <a
                  href={`https://github.com/facebook/react/issues/${item.number}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button
                    size="sm"
                    variant="outline"
                    rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                  >
                    Open on GitHub
                  </Button>
                </a>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
