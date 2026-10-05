/* =====================================================
   SINKRONISASI LINTAS PERANGKAT (Pantau Posko) via Google Apps Script.
   Dipakai agar Admin di komputer LAIN bisa melihat laporan Personel/
   Fasilitas/Log Book yang baru disimpan Posko -- tanpa ini, data hanya
   terlihat di browser tempat laporan itu disimpan (lihat pantau-posko.html).

   PRINSIP: modul ini bersifat ADITIF, bukan pengganti. Simpan lokal
   (localStorage) tetap sumber utama dan tetap instan/berhasil walau
   offline -- pengiriman ke cloud di sini selalu "best-effort" di
   belakang layar lewat antrian yang dicoba ulang otomatis.

   CARA PASANG:
   1. Buat Google Sheet + Apps Script Web App (lihat Code.gs yang
      diberikan terpisah, dan panduan deploy-nya).
   2. Ganti GAS_URL di bawah dengan URL hasil deploy (diakhiri "/exec").
   3. Ganti TOKEN di bawah dengan string acak panjang yang SAMA PERSIS
      dengan Script Property "TOKEN" di Apps Script.
   4. Selama GAS_URL masih placeholder, modul ini otomatis tidak
      melakukan apa-apa (lihat `aktif()`) -- aman dipasang lebih dulu
      tanpa mengubah perilaku aplikasi.
   ===================================================== */
(function (root) {
  'use strict';

  const GAS_URL = 'GANTI_DENGAN_URL_WEB_APP_APPS_SCRIPT'; // contoh: https://script.google.com/macros/s/xxxxx/exec
  const TOKEN = 'GANTI_DENGAN_TOKEN_RAHASIA';               // harus sama persis dengan Script Property "TOKEN"

  const QUEUE_KEY = 'avsSyncQueue';
  const FLUSH_MS = 15000;

  function aktif() { return /^https:\/\/script\.google(usercontent)?\.com\//.test(GAS_URL) && TOKEN && TOKEN.indexOf('GANTI_') !== 0; }

  function antrianBaca() {
    try { const a = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function antrianTulis(q) {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-200))); } catch (e) {}
  }
  // Edit berulang pada id yang sama cukup kirim versi TERAKHIR -- hindari antrian membengkak
  // kalau satu laporan diubah berkali-kali sebelum sempat terkirim.
  function antrikan(jenis, aksi, data) {
    const q = antrianBaca();
    const idx = q.findIndex((x) => x.jenis === jenis && x.data && data && x.data.id === data.id);
    const entri = { jenis, aksi, data, waktu: Date.now() };
    if (idx !== -1) q[idx] = entri; else q.push(entri);
    antrianTulis(q);
  }

  function kirimSatu(entri) {
    // Sengaja TANPA header Content-Type kustom (body string -> browser otomatis pakai
    // text/plain) dan token lewat body, BUKAN header -- supaya fetch jadi "simple request"
    // dan tidak memicu preflight OPTIONS (Apps Script Web App tidak bisa menjawab preflight).
    return fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ token: TOKEN, jenis: entri.jenis, aksi: entri.aksi, data: entri.data }) })
      .then((r) => r.json()).then((j) => !!(j && j.ok)).catch(() => false);
  }

  let sedangFlush = false;
  function flush() {
    if (!aktif() || sedangFlush) return;
    let sisa = antrianBaca(); if (!sisa.length) return;
    sedangFlush = true;
    (async () => {
      while (sisa.length) {
        const ok = await kirimSatu(sisa[0]);
        if (!ok) break; // gagal (offline/GAS error) -> hentikan, sisanya dicoba lagi di flush berikutnya
        sisa = sisa.slice(1);
        antrianTulis(sisa); // simpan progres supaya yang sudah sukses tidak terkirim ulang
      }
      sedangFlush = false;
    })();
  }

  function kirim(jenis, record) { if (!aktif()) return; antrikan(jenis, 'simpan', record); flush(); }
  function hapus(jenis, id) { if (!aktif()) return; antrikan(jenis, 'hapus', { id }); flush(); }

  function ambilSemua(jenis) {
    if (!aktif()) return Promise.resolve([]);
    return fetch(`${GAS_URL}?token=${encodeURIComponent(TOKEN)}&jenis=${encodeURIComponent(jenis)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => (j && j.ok && Array.isArray(j.data)) ? j.data : [])
      .catch(() => []);
  }

  // Gabung daftar lokal + daftar dari server, upsert berdasarkan id. Yang menang = catatan
  // dengan diperbaruiPada/dibuatPada TERBARU (string ISO/locale, aman dibandingkan sebagai
  // teks selama formatnya konsisten -- dipakai apa adanya dari AVS.catatJejak di shell.js).
  // Laporan milik browser ini sendiri selalu sudah lebih baru dari salinan server yang belum
  // sempat menyusul, jadi tidak ada "kedipan" data berubah-ubah saat baru saja disimpan.
  function waktuRec(r) { return (r && (r.diperbaruiPada || r.dibuatPada)) || ''; }
  function gabung(listLokal, listRemote) {
    const peta = new Map();
    (listRemote || []).forEach((r) => { if (r && r.id) peta.set(r.id, r); });
    (listLokal || []).forEach((r) => {
      if (!r || !r.id) return;
      const ada = peta.get(r.id);
      if (!ada || waktuRec(r) >= waktuRec(ada)) peta.set(r.id, r);
    });
    return Array.from(peta.values());
  }

  root.addEventListener('online', flush);
  setInterval(flush, FLUSH_MS);
  flush(); // coba kirim sisa antrian dari sesi sebelumnya begitu halaman dibuka

  root.AVS_SYNC = { kirim, hapus, ambilSemua, gabung, aktif };
})(window);
