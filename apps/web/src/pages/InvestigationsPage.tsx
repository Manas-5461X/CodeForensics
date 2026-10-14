import { useState } from 'react';
import { Panel } from '../components/ui/Panel.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import {
  Plus,
  AlertTriangle,
  GitCommit,
} from 'lucide-react';

interface InvestigationItem {
  id: string;
  question: string;
  scope: string;
  status: 'In Progress' | 'Concluded' | 'Inconclusive';
  findingsCount: number;
  evidenceItemsCount: number;
  updatedAt: string;
  hypotheses: string[];
}

const mockInvestigations: InvestigationItem[] = [
  {
    id: 'inv-1',
    question: 'Did PR #29012 fully resolve the concurrent tearing issue reported in #28941?',
    scope: 'React 19 RC • packages/react/src/ReactHooks.js • commit b84f291',
    status: 'Inconclusive',
    findingsCount: 3,
    evidenceItemsCount: 5,
    updatedAt: 'Yesterday',
    hypotheses: [
      'H1: PR #29012 only addressed single-transition tearing, leaving nested transitions vulnerable.',
      'H2: The issue was superseded by lane scheduler rewrite in commit 8a129f.',
    ],
  },
  {
    id: 'inv-2',
    question: 'What historical commit introduced the memory leak in Suspense list unmounting?',
    scope: 'React 18.2 to 18.3 • ReactSuspenseList.js',
    status: 'Concluded',
    findingsCount: 4,
    evidenceItemsCount: 7,
    updatedAt: '3 days ago',
    hypotheses: [
      'H1: Commit 41e9b2 removed cleanup callback during early abort.',
    ],
  },
];

export function InvestigationsPage() {
  const [selectedInv, setSelectedInv] = useState<InvestigationItem>(mockInvestigations[0]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-primary tracking-tight">
            Investigations & Evidence
          </h2>
          <p className="text-xs text-primary-secondary mt-0.5">
            Preserve questions, hypotheses, observations, and source citations as reproducible forensic records.
          </p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
          New Investigation
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Saved Investigations List */}
        <div className="space-y-3 lg:col-span-1">
          <label className="text-xs font-semibold text-primary-muted uppercase tracking-wider block px-1">
            Active Records ({mockInvestigations.length})
          </label>
          {mockInvestigations.map((inv) => (
            <div
              key={inv.id}
              onClick={() => setSelectedInv(inv)}
              className={`p-3.5 rounded-md border cursor-pointer transition-all ${
                selectedInv.id === inv.id
                  ? 'bg-surface border-accent shadow-xs'
                  : 'bg-surface border-border-subtle hover:border-border-strong'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <Badge
                  category={
                    inv.status === 'Concluded'
                      ? 'RESOLVED'
                      : inv.status === 'Inconclusive'
                      ? 'UNKNOWN'
                      : 'INFERENCE'
                  }
                >
                  {inv.status}
                </Badge>
                <span className="text-[11px] font-mono text-primary-muted">
                  {inv.updatedAt}
                </span>
              </div>
              <h4 className="text-xs font-semibold text-primary mt-2 line-clamp-2 leading-snug">
                {inv.question}
              </h4>
              <p className="text-[11px] font-mono text-primary-secondary mt-1.5 line-clamp-1">
                Scope: {inv.scope}
              </p>
            </div>
          ))}
        </div>

        {/* Selected Investigation Detail Workbench */}
        <div className="lg:col-span-2 space-y-4">
          <Panel
            title="Forensic Record"
            subtitle={`ID: ${selectedInv.id} • Last updated ${selectedInv.updatedAt}`}
            action={
              <Badge category={selectedInv.status === 'Concluded' ? 'RESOLVED' : 'UNKNOWN'}>
                {selectedInv.status}
              </Badge>
            }
          >
            <div className="space-y-5">
              {/* Question & Scope Header */}
              <div>
                <h3 className="text-sm font-bold text-primary">
                  {selectedInv.question}
                </h3>
                <div className="mt-1.5 p-2 bg-surface-subtle rounded border border-border-subtle font-mono text-xs text-primary-secondary">
                  <strong>Scope:</strong> {selectedInv.scope}
                </div>
              </div>

              {/* Competing Hypotheses */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Competing Hypotheses
                </h4>
                <div className="space-y-2">
                  {selectedInv.hypotheses.map((h, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded bg-surface border border-border-subtle text-xs text-primary flex items-start gap-2.5"
                    >
                      <GitCommit className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evidentiary Citations */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Traceable Evidence Items
                </h4>
                <div className="divide-y divide-border-subtle border border-border-subtle rounded-md bg-surface overflow-hidden">
                  <div className="p-3 text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge category="FACT">GITHUB PR #29012</Badge>
                      <span className="font-mono text-primary-muted text-[11px]">Merged commit b84f291</span>
                    </div>
                    <p className="text-primary-secondary text-[11px]">
                      Title: "Fix tearing in useDeferredValue by snapshotting transition lanes".
                    </p>
                  </div>
                  <div className="p-3 text-xs space-y-1 bg-surface-subtle/20">
                    <div className="flex items-center gap-2">
                      <Badge category="INFERENCE">TEST GAP</Badge>
                      <span className="font-mono text-primary-muted text-[11px]">packages/react/src/__tests__/ReactHooks-test.js</span>
                    </div>
                    <p className="text-primary-secondary text-[11px]">
                      Test suite covers synchronous fallback only; no assertions for concurrent nested transitions.
                    </p>
                  </div>
                </div>
              </div>

              {/* Honest Uncertainty & Limitations */}
              <div className="p-3 rounded-md bg-[#fcf4e6] border border-[#ebd6a9] text-xs text-[#8e641b] space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Uncertainty & Coverage Limitations</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Without an end-to-end regression fixture in CI, CodeForensics assesses resolution as <strong>PARTIALLY_ADDRESSED</strong> rather than confirmed fixed.
                </p>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
