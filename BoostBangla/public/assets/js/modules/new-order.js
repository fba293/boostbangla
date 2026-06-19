// ============================================
// BoostBangla New Order Module v3.0
// Fully redesigned following design.md
// Live service search with debounce
// Real-time price calculation as you type
// Order preview modal before submission
// Balance checker with visual warning
// Recent orders sidebar for quick reference
// ============================================

// ========== GLOBAL STATE ==========
let newOrderState = {
    currentUser: null,
    allServices: [],
    filteredServices: [],
    selectedService: null,
    exchangeRate: 120,
    userBalance: 0,
    orderLink: '',
    orderQuantity: 0,
    totalPriceBDT: 0,
    isLoading: false,
    searchTerm: '',
    itemsPerPage: 10,
    currentPage: 1
};

const MARKUP_PERCENTAGE = 15;
const API_PROXY = '/api/proxy.php';

// ========== INITIALIZE NEW ORDER PAGE ==========
async function initNewOrder() {
    showSkeletonLoader();
    const isAuth = await checkAuthAndLoadUser();
    if (!isAuth) return;
    
    await Promise.all([
        loadExchangeRate(),
        loadUserBalance(),
        loadServices(),
        loadRecentOrders()
    ]);
    
    attachEventListeners();
    newOrderState.isLoading = false;
    hideSkeletonLoader();
    animateInElements();
    setupRealtimePriceUpdate();
}

// ========== CHECK AUTHENTICATION ==========
async function checkAuthAndLoadUser() {
    const user = window.getCurrentUser();
    if (!user?.uid) {
        window.location.href = '/login.html';
        return false;
    }
    
    newOrderState.currentUser = user;
    
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
            newOrderState.exchangeRate = data.data.mid;
        } else {
            throw new Error('Invalid response');
        }
    } catch (error) {
        console.warn('Exchange rate fallback');
        newOrderState.exchangeRate = 120;
    }
    updateRateDisplay();
}

function updateRateDisplay() {
    const rateEl = document.getElementById('exchangeRate');
    if (rateEl) rateEl.innerText = newOrderState.exchangeRate.toFixed(2);
}

// ========== LOAD USER BALANCE ==========
async function loadUserBalance() {
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;
        
        const userDoc = await db.collection('users').doc(user.uid).get();
        newOrderState.userBalance = userDoc.data()?.balance || 0;
        
        const balanceEl = document.getElementById('userBalance');
        if (balanceEl) {
            balanceEl.innerHTML = formatCurrencyBDT(newOrderState.userBalance);
            balanceEl.classList.add('animate-pulse-slow');
            setTimeout(() => balanceEl.classList.remove('animate-pulse-slow'), 300);
        }
    } catch (error) {
        console.error('Error loading balance:', error);
        showGlassToast('Failed to load balance', 'error');
    }
}

// ========== LOAD SERVICES ==========
async function loadServices() {
    const container = document.getElementById('serviceList');
    if (!container) return;
    
    try {
        const response = await fetch(`${API_PROXY}?action=services`);
        const data = await response.json();
        
        let services = [];
        if (data.services && Array.isArray(data.services)) services = data.services;
        else if (Array.isArray(data)) services = data;
        
        if (services.length === 0) {
            services = getSampleServices();
            showGlassToast('Showing demo services', 'info');
        }
        
        newOrderState.allServices = services.map(s => ({
            id: s.service || s.id,
            name: s.name,
            rate: parseFloat(s.rate || 1),
            min: parseInt(s.min || 10),
            max: parseInt(s.max || 1000000),
            category: detectCategory(s.name)
        })).filter(s => s.id && s.name);
        
        newOrderState.filteredServices = [...newOrderState.allServices];
        renderServiceList();
        
    } catch (error) {
        console.error('Error loading services:', error);
        newOrderState.allServices = getSampleServices();
        newOrderState.filteredServices = [...newOrderState.allServices];
        renderServiceList();
        showGlassToast('Network error. Using demo services.', 'warning');
    }
}

function getSampleServices() {
    return [
        { service: 6205, name: 'YouTube Native Ads Views [Min 1M]', rate: 2.50, min: 1000000, max: 100000000 },
        { service: 6206, name: 'YouTube Native Ads Views [Min 500K]', rate: 2.55, min: 500000, max: 100000000 },
        { service: 6208, name: 'Facebook Followers', rate: 3.20, min: 100, max: 500000 },
        { service: 6209, name: 'Instagram Followers', rate: 5.00, min: 100, max: 500000 }
    ];
}

function detectCategory(name) {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('youtube')) return 'youtube';
    if (nameLower.includes('facebook')) return 'facebook';
    if (nameLower.includes('instagram')) return 'instagram';
    return 'other';
}

// ========== RENDER SERVICE LIST ==========
function renderServiceList() {
    const container = document.getElementById('serviceList');
    if (!container) return;
    
    const start = (newOrderState.currentPage - 1) * newOrderState.itemsPerPage;
    const pageServices = newOrderState.filteredServices.slice(start, start + newOrderState.itemsPerPage);
    const totalPages = Math.ceil(newOrderState.filteredServices.length / newOrderState.itemsPerPage);
    
    if (pageServices.length === 0) {
        container.innerHTML = `
            <div class="empty-state py-8">
                <div class="empty-icon text-4xl mb-2">🔍</div>
                <p class="text-gray-500">No services found</p>
            </div>
        `;
        renderServicePagination(0);
        return;
    }
    
    container.innerHTML = pageServices.map((service, idx) => {
        const delay = 0.03 * (idx % 10);
        const priceBDT = calculatePriceBDT(service.rate);
        const isSelected = newOrderState.selectedService?.id === service.id;
        
        return `
            <div class="service-item glass-card p-4 rounded-xl cursor-pointer transition-all hover:shadow-lg animate-slide-up ${isSelected ? 'border-2 border-primary' : 'border border-gray-200 dark:border-gray-700'}" 
                 style="animation-delay: ${delay}s" 
                 data-id="${service.id}">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="font-semibold text-sm">${escapeHtml(service.name.substring(0, 60))}${service.name.length > 60 ? '...' : ''}</div>
                        <div class="flex gap-3 mt-1">
                            <span class="text-xs text-gray-400">ID: ${service.id}</span>
                            <span class="text-xs text-gray-400">Min: ${service.min.toLocaleString()}</span>
                            <span class="text-xs text-gray-400">Max: ${service.max.toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-primary font-black text-lg">${formatCurrencyBDT(priceBDT)}</div>
                        <div class="text-xs text-gray-400">per 1K</div>
                    </div>
                </div>
                ${isSelected ? '<div class="mt-2 text-xs text-primary"><i class="fas fa-check-circle mr-1"></i> Selected</div>' : ''}
            </div>
        `;
    }).join('');
    
    renderServicePagination(totalPages);
    attachServiceClickHandlers();
}

function renderServicePagination(totalPages) {
    const paginationDiv = document.getElementById('servicePagination');
    if (!paginationDiv) return;
    
    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    
    let html = `
        <div class="flex justify-center gap-2 mt-4">
            <button class="pagination-btn w-8 h-8 rounded-lg border ${newOrderState.currentPage === 1 ? 'opacity-50' : 'hover:border-primary'}" 
                    onclick="changeServicePage(${newOrderState.currentPage - 1})" ${newOrderState.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left text-xs"></i>
            </button>
    `;
    
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        html += `<button class="pagination-btn w-8 h-8 rounded-lg ${newOrderState.currentPage === i ? 'bg-primary text-white' : 'border hover:border-primary'}" 
                       onclick="changeServicePage(${i})">${i}</button>`;
    }
    
    if (totalPages > 5) {
        html += `<span class="px-2">...</span>`;
        html += `<button class="pagination-btn w-8 h-8 rounded-lg border hover:border-primary" onclick="changeServicePage(${totalPages})">${totalPages}</button>`;
    }
    
    html += `
            <button class="pagination-btn w-8 h-8 rounded-lg border ${newOrderState.currentPage === totalPages ? 'opacity-50' : 'hover:border-primary'}" 
                    onclick="changeServicePage(${newOrderState.currentPage + 1})" ${newOrderState.currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right text-xs"></i>
            </button>
        </div>
    `;
    
    paginationDiv.innerHTML = html;
}

window.changeServicePage = function(page) {
    const totalPages = Math.ceil(newOrderState.filteredServices.length / newOrderState.itemsPerPage);
    if (page < 1 || page > totalPages) return;
    newOrderState.currentPage = page;
    renderServiceList();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

function attachServiceClickHandlers() {
    document.querySelectorAll('.service-item').forEach(el => {
        el.removeEventListener('click', handleServiceClick);
        el.addEventListener('click', handleServiceClick);
    });
}

function handleServiceClick(e) {
    const target = e.currentTarget;
    const serviceId = parseInt(target.dataset.id);
    const service = newOrderState.allServices.find(s => s.id === serviceId);
    if (service) selectService(service);
}

// ========== SELECT SERVICE ==========
function selectService(service) {
    newOrderState.selectedService = service;
    
    // Update UI
    document.getElementById('selectedServiceName').innerText = service.name;
    document.getElementById('selectedServiceId').innerText = service.id;
    document.getElementById('minQty').innerText = service.min.toLocaleString();
    document.getElementById('maxQty').innerText = service.max.toLocaleString();
    
    const priceBDT = calculatePriceBDT(service.rate);
    document.getElementById('rateDisplay').innerHTML = formatCurrencyBDT(priceBDT);
    
    // Show selected panel
    document.getElementById('selectedServicePanel').classList.remove('hidden');
    document.getElementById('selectedServicePanel').classList.add('animate-slide-down');
    
    // Clear quantity and link
    document.getElementById('orderLink').value = '';
    document.getElementById('orderQuantity').value = '';
    newOrderState.orderQuantity = 0;
    newOrderState.totalPriceBDT = 0;
    updatePriceDisplay();
    
    // Highlight selected in list
    renderServiceList();
    
    showGlassToast(`Service selected: ${service.name.substring(0, 40)}...`, 'success');
}

function clearSelectedService() {
    newOrderState.selectedService = null;
    document.getElementById('selectedServicePanel').classList.add('hidden');
    document.getElementById('orderLink').value = '';
    document.getElementById('orderQuantity').value = '';
    newOrderState.orderQuantity = 0;
    newOrderState.totalPriceBDT = 0;
    updatePriceDisplay();
    renderServiceList();
    showGlassToast('Service cleared', 'info');
}

// ========== CALCULATE PRICE ==========
function calculatePriceBDT(usdRate) {
    const markedUp = usdRate * (1 + MARKUP_PERCENTAGE / 100);
    return Math.round(markedUp * newOrderState.exchangeRate);
}

function calculateTotalPrice() {
    if (!newOrderState.selectedService) return 0;
    const pricePer1000BDT = calculatePriceBDT(newOrderState.selectedService.rate);
    return (pricePer1000BDT / 1000) * newOrderState.orderQuantity;
}

function setupRealtimePriceUpdate() {
    const quantityInput = document.getElementById('orderQuantity');
    const linkInput = document.getElementById('orderLink');
    
    if (quantityInput) {
        quantityInput.addEventListener('input', (e) => {
            newOrderState.orderQuantity = parseInt(e.target.value) || 0;
            updatePriceDisplay();
            validateOrder();
        });
    }
    
    if (linkInput) {
        linkInput.addEventListener('input', () => {
            validateOrder();
        });
    }
}

function updatePriceDisplay() {
    const total = calculateTotalPrice();
    newOrderState.totalPriceBDT = total;
    
    const priceEl = document.getElementById('totalPrice');
    if (priceEl) {
        priceEl.innerHTML = formatCurrencyBDT(total);
        if (total > 0) {
            priceEl.classList.add('animate-pulse-slow');
            setTimeout(() => priceEl.classList.remove('animate-pulse-slow'), 300);
        }
    }
    
    const qtyDisplay = document.getElementById('qtyDisplay');
    if (qtyDisplay) qtyDisplay.innerText = newOrderState.orderQuantity.toLocaleString();
}

function validateOrder() {
    const link = document.getElementById('orderLink').value.trim();
    const quantity = newOrderState.orderQuantity;
    const service = newOrderState.selectedService;
    const placeBtn = document.getElementById('placeOrderBtn');
    const errorDiv = document.getElementById('orderError');
    
    if (!service) {
        if (errorDiv) errorDiv.innerHTML = 'Please select a service first';
        if (placeBtn) placeBtn.disabled = true;
        return false;
    }
    
    if (!link) {
        if (errorDiv) errorDiv.innerHTML = 'Please enter a valid link';
        if (placeBtn) placeBtn.disabled = true;
        return false;
    }
    
    if (quantity < service.min) {
        if (errorDiv) errorDiv.innerHTML = `Minimum quantity is ${service.min.toLocaleString()}`;
        if (placeBtn) placeBtn.disabled = true;
        return false;
    }
    
    if (quantity > service.max) {
        if (errorDiv) errorDiv.innerHTML = `Maximum quantity is ${service.max.toLocaleString()}`;
        if (placeBtn) placeBtn.disabled = true;
        return false;
    }
    
    if (newOrderState.totalPriceBDT > newOrderState.userBalance) {
        if (errorDiv) errorDiv.innerHTML = `Insufficient balance. Need ${formatCurrencyBDT(newOrderState.totalPriceBDT)}`;
        if (placeBtn) placeBtn.disabled = true;
        return false;
    }
    
    if (errorDiv) errorDiv.innerHTML = '';
    if (placeBtn) placeBtn.disabled = false;
    return true;
}

// ========== PLACE ORDER WITH PREVIEW ==========
function openOrderPreview() {
    if (!validateOrder()) return;
    
    const service = newOrderState.selectedService;
    const link = document.getElementById('orderLink').value.trim();
    const quantity = newOrderState.orderQuantity;
    const total = newOrderState.totalPriceBDT;
    
    // Update preview modal
    document.getElementById('previewServiceName').innerText = service.name;
    document.getElementById('previewLink').innerText = link.substring(0, 60) + (link.length > 60 ? '...' : '');
    document.getElementById('previewQuantity').innerText = quantity.toLocaleString();
    document.getElementById('previewTotal').innerHTML = formatCurrencyBDT(total);
    
    const balanceAfter = newOrderState.userBalance - total;
    const balanceAfterEl = document.getElementById('previewBalanceAfter');
    if (balanceAfterEl) {
        balanceAfterEl.innerHTML = formatCurrencyBDT(balanceAfter);
        if (balanceAfter < 0) balanceAfterEl.classList.add('text-red-500');
        else balanceAfterEl.classList.remove('text-red-500');
    }
    
    const modal = document.getElementById('previewModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closePreviewModal() {
    const modal = document.getElementById('previewModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

async function confirmOrder() {
    const service = newOrderState.selectedService;
    const link = document.getElementById('orderLink').value.trim();
    const quantity = newOrderState.orderQuantity;
    const totalBDT = newOrderState.totalPriceBDT;
    
    const confirmBtn = document.getElementById('confirmOrderBtn');
    const originalText = confirmBtn.innerHTML;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="spinner"></span> Placing Order...';
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) throw new Error('Not authenticated');
        
        // Call API to place order
        const formData = new URLSearchParams();
        formData.append('action', 'add');
        formData.append('service', service.id);
        formData.append('link', link);
        formData.append('quantity', quantity);
        
        const response = await fetch(API_PROXY, { method: 'POST', body: formData });
        const result = await response.json();
        
        if (result.order) {
            // Deduct balance
            await db.collection('users').doc(user.uid).update({
                balance: firebase.firestore.FieldValue.increment(-totalBDT)
            });
            
            // Save order
            await db.collection('orders').add({
                userId: user.uid,
                serviceId: service.id,
                serviceName: service.name,
                link: link,
                quantity: quantity,
                priceBDT: totalBDT,
                priceUSD: totalBDT / newOrderState.exchangeRate,
                amarboostOrderId: result.order,
                status: 'pending',
                createdAt: new Date()
            });
            
            showSuccessModal(result.order, totalBDT);
            
            // Reset form
            clearSelectedService();
            await loadUserBalance();
            await loadRecentOrders();
            
        } else {
            showGlassToast('Order failed: ' + (result.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Order error:', error);
        showGlassToast('Error placing order. Please try again.', 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
        closePreviewModal();
    }
}

function showSuccessModal(orderId, amount) {
    const modal = document.getElementById('successModal');
    const orderIdEl = document.getElementById('successOrderId');
    const amountEl = document.getElementById('successAmount');
    
    if (orderIdEl) orderIdEl.innerText = orderId;
    if (amountEl) amountEl.innerHTML = formatCurrencyBDT(amount);
    
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
            closeSuccessModal();
        }, 4000);
    }
}

function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// ========== LOAD RECENT ORDERS (Sidebar) ==========
async function loadRecentOrders() {
    const container = document.getElementById('recentOrdersList');
    if (!container) return;
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;
        
        const ordersSnapshot = await db.collection('orders')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        if (ordersSnapshot.empty) {
            container.innerHTML = `
                <div class="empty-state py-4 text-center">
                    <p class="text-xs text-gray-400">No recent orders</p>
                </div>
            `;
            return;
        }
        
        let html = '<div class="space-y-2">';
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            const date = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
            const statusIcon = order.status === 'completed' ? '✅' : order.status === 'pending' ? '⏳' : '🔄';
            
            html += `
                <div class="recent-order-item p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer" 
                     onclick="window.location.href='/dashboard/order-detail.html?id=${doc.id}'">
                    <div class="flex justify-between items-center">
                        <div class="flex-1">
                            <div class="text-xs font-mono text-primary">#${doc.id.substring(0, 8)}</div>
                            <div class="text-xs text-gray-400">${date.toLocaleDateString()}</div>
                        </div>
                        <div class="text-right">
                            <div class="text-xs font-semibold">${formatCurrencyBDT(order.priceBDT || 0)}</div>
                            <div class="text-xs">${statusIcon} ${order.status}</div>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading recent orders:', error);
        container.innerHTML = '<div class="text-center py-4 text-red-500 text-xs">Failed to load</div>';
    }
}

// ========== SEARCH SERVICES ==========
function setupServiceSearch() {
    const searchInput = document.getElementById('serviceSearch');
    if (!searchInput) return;
    
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const term = e.target.value.toLowerCase();
            newOrderState.searchTerm = term;
            newOrderState.currentPage = 1;
            
            if (!term) {
                newOrderState.filteredServices = [...newOrderState.allServices];
            } else {
                newOrderState.filteredServices = newOrderState.allServices.filter(s => 
                    s.name.toLowerCase().includes(term) || 
                    s.id.toString().includes(term)
                );
            }
            renderServiceList();
        }, 300);
    });
}

// ========== RESET FORM ==========
function resetForm() {
    clearSelectedService();
    document.getElementById('orderLink').value = '';
    document.getElementById('orderQuantity').value = '';
    newOrderState.orderQuantity = 0;
    updatePriceDisplay();
    showGlassToast('Form reset', 'info');
}

// ========== ANIMATIONS & LOADERS ==========
function showSkeletonLoader() {
    const container = document.getElementById('serviceList');
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
    document.querySelectorAll('.glass-card, .order-form-section').forEach((el, idx) => {
        el.classList.add('animate-slide-up');
        el.style.animationDelay = `${0.03 * idx}s`;
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
    setupServiceSearch();
    
    const clearServiceBtn = document.getElementById('clearServiceBtn');
    if (clearServiceBtn) clearServiceBtn.addEventListener('click', clearSelectedService);
    
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetForm);
    
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    if (placeOrderBtn) placeOrderBtn.addEventListener('click', openOrderPreview);
    
    const confirmOrderBtn = document.getElementById('confirmOrderBtn');
    if (confirmOrderBtn) confirmOrderBtn.addEventListener('click', confirmOrder);
    
    // Close modals
    const previewModal = document.getElementById('previewModal');
    if (previewModal) {
        previewModal.addEventListener('click', (e) => {
            if (e.target === previewModal) closePreviewModal();
        });
    }
    
    const successModal = document.getElementById('successModal');
    if (successModal) {
        successModal.addEventListener('click', (e) => {
            if (e.target === successModal) closeSuccessModal();
        });
    }
}

// ========== EXPORT GLOBALS ==========
window.initNewOrder = initNewOrder;
window.clearSelectedService = clearSelectedService;
window.resetForm = resetForm;
window.openOrderPreview = openOrderPreview;
window.closePreviewModal = closePreviewModal;
window.closeSuccessModal = closeSuccessModal;
window.changeServicePage = changeServicePage;

// ========== AUTO-INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('serviceList')) {
        if (window.auth && window.db) {
            await initNewOrder();
        } else {
            const checkFirebase = setInterval(async () => {
                if (window.auth && window.db) {
                    clearInterval(checkFirebase);
                    await initNewOrder();
                }
            }, 100);
        }
    }
});

console.log('✅ New Order v3.0 (design.md compliant) loaded');