/* =====================================================
   GERBANG AKSES: peran Posko/Admin + auto-logout idle 1 jam.
   Satu sesi (peran + lastActivity) dipakai di seluruh app -- Posko dan Admin
   login lewat form PIN yang terpisah, tapi begitu Admin login, tampilan
   admin-only (tombol "Pantau Posko", "Lihat Semua Rekap") ikut muncul di
   mana pun AVS_terapkanTampilanPeran() dipanggil.

   PENTING: ganti kedua PIN contoh di bawah ini sebelum dipakai sungguhan.
   ===================================================== */
(function (root) {
  const KUNCI_SESI = 'avsSesi';
  const BATAS_IDLE = 60 * 60 * 1000; // 1 jam
  const PIN = { posko: 'POSKO2026', admin: 'ADMIN2026' }; // GANTI sebelum dipakai sungguhan

  function bacaSesi() {
    try {
      const s = JSON.parse(localStorage.getItem(KUNCI_SESI) || 'null');
      if (!s || !s.lastActivity || !s.peran) return null;
      if (Date.now() - s.lastActivity > BATAS_IDLE) return null;
      return s;
    } catch (e) { return null; }
  }
  function tulisSesi(peran) { localStorage.setItem(KUNCI_SESI, JSON.stringify({ peran, lastActivity: Date.now() })); }
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
  root.AVS_KELUAR = () => { localStorage.removeItem(KUNCI_SESI); location.reload(); };

  // Terapkan tampilan sesuai peran: "Lihat Semua Rekap" terlihat oleh Posko maupun Admin
  // (keduanya boleh lihat statistik), tapi "Pantau Posko" (pemantauan lintas-posko) hanya
  // untuk Admin. Aman dipanggil di halaman manapun (elemen yang tidak ada di halaman tsb diabaikan).
  root.AVS_terapkanTampilanPeran = function () {
    const peran = root.AVS_PERAN();
    const btnPantau = document.getElementById('btnPantauPosko');
    if (btnPantau) btnPantau.style.display = (peran === 'admin') ? '' : 'none';
    if (root.AVS && typeof root.AVS.renderProfilUlang === 'function') root.AVS.renderProfilUlang();
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
<img src="Logo/AVS-512.png" style="width:56px;height:56px;margin-bottom:10px">
<div style="font-size:15px;font-weight:800;color:#10243D;margin-bottom:2px">${judul}</div>
<div style="font-size:11px;color:#8A94A6;font-weight:600;margin-bottom:18px">Masukkan PIN untuk melanjutkan</div>
<input id="gerbangPin" type="password" inputmode="numeric" placeholder="PIN" style="width:100%;height:42px;border:1px solid #D7DEE8;border-radius:8px;text-align:center;font-size:18px;letter-spacing:6px;font-weight:800;color:#10243D">
<div id="gerbangErr" style="color:#A82F24;font-size:11px;font-weight:700;margin-top:8px;min-height:14px"></div>
<button id="gerbangBtn" style="width:100%;height:38px;margin-top:10px;border:none;border-radius:8px;background:#157A82;color:#fff;font-weight:800;font-size:12.5px;cursor:pointer">Masuk</button>
${tampilkanGanti ? '<button id="gerbangBtnGanti" style="width:100%;height:30px;margin-top:8px;border:none;background:none;color:#8A94A6;font-weight:700;font-size:11px;cursor:pointer">&lsaquo; Pilih peran lain</button>' : ''}
</div>`);
    const coba = () => {
      const pin = document.getElementById('gerbangPin').value.trim();
      if (pin !== PIN[peran]) { document.getElementById('gerbangErr').textContent = 'PIN salah. Coba lagi.'; return; }
      tulisSesi(peran);
      ov.remove();
      pasangPemantauAktivitas();
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
<img src="Logo/AVS-512.png" style="width:56px;height:56px;margin-bottom:10px">
<div style="font-size:15px;font-weight:800;color:#10243D;margin-bottom:4px">KAPUAS Supadio</div>
<div style="font-size:11px;color:#8A94A6;font-weight:600;margin-bottom:18px">Pilih peran untuk masuk</div>
<button id="pilihPosko" style="width:100%;height:46px;margin-bottom:10px;border:1px solid #D7DEE8;border-radius:10px;background:#F6F8FB;color:#10243D;font-weight:800;font-size:13px;cursor:pointer">Posko</button>
<button id="pilihAdmin" style="width:100%;height:46px;border:1px solid #D7DEE8;border-radius:10px;background:#F6F8FB;color:#10243D;font-weight:800;font-size:13px;cursor:pointer">Admin</button>
</div>`);
    document.getElementById('pilihPosko').onclick = () => { ov.remove(); formPin('posko', 'Masuk - Posko', onBerhasil, { gantiPeran: true }); };
    document.getElementById('pilihAdmin').onclick = () => { ov.remove(); formPin('admin', 'Masuk - Admin', onBerhasil, { gantiPeran: true }); };
  }

  // Dipakai di semua halaman app utama (index.html, laporan-personel.html, dst).
  // Kalau sesi valid: lanjut langsung + terapkan tampilan peran. Kalau tidak: tampilkan laci pilih peran.
  root.AVS_gerbangUtama = function (onBerhasil) {
    const lanjut = () => { root.AVS_terapkanTampilanPeran(); if (onBerhasil) onBerhasil(); };
    const s = bacaSesi();
    if (s) { perbaruiAktivitas(); pasangPemantauAktivitas(); lanjut(); return; }
    tampilkanPilihPeran(lanjut);
  };

  // Dipakai HANYA di halaman admin-only (Pantau Posko): langsung minta PIN Admin,
  // TIDAK membuka laci pilih peran, dan sesi peran 'posko' yang sedang aktif TIDAK otomatis diterima.
  root.AVS_gerbangAdminSaja = function (onBerhasil) {
    const s = bacaSesi();
    if (s && s.peran === 'admin') { perbaruiAktivitas(); pasangPemantauAktivitas(); onBerhasil(); return; }
    formPin('admin', 'Masuk - Pantau Posko (Admin)', onBerhasil, { gantiPeran: false });
  };
})(typeof window !== 'undefined' ? window : globalThis);
