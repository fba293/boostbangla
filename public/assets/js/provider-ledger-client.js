/* =====================================================
   BoostBangla Provider Ledger Client
   MySQL ledger is the source of truth for order records.
   ===================================================== */
(function () {
  'use strict';
  const ENDPOINT = '/public/php/orders.php';
  async function getUser() {
    if (window.currentUser?.getIdToken) return window.currentUser;
    if (window.firebase?.auth) {
      const user = window.firebase.auth().currentUser;
      if (user?.getIdToken) return user;
    }
    throw new Error('Your session has expired. Please sign in again.');
  }
  async function request(action, options = {}) {
    const user = await getUser();
    const method = options.method || 'GET';
    const params = new URLSearchParams({ action, ...(options.params || {}) });
    const url = method === 'GET' ? `${ENDPOINT}?${params}` : ENDPOINT;
    const response = await fetch(url, { method, credentials:'same-origin', headers:{'Accept':'application/json','Authorization':'Bearer ' + await user.getIdToken(), ...(method !== 'GET' ? {'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'} : {})}, body:method !== 'GET' ? params : undefined });
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch (error) { data = { success:false, error:text || 'Invalid server response.' }; }
    if (!response.ok || !data.success) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  }
  function dateValue(value) { if (!value) return new Date(0); if (value.toDate) return value.toDate(); const date=new Date(value); return Number.isNaN(date.getTime()) ? new Date(0) : date; }
  function toDashboardOrder(order) {
    const created = dateValue(order.created_at || order.createdAt);
    return { id:String(order.local_order_id || order.id), mysqlId:Number(order.id || order.local_order_id || 0), userId:order.user_id || '', serviceId:order.service_id, serviceName:order.service_name || 'AmarBoost service', link:order.link || '', quantity:Number(order.quantity || 0), priceBDT:Number(order.user_price || order.price || 0), priceUSD:Number(order.user_price || order.price || 0) / 120, providerPriceBDT:Number(order.amarboost_price || 0), status:String(order.local_status || order.status || 'pending').toLowerCase(), amarboostStatus:order.amarboost_status || '', apiOrderId:order.amarboost_order_id || null, providerOrderId:order.amarboost_order_id || null, providerError:order.provider_error || '', syncStatus:order.sync_status || 'pending', createdAt:{toDate:()=>created}, updatedAt:{toDate:()=>dateValue(order.updated_at || order.updatedAt)}, raw:order };
  }
  async function listOrders(limit=100) { const data=await request('list',{params:{limit:String(Math.max(1,Math.min(250,limit)))}}); return (data.orders || []).map(toDashboardOrder); }
  async function getOrder(id) { const data=await request('detail',{params:{order_id:String(id)}}); return toDashboardOrder(data.order || {}); }
  async function refreshOrder(id) { return request('refresh',{method:'POST',params:{order_id:String(id)}}); }
  async function listTransactions(limit=100) { const data=await request('transactions',{params:{limit:String(Math.max(1,Math.min(250,limit)))}}); return data.transactions || []; }
  function summarize(orders) {
    const now=new Date(), today=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime(); let totalSpent=0,completed=0,pending=0,todayOrders=0; const byService={},byDay={};
    orders.forEach(order=>{ const amount=Number(order.priceBDT || 0); totalSpent+=amount; const status=String(order.status || '').toLowerCase(); if(status==='completed')completed++; if(['pending','processing','in_progress','partial','provider_confirmation_pending'].includes(status))pending++; const date=order.createdAt?.toDate ? order.createdAt.toDate() : dateValue(order.created_at); if(date.getTime()>=today)todayOrders++; const service=order.serviceName || 'Other'; byService[service]=(byService[service] || 0)+amount; const key=new Date(date.getFullYear(),date.getMonth(),date.getDate()).toISOString().slice(0,10); byDay[key]=(byDay[key] || 0)+1; });
    return {totalOrders:orders.length,totalSpent,completedOrders:completed,pendingOrders:pending,todayOrders,averageOrder:orders.length ? totalSpent/orders.length : 0,completionRate:orders.length ? Math.round((completed/orders.length)*100):0,byService,byDay};
  }
  window.BoostBanglaLedger={request,listOrders,getOrder,refreshOrder,listTransactions,summarize,toDashboardOrder,dateValue};
})();
