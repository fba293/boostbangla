/* BoostBangla dashboard device compatibility */
(function(){
  'use strict';
  function viewport(){
    const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--bb-vh', (h * 0.01) + 'px');
  }
  function bindShell(){
    const sidebar = document.getElementById('premiumSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const close = () => { sidebar?.classList.remove('open'); backdrop?.classList.remove('active'); document.body.style.overflow=''; };
    backdrop?.addEventListener('click', close, {once:false});
    document.getElementById('sidebarCloseBtn')?.addEventListener('click', close, {once:false});
    document.addEventListener('keydown', e => { if(e.key === 'Escape') close(); });
    sidebar?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { if(window.innerWidth <= 768) close(); }));
  }
  function run(){ viewport(); bindShell(); document.body.classList.add('bb-dashboard-page'); }
  window.addEventListener('resize', viewport, {passive:true});
  window.visualViewport?.addEventListener('resize', viewport, {passive:true});
  document.addEventListener('boostbangla:dashboard-shell-ready', bindShell);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, {once:true}); else run();
})();
