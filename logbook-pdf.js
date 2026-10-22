/* =====================================================
   PEMBUAT PDF: LOG BOOK HARIAN (gabungan)
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
  // Skala tipografi dirapikan agar lebih bertingkat/formal (tiap tingkat punya ukuran
  // sendiri yang jelas bedanya): judul 14pt, label kapital 6.5pt+spasi huruf, nilai
  // 10pt tebal, judul seksi 9.5pt kapital+garis bawah tipis, isi 8.5-9pt, footer 6.5pt.
  function kop(tglCetak) {
    return `<div style="display:flex;align-items:center;gap:10px;border-bottom:1.5px solid #1D3A5C;padding-bottom:9px;margin-bottom:14px">
<img src="Logo/AVS-kop.png" style="height:32px">
<div><div style="font-size:14pt;font-weight:800;color:#10243D;letter-spacing:.1px">Log Book Harian</div><div style="font-size:7.5pt;color:#5C6675;font-weight:700;letter-spacing:.2px;margin-top:1px">AVSEC BANDARA SUPADIO</div></div>
<div style="flex:1"></div>
<div style="font-size:7pt;color:#5C6675;font-weight:700;letter-spacing:.2px;text-align:right">${esc(tglCetak)}</div>
</div>`;
  }
  function idBox(r, pembuat) {
    const nama = pembuat && pembuat.ada && pembuat.nama ? pembuat.nama : '....................';
    return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px">
<div style="border:1px solid #E1E6EF;border-radius:7px;padding:7px 10px"><div style="font-size:6.5pt;font-weight:800;color:#8A94A6;text-transform:uppercase;letter-spacing:.5px">Shift</div><div style="font-size:10pt;font-weight:800;color:#10243D;margin-top:3px">${esc(r.shift)}</div></div>
<div style="border:1px solid #E1E6EF;border-radius:7px;padding:7px 10px"><div style="font-size:6.5pt;font-weight:800;color:#8A94A6;text-transform:uppercase;letter-spacing:.5px">Regu</div><div style="font-size:10pt;font-weight:800;color:#10243D;margin-top:3px">${esc(r.regu)}</div></div>
<div style="border:1px solid #E1E6EF;border-radius:7px;padding:7px 10px"><div style="font-size:6.5pt;font-weight:800;color:#8A94A6;text-transform:uppercase;letter-spacing:.5px">Disusun oleh</div><div style="font-size:10pt;font-weight:800;color:#10243D;margin-top:3px">${esc(nama)}</div></div>
</div>`;
  }
  function seksiJudul(teks, margin) {
    return `<div style="font-size:9.5pt;font-weight:800;color:#10243D;text-transform:uppercase;letter-spacing:.4px;margin:${margin || '0 0 7px'};padding-bottom:4px;border-bottom:1px solid #E1E6EF">${esc(teks)}</div>`;
  }
  function kesiapanBox(k) {
    if (!k) k = {};
    const kosong = !(k.pemimpin || k.materi || k.waktuMulai || k.waktuSelesai);
    const isi = kosong ? '<div style="font-size:8.5pt;color:#8A94A6;font-style:italic">Belum diisi.</div>' : `
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px 10px;margin-bottom:8px">
<div><div style="font-size:6.5pt;font-weight:800;color:#8A94A6;text-transform:uppercase;letter-spacing:.5px">Kegiatan</div><div style="font-size:9pt;font-weight:700;color:#10243D;margin-top:2px">${esc(k.kegiatan) || '-'}</div></div>
<div><div style="font-size:6.5pt;font-weight:800;color:#8A94A6;text-transform:uppercase;letter-spacing:.5px">Lokasi</div><div style="font-size:9pt;font-weight:700;color:#10243D;margin-top:2px">${esc(k.lokasi) || '-'}</div></div>
<div><div style="font-size:6.5pt;font-weight:800;color:#8A94A6;text-transform:uppercase;letter-spacing:.5px">Pemimpin</div><div style="font-size:9pt;font-weight:700;color:#10243D;margin-top:2px">${esc(k.pemimpin) || '-'}</div></div>
</div>
<div style="display:grid;grid-template-columns:2fr 1fr;gap:8px 10px">
<div><div style="font-size:6.5pt;font-weight:800;color:#8A94A6;text-transform:uppercase;letter-spacing:.5px">Materi</div><div style="font-size:8.5pt;font-weight:500;color:#1A2233;margin-top:3px;line-height:1.5">${esc(k.materi) || '-'}</div></div>
<div><div style="font-size:6.5pt;font-weight:800;color:#8A94A6;text-transform:uppercase;letter-spacing:.5px">Waktu Pelaksanaan</div><div style="font-size:9pt;font-weight:700;color:#10243D;margin-top:2px">${k.lokasi === 'Whatsapp Grup' ? (esc(k.waktuMulai) || '--:--') : `${esc(k.waktuMulai) || '--:--'} &ndash; ${esc(k.waktuSelesai) || '--:--'}`}</div></div>
</div>`;
    return `${seksiJudul('Catatan Kesiapan Tugas')}<div style="border:1px solid #E1E6EF;border-radius:7px;padding:10px 12px;margin-bottom:14px;background:#FAFBFD">${isi}</div>`;
  }
  function catatanTable(items) {
    if (!items || !items.length) return '<div style="font-size:8.5pt;color:#8A94A6;font-style:italic">Tidak ada catatan kegiatan.</div>';
    const rows = items.map((it) => `<tr><td style="padding:6px 6px;border-bottom:1px solid #F1F4F8;font-weight:800;color:#10243D;vertical-align:top;width:16mm">${esc(it.jam)}</td><td style="padding:6px 6px;border-bottom:1px solid #F1F4F8">${esc(it.uraian)}</td></tr>`).join('');
    return `<table style="width:100%;border-collapse:collapse;font-size:8.5pt;margin-bottom:12px">${rows}</table>`;
  }
  function statusLampiran(adaFasilitas) {
    const p = (label, ok) => `<div style="flex:1;border-radius:7px;padding:9px 12px;background:${ok ? '#E4F3F4' : '#FBE9E7'};color:${ok ? '#0F5F65' : '#A82F24'}"><b style="font-size:8.5pt">${label}</b><br><span style="font-size:8pt">${ok ? '&check; Terlampir pada halaman berikut' : '&#9888; Belum tersedia &mdash; laporan shift ini belum disimpan'}</span></div>`;
    return `${seksiJudul('Status Lampiran Laporan Shift Ini', '10px 0 7px')}
<div style="display:flex;gap:8px;margin-bottom:6px">${p('Laporan Personel', true)}${p('Laporan Fasilitas', adaFasilitas)}</div>`;
    // Laporan Personel SELALU true di sini karena Log Book terkunci sampai Personel ada (lihat logbook.html).
  }

  // r: rekaman Log Book (termasuk r.kesiapanTugas, lihat logbook.html). pembuat:
  // AVS.infoPembuatDariPersonel(r.tanggal, r.shift, r.regu). personelRec: rekaman Laporan
  // Personel yang cocok (selalu ada, krn terkunci). fasilitasRec: rekaman Laporan
  // Fasilitas yang cocok, ATAU null bila belum tersedia (opsi B).
  root.buildLogbookPdfHTML = function (r, pembuat, personelRec, fasilitasRec, tglCetak) {
    let html = `<div style="font-family:'Montserrat', 'Inter',Arial,sans-serif;padding:20px 22px;font-size:9pt;color:#1A2233">
${kop(tglCetak)}
${idBox(r, pembuat)}
${kesiapanBox(r.kesiapanTugas)}
${seksiJudul('Catatan Kegiatan')}
${catatanTable(r.catatanKegiatan)}
${seksiJudul('Catatan Serah Terima', '8px 0 7px')}
<div style="font-size:8.5pt;font-weight:500;line-height:1.6;color:#3A3226;background:#FFFBF2;border:1px solid #F0D9A8;border-radius:7px;padding:10px 12px;margin-bottom:12px">${esc(r.catatanSerahTerima) || '<i style="color:#B0894A">(kosong)</i>'}</div>
${statusLampiran(!!fasilitasRec)}
<div style="font-size:6.5pt;font-weight:600;letter-spacing:.2px;color:#8A94A6;margin-top:12px;border-top:1px solid #E1E6EF;padding-top:7px">SISTEM PELAPORAN AVSEC BANDARA SUPADIO &bull; Dicetak ${esc(tglCetak)}</div>
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
