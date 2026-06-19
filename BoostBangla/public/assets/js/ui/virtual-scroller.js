// ============================================
// BoostBangla Virtual Scroller - Premium Design System v3.0
// High-performance infinite scrolling with smooth 60fps rendering
// Fully responsive with touch optimization and dark mode
// Version: 3.0
// ============================================

class VirtualScroller {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
        
        this.options = {
            itemHeight: 72,
            bufferSize: 5,
            overscan: 3,
            startIndex: 0,
            useWindow: false,
            horizontal: false,
            dynamicHeight: false,
            threshold: 0.8,
            scrollDebounce: 16,
            onScrollEnd: null,
            onReachEnd: null,
            onReachStart: null,
            onItemRender: null,
            ...options
        };
        
        this.items = [];
        this.visibleItems = [];
        this.scrollTop = 0;
        this.startIndex = this.options.startIndex;
        this.endIndex = this.options.startIndex;
        this.totalHeight = 0;
        self.isScrolling = false;
        self.scrollTimeout = null;
        self.resizeObserver = null;
        self.rafId = null;
        self.itemHeights = new Map(); // For dynamic height support
        
        this.init();
    }
    
    // ============================================
    // Design System Integration
    // ============================================
    
    init() {
        this.injectStyles();
        this.setupContainer();
        this.setupEventListeners();
        this.setupResizeObserver();
        this.render();
    }
    
    injectStyles() {
        if (document.querySelector('#virtual-scroller-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'virtual-scroller-styles';
        style.textContent = `
            .virtual-scroller-container {
                position: relative;
                overflow-y: auto;
                overflow-x: hidden;
                scroll-behavior: smooth;
                -webkit-overflow-scrolling: touch;
            }
            
            .virtual-scroller-content {
                position: relative;
                will-change: transform;
            }
            
            .virtual-scroller-item {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                will-change: transform;
                transition: transform 0.1s ease;
                cursor: pointer;
            }
            
            .virtual-scroller-item:hover {
                transform: translateX(4px);
            }
            
            /* Loading skeleton */
            .virtual-scroller-skeleton {
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
                border-radius: 16px;
                height: 60px;
                margin: 8px 0;
            }
            
            body.dark-mode .virtual-scroller-skeleton {
                background: linear-gradient(90deg, #2d2d2d 25%, #3d3d3d 50%, #2d2d2d 75%);
            }
            
            /* Scrollbar styling */
            .virtual-scroller-container::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }
            
            .virtual-scroller-container::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.05);
                border-radius: 10px;
            }
            
            .virtual-scroller-container::-webkit-scrollbar-thumb {
                background: rgba(255, 107, 0, 0.4);
                border-radius: 10px;
                transition: background 0.2s;
            }
            
            .virtual-scroller-container::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 107, 0, 0.6);
            }
            
            body.dark-mode .virtual-scroller-container::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.05);
            }
            
            /* Loading indicator */
            .virtual-scroller-loader {
                text-align: center;
                padding: 20px;
                color: #FF6B00;
                font-size: 14px;
                font-weight: 500;
            }
            
            .virtual-scroller-loader i {
                animation: spin 1s linear infinite;
                margin-right: 8px;
            }
            
            .virtual-scroller-end-message {
                text-align: center;
                padding: 20px;
                color: #6b7280;
                font-size: 14px;
            }
            
            body.dark-mode .virtual-scroller-end-message {
                color: #94a3b8;
            }
            
            /* Touch optimizations */
            @media (hover: none) and (pointer: coarse) {
                .virtual-scroller-item {
                    cursor: default;
                }
                
                .virtual-scroller-item:active {
                    transform: scale(0.99);
                }
            }
            
            /* Reduced motion */
            @media (prefers-reduced-motion: reduce) {
                .virtual-scroller-item {
                    transition: none;
                }
                
                .virtual-scroller-skeleton {
                    animation: none;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    setupContainer() {
        this.container.classList.add('virtual-scroller-container');
        
        // Set container height if not specified
        if (!this.container.style.height && !this.options.useWindow) {
            this.container.style.height = 'calc(100vh - 200px)';
        }
        
        // Create content wrapper
        this.content = document.createElement('div');
        this.content.className = 'virtual-scroller-content';
        this.container.appendChild(this.content);
    }
    
    setupEventListeners() {
        // Scroll event with throttling
        const scrollTarget = this.options.useWindow ? window : this.container;
        
        scrollTarget.addEventListener('scroll', () => {
            if (this.rafId) cancelAnimationFrame(this.rafId);
            
            this.rafId = requestAnimationFrame(() => {
                this.handleScroll();
            });
            
            // Detect scroll end
            if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
            this.scrollTimeout = setTimeout(() => {
                if (this.options.onScrollEnd) {
                    this.options.onScrollEnd(this.scrollTop);
                }
            }, 150);
        }, { passive: true });
        
        // Touch end for mobile optimization
        this.container.addEventListener('touchend', () => {
            this.handleScroll();
        });
    }
    
    setupResizeObserver() {
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                this.updateTotalHeight();
                this.render();
            });
            this.resizeObserver.observe(this.container);
        }
        
        window.addEventListener('resize', () => {
            this.updateTotalHeight();
            this.render();
        });
    }
    
    handleScroll() {
        const scrollTarget = this.options.useWindow ? window : this.container;
        this.scrollTop = this.options.useWindow 
            ? window.scrollY 
            : scrollTarget.scrollTop;
        
        const newStart = this.calculateStartIndex();
        
        if (Math.abs(newStart - this.startIndex) > 0) {
            this.startIndex = Math.max(0, newStart);
            this.render();
        }
        
        // Check if reached end
        if (this.isAtEnd() && this.options.onReachEnd) {
            this.options.onReachEnd(this.scrollTop);
        }
        
        // Check if reached start
        if (this.isAtStart() && this.options.onReachStart) {
            this.options.onReachStart(this.scrollTop);
        }
    }
    
    calculateStartIndex() {
        const scrollTop = this.scrollTop;
        let accumulatedHeight = 0;
        
        if (this.options.dynamicHeight) {
            // Dynamic height calculation - binary search for performance
            let low = 0;
            let high = this.items.length - 1;
            let result = 0;
            
            while (low <= high) {
                const mid = Math.floor((low + high) / 2);
                const height = this.getItemHeight(mid);
                const midTop = this.getItemTop(mid);
                
                if (midTop <= scrollTop) {
                    result = mid;
                    low = mid + 1;
                } else {
                    high = mid - 1;
                }
            }
            
            return Math.max(0, result - this.options.overscan);
        } else {
            // Fixed height calculation
            return Math.max(0, Math.floor(scrollTop / this.options.itemHeight) - this.options.overscan);
        }
    }
    
    calculateEndIndex(startIndex) {
        const containerHeight = this.options.useWindow 
            ? window.innerHeight 
            : this.container.clientHeight;
        
        let visibleCount;
        
        if (this.options.dynamicHeight) {
            let accumulatedHeight = 0;
            let count = 0;
            
            for (let i = startIndex; i < this.items.length; i++) {
                const height = this.getItemHeight(i);
                if (accumulatedHeight + height > containerHeight + (this.options.overscan * this.options.itemHeight)) {
                    break;
                }
                accumulatedHeight += height;
                count++;
            }
            visibleCount = count;
        } else {
            visibleCount = Math.ceil(containerHeight / this.options.itemHeight) + (this.options.overscan * 2);
        }
        
        return Math.min(this.items.length, startIndex + visibleCount + this.options.bufferSize);
    }
    
    getItemHeight(index) {
        if (this.options.dynamicHeight && this.itemHeights.has(index)) {
            return this.itemHeights.get(index);
        }
        return this.options.itemHeight;
    }
    
    getItemTop(index) {
        if (this.options.dynamicHeight) {
            let top = 0;
            for (let i = 0; i < index; i++) {
                top += this.getItemHeight(i);
            }
            return top;
        } else {
            return index * this.options.itemHeight;
        }
    }
    
    updateTotalHeight() {
        if (this.options.dynamicHeight) {
            let total = 0;
            for (let i = 0; i < this.items.length; i++) {
                total += this.getItemHeight(i);
            }
            this.totalHeight = total;
        } else {
            this.totalHeight = this.items.length * this.options.itemHeight;
        }
        
        this.content.style.height = `${this.totalHeight}px`;
    }
    
    isAtEnd() {
        const scrollTarget = this.options.useWindow ? window : this.container;
        const scrollTop = this.options.useWindow 
            ? window.scrollY + window.innerHeight
            : scrollTarget.scrollTop + scrollTarget.clientHeight;
        const threshold = this.totalHeight * this.options.threshold;
        
        return scrollTop >= (this.totalHeight - threshold);
    }
    
    isAtStart() {
        const scrollTop = this.options.useWindow ? window.scrollY : this.container.scrollTop;
        return scrollTop <= 50;
    }
    
    setItems(items) {
        this.items = items;
        this.itemHeights.clear();
        this.updateTotalHeight();
        this.startIndex = 0;
        this.scrollTop = 0;
        
        if (this.container) {
            this.container.scrollTop = 0;
        }
        
        this.render();
    }
    
    appendItems(newItems) {
        this.items = [...this.items, ...newItems];
        this.updateTotalHeight();
        this.render();
    }
    
    prependItems(newItems) {
        this.items = [...newItems, ...this.items];
        this.updateTotalHeight();
        this.render();
    }
    
    updateItem(index, newData) {
        if (index >= 0 && index < this.items.length) {
            this.items[index] = { ...this.items[index], ...newData };
            
            // Re-render if item is currently visible
            if (index >= this.startIndex && index <= this.endIndex) {
                this.render();
            }
        }
    }
    
    removeItem(index) {
        if (index >= 0 && index < this.items.length) {
            this.items.splice(index, 1);
            this.itemHeights.clear();
            this.updateTotalHeight();
            this.render();
        }
    }
    
    async render() {
        if (!this.content || this.items.length === 0) {
            this.showEmptyState();
            return;
        }
        
        const newEndIndex = this.calculateEndIndex(this.startIndex);
        
        if (newEndIndex === this.endIndex && this.startIndex === this.lastStartIndex) {
            return;
        }
        
        this.endIndex = newEndIndex;
        this.lastStartIndex = this.startIndex;
        
        // Get visible range
        const visibleRange = this.getVisibleRange();
        
        // Remove out-of-view items
        const children = Array.from(this.content.children);
        for (const child of children) {
            const index = parseInt(child.dataset.index);
            if (index !== undefined && (index < visibleRange.start || index > visibleRange.end)) {
                child.remove();
            }
        }
        
        // Render visible items
        const fragment = document.createDocumentFragment();
        
        for (let i = visibleRange.start; i <= visibleRange.end && i < this.items.length; i++) {
            const existingItem = this.content.querySelector(`[data-index="${i}"]`);
            
            if (!existingItem) {
                const itemElement = await this.createItemElement(i);
                if (itemElement) {
                    itemElement.dataset.index = i;
                    fragment.appendChild(itemElement);
                }
            }
        }
        
        this.content.appendChild(fragment);
        this.positionItems();
    }
    
    getVisibleRange() {
        return {
            start: Math.max(0, this.startIndex),
            end: Math.min(this.items.length - 1, this.endIndex)
        };
    }
    
    async createItemElement(index) {
        const item = this.items[index];
        if (!item) return null;
        
        let element;
        
        if (this.options.renderItem) {
            element = await this.options.renderItem(item, index);
        } else {
            element = this.defaultRender(item, index);
        }
        
        if (element && !(element instanceof HTMLElement)) {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = element;
            element = wrapper.firstElementChild;
        }
        
        if (element) {
            element.classList.add('virtual-scroller-item');
            
            // Add hover effect
            element.addEventListener('mouseenter', () => {
                element.style.transform = 'translateX(4px)';
            });
            element.addEventListener('mouseleave', () => {
                element.style.transform = 'translateX(0)';
            });
            
            // Add click handler
            if (this.options.onItemClick) {
                element.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.options.onItemClick(item, index, e);
                });
            }
            
            // Store height for dynamic sizing
            if (this.options.dynamicHeight) {
                // Measure after render
                setTimeout(() => {
                    const height = element.offsetHeight;
                    if (height !== this.itemHeights.get(index)) {
                        this.itemHeights.set(index, height);
                        this.updateTotalHeight();
                        this.positionItems();
                    }
                }, 0);
            }
        }
        
        return element;
    }
    
    defaultRender(item, index) {
        const div = document.createElement('div');
        div.className = 'p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition';
        div.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
                        <i class="fas fa-hashtag text-primary text-sm"></i>
                    </div>
                    <div>
                        <div class="font-medium">${this.escapeHtml(item.name || item.service || `Item ${index + 1}`)}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">ID: ${item.id || item.service || index}</div>
                    </div>
                </div>
                <div class="text-primary font-bold">${item.price ? `৳${item.price}` : ''}</div>
            </div>
        `;
        return div;
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    positionItems() {
        const items = Array.from(this.content.children);
        
        for (const item of items) {
            const index = parseInt(item.dataset.index);
            if (!isNaN(index)) {
                const top = this.getItemTop(index);
                item.style.transform = `translateY(${top}px)`;
                item.style.position = 'absolute';
                item.style.width = '100%';
            }
        }
    }
    
    showEmptyState() {
        this.content.innerHTML = `
            <div class="empty-state py-20 text-center">
                <div class="text-6xl mb-4">📭</div>
                <h3 class="text-xl font-bold mb-2">No items to display</h3>
                <p class="text-gray-500 dark:text-gray-400">Try adjusting your filters or refresh the page</p>
            </div>
        `;
    }
    
    showLoading() {
        if (this.loadingElement) return;
        
        this.loadingElement = document.createElement('div');
        this.loadingElement.className = 'virtual-scroller-loader';
        this.loadingElement.innerHTML = '<i class="fas fa-spinner"></i> Loading more...';
        this.container.appendChild(this.loadingElement);
    }
    
    hideLoading() {
        if (this.loadingElement) {
            this.loadingElement.remove();
            this.loadingElement = null;
        }
    }
    
    showEndMessage() {
        if (this.endMessageElement) return;
        
        this.endMessageElement = document.createElement('div');
        this.endMessageElement.className = 'virtual-scroller-end-message';
        this.endMessageElement.innerHTML = '<i class="fas fa-check-circle"></i> You\'ve reached the end';
        this.container.appendChild(this.endMessageElement);
    }
    
    hideEndMessage() {
        if (this.endMessageElement) {
            this.endMessageElement.remove();
            this.endMessageElement = null;
        }
    }
    
    scrollToIndex(index, behavior = 'smooth') {
        if (index < 0 || index >= this.items.length) return;
        
        const top = this.getItemTop(index);
        const scrollTarget = this.options.useWindow ? window : this.container;
        
        scrollTarget.scrollTo({
            top: top,
            behavior: behavior
        });
    }
    
    scrollToTop(behavior = 'smooth') {
        const scrollTarget = this.options.useWindow ? window : this.container;
        scrollTarget.scrollTo({ top: 0, behavior: behavior });
    }
    
    scrollToBottom(behavior = 'smooth') {
        const scrollTarget = this.options.useWindow ? window : this.container;
        scrollTarget.scrollTo({ top: this.totalHeight, behavior: behavior });
    }
    
    getCurrentVisibleRange() {
        const scrollTop = this.scrollTop;
        const containerHeight = this.options.useWindow 
            ? window.innerHeight 
            : this.container.clientHeight;
        
        const firstVisible = this.calculateStartIndex();
        let lastVisible = firstVisible;
        let accumulatedHeight = 0;
        
        for (let i = firstVisible; i < this.items.length; i++) {
            accumulatedHeight += this.getItemHeight(i);
            if (accumulatedHeight > containerHeight) break;
            lastVisible = i;
        }
        
        return {
            start: firstVisible,
            end: lastVisible,
            items: this.items.slice(firstVisible, lastVisible + 1)
        };
    }
    
    refresh() {
        this.itemHeights.clear();
        this.updateTotalHeight();
        this.render();
    }
    
    destroy() {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
        if (this.resizeObserver) this.resizeObserver.disconnect();
        
        this.container.classList.remove('virtual-scroller-container');
        this.content.remove();
        
        this.items = [];
        this.visibleItems = [];
    }
}

// ============================================
// Table Virtual Scroller (for data tables)
// ============================================

class TableVirtualScroller extends VirtualScroller {
    constructor(container, options = {}) {
        const tableOptions = {
            itemHeight: 72,
            ...options
        };
        
        super(container, tableOptions);
        this.columns = options.columns || [];
        this.headerElement = null;
        
        this.createHeader();
    }
    
    createHeader() {
        if (!this.columns.length) return;
        
        const thead = document.createElement('thead');
        const tr = document.createElement('tr');
        
        this.columns.forEach(col => {
            const th = document.createElement('th');
            th.className = col.className || 'p-3 text-left';
            th.textContent = col.label || col.key || '';
            if (col.width) th.style.width = col.width;
            tr.appendChild(th);
        });
        
        thead.appendChild(tr);
        
        // Find or create table
        let table = this.container.querySelector('table');
        if (!table) {
            table = document.createElement('table');
            table.className = 'w-full border-collapse';
            this.container.insertBefore(table, this.container.firstChild);
        }
        
        // Remove existing header
        const existingHeader = table.querySelector('thead');
        if (existingHeader) existingHeader.remove();
        
        table.appendChild(thead);
        this.table = table;
        
        // Move content inside tbody
        this.content = document.createElement('tbody');
        table.appendChild(this.content);
    }
    
    async createItemElement(index) {
        const item = this.items[index];
        if (!item) return null;
        
        const tr = document.createElement('tr');
        tr.className = 'border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer';
        tr.style.height = `${this.options.itemHeight}px`;
        
        for (const col of this.columns) {
            const td = document.createElement('td');
            td.className = col.className || 'p-3';
            
            if (col.render) {
                const content = await col.render(item, index);
                if (typeof content === 'string') {
                    td.innerHTML = content;
                } else if (content instanceof HTMLElement) {
                    td.appendChild(content);
                } else {
                    td.textContent = content;
                }
            } else if (col.key) {
                td.textContent = item[col.key] || '';
            }
            
            tr.appendChild(td);
        }
        
        if (this.options.onRowClick) {
            tr.addEventListener('click', (e) => {
                e.stopPropagation();
                this.options.onRowClick(item, index, e);
            });
        }
        
        return tr;
    }
    
    positionItems() {
        const items = Array.from(this.content.children);
        
        for (const item of items) {
            const index = parseInt(item.dataset.index);
            if (!isNaN(index)) {
                const top = this.getItemTop(index);
                item.style.transform = `translateY(${top}px)`;
                item.style.position = 'absolute';
                item.style.width = '100%';
                item.style.display = 'table-row';
            }
        }
    }
    
    showEmptyState() {
        this.content.innerHTML = `
            <tr>
                <td colspan="${this.columns.length}" class="text-center py-12">
                    <div class="text-6xl mb-4">📭</div>
                    <div class="text-lg font-semibold mb-2">No data available</div>
                    <div class="text-gray-500 dark:text-gray-400">Try adjusting your search or filters</div>
                </td>
            </tr>
        `;
    }
}

// ============================================
// Grid Virtual Scroller (for card layouts)
// ============================================

class GridVirtualScroller extends VirtualScroller {
    constructor(container, options = {}) {
        const gridOptions = {
            itemHeight: 200,
            columns: 4,
            gap: 24,
            ...options
        };
        
        super(container, gridOptions);
        this.columns = options.columns || 4;
        this.gap = options.gap || 24;
        
        this.setupGrid();
    }
    
    setupGrid() {
        this.container.style.display = 'flex';
        this.container.style.flexWrap = 'wrap';
        this.container.style.gap = `${this.gap}px`;
        
        this.updateColumns();
        window.addEventListener('resize', () => this.updateColumns());
    }
    
    updateColumns() {
        const width = this.container.clientWidth;
        
        if (width < 640) {
            this.columns = 1;
        } else if (width < 768) {
            this.columns = 2;
        } else if (width < 1024) {
            this.columns = 3;
        } else {
            this.columns = this.options.columns || 4;
        }
        
        this.itemHeight = this.options.itemHeight;
        this.refresh();
    }
    
    async createItemElement(index) {
        const item = this.items[index];
        if (!item) return null;
        
        const colIndex = index % this.columns;
        const rowIndex = Math.floor(index / this.columns);
        
        const div = document.createElement('div');
        div.className = 'virtual-scroller-grid-item';
        div.style.width = `calc(${100 / this.columns}% - ${this.gap - (this.gap / this.columns)}px)`;
        div.style.position = 'relative';
        
        if (this.options.renderItem) {
            const content = await this.options.renderItem(item, index);
            if (typeof content === 'string') {
                div.innerHTML = content;
            } else if (content instanceof HTMLElement) {
                div.appendChild(content);
            }
        } else {
            div.innerHTML = this.defaultGridRender(item, index);
        }
        
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.options.onItemClick) {
                this.options.onItemClick(item, index, e);
            }
        });
        
        return div;
    }
    
    defaultGridRender(item, index) {
        return `
            <div class="glass-card p-4 h-full hover:shadow-xl transition-all duration-300">
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                        <i class="fas fa-box text-primary text-xl"></i>
                    </div>
                    <div>
                        <div class="font-bold">${this.escapeHtml(item.name || `Item ${index + 1}`)}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">${item.category || 'General'}</div>
                    </div>
                </div>
                ${item.price ? `<div class="text-2xl font-black text-primary mb-2">৳${item.price}</div>` : ''}
                <div class="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">${item.description || 'No description available'}</div>
            </div>
        `;
    }
    
    positionItems() {
        const items = Array.from(this.content.children);
        
        for (const item of items) {
            const index = parseInt(item.dataset.index);
            if (!isNaN(index)) {
                const rowIndex = Math.floor(index / this.columns);
                const top = rowIndex * (this.options.itemHeight + this.gap);
                item.style.transform = `translateY(${top}px)`;
                item.style.position = 'absolute';
            }
        }
    }
    
    getItemTop(index) {
        const rowIndex = Math.floor(index / this.columns);
        return rowIndex * (this.options.itemHeight + this.gap);
    }
    
    updateTotalHeight() {
        const rowCount = Math.ceil(this.items.length / this.columns);
        this.totalHeight = rowCount * (this.options.itemHeight + this.gap);
        this.content.style.height = `${this.totalHeight}px`;
    }
}

// ============================================
// Export for global use
// ============================================

window.VirtualScroller = VirtualScroller;
window.TableVirtualScroller = TableVirtualScroller;
window.GridVirtualScroller = GridVirtualScroller;

// ============================================
// Auto-initialization helper
// ============================================

function initVirtualScroller(selector, options = {}) {
    const container = document.querySelector(selector);
    if (!container) {
        console.warn(`Virtual scroller container not found: ${selector}`);
        return null;
    }
    
    const type = options.type || 'list';
    let scroller;
    
    switch (type) {
        case 'table':
            scroller = new TableVirtualScroller(container, options);
            break;
        case 'grid':
            scroller = new GridVirtualScroller(container, options);
            break;
        default:
            scroller = new VirtualScroller(container, options);
    }
    
    return scroller;
}

// ============================================
// Documentation
// ============================================

console.log('⚡ BoostBangla Virtual Scroller v3.0 loaded - Design System Ready');
console.log('💡 Usage: new VirtualScroller(container, { itemHeight: 72, renderItem: (item, index) => html })');
console.log('💡 Tip: Use TableVirtualScroller for data tables, GridVirtualScroller for card layouts');

// ============================================
// Module exports
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        VirtualScroller, 
        TableVirtualScroller, 
        GridVirtualScroller,
        initVirtualScroller
    };
}