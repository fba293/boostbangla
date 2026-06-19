// ============================================
// BoostBangla Orders Module v3.0
// Fully redesigned following design.md
// Glass morphism filters, status badges
// Real-time search, smooth pagination
// CSV export with modern UI
// ============================================

// ========== GLOBAL STATE ==========
let ordersState = {
    allOrders: [],
    filteredOrders: [],
    currentFilter: 'all',
    currentSearch: '',
    currentPage: 1,
    itemsPerPage: 15,
    isLoading: true,
    sortBy: 'date_desc'
};

// ========== INITIALIZE ORDERS ==========
async function initOrders() {
    showSkeletonLoader();
    await loadOrders();
    attachEventListeners();
    setupRealtimeUpdates();
}

// ========== LOAD ORDERS FROM FIRESTORE ==========
async function loadOrders() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    try {
        const user = window.getCurrentUser();
        if (!user?.uid) {
            console.error('No user logged in');
            tbody.innerHTML = renderAuthError();
            return;
        }

        const ordersSnapshot = await db.collection('orders')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .get();

        ordersState.allOrders = [];
        let totalSpent = 0;

        ordersSnapshot.forEach((doc) => {
            const order = { id: doc.id, ...doc.data() };
            ordersState.allOrders.push(order);
            if (order.status === 'completed') {
                totalSpent += order.priceBDT || 0;
            }
        });

        // Update stats cards (design.md: BIG NUMBERS)
        updateStatsCards(ordersState.allOrders, totalSpent);
        
        ordersState.isLoading = false;
        applyFiltersAndRender();

    } catch (error) {
        console.error('Error loading orders:', error);
        tbody.innerHTML = renderErrorState(error.message);
        ordersState.isLoading = false;
        showGlassToast('Failed to load orders', 'error');
    }
}

// ========== UPDATE STATS CARDS (design.md staggered) ==========
function updateStatsCards(orders, totalSpent) {
    const total = orders.length;
    const pending = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
    const completed = orders.filter(o => o.status === 'completed').length;
    
    animateStatValue('totalOrders', total);
    animateStatValue('pendingOrders', pending);
    animateStatValue('completedOrders', completed);
    animateStatValue('totalSpent', formatCurrencyBDT(totalSpent));
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

// ========== APPLY FILTERS AND RENDER ==========
function applyFiltersAndRender() {
    let filtered = [...ordersState.allOrders];
    
    // Status filter
    if (ordersState.currentFilter !== 'all') {
        filtered = filtered.filter(o => o.status === ordersState.currentFilter);
    }
    
    // Search filter
    if (ordersState.currentSearch) {
        const searchLower = ordersState.currentSearch.toLowerCase();
        filtered = filtered.filter(o => 
            o.id.toLowerCase().includes(searchLower) || 
            (o.serviceName && o.serviceName.toLowerCase().includes(searchLower)) ||
            (o.amarboostOrderId && o.amarboostOrderId.toString().includes(searchLower))
        );
    }
    
    // Sort
    filtered.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
    });
    
    ordersState.filteredOrders = filtered;
    ordersState.currentPage = 1;
    renderOrders();
}

// ========== RENDER ORDERS (responsive: table on desktop, cards on mobile) ==========
function renderOrders() {
    const container = document.getElementById('ordersTableBody');
    if (!container) return;
    
    const start = (ordersState.currentPage - 1) * ordersState.itemsPerPage;
    const pageOrders = ordersState.filteredOrders.slice(start, start + ordersState.itemsPerPage);
    const totalPages = Math.ceil(ordersState.filteredOrders.length / ordersState.itemsPerPage);
    
    if (pageOrders.length === 0) {
        container.innerHTML = renderEmptyOrdersState();
        renderPagination(0);
        return;
    }
    
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
        container.innerHTML = `
            <div class="space-y-4 animate-fade-in">
                ${pageOrders.map((order, idx) => renderOrderCard(order, idx)).join('')}
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="overflow-x-auto">
                <table class="data-table w-full">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Service</th>
                            <th>Quantity</th>
                            <th>Price (BDT)</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pageOrders.map((order, idx) => renderOrderRow(order, idx)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    renderPagination(totalPages);
    attachOrderClickHandlers();
}

// ========== RENDER ORDER ROW (Desktop) ==========
function renderOrderRow(order, index) {
    const delay = 0.03 * (index % 10);
    const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    const orderIdShort = order.amarboostOrderId || order.id.substring(0, 8);
    
    return `
        <tr class="order-row animate-slide-up cursor-pointer hover:bg-orange-50 dark:hover:bg-gray-700 transition-all" 
            style="animation-delay: ${delay}s" 
            data-id="${order.id}">
            <td class="font-mono text-primary font-semibold">#${orderIdShort}</td>
            <td class="max-w-[200px] truncate" title="${escapeHtml(order.serviceName || 'N/A')}">
                ${escapeHtml((order.serviceName || 'N/A').substring(0, 45))}${order.serviceName?.length > 45 ? '...' : ''}
            </td>
            <td>${(order.quantity || 0).toLocaleString()}</td>
            <td class="text-primary font-bold">${formatCurrencyBDT(order.priceBDT || 0)}</td>
            <td>${renderStatusBadge(order.status)}</td>
            <td class="text-gray-500 text-sm">${formatSmartDate(order.createdAt)}</td>
            <td>
                <button class="action-btn text-primary hover:bg-primary/10 p-2 rounded-lg transition" onclick="event.stopPropagation(); viewOrderDetail('${order.id}')">
                    <i class="fas fa-eye"></i>
                </button>
                ${order.status === 'completed' ? `
                    <button class="action-btn text-primary hover:bg-primary/10 p-2 rounded-lg transition ml-1" onclick="event.stopPropagation(); requestRefill('${order.id}')">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                ` : ''}
            </td>
        </tr>
    `;
}

// ========== RENDER ORDER CARD (Mobile - Flutter-like) ==========
function renderOrderCard(order, index) {
    const delay = 0.03 * (index % 10);
    const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    const orderIdShort = order.amarboostOrderId || order.id.substring(0, 8);
    
    return `
        <div class="glass-card p-4 rounded-2xl animate-slide-up cursor-pointer" style="animation-delay: ${delay}s" data-id="${order.id}">
            <div class="flex justify-between items-start mb-3">
                <div>
                    <div class="font-mono text-primary font-semibold">#${orderIdShort}</div>
                    <div class="text-xs text-gray-400">${formatSmartDate(order.createdAt)}</div>
                </div>
                ${renderStatusBadge(order.status)}
            </div>
            <div class="mb-3">
                <div class="text-sm font-medium text-gray-700 dark:text-gray-300">${escapeHtml((order.serviceName || 'N/A').substring(0, 60))}</div>
                <div class="text-xs text-gray-500 mt-1">Quantity: ${(order.quantity || 0).toLocaleString()}</div>
            </div>
            <div class="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-700">
                <div class="text-primary font-black text-xl">${formatCurrencyBDT(order.priceBDT || 0)}</div>
                <div class="flex gap-2">
                    <button class="w-10 h-10 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition" onclick="event.stopPropagation(); viewOrderDetail('${order.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${order.status === 'completed' ? `
                        <button class="w-10 h-10 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition" onclick="event.stopPropagation(); requestRefill('${order.id}')">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// ========== STATUS BADGE (design.md complete) ==========
function renderStatusBadge(status) {
    const statusMap = {
        pending: { class: 'status-pending', text: 'Pending', icon: 'fa-clock' },
        processing: { class: 'status-processing', text: 'Processing', icon: 'fa-spinner fa-spin' },
        completed: { class: 'status-completed', text: 'Completed', icon: 'fa-check-circle' },
        partial: { class: 'status-partial', text: 'Partial', icon: 'fa-exclamation-triangle' },
        cancelled: { class: 'status-cancelled', text: 'Cancelled', icon: 'fa-ban' }
    };
    const s = statusMap[status] || statusMap.pending;
    return `<span class="status-badge ${s.class}"><i class="fas ${s.icon} mr-1"></i> ${s.text}</span>`;
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
    return date.toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ========== FORMAT CURRENCY ==========
function formatCurrencyBDT(amount) {
    if (!amount && amount !== 0) return '৳0';
    return '৳' + Math.round(amount).toLocaleString('en-BD');
}

// ========== RENDER PAGINATION (design.md glass buttons) ==========
function renderPagination(totalPages) {
    const paginationDiv = document.getElementById('pagination');
    if (!paginationDiv) return;
    
    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    
    let html = `
        <div class="flex justify-center gap-2 mt-8">
            <button class="pagination-btn w-10 h-10 rounded-xl border border-gray-200 ${ordersState.currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary'}" 
                    onclick="changeOrderPage(${ordersState.currentPage - 1})" ${ordersState.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
    `;
    
    const maxVisible = 5;
    let startPage = Math.max(1, ordersState.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    if (startPage > 1) {
        html += `<button class="pagination-btn w-10 h-10 rounded-xl border border-gray-200 hover:border-primary" onclick="changeOrderPage(1)">1</button>`;
        if (startPage > 2) html += `<span class="px-2">...</span>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="pagination-btn w-10 h-10 rounded-xl ${ordersState.currentPage === i ? 'bg-primary text-white border-primary' : 'border border-gray-200 hover:border-primary'}" 
                       onclick="changeOrderPage(${i})">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="px-2">...</span>`;
        html += `<button class="pagination-btn w-10 h-10 rounded-xl border border-gray-200 hover:border-primary" onclick="changeOrderPage(${totalPages})">${totalPages}</button>`;
    }
    
    html += `
            <button class="pagination-btn w-10 h-10 rounded-xl border border-gray-200 ${ordersState.currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary'}" 
                    onclick="changeOrderPage(${ordersState.currentPage + 1})" ${ordersState.currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
    
    paginationDiv.innerHTML = html;
}

window.changeOrderPage = function(page) {
    const totalPages = Math.ceil(ordersState.filteredOrders.length / ordersState.itemsPerPage);
    if (page < 1 || page > totalPages) return;
    ordersState.currentPage = page;
    renderOrders();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ========== ATTACH CLICK HANDLERS ==========
function attachOrderClickHandlers() {
    document.querySelectorAll('.order-row, .glass-card[data-id]').forEach(el => {
        el.removeEventListener('click', handleOrderClick);
        el.addEventListener('click', handleOrderClick);
    });
}

function handleOrderClick(e) {
    const target = e.currentTarget;
    const orderId = target.dataset.id;
    if (orderId) viewOrderDetail(orderId);
}

// ========== VIEW ORDER DETAIL ==========
window.viewOrderDetail = function(orderId) {
    window.location.href = `/dashboard/order-detail.html?id=${orderId}`;
};

// ========== REQUEST REFILL ==========
window.requestRefill = async function(orderId) {
    const confirmed = confirm('⚠️ Request a refill for this order? Support will review within 24-48 hours.');
    if (!confirmed) return;
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) throw new Error('Not authenticated');
        
        await db.collection('orders').doc(orderId).update({
            refillRequested: true,
            refillRequestedAt: new Date(),
            updatedAt: new Date()
        });
        
        showGlassToast('Refill request submitted successfully!', 'success');
        
        // Update local state
        const order = ordersState.allOrders.find(o => o.id === orderId);
        if (order) order.refillRequested = true;
        
        renderOrders();
        
    } catch (error) {
        console.error('Refill error:', error);
        showGlassToast('Failed to request refill', 'error');
    }
};

// ========== EXPORT TO CSV ==========
function exportToCSV() {
    if (ordersState.filteredOrders.length === 0) {
        showGlassToast('No orders to export', 'error');
        return;
    }
    
    const headers = ['Order ID', 'Service Name', 'Quantity', 'Price BDT', 'Price USD', 'Status', 'Date', 'Link'];
    const rows = ordersState.filteredOrders.map(order => [
        order.amarboostOrderId || order.id,
        order.serviceName || 'N/A',
        order.quantity || 0,
        order.priceBDT || 0,
        order.priceUSD || 0,
        order.status,
        formatExportDate(order.createdAt),
        order.link || ''
    ]);
    
    const csvContent = [headers, ...rows].map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `orders_${new Date().toISOString().slice(0, 19)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showGlassToast(`${ordersState.filteredOrders.length} orders exported!`, 'success');
}

function formatExportDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-BD');
}

// ========== FILTER HANDLERS ==========
function setOrderFilter(filter) {
    ordersState.currentFilter = filter;
    ordersState.currentPage = 1;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-primary', 'text-white');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active', 'bg-primary', 'text-white');
        }
    });
    
    applyFiltersAndRender();
}

function setupSearch() {
    const searchInput = document.getElementById('searchOrders');
    if (!searchInput) return;
    
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            ordersState.currentSearch = e.target.value;
            ordersState.currentPage = 1;
            applyFiltersAndRender();
        }, 300);
    });
}

// ========== REAL-TIME UPDATES ==========
let ordersListener = null;

function setupRealtimeUpdates() {
    const user = window.getCurrentUser();
    if (!user?.uid) return;
    
    if (ordersListener) ordersListener();
    
    ordersListener = db.collection('orders')
        .where('userId', '==', user.uid)
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            let hasChanges = false;
            snapshot.docChanges().forEach(change => {
                if (change.type === 'modified') {
                    hasChanges = true;
                }
            });
            
            if (hasChanges) {
                loadOrders();
                showGlassToast('Orders updated', 'info');
            }
        }, (error) => {
            console.error('Realtime error:', error);
        });
}

// ========== EMPTY STATES ==========
function renderEmptyOrdersState() {
    return `
        <div class="empty-state py-12">
            <div class="empty-icon text-6xl mb-4">📭</div>
            <h3 class="empty-title text-xl font-bold mb-2">No orders found</h3>
            <p class="empty-description text-gray-500 mb-4">${ordersState.currentSearch ? 'Try adjusting your search' : 'Place your first order from the Services page'}</p>
            ${!ordersState.currentSearch ? '<button onclick="window.location.href=\'/dashboard/services.html\'" class="btn-primary">Browse Services →</button>' : '<button onclick="clearOrderSearch()" class="btn-primary">Clear Search</button>'}
        </div>
    `;
}

function clearOrderSearch() {
    const searchInput = document.getElementById('searchOrders');
    if (searchInput) {
        searchInput.value = '';
        ordersState.currentSearch = '';
        applyFiltersAndRender();
    }
}

function renderErrorState(message) {
    return `
        <div class="empty-state py-12">
            <div class="empty-icon text-6xl mb-4">❌</div>
            <h3 class="empty-title text-xl font-bold mb-2">Error loading orders</h3>
            <p class="empty-description text-gray-500 mb-4">${escapeHtml(message)}</p>
            <button onclick="location.reload()" class="btn-primary">Retry</button>
        </div>
    `;
}

function renderAuthError() {
    return `
        <div class="empty-state py-12">
            <div class="empty-icon text-6xl mb-4">🔒</div>
            <h3 class="empty-title text-xl font-bold mb-2">Please login</h3>
            <p class="empty-description text-gray-500 mb-4">You need to be logged in to view your orders</p>
            <a href="/login.html" class="btn-primary">Login</a>
        </div>
    `;
}

// ========== SKELETON LOADER ==========
function showSkeletonLoader() {
    const container = document.getElementById('ordersTableBody');
    if (!container) return;
    
    container.innerHTML = `
        <div class="space-y-3">
            <div class="skeleton skeleton-card h-16 rounded-xl"></div>
            <div class="skeleton skeleton-card h-16 rounded-xl"></div>
            <div class="skeleton skeleton-card h-16 rounded-xl"></div>
            <div class="skeleton skeleton-card h-16 rounded-xl"></div>
        </div>
    `;
}

// ========== GLASS TOAST ==========
function showGlassToast(message, type = 'success') {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else {
        console.log(`[${type}] ${message}`);
    }
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
    setupSearch();
    
    // Export button
    const exportBtn = document.getElementById('exportCSVBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToCSV);
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshOrdersBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            showSkeletonLoader();
            loadOrders();
        });
    }
    
    // Responsive view
    window.addEventListener('resize', () => {
        if (document.getElementById('ordersTableBody')) {
            renderOrders();
        }
    });
}

// ========== EXPORT GLOBALS ==========
window.initOrders = initOrders;
window.setOrderFilter = setOrderFilter;
window.viewOrderDetail = viewOrderDetail;
window.requestRefill = requestRefill;
window.changeOrderPage = changeOrderPage;
window.clearOrderSearch = clearOrderSearch;

// ========== AUTO-INIT ==========
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('ordersTableBody')) {
        if (window.auth && window.db) {
            initOrders();
        } else {
            const checkFirebase = setInterval(() => {
                if (window.auth && window.db) {
                    clearInterval(checkFirebase);
                    initOrders();
                }
            }, 100);
        }
    }
});

console.log('✅ Orders v3.0 (design.md compliant) loaded');