// ============================================
// Keyboard Shortcuts System - BoostBangla Design System v3.0
// Global keyboard shortcuts for better productivity
// Version: 3.0 - DESIGN SYSTEM COMPLIANT
// ============================================

const shortcuts = {
    // Navigation shortcuts
    'g d': { action: () => navigateTo('/dashboard/'), description: 'Go to Dashboard', category: 'navigation' },
    'g o': { action: () => navigateTo('/dashboard/orders.html'), description: 'Go to Orders', category: 'navigation' },
    'g s': { action: () => navigateTo('/dashboard/services.html'), description: 'Go to Services', category: 'navigation' },
    'g f': { action: () => navigateTo('/dashboard/add-funds.html'), description: 'Go to Add Funds', category: 'navigation' },
    'g n': { action: () => navigateTo('/dashboard/notifications.html'), description: 'Go to Notifications', category: 'navigation' },
    'g a': { action: () => navigateTo('/dashboard/account.html'), description: 'Go to Account', category: 'navigation' },
    'g p': { action: () => navigateTo('/dashboard/api.html'), description: 'Go to API Settings', category: 'navigation' },
    'g t': { action: () => navigateTo('/dashboard/tickets.html'), description: 'Go to Support Tickets', category: 'navigation' },
    
    // Action shortcuts
    '?': { action: () => showShortcutsModal(), description: 'Show keyboard shortcuts', category: 'general' },
    'esc': { action: () => closeAllModals(), description: 'Close modal/dropdown', category: 'general' },
    'ctrl+k': { action: () => focusSearch(), description: 'Focus search', category: 'action' },
    'cmd+k': { action: () => focusSearch(), description: 'Focus search (Mac)', category: 'action' },
    'ctrl+enter': { action: () => submitCurrentForm(), description: 'Submit current form', category: 'action' },
    'alt+s': { action: () => toggleSidebar(), description: 'Toggle sidebar collapse', category: 'action' },
    'alt+m': { action: () => toggleMobileMenu(), description: 'Toggle mobile menu', category: 'action' },
    'ctrl+shift+r': { action: () => hardRefresh(), description: 'Hard refresh (clear cache)', category: 'action' },
    'ctrl+r': { action: () => softRefresh(), description: 'Soft refresh', category: 'action' },
    
    // Order shortcuts
    'n o': { action: () => navigateTo('/dashboard/new-order.html'), description: 'New Order', category: 'orders' },
    'r o': { action: () => refreshOrders(), description: 'Refresh orders list', category: 'orders' },
    'c o': { action: () => copyLastOrderId(), description: 'Copy last order ID', category: 'orders' },
    
    // Support shortcuts
    'h': { action: () => showHelp(), description: 'Show help center', category: 'support' },
    't': { action: () => navigateTo('/dashboard/tickets.html'), description: 'Support Tickets', category: 'support' },
    
    // Balance shortcuts
    'b': { action: () => navigateTo('/dashboard/add-funds.html'), description: 'Add funds / Balance', category: 'finance' },
    'w': { action: () => navigateTo('/dashboard/withdraw.html'), description: 'Withdraw funds', category: 'finance' },
    
    // Modifier shortcuts
    'shift+?': { action: () => showFeedbackModal(), description: 'Send feedback', category: 'general' },
    'ctrl+d': { action: () => toggleDarkMode(), description: 'Toggle dark mode', category: 'general' },
    'ctrl+/': { action: () => showShortcutsModal(), description: 'Show shortcuts', category: 'general' }
};

let activeShortcuts = [];
let shortcutsModal = null;
let currentKeyBuffer = '';
let keyBufferTimeout = null;
let shortcutHintTimeout = null;

// ============================================
// INITIALIZE SHORTCUTS
// ============================================
function initKeyboardShortcuts() {
    console.log('⌨️ Initializing keyboard shortcuts v3.0...');
    setupGlobalKeyListener();
    loadUserShortcutPreferences();
    setupShortcutsHelp();
    injectDesignSystemStyles();
    setupShortcutTutorial();
}

// ============================================
// INJECT DESIGN SYSTEM STYLES
// ============================================
function injectDesignSystemStyles() {
    const styleId = 'boostbangla-shortcuts-styles';
    if (document.getElementById(styleId)) return;
    
    const styles = `
        /* Shortcuts Modal - Design System Compliant */
        .shortcuts-modal {
            max-width: 750px;
            width: 90%;
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(20px);
            border-radius: 32px;
            padding: 32px;
            box-shadow: 0 35px 60px -15px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
            animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        body.dark-mode .shortcuts-modal {
            background: rgba(30, 41, 59, 0.98);
            border-color: rgba(255, 107, 0, 0.2);
        }
        
        .shortcuts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 28px;
            margin: 24px 0;
        }
        
        .shortcuts-section h4 {
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 16px;
            color: #FF6B00;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .shortcuts-section h4 i {
            font-size: 14px;
        }
        
        .shortcut-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            font-size: 13px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        
        body.dark-mode .shortcut-item {
            border-bottom-color: rgba(255, 255, 255, 0.05);
        }
        
        .shortcut-item kbd {
            background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
            padding: 4px 10px;
            border-radius: 8px;
            font-family: 'Inter', monospace;
            font-size: 11px;
            font-weight: 700;
            color: #1f2937;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            letter-spacing: 0.5px;
        }
        
        body.dark-mode .shortcut-item kbd {
            background: linear-gradient(135deg, #334155, #1e293b);
            color: #e2e8f0;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }
        
        /* Shortcut Feedback Toast */
        .shortcut-feedback {
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #FF6B00, #CC5500);
            color: white;
            padding: 10px 20px;
            border-radius: 60px;
            font-size: 13px;
            font-weight: 600;
            z-index: 10001;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s ease;
            white-space: nowrap;
            font-family: 'Inter', monospace;
            box-shadow: 0 10px 25px -5px rgba(255, 107, 0, 0.4);
            letter-spacing: 0.5px;
        }
        
        /* Shortcut Hint on Elements */
        .shortcut-hint {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 10px;
            font-weight: 600;
            color: #6b7280;
            background: #f3f4f6;
            padding: 3px 8px;
            border-radius: 8px;
            font-family: monospace;
            pointer-events: none;
            transition: all 0.2s ease;
        }
        
        body.dark-mode .shortcut-hint {
            background: #334155;
            color: #94a3b8;
        }
        
        /* Key Press Animation */
        @keyframes keyPress {
            0% { transform: scale(1); }
            50% { transform: scale(0.9); background: #FF6B00; color: white; }
            100% { transform: scale(1); }
        }
        
        .key-pressed {
            animation: keyPress 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        /* Mobile Adjustments */
        @media (max-width: 640px) {
            .shortcuts-modal {
                padding: 20px;
                width: 95%;
                border-radius: 24px;
            }
            
            .shortcuts-grid {
                gap: 20px;
            }
            
            .shortcut-item {
                font-size: 12px;
                padding: 6px 0;
            }
            
            .shortcut-item kbd {
                padding: 3px 8px;
                font-size: 10px;
            }
            
            .shortcut-feedback {
                bottom: 80px;
                font-size: 11px;
                padding: 8px 16px;
                white-space: nowrap;
            }
        }
        
        /* Tutorial Overlay */
        .shortcut-tutorial-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(4px);
            z-index: 10002;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        }
        
        .shortcut-tutorial-card {
            background: white;
            border-radius: 32px;
            padding: 32px;
            max-width: 400px;
            text-align: center;
            animation: slideUp 0.4s ease;
        }
        
        body.dark-mode .shortcut-tutorial-card {
            background: #1e293b;
        }
        
        .shortcut-tutorial-card h3 {
            font-size: 24px;
            font-weight: 800;
            margin-bottom: 16px;
            background: linear-gradient(135deg, #FF6B00, #FF8C42);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// ============================================
// SETUP SHORTCUT TUTORIAL (First time users)
// ============================================
function setupShortcutTutorial() {
    const hasSeenTutorial = localStorage.getItem('boostbangla_shortcut_tutorial');
    
    if (!hasSeenTutorial && !window.location.pathname.includes('login')) {
        setTimeout(() => {
            showShortcutTutorial();
        }, 2000);
    }
}

function showShortcutTutorial() {
    const overlay = document.createElement('div');
    overlay.className = 'shortcut-tutorial-overlay';
    overlay.innerHTML = `
        <div class="shortcut-tutorial-card">
            <div style="font-size: 48px; margin-bottom: 16px;">⌨️</div>
            <h3>Keyboard Shortcuts Available</h3>
            <p style="color: #6b7280; margin-bottom: 24px;">Press <kbd style="background:#f3f4f6;padding:4px 8px;border-radius:8px;">?</kbd> anytime to see all shortcuts</p>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button id="tutorialGotItBtn" class="btn-primary" style="padding: 10px 24px;">Got it</button>
                <button id="tutorialShowBtn" class="btn-outline" style="padding: 10px 24px;">Show all</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    
    document.getElementById('tutorialGotItBtn')?.addEventListener('click', () => {
        localStorage.setItem('boostbangla_shortcut_tutorial', 'true');
        overlay.remove();
        if (window.showToast) window.showToast('Press ? for shortcuts anytime!', 'info', 3000);
    });
    
    document.getElementById('tutorialShowBtn')?.addEventListener('click', () => {
        localStorage.setItem('boostbangla_shortcut_tutorial', 'true');
        overlay.remove();
        showShortcutsModal();
    });
}

// ============================================
// GLOBAL KEY LISTENER
// ============================================
function setupGlobalKeyListener() {
    document.addEventListener('keydown', (e) => {
        const target = e.target;
        const isTyping = target.tagName === 'INPUT' || 
                        target.tagName === 'TEXTAREA' || 
                        target.isContentEditable ||
                        target.getAttribute('contenteditable') === 'true';
        
        // Handle single key shortcuts (not when typing)
        if (!isTyping) {
            // Handle '?' key
            if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
                e.preventDefault();
                showShortcutsModal();
                animateKeyPress('?');
                return;
            }
            
            // Handle Escape key
            if (e.key === 'Escape') {
                closeAllModals();
                animateKeyPress('Esc');
                return;
            }
            
            // Handle 'h' for help
            if (e.key === 'h' && !e.ctrlKey && !e.altKey && !e.metaKey) {
                e.preventDefault();
                showHelp();
                animateKeyPress('H');
                return;
            }
            
            // Handle 'b' for balance/add funds
            if (e.key === 'b' && !e.ctrlKey && !e.altKey && !e.metaKey) {
                e.preventDefault();
                navigateTo('/dashboard/add-funds.html');
                animateKeyPress('B');
                return;
            }
            
            // Handle 't' for tickets
            if (e.key === 't' && !e.ctrlKey && !e.altKey && !e.metaKey) {
                e.preventDefault();
                navigateTo('/dashboard/tickets.html');
                animateKeyPress('T');
                return;
            }
        }
        
        // Handle multi-key shortcuts (like 'g d')
        if (!isTyping && !e.ctrlKey && !e.altKey && !e.metaKey && /^[a-z]$/i.test(e.key)) {
            currentKeyBuffer += e.key.toLowerCase();
            
            if (keyBufferTimeout) clearTimeout(keyBufferTimeout);
            keyBufferTimeout = setTimeout(() => {
                currentKeyBuffer = '';
            }, 1000);
            
            const matchedShortcut = shortcuts[currentKeyBuffer];
            if (matchedShortcut) {
                e.preventDefault();
                matchedShortcut.action();
                showShortcutFeedback(currentKeyBuffer);
                animateKeyPress(currentKeyBuffer);
                currentKeyBuffer = '';
                if (keyBufferTimeout) clearTimeout(keyBufferTimeout);
            }
        }
        
        // Handle Ctrl/Cmd + key shortcuts
        if ((e.ctrlKey || e.metaKey) && !e.altKey) {
            const key = e.key.toLowerCase();
            
            switch (key) {
                case 'k':
                    e.preventDefault();
                    focusSearch();
                    animateKeyPress('⌘K');
                    break;
                case 'enter':
                    e.preventDefault();
                    submitCurrentForm();
                    animateKeyPress('↵');
                    break;
                case 'r':
                    if (!e.shiftKey) {
                        e.preventDefault();
                        softRefresh();
                        animateKeyPress('⌘R');
                    }
                    break;
                case 'd':
                    e.preventDefault();
                    toggleDarkMode();
                    animateKeyPress('⌘D');
                    break;
                case '/':
                    e.preventDefault();
                    showShortcutsModal();
                    animateKeyPress('⌘/');
                    break;
            }
            
            if (e.shiftKey && key === 'r') {
                e.preventDefault();
                hardRefresh();
                animateKeyPress('⌘⇧R');
            }
        }
        
        // Handle Alt + key shortcuts
        if (e.altKey && !e.ctrlKey && !e.metaKey) {
            const key = e.key.toLowerCase();
            
            switch (key) {
                case 's':
                    e.preventDefault();
                    toggleSidebar();
                    animateKeyPress('Alt+S');
                    break;
                case 'm':
                    e.preventDefault();
                    toggleMobileMenu();
                    animateKeyPress('Alt+M');
                    break;
            }
        }
        
        // Handle Shift + key shortcuts
        if (e.shiftKey && !e.ctrlKey && !e.altKey) {
            if (e.key === '?') {
                e.preventDefault();
                showFeedbackModal();
                animateKeyPress('Shift+?');
            }
        }
    });
}

// ============================================
// ANIMATE KEY PRESS FEEDBACK
// ============================================
function animateKeyPress(keyName) {
    const elements = document.querySelectorAll(`kbd`);
    elements.forEach(el => {
        if (el.textContent.trim() === keyName || el.textContent.includes(keyName)) {
            el.classList.add('key-pressed');
            setTimeout(() => el.classList.remove('key-pressed'), 200);
        }
    });
}

// ============================================
// NAVIGATION HELPER
// ============================================
function navigateTo(url) {
    if (window.location.pathname !== url) {
        window.location.href = url;
    }
}

// ============================================
// FOCUS SEARCH
// ============================================
function focusSearch() {
    const searchInput = document.getElementById('globalSearchInput');
    if (searchInput) {
        searchInput.focus();
        searchInput.select();
        showShortcutFeedback('Search focused');
        
        // Highlight effect
        searchInput.style.transform = 'scale(1.02)';
        setTimeout(() => {
            searchInput.style.transform = '';
        }, 200);
    } else {
        const anySearch = document.querySelector('input[type="search"], input[placeholder*="Search"], input[name="search"]');
        if (anySearch) {
            anySearch.focus();
            anySearch.select();
        }
    }
}

// ============================================
// SUBMIT CURRENT FORM
// ============================================
function submitCurrentForm() {
    const activeForm = document.querySelector('form:focus-within');
    if (activeForm) {
        const submitBtn = activeForm.querySelector('button[type="submit"], input[type="submit"]');
        if (submitBtn) {
            submitBtn.click();
            showShortcutFeedback('Form submitted');
        } else {
            activeForm.dispatchEvent(new Event('submit'));
        }
    } else {
        // Try to find any visible form
        const anyForm = document.querySelector('form');
        if (anyForm) {
            const submitBtn = anyForm.querySelector('button[type="submit"], input[type="submit"]');
            if (submitBtn) submitBtn.click();
        }
    }
}

// ============================================
// TOGGLE SIDEBAR
// ============================================
function toggleSidebar() {
    const collapseBtn = document.querySelector('.sidebar-collapse-btn, .sidebar-collapse-btn-custom');
    if (collapseBtn && window.innerWidth > 768) {
        collapseBtn.click();
    }
}

// ============================================
// TOGGLE MOBILE MENU
// ============================================
function toggleMobileMenu() {
    const hamburgerBtn = document.getElementById('mobileMenuBtn');
    if (hamburgerBtn && window.innerWidth <= 768) {
        hamburgerBtn.click();
    }
}

// ============================================
// REFRESH FUNCTIONS
// ============================================
function softRefresh() {
    window.location.reload();
}

function hardRefresh() {
    if (window.showToast) window.showToast('Hard refreshing...', 'info', 1000);
    window.location.reload(true);
}

// ============================================
// REFRESH ORDERS
// ============================================
function refreshOrders() {
    if (window.location.pathname.includes('/dashboard/orders.html')) {
        const refreshBtn = document.getElementById('refreshOrdersBtn');
        if (refreshBtn) {
            refreshBtn.click();
            showShortcutFeedback('Orders refreshed');
        } else if (window.loadOrders) {
            window.loadOrders();
        }
    } else {
        navigateTo('/dashboard/orders.html');
    }
}

// ============================================
// COPY LAST ORDER ID
// ============================================
function copyLastOrderId() {
    const lastOrderId = localStorage.getItem('lastOrderId');
    if (lastOrderId) {
        if (window.copyToClipboard) {
            window.copyToClipboard(lastOrderId);
        } else {
            navigator.clipboard.writeText(lastOrderId);
            if (window.showToast) window.showToast('Order ID copied!', 'success');
        }
    } else {
        if (window.showToast) window.showToast('No recent order found', 'warning');
    }
}

// ============================================
// TOGGLE DARK MODE
// ============================================
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    
    // Update any dark mode toggle buttons
    const toggles = document.querySelectorAll('#darkModeCheckbox, #sidebarDarkModeToggle');
    toggles.forEach(toggle => {
        if (toggle.type === 'checkbox') toggle.checked = isDark;
    });
    
    const message = isDark ? 'Dark mode enabled' : 'Light mode enabled';
    if (window.showToast) window.showToast(message, 'info', 1500);
}

// ============================================
// CLOSE ALL MODALS
// ============================================
function closeAllModals() {
    // Close notification dropdown
    const notifDropdown = document.getElementById('headerNotificationDropdown');
    if (notifDropdown) notifDropdown.classList.remove('show');
    
    // Close user dropdown
    const userDropdown = document.getElementById('userDropdown');
    if (userDropdown) userDropdown.classList.remove('show');
    
    // Close any open modals
    const modals = document.querySelectorAll('.modal-overlay, .modal-backdrop');
    modals.forEach(modal => {
        if (modal.style.display === 'flex' || modal.style.display === 'block') {
            modal.style.display = 'none';
        }
    });
    
    // Close any open dropdowns
    const dropdowns = document.querySelectorAll('.dropdown.show, .dropdown-menu.show');
    dropdowns.forEach(dropdown => {
        dropdown.classList.remove('show');
    });
    
    // Close shortcuts modal if open
    const shortcutsModal = document.getElementById('shortcutsModal');
    if (shortcutsModal && shortcutsModal.style.display === 'flex') {
        closeShortcutsModal();
    }
    
    showShortcutFeedback('Modals closed');
}

// ============================================
// SHOW HELP
// ============================================
function showHelp() {
    showShortcutsModal();
}

// ============================================
// SHOW SHORTCUTS MODAL
// ============================================
function showShortcutsModal() {
    let modal = document.getElementById('shortcutsModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'shortcutsModal';
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(8px);
            z-index: 10002;
            display: flex;
            align-items: center;
            justify-content: center;
            display: none;
        `;
        
        // Group shortcuts by category
        const categories = {
            navigation: { title: '🚀 Navigation', icon: 'fa-compass' },
            orders: { title: '📦 Orders', icon: 'fa-shopping-cart' },
            action: { title: '⚡ Actions', icon: 'fa-bolt' },
            finance: { title: '💰 Finance', icon: 'fa-coins' },
            support: { title: '🎧 Support', icon: 'fa-headset' },
            general: { title: '✨ General', icon: 'fa-star' }
        };
        
        let sectionsHtml = '';
        
        for (const [cat, info] of Object.entries(categories)) {
            const catShortcuts = Object.entries(shortcuts).filter(([_, s]) => s.category === cat);
            if (catShortcuts.length === 0) continue;
            
            sectionsHtml += `
                <div class="shortcuts-section">
                    <h4><i class="fas ${info.icon}"></i> ${info.title}</h4>
                    ${catShortcuts.map(([key, s]) => `
                        <div class="shortcut-item">
                            <span>${s.description}</span>
                            <kbd>${formatShortcutDisplay(key)}</kbd>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        modal.innerHTML = `
            <div class="shortcuts-modal">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <div>
                        <h2 style="font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #FF6B00, #FF8C42); -webkit-background-clip: text; background-clip: text; color: transparent;">
                            Keyboard Shortcuts
                        </h2>
                        <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Boost your productivity with these shortcuts</p>
                    </div>
                    <button onclick="closeShortcutsModal()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #9ca3af;">&times;</button>
                </div>
                <div class="shortcuts-grid">
                    ${sectionsHtml}
                </div>
                <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(0,0,0,0.1); text-align: center; font-size: 12px; color: #9ca3af;">
                    <i class="fas fa-lightbulb"></i> Tip: Press <kbd style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">?</kbd> anytime to see this menu
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function formatShortcutDisplay(shortcut) {
    return shortcut
        .replace(/ctrl\+/gi, '⌘')
        .replace(/cmd\+/gi, '⌘')
        .replace(/alt\+/gi, '⌥')
        .replace(/shift\+/gi, '⇧')
        .replace(/\+/g, ' + ')
        .toUpperCase();
}

function closeShortcutsModal() {
    const modal = document.getElementById('shortcutsModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Make functions global
window.closeShortcutsModal = closeShortcutsModal;

// ============================================
// SHOW FEEDBACK MODAL
// ============================================
function showFeedbackModal() {
    if (window.showToast) {
        window.showToast('📝 Feedback feature: Press F to open feedback form', 'info', 3000);
    }
    // Can be expanded to open actual feedback modal
}

// ============================================
// SHOW SHORTCUT FEEDBACK
// ============================================
function showShortcutFeedback(shortcut) {
    let feedback = document.querySelector('.shortcut-feedback');
    
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.className = 'shortcut-feedback';
        document.body.appendChild(feedback);
    }
    
    const displayText = typeof shortcut === 'string' && shortcut.length > 2 && shortcut.includes(' ')
        ? shortcut.toUpperCase().split('').join(' ➜ ')
        : shortcut.toUpperCase();
    
    feedback.textContent = `✓ ${displayText}`;
    feedback.style.opacity = '1';
    
    if (shortcutHintTimeout) clearTimeout(shortcutHintTimeout);
    shortcutHintTimeout = setTimeout(() => {
        feedback.style.opacity = '0';
    }, 1000);
}

// ============================================
// LOAD USER SHORTCUT PREFERENCES
// ============================================
function loadUserShortcutPreferences() {
    const savedPrefs = localStorage.getItem('boostbangla_shortcutPrefs');
    if (savedPrefs) {
        try {
            const prefs = JSON.parse(savedPrefs);
            // Apply custom preferences if needed
            if (prefs.disabled) {
                // Handle disabled shortcuts
            }
        } catch (e) {}
    }
}

// ============================================
// SETUP SHORTCUTS HELP
// ============================================
function setupShortcutsHelp() {
    const searchInput = document.getElementById('globalSearchInput');
    if (searchInput && searchInput.parentElement) {
        const wrapper = searchInput.parentElement;
        wrapper.style.position = 'relative';
        
        const hint = document.createElement('span');
        hint.className = 'shortcut-hint';
        
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        hint.textContent = isMac ? '⌘K' : 'Ctrl+K';
        
        wrapper.appendChild(hint);
    }
}

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initKeyboardShortcuts();
});

// Make functions globally available
window.closeAllModals = closeAllModals;
window.showShortcutsModal = showShortcutsModal;
window.toggleSidebar = toggleSidebar;
window.hardRefresh = hardRefresh;
window.toggleDarkMode = toggleDarkMode;

console.log('✅ Shortcuts JS v3.0 loaded - Design System compliant');