self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('cec-sec8-v3').then((cache) => cache.addAll([
      './index.html',
      './style.css',
      './app.js',
      './manifest.json'
    ]))
  );
});
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((resp) => resp || fetch(e.request))
  );
});