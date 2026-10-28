// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../src/App.js';
import type { User } from 'firebase/auth';

describe('RepositoryMapPage Route Test', () => {
  it('renders on /app/map with authenticated user', async () => {
    window.history.pushState({}, '', '/app/map');
    const mockUser = {
      uid: 'user-123',
      email: 'forensic@example.com',
      displayName: 'Lead Analyst',
      getIdToken: async () => 'mock-token',
    } as unknown as User;

    render(<App initialUser={mockUser} initialLoading={false} />);

    console.log('AppShell rendered HTML preview:');
    const mainEl = document.querySelector('main');
    console.log('Main HTML:', mainEl?.innerHTML);
    expect(screen.getAllByText('Repository Architecture Map').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('No Repository Selected').length).toBeGreaterThanOrEqual(1);
  });
});
