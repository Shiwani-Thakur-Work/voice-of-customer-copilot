/**
 * Prioritization View
 * Configurable multi-criteria scoring balancing frequency, severity, impact, and confidence.
 */
import { api } from '../api.js';
import { toast } from '../components/toast.js';

let weights = {
  frequency: 0.25,
  severity: 0.35,
  userImpact: 0.25,
  confidence: 0.15,
};

let filterSegment = '';

export async function renderPrioritize(container) {
  container.innerHTML = `
    <div style="display:flex; justify-content:center; align-items:center; min-height:300px;">
      <div class="spinner"></div>
    </div>
  `;

  async function loadData() {
    try {
      const params = {
        w_freq: weights.frequency,
        w_sev: weights.severity,
        w_impact: weights.userImpact,
        w_conf: weights.confidence,
      };
      if (filterSegment) params.segment = filterSegment;

      const { themes } = await api.getPrioritized(params);
      renderUI(themes);
    } catch (err) {
      container.innerHTML = `<div class="card"><p style="color:var(--color-danger);">${err.message}</p></div>`;
    }
  }

  function renderUI(themes) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Opportunity Prioritization</h1>
          <p class="page-subtitle">Rank discovered themes using balanced multi-factor scoring. Adjust PM criteria weights to align with current roadmap strategy.</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <a href="#/export" class="btn btn-primary">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export Discovery Report</span>
          </a>
        </div>
      </div>

      <div class="prioritize-layout">
        <!-- Left: PM Scoring Weights Tuning Panel -->
        <div class="weights-card">
          <div>
            <h2 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 0.25rem;">Scoring Model Weights</h2>
            <p style="font-size: 0.8125rem; color: var(--text-muted);">Configure how strongly each factor influences priority.</p>
          </div>

          <!-- Severity Slider -->
          <div class="slider-container">
            <div class="slider-header">
              <span style="color: var(--text-primary);">Problem Severity</span>
              <span id="label-w-sev" style="color: var(--color-critical);">${Math.round(weights.severity * 100)}%</span>
            </div>
            <input type="range" id="slider-w-sev" class="slider-input" min="0" max="1" step="0.05" value="${weights.severity}" />
            <span style="font-size: 0.75rem; color: var(--text-muted);">Impact on user churn and system reliability</span>
          </div>

          <!-- Frequency Slider -->
          <div class="slider-container">
            <div class="slider-header">
              <span style="color: var(--text-primary);">Mention Frequency</span>
              <span id="label-w-freq" style="color: var(--primary);">${Math.round(weights.frequency * 100)}%</span>
            </div>
            <input type="range" id="slider-w-freq" class="slider-input" min="0" max="1" step="0.05" value="${weights.frequency}" />
            <span style="font-size: 0.75rem; color: var(--text-muted);">Count of unique customer complaints</span>
          </div>

          <!-- User Impact Slider -->
          <div class="slider-container">
            <div class="slider-header">
              <span style="color: var(--text-primary);">Segment Breadth</span>
              <span id="label-w-impact" style="color: var(--accent-cyan);">${Math.round(weights.userImpact * 100)}%</span>
            </div>
            <input type="range" id="slider-w-impact" class="slider-input" min="0" max="1" step="0.05" value="${weights.userImpact}" />
            <span style="font-size: 0.75rem; color: var(--text-muted);">Diversity across enterprise & startups</span>
          </div>

          <!-- Confidence Slider -->
          <div class="slider-container">
            <div class="slider-header">
              <span style="color: var(--text-primary);">Evidence Confidence</span>
              <span id="label-w-conf" style="color: var(--color-success);">${Math.round(weights.confidence * 100)}%</span>
            </div>
            <input type="range" id="slider-w-conf" class="slider-input" min="0" max="1" step="0.05" value="${weights.confidence}" />
            <span style="font-size: 0.75rem; color: var(--text-muted);">Confidence in AI classification</span>
          </div>

          <button id="btn-reset-weights" class="btn btn-secondary btn-sm" style="margin-top: 0.5rem;">
            Reset to PM Default Weights
          </button>
        </div>

        <!-- Right: Ranked Priorities List -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between;">
            <h2 style="font-size: 1.15rem; font-weight: 700;">Ranked Opportunities (${themes.length})</h2>
            <div style="font-size: 0.8125rem; color: var(--text-muted);">
              Sorted by Priority Score
            </div>
          </div>

          ${themes.length === 0 ? `
            <div style="text-align: center; padding: 3rem 1.5rem; color: var(--text-muted);">
              <p>No active themes available to prioritize.</p>
              <a href="#/themes" class="btn btn-secondary btn-sm" style="margin-top: 1rem;">Review Themes</a>
            </div>
          ` : `
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width: 50px;">Rank</th>
                    <th>Theme Opportunity</th>
                    <th>Severity</th>
                    <th>Frequency</th>
                    <th>Confidence</th>
                    <th style="text-align: right;">Priority Score</th>
                  </tr>
                </thead>
                <tbody>
                  ${themes.map((t, idx) => `
                    <tr>
                      <td>
                        <div class="priority-rank-badge ${idx === 0 ? 'priority-rank-1' : idx === 1 ? 'priority-rank-2' : idx === 2 ? 'priority-rank-3' : ''}">
                          ${idx + 1}
                        </div>
                      </td>
                      <td>
                        <div style="font-weight: 700; color: var(--text-primary); font-size: 0.9375rem;">
                          ${t.name}
                        </div>
                        <div style="font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.25rem; max-width: 450px;">
                          ${t.description || ''}
                        </div>
                        ${t.segments && t.segments.length > 0 ? `
                          <div style="display: flex; gap: 0.35rem; margin-top: 0.35rem; flex-wrap: wrap;">
                            ${t.segments.slice(0, 3).map(s => `<span class="badge badge-segment" style="font-size: 0.65rem;">${s}</span>`).join('')}
                          </div>
                        ` : ''}
                      </td>
                      <td><span class="badge badge-${t.severity}">${t.severity}</span></td>
                      <td><span class="badge badge-auto">${t.frequency_count} items</span></td>
                      <td>
                        <span style="font-size: 0.8125rem; color: var(--text-secondary);">
                          ${Math.round(t.confidence * 100)}%
                        </span>
                      </td>
                      <td style="text-align: right;">
                        <span class="priority-score-pill">
                          ${t.priority_score.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;

    // Sliders event listeners
    const sliderSev = document.getElementById('slider-w-sev');
    const sliderFreq = document.getElementById('slider-w-freq');
    const sliderImpact = document.getElementById('slider-w-impact');
    const sliderConf = document.getElementById('slider-w-conf');

    const updateWeights = () => {
      weights.severity = parseFloat(sliderSev.value);
      weights.frequency = parseFloat(sliderFreq.value);
      weights.userImpact = parseFloat(sliderImpact.value);
      weights.confidence = parseFloat(sliderConf.value);

      document.getElementById('label-w-sev').innerText = `${Math.round(weights.severity * 100)}%`;
      document.getElementById('label-w-freq').innerText = `${Math.round(weights.frequency * 100)}%`;
      document.getElementById('label-w-impact').innerText = `${Math.round(weights.userImpact * 100)}%`;
      document.getElementById('label-w-conf').innerText = `${Math.round(weights.confidence * 100)}%`;

      loadData();
    };

    sliderSev.addEventListener('input', updateWeights);
    sliderFreq.addEventListener('input', updateWeights);
    sliderImpact.addEventListener('input', updateWeights);
    sliderConf.addEventListener('input', updateWeights);

    document.getElementById('btn-reset-weights').addEventListener('click', () => {
      weights = { frequency: 0.25, severity: 0.35, userImpact: 0.25, confidence: 0.15 };
      loadData();
    });
  }

  loadData();
}
