/**
 * State Management Store (Pub/Sub Pattern)
 */

class Store {
  constructor() {
    this.state = {
      dashboardStats: null,
      feedbackList: [],
      feedbackPagination: { page: 1, total: 0, limit: 20 },
      themes: [],
      prioritizedThemes: [],
      prioritizationWeights: {
        frequency: 0.25,
        severity: 0.35,
        userImpact: 0.25,
        confidence: 0.15,
      },
      selectedThemeIdsForExport: new Set(),
      exportPreview: null,
      isDemoMode: true,
      analysisStatus: { status: 'idle', progress: 0, message: '' },
    };
    this.listeners = new Map();
  }

  getState() {
    return this.state;
  }

  setState(partialState) {
    this.state = { ...this.state, ...partialState };
    this.emit('stateChange', this.state);
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.listeners.get(event).delete(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in listener for ${event}:`, err);
        }
      });
    }
  }
}

export const store = new Store();
