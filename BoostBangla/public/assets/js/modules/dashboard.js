// ============================================
// BoostBangla Dashboard v3.0
// Fully redesigned following design.md
// Flutter-like smooth UI, fully responsive
// Dark mode, glass morphism, animations
// ============================================

// ========== GLOBAL STATE ==========
let dashboardState = {
    stats: { balance: 0, totalOrders: 0, completed: 0, pending: 0, totalSpent: 0 },
    recentOrders: [],
    isLoading: true,
    error: null
};

// ========== INITIALIZE DASHBOARD ==========
async function initDashboard() {
    showSkeletonLoader();
    await checkAuthAndLoad();
    attachEventListeners();
    startBackgroundRefresh();
}

// ========== AUTH + DATA LOAD ==========
async function checkAuthAndLoad() {
    const user = window.getCurrentUser();
    if (!user?.uid) {
        window.location.href = '/login.html';
        return;
    }
    await Promise.all([loadDashboardStats(), loadRecentOrders()]);
    hideSkeletonLoader();
    animateStatsCards();
}

// ========== LOAD STATS (design.md: BIG BOLD NUMBERS) ==========
async function loadDashboardStats() {
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;

        const userDoc = await db.collection('users').doc(user.uid).get();
        const balance = userDoc.data()?.balance || 0;
        
        const ordersSnap = await db.collection('orders')
            .where('userId', '==', user.uid)
            .get();
        
        let completed = 0, pending = 0, totalSpentBDT = 0;
        ordersSnap.forEach(doc => {
            const order = doc.data();
            if (order.status === 'completed') completed++;
            else if (order.status === 'pending' || order.status === 'processing') pending++;
            totalSpentBDT += order.priceBDT || 0;
        });

        dashboardState.stats = {
            balance,
            totalOrders: ordersSnap.size,
            completed,
            pending,
            totalSpent: totalSpentBDT
        };

        // Update DOM with animation delays (design.md staggered)
        updateStatCard('balanceAmount', `৳${balance.toLocaleString()}`, 0.05);
        updateStatCard('totalOrders', dashboardState.stats.totalOrders, 0.10);
        updateStatCard('completedOrders', dashboardState.stats.completed, 0.15);
        updateStatCard('pendingOrders', dashboardState.stats.pending, 0.20);
        
        if (document.getElementById('totalSpent')) {
            updateStatCard('totalSpent', `৳${totalSpentBDT.toLocaleString()}`, 0.25);
        }

    } catch (error) {
        console.error('Stats error:', error);
        showGlassToast('Failed to load dashboard data', 'error');
        dashboardState.error = error.message;
    }
}

// ========== UPDATE STAT CARD WITH SMOOTH COUNTER ==========
function updateStatCard(elementId, newValue, delaySec = 0) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const oldValue = element.innerText;
    const animatedSpan = document.createElement('span');
    animatedSpan.className = 'animate-fade-in-up';
    animatedSpan.style.animationDelay = `${delaySec}s`;
    animatedSpan.innerText = newValue;
    
    element.innerText = '';
    element.appendChild(animatedSpan);
}

// ========== LOAD RECENT ORDERS (design.md glass-card + hover) ==========
async function loadRecentOrders() {
    const container = document.getElementById('recentOrdersTable');
    if (!container) return;

    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;

        const ordersSnap = await db.collection('orders')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();

        if (ordersSnap.empty) {
            container.innerHTML = renderEmptyState('No orders yet', '📦', 'Browse services →', '/dashboard/services.html');
            return;
        }

        let html = `
            <div class="overflow-x-auto">
                <table class="data-table">
                    <thead>
                        <tr><th>Order ID</th><th>Service</th><th>Quantity</th><th>Price</th><th>Status</th><th>Date</th><th></th></tr>
                    </thead>
                    <tbody>
        `;

        ordersSnap.forEach((doc, index) => {
            const order = doc.data();
            const delay = 0.05 * index;
            html += `
                <tr class="animate-slide-up" style="animation-delay: ${delay}s; cursor: pointer;" 
                    onclick="window.location.href='/dashboard/order-detail.html?id=${doc.id}'">
                    <td class="font-mono text-primary font-semibold">#${doc.id.substring(0, 8)}</td>
                    <td class="max-w-[200px] truncate" title="${escapeHtml(order.serviceName || 'N/A')}">
                        ${escapeHtml((order.serviceName || 'N/A').substring(0, 40))}
                    </td>
                    <td>${(order.quantity || 0).toLocaleString()}</td>
                    <td class="text-primary font-bold">${formatCurrencyBDT(order.priceBDT || 0)}</td>
                    <td>${renderStatusBadge(order.status)}</td>
                    <td class="text-gray-500 text-sm">${formatSmartDate(order.createdAt)}</td>
                    <td><i class="fas fa-chevron-right text-primary/50"></i></td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
        container.innerHTML = html;

    } catch (error) {
        console.error('Recent orders error:', error);
        container.innerHTML = renderEmptyState('Failed to load orders', '⚠️', 'Retry', '#');
    }
}

// ========== STATUS BADGE (design.md) ==========
function renderStatusBadge(status) {
    const statusMap = {
        pending: { class: 'status-pending', text: 'Pending', icon: '⏳' },
        processing: { class: 'status-processing', text: 'Processing', icon: '🔄' },
        completed: { class: 'status-completed', text: 'Completed', icon: '✅' },
        cancelled: { class: 'status-cancelled', text: 'Cancelled', icon: '❌' }
    };
    const s = statusMap[status] || statusMap.pending;
    return `<span class="status-badge ${s.class}"><i class="fas ${s.icon === '✅' ? 'fa-check-circle' : s.icon === '🔄' ? 'fa-spinner fa-spin' : 'fa-clock'} mr-1"></i> ${s.text}</span>`;
}

// ========== FORMAT CURRENCY (BDT) ==========
function formatCurrencyBDT(amount) {
    if (!amount && amount !== 0) return '৳0';
    return '৳' + Math.round(amount).toLocaleString('en-BD');
}

// ========== SMART DATE (design.md) ==========
function formatSmartDate(timestamp) {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleDateString('en-BD', { day: 'numeric', month: 'short' });
}

// ========== EMPTY STATE (design.md) ==========
function renderEmptyState(message, icon, buttonText, buttonLink) {
    return `
        <div class="empty-state">
            <div class="empty-icon">${icon}</div>
            <h3 class="empty-title">${message}</h3>
            <button class="btn-primary mt-4" onclick="window.location.href='${buttonLink}'">${buttonText}</button>
        </div>
    `;
}

// ========== SKELETON LOADER (design.md shimmer) ==========
function showSkeletonLoader() {
    const container = document.getElementById('recentOrdersTable');
    if (!container) return;
    container.innerHTML = `
        <div class="space-y-3">
            <div class="skeleton skeleton-text w-full"></div>
            <div class="skeleton skeleton-text w-full"></div>
            <div class="skeleton skeleton-text w-full"></div>
            <div class="skeleton skeleton-text w-3/4"></div>
        </div>
    `;
}

function hideSkeletonLoader() {
    // Handled when data replaces content
}

// ========== ANIMATE STATS CARDS (design.md float effect) ==========
function animateStatsCards() {
    document.querySelectorAll('.stat-card').forEach((card, idx) => {
        card.classList.add('animate-slide-up');
        card.style.animationDelay = `${0.05 * idx}s`;
    });
}

// ========== GLASS TOAST (design.md) ==========
function showGlassToast(message, type = 'success') {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} animate-slide-in-right`;
        toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

// ========== AUTO REFRESH (every 30s) ==========
function startBackgroundRefresh() {
    setInterval(async () => {
        if (!document.hidden) {
            await loadDashboardStats();
            await loadRecentOrders();
        }
    }, 30000);
}

// ========== ESCAPE HTML ==========
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ========== EVENT LISTENERS ==========
function attachEventListeners() {
    // Refresh button if exists
    const refreshBtn = document.getElementById('refreshDashboardBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            showSkeletonLoader();
            await Promise.all([loadDashboardStats(), loadRecentOrders()]);
            hideSkeletonLoader();
            showGlassToast('Dashboard refreshed', 'success');
        });
    }
}

// ========== EXPORT GLOBALS ==========
window.initDashboard = initDashboard;
window.formatCurrencyBDT = formatCurrencyBDT;

// ========== AUTO-INIT ==========
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('balanceAmount')) {
        if (window.auth && window.db) {
            initDashboard();
        } else {
            const checkFirebase = setInterval(() => {
                if (window.auth && window.db) {
                    clearInterval(checkFirebase);
                    initDashboard();
                }
            }, 100);
        }
    }
});

console.log('✅ Dashboard v3.0 (design.md compliant) loaded');