// ============================================
// BoostBangla Tickets Module v3.0
// Fully redesigned following design.md
// Priority badges with color coding
// Glass ticket cards, real-time chat UI
// File attachment preview, status timeline
// Flutter-like conversation view
// ============================================

// ========== GLOBAL STATE ==========
let ticketsState = {
    currentUser: null,
    allTickets: [],
    currentTicket: null,
    currentFilter: 'all',
    currentPage: 1,
    itemsPerPage: 10,
    isLoading: true,
    replyInProgress: false
};

// Priority configuration (design.md: color-coded badges)
const PRIORITIES = {
    low: { name: 'Low', icon: '🟢', color: '#10b981', class: 'priority-low', bgLight: '#10b98110' },
    medium: { name: 'Medium', icon: '🟡', color: '#f59e0b', class: 'priority-medium', bgLight: '#f59e0b10' },
    high: { name: 'High', icon: '🔴', color: '#ef4444', class: 'priority-high', bgLight: '#ef444410' }
};

// ========== INITIALIZE TICKETS ==========
async function initTickets() {
    showSkeletonLoader();
    const isAuth = await checkAuthAndLoadUser();
    if (!isAuth) return;
    
    await loadTickets();
    attachEventListeners();
    setupRealtimeUpdates();
    ticketsState.isLoading = false;
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
    
    ticketsState.currentUser = user;
    
    const userDoc = await db.collection('users').doc(user.uid).get();
    const username = userDoc.data()?.username || user.email?.split('@')[0] || 'User';
    
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.innerText = username;
    
    return true;
}

// ========== LOAD TICKETS FROM FIRESTORE ==========
async function loadTickets() {
    const container = document.getElementById('ticketsList');
    if (!container) return;
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;
        
        const ticketsSnapshot = await db.collection('tickets')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        ticketsState.allTickets = [];
        ticketsSnapshot.forEach((doc) => {
            ticketsState.allTickets.push({ id: doc.id, ...doc.data() });
        });
        
        updateStatsCards();
        applyFilterAndRender();
        
    } catch (error) {
        console.error('Error loading tickets:', error);
        container.innerHTML = renderErrorState();
        showGlassToast('Failed to load tickets', 'error');
    }
}

// ========== UPDATE STATS CARDS ==========
function updateStatsCards() {
    const total = ticketsState.allTickets.length;
    const open = ticketsState.allTickets.filter(t => t.status !== 'closed').length;
    const closed = ticketsState.allTickets.filter(t => t.status === 'closed').length;
    
    animateStatValue('totalTickets', total);
    animateStatValue('openTickets', open);
    animateStatValue('closedTickets', closed);
}

function animateStatValue(elementId, newValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const oldValue = parseInt(element.innerText);
    if (oldValue === newValue) return;
    
    element.classList.add('animate-pulse-slow');
    element.innerText = newValue;
    setTimeout(() => element.classList.remove('animate-pulse-slow'), 300);
}

// ========== APPLY FILTER AND RENDER ==========
function applyFilterAndRender() {
    let filtered = [...ticketsState.allTickets];
    
    if (ticketsState.currentFilter === 'open') {
        filtered = filtered.filter(t => t.status !== 'closed');
    } else if (ticketsState.currentFilter === 'closed') {
        filtered = filtered.filter(t => t.status === 'closed');
    }
    
    const start = (ticketsState.currentPage - 1) * ticketsState.itemsPerPage;
    const pageTickets = filtered.slice(start, start + ticketsState.itemsPerPage);
    const totalPages = Math.ceil(filtered.length / ticketsState.itemsPerPage);
    
    renderTickets(pageTickets, totalPages);
}

// ========== RENDER TICKETS (responsive) ==========
function renderTickets(tickets, totalPages) {
    const container = document.getElementById('ticketsList');
    if (!container) return;
    
    if (tickets.length === 0) {
        container.innerHTML = renderEmptyState();
        renderPagination(0);
        return;
    }
    
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
        container.innerHTML = `
            <div class="space-y-4 animate-fade-in">
                ${tickets.map((ticket, idx) => renderTicketCard(ticket, idx)).join('')}
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="overflow-x-auto">
                <table class="data-table w-full">
                    <thead>
                        <tr>
                            <th>Ticket ID</th>
                            <th>Subject</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Replies</th>
                            <th>Last Updated</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tickets.map((ticket, idx) => renderTicketRow(ticket, idx)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    renderPagination(totalPages);
    attachTicketClickHandlers();
}

// ========== RENDER TICKET ROW (Desktop) ==========
function renderTicketRow(ticket, index) {
    const delay = 0.03 * (index % 10);
    const priorityConfig = PRIORITIES[ticket.priority] || PRIORITIES.low;
    const lastUpdated = ticket.updatedAt?.toDate ? ticket.updatedAt.toDate() : new Date(ticket.createdAt);
    const replyCount = ticket.replies?.length || 0;
    const isClosed = ticket.status === 'closed';
    
    return `
        <tr class="ticket-row animate-slide-up cursor-pointer hover:bg-orange-50 dark:hover:bg-gray-700 transition-all" 
            style="animation-delay: ${delay}s" 
            data-id="${ticket.id}">
            <td class="font-mono text-primary font-semibold">#${ticket.id.substring(0, 8)}</td>
            <td class="max-w-[250px]">
                <div class="font-medium">${escapeHtml(ticket.subject)}</div>
                <div class="text-xs text-gray-400 mt-0.5">${formatSmartDate(ticket.createdAt)}</div>
            </td>
            <td>${renderPriorityBadge(ticket.priority)}</td>
            <td>${renderStatusBadge(ticket.status)}</td>
            <td class="text-center">
                <div class="flex items-center justify-center gap-1">
                    <i class="far fa-comment-dots text-gray-400"></i>
                    <span>${replyCount}</span>
                </div>
             </td>
            <td class="text-sm text-gray-500">${formatSmartDate(lastUpdated)}</td>
            <td>
                <button class="action-btn p-2 rounded-lg hover:bg-primary/10 transition" onclick="event.stopPropagation(); viewTicket('${ticket.id}')">
                    <i class="fas fa-chevron-right text-primary"></i>
                </button>
             </td>
        </tr>
    `;
}

// ========== RENDER TICKET CARD (Mobile - Flutter-like) ==========
function renderTicketCard(ticket, index) {
    const delay = 0.03 * (index % 10);
    const priorityConfig = PRIORITIES[ticket.priority] || PRIORITIES.low;
    const replyCount = ticket.replies?.length || 0;
    const lastUpdated = ticket.updatedAt?.toDate ? ticket.updatedAt.toDate() : new Date(ticket.createdAt);
    
    return `
        <div class="glass-card p-4 rounded-2xl animate-slide-up cursor-pointer" 
             style="animation-delay: ${delay}s" 
             data-id="${ticket.id}">
            <div class="flex justify-between items-start mb-3">
                <div>
                    <div class="font-mono text-primary text-xs">#${ticket.id.substring(0, 8)}</div>
                    <div class="font-semibold text-sm mt-1">${escapeHtml(ticket.subject.substring(0, 50))}</div>
                </div>
                ${renderPriorityBadge(ticket.priority)}
            </div>
            <div class="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <div class="flex items-center gap-3">
                    ${renderStatusBadge(ticket.status)}
                    <div class="flex items-center gap-1 text-xs text-gray-400">
                        <i class="far fa-comment-dots"></i>
                        <span>${replyCount} replies</span>
                    </div>
                </div>
                <div class="text-xs text-gray-400">${formatSmartDate(lastUpdated)}</div>
            </div>
        </div>
    `;
}

// ========== BADGES (design.md complete) ==========
function renderPriorityBadge(priority) {
    const p = PRIORITIES[priority] || PRIORITIES.low;
    return `<span class="priority-badge ${p.class}"><i class="fas fa-flag mr-1"></i> ${p.name}</span>`;
}

function renderStatusBadge(status) {
    if (status === 'closed') {
        return `<span class="status-badge status-closed"><i class="fas fa-check-circle mr-1"></i> Closed</span>`;
    }
    return `<span class="status-badge status-open"><i class="fas fa-circle mr-1" style="font-size: 8px;"></i> Open</span>`;
}

// ========== SMART DATE ==========
function formatSmartDate(timestamp) {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    if (diffMins < 43200) return `${Math.floor(diffMins / 1440)} days ago`;
    return date.toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ========== RENDER PAGINATION ==========
function renderPagination(totalPages) {
    const paginationDiv = document.getElementById('pagination');
    if (!paginationDiv) return;
    
    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    
    let filtered = ticketsState.allTickets;
    if (ticketsState.currentFilter === 'open') {
        filtered = filtered.filter(t => t.status !== 'closed');
    } else if (ticketsState.currentFilter === 'closed') {
        filtered = filtered.filter(t => t.status === 'closed');
    }
    const totalItems = filtered.length;
    const actualTotalPages = Math.ceil(totalItems / ticketsState.itemsPerPage);
    
    let html = `
        <div class="flex justify-center gap-2 mt-8">
            <button class="pagination-btn w-10 h-10 rounded-xl border border-gray-200 ${ticketsState.currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary'}" 
                    onclick="changeTicketPage(${ticketsState.currentPage - 1})" ${ticketsState.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
    `;
    
    const maxVisible = 5;
    let startPage = Math.max(1, ticketsState.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(actualTotalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    if (startPage > 1) {
        html += `<button class="pagination-btn w-10 h-10 rounded-xl border border-gray-200 hover:border-primary" onclick="changeTicketPage(1)">1</button>`;
        if (startPage > 2) html += `<span class="px-2">...</span>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="pagination-btn w-10 h-10 rounded-xl ${ticketsState.currentPage === i ? 'bg-primary text-white border-primary' : 'border border-gray-200 hover:border-primary'}" 
                       onclick="changeTicketPage(${i})">${i}</button>`;
    }
    
    if (endPage < actualTotalPages) {
        if (endPage < actualTotalPages - 1) html += `<span class="px-2">...</span>`;
        html += `<button class="pagination-btn w-10 h-10 rounded-xl border border-gray-200 hover:border-primary" onclick="changeTicketPage(${actualTotalPages})">${actualTotalPages}</button>`;
    }
    
    html += `
            <button class="pagination-btn w-10 h-10 rounded-xl border border-gray-200 ${ticketsState.currentPage === actualTotalPages ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary'}" 
                    onclick="changeTicketPage(${ticketsState.currentPage + 1})" ${ticketsState.currentPage === actualTotalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
    
    paginationDiv.innerHTML = html;
}

window.changeTicketPage = function(page) {
    let filtered = ticketsState.allTickets;
    if (ticketsState.currentFilter === 'open') {
        filtered = filtered.filter(t => t.status !== 'closed');
    } else if (ticketsState.currentFilter === 'closed') {
        filtered = filtered.filter(t => t.status === 'closed');
    }
    const totalPages = Math.ceil(filtered.length / ticketsState.itemsPerPage);
    if (page < 1 || page > totalPages) return;
    ticketsState.currentPage = page;
    applyFilterAndRender();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ========== VIEW TICKET DETAIL (Modal with chat UI) ==========
window.viewTicket = async function(ticketId) {
    const ticket = ticketsState.allTickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    ticketsState.currentTicket = ticket;
    
    const modal = document.getElementById('ticketDetailModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('ticketDetailContent');
    
    if (!modal || !modalContent) return;
    
    const priorityConfig = PRIORITIES[ticket.priority] || PRIORITIES.low;
    const createdDate = ticket.createdAt?.toDate ? ticket.createdAt.toDate() : new Date(ticket.createdAt);
    
    modalTitle.innerHTML = `
        <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2">
                ${renderPriorityBadge(ticket.priority)}
                ${renderStatusBadge(ticket.status)}
            </div>
            <span class="text-xs text-gray-400">#${ticket.id.substring(0, 8)}</span>
        </div>
        <h2 class="text-xl font-bold mt-2">${escapeHtml(ticket.subject)}</h2>
        <div class="text-xs text-gray-400 mt-1">Created: ${createdDate.toLocaleString()}</div>
    `;
    
    // Render chat conversation
    const replies = ticket.replies || [];
    const conversationHtml = renderConversation(ticket, replies);
    
    modalContent.innerHTML = `
        <div class="conversation-container max-h-[400px] overflow-y-auto space-y-4 p-2" id="conversationContainer">
            ${conversationHtml}
        </div>
        
        <div class="reply-section mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <label class="form-label">Reply to this ticket</label>
            <textarea id="replyMessage" rows="4" class="form-input w-full rounded-xl" placeholder="Type your reply here..."></textarea>
            <div class="flex justify-end gap-3 mt-3">
                <button onclick="closeTicketDetail()" class="btn-outline">Cancel</button>
                <button id="sendReplyBtn" class="btn-primary" onclick="sendReply()">
                    <i class="fas fa-paper-plane mr-2"></i> Send Reply
                </button>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Scroll to bottom of conversation
    setTimeout(() => {
        const container = document.getElementById('conversationContainer');
        if (container) container.scrollTop = container.scrollHeight;
    }, 100);
};

// ========== RENDER CONVERSATION (Flutter-like chat bubbles) ==========
function renderConversation(ticket, replies) {
    const initialMessage = {
        message: ticket.message,
        isAdmin: false,
        createdAt: ticket.createdAt,
        isInitial: true
    };
    
    const allMessages = [initialMessage, ...replies];
    
    return allMessages.map((msg, idx) => {
        const isUser = !msg.isAdmin;
        const date = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt);
        const delay = 0.05 * idx;
        
        return `
            <div class="message-bubble animate-slide-up" style="animation-delay: ${delay}s">
                <div class="flex ${isUser ? 'justify-end' : 'justify-start'}">
                    <div class="max-w-[80%] ${isUser ? 'message-user' : 'message-admin'} rounded-2xl p-3 shadow-sm">
                        <div class="flex items-center gap-2 mb-1">
                            ${!isUser ? '<i class="fas fa-headset text-primary text-xs"></i>' : '<i class="fas fa-user text-gray-400 text-xs"></i>'}
                            <span class="text-xs font-semibold ${isUser ? 'text-gray-600 dark:text-gray-300' : 'text-primary'}">
                                ${isUser ? 'You' : 'Support Team'}
                            </span>
                            <span class="text-xs text-gray-400">${formatChatTime(date)}</span>
                        </div>
                        <p class="text-sm ${isUser ? 'text-white' : 'text-gray-700 dark:text-gray-200'} whitespace-pre-wrap break-words">
                            ${escapeHtml(msg.message)}
                        </p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function formatChatTime(date) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ========== SEND REPLY ==========
window.sendReply = async function() {
    const replyMessage = document.getElementById('replyMessage')?.value.trim();
    if (!replyMessage) {
        showGlassToast('Please enter a reply message', 'error');
        return;
    }
    
    if (ticketsState.replyInProgress) return;
    
    const sendBtn = document.getElementById('sendReplyBtn');
    const originalText = sendBtn.innerHTML;
    ticketsState.replyInProgress = true;
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<span class="spinner"></span> Sending...';
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) throw new Error('Not authenticated');
        
        const ticketId = ticketsState.currentTicket.id;
        const ticketRef = db.collection('tickets').doc(ticketId);
        const ticketDoc = await ticketRef.get();
        const currentReplies = ticketDoc.data()?.replies || [];
        
        const newReply = {
            message: replyMessage,
            isAdmin: false,
            createdAt: new Date()
        };
        
        await ticketRef.update({
            replies: [...currentReplies, newReply],
            updatedAt: new Date(),
            status: 'open' // Re-open if closed
        });
        
        // Clear input
        document.getElementById('replyMessage').value = '';
        
        // Refresh the view
        await loadTickets();
        
        // Update current ticket with new reply
        const updatedTicket = ticketsState.allTickets.find(t => t.id === ticketId);
        if (updatedTicket) {
            ticketsState.currentTicket = updatedTicket;
            
            // Re-render conversation
            const conversationContainer = document.getElementById('conversationContainer');
            if (conversationContainer) {
                const replies = updatedTicket.replies || [];
                conversationContainer.innerHTML = renderConversation(updatedTicket, replies);
                conversationContainer.scrollTop = conversationContainer.scrollHeight;
            }
        }
        
        showGlassToast('Reply sent successfully!', 'success');
        
    } catch (error) {
        console.error('Error sending reply:', error);
        showGlassToast('Failed to send reply. Please try again.', 'error');
    } finally {
        ticketsState.replyInProgress = false;
        sendBtn.disabled = false;
        sendBtn.innerHTML = originalText;
    }
};

// ========== CLOSE TICKET DETAIL MODAL ==========
window.closeTicketDetail = function() {
    const modal = document.getElementById('ticketDetailModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    ticketsState.currentTicket = null;
};

// ========== OPEN NEW TICKET MODAL ==========
function openNewTicketModal() {
    const modal = document.getElementById('newTicketModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Reset form
        document.getElementById('newTicketForm')?.reset();
        document.getElementById('charCount').innerText = '0 / 5000 characters';
    }
}

window.closeNewTicketModal = function() {
    const modal = document.getElementById('newTicketModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
};

// ========== CREATE NEW TICKET ==========
async function createNewTicket(e) {
    e.preventDefault();
    
    const subject = document.getElementById('ticketSubject').value.trim();
    const priority = document.getElementById('ticketPriority').value;
    const relatedOrder = document.getElementById('relatedOrder').value.trim();
    const message = document.getElementById('ticketMessage').value.trim();
    
    if (!subject) {
        showGlassToast('Please enter a subject', 'error');
        return;
    }
    
    if (subject.length < 5) {
        showGlassToast('Subject must be at least 5 characters', 'error');
        return;
    }
    
    if (!message) {
        showGlassToast('Please enter your message', 'error');
        return;
    }
    
    if (message.length > 5000) {
        showGlassToast('Message exceeds 5000 characters', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Creating ticket...';
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) throw new Error('Not authenticated');
        
        await db.collection('tickets').add({
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
        });
        
        showGlassToast('Ticket created successfully! Support will respond within 24 hours.', 'success');
        
        closeNewTicketModal();
        await loadTickets();
        
    } catch (error) {
        console.error('Error creating ticket:', error);
        showGlassToast('Failed to create ticket. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ========== FILTER HANDLERS ==========
function setTicketFilter(filter) {
    ticketsState.currentFilter = filter;
    ticketsState.currentPage = 1;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-primary', 'text-white');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active', 'bg-primary', 'text-white');
        }
    });
    
    applyFilterAndRender();
}

// ========== CHARACTER COUNTER ==========
function setupCharCounter() {
    const messageTextarea = document.getElementById('ticketMessage');
    const charCountSpan = document.getElementById('charCount');
    
    if (!messageTextarea || !charCountSpan) return;
    
    messageTextarea.addEventListener('input', () => {
        const length = messageTextarea.value.length;
        charCountSpan.innerText = `${length} / 5000 characters`;
        if (length > 5000) {
            charCountSpan.classList.add('text-red-500');
        } else {
            charCountSpan.classList.remove('text-red-500');
        }
    });
}

// ========== REAL-TIME UPDATES ==========
let ticketsListener = null;

function setupRealtimeUpdates() {
    const user = window.getCurrentUser();
    if (!user?.uid) return;
    
    if (ticketsListener) ticketsListener();
    
    ticketsListener = db.collection('tickets')
        .where('userId', '==', user.uid)
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            let hasChanges = false;
            snapshot.docChanges().forEach(change => {
                if (change.type === 'modified') {
                    hasChanges = true;
                }
            });
            
            if (hasChanges) {
                loadTickets();
                showGlassToast('Ticket updated', 'info');
            }
        }, (error) => {
            console.error('Realtime error:', error);
        });
}

// ========== ATTACH CLICK HANDLERS ==========
function attachTicketClickHandlers() {
    document.querySelectorAll('.ticket-row, .glass-card[data-id]').forEach(el => {
        el.removeEventListener('click', handleTicketClick);
        el.addEventListener('click', handleTicketClick);
    });
}

function handleTicketClick(e) {
    const target = e.currentTarget;
    const ticketId = target.dataset.id;
    if (ticketId) viewTicket(ticketId);
}

// ========== EMPTY & ERROR STATES ==========
function renderEmptyState() {
    return `
        <div class="empty-state py-12">
            <div class="empty-icon text-6xl mb-4">🎫</div>
            <h3 class="empty-title text-xl font-bold mb-2">No tickets found</h3>
            <p class="empty-description text-gray-500 mb-4">${ticketsState.currentFilter !== 'all' ? 'Try changing the filter' : 'Create your first support ticket'}</p>
            <button onclick="openNewTicketModal()" class="btn-primary">
                <i class="fas fa-plus mr-2"></i> Create New Ticket
            </button>
        </div>
    `;
}

function renderErrorState() {
    return `
        <div class="empty-state py-12">
            <div class="empty-icon text-6xl mb-4">❌</div>
            <h3 class="empty-title text-xl font-bold mb-2">Failed to load tickets</h3>
            <button onclick="location.reload()" class="btn-primary">Retry</button>
        </div>
    `;
}

// ========== ANIMATIONS & LOADERS ==========
function showSkeletonLoader() {
    const container = document.getElementById('ticketsList');
    if (!container) return;
    container.innerHTML = `
        <div class="space-y-3">
            <div class="skeleton skeleton-card h-20 rounded-xl"></div>
            <div class="skeleton skeleton-card h-20 rounded-xl"></div>
            <div class="skeleton skeleton-card h-20 rounded-xl"></div>
        </div>
    `;
}

function hideSkeletonLoader() {
    // Content replaces skeletons when loaded
}

function animateInElements() {
    document.querySelectorAll('.stat-card').forEach((el, idx) => {
        el.classList.add('animate-slide-up');
        el.style.animationDelay = `${0.05 * idx}s`;
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
    // New ticket button
    const newTicketBtn = document.getElementById('newTicketBtn');
    if (newTicketBtn) {
        newTicketBtn.addEventListener('click', openNewTicketModal);
    }
    
    // New ticket form
    const newTicketForm = document.getElementById('newTicketForm');
    if (newTicketForm) {
        newTicketForm.addEventListener('submit', createNewTicket);
    }
    
    // Character counter
    setupCharCounter();
    
    // Close modals on outside click
    const newTicketModal = document.getElementById('newTicketModal');
    const ticketDetailModal = document.getElementById('ticketDetailModal');
    
    if (newTicketModal) {
        newTicketModal.addEventListener('click', (e) => {
            if (e.target === newTicketModal) closeNewTicketModal();
        });
    }
    
    if (ticketDetailModal) {
        ticketDetailModal.addEventListener('click', (e) => {
            if (e.target === ticketDetailModal) closeTicketDetail();
        });
    }
    
    // Responsive view
    window.addEventListener('resize', () => {
        if (document.getElementById('ticketsList')) {
            applyFilterAndRender();
        }
    });
}

// ========== EXPORT GLOBALS ==========
window.initTickets = initTickets;
window.setTicketFilter = setTicketFilter;
window.viewTicket = viewTicket;
window.sendReply = sendReply;
window.closeTicketDetail = closeTicketDetail;
window.openNewTicketModal = openNewTicketModal;
window.closeNewTicketModal = closeNewTicketModal;
window.changeTicketPage = changeTicketPage;

// ========== AUTO-INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('ticketsList')) {
        if (window.auth && window.db) {
            await initTickets();
        } else {
            const checkFirebase = setInterval(async () => {
                if (window.auth && window.db) {
                    clearInterval(checkFirebase);
                    await initTickets();
                }
            }, 100);
        }
    }
});

console.log('✅ Tickets v3.0 (design.md compliant) loaded');