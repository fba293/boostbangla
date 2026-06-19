// ============================================
// utils.js - Core Utility Functions - BoostBangla Design System v3.0
// Single source of truth for all utilities
// Version: 3.0 - DESIGN SYSTEM COMPLIANT
// ============================================

// ============================================
// CURRENCY FORMATTING - Design System Compliant
// ============================================

/**
 * Format number as BDT currency
 * @param {number} amount - Amount in BDT
 * @returns {string} Formatted currency string (e.g., "৳1,234")
 */
function formatCurrency(amount) {
    if (amount === undefined || amount === null) return '৳0';
    const num = Number(amount);
    if (isNaN(num)) return '৳0';
    return '৳' + num.toLocaleString('en-BD', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

/**
 * Format number as USD currency
 * @param {number} amount - Amount in USD
 * @returns {string} Formatted currency string (e.g., "$1,234.56")
 */
function formatUSD(amount) {
    if (amount === undefined || amount === null) return '$0.00';
    const num = Number(amount);
    if (isNaN(num)) return '$0.00';
    return '$' + num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Format compact currency (e.g., "৳1.2K", "৳1.2M")
 * @param {number} amount - Amount to format
 * @returns {string} Compact formatted currency
 */
function formatCurrencyCompact(amount) {
    if (amount === undefined || amount === null) return '৳0';
    const num = Number(amount);
    if (isNaN(num)) return '৳0';
    
    if (num >= 10000000) {
        return '৳' + (num / 10000000).toFixed(1) + 'Cr';
    }
    if (num >= 100000) {
        return '৳' + (num / 100000).toFixed(1) + 'L';
    }
    if (num >= 1000) {
        return '৳' + (num / 1000).toFixed(1) + 'K';
    }
    return '৳' + num.toLocaleString();
}

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number (e.g., "1,234,567")
 */
function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    const n = Number(num);
    if (isNaN(n)) return '0';
    return n.toLocaleString('en-BD');
}

/**
 * Format percentage
 * @param {number} value - Percentage value
 * @param {boolean} showSign - Whether to show +/-
 * @returns {string} Formatted percentage
 */
function formatPercentage(value, showSign = true) {
    if (value === undefined || value === null) return '0%';
    const num = Number(value);
    if (isNaN(num)) return '0%';
    const sign = showSign && num > 0 ? '+' : '';
    return `${sign}${num.toFixed(1)}%`;
}

// ============================================
// DATE FORMATTING - Design System Compliant
// ============================================

/**
 * Format date to Bangladesh format
 * @param {Date|string|number|Object} date - Date to format (supports Firestore timestamp)
 * @returns {string} Formatted date (e.g., "15 May 2025")
 */
function formatDate(date) {
    if (!date) return 'N/A';
    
    let d;
    if (typeof date === 'object' && date.toDate) {
        d = date.toDate();
    } else {
        d = new Date(date);
    }
    
    if (isNaN(d.getTime())) return 'N/A';
    
    return d.toLocaleDateString('en-BD', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

/**
 * Format date with time
 * @param {Date|string|number|Object} date - Date to format
 * @returns {string} Formatted date with time (e.g., "15 May 2025, 2:30 PM")
 */
function formatDateTime(date) {
    if (!date) return 'N/A';
    
    let d;
    if (typeof date === 'object' && date.toDate) {
        d = date.toDate();
    } else {
        d = new Date(date);
    }
    
    if (isNaN(d.getTime())) return 'N/A';
    
    return d.toLocaleDateString('en-BD', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format time only
 * @param {Date|string|number|Object} date - Date to format
 * @returns {string} Formatted time (e.g., "2:30 PM")
 */
function formatTime(date) {
    if (!date) return 'N/A';
    
    let d;
    if (typeof date === 'object' && date.toDate) {
        d = date.toDate();
    } else {
        d = new Date(date);
    }
    
    if (isNaN(d.getTime())) return 'N/A';
    
    return d.toLocaleTimeString('en-BD', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Get relative time (e.g., "2 hours ago")
 * @param {Date|string|number|Object} date - Date to compare
 * @returns {string} Relative time string
 */
function getRelativeTime(date) {
    if (!date) return 'N/A';
    
    let d;
    if (typeof date === 'object' && date.toDate) {
        d = date.toDate();
    } else {
        d = new Date(date);
    }
    
    if (isNaN(d.getTime())) return 'N/A';
    
    const now = new Date();
    const diffMs = now - d;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);
    
    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec} seconds ago`;
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7) return `${diffDay} days ago`;
    if (diffWeek === 1) return '1 week ago';
    if (diffWeek < 4) return `${diffWeek} weeks ago`;
    if (diffMonth === 1) return '1 month ago';
    if (diffMonth < 12) return `${diffMonth} months ago`;
    if (diffYear === 1) return '1 year ago';
    return `${diffYear} years ago`;
}

/**
 * Check if date is today
 * @param {Date|string|number|Object} date - Date to check
 * @returns {boolean}
 */
function isToday(date) {
    if (!date) return false;
    
    let d;
    if (typeof date === 'object' && date.toDate) {
        d = date.toDate();
    } else {
        d = new Date(date);
    }
    
    if (isNaN(d.getTime())) return false;
    
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
}

/**
 * Get date range for filtering (e.g., 'last7days', 'thisMonth')
 * @param {string} range - Range type
 * @returns {Object} { start, end } Date objects
 */
function getDateRange(range) {
    const now = new Date();
    const start = new Date();
    const end = new Date();
    
    switch (range) {
        case 'today':
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'yesterday':
            start.setDate(now.getDate() - 1);
            start.setHours(0, 0, 0, 0);
            end.setDate(now.getDate() - 1);
            end.setHours(23, 59, 59, 999);
            break;
        case 'last7days':
            start.setDate(now.getDate() - 7);
            start.setHours(0, 0, 0, 0);
            break;
        case 'last30days':
            start.setDate(now.getDate() - 30);
            start.setHours(0, 0, 0, 0);
            break;
        case 'thisMonth':
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            break;
        case 'lastMonth':
            start.setMonth(now.getMonth() - 1);
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setDate(0);
            end.setHours(23, 59, 59, 999);
            break;
        default:
            return null;
    }
    
    return { start, end };
}

// ============================================
// CLIPBOARD & COPY FUNCTIONS
// ============================================

/**
 * Copy text to clipboard with toast notification
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>}
 */
async function copyToClipboard(text) {
    if (!text) {
        if (window.showToast) window.showToast('Nothing to copy', 'warning');
        return false;
    }
    
    try {
        await navigator.clipboard.writeText(text);
        if (window.showToast) {
            window.showToast('Copied to clipboard!', 'success', 1500);
        }
        return true;
    } catch (error) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        if (window.showToast) window.showToast('Copied to clipboard!', 'success', 1500);
        return true;
    }
}

/**
 * Copy API key with visual feedback
 * @param {string} apiKey - API key to copy
 * @param {HTMLElement} buttonElement - Optional button element to show feedback
 */
async function copyApiKey(apiKey, buttonElement = null) {
    const success = await copyToClipboard(apiKey);
    
    if (buttonElement && success) {
        const originalText = buttonElement.innerHTML;
        buttonElement.innerHTML = '<i class="fas fa-check"></i> Copied!';
        buttonElement.classList.add('btn-success');
        setTimeout(() => {
            buttonElement.innerHTML = originalText;
            buttonElement.classList.remove('btn-success');
        }, 2000);
    }
}

// ============================================
// FORM VALIDATION - Design System Compliant
// ============================================

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
function isValidEmail(email) {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate Bangladesh phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean}
 */
function isValidBangladeshPhone(phone) {
    if (!phone) return false;
    // Supports: 01XXXXXXXXX, 8801XXXXXXXXX, +8801XXXXXXXXX
    const phoneRegex = /^(?:\+?88)?01[3-9]\d{8}$/;
    return phoneRegex.test(phone);
}

/**
 * Format Bangladesh phone number to standard format
 * @param {string} phone - Raw phone number
 * @returns {string} Formatted phone number
 */
function formatBangladeshPhone(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('01')) {
        return cleaned;
    }
    if (cleaned.length === 13 && cleaned.startsWith('8801')) {
        return '0' + cleaned.slice(3);
    }
    return phone;
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {{isValid: boolean, strength: string, score: number, feedback: string[]}}
 */
function validatePasswordStrength(password) {
    if (!password) {
        return { isValid: false, strength: 'Very Weak', score: 0, feedback: ['Password is required'] };
    }
    
    let score = 0;
    const feedback = [];
    
    // Length check
    if (password.length >= 8) {
        score++;
    } else {
        feedback.push('Use at least 8 characters');
    }
    
    if (password.length >= 12) score++;
    
    // Character variety
    if (/[a-z]/.test(password)) score++;
    else feedback.push('Add lowercase letters');
    
    if (/[A-Z]/.test(password)) score++;
    else feedback.push('Add uppercase letters');
    
    if (/[0-9]/.test(password)) score++;
    else feedback.push('Add numbers');
    
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    else feedback.push('Add special characters');
    
    const strengths = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
    const strength = strengths[Math.min(score, 5)] || 'Very Weak';
    
    return { 
        isValid: score >= 3, 
        strength: strength, 
        score: score,
        feedback: feedback
    };
}

/**
 * Get password strength color for UI
 * @param {number} score - Password strength score (0-5)
 * @returns {string} Color hex code
 */
function getPasswordStrengthColor(score) {
    const colors = {
        0: '#ef4444', // Very Weak - Red
        1: '#ef4444', // Weak - Red
        2: '#f59e0b', // Fair - Orange
        3: '#3b82f6', // Good - Blue
        4: '#10b981', // Strong - Green
        5: '#10b981'  // Excellent - Green
    };
    return colors[Math.min(score, 5)] || '#ef4444';
}

/**
 * Validate required fields
 * @param {Object} data - Object with field values
 * @param {string[]} requiredFields - Array of required field names
 * @returns {{isValid: boolean, missing: string[]}}
 */
function validateRequired(data, requiredFields) {
    const missing = [];
    for (const field of requiredFields) {
        const value = data[field];
        if (value === undefined || value === null || value === '') {
            missing.push(field);
        }
    }
    return { isValid: missing.length === 0, missing: missing };
}

// ============================================
// LOADING STATES - Design System Compliant
// ============================================

/**
 * Show loading spinner on a button
 * @param {HTMLElement} button - Button element
 * @param {string} text - Loading text
 * @returns {string} Original button text
 */
function showButtonLoading(button, text = 'Loading...') {
    if (!button) return '';
    const originalText = button.innerHTML;
    button.disabled = true;
    button.dataset.originalText = originalText;
    button.innerHTML = `<span class="btn-spinner" style="display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 0.6s linear infinite;margin-right:8px;"></span> ${text}`;
    return originalText;
}

/**
 * Restore button to original state
 * @param {HTMLElement} button - Button element
 */
function hideButtonLoading(button) {
    if (!button) return;
    const originalText = button.dataset.originalText;
    button.disabled = false;
    if (originalText) {
        button.innerHTML = originalText;
        delete button.dataset.originalText;
    }
}

/**
 * Show skeleton loader
 * @param {HTMLElement} container - Container element
 * @param {string} type - Skeleton type ('card', 'table', 'text', 'avatar')
 * @param {number} count - Number of skeletons to show
 */
function showSkeletonLoader(container, type = 'card', count = 3) {
    if (!container) return;
    
    const skeletons = {
        card: `
            <div class="skeleton-card" style="background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 20px; padding: 20px;">
                <div style="height: 120px; background: rgba(0,0,0,0.05); border-radius: 12px; margin-bottom: 12px;"></div>
                <div style="height: 16px; background: rgba(0,0,0,0.05); border-radius: 8px; width: 70%; margin-bottom: 8px;"></div>
                <div style="height: 12px; background: rgba(0,0,0,0.05); border-radius: 8px; width: 50%;"></div>
            </div>
        `,
        text: `
            <div class="skeleton-text" style="height: 14px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; margin-bottom: 8px;"></div>
        `,
        table: `
            <div class="skeleton-row" style="display: flex; gap: 16px; padding: 16px; border-bottom: 1px solid #e5e7eb;">
                <div style="height: 20px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; flex: 2;"></div>
                <div style="height: 20px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; flex: 1;"></div>
                <div style="height: 20px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; flex: 1;"></div>
            </div>
        `
    };
    
    const template = skeletons[type] || skeletons.card;
    container.innerHTML = '';
    
    for (let i = 0; i < count; i++) {
        container.insertAdjacentHTML('beforeend', template);
    }
}

/**
 * Hide skeleton loader
 * @param {HTMLElement} container - Container element
 */
function hideSkeletonLoader(container) {
    if (!container) return;
    container.innerHTML = '';
}

// ============================================
// URL HELPERS
// ============================================

/**
 * Get URL parameter by name
 * @param {string} name - Parameter name
 * @returns {string|null}
 */
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

/**
 * Get all URL parameters as object
 * @returns {Object}
 */
function getAllUrlParameters() {
    const params = {};
    const urlParams = new URLSearchParams(window.location.search);
    for (const [key, value] of urlParams) {
        params[key] = value;
    }
    return params;
}

/**
 * Redirect to URL with optional delay
 * @param {string} url - Destination URL
 * @param {number} delay - Delay in milliseconds
 */
function redirectTo(url, delay = 0) {
    if (delay > 0) {
        setTimeout(() => window.location.href = url, delay);
    } else {
        window.location.href = url;
    }
}

/**
 * Reload current page
 * @param {boolean} hard - Hard reload (clear cache)
 */
function reloadPage(hard = false) {
    if (hard) {
        window.location.reload(true);
    } else {
        window.location.reload();
    }
}

// ============================================
// STORAGE HELPERS
// ============================================

/**
 * Save data to localStorage with expiry
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 * @param {number} expiryMs - Expiry in milliseconds
 */
function setLocalStorageWithExpiry(key, value, expiryMs = 3600000) {
    const item = {
        value: value,
        timestamp: Date.now(),
        expiry: expiryMs
    };
    localStorage.setItem(`boostbangla_${key}`, JSON.stringify(item));
}

/**
 * Get data from localStorage with expiry check
 * @param {string} key - Storage key
 * @returns {any|null}
 */
function getLocalStorageWithExpiry(key) {
    const itemStr = localStorage.getItem(`boostbangla_${key}`);
    if (!itemStr) return null;
    
    try {
        const item = JSON.parse(itemStr);
        if (item.expiry && Date.now() - item.timestamp > item.expiry) {
            localStorage.removeItem(`boostbangla_${key}`);
            return null;
        }
        return item.value;
    } catch (e) {
        return null;
    }
}

/**
 * Clear all BoostBangla storage
 */
function clearAppStorage() {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
        if (key.startsWith('boostbangla_')) {
            localStorage.removeItem(key);
        }
    }
}

// ============================================
// STRING HELPERS
// ============================================

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @returns {string}
 */
function truncateText(text, length = 50) {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
}

/**
 * Capitalize first letter of each word
 * @param {string} text - Text to capitalize
 * @returns {string}
 */
function capitalizeWords(text) {
    if (!text) return '';
    return text.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Generate random string
 * @param {number} length - String length
 * @returns {string}
 */
function randomString(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Generate order ID
 * @returns {string}
 */
function generateOrderId() {
    const prefix = 'ORD';
    const timestamp = Date.now().toString().slice(-8);
    const random = randomString(4).toUpperCase();
    return `${prefix}${timestamp}${random}`;
}

// ============================================
// COLOR HELPERS
// ============================================

/**
 * Get status badge color based on status
 * @param {string} status - Status string
 * @returns {Object} { bg, text, icon }
 */
function getStatusColor(status) {
    const statuses = {
        'pending': { bg: '#fef3c7', text: '#d97706', icon: 'fa-clock' },
        'processing': { bg: '#dbeafe', text: '#2563eb', icon: 'fa-spinner' },
        'completed': { bg: '#d1fae5', text: '#059669', icon: 'fa-check-circle' },
        'cancelled': { bg: '#fee2e2', text: '#dc2626', icon: 'fa-times-circle' },
        'refunded': { bg: '#e9d5ff', text: '#7e22ce', icon: 'fa-undo' },
        'active': { bg: '#d1fae5', text: '#059669', icon: 'fa-circle' },
        'inactive': { bg: '#f3f4f6', text: '#6b7280', icon: 'fa-circle' },
        'approved': { bg: '#d1fae5', text: '#059669', icon: 'fa-check' },
        'rejected': { bg: '#fee2e2', text: '#dc2626', icon: 'fa-ban' }
    };
    
    const normalized = status?.toLowerCase() || 'pending';
    return statuses[normalized] || statuses.pending;
}

// ============================================
// DEVICE DETECTION
// ============================================

/**
 * Check if device is mobile
 * @returns {boolean}
 */
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Check if device is touch-enabled
 * @returns {boolean}
 */
function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Get current breakpoint
 * @returns {string} 'xs', 'sm', 'md', 'lg', 'xl', '2xl'
 */
function getCurrentBreakpoint() {
    const width = window.innerWidth;
    if (width < 475) return 'xs';
    if (width < 640) return 'sm';
    if (width < 768) return 'md';
    if (width < 1024) return 'lg';
    if (width < 1280) return 'xl';
    return '2xl';
}

// ============================================
// EXPORT FUNCTIONS (Global)
// ============================================
window.formatCurrency = formatCurrency;
window.formatUSD = formatUSD;
window.formatCurrencyCompact = formatCurrencyCompact;
window.formatNumber = formatNumber;
window.formatPercentage = formatPercentage;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.formatTime = formatTime;
window.getRelativeTime = getRelativeTime;
window.isToday = isToday;
window.getDateRange = getDateRange;
window.copyToClipboard = copyToClipboard;
window.copyApiKey = copyApiKey;
window.isValidEmail = isValidEmail;
window.isValidBangladeshPhone = isValidBangladeshPhone;
window.formatBangladeshPhone = formatBangladeshPhone;
window.validatePasswordStrength = validatePasswordStrength;
window.getPasswordStrengthColor = getPasswordStrengthColor;
window.validateRequired = validateRequired;
window.showButtonLoading = showButtonLoading;
window.hideButtonLoading = hideButtonLoading;
window.showSkeletonLoader = showSkeletonLoader;
window.hideSkeletonLoader = hideSkeletonLoader;
window.getUrlParameter = getUrlParameter;
window.getAllUrlParameters = getAllUrlParameters;
window.redirectTo = redirectTo;
window.reloadPage = reloadPage;
window.setLocalStorageWithExpiry = setLocalStorageWithExpiry;
window.getLocalStorageWithExpiry = getLocalStorageWithExpiry;
window.clearAppStorage = clearAppStorage;
window.truncateText = truncateText;
window.capitalizeWords = capitalizeWords;
window.randomString = randomString;
window.generateOrderId = generateOrderId;
window.getStatusColor = getStatusColor;
window.isMobileDevice = isMobileDevice;
window.isTouchDevice = isTouchDevice;
window.getCurrentBreakpoint = getCurrentBreakpoint;

// Add global animation styles if not present
if (!document.querySelector('#utils-animation-styles')) {
    const style = document.createElement('style');
    style.id = 'utils-animation-styles';
    style.textContent = `
        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
        
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        .skeleton-card, .skeleton-text, .skeleton-row {
            background-size: 200% 100%;
        }
        
        body.dark-mode .skeleton-card,
        body.dark-mode .skeleton-text,
        body.dark-mode .skeleton-row {
            background: linear-gradient(90deg, #1f2937 25%, #374151 50%, #1f2937 75%);
            background-size: 200% 100%;
        }
    `;
    document.head.appendChild(style);
}

console.log('✅ Utils module v3.0 loaded - Design System compliant');