// ============================================
// BoostBangla Updates & Changelog Module v3.0
// Fully redesigned following design.md
// Version timeline with glass cards
// Changelog with type filters (feature/fix/improvement)
// Subscribe modal with email input
// Release highlights with animated badges
// Auto-refresh for new updates
// ============================================

// ========== GLOBAL STATE ==========
let updatesState = {
    currentUser: null,
    updates: [],
    currentFilter: 'all',
    isSubscribed: false,
    isLoading: true,
    currentPage: 1,
    itemsPerPage: 5
};

// Update type configuration (design.md badges)
const UPDATE_TYPES = {
    feature: { name: 'New Feature', icon: '✨', color: '#10b981', class: 'type-feature' },
    improvement: { name: 'Improvement', icon: '🔧', color: '#f59e0b', class: 'type-improvement' },
    fix: { name: 'Bug Fix', icon: '🐛', color: '#ef4444', class: 'type-fix' },
    security: { name: 'Security', icon: '🔒', color: '#8b5cf6', class: 'type-security' }
};

// Sample updates data (in production, this would come from Firestore)
const SAMPLE_UPDATES = [
    {
        id: '1',
        version: 'v3.0.0',
        date: '2025-05-20',
        title: 'Major UI Redesign',
        highlights: ['Complete design system overhaul', 'Flutter-like mobile experience', 'Dark mode everywhere'],
        changes: [
            { type: 'feature', title: 'Glass Morphism UI', description: 'All cards now use glass morphism effect with backdrop blur' },
            { type: 'feature', title: 'Responsive Design', description: 'Mobile views now mimic native Flutter app experience' },
            { type: 'improvement', title: 'Performance', description: '50% faster page loads with code splitting and lazy loading' },
            { type: 'improvement', title: 'Animations', description: 'Buttery smooth staggered animations across all pages' },
            { type: 'security', title: '2FA Support', description: 'Two-factor authentication for enhanced account security' }
        ]
    },
    {
        id: '2',
        version: 'v2.5.0',
        date: '2025-05-10',
        title: 'Real-time Features',
        highlights: ['Live exchange rates', 'Real-time order updates', 'WebSocket notifications'],
        changes: [
            { type: 'feature', title: 'Real-time Exchange Rates', description: 'USD to BDT rates update automatically every hour' },
            { type: 'feature', title: 'Child Panel System', description: 'Resellers can create and manage child panels with API access' },
            { type: 'improvement', title: 'Dashboard Redesign', description: 'Completely redesigned dashboard with better mobile experience' },
            { type: 'fix', title: 'Order Status Sync', description: 'Fixed issue where order status was not updating correctly' }
        ]
    },
    {
        id: '3',
        version: 'v2.4.0',
        date: '2025-04-28',
        title: 'Affiliate Program Launch',
        highlights: ['20% lifetime commission', 'Referral tracking', 'Withdrawal system'],
        changes: [
            { type: 'feature', title: 'Affiliate Program', description: 'Earn 20% lifetime commission by referring friends' },
            { type: 'improvement', title: 'Faster Service Loading', description: 'Optimized API calls for 3x faster service loading' },
            { type: 'security', title: 'Session Management', description: 'View and terminate active sessions from security page' }
        ]
    },
    {
        id: '4',
        version: 'v2.3.0',
        date: '2025-04-15',
        title: 'Support System',
        highlights: ['Ticket system', 'Real-time chat', 'File attachments'],
        changes: [
            { type: 'feature', title: 'Ticket System', description: 'Full support ticket system with real-time replies' },
            { type: 'improvement', title: 'Mobile App Beta', description: 'Android app now available for beta testing' },
            { type: 'fix', title: 'Payment Verification', description: 'Fixed bKash and Nagad payment verification delays' }
        ]
    },
    {
        id: '5',
        version: 'v2.2.0',
        date: '2025-04-01',
        title: 'Mass Order & Giveaways',
        highlights: ['Bulk order upload', 'Monthly giveaways', 'Refund system'],
        changes: [
            { type: 'feature', title: 'Mass Order', description: 'Place multiple orders at once using bulk upload' },
            { type: 'feature', title: 'Giveaway System', description: 'Monthly giveaways with prize tracking' },
            { type: 'feature', title: 'Refund Management', description: 'Complete refund request system with admin approval' }
        ]
    }
];

// ========== INITIALIZE UPDATES PAGE ==========
async function initUpdates() {
    showSkeletonLoader();
    const isAuth = await checkAuthAndLoadUser();
    if (!isAuth) return;
    
    await Promise.all([
        loadUpdates(),
        checkSubscriptionStatus()
    ]);
    
    attachEventListeners();
    updatesState.isLoading = false;
    hideSkeletonLoader();
    animateInElements();
}

// ========== CHECK AUTHENTICATION ==========
async function checkAuthAndLoadUser() {
    const user = window.getCurrentUser();
    if (!user?.uid) {
        window.location.href = '/login.html';
        return false;
    }
    
    updatesState.currentUser = user;
    
    const userDoc = await db.collection('users').doc(user.uid).get();
    const username = userDoc.data()?.username || user.email?.split('@')[0] || 'User';
    
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.innerText = username;
    
    return true;
}

// ========== LOAD UPDATES ==========
async function loadUpdates() {
    try {
        // In production, fetch from Firestore
        // const updatesSnapshot = await db.collection('updates').orderBy('date', 'desc').get();
        
        // Using sample data for demo
        updatesState.updates = SAMPLE_UPDATES;
        renderUpdates();
        
    } catch (error) {
        console.error('Error loading updates:', error);
        updatesState.updates = SAMPLE_UPDATES;
        renderUpdates();
        showGlassToast('Using demo updates data', 'info');
    }
}

function renderUpdates() {
    const container = document.getElementById('updatesList');
    if (!container) return;
    
    let filtered = [...updatesState.updates];
    
    // Apply type filter
    if (updatesState.currentFilter !== 'all') {
        filtered = filtered.map(version => ({
            ...version,
            changes: version.changes.filter(c => c.type === updatesState.currentFilter)
        })).filter(v => v.changes.length > 0);
    }
    
    if (filtered.length === 0) {
        container.innerHTML = renderEmptyState();
        return;
    }
    
    const isMobile = window.innerWidth < 768;
    const start = (updatesState.currentPage - 1) * updatesState.itemsPerPage;
    const pageUpdates = filtered.slice(start, start + updatesState.itemsPerPage);
    const totalPages = Math.ceil(filtered.length / updatesState.itemsPerPage);
    
    if (isMobile) {
        container.innerHTML = `
            <div class="space-y-6 animate-fade-in">
                ${pageUpdates.map((update, idx) => renderUpdateCard(update, idx)).join('')}
            </div>
        `;
    } else {
        container.innerHTML = pageUpdates.map((update, idx) => renderUpdateRow(update, idx)).join('');
    }
    
    renderPagination(totalPages);
}

function renderUpdateRow(update, index) {
    const delay = 0.05 * index;
    const updateDate = new Date(update.date);
    
    return `
        <div class="update-card glass-card rounded-2xl mb-6 overflow-hidden animate-slide-up" style="animation-delay: ${delay}s">
            <div class="update-header p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary/5 to-transparent">
                <div class="flex justify-between items-center flex-wrap gap-3">
                    <div class="flex items-center gap-3">
                        <span class="version-badge px-3 py-1 rounded-full text-sm font-bold bg-primary text-white">${update.version}</span>
                        <span class="text-sm text-gray-500">
                            <i class="far fa-calendar-alt mr-1"></i> ${updateDate.toLocaleDateString('en-BD', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        ${update.highlights.map(h => `<span class="highlight-tag text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">${escapeHtml(h)}</span>`).join('')}
                    </div>
                </div>
                <h3 class="text-xl font-bold mt-3">${escapeHtml(update.title)}</h3>
            </div>
            <div class="p-5">
                <div class="space-y-3">
                    ${update.changes.map(change => renderChangeItem(change)).join('')}
                </div>
            </div>
        </div>
    `;
}

function renderUpdateCard(update, index) {
    const delay = 0.05 * index;
    const updateDate = new Date(update.date);
    
    return `
        <div class="update-card glass-card rounded-2xl overflow-hidden animate-slide-up" style="animation-delay: ${delay}s">
            <div class="p-4 border-b border-gray-200 dark:border-gray-700">
                <div class="flex justify-between items-center mb-2">
                    <span class="version-badge px-2 py-0.5 rounded-full text-xs font-bold bg-primary text-white">${update.version}</span>
                    <span class="text-xs text-gray-400">${updateDate.toLocaleDateString('en-BD')}</span>
                </div>
                <h3 class="font-bold">${escapeHtml(update.title)}</h3>
                <div class="flex flex-wrap gap-1 mt-2">
                    ${update.highlights.slice(0, 2).map(h => `<span class="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">${escapeHtml(h)}</span>`).join('')}
                </div>
            </div>
            <div class="p-4">
                <div class="space-y-2">
                    ${update.changes.slice(0, 3).map(change => `
                        <div class="flex items-start gap-2 text-sm">
                            <span>${UPDATE_TYPES[change.type]?.icon || '📌'}</span>
                            <span class="text-gray-600 dark:text-gray-300">${escapeHtml(change.title)}</span>
                        </div>
                    `).join('')}
                    ${update.changes.length > 3 ? `<div class="text-xs text-primary mt-2">+${update.changes.length - 3} more updates</div>` : ''}
                </div>
            </div>
        </div>
    `;
}

function renderChangeItem(change) {
    const typeConfig = UPDATE_TYPES[change.type] || UPDATE_TYPES.improvement;
    
    return `
        <div class="changelog-item flex gap-3 pb-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <div class="flex-shrink-0">
                <span class="type-badge ${typeConfig.class} text-xs px-2 py-1 rounded-full">
                    ${typeConfig.icon} ${typeConfig.name}
                </span>
            </div>
            <div>
                <h4 class="font-semibold text-gray-800 dark:text-gray-200">${escapeHtml(change.title)}</h4>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">${escapeHtml(change.description)}</p>
            </div>
        </div>
    `;
}

function renderPagination(totalPages) {
    const paginationDiv = document.getElementById('updatesPagination');
    if (!paginationDiv) return;
    
    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    
    let html = `
        <div class="flex justify-center gap-2 mt-8">
            <button class="pagination-btn w-10 h-10 rounded-xl border ${updatesState.currentPage === 1 ? 'opacity-50' : 'hover:border-primary'}" 
                    onclick="changeUpdatesPage(${updatesState.currentPage - 1})" ${updatesState.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
    `;
    
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        html += `<button class="pagination-btn w-10 h-10 rounded-xl ${updatesState.currentPage === i ? 'bg-primary text-white' : 'border hover:border-primary'}" 
                       onclick="changeUpdatesPage(${i})">${i}</button>`;
    }
    
    if (totalPages > 5) {
        html += `<span class="px-2">...</span>`;
        html += `<button class="pagination-btn w-10 h-10 rounded-xl border hover:border-primary" onclick="changeUpdatesPage(${totalPages})">${totalPages}</button>`;
    }
    
    html += `
            <button class="pagination-btn w-10 h-10 rounded-xl border ${updatesState.currentPage === totalPages ? 'opacity-50' : 'hover:border-primary'}" 
                    onclick="changeUpdatesPage(${updatesState.currentPage + 1})" ${updatesState.currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
    
    paginationDiv.innerHTML = html;
}

window.changeUpdatesPage = function(page) {
    let filtered = updatesState.updates;
    if (updatesState.currentFilter !== 'all') {
        filtered = filtered.filter(v => v.changes.some(c => c.type === updatesState.currentFilter));
    }
    const totalPages = Math.ceil(filtered.length / updatesState.itemsPerPage);
    if (page < 1 || page > totalPages) return;
    updatesState.currentPage = page;
    renderUpdates();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ========== CHECK SUBSCRIPTION STATUS ==========
async function checkSubscriptionStatus() {
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;
        
        const subQuery = await db.collection('subscribers')
            .where('userId', '==', user.uid)
            .get();
        
        updatesState.isSubscribed = !subQuery.empty;
        updateSubscribeButton();
        
    } catch (error) {
        console.error('Error checking subscription:', error);
    }
}

function updateSubscribeButton() {
    const subscribeBtn = document.getElementById('subscribeBtn');
    if (!subscribeBtn) return;
    
    if (updatesState.isSubscribed) {
        subscribeBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Subscribed';
        subscribeBtn.classList.remove('btn-primary');
        subscribeBtn.classList.add('bg-green-600', 'hover:bg-green-700');
    } else {
        subscribeBtn.innerHTML = '<i class="fas fa-bell mr-2"></i> Subscribe to Updates';
        subscribeBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
        subscribeBtn.classList.add('btn-primary');
    }
}

// ========== SUBSCRIBE MODAL ==========
function openSubscribeModal() {
    const modal = document.getElementById('subscribeModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Pre-fill email if user is logged in
        const emailInput = document.getElementById('subscribeEmail');
        if (emailInput && updatesState.currentUser?.email) {
            emailInput.value = updatesState.currentUser.email;
        }
    }
}

function closeSubscribeModal() {
    const modal = document.getElementById('subscribeModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

async function confirmSubscribe() {
    const email = document.getElementById('subscribeEmail').value.trim();
    
    if (!email) {
        showGlassToast('Please enter your email address', 'error');
        return;
    }
    
    if (!email.includes('@') || !email.includes('.')) {
        showGlassToast('Please enter a valid email address', 'error');
        return;
    }
    
    const subscribeBtn = document.getElementById('confirmSubscribeBtn');
    const originalText = subscribeBtn.innerHTML;
    subscribeBtn.disabled = true;
    subscribeBtn.innerHTML = '<span class="spinner"></span> Subscribing...';
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) throw new Error('Not authenticated');
        
        if (updatesState.isSubscribed) {
            // Unsubscribe
            const subQuery = await db.collection('subscribers')
                .where('userId', '==', user.uid)
                .get();
            
            const batch = db.batch();
            subQuery.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            
            updatesState.isSubscribed = false;
            showGlassToast('Unsubscribed from update notifications', 'info');
        } else {
            // Subscribe
            await db.collection('subscribers').add({
                email: email,
                userId: user.uid,
                subscribedAt: new Date()
            });
            
            updatesState.isSubscribed = true;
            showGlassToast('Successfully subscribed! You will receive email updates.', 'success');
        }
        
        updateSubscribeButton();
        closeSubscribeModal();
        
    } catch (error) {
        console.error('Error updating subscription:', error);
        showGlassToast('Failed to update subscription', 'error');
    } finally {
        subscribeBtn.disabled = false;
        subscribeBtn.innerHTML = originalText;
    }
}

// ========== FILTER HANDLERS ==========
function setUpdateFilter(filter) {
    updatesState.currentFilter = filter;
    updatesState.currentPage = 1;
    
    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.classList.remove('active', 'bg-primary', 'text-white');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active', 'bg-primary', 'text-white');
        }
    });
    
    renderUpdates();
}

// ========== EMPTY STATE ==========
function renderEmptyState() {
    return `
        <div class="empty-state py-12">
            <div class="empty-icon text-6xl mb-4">📭</div>
            <h3 class="empty-title text-xl font-bold mb-2">No updates found</h3>
            <p class="empty-description text-gray-500 mb-4">${updatesState.currentFilter !== 'all' ? 'Try changing the filter' : 'Check back later for new updates'}</p>
            ${updatesState.currentFilter !== 'all' ? '<button onclick="setUpdateFilter(\'all\')" class="btn-primary">Clear Filter</button>' : ''}
        </div>
    `;
}

// ========== ANIMATIONS & LOADERS ==========
function showSkeletonLoader() {
    const container = document.getElementById('updatesList');
    if (container) {
        container.innerHTML = `
            <div class="space-y-6">
                <div class="skeleton skeleton-card h-48 rounded-2xl"></div>
                <div class="skeleton skeleton-card h-48 rounded-2xl"></div>
                <div class="skeleton skeleton-card h-48 rounded-2xl"></div>
            </div>
        `;
    }
}

function hideSkeletonLoader() {
    // Content replaces skeletons when loaded
}

function animateInElements() {
    document.querySelectorAll('.filter-chip, .update-card').forEach((el, idx) => {
        el.classList.add('animate-slide-up');
        el.style.animationDelay = `${0.03 * idx}s`;
    });
}

// ========== HELPER FUNCTIONS ==========
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
    // Subscribe button
    const subscribeBtn = document.getElementById('subscribeBtn');
    if (subscribeBtn) subscribeBtn.addEventListener('click', openSubscribeModal);
    
    // Confirm subscribe button
    const confirmBtn = document.getElementById('confirmSubscribeBtn');
    if (confirmBtn) confirmBtn.addEventListener('click', confirmSubscribe);
    
    // Close modal on outside click
    const subscribeModal = document.getElementById('subscribeModal');
    if (subscribeModal) {
        subscribeModal.addEventListener('click', (e) => {
            if (e.target === subscribeModal) closeSubscribeModal();
        });
    }
    
    // Enter key in email input
    const emailInput = document.getElementById('subscribeEmail');
    if (emailInput) {
        emailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') confirmSubscribe();
        });
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshUpdatesBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            showSkeletonLoader();
            await loadUpdates();
            hideSkeletonLoader();
            showGlassToast('Updates refreshed', 'success');
        });
    }
}

// ========== EXPORT GLOBALS ==========
window.initUpdates = initUpdates;
window.setUpdateFilter = setUpdateFilter;
window.openSubscribeModal = openSubscribeModal;
window.closeSubscribeModal = closeSubscribeModal;
window.confirmSubscribe = confirmSubscribe;
window.changeUpdatesPage = changeUpdatesPage;

// ========== AUTO-INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('updatesList')) {
        if (window.auth && window.db) {
            await initUpdates();
        } else {
            const checkFirebase = setInterval(async () => {
                if (window.auth && window.db) {
                    clearInterval(checkFirebase);
                    await initUpdates();
                }
            }, 100);
        }
    }
});

console.log('✅ Updates v3.0 (design.md compliant) loaded');