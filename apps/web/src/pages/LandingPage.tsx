import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  GitCommit,
  Search,
  Sparkles,
  Terminal,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge.js';

export function LandingPage() {
  const [activeTab, setActiveTab] = useState<'lineage' | 'assessment' | 'code'>('lineage');
  const [heroTheme, setHeroTheme] = useState<'moon-dots' | 'moon-grid' | 'systems'>('moon-dots');

  const isMoon = heroTheme !== 'systems';

  return (
    <div className={`min-h-screen ${isMoon ? 'bg-[#030712]' : 'bg-[#0b1120]'} text-slate-100 font-sans selection:bg-[#38bdf8]/30 selection:text-white transition-colors duration-500`}>
      {/* ---------------------------------------------------------------------- */}
      {/* 1. Global Navigation Bar (CAPEX-style glass overlay)                  */}
      {/* ---------------------------------------------------------------------- */}
      {/* ---------------------------------------------------------------------- */}
      {/* 1. Global Navigation Bar (CAPEX-style glass overlay)                  */}
      {/* ---------------------------------------------------------------------- */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[#0b1120]/90 border-white/10 backdrop-blur-md border-b px-3 sm:px-6 lg:px-12 h-16 sm:h-20 flex items-center justify-between transition-all">
        <Link to="/" className="flex items-center gap-2.5 sm:gap-3.5 group shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-[#1e293b] border-[#38bdf8]/40 text-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.2)] border flex items-center justify-center font-mono font-bold text-xs sm:text-sm tracking-tight transition-colors">
            CF
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm sm:text-base font-bold tracking-tight text-white group-hover:text-[#38bdf8] transition-colors">
              CodeForensics
            </span>
            <span className="hidden md:inline-block text-[10px] font-mono uppercase tracking-widest text-[#38bdf8]/80 border-l border-white/15 pl-2.5">
              Evidence Graph
            </span>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-[11px] font-mono uppercase tracking-wider text-slate-400">
          <a href="#how-it-works" className="hover:text-white transition-colors">
            How It Works
          </a>
          <a href="#principles" className="hover:text-[#38bdf8] transition-colors">
            Principles
          </a>
          <a href="#case-study" className="hover:text-white transition-colors">
            Case Study
          </a>
          <a href="#rules" className="hover:text-white transition-colors">
            Rules of Evidence
          </a>
          <Link to="/app/docs" className="hover:text-[#38bdf8] transition-colors">
            Documentation
          </Link>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* 3-Way Background Comparison Selector */}
          <div className="hidden xs:inline-flex items-center p-0.5 bg-slate-900/90 border border-slate-700/80 rounded-full text-[10px] font-mono shadow-inner">
            <button
              onClick={() => setHeroTheme('moon-dots')}
              title="Wireframe Moon with coordinate dots matrix"
              className={`px-2 sm:px-2.5 py-1 rounded-full transition-all ${
                heroTheme === 'moon-dots'
                  ? 'bg-[#00f0ff] text-[#030712] font-bold shadow-[0_0_10px_rgba(0,240,255,0.6)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="hidden sm:inline">✦ Moon (Dots)</span>
              <span className="sm:hidden">Dots</span>
            </button>
            <button
              onClick={() => setHeroTheme('moon-grid')}
              title="Wireframe Moon with cyber grid"
              className={`px-2 sm:px-2.5 py-1 rounded-full transition-all ${
                heroTheme === 'moon-grid'
                  ? 'bg-[#38bdf8] text-[#030712] font-bold shadow-[0_0_10px_rgba(56,189,248,0.6)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="hidden sm:inline">🌐 Moon (Grid)</span>
              <span className="sm:hidden">Grid</span>
            </button>
            <button
              onClick={() => setHeroTheme('systems')}
              title="Deep Systems Architecture background"
              className={`px-2 sm:px-2.5 py-1 rounded-full transition-all ${
                heroTheme === 'systems'
                  ? 'bg-slate-200 text-[#0b1120] font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="hidden sm:inline">🏛 Systems</span>
              <span className="sm:hidden">Systems</span>
            </button>
          </div>

          <a
            href="https://github.com/Manas-5461X/CodeForensics"
            target="_blank"
            rel="noreferrer"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono text-slate-400 hover:text-white border border-white/10 hover:border-white/20 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>GitHub</span>
          </a>
          <Link
            to="/app"
            className="inline-flex items-center gap-1.5 sm:gap-2 border border-[#38bdf8]/60 bg-[#38bdf8]/10 hover:bg-[#38bdf8] hover:text-[#0b1120] text-slate-100 font-mono text-xs px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded transition-all duration-200 group"
          >
            <span className="hidden xs:inline">Open Workbench</span>
            <span className="xs:hidden">Workbench</span>
            <span className="text-[#38bdf8] group-hover:text-[#0b1120] transition-colors">↗</span>
          </Link>
        </div>
      </header>

      {/* ---------------------------------------------------------------------- */}
      {/* 2. Hero Section (Dynamic Full-Viewport Backdrop)                      */}
      {/* ---------------------------------------------------------------------- */}
      <section className="relative min-h-[100dvh] w-full flex flex-col justify-center overflow-hidden pt-24 pb-12 sm:pt-28 sm:pb-16 px-6 sm:px-12 lg:px-20 border-b border-slate-800">
        {/* Dynamic Backdrop Image Container */}
        {isMoon ? (
          <div className="absolute inset-0 z-0 bg-[#030712] overflow-hidden pointer-events-none">
            <img
              src="/hero-wireframe.jpg"
              alt="CodeForensics Celestial Wireframe Terrain"
              className="w-full h-full object-cover object-[center_top] opacity-95 filter contrast-[1.12] brightness-105 transition-all duration-700"
            />
            {/* Multi-layered directional dark gradient overlays preserving full circle and mountain glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#030712]/90 via-[#030712]/45 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030712]/25 via-transparent to-transparent" />

            {heroTheme === 'moon-dots' ? (
              /* Refined CAPEX radial cyan coordinate dots matrix overlay */
              <div
                className="absolute inset-0 opacity-30 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(circle at 82% 28%, #38bdf8 0 1px, transparent 1.5px)',
                  backgroundSize: '14px 14px',
                  maskImage: 'linear-gradient(to left, black 35%, transparent 85%)',
                  WebkitMaskImage: 'linear-gradient(to left, black 35%, transparent 85%)',
                }}
              />
            ) : (
              /* Cyber coordinate grid trace overlay */
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage: 'linear-gradient(to right, #00f0ff 1px, transparent 1px), linear-gradient(to bottom, #00f0ff 1px, transparent 1px)',
                  backgroundSize: '48px 48px',
                  maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 85%)',
                  WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 85%)',
                }}
              />
            )}
          </div>
        ) : (
          <div className="absolute inset-0 z-0 bg-[#0b1120] overflow-hidden pointer-events-none">
            <img
              src="/hero-systems.jpg"
              alt="CodeForensics Interconnected Systems"
              className="w-full h-full object-cover object-[center_42%] opacity-75 scale-102 filter contrast-[1.05] brightness-95 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0b1120]/95 via-[#0b1120]/75 to-[#0b1120]/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b1120] via-[#0b1120]/40 to-[#0b1120]/60" />
            <div
              className="absolute inset-0 opacity-20 pointer-events-none hidden lg:block"
              style={{
                backgroundImage: 'radial-gradient(circle at 82% 28%, #38bdf8 0 1px, transparent 1.5px)',
                backgroundSize: '14px 14px',
                maskImage: 'linear-gradient(to left, black 25%, transparent 75%)',
                WebkitMaskImage: 'linear-gradient(to left, black 25%, transparent 75%)',
              }}
            />
          </div>
        )}

        {/* Hero Copy Container */}
        <div className="relative z-10 w-full max-w-6xl mx-auto my-auto">
          {/* Small Monospace Eyebrow */}
          <div className={`inline-flex items-center gap-2.5 px-3 py-1 rounded ${isMoon ? 'bg-[#06152d]/80 border-[#00f0ff]/40 shadow-[0_0_12px_rgba(0,240,255,0.2)]' : 'bg-[#1e293b]/80 border-[#38bdf8]/30'} border text-[11px] font-mono text-slate-300 uppercase tracking-widest mb-4 sm:mb-5 backdrop-blur-xs`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isMoon ? 'bg-[#00f0ff]' : 'bg-[#38bdf8]'} animate-pulse`} />
            <span>FOR MAINTAINERS & CONTRIBUTORS</span>
            <span className="text-slate-500">•</span>
            <span className={isMoon ? 'text-[#00f0ff] font-bold' : 'text-[#38bdf8]'}>EVIDENCE GRAPH</span>
          </div>

          {/* Oversized Editorial Typography */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.0] max-w-4xl drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
            Stop guessing why code was written.{' '}
            <span className={`block font-editorial italic font-normal ${isMoon ? 'text-[#38bdf8] drop-shadow-[0_0_24px_rgba(56,189,248,0.7)]' : 'text-[#7dd3fc]'} tracking-tight mt-1 sm:mt-2`}>
              Inspect the evidence.
            </span>
          </h1>

          {/* Value Proposition Tagline */}
          <p className="mt-4 sm:mt-5 text-sm sm:text-base lg:text-lg text-slate-200 max-w-2xl leading-relaxed font-light drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
            CodeForensics connects GitHub issues, pull requests, review discussions, and commit diffs into an inspectable evidence graph.
            Distinguish observed provider facts from heuristic inferences—with visible uncertainty and traceable provenance.
          </p>

          {/* CTA Action Row */}
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
            <Link
              to="/app"
              className={`inline-flex items-center justify-center gap-2.5 px-6 py-3.5 ${isMoon ? 'bg-[#00f0ff] text-[#030712] hover:bg-[#38bdf8] shadow-[0_0_24px_rgba(0,240,255,0.45)] hover:shadow-[0_0_36px_rgba(0,240,255,0.7)]' : 'bg-[#38bdf8] text-[#0b1120] hover:bg-[#7dd3fc] shadow-[0_0_20px_rgba(56,189,248,0.25)]'} font-mono font-semibold text-xs uppercase tracking-wider rounded transition-all duration-200 hover:-translate-y-0.5`}
            >
              <span>Launch Interactive Workbench</span>
              <span className="text-sm">↗</span>
            </Link>
            <a
              href="#case-study"
              className={`inline-flex items-center justify-center gap-2 px-5 py-3.5 ${isMoon ? 'bg-[#06152d]/70 hover:bg-[#0c224a]/80 text-slate-200 border-[#00f0ff]/40 shadow-[0_0_12px_rgba(0,240,255,0.15)]' : 'bg-slate-900/60 hover:bg-slate-800/80 text-slate-200 border-slate-700/80'} border font-mono text-xs rounded transition-all backdrop-blur-xs hover:-translate-y-0.5`}
            >
              <Search className={`w-3.5 h-3.5 ${isMoon ? 'text-[#00f0ff]' : 'text-[#38bdf8]'}`} />
              <span>Inspect Benchmark Case (#28941)</span>
            </a>
          </div>

          {/* Engine Status Line */}
          <div className="mt-6 sm:mt-8 flex items-center gap-2.5 text-xs font-mono text-slate-300">
            <span className={`inline-block w-2 h-2 rounded-full ${isMoon ? 'bg-[#00f0ff] shadow-[0_0_10px_#00f0ff]' : 'bg-[#10b981] shadow-[0_0_8px_#10b981]'}`} />
            <span>Forensic intelligence engine live in active benchmark</span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-slate-400 hidden sm:inline">Zero AI hallucinations</span>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 3. Paired Overview Section (Light Paper-like Section)                  */}
      {/* ---------------------------------------------------------------------- */}
      <section className="bg-[#f8fafc] text-[#0f172a] py-20 sm:py-28 px-6 sm:px-12 lg:px-20 border-b border-slate-300">
        <div className="max-w-6xl mx-auto">
          {/* 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Left Column: Lead */}
            <div className="space-y-6">
              <p className="text-[11px] font-mono uppercase tracking-widest text-[#0284c7] font-semibold">
                For Maintainers & Contributors <span>•</span> In Active Benchmark
              </p>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#0f172a] leading-[1.02]">
                A clearer way to understand{' '}
                <em className="font-editorial italic font-normal text-[#1e293b]">repository history.</em>
              </h2>
              <p className="text-slate-600 text-base sm:text-lg leading-relaxed pt-2">
                In complex codebases, git history is fragmented across hundreds of closed issues, abandoned PRs, and squash-merged commits.
                CodeForensics normalizes raw repository history into an inspectable, evidence-backed graph where every claim carries its supporting diffs, AST citations, and confidence metrics.
              </p>

              <div className="pt-4 flex items-center gap-3">
                <span className="inline-block w-2 h-2 rounded-full bg-[#0284c7] shadow-[0_0_6px_#0284c7]" />
                <span className="text-xs font-mono text-slate-600 uppercase tracking-wide">
                  Resolution intelligence live in testing
                </span>
              </div>

              <div className="pt-2">
                <Link
                  to="/app"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-[#0f172a] hover:bg-[#1e293b] text-white font-mono text-xs uppercase tracking-wider rounded transition-colors"
                >
                  <span>Open Interactive Workbench</span>
                  <span className="text-[#38bdf8]">↗</span>
                </Link>
              </div>
            </div>

            {/* Right Column: Floating Dark Illustrative Review Preview Card */}
            <div className="bg-[#0f172a] text-slate-100 p-6 sm:p-8 rounded-lg border border-slate-800 shadow-xl flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-[11px] font-mono">
                  <span className="text-[#38bdf8] uppercase tracking-wider">CodeForensics / case view</span>
                  <span className="px-2 py-0.5 border border-[#38bdf8]/40 text-[#7dd3fc] text-[10px] rounded">
                    ILLUSTRATIVE
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-6 mb-8 leading-tight">
                  From repository noise <br />
                  <span className="text-slate-400 font-normal">to a focused forensic review.</span>
                </h3>

                {/* Exception Review Rows */}
                <div className="space-y-0 divide-y divide-slate-800 border-t border-b border-slate-800 text-xs">
                  <div className="py-3 flex items-center justify-between">
                    <span className="text-[#38bdf8] font-mono text-[11px]">01</span>
                    <strong className="text-slate-200 font-medium">Unverified Closes (Missing Commits)</strong>
                    <span className="text-amber-400 font-mono text-[11px]">Flagged</span>
                  </div>
                  <div className="py-3 flex items-center justify-between">
                    <span className="text-[#38bdf8] font-mono text-[11px]">02</span>
                    <strong className="text-slate-200 font-medium">Superseded & Backported PRs</strong>
                    <span className="text-[#38bdf8] font-mono text-[11px]">Traced</span>
                  </div>
                  <div className="py-3 flex items-center justify-between">
                    <span className="text-[#38bdf8] font-mono text-[11px]">03</span>
                    <strong className="text-slate-200 font-medium">Silent Regressions & Reverts</strong>
                    <span className="text-rose-400 font-mono text-[11px]">Audited</span>
                  </div>
                  <div className="py-3 flex items-center justify-between">
                    <span className="text-[#38bdf8] font-mono text-[11px]">04</span>
                    <strong className="text-slate-200 font-medium">Concurrent Lane Coverage Gaps</strong>
                    <span className="text-slate-400 font-mono text-[11px]">Isolated</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Checks surface exceptions</span>
                <span className="text-[#38bdf8]">Engineer decides ↗</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 4. The Workflow Section (Light Paper Precise Grid)                     */}
      {/* ---------------------------------------------------------------------- */}
      <section id="how-it-works" className="bg-[#f8fafc] text-[#0f172a] py-20 sm:py-28 px-6 sm:px-12 lg:px-20 border-b border-slate-300">
        <div className="max-w-6xl mx-auto">
          {/* Section Heading */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-end mb-16">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-[#0284c7] font-semibold mb-3">
                The Workflow
              </p>
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#0f172a] leading-tight">
                Make repository archaeology <br />
                <em className="font-editorial italic font-normal text-[#1e293b]">more deliberate.</em>
              </h2>
            </div>
            <div>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                The forensic check engine reduces the mechanical scan across GitHub tabs before review begins. Every step remains visible, traceable, and ready for an engineer to assess.
              </p>
            </div>
          </div>

          {/* 4-Step Grid with Thin Charcoal Dividers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-slate-300">
            {/* Step 1 */}
            <article className="py-8 pr-6 lg:border-r border-slate-300">
              <span className="text-xs font-mono text-slate-500 block mb-6">01</span>
              <h3 className="text-lg font-bold text-[#0f172a] mb-2 tracking-tight">Ingest</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Bring in GitHub issues, PRs, review discussions, and git commit trees while keeping the complete raw provenance batch intact.
              </p>
            </article>

            {/* Step 2 */}
            <article className="py-8 sm:px-6 lg:border-r border-slate-300 border-t sm:border-t-0">
              <span className="text-xs font-mono text-slate-500 block mb-6">02</span>
              <h3 className="text-lg font-bold text-[#0f172a] mb-2 tracking-tight">Trace</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Run AST symbol mutation analyses to connect issue symptoms to candidate PRs, commit diffs, and historical refactorings.
              </p>
            </article>

            {/* Step 3 */}
            <article className="py-8 sm:pr-6 lg:px-6 lg:border-r border-slate-300 border-t lg:border-t-0">
              <span className="text-xs font-mono text-slate-500 block mb-6">03</span>
              <h3 className="text-lg font-bold text-[#0f172a] mb-2 tracking-tight">Scrutinise</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Audit whether closed issues actually have verified code changes and passing regression tests, or were closed due to bot timeouts.
              </p>
            </article>

            {/* Step 4 */}
            <article className="py-8 sm:px-6 border-t lg:border-t-0 border-slate-300">
              <span className="text-xs font-mono text-slate-500 block mb-6">04</span>
              <h3 className="text-lg font-bold text-[#0f172a] mb-2 tracking-tight">Document</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Package verified facts, inferred relationships, and citations into durable, reproducible investigation records.
              </p>
            </article>
          </div>

          {/* Capability Panel (Dark Charcoal Card) */}
          <div className="mt-16 bg-[#0f172a] text-white p-8 sm:p-10 rounded-lg grid grid-cols-1 lg:grid-cols-2 gap-8 items-center border border-slate-800 shadow-lg">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-[#38bdf8] mb-3">
                What We Audit
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
                A calmer review surface <br />
                <span className="text-slate-400 font-normal">for complex codebases.</span>
              </h3>
            </div>
            <ul className="space-y-3.5 text-xs sm:text-sm text-slate-300 border-t lg:border-t-0 lg:border-l border-slate-800 pt-6 lg:pt-0 lg:pl-8">
              <li className="flex items-start gap-2.5">
                <span className="text-[#38bdf8] font-mono text-base font-bold leading-none">+</span>
                <span>Audit actual code diffs, not merely issue closure timestamps</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#38bdf8] font-mono text-base font-bold leading-none">+</span>
                <span>Detect superseded, backported, and reverted pull requests</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#38bdf8] font-mono text-base font-bold leading-none">+</span>
                <span>Distinguish authoritative GitHub facts from probabilistic inferences</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#38bdf8] font-mono text-base font-bold leading-none">+</span>
                <span>Isolate test fixture coverage gaps in concurrent transitions</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 5. Principle Section (Deep Slate Blue, Tilted Engine Card)             */}
      {/* ---------------------------------------------------------------------- */}
      <section id="principles" className="bg-[#1e293b] text-white py-24 sm:py-32 px-6 sm:px-12 lg:px-20 border-b border-slate-700">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Tilted Engine Status Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-start">
            <article
              className="bg-[#0f172a] border border-[#38bdf8]/40 p-6 sm:p-7 rounded-lg w-full max-w-sm sm:rotate-[-1.5deg] shadow-[12px_12px_0px_rgba(11,17,32,0.8)] transition-transform hover:rotate-0 duration-300"
              aria-label="CodeForensics statutory audit engine status"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#38bdf8]/20 text-[10px] font-mono">
                <span className="text-[#38bdf8] uppercase tracking-wider">FORENSIC CHECK ENGINE</span>
                <span className="px-2 py-0.5 border border-[#38bdf8]/60 text-white rounded bg-[#38bdf8]/10 font-bold">
                  TESTING
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white my-5 leading-tight">
                From raw data <br />
                <span className="text-[#38bdf8] font-editorial italic font-normal">to reviewable signal.</span>
              </h3>

              <div className="space-y-0 divide-y divide-[#38bdf8]/15 border-t border-b border-[#38bdf8]/15 text-xs">
                <div className="py-2.5 flex items-center justify-between font-mono">
                  <span className="text-[#38bdf8] text-[11px]">01</span>
                  <span className="text-slate-300">Lineage continuity</span>
                  <b className="text-[#38bdf8] font-normal uppercase text-[10px]">Ready</b>
                </div>
                <div className="py-2.5 flex items-center justify-between font-mono">
                  <span className="text-[#38bdf8] text-[11px]">02</span>
                  <span className="text-slate-300">AST mutation diff</span>
                  <b className="text-[#38bdf8] font-normal uppercase text-[10px]">Ready</b>
                </div>
                <div className="py-2.5 flex items-center justify-between font-mono">
                  <span className="text-[#38bdf8] text-[11px]">03</span>
                  <span className="text-slate-300">Closed ≠ Fixed audit</span>
                  <b className="text-[#38bdf8] font-normal uppercase text-[10px]">Ready</b>
                </div>
                <div className="py-2.5 flex items-center justify-between font-mono">
                  <span className="text-[#38bdf8] text-[11px]">04</span>
                  <span className="text-slate-300">Provable citations</span>
                  <b className="text-[#38bdf8] font-normal uppercase text-[10px]">Ready</b>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>CodeForensics / pilot build</span>
                <span className="text-[#38bdf8] text-base leading-none">→</span>
              </div>
            </article>
          </div>

          {/* Right Column: The Responsibility Statement */}
          <div className="lg:col-span-7 space-y-6">
            <p className="text-[11px] font-mono uppercase tracking-widest text-[#38bdf8] font-semibold">
              The Responsibility Statement
            </p>
            <h2 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[0.98]">
              The tool flags. <br />
              <em className="font-editorial italic font-normal text-[#7dd3fc]">The engineer decides.</em>
            </h2>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed pt-2 max-w-xl">
              CodeForensics is engineered to surface patterns, contradictory diffs, and missing test coverage.
              It does not manufacture synthetic hallucinations, nor does it replace professional engineering judgement, code review, or maintainer responsibility.
            </p>

            <div className="pt-4 flex items-center gap-6">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <ShieldCheck className="w-4 h-4 text-[#38bdf8]" />
                <span>Deterministic AST Provenance</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                <span>Verifiable Git Tree Proofs</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 6. Interactive Case Study Benchmark (Deep Charcoal / Slate)           */}
      {/* ---------------------------------------------------------------------- */}
      <section id="case-study" className="bg-[#0b1120] text-slate-100 py-24 sm:py-32 px-6 sm:px-12 lg:px-20 border-b border-slate-800">
        <div className="max-w-6xl mx-auto">
          {/* Header & Tabs */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
            <div>
              <div className="text-[11px] font-mono text-[#38bdf8] font-semibold tracking-widest uppercase mb-2">
                Case Study • Live Forensic Inspection
              </div>
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
                A closed issue is not a fixed issue.
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
                In this actual repository case from <code className="font-mono text-[#38bdf8]">facebook/react</code>, GitHub marks Issue #28941 as Closed. CodeForensics audited the commits and discovered the fix was incomplete.
              </p>
            </div>

            {/* Interactive Workbench Tab Switcher */}
            <div className="flex items-center gap-1.5 bg-[#1e293b] p-1.5 border border-slate-700 rounded-md self-start lg:self-auto">
              <button
                onClick={() => setActiveTab('lineage')}
                className={`px-3.5 py-2 text-xs font-mono rounded transition-all ${
                  activeTab === 'lineage'
                    ? 'bg-[#38bdf8] text-[#0b1120] font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                1. Lineage Chain
              </button>
              <button
                onClick={() => setActiveTab('assessment')}
                className={`px-3.5 py-2 text-xs font-mono rounded transition-all ${
                  activeTab === 'assessment'
                    ? 'bg-[#38bdf8] text-[#0b1120] font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                2. Forensic Assessment
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`px-3.5 py-2 text-xs font-mono rounded transition-all ${
                  activeTab === 'code'
                    ? 'bg-[#38bdf8] text-[#0b1120] font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                3. Code Diff Proof
              </button>
            </div>
          </div>

          {/* Workbench Card Preview */}
          <div className="bg-[#0f172a] border border-slate-700/80 rounded-lg overflow-hidden shadow-2xl">
            {/* Mock Workbench Header */}
            <div className="px-6 py-3.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] shadow-[0_0_8px_#38bdf8]" />
                <span className="font-bold text-white tracking-wide">INVESTIGATION #CF-2026-089</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">target: facebook/react@b84f291</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge category="INFERENCE">PARTIALLY_ADDRESSED</Badge>
                <Badge category="UNKNOWN">CONFIDENCE: MEDIUM</Badge>
              </div>
            </div>

            {/* Tab Content Display */}
            <div className="p-6 sm:p-8">
              {activeTab === 'lineage' && (
                <div className="space-y-6">
                  <div className="text-[11px] text-[#38bdf8] uppercase font-mono tracking-wider">
                    Traced Event Progression
                  </div>
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-700">
                    {/* Step 1: Issue */}
                    <div className="relative">
                      <div className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-slate-400 border-2 border-[#0f172a]" />
                      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 text-xs font-mono">
                            <span className="font-bold text-white">Issue #28941</span>
                            <span className="text-slate-600">•</span>
                            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-300">
                              GitHub State: Closed
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm font-medium text-slate-200 mt-1">
                            useDeferredValue causes tearing in concurrent root transitions
                          </p>
                        </div>
                        <Badge category="FACT">OBSERVED FACT</Badge>
                      </div>
                    </div>

                    {/* Step 2: Linked PR */}
                    <div className="relative">
                      <div className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-[#38bdf8] border-2 border-[#0f172a]" />
                      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 text-xs font-mono">
                            <span className="font-bold text-white">Pull Request #29012</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-[#38bdf8] font-semibold">Merged by gaearon</span>
                          </div>
                          <p className="text-xs sm:text-sm font-medium text-slate-200 mt-1">
                            Fix tearing in useDeferredValue by snapshotting transition lanes
                          </p>
                        </div>
                        <Badge category="INFERENCE">89% FILE OVERLAP</Badge>
                      </div>
                    </div>

                    {/* Step 3: Verified Commit */}
                    <div className="relative">
                      <div className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-[#10b981] border-2 border-[#0f172a]" />
                      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 text-xs font-mono">
                            <span className="font-bold text-white">Commit b84f291</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-400">packages/react/src/ReactHooks.js</span>
                          </div>
                          <p className="text-xs sm:text-sm font-medium text-slate-200 mt-1">
                            Lane snapshotting added to updateDeferredValueHookState
                          </p>
                        </div>
                        <Badge category="FACT">GIT TREE SHA</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'assessment' && (
                <div className="space-y-6">
                  <div className="p-5 bg-amber-950/30 border border-amber-800/60 rounded-md text-xs text-amber-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>Resolution Assessment: PARTIALLY_ADDRESSED</span>
                    </div>
                    <p className="leading-relaxed">
                      While Pull Request #29012 merged code into <code className="font-mono text-amber-300">ReactHooks.js</code>, our regression coverage auditor verified that the accompanying test suite only tests <strong>single-level transitions</strong>. Nested concurrent fallback transitions still produce tearing.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 border border-slate-800 rounded-md bg-slate-900/50">
                      <div className="font-semibold text-white mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                        <span>Supporting Evidence (FACT)</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1.5 text-slate-300 text-[11px]">
                        <li>Explicit closing reference in PR description</li>
                        <li>AST match in Hook deferred scheduler</li>
                        <li>Commit included in React 19.0.0-rc.0</li>
                      </ul>
                    </div>

                    <div className="p-4 border border-slate-800 rounded-md bg-slate-900/50">
                      <div className="font-semibold text-white mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>Missing / Contradictory Evidence (INFERENCE)</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1.5 text-slate-300 text-[11px]">
                        <li>Issue was closed automatically by GitHub bot</li>
                        <li>Zero test fixtures for nested root transitions</li>
                        <li>Follow-up issue #29381 opened citing identical stack</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'code' && (
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] pb-2 border-b border-slate-800">
                    <span>packages/react/src/ReactHooks.js:L184-L198</span>
                    <span className="text-[#38bdf8]">Commit b84f291</span>
                  </div>
                  <div className="bg-[#0b1120] p-4 rounded-md border border-slate-800 overflow-x-auto text-[11px] leading-relaxed">
                    <div className="text-slate-500">// CodeForensics AST Analyzer: Traced symbol useDeferredValue</div>
                    <div className="text-slate-300">function updateDeferredValueHookState(current, workInProgress) &#123;</div>
                    <div className="text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded-xs">-  const prevValue = current.memoizedState;</div>
                    <div className="text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-xs">+  const prevValue = readTransitionSnapshot(current.memoizedState);</div>
                    <div className="text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-xs">+  // NOTE: Coverage gap — nested lane transitions unverified</div>
                    <div className="text-slate-300">   return prevValue;</div>
                    <div className="text-slate-300">&#125;</div>
                  </div>
                </div>
              )}
            </div>

            {/* Workbench Footer Bar */}
            <div className="px-6 py-4 bg-slate-900/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <span className="text-slate-400 font-mono">
                Inspect this complete evidence graph live in the interactive workbench.
              </span>
              <Link
                to="/app/issues"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#38bdf8] text-[#0b1120] hover:bg-[#7dd3fc] font-mono font-bold text-xs uppercase tracking-wider rounded transition-colors"
              >
                <span>Explore in Workbench</span>
                <span>↗</span>
              </Link>
            </div>
          </div>

          {/* Trust Taxonomy Explainer Strip */}
          <div className="mt-12 pt-8 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-md">
              <div className="flex items-center gap-1.5 mb-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                <span className="text-xs font-mono font-bold text-[#10b981]">FACT</span>
              </div>
              <p className="text-xs text-slate-400 leading-snug">
                Authoritative provider records: closed states, merged SHAs, Git trees.
              </p>
            </div>

            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-md">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono font-bold text-amber-400">INFERENCE</span>
              </div>
              <p className="text-xs text-slate-400 leading-snug">
                Deterministic code and diff analysis with inspectable citations.
              </p>
            </div>

            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-md">
              <div className="flex items-center gap-1.5 mb-1.5">
                <GitCommit className="w-4 h-4 text-[#38bdf8]" />
                <span className="text-xs font-mono font-bold text-[#38bdf8]">HYPOTHESIS</span>
              </div>
              <p className="text-xs text-slate-400 leading-snug">
                Competing explanations under active investigation.
              </p>
            </div>

            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-md">
              <div className="flex items-center gap-1.5 mb-1.5">
                <HelpCircle className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-mono font-bold text-slate-400">UNKNOWN</span>
              </div>
              <p className="text-xs text-slate-400 leading-snug">
                Honest abstention when tests, data, or coverage are incomplete.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 7. Evidentiary Rules (Light Paper Rhythm)                              */}
      {/* ---------------------------------------------------------------------- */}
      <section id="rules" className="bg-[#f8fafc] text-[#0f172a] py-24 sm:py-32 px-6 sm:px-12 lg:px-20 border-b border-slate-300">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mb-16">
            <p className="text-[11px] font-mono uppercase tracking-widest text-[#0284c7] font-semibold mb-3">
              Non-Negotiable Integrity
            </p>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#0f172a] leading-tight">
              Rules of evidence in <br />
              <em className="font-editorial italic font-normal text-[#1e293b]">CodeForensics.</em>
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-3 leading-relaxed">
              Most developer tools rush to generate confident-sounding answers. CodeForensics operates under strict evidentiary constraints to protect engineering truth.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rule 1 */}
            <div className="p-6 bg-white border border-slate-300 rounded-lg shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#0284c7]">RULE 01</span>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Provider Status</span>
              </div>
              <h3 className="text-lg font-bold text-[#0f172a] pt-1">Closed ≠ Fixed</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                A closed issue is proof of provider status, not proof that the underlying problem was resolved. If an issue lacks a traceable commit diff or regression test, CodeForensics flags it as unverified.
              </p>
            </div>

            {/* Rule 2 */}
            <div className="p-6 bg-white border border-slate-300 rounded-lg shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#0284c7]">RULE 02</span>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Branch Incorporation</span>
              </div>
              <h3 className="text-lg font-bold text-[#0f172a] pt-1">Merged ≠ Complete</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                A merged pull request proves code was incorporated into a branch, not that every reported symptom was cured. We audit test suites to detect partial fixes and edge-case gaps.
              </p>
            </div>

            {/* Rule 3 */}
            <div className="p-6 bg-white border border-slate-300 rounded-lg shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#0284c7]">RULE 03</span>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Semantic Restraint</span>
              </div>
              <h3 className="text-lg font-bold text-[#0f172a] pt-1">Similar Titles ≠ Duplicates</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Superficial semantic text similarity is not evidence. Two issues are only considered candidate duplicates if they share changed file overlaps, call stacks, or explicit maintainer cross-references.
              </p>
            </div>

            {/* Rule 4 */}
            <div className="p-6 bg-white border border-slate-300 rounded-lg shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#0284c7]">RULE 04</span>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Zero Trust Input</span>
              </div>
              <h3 className="text-lg font-bold text-[#0f172a] pt-1">Repository Content is Untrusted Input</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Issue descriptions, comments, README files, and commit logs originate outside our security boundary. They are treated strictly as passive data, fully neutralizing prompt injection attacks.
              </p>
            </div>

            {/* Rule 5 */}
            <div className="p-6 bg-white border border-slate-300 rounded-lg shadow-xs space-y-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#0284c7]">RULE 05</span>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Epistemic Humility</span>
              </div>
              <h3 className="text-lg font-bold text-[#0f172a] pt-1">Honest Abstention Over False Confidence</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                If repository data was truncated by rate limits or history is missing, the system outputs <code className="font-mono text-[#0f172a] font-bold">UNKNOWN</code>. We never manufacture answers when evidence is insufficient.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 8. Final Call to Action (Deep Slate Blue)                              */}
      {/* ---------------------------------------------------------------------- */}
      <section className="bg-[#0b1120] py-24 sm:py-32 px-6 sm:px-12 lg:px-20 border-b border-slate-800 text-center">
        <div className="max-w-4xl mx-auto p-10 sm:p-16 bg-[#1e293b]/50 border border-slate-700 rounded-2xl shadow-2xl space-y-6">
          <p className="text-xs font-mono uppercase tracking-widest text-[#38bdf8]">
            Evidence-Backed Workbench
          </p>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
            Bring forensic rigor to your repository investigations.
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed font-light">
            Stop stitching together twenty browser tabs across issues, PRs, and commit diffs. Open the workbench and inspect verified evidence.
          </p>
          <div className="pt-4">
            <Link
              to="/app"
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-[#38bdf8] text-[#0b1120] hover:bg-[#7dd3fc] font-mono font-bold text-xs uppercase tracking-wider rounded transition-all duration-200 shadow-[0_0_24px_rgba(56,189,248,0.3)] hover:-translate-y-0.5"
            >
              <span>Launch CodeForensics Workbench</span>
              <span className="text-sm">↗</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 9. Minimal Technical Footer                                            */}
      {/* ---------------------------------------------------------------------- */}
      <footer className="bg-[#0b1120] px-6 sm:px-12 lg:px-20 py-12 text-xs text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-[#1e293b] border border-[#38bdf8]/40 flex items-center justify-center text-[#38bdf8] font-mono font-bold text-xs">
              CF
            </div>
            <span className="font-bold text-white text-sm">CodeForensics</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400 text-xs">Evidence-backed repository intelligence workbench</span>
          </div>

          <div className="flex items-center gap-6 font-mono text-[11px]">
            <Link to="/app" className="hover:text-white transition-colors">
              Workbench
            </Link>
            <Link to="/app/issues" className="hover:text-white transition-colors">
              Issues & PRs
            </Link>
            <Link to="/app/contributions" className="hover:text-white transition-colors">
              Contributions
            </Link>
            <Link to="/app/investigations" className="hover:text-white transition-colors">
              Investigations
            </Link>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500 font-mono">
          <div>
            © 2026 CodeForensics. Released under the <span className="font-semibold text-slate-300">MIT License</span>.
          </div>
          <div>
            Built for open-source maintainers and engineers.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
