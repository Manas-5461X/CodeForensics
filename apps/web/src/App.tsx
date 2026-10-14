import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './components/layout/AppShell.js';
import { ErrorBoundary } from './components/ui/ErrorBoundary.js';
import { OverviewPage } from './pages/OverviewPage.js';
import { IssuesPage } from './pages/IssuesPage.js';
import { ContributionsPage } from './pages/ContributionsPage.js';
import { ArchaeologyPage } from './pages/ArchaeologyPage.js';
import { InvestigationsPage } from './pages/InvestigationsPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppShell />}>
              <Route index element={<OverviewPage />} />
              <Route path="issues" element={<IssuesPage />} />
              <Route path="contributions" element={<ContributionsPage />} />
              <Route path="archaeology" element={<ArchaeologyPage />} />
              <Route path="investigations" element={<InvestigationsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
