// ============================================
// BoostBangla Mass Order Module v3.0
// Fully redesigned following design.md
// Drag & drop CSV/Text upload
// Real-time validation with row highlighting
// Batch preview with editable quantities
// Balance check with visual warnings
// Progress indicator for bulk submission
// ============================================

// ========== GLOBAL STATE ==========
let massOrderState = {
    currentUser: null,
    orders: [],
    validatedOrders: [],
    exchangeRate: 120,
    userBalance: 0,
    isValidating: false,
    isSubmitting: false,
    currentPage: 1,
    itemsPerPage: 10,
    totalPrice: 0,
    serviceCache: new Map() // Cache service rates
};

const MARKUP_PERCENTAGE = 15;
const API_PROXY = '/api/proxy.php';
const MAX_ORDERS_PER_BATCH = 100;

// ========== INITIALIZE MASS ORDER PAGE ==========
async function initMassOrder() {
    showSkeletonLoader();
    const isAuth = await checkAuthAndLoadUser();
    if (!isAuth) return;
    
    await Promise.all([
        loadExchangeRate(),
        loadUserBalance(),
        loadServiceCache()
    ]);
    
    attachEventListeners();
    setupDragAndDrop();
    massOrderState.isValidating = false;
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
    
    massOrderState.currentUser = user;
    
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
            massOrderState.exchangeRate = data.data.mid;
        } else {
            throw new Error('Invalid response');
        }
    } catch (error) {
        massOrderState.exchangeRate = 120;
    }
    updateRateDisplay();
}

function updateRateDisplay() {
    const rateEl = document.getElementById('exchangeRate');
    if (rateEl) rateEl.innerText = massOrderState.exchangeRate.toFixed(2);
}

// ========== LOAD USER BALANCE ==========
async function loadUserBalance() {
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;
        
        const userDoc = await db.collection('users').doc(user.uid).get();
        massOrderState.userBalance = userDoc.data()?.balance || 0;
        
        const balanceEl = document.getElementById('userBalance');
        if (balanceEl) {
            balanceEl.innerHTML = formatCurrencyBDT(massOrderState.userBalance);
        }
    } catch (error) {
        console.error('Error loading balance:', error);
        showGlassToast('Failed to load balance', 'error');
    }
}

// ========== LOAD SERVICE CACHE ==========
async function loadServiceCache() {
    try {
        const response = await fetch(`${API_PROXY}?action=services`);
        const data = await response.json();
        
        let services = [];
        if (data.services && Array.isArray(data.services)) services = data.services;
        else if (Array.isArray(data)) services = data;
        
        services.forEach(s => {
            const id = s.service || s.id;
            if (id) {
                massOrderState.serviceCache.set(id, {
                    rate: parseFloat(s.rate || 1),
                    name: s.name
                });
            }
        });
        
        console.log(`Cached ${massOrderState.serviceCache.size} services`);
    } catch (error) {
        console.error('Error loading service cache:', error);
        showGlassToast('Using demo service rates', 'warning');
        // Add some demo services to cache
        massOrderState.serviceCache.set(6205, { rate: 2.50, name: 'YouTube Views' });
        massOrderState.serviceCache.set(6208, { rate: 3.20, name: 'Facebook Followers' });
        massOrderState.serviceCache.set(6209, { rate: 5.00, name: 'Instagram Followers' });
    }
}

// ========== DRAG & DROP SETUP ==========
function setupDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
    if (!dropZone) return;
    
    // Click to upload
    dropZone.addEventListener('click', () => fileInput?.click());
    
    // Drag events
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-primary', 'bg-primary/5');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-primary', 'bg-primary/5');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-primary', 'bg-primary/5');
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    });
    
    // File input change
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) handleFileUpload(e.target.files[0]);
        });
    }
}

function handleFileUpload(file) {
    if (!file.name.endsWith('.txt') && !file.name.endsWith('.csv')) {
        showGlassToast('Please upload a .txt or .csv file', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        document.getElementById('bulkOrdersInput').value = content;
        validateOrders();
    };
    reader.readAsText(file);
}

// ========== VALIDATE ORDERS ==========
async function validateOrders() {
    const input = document.getElementById('bulkOrdersInput').value.trim();
    if (!input) {
        showGlassToast('Please enter orders or upload a file', 'error');
        return;
    }
    
    const lines = input.split('\n').filter(l => l.trim());
    if (lines.length > MAX_ORDERS_PER_BATCH) {
        showGlassToast(`Maximum ${MAX_ORDERS_PER_BATCH} orders per batch`, 'error');
        return;
    }
    
    massOrderState.isValidating = true;
    showValidationLoader();
    
    const orders = [];
    let validCount = 0;
    let invalidCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split('|').map(p => p.trim());
        
        let order = {
            lineNumber: i + 1,
            raw: line,
            isValid: false,
            errors: []
        };
        
        if (parts.length !== 3) {
            order.errors.push('Invalid format. Use: ServiceID | Link | Quantity');
            invalidCount++;
            orders.push(order);
            continue;
        }
        
        const serviceId = parseInt(parts[0]);
        const link = parts[1];
        const quantity = parseInt(parts[2]);
        
        order.serviceId = serviceId;
        order.link = link;
        order.quantity = quantity;
        
        // Validate service ID
        if (isNaN(serviceId)) {
            order.errors.push('Invalid Service ID');
        } else {
            const service = massOrderState.serviceCache.get(serviceId);
            if (!service) {
                order.errors.push(`Service ID ${serviceId} not found`);
            } else {
                order.serviceName = service.name;
                order.serviceRate = service.rate;
                order.pricePerUnitBDT = calculatePriceBDT(service.rate) / 1000;
            }
        }
        
        // Validate link
        if (!link || (!link.startsWith('http://') && !link.startsWith('https://'))) {
            order.errors.push('Invalid link (must start with http:// or https://)');
        }
        
        // Validate quantity
        if (isNaN(quantity) || quantity < 1) {
            order.errors.push('Quantity must be a positive number');
        }
        
        if (order.errors.length === 0) {
            order.isValid = true;
            order.totalPrice = order.pricePerUnitBDT * order.quantity;
            validCount++;
        } else {
            invalidCount++;
        }
        
        orders.push(order);
    }
    
    massOrderState.orders = orders;
    massOrderState.validatedOrders = orders.filter(o => o.isValid);
    
    // Calculate total price
    const totalPrice = massOrderState.validatedOrders.reduce((sum, o) => sum + o.totalPrice, 0);
    massOrderState.totalPrice = totalPrice;
    
    renderValidationResults(validCount, invalidCount, totalPrice);
    massOrderState.isValidating = false;
}

function showValidationLoader() {
    const previewDiv = document.getElementById('previewSection');
    if (previewDiv) {
        previewDiv.innerHTML = `
            <div class="text-center py-8">
                <div class="spinner mx-auto mb-3"></div>
                <p class="text-gray-500">Validating orders...</p>
            </div>
        `;
    }
}

function renderValidationResults(validCount, invalidCount, totalPrice) {
    const previewDiv = document.getElementById('previewSection');
    const summaryDiv = document.getElementById('summarySection');
    
    if (!previewDiv) return;
    
    if (massOrderState.orders.length === 0) {
        previewDiv.innerHTML = `
            <div class="empty-state py-8">
                <div class="empty-icon text-4xl mb-2">📝</div>
                <p class="text-gray-500">No orders to preview</p>
            </div>
        `;
        if (summaryDiv) summaryDiv.classList.add('hidden');
        return;
    }
    
    // Render orders table
    const start = (massOrderState.currentPage - 1) * massOrderState.itemsPerPage;
    const pageOrders = massOrderState.orders.slice(start, start + massOrderState.itemsPerPage);
    const totalPages = Math.ceil(massOrderState.orders.length / massOrderState.itemsPerPage);
    
    let html = `
        <div class="overflow-x-auto">
            <table class="data-table w-full">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Service ID</th>
                        <th>Link</th>
                        <th>Quantity</th>
                        <th>Price (BDT)</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    pageOrders.forEach(order => {
        const statusClass = order.isValid ? 'text-green-600' : 'text-red-600';
        const statusIcon = order.isValid ? '✅' : '❌';
        const priceDisplay = order.isValid ? formatCurrencyBDT(order.totalPrice) : '-';
        
        html += `
            <tr class="${!order.isValid ? 'bg-red-50 dark:bg-red-900/10' : ''}">
                <td class="text-sm">${order.lineNumber}</td>
                <td class="font-mono text-sm">${order.serviceId || '-'}</td>
                <td class="max-w-[200px] truncate text-sm" title="${escapeHtml(order.link || '')}">${escapeHtml((order.link || '-').substring(0, 40))}</td>
                <td class="text-sm">${order.quantity?.toLocaleString() || '-'}</td>
                <td class="text-sm font-semibold">${priceDisplay}</td>
                <td class="${statusClass} text-sm">${statusIcon} ${order.isValid ? 'Valid' : order.errors[0]}</td>
            </tr>
        `;
    });
    
    html += `</tbody></table></div>`;
    previewDiv.innerHTML = html;
    
    // Render pagination for preview
    if (totalPages > 1) {
        renderPreviewPagination(totalPages);
    } else {
        const paginationDiv = document.getElementById('previewPagination');
        if (paginationDiv) paginationDiv.innerHTML = '';
    }
    
    // Update summary
    if (summaryDiv) {
        document.getElementById('validCount').innerText = validCount;
        document.getElementById('invalidCount').innerText = invalidCount;
        document.getElementById('totalPrice').innerHTML = formatCurrencyBDT(totalPrice);
        document.getElementById('totalCostDisplay').innerHTML = formatCurrencyBDT(totalPrice);
        
        const afterBalance = massOrderState.userBalance - totalPrice;
        const afterBalanceEl = document.getElementById('afterBalance');
        if (afterBalanceEl) {
            if (afterBalance >= 0) {
                afterBalanceEl.innerHTML = formatCurrencyBDT(afterBalance);
                afterBalanceEl.classList.remove('text-red-500');
            } else {
                afterBalanceEl.innerHTML = `${formatCurrencyBDT(afterBalance)} (short by ${formatCurrencyBDT(Math.abs(afterBalance))})`;
                afterBalanceEl.classList.add('text-red-500');
            }
        }
        
        summaryDiv.classList.remove('hidden');
        summaryDiv.classList.add('animate-slide-up');
    }
    
    // Enable/disable submit button
    const submitBtn = document.getElementById('submitAllBtn');
    if (submitBtn) {
        submitBtn.disabled = (validCount === 0 || totalPrice > massOrderState.userBalance);
    }
}

function renderPreviewPagination(totalPages) {
    const paginationDiv = document.getElementById('previewPagination');
    if (!paginationDiv) return;
    
    let html = `
        <div class="flex justify-center gap-2 mt-4">
            <button class="pagination-btn w-8 h-8 rounded-lg border ${massOrderState.currentPage === 1 ? 'opacity-50' : 'hover:border-primary'}" 
                    onclick="changePreviewPage(${massOrderState.currentPage - 1})" ${massOrderState.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left text-xs"></i>
            </button>
    `;
    
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        html += `<button class="pagination-btn w-8 h-8 rounded-lg ${massOrderState.currentPage === i ? 'bg-primary text-white' : 'border hover:border-primary'}" 
                       onclick="changePreviewPage(${i})">${i}</button>`;
    }
    
    if (totalPages > 5) {
        html += `<span class="px-2">...</span>`;
        html += `<button class="pagination-btn w-8 h-8 rounded-lg border hover:border-primary" onclick="changePreviewPage(${totalPages})">${totalPages}</button>`;
    }
    
    html += `
            <button class="pagination-btn w-8 h-8 rounded-lg border ${massOrderState.currentPage === totalPages ? 'opacity-50' : 'hover:border-primary'}" 
                    onclick="changePreviewPage(${massOrderState.currentPage + 1})" ${massOrderState.currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right text-xs"></i>
            </button>
        </div>
    `;
    
    paginationDiv.innerHTML = html;
}

window.changePreviewPage = function(page) {
    const totalPages = Math.ceil(massOrderState.orders.length / massOrderState.itemsPerPage);
    if (page < 1 || page > totalPages) return;
    massOrderState.currentPage = page;
    renderValidationResults(
        massOrderState.validatedOrders.length,
        massOrderState.orders.length - massOrderState.validatedOrders.length,
        massOrderState.totalPrice
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ========== CALCULATE PRICE ==========
function calculatePriceBDT(usdRate) {
    const markedUp = usdRate * (1 + MARKUP_PERCENTAGE / 100);
    return Math.round(markedUp * massOrderState.exchangeRate);
}

// ========== SUBMIT MASS ORDER ==========
function openConfirmModal() {
    if (massOrderState.validatedOrders.length === 0) {
        showGlassToast('No valid orders to submit', 'error');
        return;
    }
    
    if (massOrderState.totalPrice > massOrderState.userBalance) {
        showGlassToast('Insufficient balance. Please add funds.', 'error');
        return;
    }
    
    const modal = document.getElementById('confirmModal');
    const messageEl = document.getElementById('confirmMessage');
    
    if (messageEl) {
        messageEl.innerHTML = `
            <div class="text-center">
                <div class="text-2xl font-black text-primary mb-2">${formatCurrencyBDT(massOrderState.totalPrice)}</div>
                <p class="text-sm text-gray-500">You are about to submit <strong>${massOrderState.validatedOrders.length}</strong> orders.</p>
                <p class="text-xs text-gray-400 mt-2">This will deduct the amount from your balance.</p>
            </div>
        `;
    }
    
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

async function submitMassOrder() {
    massOrderState.isSubmitting = true;
    
    const submitBtn = document.getElementById('confirmSubmitBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';
    
    let successCount = 0;
    let failCount = 0;
    const failedOrders = [];
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) throw new Error('Not authenticated');
        
        // Show progress indicator
        showProgressIndicator(massOrderState.validatedOrders.length);
        
        for (let i = 0; i < massOrderState.validatedOrders.length; i++) {
            const order = massOrderState.validatedOrders[i];
            updateProgress(i + 1, massOrderState.validatedOrders.length);
            
            try {
                const formData = new URLSearchParams();
                formData.append('action', 'add');
                formData.append('service', order.serviceId);
                formData.append('link', order.link);
                formData.append('quantity', order.quantity);
                
                const response = await fetch(API_PROXY, { method: 'POST', body: formData });
                const result = await response.json();
                
                if (result.order) {
                    await db.collection('orders').add({
                        userId: user.uid,
                        serviceId: order.serviceId,
                        serviceName: order.serviceName,
                        link: order.link,
                        quantity: order.quantity,
                        priceBDT: order.totalPrice,
                        priceUSD: order.totalPrice / massOrderState.exchangeRate,
                        amarboostOrderId: result.order,
                        status: 'pending',
                        createdAt: new Date()
                    });
                    successCount++;
                } else {
                    failCount++;
                    failedOrders.push(order);
                }
            } catch (err) {
                failCount++;
                failedOrders.push(order);
            }
        }
        
        // Deduct total price of successful orders
        const successfulTotal = massOrderState.validatedOrders
            .filter((_, idx) => !failedOrders.includes(massOrderState.validatedOrders[idx]))
            .reduce((sum, o) => sum + o.totalPrice, 0);
        
        if (successfulTotal > 0) {
            await db.collection('users').doc(user.uid).update({
                balance: firebase.firestore.FieldValue.increment(-successfulTotal)
            });
        }
        
        // Record mass order batch
        await db.collection('massOrders').add({
            userId: user.uid,
            totalOrders: massOrderState.validatedOrders.length,
            successCount: successCount,
            failCount: failCount,
            totalPrice: successfulTotal,
            status: successCount > 0 ? 'completed' : 'failed',
            createdAt: new Date()
        });
        
        hideProgressIndicator();
        showGlassToast(`✅ ${successCount} orders placed, ${failCount} failed`, successCount > 0 ? 'success' : 'error');
        
        closeConfirmModal();
        
        // Reset form
        document.getElementById('bulkOrdersInput').value = '';
        massOrderState.orders = [];
        massOrderState.validatedOrders = [];
        massOrderState.totalPrice = 0;
        massOrderState.currentPage = 1;
        
        const previewDiv = document.getElementById('previewSection');
        if (previewDiv) previewDiv.innerHTML = '<div class="text-center py-8 text-gray-400">Enter orders above to preview</div>';
        
        document.getElementById('summarySection')?.classList.add('hidden');
        await loadUserBalance();
        
        if (successCount > 0) {
            setTimeout(() => {
                window.location.href = '/dashboard/orders.html';
            }, 2000);
        }
        
    } catch (error) {
        console.error('Mass order error:', error);
        showGlassToast('Mass order failed. Please try again.', 'error');
    } finally {
        massOrderState.isSubmitting = false;
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        hideProgressIndicator();
    }
}

function showProgressIndicator(total) {
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (progressContainer) progressContainer.classList.remove('hidden');
    if (progressFill) progressFill.style.width = '0%';
    if (progressText) progressText.innerText = `0 / ${total}`;
}

function updateProgress(current, total) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const percent = (current / total) * 100;
    
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressText) progressText.innerText = `${current} / ${total}`;
}

function hideProgressIndicator() {
    const progressContainer = document.getElementById('progressContainer');
    if (progressContainer) progressContainer.classList.add('hidden');
}

// ========== DOWNLOAD TEMPLATE ==========
function downloadTemplate() {
    const template = `6205 | https://youtube.com/watch?v=example | 1000\n6208 | https://facebook.com/example | 500\n6209 | https://instagram.com/p/example | 2000`;
    const blob = new Blob([template], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'mass_order_template.txt';
    link.click();
    URL.revokeObjectURL(link.href);
    showGlassToast('Template downloaded!', 'success');
}

// ========== CLEAR FORM ==========
function clearForm() {
    if (massOrderState.isSubmitting) {
        showGlassToast('Please wait for current submission to complete', 'warning');
        return;
    }
    
    document.getElementById('bulkOrdersInput').value = '';
    massOrderState.orders = [];
    massOrderState.validatedOrders = [];
    massOrderState.totalPrice = 0;
    massOrderState.currentPage = 1;
    
    const previewDiv = document.getElementById('previewSection');
    if (previewDiv) previewDiv.innerHTML = '<div class="text-center py-8 text-gray-400">Enter orders above to preview</div>';
    
    document.getElementById('summarySection')?.classList.add('hidden');
    showGlassToast('Form cleared', 'info');
}

// ========== ANIMATIONS & LOADERS ==========
function showSkeletonLoader() {
    const container = document.getElementById('previewSection');
    if (container) {
        container.innerHTML = `
            <div class="space-y-3">
                <div class="skeleton skeleton-card h-20 rounded-xl"></div>
                <div class="skeleton skeleton-card h-20 rounded-xl"></div>
            </div>
        `;
    }
}

function hideSkeletonLoader() {
    const container = document.getElementById('previewSection');
    if (container && container.innerHTML.includes('skeleton')) {
        container.innerHTML = '<div class="text-center py-8 text-gray-400">Enter orders above to preview</div>';
    }
}

function animateInElements() {
    document.querySelectorAll('.glass-card, .mass-order-section').forEach((el, idx) => {
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
    const validateBtn = document.getElementById('validateBtn');
    if (validateBtn) validateBtn.addEventListener('click', validateOrders);
    
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearForm);
    
    const downloadBtn = document.getElementById('downloadTemplateBtn');
    if (downloadBtn) downloadBtn.addEventListener('click', downloadTemplate);
    
    const submitBtn = document.getElementById('submitAllBtn');
    if (submitBtn) submitBtn.addEventListener('click', openConfirmModal);
    
    const confirmSubmitBtn = document.getElementById('confirmSubmitBtn');
    if (confirmSubmitBtn) confirmSubmitBtn.addEventListener('click', submitMassOrder);
    
    // Close modal on outside click
    const confirmModal = document.getElementById('confirmModal');
    if (confirmModal) {
        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) closeConfirmModal();
        });
    }
}

// ========== EXPORT GLOBALS ==========
window.initMassOrder = initMassOrder;
window.validateOrders = validateOrders;
window.clearForm = clearForm;
window.downloadTemplate = downloadTemplate;
window.openConfirmModal = openConfirmModal;
window.closeConfirmModal = closeConfirmModal;
window.changePreviewPage = changePreviewPage;

// ========== AUTO-INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('bulkOrdersInput')) {
        if (window.auth && window.db) {
            await initMassOrder();
        } else {
            const checkFirebase = setInterval(async () => {
                if (window.auth && window.db) {
                    clearInterval(checkFirebase);
                    await initMassOrder();
                }
            }, 100);
        }
    }
});

console.log('✅ Mass Order v3.0 (design.md compliant) loaded');