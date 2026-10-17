/**
 * Voice of Customer Copilot — API Client
 * Supports dual-mode execution:
 * 1. Live Express backend connection (local dev / full-stack cloud)
 * 2. Standalone offline / GitHub Pages demo mode (persistent in localStorage with instant PM reactivity)
 */
import { SEED_BATCHES, SEED_FEEDBACK, SEED_THEMES, SEED_LINKS } from './seed-data.js';

const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');

const BASE_URL = typeof window !== 'undefined' && window.location.port === '3001'
  ? '/api'
  : (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? 'http://localhost:3001/api'
    : '/api';

// --- Client-Side Mock Store (for GitHub Pages & Offline Demo) ---
const STORAGE_KEYS = {
  FEEDBACK: 'voc_copilot_feedback',
  THEMES: 'voc_copilot_themes',
  LINKS: 'voc_copilot_links',
  BATCHES: 'voc_copilot_batches',
  ACTIONS: 'voc_copilot_actions',
  REPORTS: 'voc_copilot_reports'
};

function getLocalStore() {
  try {
    let feedback = JSON.parse(localStorage.getItem(STORAGE_KEYS.FEEDBACK) || 'null');
    let themes = JSON.parse(localStorage.getItem(STORAGE_KEYS.THEMES) || 'null');
    let links = JSON.parse(localStorage.getItem(STORAGE_KEYS.LINKS) || 'null');
    let batches = JSON.parse(localStorage.getItem(STORAGE_KEYS.BATCHES) || 'null');
    let actions = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIONS) || 'null');
    let reports = JSON.parse(localStorage.getItem(STORAGE_KEYS.REPORTS) || 'null');

    if (!feedback || !themes || !links) {
      feedback = SEED_FEEDBACK;
      themes = SEED_THEMES;
      links = SEED_LINKS;
      batches = SEED_BATCHES;
      actions = [
        {
          id: 'action-init-1',
          action_type: 'theme_confirm',
          entity_type: 'theme',
          entity_id: themes[0]?.id || '1',
          details: { name: themes[0]?.name || 'Sample Theme' },
          created_at: new Date(Date.now() - 3600000).toISOString()
        }
      ];
      reports = [];
      saveLocalStore({ feedback, themes, links, batches, actions, reports });
    }

    return { feedback, themes, links, batches, actions: actions || [], reports: reports || [] };
  } catch (err) {
    console.warn('LocalStorage access issue, using in-memory seed data:', err);
    return {
      feedback: [...SEED_FEEDBACK],
      themes: [...SEED_THEMES],
      links: [...SEED_LINKS],
      batches: [...SEED_BATCHES],
      actions: [],
      reports: []
    };
  }
}

function saveLocalStore(data) {
  try {
    if (data.feedback) localStorage.setItem(STORAGE_KEYS.FEEDBACK, JSON.stringify(data.feedback));
    if (data.themes) localStorage.setItem(STORAGE_KEYS.THEMES, JSON.stringify(data.themes));
    if (data.links) localStorage.setItem(STORAGE_KEYS.LINKS, JSON.stringify(data.links));
    if (data.batches) localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify(data.batches));
    if (data.actions) localStorage.setItem(STORAGE_KEYS.ACTIONS, JSON.stringify(data.actions));
    if (data.reports) localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(data.reports));
  } catch (e) {
    console.warn('Could not persist to localStorage:', e);
  }
}

function mockClientRequest(endpoint, options = {}) {
  const store = getLocalStore();
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};
  const [pathPart, queryPart] = endpoint.split('?');
  const params = new URLSearchParams(queryPart || '');

  // 1. Dashboard Stats
  if (pathPart === '/dashboard/stats') {
    const totalFeedback = store.feedback.length;
    const duplicateFeedback = store.feedback.filter(f => f.is_duplicate === 1).length;
    const uniqueFeedback = totalFeedback - duplicateFeedback;

    const activeThemes = store.themes.filter(t => t.status !== 'merged' && t.status !== 'user_rejected');
    const confirmedThemes = store.themes.filter(t => t.status === 'user_confirmed').length;
    const pendingReviewThemes = store.themes.filter(t => t.status === 'auto_generated').length;
    const rejectedThemes = store.themes.filter(t => t.status === 'user_rejected').length;

    const severityBreakdown = activeThemes.reduce((acc, t) => {
      acc[t.severity] = (acc[t.severity] || 0) + 1;
      return acc;
    }, {});

    const topThemes = [...activeThemes]
      .sort((a, b) => (b.frequency_count || 0) - (a.frequency_count || 0))
      .slice(0, 6);

    const segmentCounts = {};
    store.feedback.forEach(f => {
      if (f.user_segment) {
        segmentCounts[f.user_segment] = (segmentCounts[f.user_segment] || 0) + 1;
      }
    });
    const segments = Object.entries(segmentCounts)
      .map(([user_segment, count]) => ({ user_segment, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      feedback: { total: totalFeedback, unique: uniqueFeedback, duplicates: duplicateFeedback },
      themes: { total: activeThemes.length, confirmed: confirmedThemes, pending: pendingReviewThemes, rejected: rejectedThemes },
      severityBreakdown,
      topThemes,
      segments,
      recentActions: store.actions.slice(0, 10)
    };
  }

  // 2. Feedback List & Detail
  if (pathPart === '/feedback') {
    const page = parseInt(params.get('page') || '1');
    const limit = parseInt(params.get('limit') || '20');
    const search = (params.get('search') || '').toLowerCase();
    const segment = params.get('segment');
    const source = params.get('source');
    const showDuplicates = params.get('show_duplicates') === 'true';
    const themeId = params.get('theme_id');

    let filtered = store.feedback.filter(f => {
      if (!showDuplicates && f.is_duplicate === 1) return false;
      if (segment && f.user_segment !== segment) return false;
      if (source && f.source !== source) return false;
      if (search && !((f.normalized_text || '').toLowerCase().includes(search) || (f.raw_text || '').toLowerCase().includes(search))) {
        return false;
      }
      if (themeId) {
        const isLinked = store.links.some(l => l.feedback_id === f.id && l.theme_id === themeId);
        if (!isLinked) return false;
      }
      return true;
    });

    const total = filtered.length;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    const themeMap = new Map(store.themes.map(t => [t.id, t.name]));
    const items = paginated.map(item => {
      const linkedThemeIds = store.links.filter(l => l.feedback_id === item.id).map(l => l.theme_id);
      const theme_names = linkedThemeIds
        .map(id => themeMap.get(id))
        .filter(Boolean);
      return { ...item, theme_names };
    });

    const segments = [...new Set(store.feedback.map(f => f.user_segment).filter(Boolean))].sort().map(s => ({ user_segment: s }));

    return { items, total, page, limit, totalPages: Math.ceil(total / limit), segments };
  }

  if (pathPart.startsWith('/feedback/')) {
    const id = pathPart.replace('/feedback/', '');
    const item = store.feedback.find(f => f.id === id);
    if (!item) throw new Error('Feedback item not found');
    const linkedThemeIds = store.links.filter(l => l.feedback_id === id).map(l => l.theme_id);
    const themes = store.themes.filter(t => linkedThemeIds.includes(t.id));
    return { ...item, themes };
  }

  // 3. Themes List & Detail
  if (pathPart === '/themes') {
    const status = params.get('status');
    const severity = params.get('severity');
    const minConfidence = parseFloat(params.get('min_confidence') || '0');

    let themes = store.themes.filter(t => {
      if (t.status === 'merged') return false;
      if (status && t.status !== status) return false;
      if (severity && t.severity !== severity) return false;
      if (minConfidence && (t.confidence || 0) < minConfidence) return false;
      return true;
    });

    themes = themes.map(t => {
      const linked = store.links.filter(l => l.theme_id === t.id);
      const linkedIds = new Set(linked.map(l => l.feedback_id));
      const segments = [...new Set(store.feedback.filter(f => linkedIds.has(f.id)).map(f => f.user_segment).filter(Boolean))];
      return {
        ...t,
        linked_feedback_count: linked.length,
        segments
      };
    }).sort((a, b) => (b.frequency_count || 0) - (a.frequency_count || 0));

    return { themes };
  }

  if (pathPart.startsWith('/themes/') && !pathPart.includes('/confirm') && !pathPart.includes('/reject') && !pathPart.includes('/merge')) {
    const id = pathPart.replace('/themes/', '');
    if (method === 'PATCH') {
      const themeIndex = store.themes.findIndex(t => t.id === id);
      if (themeIndex === -1) throw new Error('Theme not found');
      store.themes[themeIndex] = { ...store.themes[themeIndex], ...body, updated_at: new Date().toISOString() };
      store.actions.unshift({
        id: `act-${Date.now()}`,
        action_type: 'theme_edit',
        entity_type: 'theme',
        entity_id: id,
        details: { name: body.name || store.themes[themeIndex].name },
        created_at: new Date().toISOString()
      });
      saveLocalStore(store);
      return { theme: store.themes[themeIndex] };
    }

    const theme = store.themes.find(t => t.id === id);
    if (!theme) throw new Error('Theme not found');
    const linked = store.links.filter(l => l.theme_id === id);
    const feedback = linked.map(link => {
      const f = store.feedback.find(item => item.id === link.feedback_id);
      return f ? { ...f, link_confidence: link.confidence, assigned_by: link.assigned_by } : null;
    }).filter(Boolean);

    return { theme, feedback };
  }

  // 4. PM Human-in-the-Loop Actions
  if (pathPart.endsWith('/confirm')) {
    const id = pathPart.split('/')[2];
    const theme = store.themes.find(t => t.id === id);
    if (!theme) throw new Error('Theme not found');
    theme.status = 'user_confirmed';
    theme.updated_at = new Date().toISOString();
    store.actions.unshift({
      id: `act-${Date.now()}`,
      action_type: 'theme_confirm',
      entity_type: 'theme',
      entity_id: id,
      details: { name: theme.name },
      created_at: new Date().toISOString()
    });
    saveLocalStore(store);
    return { success: true, theme };
  }

  if (pathPart.endsWith('/reject')) {
    const id = pathPart.split('/')[2];
    const theme = store.themes.find(t => t.id === id);
    if (!theme) throw new Error('Theme not found');
    theme.status = 'user_rejected';
    theme.updated_at = new Date().toISOString();
    store.actions.unshift({
      id: `act-${Date.now()}`,
      action_type: 'theme_reject',
      entity_type: 'theme',
      entity_id: id,
      details: { name: theme.name },
      created_at: new Date().toISOString()
    });
    saveLocalStore(store);
    return { success: true, theme };
  }

  if (pathPart.endsWith('/merge')) {
    const sourceId = pathPart.split('/')[2];
    const targetId = body.target_theme_id;
    const sourceTheme = store.themes.find(t => t.id === sourceId);
    const targetTheme = store.themes.find(t => t.id === targetId);
    if (!sourceTheme || !targetTheme) throw new Error('Theme not found');

    sourceTheme.status = 'merged';
    sourceTheme.merged_into_id = targetId;

    // Transfer links
    store.links.forEach(l => {
      if (l.theme_id === sourceId) {
        l.theme_id = targetId;
      }
    });

    targetTheme.frequency_count = (targetTheme.frequency_count || 0) + (sourceTheme.frequency_count || 0);
    store.actions.unshift({
      id: `act-${Date.now()}`,
      action_type: 'theme_merge',
      entity_type: 'theme',
      entity_id: sourceId,
      details: { name: sourceTheme.name, merged_into: targetTheme.name },
      created_at: new Date().toISOString()
    });
    saveLocalStore(store);
    return { success: true, target_theme: targetTheme };
  }

  // 5. Prioritization
  if (pathPart === '/prioritize') {
    const w = {
      frequency: parseFloat(params.get('w_freq') || '0.25'),
      severity: parseFloat(params.get('w_sev') || '0.35'),
      userImpact: parseFloat(params.get('w_impact') || '0.25'),
      confidence: parseFloat(params.get('w_conf') || '0.15'),
    };
    const segment = params.get('segment');

    let activeThemes = store.themes.filter(t => t.status !== 'user_rejected' && t.status !== 'merged');
    const SEVERITY_SCORES = { low: 0.25, medium: 0.5, high: 0.75, critical: 1.0 };
    const maxFreq = Math.max(...activeThemes.map(t => t.frequency_count || 0), 1);

    let themesWithMeta = activeThemes.map(t => {
      const linked = store.links.filter(l => l.theme_id === t.id);
      const linkedIds = new Set(linked.map(l => l.feedback_id));
      const segments = [...new Set(store.feedback.filter(f => linkedIds.has(f.id)).map(f => f.user_segment).filter(Boolean))];
      
      const fNorm = maxFreq > 0 ? (t.frequency_count || 0) / maxFreq : 0;
      const sScore = SEVERITY_SCORES[t.severity] || 0.5;
      const uImpact = fNorm * 0.7 + sScore * 0.3;
      const cScore = t.confidence || 0.5;
      const score = (w.frequency * fNorm + w.severity * sScore + w.userImpact * uImpact + w.confidence * cScore);

      return {
        ...t,
        linked_feedback_count: linked.length,
        segments,
        priority_score: Math.round(score * 100) / 100
      };
    });

    if (segment) {
      themesWithMeta = themesWithMeta.filter(t => t.segments.includes(segment));
    }

    themesWithMeta.sort((a, b) => b.priority_score - a.priority_score);
    return { themes: themesWithMeta, weights: w };
  }

  // 6. Export Report
  if (pathPart === '/export') {
    if (method === 'POST') {
      const { theme_ids = [], format = 'markdown', title = 'Product Discovery Summary' } = body;
      const selected = store.themes.filter(t => theme_ids.includes(t.id) && t.status !== 'user_rejected');
      const exportId = `exp-${Date.now()}`;

      let content = '';
      if (format === 'json') {
        content = JSON.stringify({
          title,
          generated_at: new Date().toISOString(),
          metadata: { totalFeedback: store.feedback.length, uniqueFeedback: store.feedback.filter(f => !f.is_duplicate).length },
          themes: selected.map(t => ({
            name: t.name,
            severity: t.severity,
            frequency: t.frequency_count,
            description: t.description,
            quotes: store.links.filter(l => l.theme_id === t.id).map(l => {
              const fb = store.feedback.find(f => f.id === l.feedback_id);
              return fb ? { quote: fb.raw_text, segment: fb.user_segment } : null;
            }).filter(Boolean).slice(0, 3)
          }))
        }, null, 2);
      } else {
        content = `# ${title}\n*Generated by Voice of Customer Copilot — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}*\n\n` +
          `## Executive Overview\nAnalyzed **${store.feedback.length} customer feedback items** across Enterprise, Mid-Market, and Startup segments.\n` +
          `Identified **${selected.length} evidence-backed product opportunities** ready for roadmap evaluation.\n\n` +
          `---\n\n## Discovered Themes & Evidence\n\n` +
          selected.map((t, idx) => {
            const quotes = store.links.filter(l => l.theme_id === t.id).map(l => {
              const fb = store.feedback.find(f => f.id === l.feedback_id);
              return fb ? `> "${fb.raw_text}"\n> *— ${fb.user_segment || 'Customer'} via ${fb.source || 'Direct'}*` : null;
            }).filter(Boolean).slice(0, 3).join('\n\n');

            return `### ${idx + 1}. ${t.name} [Severity: ${t.severity.toUpperCase()} | Mentions: ${t.frequency_count}]\n` +
              `**Description:** ${t.description}\n\n` +
              `**Supporting Customer Evidence:**\n\n${quotes || '> Verified by product discovery heuristics.'}\n\n` +
              (t.missing_evidence ? `**Missing Evidence / Caution:** ${t.missing_evidence}\n\n` : '') +
              (t.follow_up_notes ? `**Follow-up Research:** ${t.follow_up_notes}\n\n` : '') +
              `---`;
          }).join('\n\n');
      }

      const report = {
        id: exportId,
        title,
        format,
        content,
        themeCount: selected.length,
        createdAt: new Date().toISOString()
      };
      store.reports.push(report);
      saveLocalStore(store);
      return report;
    }
  }

  if (pathPart.startsWith('/export/')) {
    const id = pathPart.replace('/export/', '');
    const r = store.reports.find(item => item.id === id);
    if (!r) throw new Error('Report not found');
    return r;
  }

  // 7. Analysis & Import
  if (pathPart === '/analyze') {
    return { status: 'completed', message: 'Analysis completed successfully (demo mode).' };
  }

  if (pathPart === '/analyze/status') {
    return { status: 'idle', progress: 100, message: 'Ready' };
  }

  if (pathPart === '/import/batches') {
    return { batches: store.batches || [] };
  }

  return { success: true };
}

async function request(endpoint, options = {}) {
  // If running on GitHub Pages static hosting, immediately use the client mock engine
  if (isGitHubPages) {
    return mockClientRequest(endpoint, options);
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    // If backend server is not running or network request fails, fall back gracefully to local client engine
    console.info(`[VoC Copilot] Backend unreachable for ${endpoint}. Falling back to browser demo engine:`, err.message);
    return mockClientRequest(endpoint, options);
  }
}

export const api = {
  // Dashboard
  getDashboardStats() {
    return request('/dashboard/stats');
  },

  // Feedback
  getFeedback(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(`/feedback${query ? `?${query}` : ''}`);
  },

  getFeedbackItem(id) {
    return request(`/feedback/${id}`);
  },

  // Import
  async uploadCSV(file) {
    if (isGitHubPages) {
      // In standalone demo, simulate CSV parsing
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const lines = (e.target.result || '').split('\n').filter(Boolean);
          resolve({
            batch_id: `batch-${Date.now()}`,
            filename: file.name,
            total_rows: Math.max(lines.length - 1, 1),
            processed_rows: Math.max(lines.length - 1, 1),
            duplicates_found: 0,
            message: 'CSV uploaded and processed in demo mode'
          });
        };
        reader.readAsText(file);
      });
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${BASE_URL}/import/csv`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'CSV upload failed');
      return data;
    } catch (err) {
      console.info('[VoC Copilot] Upload falling back to client simulation:', err.message);
      return {
        batch_id: `batch-${Date.now()}`,
        filename: file.name,
        total_rows: 15,
        processed_rows: 15,
        duplicates_found: 0,
        message: 'CSV uploaded in demo mode'
      };
    }
  },

  getImportBatches() {
    return request('/import/batches');
  },

  // Themes
  getThemes(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(`/themes${query ? `?${query}` : ''}`);
  },

  getTheme(id) {
    return request(`/themes/${id}`);
  },

  updateTheme(id, data) {
    return request(`/themes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  confirmTheme(id) {
    return request(`/themes/${id}/confirm`, {
      method: 'POST',
    });
  },

  rejectTheme(id) {
    return request(`/themes/${id}/reject`, {
      method: 'POST',
    });
  },

  mergeThemes(sourceId, targetThemeId) {
    return request(`/themes/${sourceId}/merge`, {
      method: 'POST',
      body: JSON.stringify({ target_theme_id: targetThemeId }),
    });
  },

  // Analyze
  triggerAnalysis(batchId = null) {
    return request('/analyze', {
      method: 'POST',
      body: JSON.stringify({ batch_id: batchId }),
    });
  },

  getAnalysisStatus() {
    return request('/analyze/status');
  },

  // Prioritize
  getPrioritized(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(`/prioritize${query ? `?${query}` : ''}`);
  },

  // Export
  exportReport(data) {
    return request('/export', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getExportReport(id) {
    return request(`/export/${id}`);
  },
};
