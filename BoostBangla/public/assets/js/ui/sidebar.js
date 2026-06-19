// ============================================
// Sidebar JavaScript - BoostBangla Design System v3.0
// Handles: Mobile hamburger menu, desktop collapse, active links, tooltips, animations
// Version: 4.0 - DESIGN SYSTEM COMPLIANT
// ============================================

let sidebarCollapseBtn = null;
let sidebarOverlay = null;
let isSidebarCollapsed = false;
let mobileMenuBtn = null;
let currentTooltip = null;

// ============================================
// INITIALIZE SIDEBAR - MAIN ENTRY POINT
// ============================================
function initSidebar() {
    console.log('🎨 Initializing sidebar with Design System v3.0...');
    createMobileMenuButton();
    setupSidebarCollapse();
    setupActiveLinkHighlighting();
    setupMobileSidebar();
    setupKeyboardShortcuts();
    setupResizeHandler();
    loadSidebarState();
    setupUserData();
    setupSidebarTooltips();
    injectDesignSystemStyles();
}

// ============================================
// INJECT DESIGN SYSTEM STYLES
// ============================================
function injectDesignSystemStyles() {
    const styleId = 'boostbangla-sidebar-styles';
    if (document.getElementById(styleId)) return;
    
    const styles = `
        /* Mobile Menu Button - Flutter FAB style */
        .mobile-menu-btn-custom {
            position: fixed;
            bottom: 24px;
            left: 24px;
            z-index: 1000;
            background: var(--primary-gradient, linear-gradient(135deg, #FF6B00, #CC5500));
            color: white;
            width: 56px;
            height: 56px;
            border-radius: 28px;
            display: none;
            align-items: center;
            justify-content: center;
            box-shadow: 0 8px 20px rgba(255, 107, 0, 0.4);
            cursor: pointer;
            border: none;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .mobile-menu-btn-custom:hover {
            transform: scale(1.1);
            box-shadow: 0 12px 28px rgba(255, 107, 0, 0.5);
        }
        
        .mobile-menu-btn-custom:active {
            transform: scale(0.95);
        }
        
        /* Sidebar Overlay - Glass morphism */
        .sidebar-overlay-custom {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(8px);
            z-index: 999;
            display: none;
            animation: fadeIn 0.3s ease;
        }
        
        .sidebar-overlay-custom.active {
            display: block;
        }
        
        /* Collapse Button */
        .sidebar-collapse-btn-custom {
            position: absolute;
            bottom: 24px;
            right: -14px;
            width: 28px;
            height: 28px;
            background: #FF6B00;
            border: 2px solid white;
            border-radius: 50%;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1001;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .sidebar-collapse-btn-custom:hover {
            transform: scale(1.15) rotate(180deg);
            background: #CC5500;
        }
        
        /* Sidebar - Design System Compliant */
        .sidebar {
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            width: 280px;
            background: linear-gradient(180deg, #02101A 0%, #031a2a 100%);
            backdrop-filter: blur(0px);
            color: white;
            z-index: 1000;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            overflow-y: auto;
            overflow-x: hidden;
            box-shadow: 4px 0 20px rgba(0, 0, 0, 0.2);
        }
        
        /* Sidebar Logo */
        .sidebar .logo {
            font-size: 24px;
            font-weight: 800;
            background: linear-gradient(135deg, #FF6B00, #FF8C42);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            text-decoration: none;
        }
        
        .sidebar .logo span {
            background: linear-gradient(135deg, #FF8C42, #FF6B00);
            -webkit-background-clip: text;
            background-clip: text;
        }
        
        /* Collapsed Sidebar */
        body.sidebar-collapsed .sidebar {
            width: 80px;
        }
        
        body.sidebar-collapsed .sidebar .logo-text,
        body.sidebar-collapsed .sidebar .user-info,
        body.sidebar-collapsed .sidebar .sidebar-link span,
        body.sidebar-collapsed .sidebar .nav-section-title,
        body.sidebar-collapsed .sidebar .dark-mode-toggle span {
            display: none;
        }
        
        body.sidebar-collapsed .sidebar .sidebar-link {
            justify-content: center;
            padding: 14px;
            margin: 8px 12px;
            border-radius: 16px;
        }
        
        body.sidebar-collapsed .sidebar .sidebar-link i {
            margin: 0;
            font-size: 22px;
        }
        
        body.sidebar-collapsed .main-content {
            margin-left: 80px;
        }
        
        /* Sidebar Links - Design System */
        .sidebar-link {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 14px 20px;
            margin: 6px 12px;
            border-radius: 16px;
            color: #e2e8f0;
            text-decoration: none;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            font-weight: 500;
        }
        
        .sidebar-link i {
            width: 24px;
            font-size: 18px;
            text-align: center;
        }
        
        .sidebar-link:hover {
            background: rgba(255, 107, 0, 0.15);
            color: #FF6B00;
            transform: translateX(4px);
        }
        
        .sidebar-link.active {
            background: rgba(255, 107, 0, 0.2);
            color: #FF6B00;
            font-weight: 600;
        }
        
        .sidebar-link.active::before {
            content: '';
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 4px;
            height: 28px;
            background: #FF6B00;
            border-radius: 0 4px 4px 0;
        }
        
        /* Tooltip */
        .sidebar-tooltip-custom {
            position: fixed;
            background: #1e293b;
            color: white;
            padding: 8px 14px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 500;
            white-space: nowrap;
            z-index: 10000;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
            pointer-events: none;
            animation: fadeIn 0.2s ease;
            border-left: 3px solid #FF6B00;
        }
        
        /* Mobile Styles */
        @media (max-width: 768px) {
            .mobile-menu-btn-custom {
                display: flex;
            }
            
            .sidebar {
                transform: translateX(-100%);
                z-index: 1001;
                width: 280px;
            }
            
            .sidebar.open {
                transform: translateX(0);
            }
            
            .sidebar-overlay-custom {
                display: block;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s ease, visibility 0.3s ease;
            }
            
            .sidebar-overlay-custom.active {
                opacity: 1;
                visibility: visible;
            }
            
            .sidebar-collapse-btn-custom {
                display: none;
            }
            
            .main-content {
                margin-left: 0 !important;
            }
            
            body.sidebar-collapsed .sidebar {
                width: 280px;
            }
            
            /* Larger touch targets on mobile */
            .sidebar-link {
                padding: 16px 20px;
                margin: 4px 12px;
            }
            
            .sidebar-link i {
                font-size: 20px;
            }
        }
        
        /* Desktop Styles */
        @media (min-width: 769px) {
            .main-content {
                margin-left: 280px;
                transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
        }
        
        /* Animations */
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        /* Dark Mode Support */
        body.dark-mode .sidebar {
            background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
        }
        
        body.dark-mode .sidebar-link {
            color: #cbd5e1;
        }
        
        body.dark-mode .sidebar-link:hover {
            background: rgba(255, 107, 0, 0.2);
        }
        
        body.dark-mode .sidebar-tooltip-custom {
            background: #0f172a;
            border-color: #FF6B00;
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// ============================================
// CREATE MOBILE HAMBURGER MENU BUTTON
// ============================================
function createMobileMenuButton() {
    const existingBtn = document.querySelector('.mobile-menu-btn-custom');
    if (existingBtn) existingBtn.remove();
    
    mobileMenuBtn = document.createElement('button');
    mobileMenuBtn.className = 'mobile-menu-btn-custom';
    mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
    mobileMenuBtn.setAttribute('aria-label', 'Open menu');
    mobileMenuBtn.setAttribute('id', 'mobileMenuBtn');
    document.body.appendChild(mobileMenuBtn);
    
    mobileMenuBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🍔 Hamburger clicked - opening sidebar');
        openMobileSidebar();
    });
    
    console.log('✅ Mobile menu button created');
}

// ============================================
// OPEN MOBILE SIDEBAR
// ============================================
function openMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) {
        console.error('Sidebar element not found');
        return;
    }
    
    if (!sidebarOverlay || !document.body.contains(sidebarOverlay)) {
        createSidebarOverlay();
    }
    
    sidebar.classList.add('open');
    document.body.appendChild(sidebarOverlay);
    document.body.style.overflow = 'hidden';
    
    // Animate overlay
    setTimeout(() => {
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
    }, 10);
    
    if (mobileMenuBtn) {
        mobileMenuBtn.classList.add('active');
        mobileMenuBtn.innerHTML = '<i class="fas fa-times"></i>';
        mobileMenuBtn.style.transform = 'rotate(90deg)';
        setTimeout(() => {
            if (mobileMenuBtn) mobileMenuBtn.style.transform = '';
        }, 300);
    }
    
    console.log('📱 Mobile sidebar opened');
}

// ============================================
// CLOSE MOBILE SIDEBAR
// ============================================
function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    
    sidebar.classList.remove('open');
    
    if (sidebarOverlay) {
        sidebarOverlay.classList.remove('active');
        setTimeout(() => {
            if (sidebarOverlay && sidebarOverlay.parentNode) {
                sidebarOverlay.remove();
            }
        }, 300);
    }
    
    document.body.style.overflow = '';
    
    if (mobileMenuBtn) {
        mobileMenuBtn.classList.remove('active');
        mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
    }
    
    console.log('📱 Mobile sidebar closed');
}

// ============================================
// CREATE SIDEBAR OVERLAY
// ============================================
function createSidebarOverlay() {
    if (sidebarOverlay && sidebarOverlay.parentNode) {
        sidebarOverlay.remove();
    }
    
    sidebarOverlay = document.createElement('div');
    sidebarOverlay.className = 'sidebar-overlay-custom';
    sidebarOverlay.setAttribute('id', 'sidebarOverlay');
    
    sidebarOverlay.addEventListener('click', function(e) {
        e.preventDefault();
        closeMobileSidebar();
    });
}

// ============================================
// DESKTOP SIDEBAR COLLAPSE/EXPAND
// ============================================
function setupSidebarCollapse() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    
    if (document.querySelector('.sidebar-collapse-btn-custom')) return;
    
    sidebarCollapseBtn = document.createElement('button');
    sidebarCollapseBtn.className = 'sidebar-collapse-btn-custom';
    sidebarCollapseBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    sidebarCollapseBtn.setAttribute('title', 'Collapse sidebar (Alt+S)');
    sidebar.appendChild(sidebarCollapseBtn);
    
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState === 'true' && window.innerWidth > 768) {
        document.body.classList.add('sidebar-collapsed');
        isSidebarCollapsed = true;
        const icon = sidebarCollapseBtn.querySelector('i');
        if (icon) {
            icon.classList.remove('fa-chevron-left');
            icon.classList.add('fa-chevron-right');
        }
        sidebarCollapseBtn.setAttribute('title', 'Expand sidebar (Alt+S)');
    }
    
    sidebarCollapseBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleSidebarCollapse();
    });
}

// ============================================
// TOGGLE SIDEBAR COLLAPSE
// ============================================
function toggleSidebarCollapse() {
    if (window.innerWidth <= 768) return;
    
    document.body.classList.toggle('sidebar-collapsed');
    isSidebarCollapsed = document.body.classList.contains('sidebar-collapsed');
    
    if (sidebarCollapseBtn) {
        const icon = sidebarCollapseBtn.querySelector('i');
        if (isSidebarCollapsed) {
            if (icon) {
                icon.classList.remove('fa-chevron-left');
                icon.classList.add('fa-chevron-right');
            }
            sidebarCollapseBtn.setAttribute('title', 'Expand sidebar (Alt+S)');
            sidebarCollapseBtn.style.transform = 'rotate(180deg)';
            setTimeout(() => {
                if (sidebarCollapseBtn) sidebarCollapseBtn.style.transform = '';
            }, 300);
        } else {
            if (icon) {
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-left');
            }
            sidebarCollapseBtn.setAttribute('title', 'Collapse sidebar (Alt+S)');
        }
    }
    
    localStorage.setItem('sidebarCollapsed', isSidebarCollapsed);
    window.dispatchEvent(new CustomEvent('sidebarToggle', { detail: { collapsed: isSidebarCollapsed } }));
}

// ============================================
// MOBILE SIDEBAR SETUP
// ============================================
function setupMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    
    const sidebarLinks = sidebar.querySelectorAll('.sidebar-link');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                setTimeout(() => closeMobileSidebar(), 150);
            }
        });
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const sidebarEl = document.getElementById('sidebar');
            if (sidebarEl && sidebarEl.classList.contains('open')) {
                closeMobileSidebar();
            }
        }
    });
}

// ============================================
// ACTIVE LINK HIGHLIGHTING
// ============================================
function setupActiveLinkHighlighting() {
    const currentPath = window.location.pathname;
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    
    sidebarLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href === '#' || href === 'javascript:void(0)') return;
        
        const cleanHref = href.replace(/\/$/, '');
        const cleanPath = currentPath.replace(/\/$/, '');
        
        let isActive = false;
        
        if (cleanPath === cleanHref) {
            isActive = true;
        } else if (cleanHref !== '/' && cleanPath.startsWith(cleanHref)) {
            isActive = true;
        } else if (cleanHref === '/dashboard/index.html' && cleanPath === '/dashboard/') {
            isActive = true;
        } else if (cleanPath === '/dashboard' && cleanHref === '/dashboard/index.html') {
            isActive = true;
        }
        
        if (isActive) {
            link.classList.add('active');
            // Scroll active link into view
            setTimeout(() => {
                link.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        } else {
            link.classList.remove('active');
        }
    });
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        if (e.altKey && e.key === 's') {
            e.preventDefault();
            if (window.innerWidth > 768) {
                toggleSidebarCollapse();
            }
        }
        
        if (e.altKey && e.key === 'm') {
            e.preventDefault();
            if (window.innerWidth <= 768) {
                const sidebar = document.getElementById('sidebar');
                if (sidebar && sidebar.classList.contains('open')) {
                    closeMobileSidebar();
                } else {
                    openMobileSidebar();
                }
            }
        }
    });
}

// ============================================
// RESIZE HANDLER
// ============================================
function setupResizeHandler() {
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            const sidebar = document.getElementById('sidebar');
            if (!sidebar) return;
            
            if (window.innerWidth > 768) {
                if (sidebar.classList.contains('open')) {
                    closeMobileSidebar();
                }
                document.body.style.overflow = '';
            } else {
                if (document.body.classList.contains('sidebar-collapsed')) {
                    document.body.classList.remove('sidebar-collapsed');
                    if (sidebarCollapseBtn) {
                        const icon = sidebarCollapseBtn.querySelector('i');
                        if (icon) {
                            icon.classList.remove('fa-chevron-right');
                            icon.classList.add('fa-chevron-left');
                        }
                    }
                }
            }
        }, 250);
    });
}

// ============================================
// LOAD SIDEBAR STATE
// ============================================
function loadSidebarState() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
        document.body.classList.add('dark-mode');
        const darkToggle = document.getElementById('sidebarDarkModeToggle');
        if (darkToggle) darkToggle.checked = true;
    }
}

// ============================================
// LOAD USER DATA INTO SIDEBAR
// ============================================
function setupUserData() {
    const checkFirebase = setInterval(function() {
        if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
            clearInterval(checkFirebase);
            loadUserData();
        }
    }, 500);
}

async function loadUserData() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    try {
        const db = firebase.firestore();
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        const displayName = userData?.displayName || user.email?.split('@')[0] || 'User';
        const balance = userData?.balance || 0;
        
        const userNameEl = document.getElementById('sidebarUserName');
        const userBalanceEl = document.getElementById('sidebarUserBalance');
        const userAvatarEl = document.getElementById('sidebarUserAvatar');
        
        if (userNameEl) userNameEl.textContent = displayName;
        if (userBalanceEl) userBalanceEl.innerHTML = '৳' + balance.toLocaleString('en-BD');
        if (userAvatarEl) userAvatarEl.innerHTML = displayName.charAt(0).toUpperCase();
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// ============================================
// SIDEBAR TOOLTIPS (For collapsed mode)
// ============================================
function setupSidebarTooltips() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    
    const links = sidebar.querySelectorAll('.sidebar-link');
    
    links.forEach(link => {
        link.addEventListener('mouseenter', function(e) {
            if (window.innerWidth <= 768) return;
            if (!document.body.classList.contains('sidebar-collapsed')) return;
            
            const span = this.querySelector('span');
            if (span && span.textContent && span.textContent.trim()) {
                if (currentTooltip) currentTooltip.remove();
                
                currentTooltip = document.createElement('div');
                currentTooltip.className = 'sidebar-tooltip-custom';
                currentTooltip.textContent = span.textContent.trim();
                
                const rect = this.getBoundingClientRect();
                currentTooltip.style.left = (rect.right + 12) + 'px';
                currentTooltip.style.top = (rect.top + (rect.height / 2) - 12) + 'px';
                
                document.body.appendChild(currentTooltip);
            }
        });
        
        link.addEventListener('mouseleave', function() {
            if (currentTooltip) {
                currentTooltip.remove();
                currentTooltip = null;
            }
        });
    });
}

// ============================================
// DARK MODE TOGGLE SETUP
// ============================================
function setupDarkModeToggle() {
    const darkToggle = document.getElementById('sidebarDarkModeToggle');
    if (!darkToggle) return;
    
    darkToggle.addEventListener('change', function() {
        if (this.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('darkMode', 'true');
            if (window.showToast) showToast('Dark mode enabled', 'info', 2000);
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('darkMode', 'false');
            if (window.showToast) showToast('Light mode enabled', 'info', 2000);
        }
    });
}

// ============================================
// LOGOUT SETUP
// ============================================
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    
    logoutBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        if (typeof firebase !== 'undefined' && firebase.auth) {
            try {
                if (window.showToast) showToast('Logging out...', 'info', 1500);
                await firebase.auth().signOut();
                window.location.href = '/login.html';
            } catch (error) {
                console.error('Logout error:', error);
                if (window.showToast) showToast('Logout failed', 'error');
            }
        }
    });
}

// ============================================
// WATCH FOR SIDEBAR CLASS CHANGES
// ============================================
function watchSidebarState() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'class') {
                if (sidebarOverlay) {
                    if (sidebar.classList.contains('open')) {
                        sidebarOverlay.classList.add('active');
                    } else {
                        sidebarOverlay.classList.remove('active');
                    }
                }
            }
        });
    });
    
    observer.observe(sidebar, { attributes: true });
}

// ============================================
// INITIALIZE EVERYTHING
// ============================================
function init() {
    injectDesignSystemStyles();
    initSidebar();
    setupDarkModeToggle();
    setupLogout();
    setupSidebarTooltips();
    watchSidebarState();
    console.log('✅ Sidebar v4.0 fully initialized - Design System compliant');
}

// Run when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}