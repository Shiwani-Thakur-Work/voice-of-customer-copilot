/**
 * Navigation Bar Component
 */
import { store } from '../store.js';

export function renderNavbar(activeRoute = 'dashboard') {
  const header = document.getElementById('app-header');
  const state = store.getState();
  const themeCount = state.themes ? state.themes.length : 0;
  const feedbackCount = state.dashboardStats?.feedback?.total || 0;

  header.innerHTML = `
    <div class="navbar-inner">
      <a href="#/dashboard" class="brand-link">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
          </svg>
        </div>
        <span>VoC Copilot</span>
      </a>

      <nav>
        <ul class="nav-links">
          <li>
            <a href="#/dashboard" class="nav-link ${activeRoute === 'dashboard' ? 'active' : ''}">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span>Dashboard</span>
            </a>
          </li>
          <li>
            <a href="#/import" class="nav-link ${activeRoute === 'import' ? 'active' : ''}">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Import</span>
            </a>
          </li>
          <li>
            <a href="#/feedback" class="nav-link ${activeRoute === 'feedback' ? 'active' : ''}">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span>Feedback</span>
              ${feedbackCount ? `<span class="nav-badge">${feedbackCount}</span>` : ''}
            </a>
          </li>
          <li>
            <a href="#/themes" class="nav-link ${activeRoute === 'themes' ? 'active' : ''}">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>Themes</span>
              ${themeCount ? `<span class="nav-badge">${themeCount}</span>` : ''}
            </a>
          </li>
          <li>
            <a href="#/prioritize" class="nav-link ${activeRoute === 'prioritize' ? 'active' : ''}">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              <span>Prioritize</span>
            </a>
          </li>
          <li>
            <a href="#/export" class="nav-link ${activeRoute === 'export' ? 'active' : ''}">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export</span>
            </a>
          </li>
        </ul>
      </nav>

      <div class="header-actions">
        <div class="api-badge ${state.isDemoMode ? 'demo' : 'live'}" title="${state.isDemoMode ? 'Running in offline demo mode using local heuristic NLP' : 'Connected to Google Gemini AI API'}">
          <span class="pulse-dot"></span>
          <span>${state.isDemoMode ? 'Demo Mode' : 'Gemini AI Live'}</span>
        </div>
      </div>
    </div>
  `;
}
