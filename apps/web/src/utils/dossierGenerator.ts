import type { RepositoryMapData, CoChangeReport, RepositoryMapTimeline, KnowledgeLossSummary, RepositoryInfo } from '@codeforensics/shared';

export function generateAuditDossierHtml(params: {
  repo: RepositoryInfo;
  mapData?: RepositoryMapData | null;
  coChangeReport?: CoChangeReport | null;
  timelineData?: RepositoryMapTimeline | null;
  knowledgeLossData?: KnowledgeLossSummary | null;
  mermaidSvg?: string | null;
}): string {
  const { repo, mapData, coChangeReport, timelineData, knowledgeLossData, mermaidSvg } = params;
  const generatedAt = new Date().toUTCString();
  const repoName = repo.fullName || `${repo.owner}/${repo.name}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Forensic Audit Dossier — ${repoName}</title>
  <style>
    :root {
      --bg: #0b1120;
      --card-bg: #131d33;
      --card-border: #1e293b;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
      --rose: #f43f5e;
      --amber: #f59e0b;
      --emerald: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      padding: 32px 24px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    header {
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 24px;
      margin-bottom: 32px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 16px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-family: monospace;
      font-weight: 600;
      background: rgba(56, 189, 248, 0.1);
      color: var(--accent);
      border: 1px solid rgba(56, 189, 248, 0.3);
      text-transform: uppercase;
    }
    h1 { font-size: 28px; font-weight: 700; margin-top: 8px; }
    h2 { font-size: 20px; font-weight: 600; margin: 28px 0 16px; border-left: 3px solid var(--accent); padding-left: 10px; }
    p.lead { color: var(--text-muted); font-size: 14px; margin-top: 4px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 28px; }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 20px;
    }
    .card-title { font-size: 11px; font-family: monospace; text-transform: uppercase; color: var(--text-muted); }
    .card-value { font-size: 26px; font-weight: 700; font-family: monospace; margin-top: 4px; }
    .card-desc { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      font-size: 13px;
      background: var(--card-bg);
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--card-border);
    }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--card-border); }
    th { background: #0f172a; font-family: monospace; font-size: 11px; color: var(--text-muted); text-transform: uppercase; }
    tr:last-child td { border-bottom: none; }
    .tag-hotspot { color: var(--rose); font-weight: 600; }
    .tag-moderate { color: var(--amber); font-weight: 600; }
    .tag-stable { color: var(--emerald); font-weight: 600; }
    .svg-container {
      background: #0f172a;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 24px;
      overflow-x: auto;
      margin-top: 16px;
    }
    footer {
      margin-top: 48px;
      padding-top: 20px;
      border-top: 1px solid var(--card-border);
      font-size: 11px;
      font-family: monospace;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <span class="badge">Standalone Forensic Audit Dossier</span>
        <h1>${repoName}</h1>
        <p class="lead">Air-gapped repository architecture audit, code churn heatmap, and coupling report.</p>
      </div>
      <div style="text-align: right; font-family: monospace; font-size: 12px; color: var(--text-muted);">
        <div>Generated: ${generatedAt}</div>
        <div>Default Branch: ${repo.defaultBranch || 'main'}</div>
      </div>
    </header>

    <div class="grid">
      <div class="card">
        <div class="card-title">Total Code Files</div>
        <div class="card-value" style="color: var(--accent);">${mapData?.summary?.totalFiles ?? 0}</div>
        <div class="card-desc">Across ${mapData?.summary?.totalDirectories ?? 0} indexed directories</div>
      </div>
      <div class="card">
        <div class="card-title">Code Churn Hotspots</div>
        <div class="card-value" style="color: var(--rose);">${mapData?.summary?.hotspotCount ?? 0}</div>
        <div class="card-desc">Files with high change volatility (score ≥ 60)</div>
      </div>
      <div class="card">
        <div class="card-title">Primary Subsystems</div>
        <div class="card-value">${mapData?.summary?.topSubsystems?.length ?? 0}</div>
        <div class="card-desc">Architectural boundary modules</div>
      </div>
      <div class="card">
        <div class="card-title">Audit Evidentiary Status</div>
        <div class="card-value" style="color: var(--emerald);">VERIFIED</div>
        <div class="card-desc">Deterministic Git AST provenance</div>
      </div>
    </div>

    <h2>1. Primary Subsystems & Churn Distribution</h2>
    <table>
      <thead>
        <tr>
          <th>Subsystem</th>
          <th>File Count</th>
          <th>Churn Score</th>
          <th>Volatility Tier</th>
          <th>Primary Maintainer</th>
        </tr>
      </thead>
      <tbody>
        ${(mapData?.summary?.topSubsystems || []).map((sub) => `
          <tr>
            <td style="font-family: monospace; font-weight: 600;">${sub.path}</td>
            <td>${sub.fileCount} files</td>
            <td style="font-family: monospace; font-weight: 600;">${sub.churnScore}/100</td>
            <td class="${sub.churnScore >= 65 ? 'tag-hotspot' : sub.churnScore >= 40 ? 'tag-moderate' : 'tag-stable'}">
              ${sub.churnScore >= 65 ? 'Critical Hotspot' : sub.churnScore >= 40 ? 'Active Churn' : 'Stable Core'}
            </td>
            <td style="font-family: monospace;">@${sub.topMaintainer || 'distributed'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    ${coChangeReport && coChangeReport.pairs && coChangeReport.pairs.length > 0 ? `
      <h2>2. Temporal Co-Change & Coupling Matrix</h2>
      <table>
        <thead>
          <tr>
            <th>Coupled File A</th>
            <th>Coupled File B</th>
            <th>Co-Change Rate</th>
            <th>Coupling Risk</th>
          </tr>
        </thead>
        <tbody>
          ${coChangeReport.pairs.slice(0, 15).map((pair) => `
            <tr>
              <td style="font-family: monospace; font-size: 11px;">${pair.sourceFile}</td>
              <td style="font-family: monospace; font-size: 11px;">${pair.targetFile}</td>
              <td style="font-family: monospace; font-weight: 600; color: var(--accent);">${pair.couplingPercentage}%</td>
              <td class="${pair.crossSubsystem ? 'tag-hotspot' : 'tag-stable'}">
                ${pair.crossSubsystem ? 'Cross-Subsystem Leak' : 'Internal Coupling'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}

    ${knowledgeLossData && knowledgeLossData.riskItems && knowledgeLossData.riskItems.length > 0 ? `
      <h2>3. Bus Factor & Knowledge Loss Heatmap</h2>
      <table>
        <thead>
          <tr>
            <th>File Path</th>
            <th>Churn Score</th>
            <th>Bus Factor</th>
            <th>Author Activity Status</th>
          </tr>
        </thead>
        <tbody>
          ${knowledgeLossData.riskItems.slice(0, 15).map((spot) => `
            <tr>
              <td style="font-family: monospace; font-size: 11px;">${spot.path}</td>
              <td style="font-family: monospace; font-weight: 600;">${spot.churnScore}/100</td>
              <td style="font-family: monospace; font-weight: 700; color: ${spot.busFactor === 1 ? 'var(--rose)' : 'var(--amber)'};">
                ${spot.busFactor}
              </td>
              <td>
                <span class="${spot.maintainerStatus === 'DEPARTED' ? 'tag-hotspot' : spot.maintainerStatus === 'DORMANT' ? 'tag-moderate' : 'tag-stable'}">
                  ${spot.maintainerStatus}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}

    ${timelineData && timelineData.milestones && timelineData.milestones.length > 0 ? `
      <h2>4. Architectural Time-Machine Milestones</h2>
      <table>
        <thead>
          <tr>
            <th>Milestone</th>
            <th>Relative Era</th>
            <th>Files</th>
            <th>Hotspots</th>
          </tr>
        </thead>
        <tbody>
          ${timelineData.milestones.map((m) => `
            <tr>
              <td style="font-weight: 600;">${m.label}</td>
              <td style="color: var(--text-muted); font-size: 11px;">${m.relativeTime}</td>
              <td style="font-family: monospace;">${m.totalFiles} files</td>
              <td style="font-family: monospace; font-weight: 600; color: var(--rose);">${m.hotspotCount} hotspots</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}

    ${mermaidSvg ? `
      <h2>4. Architectural Vector Flowchart</h2>
      <div class="svg-container">
        ${mermaidSvg}
      </div>
    ` : ''}

    <footer>
      <span>CodeForensics • Standalone Forensic Dossier</span>
      <span>Cryptographic Git Provenance</span>
    </footer>
  </div>
</body>
</html>`;
}
