// ============================================
// BoostBangla New Ticket Module v3.0
// Fully redesigned following design.md
// Glass form cards with floating labels
// Priority selector with icons and colors
// Character counter with visual feedback
// File attachment with preview and removal
// FAQ accordion with smooth animations
// ============================================

// ========== GLOBAL STATE ==========
let newTicketState = {
    currentUser: null,
    selectedFile: null,
    selectedPriority: 'low',
    isSubmitting: false
};

// Priority configuration (design.md colors)
const PRIORITY_CONFIG = {
    low: { name: 'Low', icon: '🟢', color: '#10b981', bgLight: '#10b98110', description: 'General inquiry or question' },
    medium: { name: 'Medium', icon: '🟡', color: '#f59e0b', bgLight: '#f59e0b10', description: 'Issue affecting service' },
    high: { name: 'High', icon: '🔴', color: '#ef4444', bgLight: '#ef444410', description: 'Urgent problem requiring immediate attention' }
};

// ========== INITIALIZE NEW TICKET PAGE ==========
async function initNewTicket() {
    showSkeletonLoader();
    const isAuth = await checkAuthAndLoadUser();
    if (!isAuth) return;
    
    initPrioritySelector();
    initCharCounter();
    initFileAttachment();
    initFaqAccordion();
    attachEventListeners();
    
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
    
    newTicketState.currentUser = user;
    
    const userDoc = await db.collection('users').doc(user.uid).get();
    const username = userDoc.data()?.username || user.email?.split('@')[0] || 'User';
    
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.innerText = username;
    
    return true;
}

// ========== PRIORITY SELECTOR ==========
function initPrioritySelector() {
    const priorityOptions = document.querySelectorAll('.priority-option');
    
    priorityOptions.forEach(option => {
        option.addEventListener('click', () => {
            const radio = option.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
                newTicketState.selectedPriority = radio.value;
                
                // Update UI
                priorityOptions.forEach(opt => {
                    opt.classList.remove('selected', 'border-primary', 'bg-primary/5', 'scale-105');
                    opt.classList.add('border-gray-200', 'dark:border-gray-700');
                });
                option.classList.add('selected', 'border-primary', 'bg-primary/5', 'scale-105');
                option.classList.remove('border-gray-200', 'dark:border-gray-700');
            }
        });
    });
    
    // Set default selected
    const defaultOption = document.querySelector('.priority-option input[value="low"]')?.closest('.priority-option');
    if (defaultOption) {
        defaultOption.classList.add('selected', 'border-primary', 'bg-primary/5', 'scale-105');
    }
}

// ========== CHARACTER COUNTER ==========
function initCharCounter() {
    const messageTextarea = document.getElementById('ticketMessage');
    const charCountSpan = document.getElementById('charCount');
    
    if (!messageTextarea || !charCountSpan) return;
    
    messageTextarea.addEventListener('input', () => {
        const length = messageTextarea.value.length;
        charCountSpan.innerText = `${length} / 5000 characters`;
        
        if (length > 5000) {
            charCountSpan.classList.add('text-red-500');
            charCountSpan.classList.remove('text-gray-400');
        } else if (length > 4000) {
            charCountSpan.classList.add('text-yellow-500');
            charCountSpan.classList.remove('text-gray-400', 'text-red-500');
        } else {
            charCountSpan.classList.remove('text-red-500', 'text-yellow-500');
            charCountSpan.classList.add('text-gray-400');
        }
    });
}

// ========== FILE ATTACHMENT ==========
function initFileAttachment() {
    const fileInput = document.getElementById('ticketAttachment');
    const attachBtn = document.getElementById('attachFileBtn');
    const attachmentPreview = document.getElementById('attachmentPreview');
    const fileNameSpan = document.getElementById('fileName');
    const removeBtn = document.querySelector('.remove-attachment');
    
    if (!fileInput || !attachBtn) return;
    
    attachBtn.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showGlassToast('File size exceeds 5MB limit. Please choose a smaller file.', 'error');
                fileInput.value = '';
                return;
            }
            
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];
            if (!allowedTypes.includes(file.type)) {
                showGlassToast('File type not supported. Please upload JPG, PNG, GIF, PDF, or TXT.', 'error');
                fileInput.value = '';
                return;
            }
            
            newTicketState.selectedFile = file;
            if (fileNameSpan) fileNameSpan.innerText = file.name;
            if (attachmentPreview) {
                attachmentPreview.classList.remove('hidden');
                attachmentPreview.classList.add('animate-slide-down');
            }
        }
    });
    
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            newTicketState.selectedFile = null;
            fileInput.value = '';
            if (attachmentPreview) {
                attachmentPreview.classList.add('hidden');
                attachmentPreview.classList.remove('animate-slide-down');
            }
        });
    }
}

// ========== FAQ ACCORDION ==========
function initFaqAccordion() {
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const answer = question.nextElementSibling;
            const icon = question.querySelector('.fa-chevron-down');
            const isOpen = answer?.classList.contains('show');
            
            // Close all other answers (optional - for single open at a time)
            // faqQuestions.forEach(q => {
            //     const a = q.nextElementSibling;
            //     const i = q.querySelector('.fa-chevron-down');
            //     if (a && a !== answer) {
            //         a.classList.remove('show');
            //         if (i) i.style.transform = 'rotate(0deg)';
            //     }
            // });
            
            if (answer) {
                if (isOpen) {
                    answer.classList.remove('show');
                    if (icon) icon.style.transform = 'rotate(0deg)';
                } else {
                    answer.classList.add('show');
                    if (icon) icon.style.transform = 'rotate(180deg)';
                }
            }
        });
    });
}

// ========== SUBMIT TICKET ==========
async function submitTicket(e) {
    e.preventDefault();
    
    const subject = document.getElementById('ticketSubject').value.trim();
    const priority = newTicketState.selectedPriority;
    const relatedOrder = document.getElementById('relatedOrder').value.trim();
    const message = document.getElementById('ticketMessage').value.trim();
    
    // Validation
    if (!subject) {
        showGlassToast('Please enter a subject', 'error');
        document.getElementById('ticketSubject').focus();
        return;
    }
    
    if (subject.length < 5) {
        showGlassToast('Subject must be at least 5 characters', 'error');
        document.getElementById('ticketSubject').focus();
        return;
    }
    
    if (!message) {
        showGlassToast('Please enter your message', 'error');
        document.getElementById('ticketMessage').focus();
        return;
    }
    
    if (message.length > 5000) {
        showGlassToast('Message exceeds 5000 characters', 'error');
        return;
    }
    
    if (newTicketState.isSubmitting) return;
    
    const submitBtn = document.getElementById('submitTicketBtn');
    const originalText = submitBtn.innerHTML;
    newTicketState.isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Creating Ticket...';
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) throw new Error('Not authenticated');
        
        // Create ticket document
        const ticketData = {
            userId: user.uid,
            userEmail: user.email,
            subject: subject,
            priority: priority,
            relatedOrderId: relatedOrder || null,
            message: message,
            status: 'open',
            replies: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const ticketRef = await db.collection('tickets').add(ticketData);
        
        // Upload attachment if exists
        if (newTicketState.selectedFile) {
            const attachmentUrl = await uploadAttachment(newTicketState.selectedFile, ticketRef.id);
            if (attachmentUrl) {
                await ticketRef.update({ attachment: attachmentUrl });
            }
        }
        
        showGlassToast('Ticket created successfully! Our support team will respond within 24 hours.', 'success');
        
        // Reset form
        document.getElementById('ticketForm').reset();
        newTicketState.selectedFile = null;
        newTicketState.selectedPriority = 'low';
        
        // Reset priority selector UI
        document.querySelectorAll('.priority-option').forEach(opt => {
            opt.classList.remove('selected', 'border-primary', 'bg-primary/5', 'scale-105');
            opt.classList.add('border-gray-200', 'dark:border-gray-700');
        });
        const defaultOption = document.querySelector('.priority-option input[value="low"]')?.closest('.priority-option');
        if (defaultOption) {
            defaultOption.classList.add('selected', 'border-primary', 'bg-primary/5', 'scale-105');
        }
        
        // Reset attachment preview
        const attachmentPreview = document.getElementById('attachmentPreview');
        if (attachmentPreview) attachmentPreview.classList.add('hidden');
        const fileInput = document.getElementById('ticketAttachment');
        if (fileInput) fileInput.value = '';
        
        // Reset char counter
        const charCountSpan = document.getElementById('charCount');
        if (charCountSpan) charCountSpan.innerText = '0 / 5000 characters';
        
        // Redirect after delay
        setTimeout(() => {
            window.location.href = '/dashboard/tickets.html';
        }, 2000);
        
    } catch (error) {
        console.error('Error creating ticket:', error);
        showGlassToast('Failed to create ticket. Please try again.', 'error');
    } finally {
        newTicketState.isSubmitting = false;
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ========== UPLOAD ATTACHMENT ==========
async function uploadAttachment(file, ticketId) {
    if (!file) return null;
    
    try {
        // Firebase Storage upload
        const storageRef = firebase.storage().ref();
        const fileRef = storageRef.child(`tickets/${ticketId}/${Date.now()}_${file.name}`);
        const snapshot = await fileRef.put(file);
        return await snapshot.ref.getDownloadURL();
    } catch (error) {
        console.error('Upload error:', error);
        showGlassToast('Failed to upload attachment. Ticket created without attachment.', 'warning');
        return null;
    }
}

// ========== CANCEL ==========
function cancelTicket() {
    if (newTicketState.isSubmitting) {
        showGlassToast('Please wait for ticket submission to complete', 'warning');
        return;
    }
    
    if (confirm('Are you sure you want to cancel? Your ticket will not be saved.')) {
        window.location.href = '/dashboard/tickets.html';
    }
}

// ========== ANIMATIONS & LOADERS ==========
function showSkeletonLoader() {
    const container = document.getElementById('ticketForm');
    if (container) {
        container.style.opacity = '0.5';
        container.innerHTML = `
            <div class="space-y-6">
                <div class="skeleton skeleton-card h-32 rounded-2xl"></div>
                <div class="skeleton skeleton-card h-24 rounded-2xl"></div>
                <div class="skeleton skeleton-card h-48 rounded-2xl"></div>
            </div>
        `;
    }
}

function hideSkeletonLoader() {
    const container = document.getElementById('ticketForm');
    if (container) {
        container.style.opacity = '1';
        // Content will be shown when loaded
    }
}

function animateInElements() {
    document.querySelectorAll('.glass-card, .priority-option, .faq-item').forEach((el, idx) => {
        el.classList.add('animate-slide-up');
        el.style.animationDelay = `${0.03 * idx}s`;
    });
}

// ========== HELPER FUNCTIONS ==========
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
    const form = document.getElementById('ticketForm');
    if (form) {
        form.addEventListener('submit', submitTicket);
    }
    
    const cancelBtn = document.getElementById('cancelTicketBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelTicket);
    }
}

// ========== EXPORT GLOBALS ==========
window.initNewTicket = initNewTicket;
window.cancelTicket = cancelTicket;

// ========== AUTO-INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('ticketForm')) {
        if (window.auth && window.db) {
            await initNewTicket();
        } else {
            const checkFirebase = setInterval(async () => {
                if (window.auth && window.db) {
                    clearInterval(checkFirebase);
                    await initNewTicket();
                }
            }, 100);
        }
    }
});

console.log('✅ New Ticket v3.0 (design.md compliant) loaded');