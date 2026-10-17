/**
 * Dashboard View
 */
import { api } from '../api.js';
import { store } from '../store.js';
import { toast } from '../components/toast.js';

export async function renderDashboard(container) {
  container.innerHTML = `
    <div style="display:flex; justify-content:center; align-items:center; min-height:300px;">
      <div class="spinner"></div>
    </div>
  `;

  try {
    const stats = await api.getDashboardStats();
    store.setState({ dashboardStats: stats });

    const fb = stats.feedback;
    const th = stats.themes;
    const topThemes = stats.topThemes || [];
    const recentActions = stats.recentActions || [];
    const segments = stats.segments || [];

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Discovery Dashboard</h1>
          <p class="page-subtitle">Transform raw customer feedback into evidence-backed product opportunities with verifiable trace links.</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button id="btn-trigger-analysis" class="btn btn-primary">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Run AI Analysis</span>
          </button>
          <a href="#/import" class="btn btn-secondary">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Import CSV</span>
          </a>
        </div>
      </div>

      <!-- Stat Cards Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Customer Feedback</div>
          <div class="stat-value">${fb.total}</div>
          <div class="stat-footer">
            <span style="color: var(--color-success)">${fb.unique} unique</span>
            <span>•</span>
            <span style="color: var(--text-muted)">${fb.duplicates} duplicates filtered</span>
          </div>
        </div>

        <div class="stat-card stat-success">
          <div class="stat-label">Discovered Themes</div>
          <div class="stat-value">${th.total}</div>
          <div class="stat-footer">
            <span>${th.confirmed} confirmed by PM</span>
          </div>
        </div>

        <div class="stat-card stat-warning">
          <div class="stat-label">Pending PM Review</div>
          <div class="stat-value">${th.pending}</div>
          <div class="stat-footer">
            <span>Awaiting human validation</span>
          </div>
        </div>

        <div class="stat-card stat-critical">
          <div class="stat-label">Critical & High Themes</div>
          <div class="stat-value">${(stats.severityBreakdown?.critical || 0) + (stats.severityBreakdown?.high || 0)}</div>
          <div class="stat-footer">
            <span>High user impact issues</span>
          </div>
        </div>
      </div>

      <!-- Main Dashboard Grid -->
      <div class="dashboard-grid">
        <!-- Left: Top Discovered Themes -->
        <div class="card">
          <div class="dashboard-section-title">
            <span>Top Recurring Feedback Themes</span>
            <a href="#/themes" class="btn btn-ghost btn-sm">View All Themes &rarr;</a>
          </div>

          ${topThemes.length === 0 ? `
            <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
              <p>No themes discovered yet.</p>
              <button id="empty-run-analysis" class="btn btn-primary btn-sm" style="margin-top: 1rem;">Run Analysis Now</button>
            </div>
          ` : `
            <div class="theme-summary-list">
              ${topThemes.map(theme => `
                <div class="theme-summary-item" onclick="location.hash = '#/themes'">
                  <div>
                    <div class="theme-summary-name">${theme.name}</div>
                    <div style="font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.25rem;">
                      ${theme.status === 'auto_generated' ? '⚡ AI-generated candidate' : '✅ Verified by PM'}
                    </div>
                  </div>
                  <div class="theme-summary-meta">
                    <span class="badge badge-${theme.severity}">${theme.severity}</span>
                    <span class="badge badge-auto">${theme.frequency_count} mentions</span>
                    <span style="font-size: 0.8125rem; color: var(--text-muted);">
                      ${Math.round(theme.confidence * 100)}% conf.
                    </span>
                  </div>
                </div>
              `).join('')}
            </div>
          `}

          <!-- Segment Distribution -->
          ${segments.length > 0 ? `
            <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border-subtle);">
              <div style="font-size: 0.875rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.75rem;">
                Customer Segments Represented
              </div>
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                ${segments.map(s => `
                  <span class="badge badge-segment">${s.user_segment} (${s.count})</span>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Right: Recent PM Decision Audit Trail -->
        <div class="card">
          <div class="dashboard-section-title">
            <span>PM Decision Audit Trail</span>
          </div>

          ${recentActions.length === 0 ? `
            <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted);">
              <p>No human edits recorded yet.</p>
              <p style="font-size: 0.8125rem; margin-top: 0.5rem;">When you edit, merge, confirm, or reject AI themes, actions appear here for portfolio transparency.</p>
            </div>
          ` : `
            <div class="activity-feed">
              ${recentActions.map(action => {
                let actionText = action.action_type;
                if (action.action_type === 'theme_confirm') actionText = 'Confirmed Theme';
                else if (action.action_type === 'theme_reject') actionText = 'Rejected AI Theme';
                else if (action.action_type === 'theme_merge') actionText = 'Merged Theme Groups';
                else if (action.action_type === 'theme_edit') actionText = 'Edited Theme Details';

                return `
                  <div class="activity-item">
                    <div class="activity-icon">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div class="activity-details">
                      <div style="font-weight: 600; color: var(--text-primary);">${actionText}</div>
                      ${action.details ? `
                        <div style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.25rem;">
                          ${action.details.name ? `"${action.details.name}"` : ''}
                          ${action.details.merged_into ? `Merged into ${action.details.merged_into.slice(0, 8)}...` : ''}
                        </div>
                      ` : ''}
                      <div class="activity-time">${new Date(action.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}

          <!-- PM Note Callout -->
          <div style="margin-top: 1.5rem; padding: 1rem; border-radius: var(--radius-md); background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.2); font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.5;">
            <strong style="color: var(--primary);">PM Discovery Principle:</strong> Never trust AI frequency alone. A low-frequency complaint regarding security or data loss can be more critical than 20 cosmetic complaints.
          </div>
        </div>
      </div>
    `;

    // Listeners
    const runBtn = document.getElementById('btn-trigger-analysis');
    const emptyRunBtn = document.getElementById('empty-run-analysis');

    const handleRunAnalysis = async () => {
      try {
        toast.info('Starting AI analysis pipeline...');
        runBtn.disabled = true;
        await api.triggerAnalysis();
        toast.success('Analysis complete! Themes extracted and deduplicated.');
        renderDashboard(container);
      } catch (err) {
        toast.error(`Analysis failed: ${err.message}`);
        runBtn.disabled = false;
      }
    };

    if (runBtn) runBtn.addEventListener('click', handleRunAnalysis);
    if (emptyRunBtn) emptyRunBtn.addEventListener('click', handleRunAnalysis);

  } catch (err) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 3rem 1.5rem;">
        <h2 style="color: var(--color-danger); margin-bottom: 0.5rem;">Failed to load dashboard</h2>
        <p>${err.message}</p>
        <button onclick="location.reload()" class="btn btn-secondary" style="margin-top: 1.5rem;">Retry</button>
      </div>
    `;
  }
}
