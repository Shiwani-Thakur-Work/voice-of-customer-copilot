/**
 * Client-Side Router
 */
import { renderNavbar } from './components/navbar.js';
import { renderDashboard } from './views/dashboard.js';
import { renderImport } from './views/import.js';
import { renderFeedback } from './views/feedback.js';
import { renderThemes } from './views/themes.js';
import { renderPrioritize } from './views/prioritize.js';
import { renderExport } from './views/export.js';

const routes = {
  dashboard: renderDashboard,
  import: renderImport,
  feedback: renderFeedback,
  themes: renderThemes,
  prioritize: renderPrioritize,
  export: renderExport,
};

export function initRouter() {
  const container = document.getElementById('view-container');

  function handleRoute() {
    const hash = window.location.hash.slice(2) || 'dashboard';
    const viewName = routes[hash] ? hash : 'dashboard';

    // Update active navbar state
    renderNavbar(viewName);

    // Render target view
    container.innerHTML = '';
    const renderFn = routes[viewName];
    if (renderFn) {
      renderFn(container);
    }
  }

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
