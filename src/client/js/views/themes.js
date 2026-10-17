/**
 * Themes Review View
 * Allows PMs to review, confirm, reject, merge, and edit AI-generated themes.
 */
import { api } from '../api.js';
import { modal } from '../components/modal.js';
import { toast } from '../components/toast.js';

let filterStatus = '';
let filterSeverity = '';

export async function renderThemes(container) {
  container.innerHTML = `
    <div style="display:flex; justify-content:center; align-items:center; min-height:300px;">
      <div class="spinner"></div>
    </div>
  `;

  async function loadThemes() {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterSeverity) params.severity = filterSeverity;

      const { themes } = await api.getThemes(params);
      renderUI(themes);
    } catch (err) {
      container.innerHTML = `<div class="card"><p style="color:var(--color-danger);">${err.message}</p></div>`;
    }
  }

  function renderUI(themes) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Themes & Opportunities</h1>
          <p class="page-subtitle">Review AI-discovered patterns, examine supporting customer quotes, and curate themes before roadmap prioritization.</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <a href="#/prioritize" class="btn btn-primary">
            <span>Prioritize Opportunities &rarr;</span>
          </a>
        </div>
      </div>

      <!-- Filters Toolbar -->
      <div class="filter-toolbar">
        <div class="filter-group">
          <select id="theme-filter-status" class="select" style="width: auto;">
            <option value="">All Statuses</option>
            <option value="auto_generated" ${filterStatus === 'auto_generated' ? 'selected' : ''}>⚡ AI Auto-Generated</option>
            <option value="user_confirmed" ${filterStatus === 'user_confirmed' ? 'selected' : ''}>✅ PM Confirmed</option>
            <option value="user_rejected" ${filterStatus === 'user_rejected' ? 'selected' : ''}>❌ Flagged / Rejected</option>
          </select>

          <select id="theme-filter-severity" class="select" style="width: auto;">
            <option value="">All Severities</option>
            <option value="critical" ${filterSeverity === 'critical' ? 'selected' : ''}>Critical</option>
            <option value="high" ${filterSeverity === 'high' ? 'selected' : ''}>High</option>
            <option value="medium" ${filterSeverity === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="low" ${filterSeverity === 'low' ? 'selected' : ''}>Low</option>
          </select>
        </div>

        <div style="font-size: 0.875rem; color: var(--text-muted);">
          <strong>${themes.length}</strong> themes found
        </div>
      </div>

      <!-- Themes Grid -->
      ${themes.length === 0 ? `
        <div class="card" style="text-align: center; padding: 3rem 1.5rem; color: var(--text-muted);">
          <p>No themes match the selected filter criteria.</p>
        </div>
      ` : `
        <div class="themes-grid">
          ${themes.map(theme => `
            <div class="theme-card card" id="theme-card-${theme.id}">
              <div>
                <div class="theme-card-top">
                  <span class="badge badge-${theme.severity}">${theme.severity}</span>
                  <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <span class="badge badge-auto">${theme.frequency_count} mentions</span>
                    <span class="badge ${theme.status === 'user_confirmed' ? 'badge-confirmed' : theme.status === 'user_rejected' ? 'badge-rejected' : 'badge-auto'}">
                      ${theme.status === 'user_confirmed' ? 'Verified' : theme.status === 'user_rejected' ? 'Rejected' : 'AI Draft'}
                    </span>
                  </div>
                </div>

                <h3 class="theme-title">${theme.name}</h3>
                <p class="theme-description">${theme.description || 'No description provided.'}</p>

                <!-- Confidence & Segments -->
                <div class="theme-meta-row">
                  <div class="theme-confidence-gauge" title="AI Classification Confidence">
                    <span>Conf:</span>
                    <div class="confidence-bar">
                      <div class="confidence-fill" style="width: ${Math.round(theme.confidence * 100)}%;"></div>
                    </div>
                    <span>${Math.round(theme.confidence * 100)}%</span>
                  </div>

                  ${theme.segments && theme.segments.length > 0 ? (
                    theme.segments.slice(0, 2).map(s => `
                      <span class="badge badge-segment" style="font-size: 0.7rem;">${s}</span>
                    `).join('')
                  ) : ''}
                </div>

                ${theme.missing_evidence ? `
                  <div style="font-size: 0.8125rem; color: var(--text-muted); background: var(--bg-surface-elevated); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); margin-bottom: 0.75rem; line-height: 1.4;">
                    <strong style="color: var(--color-warning);">Missing Evidence:</strong> ${theme.missing_evidence}
                  </div>
                ` : ''}
              </div>

              <!-- Action Bar -->
              <div class="theme-actions">
                <button class="btn btn-secondary btn-sm btn-inspect-theme" data-id="${theme.id}" style="flex: 1;">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>Evidence (${theme.linked_feedback_count || theme.frequency_count})</span>
                </button>

                ${theme.status !== 'user_confirmed' ? `
                  <button class="btn btn-success btn-sm btn-confirm-theme" data-id="${theme.id}" title="Confirm this theme as verified product fact">
                    ✓
                  </button>
                ` : ''}

                ${theme.status !== 'user_rejected' ? `
                  <button class="btn btn-danger btn-sm btn-reject-theme" data-id="${theme.id}" title="Flag AI error / reject theme">
                    ✕
                  </button>
                ` : ''}

                <button class="btn btn-ghost btn-sm btn-merge-theme" data-id="${theme.id}" title="Merge into another theme">
                  Merge
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    `;

    // Hook filter changes
    document.getElementById('theme-filter-status').addEventListener('change', (e) => {
      filterStatus = e.target.value;
      loadThemes();
    });

    document.getElementById('theme-filter-severity').addEventListener('change', (e) => {
      filterSeverity = e.target.value;
      loadThemes();
    });

    // Hook Confirm buttons
    document.querySelectorAll('.btn-confirm-theme').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        try {
          await api.confirmTheme(id);
          toast.success('Theme confirmed and verified!');
          loadThemes();
        } catch (err) {
          toast.error(err.message);
        }
      });
    });

    // Hook Reject buttons
    document.querySelectorAll('.btn-reject-theme').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        try {
          await api.rejectTheme(id);
          toast.warning('Theme flagged and excluded from priority scoring');
          loadThemes();
        } catch (err) {
          toast.error(err.message);
        }
      });
    });

    // Hook Merge buttons
    document.querySelectorAll('.btn-merge-theme').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const sourceTheme = themes.find(t => t.id === id);
        const otherThemes = themes.filter(t => t.id !== id && t.status !== 'user_rejected');

        modal.open({
          title: `Merge "${sourceTheme.name}"`,
          bodyHtml: `
            <p style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.875rem;">
              Select another theme to merge this group into. All linked customer feedback quotes will be transferred to the target theme.
            </p>
            <div style="margin-bottom: 1.5rem;">
              <label style="font-size: 0.8125rem; font-weight: 600; display: block; margin-bottom: 0.5rem;">Target Theme:</label>
              <select id="modal-merge-target" class="select">
                ${otherThemes.map(ot => `
                  <option value="${ot.id}">${ot.name} (${ot.frequency_count} items)</option>
                `).join('')}
              </select>
            </div>
          `,
          footerHtml: `
            <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
            <button class="btn btn-primary" id="modal-confirm-merge">Confirm Merge</button>
          `
        });

        document.getElementById('modal-cancel-btn').addEventListener('click', () => modal.close());
        document.getElementById('modal-confirm-merge').addEventListener('click', async () => {
          const targetId = document.getElementById('modal-merge-target').value;
          try {
            await api.mergeThemes(id, targetId);
            modal.close();
            toast.success('Themes merged successfully!');
            loadThemes();
          } catch (err) {
            toast.error(err.message);
          }
        });
      });
    });

    // Hook Inspect Evidence & Edit buttons
    document.querySelectorAll('.btn-inspect-theme').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        try {
          const theme = await api.getTheme(id);
          openInspectModal(theme);
        } catch (err) {
          toast.error(err.message);
        }
      });
    });
  }

  function openInspectModal(theme) {
    modal.open({
      title: `Inspect Theme: ${theme.name}`,
      bodyHtml: `
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          <!-- Editable Details -->
          <div>
            <label style="font-size: 0.8125rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Theme Name</label>
            <input type="text" id="modal-theme-name" class="input" value="${theme.name}" style="margin-top: 0.35rem;" />
          </div>

          <div>
            <label style="font-size: 0.8125rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Description</label>
            <textarea id="modal-theme-desc" class="textarea" rows="3" style="margin-top: 0.35rem;">${theme.description || ''}</textarea>
          </div>

          <div style="display: flex; gap: 1rem;">
            <div style="flex: 1;">
              <label style="font-size: 0.8125rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Severity</label>
              <select id="modal-theme-severity" class="select" style="margin-top: 0.35rem;">
                <option value="low" ${theme.severity === 'low' ? 'selected' : ''}>Low</option>
                <option value="medium" ${theme.severity === 'medium' ? 'selected' : ''}>Medium</option>
                <option value="high" ${theme.severity === 'high' ? 'selected' : ''}>High</option>
                <option value="critical" ${theme.severity === 'critical' ? 'selected' : ''}>Critical</option>
              </select>
            </div>
            <div style="flex: 1;">
              <label style="font-size: 0.8125rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Confidence</label>
              <div style="margin-top: 0.85rem; font-weight: 700; color: var(--primary);">
                ${Math.round(theme.confidence * 100)}% (AI score)
              </div>
            </div>
          </div>

          <!-- Supporting Customer Statements -->
          <div style="border-top: 1px solid var(--border-subtle); padding-top: 1rem;">
            <div style="font-size: 0.875rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.75rem;">
              Supporting Customer Evidence (${theme.feedback ? theme.feedback.length : 0} items)
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 250px; overflow-y: auto; padding-right: 0.5rem;">
              ${theme.feedback && theme.feedback.length > 0 ? (
                theme.feedback.map(fb => `
                  <div style="background: var(--bg-surface-elevated); padding: 0.875rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); font-size: 0.875rem;">
                    <div style="color: var(--text-primary); margin-bottom: 0.5rem; line-height: 1.5;">
                      "${fb.raw_text}"
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted);">
                      <span>${fb.user_segment || 'No segment'} • ${fb.source}</span>
                      <span>Link confidence: ${Math.round((fb.link_confidence || 0.8) * 100)}%</span>
                    </div>
                  </div>
                `).join('')
              ) : `
                <p style="color: var(--text-muted); font-size: 0.875rem;">No customer quotes linked to this theme.</p>
              `}
            </div>
          </div>

          ${theme.missing_evidence ? `
            <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); padding: 0.875rem; border-radius: var(--radius-md); font-size: 0.8125rem;">
              <strong style="color: var(--color-warning);">Data Gaps & Recommended Research:</strong>
              <div style="color: var(--text-secondary); margin-top: 0.25rem;">${theme.missing_evidence}</div>
            </div>
          ` : ''}
        </div>
      `,
      footerHtml: `
        <button class="btn btn-ghost" id="modal-inspect-cancel">Cancel</button>
        <button class="btn btn-primary" id="modal-save-theme">Save Changes</button>
      `
    });

    document.getElementById('modal-inspect-cancel').addEventListener('click', () => modal.close());
    document.getElementById('modal-save-theme').addEventListener('click', async () => {
      const name = document.getElementById('modal-theme-name').value.trim();
      const description = document.getElementById('modal-theme-desc').value.trim();
      const severity = document.getElementById('modal-theme-severity').value;

      try {
        await api.updateTheme(theme.id, { name, description, severity });
        modal.close();
        toast.success('Theme updated successfully!');
        loadThemes();
      } catch (err) {
        toast.error(err.message);
      }
    });
  }

  loadThemes();
}
