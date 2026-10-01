const CACHE_NAME = 'vd-plenger-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/favicon.png',
  '/vd-plenger-logo.webp'
];

// Install: cache aset awal satu per satu, satu file gagal tidak menggagalkan semuanya
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(ASSETS_TO_CACHE.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

// Activate: hapus cache versi lama
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network first, fallback ke cache (hanya request same-origin)
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Abaikan API Discord, avatar Roblox, hosting video, dll.
  if (url.origin !== self.location.origin) return;
  // Abaikan endpoint API dan video (range request)
  if (url.pathname.startsWith('/api/') || req.headers.has('range')) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        // Navigasi halaman saat offline: tampilkan beranda dari cache
        if (req.mode === 'navigate') {
          const home = await caches.match('/');
          if (home) return home;
        }
        return Response.error();
      })
  );
});

// Terima push dari server dan tampilkan notifikasi
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = { body: event.data && event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title || 'VD Plenger', {
      body: data.body || '',
      icon: '/vd-plenger-logo.webp',
      badge: '/favicon.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' }
    })
  );
});

// Klik notifikasi
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
