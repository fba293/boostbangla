/**
 * ============================================
 * BoostBangla Theme Engine v3.0
 * Lightweight Vanilla JavaScript
 * Zero Dependencies | GPU Accelerated | 0ms Input Lag
 * ============================================
 */

// ============================================
// Theme Manager
// ============================================

class ThemeManager {
  constructor() {
    this.theme = this.getStoredTheme();
    this.systemTheme = this.getSystemTheme();
    this.listeners = [];
    this.init();
  }

  init() {
    this.applyTheme();
    this.watchSystemTheme();
    this.setupEventListeners();
    console.log('🎨 ThemeManager initialized', { theme: this.theme });
  }

  getStoredTheme() {
    return localStorage.getItem('boostbangla_theme') || 'system';
  }

  getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  getCurrentTheme() {
    if (this.theme === 'system') {
      return this.systemTheme;
    }
    return this.theme;
  }

  applyTheme() {
    const currentTheme = this.getCurrentTheme();
    
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const color = currentTheme === 'dark' ? '#02101A' : '#ffffff';
      metaThemeColor.setAttribute('content', color);
    }
    
    this.notifyListeners(currentTheme);
  }

  setTheme(theme) {
    if (!['light', 'dark', 'system'].includes(theme)) return;
    
    this.theme = theme;
    localStorage.setItem('boostbangla_theme', theme);
    this.applyTheme();
  }

  toggleTheme() {
    const current = this.getCurrentTheme();
    const newTheme = current === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  watchSystemTheme() {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      this.systemTheme = e.matches ? 'dark' : 'light';
      if (this.theme === 'system') {
        this.applyTheme();
      }
    });
  }

  setupEventListeners() {
    // Listen for theme toggle buttons
    document.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('[data-theme-toggle]');
      if (toggleBtn) {
        e.preventDefault();
        this.toggleTheme();
      }
    });
  }

  onThemeChange(callback) {
    this.listeners.push(callback);
  }

  notifyListeners(theme) {
    this.listeners.forEach(callback => callback(theme));
  }
}

// ============================================
// Modal Manager
// ============================================

class ModalManager {
  constructor() {
    this.modals = new Map();
    this.activeModal = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
    console.log('📦 ModalManager initialized');
  }

  createModal(id, options = {}) {
    const existing = this.modals.get(id);
    if (existing) return existing;

    const modal = document.createElement('dialog');
    modal.id = id;
    modal.className = 'modal';
    
    if (options.title) {
      modal.innerHTML = `
        <div class="modal-header">
          <h3>${options.title}</h3>
          <button class="modal-close" data-modal-close="${id}">&times;</button>
        </div>
        <div class="modal-body">
          ${options.content || ''}
        </div>
        ${options.showFooter !== false ? `
          <div class="modal-footer">
            <button class="btn btn-secondary" data-modal-cancel="${id}">Cancel</button>
            <button class="btn btn-primary" data-modal-confirm="${id}">Confirm</button>
          </div>
        ` : ''}
      `;
    } else {
      modal.innerHTML = `
        <div class="modal-header">
          <button class="modal-close" data-modal-close="${id}">&times;</button>
        </div>
        <div class="modal-body">
          ${options.content || ''}
        </div>
      `;
    }
    
    document.body.appendChild(modal);
    this.modals.set(id, modal);
    
    return modal;
  }

  open(id, data = null) {
    const modal = this.modals.get(id);
    if (!modal) {
      console.error(`Modal ${id} not found`);
      return;
    }
    
    this.activeModal = { id, modal, data };
    modal.showModal();
    document.body.style.overflow = 'hidden';
    
    // Dispatch event
    const event = new CustomEvent('modal:open', { detail: { id, data } });
    document.dispatchEvent(event);
  }

  close(id) {
    const modal = this.modals.get(id);
    if (!modal) return;
    
    modal.close();
    document.body.style.overflow = '';
    this.activeModal = null;
    
    // Dispatch event
    const event = new CustomEvent('modal:close', { detail: { id } });
    document.dispatchEvent(event);
  }

  closeAll() {
    this.modals.forEach((modal, id) => {
      if (modal.open) {
        modal.close();
      }
    });
    document.body.style.overflow = '';
    this.activeModal = null;
  }

  setupEventListeners() {
    // Close on backdrop click
    document.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      if (modal && e.target === modal) {
        const id = modal.id;
        this.close(id);
      }
    });
    
    // Close buttons
    document.addEventListener('click', (e) => {
      const closeBtn = e.target.closest('[data-modal-close]');
      if (closeBtn) {
        const id = closeBtn.dataset.modalClose;
        this.close(id);
      }
      
      const cancelBtn = e.target.closest('[data-modal-cancel]');
      if (cancelBtn) {
        const id = cancelBtn.dataset.modalCancel;
        this.close(id);
      }
      
      const confirmBtn = e.target.closest('[data-modal-confirm]');
      if (confirmBtn) {
        const