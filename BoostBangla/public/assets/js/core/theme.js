// ============================================
// components.js - Universal Component Loader - BoostBangla Design System v3.0
// Loads sidebar for dashboard, header/footer for marketing pages, with animations
// Version: 3.0 - DESIGN SYSTEM COMPLIANT
// ============================================

let componentsLoaded = false;
let componentLoadQueue = [];
let loadingTimeout = null;

// ============================================
// INJECT DESIGN SYSTEM STYLES FOR COMPONENTS
// ============================================
function injectComponentStyles() {
    const styleId = 'boostbangla-component-styles';
    if (document.getElementById(styleId)) return;
    
    const styles = `
        /* Component Placeholder Styles */
        .component-placeholder {
            min-height: 60px;
            position: relative;
        }
        
        .component-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: rgba(255, 255, 255, 0.5);
            backdrop-filter: blur(4px);
            border-radius: 20px;
        }
        
        body.dark-mode .component-loading {
            background: rgba(30, 41, 59, 0.5);
        }
        
        .component-loading-spinner {
            width: 32px;
            height: 32px;
            border: 3px solid rgba(255, 107, 0, 0.2);
            border-top-color: #FF6B00;
            border-radius: 50%;
            animation: componentSpin 0.8s linear infinite;
        }
        
        @keyframes componentSpin {
            to { transform: rotate(360deg); }
        }
        
        /* Component Fade In Animation */
        .component-fade-in {
            animation: componentFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        @keyframes componentFadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        /* Error State */
        .component-error {
            padding: 20px;
            text-align: center;
            background: #fee2e2;
            border-radius: 16px;
            color: #dc2626;
            font-size: 14px;
        }
        
        body.dark-mode .component-error {
            background: rgba(239, 68, 68, 0.15);
            color: #f87171;
        }
        
        .component-retry-btn {
            margin-top: 12px;
            padding: 6px 16px;
            background: #dc2626;
            color: white;
            border: none;
            border-radius: 60px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
        }
        
        .component-retry-btn:hover {
            background: #b91c1c;
            transform: scale(1.02);
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// ============================================
// LOAD A SINGLE COMPONENT FROM URL INTO ELEMENT
// ============================================
async function loadComponent(id, url, options = {}) {
    const element = document.getElementById(id);
    if (!element) {
        // Silently skip - component not needed on this page
        return null;
    }
    
    // Show loading state
    if (options.showLoading !== false) {
        showComponentLoading(element);
    }
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout || 10000);
        
        const response = await fetch(url, {
            signal: controller.signal,
            cache: options.cache || 'default'
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        let html = await response.text();
        
        // Process any dynamic content in the HTML
        html = processComponentHtml(html, options);
        
        element.innerHTML = html;
        element.classList.add('component-fade-in');
        
        // Bind events after component loads
        bindComponentEvents(element, options);
        
        // Remove loading state
        removeComponentLoading(element);
        
        // Dispatch custom event
        const event = new CustomEvent('component:loaded', {
            detail: { id: id, url: url, success: true }
        });
        window.dispatchEvent(event);
        
        return element;
        
    } catch (error) {
        console.error(`Failed to load component ${url}:`, error);
        
        if (options.showError !== false) {
            showComponentError(element, url, error.message);
        }
        
        // Dispatch error event
        const event = new CustomEvent('component:error', {
            detail: { id: id, url: url, error: error.message }
        });
        window.dispatchEvent(event);
        
        return null;
    }
}

// ============================================
// SHOW COMPONENT LOADING STATE
// ============================================
function showComponentLoading(element) {
    if (!element) return;
    
    // Store original content
    if (!element.dataset.originalContent) {
        element.dataset.originalContent = element.innerHTML;
    }
    
    element.innerHTML = `
        <div class="component-loading">
            <div class="component-loading-spinner"></div>
        </div>
    `;
}

function removeComponentLoading(element) {
    if (!element) return;
    // Don't remove if we have original content to restore (error case handled separately)
}

// ============================================
// SHOW COMPONENT ERROR STATE
// ============================================
function showComponentError(element, url, errorMessage) {
    if (!element) return;
    
    element.innerHTML = `
        <div class="component-error">
            <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
            <strong>Failed to load component</strong>
            <p style="font-size: 12px; margin-top: 4px;">${escapeHtml(errorMessage)}</p>
            <button class="component-retry-btn" onclick="retryComponent('${element.id}', '${url}')">
                <i class="fas fa-sync-alt"></i> Retry
            </button>
        </div>
    `;
}

// ============================================
// RETRY COMPONENT LOADING
// ============================================
window.retryComponent = function(id, url) {
    const element = document.getElementById(id);
    if (element) {
        // Restore original content if needed
        if (element.dataset.originalContent) {
            element.innerHTML = element.dataset.originalContent;
        }
        loadComponent(id, url, { showLoading: true, showError: true });
    }
};

// ============================================
// PROCESS COMPONENT HTML
// ============================================
function processComponentHtml(html, options) {
    // Replace any dynamic placeholders
    if (options.replacements) {
        for (const [key, value] of Object.entries(options.replacements)) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            html = html.replace(regex, value);
        }
    }
    
    // Replace user data placeholders
    const user = getCurrentUserFromLocal();
    if (user) {
        html = html.replace(/\{\{userName\}\}/g, user.username || 'User');
        html = html.replace(/\{\{userEmail\}\}/g, user.email || '');
        html = html.replace(/\{\{userInitial\}\}/g, (user.username || 'U').charAt(0).toUpperCase());
    }
    
    return html;
}

// ============================================
// GET CURRENT USER FROM LOCAL STORAGE
// ============================================
function getCurrentUserFromLocal() {
    try {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    } catch (e) {
        return null;
    }
}

// ============================================
// BIND COMPONENT EVENTS
// ============================================
function bindComponentEvents(container, options) {
    if (!container) return;
    
    // Bind logout buttons
    const logoutBtns = container.querySelectorAll('#logoutBtn, .logout-btn, [data-action="logout"]');
    logoutBtns.forEach(btn => {
        if (!btn.hasAttribute('data-bound')) {
            btn.setAttribute('data-bound', 'true');
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (window.signOut) {
                    await window.signOut();
                } else if (typeof firebase !== 'undefined' && firebase.auth) {
                    await firebase.auth().signOut();
                    window.location.href = '/login.html';
                } else {
                    window.location.href = '/login.html';
                }
            });
        }
    });
    
    // Bind dark mode toggle
    const darkToggles = container.querySelectorAll('#darkModeToggle, .dark-mode-toggle, [data-action="darkMode"]');
    darkToggles.forEach(toggle => {
        if (!toggle.hasAttribute('data-bound')) {
            toggle.setAttribute('data-bound', 'true');
            toggle.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                const isDark = document.body.classList.contains('dark-mode');
                localStorage.setItem('darkMode', isDark);
                
                // Update toggle icon if it exists
                const icon = toggle.querySelector('i');
                if (icon) {
                    icon.classList.toggle('fa-moon', !isDark);
                    icon.classList.toggle('fa-sun', isDark);
                }
                
                if (window.showToast) {
                    window.showToast(isDark ? 'Dark mode enabled' : 'Light mode enabled', 'info', 1500);
                }
            });
        }
    });
    
    // Bind mobile menu toggle (for marketing pages)
    const mobileBtns = container.querySelectorAll('#mobileMenuBtn, .mobile-menu-btn');
    mobileBtns.forEach(btn => {
        if (!btn.hasAttribute('data-bound')) {
            btn.setAttribute('data-bound', 'true');
            btn.addEventListener('click', () => {
                const mobileMenu = document.getElementById('mobileMenu');
                if (mobileMenu) {
                    mobileMenu.classList.toggle('hidden');
                    mobileMenu.classList.toggle('show');
                    
                    // Animate
                    if (mobileMenu.classList.contains('show')) {
                        mobileMenu.style.animation = 'slideDown 0.3s ease';
                    }
                }
            });
        }
    });
    
    // Bind sidebar collapse (for dashboard)
    const collapseBtns = container.querySelectorAll('.sidebar-collapse-btn');
    collapseBtns.forEach(btn => {
        if (!btn.hasAttribute('data-bound')) {
            btn.setAttribute('data-bound', 'true');
            btn.addEventListener('click', () => {
                document.body.classList.toggle('sidebar-collapsed');
                localStorage.setItem('sidebarCollapsed', document.body.classList.contains('sidebar-collapsed'));
            });
        }
    });
}

// ============================================
// LOAD MULTIPLE COMPONENTS IN PARALLEL
// ============================================
async function loadComponents(components, options = {}) {
    const promises = components.map(comp => 
        loadComponent(comp.id, comp.url, comp.options || options)
    );
    
    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
    const failed = results.filter(r => r.status === 'rejected' || r.value === null).length;
    
    if (options.onComplete) {
        options.onComplete({ successful, failed, total: components.length });
    }
    
    return results;
}

// ============================================
// PRELOAD COMPONENTS (Cache)
// ============================================
async function preloadComponent(url) {
    try {
        const response = await fetch(url, { cache: 'force-cache' });
        if (response.ok) {
            const text = await response.text();
            sessionStorage.setItem(`preload_${url}`, text);
            return true;
        }
    } catch (e) {
        console.warn(`Failed to preload ${url}`);
    }
    return false;
}

// ============================================
// GET CACHED COMPONENT
// ============================================
function getCachedComponent(url) {
    return sessionStorage.getItem(`preload_${url}`);
}

// ============================================
// DETECT PAGE TYPE AND LOAD APPROPRIATE COMPONENTS
// ============================================
async function loadUniversalComponents() {
    const path = window.location.pathname;
    const isDashboard = path.includes('/dashboard/');
    const isAdmin = path.includes('/admin/');
    const isMarketing = !isDashboard && !isAdmin && !path.includes('/login') && !path.includes('/signup') && !path.includes('/forgot-password');
    
    console.log(`📦 Loading components for: ${path} (Dashboard: ${isDashboard}, Marketing: ${isMarketing})`);
    
    const componentsToLoad = [];
    
    // Dashboard pages: only sidebar (header is usually built into dashboard layout)
    if (isDashboard && !isAdmin) {
        const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
        if (sidebarPlaceholder) {
            componentsToLoad.push({
                id: 'sidebar-placeholder',
                url: '/components/sidebar.html',
                options: { showLoading: true }
            });
        }
    }
    
    // Marketing pages: header and footer
    if (isMarketing) {
        const headerPlaceholder = document.getElementById('header-placeholder');
        const footerPlaceholder = document.getElementById('footer-placeholder');
        
        if (headerPlaceholder) {
            componentsToLoad.push({
                id: 'header-placeholder',
                url: '/components/header.html',
                options: { showLoading: true }
            });
        }
        
        if (footerPlaceholder) {
            componentsToLoad.push({
                id: 'footer-placeholder',
                url: '/components/footer.html',
                options: { showLoading: true }
            });
        }
    }
    
    // Admin pages: has its own sidebar, no external components needed
    if (isAdmin) {
        console.log('Admin page detected - using built-in admin sidebar');
    }
    
    // Load components
    if (componentsToLoad.length > 0) {
        const results = await loadComponents(componentsToLoad);
        console.log(`✅ Loaded ${results.filter(r => r.status === 'fulfilled' && r.value !== null).length}/${componentsToLoad.length} components`);
    }
    
    componentsLoaded = true;
    
    // Dispatch event that components are loaded
    const event = new CustomEvent('components:loaded', {
        detail: { path: path, isDashboard: isDashboard, isMarketing: isMarketing }
    });
    window.dispatchEvent(event);
}

// ============================================
// ESCAPE HTML
// ============================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// WATCH FOR DYNAMIC CONTENT AND BIND EVENTS
// ============================================
function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        bindComponentEvents(node);
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// ============================================
// REFRESH ALL COMPONENTS
// ============================================
async function refreshComponents() {
    console.log('Refreshing all components...');
    
    const placeholders = document.querySelectorAll('[id$="-placeholder"]');
    const components = Array.from(placeholders).map(el => ({
        id: el.id,
        url: `/components/${el.id.replace('-placeholder', '')}.html`
    }));
    
    if (components.length > 0) {
        await loadComponents(components);
    }
}

// ============================================
// INITIALIZE COMPONENT SYSTEM
// ============================================
function initComponentSystem() {
    injectComponentStyles();
    setupMutationObserver();
    
    // Load components when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadUniversalComponents);
    } else {
        loadUniversalComponents();
    }
    
    // Handle page navigation for SPA-like behavior
    window.addEventListener('popstate', () => {
        setTimeout(() => {
            refreshComponents();
        }, 100);
    });
}

// ============================================
// EXPORT PUBLIC API
// ============================================
window.loadComponent = loadComponent;
window.loadComponents = loadComponents;
window.preloadComponent = preloadComponent;
window.refreshComponents = refreshComponents;
window.getCachedComponent = getCachedComponent;
window.componentsLoaded = () => componentsLoaded;

// ============================================
// INITIALIZE
// ============================================
initComponentSystem();

console.log('✅ Components module v3.0 loaded - Design System compliant');