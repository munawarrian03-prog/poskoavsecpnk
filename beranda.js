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
  let bulanTerpilih = { y: HARI_INI.getFullYear(), m: HARI_INI.getMonth() };
  let kepatuhanCache = { total: 0, personelBelum: 0, fasilitasBelum: 0, logbookBelum: 0, daftar: [] };
  const SVG_MATA = '<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>';

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
      if (it.bentuk === 'A' && (it.kondisi === 'Rusak' || it.status === 'Tidak Digunakan')) out.push({ nama: `${it.name} — ${it.keterangan || (it.kondisi === 'Rusak' ? 'Rusak' : 'Tidak Digunakan')}`, jenis: it.kondisi === 'Rusak' ? 'Rusak' : 'Tidak Digunakan', pos: A.namaPosFasilitasTerbaru(p.id, p.name) });
      if (it.bentuk === 'B' && (it.rusak || 0) > 0) out.push({ nama: `${it.name} (${it.rusak} unit)`, jenis: 'Rusak', pos: A.namaPosFasilitasTerbaru(p.id, p.name) });
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
     BAGIAN 2 — BULANAN (pengganti "Bulan Ini"): dipilih lewat pemilih bulan,
     bukan selalu bulan berjalan. 2 baris x 3 kartu, semua tinggi dinamis (rauto).
     ========================================================= */
  function monthISORange(y, m) {
    const pad2 = (n) => String(n).padStart(2, '0');
    const akhir = new Date(y, m + 1, 0).getDate();
    return { start: `${y}-${pad2(m + 1)}-01`, end: `${y}-${pad2(m + 1)}-${pad2(akhir)}` };
  }

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

  // Grafik batang horizontal satu seri (satu warna tetap) -- nama personel di sumbu Y,
  // jumlah hari tidak hadir di sumbu X. Tinggi SVG mengikuti jumlah baris (dynamic height).
  function grafikBatangNama(items, warna) {
    // Tebal batang (9px, rx 5) disamakan dengan .kr-track di kartu "Shift Belum Lengkap" (beranda.css).
    const w = 420, rh = 28, tebal = 9, gap = 10, laby = 108, mx = Math.max(...items.map((x) => x.jumlah)) || 1;
    const potong = (s) => s.length > 15 ? s.slice(0, 14) + '…' : s;
    const h = items.length * (rh + gap) - gap;
    let s = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto">`;
    items.forEach((it, i) => {
      const y = i * (rh + gap) + (rh - tebal) / 2, bw = (it.jumlah / mx) * (w - laby - 34);
      s += `<text x="0" y="${i * (rh + gap) + rh / 2 + 4}" font-size="11.5" font-weight="700" fill="#1A2233"><title>${E(it.nama)}</title>${E(potong(it.nama))}</text>`;
      s += `<rect x="${laby}" y="${y}" width="${w - laby - 34}" height="${tebal}" rx="5" fill="#EAEFF5"/>`;
      s += `<rect x="${laby}" y="${y}" width="${Math.max(bw, 3)}" height="${tebal}" rx="5" fill="${warna}"/>`;
      s += `<text x="${w - 2}" y="${i * (rh + gap) + rh / 2 + 4}" text-anchor="end" font-size="12.5" font-weight="800" fill="${warna}">${it.jumlah}</text>`;
    });
    return s + '</svg>';
  }

  function tabelFasilitasRingkas(top) {
    if (!top.length) return '<div class="empty">Belum ada masalah fasilitas<br>dilaporkan bulan ini.</div>';
    return `<table class="tp"><thead><tr><th>#</th><th>Item</th><th>Pos</th><th>Kali</th></tr></thead><tbody>${top.map((x, i) => `<tr><td class="rk">${i + 1}</td><td class="nm">${E(x.item)}</td><td>${E(x.pos)}</td><td><b>${x.jumlah}</b></td></tr>`).join('')}</tbody></table>`;
  }

  function daftarKejadianLK(daftar) {
    if (!daftar.length) return '<div class="empty">Belum ada laporan kejadian<br>pada bulan ini.</div>';
    return `<div class="evlist">${daftar.slice(0, 5).map((x) => { const t = x.tanggal.split('-'); return `<a class="ev evmain" href="kejadian.html#ubah=${encodeURIComponent(x.id)}" title="Buka laporan"><div class="dt"><b>${t[2]}</b><span>${BULAN_PENDEK[+t[1] - 1].toUpperCase()}</span></div><div class="tx"><b>${E(x.judul)}</b><span>${E(x.lokasiKejadian || '-')}</span></div></a>`; }).join('')}</div>`;
  }
  function daftarBAST(daftar) {
    if (!daftar.length) return '<div class="empty">Belum ada BAST<br>pada bulan ini.</div>';
    return `<div class="evlist">${daftar.slice(0, 5).map((x) => { const t = x.tanggal.split('-'); return `<a class="ev bast evmain" href="kejadian.html#ubah=${encodeURIComponent(x.id)}" title="Buka laporan"><div class="dt"><b>${t[2]}</b><span>${BULAN_PENDEK[+t[1] - 1].toUpperCase()}</span></div><div class="tx"><b>${E(x.pihakSatu || '-')} → ${E(x.pihakDua || '-')}</b><span>${E(x.nomorBast || '-')}</span></div></a>`; }).join('')}</div>`;
  }

  function renderKepatuhanIndikator(r) {
    if (!r.total) return '<div class="empty">Belum ada shift yang jatuh tempo<br>pada bulan ini.</div>';
    const baris = [
      { lbl: 'Personel', n: r.personelBelum, c: '#1D3A5C' },
      { lbl: 'Fasilitas', n: r.fasilitasBelum, c: '#9A5F12' },
      { lbl: 'Log Book', n: r.logbookBelum, c: '#A82F24' }
    ];
    const baris2 = baris.map((b) => `<div class="kepat-row"><span class="kr-lbl">${E(b.lbl)}</span><span class="kr-track"><i style="width:${Math.min(100, b.n / r.total * 100)}%;background:${b.c}"></i></span><span class="kr-val">${b.n} / ${r.total}</span></div>`).join('');
    return `<div class="kepat-grid">${baris2}<div class="kepat-total">Total <b>${r.daftar.length}</b> shift dengan laporan belum lengkap</div></div>`;
  }

  function tabelKepatuhanPenuh(daftar) {
    if (!daftar.length) return '<div class="empty">Semua shift pada bulan ini<br>sudah lengkap dilaporkan.</div>';
    const tagW = (j) => j === 'Personel' ? ['#E6ECF4', '#1D3A5C'] : j === 'Fasilitas' ? ['#FCF1DF', '#9A5F12'] : ['#FBE9E7', '#A82F24'];
    const trs = daftar.map((x) => { const t = x.tanggal.split('-'); return `<tr><td class="nm">${t[2]}/${t[1]}</td><td>${E(x.shift)}</td><td>${x.kurang.map((j) => { const c = tagW(j); return `<span class="tag" style="background:${c[0]};color:${c[1]};margin-right:4px">${E(j)}</span>`; }).join('')}</td></tr>`; }).join('');
    return `<table class="tp"><thead><tr><th>Tanggal</th><th>Shift</th><th>Belum Diisi</th></tr></thead><tbody>${trs}</tbody></table>`;
  }

  function renderBulanan() {
    const { y, m } = bulanTerpilih, { start, end } = monthISORange(y, m);
    const p = D.statPersonel(personel, y, m, 'all', HARI_INI, 'orang-hari');   // Tahap 0.1: selalu per-hari
    const f = D.statFasilitas(fasilitas, y, m);
    const kj = D.statKejadianRentang(kejadian, start, end);
    kepatuhanCache = D.kepatuhanRentang(personel, fasilitas, logbook, start, end, HARI_INI);

    $('rowBulanan1').innerHTML = `
<div class="dcard c4 rauto"><div class="h"><div><h3>Ketidakhadiran Terbanyak</h3><div class="sub">${BULAN[m]} ${y} • per orang per hari</div></div></div>${p.top.length ? grafikBatangNama(p.top, '#C93B2E') : '<div class="empty">Belum ada data ketidakhadiran<br>pada bulan ini.</div>'}</div>
<div class="dcard c4 rauto"><div class="h"><div><h3>Alasan Ketidakhadiran</h3><div class="sub">Komposisi ${BULAN[m]} ${y}</div></div></div>${grafikDonat(p.alasan, 'hari') || '<div class="empty">Belum ada personel tidak hadir<br>pada bulan ini.</div>'}</div>
<div class="dcard c4 rauto"><div class="h"><div><h3>Fasilitas Sering Bermasalah</h3><div class="sub">${f.laporan ? `dari ${f.laporan} laporan` : 'Belum ada laporan'}</div></div></div>${tabelFasilitasRingkas(f.top)}</div>`;

    $('rowBulanan2').innerHTML = `
<div class="dcard c4 rauto"><div class="h"><div><h3>Daftar Kejadian Terbaru</h3><div class="sub">5 terbaru • ${BULAN[m]} ${y}</div></div><a class="mata-btn" href="kejadian.html#tersimpan" title="Lihat semua di Laporan Tersimpan">${SVG_MATA}</a></div>${daftarKejadianLK(kj.lk.daftar)}</div>
<div class="dcard c4 rauto"><div class="h"><div><h3>Daftar BAST Terbaru</h3><div class="sub">5 terbaru • ${BULAN[m]} ${y}</div></div><a class="mata-btn" href="kejadian.html#tersimpan" title="Lihat semua di Laporan Tersimpan">${SVG_MATA}</a></div>${daftarBAST(kj.bast.daftar)}</div>
<div class="dcard c4 rauto"><div class="h"><div><h3>Shift Belum Lengkap</h3><div class="sub">${BULAN[m]} ${y}</div></div><button type="button" class="mata-btn" onclick="Beranda.bukaKepatuhan()" title="Lihat semua">${SVG_MATA}</button></div>${renderKepatuhanIndikator(kepatuhanCache)}</div>`;

    renderCatatan();
  }

  function renderCatatan() {
    const kosongData = !personel.length && !fasilitas.length && !logbook.length && !kejadian.length;
    $('noteBawah').innerHTML = kosongData
      ? `<div class="banner"><span>ℹ️</span><div><b>Belum ada laporan tersimpan.</b> Buat laporan Personel, Fasilitas, Log Book, atau Kejadian — Beranda akan terisi otomatis.</div><div class="go"><a href="laporan-personel.html">Laporan Personel</a><a href="fasilitas.html">Laporan Fasilitas</a><a href="logbook.html">Log Book</a><a href="kejadian.html">Laporan Kejadian</a></div></div>`
      : `Ketidakhadiran dihitung per orang per hari — satu orang yang tidak hadir di lebih dari satu shift pada hari yang sama dihitung satu kali (alasan diambil dari shift paling awal hari itu).`;
  }

  function bukaKepatuhan() {
    $('kepatuhanBody').innerHTML = tabelKepatuhanPenuh(kepatuhanCache.daftar);
    $('kepatuhanOverlay').style.display = 'flex';
  }
  function tutupKepatuhan() { $('kepatuhanOverlay').style.display = 'none'; }

  function pasangPemilihBulan() {
    A.pemilihBulan($('pilihBulanBulanan'), {
      get: () => bulanTerpilih,
      set: (y, m) => { if (y == null) return; bulanTerpilih = { y, m }; renderBulanan(); },
      maks: { y: HARI_INI.getFullYear(), m: HARI_INI.getMonth() },
      semua: false
    });
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
    pasangPemilihBulan();
    renderShiftSebelumnya(); renderBulanan(); hitungKosongBulanIni();
    kejadian = await D.bacaKejadian();           // lengkapi dengan data kejadian (IndexedDB, async)
    renderBulanan();
  }

  window.Beranda = { bukaShiftKosong, tutupShiftKosong, salinPengingatKosong, salinTeks, bukaKepatuhan, tutupKepatuhan };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai); else mulai();

  window.adaPerubahanBelumTersimpan = () => false;
  AVS.daftarSW();
})();
