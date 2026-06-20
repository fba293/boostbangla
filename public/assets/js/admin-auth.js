/* BoostBangla Admin Access v1 */
(function () {
  'use strict';
  const LOGIN = '/login.html';
  const DASHBOARD = '/dashboard/index.html';
  const listeners = new Set();
  let state = { ready: false, allowed: false, provider: 'guest', user: null, profile: null };

  function emit(next) {
    state = Object.assign({}, state, next, { ready: true });
    window.BBAdminState = state;
    listeners.forEach((fn) => { try { fn(state); } catch (error) { console.warn(error); } });
    document.dispatchEvent(new CustomEvent('boostbangla:admin-state', { detail: state }));
  }
  function isAdminProfile(profile) {
    return Boolean(profile && (profile.isAdmin === true || ['admin', 'support'].includes(String(profile.role || '').toLowerCase())) && profile.status !== 'blocked');
  }
  function render(value) {
    const user = value.user || {}, profile = value.profile || {};
    const name = profile.full_name || profile.fullName || profile.username || user.displayName || (user.email ? user.email.split('@')[0] : 'Admin');
    const nameEl = document.getElementById('adminUserName');
    const roleEl = document.getElementById('adminUserRole');
    const initialEl = document.getElementById('adminUserInitial');
    if (nameEl) nameEl.textContent = name;
    if (roleEl) roleEl.textContent = value.allowed ? (profile.role === 'support' ? 'Support admin' : 'Administrator') : 'Access required';
    if (initialEl) initialEl.textContent = String(name || 'A').charAt(0).toUpperCase();
    document.querySelectorAll('#adminName, #adminNameShort').forEach((node) => { node.textContent = name; });
    document.body.classList.remove('bb-admin-booting');
    document.body.classList.toggle('bb-admin-authorized', Boolean(value.allowed));
  }
  function deny(destination) {
    document.body.classList.remove('bb-admin-booting');
    document.body.classList.add('bb-admin-denied');
    setTimeout(() => { window.location.replace(destination); }, 40);
  }
  async function checkSupabase() {
    if (!window.BoostBanglaSupabase) return false;
    try {
      const client = await window.BoostBanglaSupabase.getClient();
      const { data } = await client.auth.getSession();
      const user = data?.session?.user;
      if (!user) return false;
      const { data: profile } = await client.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (isAdminProfile(profile)) { emit({ allowed: true, provider: 'supabase', user, profile }); render(window.BBAdminState); return true; }
    } catch (error) {}
    return false;
  }
  function checkFirebase() {
    return new Promise((resolve) => {
      if (!window.firebase?.auth || !window.firebase?.firestore) { resolve(false); return; }
      window.firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) { resolve(false); return; }
        try {
          const doc = await window.firebase.firestore().collection('users').doc(user.uid).get();
          const profile = doc.exists ? (doc.data() || {}) : {};
          let tokenAdmin = false;
          try {
            const token = await user.getIdTokenResult?.();
            tokenAdmin = token?.claims?.admin === true || ['admin', 'support'].includes(String(token?.claims?.role || '').toLowerCase());
          } catch (error) {}
          if (tokenAdmin || isAdminProfile(profile)) {
            if (tokenAdmin && !profile.role) profile.role = 'admin';
            emit({ allowed: true, provider: 'firebase', user, profile });
            render(window.BBAdminState);
            resolve(true);
            return;
          }
        } catch (error) { console.warn('Admin profile check failed', error); }
        resolve(false);
      });
    });
  }
  async function verify() {
    document.body.classList.add('bb-admin-booting');
    if (await checkSupabase()) return window.BBAdminState;
    if (await checkFirebase()) return window.BBAdminState;
    emit({ allowed: false, provider: 'guest', user: null, profile: null });
    render(window.BBAdminState);
    deny(window.firebase?.auth ? DASHBOARD : LOGIN);
    return window.BBAdminState;
  }
  async function signOut() {
    try { if (window.firebase?.auth) await window.firebase.auth().signOut(); } catch (error) {}
    try { if (window.BoostBanglaSupabase) { const client = await window.BoostBanglaSupabase.getClient(); await client.auth.signOut(); } } catch (error) {}
    window.location.href = LOGIN;
  }
  window.BBAdminAccess = { verify, signOut, getState: () => state, onChange: (fn) => { listeners.add(fn); if (state.ready) fn(state); return () => listeners.delete(fn); }, isAdminProfile };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', verify, { once: true }); else verify();
})();
