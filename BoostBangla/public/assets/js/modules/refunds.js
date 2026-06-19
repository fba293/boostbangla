// ============================================
// BoostBangla Refunds Module v3.0
// Fully redesigned following design.md
// Order validation with real-time feedback
// Refund reason cards with icons
// Status timeline with milestones
// Admin notes with glass styling
// Refund history with status filters
// ============================================

// ========== GLOBAL STATE ==========
let refundsState = {
    currentUser: null,
    userOrders: [],
    userRefunds: [],
    selectedOrder: null,
    currentFilter: 'all',
    currentPage: 1,
    itemsPerPage: 10,
    isLoading: true,
    refundStats: {
        pending: 0,
        approved: 0,
        rejected: 0,
        totalRefunded: 0
    }
};

// Refund reason configuration
const REFUND_REASONS = [
    { id: 'not_delivered', label: 'Not delivered', icon: 'fa-clock', description: 'Order hasn\'t been delivered within expected time', color: '#f59e0b' },
    { id: 'wrong_service', label: 'Wrong service', icon: 'fa-exchange-alt', description: 'Service delivered doesn\'t match description', color: '#ef4444' },
    { id: 'duplicate', label: 'Duplicate order', icon: 'fa-copy', description: 'Accidentally placed duplicate order', color: '#3b82f6' },
    { id: 'technical_error', label: 'Technical error', icon: 'fa-bug', description: 'System error caused incorrect order', color: '#8b5cf6' },
    { id: 'other', label: 'Other reason', icon: 'fa-comment', description: 'Please provide details below', color: '#6b7280' }
];

// ========== INITIALIZE REFUNDS PAGE ==========
async function initRefunds() {
    showSkeletonLoader();
    const isAuth = await checkAuthAndLoadUser();
    if (!isAuth) return;
    
    await Promise.all([
        loadUserOrders(),
        loadRefundHistory()
    ]);
    
    attachEventListeners();
    setupOrderValidation();
    refundsState.isLoading = false;
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
    
    refundsState.currentUser = user;
    
    const userDoc = await db.collection('users').doc(user.uid).get();
    const username = userDoc.data()?.username || user.email?.split('@')[0] || 'User';
    
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.innerText = username;
    
    return true;
}

// ========== LOAD USER ORDERS ==========
async function loadUserOrders() {
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;
        
        const ordersSnapshot = await db.collection('orders')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        refundsState.userOrders = [];
        ordersSnapshot.forEach(doc => {
            const order = { id: doc.id, ...doc.data() };
            // Only include eligible orders (pending/processing, not already refunded)
            if (order.status === 'pending' || order.status === 'processing') {
                refundsState.userOrders.push(order);
            }
        });
        
        // Update eligible orders count
        const eligibleCount = document.getElementById('eligibleOrdersCount');
        if (eligibleCount) eligibleCount.innerText = refundsState.userOrders.length;
        
    } catch (error) {
        console.error('Error loading orders:', error);
        showGlassToast('Failed to load orders', 'error');
    }
}

// ========== LOAD REFUND HISTORY ==========
async function loadRefundHistory() {
    const container = document.getElementById('refundHistoryList');
    if (!container) return;
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;
        
        const refundsSnapshot = await db.collection('refunds')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        refundsState.userRefunds = [];
        let stats = { pending: 0, approved: 0, rejected: 0, totalRefunded: 0 };
        
        refundsSnapshot.forEach(doc => {
            const refund = { id: doc.id, ...doc.data() };
            refundsState.userRefunds.push(refund);
            
            if (refund.status === 'pending') stats.pending++;
            else if (refund.status === 'approved' || refund.status === 'completed') {
                stats.approved++;
                stats.totalRefunded += refund.amount || 0;
            }
            else if (refund.status === 'rejected') stats.rejected++;
        });
        
        refundsState.refundStats = stats;
        
        updateStatsCards();
        applyFilterAndRenderHistory();
        
    } catch (error) {
        console.error('Error loading refunds:', error);
        container.innerHTML = renderErrorState();
        showGlassToast('Failed to load refund history', 'error');
    }
}

function updateStatsCards() {
    animateStatValue('pendingCount', refundsState.refundStats.pending);
    animateStatValue('approvedCount', refundsState.refundStats.approved);
    animateStatValue('rejectedCount', refundsState.refundStats.rejected);
    animateStatValue('totalRefunded', formatCurrencyBDT(refundsState.refundStats.totalRefunded));
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

// ========== APPLY FILTER AND RENDER HISTORY ==========
function applyFilterAndRenderHistory() {
    let filtered = [...refundsState.userRefunds];
    
    if (refundsState.currentFilter !== 'all') {
        filtered = filtered.filter(r => r.status === refundsState.currentFilter);
    }
    
    const start = (refundsState.currentPage - 1) * refundsState.itemsPerPage;
    const pageRefunds = filtered.slice(start, start + refundsState.itemsPerPage);
    const totalPages = Math.ceil(filtered.length / refundsState.itemsPerPage);
    
    renderRefundHistory(pageRefunds, totalPages);
}

function renderRefundHistory(refunds, totalPages) {
    const container = document.getElementById('refundHistoryList');
    if (!container) return;
    
    if (refunds.length === 0) {
        container.innerHTML = renderEmptyHistoryState();
        renderHistoryPagination(0);
        return;
    }
    
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
        container.innerHTML = `
            <div class="space-y-4 animate-fade-in">
                ${refunds.map((refund, idx) => renderRefundCard(refund, idx)).join('')}
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="overflow-x-auto">
                <table class="data-table w-full">
                    <thead>
                        <tr>
                            <th>Request ID</th>
                            <th>Order ID</th>
                            <th>Amount</th>
                            <th>Reason</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Admin Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${refunds.map((refund, idx) => renderRefundRow(refund, idx)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    renderHistoryPagination(totalPages);
}

function renderRefundRow(refund, index) {
    const delay = 0.03 * (index % 10);
    const statusConfig = getStatusConfig(refund.status);
    const reasonConfig = REFUND_REASONS.find(r => r.id === refund.reason) || REFUND_REASONS[4];
    const date = refund.createdAt?.toDate ? refund.createdAt.toDate() : new Date(refund.createdAt);
    const orderIdShort = refund.orderId?.substring(0, 8) || 'N/A';
    
    return `
        <tr class="animate-slide-up hover:bg-gray-50 dark:hover:bg-gray-800 transition-all" style="animation-delay: ${delay}s">
            <td class="font-mono text-xs text-primary">#${refund.id.substring(0, 8)}</td>
            <td class="font-mono text-xs">${orderIdShort}</td>
            <td class="font-semibold text-primary">${formatCurrencyBDT(refund.amount || 0)}</td>
            <td><div class="flex items-center gap-1"><i class="fas ${reasonConfig.icon} text-xs"></i><span class="text-sm">${reasonConfig.label}</span></div></td>
            <td><span class="status-badge ${statusConfig.class}">${statusConfig.icon} ${statusConfig.text}</span></td>
            <td class="text-sm text-gray-500">${formatDate(date)}</td>
            <td class="max-w-[150px] truncate" title="${escapeHtml(refund.adminNote || '')}">${escapeHtml(refund.adminNote?.substring(0, 30) || '-')}</td>
        </tr>
    `;
}

function renderRefundCard(refund, index) {
    const delay = 0.03 * (index % 10);
    const statusConfig = getStatusConfig(refund.status);
    const reasonConfig = REFUND_REASONS.find(r => r.id === refund.reason) || REFUND_REASONS[4];
    const date = refund.createdAt?.toDate ? refund.createdAt.toDate() : new Date(refund.createdAt);
    const orderIdShort = refund.orderId?.substring(0, 8) || 'N/A';
    
    return `
        <div class="glass-card p-4 rounded-2xl animate-slide-up" style="animation-delay: ${delay}s">
            <div class="flex justify-between items-start mb-3">
                <div>
                    <div class="font-mono text-primary text-xs">#${refund.id.substring(0, 8)}</div>
                    <div class="text-xs text-gray-400">Order: ${orderIdShort}</div>
                </div>
                <span class="status-badge ${statusConfig.class}">${statusConfig.icon} ${statusConfig.text}</span>
            </div>
            <div class="flex justify-between items-center mb-2">
                <div class="flex items-center gap-2">
                    <i class="fas ${reasonConfig.icon} text-gray-400"></i>
                    <span class="text-sm">${reasonConfig.label}</span>
                </div>
                <div class="text-primary font-bold">${formatCurrencyBDT(refund.amount || 0)}</div>
            </div>
            <div class="text-xs text-gray-400">${formatDate(date)}</div>
            ${refund.adminNote ? `<div class="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">📝 ${escapeHtml(refund.adminNote)}</div>` : ''}
        </div>
    `;
}

function renderHistoryPagination(totalPages) {
    const paginationDiv = document.getElementById('historyPagination');
    if (!paginationDiv) return;
    
    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    
    let html = `
        <div class="flex justify-center gap-2 mt-6">
            <button class="pagination-btn w-10 h-10 rounded-xl border ${refundsState.currentPage === 1 ? 'opacity-50' : 'hover:border-primary'}" 
                    onclick="changeHistoryPage(${refundsState.currentPage - 1})" ${refundsState.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
    `;
    
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        html += `<button class="pagination-btn w-10 h-10 rounded-xl ${refundsState.currentPage === i ? 'bg-primary text-white' : 'border hover:border-primary'}" 
                       onclick="changeHistoryPage(${i})">${i}</button>`;
    }
    
    if (totalPages > 5) {
        html += `<span class="px-2">...</span>`;
        html += `<button class="pagination-btn w-10 h-10 rounded-xl border hover:border-primary" onclick="changeHistoryPage(${totalPages})">${totalPages}</button>`;
    }
    
    html += `
            <button class="pagination-btn w-10 h-10 rounded-xl border ${refundsState.currentPage === totalPages ? 'opacity-50' : 'hover:border-primary'}" 
                    onclick="changeHistoryPage(${refundsState.currentPage + 1})" ${refundsState.currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
    
    paginationDiv.innerHTML = html;
}

window.changeHistoryPage = function(page) {
    let filtered = refundsState.userRefunds;
    if (refundsState.currentFilter !== 'all') {
        filtered = filtered.filter(r => r.status === refundsState.currentFilter);
    }
    const totalPages = Math.ceil(filtered.length / refundsState.itemsPerPage);
    if (page < 1 || page > totalPages) return;
    refundsState.currentPage = page;
    applyFilterAndRenderHistory();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ========== ORDER VALIDATION ==========
function setupOrderValidation() {
    const orderIdInput = document.getElementById('refundOrderId');
    if (!orderIdInput) return;
    
    orderIdInput.addEventListener('input', debounce(async (e) => {
        const orderId = e.target.value.trim();
        if (!orderId) {
            clearOrderValidation();
            return;
        }
        
        const order = refundsState.userOrders.find(o => o.id === orderId);
        const validationDiv = document.getElementById('orderValidation');
        const amountInput = document.getElementById('refundAmount');
        
        if (order) {
            // Check if refund already requested
            const existingRefund = refundsState.userRefunds.find(r => r.orderId === orderId);
            if (existingRefund) {
                validationDiv.innerHTML = `
                    <div class="text-red-500 text-sm mt-1">
                        <i class="fas fa-exclamation-circle mr-1"></i> Refund already requested for this order (Status: ${existingRefund.status})
                    </div>
                `;
                amountInput.value = '';
                amountInput.disabled = true;
                refundsState.selectedOrder = null;
            } else {
                validationDiv.innerHTML = `
                    <div class="text-green-600 text-sm mt-1">
                        <i class="fas fa-check-circle mr-1"></i> Order found! Service: ${escapeHtml(order.serviceName?.substring(0, 50))}
                    </div>
                `;
                amountInput.value = order.priceBDT || 0;
                amountInput.disabled = false;
                refundsState.selectedOrder = order;
            }
        } else {
            validationDiv.innerHTML = `
                <div class="text-red-500 text-sm mt-1">
                    <i class="fas fa-exclamation-triangle mr-1"></i> Order not found or not eligible for refund
                </div>
            `;
            amountInput.value = '';
            amountInput.disabled = true;
            refundsState.selectedOrder = null;
        }
    }, 500));
}

function clearOrderValidation() {
    const validationDiv = document.getElementById('orderValidation');
    const amountInput = document.getElementById('refundAmount');
    if (validationDiv) validationDiv.innerHTML = '';
    if (amountInput) {
        amountInput.value = '';
        amountInput.disabled = true;
    }
    refundsState.selectedOrder = null;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ========== REFUND REASON SELECTION ==========
function selectRefundReason(reasonId) {
    // Update UI
    document.querySelectorAll('.reason-card').forEach(card => {
        card.classList.remove('border-primary', 'bg-primary/5', 'scale-105');
        card.classList.add('border-gray-200', 'dark:border-gray-700');
    });
    
    const selectedCard = document.querySelector(`.reason-card[data-reason="${reasonId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('border-primary', 'bg-primary/5', 'scale-105');
        selectedCard.classList.remove('border-gray-200', 'dark:border-gray-700');
    }
    
    // Store selected reason
    document.getElementById('refundReason').value = reasonId;
    
    // Show/hide other reason textarea
    const otherReasonDiv = document.getElementById('otherReasonDiv');
    if (otherReasonDiv) {
        otherReasonDiv.classList.toggle('hidden', reasonId !== 'other');
    }
}

// ========== SUBMIT REFUND REQUEST ==========
async function submitRefundRequest(e) {
    e.preventDefault();
    
    const orderId = document.getElementById('refundOrderId').value.trim();
    const amount = parseFloat(document.getElementById('refundAmount').value);
    const reason = document.getElementById('refundReason').value;
    const description = document.getElementById('refundDescription').value;
    
    // Validation
    if (!orderId) {
        showGlassToast('Please enter an Order ID', 'error');
        return;
    }
    
    if (!refundsState.selectedOrder) {
        showGlassToast('Order not found or not eligible for refund', 'error');
        return;
    }
    
    if (!reason) {
        showGlassToast('Please select a reason for refund', 'error');
        return;
    }
    
    if (reason === 'other' && !description) {
        showGlassToast('Please provide details for your refund request', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) throw new Error('Not authenticated');
        
        await db.collection('refunds').add({
            userId: user.uid,
            userEmail: user.email,
            orderId: orderId,
            amount: amount,
            reason: reason,
            description: description || null,
            status: 'pending',
            orderDetails: {
                serviceName: refundsState.selectedOrder.serviceName,
                quantity: refundsState.selectedOrder.quantity,
                priceBDT: refundsState.selectedOrder.priceBDT,
                orderDate: refundsState.selectedOrder.createdAt
            },
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        showGlassToast('Refund request submitted successfully! Our team will review it within 3-5 business days.', 'success');
        
        // Reset form
        document.getElementById('refundRequestForm').reset();
        document.getElementById('refundAmount').value = '';
        document.getElementById('refundAmount').disabled = true;
        document.getElementById('otherReasonDiv').classList.add('hidden');
        refundsState.selectedOrder = null;
        
        // Reset reason cards
        document.querySelectorAll('.reason-card').forEach(card => {
            card.classList.remove('border-primary', 'bg-primary/5', 'scale-105');
            card.classList.add('border-gray-200', 'dark:border-gray-700');
        });
        
        // Reload data
        await Promise.all([
            loadUserOrders(),
            loadRefundHistory()
        ]);
        
    } catch (error) {
        console.error('Error submitting refund:', error);
        showGlassToast('Failed to submit refund request. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ========== FILTER HANDLERS ==========
function setRefundFilter(filter) {
    refundsState.currentFilter = filter;
    refundsState.currentPage = 1;
    
    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.classList.remove('active', 'bg-primary', 'text-white');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active', 'bg-primary', 'text-white');
        }
    });
    
    applyFilterAndRenderHistory();
}

// ========== STATUS CONFIGURATIONS ==========
function getStatusConfig(status) {
    const map = {
        pending: { class: 'status-pending', icon: '⏳', text: 'Pending Review' },
        approved: { class: 'status-success', icon: '✅', text: 'Approved' },
        rejected: { class: 'status-cancelled', icon: '❌', text: 'Rejected' },
        completed: { class: 'status-completed', icon: '💰', text: 'Refunded' }
    };
    return map[status] || map.pending;
}

// ========== RENDER REASON CARDS ==========
function renderReasonCards() {
    const container = document.getElementById('reasonCardsContainer');
    if (!container) return;
    
    container.innerHTML = REFUND_REASONS.map((reason, idx) => {
        const delay = 0.05 * idx;
        return `
            <div class="reason-card glass-card p-4 rounded-xl cursor-pointer transition-all border border-gray-200 dark:border-gray-700 hover:shadow-lg animate-slide-up" 
                 style="animation-delay: ${delay}s"
                 data-reason="${reason.id}"
                 onclick="selectRefundReason('${reason.id}')">
                <div class="text-center">
                    <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <i class="fas ${reason.icon} text-primary text-xl"></i>
                    </div>
                    <div class="font-semibold text-sm">${reason.label}</div>
                    <div class="text-xs text-gray-400 mt-1">${reason.description}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ========== EMPTY & ERROR STATES ==========
function renderEmptyHistoryState() {
    return `
        <div class="empty-state py-12">
            <div class="empty-icon text-6xl mb-4">📭</div>
            <h3 class="empty-title text-xl font-bold mb-2">No refund requests</h3>
            <p class="empty-description text-gray-500 mb-4">Your refund history will appear here</p>
        </div>
    `;
}

function renderErrorState() {
    return `
        <div class="empty-state py-12">
            <div class="empty-icon text-6xl mb-4">❌</div>
            <h3 class="empty-title text-xl font-bold mb-2">Failed to load refund history</h3>
            <button onclick="location.reload()" class="btn-primary">Retry</button>
        </div>
    `;
}

// ========== ANIMATIONS & LOADERS ==========
function showSkeletonLoader() {
    const container = document.getElementById('refundHistoryList');
    if (container) {
        container.innerHTML = `
            <div class="space-y-3">
                <div class="skeleton skeleton-card h-20 rounded-xl"></div>
                <div class="skeleton skeleton-card h-20 rounded-xl"></div>
                <div class="skeleton skeleton-card h-20 rounded-xl"></div>
            </div>
        `;
    }
}

function hideSkeletonLoader() {
    // Content replaces skeletons when loaded
}

function animateInElements() {
    document.querySelectorAll('.stat-card, .reason-card, .glass-card').forEach((el, idx) => {
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
    // Refund form submission
    const refundForm = document.getElementById('refundRequestForm');
    if (refundForm) refundForm.addEventListener('submit', submitRefundRequest);
    
    // Filter chips
    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            setRefundFilter(btn.dataset.filter);
        });
    });
    
    // Eligible orders count click - populate order ID
    const eligibleCount = document.getElementById('eligibleOrdersCount');
    if (eligibleCount && refundsState.userOrders.length > 0) {
        eligibleCount.style.cursor = 'pointer';
        eligibleCount.addEventListener('click', () => {
            if (refundsState.userOrders.length > 0) {
                const orderIdInput = document.getElementById('refundOrderId');
                if (orderIdInput) {
                    orderIdInput.value = refundsState.userOrders[0].id;
                    // Trigger validation
                    const event = new Event('input', { bubbles: true });
                    orderIdInput.dispatchEvent(event);
                }
                showGlassToast(`Order ID ${refundsState.userOrders[0].id.substring(0, 8)}... filled`, 'info');
            }
        });
    }
}

// ========== EXPORT GLOBALS ==========
window.initRefunds = initRefunds;
window.selectRefundReason = selectRefundReason;
window.setRefundFilter = setRefundFilter;
window.changeHistoryPage = changeHistoryPage;

// ========== AUTO-INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('refundRequestForm')) {
        if (window.auth && window.db) {
            await initRefunds();
            renderReasonCards();
        } else {
            const checkFirebase = setInterval(async () => {
                if (window.auth && window.db) {
                    clearInterval(checkFirebase);
                    await initRefunds();
                    renderReasonCards();
                }
            }, 100);
        }
    }
});

console.log('✅ Refunds v3.0 (design.md compliant) loaded');