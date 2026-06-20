/* BoostBangla Firebase Safe Initializer - dashboard compatibility */
(function () {
  'use strict';
  let started = false;
  function init() {
    if (started) return true;
    if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) return false;
    const config = window.firebaseConfig;
    if (!firebase.apps.length) {
      if (!config || !config.apiKey) {
        console.warn('BoostBangla Firebase config is not ready yet.');
        return false;
      }
      firebase.initializeApp(config);
    }
    window.auth = window.auth || firebase.auth();
    window.db = window.db || firebase.firestore();
    started = true;
    window.dispatchEvent(new CustomEvent('boostbangla:firebase-ready', {detail:{auth:window.auth, db:window.db}}));
    return true;
  }
  let tries = 0;
  function wait() {
    if (init() || tries++ > 80) return;
    setTimeout(wait, 100);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wait, {once:true});
  else wait();
})();
