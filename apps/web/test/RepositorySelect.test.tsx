import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RepositorySelectModal } from '../src/components/repository/RepositorySelectModal.js';
import { RepositoryProvider, useRepository } from '../src/context/RepositoryContext.js';
import { AuthProvider } from '../src/context/AuthContext.js';
import type { User } from 'firebase/auth';

const mockUser = {
  uid: 'tester-123',
  email: 'tester@codeforensics.org',
  displayName: 'Forensics Tester',
  getIdToken: async () => 'mock-token',
} as unknown as User;

function TestWorkbenchConsumer() {
  const { activeRepo, syncState } = useRepository();
  return (
    <div>
      <div data-testid="active-repo">{activeRepo?.fullName || 'No Repo'}</div>
      <div data-testid="sync-status">{syncState?.status || 'IDLE'}</div>
    </div>
  );
}

describe('Phase 4: Frontend Repository Selection & Observable Sync', () => {
  it('renders RepositorySelectModal with tracked repositories and discovery controls', async () => {
    const handleClose = vi.fn();

    render(
      <AuthProvider initialUser={mockUser}>
        <RepositoryProvider>
          <RepositorySelectModal isOpen={true} onClose={handleClose} />
          <TestWorkbenchConsumer />
        </RepositoryProvider>
      </AuthProvider>
    );

    expect(screen.getByText('Select Repository')).toBeDefined();
    expect(screen.getByPlaceholderText('Filter tracked repositories...')).toBeDefined();
    expect(screen.getByText('Track Custom Repository')).toBeDefined();
    expect(screen.getByPlaceholderText('Owner (e.g. facebook)')).toBeDefined();
    expect(screen.getByPlaceholderText('Repo (e.g. react)')).toBeDefined();

    // Close button works
    fireEvent.click(screen.getByText('Close'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
