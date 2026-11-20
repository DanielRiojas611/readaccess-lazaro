// Lázaro — modo offline. Cachea la app y las bibliotecas locales (OCR, PDF, rostros) tras el primer uso.
const VERSION='lazaro-v2.5';
const SHELL=['/','/index.html','/manifest.webmanifest','/icon.svg','/icon-192.png','/icon-512.png'];
const CDN=['cdn.jsdelivr.net','cdnjs.cloudflare.com','tessdata.projectnaptha.com'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const req=e.request,url=new URL(req.url);
  if(req.method!=='GET')return;
  if(url.origin===location.origin&&url.pathname.startsWith('/api/'))return; // IA siempre en línea
  if(req.mode==='navigate'){e.respondWith(fetch(req).then(r=>{const c=r.clone();caches.open(VERSION).then(x=>x.put('/index.html',c));return r}).catch(()=>caches.match('/index.html')));return}
  if(url.origin===location.origin||CDN.includes(url.hostname)){
    e.respondWith(caches.match(req).then(hit=>{const net=fetch(req).then(r=>{if(r.ok||r.type==='opaque'){const c=r.clone();caches.open(VERSION).then(x=>x.put(req,c))}return r});return hit||net}));
  }
});
