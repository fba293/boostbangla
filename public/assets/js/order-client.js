/* =====================================================
   BoostBangla Secure Order Client
   Orders only through the authenticated server handler.
   ===================================================== */
(function(){
  'use strict';
  const ENDPOINT = '/public/php/order-handler.php';
  function requestId(){
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return 'ord_' + Date.now() + '_' + Math.random().toString(36).slice(2, 12);
  }
  async function firebaseUser(){
    if (window.currentUser?.getIdToken) return window.currentUser;
    if (window.firebase?.auth) {
      const user = window.firebase.auth().currentUser;
      if (user?.getIdToken) return user;
    }
    throw new Error('Your session has expired. Please sign in again.');
  }
  async function parse(response){
    const text = await response.text();
    try { return text ? JSON.parse(text) : {}; }
    catch (error) { return { success:false, error:text || ('Server returned HTTP ' + response.status) }; }
  }
  async function placeOrder(input){
    const user = await firebaseUser();
    const idempotencyKey = input.requestId || requestId();
    const body = new URLSearchParams({
      action: 'place_order',
      service_id: String(input.serviceId || input.service_id || ''),
      link: String(input.link || '').trim(),
      quantity: String(Number(input.quantity || 0)),
      request_id: idempotencyKey
    });
    if (input.customData || input.custom_data) body.set('custom_data', String(input.customData || input.custom_data));
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + await user.getIdToken(),
        'X-Requested-With': 'XMLHttpRequest',
        'X-Idempotency-Key': idempotencyKey
      },
      body
    });
    const data = await parse(response);
    if (!response.ok || !data.success) throw new Error(data.error || data.message || ('Order request failed (' + response.status + ')'));
    data.request_id = idempotencyKey;
    sessionStorage.setItem('boostbangla_last_order', JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('boostbangla:order-placed', { detail:data }));
    return data;
  }
  async function wallet(){
    const user = await firebaseUser();
    const response = await fetch('/public/php/wallet.php', { headers:{'Accept':'application/json','Authorization':'Bearer '+await user.getIdToken()} });
    const data = await parse(response);
    if(!response.ok || !data.success) throw new Error(data.error || 'Could not load wallet balance.');
    return data;
  }
  window.BoostBanglaOrderClient = { placeOrder, wallet, requestId, endpoint:ENDPOINT };
})();
