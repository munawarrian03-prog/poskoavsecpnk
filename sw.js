// Naikkan versi ini setiap kali file aplikasi diubah agar browser memperbarui cache
const CACHE_NAME = 'kekuatan-app-v14';

// Aset yang disimpan agar aplikasi tetap jalan saat offline
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './laporan-personel.html',
  './fasilitas.html',
  './logbook.html',
  './kejadian.html',
  './rekap.html',
  './jadwal-dinas.html',
  './style.css',
  './layout.css',
  './laporan-personel.css',
  './fasilitas.css',
  './beranda.css',
  './kejadian.css',
  './shell.js',
  './data.js',
  './beranda.js',
  './rekap.js',
  './rekap-pdf.js',
  './personel.js',
  './personel-pdf.js',
  './kategori.js',
  './fasilitas-data.js',
  './fasilitas-pdf.js',
  './logbook-pdf.js',
  './kejadian-data.js',
  './kejadian-nomor.js',
  './kejadian-wa.js',
  './kejadian-pdf.js',
  './kejadian-bast.js',
  './kejadian-bast-data.js',
  './kejadian-bast-nomor.js',
  './kejadian-bast-pdf.js',
  './jadwal-dinas-import.js',
  './manifest.json',
  './fonts/montserrat-latin-400-normal.woff2',
  './fonts/montserrat-latin-500-normal.woff2',
  './fonts/montserrat-latin-600-normal.woff2',
  './fonts/montserrat-latin-700-normal.woff2',
  './fonts/montserrat-latin-800-normal.woff2',
  './fonts/inter-latin-400-normal.woff2',
  './fonts/inter-latin-500-normal.woff2',
  './fonts/inter-latin-600-normal.woff2',
  './fonts/inter-latin-700-normal.woff2',
  './fonts/inter-latin-800-normal.woff2',
  './lib/fonts-montserrat.js',
  './lib/fonts-carlito.js',
  './lib/pdfmake.min.js',
  './lib/html2pdf.bundle.min.js',
  './lib/xlsx.core.min.js',
  './Logo/AVS.png',
  './Logo/AVS-192.png',
  './Logo/AVS-512.png',
  './Logo/AVS-maskable-512.png'
];

const NETWORK_TIMEOUT_MS = 4000;

// Install: simpan aset satu per satu (satu file hilang tidak menggagalkan seluruh instalasi)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(ASSETS_TO_CACHE.map((url) => cache.add(url).catch((err) => {
        console.warn('Gagal menyimpan ke cache:', url, err);
      })))
    )
  );
});

// Activate: hapus cache versi lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Fetch: jaringan dulu (agar selalu versi terbaru), cache bila offline atau jaringan lambat
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (!/^https?:$/.test(new URL(req.url).protocol)) return;

  const network = fetch(req).then((res) => {
    if (res && res.status === 200) {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
    }
    return res;
  });
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS));

  event.respondWith(
    Promise.race([network, timeout]).catch(() =>
      caches.match(req, { ignoreSearch: true })
        .then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))
        .then((hit) => hit || network)
    )
  );
});
