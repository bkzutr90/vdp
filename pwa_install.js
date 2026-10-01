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

// 4. Notifikasi sambutan (opsional, dijalankan SETELAH install diterima)
async function askNotification() {
  if (!('Notification' in window) || Notification.permission !== 'default') return;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted' || !('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification('VD Plenger Indonesia 🩸', {
      body: 'Aplikasi VD Plenger berhasil dipasang. Ketuk untuk buka Discord.',
      icon: '/vd-plenger-logo.webp',
      badge: '/favicon.png',
      vibrate: [200, 100, 200],
      tag: 'welcome-pwa',
      data: { url: 'https://discord.gg/hmVrXHJpwp' }
    });
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
