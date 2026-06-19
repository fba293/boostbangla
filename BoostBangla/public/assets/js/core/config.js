// ============================================
// config.js - BoostBangla Configuration - Design System v3.0
// Central configuration for Firebase, APIs, and app settings
// Version: 3.0 - DESIGN SYSTEM COMPLIANT
// ============================================

// ============================================
// FIREBASE CONFIGURATION
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyDypaa-pHjEc4rrXHrtj8i_8vgo_5XMY9g",
    authDomain: "boostbangla-629a1.firebaseapp.com",
    projectId: "boostbangla-629a1",
    storageBucket: "boostbangla-629a1.firebasestorage.app",
    messagingSenderId: "384867462668",
    appId: "1:384867462668:web:bbc79c6a7ead66b439c829"
};

// ============================================
// API CONFIGURATION
// ============================================
const API_PROXY = '/public/php/api-proxy.php';
const EXCHANGE_RATE_API = '/public/php/exchange-rate.php';
const MARKUP_PERCENTAGE = 30;

// ============================================
// APP CONFIGURATION - Design System v3.0
// ============================================
const APP_CONFIG = {
    // App Info
    appName: 'BoostBangla',
    appVersion: '3.0.0',
    appEnvironment: 'production', // 'development', 'staging', 'production'
    
    // Currency Settings
    currency: {
        code: 'BDT',
        symbol: '৳',
        usdRate: 123, // Default, will be updated from API
        decimalPlaces: 2,
        thousandsSeparator: ',',
        decimalSeparator: '.'
    },
    
    // API Endpoints
    endpoints: {
        apiProxy: API_PROXY,
        exchangeRate: EXCHANGE_RATE_API,
        services: `${API_PROXY}?action=services`,
        orders: `${API_PROXY}?action=orders`,
        orderStatus: `${API_PROXY}?action=status`,
        addOrder: `${API_PROXY}?action=add`,
        userProfile: `${API_PROXY}?action=profile`,
        balance: `${API_PROXY}?action=balance`
    },
    
    // Feature Flags
    features: {
        darkMode: true,
        offlineSupport: true,
        notifications: true,
        keyboardShortcuts: true,
        analytics: true,
        sentry: false, // Error tracking
        pwaEnabled: true
    },
    
    // UI Configuration - Design System Compliant
    ui: {
        // Sidebar
        sidebarWidth: 280,
        sidebarCollapsedWidth: 80,
        sidebarBreakpoint: 768,
        
        // Header
        headerHeight: 70,
        headerScrolledHeight: 60,
        headerSticky: true,
        
        // Animations
        animationDuration: 300,
        animationTiming: 'cubic-bezier(0.4, 0, 0.2, 1)',
        
        // Toast
        toastDuration: 3000,
        toastPosition: 'bottom-right',
        
        // Pagination
        itemsPerPage: 20,
        itemsPerPageOptions: [10, 20, 50, 100],
        
        // Breakpoints (px)
        breakpoints: {
            xs: 475,
            sm: 640,
            md: 768,
            lg: 1024,
            xl: 1280,
            '2xl': 1536,
            '3xl': 1920
        }
    },
    
    // Timeouts & Intervals (ms)
    timings: {
        balancePolling: 30000,      // 30 seconds
        notificationsPolling: 60000, // 1 minute
        sessionTimeout: 3600000,    // 1 hour
        cacheTTL: 3600000,          // 1 hour
        syncRetryDelay: 5000,       // 5 seconds
        maxSyncRetries: 5
    },
    
    // Cache Keys
    cacheKeys: {
        user: 'boostbangla_cachedUser',
        services: 'boostbangla_cachedServices',
        exchangeRate: 'boostbangla_exchangeRate',
        notifications: 'boostbangla_cachedNotifications',
        syncQueue: 'boostbangla_syncQueue'
    },
    
    // Social Links
    social: {
        facebook: 'https://facebook.com/boostbangla',
        instagram: 'https://instagram.com/boostbangla',
        telegram: 'https://t.me/boostbangla',
        whatsapp: 'https://wa.me/8801XXXXXXXXX',
        support: 'mailto:support@boostbangla.com'
    },
    
    // Support Contacts
    support: {
        email: 'support@boostbangla.com',
        phone: '+880 1XXX XXXXXX',
        responseTime: '24 hours',
        supportHours: '10:00 AM - 8:00 PM (BST)'
    },
    
    // Status Badge Mapping - Design System Colors
    statusColors: {
        pending: { bg: '#fef3c7', text: '#d97706', icon: 'fa-clock' },
        processing: { bg: '#dbeafe', text: '#2563eb', icon: 'fa-spinner' },
        completed: { bg: '#d1fae5', text: '#059669', icon: 'fa-check-circle' },
        cancelled: { bg: '#fee2e2', text: '#dc2626', icon: 'fa-times-circle' },
        refunded: { bg: '#e9d5ff', text: '#7e22ce', icon: 'fa-undo' },
        active: { bg: '#d1fae5', text: '#059669', icon: 'fa-circle' },
        inactive: { bg: '#f3f4f6', text: '#6b7280', icon: 'fa-circle' },
        approved: { bg: '#d1fae5', text: '#059669', icon: 'fa-check' },
        rejected: { bg: '#fee2e2', text: '#dc2626', icon: 'fa-ban' }
    },
    
    // Animation Classes
    animations: {
        fadeIn: 'animate-fade-in',
        fadeInUp: 'animate-fade-in-up',
        slideUp: 'animate-slide-up',
        slideDown: 'animate-slide-down',
        slideInRight: 'animate-slide-in-right',
        float: 'animate-float',
        pulse: 'animate-pulse-slow'
    },
    
    // Regex Patterns
    patterns: {
        email: /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/,
        phone: /^(?:\+?88)?01[3-9]\d{8}$/,
        username: /^[a-zA-Z0-9_]{3,30}$/,
        password: /^.{6,}$/,
        orderId: /^ORD\d{8}[A-Z0-9]{4}$/,
        transactionId: /^TXN\d{12}$/
    }
};

// ============================================
// ENVIRONMENT-SPECIFIC OVERRIDES
// ============================================
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    APP_CONFIG.appEnvironment = 'development';
    APP_CONFIG.features.sentry = false;
    APP_CONFIG.features.analytics = false;
    console.log('🔧 Running in DEVELOPMENT mode');
}

if (window.location.hostname.includes('staging') || window.location.hostname.includes('test')) {
    APP_CONFIG.appEnvironment = 'staging';
    APP_CONFIG.features.sentry = true;
    console.log('🧪 Running in STAGING mode');
}

// ============================================
// DYNAMIC CONFIGURATION LOADER
// ============================================
async function loadDynamicConfig() {
    try {
        // Load exchange rate
        const response = await fetch(EXCHANGE_RATE_API);
        const data = await response.json();
        if (data.rate) {
            APP_CONFIG.currency.usdRate = data.rate;
            localStorage.setItem('boostbangla_exchangeRate', JSON.stringify({
                rate: data.rate,
                timestamp: Date.now()
            }));
        }
        
        // Load maintenance status
        const maintenanceResponse = await fetch(`${API_PROXY}?action=maintenance`);
        const maintenanceData = await maintenanceResponse.json();
        if (maintenanceData.maintenance) {
            APP_CONFIG.maintenance = maintenanceData;
            if (maintenanceData.active && !window.location.pathname.includes('/maintenance')) {
                window.location.href = '/maintenance.html';
            }
        }
        
        console.log('✅ Dynamic config loaded');
        
    } catch (error) {
        // Use cached exchange rate
        const cached = localStorage.getItem('boostbangla_exchangeRate');
        if (cached) {
            try {
                const { rate } = JSON.parse(cached);
                APP_CONFIG.currency.usdRate = rate;
            } catch (e) {}
        }
        console.log('⚠️ Using cached config (offline or API error)');
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get current environment
 * @returns {string}
 */
function getEnvironment() {
    return APP_CONFIG.appEnvironment;
}

/**
 * Check if feature is enabled
 * @param {string} feature - Feature name
 * @returns {boolean}
 */
function isFeatureEnabled(feature) {
    return APP_CONFIG.features[feature] === true;
}

/**
 * Get current USD to BDT exchange rate
 * @returns {number}
 */
function getExchangeRate() {
    return APP_CONFIG.currency.usdRate;
}

/**
 * Convert BDT to USD
 * @param {number} bdt - Amount in BDT
 * @returns {number}
 */
function bdtToUsd(bdt) {
    return bdt / APP_CONFIG.currency.usdRate;
}

/**
 * Convert USD to BDT
 * @param {number} usd - Amount in USD
 * @returns {number}
 */
function usdToBdt(usd) {
    return usd * APP_CONFIG.currency.usdRate;
}

/**
 * Get status color configuration
 * @param {string} status - Status string
 * @returns {Object}
 */
function getStatusConfig(status) {
    return APP_CONFIG.statusColors[status?.toLowerCase()] || APP_CONFIG.statusColors.pending;
}

/**
 * Get cache key with namespace
 * @param {string} key - Cache key name
 * @returns {string}
 */
function getCacheKey(key) {
    return APP_CONFIG.cacheKeys[key] || `boostbangla_${key}`;
}

/**
 * Check if app is in maintenance mode
 * @returns {boolean}
 */
function isMaintenanceMode() {
    return APP_CONFIG.maintenance?.active === true;
}

/**
 * Get breakpoint value
 * @param {string} breakpoint - Breakpoint name
 * @returns {number}
 */
function getBreakpoint(breakpoint) {
    return APP_CONFIG.ui.breakpoints[breakpoint] || 768;
}

/**
 * Get current breakpoint based on window width
 * @returns {string}
 */
function getCurrentBreakpoint() {
    const width = window.innerWidth;
    const breakpoints = APP_CONFIG.ui.breakpoints;
    
    if (width < breakpoints.xs) return 'xs';
    if (width < breakpoints.sm) return 'sm';
    if (width < breakpoints.md) return 'md';
    if (width < breakpoints.lg) return 'lg';
    if (width < breakpoints.xl) return 'xl';
    if (width < breakpoints['2xl']) return '2xl';
    return '3xl';
}

// ============================================
// VALIDATE CONFIGURATION
// ============================================
function validateConfig() {
    const required = ['apiKey', 'authDomain', 'projectId'];
    const missing = required.filter(key => !firebaseConfig[key]);
    
    if (missing.length > 0) {
        console.error('❌ Missing Firebase config:', missing);
        return false;
    }
    
    console.log('✅ Configuration validated');
    return true;
}

// ============================================
// INITIALIZE CONFIG
// ============================================
async function initConfig() {
    validateConfig();
    await loadDynamicConfig();
    
    // Dispatch config loaded event
    window.dispatchEvent(new CustomEvent('config:loaded', {
        detail: { config: APP_CONFIG }
    }));
    
    console.log(`🎨 BoostBangla ${APP_CONFIG.appVersion} (${APP_CONFIG.appEnvironment}) - Design System v3.0`);
}

// ============================================
// EXPORT CONFIGURATION
// ============================================
window.firebaseConfig = firebaseConfig;
window.API_PROXY = API_PROXY;
window.EXCHANGE_RATE_API = EXCHANGE_RATE_API;
window.MARKUP_PERCENTAGE = MARKUP_PERCENTAGE;
window.APP_CONFIG = APP_CONFIG;

// Export helper functions
window.getEnvironment = getEnvironment;
window.isFeatureEnabled = isFeatureEnabled;
window.getExchangeRate = getExchangeRate;
window.bdtToUsd = bdtToUsd;
window.usdToBdt = usdToBdt;
window.getStatusConfig = getStatusConfig;
window.getCacheKey = getCacheKey;
window.isMaintenanceMode = isMaintenanceMode;
window.getBreakpoint = getBreakpoint;
window.getCurrentBreakpoint = getCurrentBreakpoint;

// ============================================
// INITIALIZE
// ============================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConfig);
} else {
    initConfig();
}

console.log('✅ Config module v3.0 loaded - Design System compliant');