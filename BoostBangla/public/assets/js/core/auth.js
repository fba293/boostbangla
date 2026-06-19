// ============================================
// auth.js - Complete Authentication Module - BoostBangla Design System v3.0
// Handles all user authentication operations with security best practices
// Version: 3.0 - DESIGN SYSTEM COMPLIANT
// ============================================

// ============================================
// INITIALIZE FIREBASE
// ============================================
let auth = null;
let db = null;

function initFirebase() {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            if (window.firebaseConfig) {
                firebase.initializeApp(window.firebaseConfig);
            } else {
                console.error('Firebase config not found!');
                return;
            }
        }
        auth = firebase.auth();
        db = firebase.firestore();
        
        // Enable persistence for better offline support
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
            .catch(error => console.warn('Auth persistence error:', error));
        
        window.auth = auth;
        window.db = db;
    } else {
        console.warn('Firebase SDK not loaded yet, waiting...');
        setTimeout(initFirebase, 500);
    }
}

// Call init when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFirebase);
} else {
    initFirebase();
}

// ============================================
// INJECT AUTH DESIGN SYSTEM STYLES
// ============================================
function injectAuthStyles() {
    const styleId = 'boostbangla-auth-styles';
    if (document.getElementById(styleId)) return;
    
    const styles = `
        /* Auth Card - Glass Morphism */
        .auth-card {
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(20px);
            border-radius: 32px;
            padding: 40px;
            box-shadow: 0 35px 60px -15px rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.2);
            animation: slideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        body.dark-mode .auth-card {
            background: rgba(30, 41, 59, 0.98);
            border-color: rgba(255, 107, 0, 0.15);
        }
        
        /* Auth Input Fields */
        .auth-input {
            width: 100%;
            padding: 14px 18px;
            border: 2px solid #e5e7eb;
            border-radius: 16px;
            font-size: 15px;
            transition: all 0.2s ease;
            background: white;
        }
        
        body.dark-mode .auth-input {
            background: #0f172a;
            border-color: #334155;
            color: #e2e8f0;
        }
        
        .auth-input:focus {
            outline: none;
            border-color: #FF6B00;
            box-shadow: 0 0 0 4px rgba(255, 107, 0, 0.1);
            transform: scale(1.01);
        }
        
        /* Password Strength Meter */
        .password-strength-meter {
            height: 4px;
            background: #e5e7eb;
            border-radius: 4px;
            margin-top: 8px;
            overflow: hidden;
        }
        
        .password-strength-fill {
            height: 100%;
            width: 0%;
            transition: width 0.3s ease, background 0.3s ease;
            border-radius: 4px;
        }
        
        .password-strength-text {
            font-size: 11px;
            margin-top: 6px;
            color: #6b7280;
        }
        
        /* Auth Button */
        .auth-btn {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #FF6B00, #CC5500);
            color: white;
            border: none;
            border-radius: 60px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }
        
        .auth-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 28px -8px rgba(255, 107, 0, 0.4);
        }
        
        .auth-btn:active {
            transform: translateY(1px);
        }
        
        .auth-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        /* Social Auth Buttons */
        .social-auth-btn {
            width: 100%;
            padding: 12px;
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 60px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
        }
        
        body.dark-mode .social-auth-btn {
            background: #1e293b;
            border-color: #334155;
            color: #e2e8f0;
        }
        
        .social-auth-btn:hover {
            border-color: #FF6B00;
            transform: translateY(-2px);
        }
        
        /* Mobile Adjustments */
        @media (max-width: 640px) {
            .auth-card {
                padding: 24px;
                border-radius: 24px;
            }
            
            .auth-input {
                padding: 12px 16px;
                font-size: 14px;
            }
            
            .auth-btn {
                padding: 14px;
                font-size: 15px;
            }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// Call style injection
injectAuthStyles();

// ============================================
// SIGN UP - Create New User Account
// ============================================
async function signUp(email, password, username, fullName = null) {
    // Input validation
    if (!email || !password || !username) {
        return { success: false, error: 'All fields are required' };
    }
    
    if (password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters' };
    }
    
    if (!isValidEmail(email)) {
        return { success: false, error: 'Please enter a valid email address' };
    }
    
    if (username.length < 3) {
        return { success: false, error: 'Username must be at least 3 characters' };
    }
    
    if (username.length > 30) {
        return { success: false, error: 'Username must be less than 30 characters' };
    }
    
    // Check password strength
    const strength = validatePasswordStrength(password);
    if (!strength.isValid) {
        return { success: false, error: `Weak password: ${strength.feedback.join(', ')}` };
    }
    
    try {
        // Check if username is taken
        const usernameQuery = await db.collection('users')
            .where('username', '==', username)
            .get();
        
        if (!usernameQuery.empty) {
            return { success: false, error: 'Username is already taken' };
        }
        
        // Create user
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Create user document in Firestore
        await db.collection('users').doc(user.uid).set({
            uid: user.uid,
            username: username,
            email: email.toLowerCase(),
            fullName: fullName || username,
            balance: 0,
            balanceUSD: 0,
            totalOrders: 0,
            totalSpent: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
            isAdmin: false,
            isActive: true,
            emailVerified: false,
            preferences: {
                darkMode: false,
                notifications: true,
                emailAlerts: true
            }
        });
        
        // Send email verification
        try {
            await user.sendEmailVerification();
        } catch(e) {
            console.log('Email verification skipped:', e.message);
        }
        
        // Store user info in localStorage
        localStorage.setItem('user', JSON.stringify({
            uid: user.uid,
            username: username,
            email: email,
            isAdmin: false,
            balance: 0
        }));
        
        if (window.showToast) {
            window.showToast('Account created successfully!', 'success');
        }
        
        return { success: true, user: user };
        
    } catch (error) {
        console.error('Signup error:', error);
        let errorMessage = getFriendlyErrorMessage(error);
        return { success: false, error: errorMessage };
    }
}

// ============================================
// SIGN IN - Authenticate Existing User
// ============================================
async function signIn(email, password, rememberMe = true) {
    // Input validation
    if (!email || !password) {
        return { success: false, error: 'Email and password are required' };
    }
    
    if (!isValidEmail(email)) {
        return { success: false, error: 'Please enter a valid email address' };
    }
    
    try {
        // Set persistence based on remember me
        const persistence = rememberMe 
            ? firebase.auth.Auth.Persistence.LOCAL 
            : firebase.auth.Auth.Persistence.SESSION;
        
        await auth.setPersistence(persistence);
        
        // Sign in
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Check if email is verified (optional - can be commented)
        // if (!user.emailVerified) {
        //     await auth.signOut();
        //     return { success: false, error: 'Please verify your email before logging in.' };
        // }
        
        // Get user data from Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        let userData = userDoc.data();
        
        if (!userData) {
            // Create user document if missing (for existing auth users)
            const username = email.split('@')[0];
            await db.collection('users').doc(user.uid).set({
                uid: user.uid,
                username: username,
                email: email.toLowerCase(),
                balance: 0,
                balanceUSD: 0,
                totalOrders: 0,
                totalSpent: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                isAdmin: false,
                isActive: true
            });
            userData = { username: username, isAdmin: false, balance: 0 };
        }
        
        // Check if account is active
        if (userData.isActive === false) {
            await auth.signOut();
            return { success: false, error: 'Your account has been deactivated. Please contact support.' };
        }
        
        // Update last login timestamp
        await db.collection('users').doc(user.uid).update({
            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Store user info in localStorage
        localStorage.setItem('user', JSON.stringify({
            uid: user.uid,
            username: userData.username || email.split('@')[0],
            email: user.email,
            isAdmin: userData.isAdmin || false,
            balance: userData.balance || 0
        }));
        
        if (window.showToast) {
            window.showToast(`Welcome back, ${userData.username || email.split('@')[0]}!`, 'success');
        }
        
        return { success: true, user: user, userData: userData };
        
    } catch (error) {
        console.error('Signin error:', error);
        let errorMessage = getLoginErrorMessage(error);
        return { success: false, error: errorMessage };
    }
}

// ============================================
// SIGN OUT - Logout Current User
// ============================================
window.signOut = async function(redirectToLogin = true) {
    try {
        if (window.showToast) {
            window.showToast('Logging out...', 'info', 1000);
        }
        
        // Clear any pending sync
        if (window.isOffline && window.isOffline()) {
            console.log('Offline logout - clearing local data');
        }
        
        await auth.signOut();
        localStorage.removeItem('user');
        localStorage.removeItem('boostbangla_cachedUser');
        
        if (redirectToLogin) {
            window.location.href = '/login.html';
        }
        
        return { success: true };
        
    } catch (error) {
        console.error('Logout error:', error);
        if (redirectToLogin) {
            window.location.href = '/login.html';
        }
        return { success: false, error: error.message };
    }
};

// ============================================
// SEND PASSWORD RESET EMAIL
// ============================================
async function sendPasswordReset(email) {
    if (!email) {
        return { success: false, error: 'Email is required' };
    }
    
    if (!isValidEmail(email)) {
        return { success: false, error: 'Please enter a valid email address' };
    }
    
    try {
        await auth.sendPasswordResetEmail(email, {
            url: window.location.origin + '/login.html',
            handleCodeInApp: false
        });
        
        if (window.showToast) {
            window.showToast('Password reset email sent! Check your inbox.', 'success');
        }
        
        return { success: true };
        
    } catch (error) {
        console.error('Password reset error:', error);
        let errorMessage = getPasswordResetErrorMessage(error);
        return { success: false, error: errorMessage };
    }
}

// ============================================
// UPDATE USER PASSWORD
// ============================================
async function updateUserPassword(currentPassword, newPassword) {
    if (!currentPassword || !newPassword) {
        return { success: false, error: 'Current and new password are required' };
    }
    
    if (newPassword.length < 6) {
        return { success: false, error: 'New password must be at least 6 characters' };
    }
    
    // Check password strength
    const strength = validatePasswordStrength(newPassword);
    if (!strength.isValid) {
        return { success: false, error: `Weak password: ${strength.feedback.join(', ')}` };
    }
    
    try {
        const user = auth.currentUser;
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }
        
        // Re-authenticate user
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        await user.reauthenticateWithCredential(credential);
        
        // Update password
        await user.updatePassword(newPassword);
        
        if (window.showToast) {
            window.showToast('Password updated successfully!', 'success');
        }
        
        return { success: true };
        
    } catch (error) {
        console.error('Password update error:', error);
        
        if (error.code === 'auth/wrong-password') {
            return { success: false, error: 'Current password is incorrect' };
        }
        if (error.code === 'auth/weak-password') {
            return { success: false, error: 'New password must be at least 6 characters' };
        }
        if (error.code === 'auth/too-many-requests') {
            return { success: false, error: 'Too many failed attempts. Please try again later' };
        }
        
        return { success: false, error: 'Failed to update password. Please try again.' };
    }
}

// ============================================
// UPDATE USER PROFILE
// ============================================
async function updateUserProfile(data) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }
        
        const userRef = db.collection('users').doc(user.uid);
        const updateData = {
            ...data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // If updating email, also update auth
        if (data.email && data.email !== user.email) {
            await user.updateEmail(data.email);
        }
        
        await userRef.update(updateData);
        
        // Update localStorage
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (data.username) storedUser.username = data.username;
        if (data.phone) storedUser.phone = data.phone;
        if (data.fullName) storedUser.fullName = data.fullName;
        localStorage.setItem('user', JSON.stringify(storedUser));
        
        if (window.showToast) {
            window.showToast('Profile updated successfully!', 'success');
        }
        
        return { success: true };
        
    } catch (error) {
        console.error('Profile update error:', error);
        
        if (error.code === 'auth/email-already-in-use') {
            return { success: false, error: 'Email is already in use' };
        }
        
        return { success: false, error: error.message || 'Failed to update profile' };
    }
}

// ============================================
// SEND EMAIL VERIFICATION
// ============================================
async function sendEmailVerification() {
    try {
        const user = auth.currentUser;
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }
        
        if (user.emailVerified) {
            return { success: false, error: 'Email is already verified' };
        }
        
        await user.sendEmailVerification();
        
        if (window.showToast) {
            window.showToast('Verification email sent! Check your inbox.', 'success');
        }
        
        return { success: true };
        
    } catch (error) {
        console.error('Email verification error:', error);
        return { success: false, error: error.message || 'Failed to send verification email' };
    }
}

// ============================================
// CHECK AUTHENTICATION STATUS
// ============================================
function isAuthenticated() {
    return auth && auth.currentUser !== null;
}

// ============================================
// GET CURRENT USER (from localStorage)
// ============================================
function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// ============================================
// GET CURRENT FIREBASE USER
// ============================================
function getCurrentFirebaseUser() {
    return auth ? auth.currentUser : null;
}

// ============================================
// CHECK IF USER IS ADMIN
// ============================================
function isAdmin() {
    const user = getCurrentUser();
    return user?.isAdmin === true;
}

// ============================================
// CHECK IF EMAIL IS VERIFIED
// ============================================
function isEmailVerified() {
    const user = auth?.currentUser;
    return user ? user.emailVerified : false;
}

// ============================================
// GET USER BALANCE
// ============================================
async function getUserBalance(uid = null) {
    try {
        const userId = uid || auth?.currentUser?.uid;
        if (!userId) {
            return { success: false, error: 'User not authenticated', balance: 0, balanceUSD: 0 };
        }
        
        const userDoc = await db.collection('users').doc(userId).get();
        const data = userDoc.data();
        
        return {
            success: true,
            balance: data?.balance || 0,
            balanceUSD: data?.balanceUSD || 0
        };
        
    } catch (error) {
        console.error('Get balance error:', error);
        return { success: false, error: error.message, balance: 0, balanceUSD: 0 };
    }
}

// ============================================
// DELETE USER ACCOUNT
// ============================================
async function deleteUserAccount(password) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }
        
        // Re-authenticate
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
        await user.reauthenticateWithCredential(credential);
        
        // Delete user data from Firestore
        await db.collection('users').doc(user.uid).delete();
        
        // Delete orders, etc. (optional - can be handled by Cloud Function)
        
        // Delete the user account
        await user.delete();
        
        localStorage.removeItem('user');
        
        if (window.showToast) {
            window.showToast('Account deleted successfully', 'info');
        }
        
        window.location.href = '/login.html';
        
        return { success: true };
        
    } catch (error) {
        console.error('Account deletion error:', error);
        
        if (error.code === 'auth/wrong-password') {
            return { success: false, error: 'Incorrect password' };
        }
        
        return { success: false, error: error.message || 'Failed to delete account' };
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate password strength
function validatePasswordStrength(password) {
    if (!password) {
        return { isValid: false, strength: 'Very Weak', score: 0, feedback: ['Password is required'] };
    }
    
    let score = 0;
    const feedback = [];
    
    if (password.length >= 8) {
        score++;
    } else {
        feedback.push('Use at least 8 characters');
    }
    
    if (password.length >= 12) score++;
    
    if (/[a-z]/.test(password)) score++;
    else feedback.push('Add lowercase letters');
    
    if (/[A-Z]/.test(password)) score++;
    else feedback.push('Add uppercase letters');
    
    if (/[0-9]/.test(password)) score++;
    else feedback.push('Add numbers');
    
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    else feedback.push('Add special characters');
    
    const strengths = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
    const strength = strengths[Math.min(score, 5)] || 'Very Weak';
    
    return { 
        isValid: score >= 3, 
        strength: strength, 
        score: score,
        feedback: feedback
    };
}

// Get friendly error message for signup errors
function getFriendlyErrorMessage(error) {
    switch (error.code) {
        case 'auth/email-already-in-use':
            return 'This email is already registered. Please sign in instead.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters.';
        case 'auth/operation-not-allowed':
            return 'Email/password accounts are not enabled. Please contact support.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your internet connection.';
        default:
            return error.message || 'Signup failed. Please try again.';
    }
}

// Get friendly error message for login errors
function getLoginErrorMessage(error) {
    switch (error.code) {
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/user-disabled':
            return 'This account has been disabled. Please contact support.';
        case 'auth/user-not-found':
            return 'No account found with this email. Please sign up first.';
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your internet connection.';
        default:
            return error.message || 'Login failed. Please try again.';
    }
}

// Get friendly error message for password reset
function getPasswordResetErrorMessage(error) {
    switch (error.code) {
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/user-not-found':
            return 'No account found with this email address.';
        case 'auth/too-many-requests':
            return 'Too many requests. Please try again later.';
        default:
            return error.message || 'Failed to send reset email. Please try again.';
    }
}

// ============================================
// AUTH STATE LISTENER (Sync localStorage)
// ============================================
if (typeof auth !== 'undefined' && auth) {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log('✅ User authenticated:', user.email);
            
            try {
                if (typeof db !== 'undefined' && db) {
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        localStorage.setItem('user', JSON.stringify({
                            uid: user.uid,
                            username: userData.username || user.email?.split('@')[0],
                            email: user.email,
                            isAdmin: userData.isAdmin || false,
                            balance: userData.balance || 0
                        }));
                    }
                }
                
                // Dispatch auth event
                window.dispatchEvent(new CustomEvent('auth:stateChanged', {
                    detail: { isAuthenticated: true, user: user }
                }));
                
            } catch (error) {
                console.error('Auth state sync error:', error);
            }
        } else {
            console.log('User signed out');
            
            // Don't clear localStorage on login/signup pages
            const isAuthPage = window.location.pathname.includes('login') || 
                              window.location.pathname.includes('signup') ||
                              window.location.pathname.includes('forgot-password');
            
            if (!isAuthPage) {
                localStorage.removeItem('user');
            }
            
            // Dispatch auth event
            window.dispatchEvent(new CustomEvent('auth:stateChanged', {
                detail: { isAuthenticated: false, user: null }
            }));
        }
    });
}

// ============================================
// PROTECTED ROUTE CHECK
// ============================================
function requireAuth(redirectUrl = '/login.html') {
    if (!isAuthenticated()) {
        const currentPath = window.location.pathname;
        const returnUrl = encodeURIComponent(currentPath);
        window.location.href = `${redirectUrl}?returnUrl=${returnUrl}`;
        return false;
    }
    return true;
}

function requireGuest(redirectUrl = '/dashboard/') {
    if (isAuthenticated()) {
        window.location.href = redirectUrl;
        return false;
    }
    return true;
}

function requireAdmin(redirectUrl = '/dashboard/') {
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
        return false;
    }
    if (!isAdmin()) {
        window.location.href = redirectUrl;
        return false;
    }
    return true;
}

// ============================================
// EXPORT FUNCTIONS (Global)
// ============================================
window.signUp = signUp;
window.signIn = signIn;
window.signOut = signOut;
window.sendPasswordReset = sendPasswordReset;
window.updateUserPassword = updateUserPassword;
window.updateUserProfile = updateUserProfile;
window.sendEmailVerification = sendEmailVerification;
window.isAuthenticated = isAuthenticated;
window.getCurrentUser = getCurrentUser;
window.getCurrentFirebaseUser = getCurrentFirebaseUser;
window.isAdmin = isAdmin;
window.isEmailVerified = isEmailVerified;
window.getUserBalance = getUserBalance;
window.deleteUserAccount = deleteUserAccount;
window.requireAuth = requireAuth;
window.requireGuest = requireGuest;
window.requireAdmin = requireAdmin;

console.log('✅ Auth module v3.0 loaded - Design System compliant');