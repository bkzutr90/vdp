const CACHE_NAME = 'vd-plenger-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/favicon.png',
  '/vd-plenger-logo.webp'
];

// Install Service Worker & Simpan Cache Awal
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Aktivasi & Hapus Cache Lama jika Ada Update
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Strategi Fetch: Network First, Fallback ke Cache
self.addEventListener('fetch', (e) => {
  // Hanya proses request GET
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        // Jika berhasil, simpan/perbarui cache terbaru
        if (networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Jika offline / gagal fetch, ambil dari cache
        return caches.match(e.request);
      })
  );
});

// Listener saat notifikasi di HP diklik
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data?.url || '/');
      }
    })
  );
});
