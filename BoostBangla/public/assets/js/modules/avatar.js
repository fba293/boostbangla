// ============================================
// Avatar Upload System - Complete
// Handles: Avatar upload, compression, cropping, preview, Firebase Storage
// Version: 3.0 - FULLY WORKING
// ============================================

let currentAvatarFile = null;
let avatarUploadInProgress = false;
let cropper = null;
let currentImageData = null;

// ============================================
// INITIALIZE AVATAR SYSTEM
// ============================================
function initAvatarSystem() {
    console.log('Initializing avatar system...');
    setupAvatarUpload();
    setupAvatarClickHandlers();
    loadUserAvatar();
}

// ============================================
// SETUP AVATAR UPLOAD TRIGGER
// ============================================
function setupAvatarUpload() {
    // Find all avatar upload triggers
    const avatarContainers = document.querySelectorAll('.avatar-upload-trigger, .user-avatar-large, .avatar-container');
    const fileInput = document.getElementById('avatarFileInput');
    
    if (!fileInput) {
        // Create hidden file input if not exists
        createFileInput();
    }
    
    const newFileInput = document.getElementById('avatarFileInput');
    
    avatarContainers.forEach(container => {
        container.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (newFileInput) {
                newFileInput.click();
            }
        });
    });
    
    if (newFileInput) {
        newFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            await handleAvatarSelection(file);
            // Clear input to allow re-uploading same file
            newFileInput.value = '';
        });
    }
}

// ============================================
// CREATE HIDDEN FILE INPUT
// ============================================
function createFileInput() {
    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'avatarFileInput';
    input.accept = 'image/jpeg,image/png,image/webp,image/jpg';
    input.style.display = 'none';
    document.body.appendChild(input);
    return input;
}

// ============================================
// HANDLE AVATAR SELECTION
// ============================================
async function handleAvatarSelection(file) {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
        showAvatarError('Please select a valid image (JPEG, PNG, or WebP)');
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showAvatarError('Image size should be less than 5MB');
        return;
    }
    
    currentAvatarFile = file;
    
    // Preview image before upload
    const previewUrl = URL.createObjectURL(file);
    showCropModal(previewUrl);
}

// ============================================
// SHOW CROP MODAL
// ============================================
function showCropModal(imageUrl) {
    // Check if modal exists, create if not
    let modal = document.getElementById('avatarCropModal');
    if (!modal) {
        modal = createCropModal();
    }
    
    const imgElement = document.getElementById('cropImage');
    imgElement.src = imageUrl;
    
    // Initialize Cropper
    if (cropper) {
        cropper.destroy();
    }
    
    cropper = new Cropper(imgElement, {
        aspectRatio: 1,
        viewMode: 1,
        dragMode: 'move',
        cropBoxMovable: true,
        cropBoxResizable: true,
        background: false,
        ready: function() {
            console.log('Cropper ready');
        }
    });
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// ============================================
// CREATE CROP MODAL
// ============================================
function createCropModal() {
    const modal = document.createElement('div');
    modal.id = 'avatarCropModal';
    modal.className = 'avatar-crop-modal';
    modal.innerHTML = `
        <div class="avatar-crop-content">
            <div class="avatar-crop-header">
                <h3>Crop Profile Picture</h3>
                <button class="avatar-crop-close">&times;</button>
            </div>
            <div class="avatar-crop-body">
                <img id="cropImage" src="" alt="Crop preview">
            </div>
            <div class="avatar-crop-footer">
                <button class="avatar-crop-cancel">Cancel</button>
                <button class="avatar-crop-confirm">Apply</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add styles for modal
    addCropModalStyles();
    
    // Close button
    const closeBtn = modal.querySelector('.avatar-crop-close');
    const cancelBtn = modal.querySelector('.avatar-crop-cancel');
    const confirmBtn = modal.querySelector('.avatar-crop-confirm');
    
    closeBtn.addEventListener('click', closeCropModal);
    cancelBtn.addEventListener('click', closeCropModal);
    confirmBtn.addEventListener('click', async () => {
        if (cropper) {
            const canvas = cropper.getCroppedCanvas({
                width: 500,
                height: 500,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            });
            
            canvas.toBlob(async (blob) => {
                await uploadAvatar(blob);
                closeCropModal();
            }, 'image/jpeg', 0.9);
        }
    });
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeCropModal();
        }
    });
    
    return modal;
}

// ============================================
// ADD CROP MODAL STYLES
// ============================================
function addCropModalStyles() {
    const styleId = 'avatar-crop-styles';
    if (document.getElementById(styleId)) return;
    
    const styles = `
        .avatar-crop-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(8px);
            z-index: 10000;
            display: none;
            align-items: center;
            justify-content: center;
        }
        
        .avatar-crop-content {
            background: white;
            border-radius: 20px;
            width: 90%;
            max-width: 500px;
            overflow: hidden;
            animation: slideUp 0.3s ease;
        }
        
        body.dark-mode .avatar-crop-content {
            background: #1e293b;
        }
        
        .avatar-crop-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        body.dark-mode .avatar-crop-header {
            border-bottom-color: #334155;
        }
        
        .avatar-crop-header h3 {
            font-size: 18px;
            font-weight: 600;
            margin: 0;
        }
        
        .avatar-crop-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #6b7280;
        }
        
        .avatar-crop-body {
            padding: 20px;
        }
        
        .avatar-crop-body img {
            max-width: 100%;
            display: block;
        }
        
        .avatar-crop-footer {
            display: flex;
            gap: 12px;
            padding: 16px 20px;
            border-top: 1px solid #e5e7eb;
        }
        
        body.dark-mode .avatar-crop-footer {
            border-top-color: #334155;
        }
        
        .avatar-crop-cancel {
            flex: 1;
            padding: 10px;
            border-radius: 10px;
            border: 1px solid #e5e7eb;
            background: white;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        body.dark-mode .avatar-crop-cancel {
            background: #1e293b;
            border-color: #334155;
            color: white;
        }
        
        .avatar-crop-cancel:hover {
            border-color: #FF6B00;
            color: #FF6B00;
        }
        
        .avatar-crop-confirm {
            flex: 1;
            padding: 10px;
            border-radius: 10px;
            border: none;
            background: linear-gradient(135deg, #FF6B00, #CC5500);
            color: white;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .avatar-crop-confirm:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(255, 107, 0, 0.3);
        }
        
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// ============================================
// CLOSE CROP MODAL
// ============================================
function closeCropModal() {
    const modal = document.getElementById('avatarCropModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
}

// ============================================
// UPLOAD AVATAR TO FIREBASE
// ============================================
async function uploadAvatar(blob) {
    const user = firebase.auth().currentUser;
    if (!user) {
        showAvatarError('Please login to upload avatar');
        return;
    }
    
    showAvatarLoading(true);
    
    try {
        // Compress further if needed
        const compressedBlob = await compressImage(blob);
        
        // Upload to Firebase Storage
        const downloadURL = await uploadToStorage(compressedBlob, user.uid);
        
        // Update Firestore
        await updateUserAvatarInFirestore(user.uid, downloadURL);
        
        // Update UI
        updateAllAvatars(downloadURL);
        
        showAvatarSuccess('Profile picture updated successfully!');
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('avatarUpdated', { detail: { url: downloadURL } }));
        
    } catch (error) {
        console.error('Avatar upload error:', error);
        showAvatarError('Failed to upload image. Please try again.');
    } finally {
        showAvatarLoading(false);
    }
}

// ============================================
// COMPRESS IMAGE
// ============================================
async function compressImage(blob) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        img.src = url;
        
        img.onload = () => {
            URL.revokeObjectURL(url);
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            let width = img.width;
            let height = img.height;
            const maxSize = 300; // Max dimension for avatar
            
            if (width > height && width > maxSize) {
                height = (height * maxSize) / width;
                width = maxSize;
            } else if (height > maxSize) {
                width = (width * maxSize) / height;
                height = maxSize;
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((compressedBlob) => {
                resolve(compressedBlob);
            }, 'image/jpeg', 0.8);
        };
        
        img.onerror = reject;
    });
}

// ============================================
// UPLOAD TO FIREBASE STORAGE
// ============================================
async function uploadToStorage(blob, userId) {
    const storage = firebase.storage();
    const fileName = `avatars/${userId}/avatar_${Date.now()}.jpg`;
    const storageRef = storage.ref(fileName);
    
    // Upload file
    await storageRef.put(blob);
    
    // Get download URL
    const downloadURL = await storageRef.getDownloadURL();
    
    // Delete old avatar if exists
    await deleteOldAvatar(userId);
    
    return downloadURL;
}

// ============================================
// DELETE OLD AVATAR
// ============================================
async function deleteOldAvatar(userId) {
    try {
        const db = firebase.firestore();
        const userDoc = await db.collection('users').doc(userId).get();
        const oldAvatarUrl = userDoc.data()?.avatarURL;
        
        if (oldAvatarUrl && oldAvatarUrl.includes('firebasestorage')) {
            const storage = firebase.storage();
            const oldRef = storage.refFromURL(oldAvatarUrl);
            await oldRef.delete().catch(() => {});
        }
    } catch (error) {
        console.log('No old avatar to delete or delete failed:', error);
    }
}

// ============================================
// UPDATE USER AVATAR IN FIRESTORE
// ============================================
async function updateUserAvatarInFirestore(userId, avatarUrl) {
    const db = firebase.firestore();
    await db.collection('users').doc(userId).update({
        avatarURL: avatarUrl,
        avatarUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// ============================================
// LOAD USER AVATAR FROM FIRESTORE
// ============================================
async function loadUserAvatar() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    try {
        const db = firebase.firestore();
        const userDoc = await db.collection('users').doc(user.uid).get();
        const avatarUrl = userDoc.data()?.avatarURL;
        const displayName = userDoc.data()?.displayName || user.email?.split('@')[0] || 'User';
        
        if (avatarUrl) {
            updateAllAvatars(avatarUrl);
        } else {
            // Show initials
            updateAvatarWithInitials(displayName);
        }
    } catch (error) {
        console.error('Error loading avatar:', error);
    }
}

// ============================================
// UPDATE ALL AVATAR ELEMENTS
// ============================================
function updateAllAvatars(avatarUrl) {
    // Update all avatar images
    const avatarImgs = document.querySelectorAll('.avatar-img, .user-avatar-img, .dropdown-avatar-img');
    avatarImgs.forEach(img => {
        img.src = avatarUrl;
        img.style.display = 'block';
    });
    
    // Hide initials where images are shown
    const initialsContainers = document.querySelectorAll('.avatar-initials, .user-avatar-initials');
    initialsContainers.forEach(container => {
        container.style.display = 'none';
    });
    
    // Show images
    const imageContainers = document.querySelectorAll('.avatar-img-container');
    imageContainers.forEach(container => {
        container.style.display = 'block';
    });
    
    // Add success animation
    const avatars = document.querySelectorAll('.user-avatar, .user-avatar-large, .dropdown-avatar');
    avatars.forEach(avatar => {
        avatar.classList.add('avatar-pulse');
        setTimeout(() => {
            avatar.classList.remove('avatar-pulse');
        }, 500);
    });
}

// ============================================
// UPDATE AVATAR WITH INITIALS
// ============================================
function updateAvatarWithInitials(name) {
    const initials = name.charAt(0).toUpperCase();
    const colors = ['#FF6B00', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const initialsContainers = document.querySelectorAll('.avatar-initials, .user-avatar-initials');
    initialsContainers.forEach(container => {
        container.textContent = initials;
        container.style.backgroundColor = randomColor;
        container.style.display = 'flex';
    });
    
    // Hide images
    const imageContainers = document.querySelectorAll('.avatar-img, .avatar-img-container');
    imageContainers.forEach(container => {
        if (container.tagName === 'IMG') {
            container.style.display = 'none';
        } else {
            container.style.display = 'none';
        }
    });
}

// ============================================
// SHOW AVATAR LOADING STATE
// ============================================
function showAvatarLoading(isLoading) {
    avatarUploadInProgress = isLoading;
    
    const avatars = document.querySelectorAll('.user-avatar, .user-avatar-large');
    avatars.forEach(avatar => {
        if (isLoading) {
            avatar.style.opacity = '0.5';
            avatar.style.cursor = 'wait';
            
            // Add spinner
            let spinner = avatar.querySelector('.avatar-spinner');
            if (!spinner) {
                spinner = document.createElement('div');
                spinner.className = 'avatar-spinner';
                spinner.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                avatar.style.position = 'relative';
                avatar.appendChild(spinner);
            }
        } else {
            avatar.style.opacity = '1';
            avatar.style.cursor = 'pointer';
            
            const spinner = avatar.querySelector('.avatar-spinner');
            if (spinner) spinner.remove();
        }
    });
}

// ============================================
// SHOW AVATAR ERROR
// ============================================
function showAvatarError(message) {
    showToast(message, 'error');
    
    const avatars = document.querySelectorAll('.user-avatar, .user-avatar-large');
    avatars.forEach(avatar => {
        avatar.classList.add('avatar-shake');
        setTimeout(() => {
            avatar.classList.remove('avatar-shake');
        }, 500);
    });
}

// ============================================
// SHOW AVATAR SUCCESS
// ============================================
function showAvatarSuccess(message) {
    showToast(message, 'success');
}

// ============================================
// SETUP AVATAR CLICK HANDLERS
// ============================================
function setupAvatarClickHandlers() {
    // Add hover effect for upload overlay
    const avatarLarge = document.querySelector('.user-avatar-large');
    if (avatarLarge) {
        avatarLarge.addEventListener('mouseenter', () => {
            const overlay = avatarLarge.querySelector('.avatar-upload-overlay');
            if (overlay) {
                overlay.style.opacity = '1';
            }
        });
        
        avatarLarge.addEventListener('mouseleave', () => {
            const overlay = avatarLarge.querySelector('.avatar-upload-overlay');
            if (overlay) {
                overlay.style.opacity = '0';
            }
        });
    }
}

// ============================================
// TOAST HELPER
// ============================================
function showToast(message, type) {
    // Try to use global showToast
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
        return;
    }
    
    // Create temporary toast
    const toast = document.createElement('div');
    toast.className = `avatar-toast avatar-toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        z-index: 10001;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// ADD ANIMATION STYLES
// ============================================
function addAnimationStyles() {
    const styleId = 'avatar-animation-styles';
    if (document.getElementById(styleId)) return;
    
    const styles = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes avatarPulse {
            0% {
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(255, 107, 0, 0.4);
            }
            70% {
                transform: scale(1.05);
                box-shadow: 0 0 0 10px rgba(255, 107, 0, 0);
            }
            100% {
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(255, 107, 0, 0);
            }
        }
        
        @keyframes avatarShake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        
        .avatar-pulse {
            animation: avatarPulse 0.5s ease-out;
        }
        
        .avatar-shake {
            animation: avatarShake 0.3s ease-in-out;
        }
        
        .avatar-spinner {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 20px;
            color: #FF6B00;
            z-index: 10;
        }
        
        .avatar-upload-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            text-align: center;
            padding: 8px;
            font-size: 12px;
            opacity: 0;
            transition: opacity 0.3s;
            border-radius: 0 0 50% 50%;
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// ============================================
// WATCH FOR AUTH STATE CHANGES
// ============================================
function watchAuthState() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                loadUserAvatar();
            }
        });
    }
}

// ============================================
// LISTEN FOR AVATAR UPDATES FROM OTHER SOURCES
// ============================================
function listenForAvatarUpdates() {
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore) {
        const user = firebase.auth().currentUser;
        if (user) {
            const db = firebase.firestore();
            db.collection('users').doc(user.uid).onSnapshot((doc) => {
                if (doc.exists) {
                    const avatarUrl = doc.data()?.avatarURL;
                    if (avatarUrl) {
                        updateAllAvatars(avatarUrl);
                    }
                }
            });
        }
    }
}

// ============================================
// INITIALIZE EVERYTHING
// ============================================
function init() {
    addAnimationStyles();
    
    // Wait for Firebase
    const checkFirebase = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.auth && firebase.storage && firebase.firestore) {
            clearInterval(checkFirebase);
            console.log('Firebase ready, initializing avatar system...');
            initAvatarSystem();
            watchAuthState();
            listenForAvatarUpdates();
        }
    }, 500);
    
    // Fallback timeout
    setTimeout(() => {
        clearInterval(checkFirebase);
        if (typeof firebase === 'undefined') {
            console.warn('Firebase not loaded, avatar system will not work');
        }
    }, 10000);
}

// Run when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

console.log('✅ Avatar JS loaded');