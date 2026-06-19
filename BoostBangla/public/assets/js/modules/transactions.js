// ============================================
// BoostBangla Transactions Module v3.0
// Fully redesigned following design.md
// Glass transaction cards with type icons
// Filter chips with active states
// CSV export with date range picker
// Running balance calculator
// Spending breakdown mini-chart
// ============================================

// ========== GLOBAL STATE ==========
let transactionsState = {
    currentUser: null,
    allTransactions: [],
    filteredTransactions: [],
    currentFilter: 'all',
    currentPage: 1,
    itemsPerPage: 20,
    dateRange: { start: null, end: null },
    sortOrder: 'desc',
    isLoading: true,
    totals: {
        deposits: 0,
        spent: 0,
        withdrawn: 0,
        affiliate: 0
    }
};

// Transaction type configuration (design.md: color-coded)
const TRANSACTION_TYPES = {
    deposit: { name: 'Deposit', icon: 'fas fa-arrow-down', color: '#10b981', bgLight: '#10b98110', textClass: 'text-green-600 dark:text-green-400' },
    order: { name: 'Order Payment', icon: 'fas fa-shopping-cart', color: '#f59e0b', bgLight: '#f59e0b10', textClass: 'text-red-600 dark:text-red-400' },
    withdrawal: { name: 'Withdrawal', icon: 'fas fa-arrow-up', color: '#ef4444', bgLight: '#ef444410', textClass: 'text-red-600 dark:text-red-400' },
    affiliate: { name: 'Affiliate Earnings', icon: 'fas fa-hand-holding-usd', color: '#8b5cf6', bgLight: '#8b5cf610', textClass: 'text-green-600 dark:text-green-400' },
    refund: { name: 'Refund', icon: 'fas fa-undo-alt', color: '#3b82f6', bgLight: '#3b82f610', textClass: 'text-green-600 dark:text-green-400' }
};

// ========== INITIALIZE TRANSACTIONS ==========
async function initTransactions() {
    showSkeletonLoader();
    const isAuth = await checkAuthAndLoadUser();
    if (!isAuth) return;
    
    await loadTransactions();
    attachEventListeners();
    setupDateRangePicker();
    transactionsState.isLoading = false;
    hideSkeletonLoader();
    animateInElements();
    setupPeriodicRefresh();
}

// ========== CHECK AUTHENTICATION ==========
async function checkAuthAndLoadUser() {
    const user = window.getCurrentUser();
    if (!user?.uid) {
        window.location.href = '/login.html';
        return false;
    }
    
    transactionsState.currentUser = user;
    
    const userDoc = await db.collection('users').doc(user.uid).get();
    const username = userDoc.data()?.username || user.email?.split('@')[0] || 'User';
    
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.innerText = username;
    
    return true;
}

// ========== LOAD ALL TRANSACTIONS ==========
async function loadTransactions() {
    const container = document.getElementById('transactionsList');
    if (!container) return;
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;
        
        transactionsState.allTransactions = [];
        let totals = { deposits: 0, spent: 0, withdrawn: 0, affiliate: 0 };
        
        // Load deposits
        const depositsSnapshot = await db.collection('deposits')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        depositsSnapshot.forEach(doc => {
            const deposit = doc.data();
            if (deposit.status === 'approved') {
                totals.deposits += deposit.amountBDT || 0;
            }
            transactionsState.allTransactions.push({
                id: doc.id,
                type: 'deposit',
                amount: deposit.amountBDT || 0,
                status: deposit.status,
                method: deposit.method,
                transactionId: deposit.transactionId,
                createdAt: deposit.createdAt,
                description: `Deposit via ${deposit.method?.toUpperCase()}`,
                metadata: { bonus: deposit.bonusBDT }
            });
        });
        
        // Load orders
        const ordersSnapshot = await db.collection('orders')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            if (order.status === 'completed') {
                totals.spent += order.priceBDT || 0;
            }
            transactionsState.allTransactions.push({
                id: doc.id,
                type: 'order',
                amount: -(order.priceBDT || 0),
                status: order.status,
                serviceName: order.serviceName,
                quantity: order.quantity,
                link: order.link,
                createdAt: order.createdAt,
                description: order.serviceName?.substring(0, 50) || 'Order Payment'
            });
        });
        
        // Load withdrawals
        const withdrawalsSnapshot = await db.collection('withdrawals')
            .where('userId', '==', user.uid)
            .orderBy('requestedAt', 'desc')
            .get();
        
        withdrawalsSnapshot.forEach(doc => {
            const withdrawal = doc.data();
            if (withdrawal.status === 'completed') {
                totals.withdrawn += withdrawal.amount || 0;
            }
            transactionsState.allTransactions.push({
                id: doc.id,
                type: 'withdrawal',
                amount: -(withdrawal.amount || 0),
                status: withdrawal.status,
                method: withdrawal.method,
                account: withdrawal.account,
                createdAt: withdrawal.requestedAt,
                description: `Withdrawal via ${withdrawal.method?.toUpperCase()}`
            });
        });
        
        // Load affiliate earnings
        const affiliateSnapshot = await db.collection('affiliates').doc(user.uid).get();
        if (affiliateSnapshot.exists) {
            const affiliate = affiliateSnapshot.data();
            totals.affiliate = affiliate.totalEarnings || 0;
            
            // Add affiliate transactions from commissions
            const commissionsSnapshot = await db.collection('affiliateCommissions')
                .where('userId', '==', user.uid)
                .orderBy('createdAt', 'desc')
                .get();
            
            commissionsSnapshot.forEach(doc => {
                const commission = doc.data();
                transactionsState.allTransactions.push({
                    id: doc.id,
                    type: 'affiliate',
                    amount: commission.amount || 0,
                    status: commission.status || 'completed',
                    fromUser: commission.fromUser,
                    createdAt: commission.createdAt,
                    description: `Commission from ${commission.fromUser || 'referral'}`
                });
            });
        }
        
        transactionsState.totals = totals;
        
        // Sort by date (newest first)
        transactionsState.allTransactions.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return transactionsState.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
        
        updateStatsDisplays();
        applyFiltersAndRender();
        
    } catch (error) {
        console.error('Error loading transactions:', error);
        container.innerHTML = renderErrorState();
        showGlassToast('Failed to load transactions', 'error');
    }
}

// ========== UPDATE STATS DISPLAYS ==========
function updateStatsDisplays() {
    const runningBalance = transactionsState.totals.deposits + 
                          transactionsState.totals.affiliate - 
                          transactionsState.totals.spent - 
                          transactionsState.totals.withdrawn;
    
    animateStatValue('totalDeposits', formatCurrencyBDT(transactionsState.totals.deposits));
    animateStatValue('totalSpent', formatCurrencyBDT(transactionsState.totals.spent));
    animateStatValue('totalWithdrawn', formatCurrencyBDT(transactionsState.totals.withdrawn));
    animateStatValue('totalAffiliate', formatCurrencyBDT(transactionsState.totals.affiliate));
    animateStatValue('runningBalance', formatCurrencyBDT(runningBalance));
    
    // Update spending pie chart (simple CSS-based)
    updateSpendingChart();
}

function animateStatValue(elementId, newValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const oldValue = element.innerHTML;
    if (oldValue === newValue) return;
    
    element.classList.add('animate-pulse-slow');
    element.innerHTML = newValue;
    setTimeout(() => element.classList.remove('animate-pulse-slow'), 300);
}

function updateSpendingChart() {
    const total = transactionsState.totals.spent;
    if (total === 0) return;
    
    // This would be expanded with actual category breakdown
    const chartFill = document.getElementById('spendingChartFill');
    const chartLabel = document.getElementById('spendingChartLabel');
    
    if (chartFill) {
        // Animate the fill
        chartFill.style.width = '0%';
        setTimeout(() => {
            chartFill.style.width = '100%';
            chartFill.classList.add('transition-all', 'duration-1000', 'ease-out');
        }, 100);
    }
    if (chartLabel) chartLabel.innerText = formatCurrencyBDT(total);
}

// ========== APPLY FILTERS AND RENDER ==========
function applyFiltersAndRender() {
    let filtered = [...transactionsState.allTransactions];
    
    // Type filter
    if (transactionsState.currentFilter !== 'all') {
        filtered = filtered.filter(t => t.type === transactionsState.currentFilter);
    }
    
    // Date range filter
    if (transactionsState.dateRange.start) {
        const startDate = new Date(transactionsState.dateRange.start);
        startDate.setHours(0, 0, 0, 0);
        filtered = filtered.filter(t => {
            const date = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
            return date >= startDate;
        });
    }
    if (transactionsState.dateRange.end) {
        const endDate = new Date(transactionsState.dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(t => {
            const date = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
            return date <= endDate;
        });
    }
    
    transactionsState.filteredTransactions = filtered;
    transactionsState.currentPage = 1;
    renderTransactions();
}

// ========== RENDER TRANSACTIONS ==========
function renderTransactions() {
    const container = document.getElementById('transactionsList');
    if (!container) return;
    
    const start = (transactionsState.currentPage - 1) * transactionsState.itemsPerPage;
    const pageTransactions = transactionsState.filteredTransactions.slice(start, start + transactionsState.itemsPerPage);
    const totalPages = Math.ceil(transactionsState.filteredTransactions.length / transactionsState.itemsPerPage);
    
    if (pageTransactions.length === 0) {
        container.innerHTML = renderEmptyState();
        renderPagination(0);
        return;
    }
    
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
        container.innerHTML = `
            <div class="space-y-4 animate-fade-in">
                ${pageTransactions.map((transaction, idx) => renderTransactionCard(transaction, idx)).join('')}
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="overflow-x-auto">
                <table class="data-table w-full">
                    <thead>
                        <tr>
                            <th>Transaction ID</th>
                            <th>Description</th>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </thead>
                    <tbody>
                        ${pageTransactions.map((transaction, idx) => renderTransactionRow(transaction, idx)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    renderPagination(totalPages);
    updateSummaryStats();
}

function renderTransactionRow(transaction, index) {
    const delay = 0.03 * (index % 10);
    const typeConfig = TRANSACTION_TYPES[transaction.type] || TRANSACTION_TYPES.order;
    const isPositive = transaction.amount > 0;
    const amountClass = isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    const amountPrefix = isPositive ? '+' : '';
    const date = transaction.createdAt?.toDate ? transaction.createdAt.toDate() : new Date(transaction.createdAt);
    const transactionId = transaction.transactionId || transaction.id.substring(0, 12);
    
    return `
        <tr class="animate-slide-up hover:bg-gray-50 dark:hover:bg-gray-800 transition-all" style="animation-delay: ${delay}s">
            <td class="font-mono text-xs text-primary">${escapeHtml(transactionId)}...</td>
            <td class="max-w-[200px] truncate" title="${escapeHtml(transaction.description)}">${escapeHtml(transaction.description.substring(0, 40))}</td>
            <td class="text-sm text-gray-500">${formatDate(date)}</td>
            <td>
                <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-full flex items-center justify-center" style="background: ${typeConfig.bgLight}">
                        <i class="${typeConfig.icon} text-xs" style="color: ${typeConfig.color}"></i>
                    </div>
                    <span class="text-xs">${typeConfig.name}</span>
                </div>
            </td>
            <td class="${amountClass} font-semibold">${amountPrefix}${formatCurrencyBDT(Math.abs(transaction.amount))}</td>
            <td>${renderTransactionStatus(transaction.status)}</td>
        </tr>
    `;
}

function renderTransactionCard(transaction, index) {
    const delay = 0.03 * (index % 10);
    const typeConfig = TRANSACTION_TYPES[transaction.type] || TRANSACTION_TYPES.order;
    const isPositive = transaction.amount > 0;
    const amountClass = isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    const amountPrefix = isPositive ? '+' : '';
    const date = transaction.createdAt?.toDate ? transaction.createdAt.toDate() : new Date(transaction.createdAt);
    
    return `
        <div class="glass-card p-4 rounded-2xl animate-slide-up" style="animation-delay: ${delay}s">
            <div class="flex justify-between items-start mb-3">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center" style="background: ${typeConfig.bgLight}">
                        <i class="${typeConfig.icon} text-lg" style="color: ${typeConfig.color}"></i>
                    </div>
                    <div>
                        <div class="font-medium">${typeConfig.name}</div>
                        <div class="text-xs text-gray-400">${formatDate(date)}</div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-xl font-black ${amountClass}">${amountPrefix}${formatCurrencyBDT(Math.abs(transaction.amount))}</div>
                    ${renderTransactionStatus(transaction.status)}
                </div>
            </div>
            <div class="pt-2 border-t border-gray-100 dark:border-gray-700">
                <p class="text-sm text-gray-600 dark:text-gray-300">${escapeHtml(transaction.description)}</p>
                ${transaction.transactionId ? `<p class="text-xs text-gray-400 mt-1">TXID: ${transaction.transactionId}</p>` : ''}
                ${transaction.method ? `<p class="text-xs text-gray-400 mt-1">Method: ${transaction.method.toUpperCase()}</p>` : ''}
            </div>
        </div>
    `;
}

function renderTransactionStatus(status) {
    if (status === 'approved' || status === 'completed' || status === 'success') {
        return `<span class="status-badge status-success"><i class="fas fa-check-circle mr-1"></i> Completed</span>`;
    }
    if (status === 'pending' || status === 'processing') {
        return `<span class="status-badge status-pending"><i class="fas fa-clock mr-1"></i> Pending</span>`;
    }
    if (status === 'rejected' || status === 'failed') {
        return `<span class="status-badge status-cancelled"><i class="fas fa-times-circle mr-1"></i> Failed</span>`;
    }
    return `<span class="status-badge">${status || 'Unknown'}</span>`;
}

// ========== UPDATE SUMMARY STATS ==========
function updateSummaryStats() {
    const total = transactionsState.filteredTransactions.length;
    const totalAmount = transactionsState.filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    const summaryEl = document.getElementById('filterSummary');
    if (summaryEl && total > 0) {
        summaryEl.innerHTML = `
            <div class="flex justify-between items-center text-sm">
                <span>Showing <strong>${total}</strong> transactions</span>
                <span class="font-semibold">Net: ${formatCurrencyBDT(totalAmount)}</span>
            </div>
        `;
    }
}

// ========== RENDER PAGINATION ==========
function renderPagination(totalPages) {
    const paginationDiv = document.getElementById('pagination');
    if (!paginationDiv) return;
    
    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    
    let html = `
        <div class="flex justify-center gap-2 mt-8">
            <button class="pagination-btn w-10 h-10 rounded-xl border border-gray-200 ${transactionsState.currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary'}" 
                    onclick="changeTransactionPage(${transactionsState.currentPage - 1})" ${transactionsState.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
    `;
    
    const maxVisible = 5;
    let startPage = Math.max(1, transactionsState.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    if (startPage > 1) {
        html += `<button class="pagination-btn w-10 h-10 rounded-xl border border-gray-200 hover:border-primary" onclick="changeTransactionPage(1)">1</button>`;
        if (startPage > 2) html += `<span class="px-2">...</span>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="pagination-btn w-10 h-10 rounded-xl ${transactionsState.currentPage === i ? 'bg-primary text-white border-primary' : 'border border-gray-200 hover:border-primary'}" 
                       onclick="changeTransactionPage(${i})">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="px-2">...</span>`;
        html += `<button class="pagination-btn w-10 h-10 rounded-xl border border-gray-200 hover:border-primary" onclick="changeTransactionPage(${totalPages})">${totalPages}</button>`;
    }
    
    html += `
            <button class="pagination-btn w-10 h-10 rounded-xl border border-gray-200 ${transactionsState.currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary'}" 
                    onclick="changeTransactionPage(${transactionsState.currentPage + 1})" ${transactionsState.currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
    
    paginationDiv.innerHTML = html;
}

window.changeTransactionPage = function(page) {
    const totalPages = Math.ceil(transactionsState.filteredTransactions.length / transactionsState.itemsPerPage);
    if (page < 1 || page > totalPages) return;
    transactionsState.currentPage = page;
    renderTransactions();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ========== FILTER HANDLERS ==========
function setTransactionFilter(filter) {
    transactionsState.currentFilter = filter;
    transactionsState.currentPage = 1;
    
    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.classList.remove('active', 'bg-primary', 'text-white');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active', 'bg-primary', 'text-white');
        }
    });
    
    applyFiltersAndRender();
}

function clearDateRange() {
    transactionsState.dateRange = { start: null, end: null };
    
    const startPicker = document.getElementById('dateStart');
    const endPicker = document.getElementById('dateEnd');
    if (startPicker) startPicker.value = '';
    if (endPicker) endPicker.value = '';
    
    applyFiltersAndRender();
    showGlassToast('Date filter cleared', 'info');
}

// ========== DATE RANGE PICKER ==========
function setupDateRangePicker() {
    const startPicker = document.getElementById('dateStart');
    const endPicker = document.getElementById('dateEnd');
    const applyBtn = document.getElementById('applyDateRange');
    const clearBtn = document.getElementById('clearDateRange');
    
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            transactionsState.dateRange = {
                start: startPicker?.value || null,
                end: endPicker?.value || null
            };
            transactionsState.currentPage = 1;
            applyFiltersAndRender();
            showGlassToast('Date range applied', 'success');
        });
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearDateRange);
    }
}

// ========== EXPORT TO CSV ==========
function exportToCSV() {
    if (transactionsState.filteredTransactions.length === 0) {
        showGlassToast('No transactions to export', 'error');
        return;
    }
    
    const headers = ['Date', 'Type', 'Description', 'Amount (BDT)', 'Status', 'Transaction ID', 'Method'];
    const rows = transactionsState.filteredTransactions.map(t => {
        const date = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
        return [
            date.toLocaleString('en-BD'),
            TRANSACTION_TYPES[t.type]?.name || t.type,
            t.description,
            t.amount,
            t.status,
            t.transactionId || t.id,
            t.method || ''
        ];
    });
    
    const csvContent = [headers, ...rows].map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `transactions_${new Date().toISOString().slice(0, 19)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showGlassToast(`${transactionsState.filteredTransactions.length} transactions exported!`, 'success');
}

// ========== PERIODIC REFRESH ==========
function setupPeriodicRefresh() {
    setInterval(async () => {
        if (!document.hidden) {
            await loadTransactions();
        }
    }, 60000); // Refresh every minute
}

// ========== EMPTY & ERROR STATES ==========
function renderEmptyState() {
    const hasFilter = transactionsState.currentFilter !== 'all' || 
                     transactionsState.dateRange.start || 
                     transactionsState.dateRange.end;
    
    return `
        <div class="empty-state py-12">
            <div class="empty-icon text-6xl mb-4">📭</div>
            <h3 class="empty-title text-xl font-bold mb-2">No transactions found</h3>
            <p class="empty-description text-gray-500 mb-4">
                ${hasFilter ? 'Try changing your filters' : 'Your transaction history will appear here'}
            </p>
            ${hasFilter ? '<button onclick="clearAllFilters()" class="btn-primary">Clear Filters</button>' : ''}
        </div>
    `;
}

function renderErrorState() {
    return `
        <div class="empty-state py-12">
            <div class="empty-icon text-6xl mb-4">❌</div>
            <h3 class="empty-title text-xl font-bold mb-2">Failed to load transactions</h3>
            <button onclick="location.reload()" class="btn-primary">Retry</button>
        </div>
    `;
}

function clearAllFilters() {
    transactionsState.currentFilter = 'all';
    transactionsState.dateRange = { start: null, end: null };
    transactionsState.currentPage = 1;
    
    // Reset UI
    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.classList.remove('active', 'bg-primary', 'text-white');
        if (btn.dataset.filter === 'all') {
            btn.classList.add('active', 'bg-primary', 'text-white');
        }
    });
    
    const startPicker = document.getElementById('dateStart');
    const endPicker = document.getElementById('dateEnd');
    if (startPicker) startPicker.value = '';
    if (endPicker) endPicker.value = '';
    
    applyFiltersAndRender();
    showGlassToast('All filters cleared', 'success');
}

// ========== ANIMATIONS & LOADERS ==========
function showSkeletonLoader() {
    const container = document.getElementById('transactionsList');
    if (container) {
        container.innerHTML = `
            <div class="space-y-3">
                <div class="skeleton skeleton-card h-20 rounded-xl"></div>
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
    document.querySelectorAll('.stat-card, .filter-chip').forEach((el, idx) => {
        el.classList.add('animate-slide-up');
        el.style.animationDelay = `${0.03 * idx}s`;
    });
}

// ========== HELPER FUNCTIONS ==========
function formatDate(date) {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-BD', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

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
    // Export button
    const exportBtn = document.getElementById('exportTransactionsBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToCSV);
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshTransactionsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            showSkeletonLoader();
            await loadTransactions();
            hideSkeletonLoader();
            showGlassToast('Transactions refreshed', 'success');
        });
    }
    
    // Items per page
    const itemsPerPageSelect = document.getElementById('itemsPerPage');
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', (e) => {
            transactionsState.itemsPerPage = parseInt(e.target.value);
            transactionsState.currentPage = 1;
            renderTransactions();
        });
    }
    
    // Sort order
    const sortOrderSelect = document.getElementById('sortOrder');
    if (sortOrderSelect) {
        sortOrderSelect.addEventListener('change', (e) => {
            transactionsState.sortOrder = e.target.value;
            transactionsState.allTransactions.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                return transactionsState.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
            });
            applyFiltersAndRender();
        });
    }
    
    // Responsive view
    window.addEventListener('resize', () => {
        if (document.getElementById('transactionsList')) {
            renderTransactions();
        }
    });
}

// ========== EXPORT GLOBALS ==========
window.initTransactions = initTransactions;
window.setTransactionFilter = setTransactionFilter;
window.changeTransactionPage = changeTransactionPage;
window.clearAllFilters = clearAllFilters;
window.clearDateRange = clearDateRange;

// ========== AUTO-INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('transactionsList')) {
        if (window.auth && window.db) {
            await initTransactions();
        } else {
            const checkFirebase = setInterval(async () => {
                if (window.auth && window.db) {
                    clearInterval(checkFirebase);
                    await initTransactions();
                }
            }, 100);
        }
    }
});

console.log('✅ Transactions v3.0 (design.md compliant) loaded');