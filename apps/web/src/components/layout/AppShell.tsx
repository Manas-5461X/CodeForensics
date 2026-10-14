import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar.js';
import { TopBar } from './TopBar.js';

export function AppShell() {
  const location = useLocation();

  const getPageTitle = (path: string): string => {
    if (path.startsWith('/issues')) return 'Issue & PR Lineage';
    if (path.startsWith('/contributions')) return 'Contribution Finder';
    if (path.startsWith('/archaeology')) return 'Code Archaeology';
    if (path.startsWith('/investigations')) return 'Investigations & Evidence';
    return 'Repository Overview';
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas">
      {/* Fixed Navigation Sidebar */}
      <Sidebar activeRepo="facebook/react" />

      {/* Main Workbench Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopBar pageTitle={getPageTitle(location.pathname)} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
