import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  GitPullRequest,
  Sparkles,
  GitBranch,
  BookOpen,
  FolderGit2,
  ChevronDown,
} from 'lucide-react';
import { cn } from '../../utils/cn.js';

interface SidebarProps {
  className?: string;
  activeRepo?: string;
}

export function Sidebar({ className, activeRepo = 'facebook/react' }: SidebarProps) {
  const navItems = [
    { label: 'Overview', to: '/app', end: true, icon: LayoutDashboard },
    { label: 'Issues & PRs', to: '/app/issues', icon: GitPullRequest },
    { label: 'Contribution Finder', to: '/app/contributions', icon: Sparkles },
    { label: 'Code Archaeology', to: '/app/archaeology', icon: GitBranch },
    { label: 'Investigations', to: '/app/investigations', icon: BookOpen },
  ];

  return (
    <aside
      className={cn(
        'w-60 bg-surface border-r border-border-subtle flex flex-col shrink-0 min-h-screen select-none',
        className
      )}
    >
      {/* Brand Header */}
      <div className="h-14 px-4 border-b border-border-subtle flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-85 transition-opacity">
          <div className="w-7 h-7 rounded bg-surface-subtle border border-border-strong flex items-center justify-center text-accent font-mono font-bold text-sm">
            CF
          </div>
          <div>
            <div className="text-sm font-bold text-primary tracking-tight leading-none">
              CodeForensics
            </div>
            <div className="text-[10px] text-primary-muted font-medium mt-0.5">
              Workbench
            </div>
          </div>
        </Link>
      </div>

      {/* Global Repository Context Selector */}
      <div className="p-3 border-b border-border-subtle bg-surface-subtle/30">
        <label className="text-[10px] font-semibold text-primary-muted uppercase tracking-wider block mb-1.5 px-1">
          Active Repository
        </label>
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 bg-surface border border-border-strong rounded-md text-xs font-mono font-medium text-primary hover:border-link transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link"
        >
          <div className="flex items-center gap-2 truncate">
            <FolderGit2 className="w-3.5 h-3.5 text-accent shrink-0" />
            <span className="truncate">{activeRepo}</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-primary-muted shrink-0" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1">
        <div className="text-[10px] font-semibold text-primary-muted uppercase tracking-wider px-2 py-1">
          Forensics
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-surface-selected text-accent font-semibold border-l-2 border-accent'
                    : 'text-primary-secondary hover:text-primary hover:bg-surface-subtle'
                )
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-border-subtle bg-surface-subtle/20 text-[11px] text-primary-muted">
        <div className="flex items-center justify-between">
          <span>Engine v0.1.0</span>
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-success">
            <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
            Online
          </span>
        </div>
      </div>
    </aside>
  );
}
