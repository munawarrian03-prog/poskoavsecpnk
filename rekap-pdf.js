/* =====================================================
   PEMBUAT PDF: REKAP GABUNGAN (Tahap 4)
   Beda dari rekap-pdf.js versi lama (pdfmake, dashboard bulanan) —
   ini html2pdf-based, sejalan dengan personel-pdf.js/fasilitas-pdf.js/
   logbook-pdf.js supaya gayanya konsisten. Satu alur HTML, TANPA trik
   "sampul tanpa nomor + isi bernomor" dari mockup awal (itu perlu
   pustaka penggabung PDF yang tidak ada di aplikasi ini — lihat
   RENCANA-PENGEMBANGAN.md, Tahap 4, untuk penjelasan penyederhanaan
   ini). Daftar di sini TIDAK dipotong 5 seperti di layar — mengalir
   apa adanya, sesuai jumlah data sungguhan.
   Seluruh warna font hitam (#000); bold hanya pada judul/sub-judul/
   header tabel/label & angka KPI — isian data lainnya reguler.
   ===================================================== */
(function (root) {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const REGU_NAMA = { A: 'Regu A (Alfa)', B: 'Regu B (Bravo)', C: 'Regu C (Charlie)', D: 'Regu D (Delta)', all: 'Semua Regu' };
  const tglIndo = (iso) => { if (!iso) return '-'; const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return iso; const d = new Date(+m[1], +m[2] - 1, +m[3]); return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); };
  const tglPendek = (iso) => iso ? String(iso).split('-').reverse().join('/') : '-';
  const ALASAN_URUT = (typeof AVS_DATA !== 'undefined' && AVS_DATA.ALASAN) || ['Cuti Tahunan', 'Sakit', 'Izin', 'Dinas Luar', 'Cuti Alasan Penting', 'Cuti Melahirkan', 'Tanpa Keterangan', 'Lainnya'];
  const REGU_URUT = (typeof AVS_DATA !== 'undefined' && AVS_DATA.REGU) || ['A', 'B', 'C', 'D'];
  const BULAN_PENDEK = (typeof AVS !== 'undefined' && AVS.BULAN_PENDEK) || ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const UNIT = { harian: 'Hari', mingguan: 'Minggu', bulanan: 'Bulan' };
  const WARNA_ALASAN = { 'Cuti Tahunan': '#157A82', 'Sakit': '#C93B2E', 'Izin': '#D98A22', 'Dinas Luar': '#1D3A5C', 'Cuti Alasan Penting': '#4F8A3D', 'Cuti Melahirkan': '#8E5BA8', 'Tanpa Keterangan': '#7A8496', 'Lainnya': '#B9C4D6' };
  // Sama persis dgn WARNA_KATEGORI di rekap.js -- palet kategorikal tervalidasi (CVD-safe),
  // urutan tetap, dipakai utk kategori bebas (nama Pos) yang jumlahnya tidak tetap.
  const WARNA_KATEGORI = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];

  /* ---------- Ringkas tanggal: sama persis dgn ringkasTanggalList() di rekap.js ---------- */
  function labelTunggal(iso) { const [y, m, d] = iso.split('-').map(Number); return `${d} ${BULAN_PENDEK[m - 1]} ${String(y).slice(-2)}`; }
  function labelRentang(isoAwal, isoAkhir) { const [y, m, dAwal] = isoAwal.split('-').map(Number), dAkhir = +isoAkhir.split('-')[2]; return `${dAwal}-${dAkhir} ${BULAN_PENDEK[m - 1]} ${String(y).slice(-2)}`; }
  function berurutanSebulan(isoA, isoB) {
    const [yA, mA, dA] = isoA.split('-').map(Number), [yB, mB] = isoB.split('-').map(Number);
    if (yA !== yB || mA !== mB) return false;
    return (new Date(yB, mB - 1, +isoB.split('-')[2]) - new Date(yA, mA - 1, dA)) === 86400000;
  }
  function ringkasTanggalList(isoArray) {
    const uniq = Array.from(new Set((isoArray || []).filter(Boolean))).sort();
    if (!uniq.length) return '-';
    const parts = []; let i = 0;
    while (i < uniq.length) {
      let j = i;
      while (j + 1 < uniq.length && berurutanSebulan(uniq[j], uniq[j + 1])) j++;
      if (j - i + 1 > 2) parts.push(labelRentang(uniq[i], uniq[j]));
      else for (let k = i; k <= j; k++) parts.push(labelTunggal(uniq[k]));
      i = j + 1;
    }
    return parts.join(', ');
  }

  const TH = 'text-align:left;font-size:7pt;font-weight:800;color:#000;text-transform:uppercase;padding:5px 6px;border-bottom:1px solid #E1E6EF;background:#F6F8FB';
  const TD = 'padding:5px 6px;border-bottom:1px solid #F1F4F8';
  function kop(judul, sub, tglCetak) {
    return `<div style="display:flex;align-items:center;gap:10px;border-bottom:2.5px solid #10243D;padding-bottom:8px;margin-bottom:12px">
<img src="Logo/AVS-kop.png" style="height:30px">
<div><div style="font-size:12pt;font-weight:800;color:#000">${esc(judul)}</div><div style="font-size:7.5pt;color:#000;font-weight:600">${esc(sub)}</div></div>
<div style="flex:1"></div>
<div style="font-size:7.5pt;color:#000;font-weight:400;text-align:right">Dicetak ${esc(tglCetak)}</div>
</div>`;
  }
  function judulBlok(t) { return `<div style="font-size:11pt;font-weight:800;color:#000;margin:14px 0 6px;padding-top:6px;border-top:1px solid #E1E6EF">${esc(t)}</div>`; }
  function subJudul(t) { return `<div style="font-size:9pt;font-weight:800;color:#000;margin-bottom:6px">${esc(t)}</div>`; }
  function duaKolom(kiri, kanan) { return `<div style="display:flex;gap:14px;margin:14px 0 2px;align-items:flex-start">${[kiri, kanan].map((h) => `<div style="flex:1;border:1px solid #E1E6EF;border-radius:8px;padding:10px">${h}</div>`).join('')}</div>`; }
  function kpiRow(items) {
    return `<div style="display:flex;gap:8px;margin-bottom:8px">${items.map((k) => `<div style="flex:1;border:1px solid #E1E6EF;border-radius:8px;padding:8px 10px"><div style="font-size:6.5pt;font-weight:800;color:#000;text-transform:uppercase">${esc(k.l)}</div><div style="font-size:15pt;font-weight:800;color:#000;margin-top:2px">${esc(k.v)}<span style="font-size:8pt;font-weight:400;color:#000"> ${esc(k.s || '')}</span></div></div>`).join('')}</div>`;
  }
  /* ---------- Grafik: sama persis logikanya dgn skalaY/svgBatang/svgBatangDua/grafikDonat di
     rekap.js, hanya W/H dibuat tetap (bukan clientWidth/clientHeight) karena PDF statis. ---------- */
  const skalaY = (maxVal) => { const mv = Math.max(4, maxVal), step = mv <= 6 ? 2 : mv <= 12 ? 4 : Math.ceil(mv / 3 / 2) * 2; return { step, max: Math.ceil(mv / step) * step }; };
  function svgBatang(d, warna, W, H) {
    if (!d || !d.length) return '<div style="font-size:9pt;color:#000;font-style:italic">Belum ada data.</div>';
    const padL = 28, padR = 6, top = 14, base = H - 18, n = d.length;
    const slot = (W - padL - padR) / n, bw = Math.max(3, Math.min(40, slot * 0.64));
    const sk = skalaY(Math.max(0, ...d.map((x) => x.jumlah)));
    const lebarLabel = Math.max(...d.map((x) => String(x.label).length)) * 6 + 6, tiapLabel = Math.max(1, Math.ceil(lebarLabel / slot));
    let s = '';
    for (let g = 0; g <= sk.max; g += sk.step) { const y = base - g / sk.max * (base - top); s += `<line x1="${padL - 4}" x2="${W - padR}" y1="${y}" y2="${y}" stroke="#E9EDF4"/><text x="${padL - 7}" y="${y + 3}" text-anchor="end" font-size="8" fill="#000" font-weight="600">${g}</text>`; }
    d.forEach((w, i) => {
      const cx = padL + slot * (i + 0.5), x = cx - bw / 2, h = w.jumlah / sk.max * (base - top);
      s += w.jumlah === 0 ? `<rect x="${x}" y="${base - 2}" width="${bw}" height="2" rx="1" fill="#D5DCE7"/>` : `<rect x="${x}" y="${base - h}" width="${bw}" height="${h}" rx="${Math.min(3, bw / 3)}" fill="${warna}"/>` + (slot >= 12 ? `<text x="${cx}" y="${base - h - 3}" text-anchor="middle" font-size="8" font-weight="800" fill="#000">${w.jumlah}</text>` : '');
      if (i % tiapLabel === 0) s += `<text x="${cx}" y="${base + 11}" text-anchor="middle" font-size="7.5" font-weight="700" fill="#000">${esc(w.label)}</text>`;
    });
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${s}</svg>`;
  }
  function svgBatangDua(dA, dB, warnaA, warnaB, W, H) {
    if (!dA || !dA.length) return '<div style="font-size:9pt;color:#000;font-style:italic">Belum ada data.</div>';
    const padL = 28, padR = 6, top = 14, base = H - 18, n = dA.length;
    const slot = (W - padL - padR) / n, bw = Math.max(2, Math.min(16, slot * 0.26)), gap = Math.max(2, bw * 0.3);
    const sk = skalaY(Math.max(0, ...dA.map((x) => x.jumlah), ...dB.map((x) => x.jumlah)));
    const lebarLabel = Math.max(...dA.map((x) => String(x.label).length)) * 6 + 6, tiapLabel = Math.max(1, Math.ceil(lebarLabel / slot));
    let s = '';
    for (let g = 0; g <= sk.max; g += sk.step) { const y = base - g / sk.max * (base - top); s += `<line x1="${padL - 4}" x2="${W - padR}" y1="${y}" y2="${y}" stroke="#E9EDF4"/><text x="${padL - 7}" y="${y + 3}" text-anchor="end" font-size="8" fill="#000" font-weight="600">${g}</text>`; }
    dA.forEach((wA, i) => {
      const wB = dB[i], cx = padL + slot * (i + 0.5), xA = cx - gap / 2 - bw, xB = cx + gap / 2;
      const hA = wA.jumlah / sk.max * (base - top), hB = wB.jumlah / sk.max * (base - top);
      s += hA === 0 ? `<rect x="${xA}" y="${base - 2}" width="${bw}" height="2" rx="1" fill="#D5DCE7"/>` : `<rect x="${xA}" y="${base - hA}" width="${bw}" height="${hA}" rx="${Math.min(2, bw / 3)}" fill="${warnaA}"/>`;
      s += hB === 0 ? `<rect x="${xB}" y="${base - 2}" width="${bw}" height="2" rx="1" fill="#D5DCE7"/>` : `<rect x="${xB}" y="${base - hB}" width="${bw}" height="${hB}" rx="${Math.min(2, bw / 3)}" fill="${warnaB}"/>`;
      if (i % tiapLabel === 0) s += `<text x="${cx}" y="${base + 11}" text-anchor="middle" font-size="7.5" font-weight="700" fill="#000">${esc(wA.label)}</text>`;
    });
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${s}</svg>`;
  }
  function grafikDonatAlasan(alasanList) {
    if (!alasanList.length) return '<div style="font-size:9pt;color:#000;font-style:italic">Belum ada data pada rentang ini.</div>';
    const data = {}; alasanList.forEach((x) => { data[x.alasan] = (data[x.alasan] || 0) + 1; });
    const arr = Object.entries(data).map(([nama, jumlah]) => ({ nama, jumlah })).sort((a, b) => b.jumlah - a.jumlah);
    const tot = arr.reduce((a, b) => a + b.jumlah, 0), Ro = 42, ri = 27, cx = 48, cy = 48; let a0 = -Math.PI / 2, paths = '';
    arr.forEach((d) => {
      const ang = (d.jumlah / tot) * Math.PI * 2, a1 = a0 + ang - 0.02, lg = (a1 - a0) > Math.PI ? 1 : 0;
      const p = (rad, an) => [cx + rad * Math.cos(an), cy + rad * Math.sin(an)];
      const [x0, y0] = p(Ro, a0), [x1, y1] = p(Ro, a1), [x2, y2] = p(ri, a1), [x3, y3] = p(ri, a0);
      paths += `<path d="M${x0} ${y0} A${Ro} ${Ro} 0 ${lg} 1 ${x1} ${y1} L${x2} ${y2} A${ri} ${ri} 0 ${lg} 0 ${x3} ${y3}Z" fill="${WARNA_ALASAN[d.nama] || '#B9C4D6'}"/>`; a0 += ang;
    });
    const svgD = `<svg width="96" height="96" viewBox="0 0 96 96">${paths}<text x="48" y="45" text-anchor="middle" font-size="16" font-weight="800" fill="#000">${tot}</text><text x="48" y="58" text-anchor="middle" font-size="7" font-weight="700" fill="#000">hari</text></svg>`;
    const leg = arr.map((d) => `<div style="display:flex;align-items:center;gap:5px;font-size:7.5pt;color:#000;margin-bottom:3px"><span style="display:inline-block;width:7px;height:7px;border-radius:2px;background:${WARNA_ALASAN[d.nama] || '#B9C4D6'}"></span>${esc(d.nama)}<b style="margin-left:auto;padding-left:8px">${d.jumlah}</b><span style="width:28px;text-align:right;color:#000;font-weight:400">${Math.round(d.jumlah / tot * 100)}%</span></div>`).join('');
    return `<div style="display:flex;align-items:center;gap:12px"><div style="flex:none">${svgD}</div><div style="flex:1">${leg}</div></div>`;
  }
  // Donat "Masalah per Pos" statis utk PDF -- sama persis dgn grafikDonatPos() di rekap.js.
  function grafikDonatPos(daftarFasilitas) {
    if (!daftarFasilitas.length) return '<div style="font-size:9pt;color:#000;font-style:italic">Belum ada masalah fasilitas pada rentang ini.</div>';
    const data = {}; daftarFasilitas.forEach((x) => { data[x.pos] = (data[x.pos] || 0) + x.jumlah; });
    let arr = Object.entries(data).map(([nama, jumlah]) => ({ nama, jumlah })).sort((a, b) => b.jumlah - a.jumlah);
    if (arr.length > 8) { const sisa = arr.slice(7).reduce((a, b) => a + b.jumlah, 0); arr = arr.slice(0, 7).concat([{ nama: 'Lainnya', jumlah: sisa }]); }
    const warna = {}; arr.forEach((d, i) => { warna[d.nama] = WARNA_KATEGORI[i] || '#B9C4D6'; });
    const tot = arr.reduce((a, b) => a + b.jumlah, 0), Ro = 42, ri = 27, cx = 48, cy = 48; let a0 = -Math.PI / 2, paths = '';
    arr.forEach((d) => {
      const ang = (d.jumlah / tot) * Math.PI * 2, a1 = a0 + ang - 0.02, lg = (a1 - a0) > Math.PI ? 1 : 0;
      const p = (rad, an) => [cx + rad * Math.cos(an), cy + rad * Math.sin(an)];
      const [x0, y0] = p(Ro, a0), [x1, y1] = p(Ro, a1), [x2, y2] = p(ri, a1), [x3, y3] = p(ri, a0);
      paths += `<path d="M${x0} ${y0} A${Ro} ${Ro} 0 ${lg} 1 ${x1} ${y1} L${x2} ${y2} A${ri} ${ri} 0 ${lg} 0 ${x3} ${y3}Z" fill="${warna[d.nama]}"/>`; a0 += ang;
    });
    const svgD = `<svg width="96" height="96" viewBox="0 0 96 96">${paths}<text x="48" y="45" text-anchor="middle" font-size="16" font-weight="800" fill="#000">${tot}</text><text x="48" y="58" text-anchor="middle" font-size="7" font-weight="700" fill="#000">kali</text></svg>`;
    const leg = arr.map((d) => `<div style="display:flex;align-items:center;gap:5px;font-size:7.5pt;color:#000;margin-bottom:3px"><span style="display:inline-block;width:7px;height:7px;border-radius:2px;background:${warna[d.nama]}"></span>${esc(d.nama)}<b style="margin-left:auto;padding-left:8px">${d.jumlah}</b><span style="width:28px;text-align:right;color:#000;font-weight:400">${Math.round(d.jumlah / tot * 100)}%</span></div>`).join('');
    return `<div style="display:flex;align-items:center;gap:12px"><div style="flex:none">${svgD}</div><div style="flex:1">${leg}</div></div>`;
  }

  // Kelompokkan tanggal per alasan (teks utk kolom Alasan) & ringkas per grup (kolom Tanggal) —
  // sejalan dgn kolom "Tanggal" baru di layar (selTanggalPersonel() di rekap.js).
  function alasanTeks(tanggalArray) {
    const counts = {};
    (tanggalArray || []).forEach((item) => { counts[item.alasan] = (counts[item.alasan] || 0) + 1; });
    return Object.keys(counts).sort((a, b) => ALASAN_URUT.indexOf(a) - ALASAN_URUT.indexOf(b)).map((a) => `${esc(a)} (${counts[a]})`).join(', ');
  }
  function tanggalPerAlasanTeks(tanggalArray) {
    const grouped = {};
    (tanggalArray || []).forEach((item) => { (grouped[item.alasan] || (grouped[item.alasan] = [])).push(item.tgl); });
    return Object.keys(grouped)
      .sort((a, b) => ALASAN_URUT.indexOf(a) - ALASAN_URUT.indexOf(b))
      .map((alasan) => esc(ringkasTanggalList(grouped[alasan])))
      .join('<br>');
  }

  function tabelPersonel(daftar) {
    if (!daftar.length) return '<div style="font-size:9pt;color:#000;font-style:italic">Tidak ada data ketidakhadiran pada rentang ini.</div>';
    const rows = daftar.map((x, i) => `<tr><td style="${TD};text-align:center;color:#000">${i + 1}</td><td style="${TD};font-weight:400;color:#000">${esc(x.nama.toUpperCase())}</td><td style="${TD};text-align:center;font-weight:400">${x.jumlah}</td><td style="${TD}">${alasanTeks(x.tanggal)}</td><td style="${TD}">${tanggalPerAlasanTeks(x.tanggal)}</td></tr>`).join('');
    return `<table style="width:100%;border-collapse:collapse;font-size:8pt"><tr><th style="${TH}">#</th><th style="${TH}">Nama</th><th style="${TH};text-align:center">Hari</th><th style="${TH}">Alasan (N Hari)</th><th style="${TH}">Tanggal</th></tr>${rows}</table>`;
  }
  function tabelFasilitas(daftar) {
    if (!daftar.length) return '<div style="font-size:9pt;color:#000;font-style:italic">Tidak ada masalah fasilitas dilaporkan pada rentang ini.</div>';
    const rows = daftar.map((x, i) => `<tr><td style="${TD};text-align:center;color:#000">${i + 1}</td><td style="${TD};font-weight:400;color:#000">${esc(x.item)}</td><td style="${TD}">${esc(x.pos)}</td><td style="${TD};text-align:center;font-weight:400">${x.jumlah}</td><td style="${TD}">${esc(x.jenis)}</td><td style="${TD}">${esc(ringkasTanggalList(x.tanggal))}</td></tr>`).join('');
    return `<table style="width:100%;border-collapse:collapse;font-size:8pt"><tr><th style="${TH}">#</th><th style="${TH}">Item</th><th style="${TH}">Pos</th><th style="${TH};text-align:center">Kali</th><th style="${TH}">Jenis</th><th style="${TH}">Tanggal</th></tr>${rows}</table>`;
  }
  function labelKategoriBast(kat) {
    const K = (typeof KATEGORI_BAST !== 'undefined') ? KATEGORI_BAST : {};
    return (K[kat] && K[kat].label) || 'Lainnya';
  }
  // Kolom disamakan persis dgn tabelKejadianLK/BAST di layar (No | Laporan Kejadian/Serah Terima |
  // Tanggal) -- No. Berkas/No. BAST/Pos Jaga tidak ditampilkan di layar, jadi dihapus di sini juga.
  function tabelKejadianLK(daftar) {
    if (!daftar.length) return '<div style="font-size:9pt;color:#000;font-style:italic">Tidak ada laporan kejadian pada rentang ini.</div>';
    const rows = daftar.map((x, i) => `<tr><td style="${TD};text-align:center;color:#000">${i + 1}</td><td style="${TD};font-weight:400;color:#000">${esc(x.judul)}</td><td style="${TD};white-space:nowrap;font-weight:400">${esc(tglPendek(x.tanggal))}</td></tr>`).join('');
    return `<table style="width:100%;border-collapse:collapse;font-size:8pt"><tr><th style="${TH}">No</th><th style="${TH}">Laporan Kejadian</th><th style="${TH}">Tanggal</th></tr>${rows}</table>`;
  }
  function tabelKejadianBAST(daftar) {
    if (!daftar.length) return '<div style="font-size:9pt;color:#000;font-style:italic">Tidak ada BAST pada rentang ini.</div>';
    const rows = daftar.map((x, i) => `<tr><td style="${TD};text-align:center;color:#000">${i + 1}</td><td style="${TD};font-weight:400;color:#000">${esc(labelKategoriBast(x.kategori))} — ${esc(x.pihakSatu || '-')} &rarr; ${esc(x.pihakDua || '-')}</td><td style="${TD};white-space:nowrap;font-weight:400">${esc(tglPendek(x.tanggal))}</td></tr>`).join('');
    return `<table style="width:100%;border-collapse:collapse;font-size:8pt"><tr><th style="${TH}">No</th><th style="${TH}">Serah Terima</th><th style="${TH}">Tanggal</th></tr>${rows}</table>`;
  }
  // Tabel "Daftar Shift Belum Lengkap" per Grup x Jenis Laporan (4 x 3 = 12 baris tetap) —
  // sejalan dgn tabelKepatuhanGrup() di rekap.js, supaya PDF tidak lagi memanjang 1 baris/shift.
  function tabelKepatuhanGrup(daftar) {
    const JENIS = ['Personel', 'Fasilitas', 'Log Book'];
    const data = REGU_URUT.map((g) => ({ grup: g, jenis: JENIS.map((j) => ({ nama: j, tanggal: daftar.filter((x) => x.regu === g && x.kurang.includes(j)).map((x) => x.tanggal) })) }));
    if (!data.some((g) => g.jenis.some((j) => j.tanggal.length))) return '<div style="font-size:9pt;color:#000;font-style:italic">Seluruh shift pada rentang ini sudah lengkap dilaporkan.</div>';
    const trs = [];
    data.forEach((g) => {
      g.jenis.forEach((j, ji) => {
        const grupTd = ji === 0 ? `<td style="${TD};font-weight:800;color:#000" rowspan="3">Grup ${esc(g.grup)}</td>` : '';
        trs.push(`<tr>${grupTd}<td style="${TD};font-weight:400;color:#000">${esc(j.nama)}</td><td style="${TD}">${j.tanggal.length ? esc(ringkasTanggalList(j.tanggal)) : '-'}</td></tr>`);
      });
    });
    return `<table style="width:100%;border-collapse:collapse;font-size:8pt"><tr><th style="${TH}">Grup</th><th style="${TH}">Laporan</th><th style="${TH}">Tanggal</th></tr>${trs.join('')}</table>`;
  }
  // Donat "Kepatuhan Grup" statis (SVG) utk PDF — logika sama persis dgn grafikDonatGrup() di
  // rekap.js: porsi DIBALIK, grup dgn shift belum lengkap PALING SEDIKIT dapat porsi PALING BESAR.
  function donatKepatuhanGrup(daftar) {
    const WARNA_GRUP = { A: '#2a78d6', B: '#eb6834', C: '#1baf7a', D: '#eda100' };
    const jumlahPerGrup = {}; REGU_URUT.forEach((g) => { jumlahPerGrup[g] = 0; });
    let takTerpetakan = 0;
    daftar.forEach((x) => { if (jumlahPerGrup[x.regu] !== undefined) jumlahPerGrup[x.regu]++; else takTerpetakan++; });
    if (!daftar.length) return '<div style="font-size:9pt;color:#000;font-style:italic">Seluruh shift pada rentang ini sudah lengkap dilaporkan.</div>';
    if (takTerpetakan === daftar.length) return '<div style="font-size:9pt;color:#000;font-style:italic">Regu belum bisa dipetakan — unggah Jadwal Dinas bulan ini.</div>';
    const maxN = Math.max(...REGU_URUT.map((g) => jumlahPerGrup[g]));
    const items = REGU_URUT.map((g) => ({ grup: g, asli: jumlahPerGrup[g], nilai: (maxN - jumlahPerGrup[g]) + 1 }));
    const totNilai = items.reduce((a, b) => a + b.nilai, 0), totAsli = items.reduce((a, b) => a + b.asli, 0);
    const Ro = 46, ri = 30, cx = 52, cy = 52; let a0 = -Math.PI / 2, paths = '';
    items.forEach((d) => {
      const ang = (d.nilai / totNilai) * Math.PI * 2, a1 = a0 + ang - 0.02, lg = (a1 - a0) > Math.PI ? 1 : 0;
      const p = (rad, an) => [cx + rad * Math.cos(an), cy + rad * Math.sin(an)];
      const [x0, y0] = p(Ro, a0), [x1, y1] = p(Ro, a1), [x2, y2] = p(ri, a1), [x3, y3] = p(ri, a0);
      paths += `<path d="M${x0} ${y0} A${Ro} ${Ro} 0 ${lg} 1 ${x1} ${y1} L${x2} ${y2} A${ri} ${ri} 0 ${lg} 0 ${x3} ${y3}Z" fill="${WARNA_GRUP[d.grup]}"/>`; a0 += ang;
    });
    const svgD = `<svg width="104" height="104" viewBox="0 0 104 104">${paths}<text x="52" y="49" text-anchor="middle" font-size="18" font-weight="800" fill="#000">${totAsli}</text><text x="52" y="63" text-anchor="middle" font-size="8" font-weight="700" fill="#000">shift</text></svg>`;
    const leg = items.map((d) => `<div style="display:flex;align-items:center;gap:5px;font-size:8pt;color:#000"><span style="display:inline-block;width:7px;height:7px;border-radius:2px;background:${WARNA_GRUP[d.grup]}"></span>Grup ${esc(d.grup)}<b style="margin-left:auto;padding-left:10px">${Math.round(d.nilai / totNilai * 100)}%</b></div>`).join('');
    return `<div style="display:flex;align-items:center;gap:18px">${svgD}<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px 16px;flex:1">${leg}</div></div>`;
  }

  function ttdDua() {
    return `<div class="ttd-block" style="page-break-inside:avoid;break-inside:avoid;display:flex;justify-content:space-around;margin-top:24mm;text-align:center">
<div><div style="font-size:9pt;color:#000">Dibuat oleh,</div><div style="font-size:9pt;font-weight:800;margin-top:2px;color:#000">Airport Security Coordinator</div><div style="height:16mm">&nbsp;</div><div style="font-size:9pt;font-weight:400;color:#000">( .................................. )</div></div>
<div><div style="font-size:9pt;color:#000">Mengetahui,</div><div style="font-size:9pt;font-weight:800;margin-top:2px;color:#000">Airport Security Department Head</div><div style="height:16mm">&nbsp;</div><div style="font-size:9pt;font-weight:400;color:#000">( .................................. )</div></div>
</div>`;
  }

  root.buildRekapPdfHTML = function (ctx) {
    const { RP, RF, RK, RQ, filter, dicetak } = ctx;
    const tglCetak = dicetak.toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const periode = `${tglIndo(filter.mulai)} – ${tglIndo(filter.akhir)}`;
    const reguLabel = REGU_NAMA[filter.regu] || filter.regu;

    const sampul = `<div style="font-family:'Montserrat', 'Inter',Arial,sans-serif;padding:18px;text-align:center;min-height:250mm;display:flex;flex-direction:column;align-items:center;justify-content:center">
<img src="Logo/AVS-kop.png" style="height:100px;margin-bottom:18px">
<div style="font-size:19pt;font-weight:800;color:#000">REKAP LAPORAN AVSEC</div>
<div style="font-size:12pt;font-weight:700;color:#000;margin-top:4px">Bandara Supadio Pontianak</div>
<div style="margin-top:28px;font-size:11pt;font-weight:400;color:#000">${periode}</div>
<div style="font-size:10pt;color:#000;margin-top:3px;font-weight:400">${esc(reguLabel)}</div>
<div style="margin-top:40px;font-size:8.5pt;color:#000;font-weight:400">Dicetak ${esc(tglCetak)}</div>
</div>`;

    const halPersonel = `<div style="font-family:'Montserrat', 'Inter',Arial,sans-serif;padding:18px;font-size:9.5pt;color:#000">
${kop('Laporan Personel', periode + ' • ' + reguLabel, tglCetak)}
${kpiRow([{ l: 'Tidak Hadir', v: RP.tidakHadir, s: 'hari' }, { l: 'Terlibat', v: RP.orangTerlibat, s: 'orang' }, { l: 'Kehadiran', v: RP.kehadiran == null ? '-' : RP.kehadiran.toFixed(1), s: RP.kehadiran == null ? '' : '%' }, { l: 'Laporan', v: RP.laporanTersimpan, s: 'tersimpan' }])}
${duaKolom(
  subJudul('Tren Ketidakhadiran per ' + UNIT[RP.granularitas]) + svgBatang(RP.tren, '#7FB9BE', 356, 150),
  subJudul('Alasan Ketidakhadiran') + grafikDonatAlasan(RP.daftar.flatMap((x) => x.tanggal))
)}
${judulBlok('Ketidakhadiran per Personel')}
${tabelPersonel(RP.daftar)}
</div>`;

    const halFasilitas = `<div style="font-family:'Montserrat', 'Inter',Arial,sans-serif;padding:18px;font-size:9.5pt;color:#000">
${kop('Laporan Fasilitas', periode + ' • ' + reguLabel, tglCetak)}
${kpiRow([{ l: 'Total Masalah', v: RF.totalMasalah, s: 'kali' }, { l: 'Tidak Digunakan', v: RF.tidakDigunakan, s: 'kali' }, { l: 'Kelengkapan Dok.', v: RF.dokPct == null ? '-' : RF.dokPct, s: RF.dokPct == null ? '' : '%' }, { l: 'Laporan', v: RF.laporanTersimpan, s: 'tersimpan' }])}
${duaKolom(
  subJudul('Tren Masalah Fasilitas per ' + UNIT[RF.granularitas]) + svgBatang(RF.tren, '#D9A24B', 356, 150),
  subJudul('Masalah per Pos') + grafikDonatPos(RF.daftar)
)}
${judulBlok('Alat Sering Bermasalah')}
${tabelFasilitas(RF.daftar)}
</div>`;

    const unitKejadian = UNIT[RK.granularitas];
    const halKejadian = `<div style="font-family:'Montserrat', 'Inter',Arial,sans-serif;padding:18px;font-size:9.5pt;color:#000">
${kop('Laporan Kejadian', periode, tglCetak)}
${kpiRow([{ l: 'Laporan Kejadian (LK)', v: RK.lk.jumlah, s: 'kasus' }, { l: 'Serah Terima (BAST)', v: RK.bast.jumlah, s: 'BAST' }])}
${judulBlok('Tren Laporan per ' + unitKejadian)}
${svgBatangDua(RK.lk.tren, RK.bast.tren, '#E58A80', '#7FB9BE', 756, 150)}
${judulBlok('Daftar Laporan Kejadian')}
${tabelKejadianLK(RK.lk.daftar)}
${judulBlok('Daftar Serah Terima')}
${tabelKejadianBAST(RK.bast.daftar)}
</div>`;

    const halKepatuhan = `<div style="font-family:'Montserrat', 'Inter',Arial,sans-serif;padding:18px;font-size:9.5pt;color:#000">
${kop('Kepatuhan Pelaporan Shift', periode + ' • seluruh 3 jenis laporan', tglCetak)}
${kpiRow([{ l: 'Personel Belum', v: RQ.personelBelum, s: '/ ' + RQ.total }, { l: 'Fasilitas Belum', v: RQ.fasilitasBelum, s: '/ ' + RQ.total }, { l: 'Log Book Belum', v: RQ.logbookBelum, s: '/ ' + RQ.total }])}
${judulBlok('Kepatuhan Grup')}
<div style="font-size:7.5pt;color:#000;font-style:italic;margin-bottom:6px">Porsi dibalik: makin sedikit belum lengkap, makin besar porsinya.</div>
${donatKepatuhanGrup(RQ.daftar)}
${judulBlok('Daftar Shift Belum Lengkap')}
${tabelKepatuhanGrup(RQ.daftar)}
<div style="font-size:7.5pt;color:#000;margin-top:8px">Dikelompokkan otomatis per regu berdasarkan data Jadwal Dinas yang diunggah; shift yang regu-nya tidak ditemukan tidak ikut dihitung per grup.</div>
${ttdDua()}
</div>`;

    return [sampul, halPersonel, halFasilitas, halKejadian, halKepatuhan]
      .map((h, i) => i === 0 ? h : `<div style="page-break-before:always"></div>${h}`).join('');
  };
})(window);
