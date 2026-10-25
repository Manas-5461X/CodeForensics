import { Link } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCircle2,
  LogOut,
  HelpCircle,
  Menu,
} from 'lucide-react';
import { Button } from '../ui/Button.js';
import { useAuth } from '../../context/AuthContext.js';
import { useRepository } from '../../context/RepositoryContext.js';

interface TopBarProps {
  pageTitle?: string;
  syncStatus?: string;
  lastSyncTime?: string;
  onSyncClick?: () => void;
  onMenuClick?: () => void;
}

export function TopBar({
  pageTitle = 'Overview',
  syncStatus: propSyncStatus,
  lastSyncTime: propLastSyncTime,
  onSyncClick: propOnSyncClick,
  onMenuClick,
}: TopBarProps) {
  const { user, signOut } = useAuth();
  const { syncState, isSyncing, triggerSync, activeRepo } = useRepository();

  const handleSync = () => {
    if (propOnSyncClick) {
      propOnSyncClick();
    } else {
      void triggerSync();
    }
  };

  const currentStatus = propSyncStatus || syncState?.status || 'IDLE';

  const formatLastSync = (dateString?: string | null) => {
    if (propLastSyncTime) return propLastSyncTime;
    if (!dateString) return 'Never';
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(dateString).toLocaleDateString();
  };

  const lastSyncDisplay = formatLastSync(syncState?.lastSuccessfulSyncAt || syncState?.completedAt);

  return (
    <header className="h-14 border-b border-border-subtle bg-surface px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 shrink-0">
      {/* Left: Mobile Menu Toggle + Title / Breadcrumbs */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Drawer Toggle (<lg) */}
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-1 text-primary-muted hover:text-primary hover:bg-surface-subtle rounded-md transition-colors min-w-[38px] min-h-[38px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link"
          aria-label="Open mobile navigation menu"
        >
          <Menu className="w-5 h-5 shrink-0" />
        </button>

        <h1 className="text-xs sm:text-sm font-semibold text-primary tracking-tight truncate max-w-[140px] xs:max-w-[180px] sm:max-w-none">
          {pageTitle}
        </h1>

        {/* Sync Status Badge */}
        <div
          className="flex items-center gap-1.5 text-xs text-primary-muted font-mono sm:border-l sm:border-border-subtle sm:pl-3 shrink-0"
          title={`Sync status: ${currentStatus} • Last sync: ${lastSyncDisplay}`}
        >
          {isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 text-accent animate-spin" />
          ) : currentStatus === 'FAILED' ? (
            <AlertCircle className="w-3.5 h-3.5 text-danger" />
          ) : currentStatus === 'PARTIAL' ? (
            <AlertCircle className="w-3.5 h-3.5 text-warning" />
          ) : currentStatus === 'COMPLETED' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
          ) : (
            <Clock className="w-3.5 h-3.5 text-primary-muted" />
          )}
          <span className="hidden sm:inline">
            Sync: {isSyncing ? `Syncing (${syncState?.progress || 0}%)` : currentStatus}
          </span>
          <span className="hidden md:inline">•</span>
          <span className="hidden md:inline">{lastSyncDisplay}</span>
        </div>
      </div>

      {/* Global Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Search trigger */}
        <div className="relative hidden md:block w-48 lg:w-64">
          <Search className="w-3.5 h-3.5 text-primary-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            readOnly
            placeholder="Search issues, PRs, SHAs... (Ctrl+K)"
            className="w-full bg-surface-subtle text-xs text-primary rounded-md pl-8 pr-3 py-1.5 border border-border-subtle placeholder:text-primary-muted focus:outline-none focus:border-link cursor-pointer"
          />
        </div>

        {/* Sync Trigger Button */}
        <Button
          size="sm"
          variant="secondary"
          onClick={handleSync}
          disabled={isSyncing || !activeRepo}
          leftIcon={
            <RefreshCw
              className={`w-3.5 h-3.5 text-primary-secondary ${
                isSyncing ? 'animate-spin text-accent' : ''
              }`}
            />
          }
          className="px-2 sm:px-3 text-xs"
        >
          <span className="hidden xs:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
        </Button>

        {/* Documentation Link */}
        <Link to="/app/docs" title="Documentation & System Guide">
          <Button
            size="sm"
            variant="ghost"
            className="px-2 min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Documentation"
          >
            <HelpCircle className="w-4 h-4 text-primary-muted hover:text-accent transition-colors" />
          </Button>
        </Link>

        {/* User Account / Identity */}
        {user ? (
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex flex-col items-end text-right">
              <span className="text-xs font-semibold text-primary truncate max-w-[120px]">
                {user.displayName || user.email?.split('@')[0]}
              </span>
              <span className="text-[10px] text-primary-muted font-mono truncate max-w-[120px]">
                {user.email}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => signOut()}
              leftIcon={<LogOut className="w-3.5 h-3.5 text-primary-secondary" />}
              title="Sign Out"
              className="px-2 sm:px-3 text-xs"
            >
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        ) : (
          <Link to="/login">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<UserCircle2 className="w-3.5 h-3.5 text-primary-secondary" />}
              className="px-2.5 sm:px-3 text-xs"
            >
              <span>Sign In</span>
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
