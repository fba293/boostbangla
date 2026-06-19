// ============================================
// BoostBangla Add Funds Module v3.0
// Fully redesigned following design.md
// Live exchange rates, animated bonus calculator
// Glass payment method cards, real-time preview
// Flutter-like transaction history
// ============================================

// ========== GLOBAL STATE ==========
let fundsState = {
    currentUser: null,
    exchangeRate: 120,
    selectedMethod: 'bkash',
    amountUSD: 0,
    bdtAmount: 0,
    bonusUSD: 0,
    bonusBDT: 0,
    platformFee: 5,
    transactions: [],
    isLoading: true
};

const PAYMENT_METHODS = {
    bkash: { name: 'bKash', icon: 'fas fa-mobile-alt', color: '#E2136E', bgLight: '#E2136E10' },
    nagad: { name: 'Nagad', icon: 'fas fa-credit-card', color: '#F26522', bgLight: '#F2652210' },
    rocket: { name: 'Rocket', icon: 'fas fa-rocket', color: '#0055A4', bgLight: '#0055A410' }
};

const PAYMENT_NUMBERS = {
    bkash: '01676406896',
    nagad: '01676406896',
    rocket: '01676406896'
};

// ========== INITIALIZE ADD FUNDS ==========
async function initAddFunds() {
    showSkeletonLoader();
    const isAuth = await checkAuthAndLoadUser();
    if (!isAuth) return;
    
    await Promise.all([
        loadExchangeRate(),
        loadUserBalance(),
        loadRecentDeposits(),
        loadTransactionStatement()
    ]);
    
    attachEventListeners();
    setupRealTimeAmountUpdate();
    fundsState.isLoading = false;
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
    
    fundsState.currentUser = user;
    
    const userDoc = await db.collection('users').doc(user.uid).get();
    const username = userDoc.data()?.username || user.email?.split('@')[0] || 'User';
    const memberSince = userDoc.data()?.createdAt?.toDate ? 
        userDoc.data().createdAt.toDate().toLocaleDateString('en-BD', { year: 'numeric', month: 'long' }) : 
        '2025';
    
    const userNameEl = document.getElementById('userName');
    const memberSinceEl = document.getElementById('memberSince');
    if (userNameEl) userNameEl.innerText = username;
    if (memberSinceEl) memberSinceEl.innerText = memberSince;
    
    return true;
}

// ========== LOAD LIVE EXCHANGE RATE (HexaRate API) ==========
async function loadExchangeRate() {
    try {
        const response = await fetch('https://hexarate.paikama.co/api/rates/latest/USD?target=BDT');
        const data = await response.json();
        if (data?.data?.mid) {
            fundsState.exchangeRate = data.data.mid;
        } else {
            throw new Error('Invalid response');
        }
    } catch (error) {
        console.warn('HexaRate failed, trying fallback...');
        try {
            const fallbackResponse = await fetch('https://open.er-api.com/v6/latest/USD');
            const fallbackData = await fallbackResponse.json();
            if (fallbackData.rates?.BDT) {
                fundsState.exchangeRate = fallbackData.rates.BDT;
            } else {
                throw new Error('Fallback failed');
            }
        } catch (fallbackError) {
            fundsState.exchangeRate = 120;
            showGlassToast('Using cached exchange rate', 'info');
        }
    }
    
    updateRateDisplays();
}

function updateRateDisplays() {
    const rateWithFee = fundsState.exchangeRate * (1 + fundsState.platformFee / 100);
    
    const marketRateEl = document.getElementById('marketRate');
    const yourRateEl = document.getElementById('yourRate');
    
    if (marketRateEl) marketRateEl.innerHTML = `1 USD = <span class="font-bold text-primary">${fundsState.exchangeRate.toFixed(2)}</span> BDT`;
    if (yourRateEl) yourRateEl.innerHTML = `1 USD = <span class="font-bold text-primary">${rateWithFee.toFixed(2)}</span> BDT <span class="text-xs text-gray-400">(+${fundsState.platformFee}% fee)</span>`;
}

// ========== LOAD USER BALANCE ==========
async function loadUserBalance() {
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;
        
        const userDoc = await db.collection('users').doc(user.uid).get();
        const balance = userDoc.data()?.balance || 0;
        const balanceUSD = balance / fundsState.exchangeRate;
        
        const balanceBDTEl = document.getElementById('currentBalance');
        const balanceUSDEl = document.getElementById('currentBalanceUSD');
        const overviewBalanceEl = document.getElementById('overviewBalance');
        
        if (balanceBDTEl) {
            balanceBDTEl.innerHTML = animateValueChange(balanceBDTEl.innerText, `৳${balance.toLocaleString()}`);
        }
        if (balanceUSDEl) balanceUSDEl.innerText = `$${balanceUSD.toFixed(2)}`;
        if (overviewBalanceEl) overviewBalanceEl.innerHTML = `৳${balance.toLocaleString()}`;
        
        // Update account level based on total orders
        const ordersSnapshot = await db.collection('orders')
            .where('userId', '==', user.uid)
            .get();
        updateAccountLevel(ordersSnapshot.size);
        
    } catch (error) {
        console.error('Error loading balance:', error);
        showGlassToast('Failed to load balance', 'error');
    }
}

// ========== UPDATE ACCOUNT LEVEL (design.md tier badges) ==========
function updateAccountLevel(totalOrders) {
    const levelElement = document.getElementById('accountLevel');
    const nextLevelElement = document.getElementById('nextLevel');
    
    if (!levelElement) return;
    
    let level = '', nextLevel = '', icon = '';
    
    if (totalOrders < 100) {
        level = '🥉 Beginner';
        nextLevel = `${100 - totalOrders} orders to Bronze`;
        icon = '🥉';
    } else if (totalOrders < 1000) {
        level = '🥈 Bronze';
        nextLevel = `${1000 - totalOrders} orders to Silver`;
        icon = '🥈';
    } else if (totalOrders < 10000) {
        level = '🥇 Silver';
        nextLevel = `${10000 - totalOrders} orders to Gold`;
        icon = '🥇';
    } else if (totalOrders < 50000) {
        level = '👑 Gold';
        nextLevel = `${50000 - totalOrders} orders to Platinum`;
        icon = '👑';
    } else {
        level = '💎 Platinum';
        nextLevel = 'Top tier member 👑';
        icon = '💎';
    }
    
    levelElement.innerHTML = `${icon} ${level}`;
    if (nextLevelElement) nextLevelElement.innerText = nextLevel;
}

// ========== REAL-TIME AMOUNT CALCULATION (with 1% bonus on $100+) ==========
function setupRealTimeAmountUpdate() {
    const amountInput = document.getElementById('amountUSD');
    if (!amountInput) return;
    
    amountInput.addEventListener('input', (e) => {
        fundsState.amountUSD = parseFloat(e.target.value) || 0;
        calculateAmounts();
    });
}

function calculateAmounts() {
    const rateWithFee = fundsState.exchangeRate * (1 + fundsState.platformFee / 100);
    let bdtAmount = Math.round(fundsState.amountUSD * rateWithFee);
    let bonusUSD = 0;
    let bonusBDT = 0;
    
    // 1% bonus on $100+
    if (fundsState.amountUSD >= 100) {
        bonusUSD = fundsState.amountUSD * 0.01;
        bonusBDT = Math.round(bonusUSD * rateWithFee);
        bdtAmount = bdtAmount + bonusBDT;
    }
    
    fundsState.bdtAmount = bdtAmount;
    fundsState.bonusUSD = bonusUSD;
    fundsState.bonusBDT = bonusBDT;
    
    updateAmountDisplays();
}

function updateAmountDisplays() {
    const displayUSD = document.getElementById('displayUSD');
    const totalBDT = document.getElementById('totalBDT');
    const bonusDisplay = document.getElementById('bonusDisplay');
    const bonusAmount = document.getElementById('bonusAmount');
    const bonusMessage = document.getElementById('bonusMessage');
    
    if (displayUSD) displayUSD.innerText = `$${fundsState.amountUSD.toFixed(2)}`;
    if (totalBDT) totalBDT.innerHTML = `<span class="text-3xl font-black text-primary">৳${fundsState.bdtAmount.toLocaleString()}</span>`;
    
    // Show/hide bonus display (design.md glass alert)
    if (fundsState.bonusUSD > 0) {
        if (bonusDisplay) bonusDisplay.classList.remove('hidden');
        if (bonusAmount) bonusAmount.innerHTML = `+৳${fundsState.bonusBDT.toLocaleString()}`;
        if (bonusMessage) bonusMessage.innerHTML = `🎉 +$${fundsState.bonusUSD.toFixed(2)} Bonus Added!`;
    } else {
        if (bonusDisplay) bonusDisplay.classList.add('hidden');
        if (bonusMessage) bonusMessage.innerHTML = '🎁 Add $100+ to get 1% bonus';
    }
    
    // Update instruction amounts in payment panels
    updateInstructionAmounts();
}

function updateInstructionAmounts() {
    const instructionAmounts = document.querySelectorAll('.instruction-amount');
    instructionAmounts.forEach(el => {
        el.innerText = fundsState.bdtAmount.toLocaleString();
    });
}

// ========== PRESET AMOUNT BUTTONS (design.md glass chips) ==========
function setPresetAmount(amount) {
    const amountInput = document.getElementById('amountUSD');
    if (amountInput) {
        amountInput.value = amount;
        fundsState.amountUSD = amount;
        calculateAmounts();
        
        // Add ripple animation to the clicked button
        const btns = document.querySelectorAll('.amount-preset');
        btns.forEach(btn => btn.classList.remove('bg-primary', 'text-white'));
        event.target.classList.add('bg-primary', 'text-white');
        
        showGlassToast(`$${amount} preset selected`, 'info');
    }
}

// ========== PAYMENT METHOD SELECTION (design.md glass cards) ==========
function selectPaymentMethod(method) {
    fundsState.selectedMethod = method;
    
    // Update UI
    document.querySelectorAll('.payment-method-card').forEach(card => {
        card.classList.remove('selected', 'border-primary', 'shadow-lg', 'scale-105');
        card.classList.add('border-gray-200', 'dark:border-gray-700');
    });
    
    const selectedCard = document.querySelector(`.payment-method-card[data-method="${method}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected', 'border-primary', 'shadow-lg', 'scale-105');
        selectedCard.classList.remove('border-gray-200', 'dark:border-gray-700');
    }
    
    // Show/hide instruction panels
    document.querySelectorAll('.instruction-panel').forEach(panel => {
        panel.classList.add('hidden');
    });
    
    const activePanel = document.getElementById(`${method}Instructions`);
    if (activePanel) {
        activePanel.classList.remove('hidden');
        activePanel.classList.add('animate-fade-in');
    }
    
    // Update payment number display
    const paymentNumber = document.getElementById('paymentNumber');
    if (paymentNumber) {
        paymentNumber.innerText = PAYMENT_NUMBERS[method];
        paymentNumber.classList.add('animate-pulse-slow');
        setTimeout(() => paymentNumber.classList.remove('animate-pulse-slow'), 500);
    }
}

// ========== SUBMIT DEPOSIT REQUEST ==========
async function submitDepositRequest(e) {
    e.preventDefault();
    
    const usdAmount = fundsState.amountUSD;
    const transactionId = document.getElementById('transactionId').value.trim();
    const paymentMethod = fundsState.selectedMethod;
    
    // Validation
    if (usdAmount < 0.20) {
        showGlassToast('Minimum deposit amount is $0.20 USD', 'error');
        return;
    }
    
    if (usdAmount > 10000) {
        showGlassToast('Maximum deposit amount is $10,000 USD', 'error');
        return;
    }
    
    if (!transactionId) {
        showGlassToast('Please enter the transaction ID from your payment', 'error');
        return;
    }
    
    if (transactionId.length < 5) {
        showGlassToast('Please enter a valid transaction ID', 'error');
        return;
    }
    
    // Check for duplicate transaction ID
    const existingDeposit = await checkDuplicateTransaction(transactionId);
    if (existingDeposit) {
        showGlassToast('This transaction ID has already been submitted', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) throw new Error('Not authenticated');
        
        const rateWithFee = fundsState.exchangeRate * (1 + fundsState.platformFee / 100);
        
        await db.collection('deposits').add({
            userId: user.uid,
            userEmail: user.email,
            amountUSD: usdAmount,
            amountBDT: fundsState.bdtAmount,
            bonusUSD: fundsState.bonusUSD,
            bonusBDT: fundsState.bonusBDT,
            method: paymentMethod,
            transactionId: transactionId,
            exchangeRate: fundsState.exchangeRate,
            platformFee: fundsState.platformFee,
            finalRate: rateWithFee,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showSuccessModal(fundsState.bdtAmount, transactionId);
        
        // Reset form
        document.getElementById('amountUSD').value = '';
        document.getElementById('transactionId').value = '';
        fundsState.amountUSD = 0;
        calculateAmounts();
        
        // Refresh data
        await Promise.all([
            loadUserBalance(),
            loadRecentDeposits(),
            loadTransactionStatement()
        ]);
        
    } catch (error) {
        console.error('Error submitting deposit:', error);
        showGlassToast('Failed to submit deposit request. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

async function checkDuplicateTransaction(transactionId) {
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return false;
        
        const existing = await db.collection('deposits')
            .where('transactionId', '==', transactionId)
            .where('userId', '==', user.uid)
            .get();
        
        return !existing.empty;
    } catch (error) {
        console.error('Duplicate check error:', error);
        return false;
    }
}

// ========== LOAD RECENT DEPOSITS (design.md glass cards) ==========
async function loadRecentDeposits() {
    const container = document.getElementById('recentDeposits');
    if (!container) return;
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;
        
        const depositsSnapshot = await db.collection('deposits')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        if (depositsSnapshot.empty) {
            container.innerHTML = renderEmptyDepositsState();
            return;
        }
        
        let html = '<div class="space-y-3">';
        depositsSnapshot.forEach(doc => {
            const deposit = doc.data();
            const statusConfig = getStatusConfig(deposit.status);
            const date = deposit.createdAt?.toDate ? deposit.createdAt.toDate() : new Date();
            
            html += `
                <div class="glass-card p-4 rounded-xl flex justify-between items-center animate-slide-up">
                    <div>
                        <div class="font-semibold text-primary">৳${deposit.amountBDT?.toLocaleString() || 0}</div>
                        <div class="text-xs text-gray-400 mt-1">${date.toLocaleDateString('en-BD')}</div>
                    </div>
                    <div class="text-right">
                        <span class="status-badge ${statusConfig.class}">${statusConfig.icon} ${statusConfig.text}</span>
                        <div class="text-xs text-gray-400 mt-1">${deposit.method?.toUpperCase()}</div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading deposits:', error);
        container.innerHTML = renderErrorDepositsState();
    }
}

// ========== LOAD TRANSACTION STATEMENT ==========
async function loadTransactionStatement() {
    const statementBody = document.getElementById('statementBody');
    if (!statementBody) return;
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;
        
        statementBody.innerHTML = `
            <tr><td colspan="5" class="text-center py-8">
                <div class="spinner mx-auto mb-2"></div>
                <p class="text-gray-400">Loading transactions...</p>
            </td></tr>
        `;
        
        // Fetch deposits
        const depositsSnapshot = await db.collection('deposits')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        
        // Fetch orders
        const ordersSnapshot = await db.collection('orders')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        
        let transactions = [];
        
        depositsSnapshot.forEach(doc => {
            const data = doc.data();
            transactions.push({
                id: doc.id,
                date: data.createdAt?.toDate() || new Date(),
                description: `Deposit via ${data.method?.toUpperCase()}`,
                amount: data.amountBDT || 0,
                type: 'deposit',
                status: data.status,
                transactionId: data.transactionId
            });
        });
        
        ordersSnapshot.forEach(doc => {
            const data = doc.data();
            transactions.push({
                id: doc.id,
                date: data.createdAt?.toDate() || new Date(),
                description: `Order: ${(data.serviceName || 'N/A').substring(0, 40)}`,
                amount: -(data.priceBDT || 0),
                type: 'order',
                status: data.status
            });
        });
        
        // Sort by date (newest first)
        transactions.sort((a, b) => b.date - a.date);
        
        if (transactions.length === 0) {
            statementBody.innerHTML = `
                <tr><td colspan="5" class="text-center py-12 text-gray-400">
                    <i class="fas fa-receipt text-4xl mb-2 opacity-50"></i>
                    <p>No transactions yet</p>
                </td></tr>
            `;
            return;
        }
        
        let html = '';
        transactions.slice(0, 10).forEach(trans => {
            const amountClass = trans.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
            const amountPrefix = trans.amount >= 0 ? '+' : '';
            
            html += `
                <tr class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <td class="py-3 font-mono text-xs">${trans.id.substring(0, 8)}...</td>
                    <td class="py-3 text-sm">${formatTransactionDate(trans.date)}</td>
                    <td class="py-3 text-sm max-w-[200px] truncate" title="${escapeHtml(trans.description)}">${escapeHtml(trans.description.substring(0, 40))}</td>
                    <td class="py-3 ${amountClass} font-semibold">${amountPrefix}${formatCurrencyBDT(Math.abs(trans.amount))}</td>
                    <td class="py-3">${renderStatusBadge(trans.status)}</td>
                </tr>
            `;
        });
        
        statementBody.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading statement:', error);
        statementBody.innerHTML = `
            <tr><td colspan="5" class="text-center py-8 text-red-500">
                ❌ Failed to load transactions
            </td></tr>
        `;
    }
}

// ========== STATUS CONFIGURATIONS ==========
function getStatusConfig(status) {
    const map = {
        pending: { class: 'status-pending', icon: '⏳', text: 'Pending' },
        approved: { class: 'status-completed', icon: '✅', text: 'Approved' },
        rejected: { class: 'status-cancelled', icon: '❌', text: 'Rejected' },
        completed: { class: 'status-completed', icon: '✅', text: 'Completed' }
    };
    return map[status] || map.pending;
}

function renderStatusBadge(status) {
    const config = getStatusConfig(status);
    return `<span class="status-badge ${config.class} text-xs py-1 px-2">${config.icon} ${config.text}</span>`;
}

// ========== SUCCESS MODAL (design.md glass) ==========
function showSuccessModal(amountBDT, transactionId) {
    const modal = document.getElementById('successModal');
    const modalAmount = document.getElementById('modalAmount');
    const modalTxid = document.getElementById('modalTxid');
    
    if (modalAmount) modalAmount.innerHTML = `৳${amountBDT.toLocaleString()}`;
    if (modalTxid) modalTxid.innerText = transactionId;
    
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Auto-close after 5 seconds
        setTimeout(() => closeSuccessModal(), 5000);
    }
}

function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// ========== EMPTY & ERROR STATES ==========
function renderEmptyDepositsState() {
    return `
        <div class="empty-state py-8">
            <div class="empty-icon text-4xl mb-2">💰</div>
            <p class="text-gray-500 text-sm">No deposit requests yet</p>
            <p class="text-xs text-gray-400 mt-1">Your first deposit will appear here</p>
        </div>
    `;
}

function renderErrorDepositsState() {
    return `
        <div class="text-center py-8 text-red-500">
            <i class="fas fa-exclamation-circle text-3xl mb-2"></i>
            <p class="text-sm">Failed to load deposits</p>
        </div>
    `;
}

// ========== ANIMATIONS & LOADERS ==========
function showSkeletonLoader() {
    const container = document.getElementById('recentDeposits');
    if (!container) return;
    container.innerHTML = `
        <div class="space-y-3">
            <div class="skeleton skeleton-card h-16 rounded-xl"></div>
            <div class="skeleton skeleton-card h-16 rounded-xl"></div>
            <div class="skeleton skeleton-card h-16 rounded-xl"></div>
        </div>
    `;
}

function hideSkeletonLoader() {
    // Content replaces skeletons when loaded
}

function animateInElements() {
    document.querySelectorAll('.animate-on-load').forEach((el, idx) => {
        el.classList.add('animate-slide-up');
        el.style.animationDelay = `${0.05 * idx}s`;
    });
}

function animateValueChange(oldValue, newValue) {
    if (oldValue === newValue) return newValue;
    return `<span class="animate-pulse-slow">${newValue}</span>`;
}

// ========== HELPER FUNCTIONS ==========
function formatCurrencyBDT(amount) {
    if (!amount && amount !== 0) return '৳0';
    return '৳' + Math.round(amount).toLocaleString('en-BD');
}

function formatTransactionDate(date) {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-BD', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
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
    // Payment method cards
    document.querySelectorAll('.payment-method-card').forEach(card => {
        card.addEventListener('click', () => {
            selectPaymentMethod(card.dataset.method);
        });
    });
    
    // Preset amount buttons
    document.querySelectorAll('.amount-preset').forEach(btn => {
        btn.addEventListener('click', (e) => {
            setPresetAmount(parseFloat(btn.dataset.amount));
        });
    });
    
    // Form submission
    const form = document.getElementById('addFundsForm');
    if (form) {
        form.addEventListener('submit', submitDepositRequest);
    }
    
    // Refresh statement button
    const refreshBtn = document.getElementById('refreshStatementBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadTransactionStatement();
            showGlassToast('Statement refreshed', 'info');
        });
    }
    
    // Close modal on outside click
    const successModal = document.getElementById('successModal');
    if (successModal) {
        successModal.addEventListener('click', (e) => {
            if (e.target === successModal) closeSuccessModal();
        });
    }
}

// ========== EXPORT GLOBALS ==========
window.initAddFunds = initAddFunds;
window.selectPaymentMethod = selectPaymentMethod;
window.setPresetAmount = setPresetAmount;
window.closeSuccessModal = closeSuccessModal;

// ========== AUTO-INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('addFundsForm')) {
        if (window.auth && window.db) {
            await initAddFunds();
        } else {
            const checkFirebase = setInterval(async () => {
                if (window.auth && window.db) {
                    clearInterval(checkFirebase);
                    await initAddFunds();
                }
            }, 100);
        }
    }
});

console.log('✅ Add Funds v3.0 (design.md compliant) loaded');