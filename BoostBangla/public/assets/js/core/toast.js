// ============================================
// Toast Notification System - BoostBangla Design System v3.0
// Beautiful, non-intrusive toast messages with glass morphism
// Version: 3.0 - DESIGN SYSTEM COMPLIANT
// ============================================

let toastContainer = null;
let toastQueue = [];
let isShowingToast = false;
let toastSoundEnabled = false;
let toastPosition = 'bottom-right'; // bottom-right, bottom-left, top-right, top-left, top-center, bottom-center

// Toast types and their configurations - Design System Colors
const toastTypes = {
    success: {
        icon: 'fas fa-check-circle',
        color: '#10b981',
        gradient: 'linear-gradient(135deg, #10b981, #059669)',
        sound: null,
        duration: 3000,
        title: 'Success'
    },
    error: {
        icon: 'fas fa-exclamation-circle',
        color: '#ef4444',
        gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
        sound: null,
        duration: 4000,
        title: 'Error'
    },
    warning: {
        icon: 'fas fa-exclamation-triangle',
        color: '#f59e0b',
        gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
        sound: null,
        duration: 3500,
        title: 'Warning'
    },
    info: {
        icon: 'fas fa-info-circle',
        color: '#3b82f6',
        gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        sound: null,
        duration: 3000,
        title: 'Info'
    },
    order: {
        icon: 'fas fa-shopping-cart',
        color: '#FF6B00',
        gradient: 'linear-gradient(135deg, #FF6B00, #CC5500)',
        sound: null,
        duration: 4000,
        title: 'Order Placed'
    },
    payment: {
        icon: 'fas fa-money-bill-wave',
        color: '#10b981',
        gradient: 'linear-gradient(135deg, #10b981, #059669)',
        sound: null,
        duration: 4000,
        title: 'Payment'
    },
    deposit: {
        icon: 'fas fa-plus-circle',
        color: '#8b5cf6',
        gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        sound: null,
        duration: 4000,
        title: 'Deposit'
    },
    withdrawal: {
        icon: 'fas fa-minus-circle',
        color: '#ef4444',
        gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
        sound: null,
        duration: 4000,
        title: 'Withdrawal'
    }
};

// ============================================
// INITIALIZE TOAST SYSTEM
// ============================================
function initToastSystem() {
    console.log('🍞 Initializing Toast System v3.0...');
    createToastContainer();
    loadToastPreferences();
    setupGlobalToastHandler();
    injectDesignSystemStyles();
    setupPositionSelector();
}

// ============================================
// INJECT DESIGN SYSTEM STYLES
// ============================================
function injectDesignSystemStyles() {
    const styleId = 'boostbangla-toast-styles';
    if (document.getElementById(styleId)) return;
    
    const styles = `
        /* Toast Container - Position variants */
        .toast-container {
            position: fixed;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 12px;
            pointer-events: none;
            max-width: 380px;
            min-width: 280px;
        }
        
        .toast-container.bottom-right {
            bottom: 24px;
            right: 24px;
        }
        
        .toast-container.bottom-left {
            bottom: 24px;
            left: 24px;
        }
        
        .toast-container.top-right {
            top: 80px;
            right: 24px;
        }
        
        .toast-container.top-left {
            top: 80px;
            left: 24px;
        }
        
        .toast-container.top-center {
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            align-items: center;
        }
        
        .toast-container.bottom-center {
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            align-items: center;
        }

        @media (max-width: 768px) {
            .toast-container.bottom-right,
            .toast-container.bottom-left,
            .toast-container.bottom-center {
                bottom: 80px;
                left: 16px;
                right: 16px;
                max-width: none;
                min-width: 0;
                transform: none;
            }
        }
        
        /* Toast Card - Glass Morphism Design System */
        .toast {
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(12px);
            border-radius: 20px;
            padding: 14px 18px;
            box-shadow: 0 20px 35px -12px rgba(0, 0, 0, 0.2);
            display: flex;
            align-items: center;
            gap: 14px;
            pointer-events: auto;
            cursor: pointer;
            position: relative;
            overflow: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            animation: toastSlideIn 0.4s cubic-bezier(0.34, 1.2, 0.64, 1);
        }
        
        .toast:hover {
            transform: translateY(-2px);
            box-shadow: 0 25px 40px -15px rgba(0, 0, 0, 0.25);
        }
        
        /* Dark Mode Toast */
        body.dark-mode .toast {
            background: rgba(30, 41, 59, 0.98);
            border-color: rgba(255, 107, 0, 0.15);
        }
        
        /* Toast Icon */
        .toast-icon {
            font-size: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            border-radius: 60px;
            background: rgba(0, 0, 0, 0.05);
        }
        
        body.dark-mode .toast-icon {
            background: rgba(255, 255, 255, 0.05);
        }
        
        /* Toast Content */
        .toast-content {
            flex: 1;
        }
        
        .toast-title {
            font-weight: 700;
            font-size: 14px;
            margin-bottom: 4px;
            letter-spacing: -0.2px;
        }
        
        .toast-message {
            font-size: 13px;
            color: #6b7280;
            line-height: 1.4;
        }
        
        body.dark-mode .toast-message {
            color: #94a3b8;
        }
        
        /* Toast Progress Bar */
        .toast-progress {
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            width: 100%;
            animation: toastProgress linear forwards;
        }
        
        /* Toast Close Button */
        .toast-close {
            background: none;
            border: none;
            font-size: 18px;
            cursor: pointer;
            color: #9ca3af;
            padding: 6px;
            border-radius: 50%;
            transition: all 0.2s ease;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .toast-close:hover {
            background: rgba(0, 0, 0, 0.05);
            color: #4b5563;
        }
        
        body.dark-mode .toast-close:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #e2e8f0;
        }
        
        /* Toast Animations */
        @keyframes toastSlideIn {
            from {
                opacity: 0;
                transform: translateX(100%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        @keyframes toastSlideOut {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }
        
        @keyframes toastSlideInLeft {
            from {
                opacity: 0;
                transform: translateX(-100%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        @keyframes toastSlideOutLeft {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(-100%);
            }
        }
        
        @keyframes toastSlideInTop {
            from {
                opacity: 0;
                transform: translateY(-100%);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes toastSlideOutTop {
            from {
                opacity: 1;
                transform: translateY(0);
            }
            to {
                opacity: 0;
                transform: translateY(-100%);
            }
        }
        
        @keyframes toastProgress {
            from {
                width: 100%;
            }
            to {
                width: 0%;
            }
        }
        
        /* Toast Stack Effect */
        .toast:not(:last-child) {
            margin-bottom: 0;
        }
        
        /* Mobile Adjustments */
        @media (max-width: 640px) {
            .toast-container {
                max-width: calc(100% - 32px);
                min-width: calc(100% - 32px);
                left: 16px !important;
                right: 16px !important;
                transform: none !important;
            }
            
            .toast-container.bottom-right,
            .toast-container.bottom-left,
            .toast-container.bottom-center {
                bottom: 80px;
            }
            
            .toast-container.top-right,
            .toast-container.top-left,
            .toast-container.top-center {
                top: 70px;
            }
            
            .toast {
                padding: 12px 16px;
                border-radius: 16px;
            }
            
            .toast-icon {
                width: 36px;
                height: 36px;
                font-size: 20px;
            }
            
            .toast-title {
                font-size: 13px;
            }
            
            .toast-message {
                font-size: 12px;
            }
        }
        
        /* Position-specific animations */
        .toast-container.bottom-right .toast {
            animation: toastSlideIn 0.4s cubic-bezier(0.34, 1.2, 0.64, 1);
        }
        
        .toast-container.bottom-left .toast {
            animation: toastSlideInLeft 0.4s cubic-bezier(0.34, 1.2, 0.64, 1);
        }
        
        .toast-container.top-right .toast,
        .toast-container.top-left .toast {
            animation: toastSlideInTop 0.4s cubic-bezier(0.34, 1.2, 0.64, 1);
        }
        
        /* Position selector */
        .toast-position-selector {
            position: fixed;
            bottom: 100px;
            right: 24px;
            background: white;
            border-radius: 60px;
            padding: 8px 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            z-index: 9999;
            display: none;
            gap: 12px;
        }
        
        body.dark-mode .toast-position-selector {
            background: #1e293b;
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// ============================================
// CREATE TOAST CONTAINER
// ============================================
function createToastContainer() {
    if (toastContainer) return;
    
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = `toast-container ${toastPosition}`;
    document.body.appendChild(toastContainer);
}

// ============================================
// UPDATE TOAST POSITION
// ============================================
function setToastPosition(position) {
    const validPositions = ['bottom-right', 'bottom-left', 'top-right', 'top-left', 'top-center', 'bottom-center'];
    if (validPositions.includes(position)) {
        toastPosition = position;
        if (toastContainer) {
            toastContainer.className = `toast-container ${position}`;
        }
        localStorage.setItem('boostbangla_toastPosition', position);
    }
}

function setupPositionSelector() {
    const savedPosition = localStorage.getItem('boostbangla_toastPosition');
    if (savedPosition && savedPosition !== toastPosition) {
        setToastPosition(savedPosition);
    }
}

// ============================================
// LOAD TOAST PREFERENCES
// ============================================
function loadToastPreferences() {
    const savedSoundPref = localStorage.getItem('boostbangla_notificationSound');
    toastSoundEnabled = savedSoundPref === 'true';
    
    const savedPosition = localStorage.getItem('boostbangla_toastPosition');
    if (savedPosition) {
        toastPosition = savedPosition;
    }
}

// ============================================
// SHOW TOAST - Main Function
// ============================================
function showToast(message, type = 'info', duration = null, options = {}) {
    const toastType = toastTypes[type] || toastTypes.info;
    const toastDuration = duration || toastType.duration;
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Apply border-left color based on type
    toast.style.borderLeft = `4px solid ${toastType.color}`;
    
    // Build toast HTML
    toast.innerHTML = `
        <div class="toast-icon" style="color: ${toastType.color};">
            <i class="${toastType.icon}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title" style="color: ${toastType.color};">${options.title || toastType.title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" aria-label="Close">
            <i class="fas fa-times"></i>
        </button>
        <div class="toast-progress" style="background: ${toastType.color};"></div>
    `;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Play sound if enabled
    if (toastSoundEnabled && toastType.sound) {
        playToastSound(toastType.sound);
    }
    
    // Setup progress bar animation
    const progressBar = toast.querySelector('.toast-progress');
    progressBar.style.animationDuration = `${toastDuration}ms`;
    
    // Setup close button
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dismissToast(toast);
    });
    
    // Click on toast to dismiss
    toast.addEventListener('click', (e) => {
        if (e.target !== closeBtn && !closeBtn.contains(e.target)) {
            if (options.onClick) options.onClick();
            dismissToast(toast);
        }
    });
    
    // Auto dismiss
    const timeoutId = setTimeout(() => {
        dismissToast(toast);
    }, toastDuration);
    
    toast.dataset.timeoutId = timeoutId;
    
    // Pause on hover
    toast.addEventListener('mouseenter', () => {
        clearTimeout(timeoutId);
        progressBar.style.animationPlayState = 'paused';
    });
    
    toast.addEventListener('mouseleave', () => {
        const remainingTime = getRemainingTime(progressBar);
        const newTimeoutId = setTimeout(() => {
            dismissToast(toast);
        }, remainingTime);
        toast.dataset.timeoutId = newTimeoutId;
        progressBar.style.animationPlayState = 'running';
    });
    
    return toast;
}

// ============================================
// GET REMAINING TIME FROM PROGRESS BAR
// ============================================
function getRemainingTime(progressBar) {
    const computedStyle = window.getComputedStyle(progressBar);
    const animationDuration = parseFloat(computedStyle.animationDuration) * 1000;
    const transform = progressBar.style.transform;
    
    // Get current width percentage
    const width = progressBar.getBoundingClientRect().width;
    const parentWidth = progressBar.parentElement.getBoundingClientRect().width;
    const remainingPercent = width / parentWidth;
    
    return animationDuration * remainingPercent;
}

// ============================================
// DISMISS TOAST
// ============================================
function dismissToast(toast) {
    if (!toast || !toast.parentNode) return;
    
    const timeoutId = toast.dataset.timeoutId;
    if (timeoutId) {
        clearTimeout(parseInt(timeoutId));
    }
    
    // Set exit animation based on position
    if (toastPosition.includes('left')) {
        toast.style.animation = 'toastSlideOutLeft 0.3s ease forwards';
    } else if (toastPosition.includes('top')) {
        toast.style.animation = 'toastSlideOutTop 0.3s ease forwards';
    } else {
        toast.style.animation = 'toastSlideOut 0.3s ease forwards';
    }
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 300);
}

// ============================================
// PLAY TOAST SOUND
// ============================================
function playToastSound(soundUrl) {
    if (!soundUrl) return;

    try {
        const audio = new Audio(soundUrl);
        audio.volume = 0.3;
        audio.play().catch(() => {
            // Silently fail - user may have autoplay blocked
        });
    } catch (error) {
        // Silently fail
    }
}

// ============================================
// CLEAR ALL TOASTS
// ============================================
function clearAllToasts() {
    if (!toastContainer) return;
    
    const toasts = toastContainer.querySelectorAll('.toast');
    toasts.forEach(toast => {
        dismissToast(toast);
    });
}

// ============================================
// SETUP GLOBAL TOAST HANDLER
// ============================================
function setupGlobalToastHandler() {
    // Make showToast globally available
    window.showToast = showToast;
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        const message = event.reason?.message || 'An unexpected error occurred';
        showToast(message, 'error');
    });
    
    // Handle network errors
    window.addEventListener('offline', () => {
        showToast('You are offline. Please check your internet connection.', 'warning', 5000);
    });
    
    window.addEventListener('online', () => {
        showToast('Back online!', 'success', 3000);
    });
}

// ============================================
// CUSTOM TOAST TYPES - Convenience Functions
// ============================================
function showSuccessToast(message, duration = null, options = {}) {
    return showToast(message, 'success', duration, options);
}

function showErrorToast(message, duration = null, options = {}) {
    return showToast(message, 'error', duration, options);
}

function showWarningToast(message, duration = null, options = {}) {
    return showToast(message, 'warning', duration, options);
}

function showInfoToast(message, duration = null, options = {}) {
    return showToast(message, 'info', duration, options);
}

function showOrderToast(orderId, serviceName, options = {}) {
    return showToast(`Order #${orderId} placed for ${serviceName}`, 'order', null, options);
}

function showPaymentToast(amount, status, options = {}) {
    const message = status === 'success' 
        ? `Payment of ৳${amount.toLocaleString()} received!`
        : `Payment of ৳${amount.toLocaleString()} failed. Please try again.`;
    return showToast(message, status === 'success' ? 'payment' : 'error', null, options);
}

function showDepositToast(amount, status, options = {}) {
    const message = status === 'success'
        ? `Deposit of ৳${amount.toLocaleString()} successful!`
        : `Deposit of ৳${amount.toLocaleString()} failed.`;
    return showToast(message, 'deposit', null, options);
}

function showWithdrawalToast(amount, status, options = {}) {
    const message = status === 'success'
        ? `Withdrawal request of ৳${amount.toLocaleString()} submitted`
        : `Withdrawal failed. Please try again.`;
    return showToast(message, 'withdrawal', null, options);
}

// ============================================
// TOGGLE SOUND
// ============================================
function toggleToastSound(enabled) {
    toastSoundEnabled = enabled;
    localStorage.setItem('boostbangla_notificationSound', enabled);
}

// ============================================
// EXPORT PUBLIC API
// ============================================
window.showSuccessToast = showSuccessToast;
window.showErrorToast = showErrorToast;
window.showWarningToast = showWarningToast;
window.showInfoToast = showInfoToast;
window.showOrderToast = showOrderToast;
window.showPaymentToast = showPaymentToast;
window.showDepositToast = showDepositToast;
window.showWithdrawalToast = showWithdrawalToast;
window.clearAllToasts = clearAllToasts;
window.toggleToastSound = toggleToastSound;
window.setToastPosition = setToastPosition;

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initToastSystem();
});

console.log('✅ Toast JS v3.0 loaded - Design System compliant');
