import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type {
  RepositoryInfo,
  RepositorySyncStateInfo,
  GitHubInstallationInfo,
  SyncTriggerResult,
} from '@codeforensics/shared';
import { useApiClient } from '../utils/apiClient.js';
import { useAuth } from './AuthContext.js';

export interface RepositoryContextType {
  activeRepo: RepositoryInfo | null;
  repositories: RepositoryInfo[];
  syncState: RepositorySyncStateInfo | null;
  isLoadingRepos: boolean;
  isSyncing: boolean;
  syncError: string | null;
  installations: GitHubInstallationInfo[];
  selectRepository: (repo: RepositoryInfo) => void;
  trackNewRepository: (owner: string, repo: string, installationId?: number) => Promise<RepositoryInfo>;
  triggerSync: (force?: boolean) => Promise<void>;
  refreshSyncState: () => Promise<void>;
  refreshRepositories: () => Promise<void>;
}

const RepositoryContext = createContext<RepositoryContextType | null>(null);

export const RepositoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { request } = useApiClient();
  const { user } = useAuth();

  const [repositories, setRepositories] = useState<RepositoryInfo[]>([]);
  const [activeRepo, setActiveRepo] = useState<RepositoryInfo | null>(null);
  const [syncState, setSyncState] = useState<RepositorySyncStateInfo | null>(null);
  const [installations, setInstallations] = useState<GitHubInstallationInfo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch all tracked repositories
  const refreshRepositories = useCallback(async () => {
    if (!user) {
      setRepositories([]);
      return;
    }
    try {
      setIsLoadingRepos(true);
      const res = await request<RepositoryInfo[]>('/api/v1/repositories');
      if (res.data) {
        setRepositories(res.data);
        // If activeRepo is not set or not in list, default to first tracked repo
        setActiveRepo((current) => {
          if (current) {
            const found = res.data?.find((r) => r.id === current.id);
            return found || current;
          }
          return res.data && res.data.length > 0 ? res.data[0] : null;
        });
      }
    } catch (err) {
      console.error('Failed to load tracked repositories:', err);
    } finally {
      setIsLoadingRepos(false);
    }
  }, [request, user]);

  // Fetch GitHub App installations
  const refreshInstallations = useCallback(async () => {
    if (!user) {
      setInstallations([]);
      return;
    }
    try {
      const res = await request<GitHubInstallationInfo[]>('/api/v1/github/installations');
      if (res.data) {
        setInstallations(res.data);
      }
    } catch (err) {
      console.warn('Failed to fetch GitHub App installations:', err);
    }
  }, [request, user]);

  // Refresh sync state for currently active repository
  const refreshSyncState = useCallback(async () => {
    if (!user || !activeRepo) {
      setSyncState(null);
      return;
    }
    try {
      const res = await request<RepositorySyncStateInfo>(
        `/api/v1/repositories/${encodeURIComponent(activeRepo.owner)}/${encodeURIComponent(activeRepo.name)}/sync`
      );
      if (res.data) {
        setSyncState(res.data);
        if (res.data.errorSummary) {
          setSyncError(res.data.errorSummary);
        } else if (res.data.status === 'COMPLETED') {
          setSyncError(null);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch sync state:', err);
    }
  }, [request, user, activeRepo]);

  // Trigger sync on active repository
  const triggerSync = useCallback(
    async (force = true) => {
      if (!activeRepo) return;
      try {
        setSyncError(null);
        const res = await request<SyncTriggerResult>(
          `/api/v1/repositories/${encodeURIComponent(activeRepo.owner)}/${encodeURIComponent(activeRepo.name)}/sync`,
          {
            method: 'POST',
            body: JSON.stringify({ force }),
          }
        );
        if (res.data) {
          await refreshSyncState();
        }
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Failed to trigger sync');
      }
    },
    [activeRepo, request, refreshSyncState]
  );

  // Track and select a new repository with server-side authorization check
  const trackNewRepository = useCallback(
    async (owner: string, repo: string, installationId?: number): Promise<RepositoryInfo> => {
      const res = await request<RepositoryInfo>('/api/v1/repositories/select', {
        method: 'POST',
        body: JSON.stringify({ owner, repo, installationId }),
      });

      if (!res.data) {
        throw new Error('Failed to select repository: Empty response from server');
      }

      const selected = res.data;
      setActiveRepo(selected);
      await refreshRepositories();
      if (selected.syncState) {
        setSyncState(selected.syncState);
      }
      return selected;
    },
    [request, refreshRepositories]
  );

  const selectRepository = useCallback((repo: RepositoryInfo) => {
    setActiveRepo(repo);
    if (repo.syncState) {
      setSyncState(repo.syncState);
    }
  }, []);

  // Initial loads on auth change
  useEffect(() => {
    void refreshRepositories();
    void refreshInstallations();
  }, [refreshRepositories, refreshInstallations]);

  // Load sync state when active repo changes
  useEffect(() => {
    void refreshSyncState();
  }, [refreshSyncState]);

  // Observable polling when sync is active (QUEUED or RUNNING)
  useEffect(() => {
    const isRunning = syncState?.status === 'QUEUED' || syncState?.status === 'RUNNING';

    if (isRunning) {
      if (!pollingRef.current) {
        pollingRef.current = setInterval(() => {
          void refreshSyncState();
        }, 1500);
      }
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [syncState?.status, refreshSyncState]);

  const isSyncing = syncState?.status === 'QUEUED' || syncState?.status === 'RUNNING';

  return (
    <RepositoryContext.Provider
      value={{
        activeRepo,
        repositories,
        syncState,
        isLoadingRepos,
        isSyncing,
        syncError,
        installations,
        selectRepository,
        trackNewRepository,
        triggerSync,
        refreshSyncState,
        refreshRepositories,
      }}
    >
      {children}
    </RepositoryContext.Provider>
  );
};

export function useRepository(): RepositoryContextType {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error('useRepository must be used within a RepositoryProvider');
  }
  return context;
}
