import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../src/App.js';

describe('CodeForensics Web Shell Foundation', () => {
  it('renders workbench brand and navigation items', () => {
    render(<App />);
    expect(screen.getByText('CodeForensics')).toBeDefined();
    expect(screen.getByText('Workbench')).toBeDefined();
    expect(screen.getByText('Overview')).toBeDefined();
    expect(screen.getByText('Issues & PRs')).toBeDefined();
    expect(screen.getByText('Contribution Finder')).toBeDefined();
    expect(screen.getByText('Code Archaeology')).toBeDefined();
    expect(screen.getByText('Investigations')).toBeDefined();
  });

  it('renders active repository context', () => {
    render(<App />);
    expect(screen.getByText('Active Repository')).toBeDefined();
    expect(screen.getAllByText('facebook/react').length).toBeGreaterThanOrEqual(1);
  });

  it('renders repository overview metrics and evidence panels', () => {
    render(<App />);
    expect(screen.getByText('Synchronized Issues')).toBeDefined();
    expect(screen.getByText('Pull Requests Tracked')).toBeDefined();
    expect(screen.getByText('Evidenced Relationships')).toBeDefined();
    expect(screen.getByText('Recent Evidence-Backed Lineage Findings')).toBeDefined();
  });
});
