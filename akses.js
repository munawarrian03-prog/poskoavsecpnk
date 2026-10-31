/* =====================================================
   GERBANG AKSES: peran Posko/Admin + auto-logout idle 1 jam.
   Satu sesi (peran + lastActivity) dipakai di seluruh app -- Posko dan Admin
   login lewat form PIN yang terpisah, menu topbar (shell.js: renderNav)
   otomatis berbeda per peran begitu AVS.nav() dipanggil.

   PENTING: ganti kedua PIN contoh di bawah ini sebelum dipakai sungguhan -- nilai ini
   SEKARANG CUMA FALLBACK (dipakai kalau sinkronisasi belum aktif, atau belum pernah
   berhasil tersambung ke server sejak dipasang). PIN SUNGGUHAN yang dipakai sehari-hari
   disimpan di Google Sheet (tab "Pengaturan", lewat jenis 'pengaturan' di sync.js/Code.gs)
   dan bisa diganti Admin kapan saja lewat tombol "Ganti PIN" di dropdown profil (lihat
   AVS_gantiPin & formGantiPin di bawah) -- TANPA perlu ubah kode/redeploy Netlify.
   ===================================================== */
(function (root) {
  const KUNCI_SESI = 'avsSesi';
  const KUNCI_PIN = 'avsPinCache'; // cache lokal {posko,admin} hasil sinkronisasi dari Sheet
  const BATAS_IDLE = 60 * 60 * 1000; // 1 jam
  const PIN = { posko: 'POSKO2026', admin: 'ADMIN2026' }; // GANTI sebelum dipakai sungguhan (fallback)

  // PIN yang SEDANG BERLAKU utk satu peran: cache dari Sheet kalau ada, jatuh ke PIN
  // hardcoded di atas kalau belum pernah sinkron (baru pasang / sinkronisasi nonaktif).
  function pinCache() { try { return JSON.parse(localStorage.getItem(KUNCI_PIN) || 'null') || {}; } catch (e) { return {}; } }
  function pinAktif(peran) { const c = pinCache(); return (c && c[peran]) || PIN[peran]; }
  // Segarkan cache di latar belakang (tidak memblokir apa pun) -- dipanggil tiap gerbang
  // dibuka, supaya PIN yang dicek di coba() sedapat mungkin yang terbaru dari Sheet, tanpa
  // bikin form login harus menunggu jaringan dulu sebelum bisa dipakai.
  function segarkanPinCache() {
    if (typeof root.AVS_SYNC === 'undefined' || !root.AVS_SYNC.aktif()) return;
    root.AVS_SYNC.ambilSemua('pengaturan').then((arr) => {
      const rec = (arr || []).find((x) => x && x.id === 'pin');
      if (rec) localStorage.setItem(KUNCI_PIN, JSON.stringify({ posko: rec.posko || PIN.posko, admin: rec.admin || PIN.admin }));
    });
  }

  // Ganti PIN (khusus dipanggil dari tombol "Ganti PIN", Admin saja) -- kirim LANGSUNG ke
  // Sheet (bukan lewat antrian retry) dan TUNGGU konfirmasi sukses; kalau gagal/offline,
  // TIDAK menyimpan apa pun sama sekali (baik ke Sheet maupun cache lokal) -- sesuai
  // keputusan: PIN baru tidak boleh cuma berlaku di satu perangkat utk sementara waktu.
  // poskoBaru/adminBaru boleh dikosongkan salah satu (tidak diubah); minimal satu harus diisi.
  root.AVS_gantiPin = async function (poskoBaru, adminBaru) {
    if (typeof root.AVS_SYNC === 'undefined' || !root.AVS_SYNC.aktif()) {
      return { ok: false, error: 'Perlu koneksi ke server untuk mengganti PIN. Pastikan terhubung ke internet lalu coba lagi.' };
    }
    poskoBaru = (poskoBaru || '').trim(); adminBaru = (adminBaru || '').trim();
    if (!poskoBaru && !adminBaru) return { ok: false, error: 'Isi minimal salah satu PIN baru.' };
    try {
      const sekarang = (await root.AVS_SYNC.ambilSemua('pengaturan')).find((x) => x && x.id === 'pin') || {};
      const now = new Date().toISOString();
      const rec = {
        id: 'pin', tanggal: '', shift: '', regu: '',
        posko: poskoBaru || sekarang.posko || pinAktif('posko'),
        admin: adminBaru || sekarang.admin || pinAktif('admin'),
        dibuatPada: sekarang.dibuatPada || now, diperbaruiPada: now
      };
      const ok = await root.AVS_SYNC.kirimLangsung('pengaturan', rec);
      if (!ok) return { ok: false, error: 'Gagal menyimpan ke server. Coba lagi.' };
      localStorage.setItem(KUNCI_PIN, JSON.stringify({ posko: rec.posko, admin: rec.admin }));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'Gagal menyimpan ke server. Coba lagi.' };
    }
  };

  function bacaSesi() {
    try {
      const s = JSON.parse(localStorage.getItem(KUNCI_SESI) || 'null');
      if (!s || !s.lastActivity || !s.peran) return null;
      if (Date.now() - s.lastActivity > BATAS_IDLE) return null;
      return s;
    } catch (e) { return null; }
  }
  function tulisSesi(peran) { localStorage.setItem(KUNCI_SESI, JSON.stringify({ peran, lastActivity: Date.now() })); }

  // Setelah PIN berhasil dimasukkan (login pertama, ganti peran, atau sesi habis), SELALU masuk
  // ke Beranda (index.html) -- tidak lanjut di halaman terakhir yang terbuka. Ini sekaligus
  // mencegah "nyangkut" di halaman peran sebelumnya (mis. logout Posko -> masuk Admin).
  // Sesi yang SUDAH berjalan tidak terpengaruh (buka halaman lewat URL langsung tetap boleh).
  function halamanSaatIni() { return location.pathname.split('/').pop() || 'index.html'; }
  function keBeranda() {
    if (halamanSaatIni() === 'index.html') return false;
    location.href = 'index.html';
    return true;
  }
  function perbaruiAktivitas() {
    const s = bacaSesi(); if (!s) return;
    localStorage.setItem(KUNCI_SESI, JSON.stringify({ peran: s.peran, lastActivity: Date.now() }));
  }
  function pasangPemantauAktivitas() {
    if (root.__avsPemantauTerpasang) return;
    root.__avsPemantauTerpasang = true;
    let terakhirTulis = 0;
    ['click', 'keydown', 'mousemove', 'touchstart'].forEach((ev) => document.addEventListener(ev, () => {
      const now = Date.now();
      if (now - terakhirTulis > 30000) { terakhirTulis = now; perbaruiAktivitas(); }
    }, { passive: true, capture: true }));
  }

  root.AVS_PERAN = () => { const s = bacaSesi(); return s ? s.peran : null; };
  // Keluar -> kembali ke Beranda, tempat gerbang menampilkan pilihan peran (Posko/Admin), supaya
  // bisa langsung masuk dgn akun lain dari halaman manapun (termasuk halaman khusus Admin).
  root.AVS_KELUAR = () => { localStorage.removeItem(KUNCI_SESI); if (!keBeranda()) location.reload(); };

  // Terapkan tampilan sesuai peran. Menu topbar sendiri sudah dipilih per-peran di dalam
  // shell.js (renderNav), tapi topbar bisa SUDAH ter-render SEBELUM peran diketahui (tiap
  // halaman memanggil AVS.nav() sendiri lewat DOMContentLoaded, tidak menunggu gerbang PIN
  // selesai) -- jadi di sini render ulang SELURUH topbar (bukan cuma ikon profil), supaya
  // menu ikut benar begitu peran diketahui/berubah (lihat AVS.renderNavUlang).
  root.AVS_terapkanTampilanPeran = function () {
    if (root.AVS && typeof root.AVS.renderNavUlang === 'function') root.AVS.renderNavUlang();
  };

  function overlay(html) {
    const ov = document.createElement('div');
    ov.id = 'gerbangOverlay';
    ov.style.cssText = 'position:fixed;inset:0;background:#10243D;display:flex;align-items:center;justify-content:center;z-index:99999;font-family:Montserrat,Inter,sans-serif';
    ov.innerHTML = html;
    document.body.appendChild(ov);
    return ov;
  }

  function formPin(peran, judul, onBerhasil, opsiTampil) {
    const tampilkanGanti = opsiTampil && opsiTampil.gantiPeran;
    const ov = overlay(`
<div style="background:#fff;border-radius:16px;padding:32px 36px;width:320px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4)">
<img src="Logo/AVS-512.png" style="width:200px;height:200px;margin-bottom:10px">
<div style="font-size:15px;font-weight:800;color:#10243D;margin-bottom:2px">${judul}</div>
<div style="font-size:11px;color:#8A94A6;font-weight:600;margin-bottom:18px">Masukkan PIN untuk melanjutkan</div>
<input id="gerbangPin" type="password" inputmode="numeric" placeholder="PIN" style="width:100%;height:42px;border:1px solid #D7DEE8;border-radius:8px;text-align:center;font-size:18px;letter-spacing:6px;font-weight:800;color:#10243D">
<div id="gerbangErr" style="color:#A82F24;font-size:11px;font-weight:700;margin-top:8px;min-height:14px"></div>
<button id="gerbangBtn" style="width:100%;height:38px;margin-top:10px;border:none;border-radius:8px;background:#157A82;color:#fff;font-weight:800;font-size:12.5px;cursor:pointer">Masuk</button>
${tampilkanGanti ? '<button id="gerbangBtnGanti" style="width:100%;height:30px;margin-top:8px;border:none;background:none;color:#8A94A6;font-weight:700;font-size:11px;cursor:pointer">&lsaquo; Pilih peran lain</button>' : ''}
</div>`);
    const coba = () => {
      const pin = document.getElementById('gerbangPin').value.trim();
      if (pin !== pinAktif(peran)) { document.getElementById('gerbangErr').textContent = 'PIN salah. Coba lagi.'; return; }
      tulisSesi(peran);
      ov.remove();
      pasangPemantauAktivitas();
      if (keBeranda()) return; // selalu mulai dari Beranda setelah login
      onBerhasil();
    };
    document.getElementById('gerbangBtn').onclick = coba;
    document.getElementById('gerbangPin').addEventListener('keydown', (e) => { if (e.key === 'Enter') coba(); });
    const btnGanti = document.getElementById('gerbangBtnGanti');
    if (btnGanti) btnGanti.onclick = () => { ov.remove(); tampilkanPilihPeran(onBerhasil); };
  }

  function tampilkanPilihPeran(onBerhasil) {
    const ov = overlay(`
<div style="background:#fff;border-radius:16px;padding:28px 32px;width:320px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4)">
<img src="Logo/AVS-512.png" style="width:200px;height:200px;margin-bottom:10px">
<div style="font-size:15px;font-weight:800;color:#10243D;margin-bottom:4px">KAPUAS Supadio</div>
<div style="font-size:11px;color:#8A94A6;font-weight:600;margin-bottom:18px">Pilih peran untuk masuk</div>
<button id="pilihPosko" style="width:100%;height:46px;margin-bottom:10px;border:1px solid #D7DEE8;border-radius:10px;background:#F6F8FB;color:#10243D;font-weight:800;font-size:13px;cursor:pointer">Posko</button>
<button id="pilihAdmin" style="width:100%;height:46px;border:1px solid #D7DEE8;border-radius:10px;background:#F6F8FB;color:#10243D;font-weight:800;font-size:13px;cursor:pointer">Admin</button>
</div>`);
    document.getElementById('pilihPosko').onclick = () => { ov.remove(); formPin('posko', 'Masuk - Posko', onBerhasil, { gantiPeran: true }); };
    document.getElementById('pilihAdmin').onclick = () => { ov.remove(); formPin('admin', 'Masuk - Admin', onBerhasil, { gantiPeran: true }); };
  }

  // Modal "Ganti PIN" (tombol di dropdown profil, khusus Admin -- lihat shell.js: renderProfil).
  // Dibangun dinamis (bukan markup statis per halaman) lewat class .modal-overlay/.modal-container
  // yang sudah ada di style.css (dimuat di semua halaman), BEDA dari overlay() di atas (dipakai
  // gerbang login) yang sengaja menutup SELURUH layar dgn latar gelap pekat & z-index tertinggi --
  // modal ini cuma popup biasa di atas app yang sudah terbuka.
  function formGantiPin() {
    const el = document.createElement('div');
    el.className = 'modal-overlay'; el.style.display = 'flex';
    el.innerHTML = `
<div class="modal-container" style="max-width:380px">
<div class="modal-header"><span class="modal-title">GANTI PIN</span><button type="button" class="modal-close" id="gpTutup1">✕</button></div>
<div class="modal-body">
<div style="font-size:11.5px;color:#5C6675;font-weight:600;line-height:1.5;margin-bottom:14px;background:#fff;border:1px solid #E3E8F0;border-radius:8px;padding:10px 12px">Perubahan disimpan ke server dan berlaku untuk semua perangkat begitu sinkron. Kosongkan field yang tidak ingin diubah.</div>
<div style="background:#fff;border:1px solid #E3E8F0;border-radius:10px;padding:14px">
<label style="display:block;font-size:10.5px;font-weight:800;color:#8A94A6;text-transform:uppercase;letter-spacing:.4px;margin-bottom:5px">PIN Posko Baru</label>
<input id="gpPosko" type="password" inputmode="numeric" placeholder="Kosongkan jika tidak diubah" style="width:100%;height:38px;padding:0 12px;border:1px solid #D7DEE8;border-radius:8px;font-size:13px;font-weight:700;color:#10243D;margin-bottom:14px;box-sizing:border-box">
<label style="display:block;font-size:10.5px;font-weight:800;color:#8A94A6;text-transform:uppercase;letter-spacing:.4px;margin-bottom:5px">PIN Admin Baru</label>
<input id="gpAdmin" type="password" inputmode="numeric" placeholder="Kosongkan jika tidak diubah" style="width:100%;height:38px;padding:0 12px;border:1px solid #D7DEE8;border-radius:8px;font-size:13px;font-weight:700;color:#10243D;box-sizing:border-box">
</div>
<div id="gpErr" style="display:none;background:#FBE9E7;border:1px solid #F3C6C0;color:#A82F24;font-size:11.5px;font-weight:700;border-radius:8px;padding:9px 12px;margin-top:12px"></div>
</div>
<div class="modal-footer"><button type="button" class="btn-cancel" id="gpTutup2">Batal</button><button type="button" class="btn-info" id="gpSimpan">Simpan</button></div>
</div>`;
    document.body.appendChild(el);
    const tutup = () => el.remove();
    el.querySelector('#gpTutup1').onclick = tutup;
    el.querySelector('#gpTutup2').onclick = tutup;
    el.addEventListener('click', (e) => { if (e.target === el) tutup(); });
    el.querySelector('#gpSimpan').onclick = async () => {
      const btn = el.querySelector('#gpSimpan'), err = el.querySelector('#gpErr');
      err.style.display = 'none';
      const posko = el.querySelector('#gpPosko').value, admin = el.querySelector('#gpAdmin').value;
      btn.disabled = true; btn.textContent = 'Menyimpan...';
      const hasil = await root.AVS_gantiPin(posko, admin);
      btn.disabled = false; btn.textContent = 'Simpan';
      if (!hasil.ok) { err.textContent = hasil.error; err.style.display = 'block'; return; }
      el.querySelector('.modal-body').innerHTML = `<div style="text-align:center;padding:12px 4px"><div style="font-size:30px;line-height:1;margin-bottom:8px">✅</div><div style="font-size:13px;font-weight:800;color:#10243D;margin-bottom:4px">PIN berhasil diperbarui</div><div style="font-size:11px;color:#8A94A6;font-weight:600">Berlaku di perangkat ini sekarang, dan di perangkat lain begitu sinkron.</div></div>`;
      el.querySelector('.modal-footer').innerHTML = '<button type="button" class="btn-info" id="gpSelesai">Selesai</button>';
      el.querySelector('#gpSelesai').onclick = tutup;
    };
  }
  root.AVS_bukaGantiPin = formGantiPin;

  // Dipakai di semua halaman app utama (index.html, laporan-personel.html, dst).
  // Kalau sesi valid: lanjut langsung + terapkan tampilan peran. Kalau tidak: tampilkan laci pilih peran.
  root.AVS_gerbangUtama = function (onBerhasil) {
    segarkanPinCache();
    const lanjut = () => { root.AVS_terapkanTampilanPeran(); if (onBerhasil) onBerhasil(); };
    const s = bacaSesi();
    if (s) { perbaruiAktivitas(); pasangPemantauAktivitas(); lanjut(); return; }
    tampilkanPilihPeran(lanjut);
  };

  // Dipakai HANYA di halaman admin-only (Pantau Posko): langsung minta PIN Admin,
  // TIDAK membuka laci pilih peran, dan sesi peran 'posko' yang sedang aktif TIDAK otomatis diterima.
  root.AVS_gerbangAdminSaja = function (onBerhasil) {
    segarkanPinCache();
    const s = bacaSesi();
    if (s && s.peran === 'admin') { perbaruiAktivitas(); pasangPemantauAktivitas(); onBerhasil(); return; }
    formPin('admin', 'Masuk - Pantau Posko (Admin)', onBerhasil, { gantiPeran: true });
  };
})(typeof window !== 'undefined' ? window : globalThis);
