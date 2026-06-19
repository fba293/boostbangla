(function () {
    const DEFAULT_AVATAR = '/public/assets/public/assets/images/avatars/default-avatar.svg';
    const CACHE_KEY = 'boostbangla_avatar_url';
    let uploadInput = null;
    let isInitialized = false;
    let isUploading = false;

    function currentUser() {
        return window.firebase?.auth ? firebase.auth().currentUser : null;
    }

    function ensureStorageSdk() {
        return new Promise((resolve, reject) => {
            if (window.firebase?.storage) return resolve();
            const existing = document.querySelector('script[data-firebase-storage-sdk]');
            if (existing) {
                existing.addEventListener('load', () => resolve(), { once: true });
                existing.addEventListener('error', reject, { once: true });
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://www.gstatic.com/firebasejs/8.10.1/firebase-storage.js';
            script.dataset.firebaseStorageSdk = 'true';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Firebase Storage SDK failed to load'));
            document.head.appendChild(script);
        });
    }

    function avatarSelectors() {
        return [
            '#sidebarUserAvatarImg',
            '#headerUserAvatar',
            '#userMenuAvatarImg',
            '#accountAvatarImg',
            '.avatar-img',
            '.user-avatar-img',
            '.dropdown-avatar-img'
        ].join(',');
    }

    function initialSelectors() {
        return [
            '#sidebarAvatarInitials',
            '#headerAvatarInitials',
            '#userMenuAvatarInitials',
            '.avatar-initials',
            '.user-avatar-initials'
        ].join(',');
    }

    function setInitials(user) {
        const name = user?.displayName || user?.email || 'User';
        const initials = name.trim().split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'U';
        document.querySelectorAll(initialSelectors()).forEach(el => {
            el.textContent = initials;
        });
    }

    function updateAll(url) {
        const avatarUrl = url || localStorage.getItem(CACHE_KEY) || DEFAULT_AVATAR;
        document.querySelectorAll(avatarSelectors()).forEach(img => {
            if (img && img.tagName === 'IMG') img.src = avatarUrl;
        });
        document.querySelectorAll(initialSelectors()).forEach(el => {
            el.style.display = avatarUrl && avatarUrl !== DEFAULT_AVATAR ? 'none' : '';
        });
        if (avatarUrl && avatarUrl !== DEFAULT_AVATAR) localStorage.setItem(CACHE_KEY, avatarUrl);
        window.dispatchEvent(new CustomEvent('avatarUpdated', { detail: { url: avatarUrl } }));
    }

    function createUploadInput() {
        if (uploadInput) return uploadInput;
        uploadInput = document.createElement('input');
        uploadInput.type = 'file';
        uploadInput.accept = 'image/jpeg,image/png,image/webp';
        uploadInput.style.display = 'none';
        uploadInput.addEventListener('change', async () => {
            const file = uploadInput.files?.[0];
            uploadInput.value = '';
            if (file) await upload(file);
        });
        document.body.appendChild(uploadInput);
        return uploadInput;
    }

    function bindTriggers() {
        const selectors = [
            '#sidebarAvatarUpload',
            '#sidebarUserAvatar',
            '#userMenuAvatarEditBtn',
            '#userMenuAvatarWrapper',
            '#accountAvatarUpload',
            '.avatar-upload-trigger'
        ].join(',');
        document.querySelectorAll(selectors).forEach(trigger => {
            if (trigger.dataset.avatarBound === 'true') return;
            trigger.dataset.avatarBound = 'true';
            trigger.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                createUploadInput().click();
            });
        });
    }

    function compress(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    const max = 300;
                    const scale = Math.min(1, max / Math.max(img.width, img.height));
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.round(img.width * scale);
                    canvas.height = Math.round(img.height * scale);
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob(blob => {
                        if (!blob) reject(new Error('Unable to compress image'));
                        else resolve(blob);
                    }, 'image/jpeg', 0.8);
                };
                img.onerror = reject;
                img.src = reader.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async function upload(file) {
        if (isUploading) return;
        const user = currentUser();
        if (!user) {
            window.showToast?.('Please login to upload avatar', 'warning');
            return;
        }
        if (!file.type.startsWith('image/')) {
            window.showToast?.('Please select an image file', 'warning');
            return;
        }

        isUploading = true;
        try {
            await ensureStorageSdk();
            const blob = await compress(file);
            const ref = firebase.storage().ref(`avatars/${user.uid}/avatar_${Date.now()}.jpg`);
            await ref.put(blob, { contentType: 'image/jpeg' });
            const url = await ref.getDownloadURL();

            if (firebase.firestore) {
                await firebase.firestore().collection('users').doc(user.uid).set({
                    avatarURL: url,
                    avatarUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            updateAll(url);
            window.showToast?.('Avatar updated', 'success');
        } catch (error) {
            console.error('Avatar upload failed:', error);
            window.showToast?.(error.message || 'Avatar upload failed', 'error');
        } finally {
            isUploading = false;
        }
    }

    async function loadCurrent() {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) updateAll(cached);

        const user = currentUser();
        setInitials(user);
        if (!user || !firebase.firestore) return;

        try {
            const snap = await firebase.firestore().collection('users').doc(user.uid).get();
            const url = snap.data()?.avatarURL || snap.data()?.photoURL || user.photoURL;
            if (url) updateAll(url);
        } catch (error) {
            console.warn('Avatar load failed:', error);
        }
    }

    function init() {
        if (isInitialized) return;
        isInitialized = true;
        createUploadInput();
        bindTriggers();
        loadCurrent();
        setInterval(bindTriggers, 1000);
        window.addEventListener('avatarUpdated', event => updateAll(event.detail?.url));
        if (window.firebase?.auth) firebase.auth().onAuthStateChanged(() => loadCurrent());
    }

    window.BOOSTBANGLA_AVATAR_MANAGER = {
        init,
        upload,
        updateAll,
        loadCurrent
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
