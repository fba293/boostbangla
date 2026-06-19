// ============================================
// BoostBangla Interactive Tour Library - Premium Design System v3.0
// First-time user tour with step-by-step guidance
// Fully responsive with touch optimization and dark mode
// Version: 3.0
// ============================================

class Tour {
    constructor(options = {}) {
        this.options = {
            steps: [],
            onStart: null,
            onEnd: null,
            onStep: null,
            onSkip: null,
            autoStart: true,
            showProgress: true,
            showButtons: true,
            showDots: true,
            allowClose: true,
            allowSkip: true,
            overlayOpacity: 0.85,
            highlightPadding: 12,
            highlightRadius: 16,
            scrollOffset: 20,
            animationDuration: 300,
            zIndex: 10000,
            storageKey: 'boostbangla_tour',
            ...options
        };
        
        this.currentStep = 0;
        this.isActive = false;
        this.overlay = null;
        this.tooltip = null;
        this.progressFill = null;
        this.stepDots = [];
        this.hasShown = false;
        this.originalOverflow = '';
        this.resizeObserver = null;
        this.scrollLocked = false;
        
        this.init();
    }
    
    init() {
        this.injectStyles();
        this.createOverlay();
        this.createTooltip();
        this.checkIfFirstTime();
        this.setupResizeHandler();
    }
    
    // ============================================
    // Design System Integration
    // ============================================
    
    injectStyles() {
        if (document.querySelector('#tour-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'tour-styles';
        style.textContent = `
            .tour-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, var(--overlay-opacity, 0.85));
                z-index: var(--tour-z-index, 10000);
                display: none;
                pointer-events: auto;
                backdrop-filter: blur(4px);
                transition: opacity var(--tour-animation-duration, 0.3s) ease;
            }
            
            .tour-highlight-overlay {
                position: fixed;
                z-index: 10001;
                pointer-events: none;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                border-radius: var(--tour-highlight-radius, 16px);
                box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(2px);
            }
            
            .tour-highlight {
                position: relative;
                z-index: 10002;
                animation: tourPulse 0.8s ease-out;
            }
            
            .tour-tooltip {
                position: absolute;
                background: white;
                border-radius: 24px;
                padding: 20px;
                max-width: 360px;
                min-width: 260px;
                box-shadow: var(--card-shadow-xl, 0 35px 45px -15px rgba(0, 0, 0, 0.3));
                z-index: 10002;
                display: none;
                font-family: 'Inter', sans-serif;
                animation: tourTooltipFadeIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                transition: all 0.3s ease;
                border: 1px solid rgba(255, 255, 255, 0.2);
                backdrop-filter: blur(10px);
                background: rgba(255, 255, 255, 0.98);
            }
            
            body.dark-mode .tour-tooltip {
                background: rgba(30, 41, 59, 0.98);
                color: #e2e8f0;
                border-color: rgba(255, 107, 0, 0.3);
            }
            
            .tour-tooltip::before {
                content: '';
                position: absolute;
                width: 0;
                height: 0;
                border-style: solid;
            }
            
            .tour-tooltip[data-position="bottom"]::before {
                top: -10px;
                left: 50%;
                transform: translateX(-50%);
                border-width: 0 10px 10px 10px;
                border-color: transparent transparent white transparent;
            }
            
            body.dark-mode .tour-tooltip[data-position="bottom"]::before {
                border-color: transparent transparent #1e293b transparent;
            }
            
            .tour-tooltip[data-position="top"]::before {
                bottom: -10px;
                left: 50%;
                transform: translateX(-50%);
                border-width: 10px 10px 0 10px;
                border-color: white transparent transparent transparent;
            }
            
            body.dark-mode .tour-tooltip[data-position="top"]::before {
                border-color: #1e293b transparent transparent transparent;
            }
            
            .tour-tooltip[data-position="right"]::before {
                left: -10px;
                top: 50%;
                transform: translateY(-50%);
                border-width: 10px 10px 10px 0;
                border-color: transparent white transparent transparent;
            }
            
            body.dark-mode .tour-tooltip[data-position="right"]::before {
                border-color: transparent #1e293b transparent transparent;
            }
            
            .tour-tooltip[data-position="left"]::before {
                right: -10px;
                top: 50%;
                transform: translateY(-50%);
                border-width: 10px 0 10px 10px;
                border-color: transparent transparent transparent white;
            }
            
            body.dark-mode .tour-tooltip[data-position="left"]::before {
                border-color: transparent transparent transparent #1e293b;
            }
            
            .tour-progress-container {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: rgba(0, 0, 0, 0.1);
                border-radius: 0 0 24px 24px;
                overflow: hidden;
            }
            
            body.dark-mode .tour-progress-container {
                background: rgba(255, 255, 255, 0.1);
            }
            
            .tour-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #FF6B00, #CC5500);
                width: 0%;
                transition: width 0.3s ease;
                border-radius: 0 0 0 24px;
            }
            
            .tour-step-dots {
                display: flex;
                gap: 8px;
                justify-content: center;
                margin: 16px 0;
            }
            
            .tour-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #cbd5e1;
                transition: all 0.2s ease;
                cursor: pointer;
            }
            
            body.dark-mode .tour-dot {
                background: #475569;
            }
            
            .tour-dot.active {
                background: #FF6B00;
                width: 24px;
                border-radius: 4px;
            }
            
            .tour-dot:hover {
                transform: scale(1.2);
                background: #FF6B00;
            }
            
            @keyframes tourTooltipFadeIn {
                from {
                    opacity: 0;
                    transform: translateY(10px) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            
            @keyframes tourPulse {
                0% {
                    box-shadow: 0 0 0 0 rgba(255, 107, 0, 0.4);
                }
                70% {
                    box-shadow: 0 0 0 12px rgba(255, 107, 0, 0);
                }
                100% {
                    box-shadow: 0 0 0 0 rgba(255, 107, 0, 0);
                }
            }
            
            @keyframes tourHighlightPulse {
                0%, 100% {
                    border-color: rgba(255, 107, 0, 0.3);
                }
                50% {
                    border-color: rgba(255, 107, 0, 0.8);
                }
            }
            
            /* Mobile optimizations */
            @media (max-width: 768px) {
                .tour-tooltip {
                    max-width: calc(100vw - 40px);
                    min-width: calc(100vw - 80px);
                    padding: 16px;
                }
                
                .tour-tooltip .tour-buttons button {
                    padding: 10px 16px;
                    font-size: 14px;
                    min-height: 44px;
                }
                
                .tour-highlight-overlay {
                    border-radius: 12px;
                }
            }
            
            @media (max-width: 480px) {
                .tour-tooltip {
                    max-width: calc(100vw - 32px);
                    padding: 14px;
                }
                
                .tour-title {
                    font-size: 16px !important;
                }
                
                .tour-description {
                    font-size: 13px !important;
                }
            }
            
            /* Reduced motion preference */
            @media (prefers-reduced-motion: reduce) {
                .tour-tooltip,
                .tour-highlight-overlay,
                .tour-dot {
                    animation: none;
                    transition: none;
                }
                
                .tour-highlight {
                    animation: none;
                }
            }
            
            /* Touch optimization */
            @media (hover: none) and (pointer: coarse) {
                .tour-dot {
                    padding: 8px;
                    margin: -8px;
                }
                
                .tour-buttons button {
                    min-height: 48px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'tour-overlay';
        this.overlay.style.setProperty('--overlay-opacity', this.options.overlayOpacity);
        this.overlay.style.setProperty('--tour-z-index', this.options.zIndex);
        this.overlay.style.setProperty('--tour-animation-duration', `${this.options.animationDuration}ms`);
        document.body.appendChild(this.overlay);
    }
    
    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'tour-tooltip';
        this.tooltip.style.setProperty('--tour-animation-duration', `${this.options.animationDuration}ms`);
        document.body.appendChild(this.tooltip);
    }
    
    setupResizeHandler() {
        let resizeTimeout;
        this.resizeObserver = new ResizeObserver(() => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (this.isActive) {
                    this.repositionTooltip();
                }
            }, 100);
        });
        
        this.resizeObserver.observe(document.body);
    }
    
    checkIfFirstTime() {
        const tourData = localStorage.getItem(this.options.storageKey);
        const tourCompleted = tourData === 'completed';
        const tourSkipped = tourData === 'skipped';
        
        if (!tourCompleted && !tourSkipped && this.options.autoStart) {
            // Delay to let page fully render
            setTimeout(() => {
                this.start();
            }, 1000);
        }
    }
    
    start() {
        if (this.isActive) return;
        if (this.currentStep >= this.options.steps.length) return;
        
        this.isActive = true;
        this.hasShown = true;
        this.originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        
        this.overlay.style.display = 'block';
        this.overlay.style.opacity = '1';
        
        if (this.options.onStart) {
            this.options.onStart();
        }
        
        this.showStep(this.currentStep);
        
        // Track tour start
        if (typeof getAnalytics === 'function') {
            const analytics = getAnalytics();
            analytics.track('tour_started', { 
                steps: this.options.steps.length,
                page: window.location.pathname
            });
        }
    }
    
    showStep(index) {
        const step = this.options.steps[index];
        if (!step) {
            this.end();
            return;
        }
        
        // Remove previous highlight
        this.removeHighlight();
        
        // Find target element
        const target = this.findElement(step.element);
        if (!target) {
            console.warn(`Tour element not found: ${step.element}`);
            this.next();
            return;
        }
        
        // Highlight target
        this.highlightElement(target);
        
        // Get target position
        const rect = target.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        // Calculate tooltip position
        let top, left, position;
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const tooltipWidth = tooltipRect.width || 320;
        const tooltipHeight = tooltipRect.height || 200;
        
        const spaceAbove = rect.top;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceLeft = rect.left;
        const spaceRight = window.innerWidth - rect.right;
        
        // Smart positioning based on available space
        const preferredPositions = ['bottom', 'top', 'right', 'left'];
        
        for (const pos of preferredPositions) {
            if (this.checkSpaceAvailable(pos, rect, tooltipWidth, tooltipHeight)) {
                position = pos;
                break;
            }
        }
        
        // Calculate position
        switch (position) {
            case 'bottom':
                top = rect.bottom + scrollTop + 15;
                left = rect.left + scrollLeft + (rect.width / 2) - (tooltipWidth / 2);
                break;
            case 'top':
                top = rect.top + scrollTop - tooltipHeight - 15;
                left = rect.left + scrollLeft + (rect.width / 2) - (tooltipWidth / 2);
                break;
            case 'right':
                top = rect.top + scrollTop + (rect.height / 2) - (tooltipHeight / 2);
                left = rect.right + scrollLeft + 15;
                break;
            case 'left':
                top = rect.top + scrollTop + (rect.height / 2) - (tooltipHeight / 2);
                left = rect.left + scrollLeft - tooltipWidth - 15;
                break;
            default:
                position = 'bottom';
                top = rect.bottom + scrollTop + 15;
                left = rect.left + scrollLeft + (rect.width / 2) - (tooltipWidth / 2);
        }
        
        // Clamp position to viewport
        left = Math.max(10, Math.min(left, window.innerWidth - tooltipWidth - 10));
        top = Math.max(10, Math.min(top, window.innerHeight + scrollTop - tooltipHeight - 10));
        
        // Build tooltip content
        this.buildTooltipContent(step, index);
        
        // Apply position
        this.tooltip.style.top = `${top}px`;
        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.display = 'block';
        this.tooltip.setAttribute('data-position', position);
        
        // Scroll to element if needed
        this.scrollToElement(target);
        
        // Trigger step callback
        if (this.options.onStep) {
            this.options.onStep(index, step);
        }
        
        // Track step view
        if (typeof getAnalytics === 'function') {
            const analytics = getAnalytics();
            analytics.track('tour_step_viewed', {
                step: index + 1,
                title: step.title,
                totalSteps: this.options.steps.length
            });
        }
    }
    
    checkSpaceAvailable(position, rect, tooltipWidth, tooltipHeight) {
        const padding = 20;
        switch (position) {
            case 'bottom':
                return (window.innerHeight - rect.bottom) > (tooltipHeight + padding);
            case 'top':
                return rect.top > (tooltipHeight + padding);
            case 'right':
                return (window.innerWidth - rect.right) > (tooltipWidth + padding);
            case 'left':
                return rect.left > (tooltipWidth + padding);
            default:
                return true;
        }
    }
    
    findElement(selector) {
        // Try different selector strategies
        let element = document.querySelector(selector);
        
        if (!element && selector.startsWith('#')) {
            element = document.getElementById(selector.substring(1));
        }
        
        if (!element && selector.startsWith('.')) {
            element = document.getElementsByClassName(selector.substring(1))[0];
        }
        
        if (!element) {
            // Try data attribute
            element = document.querySelector(`[data-tour="${selector}"]`);
        }
        
        return element;
    }
    
    buildTooltipContent(step, index) {
        const totalSteps = this.options.steps.length;
        const showDots = this.options.showDots && totalSteps > 1;
        const showProgress = this.options.showProgress && totalSteps > 1;
        
        this.tooltip.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <div>
                    ${step.icon ? `<div style="font-size: 32px; margin-bottom: 8px;">${step.icon}</div>` : ''}
                    <span class="tour-step-counter" style="font-size: 12px; color: #FF6B00; font-weight: 700; letter-spacing: 0.5px;">
                        STEP ${index + 1}/${totalSteps}
                    </span>
                </div>
                ${this.options.allowClose ? `
                    <button class="tour-close-btn" aria-label="Close tour" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #9ca3af; padding: 4px; line-height: 1; transition: color 0.2s;">
                        &times;
                    </button>
                ` : ''}
            </div>
            <h3 class="tour-title" style="font-size: 18px; font-weight: 800; margin-bottom: 8px; line-height: 1.3;">
                ${step.title}
            </h3>
            <p class="tour-description" style="font-size: 14px; color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
                ${step.description}
            </p>
            ${showDots ? `<div class="tour-step-dots" id="tourStepDots"></div>` : ''}
            <div class="tour-buttons" style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
                <div style="display: flex; gap: 8px;">
                    ${index > 0 ? `
                        <button class="tour-prev-btn" style="padding: 8px 16px; border: 1px solid #e5e7eb; background: transparent; border-radius: 40px; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s;">
                            ← Back
                        </button>
                    ` : ''}
                </div>
                <div style="display: flex; gap: 8px;">
                    ${this.options.allowSkip && index < totalSteps - 1 ? `
                        <button class="tour-skip-btn" style="padding: 8px 16px; border: none; background: transparent; color: #9ca3af; cursor: pointer; font-weight: 500; font-size: 14px;">
                            Skip Tour
                        </button>
                    ` : ''}
                    <button class="tour-next-btn" style="padding: 8px 24px; background: linear-gradient(135deg, #FF6B00, #CC5500); color: white; border: none; border-radius: 40px; cursor: pointer; font-weight: 700; font-size: 14px; transition: all 0.2s;">
                        ${index === totalSteps - 1 ? '🎉 Finish' : 'Next →'}
                    </button>
                </div>
            </div>
            ${showProgress ? `
                <div class="tour-progress-container">
                    <div class="tour-progress-fill" style="width: ${((index + 1) / totalSteps) * 100}%;"></div>
                </div>
            ` : ''}
        `;
        
        // Add step dots
        if (showDots) {
            const dotsContainer = this.tooltip.querySelector('#tourStepDots');
            this.stepDots = [];
            for (let i = 0; i < totalSteps; i++) {
                const dot = document.createElement('div');
                dot.className = `tour-dot ${i === index ? 'active' : ''}`;
                dot.setAttribute('data-step', i);
                dot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.goToStep(i);
                });
                dotsContainer.appendChild(dot);
                this.stepDots.push(dot);
            }
        }
        
        // Add event listeners
        this.tooltip.querySelector('.tour-next-btn')?.addEventListener('click', () => this.next());
        this.tooltip.querySelector('.tour-prev-btn')?.addEventListener('click', () => this.previous());
        this.tooltip.querySelector('.tour-skip-btn')?.addEventListener('click', () => this.skip());
        this.tooltip.querySelector('.tour-close-btn')?.addEventListener('click', () => this.end(true));
        
        // Add hover effects to buttons
        const buttons = this.tooltip.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.addEventListener('mouseenter', (e) => {
                e.target.style.transform = 'translateY(-2px)';
            });
            btn.addEventListener('mouseleave', (e) => {
                e.target.style.transform = 'translateY(0)';
            });
        });
    }
    
    highlightElement(element) {
        this.removeHighlight();
        
        // Add highlight class to element
        element.classList.add('tour-highlight');
        
        // Create highlight overlay
        const rect = element.getBoundingClientRect();
        const highlightOverlay = document.createElement('div');
        highlightOverlay.className = 'tour-highlight-overlay';
        highlightOverlay.style.cssText = `
            top: ${rect.top - this.options.highlightPadding}px;
            left: ${rect.left - this.options.highlightPadding}px;
            width: ${rect.width + this.options.highlightPadding * 2}px;
            height: ${rect.height + this.options.highlightPadding * 2}px;
        `;
        highlightOverlay.style.setProperty('--tour-highlight-radius', `${this.options.highlightRadius}px`);
        
        document.body.appendChild(highlightOverlay);
        this.highlightOverlay = highlightOverlay;
        
        // Add border animation
        element.style.animation = 'tourPulse 0.8s ease-out';
        element.style.borderRadius = `${this.options.highlightRadius}px`;
    }
    
    removeHighlight() {
        document.querySelectorAll('.tour-highlight').forEach(el => {
            el.classList.remove('tour-highlight');
            el.style.animation = '';
        });
        if (this.highlightOverlay) {
            this.highlightOverlay.remove();
            this.highlightOverlay = null;
        }
    }
    
    scrollToElement(element) {
        const rect = element.getBoundingClientRect();
        const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
        
        if (!isVisible) {
            const elementTop = rect.top + window.pageYOffset;
            const scrollPosition = elementTop - this.options.scrollOffset;
            
            window.scrollTo({
                top: scrollPosition,
                behavior: 'smooth'
            });
        }
    }
    
    repositionTooltip() {
        if (!this.isActive) return;
        this.showStep(this.currentStep);
    }
    
    goToStep(step) {
        if (step < 0 || step >= this.options.steps.length) return;
        this.currentStep = step;
        this.showStep(this.currentStep);
        
        // Update step dots
        this.stepDots.forEach((dot, i) => {
            if (i === this.currentStep) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
        
        // Update progress bar
        const progressFill = this.tooltip.querySelector('.tour-progress-fill');
        if (progressFill) {
            const percentage = ((this.currentStep + 1) / this.options.steps.length) * 100;
            progressFill.style.width = `${percentage}%`;
        }
    }
    
    next() {
        if (this.currentStep < this.options.steps.length - 1) {
            this.currentStep++;
            this.showStep(this.currentStep);
        } else {
            this.end();
        }
    }
    
    previous() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.showStep(this.currentStep);
        }
    }
    
    skip() {
        if (this.options.onSkip) {
            this.options.onSkip();
        }
        this.end(true);
    }
    
    end(skipped = false) {
        this.isActive = false;
        this.overlay.style.display = 'none';
        this.tooltip.style.display = 'none';
        this.removeHighlight();
        
        // Restore body scroll
        document.body.style.overflow = this.originalOverflow;
        
        // Store completion status
        localStorage.setItem(this.options.storageKey, skipped ? 'skipped' : 'completed');
        
        if (this.options.onEnd) {
            this.options.onEnd(skipped);
        }
        
        // Clean up resize observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        // Track tour completion
        if (typeof getAnalytics === 'function') {
            const analytics = getAnalytics();
            analytics.track('tour_ended', { 
                completed: !skipped,
                stepsViewed: this.currentStep + 1,
                totalSteps: this.options.steps.length,
                skipped: skipped
            });
        }
    }
    
    reset() {
        localStorage.removeItem(this.options.storageKey);
        this.currentStep = 0;
        this.hasShown = false;
    }
    
    destroy() {
        if (this.isActive) {
            this.end();
        }
        this.overlay?.remove();
        this.tooltip?.remove();
        this.resizeObserver?.disconnect();
    }
}

// ============================================
// Predefined Tours with Design System
// ============================================

// Dashboard Tour
function startDashboardTour() {
    const tour = new Tour({
        steps: [
            {
                element: '#adminSidebar, .admin-sidebar, .sidebar',
                title: '📊 Navigation Sidebar',
                description: 'Use the sidebar to navigate between different sections of your dashboard. All main features are just a click away!',
                icon: '🗺️'
            },
            {
                element: '#unifiedBellContainer, .notifications-btn, [data-tour="notifications"]',
                title: '🔔 Smart Notifications',
                description: 'Get real-time updates about your orders, payments, deposits, and support tickets. Never miss an important update!',
                icon: '🔔'
            },
            {
                element: '.stats-card, .stat-card, .kpi-card',
                title: '💰 Key Metrics',
                description: 'View your balance, total orders, active orders, and completed orders at a single glance.',
                icon: '📈'
            },
            {
                element: '.service-row, .service-card',
                title: '🛒 Quick Order',
                description: 'Browse our SMM services and place orders with just a few clicks. Start growing your social media presence!',
                icon: '🚀'
            },
            {
                element: '#headerBalanceBtn, .add-funds-btn, [href*="add-funds"]',
                title: '💳 Add Funds',
                description: 'Click here to add funds to your account using bKash, Nagad, or Rocket. Instant deposit available!',
                icon: '💰'
            }
        ],
        showProgress: true,
        showDots: true,
        allowSkip: true,
        highlightPadding: 12,
        highlightRadius: 16,
        onStart: () => {
            console.log('🎓 Dashboard tour started');
        },
        onEnd: (skipped) => {
            if (!skipped) {
                if (typeof showToast === 'function') {
                    showToast('🎉 Great! You\'re ready to boost your social media!', 'success');
                }
            }
        }
    });
    
    tour.start();
    return tour;
}

// Orders Page Tour
function startOrdersTour() {
    const tour = new Tour({
        steps: [
            {
                element: '.filter-buttons, .status-filters',
                title: '📋 Smart Filters',
                description: 'Filter your orders by status: All, Pending, Processing, Completed, or Cancelled. Easy order management!',
                icon: '🔍'
            },
            {
                element: '#searchOrders, .search-input',
                title: '🔎 Quick Search',
                description: 'Search for specific orders by Order ID or Service Name. Find what you need in seconds!',
                icon: '⚡'
            },
            {
                element: '.orders-table, .data-table',
                title: '📦 Order List',
                description: 'View all your orders here with real-time status updates. Click on any order to see detailed information.',
                icon: '📋'
            },
            {
                element: '#exportCSVBtn, .export-btn',
                title: '📥 Export Data',
                description: 'Export your order history to CSV for record keeping and analysis.',
                icon: '📎'
            }
        ],
        showProgress: true,
        showDots: true,
        onEnd: () => {
            if (typeof showToast === 'function') {
                showToast('📊 Now you can track all your orders easily!', 'success');
            }
        }
    });
    
    tour.start();
    return tour;
}

// Add Funds Page Tour
function startAddFundsTour() {
    const tour = new Tour({
        steps: [
            {
                element: '#amountUSD, .amount-input',
                title: '💰 Deposit Amount',
                description: 'Enter the amount in BDT you want to deposit to your account. Minimum deposit is 100 BDT.',
                icon: '💵'
            },
            {
                element: '.payment-methods, .payment-method-card',
                title: '💳 Payment Method',
                description: 'Choose your preferred payment method: bKash, Nagad, or Rocket. All methods are instant!',
                icon: '💳'
            },
            {
                element: '#bkashInstructions, .payment-instructions',
                title: '📱 Payment Guide',
                description: 'Follow these simple instructions to complete your payment. You can scan QR code or copy the number.',
                icon: '📖'
            },
            {
                element: '#transactionId, .transaction-input',
                title: '🔑 Transaction ID',
                description: 'Enter the transaction ID from your payment app to verify the deposit.',
                icon: '🔐'
            },
            {
                element: '#submitBtn, .submit-deposit',
                title: '✅ Submit Request',
                description: 'Click here to submit your deposit request. Admin will verify within 0-6 hours.',
                icon: '🚀'
            }
        ],
        showProgress: true,
        allowSkip: true,
        onEnd: () => {
            if (typeof showToast === 'function') {
                showToast('💎 Ready to add funds and boost your campaigns!', 'success');
            }
        }
    });
    
    tour.start();
    return tour;
}

// Services Page Tour
function startServicesTour() {
    const tour = new Tour({
        steps: [
            {
                element: '.category-tabs, .categories',
                title: '🏷️ Service Categories',
                description: 'Browse services by platform: YouTube, Facebook, Instagram, TikTok, Twitter, and more!',
                icon: '📁'
            },
            {
                element: '#searchServices, .service-search',
                title: '🔍 Find Services',
                description: 'Search for specific services by name, ID, or category. Get exactly what you need!',
                icon: '🎯'
            },
            {
                element: '.service-row, .service-card',
                title: '⭐ Service List',
                description: 'Click the star icon to favorite services for quick access. Click "View" to see details and place orders.',
                icon: '✨'
            },
            {
                element: '.service-price, .rate',
                title: '💰 Competitive Pricing',
                description: 'Check our affordable rates per 1000 units. Best prices in the market!',
                icon: '🏷️'
            }
        ],
        showProgress: true,
        showDots: true,
        onEnd: () => {
            if (typeof showToast === 'function') {
                showToast('🚀 Start ordering services and watch your social media grow!', 'success');
            }
        }
    });
    
    tour.start();
    return tour;
}

// Profile Page Tour
function startProfileTour() {
    const tour = new Tour({
        steps: [
            {
                element: '.profile-avatar, .avatar-upload',
                title: '🖼️ Profile Picture',
                description: 'Upload a profile picture to personalize your account.',
                icon: '📸'
            },
            {
                element: '.profile-form, .user-info',
                title: '📝 Personal Information',
                description: 'Update your name, email, and contact information.',
                icon: '✏️'
            },
            {
                element: '.security-settings',
                title: '🔒 Security',
                description: 'Change your password and enable two-factor authentication for extra security.',
                icon: '🛡️'
            },
            {
                element: '.api-settings',
                title: '🔑 API Access',
                description: 'Generate API keys for automated ordering through our API.',
                icon: '🔌'
            }
        ],
        showProgress: true,
        onEnd: () => {
            if (typeof showToast === 'function') {
                showToast('🔐 Your profile is all set!', 'success');
            }
        }
    });
    
    tour.start();
    return tour;
}

// ============================================
// Contextual Tour Starter
// ============================================

function startContextualTour() {
    const path = window.location.pathname;
    const hash = window.location.hash;
    
    // Check if tour was already completed
    const tourCompleted = localStorage.getItem('boostbangla_tour') === 'completed';
    const tourSkipped = localStorage.getItem('boostbangla_tour') === 'skipped';
    
    if (tourCompleted || tourSkipped) return null;
    
    let tour = null;
    
    if (path.includes('/dashboard/index.html') || path === '/dashboard/' || path === '/') {
        tour = startDashboardTour();
    } else if (path.includes('/dashboard/orders.html') || path.includes('/orders')) {
        tour = startOrdersTour();
    } else if (path.includes('/dashboard/add-funds.html') || path.includes('/add-funds')) {
        tour = startAddFundsTour();
    } else if (path.includes('/dashboard/services.html') || path.includes('/services')) {
        tour = startServicesTour();
    } else if (path.includes('/dashboard/profile.html') || path.includes('/profile')) {
        tour = startProfileTour();
    }
    
    return tour;
}

// ============================================
// Utility Functions
// ============================================

function resetAllTours() {
    localStorage.removeItem('boostbangla_tour');
    if (typeof showToast === 'function') {
        showToast('🔄 All tours reset. Refresh to see them again!', 'info');
    } else {
        console.log('All tours have been reset. Refresh the page to see tours again.');
    }
}

function getTourStatus() {
    const status = localStorage.getItem('boostbangla_tour');
    return {
        completed: status === 'completed',
        skipped: status === 'skipped',
        notStarted: !status
    };
}

function showTourSelector() {
    const status = getTourStatus();
    const tours = [
        { name: 'Dashboard Tour', start: startDashboardTour, page: 'dashboard' },
        { name: 'Orders Tour', start: startOrdersTour, page: 'orders' },
        { name: 'Add Funds Tour', start: startAddFundsTour, page: 'add-funds' },
        { name: 'Services Tour', start: startServicesTour, page: 'services' },
        { name: 'Profile Tour', start: startProfileTour, page: 'profile' }
    ];
    
    // Create selector modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 24px;
        padding: 24px;
        z-index: 100000;
        box-shadow: var(--card-shadow-xl);
        min-width: 300px;
        max-width: 400px;
        font-family: 'Inter', sans-serif;
    `;
    
    modal.innerHTML = `
        <h3 style="font-size: 20px; font-weight: 800; margin-bottom: 16px;">🎓 Select a Tour</h3>
        <div style="display: flex; flex-direction: column; gap: 12px;">
            ${tours.map(tour => `
                <button class="tour-select-btn" data-tour="${tour.page}" style="
                    padding: 12px 16px;
                    background: #f3f4f6;
                    border: none;
                    border-radius: 16px;
                    cursor: pointer;
                    text-align: left;
                    font-size: 14px;
                    font-weight: 600;
                    transition: all 0.2s;
                ">
                    ${tour.name}
                </button>
            `).join('')}
            <button class="tour-reset-btn" style="
                margin-top: 16px;
                padding: 10px;
                background: none;
                border: 1px solid #ef4444;
                color: #ef4444;
                border-radius: 16px;
                cursor: pointer;
                font-size: 13px;
            ">
                Reset All Tours
            </button>
        </div>
    `;
    
    // Add dark mode support
    if (document.body.classList.contains('dark-mode')) {
        modal.style.background = '#1e293b';
        modal.style.color = '#e2e8f0';
    }
    
    document.body.appendChild(modal);
    
    // Add event listeners
    modal.querySelectorAll('.tour-select-btn').forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            btn.style.background = '#FF6B00';
            btn.style.color = 'white';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.background = document.body.classList.contains('dark-mode') ? '#334155' : '#f3f4f6';
            btn.style.color = 'inherit';
        });
        btn.addEventListener('click', () => {
            const tourPage = btn.dataset.tour;
            const tour = tours.find(t => t.page === tourPage);
            if (tour) {
                modal.remove();
                tour.start();
            }
        });
    });
    
    modal.querySelector('.tour-reset-btn')?.addEventListener('click', () => {
        resetAllTours();
        modal.remove();
    });
    
    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', function closeModal(e) {
            if (!modal.contains(e.target)) {
                modal.remove();
                document.removeEventListener('click', closeModal);
            }
        });
    }, 100);
}

// ============================================
// Export for global use
// ============================================

window.Tour = Tour;
window.startDashboardTour = startDashboardTour;
window.startOrdersTour = startOrdersTour;
window.startAddFundsTour = startAddFundsTour;
window.startServicesTour = startServicesTour;
window.startProfileTour = startProfileTour;
window.startContextualTour = startContextualTour;
window.resetAllTours = resetAllTours;
window.getTourStatus = getTourStatus;
window.showTourSelector = showTourSelector;

// ============================================
// Auto-initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Check if tour should auto-start
    const autoStart = localStorage.getItem('boostbangla_tour_auto') !== 'false';
    
    if (autoStart) {
        setTimeout(() => {
            startContextualTour();
        }, 1500);
    }
    
    // Add keyboard shortcut to show tour selector (Alt+Shift+T)
    window.addEventListener('keydown', (e) => {
        if (e.altKey && e.shiftKey && e.key === 'T') {
            showTourSelector();
        }
    });
    
    console.log('🎓 BoostBangla Tour v3.0 loaded - Design System Ready');
    console.log('💡 Tip: Press Alt+Shift+T to show tour selector');
});

// ============================================
// Module exports
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        Tour, 
        startDashboardTour,
        startOrdersTour,
        startAddFundsTour,
        startServicesTour,
        startProfileTour,
        startContextualTour,
        resetAllTours,
        getTourStatus,
        showTourSelector
    };
}