/**
 * Voice of Customer Copilot — Application Entry Point
 */
import { initRouter } from './router.js';
import { toast } from './components/toast.js';
import { modal } from './components/modal.js';
import { store } from './store.js';
import { api } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize UI services
  toast.init();
  modal.init();

  try {
    // Initial fetch of dashboard stats to populate badges & API mode
    const stats = await api.getDashboardStats();
    store.setState({
      dashboardStats: stats,
      isDemoMode: true // Will be updated if Gemini key present
    });
  } catch (err) {
    console.warn('Initial stats load failed:', err);
  }

  // Initialize router
  initRouter();
});
