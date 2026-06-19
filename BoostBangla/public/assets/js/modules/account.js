// ============================================
// BoostBangla Account Module v3.0
// Fully redesigned following design.md
// Glass profile cards with animated avatar
// Notification preferences with iOS-style toggles
// Password strength meter with real-time feedback
// Account deletion with confirmation flow
// ============================================

// ========== GLOBAL STATE ==========
let accountState = {
    currentUser: null,
    userData: {},
    isLoading: true,
    passwordStrength: 0,
    notificationPrefs: {
        email: true,
        whatsapp: false,
        promo: true,
        orderUpdates: true,
        securityAlerts: true
    }
};

// ========== INITIALIZE ACCOUNT PAGE ==========
async function initAccount() {
    showSkeletonLoader();
    const isAuth = await checkAuthAndLoadUser();
    if (!isAuth) return;
    
    await Promise.all([
        loadUserData(),
        loadBalanceAndOrders(),
        loadNotificationPrefs()
    ]);
    
    attachEventListeners();
    setupPasswordStrengthMeter();
    setupAvatarUpload();
    accountState.isLoading = false;
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
    
    accountState.currentUser = user;
    return true;
}

// ========== LOAD USER DATA ==========
async function loadUserData() {
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;
        
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            accountState.userData = userDoc.data();
            
            // Update profile display
            const displayName = accountState.userData.username || user.email?.split('@')[0] || 'User';
            const displayEmail = user.email;
            const displayPhone = accountState.userData.phone || 'Not set';
            const memberSince = accountState.userData.createdAt?.toDate ? 
                accountState.userData.createdAt.toDate().toLocaleDateString('en-BD', { year: 'numeric', month: 'long' }) : 
                '2025';
            
            updateElementText('displayName', displayName);
            updateElementText('displayEmail', displayEmail);
            updateElementText('displayPhone', displayPhone);
            updateElementText('memberSince', memberSince);
            
            // Update avatar with first letter
            updateAvatar(displayName.charAt(0).toUpperCase());
        }
        
        // Pre-fill edit form
        document.getElementById('editUsername').value = accountState.userData.username || '';
        document.getElementById('editPhone').value = accountState.userData.phone || '';
        
    } catch (error) {
        console.error('Error loading user data:', error);
        showGlassToast('Failed to load user data', 'error');
    }
}

function updateElementText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

function updateAvatar(initial) {
    const avatarEl = document.getElementById('userAvatar');
    if (avatarEl) {
        avatarEl.innerHTML = initial;
        avatarEl.classList.add('animate-pulse-slow');
        setTimeout(() => avatarEl.classList.remove('animate-pulse-slow'), 300);
    }
}

// ========== LOAD BALANCE AND ORDER STATS ==========
async function loadBalanceAndOrders() {
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;
        
        const userDoc = await db.collection('users').doc(user.uid).get();
        const balance = userDoc.data()?.balance || 0;
        const balanceUSD = balance / (accountState.exchangeRate || 120);
        
        updateElementText('bdtBalance', formatCurrencyBDT(balance));
        updateElementText('usdBalance', `$${balanceUSD.toFixed(2)}`);
        
        const ordersSnapshot = await db.collection('orders')
            .where('userId', '==', user.uid)
            .get();
        
        let totalSpent = 0;
        ordersSnapshot.forEach(doc => {
            totalSpent += doc.data().priceUSD || 0;
        });
        
        updateElementText('totalSpent', `$${totalSpent.toFixed(2)}`);
        updateElementText('totalOrders', ordersSnapshot.size);
        
        // Animate stats cards
        animateStatValue('bdtBalance', formatCurrencyBDT(balance));
        animateStatValue('totalOrders', ordersSnapshot.size);
        
    } catch (error) {
        console.error('Error loading balance:', error);
        showGlassToast('Failed to load balance data', 'error');
    }
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

// ========== EDIT PROFILE MODAL ==========
function openEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Reset form with current values
        document.getElementById('editUsername').value = accountState.userData.username || '';
        document.getElementById('editPhone').value = accountState.userData.phone || '';
    }
}

window.closeEditModal = function() {
    const modal = document.getElementById('editProfileModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
};

async function updateProfile(e) {
    e.preventDefault();
    
    const username = document.getElementById('editUsername').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    
    if (!username) {
        showGlassToast('Username is required', 'error');
        return;
    }
    
    if (username.length < 3) {
        showGlassToast('Username must be at least 3 characters', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Saving...';
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) throw new Error('Not authenticated');
        
        await db.collection('users').doc(user.uid).update({
            username: username,
            phone: phone || null,
            updatedAt: new Date()
        });
        
        // Update local state
        accountState.userData.username = username;
        accountState.userData.phone = phone;
        
        // Update UI
        updateElementText('displayName', username);
        updateElementText('displayPhone', phone || 'Not set');
        updateAvatar(username.charAt(0).toUpperCase());
        
        showGlassToast('Profile updated successfully!', 'success');
        closeEditModal();
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showGlassToast('Failed to update profile', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ========== AVATAR UPLOAD ==========
function setupAvatarUpload() {
    const uploadBtn = document.getElementById('uploadAvatarBtn');
    const fileInput = document.getElementById('avatarInput');
    
    if (!uploadBtn || !fileInput) return;
    
    uploadBtn.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.size > 2 * 1024 * 1024) {
            showGlassToast('Image must be less than 2MB', 'error');
            return;
        }
        
        if (!file.type.startsWith('image/')) {
            showGlassToast('Please select an image file', 'error');
            return;
        }
        
        showGlassToast('Avatar upload coming soon!', 'info');
    });
}

// ========== CHANGE PASSWORD WITH STRENGTH METER ==========
function setupPasswordStrengthMeter() {
    const newPasswordInput = document.getElementById('newPassword');
    if (!newPasswordInput) return;
    
    newPasswordInput.addEventListener('input', (e) => {
        const password = e.target.value;
        accountState.passwordStrength = calculatePasswordStrength(password);
        updatePasswordStrengthUI();
    });
}

function calculatePasswordStrength(password) {
    let score = 0;
    
    if (!password) return 0;
    
    // Length
    if (password.length >= 8) score += 25;
    else if (password.length >= 6) score += 15;
    else score += 5;
    
    // Lowercase
    if (/[a-z]/.test(password)) score += 15;
    
    // Uppercase
    if (/[A-Z]/.test(password)) score += 15;
    
    // Numbers
    if (/[0-9]/.test(password)) score += 20;
    
    // Special characters
    if (/[^a-zA-Z0-9]/.test(password)) score += 25;
    
    return Math.min(score, 100);
}

function updatePasswordStrengthUI() {
    const strengthFill = document.getElementById('passwordStrengthFill');
    const strengthText = document.getElementById('passwordStrengthText');
    const score = accountState.passwordStrength;
    
    if (strengthFill) {
        strengthFill.style.width = `${score}%`;
        
        // Color based on strength
        if (score >= 80) {
            strengthFill.classList.remove('bg-yellow-500', 'bg-red-500');
            strengthFill.classList.add('bg-green-500');
        } else if (score >= 50) {
            strengthFill.classList.remove('bg-green-500', 'bg-red-500');
            strengthFill.classList.add('bg-yellow-500');
        } else {
            strengthFill.classList.remove('bg-green-500', 'bg-yellow-500');
            strengthFill.classList.add('bg-red-500');
        }
    }
    
    if (strengthText) {
        if (score >= 80) strengthText.innerText = 'Strong';
        else if (score >= 50) strengthText.innerText = 'Medium';
        else if (score >= 20) strengthText.innerText = 'Weak';
        else strengthText.innerText = 'Very Weak';
    }
}

async function changePassword(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation
    if (!currentPassword) {
        showGlassToast('Please enter your current password', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showGlassToast('New password must be at least 6 characters', 'error');
        return;
    }
    
    if (accountState.passwordStrength < 50) {
        showGlassToast('Please choose a stronger password', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showGlassToast('Passwords do not match', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Updating...';
    
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Not authenticated');
        
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        await user.reauthenticateWithCredential(credential);
        await user.updatePassword(newPassword);
        
        showGlassToast('Password updated successfully!', 'success');
        document.getElementById('passwordForm').reset();
        accountState.passwordStrength = 0;
        updatePasswordStrengthUI();
        
    } catch (error) {
        console.error('Password update error:', error);
        if (error.code === 'auth/wrong-password') {
            showGlassToast('Current password is incorrect', 'error');
        } else if (error.code === 'auth/weak-password') {
            showGlassToast('New password is too weak', 'error');
        } else {
            showGlassToast('Failed to update password: ' + error.message, 'error');
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ========== NOTIFICATION PREFERENCES (iOS-style toggles) ==========
function loadNotificationPrefs() {
    const user = window.getCurrentUser();
    if (!user?.uid) return;
    
    const savedPrefs = localStorage.getItem(`notifications_${user.uid}`);
    if (savedPrefs) {
        accountState.notificationPrefs = JSON.parse(savedPrefs);
    }
    
    // Apply to UI
    updateToggle('emailNotifications', accountState.notificationPrefs.email);
    updateToggle('whatsappNotifications', accountState.notificationPrefs.whatsapp);
    updateToggle('promoNotifications', accountState.notificationPrefs.promo);
    updateToggle('orderNotifications', accountState.notificationPrefs.orderUpdates);
    updateToggle('securityNotifications', accountState.notificationPrefs.securityAlerts);
}

function updateToggle(id, isChecked) {
    const toggle = document.getElementById(id);
    if (toggle) {
        toggle.checked = isChecked;
        // Update parent class for styling
        const parent = toggle.closest('.toggle-switch');
        if (parent) {
            if (isChecked) parent.classList.add('checked');
            else parent.classList.remove('checked');
        }
    }
}

function toggleNotification(option) {
    const toggle = document.getElementById(option);
    if (toggle) {
        accountState.notificationPrefs[option.replace('Notifications', '').toLowerCase()] = toggle.checked;
    }
}

function saveNotificationPrefs() {
    const user = window.getCurrentUser();
    if (!user?.uid) return;
    
    // Collect current values
    accountState.notificationPrefs = {
        email: document.getElementById('emailNotifications')?.checked || false,
        whatsapp: document.getElementById('whatsappNotifications')?.checked || false,
        promo: document.getElementById('promoNotifications')?.checked || false,
        orderUpdates: document.getElementById('orderNotifications')?.checked || false,
        securityAlerts: document.getElementById('securityNotifications')?.checked || false
    };
    
    localStorage.setItem(`notifications_${user.uid}`, JSON.stringify(accountState.notificationPrefs));
    showGlassToast('Notification preferences saved!', 'success');
}

// ========== API KEY MANAGEMENT ==========
function generateApiKey() {
    return 'bp_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 8);
}

function loadApiKey() {
    const user = window.getCurrentUser();
    if (!user?.uid) return;
    
    let apiKey = localStorage.getItem(`api_key_${user.uid}`);
    if (!apiKey) {
        apiKey = generateApiKey();
        localStorage.setItem(`api_key_${user.uid}`, apiKey);
    }
    
    const apiKeyDisplay = document.getElementById('apiKeyDisplay');
    if (apiKeyDisplay) {
        apiKeyDisplay.innerText = maskApiKey(apiKey);
        apiKeyDisplay.dataset.fullKey = apiKey;
    }
}

function maskApiKey(key) {
    if (!key) return 'Not set';
    if (key.length <= 16) return key;
    return key.substring(0, 8) + '••••••••' + key.substring(key.length - 8);
}

async function copyApiKey() {
    const apiKeyDisplay = document.getElementById('apiKeyDisplay');
    if (!apiKeyDisplay || !apiKeyDisplay.dataset.fullKey) {
        showGlassToast('No API key found', 'error');
        return;
    }
    
    await copyToClipboard(apiKeyDisplay.dataset.fullKey);
    showGlassToast('API key copied to clipboard!', 'success');
    
    const copyBtn = document.getElementById('copyApiKeyBtn');
    if (copyBtn) {
        copyBtn.classList.add('scale-95');
        setTimeout(() => copyBtn.classList.remove('scale-95'), 200);
    }
}

async function regenerateApiKey() {
    const confirmed = confirm('⚠️ Regenerating your API key will invalidate the old one. Any applications using the old key will stop working. Continue?');
    if (!confirmed) return;
    
    const user = window.getCurrentUser();
    if (!user?.uid) return;
    
    const newKey = generateApiKey();
    localStorage.setItem(`api_key_${user.uid}`, newKey);
    
    const apiKeyDisplay = document.getElementById('apiKeyDisplay');
    if (apiKeyDisplay) {
        apiKeyDisplay.innerText = maskApiKey(newKey);
        apiKeyDisplay.dataset.fullKey = newKey;
    }
    
    showGlassToast('API key regenerated successfully!', 'success');
}

// ========== DELETE ACCOUNT (with confirmation flow) ==========
async function deleteAccount() {
    const confirmDelete = confirm('⚠️ WARNING: This will permanently delete your account and all data. This action cannot be undone. Are you sure?');
    if (!confirmDelete) return;
    
    const typeConfirm = prompt('Type "DELETE" to confirm account deletion:');
    if (typeConfirm !== 'DELETE') {
        showGlassToast('Account deletion cancelled', 'info');
        return;
    }
    
    const deleteBtn = document.getElementById('deleteAccountBtn');
    const originalText = deleteBtn.innerHTML;
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<span class="spinner"></span> Submitting...';
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) throw new Error('Not authenticated');
        
        // Create deletion request in Firestore
        await db.collection('deletionRequests').add({
            userId: user.uid,
            userEmail: user.email,
            requestedAt: new Date(),
            status: 'pending'
        });
        
        showGlassToast('Account deletion request submitted. We will contact you within 48 hours.', 'success');
        
        // Logout after request
        setTimeout(() => {
            auth.signOut();
            window.location.href = '/login.html';
        }, 3000);
        
    } catch (error) {
        console.error('Delete account error:', error);
        showGlassToast('Failed to submit deletion request. Please contact support.', 'error');
    } finally {
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = originalText;
    }
}

// ========== TWO-FACTOR AUTHENTICATION (Placeholder) ==========
function enable2FA() {
    showGlassToast('🔐 Two-Factor Authentication setup will be available soon. Stay tuned!', 'info');
}

// ========== ANIMATIONS & LOADERS ==========
function showSkeletonLoader() {
    const containers = ['displayName', 'displayEmail', 'displayPhone', 'bdtBalance', 'totalOrders'];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.innerText) {
            el.innerHTML = '<div class="skeleton skeleton-text w-32 h-5"></div>';
        }
    });
}

function hideSkeletonLoader() {
    // Content replaces skeletons when loaded
}

function animateInElements() {
    document.querySelectorAll('.glass-card, .settings-section').forEach((el, idx) => {
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

function showGlassToast(message, type = 'success') {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else {
        console.log(`[${type}] ${message}`);
    }
}

// ========== EVENT LISTENERS ==========
function attachEventListeners() {
    // Edit profile button
    const editBtn = document.getElementById('editProfileBtn');
    if (editBtn) editBtn.addEventListener('click', openEditProfileModal);
    
    // Edit profile form
    const editForm = document.getElementById('editProfileForm');
    if (editForm) editForm.addEventListener('submit', updateProfile);
    
    // Password form
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) passwordForm.addEventListener('submit', changePassword);
    
    // API key buttons
    const copyBtn = document.getElementById('copyApiKeyBtn');
    if (copyBtn) copyBtn.addEventListener('click', copyApiKey);
    
    const regenerateBtn = document.getElementById('regenerateApiKeyBtn');
    if (regenerateBtn) regenerateBtn.addEventListener('click', regenerateApiKey);
    
    // Notification toggles
    const toggles = ['emailNotifications', 'whatsappNotifications', 'promoNotifications', 'orderNotifications', 'securityNotifications'];
    toggles.forEach(id => {
        const toggle = document.getElementById(id);
        if (toggle) toggle.addEventListener('change', () => toggleNotification(id));
    });
    
    // Save notifications button
    const saveNotifBtn = document.getElementById('saveNotificationsBtn');
    if (saveNotifBtn) saveNotifBtn.addEventListener('click', saveNotificationPrefs);
    
    // Delete account button
    const deleteBtn = document.getElementById('deleteAccountBtn');
    if (deleteBtn) deleteBtn.addEventListener('click', deleteAccount);
    
    // 2FA button
    const enable2faBtn = document.getElementById('enable2faBtn');
    if (enable2faBtn) enable2faBtn.addEventListener('click', enable2FA);
    
    // Close modal on outside click
    const editModal = document.getElementById('editProfileModal');
    if (editModal) {
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) closeEditModal();
        });
    }
}

// ========== EXPORT GLOBALS ==========
window.initAccount = initAccount;
window.closeEditModal = closeEditModal;
window.copyApiKey = copyApiKey;
window.regenerateApiKey = regenerateApiKey;
window.saveNotificationPrefs = saveNotificationPrefs;
window.enable2FA = enable2FA;

// ========== AUTO-INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('displayName')) {
        if (window.auth && window.db) {
            await initAccount();
        } else {
            const checkFirebase = setInterval(async () => {
                if (window.auth && window.db) {
                    clearInterval(checkFirebase);
                    await initAccount();
                }
            }, 100);
        }
    }
});

console.log('✅ Account v3.0 (design.md compliant) loaded');