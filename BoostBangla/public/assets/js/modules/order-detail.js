// ============================================
// BoostBangla Order Detail Module v3.0
// Fully redesigned following design.md
// Status timeline with milestone tracking
// Glass order details card
// Refill request modal with confirmation
// Cancellation flow with validation
// Real-time status updates via WebSocket
// ============================================

// ========== GLOBAL STATE ==========
let orderDetailState = {
    currentUser: null,
    order: null,
    orderId: null,
    isLoading: true,
    refillRequested: false,
    cancellationInProgress: false
};

// Status timeline configuration
const STATUS_MILESTONES = [
    { key: 'pending', label: 'Order Placed', icon: 'fa-clock', description: 'Your order has been received' },
    { key: 'processing', label: 'Processing', icon: 'fa-spinner', description: 'Your order is being processed' },
    { key: 'completed', label: 'Completed', icon: 'fa-check-circle', description: 'Order completed successfully' }
];

const CANCELLABLE_STATUSES = ['pending', 'processing'];

// ========== INITIALIZE ORDER DETAIL PAGE ==========
async function initOrderDetail() {
    showSkeletonLoader();
    const isAuth = await checkAuthAndLoadUser();
    if (!isAuth) return;
    
    getOrderIdFromUrl();
    await loadOrderDetails();
    setupRealtimeUpdates();
    attachEventListeners();
    
    orderDetailState.isLoading = false;
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
    
    orderDetailState.currentUser = user;
    return true;
}

// ========== GET ORDER ID FROM URL ==========
function getOrderIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    orderDetailState.orderId = urlParams.get('id');
    
    if (!orderDetailState.orderId) {
        showErrorState('No order ID provided', 'Please go back and select an order to view.');
    }
}

// ========== LOAD ORDER DETAILS ==========
async function loadOrderDetails() {
    const container = document.getElementById('orderContent');
    if (!container) return;
    
    if (!orderDetailState.orderId) return;
    
    try {
        const orderDoc = await db.collection('orders').doc(orderDetailState.orderId).get();
        
        if (!orderDoc.exists) {
            showErrorState('Order Not Found', 'The order you\'re looking for doesn\'t exist.');
            return;
        }
        
        orderDetailState.order = { id: orderDoc.id, ...orderDoc.data() };
        
        // Verify order belongs to current user
        if (orderDetailState.order.userId !== orderDetailState.currentUser?.uid) {
            showErrorState('Access Denied', 'You don\'t have permission to view this order.');
            return;
        }
        
        renderOrderDetails();
        
    } catch (error) {
        console.error('Error loading order:', error);
        showErrorState('Error Loading Order', error.message);
    }
}

function renderOrderDetails() {
    const container = document.getElementById('orderContent');
    if (!container) return;
    
    const order = orderDetailState.order;
    const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    const isCancellable = CANCELLABLE_STATUSES.includes(order.status);
    const hasRefillRequested = order.refillRequested || false;
    
    container.innerHTML = `
        <!-- Order Header -->
        <div class="glass-card rounded-2xl p-6 mb-6 animate-slide-up">
            <div class="flex justify-between items-start flex-wrap gap-4">
                <div>
                    <div class="flex items-center gap-2 mb-2">
                        <span class="font-mono text-primary font-bold">#${order.amarboostOrderId || order.id.substring(0, 8)}</span>
                        ${renderStatusBadge(order.status)}
                    </div>
                    <h1 class="text-2xl font-bold">${escapeHtml(order.serviceName || 'Order Details')}</h1>
                    <p class="text-gray-500 text-sm mt-1">
                        <i class="far fa-calendar-alt mr-1"></i> Placed on ${orderDate.toLocaleString()}
                    </p>
                </div>
                <div class="text-right">
                    <div class="text-2xl font-black text-primary">${formatCurrencyBDT(order.priceBDT || 0)}</div>
                    <div class="text-xs text-gray-400">$${(order.priceUSD || 0).toFixed(2)} USD</div>
                </div>
            </div>
        </div>
        
        <!-- Order Details Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div class="glass-card rounded-2xl p-6 animate-slide-up" style="animation-delay: 0.05s">
                <h2 class="font-bold text-lg mb-4 flex items-center gap-2">
                    <i class="fas fa-info-circle text-primary"></i> Order Information
                </h2>
                <div class="space-y-3">
                    <div class="flex justify-between">
                        <span class="text-gray-500">Service ID</span>
                        <span class="font-mono">#${order.serviceId || 'N/A'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">Quantity</span>
                        <span class="font-semibold">${(order.quantity || 0).toLocaleString()}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">Price per 1K</span>
                        <span>${formatCurrencyBDT((order.priceBDT || 0) / (order.quantity || 1) * 1000)}</span>
                    </div>
                    ${order.amarboostOrderId ? `
                        <div class="flex justify-between">
                            <span class="text-gray-500">Provider Order ID</span>
                            <span class="font-mono text-primary">#${order.amarboostOrderId}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="glass-card rounded-2xl p-6 animate-slide-up" style="animation-delay: 0.1s">
                <h2 class="font-bold text-lg mb-4 flex items-center gap-2">
                    <i class="fas fa-link text-primary"></i> Target Link
                </h2>
                <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 break-all">
                    <a href="${order.link}" target="_blank" class="text-primary hover:underline text-sm">
                        ${escapeHtml(order.link || 'N/A')}
                        <i class="fas fa-external-link-alt ml-1 text-xs"></i>
                    </a>
                </div>
            </div>
        </div>
        
        <!-- Status Timeline -->
        <div class="glass-card rounded-2xl p-6 mb-6 animate-slide-up" style="animation-delay: 0.15s">
            <h2 class="font-bold text-lg mb-6 flex items-center gap-2">
                <i class="fas fa-chart-line text-primary"></i> Order Timeline
            </h2>
            <div class="timeline-container">
                ${renderTimeline(order)}
            </div>
        </div>
        
        <!-- Actions -->
        <div class="glass-card rounded-2xl p-6 animate-slide-up" style="animation-delay: 0.2s">
            <h2 class="font-bold text-lg mb-4 flex items-center gap-2">
                <i class="fas fa-cog text-primary"></i> Actions
            </h2>
            <div class="flex flex-wrap gap-3">
                ${order.status === 'completed' && !hasRefillRequested ? `
                    <button id="requestRefillBtn" class="btn-primary">
                        <i class="fas fa-sync-alt mr-2"></i> Request Refill
                    </button>
                ` : order.status === 'completed' && hasRefillRequested ? `
                    <button class="btn-outline" disabled>
                        <i class="fas fa-check-circle mr-2"></i> Refill Requested
                    </button>
                ` : ''}
                
                ${isCancellable ? `
                    <button id="cancelOrderBtn" class="btn-danger">
                        <i class="fas fa-ban mr-2"></i> Cancel Order
                    </button>
                ` : ''}
                
                <a href="/dashboard/tickets.html?order=${order.id}" class="btn-outline">
                    <i class="fas fa-headset mr-2"></i> Need Help?
                </a>
            </div>
        </div>
    `;
    
    // Bind action buttons
    const refillBtn = document.getElementById('requestRefillBtn');
    if (refillBtn) refillBtn.addEventListener('click', openRefillModal);
    
    const cancelBtn = document.getElementById('cancelOrderBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', openCancelModal);
}

function renderTimeline(order) {
    const currentStatus = order.status;
    let currentIndex = STATUS_MILESTONES.findIndex(m => m.key === currentStatus);
    if (currentIndex === -1 && currentStatus === 'cancelled') currentIndex = 0;
    
    let html = '<div class="relative">';
    
    STATUS_MILESTONES.forEach((milestone, idx) => {
        const isCompleted = idx <= currentIndex && currentStatus !== 'cancelled';
        const isCurrent = idx === currentIndex && currentStatus !== 'cancelled';
        const isCancelled = currentStatus === 'cancelled';
        
        let milestoneDate = '';
        if (idx === 0 && order.createdAt) {
            const date = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
            milestoneDate = date.toLocaleString();
        } else if (idx === 2 && order.completedAt) {
            const date = order.completedAt.toDate ? order.completedAt.toDate() : new Date(order.completedAt);
            milestoneDate = date.toLocaleString();
        }
        
        html += `
            <div class="timeline-item relative flex mb-6 ${idx === STATUS_MILESTONES.length - 1 ? 'mb-0' : ''}">
                <div class="timeline-left flex-shrink-0 mr-4">
                    <div class="timeline-dot w-10 h-10 rounded-full flex items-center justify-center 
                                ${isCompleted && !isCancelled ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}">
                        <i class="fas ${milestone.icon} ${isCurrent ? 'animate-pulse' : ''}"></i>
                    </div>
                    ${idx < STATUS_MILESTONES.length - 1 ? `
                        <div class="timeline-line w-0.5 h-12 bg-gray-200 dark:bg-gray-700 mx-auto mt-1 ${isCompleted && !isCancelled ? 'bg-primary' : ''}"></div>
                    ` : ''}
                </div>
                <div class="timeline-right flex-1 pb-6">
                    <div class="flex justify-between items-start flex-wrap gap-2">
                        <div>
                            <h3 class="font-semibold ${isCurrent ? 'text-primary' : ''}">${milestone.label}</h3>
                            <p class="text-sm text-gray-500">${milestone.description}</p>
                        </div>
                        ${milestoneDate ? `<span class="text-xs text-gray-400">${milestoneDate}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    // Add cancelled milestone if order is cancelled
    if (currentStatus === 'cancelled') {
        const cancelledDate = order.cancelledAt?.toDate ? order.cancelledAt.toDate() : new Date();
        html += `
            <div class="timeline-item relative flex">
                <div class="timeline-left flex-shrink-0 mr-4">
                    <div class="timeline-dot w-10 h-10 rounded-full flex items-center justify-center bg-red-500 text-white">
                        <i class="fas fa-ban"></i>
                    </div>
                </div>
                <div class="timeline-right flex-1">
                    <div class="flex justify-between items-start flex-wrap gap-2">
                        <div>
                            <h3 class="font-semibold text-red-500">Cancelled</h3>
                            <p class="text-sm text-gray-500">Order has been cancelled</p>
                        </div>
                        <span class="text-xs text-gray-400">${cancelledDate.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    return html;
}

// ========== STATUS BADGE ==========
function renderStatusBadge(status) {
    const statusMap = {
        pending: { class: 'status-pending', icon: 'fa-clock', text: 'Pending' },
        processing: { class: 'status-processing', icon: 'fa-spinner fa-spin', text: 'Processing' },
        completed: { class: 'status-completed', icon: 'fa-check-circle', text: 'Completed' },
        partial: { class: 'status-partial', icon: 'fa-exclamation-triangle', text: 'Partial' },
        cancelled: { class: 'status-cancelled', icon: 'fa-ban', text: 'Cancelled' }
    };
    const s = statusMap[status] || statusMap.pending;
    return `<span class="status-badge ${s.class}"><i class="fas ${s.icon} mr-1"></i> ${s.text}</span>`;
}

// ========== REFILL MODAL ==========
function openRefillModal() {
    const modal = document.getElementById('refillModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeRefillModal() {
    const modal = document.getElementById('refillModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

async function confirmRefill() {
    const orderId = orderDetailState.orderId;
    const confirmBtn = document.getElementById('confirmRefillBtn');
    const originalText = confirmBtn.innerHTML;
    
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="spinner"></span> Processing...';
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) throw new Error('Not authenticated');
        
        await db.collection('orders').doc(orderId).update({
            refillRequested: true,
            refillRequestedAt: new Date(),
            updatedAt: new Date()
        });
        
        orderDetailState.order.refillRequested = true;
        orderDetailState.refillRequested = true;
        
        showGlassToast('Refill request submitted successfully! Support will process within 24-48 hours.', 'success');
        closeRefillModal();
        
        // Refresh the view to show updated button
        renderOrderDetails();
        
    } catch (error) {
        console.error('Refill error:', error);
        showGlassToast('Failed to request refill. Please try again.', 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
    }
}

// ========== CANCEL MODAL ==========
function openCancelModal() {
    const modal = document.getElementById('cancelModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeCancelModal() {
    const modal = document.getElementById('cancelModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

async function confirmCancel() {
    const orderId = orderDetailState.orderId;
    const confirmBtn = document.getElementById('confirmCancelBtn');
    const originalText = confirmBtn.innerHTML;
    
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="spinner"></span> Cancelling...';
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) throw new Error('Not authenticated');
        
        await db.collection('orders').doc(orderId).update({
            status: 'cancelled',
            cancelledAt: new Date(),
            updatedAt: new Date()
        });
        
        orderDetailState.order.status = 'cancelled';
        
        showGlassToast('Order cancelled successfully!', 'success');
        closeCancelModal();
        
        // Refresh the view
        renderOrderDetails();
        
    } catch (error) {
        console.error('Cancel error:', error);
        showGlassToast('Failed to cancel order. Please try again.', 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
    }
}

// ========== REAL-TIME UPDATES ==========
let orderListener = null;

function setupRealtimeUpdates() {
    if (!orderDetailState.orderId) return;
    
    if (orderListener) orderListener();
    
    orderListener = db.collection('orders').doc(orderDetailState.orderId)
        .onSnapshot((doc) => {
            if (doc.exists) {
                const newOrder = { id: doc.id, ...doc.data() };
                const oldStatus = orderDetailState.order?.status;
                const newStatus = newOrder.status;
                
                orderDetailState.order = newOrder;
                
                if (oldStatus !== newStatus) {
                    renderOrderDetails();
                    showGlassToast(`Order status updated to ${newStatus}`, 'info');
                    
                    // Play sound for status update
                    if (newStatus === 'completed') {
                        playNotificationSound('success');
                    }
                } else {
                    renderOrderDetails();
                }
            }
        }, (error) => {
            console.error('Realtime error:', error);
        });
}

// ========== NOTIFICATION SOUND ==========
function playNotificationSound(type = 'default') {
    if (localStorage.getItem('notificationSound') !== 'true') return;

    try {
        const audio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=');
        audio.volume = 0.2;
        audio.play().catch(() => {});
    } catch (error) {
        console.log('Sound playback failed');
    }
}

// ========== ERROR STATE ==========
function showErrorState(title, message) {
    const container = document.getElementById('orderContent');
    if (container) {
        container.innerHTML = `
            <div class="glass-card rounded-2xl p-12 text-center animate-slide-up">
                <div class="text-6xl mb-4">❌</div>
                <h2 class="text-2xl font-bold mb-2">${escapeHtml(title)}</h2>
                <p class="text-gray-500 mb-6">${escapeHtml(message)}</p>
                <a href="/dashboard/orders.html" class="btn-primary inline-block">
                    <i class="fas fa-arrow-left mr-2"></i> Back to Orders
                </a>
            </div>
        `;
    }
}

// ========== ANIMATIONS & LOADERS ==========
function showSkeletonLoader() {
    const container = document.getElementById('orderContent');
    if (container) {
        container.innerHTML = `
            <div class="space-y-6">
                <div class="skeleton skeleton-card h-32 rounded-2xl"></div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="skeleton skeleton-card h-48 rounded-2xl"></div>
                    <div class="skeleton skeleton-card h-48 rounded-2xl"></div>
                </div>
                <div class="skeleton skeleton-card h-64 rounded-2xl"></div>
            </div>
        `;
    }
}

function hideSkeletonLoader() {
    // Content replaces skeletons when loaded
}

function animateInElements() {
    document.querySelectorAll('.glass-card').forEach((el, idx) => {
        el.classList.add('animate-slide-up');
        el.style.animationDelay = `${0.05 * idx}s`;
    });
}

// ========== HELPER FUNCTIONS ==========
function formatCurrencyBDT(amount) {
    if (!amount && amount !== 0) return '৳0';
    return '৳' + Math.round(amount).toLocaleString('en-BD');
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
    // Close modals on outside click
    const refillModal = document.getElementById('refillModal');
    if (refillModal) {
        refillModal.addEventListener('click', (e) => {
            if (e.target === refillModal) closeRefillModal();
        });
    }
    
    const cancelModal = document.getElementById('cancelModal');
    if (cancelModal) {
        cancelModal.addEventListener('click', (e) => {
            if (e.target === cancelModal) closeCancelModal();
        });
    }
    
    // Confirm buttons
    const confirmRefillBtn = document.getElementById('confirmRefillBtn');
    if (confirmRefillBtn) confirmRefillBtn.addEventListener('click', confirmRefill);
    
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    if (confirmCancelBtn) confirmCancelBtn.addEventListener('click', confirmCancel);
}

// ========== EXPORT GLOBALS ==========
window.initOrderDetail = initOrderDetail;
window.closeRefillModal = closeRefillModal;
window.closeCancelModal = closeCancelModal;

// ========== AUTO-INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('orderContent')) {
        if (window.auth && window.db) {
            await initOrderDetail();
        } else {
            const checkFirebase = setInterval(async () => {
                if (window.auth && window.db) {
                    clearInterval(checkFirebase);
                    await initOrderDetail();
                }
            }, 100);
        }
    }
});

console.log('✅ Order Detail v3.0 (design.md compliant) loaded');
