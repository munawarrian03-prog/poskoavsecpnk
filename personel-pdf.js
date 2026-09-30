/* =====================================================
   PEMBUAT PDF: LAPORAN PERSONEL (satu shift)
   Sama seperti fasilitas-pdf.js: html2pdf, kop kompak (BUKAN kop besar-
   terpusat versi lama). Dipakai oleh:
   - laporan-personel.html sendiri (tombol "Unduh PDF")
   - logbook.html (lampiran PDF gabungan Log Book, butir 2.5)
   Perhitungan (jumlah/hadir/kurang, daftar penempatan) DIHITUNG ULANG
   di sini dari data mentah (kategoriKekuatan/posPenempatan) — bukan
   memanggil fungsi internal laporan-personel.html — supaya berkas ini
   bisa dipakai berdiri sendiri dari halaman mana pun.
   ===================================================== */
(function (root) {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rapikan = (s) => String(s == null ? '' : s).trim().replace(/\s+/g, ' ');
  const adaNama = (p) => rapikan(p && p.nama) !== '';

  function tglIndo(ymd) {
    if (!ymd) return '-';
    const m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(ymd);
    if (isNaN(d)) return '-';
    return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  function labelKategori(k) {
    const nama = rapikan(k.nama);
    return (k.mulai && k.selesai) ? `${nama} (${k.mulai} - ${k.selesai}) WIB` : nama;
  }
  const OPSI_ALASAN = ['Cuti Tahunan', 'Cuti Alasan Penting', 'Cuti Melahirkan', 'Sakit', 'Dinas Luar', 'Izin', 'Tanpa Keterangan', 'Lainnya'];
  function alasanText(p) {
    const alasan = OPSI_ALASAN.includes(p.alasan) ? p.alasan : (p.alasan || 'Lainnya');
    return alasan === 'Lainnya' ? (rapikan(p.ket) || 'Lainnya') : alasan;
  }

  function kop(judul, tglCetak) {
    return `<div style="display:flex;align-items:center;gap:10px;border-bottom:2.5px solid #157A82;padding-bottom:8px;margin-bottom:12px">
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
  const TH = 'text-align:left;font-size:7pt;font-weight:800;color:#8A94A6;text-transform:uppercase;padding:5px 6px;border-bottom:1px solid #E1E6EF;background:#F6F8FB';
  const TD = 'padding:5px 6px;border-bottom:1px solid #F1F4F8';

  function tabelKekuatan(kat) {
    let totalHadir = 0;
    const rows = (kat || []).map((k) => {
      const valid = (k.absen || []).filter(adaNama);
      const jml = Math.max(0, parseInt(k.jml, 10) || 0);
      const krg = valid.length, hdr = Math.max(0, jml - krg);
      totalHadir += hdr;
      let ket = jml === 0 ? '-' : (krg > 0 ? valid.map((p) => `${esc(rapikan(p.nama))} (${esc(alasanText(p))})`).join('<br>') : 'Lengkap');
      return `<tr><td style="${TD}">${esc(labelKategori(k))}</td><td style="${TD};text-align:center">${jml}</td><td style="${TD};text-align:center">${hdr}</td><td style="${TD};text-align:center">${krg || '-'}</td><td style="${TD}">${ket}</td></tr>`;
    }).join('');
    return { html: `<table style="width:100%;border-collapse:collapse;font-size:8pt;margin-bottom:6px"><tr><th style="${TH}">Kategori</th><th style="${TH};text-align:center">Jumlah</th><th style="${TH};text-align:center">Hadir</th><th style="${TH};text-align:center">Kurang</th><th style="${TH}">Keterangan</th></tr>${rows}<tr style="font-weight:800;background:#F6F8FB"><td colspan="2" style="${TD};text-align:right">Total Hadir</td><td style="${TD};text-align:center">${totalHadir}</td><td colspan="2" style="${TD}">Personel</td></tr></table>`, totalHadir };
  }
  function tabelPenempatan(pos) {
    let total = 0;
    const rows = (pos || []).map((p) => {
      const valid = (p.personel || []).filter(adaNama);
      total += valid.length;
      const list = valid.length ? valid.map((x, i) => `${i + 1}. ${esc(rapikan(x.nama))}${x.peran ? ' ' + esc(x.peran) : ''}`).join('<br>') : '- Nihil';
      return `<tr><td style="${TD};font-weight:800;color:#10243D;width:32%;vertical-align:top">${esc(p.name)}</td><td style="${TD};vertical-align:top">${list}</td></tr>`;
    }).join('');
    return { html: `<table style="width:100%;border-collapse:collapse;font-size:8pt;margin-bottom:6px"><tr><th style="${TH}">Pos Penempatan</th><th style="${TH}">Personel</th></tr>${rows}<tr style="font-weight:800;background:#F6F8FB"><td style="${TD};text-align:right">Total Penempatan</td><td style="${TD}">${total} Personel</td></tr></table>`, total };
  }
  function ttdBlok(pembuat) {
    const nama = pembuat && pembuat.ada && pembuat.nama ? pembuat.nama.toUpperCase() : '....................';
    const jab = pembuat && pembuat.ada && pembuat.nama ? pembuat.jabatanLabel : 'CHIEF';
    const jabHtml = jab.split(', ').map(esc).join(',<br>');
    return `<div class="ttd-block" style="page-break-inside:avoid;break-inside:avoid;width:100%;margin-top:18mm;text-align:center">
<div style="font-size:9pt;color:#000">Dibuat oleh,</div>
<div style="font-size:9pt;font-weight:800;color:#000;margin-top:2px">${jabHtml},</div>
<div style="height:16mm">&nbsp;</div>
<div style="font-size:9pt;font-weight:800;color:#000">( ${esc(nama)} )</div>
</div>`;
  }

  // r: rekaman Laporan Personel tersimpan. pembuat: hasil AVS.infoPembuatDariPersonel
  // (bisa juga dihitung dari r.posPenempatan langsung — lihat opsi kedua di bawah).
  // sertakanKop/sertakanTtd: false saat dipakai sebagai LAMPIRAN dalam PDF gabungan
  // Log Book, supaya tidak dobel kop/tanda tangan dengan halaman lain.
  root.buildPersonelPdfHTML = function (r, pembuat, tglCetak, opts) {
    opts = opts || {};
    const kk = tabelKekuatan(r.kategoriKekuatan);
    const pp = tabelPenempatan(r.posPenempatan);
    return `<div style="font-family:'Montserrat', 'Inter',Arial,sans-serif;padding:${opts.noPad ? '0' : '18px'};font-size:9.5pt;color:#000">
${opts.noKop ? '' : kop('Laporan Personel', tglCetak)}
${idList(r)}
<div style="font-size:10pt;font-weight:800;color:#10243D;margin:0 0 6px">I. Kekuatan Personel</div>
${kk.html}
<div style="font-size:10pt;font-weight:800;color:#10243D;margin:10px 0 6px">II. Penempatan Personel</div>
${pp.html}
${opts.noTtd ? '' : ttdBlok(pembuat)}
</div>`;
  };
  // Turunkan info pembuat langsung dari posPenempatan sebuah rekaman Personel
  // (dipakai saat mengunduh PDF Personel dari halamannya sendiri, di mana
  // datanya sudah di tangan — tidak perlu AVS.cariLaporanPersonel).
  root.pembuatDariPosPenempatan = function (posPenempatan) {
    const posko = (posPenempatan || []).find((p) => p.id === 'posko') || (posPenempatan || [])[0];
    const pertama = posko && (posko.personel || []).find((p) => p && rapikan(p.nama));
    if (!pertama) return { ada: true, nama: '', jabatanLabel: '' };
    const peran = pertama.peran;
    const jabatanLabel = (!peran || peran === '(Chief)') ? 'CHIEF' : `a.n. CHIEF, ${peran.replace(/^\(|\)$/g, '').toUpperCase()}`;
    return { ada: true, nama: rapikan(pertama.nama), jabatanLabel };
  };
})(window);
