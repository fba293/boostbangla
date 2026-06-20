/* =====================================================
   BoostBangla Admin Shell v8
   One responsive sidebar/topbar and one admin access entry.
   ===================================================== */
(function () {
  'use strict';

  const ADMIN_LINKS = [
    ['Core', 'Dashboard', '/admin/index.html', 'fa-chart-pie'],
    ['Core', 'Users', '/admin/users.html', 'fa-users'],
    ['Core', 'Orders', '/admin/orders.html', 'fa-shopping-cart'],
    ['Core', 'Deposits', '/admin/deposits.html', 'fa-wallet'],
    ['Core', 'Services', '/admin/services.html', 'fa-layer-group'],
    ['Core', 'Tickets', '/admin/tickets.html', 'fa-headset'],
    ['Finance', 'Refunds', '/admin/refunds.html', 'fa-rotate-left'],
    ['Finance', 'Withdrawals', '/admin/withdrawals.html', 'fa-money-bill-transfer'],
    ['Finance', 'Add Funds', '/admin/add-funds.html', 'fa-plus-circle'],
    ['Growth', 'Affiliates', '/admin/affiliates.html', 'fa-handshake'],
    ['Growth', 'Child Panels', '/admin/child-panels.html', 'fa-network-wired'],
    ['Growth', 'Blog', '/admin/blog.html', 'fa-blog'],
    ['Growth', 'News', '/admin/news.html', 'fa-newspaper'],
    ['Growth', 'SEO', '/admin/seo.html', 'fa-magnifying-glass-chart'],
    ['System', 'Notifications', '/admin/notifications.html', 'fa-bell'],
    ['System', 'Exchange Rate', '/admin/exchange-rate.html', 'fa-money-bill-trend-up'],
    ['System', 'Settings', '/admin/settings.html', 'fa-cog'],
    ['System', 'Public Site', '/index.html', 'fa-globe']
  ];

  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyDypaa-pHjEc4rrXHrtj8i_8vgo_5XMY9g',
    authDomain: 'boostbangla-629a1.firebaseapp.com',
    projectId: 'boostbangla-629a1',
    storageBucket: 'boostbangla-629a1.firebasestorage.app',
    messagingSenderId: '384867462668',
    appId: '1:384867462668:web:bbc79c6a7ead66b439c829'
  };

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function currentFile() {
    return (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  }

  function pageName() {
    const raw = (document.title || 'Admin Panel').trim();
    return raw.replace(/\s*\|\s*BoostBangla.*$/i, '').replace(/^Admin\s*-\s*/i, '').replace(/^Manage\s+/i, '').trim() || 'Admin Panel';
  }

  function ensureStyle(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function loadScript(src) {
    if (document.querySelector(`script[src="${src}"]`)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function ensureAdminRuntime() {
    window.BOOSTBANGLA_FIREBASE_CONFIG = window.BOOSTBANGLA_FIREBASE_CONFIG || FIREBASE_CONFIG;
    if (!window.firebase) {
      try {
        await loadScript('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
        await loadScript('https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js');
        await loadScript('https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js');
      } catch (error) {
        console.warn('Firebase runtime could not be loaded for admin access.', error);
      }
    }
    if (window.firebase && window.firebase.apps && !window.firebase.apps.length) {
      try { window.firebase.initializeApp(window.BOOSTBANGLA_FIREBASE_CONFIG); } catch (error) { console.warn(error); }
    }
    try { await loadScript('/public/assets/js/admin-auth.js'); }
    catch (error) { console.error('Admin auth runtime failed to load.', error); }
  }

  function sidebarHTML() {
    let section = '';
    let html = '<aside class="admin-sidebar" id="adminSidebar" aria-label="Admin navigation">' +
      '<div class="admin-sidebar-header"><a href="/admin/index.html" class="logo">Boost<span>Bangla</span><small>Admin v2.0</small></a>' +
      '<button class="admin-close-btn" id="adminCloseBtn" type="button" aria-label="Close admin menu"><i class="fas fa-times"></i></button></div>' +
      '<nav class="admin-sidebar-nav">';

    ADMIN_LINKS.forEach(([group, label, href, icon]) => {
      if (group !== section) { section = group; html += `<div class="admin-nav-section">${group}</div>`; }
      const active = href.startsWith('/admin/')
        ? (location.pathname.includes('/admin/') && href.split('/').pop().toLowerCase() === currentFile())
        : (href === location.pathname || (href === '/index.html' && location.pathname === '/'));
      html += `<a class="admin-nav-item ${active ? 'active' : ''}" href="${href}"><i class="fas ${icon}"></i><span>${label}</span></a>`;
    });

    html += '</nav><div class="admin-sidebar-footer"><button id="adminShellLogout" class="admin-signout" type="button"><i class="fas fa-right-from-bracket"></i><span>Sign out</span></button></div></aside><div class="admin-overlay" id="adminOverlay"></div>';
    return html;
  }

  function topbarHTML() {
    return `<header class="admin-topbar" id="adminTopbar">
      <div class="admin-topbar-left">
        <button class="admin-menu-btn" id="adminMenuBtn" type="button" aria-label="Open admin menu"><i class="fas fa-bars"></i></button>
        <div class="admin-title-wrap"><h1 class="admin-page-title">${pageName()}</h1><p class="admin-page-subtitle">BoostBangla administration</p></div>
      </div>
      <div class="admin-topbar-right">
        <div id="adminPageActions" class="admin-page-actions"></div>
        <button class="admin-theme-btn" id="adminThemeBtn" type="button" aria-label="Toggle dark mode"><i class="fas fa-moon"></i></button>
        <button class="admin-user-chip" id="adminUserChip" type="button" aria-label="Admin account"><span class="admin-user-avatar" id="adminUserInitial">A</span><span class="admin-user-meta"><strong id="adminUserName">Admin</strong><small id="adminUserRole">Checking access…</small></span></button>
      </div>
    </header>`;
  }

  function moveHeaderActions(oldHeader, target) {
    const actions = oldHeader && oldHeader.querySelector('.admin-header-actions');
    if (!actions || !target) return;
    Array.from(actions.children).forEach((node) => {
      if (node.id === 'adminDarkModeToggle' || node.classList.contains('admin-user-info')) return;
      target.appendChild(node);
    });
  }

  function ensureLayout() {
    document.body.classList.add('bb-admin-page', 'bb-admin-booting');
    ensureStyle('/public/assets/css/admin-responsive.css');

    let layout = document.querySelector('.admin-layout');
    if (!layout) {
      layout = document.createElement('div');
      layout.className = 'admin-layout';
      const existingMain = document.body.querySelector(':scope > main.admin-main');
      if (existingMain) {
        layout.appendChild(existingMain);
        document.body.prepend(layout);
      } else {
        const main = document.createElement('main');
        main.className = 'admin-main';
        const content = document.createElement('div');
        content.className = 'admin-content-pad';
        Array.from(document.body.childNodes).filter((node) => !(node.nodeType === 1 && node.tagName === 'SCRIPT')).forEach((node) => content.appendChild(node));
        main.appendChild(content);
        layout.appendChild(main);
        document.body.prepend(layout);
      }
    }

    const main = layout.querySelector('.admin-main') || layout.querySelector('main') || layout.lastElementChild;
    if (!main) return;
    main.classList.add('admin-main');

    const oldHeader = main.querySelector(':scope > .admin-header');
    main.querySelectorAll('.admin-sidebar').forEach((node) => node.remove());
    document.querySelectorAll('body > .admin-sidebar, body > .admin-overlay, #adminOverlay').forEach((node) => node.remove());
    main.querySelectorAll('.admin-mobile-menu-btn, #adminMobileMenuBtn').forEach((node) => node.remove());

    if (!main.querySelector('#adminTopbar')) main.insertAdjacentHTML('afterbegin', topbarHTML());
    const topbar = main.querySelector('#adminTopbar');
    moveHeaderActions(oldHeader, topbar && topbar.querySelector('#adminPageActions'));
    if (oldHeader) oldHeader.remove();

    layout.insertAdjacentHTML('afterbegin', sidebarHTML());
    if (!main.querySelector('.admin-content-pad')) {
      const content = document.createElement('div');
      content.className = 'admin-content-pad';
      Array.from(main.childNodes).filter((node) => node !== topbar).forEach((node) => content.appendChild(node));
      main.appendChild(content);
    }
  }

  function bindNavigation() {
    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.getElementById('adminOverlay');
    const open = () => { sidebar?.classList.add('open'); overlay?.classList.add('active'); document.body.classList.add('admin-menu-open'); };
    const close = () => { sidebar?.classList.remove('open'); overlay?.classList.remove('active'); document.body.classList.remove('admin-menu-open'); };
    document.getElementById('adminMenuBtn')?.addEventListener('click', open);
    document.getElementById('adminCloseBtn')?.addEventListener('click', close);
    overlay?.addEventListener('click', close);
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
    sidebar?.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));

    const theme = document.getElementById('adminThemeBtn');
    const applyTheme = (dark) => {
      document.body.classList.toggle('dark-mode', dark);
      document.documentElement.classList.toggle('dark', dark);
      localStorage.setItem('darkMode', String(dark));
      const icon = theme?.querySelector('i');
      if (icon) icon.className = dark ? 'fas fa-sun' : 'fas fa-moon';
    };
    applyTheme(localStorage.getItem('darkMode') === 'true');
    theme?.addEventListener('click', () => applyTheme(!document.body.classList.contains('dark-mode')));

    document.getElementById('adminShellLogout')?.addEventListener('click', async () => {
      if (window.BBAdminAccess?.signOut) return window.BBAdminAccess.signOut();
      if (window.firebase?.auth) await window.firebase.auth().signOut();
      window.location.href = '/login.html';
    });
  }

  ready(async () => {
    ensureLayout();
    bindNavigation();
    await ensureAdminRuntime();
    document.dispatchEvent(new CustomEvent('boostbangla:admin-shell-ready'));
  });
})();
