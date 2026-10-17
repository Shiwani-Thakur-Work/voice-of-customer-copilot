/**
 * Import View
 */
import { api } from '../api.js';
import { toast } from '../components/toast.js';

export async function renderImport(container) {
  container.innerHTML = `
    <div style="display:flex; justify-content:center; align-items:center; min-height:300px;">
      <div class="spinner"></div>
    </div>
  `;

  try {
    const { batches } = await api.getImportBatches();

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Import Customer Feedback</h1>
          <p class="page-subtitle">Upload raw feedback from CSV exports (Intercom, Zendesk, App Store, Google Play, Salesforce, or user interviews).</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button id="btn-load-sample" class="btn btn-secondary">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Load Sample Dataset (51 Items)</span>
          </button>
        </div>
      </div>

      <!-- Drag & Drop Container -->
      <div id="dropzone" class="dropzone-container">
        <input type="file" id="file-input" class="file-input-hidden" accept=".csv" />
        <div class="dropzone-icon">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div class="dropzone-title">Drag & drop your CSV file here, or click to browse</div>
        <div class="dropzone-hint">Supports CSV files up to 10MB. Columns for feedback text, source channel, and user segment are automatically detected.</div>
      </div>

      <!-- Import Progress / Results Container -->
      <div id="import-result" style="display: none; margin-top: 1.5rem;"></div>

      <!-- Past Imports History -->
      <div style="margin-top: 3rem;">
        <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">Past Import Batches</h2>
        
        ${batches.length === 0 ? `
          <div class="card" style="text-align: center; padding: 2rem; color: var(--text-muted);">
            No imports yet. Upload a CSV or load the sample dataset above.
          </div>
        ` : `
          <div class="card" style="padding: 0; overflow: hidden;">
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Batch ID</th>
                    <th>Filename</th>
                    <th>Total Rows</th>
                    <th>Processed</th>
                    <th>Duplicates Detected</th>
                    <th>Status</th>
                    <th>Imported At</th>
                  </tr>
                </thead>
                <tbody>
                  ${batches.map(batch => `
                    <tr>
                      <td><code style="color: var(--primary);">${batch.id.slice(0, 8)}</code></td>
                      <td style="font-weight: 600; color: var(--text-primary);">${batch.filename}</td>
                      <td>${batch.row_count}</td>
                      <td>${batch.processed_count}</td>
                      <td><span class="badge ${batch.duplicate_count > 0 ? 'badge-medium' : 'badge-low'}">${batch.duplicate_count}</span></td>
                      <td>
                        <span class="badge ${batch.status === 'completed' ? 'badge-confirmed' : 'badge-auto'}">
                          ${batch.status}
                        </span>
                      </td>
                      <td>${new Date(batch.created_at).toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `}
      </div>
    `;

    // Dropzone logic
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const resultBox = document.getElementById('import-result');
    const sampleBtn = document.getElementById('btn-load-sample');

    const handleUpload = async (file) => {
      if (!file || !file.name.endsWith('.csv')) {
        return toast.error('Please select a valid .csv file');
      }

      dropzone.innerHTML = `
        <div class="spinner" style="width: 36px; height: 36px; margin-bottom: 1rem;"></div>
        <div class="dropzone-title">Uploading and normalizing "${file.name}"...</div>
        <div class="dropzone-hint">Parsing rows, redacting PII, and preparing for AI clustering</div>
      `;

      try {
        const res = await api.uploadCSV(file);
        toast.success(`Successfully imported ${res.importedCount} feedback items!`);

        resultBox.style.display = 'block';
        resultBox.innerHTML = `
          <div class="card" style="border-color: rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.05);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span class="badge badge-confirmed">Import Success</span>
                <span style="font-weight: 700; color: var(--text-primary);">${res.filename}</span>
              </div>
              <a href="#/feedback" class="btn btn-primary btn-sm">Explore Feedback &rarr;</a>
            </div>
            <div style="display: flex; gap: 2rem; font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1rem;">
              <div>Total Rows: <strong>${res.totalRows}</strong></div>
              <div>Imported: <strong>${res.importedCount}</strong></div>
              <div>Detected Text Column: <code style="color: var(--primary);">${res.columnMapping.text || 'Auto'}</code></div>
              <div>Detected Segment Column: <code style="color: var(--accent-cyan);">${res.columnMapping.segment || 'None'}</code></div>
            </div>
          </div>
        `;

        // Refresh batches
        renderImport(container);
      } catch (err) {
        toast.error(`Import failed: ${err.message}`);
        renderImport(container);
      }
    };

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        handleUpload(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        handleUpload(fileInput.files[0]);
      }
    });

    // Sample dataset loader
    sampleBtn.addEventListener('click', async () => {
      sampleBtn.disabled = true;
      toast.info('Seeding 51-item sample dataset with duplicates & varied segments...');
      try {
        // Trigger seed via analyze endpoint or reseed
        await api.triggerAnalysis();
        toast.success('Sample dataset processed and ready!');
        renderImport(container);
      } catch (err) {
        toast.error(`Failed to process sample: ${err.message}`);
        sampleBtn.disabled = false;
      }
    });

  } catch (err) {
    container.innerHTML = `<div class="card"><p style="color:var(--color-danger);">${err.message}</p></div>`;
  }
}
