// ============================================
// BoostBangla Giveaway Module v3.0
// Fully redesigned following design.md
// Live countdown timer with flip animation
// Entry method cards with completion badges
// Progress bar to next milestone
// Leaderboard with user avatars
// Social share with OG tags
// ============================================

// ========== GLOBAL STATE ==========
let giveawayState = {
    currentUser: null,
    entries: {
        orders: 0,
        referrals: 0,
        social: 0,
        telegram: 0,
        total: 0
    },
    leaderboard: [],
    giveawayEndDate: null,
    prizes: [
        { rank: 1, prize: '৳50,000', icon: '🥇', color: '#FFD700', description: 'Grand Prize Winner' },
        { rank: 2, prize: '৳25,000', icon: '🥈', color: '#C0C0C0', description: 'First Runner Up' },
        { rank: 3, prize: '৳10,000', icon: '🥉', color: '#CD7F32', description: 'Second Runner Up' },
        { rank: 4, prize: '৳5,000', icon: '🎁', color: '#10b981', description: '4th Place' },
        { rank: 5, prize: '৳2,500', icon: '🎁', color: '#10b981', description: '5th Place' }
    ],
    isLoading: true
};

// ========== INITIALIZE GIVEAWAY PAGE ==========
async function initGiveaway() {
    showSkeletonLoader();
    const isAuth = await checkAuthAndLoadUser();
    if (!isAuth) return;
    
    // Set end date (end of current month)
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    giveawayState.giveawayEndDate = endOfMonth;
    
    await Promise.all([
        loadUserEntries(),
        loadLeaderboard(),
        loadCompletedMethods()
    ]);
    
    startCountdownTimer();
    attachEventListeners();
    giveawayState.isLoading = false;
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
    
    giveawayState.currentUser = user;
    
    const userDoc = await db.collection('users').doc(user.uid).get();
    const username = userDoc.data()?.username || user.email?.split('@')[0] || 'User';
    
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.innerText = username;
    
    return true;
}

// ========== LOAD USER ENTRIES ==========
async function loadUserEntries() {
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;
        
        // Get orders (1 entry per 100 BDT spent)
        const ordersSnapshot = await db.collection('orders')
            .where('userId', '==', user.uid)
            .where('status', '==', 'completed')
            .get();
        
        let totalSpent = 0;
        ordersSnapshot.forEach(doc => {
            totalSpent += doc.data().priceBDT || 0;
        });
        giveawayState.entries.orders = Math.floor(totalSpent / 100);
        
        // Get referrals (5 entries per referral)
        const referralsSnapshot = await db.collection('users')
            .where('referredBy', '==', user.uid)
            .get();
        giveawayState.entries.referrals = referralsSnapshot.size * 5;
        
        // Get social shares from localStorage
        const socialShares = localStorage.getItem(`giveaway_social_${user.uid}`);
        giveawayState.entries.social = socialShares ? parseInt(socialShares) : 0;
        
        // Get telegram join from localStorage
        const telegramJoined = localStorage.getItem(`giveaway_telegram_${user.uid}`);
        giveawayState.entries.telegram = telegramJoined ? parseInt(telegramJoined) : 0;
        
        // Calculate total
        giveawayState.entries.total = 
            giveawayState.entries.orders + 
            giveawayState.entries.referrals + 
            giveawayState.entries.social + 
            giveawayState.entries.telegram;
        
        // Update UI
        updateEntryDisplays();
        
    } catch (error) {
        console.error('Error loading entries:', error);
        showGlassToast('Failed to load entries', 'error');
    }
}

function updateEntryDisplays() {
    // Animate each entry counter
    animateEntryValue('orderEntries', giveawayState.entries.orders);
    animateEntryValue('referralEntries', giveawayState.entries.referrals);
    animateEntryValue('socialEntries', giveawayState.entries.social);
    animateEntryValue('telegramEntries', giveawayState.entries.telegram);
    animateEntryValue('totalEntries', giveawayState.entries.total);
    
    // Update progress bar to next milestone
    updateProgressBar();
}

function animateEntryValue(elementId, newValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const oldValue = parseInt(element.innerText);
    if (oldValue === newValue) return;
    
    element.classList.add('animate-pulse-slow');
    element.innerText = newValue.toLocaleString();
    setTimeout(() => element.classList.remove('animate-pulse-slow'), 300);
}

function updateProgressBar() {
    const milestones = [100, 500, 1000, 5000];
    let currentMilestone = 100;
    let nextMilestone = 100;
    
    for (let i = 0; i < milestones.length; i++) {
        if (giveawayState.entries.total >= milestones[i]) {
            currentMilestone = milestones[i];
            nextMilestone = milestones[i + 1] || milestones[i];
        } else {
            nextMilestone = milestones[i];
            break;
        }
    }
    
    const progress = Math.min((giveawayState.entries.total / nextMilestone) * 100, 100);
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const nextMilestoneText = document.getElementById('nextMilestone');
    
    if (progressFill) progressFill.style.width = `${progress}%`;
    if (progressText) progressText.innerText = `${giveawayState.entries.total} / ${nextMilestone}`;
    if (nextMilestoneText) {
        if (giveawayState.entries.total >= 5000) {
            nextMilestoneText.innerText = 'You\'ve reached the maximum tier! 🎉';
        } else {
            nextMilestoneText.innerText = `${nextMilestone - giveawayState.entries.total} more entries to next prize tier`;
        }
    }
}

// ========== LOAD COMPLETED METHODS ==========
async function loadCompletedMethods() {
    const user = window.getCurrentUser();
    if (!user?.uid) return;
    
    // Check telegram
    const telegramClaimed = localStorage.getItem(`giveaway_telegram_${user.uid}`);
    if (telegramClaimed) {
        const telegramCard = document.querySelector('[data-method="telegram"]');
        if (telegramCard) {
            telegramCard.classList.add('completed');
            const checkmark = telegramCard.querySelector('.completion-check');
            if (checkmark) checkmark.classList.remove('hidden');
        }
    }
    
    // Check social
    const socialClaimed = localStorage.getItem(`giveaway_social_${user.uid}`);
    if (socialClaimed && parseInt(socialClaimed) > 0) {
        const socialCard = document.querySelector('[data-method="social"]');
        if (socialCard) {
            socialCard.classList.add('completed');
            const checkmark = socialCard.querySelector('.completion-check');
            if (checkmark) checkmark.classList.remove('hidden');
        }
    }
}

// ========== ENTRY METHOD HANDLERS ==========
async function handleOrderMethod() {
    window.location.href = '/dashboard/services.html';
}

async function handleReferralMethod() {
    window.location.href = '/dashboard/affiliates.html';
}

async function handleSocialShare() {
    const user = window.getCurrentUser();
    if (!user?.uid) return;
    
    const shareUrl = `${window.location.origin}/?ref=${user.uid}`;
    const shareText = 'Join BoostBangla Giveaway! Win big prizes by participating!';
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'BoostBangla Giveaway',
                text: shareText,
                url: shareUrl
            });
            await addSocialEntries();
        } catch (e) {
            console.log('Share cancelled');
        }
    } else {
        // Fallback: copy to clipboard
        await copyToClipboard(shareUrl);
        await addSocialEntries();
        showGlassToast('Link copied! +3 entries added', 'success');
    }
}

async function addSocialEntries() {
    const user = window.getCurrentUser();
    if (!user?.uid) return;
    
    const current = localStorage.getItem(`giveaway_social_${user.uid}`);
    const newTotal = (current ? parseInt(current) : 0) + 3;
    localStorage.setItem(`giveaway_social_${user.uid}`, newTotal);
    
    await loadUserEntries();
    
    const socialCard = document.querySelector('[data-method="social"]');
    if (socialCard) {
        socialCard.classList.add('completed');
        const checkmark = socialCard.querySelector('.completion-check');
        if (checkmark) checkmark.classList.remove('hidden');
    }
    
    showGlassToast(`+3 entries added! Total social entries: ${newTotal}`, 'success');
}

async function handleTelegramJoin() {
    const user = window.getCurrentUser();
    if (!user?.uid) return;
    
    // Check if already claimed
    if (localStorage.getItem(`giveaway_telegram_${user.uid}`)) {
        showGlassToast('You already claimed your Telegram bonus!', 'info');
        return;
    }
    
    // Open Telegram channel
    window.open('https://t.me/boostbangla', '_blank');
    
    // Simulate join verification (in production, this would be a callback)
    setTimeout(async () => {
        localStorage.setItem(`giveaway_telegram_${user.uid}`, '10');
        await loadUserEntries();
        
        const telegramCard = document.querySelector('[data-method="telegram"]');
        if (telegramCard) {
            telegramCard.classList.add('completed');
            const checkmark = telegramCard.querySelector('.completion-check');
            if (checkmark) checkmark.classList.remove('hidden');
        }
        
        showGlassToast('+10 entries added! Welcome to our Telegram channel!', 'success');
    }, 2000);
}

// ========== LOAD LEADERBOARD ==========
async function loadLeaderboard() {
    const container = document.getElementById('leaderboardList');
    if (!container) return;
    
    try {
        // Get users sorted by total entries (based on orders + referrals)
        const usersSnapshot = await db.collection('users')
            .orderBy('totalOrders', 'desc')
            .limit(10)
            .get();
        
        giveawayState.leaderboard = [];
        
        for (const doc of usersSnapshot.docs) {
            const userData = doc.data();
            const userId = doc.id;
            
            // Calculate entries for this user
            let entries = Math.floor((userData.totalOrders || 0) / 100);
            
            // Add referral entries
            const referralsSnapshot = await db.collection('users')
                .where('referredBy', '==', userId)
                .get();
            entries += referralsSnapshot.size * 5;
            
            giveawayState.leaderboard.push({
                userId: userId,
                username: userData.username || userData.email?.split('@')[0] || 'User',
                entries: entries,
                avatar: userData.avatar || null
            });
        }
        
        // Sort by entries (descending)
        giveawayState.leaderboard.sort((a, b) => b.entries - a.entries);
        
        renderLeaderboard();
        
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        container.innerHTML = '<div class="text-center py-8 text-red-500">Failed to load leaderboard</div>';
    }
}

function renderLeaderboard() {
    const container = document.getElementById('leaderboardList');
    if (!container) return;
    
    if (giveawayState.leaderboard.length === 0) {
        container.innerHTML = `
            <div class="empty-state py-8">
                <div class="empty-icon text-4xl mb-2">🏆</div>
                <p class="text-gray-500">No participants yet. Be the first!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = giveawayState.leaderboard.map((user, idx) => {
        const delay = 0.05 * idx;
        const rank = idx + 1;
        let rankIcon = '';
        let rankClass = '';
        
        if (rank === 1) {
            rankIcon = '🥇';
            rankClass = 'bg-yellow-500';
        } else if (rank === 2) {
            rankIcon = '🥈';
            rankClass = 'bg-gray-400';
        } else if (rank === 3) {
            rankIcon = '🥉';
            rankClass = 'bg-orange-600';
        } else {
            rankIcon = `${rank}`;
            rankClass = 'bg-gray-300 dark:bg-gray-600';
        }
        
        return `
            <div class="leaderboard-item flex items-center justify-between p-3 glass-card rounded-xl animate-slide-up" style="animation-delay: ${delay}s">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full ${rankClass} flex items-center justify-center text-white font-bold text-sm">
                        ${rankIcon}
                    </div>
                    <div>
                        <div class="font-semibold">${escapeHtml(user.username)}</div>
                        <div class="text-xs text-gray-400">${user.entries.toLocaleString()} entries</div>
                    </div>
                </div>
                <div class="text-primary font-bold">${user.entries.toLocaleString()}</div>
            </div>
        `;
    }).join('');
}

// ========== COUNTDOWN TIMER ==========
function startCountdownTimer() {
    const timerElements = {
        days: document.getElementById('days'),
        hours: document.getElementById('hours'),
        minutes: document.getElementById('minutes'),
        seconds: document.getElementById('seconds')
    };
    
    function updateCountdown() {
        const now = new Date();
        const diff = giveawayState.giveawayEndDate - now;
        
        if (diff <= 0) {
            // Giveaway ended
            if (timerElements.days) timerElements.days.innerText = '00';
            if (timerElements.hours) timerElements.hours.innerText = '00';
            if (timerElements.minutes) timerElements.minutes.innerText = '00';
            if (timerElements.seconds) timerElements.seconds.innerText = '00';
            
            document.getElementById('giveawayStatus')?.classList.add('hidden');
            document.getElementById('giveawayEnded')?.classList.remove('hidden');
            return;
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (86400000)) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        
        if (timerElements.days) timerElements.days.innerText = days.toString().padStart(2, '0');
        if (timerElements.hours) timerElements.hours.innerText = hours.toString().padStart(2, '0');
        if (timerElements.minutes) timerElements.minutes.innerText = minutes.toString().padStart(2, '0');
        if (timerElements.seconds) timerElements.seconds.innerText = seconds.toString().padStart(2, '0');
        
        // Add flip animation to seconds
        if (timerElements.seconds) {
            timerElements.seconds.classList.add('animate-pulse-slow');
            setTimeout(() => timerElements.seconds.classList.remove('animate-pulse-slow'), 200);
        }
    }
    
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// ========== RENDER PRIZES ==========
function renderPrizes() {
    const container = document.getElementById('prizesList');
    if (!container) return;
    
    container.innerHTML = giveawayState.prizes.map((prize, idx) => {
        const delay = 0.05 * idx;
        return `
            <div class="prize-card glass-card p-4 rounded-xl text-center animate-slide-up" style="animation-delay: ${delay}s">
                <div class="text-4xl mb-2">${prize.icon}</div>
                <div class="text-2xl font-black text-primary">${prize.prize}</div>
                <div class="text-sm text-gray-500 mt-1">${prize.description}</div>
                <div class="text-xs text-gray-400 mt-2">Rank #${prize.rank}</div>
            </div>
        `;
    }).join('');
}

// ========== RULES MODAL ==========
function openRulesModal() {
    const modal = document.getElementById('rulesModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeRulesModal() {
    const modal = document.getElementById('rulesModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// ========== ANIMATIONS & LOADERS ==========
function showSkeletonLoader() {
    const leaderboardContainer = document.getElementById('leaderboardList');
    if (leaderboardContainer) {
        leaderboardContainer.innerHTML = `
            <div class="space-y-3">
                <div class="skeleton skeleton-card h-16 rounded-xl"></div>
                <div class="skeleton skeleton-card h-16 rounded-xl"></div>
                <div class="skeleton skeleton-card h-16 rounded-xl"></div>
            </div>
        `;
    }
}

function hideSkeletonLoader() {
    // Content replaces skeletons when loaded
}

function animateInElements() {
    document.querySelectorAll('.method-card, .prize-card, .stat-card').forEach((el, idx) => {
        el.classList.add('animate-slide-up');
        el.style.animationDelay = `${0.03 * idx}s`;
    });
}

// ========== HELPER FUNCTIONS ==========
function formatCurrencyBDT(amount) {
    if (!amount && amount !== 0) return '৳0';
    return '৳' + amount.toLocaleString('en-BD');
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
    } catch (error) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
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
    // Method cards
    const orderMethod = document.querySelector('[data-method="order"]');
    if (orderMethod) orderMethod.addEventListener('click', handleOrderMethod);
    
    const referralMethod = document.querySelector('[data-method="referral"]');
    if (referralMethod) referralMethod.addEventListener('click', handleReferralMethod);
    
    const socialMethod = document.querySelector('[data-method="social"]');
    if (socialMethod) socialMethod.addEventListener('click', handleSocialShare);
    
    const telegramMethod = document.querySelector('[data-method="telegram"]');
    if (telegramMethod) telegramMethod.addEventListener('click', handleTelegramJoin);
    
    // Rules button
    const rulesBtn = document.getElementById('rulesBtn');
    if (rulesBtn) rulesBtn.addEventListener('click', openRulesModal);
    
    // Close modal
    const rulesModal = document.getElementById('rulesModal');
    if (rulesModal) {
        rulesModal.addEventListener('click', (e) => {
            if (e.target === rulesModal) closeRulesModal();
        });
    }
}

// ========== EXPORT GLOBALS ==========
window.initGiveaway = initGiveaway;
window.openRulesModal = openRulesModal;
window.closeRulesModal = closeRulesModal;
window.handleSocialShare = handleSocialShare;
window.handleTelegramJoin = handleTelegramJoin;

// ========== AUTO-INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('totalEntries')) {
        if (window.auth && window.db) {
            await initGiveaway();
            renderPrizes();
        } else {
            const checkFirebase = setInterval(async () => {
                if (window.auth && window.db) {
                    clearInterval(checkFirebase);
                    await initGiveaway();
                    renderPrizes();
                }
            }, 100);
        }
    }
});

console.log('✅ Giveaway v3.0 (design.md compliant) loaded');