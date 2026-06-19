// ============================================
// Order API - Frontend Order Management
// BoostBangla Middleman System v3.0
// ============================================

const ORDER_API = {
    endpoint: '/php/order-handler.php',
    syncEndpoint: '/php/sync-engine.php',
    
    // Place new order
    async placeOrder(orderData) {
        try {
            if (!orderData.user_id || !orderData.service_id || !orderData.link || !orderData.quantity) {
                throw new Error('Missing required order fields');
            }
            
            const formData = new URLSearchParams();
            formData.append('action', 'place_order');
            formData.append('user_id', orderData.user_id);
            formData.append('service_id', orderData.service_id);
            formData.append('link', orderData.link);
            formData.append('quantity', orderData.quantity);
            
            if (orderData.custom_data) {
                formData.append('custom_data', orderData.custom_data);
            }
            
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Store order locally for UI
                this.storeOrderLocal(result.data);
                
                if (window.showToast) {
                    window.showToast(
                        `✅ Order placed! ID: ${result.data.local_order_id}`,
                        'success',
                        5000
                    );
                }
                
                // Dispatch event
                window.dispatchEvent(new CustomEvent('order:placed', {
                    detail: result.data
                }));
            } else {
                throw new Error(result.error || 'Failed to place order');
            }
            
            return result;
            
        } catch (error) {
            console.error('Order placement error:', error);
            if (window.showToast) {
                window.showToast(`❌ ${error.message}`, 'error', 5000);
            }
            throw error;
        }
    },
    
    // Get order history
    async getOrderHistory(userId, limit = 50) {
        try {
            const response = await fetch(
                `/public/php/api-proxy.php?action=get_user_orders&user_id=${encodeURIComponent(userId)}&limit=${limit}`
            );
            
            if (!response.ok) throw new Error('Failed to fetch orders');
            
            const result = await response.json();
            return result.orders || [];
            
        } catch (error) {
            console.error('Failed to get order history:', error);
            return [];
        }
    },
    
    // Get order details
    async getOrderDetails(localOrderId) {
        try {
            const response = await fetch(
                `/public/php/api-proxy.php?action=get_order&order_id=${encodeURIComponent(localOrderId)}`
            );
            
            if (!response.ok) throw new Error('Failed to fetch order');
            
            return await response.json();
            
        } catch (error) {
            console.error('Failed to get order details:', error);
            return null;
        }
    },
    
    // Cancel order
    async cancelOrder(localOrderId) {
        try {
            const response = await fetch('/public/php/api-proxy.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: new URLSearchParams({
                    action: 'cancel_order',
                    order_id: localOrderId
                })
            });
            
            if (!response.ok) throw new Error('Failed to cancel order');
            
            const result = await response.json();
            
            if (result.success) {
                if (window.showToast) {
                    window.showToast('Order cancelled and refunded', 'success');
                }
                
                // Dispatch event
                window.dispatchEvent(new CustomEvent('order:cancelled', {
                    detail: { order_id: localOrderId }
                }));
            }
            
            return result;
            
        } catch (error) {
            console.error('Cancel order error:', error);
            if (window.showToast) {
                window.showToast(`❌ ${error.message}`, 'error');
            }
            throw error;
        }
    },
    
    // Get user balance
    async getUserBalance(userId) {
        try {
            const response = await fetch(
                `/public/php/api-proxy.php?action=get_balance&user_id=${encodeURIComponent(userId)}`
            );
            
            if (!response.ok) throw new Error('Failed to fetch balance');
            
            const result = await response.json();
            return result.balance || 0;
            
        } catch (error) {
            console.error('Failed to get balance:', error);
            return 0;
        }
    },
    
    // Add balance to wallet
    async addBalance(userId, amount, paymentMethod = 'stripe') {
        try {
            const response = await fetch('/public/php/api-proxy.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: new URLSearchParams({
                    action: 'add_balance',
                    user_id: userId,
                    amount: amount,
                    method: paymentMethod
                })
            });
            
            if (!response.ok) throw new Error('Failed to add balance');
            
            const result = await response.json();
            
            if (result.success && window.showToast) {
                window.showToast(`✅ Balance added: $${amount}`, 'success');
            }
            
            return result;
            
        } catch (error) {
            console.error('Add balance error:', error);
            if (window.showToast) {
                window.showToast(`❌ ${error.message}`, 'error');
            }
            throw error;
        }
    },
    
    // Get profit summary (admin only)
    async getProfitSummary(startDate = null, endDate = null) {
        try {
            let url = '/public/php/api-proxy.php?action=profit_summary';
            if (startDate) url += `&start_date=${startDate}`;
            if (endDate) url += `&end_date=${endDate}`;
            
            const response = await fetch(url);
            
            if (!response.ok) throw new Error('Failed to fetch summary');
            
            return await response.json();
            
        } catch (error) {
            console.error('Failed to get profit summary:', error);
            return null;
        }
    },
    
    // Store order in localStorage for quick access
    storeOrderLocal(orderData) {
        try {
            const orders = JSON.parse(localStorage.getItem('boostbangla_orders') || '[]');
            orders.unshift({
                ...orderData,
                stored_at: new Date().toISOString()
            });
            
            // Keep only last 50 orders
            if (orders.length > 50) {
                orders.pop();
            }
            
            localStorage.setItem('boostbangla_orders', JSON.stringify(orders));
        } catch (error) {
            console.error('Failed to store order locally:', error);
        }
    },
    
    // Get recent orders from localStorage
    getRecentOrdersLocal(limit = 10) {
        try {
            const orders = JSON.parse(localStorage.getItem('boostbangla_orders') || '[]');
            return orders.slice(0, limit);
        } catch (error) {
            return [];
        }
    },
    
    // Calculate price with markup (mirroring backend calculation)
    calculatePrice(baseRate, quantity, markupPercent = 30) {
        const amarboostPrice = baseRate * quantity;
        const userPrice = amarboostPrice; // Show same price
        const amarboostCost = amarboostPrice / (1 + (markupPercent / 100));
        const profit = userPrice - amarboostCost;
        
        return {
            baseRate: parseFloat(baseRate),
            amarboostPrice: parseFloat(amarboostPrice.toFixed(4)),
            userPrice: parseFloat(userPrice.toFixed(4)),
            amarboostCost: parseFloat(amarboostCost.toFixed(4)),
            profit: parseFloat(profit.toFixed(4)),
            markupPercent
        };
    }
};

// Export functions to window
window.ORDER_API = ORDER_API;
window.placeOrder = ORDER_API.placeOrder.bind(ORDER_API);
window.getOrderHistory = ORDER_API.getOrderHistory.bind(ORDER_API);
window.getOrderDetails = ORDER_API.getOrderDetails.bind(ORDER_API);
window.cancelOrder = ORDER_API.cancelOrder.bind(ORDER_API);
window.getUserBalance = ORDER_API.getUserBalance.bind(ORDER_API);
window.addBalance = ORDER_API.addBalance.bind(ORDER_API);
window.getProfitSummary = ORDER_API.getProfitSummary.bind(ORDER_API);

console.log('✅ BoostBangla Order API loaded - Middleman system v3.0');
