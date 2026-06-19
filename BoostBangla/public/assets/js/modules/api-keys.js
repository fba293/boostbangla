// ============================================
// BoostBangla API Keys Module v3.0
// Fully redesigned following design.md
// Glass API key cards with copy animation
// Child key management with access levels
// Usage statistics with progress bars
// Flutter-like key management interface
// ============================================

// ========== GLOBAL STATE ==========
let apiKeysState = {
    currentUser: null,
    mainApiKey: null,
    childApiKeys: [],
    selectedChildKey: null,
    isLoading: true,
    usageStats: {
        requestsToday: 0,
        requestsThisMonth: 0,
        rateLimit: 1000,
        lastUsed: null
    }
};

// Access level configuration (design.md: badges)
const ACCESS_LEVELS = {
    full: { name: '🔓 Full Access', description: 'Complete API access (orders, balance, services)', color: '#10b981', bgLight: '#10b98110' },
    limited: { name: '🔒 Limited Access', description: 'Orders only - no balance or user info', color: '#f59e0b', bgLight: '#f59e0b10' },
    readonly: { name: '👁️ Read Only', description: 'View orders and services only', color: '#3b82f6', bgLight: '#3b82f610' }
};

// ========== INITIALIZE API KEYS PAGE ==========
async function initApiKeys() {
    showSkeletonLoader();
    const isAuth = await checkAuthAndLoadUser();
    if (!isAuth) return;
    
    await Promise.all([
        loadMainApiKey(),
        loadChildApiKeys(),
        loadUsageStatistics()
    ]);
    
    attachEventListeners();
    apiKeysState.isLoading = false;
    hideSkeletonLoader();
    animateInElements();
    startUsagePolling();
}

// ========== CHECK AUTHENTICATION ==========
async function checkAuthAndLoadUser() {
    const user = window.getCurrentUser();
    if (!user?.uid) {
        window.location.href = '/login.html';
        return false;
    }
    
    apiKeysState.currentUser = user;
    
    const userDoc = await db.collection('users').doc(user.uid).get();
    const username = userDoc.data()?.username || user.email?.split('@')[0] || 'User';
    
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.innerText = username;
    
    return true;
}

// ========== GENERATE API KEY ==========
function generateApiKey(prefix = 'bp') {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = `${prefix}_`;
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// ========== LOAD MAIN API KEY ==========
async function loadMainApiKey() {
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;
        
        const userRef = db.collection('users').doc(user.uid);
        const userSnap = await userRef.get();
        let apiKey = userSnap.data()?.apiKey;
        
        if (!apiKey) {
            apiKey = generateApiKey('bp_main');
            await userRef.update({ apiKey: apiKey });
        }
        
        apiKeysState.mainApiKey = apiKey;
        
        const mainApiKeyDisplay = document.getElementById('mainApiKeyDisplay');
        const maskedKey = maskApiKey(apiKey);
        
        if (mainApiKeyDisplay) {
            mainApiKeyDisplay.innerHTML = `
                <div class="flex items-center justify-between gap-4 flex-wrap">
                    <code class="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg">${maskedKey}</code>
                    <div class="flex gap-2">
                        <button id="copyMainKeyBtn" class="btn-outline text-sm px-3 py-1.5 rounded-lg">
                            <i class="fas fa-copy mr-1"></i> Copy
                        </button>
                        <button id="regenerateMainKeyBtn" class="btn-danger text-sm px-3 py-1.5 rounded-lg">
                            <i class="fas fa-sync-alt mr-1"></i> Regenerate
                        </button>
                    </div>
                </div>
            `;
        }
        
        // Re-attach button listeners after DOM update
        const copyBtn = document.getElementById('copyMainKeyBtn');
        if (copyBtn) copyBtn.addEventListener('click', copyMainApiKey);
        
        const regenerateBtn = document.getElementById('regenerateMainKeyBtn');
        if (regenerateBtn) regenerateBtn.addEventListener('click', regenerateMainApiKey);
        
    } catch (error) {
        console.error('Error loading main API key:', error);
        showGlassToast('Failed to load API key', 'error');
    }
}

// ========== MASK API KEY FOR DISPLAY ==========
function maskApiKey(key) {
    if (!key) return 'Not set';
    if (key.length <= 16) return key;
    return key.substring(0, 8) + '••••••••' + key.substring(key.length - 8);
}

// ========== COPY MAIN API KEY ==========
async function copyMainApiKey() {
    if (!apiKeysState.mainApiKey) {
        showGlassToast('No API key found', 'error');
        return;
    }
    
    await copyToClipboard(apiKeysState.mainApiKey);
    showGlassToast('Main API key copied to clipboard!', 'success');
    
    // Animate copy button
    const copyBtn = document.getElementById('copyMainKeyBtn');
    if (copyBtn) {
        copyBtn.classList.add('scale-95');
        setTimeout(() => copyBtn.classList.remove('scale-95'), 200);
    }
}

// ========== REGENERATE MAIN API KEY ==========
async function regenerateMainApiKey() {
    const confirmed = confirm('⚠️ Regenerating your API key will invalidate the old one. Any applications using the old key will stop working immediately. Continue?');
    if (!confirmed) return;
    
    const regenerateBtn = document.getElementById('regenerateMainKeyBtn');
    const originalText = regenerateBtn.innerHTML;
    regenerateBtn.disabled = true;
    regenerateBtn.innerHTML = '<span class="spinner" style="width: 16px; height: 16px;"></span>';
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) throw new Error('Not authenticated');
        
        const newKey = generateApiKey('bp_main');
        await db.collection('users').doc(user.uid).update({ 
            apiKey: newKey,
            apiKeyRegeneratedAt: new Date()
        });
        
        apiKeysState.mainApiKey = newKey;
        await loadMainApiKey();
        
        showGlassToast('API key regenerated successfully!', 'success');
        
    } catch (error) {
        console.error('Regenerate error:', error);
        showGlassToast('Failed to regenerate API key', 'error');
    } finally {
        regenerateBtn.disabled = false;
        regenerateBtn.innerHTML = originalText;
    }
}

// ========== LOAD CHILD API KEYS ==========
async function loadChildApiKeys() {
    const container = document.getElementById('childApiKeysList');
    if (!container) return;
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;
        
        const keysSnapshot = await db.collection('childApiKeys')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        apiKeysState.childApiKeys = [];
        keysSnapshot.forEach(doc => {
            apiKeysState.childApiKeys.push({ id: doc.id, ...doc.data() });
        });
        
        renderChildApiKeys();
        
        // Update child key count
        const childKeyCount = document.getElementById('childKeyCount');
        if (childKeyCount) childKeyCount.innerText = apiKeysState.childApiKeys.length;
        
    } catch (error) {
        console.error('Error loading child API keys:', error);
        container.innerHTML = renderErrorState();
        showGlassToast('Failed to load child API keys', 'error');
    }
}

function renderChildApiKeys() {
    const container = document.getElementById('childApiKeysList');
    if (!container) return;
    
    if (apiKeysState.childApiKeys.length === 0) {
        container.innerHTML = renderEmptyState();
        return;
    }
    
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
        container.innerHTML = `
            <div class="space-y-4 animate-fade-in">
                ${apiKeysState.childApiKeys.map((key, idx) => renderChildKeyCard(key, idx)).join('')}
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
                ${apiKeysState.childApiKeys.map((key, idx) => renderChildKeyCard(key, idx)).join('')}
            </div>
        `;
    }
}

function renderChildKeyCard(key, index) {
    const delay = 0.05 * (index % 10);
    const accessConfig = ACCESS_LEVELS[key.accessLevel] || ACCESS_LEVELS.limited;
    const createdDate = key.createdAt?.toDate ? key.createdAt.toDate() : new Date(key.createdAt);
    const isActive = key.status === 'active';
    
    return `
        <div class="glass-card p-5 rounded-2xl animate-slide-up hover:shadow-xl transition-all" style="animation-delay: ${delay}s">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="font-bold text-lg">${escapeHtml(key.name)}</h3>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="status-badge ${isActive ? 'status-success' : 'status-cancelled'}">
                            ${isActive ? '● Active' : '○ Revoked'}
                        </span>
                        <span class="priority-badge" style="background: ${accessConfig.bgLight}; color: ${accessConfig.color}">
                            ${accessConfig.name}
                        </span>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-xs text-gray-400">Created: ${formatDate(createdDate)}</div>
                    ${key.lastUsed ? `<div class="text-xs text-gray-400">Last used: ${formatSmartDate(key.lastUsed)}</div>` : ''}
                </div>
            </div>
            
            <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-4">
                <code class="font-mono text-xs break-all">${maskApiKey(key.apiKey)}</code>
            </div>
            
            <div class="text-xs text-gray-500 mb-4">
                <i class="fas fa-info-circle mr-1"></i> ${accessConfig.description}
            </div>
            
            <div class="flex gap-2 flex-wrap">
                <button onclick="copyChildApiKey('${key.apiKey}')" class="btn-outline text-sm px-3 py-1.5 rounded-lg">
                    <i class="fas fa-copy mr-1"></i> Copy
                </button>
                ${isActive ? `
                    <button onclick="revokeChildApiKey('${key.id}')" class="btn-danger text-sm px-3 py-1.5 rounded-lg">
                        <i class="fas fa-ban mr-1"></i> Revoke
                    </button>
                ` : ''}
                <button onclick="deleteChildApiKey('${key.id}')" class="btn-danger text-sm px-3 py-1.5 rounded-lg">
                    <i class="fas fa-trash-alt mr-1"></i> Delete
                </button>
                ${key.apiKey ? `
                    <button onclick="viewApiUsage('${key.id}')" class="btn-outline text-sm px-3 py-1.5 rounded-lg">
                        <i class="fas fa-chart-line mr-1"></i> Usage
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

// ========== CREATE CHILD API KEY ==========
function openCreateChildModal() {
    const modal = document.getElementById('createChildModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Reset form
        document.getElementById('createChildApiForm')?.reset();
        document.getElementById('childKeyAccess').value = 'limited';
    }
}

window.closeCreateChildModal = function() {
    const modal = document.getElementById('createChildModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
};

async function createChildApiKey(e) {
    e.preventDefault();
    
    const name = document.getElementById('childKeyName').value.trim();
    const accessLevel = document.getElementById('childKeyAccess').value;
    
    if (!name) {
        showGlassToast('Please enter a key name', 'error');
        return;
    }
    
    if (name.length < 3) {
        showGlassToast('Key name must be at least 3 characters', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Creating...';
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) throw new Error('Not authenticated');
        
        const apiKey = generateApiKey('bp_child');
        
        await db.collection('childApiKeys').add({
            userId: user.uid,
            userEmail: user.email,
            name: name,
            apiKey: apiKey,
            accessLevel: accessLevel,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
            usageCount: 0
        });
        
        showGlassToast('Child API key created successfully!', 'success');
        closeCreateChildModal();
        await loadChildApiKeys();
        
    } catch (error) {
        console.error('Error creating child API key:', error);
        showGlassToast('Failed to create API key', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ========== COPY CHILD API KEY ==========
window.copyChildApiKey = async function(apiKey) {
    await copyToClipboard(apiKey);
    showGlassToast('API key copied to clipboard!', 'success');
};

// ========== REVOKE CHILD API KEY ==========
window.revokeChildApiKey = async function(keyId) {
    const confirmed = confirm('⚠️ Revoking this API key will immediately invalidate it. Any applications using this key will stop working. Continue?');
    if (!confirmed) return;
    
    try {
        await db.collection('childApiKeys').doc(keyId).update({
            status: 'revoked',
            revokedAt: new Date(),
            updatedAt: new Date()
        });
        
        showGlassToast('API key revoked successfully', 'success');
        await loadChildApiKeys();
        
    } catch (error) {
        console.error('Error revoking API key:', error);
        showGlassToast('Failed to revoke API key', 'error');
    }
};

// ========== DELETE CHILD API KEY ==========
window.deleteChildApiKey = async function(keyId) {
    const confirmed = confirm('⚠️ Are you sure you want to delete this API key? This action cannot be undone.');
    if (!confirmed) return;
    
    try {
        await db.collection('childApiKeys').doc(keyId).delete();
        showGlassToast('API key deleted successfully', 'success');
        await loadChildApiKeys();
        
    } catch (error) {
        console.error('Error deleting API key:', error);
        showGlassToast('Failed to delete API key', 'error');
    }
};

// ========== LOAD USAGE STATISTICS ==========
async function loadUsageStatistics() {
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;
        
        // Get today's usage
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const usageSnapshot = await db.collection('apiUsage')
            .where('userId', '==', user.uid)
            .where('timestamp', '>=', today)
            .get();
        
        apiKeysState.usageStats.requestsToday = usageSnapshot.size;
        
        // Get this month's usage
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthSnapshot = await db.collection('apiUsage')
            .where('userId', '==', user.uid)
            .where('timestamp', '>=', startOfMonth)
            .get();
        
        apiKeysState.usageStats.requestsThisMonth = monthSnapshot.size;
        
        // Get last used
        const lastUsedSnapshot = await db.collection('apiUsage')
            .where('userId', '==', user.uid)
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get();
        
        if (!lastUsedSnapshot.empty) {
            apiKeysState.usageStats.lastUsed = lastUsedSnapshot.docs[0].data().timestamp?.toDate() || null;
        }
        
        updateUsageDisplay();
        
    } catch (error) {
        console.error('Error loading usage stats:', error);
    }
}

function updateUsageDisplay() {
    const todayEl = document.getElementById('requestsToday');
    const monthEl = document.getElementById('requestsThisMonth');
    const lastUsedEl = document.getElementById('lastUsed');
    const rateLimitEl = document.getElementById('rateLimit');
    const usagePercent = (apiKeysState.usageStats.requestsToday / apiKeysState.usageStats.rateLimit) * 100;
    const usageFill = document.getElementById('usageFill');
    
    if (todayEl) todayEl.innerText = apiKeysState.usageStats.requestsToday.toLocaleString();
    if (monthEl) monthEl.innerText = apiKeysState.usageStats.requestsThisMonth.toLocaleString();
    if (rateLimitEl) rateLimitEl.innerText = apiKeysState.usageStats.rateLimit.toLocaleString();
    if (lastUsedEl) {
        if (apiKeysState.usageStats.lastUsed) {
            lastUsedEl.innerText = formatSmartDate(apiKeysState.usageStats.lastUsed);
        } else {
            lastUsedEl.innerText = 'Never';
        }
    }
    if (usageFill) usageFill.style.width = `${Math.min(usagePercent, 100)}%`;
    
    // Color coding based on usage
    if (usagePercent >= 90) {
        if (usageFill) usageFill.classList.add('bg-red-500');
    } else if (usagePercent >= 70) {
        if (usageFill) usageFill.classList.add('bg-yellow-500');
    } else {
        if (usageFill) usageFill.classList.add('bg-primary');
    }
}

// ========== VIEW API USAGE MODAL ==========
window.viewApiUsage = async function(keyId) {
    const key = apiKeysState.childApiKeys.find(k => k.id === keyId);
    if (!key) return;
    
    const modal = document.getElementById('usageModal');
    const content = document.getElementById('usageContent');
    
    if (!modal || !content) return;
    
    apiKeysState.selectedChildKey = key;
    
    // Fetch usage for this specific key
    const user = window.getCurrentUser();
    let usageHistory = [];
    
    if (user?.uid && key.apiKey) {
        const usageSnapshot = await db.collection('apiUsage')
            .where('userId', '==', user.uid)
            .where('apiKey', '==', key.apiKey)
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
        
        usageSnapshot.forEach(doc => {
            usageHistory.push(doc.data());
        });
    }
    
    content.innerHTML = `
        <div class="mb-4">
            <h3 class="font-bold text-lg">${escapeHtml(key.name)}</h3>
            <p class="text-sm text-gray-500">Access Level: ${ACCESS_LEVELS[key.accessLevel]?.name || key.accessLevel}</p>
        </div>
        
        <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="glass-card p-3 text-center rounded-xl">
                <div class="text-2xl font-black text-primary">${key.usageCount || 0}</div>
                <div class="text-xs text-gray-400">Total Requests</div>
            </div>
            <div class="glass-card p-3 text-center rounded-xl">
                <div class="text-2xl font-black text-primary">${key.status === 'active' ? 'Active' : 'Revoked'}</div>
                <div class="text-xs text-gray-400">Status</div>
            </div>
        </div>
        
        <div class="mb-4">
            <div class="font-medium text-sm mb-2">Recent Activity</div>
            ${usageHistory.length === 0 ? 
                '<div class="text-center py-6 text-gray-400 text-sm">No usage recorded yet</div>' :
                `<div class="space-y-2 max-h-64 overflow-y-auto">
                    ${usageHistory.slice(0, 10).map(usage => `
                        <div class="flex justify-between items-center text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span class="font-mono text-xs">${usage.endpoint || 'Unknown'}</span>
                            <span class="text-xs text-gray-400">${formatSmartDate(usage.timestamp?.toDate())}</span>
                        </div>
                    `).join('')}
                </div>`
            }
        </div>
        
        <div class="flex justify-end">
            <button onclick="closeUsageModal()" class="btn-outline">Close</button>
        </div>
    `;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

function closeUsageModal() {
    const modal = document.getElementById('usageModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    apiKeysState.selectedChildKey = null;
}

// ========== USAGE POLLING ==========
function startUsagePolling() {
    setInterval(async () => {
        if (!document.hidden) {
            await loadUsageStatistics();
        }
    }, 60000); // Update every minute
}

// ========== EMPTY & ERROR STATES ==========
function renderEmptyState() {
    return `
        <div class="empty-state py-12">
            <div class="empty-icon text-6xl mb-4">🔑</div>
            <h3 class="empty-title text-xl font-bold mb-2">No child API keys</h3>
            <p class="empty-description text-gray-500 mb-4">Create API keys for your applications and integrations</p>
            <button onclick="openCreateChildModal()" class="btn-primary">
                <i class="fas fa-plus mr-2"></i> Create Child API Key
            </button>
        </div>
    `;
}

function renderErrorState() {
    return `
        <div class="empty-state py-12">
            <div class="empty-icon text-6xl mb-4">❌</div>
            <h3 class="empty-title text-xl font-bold mb-2">Failed to load API keys</h3>
            <button onclick="location.reload()" class="btn-primary">Retry</button>
        </div>
    `;
}

// ========== ANIMATIONS & LOADERS ==========
function showSkeletonLoader() {
    const container = document.getElementById('childApiKeysList');
    if (container) {
        container.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div class="skeleton skeleton-card h-64 rounded-2xl"></div>
                <div class="skeleton skeleton-card h-64 rounded-2xl"></div>
            </div>
        `;
    }
}

function hideSkeletonLoader() {
    // Content replaces skeletons when loaded
}

function animateInElements() {
    document.querySelectorAll('.api-stats-card, .glass-card').forEach((el, idx) => {
        el.classList.add('animate-slide-up');
        el.style.animationDelay = `${0.05 * idx}s`;
    });
}

// ========== HELPER FUNCTIONS ==========
function formatDate(date) {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatSmartDate(date) {
    if (!date) return 'Just now';
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleDateString('en-BD', { day: 'numeric', month: 'short' });
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
    } catch (error) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showGlassToast(message, type = 'success') {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else {
        console.log(`[${type}] ${message}`);
    }
}

// ========== EVENT LISTENERS ==========
function attachEventListeners() {
    // Create child key button
    const createBtn = document.getElementById('createChildApiBtn');
    if (createBtn) {
        createBtn.addEventListener('click', openCreateChildModal);
    }
    
    // Create child key form
    const createForm = document.getElementById('createChildApiForm');
    if (createForm) {
        createForm.addEventListener('submit', createChildApiKey);
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshApiKeysBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            showSkeletonLoader();
            await Promise.all([loadChildApiKeys(), loadUsageStatistics()]);
            hideSkeletonLoader();
            showGlassToast('API keys refreshed', 'success');
        });
    }
    
    // Close modals on outside click
    const createModal = document.getElementById('createChildModal');
    if (createModal) {
        createModal.addEventListener('click', (e) => {
            if (e.target === createModal) closeCreateChildModal();
        });
    }
    
    const usageModal = document.getElementById('usageModal');
    if (usageModal) {
        usageModal.addEventListener('click', (e) => {
            if (e.target === usageModal) closeUsageModal();
        });
    }
}

// ========== EXPORT GLOBALS ==========
window.initApiKeys = initApiKeys;
window.openCreateChildModal = openCreateChildModal;
window.closeCreateChildModal = closeCreateChildModal;
window.copyChildApiKey = copyChildApiKey;
window.revokeChildApiKey = revokeChildApiKey;
window.deleteChildApiKey = deleteChildApiKey;
window.viewApiUsage = viewApiUsage;
window.closeUsageModal = closeUsageModal;

// ========== AUTO-INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('mainApiKeyDisplay')) {
        if (window.auth && window.db) {
            await initApiKeys();
        } else {
            const checkFirebase = setInterval(async () => {
                if (window.auth && window.db) {
                    clearInterval(checkFirebase);
                    await initApiKeys();
                }
            }, 100);
        }
    }
});

console.log('✅ API Keys v3.0 (design.md compliant) loaded');