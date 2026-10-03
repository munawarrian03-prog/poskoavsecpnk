/* =====================================================
   BERANDA (Tahap 3): "Rekap Laporan" — panduan serah-terima shift.
   Ketidakhadiran personel SELALU dihitung per orang per hari (Tahap 0.1
   — tidak ada lagi toggle mode). "Lihat Semua Rekap" sengaja nonaktif
   (placeholder) sampai Tahap 4 (rekap.html) selesai — lihat
   RENCANA-PENGEMBANGAN.md untuk alasannya.
   ===================================================== */
(function () {
  'use strict';
  const D = window.AVS_DATA, A = window.AVS, E = A.esc, IC = A.IC, svg = A.svg;
  const $ = (id) => document.getElementById(id);
  const HARI_INI = new Date();
  const BULAN_PENDEK = A.BULAN_PENDEK;

  let personel = [], fasilitas = [], logbook = [], kejadian = [];

  function toast(msg, tipe, ms) { const t = $('toast'); t.textContent = msg; t.className = 'show ' + (tipe || 'ok'); clearTimeout(toast.t); toast.t = setTimeout(() => { t.className = ''; }, ms || 4200); }

  /* =========================================================
     BAGIAN 1 — SHIFT SEBELUMNYA (3 kartu)
     ========================================================= */
  function cariAbsenShift(rec) {
    const out = [];
    (rec && rec.kategoriKekuatan || []).forEach((k) => (k.absen || []).forEach((p) => { if (p && String(p.nama || '').trim()) out.push({ nama: p.nama, alasan: p.alasan === 'Lainnya' ? (p.ket || 'Lainnya') : p.alasan, kategori: k.nama }); }));
    return out;
  }
  function inisial(nama) { const w = String(nama).trim().split(/\s+/); return ((w[0] || '')[0] || '') + ((w[1] || '')[0] || ''); }

  function kartuPersonelSb(sb) {
    const rec = (personel || []).find((r) => r.tanggal === sb.tanggal && r.shift === sb.shiftLabel);
    if (!rec) {
      return { sub: 'Belum ada laporan', html: `<div class="empty-shift"><div class="ic2">📭</div><div class="t1">Belum Dilaporkan</div><div class="t2">Laporan Personel untuk shift ${E(sb.shift)} (${E(sb.tanggal.split('-').reverse().join('/'))}) belum diisi.</div></div>` };
    }
    const absen = cariAbsenShift(rec);
    const sub = `Regu ${E(rec.regu)} • ${absen.length} dari ${(rec.kategoriKekuatan || []).reduce((a, k) => a + (parseInt(k.jml, 10) || 0), 0)} personel`;
    if (!absen.length) return { sub, html: '<div class="empty"><div style="font-size:24px;margin-bottom:6px">✅</div>Seluruh personel hadir<br>pada shift ini.</div>' };
    const rows = absen.slice(0, 6).map((p) => `<div class="prow"><div class="av">${E(inisial(p.nama))}</div><div><div class="nm">${E(p.nama)}</div><div class="al">${E(p.kategori)} • ${E(p.alasan)}</div></div></div>`).join('');
    return { sub, html: `<div class="plist">${rows}${absen.length > 6 ? `<div style="font-size:10.5px;color:#8A94A6;font-weight:600;padding-top:6px">+ ${absen.length - 6} lainnya</div>` : ''}</div>` };
  }

  function ringkasBermasalahFasilitas(rec) {
    const out = [];
    (rec.posFasilitas || []).forEach((p) => (p.items || []).forEach((it) => {
      if (it.bentuk === 'A' && (it.kondisi === 'Rusak' || it.status === 'Tidak Digunakan')) out.push({ nama: `${it.name} — ${it.keterangan || (it.kondisi === 'Rusak' ? 'Rusak' : 'Tidak Digunakan')}`, jenis: it.kondisi === 'Rusak' ? 'Rusak' : 'Tidak Digunakan', pos: p.name });
      if (it.bentuk === 'B' && (it.rusak || 0) > 0) out.push({ nama: `${it.name} (${it.rusak} unit)`, jenis: 'Rusak', pos: p.name });
    }));
    return out;
  }
  function kartuFasilitasSb(sb) {
    const rec = (fasilitas || []).find((r) => r.tanggal === sb.tanggal && r.shift === sb.shiftLabel);
    if (!rec) {
      return { sub: 'Belum ada laporan', html: `<div class="empty-shift"><div class="ic2">📭</div><div class="t1">Belum Dilaporkan</div><div class="t2">Laporan Fasilitas untuk shift ${E(sb.shift)} belum diisi.</div></div>` };
    }
    const b = ringkasBermasalahFasilitas(rec);
    const sub = `Regu ${E(rec.regu)} • ${b.length ? b.length + ' bermasalah' : 'Semua Baik'}`;
    if (!b.length) return { sub, html: '<div class="empty"><div style="font-size:24px;margin-bottom:6px">✅</div>Tidak ada masalah<br>dilaporkan.</div>' };
    const rows = b.slice(0, 6).map((x) => `<div class="prow"><div class="av" style="background:${x.jenis === 'Rusak' ? '#FBE9E7' : '#FCF1DF'};color:${x.jenis === 'Rusak' ? '#A82F24' : '#9A5F12'}">${x.jenis === 'Rusak' ? '✕' : '⏸'}</div><div><div class="nm">${E(x.nama)}</div><div class="al">${E(x.pos)}</div></div><span class="kat2" style="background:${x.jenis === 'Rusak' ? '#FBE9E7' : '#FCF1DF'};color:${x.jenis === 'Rusak' ? '#A82F24' : '#9A5F12'}">${E(x.jenis)}</span></div>`).join('');
    return { sub, html: `<div class="plist">${rows}${b.length > 6 ? `<div style="font-size:10.5px;color:#8A94A6;font-weight:600;padding-top:6px">+ ${b.length - 6} lainnya</div>` : ''}</div>` };
  }

  function kartuLogbookSb(sb) {
    const rec = (logbook || []).find((r) => r.tanggal === sb.tanggal && r.shift === sb.shiftLabel);
    if (!rec) {
      return { sub: 'Belum ada catatan', html: `<div class="empty-shift"><div class="ic2">📭</div><div class="t1">Belum Dilaporkan</div><div class="t2">Log Book untuk shift ${E(sb.shift)} belum diisi.</div></div>`, kelas: '' };
    }
    const isi = (rec.catatanSerahTerima || '').trim();
    // Catatan Kegiatan disembunyikan — hanya tampilkan Catatan Serah Terima
    const bagianST = isi ? `<p>${E(isi)}</p>` : '<p style="color:#B0894A;font-style:italic">(tidak ada catatan serah terima)</p>';
    return { sub: `Regu ${E(rec.regu)}`, html: `${isi ? '<div class="lb-tag2"><i></i>PERLU DITINDAKLANJUTI</div>' : ''}<div class="lb-note2">${bagianST}</div>`, kelas: 'lb-card2' };
  }

  function renderShiftSebelumnya() {
    const sb = D.shiftSebelumnya(HARI_INI);
    if (!sb) { $('shiftSbLabel').textContent = '—'; return; }
    $('shiftSbLabel').textContent = `${sb.shift} (${sb.shift === 'Pagi' ? '08:00–20:00' : '20:00–08:00'}), ${sb.tanggal.split('-').reverse().join('/')}${sb.tanggalAkhir !== sb.tanggal ? ' – ' + sb.tanggalAkhir.split('-').reverse().join('/') : ''}`;
    const p = kartuPersonelSb(sb), f = kartuFasilitasSb(sb), l = kartuLogbookSb(sb);
    $('rowShiftSb').innerHTML = `
<div class="dcard c4 rauto"><div class="h"><div><h3>Personel Tidak Hadir</h3><div class="sub">${p.sub}</div></div></div>${p.html}</div>
<div class="dcard c4 rauto"><div class="h"><div><h3>Fasilitas Bermasalah</h3><div class="sub">${f.sub}</div></div></div>${f.html}</div>
<div class="dcard c4 rauto ${l.kelas || ''}"><div class="h"><div><h3>📓 Catatan Serah Terima</h3><div class="sub">${l.sub}</div></div></div>${l.html}</div>`;
  }
  function salinTeks(teks) {
    navigator.clipboard.writeText(teks).then(() => toast('Teks pengingat disalin.')).catch(() => toast('Gagal menyalin teks.', 'err'));
  }

  /* =========================================================
     BAGIAN 2 — CATATAN BAWAH: pengingat awal kalau belum ada laporan sama sekali
     ========================================================= */
  function renderCatatan() {
    const kosongData = !personel.length && !fasilitas.length && !logbook.length && !kejadian.length;
    $('noteBawah').innerHTML = kosongData
      ? `<div class="banner"><span>ℹ️</span><div><b>Belum ada laporan tersimpan.</b> Buat laporan Personel, Fasilitas, Log Book, atau Kejadian — Beranda akan terisi otomatis.</div><div class="go"><a href="laporan-personel.html">Laporan Personel</a><a href="fasilitas.html">Laporan Fasilitas</a><a href="logbook.html">Log Book</a><a href="kejadian.html">Laporan Kejadian</a></div></div>`
      : '';
  }

  /* =========================================================
     BAGIAN 3 — LONCENG: hanya shift sebelumnya (maks 3 lencana)
     ========================================================= */
  let kosongCache = [];
  function hitungKosongBulanIni() {
    const sb = D.shiftSebelumnya(HARI_INI);
    if (!sb) { kosongCache = []; $('bellBadge').style.display = 'none'; return; }
    // Cek 3 jenis laporan untuk SHIFT SEBELUMNYA saja
    const adaP = !!(personel || []).find((r) => r.tanggal === sb.tanggal && r.shift === sb.shiftLabel);
    const adaF = !!(fasilitas || []).find((r) => r.tanggal === sb.tanggal && r.shift === sb.shiftLabel);
    const adaL = !!(logbook || []).find((r) => r.tanggal === sb.tanggal && r.shift === sb.shiftLabel);
    const kurang = [];
    if (!adaP) kurang.push('Personel');
    if (!adaF) kurang.push('Fasilitas');
    if (!adaL) kurang.push('Log Book');
    kosongCache = kurang.length ? [{ tanggal: sb.tanggal, hari: sb.shift, shift: sb.shift, shiftLabel: sb.shiftLabel, kurang }] : [];
    $('bellBadge').style.display = kurang.length ? 'flex' : 'none';
    $('bellBadge').textContent = kurang.length;
  }
  function tagJenis(j) { const cls = j === 'Personel' ? 'p' : j === 'Fasilitas' ? 'f' : 'l'; return `<span class="tag5 ${cls}">${E(j)} belum</span>`; }
  function bukaShiftKosong() {
    const sb = D.shiftSebelumnya(HARI_INI);
    const kurang = kosongCache.length ? kosongCache[0].kurang : [];
    const isi = kurang.length
      ? `<div class="kosong-list"><div class="kosong-row"><span class="kd"><b>${sb ? String(+sb.tanggal.slice(8,10)).padStart(2,'0') : '-'}</b><small>${sb ? BULAN_PENDEK[HARI_INI.getMonth()].toUpperCase() : ''}</small></span><span class="kt">${sb ? E(sb.shift) + ' (' + E(sb.tanggal.split('-').reverse().join('/')) + ')' : ''}</span><div class="tagwrap">${kurang.map(tagJenis).join('')}</div></div></div>`
      : '<div class="empty">Shift sebelumnya sudah lengkap dilaporkan (Personel, Fasilitas, Log Book).</div>';
    const sub = sb ? `Shift ${sb.shift}, ${sb.tanggal.split('-').reverse().join('/')} \u2022 ${kurang.length} jenis laporan belum diisi` : 'Tidak ada shift sebelumnya';
    $('kosongBody').innerHTML = `<div class="kosong-sub">${sub}</div>${isi}`;
    $('kosongOverlay').style.display = 'flex';
  }
  function tutupShiftKosong() { $('kosongOverlay').style.display = 'none'; }
  async function salinPengingatKosong() {
    const sb = D.shiftSebelumnya(HARI_INI);
    const kurang = kosongCache.length ? kosongCache[0].kurang : [];
    if (!kurang.length || !sb) { toast('Shift sebelumnya sudah lengkap dilaporkan.'); return; }
    const teks = `*LAPORAN BELUM LENGKAP*\n*AVSEC BANDARA SUPADIO*\n\nShift ${sb.shift}, ${sb.tanggal.split('-').reverse().join('/')}\n\nBelum diisi: ${kurang.join(', ')}\n\nMohon segera dilengkapi. Terima kasih.`;
    try { await navigator.clipboard.writeText(teks); toast('Teks pengingat disalin.'); }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = teks; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      let oke = false; try { oke = document.execCommand('copy'); } catch (e2) { /* diabaikan */ } ta.remove();
      toast(oke ? 'Teks pengingat disalin.' : 'Gagal menyalin teks.', oke ? 'ok' : 'err');
    }
  }

  /* ---------- Mulai ---------- */
  async function mulai() {
    A.pasangKunci(); A.nav('beranda');
    personel = D.bacaPersonel();
    fasilitas = D.bacaFasilitas();
    logbook = D.bacaLogbook();
    renderShiftSebelumnya(); renderCatatan(); hitungKosongBulanIni();
    kejadian = await D.bacaKejadian();           // lengkapi dengan data kejadian (IndexedDB, async)
    renderCatatan();
  }

  window.Beranda = { bukaShiftKosong, tutupShiftKosong, salinPengingatKosong, salinTeks };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai); else mulai();

  window.adaPerubahanBelumTersimpan = () => false;
  AVS.daftarSW();
})();
