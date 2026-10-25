import { Link } from 'react-router-dom';
import { Search, RefreshCw, CheckCircle2, AlertCircle, Clock, UserCircle2, LogOut, HelpCircle } from 'lucide-react';
import { Button } from '../ui/Button.js';
import { useAuth } from '../../context/AuthContext.js';
import { useRepository } from '../../context/RepositoryContext.js';

interface TopBarProps {
  pageTitle?: string;
  syncStatus?: string;
  lastSyncTime?: string;
  onSyncClick?: () => void;
}

export function TopBar({
  pageTitle = 'Overview',
  syncStatus: propSyncStatus,
  lastSyncTime: propLastSyncTime,
  onSyncClick: propOnSyncClick,
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
    <header className="h-14 border-b border-border-subtle bg-surface px-6 flex items-center justify-between gap-4 shrink-0">
      {/* Title / Breadcrumbs */}
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-primary tracking-tight">
          {pageTitle}
        </h1>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-primary-muted font-mono border-l border-border-subtle pl-3">
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
          <span>
            Sync: {isSyncing ? `Syncing (${syncState?.progress || 0}%)` : currentStatus}
          </span>
          <span>•</span>
          <span>{lastSyncDisplay}</span>
        </div>
      </div>

      {/* Global Actions */}
      <div className="flex items-center gap-2.5">
        {/* Search trigger */}
        <div className="relative hidden md:block w-64">
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
        >
          {isSyncing ? 'Syncing...' : 'Sync'}
        </Button>

        {/* Documentation Link */}
        <Link to="/app/docs" title="Documentation & System Guide">
          <Button
            size="sm"
            variant="ghost"
            className="px-2"
            aria-label="Documentation"
          >
            <HelpCircle className="w-4 h-4 text-primary-muted hover:text-accent transition-colors" />
          </Button>
        </Link>

        {/* User Account / Identity */}
        {user ? (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-xs font-semibold text-primary truncate max-w-[140px]">
                {user.displayName || user.email?.split('@')[0]}
              </span>
              <span className="text-[10px] text-primary-muted font-mono truncate max-w-[140px]">
                {user.email}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => signOut()}
              leftIcon={<LogOut className="w-3.5 h-3.5 text-primary-secondary" />}
              title="Sign Out"
            >
              Sign Out
            </Button>
          </div>
        ) : (
          <Link to="/login">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<UserCircle2 className="w-3.5 h-3.5 text-primary-secondary" />}
            >
              Sign In
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
