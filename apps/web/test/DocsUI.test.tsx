import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DocsPage } from '../src/pages/DocsPage.js';

describe('Phase 9: In-App Documentation Frontend Experience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders documentation header, title, and release badge', () => {
    render(
      <MemoryRouter initialEntries={['/app/docs']}>
        <DocsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Developer Reference & System Guide')).toBeDefined();
    expect(screen.getByText('Release v0.1.0')).toBeDefined();
    expect(screen.getByPlaceholderText('Search documentation...')).toBeDefined();
  });

  it('renders documentation categories and default overview chapter', () => {
    render(
      <MemoryRouter initialEntries={['/app/docs']}>
        <DocsPage />
      </MemoryRouter>
    );

    expect(screen.getAllByText('Fundamentals').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Intelligence Engines').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Operations & Security').length).toBeGreaterThanOrEqual(1);

    // Default active chapter heading
    expect(screen.getByRole('heading', { level: 2, name: 'Product Overview & Philosophy' })).toBeDefined();
    expect(screen.getByText(/The Non-Negotiable Evidentiary Hierarchy/i)).toBeDefined();
  });

  it('navigates to a different chapter when clicked in the sidebar', () => {
    render(
      <MemoryRouter initialEntries={['/app/docs']}>
        <DocsPage />
      </MemoryRouter>
    );

    const relButton = screen.getByRole('button', { name: /Relationship Intelligence/i });
    fireEvent.click(relButton);

    expect(screen.getByRole('heading', { level: 2, name: 'Relationship Intelligence' })).toBeDefined();
    expect(screen.getByText(/Supported Relationship Types/i)).toBeDefined();
    expect(screen.getByText(/ADDRESSES/i)).toBeDefined();
  });

  it('filters chapters based on search query', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/app/docs']}>
        <DocsPage />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText('Search documentation...');
    fireEvent.change(searchInput, { target: { value: 'Archaeology' } });

    const sidebar = container.querySelector('aside');
    expect(sidebar).toBeDefined();

    // Matching chapter button should be present in sidebar
    expect(sidebar?.textContent).toContain('Code Archaeology & AST Discovery');
    // Non-matching chapter should be excluded from sidebar
    expect(sidebar?.textContent).not.toContain('Connecting GitHub & Permissions');
  });

  it('navigates between chapters using Next and Previous buttons', () => {
    render(
      <MemoryRouter initialEntries={['/app/docs']}>
        <DocsPage />
      </MemoryRouter>
    );

    // On Overview (first chapter), Next button should be present pointing to GitHub Setup
    const nextBtn = screen.getByRole('button', { name: /Next Connecting GitHub & Permissions/i });
    expect(nextBtn).toBeDefined();
    fireEvent.click(nextBtn);

    expect(screen.getByRole('heading', { level: 2, name: 'Connecting GitHub & Permissions' })).toBeDefined();

    // Now Previous button should be present pointing back to Overview
    const prevBtn = screen.getByRole('button', { name: /Previous Product Overview & Philosophy/i });
    expect(prevBtn).toBeDefined();
    fireEvent.click(prevBtn);

    expect(screen.getByRole('heading', { level: 2, name: 'Product Overview & Philosophy' })).toBeDefined();
  });

  it('supports copying code snippets to clipboard', () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <MemoryRouter initialEntries={['/app/docs?chapter=github-setup']}>
        <DocsPage />
      </MemoryRouter>
    );

    const copyBtn = screen.getByRole('button', { name: /Copy/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalled();
  });
});
