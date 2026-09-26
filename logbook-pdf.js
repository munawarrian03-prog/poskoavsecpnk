/* =====================================================
   PEMBUAT PDF: LOG BOOK SERAH TERIMA (gabungan)
   Berbeda dari fasilitas-pdf.js/personel-pdf.js: TIDAK menggabungkan
   berkas PDF terpisah (tidak ada pustaka penggabung PDF di aplikasi
   ini — lihat RENCANA-PENGEMBANGAN.md Tahap 2). Sebagai gantinya,
   HTML dari ketiga bagian digabung dulu jadi SATU string, baru
   dicetak SEKALI lewat html2pdf. Hasilnya tetap satu berkas PDF utuh.

   Butuh personel-pdf.js dan fasilitas-pdf.js sudah termuat lebih dulu.
   ===================================================== */
(function (root) {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function tglIndo(ymd) {
    if (!ymd) return '-';
    const m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(ymd);
    if (isNaN(d)) return '-';
    return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  function kop(tglCetak) {
    return `<div style="display:flex;align-items:center;gap:10px;border-bottom:2.5px solid #1D3A5C;padding-bottom:8px;margin-bottom:12px">
<img src="Logo/AVS.png" style="height:34px">
<div><div style="font-size:14pt;font-weight:800;color:#10243D">Log Book Serah Terima</div><div style="font-size:8pt;color:#5C6675;font-weight:600">AVSEC Bandara Supadio</div></div>
<div style="flex:1"></div>
<div style="font-size:8pt;color:#5C6675;font-weight:700;text-align:right">${esc(tglCetak)}</div>
</div>`;
  }
  function idBox(r, pembuat) {
    const nama = pembuat && pembuat.ada && pembuat.nama ? pembuat.nama : '....................';
    return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">
<div style="border:1px solid #E1E6EF;border-radius:8px;padding:8px 10px"><div style="font-size:7pt;font-weight:800;color:#8A94A6;text-transform:uppercase">Shift</div><div style="font-size:11pt;font-weight:800;color:#10243D;margin-top:2px">${esc(r.shift)}</div></div>
<div style="border:1px solid #E1E6EF;border-radius:8px;padding:8px 10px"><div style="font-size:7pt;font-weight:800;color:#8A94A6;text-transform:uppercase">Regu</div><div style="font-size:11pt;font-weight:800;color:#10243D;margin-top:2px">${esc(r.regu)}</div></div>
<div style="border:1px solid #E1E6EF;border-radius:8px;padding:8px 10px"><div style="font-size:7pt;font-weight:800;color:#8A94A6;text-transform:uppercase">Disusun oleh</div><div style="font-size:11pt;font-weight:800;color:#10243D;margin-top:2px">${esc(nama)}</div></div>
</div>`;
  }
  function catatanTable(items) {
    if (!items || !items.length) return '<div style="font-size:9pt;color:#8A94A6;font-style:italic">Tidak ada catatan kegiatan.</div>';
    const rows = items.map((it) => `<tr><td style="padding:5px 6px;border-bottom:1px solid #F1F4F8;font-weight:800;color:#10243D;vertical-align:top;width:16mm">${esc(it.jam)}</td><td style="padding:5px 6px;border-bottom:1px solid #F1F4F8">${esc(it.uraian)}</td></tr>`).join('');
    return `<table style="width:100%;border-collapse:collapse;font-size:8.5pt;margin-bottom:10px">${rows}</table>`;
  }
  function statusLampiran(adaFasilitas) {
    const p = (label, ok) => `<div style="flex:1;border-radius:8px;padding:9px 12px;background:${ok ? '#E4F3F4' : '#FBE9E7'};color:${ok ? '#0F5F65' : '#A82F24'}"><b>${label}</b><br><span style="font-size:8.5pt">${ok ? '&check; Terlampir pada halaman berikut' : '&#9888; Belum tersedia &mdash; laporan shift ini belum disimpan'}</span></div>`;
    return `<div style="font-size:11pt;font-weight:800;color:#10243D;margin:10px 0 6px">Status Lampiran Laporan Shift Ini</div>
<div style="display:flex;gap:8px;margin-bottom:6px">${p('Laporan Personel', true)}${p('Laporan Fasilitas', adaFasilitas)}</div>`;
    // Laporan Personel SELALU true di sini karena Log Book terkunci sampai Personel ada (lihat logbook.html).
  }

  // r: rekaman Log Book. pembuat: AVS.infoPembuatDariPersonel(r.tanggal, r.shift, r.regu).
  // personelRec: rekaman Laporan Personel yang cocok (selalu ada, krn terkunci).
  // fasilitasRec: rekaman Laporan Fasilitas yang cocok, ATAU null bila belum tersedia (opsi B).
  root.buildLogbookPdfHTML = function (r, pembuat, personelRec, fasilitasRec, tglCetak) {
    let html = `<div style="font-family:'Inter',Arial,sans-serif;padding:18px;font-size:9.5pt;color:#000">
${kop(tglCetak)}
${idBox(r, pembuat)}
<div style="font-size:11pt;font-weight:800;color:#10243D;margin:0 0 6px">Catatan Kegiatan</div>
${catatanTable(r.catatanKegiatan)}
<div style="font-size:11pt;font-weight:800;color:#10243D;margin:6px 0 6px">Catatan Serah Terima</div>
<div style="font-size:9.5pt;line-height:1.7;color:#3A3226;background:#FFFBF2;border:1px solid #F0D9A8;border-radius:8px;padding:10px 12px;margin-bottom:10px">${esc(r.catatanSerahTerima) || '<i style="color:#B0894A">(kosong)</i>'}</div>
${statusLampiran(!!fasilitasRec)}
<div style="font-size:7.5pt;color:#8A94A6;margin-top:10px;border-top:1px solid #E1E6EF;padding-top:6px">Sistem Pelaporan AVSEC Bandara Supadio &bull; Dicetak ${esc(tglCetak)}</div>
</div>`;

    if (personelRec && typeof window.buildPersonelPdfHTML === 'function') {
      const pembuatP = window.pembuatDariPosPenempatan(personelRec.posPenempatan);
      html += `<div style="page-break-before:always"></div>` + window.buildPersonelPdfHTML(personelRec, pembuatP, tglCetak);
    }
    if (fasilitasRec && typeof window.buildFasilitasPdfHTML === 'function') {
      html += `<div style="page-break-before:always"></div>` + window.buildFasilitasPdfHTML(fasilitasRec, pembuat, tglCetak);
    }
    return html;
  };
})(window);
