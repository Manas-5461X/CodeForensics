import { Search, RefreshCw, CheckCircle2, UserCircle2 } from 'lucide-react';
import { Button } from '../ui/Button.js';

interface TopBarProps {
  pageTitle?: string;
  syncStatus?: string;
  lastSyncTime?: string;
  onSyncClick?: () => void;
}

export function TopBar({
  pageTitle = 'Overview',
  syncStatus = 'Synced',
  lastSyncTime = '12m ago',
  onSyncClick,
}: TopBarProps) {
  return (
    <header className="h-14 border-b border-border-subtle bg-surface px-6 flex items-center justify-between gap-4 shrink-0">
      {/* Title / Breadcrumbs */}
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-primary tracking-tight">
          {pageTitle}
        </h1>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-primary-muted font-mono border-l border-border-subtle pl-3">
          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
          <span>Sync: {syncStatus}</span>
          <span>•</span>
          <span>{lastSyncTime}</span>
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
          onClick={onSyncClick}
          leftIcon={<RefreshCw className="w-3.5 h-3.5 text-primary-secondary" />}
        >
          Sync
        </Button>

        {/* User Account / Identity */}
        <Button
          size="sm"
          variant="outline"
          leftIcon={<UserCircle2 className="w-3.5 h-3.5 text-primary-secondary" />}
        >
          Sign In
        </Button>
      </div>
    </header>
  );
}
