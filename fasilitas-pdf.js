/* =====================================================
   PEMBUAT PDF: LAPORAN FASILITAS (satu shift)
   Memakai html2pdf (sama seperti laporan-personel.html), BUKAN
   pdfmake (yang dipakai kejadian-pdf.js/rekap-pdf.js) — supaya kop
   dan gaya tabel mudah disamakan dengan mockup yang sudah disepakati.

   Kop: gaya kompak (logo+judul kiri, tanggal kanan, garis bawah) —
   SENGAJA BEDA dari kop besar-terpusat di laporan-personel.html versi
   lama. Lihat RENCANA-PENGEMBANGAN.md untuk alasannya.

   Tanda tangan: TUNGGAL, rata tengah — "Dibuat oleh, / [JABATAN], /
   ( NAMA )" — diambil live dari AVS.infoPembuatDariPersonel(), BUKAN
   disimpan/dibekukan di data laporan Fasilitas itu sendiri.
   ===================================================== */
(function (root) {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rapikan = (s) => String(s == null ? '' : s).trim().replace(/\s+/g, ' ');

  function tglIndo(ymd) {
    if (!ymd) return '-';
    const m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(ymd);
    if (isNaN(d)) return '-';
    return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function kop(judul, tglCetak) {
    return `<div style="display:flex;align-items:center;gap:10px;border-bottom:2.5px solid #9A5F12;padding-bottom:8px;margin-bottom:12px">
<img src="Logo/AVS-kop.png" style="height:34px">
<div><div style="font-size:16pt;font-weight:700;color:#10243D">${esc(judul)}</div><div style="font-size:8pt;color:#5C6675;font-weight:600">AVSEC Bandara Supadio</div></div>
<div style="flex:1"></div>
<div style="font-size:8pt;color:#5C6675;font-weight:700;text-align:right">${esc(tglCetak)}</div>
</div>`;
  }

  function idList(r) {
    return `<div style="font-size:9pt;margin-bottom:14px;line-height:1.9">
<div style="display:flex;gap:6px"><span style="width:26mm;color:#5C6675;font-weight:700">Hari/Tgl</span><span style="font-weight:800;color:#10243D">: ${esc(tglIndo(r.tanggal))}</span></div>
<div style="display:flex;gap:6px"><span style="width:26mm;color:#5C6675;font-weight:700">Shift</span><span style="font-weight:800;color:#10243D">: ${esc(r.shift)}</span></div>
<div style="display:flex;gap:6px"><span style="width:26mm;color:#5C6675;font-weight:700">Regu</span><span style="font-weight:800;color:#10243D">: ${esc(r.regu)}</span></div>
</div>`;
  }

  function ringkasanBox(r) {
    let rusak = 0, tidakDigunakan = 0, baik = 0, total = 0, dokTotal = 0, dokLengkap = 0;
    (r.posFasilitas || []).forEach((p) => (p.items || []).forEach((it) => {
      if (it.bentuk === 'A') { total++; if (it.kondisi === 'Rusak') rusak++; else baik++; if (it.status === 'Tidak Digunakan') tidakDigunakan++; }
      if (it.bentuk === 'B') { total++; if (it.rusak > 0) rusak++; else baik++; }
      if (it.bentuk === 'C') { dokTotal++; if (it.lengkap) dokLengkap++; }
    }));
    const posDokCount = (r.posFasilitas || []).filter((p) => (p.items || []).some((i) => i.bentuk === 'C')).length;
    const box = (label, val, bg, fg) => `<div style="flex:1;border-radius:7px;padding:7px 10px;background:${bg};color:${fg};text-align:center"><div style="font-size:13pt;font-weight:800">${val}</div><div style="font-size:7.5pt;font-weight:700">${label}</div></div>`;
    return `<div style="display:flex;gap:8px;margin-bottom:14px">
${box(rusak === 1 ? 'Item Rusak' : 'Item Rusak', rusak, '#FBE9E7', '#A82F24')}
${box('Tidak Digunakan', tidakDigunakan, '#FCF1DF', '#9A5F12')}
${box(`dari ${total} Item Baik`, baik, '#E4F3F4', '#0F5F65')}
${box(`dari ${posDokCount} Pos Dokumen Lengkap`, dokLengkap, '#EEF1F6', '#475569')}
</div>`;
  }

  function tabelA(items) {
    if (!items.length) return '';
    const rows = items.map((it) => {
      const kw = it.kondisi === 'Rusak' || it.status === 'Tidak Digunakan';
      const kc = it.kondisi === 'Rusak' ? '#A82F24' : '#2F6B2E';
      const sc = it.status === 'Tidak Digunakan' ? '#9A5F12' : '#2F6B2E';
      return `<tr${kw ? ' style="background:#FFFBF2"' : ''}><td style="padding:5px 6px;border-bottom:1px solid #F1F4F8">${esc(it.name)}</td><td style="padding:5px 6px;border-bottom:1px solid #F1F4F8;color:${kc};font-weight:800">${esc(it.kondisi)}</td><td style="padding:5px 6px;border-bottom:1px solid #F1F4F8;color:${sc};font-weight:800">${esc(it.status)}</td><td style="padding:5px 6px;border-bottom:1px solid #F1F4F8">${esc(it.keterangan) || '&mdash;'}</td></tr>`;
    }).join('');
    return `<table style="width:100%;border-collapse:collapse;font-size:8pt;margin-bottom:6px"><tr><th style="text-align:left;font-size:7pt;font-weight:800;color:#8A94A6;text-transform:uppercase;padding:4px 6px;border-bottom:1px solid #E1E6EF;background:#F6F8FB">Item</th><th style="text-align:left;font-size:7pt;font-weight:800;color:#8A94A6;text-transform:uppercase;padding:4px 6px;border-bottom:1px solid #E1E6EF;background:#F6F8FB">Kondisi</th><th style="text-align:left;font-size:7pt;font-weight:800;color:#8A94A6;text-transform:uppercase;padding:4px 6px;border-bottom:1px solid #E1E6EF;background:#F6F8FB">Status</th><th style="text-align:left;font-size:7pt;font-weight:800;color:#8A94A6;text-transform:uppercase;padding:4px 6px;border-bottom:1px solid #E1E6EF;background:#F6F8FB">Keterangan</th></tr>${rows}</table>`;
  }
  function tabelB(items) {
    if (!items.length) return '';
    const rows = items.map((it) => {
      const baik = Math.max(0, it.jumlah - it.rusak);
      return `<tr${it.rusak > 0 ? ' style="background:#FFFBF2"' : ''}><td style="padding:5px 6px;border-bottom:1px solid #F1F4F8">${esc(it.name)}</td><td style="padding:5px 6px;border-bottom:1px solid #F1F4F8;text-align:center">${it.jumlah}</td><td style="padding:5px 6px;border-bottom:1px solid #F1F4F8;text-align:center;color:#A82F24;font-weight:800">${it.rusak}</td><td style="padding:5px 6px;border-bottom:1px solid #F1F4F8;text-align:center;color:#2F6B2E;font-weight:800">${baik}</td><td style="padding:5px 6px;border-bottom:1px solid #F1F4F8">${esc(it.keterangan) || '&mdash;'}</td></tr>`;
    }).join('');
    return `<table style="width:100%;border-collapse:collapse;font-size:8pt;margin-bottom:6px"><tr><th style="text-align:left;font-size:7pt;font-weight:800;color:#8A94A6;text-transform:uppercase;padding:4px 6px;border-bottom:1px solid #E1E6EF;background:#F6F8FB">Item</th><th style="text-align:center;font-size:7pt;font-weight:800;color:#8A94A6;text-transform:uppercase;padding:4px 6px;border-bottom:1px solid #E1E6EF;background:#F6F8FB">Jumlah</th><th style="text-align:center;font-size:7pt;font-weight:800;color:#8A94A6;text-transform:uppercase;padding:4px 6px;border-bottom:1px solid #E1E6EF;background:#F6F8FB">Rusak</th><th style="text-align:center;font-size:7pt;font-weight:800;color:#8A94A6;text-transform:uppercase;padding:4px 6px;border-bottom:1px solid #E1E6EF;background:#F6F8FB">Baik</th><th style="text-align:left;font-size:7pt;font-weight:800;color:#8A94A6;text-transform:uppercase;padding:4px 6px;border-bottom:1px solid #E1E6EF;background:#F6F8FB">Keterangan</th></tr>${rows}</table>`;
  }
  function dokline(items) {
    const c = items.find((i) => i.bentuk === 'C'); if (!c) return '';
    const warna = c.lengkap ? '#2F6B2E' : '#A82F24';
    return `<div style="font-size:7.8pt;font-weight:600;color:#475569;margin:-1mm 0 5mm">Kelengkapan Dokumen: <b style="color:${warna}">${c.lengkap ? 'Lengkap' : 'Tidak Lengkap'}</b>${c.keterangan ? ' &mdash; ' + esc(c.keterangan) : ''}</div>`;
  }

  function posBlok(p, no) {
    const a = p.items.filter((i) => i.bentuk === 'A'), b = p.items.filter((i) => i.bentuk === 'B');
    return `<div class="fa-pdf-pos" style="page-break-inside:avoid;break-inside:avoid;margin-bottom:8px">
<div style="color:#10243D;font-size:10pt;font-weight:800;padding-bottom:3px;margin:8px 0 6px;border-bottom:1.5px solid #E1E6EF">${no}. ${esc(p.name)}</div>
${a.length ? tabelA(a) : ''}${b.length ? tabelB(b) : ''}${dokline(p.items)}
</div>`;
  }

  function ttdBlok(pembuat) {
    const nama = pembuat && pembuat.ada && pembuat.nama ? pembuat.nama.toUpperCase() : '....................';
    const jab = pembuat && pembuat.ada && pembuat.nama ? pembuat.jabatanLabel : 'CHIEF';
    const jabHtml = jab.replace(/^a\.n\. /i, 'a.n. ').split(', ').map(esc).join(',<br>');
    return `<div class="ttd-block" style="page-break-inside:avoid;break-inside:avoid;width:100%;margin-top:18mm;text-align:center">
<div style="font-size:9pt;color:#000">Dibuat oleh,</div>
<div style="font-size:9pt;font-weight:800;color:#000;margin-top:2px">${jabHtml},</div>
<div style="height:16mm">&nbsp;</div>
<div style="font-size:9pt;font-weight:800;color:#000">( ${esc(nama)} )</div>
</div>`;
  }

  // r: rekaman Laporan Fasilitas tersimpan. pembuat: hasil AVS.infoPembuatDariPersonel(r.tanggal, r.shift, r.regu),
  // diambil SAAT PDF dibuat (live), bukan dibaca dari r itu sendiri.
  root.buildFasilitasPdfHTML = function (r, pembuat, tglCetak) {
    const posHtml = (r.posFasilitas || []).map((p, i) => posBlok(p, i + 1)).join('');
    return `<div style="font-family:'Montserrat', 'Inter',Arial,sans-serif;padding:18px;font-size:9.5pt;color:#000">
${kop('Laporan Fasilitas', tglCetak)}
${idList(r)}
${ringkasanBox(r)}
${posHtml}
${ttdBlok(pembuat)}
</div>`;
  };
})(window);
