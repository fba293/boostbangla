// ============================================
// BoostBangla Affiliates Module v3.0
// Fully redesigned following design.md
// Tier badges with progress bars
// Animated commission calculator
// Glass referral cards, real-time earnings
// Withdrawal request with preview
// ============================================

// ========== GLOBAL STATE ==========
let affiliatesState = {
    currentUser: null,
    affiliateData: null,
    referrals: [],
    withdrawalRequests: [],
    exchangeRate: 120,
    selectedTier: 'bronze',
    isLoading: true
};

// Tier configuration (design.md: BIG BOLD numbers)
const TIERS = {
    bronze: { name: '🥉 Bronze', minReferrals: 0, commission: 15, color: '#CD7F32', nextTier: 'Silver', nextMin: 10, bgLight: '#CD7F3210' },
    silver: { name: '🥈 Silver', minReferrals: 10, commission: 20, color: '#C0C0C0', nextTier: 'Gold', nextMin: 50, bgLight: '#C0C0C010' },
    gold: { name: '🥇 Gold', minReferrals: 50, commission: 25, color: '#FFD700', nextTier: 'Platinum', nextMin: 200, bgLight: '#FFD70010' },
    platinum: { name: '💎 Platinum', minReferrals: 200, commission: 30, color: '#E5E4E2', nextTier: 'Max', nextMin: null, bgLight: '#E5E4E210' }
};

// ========== INITIALIZE AFFILIATES ==========
async function initAffiliates() {
    showSkeletonLoader();
    const isAuth = await checkAuthAndLoadUser();
    if (!isAuth) return;
    
    await Promise.all([
        loadExchangeRate(),
        loadAffiliateData(),
        loadReferralsList(),
        loadWithdrawalHistory()
    ]);
    
    attachEventListeners();
    setupRealtimeEarnings();
    affiliatesState.isLoading = false;
    hideSkeletonLoader();
    animateDashboardCards();
}

// ========== CHECK AUTHENTICATION ==========
async function checkAuthAndLoadUser() {
    const user = window.getCurrentUser();
    if (!user?.uid) {
        window.location.href = '/login.html';
        return false;
    }
    
    affiliatesState.currentUser = user;
    
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
            affiliatesState.exchangeRate = data.data.mid;
        } else {
            throw new Error('Invalid response');
        }
    } catch (error) {
        affiliatesState.exchangeRate = 120;
    }
}

// ========== LOAD AFFILIATE DATA FROM FIRESTORE ==========
async function loadAffiliateData() {
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;
        
        const affiliateRef = db.collection('affiliates').doc(user.uid);
        const affiliateSnap = await affiliateRef.get();
        
        if (affiliateSnap.exists) {
            affiliatesState.affiliateData = affiliateSnap.data();
        } else {
            // Create new affiliate record
            const referralCode = generateReferralCode(user.uid);
            affiliatesState.affiliateData = {
                userId: user.uid,
                userEmail: user.email,
                totalReferrals: 0,
                totalEarnings: 0,
                pendingEarnings: 0,
                withdrawn: 0,
                referrals: [],
                referralCode: referralCode,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            await affiliateRef.set(affiliatesState.affiliateData);
            
            // Update user document with referral code
            await db.collection('users').doc(user.uid).update({
                referralCode: referralCode,
                referredBy: null
            });
        }
        
        // Determine current tier
        const referrals = affiliatesState.affiliateData.totalReferrals || 0;
        if (referrals >= 200) affiliatesState.selectedTier = 'platinum';
        else if (referrals >= 50) affiliatesState.selectedTier = 'gold';
        else if (referrals >= 10) affiliatesState.selectedTier = 'silver';
        else affiliatesState.selectedTier = 'bronze';
        
        // Update UI
        updateStatsDisplays();
        highlightActiveTier();
        updateTierProgress();
        displayReferralLink();
        
    } catch (error) {
        console.error('Error loading affiliate data:', error);
        showGlassToast('Failed to load affiliate data', 'error');
    }
}

// ========== GENERATE REFERRAL CODE ==========
function generateReferralCode(uid) {
    return uid.substring(0, 8) + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ========== UPDATE STATS DISPLAYS (design.md BIG NUMBERS) ==========
function updateStatsDisplays() {
    const data = affiliatesState.affiliateData;
    if (!data) return;
    
    animateStatValue('totalReferrals', data.totalReferrals || 0);
    animateStatValue('totalEarnings', formatCurrencyBDT(data.totalEarnings || 0));
    animateStatValue('pendingEarnings', formatCurrencyBDT(data.pendingEarnings || 0));
    animateStatValue('withdrawn', formatCurrencyBDT(data.withdrawn || 0));
}

function animateStatValue(elementId, newValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.classList.add('animate-pulse-slow');
    element.innerHTML = newValue;
    setTimeout(() => element.classList.remove('animate-pulse-slow'), 300);
}

// ========== HIGHLIGHT ACTIVE TIER CARD (design.md glass) ==========
function highlightActiveTier() {
    document.querySelectorAll('.tier-card').forEach(card => {
        card.classList.remove('tier-active', 'border-primary', 'shadow-xl', 'scale-105');
        card.classList.add('border-gray-200', 'dark:border-gray-700');
        
        if (card.dataset.tier === affiliatesState.selectedTier) {
            card.classList.add('tier-active', 'border-primary', 'shadow-xl', 'scale-105');
            card.classList.remove('border-gray-200', 'dark:border-gray-700');
        }
    });
}

// ========== UPDATE TIER PROGRESS BAR ==========
function updateTierProgress() {
    const currentTier = TIERS[affiliatesState.selectedTier];
    const nextTier = TIERS[getNextTierKey(affiliatesState.selectedTier)];
    
    if (!nextTier || !nextTier.nextMin) {
        // Max tier reached
        const progressContainer = document.getElementById('tierProgressContainer');
        if (progressContainer) progressContainer.classList.add('hidden');
        return;
    }
    
    const currentReferrals = affiliatesState.affiliateData.totalReferrals || 0;
    const progress = Math.min((currentReferrals / nextTier.nextMin) * 100, 100);
    
    const progressFill = document.getElementById('tierProgressFill');
    const progressText = document.getElementById('tierProgressText');
    const nextTierName = document.getElementById('nextTierName');
    
    if (progressFill) progressFill.style.width = `${progress}%`;
    if (progressText) progressText.innerText = `${currentReferrals} / ${nextTier.nextMin} referrals`;
    if (nextTierName) nextTierName.innerText = nextTier.name;
}

function getNextTierKey(currentTier) {
    const tiers = ['bronze', 'silver', 'gold', 'platinum'];
    const currentIndex = tiers.indexOf(currentTier);
    if (currentIndex < tiers.length - 1) {
        return tiers[currentIndex + 1];
    }
    return null;
}

// ========== DISPLAY REFERRAL LINK ==========
function displayReferralLink() {
    const baseUrl = window.location.origin;
    const referralLink = `${baseUrl}/signup.html?ref=${affiliatesState.affiliateData?.referralCode || ''}`;
    
    const linkElement = document.getElementById('referralLink');
    if (linkElement) {
        linkElement.innerText = referralLink;
    }
}

// ========== COPY REFERRAL LINK ==========
async function copyReferralLink() {
    const baseUrl = window.location.origin;
    const referralLink = `${baseUrl}/signup.html?ref=${affiliatesState.affiliateData?.referralCode || ''}`;
    
    try {
        await navigator.clipboard.writeText(referralLink);
        showGlassToast('Referral link copied to clipboard!', 'success');
        
        // Animate copy button
        const copyBtn = document.getElementById('copyLinkBtn');
        if (copyBtn) {
            copyBtn.classList.add('scale-95');
            setTimeout(() => copyBtn.classList.remove('scale-95'), 200);
        }
    } catch (error) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = referralLink;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showGlassToast('Referral link copied!', 'success');
    }
}

// ========== LOAD REFERRALS LIST ==========
async function loadReferralsList() {
    const container = document.getElementById('referralsList');
    if (!container) return;
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;
        
        const referralsSnapshot = await db.collection('users')
            .where('referredBy', '==', user.uid)
            .get();
        
        if (referralsSnapshot.empty) {
            container.innerHTML = renderEmptyReferralsState();
            return;
        }
        
        let totalCommissionEarned = 0;
        let html = `
            <div class="overflow-x-auto">
                <table class="data-table w-full">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Joined</th>
                            <th>Orders</th>
                            <th>Total Spent</th>
                            <th>Commission</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        for (const doc of referralsSnapshot.docs) {
            const userData = doc.data();
            const commissionRate = getCurrentCommissionRate();
            
            // Get orders for this referred user
            const ordersSnapshot = await db.collection('orders')
                .where('userId', '==', doc.id)
                .get();
            
            let totalSpent = 0;
            ordersSnapshot.forEach(order => {
                totalSpent += order.data().priceBDT || 0;
            });
            
            const commission = totalSpent * (commissionRate / 100);
            totalCommissionEarned += commission;
            
            const joinedDate = userData.createdAt?.toDate ? 
                userData.createdAt.toDate().toLocaleDateString('en-BD', { month: 'short', day: 'numeric', year: 'numeric' }) : 
                'N/A';
            
            html += `
                <tr class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <td class="py-3 font-medium">
                        <div class="flex items-center gap-2">
                            <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <i class="fas fa-user text-primary text-xs"></i>
                            </div>
                            ${escapeHtml(userData.username || userData.email?.split('@')[0] || 'User')}
                        </div>
                    </td>
                    <td class="py-3 text-sm text-gray-500">${joinedDate}</td>
                    <td class="py-3 text-center">${ordersSnapshot.size}</td>
                    <td class="py-3 text-primary font-medium">${formatCurrencyBDT(totalSpent)}</td>
                    <td class="py-3 text-green-600 dark:text-green-400 font-semibold">${formatCurrencyBDT(commission)}</td>
                </tr>
            `;
        }
        
        html += `
                    </tbody>
                </table>
            </div>
            <div class="mt-4 p-4 glass-card rounded-xl flex justify-between items-center">
                <span class="font-semibold">💰 Total Commission from Referrals:</span>
                <span class="text-2xl font-black text-primary">${formatCurrencyBDT(totalCommissionEarned)}</span>
            </div>
        `;
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading referrals:', error);
        container.innerHTML = renderErrorReferralsState();
    }
}

// ========== GET CURRENT COMMISSION RATE ==========
function getCurrentCommissionRate() {
    return TIERS[affiliatesState.selectedTier]?.commission || 15;
}

// ========== LOAD WITHDRAWAL HISTORY ==========
async function loadWithdrawalHistory() {
    const container = document.getElementById('withdrawalHistory');
    if (!container) return;
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;
        
        const withdrawalsSnapshot = await db.collection('withdrawals')
            .where('userId', '==', user.uid)
            .orderBy('requestedAt', 'desc')
            .limit(5)
            .get();
        
        if (withdrawalsSnapshot.empty) {
            container.innerHTML = `
                <div class="empty-state py-6">
                    <div class="empty-icon text-3xl mb-2">🏧</div>
                    <p class="text-gray-500 text-sm">No withdrawal requests yet</p>
                </div>
            `;
            return;
        }
        
        let html = '<div class="space-y-2">';
        withdrawalsSnapshot.forEach(doc => {
            const withdrawal = doc.data();
            const statusConfig = getWithdrawalStatusConfig(withdrawal.status);
            const date = withdrawal.requestedAt?.toDate ? 
                withdrawal.requestedAt.toDate().toLocaleDateString('en-BD') : 
                'N/A';
            
            html += `
                <div class="flex justify-between items-center p-3 glass-card rounded-xl">
                    <div>
                        <div class="font-semibold text-primary">${formatCurrencyBDT(withdrawal.amount || 0)}</div>
                        <div class="text-xs text-gray-400">${date}</div>
                    </div>
                    <div class="text-right">
                        <span class="status-badge ${statusConfig.class}">${statusConfig.icon} ${statusConfig.text}</span>
                        <div class="text-xs text-gray-400 mt-1">${withdrawal.method?.toUpperCase() || 'N/A'}</div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading withdrawals:', error);
        container.innerHTML = '<div class="text-center py-6 text-red-500 text-sm">Failed to load history</div>';
    }
}

function getWithdrawalStatusConfig(status) {
    const map = {
        pending: { class: 'status-pending', icon: '⏳', text: 'Pending' },
        completed: { class: 'status-completed', icon: '✅', text: 'Completed' },
        rejected: { class: 'status-cancelled', icon: '❌', text: 'Rejected' }
    };
    return map[status] || map.pending;
}

// ========== REQUEST WITHDRAWAL ==========
function openWithdrawalModal() {
    const pendingEarnings = affiliatesState.affiliateData?.pendingEarnings || 0;
    const maxWithdraw = Math.min(pendingEarnings, 100000); // Max 100k BDT per request
    
    const amountInput = document.getElementById('withdrawAmount');
    if (amountInput) {
        amountInput.max = maxWithdraw;
        amountInput.placeholder = `Max: ${formatCurrencyBDT(maxWithdraw)}`;
    }
    
    const modal = document.getElementById('withdrawModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Update preview message
        updateWithdrawPreview();
    }
}

function updateWithdrawPreview() {
    const amount = parseFloat(document.getElementById('withdrawAmount')?.value) || 0;
    const method = document.getElementById('paymentMethod')?.value;
    const account = document.getElementById('paymentAccount')?.value;
    
    const previewDiv = document.getElementById('withdrawPreview');
    if (previewDiv) {
        if (amount > 0 && method && account) {
            previewDiv.innerHTML = `
                <div class="glass-card p-3 rounded-xl mt-3 animate-fade-in">
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-500">You will receive:</span>
                        <span class="text-xl font-black text-primary">${formatCurrencyBDT(amount)}</span>
                    </div>
                    <div class="flex justify-between items-center mt-1">
                        <span class="text-xs text-gray-500">Via:</span>
                        <span class="text-sm font-medium">${method.toUpperCase()} → ${escapeHtml(account.substring(0, 20))}${account.length > 20 ? '...' : ''}</span>
                    </div>
                </div>
            `;
            previewDiv.classList.remove('hidden');
        } else {
            previewDiv.classList.add('hidden');
        }
    }
}

async function confirmWithdrawal() {
    const amount = parseFloat(document.getElementById('withdrawAmount')?.value);
    const method = document.getElementById('paymentMethod')?.value;
    const account = document.getElementById('paymentAccount')?.value;
    
    // Validation
    if (!amount || amount < 500) {
        showGlassToast('Minimum withdrawal amount is ৳500', 'error');
        return;
    }
    
    const pendingEarnings = affiliatesState.affiliateData?.pendingEarnings || 0;
    if (amount > pendingEarnings) {
        showGlassToast(`Insufficient balance. You have ${formatCurrencyBDT(pendingEarnings)} pending`, 'error');
        return;
    }
    
    if (!account) {
        showGlassToast('Please enter your account number', 'error');
        return;
    }
    
    const confirmBtn = document.getElementById('confirmWithdrawBtn');
    const originalText = confirmBtn.innerHTML;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="spinner"></span> Processing...';
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) throw new Error('Not authenticated');
        
        // Create withdrawal request
        await db.collection('withdrawals').add({
            userId: user.uid,
            userEmail: user.email,
            amount: amount,
            method: method,
            account: account,
            status: 'pending',
            requestedAt: new Date()
        });
        
        // Update affiliate pending earnings
        await db.collection('affiliates').doc(user.uid).update({
            pendingEarnings: firebase.firestore.FieldValue.increment(-amount),
            withdrawn: firebase.firestore.FieldValue.increment(amount),
            updatedAt: new Date()
        });
        
        showGlassToast('Withdrawal request submitted successfully! Processed within 24-48 hours.', 'success');
        
        // Reset form and close modal
        document.getElementById('withdrawAmount').value = '';
        document.getElementById('paymentAccount').value = '';
        closeWithdrawModal();
        
        // Refresh data
        await Promise.all([
            loadAffiliateData(),
            loadWithdrawalHistory()
        ]);
        
    } catch (error) {
        console.error('Withdrawal error:', error);
        showGlassToast('Failed to submit withdrawal request', 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
    }
}

function closeWithdrawModal() {
    const modal = document.getElementById('withdrawModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// ========== REAL-TIME EARNINGS PREVIEW ==========
function setupRealtimeEarnings() {
    const amountInput = document.getElementById('withdrawAmount');
    if (amountInput) {
        amountInput.addEventListener('input', updateWithdrawPreview);
    }
    
    const methodSelect = document.getElementById('paymentMethod');
    if (methodSelect) {
        methodSelect.addEventListener('change', updateWithdrawPreview);
    }
    
    const accountInput = document.getElementById('paymentAccount');
    if (accountInput) {
        accountInput.addEventListener('input', updateWithdrawPreview);
    }
}

// ========== SHARE REFERRAL LINK ==========
function shareReferralLink() {
    const referralLink = `${window.location.origin}/signup.html?ref=${affiliatesState.affiliateData?.referralCode || ''}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Join BoostBangla',
            text: 'Earn 20% lifetime commission! Use my referral link:',
            url: referralLink
        }).catch(() => copyReferralLink());
    } else {
        copyReferralLink();
    }
}

// ========== REFRESH ALL DATA ==========
async function refreshAffiliateData() {
    showGlassToast('Refreshing data...', 'info');
    await Promise.all([
        loadAffiliateData(),
        loadReferralsList(),
        loadWithdrawalHistory()
    ]);
    showGlassToast('Data refreshed!', 'success');
}

// ========== EMPTY & ERROR STATES ==========
function renderEmptyReferralsState() {
    return `
        <div class="empty-state py-12">
            <div class="empty-icon text-6xl mb-4">👥</div>
            <h3 class="empty-title text-xl font-bold mb-2">No referrals yet</h3>
            <p class="empty-description text-gray-500 mb-4">Share your referral link to start earning commission</p>
            <button onclick="copyReferralLink()" class="btn-primary">
                <i class="fas fa-share-alt mr-2"></i> Copy Referral Link
            </button>
        </div>
    `;
}

function renderErrorReferralsState() {
    return `
        <div class="empty-state py-12">
            <div class="empty-icon text-6xl mb-4">⚠️</div>
            <h3 class="empty-title text-xl font-bold mb-2">Failed to load referrals</h3>
            <button onclick="refreshAffiliateData()" class="btn-primary">Retry</button>
        </div>
    `;
}

// ========== ANIMATIONS & LOADERS ==========
function showSkeletonLoader() {
    const container = document.getElementById('referralsList');
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

function animateDashboardCards() {
    document.querySelectorAll('.stat-card, .tier-card').forEach((el, idx) => {
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
    // Copy link button
    const copyBtn = document.getElementById('copyLinkBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', copyReferralLink);
    }
    
    // Share button
    const shareBtn = document.getElementById('shareLinkBtn');
    if (shareBtn) {
        shareBtn.addEventListener('click', shareReferralLink);
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshAffiliateBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshAffiliateData);
    }
    
    // Withdrawal button
    const withdrawBtn = document.getElementById('requestWithdrawBtn');
    if (withdrawBtn) {
        withdrawBtn.addEventListener('click', openWithdrawalModal);
    }
    
    // Confirm withdrawal button
    const confirmBtn = document.getElementById('confirmWithdrawBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmWithdrawal);
    }
    
    // Close modal on outside click
    const modal = document.getElementById('withdrawModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeWithdrawModal();
        });
    }
    
    // Tier card clicks (info)
    document.querySelectorAll('.tier-card').forEach(card => {
        card.addEventListener('click', () => {
            const tier = card.dataset.tier;
            const tierConfig = TIERS[tier];
            if (tierConfig) {
                showGlassToast(`${tierConfig.name}: ${tierConfig.commission}% commission on all referrals!`, 'info');
            }
        });
    });
}

// ========== EXPORT GLOBALS ==========
window.initAffiliates = initAffiliates;
window.copyReferralLink = copyReferralLink;
window.shareReferralLink = shareReferralLink;
window.refreshAffiliateData = refreshAffiliateData;
window.closeWithdrawModal = closeWithdrawModal;

// ========== AUTO-INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('totalReferrals')) {
        if (window.auth && window.db) {
            await initAffiliates();
        } else {
            const checkFirebase = setInterval(async () => {
                if (window.auth && window.db) {
                    clearInterval(checkFirebase);
                    await initAffiliates();
                }
            }, 100);
        }
    }
});

console.log('✅ Affiliates v3.0 (design.md compliant) loaded');