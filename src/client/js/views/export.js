/**
 * Export View
 * Generates executive product discovery summaries in Markdown or JSON with supporting evidence.
 */
import { api } from '../api.js';
import { toast } from '../components/toast.js';

let selectedThemes = new Set();
let exportFormat = 'markdown';
let generatedReport = null;

export async function renderExport(container) {
  container.innerHTML = `
    <div style="display:flex; justify-content:center; align-items:center; min-height:300px;">
      <div class="spinner"></div>
    </div>
  `;

  try {
    const { themes } = await api.getThemes();
    // Default select all active non-rejected themes
    if (selectedThemes.size === 0) {
      themes.filter(t => t.status !== 'user_rejected').forEach(t => selectedThemes.add(t.id));
    }

    renderUI(themes);
    generateReportPreview();
  } catch (err) {
    container.innerHTML = `<div class="card"><p style="color:var(--color-danger);">${err.message}</p></div>`;
  }

  function renderUI(themes) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Export Discovery Summary</h1>
          <p class="page-subtitle">Package your reviewed themes, evidence trail, customer quotes, and follow-up research questions for team alignment.</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button id="btn-copy-report" class="btn btn-secondary">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            <span>Copy to Clipboard</span>
          </button>
          <button id="btn-download-report" class="btn btn-primary">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download Summary</span>
          </button>
        </div>
      </div>

      <div class="export-layout">
        <!-- Left: Theme Selection & Format Controls -->
        <div class="export-selection-panel">
          <h2 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 0.5rem;">Select Themes</h2>
          <p style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 1.25rem;">Choose which themes to include in this discovery report.</p>

          <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
            <button id="btn-select-all" class="btn btn-ghost btn-sm">Select All</button>
            <button id="btn-deselect-all" class="btn btn-ghost btn-sm">Clear All</button>
          </div>

          <!-- Themes Checkboxes -->
          <div style="display: flex; flex-direction: column; gap: 0.625rem; max-height: 380px; overflow-y: auto; padding-right: 0.25rem; margin-bottom: 1.5rem;">
            ${themes.map(t => `
              <label style="display: flex; align-items: flex-start; gap: 0.625rem; font-size: 0.875rem; color: var(--text-primary); cursor: pointer; user-select: none; padding: 0.5rem; border-radius: var(--radius-sm); background: var(--bg-surface-elevated);">
                <input type="checkbox" class="theme-checkbox" value="${t.id}" ${selectedThemes.has(t.id) ? 'checked' : ''} style="margin-top: 0.25rem;" />
                <div>
                  <div style="font-weight: 600;">${t.name}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">${t.frequency_count} mentions • ${t.severity}</div>
                </div>
              </label>
            `).join('')}
          </div>

          <!-- Format Selector -->
          <div style="border-top: 1px solid var(--border-subtle); padding-top: 1.25rem;">
            <label style="font-size: 0.8125rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 0.5rem;">
              Output Format
            </label>
            <select id="export-format" class="select">
              <option value="markdown" ${exportFormat === 'markdown' ? 'selected' : ''}>Markdown (.md)</option>
              <option value="json" ${exportFormat === 'json' ? 'selected' : ''}>Structured JSON (.json)</option>
            </select>
          </div>
        </div>

        <!-- Right: Live Formatted Preview Card -->
        <div class="export-preview-card">
          <div style="padding: 1rem 1.5rem; background: var(--bg-surface-elevated); border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="badge badge-auto" id="preview-format-tag">${exportFormat.toUpperCase()}</span>
              <span style="font-size: 0.875rem; font-weight: 600; color: var(--text-primary);">Summary Preview</span>
            </div>
            <span style="font-size: 0.75rem; color: var(--text-muted);">
              ${selectedThemes.size} themes included
            </span>
          </div>

          <pre class="preview-code-block" id="preview-content">Generating discovery summary preview...</pre>
        </div>
      </div>
    `;

    // Hook listeners
    document.querySelectorAll('.theme-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        if (e.target.checked) selectedThemes.add(e.target.value);
        else selectedThemes.delete(e.target.value);
        generateReportPreview();
      });
    });

    document.getElementById('btn-select-all').addEventListener('click', () => {
      themes.forEach(t => selectedThemes.add(t.id));
      document.querySelectorAll('.theme-checkbox').forEach(cb => cb.checked = true);
      generateReportPreview();
    });

    document.getElementById('btn-deselect-all').addEventListener('click', () => {
      selectedThemes.clear();
      document.querySelectorAll('.theme-checkbox').forEach(cb => cb.checked = false);
      generateReportPreview();
    });

    document.getElementById('export-format').addEventListener('change', (e) => {
      exportFormat = e.target.value;
      document.getElementById('preview-format-tag').innerText = exportFormat.toUpperCase();
      generateReportPreview();
    });

    document.getElementById('btn-copy-report').addEventListener('click', () => {
      if (!generatedReport || !generatedReport.content) return toast.warning('No report generated yet');
      navigator.clipboard.writeText(generatedReport.content);
      toast.success('Summary copied to clipboard!');
    });

    document.getElementById('btn-download-report').addEventListener('click', () => {
      if (!generatedReport || !generatedReport.content) return toast.warning('No report generated yet');
      const blob = new Blob([generatedReport.content], {
        type: exportFormat === 'json' ? 'application/json' : 'text/markdown',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `product-discovery-summary-${new Date().toISOString().split('T')[0]}.${exportFormat === 'json' ? 'json' : 'md'}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Download started!');
    });
  }

  async function generateReportPreview() {
    const previewBox = document.getElementById('preview-content');
    if (!previewBox) return;

    if (selectedThemes.size === 0) {
      previewBox.innerText = 'Select at least one theme from the left panel to generate a discovery summary.';
      return;
    }

    previewBox.innerText = 'Regenerating preview...';

    try {
      generatedReport = await api.exportReport({
        theme_ids: Array.from(selectedThemes),
        format: exportFormat,
        title: 'Voice of Customer — Product Discovery Summary',
      });

      previewBox.innerText = generatedReport.content;
    } catch (err) {
      previewBox.innerText = `Error generating preview: ${err.message}`;
    }
  }
}
