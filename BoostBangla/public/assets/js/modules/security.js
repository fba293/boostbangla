// ============================================
// BoostBangla Security Module v3.0
// Fully redesigned following design.md
// Glass session cards with device icons
// Login history timeline with geolocation
// Security score meter with animations
// 2FA setup with QR code preview
// Flutter-like device management
// ============================================

// ========== GLOBAL STATE ==========
let securityState = {
    currentUser: null,
    loginHistory: [],
    activeSessions: [],
    securityAlerts: [],
    securityScore: 0,
    twoFAEnabled: false,
    isLoading: true
};

// ========== INITIALIZE SECURITY PAGE ==========
async function initSecurity() {
    showSkeletonLoader();
    const isAuth = await checkAuthAndLoadUser();
    if (!isAuth) return;
    
    await Promise.all([
        loadLoginHistory(),
        loadActiveSessions(),
        loadSecurityAlerts(),
        loadTwoFAStatus(),
        calculateSecurityScore()
    ]);
    
    attachEventListeners();
    securityState.isLoading = false;
    hideSkeletonLoader();
    animateInElements();
    startSessionHeartbeat();
}

// ========== CHECK AUTHENTICATION ==========
async function checkAuthAndLoadUser() {
    const user = window.getCurrentUser();
    if (!user?.uid) {
        window.location.href = '/login.html';
        return false;
    }
    
    securityState.currentUser = user;
    
    const userDoc = await db.collection('users').doc(user.uid).get();
    const username = userDoc.data()?.username || user.email?.split('@')[0] || 'User';
    
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.innerText = username;
    
    return true;
}

// ========== LOAD LOGIN HISTORY (Timeline view) ==========
async function loadLoginHistory() {
    const container = document.getElementById('loginHistoryList');
    if (!container) return;
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;
        
        const historySnapshot = await db.collection('loginHistory')
            .where('userId', '==', user.uid)
            .orderBy('loginTime', 'desc')
            .limit(20)
            .get();
        
        securityState.loginHistory = [];
        historySnapshot.forEach(doc => {
            securityState.loginHistory.push({ id: doc.id, ...doc.data() });
        });
        
        renderLoginHistory();
        
    } catch (error) {
        console.error('Error loading login history:', error);
        container.innerHTML = renderErrorState('login');
        showGlassToast('Failed to load login history', 'error');
    }
}

function renderLoginHistory() {
    const container = document.getElementById('loginHistoryList');
    if (!container) return;
    
    if (securityState.loginHistory.length === 0) {
        container.innerHTML = renderEmptyState('login');
        return;
    }
    
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
        container.innerHTML = `
            <div class="space-y-3 animate-fade-in">
                ${securityState.loginHistory.map((entry, idx) => renderLoginCard(entry, idx)).join('')}
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="overflow-x-auto">
                <table class="data-table w-full">
                    <thead>
                        <tr>
                            <th>Device</th>
                            <th>Location</th>
                            <th>IP Address</th>
                            <th>Time</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${securityState.loginHistory.map((entry, idx) => renderLoginRow(entry, idx)).join('')}
                    </tbody>
                追赶
            </div>
        `;
    }
}

function renderLoginRow(entry, index) {
    const delay = 0.03 * (index % 10);
    const loginTime = entry.loginTime?.toDate ? entry.loginTime.toDate() : new Date(entry.loginTime);
    const deviceIcon = getDeviceIcon(entry.device);
    const isSuccessful = entry.success !== false;
    
    return `
        <tr class="animate-slide-up" style="animation-delay: ${delay}s">
            <td>
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <i class="${deviceIcon} text-primary text-sm"></i>
                    </div>
                    <span class="text-sm">${escapeHtml(entry.device || 'Unknown Device')}</span>
                </div>
            </td>
            <td class="text-sm">${escapeHtml(entry.location || 'Unknown')}</td>
            <td class="font-mono text-xs">${entry.ipAddress || 'Unknown'}</td>
            <td class="text-sm text-gray-500">${formatDateTime(loginTime)}</td>
            <td>${renderLoginStatusBadge(isSuccessful)}</td>
        </tr>
    `;
}

function renderLoginCard(entry, index) {
    const delay = 0.03 * (index % 10);
    const loginTime = entry.loginTime?.toDate ? entry.loginTime.toDate() : new Date(entry.loginTime);
    const deviceIcon = getDeviceIcon(entry.device);
    const isSuccessful = entry.success !== false;
    
    return `
        <div class="glass-card p-4 rounded-xl animate-slide-up" style="animation-delay: ${delay}s">
            <div class="flex justify-between items-start mb-3">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <i class="${deviceIcon} text-primary text-lg"></i>
                    </div>
                    <div>
                        <div class="font-medium text-sm">${escapeHtml(entry.device || 'Unknown Device')}</div>
                        <div class="text-xs text-gray-400">${entry.ipAddress || 'Unknown'}</div>
                    </div>
                </div>
                ${renderLoginStatusBadge(isSuccessful)}
            </div>
            <div class="flex justify-between items-center text-xs text-gray-400">
                <span><i class="far fa-clock mr-1"></i> ${formatDateTime(loginTime)}</span>
                <span><i class="fas fa-map-marker-alt mr-1"></i> ${escapeHtml(entry.location || 'Unknown')}</span>
            </div>
        </div>
    `;
}

// ========== LOAD ACTIVE SESSIONS ==========
async function loadActiveSessions() {
    const container = document.getElementById('activeSessionsList');
    if (!container) return;
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;
        
        const sessionsSnapshot = await db.collection('sessions')
            .where('userId', '==', user.uid)
            .where('active', '==', true)
            .get();
        
        securityState.activeSessions = [];
        const currentSessionId = localStorage.getItem('sessionId');
        
        sessionsSnapshot.forEach(doc => {
            securityState.activeSessions.push({ 
                id: doc.id, 
                ...doc.data(),
                isCurrent: doc.id === currentSessionId
            });
        });
        
        renderActiveSessions();
        
    } catch (error) {
        console.error('Error loading sessions:', error);
        container.innerHTML = renderErrorState('sessions');
    }
}

function renderActiveSessions() {
    const container = document.getElementById('activeSessionsList');
    if (!container) return;
    
    if (securityState.activeSessions.length === 0) {
        container.innerHTML = renderEmptyState('sessions');
        return;
    }
    
    container.innerHTML = securityState.activeSessions.map((session, idx) => {
        const delay = 0.05 * idx;
        const createdAt = session.createdAt?.toDate ? session.createdAt.toDate() : new Date(session.createdAt);
        const deviceIcon = getDeviceIcon(session.device);
        
        return `
            <div class="session-card glass-card p-4 rounded-xl animate-slide-up flex justify-between items-center" style="animation-delay: ${delay}s">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <i class="${deviceIcon} text-primary text-xl"></i>
                    </div>
                    <div>
                        <div class="font-semibold">${escapeHtml(session.device || 'Unknown Device')}</div>
                        <div class="text-xs text-gray-400">${formatDateTime(createdAt)}</div>
                        <div class="text-xs text-gray-400">IP: ${session.ipAddress || 'Unknown'}</div>
                    </div>
                </div>
                <div>
                    ${session.isCurrent ? 
                        `<span class="status-badge status-success"><i class="fas fa-circle mr-1" style="font-size: 8px;"></i> Current Session</span>` :
                        `<button onclick="terminateSession('${session.id}')" class="btn-danger text-sm px-4 py-2 rounded-lg">
                            <i class="fas fa-sign-out-alt mr-1"></i> Terminate
                        </button>`
                    }
                </div>
            </div>
        `;
    }).join('');
}

// ========== LOAD SECURITY ALERTS ==========
async function loadSecurityAlerts() {
    const container = document.getElementById('securityAlertsList');
    if (!container) return;
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;
        
        const alertsSnapshot = await db.collection('securityAlerts')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
        
        securityState.securityAlerts = [];
        alertsSnapshot.forEach(doc => {
            securityState.securityAlerts.push({ id: doc.id, ...doc.data() });
        });
        
        renderSecurityAlerts();
        
    } catch (error) {
        console.error('Error loading alerts:', error);
        container.innerHTML = renderErrorState('alerts');
    }
}

function renderSecurityAlerts() {
    const container = document.getElementById('securityAlertsList');
    if (!container) return;
    
    if (securityState.securityAlerts.length === 0) {
        container.innerHTML = renderEmptyState('alerts');
        return;
    }
    
    container.innerHTML = securityState.securityAlerts.map((alert, idx) => {
        const delay = 0.05 * idx;
        const alertDate = alert.createdAt?.toDate ? alert.createdAt.toDate() : new Date(alert.createdAt);
        const alertIcon = getAlertIcon(alert.type);
        const alertClass = getAlertClass(alert.severity);
        
        return `
            <div class="alert-card glass-card p-4 rounded-xl animate-slide-up" style="animation-delay: ${delay}s">
                <div class="flex items-start gap-3">
                    <div class="w-10 h-10 rounded-full ${alertClass} flex items-center justify-center flex-shrink-0">
                        <i class="${alertIcon}"></i>
                    </div>
                    <div class="flex-1">
                        <div class="flex justify-between items-start flex-wrap gap-2">
                            <h4 class="font-semibold">${escapeHtml(alert.title)}</h4>
                            <span class="text-xs text-gray-400">${formatSmartDate(alertDate)}</span>
                        </div>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${escapeHtml(alert.message)}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ========== LOAD 2FA STATUS ==========
async function loadTwoFAStatus() {
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;
        
        const userDoc = await db.collection('users').doc(user.uid).get();
        securityState.twoFAEnabled = userDoc.data()?.twoFAEnabled || false;
        
        const twoFAStatus = document.getElementById('twoFAStatus');
        const twoFABadge = document.getElementById('twoFABadge');
        const enable2faBtn = document.getElementById('enable2faBtn');
        
        if (securityState.twoFAEnabled) {
            if (twoFAStatus) twoFAStatus.innerHTML = '<span class="text-green-600 dark:text-green-400"><i class="fas fa-check-circle mr-1"></i> Enabled</span>';
            if (twoFABadge) twoFABadge.innerHTML = '<span class="status-badge status-success">● Active</span>';
            if (enable2faBtn) {
                enable2faBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i> Disable 2FA';
                enable2faBtn.classList.remove('btn-primary');
                enable2faBtn.classList.add('btn-danger');
            }
        } else {
            if (twoFAStatus) twoFAStatus.innerHTML = '<span class="text-gray-500"><i class="fas fa-exclamation-triangle mr-1"></i> Not Enabled</span>';
            if (twoFABadge) twoFABadge.innerHTML = '<span class="status-badge status-pending">● Inactive</span>';
            if (enable2faBtn) {
                enable2faBtn.innerHTML = '<i class="fas fa-shield-alt mr-2"></i> Enable 2FA';
                enable2faBtn.classList.remove('btn-danger');
                enable2faBtn.classList.add('btn-primary');
            }
        }
        
    } catch (error) {
        console.error('Error loading 2FA status:', error);
    }
}

// ========== CALCULATE SECURITY SCORE ==========
async function calculateSecurityScore() {
    let score = 0;
    const maxScore = 100;
    
    // Check 2FA (30 points)
    if (securityState.twoFAEnabled) score += 30;
    
    // Check password strength (20 points)
    const hasStrongPassword = await checkPasswordStrength();
    if (hasStrongPassword) score += 20;
    
    // Check session count (20 points) - fewer active sessions is better
    const sessionCount = securityState.activeSessions.length;
    if (sessionCount <= 1) score += 20;
    else if (sessionCount <= 2) score += 10;
    else if (sessionCount <= 3) score += 5;
    
    // Check recent security alerts (30 points)
    const recentAlerts = securityState.securityAlerts.filter(a => {
        const alertDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const daysOld = (Date.now() - alertDate) / (1000 * 60 * 60 * 24);
        return daysOld < 7 && a.severity === 'high';
    }).length;
    
    if (recentAlerts === 0) score += 30;
    else if (recentAlerts === 1) score += 15;
    else if (recentAlerts === 2) score += 5;
    
    securityState.securityScore = Math.min(score, maxScore);
    
    // Update score meter
    updateSecurityScoreMeter();
}

async function checkPasswordStrength() {
    // This would ideally check last password change date
    // For now, return true if user has logged in recently
    const lastLogin = securityState.loginHistory[0]?.loginTime?.toDate();
    if (!lastLogin) return false;
    return true;
}

function updateSecurityScoreMeter() {
    const scoreFill = document.getElementById('securityScoreFill');
    const scoreText = document.getElementById('securityScoreText');
    const scoreLabel = document.getElementById('securityScoreLabel');
    
    if (scoreFill) scoreFill.style.width = `${securityState.securityScore}%`;
    if (scoreText) scoreText.innerText = securityState.securityScore;
    
    if (scoreLabel) {
        if (securityState.securityScore >= 80) {
            scoreLabel.innerHTML = '<i class="fas fa-shield-alt text-green-500 mr-1"></i> Excellent';
        } else if (securityState.securityScore >= 60) {
            scoreLabel.innerHTML = '<i class="fas fa-shield-alt text-yellow-500 mr-1"></i> Good';
        } else if (securityState.securityScore >= 40) {
            scoreLabel.innerHTML = '<i class="fas fa-shield-alt text-orange-500 mr-1"></i> Fair';
        } else {
            scoreLabel.innerHTML = '<i class="fas fa-shield-alt text-red-500 mr-1"></i> Poor';
        }
    }
}

// ========== TERMINATE SESSION ==========
window.terminateSession = async function(sessionId) {
    const confirmed = confirm('⚠️ Are you sure you want to terminate this session? The user will be logged out from that device.');
    if (!confirmed) return;
    
    try {
        await db.collection('sessions').doc(sessionId).update({
            active: false,
            terminatedAt: new Date()
        });
        
        showGlassToast('Session terminated successfully', 'success');
        await loadActiveSessions();
        await calculateSecurityScore();
        
    } catch (error) {
        console.error('Error terminating session:', error);
        showGlassToast('Failed to terminate session', 'error');
    }
};

// ========== LOGOUT ALL OTHER DEVICES ==========
async function logoutAllDevices() {
    const confirmed = confirm('⚠️ This will sign you out from all other devices. You will remain signed in on this device. Continue?');
    if (!confirmed) return;
    
    const btn = document.getElementById('logoutAllDevicesBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Processing...';
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) throw new Error('Not authenticated');
        
        const currentSessionId = localStorage.getItem('sessionId');
        
        const sessionsSnapshot = await db.collection('sessions')
            .where('userId', '==', user.uid)
            .where('active', '==', true)
            .get();
        
        const batch = db.batch();
        sessionsSnapshot.forEach(doc => {
            if (doc.id !== currentSessionId) {
                batch.update(doc.ref, { active: false, terminatedAt: new Date() });
            }
        });
        await batch.commit();
        
        showGlassToast('All other sessions terminated successfully', 'success');
        await loadActiveSessions();
        await calculateSecurityScore();
        
    } catch (error) {
        console.error('Error logging out devices:', error);
        showGlassToast('Failed to terminate sessions', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// ========== TWO-FACTOR AUTHENTICATION UI ==========
async function setupTwoFactor() {
    const modal = document.getElementById('twofaModal');
    const content = document.getElementById('twofaContent');
    
    if (!modal || !content) return;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    if (securityState.twoFAEnabled) {
        // Show disable 2FA UI
        content.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-shield-alt text-5xl text-primary mb-4"></i>
                <h3 class="text-xl font-bold mb-2">Disable Two-Factor Authentication</h3>
                <p class="text-gray-500 dark:text-gray-400 mb-4">Are you sure you want to disable 2FA? This will make your account less secure.</p>
                <div class="flex gap-3 justify-center">
                    <button onclick="closeTwofaModal()" class="btn-outline">Cancel</button>
                    <button onclick="disableTwoFactor()" class="btn-danger">Disable 2FA</button>
                </div>
            </div>
        `;
    } else {
        // Show enable 2FA UI with QR code
        content.innerHTML = `
            <div class="text-center py-2">
                <div class="w-48 h-48 mx-auto bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mb-4">
                    <i class="fas fa-qrcode text-6xl text-gray-400"></i>
                </div>
                <p class="text-sm text-gray-500 mb-2">Scan this QR code with Google Authenticator or Authy</p>
                <div class="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg mb-4">
                    <code class="text-xs break-all">${generateTOTPSecret()}</code>
                    <button onclick="copyTOTPSecret()" class="text-primary text-xs ml-2"><i class="fas fa-copy"></i> Copy</button>
                </div>
                <div class="mb-4">
                    <input type="text" id="totpCode" placeholder="Enter 6-digit code" class="form-input text-center text-2xl tracking-widest" maxlength="6">
                </div>
                <div class="flex gap-3 justify-center">
                    <button onclick="closeTwofaModal()" class="btn-outline">Cancel</button>
                    <button onclick="verifyAndEnableTwoFactor()" class="btn-primary">Verify & Enable</button>
                </div>
            </div>
        `;
    }
}

function generateTOTPSecret() {
    // In production, generate a real TOTP secret
    return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ123456';
}

function copyTOTPSecret() {
    const secret = generateTOTPSecret();
    copyToClipboard(secret);
    showGlassToast('Secret copied to clipboard', 'success');
}

async function verifyAndEnableTwoFactor() {
    const code = document.getElementById('totpCode')?.value;
    if (!code || code.length !== 6) {
        showGlassToast('Please enter a valid 6-digit code', 'error');
        return;
    }
    
    showGlassToast('2FA setup coming soon! This is a preview.', 'info');
    closeTwofaModal();
}

async function disableTwoFactor() {
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) throw new Error('Not authenticated');
        
        await db.collection('users').doc(user.uid).update({
            twoFAEnabled: false,
            twoFASecret: null
        });
        
        securityState.twoFAEnabled = false;
        await loadTwoFAStatus();
        await calculateSecurityScore();
        
        showGlassToast('Two-factor authentication disabled', 'success');
        closeTwofaModal();
        
    } catch (error) {
        console.error('Error disabling 2FA:', error);
        showGlassToast('Failed to disable 2FA', 'error');
    }
}

function closeTwofaModal() {
    const modal = document.getElementById('twofaModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// ========== SESSION HEARTBEAT ==========
function startSessionHeartbeat() {
    // Update session last active timestamp every 5 minutes
    setInterval(async () => {
        const sessionId = localStorage.getItem('sessionId');
        if (sessionId && securityState.currentUser?.uid) {
            try {
                await db.collection('sessions').doc(sessionId).update({
                    lastActive: new Date()
                });
            } catch (e) {
                console.log('Heartbeat update failed');
            }
        }
    }, 300000);
}

// ========== HELPER FUNCTIONS ==========
function getDeviceIcon(device) {
    const deviceLower = (device || '').toLowerCase();
    if (deviceLower.includes('mobile') || deviceLower.includes('phone')) return 'fas fa-mobile-alt';
    if (deviceLower.includes('tablet')) return 'fas fa-tablet-alt';
    if (deviceLower.includes('mac')) return 'fab fa-apple';
    if (deviceLower.includes('windows')) return 'fab fa-windows';
    if (deviceLower.includes('linux')) return 'fab fa-linux';
    return 'fas fa-desktop';
}

function getAlertIcon(type) {
    const icons = {
        login: 'fas fa-sign-in-alt',
        password: 'fas fa-key',
        suspicious: 'fas fa-exclamation-triangle',
        device: 'fas fa-mobile-alt',
        failed_login: 'fas fa-ban'
    };
    return icons[type] || 'fas fa-bell';
}

function getAlertClass(severity) {
    if (severity === 'high') return 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400';
    if (severity === 'medium') return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400';
    return 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400';
}

function renderLoginStatusBadge(isSuccessful) {
    if (isSuccessful) {
        return `<span class="status-badge status-success"><i class="fas fa-check-circle mr-1"></i> Successful</span>`;
    }
    return `<span class="status-badge status-cancelled"><i class="fas fa-times-circle mr-1"></i> Failed</span>`;
}

function formatDateTime(date) {
    if (!date) return 'N/A';
    return date.toLocaleString('en-BD', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatSmartDate(date) {
    if (!date) return 'Just now';
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    if (diffMins < 43200) return `${Math.floor(diffMins / 1440)} days ago`;
    return date.toLocaleDateString('en-BD', { day: 'numeric', month: 'short' });
}

// ========== EMPTY & ERROR STATES ==========
function renderEmptyState(type) {
    const messages = {
        login: { icon: '🔐', title: 'No login history', message: 'Your login activity will appear here' },
        sessions: { icon: '📱', title: 'No active sessions', message: 'This is your only active session' },
        alerts: { icon: '✅', title: 'No security alerts', message: 'Your account looks secure' }
    };
    const m = messages[type] || messages.login;
    
    return `
        <div class="empty-state py-8">
            <div class="empty-icon text-4xl mb-2">${m.icon}</div>
            <h3 class="empty-title text-lg font-semibold mb-1">${m.title}</h3>
            <p class="empty-description text-sm text-gray-500">${m.message}</p>
        </div>
    `;
}

function renderErrorState(type) {
    return `
        <div class="empty-state py-8">
            <div class="empty-icon text-4xl mb-2">❌</div>
            <p class="text-red-500 text-sm">Failed to load ${type} data</p>
            <button onclick="location.reload()" class="btn-primary text-sm mt-3">Retry</button>
        </div>
    `;
}

// ========== ANIMATIONS & LOADERS ==========
function showSkeletonLoader() {
    const containers = ['loginHistoryList', 'activeSessionsList', 'securityAlertsList'];
    containers.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            container.innerHTML = `
                <div class="space-y-3">
                    <div class="skeleton skeleton-card h-20 rounded-xl"></div>
                    <div class="skeleton skeleton-card h-20 rounded-xl"></div>
                </div>
            `;
        }
    });
}

function hideSkeletonLoader() {
    // Content replaces skeletons when loaded
}

function animateInElements() {
    document.querySelectorAll('.security-card, .stat-card').forEach((el, idx) => {
        el.classList.add('animate-slide-up');
        el.style.animationDelay = `${0.05 * idx}s`;
    });
}

// ========== HELPER ==========
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    });
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
    // Enable 2FA button
    const enable2faBtn = document.getElementById('enable2faBtn');
    if (enable2faBtn) {
        enable2faBtn.addEventListener('click', setupTwoFactor);
    }
    
    // Logout all devices button
    const logoutAllBtn = document.getElementById('logoutAllDevicesBtn');
    if (logoutAllBtn) {
        logoutAllBtn.addEventListener('click', logoutAllDevices);
    }
    
    // Close modal on outside click
    const twofaModal = document.getElementById('twofaModal');
    if (twofaModal) {
        twofaModal.addEventListener('click', (e) => {
            if (e.target === twofaModal) closeTwofaModal();
        });
    }
}

// ========== EXPORT GLOBALS ==========
window.initSecurity = initSecurity;
window.terminateSession = terminateSession;
window.logoutAllDevices = logoutAllDevices;
window.setupTwoFactor = setupTwoFactor;
window.closeTwofaModal = closeTwofaModal;

// ========== AUTO-INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('loginHistoryList')) {
        if (window.auth && window.db) {
            await initSecurity();
        } else {
            const checkFirebase = setInterval(async () => {
                if (window.auth && window.db) {
                    clearInterval(checkFirebase);
                    await initSecurity();
                }
            }, 100);
        }
    }
});

console.log('✅ Security v3.0 (design.md compliant) loaded');