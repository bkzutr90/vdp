/* ============ PWA: service worker + tombol install ============
   Ganti seluruh blok PWA lama di akhir <script> (dari "Registrasi Service Worker"
   sampai "appinstalled") dengan kode di bawah ini.
============================================================== */
let deferredPrompt;
const installBtn = document.getElementById('pwa-install-btn');
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

// 1. Registrasi service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW Registered:', reg.scope))
      .catch(err => console.error('SW Registration Failed:', err));
  });
}

// 2. Android/Chrome/Edge: tangkap event install
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn && !isStandalone) installBtn.style.display = 'inline-block';
});

// 3. iOS Safari tidak punya beforeinstallprompt, tampilkan tombol dengan petunjuk manual
if (isIOS && !isStandalone && installBtn) {
  installBtn.style.display = 'inline-block';
}

// 4a. Web Push: daftarkan perangkat ke server agar bisa menerima broadcast
const VAPID_PUBLIC_KEY = 'OGU9F7RPP4R9HBPX';

const urlB64ToUint8Array = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

async function subscribePush() {
  try {
    if (!('PushManager' in window) || Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ||
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY)
      }));
    await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub)
    });
  } catch (err) {
    console.error('Gagal subscribe push:', err);
  }
}

// Pengguna yang sudah mengizinkan notifikasi sebelumnya ikut didaftarkan otomatis
if ('serviceWorker' in navigator && 'Notification' in window && Notification.permission === 'granted') {
  window.addEventListener('load', subscribePush);
}

// 4. Izin notifikasi (dijalankan SETELAH install diterima)
async function askNotification() {
  if (!('Notification' in window) || Notification.permission !== 'default') return;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted' || !('serviceWorker' in navigator)) return;
    await subscribePush();
  } catch (err) {
    console.error('Gagal meminta izin notifikasi:', err);
  }
}

// 5. Klik tombol install: prompt() HARUS dipanggil pertama, selagi user gesture masih aktif
if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      installBtn.style.display = 'none';
      if (outcome === 'accepted') askNotification();
      return;
    }
    if (isIOS) {
      alert('Di iPhone/iPad: ketuk tombol Share di Safari, lalu pilih "Add to Home Screen".');
    }
  });
}

// 6. Sembunyikan tombol jika sudah ter-install
window.addEventListener('appinstalled', () => {
  console.log('PWA berhasil di-install');
  if (installBtn) installBtn.style.display = 'none';
});
