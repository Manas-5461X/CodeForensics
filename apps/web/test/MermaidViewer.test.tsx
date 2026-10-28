// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MermaidViewer } from '../src/components/map/MermaidViewer.js';

describe('MermaidViewer Component', () => {
  const sampleChart = `graph TD
  root["📁 repo"]:::rootClass
  root --> n_apps["📁 apps (▾ 10 files)"]:::dirClass
  n_apps --> n_apps_api["📁 api (▾ 5 files)"]:::dirClass
  n_apps_api --> n_server_ts["📄 server.ts [🔥 85/100]"]:::hotClass
  classDef rootClass fill:#0f172a,stroke:#38bdf8;
  classDef dirClass fill:#1e293b,stroke:#0284c7;
  classDef hotClass fill:#450a0a,stroke:#f43f5e;`;

  it('renders compact header with small title, SVG badge, and logo buttons', () => {
    render(
      <MermaidViewer
        chart={sampleChart}
        title="Sample Repo Architecture"
        filename="test-map"
      />
    );

    // Title and badge
    expect(screen.getByText('Sample Repo Architecture')).toBeDefined();
    expect(screen.getByText('SVG')).toBeDefined();

    // Mode toggle
    expect(screen.getByText('Graph')).toBeDefined();
    expect(screen.getByText('Code')).toBeDefined();

    // Icon action buttons
    expect(screen.getByLabelText('Copy Code')).toBeDefined();
  });

  it('switches to Code tab and renders raw Mermaid syntax specification', () => {
    render(<MermaidViewer chart={sampleChart} title="Syntax Test" />);

    // Click 'Code' tab
    const codeButton = screen.getByText('Code');
    fireEvent.click(codeButton);

    // Should display specification note and pre block
    expect(screen.getByText(/Mermaid Specification/i)).toBeDefined();
    expect(screen.getByText(/n_server_ts/i)).toBeDefined();
  });

  it('triggers onNodeClick when clicking an SVG node', () => {
    const handleNodeClick = vi.fn();
    const { container } = render(
      <MermaidViewer
        chart={sampleChart}
        title="Interactive Test"
        onNodeClick={handleNodeClick}
      />
    );

    // Simulate an SVG node inside the canvas container
    const canvas = container.querySelector('.mermaid-canvas');
    expect(canvas).toBeDefined();

    if (canvas) {
      const mockNode = document.createElement('div');
      mockNode.className = 'node default';
      mockNode.id = 'flowchart-n_apps_api-42';
      mockNode.textContent = '📁 api (▾ 5 files)';
      canvas.appendChild(mockNode);

      fireEvent.click(mockNode);
      expect(handleNodeClick).toHaveBeenCalledWith('n_apps_api', '📁 api (▾ 5 files)');
    }
  });
});
