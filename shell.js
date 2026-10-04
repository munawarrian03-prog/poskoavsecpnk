/* =====================================================
   SHELL BERSAMA: navigasi utama, penanda offline, tanggal,
   pemilih bulan, dan kunci "hanya komputer".
   Dipakai oleh Beranda, Laporan Personel, dan Laporan Kejadian.
   ===================================================== */
(function (root) {
  'use strict';
  const AVS = root.AVS = root.AVS || {};

  const IC = {
    home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
    people: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
    doc: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
    cal: 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z',
    search: 'M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    wrench: 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6l-3 3-4.3-4.3C.6 7.1 1 10.1 3 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.4-.5.4-1.1 0-1.4z',
    book: 'M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H8V4h1v14l3-1.5 3 1.5V4h3v16z',
    chart: 'M4 20h3v-9H4v9zm6.5 0h3V4h-3v16zM17 20h3v-6h-3v6z',
    caret: 'M7 10l5 5 5-5z',
    user: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
    keluar: 'M14 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2h-2v2H5V5h7v2h2zm1 2v3h-7v2h7v3l5-4-5-4z'
  };
  AVS.IC = IC;
  AVS.svg = (p) => `<svg viewBox="0 0 24 24"><path d="${p}"/></svg>`;
  AVS.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  AVS.BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  AVS.BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  AVS.HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  AVS.tanggalLengkap = (d) => `${AVS.HARI[d.getDay()]}, ${d.getDate()} ${AVS.BULAN[d.getMonth()]} ${d.getFullYear()}`;

  // Pastikan font Montserrat (dan Inter cadangannya) sudah benar-benar termuat
  // sebelum html2canvas "memotret" HTML jadi gambar untuk PDF — kalau dipotret
  // sebelum font siap, hasilnya terlanjur pakai font bawaan sistem dan tidak
  // berubah lagi meski font baru selesai dimuat sesaat kemudian.
  AVS.tungguFontSiap = async function () {
    try {
      if (!document.fonts) return;
      const berat = [400, 500, 600, 700, 800];
      await Promise.all(berat.flatMap((w) => [
        document.fonts.load(`${w} 12px Montserrat`),
        document.fonts.load(`${w} 12px Inter`)
      ]));
      await Promise.race([document.fonts.ready, new Promise((res) => setTimeout(res, 1500))]);
    } catch (e) { /* browser lama tanpa document.fonts: lanjut apa adanya */ }
  };

  /* ---------- Bilah atas + navigasi utama ----------
     Beranda + 3 menu pertama per peran bersifat TETAP (statis, tidak pernah disembunyikan
     atau bergeser). Tepat setelah itu ada SATU slot dinamis (default: Laporan Kejadian),
     lalu ikon carousel di ujung kanan yang membuka daftar menu tersembunyi (Jadwal Dinas,
     dkk). Klik salah satu item di daftar itu -> ia maju mengisi slot dinamis, dan
     penghuni slot dinamis sebelumnya otomatis masuk lagi ke daftar tersembunyi (lihat
     Logika Penukaran Menu). Isi slot dinamis disimpan per peran di localStorage supaya
     konsisten dipindah antar halaman (tiap halaman = full page load baru). */
  const JUMLAH_TETAP = 3; // selain Beranda
  const MENU_ADMIN = [
    ['pantau', 'Pantau Laporan', 'pantau-posko.html', 'search'],
    ['rekap', 'Rekap', 'rekap.html', 'chart'],
    ['kejadian', 'Laporan Kejadian', 'kejadian.html', 'doc'],
    ['jadwal', 'Jadwal Dinas', 'jadwal-dinas.html', 'cal']
  ];
  const MENU_POSKO = [
    ['personel', 'Laporan Personel', 'laporan-personel.html', 'people'],
    ['fasilitas', 'Laporan Fasilitas', 'fasilitas.html', 'wrench'],
    ['logbook', 'Log Book', 'logbook.html', 'book'],
    ['kejadian', 'Laporan Kejadian', 'kejadian.html', 'doc'],
    ['jadwal', 'Jadwal Dinas', 'jadwal-dinas.html', 'cal']
  ];
  const kunciDinamis = (peran) => 'avsNavDinamis_' + peran;
  function menuPeran(peran) { return peran === 'admin' ? MENU_ADMIN : MENU_POSKO; }
  function bacaDinamis(peran, urutanKey) {
    const bawaan = urutanKey[JUMLAH_TETAP] || urutanKey[urutanKey.length - 1]; // default: item ke-4 (mis. Kejadian)
    const simpan = localStorage.getItem(kunciDinamis(peran));
    return (simpan && urutanKey.includes(simpan)) ? simpan : bawaan;
  }
  function simpanDinamis(peran, key) { localStorage.setItem(kunciDinamis(peran), key); }
  function renderNav(aktif) {
    const peran = (typeof root.AVS_PERAN === 'function') ? root.AVS_PERAN() : null;
    const peranKey = peran || 'posko';
    const menu = menuPeran(peranKey);
    const byKey = {};
    menu.forEach(([k, t, href, ic]) => { byKey[k] = { t, href, ic }; });
    const urutanKey = menu.map((it) => it[0]);
    const tetap = urutanKey.slice(0, JUMLAH_TETAP);
    let dinamis = bacaDinamis(peranKey, urutanKey);
    // Kalau halaman yang sedang aktif ada di daftar tersembunyi (mis. dibuka langsung lewat
    // URL/bookmark, bukan lewat klik carousel), majukan ia ke slot dinamis supaya tetap
    // kelihatan -- menu aktif tidak boleh tersembunyi di balik ikon carousel.
    if (aktif !== 'beranda' && urutanKey.includes(aktif) && !tetap.includes(aktif) && aktif !== dinamis) {
      dinamis = aktif;
      simpanDinamis(peranKey, dinamis);
    }
    const tersembunyi = urutanKey.filter((k) => !tetap.includes(k) && k !== dinamis);
    const tombolBeranda = `<a class="nav-btn ${aktif === 'beranda' ? 'active' : ''}" href="index.html" title="Beranda">${AVS.svg(IC.home)}<span>Beranda</span></a>`;
    const tombolMenu = (k) => { const it = byKey[k]; return `<a class="nav-btn ${k === aktif ? 'active' : ''}" href="${it.href}" title="${AVS.esc(it.t)}">${AVS.svg(IC[it.ic])}<span>${AVS.esc(it.t)}</span></a>`; };
    const ddItem = (k) => { const it = byKey[k]; return `<a href="${it.href}" data-k="${k}" data-peran="${peranKey}">${AVS.svg(IC[it.ic])}${AVS.esc(it.t)}</a>`; };
    // Ikon tombol carousel mengikuti menu PALING DEPAN di daftar tersembunyi (bukan ikon
    // titik-tiga generik) -- jadi pratinjau menu berikutnya, bukan sekadar "ada lagi nih".
    let ikonCarousel = '';
    if (tersembunyi.length) {
      const itDekat = byKey[tersembunyi[0]];
      ikonCarousel = `<div class="nav-ov"><button type="button" class="nav-btn nav-ov-btn" title="${AVS.esc(itDekat.t)}">${AVS.svg(IC[itDekat.ic])}</button><div class="nav-ov-dd">${tersembunyi.map(ddItem).join('')}</div></div>`;
    }
    return tombolBeranda + tetap.map(tombolMenu).join('') + tombolMenu(dinamis) + ikonCarousel;
  }
  // Dipanggil saat salah satu item di daftar tersembunyi diklik: pindahkan ia ke slot dinamis
  // SEBELUM link-nya dibiarkan navigasi normal ke halaman tujuan (localStorage sinkron,
  // jadi aman tanpa preventDefault). Penghuni slot dinamis sebelumnya otomatis kembali ke
  // daftar tersembunyi dgn sendirinya di render berikutnya (dihitung dari "tetap"+dinamis baru).
  function pilihDariOverflow(peran, key) { simpanDinamis(peran, key); }
  AVS.tanggalPendek = (d) => `${AVS.HARI[d.getDay()].slice(0, 3)}, ${d.getDate()} ${AVS.BULAN_PENDEK[d.getMonth()]} ${d.getFullYear()}`;
  function renderProfil() {
    if (typeof root.AVS_PERAN !== 'function') return '';
    const peran = root.AVS_PERAN();
    if (!peran) return '';
    const label = peran.charAt(0).toUpperCase() + peran.slice(1);
    return `<div class="prof-wrap"><button type="button" class="prof-btn" title="Akun">${AVS.svg(IC.user)}</button>
<div class="prof-dd"><div class="prof-info"><div class="prof-peran">${AVS.esc(label)}</div><div class="prof-ket">Sedang login</div></div>
<button type="button" class="prof-keluar" onclick="AVS_KELUAR()">${AVS.svg(IC.keluar)}Keluar</button></div></div>`;
  }
  AVS.nav = function (aktif, el) {
    el = el || document.getElementById('topBar') || document.getElementById('mainNav');
    if (!el) return;
    el.dataset.aktifHalaman = aktif; // diingat supaya bisa di-render ulang stlh gerbang PIN selesai (lihat AVS.renderNavUlang)
    el.className = 'topbar';
    el.innerHTML = `<div class="lg"><img src="Logo/AVS-512.png" alt="Logo Kapuas Supadio"></div>` +
      `<div class="ttl"><b>KAPUAS Supadio</b><span>Kanal Aplikasi Pelaporan Unit Airport Security</span></div>` +
      `<nav>${renderNav(aktif)}</nav>` +
      `<div class="tsp"></div><div class="chip2">${AVS.svg(IC.cal)}${AVS.tanggalPendek(new Date())}</div>${renderProfil()}`;
    pasangTombolProfil(el);
    pasangCarousel(el);
    document.addEventListener('click', (e) => {
      el.querySelectorAll('.prof-wrap.open, .nav-ov.open').forEach((w) => { if (!w.contains(e.target)) w.classList.remove('open'); });
    });
  };
  function pasangCarousel(el) {
    el.querySelectorAll('.nav-ov-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const wrap = btn.parentElement, sudahBuka = wrap.classList.contains('open');
        el.querySelectorAll('.nav-ov.open').forEach((w) => w.classList.remove('open'));
        wrap.classList.toggle('open', !sudahBuka);
      });
    });
    el.querySelectorAll('.nav-ov-dd a[data-k]').forEach((a) => {
      a.addEventListener('click', () => { pilihDariOverflow(a.dataset.peran, a.dataset.k); }); // navigasi href dibiarkan jalan normal
    });
  }
  function pasangTombolProfil(el) {
    const profBtn = el.querySelector('.prof-btn');
    if (profBtn) profBtn.addEventListener('click', (e) => { e.preventDefault(); profBtn.parentElement.classList.toggle('open'); });
  }
  // Render ulang ikon profil setelah login berhasil (dipanggil dari akses.js) -- dibutuhkan
  // karena topbar bisa sudah ter-render SEBELUM peran diketahui (gerbang PIN masih terbuka).
  AVS.renderProfilUlang = function () {
    const topBar = document.getElementById('topBar');
    if (!topBar || !topBar.querySelector('nav')) return; // nav belum pernah dirender -- biarkan AVS.nav() yg nanti menanganinya
    const lama = topBar.querySelector('.prof-wrap');
    const html = renderProfil();
    if (!html) { if (lama) lama.remove(); return; }
    if (lama) lama.outerHTML = html; else topBar.insertAdjacentHTML('beforeend', html);
    pasangTombolProfil(topBar);
  };
  // Render ulang SELURUH topbar (menu + profil) setelah gerbang PIN selesai -- dipanggil dari
  // akses.js. Dibutuhkan krn tiap halaman biasanya memanggil AVS.nav(aktif) sendiri lewat
  // DOMContentLoaded, TIDAK MENUNGGU gerbang PIN selesai -- kalau belum ada sesi saat itu,
  // menunya kepalang dirender pakai peran bawaan (lihat renderNav: "peran || 'posko'") dan
  // tidak pernah diperbarui lagi walau user lalu berhasil login sbg peran lain (termasuk
  // peran yg SAMA setelah logout+login ulang) -- menu jadi salah/basi sampai halaman di-reload
  // manual. Aman dipanggil kapan saja: no-op kalau topbar belum pernah dirender sama sekali.
  AVS.renderNavUlang = function () {
    const topBar = document.getElementById('topBar');
    if (!topBar || topBar.dataset.aktifHalaman === undefined) return;
    AVS.nav(topBar.dataset.aktifHalaman, topBar);
  };

  // Tautan pengiriman WhatsApp Web (dipakai laporan personel dan laporan kejadian agar perilakunya sama)
  AVS.urlWA = (teks) => 'https://web.whatsapp.com/send?text=' + encodeURIComponent(teks);

  /* ---------- Mode fokus: sembunyikan bilah atas agar area isian lebih luas ---------- */
  AVS.toggleFokus = function (paksa) {
    const on = paksa === undefined ? !document.body.classList.contains('focus') : !!paksa;
    document.body.classList.toggle('focus', on);
    let x = document.getElementById('fokusExit');
    if (on && !x) {
      x = document.createElement('button'); x.id = 'fokusExit'; x.type = 'button'; x.textContent = 'Keluar mode fokus ✕';
      x.onclick = () => AVS.toggleFokus(false); document.body.appendChild(x);
    }
    if (x) x.style.display = on ? 'block' : 'none';
  };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('focus') && !document.querySelector('.ov[style*="flex"]')) AVS.toggleFokus(false); });

  /* =====================================================
     MESIN PEMBANDING RIWAYAT (butir 21): membandingkan laporan lama vs
     baru dan menghasilkan daftar { label, jenis, lama, baru } atau
     { label, jenis:'daftar', perubahan:[{aksi,teks|lama|baru}] } per bagian
     yang berbeda. Fungsi murni (tanpa DOM) agar mudah diuji.
     ===================================================== */
  const rapikanD = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const potongD = (s, n) => { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n).trimEnd() + '…' : s; }; 
  const PANJANG_TEKS = 160, PANJANG_PANJANG = 600;

  // Diff satu field teks pendek. null jika sama.
  function diffTeks(label, lama, baru, maks) {
    lama = rapikanD(lama); baru = rapikanD(baru); if (lama === baru) return null;
    maks = maks || PANJANG_TEKS;
    return { label, jenis: 'teks', lama: potongD(lama, maks) || '(kosong)', baru: potongD(baru, maks) || '(kosong)' };
  }
  // Diff satu field teks panjang (kronologis, informasi kasus, penutup). null jika sama.
  function diffTeksPanjang(label, lama, baru, maks) {
    lama = rapikanD(lama); baru = rapikanD(baru); if (lama === baru) return null;
    maks = maks || PANJANG_PANJANG;
    return { label, jenis: 'panjang', lama: potongD(lama, maks) || '(kosong)', baru: potongD(baru, maks) || '(kosong)' };
  }
  // Diff dua daftar (array apa pun) dengan mencocokkan baris yang teksnya persis sama
  // (dianggap tak berubah); sisanya dipasangkan berurutan sebagai ubah/tambah/hapus.
  function diffDaftar(label, lamaArr, baruArr, teksFn) {
    lamaArr = Array.isArray(lamaArr) ? lamaArr : []; baruArr = Array.isArray(baruArr) ? baruArr : [];
    const teksL = lamaArr.map(teksFn), teksB = baruArr.map(teksFn);
    const dipakaiB = new Array(teksB.length).fill(false), sisaL = [];
    teksL.forEach((tl) => {
      const j = teksB.findIndex((tb, jj) => !dipakaiB[jj] && tb === tl);
      if (j !== -1) dipakaiB[j] = true; else sisaL.push(tl);
    });
    const sisaB = teksB.filter((tb, j) => !dipakaiB[j]);
    const perubahan = [], n = Math.max(sisaL.length, sisaB.length);
    for (let i = 0; i < n; i++) {
      if (i < sisaL.length && i < sisaB.length) perubahan.push({ aksi: 'ubah', lama: potongD(sisaL[i], PANJANG_TEKS), baru: potongD(sisaB[i], PANJANG_TEKS) });
      else if (i < sisaB.length) perubahan.push({ aksi: 'tambah', teks: potongD(sisaB[i], PANJANG_TEKS) });
      else perubahan.push({ aksi: 'hapus', teks: potongD(sisaL[i], PANJANG_TEKS) });
    }
    if (!perubahan.length) return null;
    return { label, jenis: 'daftar', perubahan };
  }
  // Gabungkan beberapa hasil diffDaftar (mis. dari beberapa kategori/pos) jadi satu bagian.
  function gabungDaftar(label, hasilList) {
    const perubahan = [].concat(...hasilList.filter(Boolean).map((h) => h.perubahan));
    return perubahan.length ? { label, jenis: 'daftar', perubahan } : null;
  }

  /* ---------- Diff khusus Laporan Kejadian ---------- */
  AVS.diffKejadian = function (lama, baru) {
    lama = lama || {}; baru = baru || {};
    const hasil = [];
    const org = (kL, kJ) => { const l = (lama[kJ] || {}), b = (baru[kJ] || {}); const r1 = diffTeks(kL + ' · Nama', l.nama, b.nama); const r2 = diffTeks(kL + ' · Jabatan', l.jabatan, b.jabatan); if (r1) hasil.push(r1); if (r2) hasil.push(r2); };
    org('Disusun oleh', 'preparedBy'); org('Ditandatangani', 'signedBy'); org('Disetujui oleh', 'approvedBy'); org('Distribusi & pelayanan', 'distribution');
    [diffTeks('Tanggal', lama.tanggal, baru.tanggal), diffTeks('Nomor laporan', lama.fileNumber, baru.fileNumber), diffTeks('Tempat penulisan', lama.tempat, baru.tempat),
      diffTeksPanjang('Informasi kasus', lama.caseInfo, baru.caseInfo), diffTeksPanjang('Kronologis', lama.kronologis, baru.kronologis), diffTeksPanjang('Penutup', lama.penutup, baru.penutup),
      diffTeks('Judul data (informasi lainnya)', lama.dataJudul, baru.dataJudul)
    ].forEach((r) => r && hasil.push(r));
    const dh = diffDaftar('Dasar hukum', lama.dasarHukum, baru.dasarHukum, (s) => rapikanD(s)); if (dh) hasil.push(dh);
    const tl = diffDaftar('Tindak lanjut', lama.tindakLanjut, baru.tindakLanjut, (x) => (rapikanD(x && x.jam) || '-') + ' WIB — ' + rapikanD(x && x.uraian)); if (tl) hasil.push(tl);
    const dr = diffDaftar('Informasi lainnya', lama.dataRows, baru.dataRows, (x) => (rapikanD(x && x.label) || '-') + ': ' + rapikanD(x && x.nilai)); if (dr) hasil.push(dr);
    const tp = diffDaftar('Terlampir', lama.terlampir, baru.terlampir, (s) => rapikanD(s)); if (tp) hasil.push(tp);
    // foto: hanya keterangan & jumlah (gambar lama tidak disimpan)
    const fl = Array.isArray(lama.fotos) ? lama.fotos : [], fb = Array.isArray(baru.fotos) ? baru.fotos : [];
    const idL = fl.map((f) => f && f.dataUrl), idB = fb.map((f) => f && f.dataUrl);
    const ditambah = fb.filter((f) => !idL.includes(f && f.dataUrl)), dihapus = fl.filter((f) => !idB.includes(f && f.dataUrl));
    const fotoPerub = [];
    if (ditambah.length) fotoPerub.push({ aksi: 'tambah', teks: `Ditambah ${ditambah.length} foto` + (ditambah.some((f) => rapikanD(f.caption)) ? ' (' + ditambah.map((f) => rapikanD(f.caption) || 'tanpa keterangan').join(', ') + ')' : '') });
    if (dihapus.length) fotoPerub.push({ aksi: 'hapus', teks: `Dihapus ${dihapus.length} foto` + (dihapus.some((f) => rapikanD(f.caption)) ? ' (' + dihapus.map((f) => rapikanD(f.caption) || 'tanpa keterangan').join(', ') + ')' : '') });
    fb.forEach((f) => { const l = fl.find((x) => x && x.dataUrl === (f && f.dataUrl)); if (l && rapikanD(l.caption) !== rapikanD(f.caption)) fotoPerub.push({ aksi: 'ubah', lama: rapikanD(l.caption) || '(tanpa keterangan)', baru: rapikanD(f.caption) || '(tanpa keterangan)' }); });
    if (fotoPerub.length) hasil.push({ label: 'Foto lampiran', jenis: 'daftar', perubahan: fotoPerub });
    // tanda tangan: hanya menyebut peran mana yang berubah, tidak menyimpan gambar
    const peranTtd = [['preparedBy', 'Disusun oleh'], ['signedBy', 'Ditandatangani'], ['approvedBy', 'Disetujui oleh']], ttdPerub = [];
    peranTtd.forEach(([k, lbl]) => {
      const l = (lama.ttd || {})[k], b = (baru.ttd || {})[k], lAda = !!(l && l.dataUrl), bAda = !!(b && b.dataUrl);
      if (!lAda && bAda) ttdPerub.push({ aksi: 'tambah', teks: `Tanda tangan ${lbl} dipasang` });
      else if (lAda && !bAda) ttdPerub.push({ aksi: 'hapus', teks: `Tanda tangan ${lbl} dihapus` });
      else if (lAda && bAda && l.dataUrl !== b.dataUrl) ttdPerub.push({ aksi: 'ubah', teks: `Tanda tangan ${lbl} diganti` });
    });
    if (ttdPerub.length) hasil.push({ label: 'Tanda tangan', jenis: 'daftar', perubahan: ttdPerub });
    return hasil;
  };

  /* ---------- Diff khusus Laporan Personel ---------- */
  AVS.diffPersonel = function (lama, baru) {
    lama = lama || {}; baru = baru || {};
    const hasil = [];
    [diffTeks('Tanggal', lama.tanggal, baru.tanggal), diffTeks('Shift', lama.shift, baru.shift), diffTeks('Regu', lama.regu, baru.regu)].forEach((r) => r && hasil.push(r));
    const kL = Array.isArray(lama.kategoriKekuatan) ? lama.kategoriKekuatan : [], kB = Array.isArray(baru.kategoriKekuatan) ? baru.kategoriKekuatan : [];
    const kekuatanPerub = [], absenDaftar = [];
    kB.forEach((kb) => {
      const kl = kL.find((x) => x && x.id === kb.id);
      const nama = rapikanD(kb.nama) || '(kategori)';
      if (!kl) { kekuatanPerub.push({ aksi: 'tambah', teks: `Ditambah kategori: ${nama} (Jumlah ${kb.jml || 0})` }); (kb.absen || []).forEach((p) => absenDaftar.push({ aksi: 'tambah', teks: `${nama} — ${rapikanD(p.nama)} (${rapikanD(p.alasan)})` })); return; }
      if (Number(kl.jml || 0) !== Number(kb.jml || 0)) kekuatanPerub.push({ aksi: 'ubah', lama: `${nama} — Jumlah: ${kl.jml || 0}`, baru: `${nama} — Jumlah: ${kb.jml || 0}` });
      if (rapikanD(kl.nama) !== rapikanD(kb.nama)) kekuatanPerub.push({ aksi: 'ubah', lama: `Nama kategori: ${rapikanD(kl.nama)}`, baru: `Nama kategori: ${rapikanD(kb.nama)}` });
      if (rapikanD(kl.mulai) !== rapikanD(kb.mulai) || rapikanD(kl.selesai) !== rapikanD(kb.selesai)) kekuatanPerub.push({ aksi: 'ubah', lama: `${nama} — Jam: ${rapikanD(kl.mulai) || '-'}–${rapikanD(kl.selesai) || '-'}`, baru: `${nama} — Jam: ${rapikanD(kb.mulai) || '-'}–${rapikanD(kb.selesai) || '-'}` });
      const d = diffDaftar('x', kl.absen, kb.absen, (p) => rapikanD(p && p.nama) + ' (' + rapikanD(p && p.alasan) + (rapikanD(p && p.ket) ? ': ' + rapikanD(p.ket) : '') + ')');
      if (d) d.perubahan.forEach((x) => absenDaftar.push(Object.assign({}, x, { teks: x.teks != null ? `${nama} — ${x.teks}` : undefined, lama: x.lama != null ? `${nama} — ${x.lama}` : undefined, baru: x.baru != null ? `${nama} — ${x.baru}` : undefined })));
    });
    kL.forEach((kl) => { if (!kB.find((x) => x && x.id === kl.id)) { const nama = rapikanD(kl.nama) || '(kategori)'; kekuatanPerub.push({ aksi: 'hapus', teks: `Dihapus kategori: ${nama}` }); (kl.absen || []).forEach((p) => absenDaftar.push({ aksi: 'hapus', teks: `${nama} — ${rapikanD(p.nama)} (${rapikanD(p.alasan)})` })); } });
    if (kekuatanPerub.length) hasil.push({ label: 'Kekuatan personel', jenis: 'daftar', perubahan: kekuatanPerub });
    if (absenDaftar.length) hasil.push({ label: 'Personel tidak hadir', jenis: 'daftar', perubahan: absenDaftar });
    const pL = Array.isArray(lama.posPenempatan) ? lama.posPenempatan : [], pB = Array.isArray(baru.posPenempatan) ? baru.posPenempatan : [];
    const posDaftar = [];
    pB.forEach((pb) => {
      const pl = pL.find((x) => x && x.id === pb.id), nama = rapikanD(pb.name) || '(pos)';
      const d = diffDaftar('x', pl ? pl.personel : [], pb.personel, (p) => rapikanD(p && p.nama) + (rapikanD(p && p.peran) ? ' (' + rapikanD(p.peran) + ')' : ''));
      if (d) d.perubahan.forEach((x) => posDaftar.push(Object.assign({}, x, { teks: x.teks != null ? `${nama} — ${x.teks}` : undefined, lama: x.lama != null ? `${nama} — ${x.lama}` : undefined, baru: x.baru != null ? `${nama} — ${x.baru}` : undefined })));
    });
    pL.forEach((pl) => { if (!pB.find((x) => x && x.id === pl.id)) (pl.personel || []).forEach((p) => posDaftar.push({ aksi: 'hapus', teks: `${rapikanD(pl.name)} — ${rapikanD(p.nama)}` })); });
    if (posDaftar.length) hasil.push({ label: 'Penempatan personel', jenis: 'daftar', perubahan: posDaftar });
    return hasil;
  };

  /* ---------- Diff khusus Laporan Fasilitas ---------- */
  // rec: { tanggal, shift, regu, posFasilitas: [{ id, name, items: [{id,name,bentuk,kondisi,status,keterangan, jumlah,rusak, lengkap}] }] }
  AVS.diffFasilitas = function (lama, baru) {
    lama = lama || {}; baru = baru || {};
    const hasil = [];
    [diffTeks('Tanggal', lama.tanggal, baru.tanggal), diffTeks('Shift', lama.shift, baru.shift), diffTeks('Regu', lama.regu, baru.regu)].forEach((r) => r && hasil.push(r));
    const teksItem = (it) => {
      if (!it) return '';
      if (it.bentuk === 'B') return `${rapikanD(it.name)} — Jumlah:${it.jumlah || 0} Rusak:${it.rusak || 0}${rapikanD(it.keterangan) ? ': ' + rapikanD(it.keterangan) : ''}`;
      if (it.bentuk === 'C') return `${rapikanD(it.name)} — ${it.lengkap ? 'Lengkap' : 'Tidak Lengkap'}${rapikanD(it.keterangan) ? ': ' + rapikanD(it.keterangan) : ''}`;
      return `${rapikanD(it.name)} — ${it.kondisi || 'Baik'}/${it.status || 'Digunakan'}${rapikanD(it.keterangan) ? ': ' + rapikanD(it.keterangan) : ''}`;
    };
    const pL = Array.isArray(lama.posFasilitas) ? lama.posFasilitas : [], pB = Array.isArray(baru.posFasilitas) ? baru.posFasilitas : [];
    const itemDaftar = [];
    pB.forEach((pb) => {
      const pl = pL.find((x) => x && x.id === pb.id), namaPos = rapikanD(pb.name) || '(pos)';
      const d = diffDaftar('x', pl ? pl.items : [], pb.items, teksItem);
      if (d) d.perubahan.forEach((x) => itemDaftar.push(Object.assign({}, x, { teks: x.teks != null ? `${namaPos} — ${x.teks}` : undefined, lama: x.lama != null ? `${namaPos} — ${x.lama}` : undefined, baru: x.baru != null ? `${namaPos} — ${x.baru}` : undefined })));
    });
    pL.forEach((pl) => { if (!pB.find((x) => x && x.id === pl.id)) (pl.items || []).forEach((it) => itemDaftar.push({ aksi: 'hapus', teks: `${rapikanD(pl.name)} — ${rapikanD(it.name)}` })); });
    pB.forEach((pb) => { if (!pL.find((x) => x && x.id === pb.id)) (pb.items || []).forEach((it) => itemDaftar.push({ aksi: 'tambah', teks: `${rapikanD(pb.name)} — ${teksItem(it)}` })); });
    if (itemDaftar.length) hasil.push({ label: 'Item fasilitas', jenis: 'daftar', perubahan: itemDaftar });
    return hasil;
  };

  /* ---------- Diff khusus Log Book ---------- */
  AVS.diffLogbook = function (lama, baru) {
    lama = lama || {}; baru = baru || {};
    const hasil = [];
    [diffTeks('Tanggal', lama.tanggal, baru.tanggal), diffTeks('Shift', lama.shift, baru.shift), diffTeks('Regu', lama.regu, baru.regu)].forEach((r) => r && hasil.push(r));
    const d = diffDaftar('Catatan Kegiatan', lama.catatanKegiatan, baru.catatanKegiatan, (c) => `${rapikanD(c && c.jam)} — ${rapikanD(c && c.uraian)}`);
    if (d) hasil.push(d);
    const p = diffTeksPanjang('Catatan Serah Terima', lama.catatanSerahTerima, baru.catatanSerahTerima);
    if (p) hasil.push(p);
    return hasil;
  };

  /* ---------- Rujukan silang ke Laporan Personel (dipakai Fasilitas & Log Book) ---------- */
  // Mencari Laporan Personel tersimpan untuk Tanggal+Shift+Regu yang sama.
  // Selalu membaca localStorage TERKINI (live), bukan salinan beku.
  AVS.cariLaporanPersonel = function (tanggal, shift, regu) {
    try {
      const arr = JSON.parse(localStorage.getItem('savedReports') || '[]');
      return arr.find((r) => r && r.tanggal === tanggal && r.shift === shift && r.regu === regu) || null;
    } catch (e) { return null; }
  };
  // Sama seperti getPembuatLaporanInfo() di laporan-personel.html: ambil personel
  // pertama yang namanya terisi di POSKO. Dipakai Fasilitas & Log Book untuk
  // menampilkan "Disusun oleh" tanpa isian manual (lihat RENCANA-PENGEMBANGAN.md).
  // jabatanLabel = satu baris (dipakai label "DISUSUN OLEH:" di layar).
  // jabatanWA = "a.n. CHIEF" & peran-nya di baris terpisah, sama seperti blok
  // tanda tangan teks WA Laporan Personel (laporan-personel.html, getLabelJabatanPembuatLaporan).
  AVS.infoPembuatDariPersonel = function (tanggal, shift, regu) {
    const rec = AVS.cariLaporanPersonel(tanggal, shift, regu);
    if (!rec) return { ada: false, nama: '', jabatanLabel: '', jabatanWA: '' };
    const posko = (rec.posPenempatan || []).find((p) => p.id === 'posko') || (rec.posPenempatan || [])[0];
    const pertama = posko && (posko.personel || []).find((p) => p && rapikanD(p.nama));
    if (!pertama) return { ada: true, nama: '', jabatanLabel: '', jabatanWA: '', posPersonelKosong: true };
    const peran = pertama.peran;
    const peranTeks = peran ? peran.replace(/^\(|\)$/g, '').toUpperCase() : '';
    const jabatanLabel = (!peran || peran === '(Chief)') ? 'CHIEF' : `a.n. CHIEF, ${peranTeks}`;
    const jabatanWA = (!peran || peran === '(Chief)') ? 'CHIEF' : `a.n. CHIEF\n${peranTeks}`;
    return { ada: true, nama: rapikanD(pertama.nama), jabatanLabel, jabatanWA };
  };

  /* ---------- Rujukan ke Laporan Kejadian (IndexedDB, dipakai Log Book) ----------
     PENTING: Laporan Kejadian TIDAK punya field Shift/Regu (hanya Tanggal), dan
     disimpan di IndexedDB (bukan localStorage) — beda dari Personel & Fasilitas.
     Karena itu pencocokannya hanya bisa per TANGGAL, tidak bisa per shift persis.
     Lihat RENCANA-PENGEMBANGAN.md, Tahap 2, untuk catatan keterbatasan ini. */
  AVS.cariKejadianTanggal = function (tanggal) {
    return new Promise((resolve) => {
      if (!window.indexedDB) { resolve([]); return; }
      const q = indexedDB.open('avsec-kejadian', 2);
      q.onupgradeneeded = () => {
        const db = q.result;
        if (!db.objectStoreNames.contains('laporan')) db.createObjectStore('laporan', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('tandatangan')) db.createObjectStore('tandatangan', { keyPath: 'key' });
      };
      q.onerror = () => resolve([]);
      q.onsuccess = () => {
        const db = q.result;
        if (!db.objectStoreNames.contains('laporan')) { resolve([]); return; }
        try {
          const tx = db.transaction('laporan', 'readonly');
          const req = tx.objectStore('laporan').getAll();
          req.onsuccess = () => resolve((req.result || []).filter((r) => r && r.id !== '__draft__' && r.tanggal === tanggal));
          req.onerror = () => resolve([]);
        } catch (e) { resolve([]); }
      };
    });
  };

  /* ---------- Render HTML laci Riwayat (dipakai Laporan Personel & Kejadian) ---------- */
  function renderPerubahanBagian(p) {
    if (p.jenis === 'teks' || p.jenis === 'panjang') {
      const kelasWrap = p.jenis === 'panjang' ? 'two' : '';
      const isi = p.jenis === 'panjang'
        ? `<div class="two"><div class="a"><small>LAMA</small>${AVS.esc(p.lama)}</div><div class="b"><small>BARU</small>${AVS.esc(p.baru)}</div></div>`
        : `<div class="rwl"><span class="lama">${AVS.esc(p.lama)}</span><span class="arr">→</span><span class="baru">${AVS.esc(p.baru)}</span></div>`;
      return `<div class="rwi"><div class="rwf">${AVS.esc(p.label)}</div>${isi}</div>`;
    }
    // jenis: daftar
    const baris = p.perubahan.map((x) => {
      if (x.aksi === 'tambah') return `<div class="rwl"><span class="tag t">Ditambah</span>${AVS.esc(x.teks)}</div>`;
      if (x.aksi === 'hapus') return `<div class="rwl"><span class="tag h">Dihapus</span>${AVS.esc(x.teks)}</div>`;
      return `<div class="rwl"><span class="tag u">Diubah</span><span class="lama">${AVS.esc(x.lama)}</span><span class="arr">→</span><span class="baru">${AVS.esc(x.baru)}</span></div>`;
    }).join('');
    return `<div class="rwi"><div class="rwf">${AVS.esc(p.label)}</div>${baris}</div>`;
  }
  // rec: rekaman laporan tersimpan (punya .riwayat[]). Mengembalikan HTML isi laci Riwayat.
  AVS.renderRiwayat = function (rec, judulSub) {
    const j = AVS.jejak(rec);
    const daftar = (j.riwayat.length ? j.riwayat.slice().reverse() : (j.dibuat ? [{ waktu: j.dibuat, aksi: 'dibuat' }] : []));
    const entri = daftar.map((e) => {
      const chip = e.aksi === 'dibuat' ? '<span class="chip new">Dibuat</span>' : '<span class="chip upd">Diperbarui</span>';
      const jml = Array.isArray(e.perubahan) ? e.perubahan.length : 0;
      const cnt = e.aksi === 'diperbarui' ? `<span class="cnt">${jml ? jml + ' bagian berubah' : 'tanpa rincian'}</span>` : '';
      const isi = jml ? e.perubahan.map(renderPerubahanBagian).join('') : (e.aksi === 'dibuat' ? '<div class="rwl" style="color:#5C6675">Laporan pertama kali disimpan.</div>' : '<div class="rwl" style="color:#5C6675">Tidak ada rincian tersimpan untuk pembaruan ini.</div>');
      return `<div class="rwe"><div class="rwh"><b>${AVS.esc(AVS.waktu(e.waktu))}</b>${chip}${cnt}</div>${isi}</div>`;
    }).join('');
    const sub = `${AVS.esc(judulSub || '')} • ${daftar.length} entri`;
    const catatan = j.tercatat ? '' : '<div class="rwe"><div class="rwl" style="color:#5C6675">Perubahan sebelum fitur riwayat dipasang tidak tercatat.</div></div>';
    return { sub, html: (entri || '<div class="rwl" style="color:#5C6675">Belum ada riwayat.</div>') + catatan };
  };

  /* ---------- Service worker: daftar & pantau pembaruan ---------- */
  AVS.daftarSW = function (cekBerkalaMs) {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    cekBerkalaMs = cekBerkalaMs || 5 * 60 * 1000;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then((reg) => {
        const cekUpdate = () => { if (navigator.onLine) reg.update().catch(() => { /* diabaikan: dicoba lagi nanti */ }); };
        setInterval(cekUpdate, cekBerkalaMs);
        document.addEventListener('visibilitychange', () => { if (!document.hidden) cekUpdate(); });
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing; if (!nw) return;
          // 'installed' + sudah ada controller sebelumnya = ini pembaruan, bukan pemasangan pertama kali
          nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) AVS.tampilkanPitaUpdate(); });
        });
      }).catch((err) => console.warn('Service worker gagal didaftarkan:', err));
    });
  };
  AVS.tampilkanPitaUpdate = function () {
    if (document.getElementById('pitaUpdate')) return;
    const el = document.createElement('div'); el.id = 'pitaUpdate'; el.setAttribute('role', 'status');
    el.innerHTML = '<span>Ada pembaruan aplikasi. Muat ulang untuk memakai versi terbaru.</span><button type="button">Muat Ulang</button><button type="button" class="x" title="Tutup">✕</button>';
    const [span, btnGo, btnX] = el.children;
    btnGo.onclick = () => {
      const ada = typeof window.adaPerubahanBelumTersimpan === 'function' && window.adaPerubahanBelumTersimpan();
      if (ada && !confirm('Ada isian yang belum disimpan. Memuat ulang akan membuang perubahan itu. Lanjutkan?')) return;
      location.reload();
    };
    btnX.onclick = () => el.remove();
    document.body.appendChild(el);
  };

  /* ---------- Waktu & jejak pembaruan laporan ---------- */
  AVS.waktu = function (iso) {
    const d = new Date(iso); if (!iso || isNaN(d)) return '';
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getDate()} ${AVS.BULAN_PENDEK[d.getMonth()]} ${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  // id laporan personel = Date.now(); id laporan kejadian = 'kj' + base36(Date.now()) + 3 karakter acak
  AVS.waktuDariId = function (id) {
    let ms = NaN; const s = String(id || '');
    if (/^\d{12,14}$/.test(s)) ms = +s; else if (/^kj[0-9a-z]{9,}$/.test(s)) ms = parseInt(s.slice(2, -3), 36);
    return (ms > 1.5e12 && ms < 4.1e12) ? new Date(ms).toISOString() : null;
  };
  // Menyusun jejak dari rekaman tersimpan (tahan terhadap laporan lama yang belum punya bidang jejak)
  AVS.jejak = function (rec) {
    const dibuat = rec.dibuatPada || AVS.waktuDariId(rec.id) || null;
    let riwayat = Array.isArray(rec.riwayat) ? rec.riwayat.slice() : [];
    const diperbarui = rec.diperbaruiPada || null;
    const jumlah = riwayat.length ? riwayat.filter((r) => r.aksi === 'diperbarui').length : (rec.jumlahUbah || 0);
    return { dibuat, diperbarui, jumlah, riwayat, tercatat: !!rec.diperbaruiPada || riwayat.length > 0, pernahDiubah: jumlah > 0 };
  };
  // Menambahkan entri jejak saat menyimpan (old = rekaman lama atau null)
  const RIWAYAT_MAKS = 30;
  AVS.catatJejak = function (rec, old, perubahan) {
    const now = new Date().toISOString();
    let riwayat = [], dibuat = now;
    if (old) {
      dibuat = old.dibuatPada || AVS.waktuDariId(old.id) || now;
      riwayat = Array.isArray(old.riwayat) && old.riwayat.length ? old.riwayat.slice() : [{ waktu: dibuat, aksi: 'dibuat' }];
    }
    const entri = { waktu: now, aksi: old ? 'diperbarui' : 'dibuat' };
    if (old && Array.isArray(perubahan) && perubahan.length) entri.perubahan = perubahan;
    riwayat.push(entri);
    // Simpan maksimal RIWAYAT_MAKS entri, tapi entri "Dibuat" (selalu elemen pertama) tidak pernah dibuang.
    if (riwayat.length > RIWAYAT_MAKS) riwayat = [riwayat[0]].concat(riwayat.slice(-(RIWAYAT_MAKS - 1)));
    rec.dibuatPada = dibuat; rec.diperbaruiPada = now; rec.riwayat = riwayat;
    rec.jumlahUbah = riwayat.filter((r) => r.aksi === 'diperbarui').length;
    return rec;
  };
  // Teks ringkas untuk strip "sedang mengubah" dan kartu daftar
  AVS.ketJejak = function (rec) {
    const j = AVS.jejak(rec), dibuat = j.dibuat ? 'Dibuat ' + AVS.waktu(j.dibuat) : '';
    if (j.pernahDiubah) return { dibuat, ubah: 'Diperbarui terakhir ' + AVS.waktu(j.diperbarui) + (j.jumlah > 1 ? ' (' + j.jumlah + '× diperbarui)' : ''), j };
    if (!j.tercatat) return { dibuat, ubah: 'Riwayat perubahan sebelum fitur ini tidak tercatat', j };
    return { dibuat, ubah: 'Belum pernah diubah sejak dibuat', j };
  };

  /* ---------- Kunci: hanya komputer/laptop ---------- */
  AVS.MIN_LEBAR = 1024;
  AVS.cekPerangkat = function () {
    const pointerOk = !!(root.matchMedia && root.matchMedia('(pointer: fine)').matches);
    const lebarOk = root.innerWidth >= AVS.MIN_LEBAR;
    document.body.classList.toggle('locked', !(pointerOk && lebarOk));
  };
  AVS.pasangKunci = function () {
    if (!document.getElementById('lockScreen')) {
      const d = document.createElement('div'); d.id = 'lockScreen';
      d.innerHTML = '<img src="Logo/AVS-512.png" alt="Logo Kapuas Supadio"><p>Desktop Only</p>';
      document.body.insertBefore(d, document.body.firstChild);
    }
    AVS.cekPerangkat();
    root.addEventListener('resize', AVS.cekPerangkat);
  };

  /* ---------- Pemilih bulan ----------
     opsi: { get(): {y,m}|null, set(y,m|null), info(y,m): {teks, ada}, maks: {y,m}, semua: bool } */
  AVS.pemilihBulan = function (el, opsi) {
    const maks = opsi.maks || { y: new Date().getFullYear(), m: new Date().getMonth() };
    let tahunPop = null;
    el.classList.add('mp-wrap');
    const nilai = () => opsi.get();
    const ke = (y, m) => y * 12 + m;
    function gambar() {
      const v = nilai(), label = v ? `${AVS.BULAN[v.m]} ${v.y}` : 'Semua bulan';
      const ty = tahunPop == null ? (v ? v.y : maks.y) : tahunPop;
      const sel = (y, m) => v && v.y === y && v.m === m;
      const sel12 = AVS.BULAN_PENDEK.map((nm, m) => {
        const off = ke(ty, m) > ke(maks.y, maks.m);
        const inf = off ? { teks: '—' } : (opsi.info ? opsi.info(ty, m) : { teks: '' });
        return `<button type="button" data-m="${m}" class="${sel(ty, m) ? 'sel' : ''}" ${off ? 'disabled' : ''}>${nm}<small>${AVS.esc(inf.teks || '—')}</small></button>`;
      }).join('');
      el.innerHTML = `<div class="monthpick"><button type="button" class="arr" data-a="-1" ${!v ? 'disabled' : ''} title="Bulan sebelumnya">‹</button><button type="button" class="cur" data-a="pop">${AVS.svg(IC.cal)}${label}<small>▼</small></button><button type="button" class="arr" data-a="1" ${(!v || ke(v.y, v.m) >= ke(maks.y, maks.m)) ? 'disabled' : ''} title="Bulan berikutnya">›</button></div>
<div class="mp-pop"><div class="yr"><button type="button" data-y="-1">‹</button><span>${ty}</span><button type="button" data-y="1" ${ty >= maks.y ? 'disabled' : ''}>›</button></div><div class="mg">${sel12}</div>
<div class="foot"><a data-a="ini">Bulan ini</a>${opsi.semua ? '<a data-a="semua">Semua bulan</a>' : ''}</div></div>`;
    }
    el.addEventListener('click', (e) => {
      const t = e.target.closest('[data-a],[data-m],[data-y]'); if (!t || !el.contains(t)) return;
      const v = nilai();
      if (t.dataset.m !== undefined) { const ty = tahunPop == null ? (v ? v.y : maks.y) : tahunPop; el.classList.remove('open'); tahunPop = null; opsi.set(ty, +t.dataset.m); gambar(); return; }
      if (t.dataset.y !== undefined) { const ty = tahunPop == null ? (v ? v.y : maks.y) : tahunPop; tahunPop = ty + +t.dataset.y; gambar(); el.classList.add('open'); return; }
      const a = t.dataset.a;
      if (a === 'pop') { const buka = !el.classList.contains('open'); tahunPop = null; gambar(); el.classList.toggle('open', buka); }
      else if (a === '-1' || a === '1') { if (!v) return; const n = ke(v.y, v.m) + +a; if (n > ke(maks.y, maks.m)) return; opsi.set(Math.floor(n / 12), n % 12); gambar(); }
      else if (a === 'ini') { el.classList.remove('open'); tahunPop = null; opsi.set(maks.y, maks.m); gambar(); }
      else if (a === 'semua') { el.classList.remove('open'); tahunPop = null; opsi.set(null, null); gambar(); }
    });
    document.addEventListener('click', (e) => { if (el.classList.contains('open') && !e.composedPath().includes(el)) { el.classList.remove('open'); tahunPop = null; gambar(); } });   // composedPath: elemen yang diklik mungkin sudah diganti saat render ulang
    gambar();
    return { refresh: gambar };
  };
})(typeof window !== 'undefined' ? window : globalThis);
