/* ---------- boot ---------- */
(async()=>{
  try{hydrateState(await Store.load())}catch(e){console.warn(e)}
  render();
  if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(e=>console.warn('SW',e));
})();
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){try{Store.save(serializeState())}catch(e){}}});
