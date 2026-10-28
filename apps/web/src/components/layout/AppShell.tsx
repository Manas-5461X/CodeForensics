import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar.js';
import { TopBar } from './TopBar.js';

export function AppShell() {
  const location = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Close mobile sidebar on route transition
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  const getPageTitle = (path: string): string => {
    if (path.includes('/workflow')) return 'Workbench Workflow Guide';
    if (path.includes('/map')) return 'Repository Architecture Map';
    if (path.includes('/issues')) return 'Issue & PR Lineage';
    if (path.includes('/contributions')) return 'Contribution Finder';
    if (path.includes('/archaeology')) return 'Code Archaeology';
    if (path.includes('/investigations')) return 'Investigations & Evidence';
    if (path.includes('/docs')) return 'Documentation';
    return 'Repository Overview';
  };

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-canvas">
      {/* Navigation Sidebar (Desktop + Mobile Drawer) */}
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Workbench Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopBar
          pageTitle={getPageTitle(location.pathname)}
          onMenuClick={() => setIsMobileSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
