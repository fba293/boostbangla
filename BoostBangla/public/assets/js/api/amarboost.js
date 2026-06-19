// ============================================
// amarboost.js - Triple API Integration - BoostBangla Design System v3.0
// API Keys are handled server-side via PHP proxy (secure)
// Version: 3.0 - DESIGN SYSTEM COMPLIANT
// ============================================

const API_PROXY = '/public/php/api-proxy.php';

// API Configuration
const APIS = {
    amarboost: {
        name: 'AmarBoost',
        markup: 30,
        priority: 1,
        enabled: true,
        description: 'Primary service provider with best rates'
    },
    smmsun: {
        name: 'SMMSun',
        markup: 25,
        priority: 2,
        enabled: true,
        description: 'Secondary provider with competitive pricing'
    },
    quickpanely: {
        name: 'QuickPanely',
        markup: 28,
        priority: 3,
        enabled: true,
        description: 'Fast delivery service'
    }
};

let currentAPI = 'amarboost';
let allServices = [];
let serviceCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 300000; // 5 minutes
let pendingRequests = new Map();
let rateLimitQueue = [];
let isProcessingQueue = false;

// ============================================
// PROXY API CALLER (Secure - keys on server)
// ============================================
async function callAPI(action, params = {}, method = 'GET') {
    const requestId = `${action}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    // Check for duplicate pending requests
    const pendingKey = `${action}_${JSON.stringify(params)}`;
    if (pendingRequests.has(pendingKey)) {
        return pendingRequests.get(pendingKey);
    }
    
    const promise = new Promise(async (resolve, reject) => {
        try {
            let url = new URL(API_PROXY);
            url.searchParams.append('action', action);
            
            let options = {
                method: method,
                headers: {
                    'Accept': 'application/json',
                    'X-Request-ID': requestId
                }
            };
            
            if (method === 'POST') {
                const formData = new URLSearchParams();
                Object.keys(params).forEach(key => {
                    if (params[key] !== undefined && params[key] !== null) {
                        formData.append(key, params[key]);
                    }
                });
                options.body = formData;
                options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            } else {
                Object.keys(params).forEach(key => {
                    if (params[key] !== undefined && params[key] !== null) {
                        url.searchParams.append(key, params[key]);
                    }
                });
            }
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            options.signal = controller.signal;
            
            const response = await fetch(url.toString(), options);
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            resolve(data);
        } catch (error) {
            console.error(`API call failed (${action}):`, error);
            reject(error);
        } finally {
            pendingRequests.delete(pendingKey);
        }
    });
    
    pendingRequests.set(pendingKey, promise);
    return promise;
}

// ============================================
// GET SERVICES (with caching and retry)
// ============================================
async function getServices(forceRefresh = false, retryCount = 0) {
    const now = Date.now();
    if (!forceRefresh && serviceCache && (now - lastFetchTime) < CACHE_DURATION) {
        console.log(`📦 Using cached services (${serviceCache.length} total)`);
        return serviceCache;
    }
    
    console.log('🔄 Fetching services...');
    
    try {
        const services = await callAPI('services');
        
        if (services && Array.isArray(services) && services.length) {
            const servicesWithSource = services.map(s => ({
                ...s,
                source: 'amarboost',
                sourceName: 'AmarBoost',
                baseRate: parseFloat(s.rate) || 0,
                markup: APIS.amarboost.markup,
                rateWithMarkup: calculatePriceWithMarkup(parseFloat(s.rate) || 0, APIS.amarboost.markup),
                category: s.category || 'Uncategorized',
                minOrder: parseInt(s.min) || 1,
                maxOrder: parseInt(s.max) || 100000,
                isActive: s.status === 'active'
            }));
            
            allServices = servicesWithSource;
            serviceCache = allServices;
            lastFetchTime = now;
            console.log(`✅ Loaded ${allServices.length} services`);
            
            // Dispatch event
            window.dispatchEvent(new CustomEvent('services:loaded', {
                detail: { count: allServices.length, source: 'amarboost' }
            }));
            
            return allServices;
        } else {
            if (retryCount < 3) {
                console.log(`⚠️ No services returned, retrying... (${retryCount + 1}/3)`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                return getServices(forceRefresh, retryCount + 1);
            }
            console.warn('No services returned from API after retries');
            return serviceCache || [];
        }
    } catch (error) {
        console.error('Failed to fetch services:', error);
        
        if (retryCount < 3) {
            console.log(`🔄 Retrying... (${retryCount + 1}/3)`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            return getServices(forceRefresh, retryCount + 1);
        }
        
        if (window.showToast) {
            window.showToast('Failed to load services. Using cached data.', 'warning', 4000);
        }
        
        return serviceCache || [];
    }
}

// ============================================
// PLACE ORDER
// ============================================
async function placeOrder(serviceId, link, quantity, additionalParams = {}) {
    if (!serviceId || !link || !quantity) {
        throw new Error('Service ID, link, and quantity are required');
    }
    
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1) {
        throw new Error('Quantity must be a positive number');
    }
    
    const formData = {
        action: 'add',
        service: serviceId,
        link: link,
        quantity: qty
    };
    
    Object.keys(additionalParams).forEach(key => {
        if (additionalParams[key] !== undefined && additionalParams[key] !== null) {
            formData[key] = additionalParams[key];
        }
    });
    
    try {
        const result = await callAPI('add', formData, 'POST');
        
        if (result.order) {
            // Store last order ID for quick copy
            localStorage.setItem('lastOrderId', result.order);
            
            if (window.showToast) {
                window.showToast(`Order #${result.order} placed successfully!`, 'success');
            }
            
            // Play notification sound
            if (window.playNotificationSound) {
                window.playNotificationSound('order');
            }
        }
        
        return result;
    } catch (error) {
        console.error('Order placement failed:', error);
        if (window.showToast) {
            window.showToast('Failed to place order. Please try again.', 'error');
        }
        throw error;
    }
}

// ============================================
// GET ORDER STATUS
// ============================================
async function getOrderStatus(orderId) {
    if (!orderId) {
        throw new Error('Order ID is required');
    }
    
    try {
        return await callAPI('status', { order: orderId });
    } catch (error) {
        console.error('Failed to get order status:', error);
        throw error;
    }
}

// ============================================
// GET BALANCE
// ============================================
async function getBalance() {
    try {
        const result = await callAPI('balance');
        return result.balance || 0;
    } catch (error) {
        console.error('Failed to get balance:', error);
        return 0;
    }
}

// ============================================
// CREATE REFILL
// ============================================
async function createRefill(orderId) {
    if (!orderId) {
        throw new Error('Order ID is required');
    }
    
    try {
        const result = await callAPI('refill', { order: orderId });
        
        if (window.showToast) {
            window.showToast(`Refill requested for order #${orderId}`, 'info');
        }
        
        return result;
    } catch (error) {
        console.error('Refill failed:', error);
        if (window.showToast) {
            window.showToast('Refill request failed. Please contact support.', 'error');
        }
        throw error;
    }
}

// ============================================
// CANCEL ORDER
// ============================================
async function cancelOrder(orderId) {
    if (!orderId) {
        throw new Error('Order ID is required');
    }
    
    try {
        const result = await callAPI('cancel', { orders: orderId });
        
        if (window.showToast) {
            window.showToast(`Cancellation requested for order #${orderId}`, 'info');
        }
        
        return result;
    } catch (error) {
        console.error('Cancel failed:', error);
        if (window.showToast) {
            window.showToast('Cancellation failed. Please contact support.', 'error');
        }
        throw error;
    }
}

// ============================================
// GET SERVICE BY ID
// ============================================
function getServiceById(serviceId) {
    if (!allServices.length) {
        console.warn('Services not loaded yet');
        return null;
    }
    return allServices.find(s => s.service == serviceId);
}

// ============================================
// CALCULATE PRICE WITH MARKUP
// ============================================
function calculatePriceWithMarkup(usdPrice, markupPercentage = 30) {
    const price = parseFloat(usdPrice);
    if (isNaN(price)) return 0;
    return price * (1 + markupPercentage / 100);
}

// ============================================
// CALCULATE TOTAL PRICE
// ============================================
function calculateTotalPrice(serviceId, quantity, additionalParams = {}) {
    const service = getServiceById(serviceId);
    if (!service) return 0;
    
    let basePrice = service.baseRate;
    
    // Check for custom parameters that affect pricing
    if (additionalParams.customData && additionalParams.customData !== '') {
        // Some services have custom pricing for specific URLs
        basePrice = basePrice * 1.1; // 10% premium for custom content
    }
    
    const pricePerUnit = calculatePriceWithMarkup(basePrice, service.markup);
    return pricePerUnit * quantity;
}

// ============================================
// GET CHEAPEST SERVICE
// ============================================
async function getCheapestService(serviceName) {
    const services = await getServices();
    const matching = services.filter(s => 
        s.name.toLowerCase().includes(serviceName.toLowerCase())
    );
    
    if (matching.length === 0) return null;
    matching.sort((a, b) => a.baseRate - b.baseRate);
    return matching[0];
}

// ============================================
// SEARCH SERVICES
// ============================================
async function searchServices(query, options = {}) {
    const services = await getServices();
    const queryLower = query.toLowerCase();
    
    let results = services.filter(service => {
        const nameMatch = service.name.toLowerCase().includes(queryLower);
        const categoryMatch = service.category && service.category.toLowerCase().includes(queryLower);
        const idMatch = service.service.toString().includes(query);
        
        return nameMatch || categoryMatch || idMatch;
    });
    
    // Apply filters
    if (options.category && options.category !== 'all') {
        results = results.filter(s => s.category === options.category);
    }
    
    if (options.minPrice) {
        results = results.filter(s => s.rateWithMarkup >= options.minPrice);
    }
    
    if (options.maxPrice) {
        results = results.filter(s => s.rateWithMarkup <= options.maxPrice);
    }
    
    // Sort
    if (options.sortBy === 'price_asc') {
        results.sort((a, b) => a.rateWithMarkup - b.rateWithMarkup);
    } else if (options.sortBy === 'price_desc') {
        results.sort((a, b) => b.rateWithMarkup - a.rateWithMarkup);
    } else if (options.sortBy === 'name_asc') {
        results.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return results.slice(0, options.limit || 100);
}

// ============================================
// GET CATEGORIES
// ============================================
async function getCategories() {
    const services = await getServices();
    const categories = new Set();
    services.forEach(service => {
        if (service.category) categories.add(service.category);
    });
    return Array.from(categories).sort();
}

// ============================================
// FORCE REFRESH SERVICES
// ============================================
async function refreshServices() {
    if (window.showToast) {
        window.showToast('Refreshing services...', 'info', 1500);
    }
    return await getServices(true);
}

// ============================================
// GET API STATUS
// ============================================
function getAPIStatus() {
    const status = {};
    for (const [name, api] of Object.entries(APIS)) {
        status[name] = {
            name: api.name,
            enabled: api.enabled,
            markup: api.markup,
            priority: api.priority,
            description: api.description
        };
    }
    return status;
}

// ============================================
// GET SERVICE STATISTICS
// ============================================
async function getServiceStats() {
    const services = await getServices();
    const stats = {
        total: services.length,
        active: services.filter(s => s.isActive !== false).length,
        categories: new Set(services.map(s => s.category)).size,
        minPrice: Math.min(...services.map(s => s.rateWithMarkup), 0),
        maxPrice: Math.max(...services.map(s => s.rateWithMarkup), 0),
        avgPrice: services.reduce((sum, s) => sum + s.rateWithMarkup, 0) / services.length
    };
    return stats;
}

// ============================================
// EXPORT FUNCTIONS
// ============================================
window.getServices = getServices;
window.placeOrder = placeOrder;
window.getOrderStatus = getOrderStatus;
window.getBalance = getBalance;
window.createRefill = createRefill;
window.cancelOrder = cancelOrder;
window.getServiceById = getServiceById;
window.calculatePriceWithMarkup = calculatePriceWithMarkup;
window.calculateTotalPrice = calculateTotalPrice;
window.getCheapestService = getCheapestService;
window.refreshServices = refreshServices;
window.getAPIStatus = getAPIStatus;
window.searchServices = searchServices;
window.getCategories = getCategories;
window.getServiceStats = getServiceStats;
window.APIS = APIS;

console.log('🚀 BoostBangla API Integration v3.0 loaded - Design System compliant');