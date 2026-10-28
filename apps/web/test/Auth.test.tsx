import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../src/App.js';
import type { User } from 'firebase/auth';

describe('Phase 2: Frontend Authentication & Protected Routes', () => {
  it('allows unauthenticated access to the public landing page at "/"', () => {
    window.history.pushState({}, 'Test', '/');
    render(<App initialUser={null} />);

    expect(screen.getByText('Stop guessing why code was written.')).toBeDefined();
    expect(screen.getByText('Inspect the evidence.')).toBeDefined();
    expect(screen.getByText('Launch Interactive Workbench')).toBeDefined();
  });

  it('redirects unauthenticated users attempting to access "/app" to the login page', () => {
    window.history.pushState({}, 'Test', '/app');
    render(<App initialUser={null} />);

    // Since user is null, ProtectedRoute redirects to /login
    expect(screen.getByText('Sign in to Workbench')).toBeDefined();
    expect(screen.getByLabelText('Email Address')).toBeDefined();
    expect(screen.getByLabelText('Password')).toBeDefined();
    expect(screen.getByRole('button', { name: /sign in to workbench/i })).toBeDefined();
  });

  it('allows authenticated users to access the protected forensic workbench at "/app"', () => {
    const mockUser = {
      uid: 'maintainer_789',
      email: 'lead-maintainer@codeforensics.org',
      displayName: 'Lead Maintainer',
      getIdToken: async () => 'mock-firebase-token-xyz',
    } as unknown as User;

    window.history.pushState({}, 'Test', '/app');
    render(<App initialUser={mockUser} />);

    // Renders workbench shell and TopBar with user identity
    expect(screen.getByText('Lead Maintainer')).toBeDefined();
    expect(screen.getByText('lead-maintainer@codeforensics.org')).toBeDefined();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeDefined();
  });

  it('renders public login page at "/login" with email/password and OAuth providers', () => {
    window.history.pushState({}, 'Test', '/login');
    render(<App initialUser={null} />);

    expect(screen.getByText('Sign in to Workbench')).toBeDefined();
    expect(screen.getByText('GitHub')).toBeDefined();
    expect(screen.getByText('Google')).toBeDefined();
    expect(screen.getByText('Account Access')).toBeDefined();
  });
});
