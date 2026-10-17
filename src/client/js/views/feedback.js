/**
 * Feedback Explorer View
 */
import { api } from '../api.js';
import { toast } from '../components/toast.js';

let currentParams = {
  page: 1,
  limit: 15,
  search: '',
  segment: '',
  source: '',
  show_duplicates: 'false',
};

export async function renderFeedback(container) {
  container.innerHTML = `
    <div style="display:flex; justify-content:center; align-items:center; min-height:300px;">
      <div class="spinner"></div>
    </div>
  `;

  async function loadData() {
    try {
      const data = await api.getFeedback(currentParams);
      renderUI(data);
    } catch (err) {
      container.innerHTML = `<div class="card"><p style="color:var(--color-danger);">${err.message}</p></div>`;
    }
  }

  function renderUI(data) {
    const { items, total, totalPages, segments } = data;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Feedback Explorer</h1>
          <p class="page-subtitle">Inspect raw feedback entries, verify PII redaction, examine deduplication links, and check associated AI themes.</p>
        </div>
        <div style="font-size: 0.875rem; color: var(--text-muted); align-self: flex-end;">
          Showing <strong>${items.length}</strong> of <strong>${total}</strong> items
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="filter-toolbar">
        <div class="search-box" style="flex: 1; min-width: 260px;">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" id="feedback-search" class="input" placeholder="Search feedback quotes or keywords..." value="${currentParams.search || ''}" />
        </div>

        <div class="filter-group">
          <!-- Segment Filter -->
          <select id="filter-segment" class="select" style="width: auto;">
            <option value="">All Segments</option>
            ${segments.map(seg => `
              <option value="${seg}" ${currentParams.segment === seg ? 'selected' : ''}>${seg}</option>
            `).join('')}
          </select>

          <!-- Source Filter -->
          <select id="filter-source" class="select" style="width: auto;">
            <option value="">All Sources</option>
            <option value="support_ticket" ${currentParams.source === 'support_ticket' ? 'selected' : ''}>Support Ticket</option>
            <option value="email" ${currentParams.source === 'email' ? 'selected' : ''}>Email</option>
            <option value="app_review" ${currentParams.source === 'app_review' ? 'selected' : ''}>App Review</option>
            <option value="community" ${currentParams.source === 'community' ? 'selected' : ''}>Community</option>
            <option value="sales_call" ${currentParams.source === 'sales_call' ? 'selected' : ''}>Sales Call</option>
          </select>

          <!-- Duplicate Toggle -->
          <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: var(--text-secondary); cursor: pointer; user-select: none;">
            <input type="checkbox" id="toggle-duplicates" ${currentParams.show_duplicates === 'true' ? 'checked' : ''} />
            <span>Show Duplicates</span>
          </label>
        </div>
      </div>

      <!-- Feedback List -->
      ${items.length === 0 ? `
        <div class="card" style="text-align: center; padding: 3rem 1.5rem; color: var(--text-muted);">
          <p>No feedback found matching the current search & filters.</p>
          <button id="btn-clear-filters" class="btn btn-secondary btn-sm" style="margin-top: 1rem;">Reset Filters</button>
        </div>
      ` : `
        <div class="feedback-list">
          ${items.map(item => `
            <div class="feedback-card ${item.is_duplicate ? 'is-duplicate' : ''}">
              <div class="feedback-header">
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  ${item.user_segment ? `<span class="badge badge-segment">${item.user_segment}</span>` : ''}
                  <span class="badge badge-low" style="background: rgba(255,255,255,0.05); color: var(--text-muted); border-color: var(--border-subtle);">
                    ${item.source}
                  </span>
                  ${item.is_duplicate ? `
                    <span class="badge badge-medium">Near Duplicate (Linked)</span>
                  ` : ''}
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">
                  ID: <code style="color: var(--text-muted);">${item.id.slice(0, 8)}</code>
                </div>
              </div>

              <div class="feedback-text">
                "${item.raw_text}"
              </div>

              <div class="feedback-footer">
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <span style="font-weight: 600; color: var(--text-muted);">Themes:</span>
                  ${item.theme_names && item.theme_names.length > 0 ? (
                    item.theme_names.map(tn => `
                      <span class="badge badge-auto" style="cursor: pointer;" onclick="location.hash = '#/themes'">${tn}</span>
                    `).join('')
                  ) : `
                    <span style="font-style: italic; color: var(--text-muted);">None classified yet</span>
                  `}
                </div>
                <div>${new Date(item.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Pagination Controls -->
        ${totalPages > 1 ? `
          <div style="display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 2rem;">
            <button id="btn-prev-page" class="btn btn-secondary btn-sm" ${currentParams.page <= 1 ? 'disabled' : ''}>&larr; Previous</button>
            <span style="font-size: 0.875rem; color: var(--text-secondary);">
              Page <strong>${currentParams.page}</strong> of <strong>${totalPages}</strong>
            </span>
            <button id="btn-next-page" class="btn btn-secondary btn-sm" ${currentParams.page >= totalPages ? 'disabled' : ''}>Next &rarr;</button>
          </div>
        ` : ''}
      `}
    `;

    // Event Listeners
    let searchTimer = null;
    const searchInput = document.getElementById('feedback-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          currentParams.search = e.target.value.trim();
          currentParams.page = 1;
          loadData();
        }, 350);
      });
    }

    const segmentSelect = document.getElementById('filter-segment');
    if (segmentSelect) {
      segmentSelect.addEventListener('change', (e) => {
        currentParams.segment = e.target.value;
        currentParams.page = 1;
        loadData();
      });
    }

    const sourceSelect = document.getElementById('filter-source');
    if (sourceSelect) {
      sourceSelect.addEventListener('change', (e) => {
        currentParams.source = e.target.value;
        currentParams.page = 1;
        loadData();
      });
    }

    const dupCheckbox = document.getElementById('toggle-duplicates');
    if (dupCheckbox) {
      dupCheckbox.addEventListener('change', (e) => {
        currentParams.show_duplicates = e.target.checked ? 'true' : 'false';
        currentParams.page = 1;
        loadData();
      });
    }

    const prevBtn = document.getElementById('btn-prev-page');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentParams.page > 1) {
          currentParams.page--;
          loadData();
        }
      });
    }

    const nextBtn = document.getElementById('btn-next-page');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentParams.page < totalPages) {
          currentParams.page++;
          loadData();
        }
      });
    }

    const clearBtn = document.getElementById('btn-clear-filters');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        currentParams = { page: 1, limit: 15, search: '', segment: '', source: '', show_duplicates: 'false' };
        loadData();
      });
    }
  }

  loadData();
}
