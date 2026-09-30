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
   ===================================================== */
(function (root) {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const REGU_NAMA = { A: 'Regu A (Alfa)', B: 'Regu B (Bravo)', C: 'Regu C (Charlie)', D: 'Regu D (Delta)', all: 'Semua Regu' };
  const tglIndo = (iso) => { if (!iso) return '-'; const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return iso; const d = new Date(+m[1], +m[2] - 1, +m[3]); return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); };
  const tglPendek = (iso) => iso ? String(iso).split('-').reverse().join('/') : '-';

  const TH = 'text-align:left;font-size:7pt;font-weight:800;color:#8A94A6;text-transform:uppercase;padding:5px 6px;border-bottom:1px solid #E1E6EF;background:#F6F8FB';
  const TD = 'padding:5px 6px;border-bottom:1px solid #F1F4F8';
  function kop(judul, sub, tglCetak) {
    return `<div style="display:flex;align-items:center;gap:10px;border-bottom:2.5px solid #10243D;padding-bottom:8px;margin-bottom:12px">
<img src="Logo/AVS-kop.png" style="height:30px">
<div><div style="font-size:12pt;font-weight:800;color:#10243D">${esc(judul)}</div><div style="font-size:7.5pt;color:#5C6675;font-weight:600">${esc(sub)}</div></div>
<div style="flex:1"></div>
<div style="font-size:7.5pt;color:#8A94A6;font-weight:700;text-align:right">Dicetak ${esc(tglCetak)}</div>
</div>`;
  }
  function judulBlok(t, warna) { return `<div style="font-size:11pt;font-weight:800;color:${warna || '#10243D'};margin:14px 0 6px;padding-top:6px;border-top:1px solid #E1E6EF">${esc(t)}</div>`; }
  function kpiRow(items) {
    return `<div style="display:flex;gap:8px;margin-bottom:8px">${items.map((k) => `<div style="flex:1;border:1px solid #E1E6EF;border-radius:8px;padding:8px 10px"><div style="font-size:6.5pt;font-weight:800;color:#8A94A6;text-transform:uppercase">${esc(k.l)}</div><div style="font-size:15pt;font-weight:800;color:#10243D;margin-top:2px">${esc(k.v)}<span style="font-size:8pt;font-weight:700;color:#8A94A6"> ${esc(k.s || '')}</span></div></div>`).join('')}</div>`;
  }

  function tabelPersonel(daftar) {
    if (!daftar.length) return '<div style="font-size:9pt;color:#8A94A6;font-style:italic">Tidak ada data ketidakhadiran pada rentang ini.</div>';
    const rows = daftar.map((x, i) => `<tr><td style="${TD};text-align:center;color:#8A94A6">${i + 1}</td><td style="${TD};font-weight:800;color:#10243D">${esc(x.nama.toUpperCase())}</td><td style="${TD}">${esc(x.regu)}</td><td style="${TD};text-align:center"><b>${x.jumlah}</b></td><td style="${TD}">${x.tanggal.map((t) => `${esc(tglPendek(t.tgl))} (${esc(t.alasan)})`).join(', ')}</td></tr>`).join('');
    return `<table style="width:100%;border-collapse:collapse;font-size:8pt"><tr><th style="${TH}">#</th><th style="${TH}">Nama</th><th style="${TH}">Regu</th><th style="${TH};text-align:center">Hari</th><th style="${TH}">Tanggal &amp; Alasan</th></tr>${rows}</table>`;
  }
  function tabelFasilitas(daftar) {
    if (!daftar.length) return '<div style="font-size:9pt;color:#8A94A6;font-style:italic">Tidak ada masalah fasilitas dilaporkan pada rentang ini.</div>';
    const rows = daftar.map((x, i) => `<tr><td style="${TD};text-align:center;color:#8A94A6">${i + 1}</td><td style="${TD};font-weight:800;color:#10243D">${esc(x.item)}</td><td style="${TD}">${esc(x.pos)}</td><td style="${TD};text-align:center"><b>${x.jumlah}</b></td><td style="${TD}">${esc(x.jenis)}</td><td style="${TD}">${x.tanggal.map(tglPendek).map(esc).join(', ')}</td></tr>`).join('');
    return `<table style="width:100%;border-collapse:collapse;font-size:8pt"><tr><th style="${TH}">#</th><th style="${TH}">Item</th><th style="${TH}">Pos</th><th style="${TH};text-align:center">Kali</th><th style="${TH}">Jenis</th><th style="${TH}">Tanggal</th></tr>${rows}</table>`;
  }
  function labelKategoriBast(kat) {
    const K = (typeof KATEGORI_BAST !== 'undefined') ? KATEGORI_BAST : {};
    return (K[kat] && K[kat].label) || 'Lainnya';
  }
  function tabelKejadianLK(daftar) {
    if (!daftar.length) return '<div style="font-size:9pt;color:#8A94A6;font-style:italic">Tidak ada laporan kejadian pada rentang ini.</div>';
    const rows = daftar.map((x, i) => `<tr><td style="${TD};text-align:center;color:#8A94A6">${i + 1}</td><td style="${TD};font-weight:700;color:#10243D">${esc(x.judul)}</td><td style="${TD};white-space:nowrap"><b>${esc(tglPendek(x.tanggal))}</b></td><td style="${TD}">${esc(x.lokasiKejadian || '-')}</td><td style="${TD}">${esc(x.fileNumber || '-')}</td></tr>`).join('');
    return `<table style="width:100%;border-collapse:collapse;font-size:8pt"><tr><th style="${TH}">No</th><th style="${TH}">Laporan Kejadian</th><th style="${TH}">Tanggal</th><th style="${TH}">Pos Jaga</th><th style="${TH}">No. Berkas</th></tr>${rows}</table>`;
  }
  function tabelKejadianBAST(daftar) {
    if (!daftar.length) return '<div style="font-size:9pt;color:#8A94A6;font-style:italic">Tidak ada BAST pada rentang ini.</div>';
    const rows = daftar.map((x, i) => `<tr><td style="${TD};text-align:center;color:#8A94A6">${i + 1}</td><td style="${TD};font-weight:700;color:#10243D">${esc(labelKategoriBast(x.kategori))} — ${esc(x.pihakSatu || '-')} &rarr; ${esc(x.pihakDua || '-')}</td><td style="${TD};white-space:nowrap"><b>${esc(tglPendek(x.tanggal))}</b></td><td style="${TD}">${esc(x.nomorBast || '-')}</td></tr>`).join('');
    return `<table style="width:100%;border-collapse:collapse;font-size:8pt"><tr><th style="${TH}">No</th><th style="${TH}">Serah Terima</th><th style="${TH}">Tanggal</th><th style="${TH}">No. BAST</th></tr>${rows}</table>`;
  }
  function tabelKepatuhan(daftar) {
    if (!daftar.length) return '<div style="font-size:9pt;color:#8A94A6;font-style:italic">Seluruh shift pada rentang ini sudah lengkap dilaporkan.</div>';
    const rows = daftar.map((x, i) => `<tr><td style="${TD};text-align:center;color:#8A94A6">${i + 1}</td><td style="${TD};white-space:nowrap"><b>${esc(tglPendek(x.tanggal))}</b></td><td style="${TD}">${esc(x.shift)}</td><td style="${TD}">${x.kurang.map(esc).join(', ')}</td></tr>`).join('');
    return `<table style="width:100%;border-collapse:collapse;font-size:8pt"><tr><th style="${TH}">#</th><th style="${TH}">Tanggal</th><th style="${TH}">Shift</th><th style="${TH}">Belum Diisi</th></tr>${rows}</table>`;
  }

  function ttdDua() {
    return `<div class="ttd-block" style="page-break-inside:avoid;break-inside:avoid;display:flex;justify-content:space-around;margin-top:24mm;text-align:center">
<div><div style="font-size:9pt">Dibuat oleh,</div><div style="font-size:9pt;font-weight:800;margin-top:2px">Airport Security Coordinator</div><div style="height:16mm">&nbsp;</div><div style="font-size:9pt;font-weight:800">( .................................. )</div></div>
<div><div style="font-size:9pt">Mengetahui,</div><div style="font-size:9pt;font-weight:800;margin-top:2px">Airport Security Department Head</div><div style="height:16mm">&nbsp;</div><div style="font-size:9pt;font-weight:800">( .................................. )</div></div>
</div>`;
  }

  root.buildRekapPdfHTML = function (ctx) {
    const { RP, RF, RK, RQ, filter, dicetak } = ctx;
    const tglCetak = dicetak.toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const periode = `${tglIndo(filter.mulai)} – ${tglIndo(filter.akhir)}`;
    const reguLabel = REGU_NAMA[filter.regu] || filter.regu;

    const sampul = `<div style="font-family:'Montserrat', 'Inter',Arial,sans-serif;padding:18px;text-align:center;min-height:250mm;display:flex;flex-direction:column;align-items:center;justify-content:center">
<img src="Logo/AVS-kop.png" style="height:100px;margin-bottom:18px">
<div style="font-size:19pt;font-weight:800;color:#10243D">REKAP LAPORAN AVSEC</div>
<div style="font-size:12pt;font-weight:700;color:#5C6675;margin-top:4px">Bandara Supadio Pontianak</div>
<div style="margin-top:28px;font-size:11pt;font-weight:700;color:#10243D">${periode}</div>
<div style="font-size:10pt;color:#5C6675;margin-top:3px">${esc(reguLabel)}</div>
<div style="margin-top:40px;font-size:8.5pt;color:#8A94A6">Dicetak ${esc(tglCetak)}</div>
</div>`;

    const halPersonel = `<div style="font-family:'Montserrat', 'Inter',Arial,sans-serif;padding:18px;font-size:9.5pt;color:#000">
${kop('Laporan Personel', periode + ' • ' + reguLabel, tglCetak)}
${kpiRow([{ l: 'Tidak Hadir', v: RP.tidakHadir, s: 'hari' }, { l: 'Terlibat', v: RP.orangTerlibat, s: 'orang' }, { l: 'Kehadiran', v: RP.kehadiran == null ? '-' : RP.kehadiran.toFixed(1), s: RP.kehadiran == null ? '' : '%' }, { l: 'Laporan', v: RP.laporanTersimpan, s: 'tersimpan' }])}
${judulBlok('Ketidakhadiran per Personel', '#157A82')}
${tabelPersonel(RP.daftar)}
</div>`;

    const halFasilitas = `<div style="font-family:'Montserrat', 'Inter',Arial,sans-serif;padding:18px;font-size:9.5pt;color:#000">
${kop('Laporan Fasilitas', periode + ' • ' + reguLabel, tglCetak)}
${kpiRow([{ l: 'Total Masalah', v: RF.totalMasalah, s: 'kali' }, { l: 'Tidak Digunakan', v: RF.tidakDigunakan, s: 'kali' }, { l: 'Kelengkapan Dok.', v: RF.dokPct == null ? '-' : RF.dokPct, s: RF.dokPct == null ? '' : '%' }, { l: 'Laporan', v: RF.laporanTersimpan, s: 'tersimpan' }])}
${judulBlok('Alat Sering Bermasalah', '#9A5F12')}
${tabelFasilitas(RF.daftar)}
</div>`;

    const halKejadian = `<div style="font-family:'Montserrat', 'Inter',Arial,sans-serif;padding:18px;font-size:9.5pt;color:#000">
${kop('Laporan Kejadian', periode, tglCetak)}
${kpiRow([{ l: 'Jumlah LK', v: RK.lk.jumlah, s: 'kasus' }, { l: 'Jumlah BAST', v: RK.bast.jumlah, s: 'BAST' }])}
${judulBlok('Daftar Laporan Kejadian', '#1D3A5C')}
${tabelKejadianLK(RK.lk.daftar)}
${judulBlok('Daftar Serah Terima', '#0F5F65')}
${tabelKejadianBAST(RK.bast.daftar)}
</div>`;

    const halKepatuhan = `<div style="font-family:'Montserrat', 'Inter',Arial,sans-serif;padding:18px;font-size:9.5pt;color:#000">
${kop('Kepatuhan Pelaporan Shift', periode + ' • seluruh 3 jenis laporan', tglCetak)}
${kpiRow([{ l: 'Personel Belum', v: RQ.personelBelum, s: '/ ' + RQ.total }, { l: 'Fasilitas Belum', v: RQ.fasilitasBelum, s: '/ ' + RQ.total }, { l: 'Log Book Belum', v: RQ.logbookBelum, s: '/ ' + RQ.total }])}
${judulBlok('Daftar Shift Belum Lengkap', '#5C6675')}
${tabelKepatuhan(RQ.daftar)}
<div style="font-size:7.5pt;color:#8A94A6;margin-top:8px">Belum dapat dikelompokkan per regu karena aplikasi belum memiliki data jadwal dinas.</div>
${ttdDua()}
</div>`;

    return [sampul, halPersonel, halFasilitas, halKejadian, halKepatuhan]
      .map((h, i) => i === 0 ? h : `<div style="page-break-before:always"></div>${h}`).join('');
  };
})(window);
