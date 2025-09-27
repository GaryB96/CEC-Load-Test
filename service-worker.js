const CACHE_NAME = 'cec-sec8-v5';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/load-home-bolt.svg',
  './icons/load-home-bolt-192.png',
  './icons/load-home-bolt-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  // Take control of uncontrolled clients and remove old caches
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
      await self.clients.claim();
      // Notify controlled clients that a new version is available
      try {
        const allClients = await self.clients.matchAll({ includeUncontrolled: true });
        allClients.forEach(client => {
          client.postMessage({ type: 'NEW_VERSION_AVAILABLE' });
        });
      } catch (e) { /* ignore messaging errors */ }
    })()
  );
});

// Respond to messages from the client (e.g., skip waiting request)
self.addEventListener('message', (e) => {
  try{
    const data = e && e.data ? e.data : {};
    if(data && data.type === 'SKIP_WAITING'){
      // Notify the sender that we received the skip request
      try{
        if(e.source && typeof e.source.postMessage === 'function'){
          e.source.postMessage({ type: 'SKIP_WAITING_ACK' });
        }
      }catch(err){}
      Promise.resolve().then(function(){
        return self.skipWaiting();
      }).then(function(){
        // After skipWaiting resolves, inform all clients (activation will follow)
        try{
          self.clients.matchAll({ includeUncontrolled: true }).then(function(all){ all.forEach(function(c){ try{ c.postMessage({ type: 'SKIP_WAITING_DONE' }); }catch(e){} }); }).catch(function(){});
        }catch(e){}
      }).catch(function(){/* ignore */});
    }
  }catch(err){ /* ignore */ }
});

// Fetch handler: treat navigation (HTML) requests as network-first so users
// get updated HTML/app shell when online; use cache-first for static assets.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  // only handle GET requests
  if (req.method !== 'GET') return;

  // network-first for navigation or HTML pages
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith((async () => {
      try {
        const networkResponse = await fetch(req);
        // clone before doing any async cache work to avoid body-use races
        const responseClone = networkResponse.clone();
        try {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(req, responseClone);
        } catch (err) {
          // ignore cache write errors
        }
        return networkResponse;
      } catch (err) {
        const cached = await caches.match('./index.html');
        return cached || Response.error();
      }
    })());
    return;
  }

  // cache-first for other requests (CSS, JS, images)
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const networkResponse = await fetch(req);
      // clone before any awaits
      const responseClone = networkResponse.clone();
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(req, responseClone);
      } catch (err) {
        // ignore caching errors
      }
      return networkResponse;
    } catch (err) {
      return caches.match('./index.html');
    }
  })());
});