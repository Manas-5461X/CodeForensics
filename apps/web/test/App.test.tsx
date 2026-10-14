import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../src/App.js';

describe('CodeForensics Public Landing Page', () => {
  it('renders branding, value proposition, and hero headline', () => {
    render(<App />);
    expect(screen.getAllByText('CodeForensics').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Stop guessing why code was written.')).toBeDefined();
    expect(screen.getByText('Inspect the evidence.')).toBeDefined();
    expect(screen.getByText('Launch Interactive Workbench')).toBeDefined();
  });

  it('renders evidence taxonomy badges (FACT, INFERENCE, HYPOTHESIS, UNKNOWN)', () => {
    render(<App />);
    expect(screen.getAllByText('FACT').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('INFERENCE').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('HYPOTHESIS').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('UNKNOWN').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the interactive case study benchmark preview', () => {
    render(<App />);
    expect(screen.getByText('A closed issue is not a fixed issue.')).toBeDefined();
    expect(screen.getByText('1. Lineage Chain')).toBeDefined();
    expect(screen.getByText('2. Forensic Assessment')).toBeDefined();
    expect(screen.getByText('3. Code Diff Proof')).toBeDefined();
  });

  it('renders non-negotiable evidentiary principles', () => {
    render(<App />);
    expect(screen.getByText('Closed ≠ Fixed')).toBeDefined();
    expect(screen.getByText('Merged ≠ Complete')).toBeDefined();
    expect(screen.getByText('Similar Titles ≠ Duplicates')).toBeDefined();
    expect(screen.getByText('Repository Content is Untrusted Input')).toBeDefined();
    expect(screen.getByText('Honest Abstention Over False Confidence')).toBeDefined();
  });

  it('renders footer with valid navigation and MIT license statement', () => {
    render(<App />);
    expect(screen.getByText('MIT License')).toBeDefined();
    expect(screen.getByText('Open Workbench')).toBeDefined();
  });
});
