// ============================================
// Offline Support - BoostBangla Design System v3.0
// Handles: Offline detection, caching, sync queue, beautiful banners
// Version: 3.0 - DESIGN SYSTEM COMPLIANT
// ============================================

let isOffline = false;
let offlineBanner = null;
let pendingSyncQueue = [];
let syncInProgress = false;
let connectionQuality = 'good';
let syncQueueToast = null;

// ============================================
// INITIALIZE OFFLINE SYSTEM
// ============================================
function initOfflineSupport() {
    console.log('📡 Initializing offline support v3.0...');
    checkOnlineStatus();
    setupNetworkListeners();
    createOfflineBanner();
    loadPendingSyncQueue();
    setupServiceWorker();
    startConnectionQualityMonitoring();
    injectDesignSystemStyles();
}

// ============================================
// INJECT DESIGN SYSTEM STYLES
// ============================================
function injectDesignSystemStyles() {
    const styleId = 'boostbangla-offline-styles';
    if (document.getElementById(styleId)) return;
    
    const styles = `
        /* Offline Banner - Design System Compliant */
        .offline-banner {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
            text-align: center;
            padding: 14px 20px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            transform: translateY(-100%);
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            flex-wrap: wrap;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        
        .offline-banner i {
            font-size: 18px;
            animation: pulse 1.5s ease-in-out infinite;
        }
        
        .offline-retry-btn {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.4);
            color: white;
            padding: 6px 16px;
            border-radius: 60px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .offline-retry-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.02);
        }
        
        /* Sync Progress Toast - Glass morphism */
        .sync-progress-toast {
            position: fixed;
            bottom: 90px;
            right: 24px;
            background: rgba(30, 41, 59, 0.95);
            backdrop-filter: blur(12px);
            color: white;
            padding: 12px 20px;
            border-radius: 60px;
            font-size: 13px;
            font-weight: 500;
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.1);
            animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .sync-progress-toast i {
            color: #FF6B00;
        }
        
        /* Connection Quality Indicator */
        .connection-quality-badge {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(8px);
            padding: 6px 12px;
            border-radius: 60px;
            font-size: 10px;
            font-weight: 600;
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 6px;
            pointer-events: none;
            transition: all 0.3s ease;
        }
        
        .connection-quality-badge.excellent { background: #10b981; }
        .connection-quality-badge.good { background: #3b82f6; }
        .connection-quality-badge.poor { background: #f59e0b; }
        .connection-quality-badge.bad { background: #ef4444; }
        .connection-quality-badge.offline { background: #6b7280; }
        
        /* Mobile adjustments */
        @media (max-width: 768px) {
            .offline-banner {
                padding: 12px 16px;
                font-size: 12px;
                gap: 10px;
            }
            
            .offline-retry-btn {
                padding: 4px 12px;
                font-size: 11px;
            }
            
            .sync-progress-toast {
                bottom: 80px;
                right: 16px;
                left: 16px;
                border-radius: 16px;
                justify-content: center;
            }
            
            .connection-quality-badge {
                bottom: 80px;
                right: 16px;
            }
        }
        
        /* Animations */
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
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
        
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        .fa-spin-custom {
            animation: spin 1s linear infinite;
        }
        
        /* Dark mode */
        body.dark-mode .sync-progress-toast {
            background: rgba(15, 23, 42, 0.95);
            border-color: rgba(255, 107, 0, 0.2);
        }
        
        body.dark-mode .connection-quality-badge:not(.excellent):not(.good):not(.poor):not(.bad) {
            background: #1f2937;
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// ============================================
// CHECK ONLINE STATUS
// ============================================
function checkOnlineStatus() {
    isOffline = !navigator.onLine;
    
    if (isOffline) {
        showOfflineBanner();
        document.body.classList.add('offline-mode');
        if (window.showToast) {
            window.showToast('You are offline. Using cached data.', 'warning', 4000);
        }
    } else {
        hideOfflineBanner();
        document.body.classList.remove('offline-mode');
        if (pendingSyncQueue.length > 0) {
            if (window.showToast) window.showToast('Back online! Syncing data...', 'success', 3000);
            processSyncQueue();
        } else {
            if (window.showToast) window.showToast('Back online!', 'success', 2000);
        }
        refreshCachedData();
    }
    
    return !isOffline;
}

// ============================================
// START CONNECTION QUALITY MONITORING
// ============================================
function startConnectionQualityMonitoring() {
    // Check quality every 30 seconds
    setInterval(async () => {
        if (navigator.onLine) {
            const quality = await checkConnectionQuality();
            connectionQuality = quality;
            updateConnectionQualityBadge(quality);
        } else {
            connectionQuality = 'offline';
            updateConnectionQualityBadge('offline');
        }
    }, 30000);
    
    // Initial check
    checkConnectionQuality().then(quality => {
        connectionQuality = quality;
        createConnectionQualityBadge();
        updateConnectionQualityBadge(quality);
    });
}

// ============================================
// CREATE CONNECTION QUALITY BADGE
// ============================================
function createConnectionQualityBadge() {
    let badge = document.querySelector('.connection-quality-badge');
    if (badge) return;
    
    badge = document.createElement('div');
    badge.className = 'connection-quality-badge';
    badge.innerHTML = '<i class="fas fa-wifi"></i> <span>Connected</span>';
    document.body.appendChild(badge);
}

function updateConnectionQualityBadge(quality) {
    const badge = document.querySelector('.connection-quality-badge');
    if (!badge) return;
    
    badge.className = `connection-quality-badge ${quality}`;
    
    const qualityNames = {
        excellent: 'Excellent',
        good: 'Good',
        poor: 'Poor',
        bad: 'Slow',
        offline: 'Offline'
    };
    
    const icons = {
        excellent: '<i class="fas fa-wifi"></i>',
        good: '<i class="fas fa-wifi"></i>',
        poor: '<i class="fas fa-exclamation-triangle"></i>',
        bad: '<i class="fas fa-tachometer-alt"></i>',
        offline: '<i class="fas fa-plug"></i>'
    };
    
    badge.innerHTML = `${icons[quality]} <span>${qualityNames[quality]}</span>`;
    
    // Auto hide after 3 seconds on mobile (to save space)
    if (window.innerWidth <= 768) {
        badge.style.opacity = '1';
        clearTimeout(window.badgeTimeout);
        window.badgeTimeout = setTimeout(() => {
            if (badge) badge.style.opacity = '0';
        }, 3000);
        
        setTimeout(() => {
            if (badge) badge.style.opacity = '1';
        }, 100);
    }
}

// ============================================
// SETUP NETWORK LISTENERS
// ============================================
function setupNetworkListeners() {
    window.addEventListener('online', () => {
        console.log('🌐 Network online');
        isOffline = false;
        hideOfflineBanner();
        document.body.classList.remove('offline-mode');
        
        if (window.showToast) {
            window.showToast('Back online! Syncing data...', 'success', 3000);
        }
        
        processSyncQueue();
        refreshCachedData();
        
        // Dispatch custom event for other modules
        window.dispatchEvent(new CustomEvent('app:online'));
    });
    
    window.addEventListener('offline', () => {
        console.log('📡 Network offline');
        isOffline = true;
        showOfflineBanner();
        document.body.classList.add('offline-mode');
        
        if (window.showToast) {
            window.showToast('You are offline. Changes will sync when back online.', 'warning', 5000);
        }
        
        window.dispatchEvent(new CustomEvent('app:offline'));
    });
}

// ============================================
// CREATE OFFLINE BANNER
// ============================================
function createOfflineBanner() {
    if (offlineBanner) return;
    
    offlineBanner = document.createElement('div');
    offlineBanner.id = 'offlineBanner';
    offlineBanner.className = 'offline-banner';
    offlineBanner.innerHTML = `
        <i class="fas fa-wifi"></i>
        <span><strong>You are offline</strong> — Some features may be unavailable. Changes will sync automatically.</span>
        <button id="retryConnectionBtn" class="offline-retry-btn">
            <i class="fas fa-sync-alt"></i> Retry
        </button>
    `;
    document.body.appendChild(offlineBanner);
    
    const retryBtn = document.getElementById('retryConnectionBtn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            if (window.showToast) window.showToast('Checking connection...', 'info', 1500);
            checkOnlineStatus();
            window.location.reload();
        });
    }
}

// ============================================
// SHOW/HIDE OFFLINE BANNER
// ============================================
function showOfflineBanner() {
    if (offlineBanner) {
        offlineBanner.style.transform = 'translateY(0)';
    }
}

function hideOfflineBanner() {
    if (offlineBanner) {
        offlineBanner.style.transform = 'translateY(-100%)';
    }
}

// ============================================
// ADD TO SYNC QUEUE
// ============================================
async function addToSyncQueue(action, data, priority = false) {
    const syncItem = {
        id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        action: action,
        data: data,
        timestamp: Date.now(),
        retryCount: 0,
        priority: priority
    };
    
    if (priority) {
        pendingSyncQueue.unshift(syncItem);
    } else {
        pendingSyncQueue.push(syncItem);
    }
    
    await saveSyncQueue();
    
    if (!isOffline) {
        processSyncQueue();
    } else {
        // Show queued notification
        if (window.showToast && pendingSyncQueue.length === 1) {
            window.showToast(`Changes saved offline. Will sync when online.`, 'info', 3000);
        }
    }
    
    return syncItem.id;
}

// ============================================
// SAVE/LOAD SYNC QUEUE
// ============================================
async function saveSyncQueue() {
    try {
        localStorage.setItem('boostbangla_syncQueue', JSON.stringify(pendingSyncQueue));
    } catch (e) {
        console.error('Failed to save sync queue:', e);
    }
}

function loadPendingSyncQueue() {
    const saved = localStorage.getItem('boostbangla_syncQueue');
    if (saved) {
        try {
            pendingSyncQueue = JSON.parse(saved);
            console.log(`📋 Loaded ${pendingSyncQueue.length} pending sync items`);
        } catch (e) {
            pendingSyncQueue = [];
        }
    }
}

// ============================================
// PROCESS SYNC QUEUE
// ============================================
async function processSyncQueue() {
    if (syncInProgress) return;
    if (isOffline) return;
    if (pendingSyncQueue.length === 0) return;
    
    syncInProgress = true;
    showSyncProgress();
    
    for (let i = 0; i < pendingSyncQueue.length; i++) {
        const item = pendingSyncQueue[i];
        
        try {
            await processSyncItem(item);
            pendingSyncQueue.splice(i, 1);
            i--;
            await saveSyncQueue();
            updateSyncProgress(pendingSyncQueue.length);
        } catch (error) {
            console.error(`Sync failed for ${item.action}:`, error);
            item.retryCount++;
            
            if (item.retryCount >= 5) {
                pendingSyncQueue.splice(i, 1);
                i--;
                await saveSyncQueue();
                console.error('Sync failed permanently:', item);
                
                if (window.showToast) {
                    window.showToast(`Failed to sync ${item.action}. Please try again later.`, 'error', 4000);
                }
            } else {
                // Exponential backoff
                const delay = Math.min(1000 * Math.pow(2, item.retryCount), 30000);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    syncInProgress = false;
    hideSyncProgress();
    
    if (pendingSyncQueue.length === 0) {
        if (window.showToast) window.showToast('All data synced successfully!', 'success', 3000);
        window.dispatchEvent(new CustomEvent('app:syncComplete'));
    }
}

// ============================================
// PROCESS SYNC ITEM
// ============================================
async function processSyncItem(item) {
    switch (item.action) {
        case 'order':
            return await syncOrder(item.data);
        case 'deposit':
            return await syncDeposit(item.data);
        case 'ticket':
            return await syncTicket(item.data);
        case 'profile':
            return await syncProfile(item.data);
        case 'withdrawal':
            return await syncWithdrawal(item.data);
        default:
            console.warn('Unknown sync action:', item.action);
            throw new Error(`Unknown action: ${item.action}`);
    }
}

// ============================================
// SYNC HANDLERS
// ============================================
async function syncOrder(orderData) {
    const response = await fetch('/public/php/api-proxy.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'add',
            ...orderData
        })
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

async function syncDeposit(depositData) {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Not authenticated');
    
    const db = firebase.firestore();
    await db.collection('deposits').add({
        ...depositData,
        userId: user.uid,
        syncedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

async function syncTicket(ticketData) {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Not authenticated');
    
    const db = firebase.firestore();
    await db.collection('tickets').add({
        ...ticketData,
        userId: user.uid,
        syncedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

async function syncProfile(profileData) {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Not authenticated');
    
    const db = firebase.firestore();
    await db.collection('users').doc(user.uid).update(profileData);
}

async function syncWithdrawal(withdrawalData) {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Not authenticated');
    
    const response = await fetch('/public/php/api-proxy.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'withdrawal',
            ...withdrawalData,
            userId: user.uid
        })
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

// ============================================
// SYNC PROGRESS UI
// ============================================
function showSyncProgress() {
    if (syncQueueToast) return;
    
    syncQueueToast = document.createElement('div');
    syncQueueToast.className = 'sync-progress-toast';
    syncQueueToast.innerHTML = `
        <i class="fas fa-sync-alt fa-spin-custom"></i>
        <span>Syncing <strong id="syncRemaining">${pendingSyncQueue.length}</strong> item${pendingSyncQueue.length !== 1 ? 's' : ''}...</span>
    `;
    document.body.appendChild(syncQueueToast);
}

function updateSyncProgress(remaining) {
    const remainingSpan = document.getElementById('syncRemaining');
    if (remainingSpan) {
        remainingSpan.textContent = remaining;
    }
    
    if (syncQueueToast) {
        const textSpan = syncQueueToast.querySelector('span');
        if (textSpan) {
            textSpan.innerHTML = `Syncing <strong>${remaining}</strong> item${remaining !== 1 ? 's' : ''}...`;
        }
    }
}

function hideSyncProgress() {
    if (syncQueueToast) {
        syncQueueToast.remove();
        syncQueueToast = null;
    }
}

// ============================================
// REFRESH CACHED DATA
// ============================================
async function refreshCachedData() {
    if (isOffline) return;
    
    try {
        const user = firebase.auth().currentUser;
        if (user) {
            const db = firebase.firestore();
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                localStorage.setItem('boostbangla_cachedUser', JSON.stringify(userDoc.data()));
            }
        }
        
        // Refresh services cache
        const response = await fetch('/public/php/api-proxy.php?action=services');
        const data = await response.json();
        if (data.services) {
            localStorage.setItem('boostbangla_cachedServices', JSON.stringify(data.services));
        }
        
        console.log('🔄 Cache refreshed');
    } catch (e) {
        console.log('Cache refresh failed (offline or API error)');
    }
}

// ============================================
// SETUP SERVICE WORKER
// ============================================
function setupServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('✅ Service Worker registered:', registration.scope);
            })
            .catch(error => {
                console.log('⚠️ Service Worker registration failed:', error);
            });
    }
}

// ============================================
// CACHE API RESPONSES
// ============================================
async function cacheApiResponse(key, data, ttl = 3600000) {
    const cacheItem = {
        data: data,
        timestamp: Date.now(),
        ttl: ttl
    };
    localStorage.setItem(`boostbangla_cache_${key}`, JSON.stringify(cacheItem));
}

async function getCachedApiResponse(key, maxAge = 3600000) {
    const cached = localStorage.getItem(`boostbangla_cache_${key}`);
    if (!cached) return null;
    
    try {
        const cacheItem = JSON.parse(cached);
        if (Date.now() - cacheItem.timestamp > (cacheItem.ttl || maxAge)) {
            localStorage.removeItem(`boostbangla_cache_${key}`);
            return null;
        }
        return cacheItem.data;
    } catch (e) {
        return null;
    }
}

// ============================================
// CHECK CONNECTION QUALITY
// ============================================
async function checkConnectionQuality() {
    if (!navigator.onLine) return 'offline';
    
    try {
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        await fetch('/public/php/exchange-rate.php', {
            method: 'HEAD',
            signal: controller.signal,
            cache: 'no-cache'
        });
        
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        
        if (duration < 100) return 'excellent';
        if (duration < 300) return 'good';
        if (duration < 1000) return 'poor';
        return 'bad';
    } catch (e) {
        return 'offline';
    }
}

// ============================================
// EXPORT PUBLIC API
// ============================================
window.isOffline = () => isOffline;
window.checkOnlineStatus = checkOnlineStatus;
window.addToSyncQueue = addToSyncQueue;
window.getCachedApiResponse = getCachedApiResponse;
window.cacheApiResponse = cacheApiResponse;
window.getConnectionQuality = () => connectionQuality;

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initOfflineSupport();
});

console.log('✅ Offline JS v3.0 loaded - Design System compliant');
