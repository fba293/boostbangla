// ============================================
// BoostBangla Child Panel Module v3.0
// Fully redesigned following design.md
// Glass panel cards with status indicators
// Balance transfer with real-time preview
// API key management with copy/regenerate
// Activity logs with pagination
// Usage statistics with mini charts
// ============================================

// ========== GLOBAL STATE ==========
let childPanelState = {
    currentUser: null,
    childPanels: [],
    selectedPanel: null,
    exchangeRate: 120,
    parentBalance: 0,
    isLoading: true,
    currentPage: 1,
    itemsPerPage: 10,
    transferAmount: 0,
    activityLogs: []
};

// Panel status configuration
const PANEL_STATUS = {
    active: { class: 'status-success', icon: '●', text: 'Active', color: '#10b981' },
    suspended: { class: 'status-cancelled', icon: '○', text: 'Suspended', color: '#ef4444' },
    pending: { class: 'status-pending', icon: '◐', text: 'Pending', color: '#f59e0b' }
};

const API_ACCESS_LEVELS = {
    full: { name: '🔓 Full Access', description: 'Complete API access (orders, balance, services)', color: '#10b981' },
    limited: { name: '🔒 Limited Access', description: 'Orders only - no balance or user info', color: '#f59e0b' },
    readonly: { name: '👁️ Read Only', description: 'View orders and services only', color: '#3b82f6' }
};

// ========== INITIALIZE CHILD PANEL PAGE ==========
async function initChildPanel() {
    showSkeletonLoader();
    const isAuth = await checkAuthAndLoadUser();
    if (!isAuth) return;
    
    await Promise.all([
        loadExchangeRate(),
        loadParentBalance(),
        loadChildPanels(),
        loadActivityLogs()
    ]);
    
    attachEventListeners();
    childPanelState.isLoading = false;
    hideSkeletonLoader();
    animateInElements();
    startBalancePolling();
}

// ========== CHECK AUTHENTICATION ==========
async function checkAuthAndLoadUser() {
    const user = window.getCurrentUser();
    if (!user?.uid) {
        window.location.href = '/login.html';
        return false;
    }
    
    childPanelState.currentUser = user;
    
    const userDoc = await db.collection('users').doc(user.uid).get();
    const username = userDoc.data()?.username || user.email?.split('@')[0] || 'User';
    
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.innerText = username;
    
    return true;
}

// ========== LOAD EXCHANGE RATE ==========
async function loadExchangeRate() {
    try {
        const response = await fetch('https://hexarate.paikama.co/api/rates/latest/USD?target=BDT');
        const data = await response.json();
        if (data?.data?.mid) {
            childPanelState.exchangeRate = data.data.mid;
        }
    } catch (error) {
        childPanelState.exchangeRate = 120;
    }
}

// ========== LOAD PARENT BALANCE ==========
async function loadParentBalance() {
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;
        
        const userDoc = await db.collection('users').doc(user.uid).get();
        childPanelState.parentBalance = userDoc.data()?.balance || 0;
        
        const balanceEl = document.getElementById('parentBalance');
        if (balanceEl) {
            balanceEl.innerHTML = formatCurrencyBDT(childPanelState.parentBalance);
        }
    } catch (error) {
        console.error('Error loading balance:', error);
        showGlassToast('Failed to load balance', 'error');
    }
}

// ========== LOAD CHILD PANELS ==========
async function loadChildPanels() {
    const container = document.getElementById('childPanelsList');
    if (!container) return;
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;
        
        const panelsSnapshot = await db.collection('childPanels')
            .where('parentId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        childPanelState.childPanels = [];
        let totalBalance = 0;
        let totalOrders = 0;
        
        panelsSnapshot.forEach(doc => {
            const panel = { id: doc.id, ...doc.data() };
            childPanelState.childPanels.push(panel);
            totalBalance += panel.balance || 0;
            totalOrders += panel.totalOrders || 0;
        });
        
        // Update stats
        updateStatsCards(childPanelState.childPanels.length, totalBalance, totalOrders);
        
        renderChildPanels();
        
    } catch (error) {
        console.error('Error loading child panels:', error);
        container.innerHTML = renderErrorState();
        showGlassToast('Failed to load child panels', 'error');
    }
}

function updateStatsCards(totalPanels, totalBalance, totalOrders) {
    animateStatValue('totalPanels', totalPanels);
    animateStatValue('totalBalance', formatCurrencyBDT(totalBalance));
    animateStatValue('totalOrders', totalOrders);
}

function animateStatValue(elementId, newValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const oldValue = element.innerText;
    if (oldValue === newValue.toString()) return;
    
    element.classList.add('animate-pulse-slow');
    element.innerText = newValue;
    setTimeout(() => element.classList.remove('animate-pulse-slow'), 300);
}

function renderChildPanels() {
    const container = document.getElementById('childPanelsList');
    if (!container) return;
    
    if (childPanelState.childPanels.length === 0) {
        container.innerHTML = renderEmptyState();
        return;
    }
    
    const isMobile = window.innerWidth < 768;
    const start = (childPanelState.currentPage - 1) * childPanelState.itemsPerPage;
    const pagePanels = childPanelState.childPanels.slice(start, start + childPanelState.itemsPerPage);
    const totalPages = Math.ceil(childPanelState.childPanels.length / childPanelState.itemsPerPage);
    
    if (isMobile) {
        container.innerHTML = `
            <div class="space-y-4 animate-fade-in">
                ${pagePanels.map((panel, idx) => renderPanelCard(panel, idx)).join('')}
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fade-in">
                ${pagePanels.map((panel, idx) => renderPanelCard(panel, idx)).join('')}
            </div>
        `;
    }
    
    renderPanelPagination(totalPages);
}

function renderPanelCard(panel, index) {
    const delay = 0.05 * (index % 10);
    const statusConfig = PANEL_STATUS[panel.status] || PANEL_STATUS.active;
    const createdDate = panel.createdAt?.toDate ? panel.createdAt.toDate() : new Date(panel.createdAt);
    const accessConfig = API_ACCESS_LEVELS[panel.apiAccess] || API_ACCESS_LEVELS.limited;
    
    return `
        <div class="panel-card glass-card p-5 rounded-2xl animate-slide-up hover:shadow-xl transition-all" style="animation-delay: ${delay}s">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="font-bold text-lg">${escapeHtml(panel.name)}</h3>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="status-badge ${statusConfig.class}">${statusConfig.icon} ${statusConfig.text}</span>
                        <span class="text-xs px-2 py-0.5 rounded-full" style="background: ${accessConfig.color}20; color: ${accessConfig.color}">
                            ${accessConfig.name}
                        </span>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-xs text-gray-400">Created: ${formatDate(createdDate)}</div>
                    ${panel.lastActive ? `<div class="text-xs text-gray-400">Active: ${formatSmartDate(panel.lastActive)}</div>` : ''}
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-3 mb-4">
                <div class="glass-card p-2 rounded-lg text-center">
                    <div class="text-xs text-gray-400">Balance</div>
                    <div class="text-primary font-black text-lg">${formatCurrencyBDT(panel.balance || 0)}</div>
                </div>
                <div class="glass-card p-2 rounded-lg text-center">
                    <div class="text-xs text-gray-400">Total Orders</div>
                    <div class="font-semibold">${(panel.totalOrders || 0).toLocaleString()}</div>
                </div>
            </div>
            
            <div class="flex gap-2 flex-wrap mt-3">
                <button onclick="showTransferModal('${panel.id}', '${escapeHtml(panel.name)}')" 
                        class="btn-outline text-sm px-3 py-1.5 rounded-lg">
                    <i class="fas fa-exchange-alt mr-1"></i> Transfer
                </button>
                <button onclick="showApiKey('${panel.id}', '${panel.apiKey || ''}')" 
                        class="btn-outline text-sm px-3 py-1.5 rounded-lg">
                    <i class="fas fa-key mr-1"></i> API Key
                </button>
                <button onclick="editPanel('${panel.id}', '${escapeHtml(panel.name)}', '${panel.status}', '${panel.apiAccess}')" 
                        class="btn-outline text-sm px-3 py-1.5 rounded-lg">
                    <i class="fas fa-edit mr-1"></i> Edit
                </button>
                <button onclick="deletePanel('${panel.id}')" 
                        class="btn-danger text-sm px-3 py-1.5 rounded-lg">
                    <i class="fas fa-trash-alt mr-1"></i> Delete
                </button>
            </div>
        </div>
    `;
}

function renderPanelPagination(totalPages) {
    const paginationDiv = document.getElementById('panelPagination');
    if (!paginationDiv) return;
    
    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    
    let html = `
        <div class="flex justify-center gap-2 mt-6">
            <button class="pagination-btn w-10 h-10 rounded-xl border ${childPanelState.currentPage === 1 ? 'opacity-50' : 'hover:border-primary'}" 
                    onclick="changePanelPage(${childPanelState.currentPage - 1})" ${childPanelState.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
    `;
    
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        html += `<button class="pagination-btn w-10 h-10 rounded-xl ${childPanelState.currentPage === i ? 'bg-primary text-white' : 'border hover:border-primary'}" 
                       onclick="changePanelPage(${i})">${i}</button>`;
    }
    
    if (totalPages > 5) {
        html += `<span class="px-2">...</span>`;
        html += `<button class="pagination-btn w-10 h-10 rounded-xl border hover:border-primary" onclick="changePanelPage(${totalPages})">${totalPages}</button>`;
    }
    
    html += `
            <button class="pagination-btn w-10 h-10 rounded-xl border ${childPanelState.currentPage === totalPages ? 'opacity-50' : 'hover:border-primary'}" 
                    onclick="changePanelPage(${childPanelState.currentPage + 1})" ${childPanelState.currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
    
    paginationDiv.innerHTML = html;
}

window.changePanelPage = function(page) {
    const totalPages = Math.ceil(childPanelState.childPanels.length / childPanelState.itemsPerPage);
    if (page < 1 || page > totalPages) return;
    childPanelState.currentPage = page;
    renderChildPanels();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ========== CREATE CHILD PANEL ==========
function openCreateModal() {
    const modal = document.getElementById('createModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Reset form
        document.getElementById('createChildForm')?.reset();
        document.getElementById('childBalance').value = '';
        document.getElementById('transferPreview').classList.add('hidden');
    }
}

window.closeCreateModal = function() {
    const modal = document.getElementById('createModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
};

function previewTransferAmount() {
    const balance = parseInt(document.getElementById('childBalance').value) || 0;
    const previewDiv = document.getElementById('transferPreview');
    
    if (balance > 0) {
        if (balance > childPanelState.parentBalance) {
            previewDiv.innerHTML = `
                <div class="text-red-500 text-sm mt-2">
                    <i class="fas fa-exclamation-triangle mr-1"></i> Insufficient balance! Available: ${formatCurrencyBDT(childPanelState.parentBalance)}
                </div>
            `;
            previewDiv.classList.remove('hidden');
        } else {
            previewDiv.innerHTML = `
                <div class="text-green-600 text-sm mt-2">
                    <i class="fas fa-check-circle mr-1"></i> Will transfer ${formatCurrencyBDT(balance)} to new panel
                </div>
            `;
            previewDiv.classList.remove('hidden');
        }
    } else {
        previewDiv.classList.add('hidden');
    }
}

async function createChildPanel(e) {
    e.preventDefault();
    
    const name = document.getElementById('childName').value.trim();
    const balance = parseInt(document.getElementById('childBalance').value) || 0;
    const apiAccess = document.getElementById('childApiAccess').value;
    
    if (!name) {
        showGlassToast('Panel name is required', 'error');
        return;
    }
    
    if (name.length < 3) {
        showGlassToast('Panel name must be at least 3 characters', 'error');
        return;
    }
    
    if (balance > childPanelState.parentBalance) {
        showGlassToast('Insufficient balance', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Creating...';
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) throw new Error('Not authenticated');
        
        // Deduct balance from parent
        if (balance > 0) {
            await db.collection('users').doc(user.uid).update({
                balance: firebase.firestore.FieldValue.increment(-balance)
            });
        }
        
        const apiKey = generateApiKey();
        
        await db.collection('childPanels').add({
            parentId: user.uid,
            name: name,
            balance: balance,
            apiKey: apiKey,
            apiAccess: apiAccess,
            status: 'active',
            totalOrders: 0,
            createdAt: new Date(),
            lastActive: new Date(),
            createdBy: user.email
        });
        
        showGlassToast('Child panel created successfully!', 'success');
        closeCreateModal();
        await Promise.all([loadParentBalance(), loadChildPanels(), loadActivityLogs()]);
        
    } catch (error) {
        console.error('Error creating child panel:', error);
        showGlassToast('Failed to create child panel', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ========== TRANSFER BALANCE ==========
let currentTransferPanelId = null;

window.showTransferModal = function(panelId, panelName) {
    currentTransferPanelId = panelId;
    document.getElementById('transferPanelName').value = panelName;
    document.getElementById('transferAmount').value = '';
    document.getElementById('transferPreviewMsg').classList.add('hidden');
    
    const modal = document.getElementById('transferModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
};

window.closeTransferModal = function() {
    const modal = document.getElementById('transferModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    currentTransferPanelId = null;
};

function previewTransfer() {
    const amount = parseInt(document.getElementById('transferAmount').value) || 0;
    const previewDiv = document.getElementById('transferPreviewMsg');
    
    if (amount > 0) {
        if (amount > childPanelState.parentBalance) {
            previewDiv.innerHTML = `
                <div class="text-red-500 text-sm mt-2">
                    <i class="fas fa-exclamation-triangle mr-1"></i> Insufficient balance! Available: ${formatCurrencyBDT(childPanelState.parentBalance)}
                </div>
            `;
            previewDiv.classList.remove('hidden');
        } else {
            previewDiv.innerHTML = `
                <div class="text-green-600 text-sm mt-2">
                    <i class="fas fa-check-circle mr-1"></i> Will transfer ${formatCurrencyBDT(amount)} to panel
                </div>
            `;
            previewDiv.classList.remove('hidden');
        }
    } else {
        previewDiv.classList.add('hidden');
    }
}

async function transferBalance(e) {
    e.preventDefault();
    
    const amount = parseInt(document.getElementById('transferAmount').value);
    if (!amount || amount <= 0) {
        showGlassToast('Please enter a valid amount', 'error');
        return;
    }
    
    if (amount > childPanelState.parentBalance) {
        showGlassToast('Insufficient balance', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Transferring...';
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) throw new Error('Not authenticated');
        
        const panelRef = db.collection('childPanels').doc(currentTransferPanelId);
        const panelDoc = await panelRef.get();
        const currentBalance = panelDoc.data()?.balance || 0;
        
        // Update panel balance
        await panelRef.update({
            balance: currentBalance + amount,
            lastActive: new Date()
        });
        
        // Deduct from parent
        await db.collection('users').doc(user.uid).update({
            balance: firebase.firestore.FieldValue.increment(-amount)
        });
        
        // Log activity
        await db.collection('panelActivities').add({
            panelId: currentTransferPanelId,
            parentId: user.uid,
            action: 'transfer',
            amount: amount,
            timestamp: new Date()
        });
        
        showGlassToast(`৳${amount.toLocaleString()} transferred successfully!`, 'success');
        closeTransferModal();
        await Promise.all([loadParentBalance(), loadChildPanels(), loadActivityLogs()]);
        
    } catch (error) {
        console.error('Error transferring balance:', error);
        showGlassToast('Transfer failed', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ========== API KEY MANAGEMENT ==========
function generateApiKey() {
    return 'bp_child_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 8);
}

window.showApiKey = function(panelId, apiKey) {
    const modal = document.getElementById('apiKeyModal');
    const keyDisplay = document.getElementById('apiKeyDisplayText');
    
    if (keyDisplay) {
        keyDisplay.innerText = apiKey || 'No API key generated';
    }
    
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Store panelId for regeneration
        modal.dataset.panelId = panelId;
    }
};

window.closeApiKeyModal = function() {
    const modal = document.getElementById('apiKeyModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
};

window.copyApiKey = function() {
    const keyDisplay = document.getElementById('apiKeyDisplayText');
    if (keyDisplay && keyDisplay.innerText !== 'No API key generated') {
        copyToClipboard(keyDisplay.innerText);
        showGlassToast('API key copied to clipboard!', 'success');
    }
};

window.regenerateApiKey = async function() {
    const modal = document.getElementById('apiKeyModal');
    const panelId = modal?.dataset.panelId;
    if (!panelId) return;
    
    const confirmed = confirm('⚠️ Regenerating API key will invalidate the old one. Continue?');
    if (!confirmed) return;
    
    const newKey = generateApiKey();
    
    try {
        await db.collection('childPanels').doc(panelId).update({
            apiKey: newKey,
            apiKeyRegeneratedAt: new Date()
        });
        
        const keyDisplay = document.getElementById('apiKeyDisplayText');
        if (keyDisplay) keyDisplay.innerText = newKey;
        
        showGlassToast('API key regenerated successfully!', 'success');
        await loadChildPanels();
        
    } catch (error) {
        console.error('Error regenerating API key:', error);
        showGlassToast('Failed to regenerate API key', 'error');
    }
};

// ========== EDIT PANEL ==========
window.editPanel = function(panelId, panelName, status, apiAccess) {
    document.getElementById('editPanelId').value = panelId;
    document.getElementById('editPanelName').value = panelName;
    document.getElementById('editStatus').value = status;
    document.getElementById('editApiAccess').value = apiAccess || 'limited';
    
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
};

window.closeEditModal = function() {
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
};

async function updateChildPanel(e) {
    e.preventDefault();
    
    const panelId = document.getElementById('editPanelId').value;
    const name = document.getElementById('editPanelName').value.trim();
    const status = document.getElementById('editStatus').value;
    const apiAccess = document.getElementById('editApiAccess').value;
    
    if (!name) {
        showGlassToast('Panel name is required', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Saving...';
    
    try {
        await db.collection('childPanels').doc(panelId).update({
            name: name,
            status: status,
            apiAccess: apiAccess,
            updatedAt: new Date()
        });
        
        showGlassToast('Panel updated successfully!', 'success');
        closeEditModal();
        await loadChildPanels();
        
    } catch (error) {
        console.error('Error updating panel:', error);
        showGlassToast('Update failed', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ========== DELETE PANEL ==========
window.deletePanel = async function(panelId) {
    const confirmed = confirm('⚠️ Are you sure you want to delete this child panel? Any remaining balance will be lost. This action cannot be undone.');
    if (!confirmed) return;
    
    try {
        await db.collection('childPanels').doc(panelId).delete();
        showGlassToast('Panel deleted successfully', 'success');
        await Promise.all([loadParentBalance(), loadChildPanels(), loadActivityLogs()]);
    } catch (error) {
        console.error('Error deleting panel:', error);
        showGlassToast('Delete failed', 'error');
    }
};

// ========== LOAD ACTIVITY LOGS ==========
async function loadActivityLogs() {
    const container = document.getElementById('activityLogs');
    if (!container) return;
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;
        
        const logsSnapshot = await db.collection('panelActivities')
            .where('parentId', '==', user.uid)
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get();
        
        if (logsSnapshot.empty) {
            container.innerHTML = `
                <div class="empty-state py-6">
                    <p class="text-gray-400 text-sm">No activity logs yet</p>
                </div>
            `;
            return;
        }
        
        let html = '<div class="space-y-2">';
        logsSnapshot.forEach(doc => {
            const log = doc.data();
            const date = log.timestamp?.toDate ? log.timestamp.toDate() : new Date();
            const actionIcon = log.action === 'transfer' ? '💰' : '⚙️';
            
            html += `
                <div class="flex justify-between items-center text-sm p-2 glass-card rounded-lg">
                    <div>
                        <span class="font-mono text-xs">${actionIcon} ${log.action === 'transfer' ? `Transferred ${formatCurrencyBDT(log.amount)}` : 'Panel updated'}</span>
                    </div>
                    <div class="text-xs text-gray-400">${formatSmartDate(date)}</div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading activity logs:', error);
        container.innerHTML = '<div class="text-center py-6 text-red-500 text-sm">Failed to load activity</div>';
    }
}

// ========== BALANCE POLLING ==========
function startBalancePolling() {
    setInterval(async () => {
        if (!document.hidden) {
            await loadParentBalance();
        }
    }, 30000);
}

// ========== EMPTY & ERROR STATES ==========
function renderEmptyState() {
    return `
        <div class="empty-state py-12">
            <div class="empty-icon text-6xl mb-4">👥</div>
            <h3 class="empty-title text-xl font-bold mb-2">No child panels</h3>
            <p class="empty-description text-gray-500 mb-4">Create your first child panel to start managing sub-accounts</p>
            <button onclick="openCreateModal()" class="btn-primary">
                <i class="fas fa-plus mr-2"></i> Create Child Panel
            </button>
        </div>
    `;
}

function renderErrorState() {
    return `
        <div class="empty-state py-12">
            <div class="empty-icon text-6xl mb-4">❌</div>
            <h3 class="empty-title text-xl font-bold mb-2">Failed to load panels</h3>
            <button onclick="location.reload()" class="btn-primary">Retry</button>
        </div>
    `;
}

// ========== ANIMATIONS & LOADERS ==========
function showSkeletonLoader() {
    const container = document.getElementById('childPanelsList');
    if (container) {
        container.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
    document.querySelectorAll('.stat-card, .panel-card').forEach((el, idx) => {
        el.classList.add('animate-slide-up');
        el.style.animationDelay = `${0.03 * idx}s`;
    });
}

// ========== HELPER FUNCTIONS ==========
function formatCurrencyBDT(amount) {
    if (!amount && amount !== 0) return '৳0';
    return '৳' + amount.toLocaleString('en-BD');
}

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
    // Create button
    const createBtn = document.getElementById('createChildBtn');
    if (createBtn) createBtn.addEventListener('click', openCreateModal);
    
    // Create form
    const createForm = document.getElementById('createChildForm');
    if (createForm) createForm.addEventListener('submit', createChildPanel);
    
    // Balance preview on create form
    const balanceInput = document.getElementById('childBalance');
    if (balanceInput) balanceInput.addEventListener('input', previewTransferAmount);
    
    // Transfer form
    const transferForm = document.getElementById('transferForm');
    if (transferForm) transferForm.addEventListener('submit', transferBalance);
    
    const transferAmount = document.getElementById('transferAmount');
    if (transferAmount) transferAmount.addEventListener('input', previewTransfer);
    
    // Edit form
    const editForm = document.getElementById('editChildForm');
    if (editForm) editForm.addEventListener('submit', updateChildPanel);
    
    // Close modals on outside click
    const modals = ['createModal', 'transferModal', 'editModal', 'apiKeyModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    if (modalId === 'createModal') closeCreateModal();
                    if (modalId === 'transferModal') closeTransferModal();
                    if (modalId === 'editModal') closeEditModal();
                    if (modalId === 'apiKeyModal') closeApiKeyModal();
                }
            });
        }
    });
}

// ========== EXPORT GLOBALS ==========
window.initChildPanel = initChildPanel;
window.openCreateModal = openCreateModal;
window.closeCreateModal = closeCreateModal;
window.closeTransferModal = closeTransferModal;
window.closeEditModal = closeEditModal;
window.closeApiKeyModal = closeApiKeyModal;
window.showTransferModal = showTransferModal;
window.showApiKey = showApiKey;
window.copyApiKey = copyApiKey;
window.regenerateApiKey = regenerateApiKey;
window.editPanel = editPanel;
window.deletePanel = deletePanel;
window.changePanelPage = changePanelPage;

// ========== AUTO-INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('childPanelsList')) {
        if (window.auth && window.db) {
            await initChildPanel();
        } else {
            const checkFirebase = setInterval(async () => {
                if (window.auth && window.db) {
                    clearInterval(checkFirebase);
                    await initChildPanel();
                }
            }, 100);
        }
    }
});

console.log('✅ Child Panel v3.0 (design.md compliant) loaded');