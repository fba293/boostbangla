// ============================================
// BoostBangla API Docs Module v3.0
// Fully redesigned following design.md
// Interactive API explorer with live testing
// Syntax-highlighted code snippets
// One-click copy with animation
// Endpoint cards with method badges
// Request/response examples as glass cards
// ============================================

// ========== GLOBAL STATE ==========
let apiDocsState = {
    currentUser: null,
    apiKey: null,
    activeEndpoint: null,
    testResponse: null,
    isLoading: false,
    baseUrl: window.location.origin + '/api'
};

// API endpoints configuration
const API_ENDPOINTS = [
    {
        id: 'services',
        name: 'Get Services',
        method: 'GET',
        endpoint: '/services',
        description: 'Retrieve all available services with pricing and details',
        params: [],
        exampleResponse: `{
  "success": true,
  "services": [
    {
      "service": 6205,
      "name": "YouTube Native Ads Views",
      "rate": 2.50,
      "min": 1000000,
      "max": 100000000,
      "category": "youtube"
    }
  ]
}`,
        exampleRequest: 'curl -X GET "' + window.location.origin + '/api/services?key=YOUR_API_KEY"'
    },
    {
        id: 'order',
        name: 'Place Order',
        method: 'POST',
        endpoint: '/order',
        description: 'Place a new order for a specific service',
        params: [
            { name: 'service', type: 'integer', required: true, description: 'Service ID' },
            { name: 'link', type: 'string', required: true, description: 'Target URL or username' },
            { name: 'quantity', type: 'integer', required: true, description: 'Quantity (must be within min/max)' }
        ],
        exampleResponse: `{
  "success": true,
  "order": 12345678,
  "message": "Order placed successfully"
}`,
        exampleRequest: 'curl -X POST "' + window.location.origin + '/api/order" \\\n  -d "key=YOUR_API_KEY&service=6205&link=https://youtube.com/watch?v=123&quantity=1000"'
    },
    {
        id: 'status',
        name: 'Order Status',
        method: 'GET',
        endpoint: '/status',
        description: 'Check the status of an existing order',
        params: [
            { name: 'order_id', type: 'integer', required: true, description: 'Order ID returned from placement' }
        ],
        exampleResponse: `{
  "success": true,
  "order_id": 12345678,
  "status": "completed",
  "quantity": 1000,
  "started": "2025-05-20 10:00:00",
  "completed": "2025-05-20 15:30:00"
}`,
        exampleRequest: 'curl -X GET "' + window.location.origin + '/api/status?key=YOUR_API_KEY&order_id=12345678"'
    },
    {
        id: 'balance',
        name: 'Check Balance',
        method: 'GET',
        endpoint: '/balance',
        description: 'Get your current account balance in BDT and USD',
        params: [],
        exampleResponse: `{
  "success": true,
  "balance_bdt": 12500.50,
  "balance_usd": 104.17,
  "currency": "BDT"
}`,
        exampleRequest: 'curl -X GET "' + window.location.origin + '/api/balance?key=YOUR_API_KEY"'
    }
];

// ========== INITIALIZE API DOCS PAGE ==========
async function initApiDocs() {
    showSkeletonLoader();
    const isAuth = await checkAuthAndLoadUser();
    if (!isAuth) return;
    
    await loadApiKey();
    renderEndpoints();
    attachEventListeners();
    setupCopyButtons();
    highlightCodeBlocks();
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
    
    apiDocsState.currentUser = user;
    
    const userDoc = await db.collection('users').doc(user.uid).get();
    const username = userDoc.data()?.username || user.email?.split('@')[0] || 'User';
    
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.innerText = username;
    
    return true;
}

// ========== LOAD API KEY ==========
async function loadApiKey() {
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) return;
        
        const userRef = db.collection('users').doc(user.uid);
        const userSnap = await userRef.get();
        let apiKey = userSnap.data()?.apiKey;
        
        if (!apiKey) {
            apiKey = generateApiKey();
            await userRef.update({ apiKey: apiKey });
        }
        
        apiDocsState.apiKey = apiKey;
        
        const apiKeyDisplay = document.getElementById('apiKeyDisplay');
        if (apiKeyDisplay) {
            apiKeyDisplay.innerText = maskApiKey(apiKey);
            apiKeyDisplay.dataset.fullKey = apiKey;
        }
        
    } catch (error) {
        console.error('Error loading API key:', error);
        showGlassToast('Failed to load API key', 'error');
    }
}

function generateApiKey() {
    return 'bp_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 8);
}

function maskApiKey(key) {
    if (!key) return 'Not set';
    return key.substring(0, 8) + '••••••••' + key.substring(key.length - 8);
}

// ========== RENDER ENDPOINTS ==========
function renderEndpoints() {
    const container = document.getElementById('endpointsList');
    if (!container) return;
    
    container.innerHTML = API_ENDPOINTS.map((endpoint, idx) => {
        const delay = 0.05 * idx;
        const methodClass = getMethodClass(endpoint.method);
        
        return `
            <div class="endpoint-card glass-card rounded-2xl p-5 mb-4 cursor-pointer hover:shadow-xl transition-all animate-slide-up" 
                 style="animation-delay: ${delay}s" 
                 data-endpoint-id="${endpoint.id}">
                <div class="flex justify-between items-start flex-wrap gap-3 mb-3">
                    <div class="flex items-center gap-3">
                        <span class="api-method-badge ${methodClass}">${endpoint.method}</span>
                        <code class="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">${endpoint.endpoint}</code>
                    </div>
                    <i class="fas fa-chevron-down text-gray-400 transition-transform endpoint-chevron"></i>
                </div>
                <h3 class="font-bold text-lg mb-2">${endpoint.name}</h3>
                <p class="text-gray-600 dark:text-gray-300 text-sm">${endpoint.description}</p>
                <div class="endpoint-details hidden mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    ${renderEndpointDetails(endpoint)}
                </div>
            </div>
        `;
    }).join('');
    
    attachEndpointClickHandlers();
}

function getMethodClass(method) {
    const classes = {
        GET: 'method-get',
        POST: 'method-post',
        PUT: 'method-put',
        DELETE: 'method-delete'
    };
    return classes[method] || 'method-get';
}

function renderEndpointDetails(endpoint) {
    let paramsHtml = '';
    if (endpoint.params.length > 0) {
        paramsHtml = `
            <div class="mb-4">
                <h4 class="font-semibold text-sm mb-2">📋 Parameters</h4>
                <div class="overflow-x-auto">
                    <table class="data-table w-full text-sm">
                        <thead>
                            <tr><th>Name</th><th>Type</th><th>Required</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            ${endpoint.params.map(p => `
                                <tr>
                                    <td class="font-mono">${p.name}</td>
                                    <td>${p.type}</td>
                                    <td>${p.required ? '<span class="text-green-600">Yes</span>' : '<span class="text-gray-400">No</span>'}</td>
                                    <td>${p.description}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    return `
        ${paramsHtml}
        <div class="mb-4">
            <h4 class="font-semibold text-sm mb-2">📝 Example Request</h4>
            <div class="code-block relative">
                <pre class="bg-gray-900 text-gray-100 p-4 rounded-xl overflow-x-auto text-sm"><code class="language-bash">${escapeHtml(endpoint.exampleRequest)}</code></pre>
                <button class="copy-code-btn absolute top-2 right-2 p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition" data-code="${escapeHtml(endpoint.exampleRequest)}">
                    <i class="fas fa-copy text-white text-sm"></i>
                </button>
            </div>
        </div>
        <div class="mb-4">
            <h4 class="font-semibold text-sm mb-2">📤 Example Response</h4>
            <div class="code-block relative">
                <pre class="bg-gray-900 text-gray-100 p-4 rounded-xl overflow-x-auto text-sm"><code class="language-json">${escapeHtml(endpoint.exampleResponse)}</code></pre>
                <button class="copy-code-btn absolute top-2 right-2 p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition" data-code="${escapeHtml(endpoint.exampleResponse)}">
                    <i class="fas fa-copy text-white text-sm"></i>
                </button>
            </div>
        </div>
        <div class="flex justify-end">
            <button class="test-endpoint-btn btn-outline text-sm px-4 py-2 rounded-lg" data-endpoint-id="${endpoint.id}">
                <i class="fas fa-flask mr-2"></i> Test Endpoint
            </button>
        </div>
    `;
}

function attachEndpointClickHandlers() {
    document.querySelectorAll('.endpoint-card').forEach(card => {
        card.removeEventListener('click', handleEndpointClick);
        card.addEventListener('click', handleEndpointClick);
    });
    
    document.querySelectorAll('.test-endpoint-btn').forEach(btn => {
        btn.removeEventListener('click', handleTestEndpoint);
        btn.addEventListener('click', handleTestEndpoint);
    });
}

function handleEndpointClick(e) {
    // Don't trigger if clicking on button inside
    if (e.target.closest('.test-endpoint-btn')) return;
    if (e.target.closest('.copy-code-btn')) return;
    
    const card = e.currentTarget;
    const details = card.querySelector('.endpoint-details');
    const chevron = card.querySelector('.endpoint-chevron');
    
    if (details) {
        const isHidden = details.classList.contains('hidden');
        if (isHidden) {
            details.classList.remove('hidden');
            details.classList.add('animate-slide-down');
            if (chevron) chevron.style.transform = 'rotate(180deg)';
        } else {
            details.classList.add('hidden');
            if (chevron) chevron.style.transform = 'rotate(0deg)';
        }
    }
}

// ========== INTERACTIVE API TESTER ==========
async function handleTestEndpoint(e) {
    e.stopPropagation();
    
    const endpointId = e.currentTarget.dataset.endpointId;
    const endpoint = API_ENDPOINTS.find(e => e.id === endpointId);
    if (!endpoint) return;
    
    // Show tester modal
    showTesterModal(endpoint);
}

function showTesterModal(endpoint) {
    const modal = document.getElementById('apiTesterModal');
    const modalTitle = document.getElementById('testerTitle');
    const modalContent = document.getElementById('testerContent');
    
    if (!modal || !modalContent) return;
    
    modalTitle.innerHTML = `${endpoint.method} ${endpoint.endpoint}`;
    
    // Build form based on params
    let paramsHtml = '';
    if (endpoint.params.length > 0) {
        paramsHtml = `
            <div class="space-y-3 mb-4">
                <label class="form-label">API Key</label>
                <input type="text" id="testerApiKey" class="form-input w-full" value="${apiDocsState.apiKey || ''}" placeholder="Your API key">
                ${endpoint.params.map(p => `
                    <div>
                        <label class="form-label">${p.name} ${p.required ? '<span class="text-red-500">*</span>' : ''}</label>
                        <input type="${p.type === 'integer' ? 'number' : 'text'}" id="param_${p.name}" class="form-input w-full" placeholder="${p.description}">
                        <p class="form-helper">${p.description}</p>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        paramsHtml = `
            <div class="mb-4">
                <label class="form-label">API Key</label>
                <input type="text" id="testerApiKey" class="form-input w-full" value="${apiDocsState.apiKey || ''}" placeholder="Your API key">
            </div>
        `;
    }
    
    modalContent.innerHTML = `
        <div class="mb-4">
            <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                <code class="text-sm">${endpoint.method} ${apiDocsState.baseUrl}${endpoint.endpoint}</code>
            </div>
        </div>
        <form id="testerForm">
            ${paramsHtml}
            <div class="flex gap-3 mt-4">
                <button type="submit" class="btn-primary flex-1">
                    <i class="fas fa-play mr-2"></i> Send Request
                </button>
                <button type="button" onclick="closeTesterModal()" class="btn-outline">Cancel</button>
            </div>
        </form>
        <div id="testerResponse" class="mt-4 hidden">
            <div class="border-t border-gray-200 dark:border-gray-700 pt-3">
                <h4 class="font-semibold text-sm mb-2">Response</h4>
                <pre class="bg-gray-900 text-gray-100 p-4 rounded-xl overflow-x-auto text-sm"><code id="responseContent"></code></pre>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    const form = document.getElementById('testerForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            executeTestRequest(endpoint);
        });
    }
}

async function executeTestRequest(endpoint) {
    const apiKey = document.getElementById('testerApiKey')?.value;
    if (!apiKey) {
        showGlassToast('API key is required', 'error');
        return;
    }
    
    const responseDiv = document.getElementById('testerResponse');
    const responseContent = document.getElementById('responseContent');
    
    if (responseDiv) responseDiv.classList.remove('hidden');
    if (responseContent) responseContent.innerText = 'Sending request...';
    
    // Build URL and params
    let url = `${apiDocsState.baseUrl}${endpoint.endpoint}`;
    const options = {
        method: endpoint.method,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    };
    
    if (endpoint.method === 'GET') {
        const params = new URLSearchParams();
        params.append('key', apiKey);
        for (const param of endpoint.params) {
            const value = document.getElementById(`param_${param.name}`)?.value;
            if (value) params.append(param.name, value);
        }
        url += '?' + params.toString();
    } else {
        const body = new URLSearchParams();
        body.append('key', apiKey);
        for (const param of endpoint.params) {
            const value = document.getElementById(`param_${param.name}`)?.value;
            if (value) body.append(param.name, value);
        }
        options.body = body;
    }
    
    try {
        const startTime = Date.now();
        const response = await fetch(url, options);
        const endTime = Date.now();
        const data = await response.json();
        
        const formattedResponse = JSON.stringify(data, null, 2);
        if (responseContent) {
            responseContent.innerText = formattedResponse + `\n\n// Response time: ${endTime - startTime}ms\n// Status: ${response.status} ${response.statusText}`;
        }
        
        if (response.ok) {
            showGlassToast('Request successful!', 'success');
        } else {
            showGlassToast(`Error: ${response.status} ${response.statusText}`, 'error');
        }
    } catch (error) {
        if (responseContent) {
            responseContent.innerText = `Error: ${error.message}\n\nNote: The API endpoint may need to be configured. This is a demo interface.`;
        }
        showGlassToast('Request failed. API endpoint may not be configured.', 'error');
    }
}

function closeTesterModal() {
    const modal = document.getElementById('apiTesterModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// ========== COPY API KEY ==========
async function copyApiKey() {
    if (!apiDocsState.apiKey) {
        showGlassToast('No API key found', 'error');
        return;
    }
    
    await copyToClipboard(apiDocsState.apiKey);
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
    
    const regenerateBtn = document.getElementById('regenerateApiKeyBtn');
    const originalText = regenerateBtn.innerHTML;
    regenerateBtn.disabled = true;
    regenerateBtn.innerHTML = '<span class="spinner"></span>';
    
    try {
        const user = window.getCurrentUser();
        if (!user?.uid) throw new Error('Not authenticated');
        
        const newKey = generateApiKey();
        await db.collection('users').doc(user.uid).update({ apiKey: newKey });
        
        apiDocsState.apiKey = newKey;
        
        const apiKeyDisplay = document.getElementById('apiKeyDisplay');
        if (apiKeyDisplay) {
            apiKeyDisplay.innerText = maskApiKey(newKey);
            apiKeyDisplay.dataset.fullKey = newKey;
        }
        
        showGlassToast('API key regenerated successfully!', 'success');
        
    } catch (error) {
        console.error('Regenerate error:', error);
        showGlassToast('Failed to regenerate API key', 'error');
    } finally {
        regenerateBtn.disabled = false;
        regenerateBtn.innerHTML = originalText;
    }
}

// ========== COPY CODE SNIPPETS ==========
function setupCopyButtons() {
    document.addEventListener('click', (e) => {
        const copyBtn = e.target.closest('.copy-code-btn');
        if (copyBtn) {
            const code = copyBtn.dataset.code;
            if (code) {
                copyToClipboard(code);
                showGlassToast('Code copied to clipboard!', 'success');
                
                // Animate button
                copyBtn.classList.add('scale-90');
                setTimeout(() => copyBtn.classList.remove('scale-90'), 200);
            }
        }
    });
}

function highlightCodeBlocks() {
    // Simple syntax highlighting simulation
    // In production, you could use Prism.js or highlight.js
    const codeBlocks = document.querySelectorAll('pre code');
    codeBlocks.forEach(block => {
        let html = block.innerHTML;
        // Highlight strings
        html = html.replace(/"([^"]*)"/g, '<span class="text-green-400">"$1"</span>');
        // Highlight numbers
        html = html.replace(/\b(\d+)\b/g, '<span class="text-yellow-400">$1</span>');
        // Highlight booleans
        html = html.replace(/\b(true|false)\b/g, '<span class="text-purple-400">$1</span>');
        block.innerHTML = html;
    });
}

// ========== ANIMATIONS & LOADERS ==========
function showSkeletonLoader() {
    const container = document.getElementById('endpointsList');
    if (container) {
        container.innerHTML = `
            <div class="space-y-4">
                <div class="skeleton skeleton-card h-32 rounded-2xl"></div>
                <div class="skeleton skeleton-card h-32 rounded-2xl"></div>
                <div class="skeleton skeleton-card h-32 rounded-2xl"></div>
                <div class="skeleton skeleton-card h-32 rounded-2xl"></div>
            </div>
        `;
    }
}

function hideSkeletonLoader() {
    // Content replaces skeletons when loaded
}

function animateInElements() {
    document.querySelectorAll('.api-stats-card, .endpoint-card').forEach((el, idx) => {
        el.classList.add('animate-slide-up');
        el.style.animationDelay = `${0.03 * idx}s`;
    });
}

// ========== HELPER FUNCTIONS ==========
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
    // API key buttons
    const copyBtn = document.getElementById('copyApiKeyBtn');
    if (copyBtn) copyBtn.addEventListener('click', copyApiKey);
    
    const regenerateBtn = document.getElementById('regenerateApiKeyBtn');
    if (regenerateBtn) regenerateBtn.addEventListener('click', regenerateApiKey);
    
    // Close modal on outside click
    const testerModal = document.getElementById('apiTesterModal');
    if (testerModal) {
        testerModal.addEventListener('click', (e) => {
            if (e.target === testerModal) closeTesterModal();
        });
    }
}

// ========== EXPORT GLOBALS ==========
window.initApiDocs = initApiDocs;
window.copyApiKey = copyApiKey;
window.regenerateApiKey = regenerateApiKey;
window.closeTesterModal = closeTesterModal;

// ========== AUTO-INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('endpointsList')) {
        if (window.auth && window.db) {
            await initApiDocs();
        } else {
            const checkFirebase = setInterval(async () => {
                if (window.auth && window.db) {
                    clearInterval(checkFirebase);
                    await initApiDocs();
                }
            }, 100);
        }
    }
});

console.log('✅ API Docs v3.0 (design.md compliant) loaded');