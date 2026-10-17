/**
 * Reusable Modal Component
 */

class ModalService {
  constructor() {
    this.root = null;
    this.isOpen = false;
    this.currentOnClose = null;
  }

  init() {
    this.root = document.getElementById('modal-root');
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  open({ title, bodyHtml, footerHtml = '', onClose = null }) {
    if (!this.root) this.init();
    this.currentOnClose = onClose;

    this.root.innerHTML = `
      <div class="modal-backdrop" id="modal-backdrop"></div>
      <div class="modal-container" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close-btn" id="modal-close-x" aria-label="Close modal">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="modal-body">
          ${bodyHtml}
        </div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
      </div>
    `;

    this.root.classList.add('active');
    this.isOpen = true;

    // Listeners
    document.getElementById('modal-backdrop').addEventListener('click', () => this.close());
    document.getElementById('modal-close-x').addEventListener('click', () => this.close());
  }

  close() {
    if (!this.isOpen) return;
    this.root.classList.remove('active');
    this.root.innerHTML = '';
    this.isOpen = false;
    if (this.currentOnClose) {
      this.currentOnClose();
      this.currentOnClose = null;
    }
  }
}

export const modal = new ModalService();
