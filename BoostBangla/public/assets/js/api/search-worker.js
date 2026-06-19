// ============================================
// Search Worker - BoostBangla Design System v3.0
// Offloads search processing to background thread with fuzzy matching
// Version: 3.0 - DESIGN SYSTEM COMPLIANT
// ============================================

// ============================================
// ENHANCED FUZZY SEARCH IMPLEMENTATION
// ============================================

class EnhancedFuzzySearch {
    constructor(services) {
        this.services = services;
        this.index = this.buildInvertedIndex();
        this.trie = this.buildTrie();
    }

    // Build inverted index for O(1) lookups
    buildInvertedIndex() {
        const index = new Map();
        
        this.services.forEach(service => {
            // Index by ID
            const idKey = `id_${service.service}`;
            if (!index.has(idKey)) index.set(idKey, []);
            index.get(idKey).push(service);
            
            // Tokenize name for better search
            const tokens = this.tokenize(service.name);
            tokens.forEach(token => {
                if (token.length >= 2) {
                    if (!index.has(token)) index.set(token, []);
                    const existing = index.get(token);
                    if (!existing.some(s => s.service === service.service)) {
                        existing.push(service);
                    }
                }
            });
            
            // Index by category
            if (service.category) {
                const catKey = `cat_${service.category.toLowerCase()}`;
                if (!index.has(catKey)) index.set(catKey, []);
                if (!index.get(catKey).some(s => s.service === service.service)) {
                    index.get(catKey).push(service);
                }
            }
        });
        
        return index;
    }

    // Build trie for autocomplete
    buildTrie() {
        const trie = {};
        
        this.services.forEach(service => {
            const name = service.name.toLowerCase();
            let node = trie;
            for (const char of name) {
                if (!node[char]) node[char] = {};
                node = node[char];
            }
            node._end = node._end || [];
            node._end.push(service);
        });
        
        return trie;
    }

    // Tokenize text for indexing
    tokenize(text) {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(t => t.length > 0);
    }

    // Calculate Levenshtein distance
    levenshteinDistance(a, b) {
        const matrix = Array(b.length + 1).fill().map(() => Array(a.length + 1).fill(0));
        
        for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
        
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                const cost = b[i - 1] === a[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }
        
        return matrix[b.length][a.length];
    }

    // Calculate similarity score (0-1)
    similarityScore(str1, str2) {
        if (!str1 || !str2) return 0;
        const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
        const maxLen = Math.max(str1.length, str2.length);
        if (maxLen === 0) return 1;
        return 1 - (distance / maxLen);
    }

    // Autocomplete suggestions
    autocomplete(prefix, maxResults = 10) {
        if (!prefix || prefix.length < 1) return [];
        
        prefix = prefix.toLowerCase();
        let node = this.trie;
        
        for (const char of prefix) {
            if (!node[char]) return [];
            node = node[char];
        }
        
        const results = [];
        const queue = [{ node, prefix }];
        
        while (queue.length > 0 && results.length < maxResults) {
            const { node: currentNode, currentPrefix } = queue.shift();
            
            if (currentNode._end) {
                results.push(...currentNode._end.slice(0, maxResults - results.length));
            }
            
            for (const char in currentNode) {
                if (char !== '_end') {
                    queue.push({
                        node: currentNode[char],
                        prefix: currentPrefix + char
                    });
                }
            }
        }
        
        return results;
    }

    // Main search method
    search(query, options = {}) {
        const {
            threshold = 0.25,
            maxResults = 100,
            prioritizeExact = true,
            category = null,
            minPrice = null,
            maxPrice = null,
            sortBy = 'relevance' // relevance, price_asc, price_desc, name_asc
        } = options;
        
        if (!query || query.trim() === '') {
            let results = [...this.services];
            results = this.applyFilters(results, { category, minPrice, maxPrice });
            return this.sortResults(results, sortBy).slice(0, maxResults);
        }
        
        const queryLower = query.toLowerCase();
        const results = [];
        
        for (const service of this.services) {
            let bestScore = 0;
            let matchType = '';
            
            // Exact ID match (highest priority: 1.0)
            if (service.service.toString() === query) {
                bestScore = 1.0;
                matchType = 'exact_id';
            }
            // Partial ID match (0.95)
            else if (service.service.toString().includes(query)) {
                bestScore = 0.95;
                matchType = 'partial_id';
            }
            // Exact name match (0.98)
            else if (service.name.toLowerCase() === queryLower) {
                bestScore = 0.98;
                matchType = 'exact_name';
            }
            // Name starts with query (0.92)
            else if (service.name.toLowerCase().startsWith(queryLower)) {
                bestScore = 0.92;
                matchType = 'prefix_name';
            }
            // Name contains query as word (0.85)
            else if (service.name.toLowerCase().split(/\s+/).some(w => w === queryLower)) {
                bestScore = 0.85;
                matchType = 'word_match';
            }
            // Fuzzy name match
            else {
                const similarity = this.similarityScore(service.name, query);
                if (similarity > threshold) {
                    bestScore = similarity * 0.7; // Penalize fuzzy matches
                    matchType = 'fuzzy';
                }
            }
            
            // Category match (0.75)
            if (service.category && service.category.toLowerCase().includes(queryLower)) {
                bestScore = Math.max(bestScore, 0.75);
                matchType = matchType || 'category';
            }
            
            // Description match (0.6)
            if (service.description && service.description.toLowerCase().includes(queryLower)) {
                bestScore = Math.max(bestScore, 0.6);
                matchType = matchType || 'description';
            }
            
            if (bestScore > 0) {
                results.push({
                    ...service,
                    _score: bestScore,
                    _matchType: matchType
                });
            }
        }
        
        // Apply filters
        let filtered = this.applyFilters(results, { category, minPrice, maxPrice });
        
        // Sort by score (highest first)
        filtered.sort((a, b) => b._score - a._score);
        
        return filtered.slice(0, maxResults);
    }

    applyFilters(results, { category, minPrice, maxPrice }) {
        let filtered = [...results];
        
        if (category && category !== 'all') {
            filtered = filtered.filter(s => 
                s.category && s.category.toLowerCase() === category.toLowerCase()
            );
        }
        
        if (minPrice !== null) {
            filtered = filtered.filter(s => (s.rate || 0) >= minPrice);
        }
        
        if (maxPrice !== null) {
            filtered = filtered.filter(s => (s.rate || 0) <= maxPrice);
        }
        
        return filtered;
    }

    sortResults(results, sortBy) {
        const sorted = [...results];
        
        switch (sortBy) {
            case 'price_asc':
                sorted.sort((a, b) => (a.rate || 0) - (b.rate || 0));
                break;
            case 'price_desc':
                sorted.sort((a, b) => (b.rate || 0) - (a.rate || 0));
                break;
            case 'name_asc':
                sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                break;
            case 'relevance':
            default:
                // Keep current order (already sorted by score)
                break;
        }
        
        return sorted;
    }

    // Get category statistics
    getCategoryStats() {
        const stats = {};
        this.services.forEach(service => {
            const cat = service.category || 'Uncategorized';
            if (!stats[cat]) {
                stats[cat] = { count: 0, minPrice: Infinity, maxPrice: -Infinity, avgPrice: 0 };
            }
            stats[cat].count++;
            stats[cat].minPrice = Math.min(stats[cat].minPrice, service.rate || 0);
            stats[cat].maxPrice = Math.max(stats[cat].maxPrice, service.rate || 0);
        });
        
        Object.keys(stats).forEach(cat => {
            const total = this.services.filter(s => (s.category || 'Uncategorized') === cat)
                .reduce((sum, s) => sum + (s.rate || 0), 0);
            stats[cat].avgPrice = total / stats[cat].count;
        });
        
        return stats;
    }
}

// ============================================
// CACHE MANAGEMENT
// ============================================
const searchCache = new Map();
let currentIndex = null;
let allServices = [];

// Initialize search index
function initSearch(services) {
    allServices = services;
    currentIndex = new EnhancedFuzzySearch(services);
    searchCache.clear();
    console.log(`🔍 Search worker initialized with ${services.length} services`);
}

// Perform search with caching
function performSearch(query, options) {
    const cacheKey = `${query}|${JSON.stringify(options)}`;
    
    if (searchCache.has(cacheKey)) {
        return searchCache.get(cacheKey);
    }
    
    if (!currentIndex) {
        return allServices;
    }
    
    const startTime = performance.now();
    const results = currentIndex.search(query, options);
    const duration = performance.now() - startTime;
    
    // Cache results (limit to 200 items)
    if (searchCache.size > 200) {
        const firstKey = searchCache.keys().next().value;
        searchCache.delete(firstKey);
    }
    searchCache.set(cacheKey, { results, duration });
    
    return results;
}

// Get autocomplete suggestions
function getSuggestions(query, maxResults = 10) {
    if (!currentIndex || !query || query.length < 2) return [];
    return currentIndex.autocomplete(query, maxResults);
}

// Get category stats
function getCategoryStats() {
    if (!currentIndex) return {};
    return currentIndex.getCategoryStats();
}

// ============================================
// MESSAGE HANDLER
// ============================================
self.onmessage = function(e) {
    const { type, payload, requestId } = e.data;
    const startTime = performance.now();
    
    switch (type) {
        case 'INIT':
            initSearch(payload.services);
            self.postMessage({
                type: 'INIT_COMPLETE',
                payload: { 
                    indexed: allServices.length,
                    categories: Object.keys(currentIndex?.getCategoryStats() || {}).length
                },
                requestId
            });
            break;
            
        case 'SEARCH':
            const results = performSearch(payload.query, payload.options || {});
            self.postMessage({
                type: 'SEARCH_RESULTS',
                payload: {
                    query: payload.query,
                    results: results,
                    total: results.length,
                    duration: performance.now() - startTime
                },
                requestId
            });
            break;
            
        case 'SUGGEST':
            const suggestions = getSuggestions(payload.query, payload.maxResults || 10);
            self.postMessage({
                type: 'SUGGEST_RESULTS',
                payload: { 
                    query: payload.query,
                    suggestions: suggestions.map(s => ({ 
                        id: s.service, 
                        name: s.name,
                        category: s.category,
                        rate: s.rate
                    }))
                },
                requestId
            });
            break;
            
        case 'FILTER':
            let filtered = [...allServices];
            
            if (payload.category && payload.category !== 'all') {
                filtered = filtered.filter(s => s.category === payload.category);
            }
            
            if (payload.minPrice !== undefined) {
                filtered = filtered.filter(s => (s.rate || 0) >= payload.minPrice);
            }
            
            if (payload.maxPrice !== undefined) {
                filtered = filtered.filter(s => (s.rate || 0) <= payload.maxPrice);
            }
            
            if (payload.searchQuery) {
                const searchResults = performSearch(payload.searchQuery, {});
                const searchIds = new Set(searchResults.map(r => r.service));
                filtered = filtered.filter(s => searchIds.has(s.service));
            }
            
            self.postMessage({
                type: 'FILTER_RESULTS',
                payload: {
                    filtered: filtered,
                    total: filtered.length,
                    duration: performance.now() - startTime
                },
                requestId
            });
            break;
            
        case 'GET_STATS':
            self.postMessage({
                type: 'STATS_RESULTS',
                payload: {
                    totalServices: allServices.length,
                    categories: currentIndex ? Object.keys(currentIndex.getCategoryStats()) : [],
                    cacheSize: searchCache.size,
                    avgPrice: allServices.reduce((sum, s) => sum + (s.rate || 0), 0) / (allServices.length || 1),
                    minPrice: Math.min(...allServices.map(s => s.rate || 0), 0),
                    maxPrice: Math.max(...allServices.map(s => s.rate || 0), 0)
                },
                requestId
            });
            break;
            
        case 'CLEAR_CACHE':
            searchCache.clear();
            self.postMessage({
                type: 'CACHE_CLEARED',
                payload: { success: true },
                requestId
            });
            break;
            
        default:
            console.warn('Unknown message type:', type);
            self.postMessage({
                type: 'ERROR',
                payload: { message: `Unknown message type: ${type}` },
                requestId
            });
    }
};

// ============================================
// ERROR HANDLING
// ============================================
self.onerror = function(error) {
    console.error('Search Worker Error:', error);
    self.postMessage({
        type: 'ERROR',
        payload: { message: error.message, filename: error.filename, lineno: error.lineno }
    });
};

console.log('🔍 Search Worker v3.0 initialized - Design System compliant');