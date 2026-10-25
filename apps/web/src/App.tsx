import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext.js';
import { RepositoryProvider } from './context/RepositoryContext.js';
import { ProtectedRoute } from './components/auth/ProtectedRoute.js';
import { AppShell } from './components/layout/AppShell.js';
import { ErrorBoundary } from './components/ui/ErrorBoundary.js';
import { LandingPage } from './pages/LandingPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { OverviewPage } from './pages/OverviewPage.js';
import { IssuesPage } from './pages/IssuesPage.js';
import { ContributionsPage } from './pages/ContributionsPage.js';
import { ArchaeologyPage } from './pages/ArchaeologyPage.js';
import { InvestigationsPage } from './pages/InvestigationsPage.js';
import { DocsPage } from './pages/DocsPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';
import type { User } from 'firebase/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export interface AppProps {
  initialUser?: User | null;
  initialLoading?: boolean;
}

export function App({ initialUser, initialLoading }: AppProps = {}) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider initialUser={initialUser} initialLoading={initialLoading}>
          <RepositoryProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Landing Page */}
                <Route path="/" element={<LandingPage />} />

                {/* Public Authentication Gate */}
                <Route path="/login" element={<LoginPage />} />

                {/* Protected Forensic Workbench Routes */}
                <Route
                  path="/app"
                  element={
                    <ProtectedRoute>
                      <AppShell />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<OverviewPage />} />
                  <Route path="issues" element={<IssuesPage />} />
                  <Route path="contributions" element={<ContributionsPage />} />
                  <Route path="archaeology" element={<ArchaeologyPage />} />
                  <Route path="investigations" element={<InvestigationsPage />} />
                  <Route path="docs" element={<DocsPage />} />
                </Route>

                {/* 404 Route */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </BrowserRouter>
          </RepositoryProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
