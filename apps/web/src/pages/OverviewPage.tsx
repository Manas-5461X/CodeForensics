import { Panel } from '../components/ui/Panel.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import {
  CheckCircle2,
  AlertCircle,
  FileSearch,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function OverviewPage() {
  return (
    <div className="space-y-6">
      {/* Scope and Repository Banner */}
      <div className="bg-surface border border-border-subtle p-5 rounded-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-medium text-primary-muted">
              Target Repository
            </span>
            <Badge category="FACT">VERIFIED REPO</Badge>
          </div>
          <h2 className="text-xl font-bold text-primary mt-1">facebook/react</h2>
          <p className="text-xs text-primary-secondary mt-1">
            The library for web and native user interfaces • Synchronized commit{' '}
            <code className="text-xs font-mono text-link">b84f291</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/issues">
            <Button variant="primary" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Explore Issues & PRs
            </Button>
          </Link>
        </div>
      </div>

      {/* Forensic Metrics Grid - Restrained, Real-data aligned, No fake KPI bloat */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Panel className="p-4">
          <div className="text-xs text-primary-muted font-medium">Synchronized Issues</div>
          <div className="text-2xl font-bold font-mono text-primary mt-1">1,420</div>
          <div className="text-[11px] text-primary-secondary mt-1 flex items-center gap-1">
            <span className="text-success font-medium">92%</span> historical coverage
          </div>
        </Panel>

        <Panel className="p-4">
          <div className="text-xs text-primary-muted font-medium">Pull Requests Tracked</div>
          <div className="text-2xl font-bold font-mono text-primary mt-1">842</div>
          <div className="text-[11px] text-primary-secondary mt-1">
            <span className="font-mono text-primary">612</span> merged with commit diffs
          </div>
        </Panel>

        <Panel className="p-4">
          <div className="text-xs text-primary-muted font-medium">Evidenced Relationships</div>
          <div className="text-2xl font-bold font-mono text-accent mt-1">318</div>
          <div className="text-[11px] text-primary-secondary mt-1 flex items-center gap-1">
            <Badge category="FACT" showIcon={false}>184 Facts</Badge>
            <Badge category="INFERENCE" showIcon={false}>134 Inferred</Badge>
          </div>
        </Panel>

        <Panel className="p-4">
          <div className="text-xs text-primary-muted font-medium">Actionable Opportunities</div>
          <div className="text-2xl font-bold font-mono text-link mt-1">24</div>
          <div className="text-[11px] text-primary-secondary mt-1">
            Evaluated by Contribution Finder
          </div>
        </Panel>
      </div>

      {/* Main Evidence Summary and Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel
          className="lg:col-span-2"
          title="Recent Evidence-Backed Lineage Findings"
          subtitle="Direct links and inferred relationships with provenance"
          action={
            <Link to="/issues">
              <Button size="sm" variant="ghost">View all</Button>
            </Link>
          }
        >
          <div className="divide-y divide-border-subtle">
            <div className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-primary">#28941</span>
                  <Badge category="INFERENCE">PARTIALLY_ADDRESSES</Badge>
                  <span className="text-xs text-primary-muted font-mono">via PR #29012</span>
                </div>
                <div className="text-xs font-medium text-primary">
                  useDeferredValue causes tearing in concurrent root transitions
                </div>
                <div className="text-[11px] text-primary-secondary">
                  Evidence: Matching stack frame in packages/react/src/ReactHooks.js • Closed without verification
                </div>
              </div>
              <Badge category="UNKNOWN">Resolution Uncertain</Badge>
            </div>

            <div className="py-3.5 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-primary">#28810</span>
                  <Badge category="FACT">FIXED_BY</Badge>
                  <span className="text-xs text-primary-muted font-mono">commit f9281a</span>
                </div>
                <div className="text-xs font-medium text-primary">
                  Memory leak in Suspense list during early unmount
                </div>
                <div className="text-[11px] text-primary-secondary">
                  Evidence: Explicit GitHub closing keyword in commit • Added regression test
                </div>
              </div>
              <Badge category="RESOLVED">Verified Fix</Badge>
            </div>

            <div className="py-3.5 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-primary">#28755</span>
                  <Badge category="INFERENCE">SUPERSEDES</Badge>
                  <span className="text-xs text-primary-muted font-mono">PR #28412</span>
                </div>
                <div className="text-xs font-medium text-primary">
                  Refactor fiber priority lanes scheduler
                </div>
                <div className="text-[11px] text-primary-secondary">
                  Evidence: 89% changed file overlap and explicit maintainer comment citation
                </div>
              </div>
              <Badge category="FACT">Merged</Badge>
            </div>
          </div>
        </Panel>

        {/* Evidence Rules & Ingestion Health */}
        <Panel
          title="Data Integrity & Security"
          subtitle="Non-negotiable evidentiary constraints"
        >
          <div className="space-y-3.5 text-xs text-primary-secondary">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <div>
                <strong className="text-primary font-medium">Provider Facts vs Inferences:</strong>{' '}
                GitHub state is strictly decoupled from resolution assessments.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <div>
                <strong className="text-primary font-medium">Honest Uncertainty:</strong>{' '}
                Closed issues without verifiable commits are reported as uncertain, never assumed fixed.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <div>
                <strong className="text-primary font-medium">Untrusted Repository Input:</strong>{' '}
                Issues and code comments are treated strictly as data, neutralizing prompt injection.
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-border-subtle">
            <Link to="/investigations">
              <Button size="sm" variant="outline" className="w-full" leftIcon={<FileSearch className="w-3.5 h-3.5" />}>
                Start New Investigation
              </Button>
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}
