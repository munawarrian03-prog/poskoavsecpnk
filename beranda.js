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
  const WARNA_ALASAN = { 'Cuti Tahunan': '#157A82', 'Sakit': '#C93B2E', 'Izin': '#D98A22', 'Dinas Luar': '#1D3A5C', 'Cuti Alasan Penting': '#4F8A3D', 'Cuti Melahirkan': '#8E5BA8', 'Tanpa Keterangan': '#7A8496', 'Lainnya': '#B9C4D6' };
  const BULAN_PENDEK = A.BULAN_PENDEK, BULAN = A.BULAN;

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
     BAGIAN 2 — BULAN INI
     ========================================================= */
  function skalaY(maxVal) { const mv = Math.max(4, maxVal), step = mv <= 6 ? 2 : mv <= 12 ? 4 : Math.ceil(mv / 3 / 2) * 2; return { step, max: Math.ceil(mv / step) * step }; }

  function grafikDonat(alasanList, unit) {
    if (!alasanList.length) return null;
    const tot = alasanList.reduce((a, b) => a + b.jumlah, 0), Ro = 56, ri = 37, cx = 62, cy = 62; let a0 = -Math.PI / 2, paths = '';
    if (alasanList.length === 1) paths = `<circle cx="${cx}" cy="${cy}" r="${(Ro + ri) / 2}" fill="none" stroke="${WARNA_ALASAN[alasanList[0].nama] || '#B9C4D6'}" stroke-width="${Ro - ri}"/>`;
    else alasanList.forEach((d) => {
      const ang = (d.jumlah / tot) * Math.PI * 2, a1 = a0 + ang - 0.025, lg = (a1 - a0) > Math.PI ? 1 : 0;
      const p = (rad, an) => [cx + rad * Math.cos(an), cy + rad * Math.sin(an)];
      const [x0, y0] = p(Ro, a0), [x1, y1] = p(Ro, a1), [x2, y2] = p(ri, a1), [x3, y3] = p(ri, a0);
      paths += `<path d="M${x0} ${y0} A${Ro} ${Ro} 0 ${lg} 1 ${x1} ${y1} L${x2} ${y2} A${ri} ${ri} 0 ${lg} 0 ${x3} ${y3}Z" fill="${WARNA_ALASAN[d.nama] || '#B9C4D6'}"/>`; a0 += ang;
    });
    const svgD = `<svg width="124" height="124" viewBox="0 0 124 124">${paths}<text x="62" y="63" text-anchor="middle" font-size="24" font-weight="800" fill="#10243D">${tot}</text><text x="62" y="78" text-anchor="middle" font-size="10" font-weight="700" fill="#5C6675">${unit}</text></svg>`;
    const leg = alasanList.map((d) => `<div><i style="background:${WARNA_ALASAN[d.nama] || '#B9C4D6'}"></i>${E(d.nama)}<b>${d.jumlah}</b><u>${Math.round(d.jumlah / tot * 100)}%</u></div>`).join('');
    return `<div class="donutwrap">${svgD}<div class="dl">${leg}</div></div>`;
  }

  function tabelTerbanyak(top) {
    if (!top.length) return '<div class="empty">Belum ada data ketidakhadiran<br>pada bulan ini.</div>';
    const mx = Math.max(...top.map((x) => x.jumlah)), tag = { 'Sakit': ['#FBE9E7', '#A82F24'], 'Cuti Tahunan': ['#E4F3F4', '#0F5F65'], 'Izin': ['#FCF1DF', '#9A5F12'], 'Dinas Luar': ['#E6ECF4', '#1D3A5C'] };
    return `<table class="tp"><thead><tr><th>#</th><th>Nama</th><th>Regu</th><th>Hari</th><th></th><th>Alasan utama</th></tr></thead><tbody>${top.map((x, i) => { const c = tag[x.alasan] || ['#EEF1F6', '#5C6675']; return `<tr><td class="rk">${i + 1}</td><td class="nm">${E(x.nama.toUpperCase())}</td><td>${E(x.regu)}</td><td><b>${x.jumlah}</b></td><td class="mb"><i style="width:${x.jumlah / mx * 100}%"></i></td><td><span class="tag" style="background:${c[0]};color:${c[1]}">${E(x.alasan)}</span></td></tr>`; }).join('')}</tbody></table>`;
  }

  function tabelFasilitasSering(top) {
    if (!top.length) return '<div class="empty">Belum ada masalah fasilitas<br>dilaporkan bulan ini.</div>';
    const mx = Math.max(...top.map((x) => x.jumlah));
    const warna = (j) => j === 'Rusak' ? ['#FBE9E7', '#A82F24'] : ['#FCF1DF', '#9A5F12'];
    return `<table class="tp tpf"><thead><tr><th>#</th><th>Item</th><th>Pos</th><th>Kali</th><th></th><th>Jenis terbanyak</th></tr></thead><tbody>${top.map((x, i) => { const c = warna(x.jenis); return `<tr><td class="rk">${i + 1}</td><td class="nm">${E(x.item)}</td><td class="ps">${E(x.pos)}</td><td><b>${x.jumlah}</b></td><td class="mb"><i style="width:${x.jumlah / mx * 100}%;background:#9A5F12"></i></td><td><span class="jn" style="background:${c[0]};color:${c[1]}">${E(x.jenis)}</span></td></tr>`; }).join('')}</tbody></table>`;
  }

  function grafikMinggu(k, m) {
    const d = k.perMinggu, W = 420, H = 150, base = 118, top = 16, sk = skalaY(Math.max(0, ...d.map((x) => x.jumlah))); let s = '';
    for (let g = 0; g <= sk.max; g += sk.step) { const yy = base - g / sk.max * (base - top); s += `<line x1="26" x2="${W}" y1="${yy}" y2="${yy}" stroke="#E9EDF4"/><text x="18" y="${yy + 3.5}" text-anchor="end" font-size="9.5" fill="#8A94A6" font-weight="600">${g}</text>`; }
    const mxv = Math.max(0, ...d.map((x) => x.jumlah));
    d.forEach((w, i) => {
      const x = 52 + i * 96, h = w.jumlah / sk.max * (base - top);
      s += w.masaDepan ? `<rect x="${x}" y="${base - 4}" width="44" height="4" rx="2" fill="#E1E6EF"/>`
        : w.jumlah === 0 ? `<rect x="${x}" y="${base - 3}" width="44" height="3" rx="1.5" fill="#D5DCE7"/><text x="${x + 22}" y="${base - 9}" text-anchor="middle" font-size="12" font-weight="800" fill="#8A94A6">0</text>`
        : `<rect x="${x}" y="${base - h}" width="44" height="${h}" rx="6" fill="${w.jumlah === mxv ? '#C93B2E' : '#E58A80'}"/><text x="${x + 22}" y="${base - h - 6}" text-anchor="middle" font-size="12" font-weight="800" fill="#10243D">${w.jumlah}</text>`;
      s += `<text x="${x + 22}" y="${base + 15}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#1A2233">${w.label}</text><text x="${x + 22}" y="${base + 28}" text-anchor="middle" font-size="9.5" font-weight="600" fill="#8A94A6">${w.rentang} ${BULAN_PENDEK[m]}</text>`;
    });
    return `<svg width="${W}" height="${H + 12}" viewBox="0 0 ${W} ${H + 12}">${s}</svg>`;
  }
  function daftarKejadian(k, m) {
    const t = k.terbaru;
    if (!t.length) return '<div class="empty">Belum ada laporan kejadian<br>pada bulan ini.</div>';
    return `<div class="evlist">${t.map((x) => `<div class="ev"><a class="evmain" href="kejadian.html#ubah=${encodeURIComponent(x.id)}" title="Buka laporan"><div class="dt"><b>${String(x.hari).padStart(2, '0')}</b><span>${BULAN_PENDEK[m].toUpperCase()}</span></div><div class="tx"><b>${E(x.judul)}</b><span>${[x.penyusun, x.jam ? x.jam + ' WIB' : ''].filter(Boolean).map(E).join(' • ') || '&nbsp;'}</span></div></a><a class="pill" href="kejadian.html#pdf=${encodeURIComponent(x.id)}" title="Unduh PDF">PDF</a></div>`).join('')}</div>`;
  }

  function renderBulanIni() {
    const y = HARI_INI.getFullYear(), m = HARI_INI.getMonth();
    $('bulanIniLabel').textContent = `${BULAN[m]} ${y}`;
    const p = D.statPersonel(personel, y, m, 'all', HARI_INI, 'orang-hari');   // Tahap 0.1: selalu per-hari
    const f = D.statFasilitas(fasilitas, y, m);
    const k = D.statKejadian(kejadian, y, m, HARI_INI);

    $('rowBulanIni1').innerHTML = `
<div class="dcard c6 r250"><div class="h"><div><h3>Ketidakhadiran Terbanyak</h3><div class="sub">5 teratas bulan ini • dihitung per orang per hari</div></div></div>${tabelTerbanyak(p.top)}</div>
<div class="dcard c6 r250"><div class="h"><div><h3>Alasan Ketidakhadiran</h3><div class="sub">Komposisi bulan ini • per hari</div></div></div>${grafikDonat(p.alasan, 'hari') || '<div class="empty">Belum ada personel tidak hadir<br>pada bulan ini.</div>'}</div>`;

    $('rowFasilitas').innerHTML = `<div class="dcard c12 rauto"><div class="h"><div><h3>Fasilitas Sering Bermasalah</h3><div class="sub">5 teratas bulan ini${f.laporan ? ` • dari ${f.laporan} laporan` : ''}</div></div></div>${tabelFasilitasSering(f.top)}</div>`;

    $('rowKejadian').innerHTML = `
<div class="dcard c4 r274"><div class="h"><div><h3>Jumlah Kejadian</h3><div class="sub">${BULAN[m]} ${y}</div></div></div><div style="display:flex;align-items:baseline;gap:8px;padding:10px 2px"><div style="font-size:40px;font-weight:800;color:#10243D;line-height:1">${k.jumlah}</div><div style="font-size:12px;font-weight:700;color:#8A94A6">kejadian</div></div></div>
<div class="dcard c4 r274"><div class="h"><div><h3>Kejadian per Minggu</h3><div class="sub">Berdasarkan tanggal laporan kejadian</div></div></div>${grafikMinggu(k, m)}</div>
<div class="dcard c4 r274"><div class="h"><div><h3>Kejadian Terbaru</h3><div class="sub">Klik untuk membuka laporan</div></div><a class="pill" href="kejadian.html#tersimpan">LIHAT SEMUA</a></div>${daftarKejadian(k, m)}</div>`;

    const kosongData = !personel.length && !fasilitas.length && !logbook.length && !kejadian.length;
    $('noteBawah').innerHTML = kosongData
      ? `<div class="banner"><span>ℹ️</span><div><b>Belum ada laporan tersimpan.</b> Buat laporan Personel, Fasilitas, Log Book, atau Kejadian — Beranda akan terisi otomatis.</div><div class="go"><a href="laporan-personel.html">Laporan Personel</a><a href="fasilitas.html">Laporan Fasilitas</a><a href="logbook.html">Log Book</a><a href="kejadian.html">Laporan Kejadian</a></div></div>`
      : `Ketidakhadiran dihitung per orang per hari — satu orang yang tidak hadir di lebih dari satu shift pada hari yang sama dihitung satu kali (alasan diambil dari shift paling awal hari itu).`;
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
    renderShiftSebelumnya(); renderBulanIni(); hitungKosongBulanIni();
    kejadian = await D.bacaKejadian();           // lengkapi dengan data kejadian (IndexedDB, async)
    renderBulanIni();
  }

  window.Beranda = { bukaShiftKosong, tutupShiftKosong, salinPengingatKosong, salinTeks };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai); else mulai();

  window.adaPerubahanBelumTersimpan = () => false;
  AVS.daftarSW();
})();
