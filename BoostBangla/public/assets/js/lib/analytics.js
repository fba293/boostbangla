// ============================================
// BoostBangla Analytics Module - Premium Design System v3.0
// Track user behavior, performance, and engagement
// Fully responsive with dark mode support
// ============================================

class Analytics {
    constructor(options = {}) {
        this.options = {
            endpoint: '/api/analytics',
            batchSize: 10,
            flushInterval: 30000,
            maxQueueSize: 100,
            debug: window.location.hostname === 'localhost',
            trackPerformance: true,
            trackErrors: true,
            trackUserInteractions: true,
            trackWebVitals: true,
            enableHeatmap: true,
            enableSessionRecording: false,
            ...options
        };
        
        this.eventQueue = [];
        this.sessionId = this.generateSessionId();
        this.userId = null;
        this.startTime = Date.now();
        this.flushTimer = null;
        this.performanceMetrics = {};
        this.sessionEvents = [];
        this.pageViewCount = 0;
        
        this.init();
    }
    
    init() {
        this.getUserId();
        this.startFlushTimer();
        this.trackPageView();
        this.trackPerformance();
        this.setupBeforeUnload();
        this.setupVisibilityTracking();
        
        // Apply design system styling
        this.injectStyles();
        
        if (this.options.debug) {
            console.log('📊 BoostBangla Analytics initialized', { 
                sessionId: this.sessionId,
                designSystem: 'v3.0'
            });
        }
    }
    
    // ============================================
    // Design System Integration
    // ============================================
    
    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .analytics-toast {
                position: fixed;
                bottom: 24px;
                right: 24px;
                background: var(--dark-surface, #1e293b);
                border-radius: 16px;
                padding: 16px 20px;
                box-shadow: var(--card-shadow-xl, 0 20px 25px -5px rgba(0,0,0,0.2));
                border-left: 4px solid var(--primary, #FF6B00);
                z-index: 10001;
                animation: slideInRight 0.3s ease-out;
                font-family: 'Inter', sans-serif;
                backdrop-filter: blur(10px);
                background: rgba(30, 41, 59, 0.95);
                color: white;
                min-width: 280px;
                max-width: 400px;
            }
            
            @keyframes slideInRight {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @keyframes slideOutRight {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(100%);
                }
            }
            
            .analytics-stats-panel {
                position: fixed;
                bottom: 24px;
                left: 24px;
                background: var(--dark-surface, #1e293b);
                border-radius: 20px;
                padding: 12px 20px;
                z-index: 10000;
                font-size: 12px;
                font-family: 'Inter', monospace;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 107, 0, 0.3);
                pointer-events: none;
                transition: all 0.3s ease;
            }
            
            .analytics-stats-panel span {
                color: var(--primary, #FF6B00);
                font-weight: 700;
            }
            
            @media (max-width: 768px) {
                .analytics-stats-panel {
                    bottom: 80px;
                    left: 16px;
                    padding: 8px 16px;
                    font-size: 10px;
                }
                
                .analytics-toast {
                    bottom: 80px;
                    right: 16px;
                    left: 16px;
                    max-width: calc(100% - 32px);
                    padding: 12px 16px;
                }
            }
        `;
        
        if (!document.querySelector('#analytics-styles')) {
            style.id = 'analytics-styles';
            document.head.appendChild(style);
        }
    }
    
    showToast(message, type = 'info') {
        const existingToast = document.querySelector('.analytics-toast');
        if (existingToast) existingToast.remove();
        
        const toast = document.createElement('div');
        toast.className = 'analytics-toast';
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'chart-line'}" 
                   style="color: var(--primary, #FF6B00); font-size: 20px;"></i>
                <div>
                    <div style="font-weight: 600; margin-bottom: 4px;">Analytics</div>
                    <div style="font-size: 13px; opacity: 0.9;">${message}</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-out forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
    
    // ============================================
    // Session Management
    // ============================================
    
    generateSessionId() {
        let sessionId = sessionStorage.getItem('boostbangla_session_id');
        if (!sessionId) {
            sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('boostbangla_session_id', sessionId);
        }
        return sessionId;
    }
    
    async getUserId() {
        try {
            // Try to get from global auth state
            if (typeof window.getCurrentUser === 'function') {
                const user = await window.getCurrentUser();
                this.userId = user?.uid || user?.id || 'anonymous';
            } else if (localStorage.getItem('boostbangla_user')) {
                const user = JSON.parse(localStorage.getItem('boostbangla_user'));
                this.userId = user.uid || user.id || 'anonymous';
            } else {
                this.userId = 'anonymous';
            }
        } catch (e) {
            this.userId = 'anonymous';
        }
        return this.userId;
    }
    
    // ============================================
    // Event Tracking with Design System Enhancement
    // ============================================
    
    track(eventName, properties = {}) {
        const event = {
            name: eventName,
            properties: {
                ...properties,
                url: window.location.href,
                path: window.location.pathname,
                referrer: document.referrer,
                screenWidth: window.innerWidth,
                screenHeight: window.innerHeight,
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight,
                timestamp: Date.now(),
                sessionDuration: Date.now() - this.startTime,
                pageViewCount: this.pageViewCount,
                darkMode: document.body.classList.contains('dark-mode'),
                designSystem: 'v3.0'
            },
            userId: this.userId,
            sessionId: this.sessionId,
            pageLoadTime: Date.now() - this.startTime
        };
        
        this.eventQueue.push(event);
        this.sessionEvents.push(event);
        
        // Keep session events limited
        if (this.sessionEvents.length > 100) {
            this.sessionEvents.shift();
        }
        
        if (this.options.debug) {
            console.log(`📊 BoostBangla Event: ${eventName}`, properties);
        }
        
        // Flush immediately for important events
        const importantEvents = ['error', 'order', 'deposit', 'conversion', 'purchase'];
        if (importantEvents.includes(eventName) || properties.important) {
            this.flush();
        }
        
        // Auto-flush if queue is full
        if (this.eventQueue.length >= this.options.batchSize) {
            this.flush();
        }
        
        // Show debug toast in development
        if (this.options.debug && properties.showToast) {
            this.showToast(`${eventName}: ${JSON.stringify(properties).substring(0, 100)}`, 'info');
        }
    }
    
    // ============================================
    // Page Tracking
    // ============================================
    
    trackPageView() {
        this.pageViewCount++;
        this.track('page_view', {
            title: document.title,
            previousPath: sessionStorage.getItem('boostbangla_previous_path') || null,
            pageDepth: this.pageViewCount
        });
        sessionStorage.setItem('boostbangla_previous_path', window.location.pathname);
        
        // Track page timing
        if (window.performance) {
            setTimeout(() => {
                this.trackPageTiming();
            }, 100);
        }
    }
    
    trackPageTiming() {
        if (!window.performance || !window.performance.timing) return;
        
        const timing = window.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
        
        this.track('page_timing', {
            loadTime: loadTime,
            domReady: domReady,
            rating: loadTime < 2000 ? 'good' : loadTime < 4000 ? 'needsImprovement' : 'poor'
        });
    }
    
    // ============================================
    // User Interaction Tracking (Touch-Friendly)
    // ============================================
    
    trackClick(element, label, position = null) {
        const rect = element?.getBoundingClientRect();
        this.track('click', {
            element: element?.tagName,
            id: element?.id,
            class: element?.className,
            label: label,
            text: element?.innerText?.substring(0, 100),
            x: position?.x || (rect ? rect.left + rect.width / 2 : null),
            y: position?.y || (rect ? rect.top + rect.height / 2 : null),
            isTouch: 'ontouchstart' in window,
            elementSize: rect ? { width: rect.width, height: rect.height } : null
        });
    }
    
    trackTouch(element, touchType = 'tap', position = null) {
        this.track('touch_interaction', {
            element: element?.tagName,
            id: element?.id,
            class: element?.className,
            touchType: touchType, // tap, swipe, longpress, pinch
            x: position?.x,
            y: position?.y,
            isMobile: window.innerWidth <= 768
        });
    }
    
    trackScrollDepth() {
        let maxScroll = 0;
        let scrollPointsTracked = new Set();
        
        const trackScroll = () => {
            const scrollPercent = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100;
            
            if (scrollPercent > maxScroll) {
                maxScroll = scrollPercent;
                
                const depths = [25, 50, 75, 90, 100];
                for (const depth of depths) {
                    if (scrollPercent >= depth && !scrollPointsTracked.has(depth)) {
                        scrollPointsTracked.add(depth);
                        this.track('scroll_depth', { 
                            depth: `${depth}%`,
                            timestamp: Date.now() - this.startTime
                        });
                        
                        if (this.options.debug && depth === 100) {
                            this.showToast(`🎉 You've scrolled to the bottom!`, 'success');
                        }
                    }
                }
            }
        };
        
        // Throttle scroll events for performance
        let ticking = false;
        const throttledTrack = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    trackScroll();
                    ticking = false;
                });
                ticking = true;
            }
        };
        
        window.addEventListener('scroll', throttledTrack, { passive: true });
        
        window.addEventListener('scrollend', () => {
            this.track('scroll_end', { 
                maxDepth: Math.round(maxScroll),
                totalTime: Date.now() - this.startTime
            });
        });
    }
    
    trackSwipe(direction, element) {
        this.track('swipe', {
            direction: direction, // left, right, up, down
            element: element?.tagName,
            elementId: element?.id,
            velocity: null
        });
    }
    
    trackSearch(query, resultsCount, searchType = 'general') {
        this.track('search', {
            query: query,
            queryLength: query?.length || 0,
            resultsCount: resultsCount,
            searchType: searchType,
            hasResults: resultsCount > 0
        });
        
        // Track empty searches separately
        if (resultsCount === 0 && query && query.length > 2) {
            this.track('search_no_results', { query, searchType });
        }
    }
    
    trackFilter(category, filters, appliedCount) {
        this.track('filter', {
            category: category,
            filters: filters,
            appliedCount: appliedCount,
            timestamp: Date.now()
        });
    }
    
    trackServiceView(serviceId, serviceName, price, category) {
        this.track('service_view', {
            serviceId: serviceId,
            serviceName: serviceName,
            price: price,
            category: category,
            currency: 'BDT'
        });
        
        // Update recently viewed in localStorage
        let recentlyViewed = JSON.parse(localStorage.getItem('boostbangla_recent') || '[]');
        recentlyViewed = [{ id: serviceId, name: serviceName, timestamp: Date.now() }, ...recentlyViewed.filter(item => item.id !== serviceId)].slice(0, 10);
        localStorage.setItem('boostbangla_recent', JSON.stringify(recentlyViewed));
    }
    
    trackOrder(serviceId, serviceName, quantity, price, total, success) {
        this.track('order', { 
            serviceId: serviceId,
            serviceName: serviceName,
            quantity: quantity,
            price: price,
            total: total,
            success: success,
            currency: 'BDT',
            orderValue: total
        }, { important: true });
        
        if (success && this.options.debug) {
            this.showToast(`✅ Order placed successfully! Total: ৳${total.toLocaleString()}`, 'success');
        }
    }
    
    trackDeposit(amount, method, success) {
        this.track('deposit', {
            amount: amount,
            method: method, // bkash, nagad, rocket
            success: success,
            currency: 'BDT'
        }, { important: true });
        
        if (success && this.options.debug) {
            this.showToast(`💰 Deposit of ৳${amount.toLocaleString()} via ${method} initiated`, 'success');
        }
    }
    
    trackFavorite(serviceId, serviceName, action) {
        this.track('favorite', {
            serviceId: serviceId,
            serviceName: serviceName,
            action: action // 'add' or 'remove'
        });
    }
    
    trackError(error, context, fatal = false) {
        this.track('error', {
            message: error.message,
            stack: error.stack?.substring(0, 500),
            context: context,
            userAgent: navigator.userAgent,
            url: window.location.href,
            fatal: fatal
        }, { important: true });
        
        if (fatal && this.options.debug) {
            this.showToast(`⚠️ Error: ${error.message.substring(0, 100)}`, 'error');
        }
    }
    
    // ============================================
    // Performance Tracking (Core Web Vitals)
    // ============================================
    
    trackPerformance() {
        if (!this.options.trackPerformance) return;
        
        this.trackWebVitals();
        this.trackNavigationTiming();
        this.trackResourceTiming();
        this.trackMemoryUsage();
        this.trackLongTasks();
    }
    
    trackWebVitals() {
        if (!this.options.trackWebVitals) return;
        
        if ('PerformanceObserver' in window) {
            // Largest Contentful Paint (LCP)
            try {
                const lcpObserver = new PerformanceObserver((entryList) => {
                    const entries = entryList.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    this.track('web_vital', {
                        name: 'LCP',
                        value: Math.round(lastEntry.startTime),
                        rating: this.getWebVitalRating('LCP', lastEntry.startTime),
                        element: lastEntry.element?.tagName
                    });
                });
                lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
                
                // First Input Delay (FID)
                const fidObserver = new PerformanceObserver((entryList) => {
                    const entries = entryList.getEntries();
                    entries.forEach(entry => {
                        const delay = entry.processingStart - entry.startTime;
                        this.track('web_vital', {
                            name: 'FID',
                            value: Math.round(delay),
                            rating: this.getWebVitalRating('FID', delay)
                        });
                    });
                });
                fidObserver.observe({ type: 'first-input', buffered: true });
                
                // Cumulative Layout Shift (CLS)
                let clsValue = 0;
                const clsObserver = new PerformanceObserver((entryList) => {
                    for (const entry of entryList.getEntries()) {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                        }
                    }
                    this.track('web_vital', {
                        name: 'CLS',
                        value: parseFloat(clsValue.toFixed(3)),
                        rating: this.getWebVitalRating('CLS', clsValue)
                    });
                });
                clsObserver.observe({ type: 'layout-shift', buffered: true });
                
                // First Paint (FP) and First Contentful Paint (FCP)
                const paintObserver = new PerformanceObserver((entryList) => {
                    const entries = entryList.getEntries();
                    entries.forEach(entry => {
                        this.track('web_vital', {
                            name: entry.name,
                            value: Math.round(entry.startTime),
                            rating: entry.startTime < 1000 ? 'good' : entry.startTime < 2000 ? 'needsImprovement' : 'poor'
                        });
                    });
                });
                paintObserver.observe({ type: 'paint', buffered: true });
                
                // Time to First Byte (TTFB)
                const navObserver = new PerformanceObserver((entryList) => {
                    const entries = entryList.getEntries();
                    entries.forEach(entry => {
                        const ttfb = entry.responseStart - entry.requestStart;
                        this.track('web_vital', {
                            name: 'TTFB',
                            value: Math.round(ttfb),
                            rating: ttfb < 200 ? 'good' : ttfb < 500 ? 'needsImprovement' : 'poor'
                        });
                    });
                });
                navObserver.observe({ type: 'navigation', buffered: true });
                
            } catch (e) {
                console.warn('Web Vitals not fully supported', e);
            }
        }
    }
    
    getWebVitalRating(name, value) {
        const thresholds = {
            LCP: { good: 2500, needsImprovement: 4000 },
            FID: { good: 100, needsImprovement: 300 },
            CLS: { good: 0.1, needsImprovement: 0.25 },
            TTFB: { good: 200, needsImprovement: 500 }
        };
        
        const threshold = thresholds[name];
        if (!threshold) return 'unknown';
        
        if (value <= threshold.good) return 'good';
        if (value <= threshold.needsImprovement) return 'needsImprovement';
        return 'poor';
    }
    
    trackNavigationTiming() {
        if (!window.performance || !window.performance.timing) return;
        
        const timing = window.performance.timing;
        const navigationStart = timing.navigationStart;
        
        const metrics = {
            dns: timing.domainLookupEnd - timing.domainLookupStart,
            tcp: timing.connectEnd - timing.connectStart,
            request: timing.responseStart - timing.requestStart,
            response: timing.responseEnd - timing.responseStart,
            dom: timing.domContentLoadedEventEnd - timing.navigationStart,
            load: timing.loadEventEnd - timing.navigationStart,
            ttfb: timing.responseStart - timing.navigationStart,
            domInteractive: timing.domInteractive - timing.navigationStart
        };
        
        this.track('navigation_timing', metrics);
        
        // Store in session for debugging
        sessionStorage.setItem('boostbangla_nav_timing', JSON.stringify(metrics));
    }
    
    trackResourceTiming() {
        if (!window.performance || !window.performance.getEntriesByType) return;
        
        const resources = window.performance.getEntriesByType('resource');
        const slowResources = resources.filter(r => r.duration > 1000);
        const largeResources = resources.filter(r => (r.transferSize || 0) > 500000);
        
        if (slowResources.length > 0) {
            this.track('slow_resources', {
                count: slowResources.length,
                resources: slowResources.slice(0, 10).map(r => ({
                    name: r.name.split('/').pop(),
                    duration: Math.round(r.duration),
                    size: r.transferSize
                }))
            });
        }
        
        if (largeResources.length > 0 && this.options.debug) {
            console.warn(`Large resources detected: ${largeResources.length} files > 500KB`);
        }
    }
    
    trackLongTasks() {
        if ('PerformanceObserver' in window) {
            try {
                const longTaskObserver = new PerformanceObserver((entryList) => {
                    const entries = entryList.getEntries();
                    entries.forEach(entry => {
                        if (entry.duration > 50) {
                            this.track('long_task', {
                                duration: Math.round(entry.duration),
                                startTime: Math.round(entry.startTime),
                                name: entry.name,
                                attribution: entry.attribution?.[0]?.name
                            });
                        }
                    });
                });
                longTaskObserver.observe({ type: 'longtask', buffered: true });
            } catch (e) {
                // Long task API not supported
            }
        }
    }
    
    trackMemoryUsage() {
        if ('memory' in performance) {
            const trackMemory = () => {
                const memory = performance.memory;
                this.track('memory_usage', {
                    usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1048576), // MB
                    totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1048576),
                    jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1048576),
                    percentUsed: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
                });
            };
            
            // Track initial memory
            trackMemory();
            
            // Track every 60 seconds
            setInterval(trackMemory, 60000);
        }
    }
    
    // ============================================
    // User Engagement Tracking
    // ============================================
    
    trackTimeOnPage() {
        const startTime = Date.now();
        let lastActivityTime = startTime;
        let idleTime = 0;
        
        // Track activity
        const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
        const updateActivity = () => {
            const now = Date.now();
            idleTime += now - lastActivityTime;
            lastActivityTime = now;
        };
        
        activityEvents.forEach(event => {
            window.addEventListener(event, updateActivity);
        });
        
        window.addEventListener('beforeunload', () => {
            const totalTime = Date.now() - startTime;
            const activeTime = totalTime - idleTime;
            
            this.track('time_on_page', {
                totalSeconds: Math.round(totalTime / 1000),
                activeSeconds: Math.round(activeTime / 1000),
                idleSeconds: Math.round(idleTime / 1000),
                engagement: Math.round((activeTime / totalTime) * 100),
                path: window.location.pathname
            });
        });
    }
    
    trackElementVisibility(elements, elementName, threshold = 0.5) {
        if (!elements || elements.length === 0) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.track('element_view', {
                        element: elementName,
                        timestamp: Date.now(),
                        viewportPercentage: Math.round(entry.intersectionRatio * 100)
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: threshold });
        
        elements.forEach(el => observer.observe(el));
    }
    
    trackFormInteraction(formId, fieldName, action, value = null) {
        this.track('form_interaction', {
            formId: formId,
            fieldName: fieldName,
            action: action, // focus, blur, change, submit
            valueLength: value?.length,
            hasValue: !!value
        });
    }
    
    trackFormSubmission(formId, success, validationErrors = []) {
        this.track('form_submission', {
            formId: formId,
            success: success,
            validationErrors: validationErrors,
            errorCount: validationErrors.length
        }, { important: true });
    }
    
    // ============================================
    // Heatmap Support (Touch-Optimized)
    // ============================================
    
    setupHeatmap() {
        if (!this.options.enableHeatmap) return;
        
        let touchPoints = [];
        let clickPoints = [];
        
        // Track clicks (mouse)
        document.addEventListener('click', (e) => {
            const rect = e.target.getBoundingClientRect();
            clickPoints.push({
                x: e.clientX / window.innerWidth,
                y: e.clientY / window.innerHeight,
                element: e.target.tagName,
                timestamp: Date.now()
            });
            
            this.track('click_position', {
                x: e.clientX / window.innerWidth,
                y: e.clientY / window.innerHeight,
                element: e.target.tagName,
                elementId: e.target.id,
                elementClass: e.target.className,
                path: window.location.pathname,
                clickType: 'mouse'
            });
        });
        
        // Track touches (mobile)
        document.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            const rect = e.target.getBoundingClientRect();
            touchPoints.push({
                x: touch.clientX / window.innerWidth,
                y: touch.clientY / window.innerHeight,
                element: e.target.tagName,
                timestamp: Date.now()
            });
            
            this.track('click_position', {
                x: touch.clientX / window.innerWidth,
                y: touch.clientY / window.innerHeight,
                element: e.target.tagName,
                elementId: e.target.id,
                elementClass: e.target.className,
                path: window.location.pathname,
                clickType: 'touch',
                force: touch.force
            });
        });
        
        // Flush heatmap data periodically
        setInterval(() => {
            if (clickPoints.length > 0) {
                this.track('heatmap_batch', {
                    clicks: clickPoints.slice(-50),
                    touches: touchPoints.slice(-50),
                    page: window.location.pathname,
                    viewport: `${window.innerWidth}x${window.innerHeight}`
                });
                clickPoints = [];
                touchPoints = [];
            }
        }, 30000);
    }
    
    // ============================================
    // Session Recording (Optional)
    // ============================================
    
    startSessionRecording() {
        if (!this.options.enableSessionRecording) return;
        
        let events = [];
        let recordingStart = Date.now();
        
        const recordEvent = (type, data) => {
            events.push({
                type: type,
                data: data,
                timestamp: Date.now() - recordingStart
            });
            
            // Send events every 100 events or 30 seconds
            if (events.length >= 100) {
                this.sendSessionRecording(events);
                events = [];
            }
        };
        
        // Record DOM mutations
        const observer = new MutationObserver((mutations) => {
            recordEvent('mutation', {
                count: mutations.length,
                types: [...new Set(mutations.map(m => m.type))]
            });
        });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true });
        
        // Record scroll events (throttled)
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const now = Date.now();
            if (now - lastScroll > 100) {
                lastScroll = now;
                recordEvent('scroll', {
                    y: window.scrollY,
                    maxY: document.documentElement.scrollHeight - window.innerHeight
                });
            }
        });
        
        // Send recording every 30 seconds
        setInterval(() => {
            if (events.length > 0) {
                this.sendSessionRecording(events);
                events = [];
            }
        }, 30000);
        
        // Send on page unload
        window.addEventListener('beforeunload', () => {
            if (events.length > 0) {
                this.sendSessionRecording(events);
            }
        });
    }
    
    sendSessionRecording(events) {
        this.track('session_recording', {
            events: events.slice(-200),
            duration: Date.now() - this.startTime,
            eventCount: events.length
        });
    }
    
    // ============================================
    // Custom User Properties
    // ============================================
    
    identify(userId, traits = {}) {
        this.userId = userId;
        this.track('identify', {
            userId: userId,
            traits: traits,
            previousUserId: this.userId !== userId ? this.userId : null
        });
        
        // Store user traits
        localStorage.setItem('boostbangla_user_traits', JSON.stringify(traits));
        
        if (this.options.debug) {
            this.showToast(`👤 User identified: ${userId.substring(0, 8)}...`, 'success');
        }
    }
    
    setUserProperty(key, value) {
        this.track('set_user_property', {
            key: key,
            value: value,
            previousValue: localStorage.getItem(`boostbangla_prop_${key}`)
        });
        
        localStorage.setItem(`boostbangla_prop_${key}`, JSON.stringify(value));
    }
    
    // ============================================
    // Event Queue Management
    // ============================================
    
    async flush() {
        if (this.eventQueue.length === 0) return;
        
        const events = [...this.eventQueue];
        this.eventQueue = [];
        
        try {
            await this.sendEvents(events);
            if (this.options.debug) {
                console.log(`📊 Flushed ${events.length} events to analytics`);
            }
        } catch (error) {
            console.error('Failed to send analytics:', error);
            // Re-queue events
            this.eventQueue.unshift(...events);
            
            // Limit queue size
            if (this.eventQueue.length > this.options.maxQueueSize) {
                this.eventQueue = this.eventQueue.slice(-this.options.maxQueueSize);
            }
        }
    }
    
    async sendEvents(events) {
        // Store in localStorage for development/debugging
        if (this.options.debug) {
            const storedEvents = JSON.parse(localStorage.getItem('boostbangla_analytics_events') || '[]');
            storedEvents.push(...events);
            // Keep last 500 events
            localStorage.setItem('boostbangla_analytics_events', JSON.stringify(storedEvents.slice(-500)));
        }
        
        // API endpoint for analytics
        if (this.options.endpoint && this.options.endpoint !== '/api/analytics') {
            const response = await fetch(this.options.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    events: events,
                    sessionId: this.sessionId,
                    userId: this.userId,
                    timestamp: Date.now(),
                    appVersion: '3.0.0'
                })
            });
            
            if (!response.ok) throw new Error('Failed to send events');
            return response.json();
        }
        
        return { success: true, eventsProcessed: events.length };
    }
    
    startFlushTimer() {
        this.flushTimer = setInterval(() => {
            this.flush();
        }, this.options.flushInterval);
    }
    
    setupBeforeUnload() {
        window.addEventListener('beforeunload', () => {
            this.flush();
        });
    }
    
    setupVisibilityTracking() {
        document.addEventListener('visibilitychange', () => {
            this.track('visibility_change', {
                hidden: document.hidden,
                state: document.visibilityState
            });
        });
    }
    
    // ============================================
    // Analytics Dashboard Integration
    // ============================================
    
    getStats() {
        return {
            sessionId: this.sessionId,
            userId: this.userId,
            eventsQueued: this.eventQueue.length,
            sessionDuration: Date.now() - this.startTime,
            pageViews: this.pageViewCount,
            sessionEvents: this.sessionEvents.length,
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            darkMode: document.body.classList.contains('dark-mode'),
            isOnline: navigator.onLine,
            memoryUsage: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null
        };
    }
    
    showStatsPanel() {
        const existingPanel = document.querySelector('.analytics-stats-panel');
        if (existingPanel) {
            existingPanel.remove();
            return;
        }
        
        const panel = document.createElement('div');
        panel.className = 'analytics-stats-panel';
        panel.innerHTML = `
            <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                <div>📊 <span>${this.pageViewCount}</span> views</div>
                <div>⏱️ <span>${Math.round((Date.now() - this.startTime) / 1000)}s</span></div>
                <div>📦 <span>${this.eventQueue.length}</span> queued</div>
                <div>🖥️ <span>${window.innerWidth}x${window.innerHeight}</span></div>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (panel.parentElement) {
                panel.style.opacity = '0';
                setTimeout(() => panel.remove(), 300);
            }
        }, 10000);
    }
    
    // ============================================
    // A/B Testing Support
    // ============================================
    
    getVariant(testName, variants = ['A', 'B']) {
        const storedVariant = localStorage.getItem(`boostbangla_ab_test_${testName}`);
        if (storedVariant && variants.includes(storedVariant)) {
            return storedVariant;
        }
        
        // Random assignment
        const variant = variants[Math.floor(Math.random() * variants.length)];
        localStorage.setItem(`boostbangla_ab_test_${testName}`, variant);
        
        this.track('ab_test_assignment', {
            test: testName,
            variant: variant,
            totalVariants: variants.length
        });
        
        return variant;
    }
    
    applyVariantStyles(testName, styles) {
        const variant = this.getVariant(testName, Object.keys(styles));
        const styleElement = document.createElement('style');
        styleElement.textContent = styles[variant];
        document.head.appendChild(styleElement);
        
        this.track('ab_test_applied', {
            test: testName,
            variant: variant
        });
        
        return variant;
    }
    
    // ============================================
    // Funnel Tracking
    // ============================================
    
    startFunnel(funnelName, metadata = {}) {
        sessionStorage.setItem(`boostbangla_funnel_${funnelName}_start`, Date.now());
        sessionStorage.setItem(`boostbangla_funnel_${funnelName}_steps`, JSON.stringify([]));
        
        this.track('funnel_start', { 
            funnel: funnelName,
            ...metadata
        });
        
        if (this.options.debug) {
            this.showToast(`🎯 Started funnel: ${funnelName}`, 'info');
        }
    }
    
    trackFunnelStep(funnelName, stepName, stepNumber, metadata = {}) {
        const startTime = sessionStorage.getItem(`boostbangla_funnel_${funnelName}_start`);
        const timeToStep = startTime ? Date.now() - parseInt(startTime) : null;
        
        // Store step
        const steps = JSON.parse(sessionStorage.getItem(`boostbangla_funnel_${funnelName}_steps`) || '[]');
        steps.push({ step: stepName, stepNumber, timestamp: Date.now(), timeToStep });
        sessionStorage.setItem(`boostbangla_funnel_${funnelName}_steps`, JSON.stringify(steps));
        
        this.track('funnel_step', {
            funnel: funnelName,
            step: stepName,
            stepNumber: stepNumber,
            timeToStep: timeToStep,
            ...metadata
        });
        
        if (this.options.debug) {
            console.log(`📍 Funnel ${funnelName}: Step ${stepNumber} - ${stepName}`);
        }
    }
    
    completeFunnel(funnelName, metadata = {}) {
        const startTime = sessionStorage.getItem(`boostbangla_funnel_${funnelName}_start`);
        const totalTime = startTime ? Date.now() - parseInt(startTime) : null;
        const steps = JSON.parse(sessionStorage.getItem(`boostbangla_funnel_${funnelName}_steps`) || '[]');
        
        this.track('funnel_complete', {
            funnel: funnelName,
            totalTime: totalTime,
            stepsCompleted: steps.length,
            ...metadata
        });
        
        // Clear funnel data
        sessionStorage.removeItem(`boostbangla_funnel_${funnelName}_start`);
        sessionStorage.removeItem(`boostbangla_funnel_${funnelName}_steps`);
        
        if (this.options.debug) {
            this.showToast(`🏁 Completed funnel: ${funnelName} in ${Math.round(totalTime / 1000)}s`, 'success');
        }
    }
    
    abandonFunnel(funnelName, stepAtAbandon, reason = null) {
        const startTime = sessionStorage.getItem(`boostbangla_funnel_${funnelName}_start`);
        const totalTime = startTime ? Date.now() - parseInt(startTime) : null;
        const steps = JSON.parse(sessionStorage.getItem(`boostbangla_funnel_${funnelName}_steps`) || '[]');
        
        this.track('funnel_abandon', {
            funnel: funnelName,
            totalTime: totalTime,
            stepsCompleted: steps.length,
            abandonedAtStep: stepAtAbandon,
            reason: reason
        });
        
        // Clear funnel data
        sessionStorage.removeItem(`boostbangla_funnel_${funnelName}_start`);
        sessionStorage.removeItem(`boostbangla_funnel_${funnelName}_steps`);
        
        if (this.options.debug && reason) {
            this.showToast(`❌ Abandoned funnel: ${funnelName} at step ${stepAtAbandon}`, 'warning');
        }
    }
    
    // ============================================
    // Revenue & Conversion Tracking
    // ============================================
    
    trackConversion(conversionType, value, metadata = {}) {
        this.track('conversion', {
            type: conversionType, // order, deposit, signup, etc.
            value: value,
            currency: 'BDT',
            ...metadata
        }, { important: true });
        
        // Update conversion counter
        const conversions = JSON.parse(localStorage.getItem('boostbangla_conversions') || '[]');
        conversions.push({
            type: conversionType,
            value: value,
            timestamp: Date.now()
        });
        localStorage.setItem('boostbangla_conversions', JSON.stringify(conversions.slice(-50)));
        
        if (this.options.debug) {
            this.showToast(`🎉 Conversion: ${conversionType} - ৳${value?.toLocaleString()}`, 'success');
        }
    }
    
    trackRevenue(amount, source, metadata = {}) {
        this.track('revenue', {
            amount: amount,
            source: source, // order, deposit, subscription
            currency: 'BDT',
            ...metadata
        }, { important: true });
        
        // Update total revenue
        let totalRevenue = parseFloat(localStorage.getItem('boostbangla_total_revenue') || '0');
        totalRevenue += amount;
        localStorage.setItem('boostbangla_total_revenue', totalRevenue.toString());
    }
    
    // ============================================
    // Cleanup
    // ============================================
    
    destroy() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        this.flush();
        
        if (this.options.debug) {
            console.log('📊 Analytics destroyed');
        }
    }
}

// ============================================
// Singleton Instance with Design System
// ============================================

let analyticsInstance = null;

function getAnalytics() {
    if (!analyticsInstance) {
        analyticsInstance = new Analytics({
            endpoint: window.analyticsEndpoint || '/api/analytics',
            debug: window.location.hostname === 'localhost' || window.location.hostname.includes('cpanel.site'),
            trackPerformance: true,
            trackErrors: true,
            trackUserInteractions: true,
            trackWebVitals: true,
            enableHeatmap: true,
            enableSessionRecording: false
        });
    }
    return analyticsInstance;
}

// ============================================
// Auto-initialize with Design System
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const analytics = getAnalytics();
    
    // Track scroll depth
    analytics.trackScrollDepth();
    
    // Track time on page
    analytics.trackTimeOnPage();
    
    // Setup heatmap tracking
    if (analytics.options.enableHeatmap) {
        analytics.setupHeatmap();
    }
    
    // Track all external links
    document.querySelectorAll('a[target="_blank"], a[href^="http"]').forEach(link => {
        link.addEventListener('click', (e) => {
            analytics.trackClick(e.target, 'external_link');
        });
    });
    
    // Track all forms
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', (e) => {
            const isValid = form.checkValidity();
            analytics.trackFormSubmission(form.id || 'unknown', isValid);
        });
        
        form.querySelectorAll('input, select, textarea').forEach(field => {
            field.addEventListener('focus', () => {
                analytics.trackFormInteraction(form.id || 'unknown', field.name || field.id, 'focus');
            });
            
            field.addEventListener('blur', () => {
                if (field.value) {
                    analytics.trackFormInteraction(form.id || 'unknown', field.name || field.id, 'change', field.value);
                }
            });
        });
    });
    
    // Show stats panel with Alt+Shift+A
    window.addEventListener('keydown', (e) => {
        if (e.altKey && e.shiftKey && e.key === 'A') {
            analytics.showStatsPanel();
        }
    });
    
    if (analytics.options.debug) {
        console.log('📊 BoostBangla Analytics v3.0 Ready');
        console.log('💡 Tip: Press Alt+Shift+A to show analytics panel');
    }
});

// ============================================
// Exports
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Analytics, getAnalytics };
}

// Make available globally
window.Analytics = Analytics;
window.getAnalytics = getAnalytics;

console.log('✅ BoostBangla Analytics v3.0 loaded - Design System Ready');