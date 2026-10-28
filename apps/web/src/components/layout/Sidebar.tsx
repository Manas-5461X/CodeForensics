import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Compass,
  LayoutDashboard,
  GitPullRequest,
  Sparkles,
  GitBranch,
  BookOpen,
  FolderGit2,
  ChevronDown,
  X,
  FileText,
  Network,
} from 'lucide-react';
import { cn } from '../../utils/cn.js';
import { useRepository } from '../../context/RepositoryContext.js';
import { RepositorySelectModal } from '../repository/RepositorySelectModal.js';

interface SidebarProps {
  className?: string;
  activeRepo?: string;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  className,
  activeRepo: propActiveRepo,
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const { activeRepo: contextActiveRepo } = useRepository();
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);

  const currentRepoName = propActiveRepo || contextActiveRepo?.fullName || 'No Repository Selected';

  const navItems = [
    { label: 'Workflow Guide', to: '/app/workflow', icon: Compass },
    { label: 'Overview', to: '/app', end: true, icon: LayoutDashboard },
    { label: 'Repository Map', to: '/app/map', icon: Network },
    { label: 'Issues & PRs', to: '/app/issues', icon: GitPullRequest },
    { label: 'Contribution Finder', to: '/app/contributions', icon: Sparkles },
    { label: 'Code Archaeology', to: '/app/archaeology', icon: GitBranch },
    { label: 'Investigations', to: '/app/investigations', icon: BookOpen },
  ];

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="h-14 px-4 border-b border-border-subtle flex items-center justify-between shrink-0">
        <Link
          to="/"
          onClick={() => isMobile && onCloseMobile?.()}
          className="flex items-center gap-2.5 hover:opacity-85 transition-opacity"
        >
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

        {isMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 -mr-1.5 text-primary-muted hover:text-primary rounded-md transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Close navigation menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Global Repository Context Selector */}
      <div className="p-3 border-b border-border-subtle bg-surface-subtle/30 shrink-0">
        <label className="text-[10px] font-semibold text-primary-muted uppercase tracking-wider block mb-1.5 px-1">
          Active Repository
        </label>
        <button
          type="button"
          onClick={() => setIsSelectModalOpen(true)}
          className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 bg-surface border border-border-strong rounded-md text-xs font-mono font-medium text-primary hover:border-link transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link"
        >
          <div className="flex items-center gap-2 truncate">
            <FolderGit2 className="w-3.5 h-3.5 text-accent shrink-0" />
            <span className="truncate">{currentRepoName}</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-primary-muted shrink-0" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-semibold text-primary-muted uppercase tracking-wider px-2 py-1">
          Forensics
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => isMobile && onCloseMobile?.()}
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

        <div className="pt-3 pb-1 text-[10px] font-semibold text-primary-muted uppercase tracking-wider px-2">
          Resources
        </div>
        <Link
          to="/docs"
          onClick={() => isMobile && onCloseMobile?.()}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium text-primary-secondary hover:text-primary hover:bg-surface-subtle transition-colors"
        >
          <FileText className="w-4 h-4 text-primary-muted shrink-0" />
          <span>Documentation</span>
        </Link>
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-border-subtle bg-surface-subtle/20 text-[11px] text-primary-muted shrink-0">
        <div className="flex items-center justify-between">
          <span>Engine v0.1.0</span>
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-success">
            <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
            Online
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar (visible only on lg screens and up) */}
      <aside
        className={cn(
          'hidden lg:flex w-60 bg-surface border-r border-border-subtle flex-col shrink-0 h-full select-none',
          className
        )}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Off-Canvas Drawer (visible on <lg screens when opened) */}
      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden transition-all duration-200',
          isMobileOpen
            ? 'visible opacity-100 pointer-events-auto'
            : 'invisible opacity-0 pointer-events-none'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation Menu"
      >
        {/* Backdrop */}
        <div
          className={cn(
            'absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200',
            isMobileOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={onCloseMobile}
          aria-hidden="true"
        />

        {/* Sliding Panel */}
        <aside
          className={cn(
            'absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-surface flex flex-col shadow-2xl transition-transform duration-200 ease-in-out select-none border-r border-border-subtle',
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {renderSidebarContent(true)}
        </aside>
      </div>

      <RepositorySelectModal
        isOpen={isSelectModalOpen}
        onClose={() => setIsSelectModalOpen(false)}
      />
    </>
  );
}
