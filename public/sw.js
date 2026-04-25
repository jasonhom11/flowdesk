const CACHE = 'flowdesk-v2';
const PRECACHE = ['/manifest.json', '/icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) return;

  // Navigation requests (the HTML page) — always fetch fresh, cache as fallback
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(e.request).then(hit => hit || caches.match('/')))
    );
    return;
  }

  // Static assets — cache first
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
