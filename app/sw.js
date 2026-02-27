const CACHE_NAME = 'v1';
const PRECACHE_URLS = ['/', '/manifest.json', '/logo.svg'];

let change_variable = "h";

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) return cachedResponse;
                return fetch(event.request).then(networkResponse => {
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
            .catch(() => {
                if (event.request.mode === 'navigate') {
                    return new Response(
                        '<!DOCTYPE html><html><head><meta charset="utf-8">' +
                        '<title>FileKey - Offline</title></head>' +
                        '<body style="font-family:sans-serif;text-align:center;padding:2em">' +
                        '<h1>You are offline</h1>' +
                        '<p>FileKey requires the initial page load to complete while online. ' +
                        'Please reconnect and refresh.</p></body></html>',
                        { status: 200, headers: { 'Content-Type': 'text/html' } }
                    );
                }
                return new Response('Offline',
                    { status: 503, statusText: 'Service Unavailable' });
            })
    );
});

self.addEventListener('message', messageReceiver);

function messageReceiver(msg) {
    if (msg.ports) {
        switch (msg.data.type) {
        case "check_change_variable":
            msg.ports[0].postMessage({ change_variable });
            break;
        }
    }
}
