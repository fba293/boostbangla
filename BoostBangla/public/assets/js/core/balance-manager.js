// ============================================
// Global Balance Manager
// Real-time balance updates across all pages
// ============================================

const BALANCE_MANAGER = {
    userId: null,
    balance: 0,
    updateInterval: 5000, // 5 seconds
    listeners: [],
    initialized: false,
    refreshTimer: null,
    
    /**
     * Initialize balance manager
     */
    async init() {
        if (this.initialized) {
            await this.refresh();
            return;
        }

        // Get user ID from Firebase or localStorage
        await this.identifyUser();
        
        if (!this.userId) {
            // Retry if user not identified
            setTimeout(() => this.init(), 1000);
            return;
        }
        
        // Load balance immediately
        await this.loadBalance();
        
        // Start auto-refresh
        this.refreshTimer = setInterval(() => this.loadBalance(), this.updateInterval);
        
        // Listen for balance changes from order placements
        if (window.addEventListener) {
            window.addEventListener('order:placed', () => {
                this.loadBalance();
            });
            window.addEventListener('balance:updated', () => {
                this.loadBalance();
            });
        }
        
        this.initialized = true;
        console.log('Balance Manager initialized');
    },
    
    /**
     * Identify the current user
     */
    async identifyUser() {
        // Try Firebase first
        if (typeof firebase !== 'undefined' && firebase.auth) {
            const user = firebase.auth().currentUser;
            if (user) {
                this.userId = user.uid;
                return;
            }

            await new Promise((resolve) => {
                const timeout = setTimeout(resolve, 1500);
                try {
                    firebase.auth().onAuthStateChanged((authUser) => {
                        if (authUser) this.userId = authUser.uid;
                        clearTimeout(timeout);
                        resolve();
                    });
                } catch (error) {
                    clearTimeout(timeout);
                    resolve();
                }
            });

            if (this.userId) return;
        }
        
        // Try localStorage
        const storedUserId = localStorage.getItem('userId');
        if (storedUserId) {
            this.userId = storedUserId;
            return;
        }
        
        // Try sessionStorage
        const sessionUserId = sessionStorage.getItem('userId');
        if (sessionUserId) {
            this.userId = sessionUserId;
            return;
        }
    },
    
    /**
     * Load balance from backend
     */
    async loadBalance() {
        if (!this.userId) {
            await this.identifyUser();
            if (!this.userId) return;
        }
        
        try {
            const response = await fetch(
                `/public/php/api-proxy.php?action=get_balance&user_id=${encodeURIComponent(this.userId)}`
            );
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const result = await response.json();
            let newBalance = Number(result.balance || 0);

            if (!result.wallet_exists && newBalance === 0) {
                const firebaseBalance = await this.loadFirestoreBalance();
                if (firebaseBalance !== null) {
                    newBalance = firebaseBalance;
                }
            }
            
            // If balance changed, notify listeners
            if (newBalance !== this.balance) {
                this.balance = newBalance;
                this.notifyListeners();
            } else {
                this.updateDOMElements();
            }
            
        } catch (error) {
            console.error('Balance load error:', error);
            const firebaseBalance = await this.loadFirestoreBalance();
            if (firebaseBalance !== null) {
                this.balance = firebaseBalance;
                this.notifyListeners();
            }
        }
    },

    async loadFirestoreBalance() {
        try {
            if (typeof firebase === 'undefined' || !firebase.firestore || !this.userId) return null;
            const doc = await firebase.firestore().collection('users').doc(this.userId).get();
            if (!doc.exists) return null;
            return Number(doc.data()?.balance || 0);
        } catch (error) {
            console.warn('Firestore balance fallback failed:', error);
            return null;
        }
    },
    
    /**
     * Register listener for balance changes
     */
    onChange(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
        }
    },
    
    /**
     * Notify all listeners of balance change
     */
    notifyListeners() {
        this.listeners.forEach(callback => {
            try {
                callback(this.balance);
            } catch (error) {
                console.error('Balance listener error:', error);
            }
        });
        
        // Update DOM elements
        this.updateDOMElements();
    },
    
    /**
     * Update all balance display elements
     */
    updateDOMElements() {
        // Update header balance
        const headerBalance = document.getElementById('headerBalanceValue');
        if (headerBalance) {
            this.animateValue(headerBalance, parseInt(headerBalance.textContent.replace(/,/g, '')) || 0, this.balance);
        }
        
        // Update sidebar balance
        const sidebarBalance = document.getElementById('sidebarUserBalance');
        if (sidebarBalance) {
            this.animateValue(sidebarBalance, parseInt(sidebarBalance.textContent.replace(/,/g, '')) || 0, this.balance);
        }
        
        // Update USD display
        const usdDisplay = document.getElementById('sidebarBalanceUSD');
        if (usdDisplay) {
            usdDisplay.textContent = `≈ $${(this.balance / (window.CURRENT_USD_BDT_RATE || 120)).toFixed(2)} USD`;
        }
        
        // Update any custom balance displays
        document.querySelectorAll('[data-balance-display]').forEach(el => {
            this.animateValue(el, parseInt(el.textContent.replace(/,/g, '')) || 0, this.balance);
        });
    },
    
    /**
     * Animate value change
     */
    animateValue(element, start, end) {
        if (!element) return;
        
        const duration = 600;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(start + (end - start) * easeOutCubic);
            
            element.textContent = current.toLocaleString();
            element.classList.add('balance-updating');
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = end.toLocaleString();
                setTimeout(() => element.classList.remove('balance-updating'), 300);
            }
        };
        
        requestAnimationFrame(animate);
    },
    
    /**
     * Get current balance
     */
    getBalance() {
        return this.balance;
    },
    
    /**
     * Force immediate balance reload
     */
    async refresh() {
        await this.loadBalance();
    }
};

// Export to window
window.BALANCE_MANAGER = BALANCE_MANAGER;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => BALANCE_MANAGER.init());
} else {
    BALANCE_MANAGER.init();
}

console.log('✅ Balance Manager script loaded');
