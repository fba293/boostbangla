// ============================================
// BoostBangla Services Module v3.0
// Fully redesigned following design.md
// Desktop: data table | Mobile: card view
// Glass morphism, real-time search, favorites
// ============================================

// ========== GLOBAL STATE ==========
let servicesState = {
    allServices: [],
    filteredServices: [],
    favorites: new Set(),
    currentView: window.innerWidth < 768 ? 'grid' : 'table',
    currentPage: 1,
    itemsPerPage: 25,
    currentCategory: 'all',
    currentSearch: '',
    currentSort: 'name_asc',
    exchangeRate: 120,
    isLoading: true
};

const MARKUP_PERCENTAGE = 15;
const API_PROXY = '/api/proxy.php';

// Category config (design.md colors)
const categoryConfig = {
    youtube: { name: 'YouTube', icon: 'fab fa-youtube', color: '#FF0000', bgLight: '#FF000010' },
    facebook: { name: 'Facebook', icon: 'fab fa-facebook', color: '#1877F2', bgLight: '#1877F210' },
    instagram: { name: 'Instagram', icon: 'fab fa-instagram', color: '#E4405F', bgLight: '#E4405F10' },
    tiktok: { name: 'TikTok', icon: 'fab fa-tiktok', color: '#000000', bgLight: '#00000010' },
    telegram: { name: 'Telegram', icon: 'fab fa-telegram', color: '#26A5E4', bgLight: '#26A5E410' },
    twitter: { name: 'Twitter', icon: 'fab fa-twitter', color: '#1DA1F2', bgLight: '#1DA1F210' },
    traffic: { name: 'Traffic', icon: 'fas fa-chart-line', color: '#10b981', bgLight: '#10b98110' },
    other: { name: 'Other', icon: 'fas fa-ellipsis-h', color: '#6b7280', bgLight: '#6b728010' }
};

// ========== INITIALIZE SERVICES ==========
async function initServices() {
    showSkeletonLoader();
    await Promise.all([loadExchangeRate(), loadFavorites()]);
    await loadServices();
    attachEventListeners();
    setupResponsiveView();
}

// ========== LOAD EXCHANGE RATE (design.md real-time) ==========
async function loadExchangeRate() {
    try {
        const response = await fetch('https://hexarate.paikama.co/api/rates/latest/USD?target=BDT');
        const data = await response.json();
        if (data?.data?.mid) {
            servicesState.exchangeRate = data.data.mid;
            updateRateDisplay();
        }
    } catch (e) {
        console.warn('Exchange rate fallback');
        servicesState.exchangeRate = 120;
        updateRateDisplay();
    }
}

function updateRateDisplay() {
    const rateEl = document.getElementById('exchangeRate');
    if (rateEl) rateEl.innerText = servicesState.exchangeRate.toFixed(2);
}

// ========== FAVORITES (localStorage) ==========
function loadFavorites() {
    const saved = localStorage.getItem('boostbangla_favorites_v3');
    if (saved) {
        servicesState.favorites = new Set(JSON.parse(saved));
    }
}

function saveFavorites() {
    localStorage.setItem('boostbangla_favorites_v3', JSON.stringify([...servicesState.favorites]));
}

window.toggleFavorite = function(serviceId, event) {
    event.stopPropagation();
    if (servicesState.favorites.has(serviceId)) {
        servicesState.favorites.delete(serviceId);
        showGlassToast('Removed from favorites', 'info');
    } else {
        servicesState.favorites.add(serviceId);
        showGlassToast('Added to favorites', 'success');
    }
    saveFavorites();
    filterAndDisplayServices();
};

// ========== LOAD SERVICES FROM API ==========
async function loadServices() {
    const container = document.getElementById('servicesContainer');
    if (!container) return;

    try {
        const response = await fetch(`${API_PROXY}?action=services`);
        const data = await response.json();
        
        let services = [];
        if (data.services && Array.isArray(data.services)) services = data.services;
        else if (Array.isArray(data)) services = data;
        
        if (services.length === 0) {
            services = getSampleServices();
            showGlassToast('Showing demo services', 'info');
        }
        
        servicesState.allServices = services.map(s => ({
            id: s.service || s.id,
            name: s.name,
            rate: parseFloat(s.rate || 1),
            min: parseInt(s.min || 10),
            max: parseInt(s.max || 1000000),
            category: detectCategory(s.name),
            avgTime: s.avg_time || '0-3 Hours',
            dropRate: s.drop_rate || 'Non Drop',
            refillTime: s.refill_time || 'Lifetime',
            speedPerDay: s.speed_per_day || '50K/Day'
        })).filter(s => s.id && s.name);
        
        servicesState.isLoading = false;
        filterAndDisplayServices();
        
    } catch (error) {
        console.error('Services error:', error);
        servicesState.allServices = getSampleServices();
        servicesState.isLoading = false;
        filterAndDisplayServices();
        showGlassToast('Network error. Using demo services.', 'warning');
    }
}

// ========== DETECT CATEGORY FROM NAME ==========
function detectCategory(name) {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('youtube')) return 'youtube';
    if (nameLower.includes('facebook')) return 'facebook';
    if (nameLower.includes('instagram')) return 'instagram';
    if (nameLower.includes('tiktok')) return 'tiktok';
    if (nameLower.includes('telegram')) return 'telegram';
    if (nameLower.includes('twitter')) return 'twitter';
    if (nameLower.includes('traffic')) return 'traffic';
    return 'other';
}

// ========== SAMPLE SERVICES (fallback) ==========
function getSampleServices() {
    return [
        { service: 6205, name: 'YouTube Native Ads Views [Min 1M]', rate: 2.50, min: 1000000, max: 100000000 },
        { service: 6206, name: 'YouTube Native Ads Views [Min 500K]', rate: 2.55, min: 500000, max: 100000000 },
        { service: 6208, name: 'Facebook Followers', rate: 3.20, min: 100, max: 500000 },
        { service: 6209, name: 'Instagram Followers', rate: 5.00, min: 100, max: 500000 },
        { service: 6210, name: 'TikTok Followers', rate: 6.00, min: 100, max: 500000 }
    ];
}

// ========== CALCULATE PRICE (BDT) ==========
function calculatePriceBDT(usdRate) {
    const markedUp = usdRate * (1 + MARKUP_PERCENTAGE / 100);
    return Math.round(markedUp * servicesState.exchangeRate);
}

function formatCurrencyBDT(amount) {
    return '৳' + (amount || 0).toLocaleString('en-BD');
}

// ========== FILTER + SORT ==========
function filterAndDisplayServices() {
    let filtered = [...servicesState.allServices];
    
    // Category filter
    if (servicesState.currentCategory !== 'all') {
        filtered = filtered.filter(s => s.category === servicesState.currentCategory);
    }
    
    // Search filter
    if (servicesState.currentSearch) {
        const searchLower = servicesState.currentSearch.toLowerCase();
        filtered = filtered.filter(s => 
            s.name.toLowerCase().includes(searchLower) || 
            s.id.toString().includes(searchLower)
        );
    }
    
    // Sort
    filtered.sort((a, b) => {
        switch(servicesState.currentSort) {
            case 'name_asc': return a.name.localeCompare(b.name);
            case 'name_desc': return b.name.localeCompare(a.name);
            case 'price_asc': return calculatePriceBDT(a.rate) - calculatePriceBDT(b.rate);
            case 'price_desc': return calculatePriceBDT(b.rate) - calculatePriceBDT(a.rate);
            default: return 0;
        }
    });
    
    servicesState.filteredServices = filtered;
    servicesState.currentPage = 1;
    
    updateStatsDisplay();
    renderServices();
}

// ========== UPDATE STATS DISPLAY ==========
function updateStatsDisplay() {
    const countEl = document.getElementById('serviceCount');
    if (countEl) countEl.innerText = servicesState.filteredServices.length;
}

// ========== RENDER SERVICES (Responsive: Table on Desktop, Cards on Mobile) ==========
function renderServices() {
    const container = document.getElementById('servicesContainer');
    if (!container) return;
    
    const start = (servicesState.currentPage - 1) * servicesState.itemsPerPage;
    const pageServices = servicesState.filteredServices.slice(start, start + servicesState.itemsPerPage);
    const totalPages = Math.ceil(servicesState.filteredServices.length / servicesState.itemsPerPage);
    
    if (pageServices.length === 0) {
        container.innerHTML = renderEmptyState();
        renderPagination(0);
        return;
    }
    
    // Responsive: table on desktop, card grid on mobile
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
        container.innerHTML = `
            <div class="grid grid-cols-1 gap-4 animate-fade-in">
                ${pageServices.map((service, idx) => renderServiceCard(service, idx)).join('')}
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="overflow-x-auto glass-card rounded-2xl">
                <table class="data-table w-full">
                    <thead>
                        <tr>
                            <th class="w-12"></th>
                            <th>ID</th>
                            <th>Service Name</th>
                            <th>Price (per 1K)</th>
                            <th>Speed</th>
                            <th>Min / Max</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pageServices.map((service, idx) => renderServiceRow(service, idx)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    renderPagination(totalPages);
    attachRowClickHandlers();
}

// ========== RENDER SERVICE ROW (Desktop) ==========
function renderServiceRow(service, index) {
    const priceBDT = calculatePriceBDT(service.rate);
    const catConfig = getCategoryConfig(service.category);
    const isFavorite = servicesState.favorites.has(service.id);
    const delay = 0.03 * (index % 10);
    
    return `
        <tr class="service-row animate-slide-up" style="animation-delay: ${delay}s; cursor: pointer;" data-id="${service.id}">
            <td class="text-center">
                <button class="favorite-star-btn w-8 h-8 rounded-full hover:bg-gray-100 transition" data-id="${service.id}" onclick="toggleFavorite(${service.id}, event)">
                    <i class="${isFavorite ? 'fas fa-star text-primary' : 'far fa-star text-gray-400'}"></i>
                </button>
            </td>
            <td class="font-mono text-primary font-semibold">${service.id}</td>
            <td>
                <div class="font-medium text-sm">${escapeHtml(service.name)}</div>
                <div class="flex items-center gap-1 mt-1">
                    <i class="${catConfig.icon} text-xs" style="color: ${catConfig.color}"></i>
                    <span class="text-xs text-gray-500 capitalize">${service.category}</span>
                </div>
            </td>
            <td class="text-primary font-bold text-lg">${formatCurrencyBDT(priceBDT)}</td>
            <td><span class="badge-speed ${getSpeedBadgeClass(service.avgTime)}">${service.avgTime}</span></td>
            <td class="text-sm">${service.min.toLocaleString()} / ${service.max.toLocaleString()}</td>
            <td>
                <button class="btn-view px-3 py-1.5 rounded-xl text-primary hover:bg-primary/10 transition" onclick="event.stopPropagation(); openServiceModal(${service.id})">
                    <i class="fas fa-eye mr-1"></i> View
                </button>
            </td>
        </tr>
    `;
}

// ========== RENDER SERVICE CARD (Mobile - Flutter-like) ==========
function renderServiceCard(service, index) {
    const priceBDT = calculatePriceBDT(service.rate);
    const catConfig = getCategoryConfig(service.category);
    const isFavorite = servicesState.favorites.has(service.id);
    const delay = 0.03 * (index % 10);
    
    return `
        <div class="glass-card p-4 rounded-2xl animate-slide-up cursor-pointer" style="animation-delay: ${delay}s" data-id="${service.id}">
            <div class="flex justify-between items-start mb-3">
                <div class="flex items-center gap-2">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: ${catConfig.bgLight}">
                        <i class="${catConfig.icon}" style="color: ${catConfig.color}"></i>
                    </div>
                    <div>
                        <div class="font-mono text-xs text-primary">ID: ${service.id}</div>
                        <div class="font-semibold text-sm">${escapeHtml(service.name.substring(0, 50))}${service.name.length > 50 ? '...' : ''}</div>
                    </div>
                </div>
                <button class="favorite-star-btn w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition" data-id="${service.id}" onclick="toggleFavorite(${service.id}, event)">
                    <i class="${isFavorite ? 'fas fa-star text-primary text-xl' : 'far fa-star text-gray-400 text-xl'}"></i>
                </button>
            </div>
            <div class="flex justify-between items-center mb-3">
                <div>
                    <span class="text-xs text-gray-500">Price per 1K</span>
                    <div class="text-primary font-black text-2xl">${formatCurrencyBDT(priceBDT)}</div>
                </div>
                <div class="text-right">
                    <span class="text-xs text-gray-500">Speed</span>
                    <div><span class="badge-speed ${getSpeedBadgeClass(service.avgTime)}">${service.avgTime}</span></div>
                </div>
            </div>
            <div class="flex justify-between items-center text-xs text-gray-500 mb-3">
                <span><i class="fas fa-arrow-down mr-1"></i> Min: ${service.min.toLocaleString()}</span>
                <span><i class="fas fa-arrow-up mr-1"></i> Max: ${service.max.toLocaleString()}</span>
            </div>
            <button class="w-full btn-primary py-2.5 rounded-xl text-sm" onclick="event.stopPropagation(); openServiceModal(${service.id})">
                <i class="fas fa-shopping-cart mr-2"></i> Order Now
            </button>
        </div>
    `;
}

// ========== CATEGORY CONFIG HELPER ==========
function getCategoryConfig(category) {
    return categoryConfig[category] || categoryConfig.other;
}

// ========== SPEED BADGE CLASS ==========
function getSpeedBadgeClass(avgTime) {
    if (!avgTime) return 'badge-medium';
    const time = avgTime.toLowerCase();
    if (time.includes('instant') || time.includes('minute')) return 'badge-fast';
    if (time.includes('hour') && !time.includes('day')) return 'badge-fast';
    if (time.includes('day')) return 'badge-slow';
    return 'badge-medium';
}

// ========== RENDER EMPTY STATE (design.md) ==========
function renderEmptyState() {
    return `
        <div class="empty-state py-12">
            <div class="empty-icon text-6xl mb-4">🔍</div>
            <h3 class="empty-title text-xl font-bold mb-2">No services found</h3>
            <p class="empty-description text-gray-500 mb-4">Try adjusting your search or filters</p>
            <button onclick="clearAllFilters()" class="btn-primary">Clear Filters</button>
        </div>
    `;
}

// ========== PAGINATION (design.md) ==========
function renderPagination(totalPages) {
    const paginationDiv = document.getElementById('pagination');
    if (!paginationDiv) return;
    
    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    
    let html = `
        <div class="flex justify-center gap-2 mt-8">
            <button class="pagination-btn w-10 h-10 rounded-xl border border-gray-200 ${servicesState.currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary'}" 
                    onclick="changePage(${servicesState.currentPage - 1})" ${servicesState.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
    `;
    
    const maxVisible = 5;
    let startPage = Math.max(1, servicesState.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    if (startPage > 1) {
        html += `<button class="pagination-btn w-10 h-10 rounded-xl border border-gray-200 hover:border-primary" onclick="changePage(1)">1</button>`;
        if (startPage > 2) html += `<span class="px-2">...</span>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="pagination-btn w-10 h-10 rounded-xl ${servicesState.currentPage === i ? 'bg-primary text-white border-primary' : 'border border-gray-200 hover:border-primary'}" 
                       onclick="changePage(${i})">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="px-2">...</span>`;
        html += `<button class="pagination-btn w-10 h-10 rounded-xl border border-gray-200 hover:border-primary" onclick="changePage(${totalPages})">${totalPages}</button>`;
    }
    
    html += `
            <button class="pagination-btn w-10 h-10 rounded-xl border border-gray-200 ${servicesState.currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary'}" 
                    onclick="changePage(${servicesState.currentPage + 1})" ${servicesState.currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
    
    paginationDiv.innerHTML = html;
}

window.changePage = function(page) {
    const totalPages = Math.ceil(servicesState.filteredServices.length / servicesState.itemsPerPage);
    if (page < 1 || page > totalPages) return;
    servicesState.currentPage = page;
    renderServices();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ========== ATTACH ROW CLICK HANDLERS ==========
function attachRowClickHandlers() {
    document.querySelectorAll('.service-row, .glass-card[data-id]').forEach(el => {
        el.removeEventListener('click', handleRowClick);
        el.addEventListener('click', handleRowClick);
    });
}

function handleRowClick(e) {
    const target = e.currentTarget;
    const serviceId = target.dataset.id;
    if (serviceId) openServiceModal(parseInt(serviceId));
}

// ========== SERVICE MODAL (design.md glass-card) ==========
window.openServiceModal = function(serviceId) {
    const service = servicesState.allServices.find(s => s.id == serviceId);
    if (!service) return;
    
    const priceBDT = calculatePriceBDT(service.rate);
    const catConfig = getCategoryConfig(service.category);
    const modal = document.getElementById('serviceModal');
    const modalContent = document.getElementById('modalContent');
    const modalTitle = document.getElementById('modalTitle');
    
    if (!modal || !modalContent) return;
    
    modalTitle.innerHTML = `<i class="${catConfig.icon} mr-2" style="color: ${catConfig.color}"></i>${escapeHtml(service.name)}`;
    
    modalContent.innerHTML = `
        <div class="space-y-4">
            <div class="text-center">
                <div class="text-3xl font-black text-primary">${formatCurrencyBDT(priceBDT)}</div>
                <div class="text-sm text-gray-500">per 1000 units</div>
            </div>
            
            <div class="glass-card p-4 rounded-xl text-sm">
                <div class="grid grid-cols-2 gap-3">
                    <div><span class="text-gray-500">Min Order:</span><br><strong>${service.min.toLocaleString()}</strong></div>
                    <div><span class="text-gray-500">Max Order:</span><br><strong>${service.max.toLocaleString()}</strong></div>
                    <div><span class="text-gray-500">Speed:</span><br><span class="badge-speed ${getSpeedBadgeClass(service.avgTime)}">${service.avgTime}</span></div>
                    <div><span class="text-gray-500">Drop Rate:</span><br><strong>${service.dropRate}</strong></div>
                    <div><span class="text-gray-500">Refill:</span><br><strong>${service.refillTime}</strong></div>
                    <div><span class="text-gray-500">Daily Speed:</span><br><strong>${service.speedPerDay}</strong></div>
                </div>
            </div>
            
            <div class="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-xl text-sm text-yellow-700 dark:text-yellow-400">
                <i class="fas fa-info-circle mr-2"></i> Please read service description before ordering
            </div>
            
            <div class="flex gap-3">
                <button onclick="closeServiceModal()" class="flex-1 btn-outline">Cancel</button>
                <button onclick="orderFromModal(${service.id})" class="flex-1 btn-primary"><i class="fas fa-shopping-cart mr-2"></i> Order Now</button>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

window.closeServiceModal = function() {
    const modal = document.getElementById('serviceModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
};

// ========== ORDER FROM MODAL ==========
window.orderFromModal = function(serviceId) {
    closeServiceModal();
    const service = servicesState.allServices.find(s => s.id == serviceId);
    if (service && typeof window.openOrderModal === 'function') {
        window.openOrderModal(service.id, service.name, service.min, service.max, service.rate);
    } else {
        window.location.href = `/public/pages/dashboard/new-order.html?serviceId=${serviceId}`;
    }
};

// ========== FILTER HANDLERS ==========
function setCategory(category) {
    servicesState.currentCategory = category;
    servicesState.currentPage = 1;
    
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-primary', 'text-white');
        if (btn.dataset.cat === category) {
            btn.classList.add('active', 'bg-primary', 'text-white');
        }
    });
    
    filterAndDisplayServices();
}

function setSort(sort) {
    servicesState.currentSort = sort;
    filterAndDisplayServices();
}

function clearAllFilters() {
    servicesState.currentSearch = '';
    servicesState.currentCategory = 'all';
    servicesState.currentPage = 1;
    
    const searchInput = document.getElementById('searchServices');
    if (searchInput) searchInput.value = '';
    
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-primary', 'text-white');
        if (btn.dataset.cat === 'all') {
            btn.classList.add('active', 'bg-primary', 'text-white');
        }
    });
    
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) sortSelect.value = 'name_asc';
    servicesState.currentSort = 'name_asc';
    
    filterAndDisplayServices();
    showGlassToast('All filters cleared', 'info');
}

// ========== SEARCH WITH DEBOUNCE ==========
function setupSearch() {
    const searchInput = document.getElementById('searchServices');
    const clearBtn = document.getElementById('clearSearchBtn');
    
    if (!searchInput) return;
    
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        if (clearBtn) {
            if (e.target.value.length > 0) clearBtn.classList.remove('hidden');
            else clearBtn.classList.add('hidden');
        }
        debounceTimer = setTimeout(() => {
            servicesState.currentSearch = e.target.value;
            servicesState.currentPage = 1;
            filterAndDisplayServices();
        }, 300);
    });
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.classList.add('hidden');
            servicesState.currentSearch = '';
            servicesState.currentPage = 1;
            filterAndDisplayServices();
        });
    }
}

// ========== RESPONSIVE VIEW TOGGLE ==========
function setupResponsiveView() {
    window.addEventListener('resize', () => {
        const wasMobile = servicesState.currentView === 'grid';
        const isMobile = window.innerWidth < 768;
        if (wasMobile !== isMobile) {
            servicesState.currentView = isMobile ? 'grid' : 'table';
            renderServices();
        }
    });
}

// ========== SKELETON LOADER ==========
function showSkeletonLoader() {
    const container = document.getElementById('servicesContainer');
    if (!container) return;
    container.innerHTML = `
        <div class="space-y-3">
            <div class="skeleton skeleton-card h-16"></div>
            <div class="skeleton skeleton-card h-16"></div>
            <div class="skeleton skeleton-card h-16"></div>
        </div>
    `;
}

// ========== EVENT LISTENERS ==========
function attachEventListeners() {
    setupSearch();
    
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => setSort(e.target.value));
    }
    
    const pageSizeSelect = document.getElementById('pageSize');
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', (e) => {
            servicesState.itemsPerPage = parseInt(e.target.value);
            servicesState.currentPage = 1;
            renderServices();
        });
    }
}

// ========== GLASS TOAST ==========
function showGlassToast(message, type = 'success') {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else {
        console.log(`[${type}] ${message}`);
    }
}

// ========== ESCAPE HTML ==========
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ========== EXPORT GLOBALS ==========
window.initServices = initServices;
window.setCategory = setCategory;
window.clearAllFilters = clearAllFilters;
window.openServiceModal = openServiceModal;
window.closeServiceModal = closeServiceModal;
window.orderFromModal = orderFromModal;
window.changePage = changePage;

// ========== AUTO-INIT ==========
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('servicesContainer')) {
        if (window.auth && window.db && window.auth.currentUser) {
            initServices();
        } else {
            const checkAuth = setInterval(() => {
                if (window.auth && window.db && window.auth.currentUser) {
                    clearInterval(checkAuth);
                    initServices();
                }
            }, 100);
        }
    }
});

console.log('✅ Services v3.0 (design.md compliant) loaded');
