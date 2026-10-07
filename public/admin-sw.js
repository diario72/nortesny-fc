const VERSION='nortesny-2026-10-07-v2';
self.addEventListener('install',event=>{self.skipWaiting()});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.map(key=>caches.delete(key)));
    if(self.registration.navigationPreload)await self.registration.navigationPreload.enable();
    await self.clients.claim();
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    clients.forEach(client=>client.postMessage({type:'NORTESNY_UPDATE',version:VERSION}));
  })());
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const preload=await event.preloadResponse;
        if(preload)return preload;
        return await fetch(event.request,{cache:'no-store'});
      }catch{
        return new Response('<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><title>Nortesny · Sin conexión</title><body style="background:#080e19;color:#ecf3ff;font:16px system-ui;padding:40px"><h1>Nortesny FC</h1><h2>Sin conexión</h2><p>Conéctate a internet para cargar la versión más reciente.</p><button onclick="location.reload()" style="padding:14px;border:0;border-radius:10px;background:#76ffdc">Volver a intentar</button></body></html>',{status:503,headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}});
      }
    })());
  }
});