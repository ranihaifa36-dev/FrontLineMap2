const CACHE_NAME = 'kiryat-empire-static-v1';
const STATIC_ASSETS = ['./empire-flag.webp'];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)));
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(
        keys.filter(key => key.startsWith('kiryat-empire-static-') && key !== CACHE_NAME)
            .map(key => caches.delete(key))
    )));
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (url.origin === self.location.origin && url.pathname.endsWith('/empire-flag.webp')) {
        event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
            if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
            return response;
        })));
    }
});
