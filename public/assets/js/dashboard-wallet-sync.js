/* BoostBangla MySQL wallet display sync */
(function(){
  'use strict';
  let running = false;
  function money(v){ return Number(v || 0).toLocaleString('en-BD',{maximumFractionDigits:2}); }
  function paint(balance){
    ['sidebarUserBalance','headerBalanceValue','userBalance','availableBalance','walletBalance','currentBalance','bdtBalance','accountBalance','profileBalance'].forEach(id=>{const el=document.getElementById(id);if(el) el.textContent = money(balance);});
    document.querySelectorAll('[data-bb-wallet]').forEach(el=>{el.textContent=money(balance);});
  }
  async function refresh(){
    if(running || !window.BoostBanglaOrderClient) return;
    running = true;
    try { const data = await window.BoostBanglaOrderClient.wallet(); paint(data.balance); document.dispatchEvent(new CustomEvent('boostbangla:wallet-updated',{detail:data})); }
    catch(error) { console.debug('Wallet display sync skipped:', error.message); }
    finally { running=false; }
  }
  window.BoostBanglaWallet = { refresh };
  document.addEventListener('boostbangla:order-placed', refresh);
  document.addEventListener('visibilitychange', ()=>{if(!document.hidden) refresh();});
  document.addEventListener('boostbangla:dashboard-shell-ready', ()=>setTimeout(refresh,350));
  setInterval(refresh, 60000);
})();
