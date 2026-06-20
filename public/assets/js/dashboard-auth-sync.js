/* BoostBangla Dashboard Header/Sidebar Auth Sync */
(function(){
  'use strict';
  function setText(id,value){ const el=document.getElementById(id); if(el) el.textContent=value; }
  function setAvatar(imageId,initialsId,user){ const img=document.getElementById(imageId), initials=document.getElementById(initialsId); const name=user?.displayName||user?.email||'User'; if(user?.photoURL && img){img.src=user.photoURL;img.style.display='block'; if(initials) initials.style.display='none';} else {if(img) img.style.display='none';if(initials){initials.style.display='inline-flex';initials.textContent=name.charAt(0).toUpperCase();}} }
  function format(amount){return Number(amount||0).toLocaleString('en-BD',{maximumFractionDigits:2});}
  function render(state){
    if(!state?.user) return;
    const profile=state.profile||{}, user=state.user;
    const name=user.displayName||profile.username||user.email?.split('@')[0]||'User';
    const balance=Number(profile.balance||0);
    setText('sidebarUserName',name); setText('sidebarUserEmail',user.email||''); setText('sidebarUserBalance',format(balance)); setText('sidebarBalanceUSD','≈ $'+(balance/120).toFixed(2)+' USD');
    setText('headerUserName',name); setText('headerUserRole',state.isAdmin?'Administrator':'Member'); setText('headerBalanceValue',format(balance));
    setAvatar('sidebarUserAvatarImg','sidebarAvatarInitials',user); setAvatar('headerUserAvatar','headerAvatarInitials',user);
    ['sidebarLogoutBtn','logoutBtn','headerLogoutBtn'].forEach(id=>{ const b=document.getElementById(id); if(b && !b.dataset.bbBound){ b.dataset.bbBound='true'; b.addEventListener('click',event=>{event.preventDefault();window.BBAuthBridge?.signOut?.();}); }});
  }
  function bind(){
    if(!window.BBAuthBridge) return setTimeout(bind,80);
    window.BBAuthBridge.onChange(render);
    render(window.BBAuthBridge.getState());
    document.addEventListener('boostbangla:dashboard-shell-ready',()=>render(window.BBAuthBridge.getState()));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true}); else bind();
})();
