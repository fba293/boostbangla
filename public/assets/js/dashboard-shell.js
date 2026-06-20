/* =====================================================
   BoostBangla Dashboard Shell - single source of truth
   Loads sidebar and universal header exactly once per page.
   ===================================================== */
(function () {
  'use strict';
  const state = window.__BBDashboardShell = window.__BBDashboardShell || { promises:{} };
  const routes = [
    ['Dashboard','/public/pages/dashboard/index.html'],['New Order','/public/pages/dashboard/new-order.html'],['Orders','/public/pages/dashboard/orders.html'],['Services','/public/pages/dashboard/services.html'],['Add Funds','/public/pages/dashboard/add-funds.html'],['Tickets','/public/pages/dashboard/tickets.html'],['Account','/public/pages/dashboard/account.html']
  ];
  function fallback(kind) {
    if(kind==='sidebar') return `<aside class="bb-shell-fallback"><strong>BoostBangla</strong><nav>${routes.map(([name,href])=>`<a href="${href}">${name}</a>`).join('')}</nav></aside><style>.bb-shell-fallback{position:fixed;left:0;top:0;bottom:0;width:240px;padding:24px;background:#061826;color:#fff;z-index:999}.bb-shell-fallback nav{display:grid;gap:10px;margin-top:24px}.bb-shell-fallback a{color:#e2e8f0;text-decoration:none}@media(max-width:768px){.bb-shell-fallback{position:static;width:auto}}</style>`;
    return `<header class="bb-header-fallback"><a href="/public/pages/dashboard/index.html">BoostBangla Dashboard</a><a href="/public/pages/dashboard/account.html">Account</a></header><style>.bb-header-fallback{display:flex;justify-content:space-between;gap:16px;padding:14px 20px;background:#fff;border-bottom:1px solid #e2e8f0;position:sticky;top:0;z-index:900}.bb-header-fallback a{color:#0f172a;font-weight:700;text-decoration:none}</style>`;
  }
  function runScripts(container) {
    container.querySelectorAll('script').forEach(old => {
      const script=document.createElement('script');
      [...old.attributes].forEach(attr=>script.setAttribute(attr.name,attr.value));
      if(!old.src) script.textContent=old.textContent;
      old.replaceWith(script);
    });
  }
  async function load(id,url,kind){
    const target=document.getElementById(id);
    if(!target || target.dataset.bbLoaded==='true') return;
    target.dataset.bbLoaded='loading';
    if(!state.promises[url]) state.promises[url]=fetch(url,{credentials:'same-origin'}).then(r=>r.ok?r.text():Promise.reject(new Error('HTTP '+r.status)));
    try { const markup=await state.promises[url]; target.innerHTML=markup; runScripts(target); target.dataset.bbLoaded='true'; }
    catch(error){ console.warn('Dashboard '+kind+' component failed to load.',error); target.innerHTML=fallback(kind); target.dataset.bbLoaded='fallback'; }
  }
  function setActive(){
    const file=(location.pathname.split('/').pop()||'index.html').replace('.html','') || 'index';
    const page=file==='index'?'dashboard':file;
    document.querySelectorAll('.premium-sidebar [data-page]').forEach(link=>link.classList.toggle('active',link.dataset.page===page));
  }
  async function init(){
    document.body.classList.add('dashboard-shell-ready');
    await Promise.all([load('sidebar-placeholder','/public/components/sidebar.html','sidebar'),load('header-placeholder','/public/components/universal-header.html','header')]);
    setActive();
    document.dispatchEvent(new CustomEvent('boostbangla:dashboard-shell-ready'));
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
