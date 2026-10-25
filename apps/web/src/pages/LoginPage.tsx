import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Button } from '../components/ui/Button.js';
import { formatAuthError, FormattedAuthError } from '../utils/authErrors.js';
import {
  Terminal,
  Shield,
  AlertCircle,
  ArrowLeft,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  GitCommit,
  GitPullRequest,
  Check,
} from 'lucide-react';

export function LoginPage() {
  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithGithub,
    isConfigured,
    error,
    clearError,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/app';

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<FormattedAuthError | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !password) {
      setLocalError({
        title: 'Missing Required Fields',
        message: 'Please provide both your email address and password.',
      });
      return;
    }

    if (password.length < 6) {
      setLocalError({
        title: 'Password Too Short',
        message: 'Password must be at least 6 characters in length.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setLocalError(formatAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuth = async (providerFn: () => Promise<unknown>) => {
    setLocalError(null);
    clearError();
    setIsSubmitting(true);
    try {
      await providerFn();
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setLocalError(formatAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeError: FormattedAuthError | null = localError || (error ? formatAuthError(error) : null);

  return (
    <div className="min-h-[100dvh] lg:h-screen w-full bg-[#030712] text-slate-100 flex flex-col lg:flex-row selection:bg-[#38bdf8]/30 overflow-y-auto lg:overflow-hidden font-sans">
      {/* ---------------------------------------------------------------------- */}
      {/* LEFT COLUMN: Editorial Branding & Forensic Architecture (Desktop)     */}
      {/* ---------------------------------------------------------------------- */}
      <div className="relative hidden lg:flex lg:w-1/2 xl:w-[50%] h-full flex-col justify-between p-6 xl:p-8 border-r border-slate-800/80 bg-[#0b1120] overflow-hidden select-none">
        {/* Cinematic Backdrop Visual */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img
            src="/hero-systems.jpg"
            alt="CodeForensics Interconnected Architecture"
            className="w-full h-full object-cover object-center opacity-30 filter contrast-125 brightness-75 scale-105"
          />
          {/* Multi-layered directional dark gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b1120]/95 via-[#0b1120]/80 to-[#0b1120]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1120] via-transparent to-[#0b1120]/60" />

          {/* CAPEX Cyan Coordinate Dots Matrix Overlay */}
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage: 'radial-gradient(circle at 50% 50%, #38bdf8 0 1px, transparent 1.5px)',
              backgroundSize: '16px 16px',
              maskImage: 'linear-gradient(to right, black 50%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, black 50%, transparent 100%)',
            }}
          />
        </div>

        {/* Top: Brand Header Lockup */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-7 h-7 rounded bg-[#1e293b] border border-[#38bdf8]/40 text-[#38bdf8] shadow-[0_0_10px_rgba(56,189,248,0.2)] flex items-center justify-center font-mono font-bold text-xs tracking-tight transition-transform group-hover:scale-105">
              CF
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold tracking-tight text-white group-hover:text-[#38bdf8] transition-colors">
                CodeForensics
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#38bdf8]/80 border-l border-white/15 pl-2">
                Evidence Graph
              </span>
            </div>
          </Link>

          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#06152d]/90 border border-[#00f0ff]/30 text-[9px] font-mono text-[#00f0ff] uppercase tracking-wider backdrop-blur-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-pulse" />
            <span>Cryptographic Gateway</span>
          </div>
        </div>

        {/* Center: Editorial Manifesto & Evidentiary Taxonomy Visual */}
        <div className="relative z-10 my-auto py-2 max-w-lg space-y-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">
              <Shield className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Evidence-Backed Code Intelligence</span>
            </div>
            <h2 className="text-2xl xl:text-3xl font-bold tracking-tight text-white leading-tight">
              Stop guessing why code was written.{' '}
              <span className="text-[#38bdf8] font-normal italic block mt-0.5">
                Inspect the evidence.
              </span>
            </h2>
            <p className="mt-2 text-xs xl:text-sm text-slate-300 leading-relaxed font-light">
              Connect issues, pull requests, review discussions, and commit diffs into an inspectable evidence graph.
              Distinguish observed facts from ungrounded inferences with traceable provenance.
            </p>
          </div>

          {/* Technical Evidence Taxonomy Matrix */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5 backdrop-blur-md space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-800/80 pb-1.5">
              <span>Evidentiary Classification Engine</span>
              <span className="text-[#38bdf8]">Zero Hallucinations</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-slate-950/60 border border-slate-800 flex items-start gap-1.5">
                <span className="inline-block px-1 py-0.5 rounded text-[9px] font-bold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
                  FACT
                </span>
                <span className="text-slate-300 text-[10px] leading-tight">
                  Observed commit SHA or verified GitHub event
                </span>
              </div>

              <div className="p-2 rounded bg-slate-950/60 border border-slate-800 flex items-start gap-1.5">
                <span className="inline-block px-1 py-0.5 rounded text-[9px] font-bold bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30">
                  INFERENCE
                </span>
                <span className="text-slate-300 text-[10px] leading-tight">
                  Deterministic AST or code diff relationship
                </span>
              </div>

              <div className="p-2 rounded bg-slate-950/60 border border-slate-800 flex items-start gap-1.5">
                <span className="inline-block px-1 py-0.5 rounded text-[9px] font-bold bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30">
                  HYPOTHESIS
                </span>
                <span className="text-slate-300 text-[10px] leading-tight">
                  Tentative resolution requiring review
                </span>
              </div>

              <div className="p-2 rounded bg-slate-950/60 border border-slate-800 flex items-start gap-1.5">
                <span className="inline-block px-1 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                  UNKNOWN
                </span>
                <span className="text-slate-300 text-[10px] leading-tight">
                  Honest abstention when provenance missing
                </span>
              </div>
            </div>

            <div className="pt-0.5 flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span className="flex items-center gap-1.5">
                <GitCommit className="w-3 h-3 text-[#38bdf8]" />
                <span>Deterministic Linkage</span>
              </span>
              <span className="flex items-center gap-1.5">
                <GitPullRequest className="w-3 h-3 text-[#10b981]" />
                <span>Verified Merge Proofs</span>
              </span>
            </div>
          </div>
        </div>

        {/* Bottom: Verifiable Benchmark Line */}
        <div className="relative z-10 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
            <span>Benchmark Case #28941 Live</span>
          </div>
          <span className="text-slate-500">Decoupled Identity Boundary</span>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* RIGHT COLUMN: Authentication Console Form (Mobile & Desktop)          */}
      {/* ---------------------------------------------------------------------- */}
      <div className="w-full lg:w-1/2 xl:w-[50%] min-h-[100dvh] lg:h-full flex flex-col justify-between p-4 sm:p-5 lg:p-6 xl:p-8 bg-[#030712] relative overflow-y-auto lg:overflow-hidden">
        {/* Top Row: Navigation and Mobile Brand */}
        <div className="flex items-center justify-between w-full max-w-sm sm:max-w-md mx-auto mb-2 shrink-0">
          {/* Mobile Brand (hidden on desktop) */}
          <Link to="/" className="flex lg:hidden items-center gap-2 group">
            <div className="w-6 h-6 rounded bg-[#1e293b] border border-[#38bdf8]/40 text-[#38bdf8] flex items-center justify-center font-mono font-bold text-xs">
              CF
            </div>
            <span className="text-xs font-bold tracking-tight text-white group-hover:text-[#38bdf8] transition-colors">
              CodeForensics
            </span>
          </Link>

          {/* Desktop Spacer */}
          <div className="hidden lg:block" />

          {/* Return to Landing Link */}
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-400 hover:text-white transition-colors border border-slate-800 hover:border-slate-700 bg-slate-900/60 px-2.5 py-1 rounded"
          >
            <ArrowLeft className="w-3 h-3 text-[#38bdf8]" />
            <span>Back to Landing</span>
          </Link>
        </div>

        {/* Main Authentication Box */}
        <div className="w-full max-w-sm sm:max-w-md mx-auto my-auto py-3 space-y-2.5 shrink-0">
          {/* Precision Mode Toggle Switcher */}
          <div className="grid grid-cols-2 p-0.5 bg-slate-900/90 border border-slate-800 rounded-lg text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setLocalError(null);
                clearError();
              }}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all text-xs ${
                mode === 'signin'
                  ? 'bg-[#38bdf8] text-[#0b1120] font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setLocalError(null);
                clearError();
              }}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all text-xs ${
                mode === 'signup'
                  ? 'bg-[#38bdf8] text-[#0b1120] font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>

          {/* Header Typography */}
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#06152d] border border-[#00f0ff]/30 text-[9px] font-mono text-[#00f0ff] uppercase tracking-wider mb-0.5">
              <Shield className="w-2.5 h-2.5" />
              <span>Forensic Authentication Gate</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
              {mode === 'signin' ? 'Sign in to Workbench' : 'Create Maintainer Account'}
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 font-light">
              {mode === 'signin'
                ? 'Authenticate with your verified identity to access saved repository investigations.'
                : 'Register maintainer identity. Tokens are cryptographically verified by backend.'}
            </p>
          </div>

          {/* Unconfigured Firebase Notice */}
          {!isConfigured && (
            <div className="p-2 px-2.5 bg-amber-500/10 border border-amber-500/30 rounded text-[11px] text-amber-200/90 font-mono flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <div className="leading-tight">
                <span className="font-semibold text-amber-300">Development Notice: </span>
                <span>Placeholder credentials in .env. Live OAuth requires Firebase project setup.</span>
              </div>
            </div>
          )}

          {/* Formatted Error Alert Box */}
          {activeError && (
            <div
              role="alert"
              className="p-3 bg-rose-500/10 border border-rose-500/35 rounded-lg text-rose-300 flex items-start gap-2.5 font-sans shadow-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="space-y-1 w-full text-xs">
                <div className="font-semibold text-rose-200">
                  {activeError.title}
                </div>
                <div className="text-[11px] text-rose-300/90 leading-relaxed">
                  {activeError.message}
                </div>
                {activeError.actionHint && (
                  <div className="text-[10px] text-rose-300/90 bg-rose-950/40 border border-rose-800/40 rounded p-1.5 mt-1 leading-normal">
                    <span className="font-semibold text-rose-200">Recommendation: </span>
                    {activeError.actionHint}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-2">
            <div>
              <label
                className="block text-[10px] font-mono text-slate-300 mb-0.5 uppercase tracking-wider"
                htmlFor="auth-email"
              >
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="maintainer@domain.org"
                className="w-full h-9 bg-slate-950/80 border border-slate-700/80 rounded px-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] transition-colors font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label
                  className="block text-[10px] font-mono text-slate-300 uppercase tracking-wider"
                  htmlFor="auth-password"
                >
                  Password
                </label>
                {mode === 'signin' && (
                  <span className="text-[10px] font-mono text-slate-500">
                    Min 6 characters
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-9 bg-slate-950/80 border border-slate-700/80 rounded pl-3 pr-9 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition-colors rounded focus:outline-none focus-visible:ring-1 focus-visible:ring-[#38bdf8]"
                >
                  {showPassword ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full h-9 justify-center bg-[#38bdf8] text-[#0b1120] hover:bg-[#7dd3fc] font-mono text-xs uppercase tracking-wider font-bold rounded shadow-[0_0_12px_rgba(56,189,248,0.25)] hover:shadow-[0_0_20px_rgba(56,189,248,0.4)] transition-all active:scale-[0.99] mt-1"
              isLoading={isSubmitting}
              leftIcon={mode === 'signin' ? <LogIn className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
            >
              {mode === 'signin' ? 'Sign In to Workbench' : 'Create Maintainer Account'}
            </Button>
          </form>

          {/* Subtle Switcher Link */}
          <div className="text-center pt-0.5">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setLocalError(null);
                clearError();
              }}
              className="text-[11px] text-slate-400 hover:text-[#38bdf8] transition-colors font-mono"
            >
              {mode === 'signin'
                ? 'Need an account? Register maintainer identity →'
                : 'Already have an account? Sign in →'}
            </button>
          </div>

          {/* Divider */}
          <div className="relative pt-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[9px] font-mono uppercase tracking-widest">
              <span className="bg-[#030712] px-2.5 text-slate-500">
                Or authenticate via provider
              </span>
            </div>
          </div>

          {/* OAuth Buttons Grid */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleOAuth(signInWithGithub)}
              className="flex items-center justify-center gap-2 h-9 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded text-xs font-mono text-slate-200 hover:text-white transition-all active:scale-[0.99] disabled:opacity-50"
            >
              <Terminal className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>GitHub</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleOAuth(signInWithGoogle)}
              className="flex items-center justify-center gap-2 h-9 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded text-xs font-mono text-slate-200 hover:text-white transition-all active:scale-[0.99] disabled:opacity-50"
            >
              <span className="font-bold text-xs text-[#38bdf8]">G</span>
              <span>Google</span>
            </button>
          </div>

          {/* Security & Boundary Notice */}
          <div className="pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-500 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Check className="w-3 h-3 text-[#10b981]" />
              <span>Decoupled Identity Boundary</span>
            </div>
            <span className="text-[9px] text-slate-500">Cryptographic backend verification</span>
          </div>
        </div>

        {/* Bottom Footer Note */}
        <div className="w-full max-w-sm sm:max-w-md mx-auto pt-2 text-center text-[10px] font-mono text-slate-600 shrink-0">
          CodeForensics Engine • Software Forensics & Repository Intelligence
        </div>
      </div>
    </div>
  );
}
