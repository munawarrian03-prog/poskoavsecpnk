/* =====================================================
   PENOMORAN LAPORAN KEJADIAN
   Format : OOSC/LK/<nomor urut>/<bulan romawi>/<tahun 2 angka>
   Contoh : OOSC/LK/1/IX/26
   Nomor urut mulai dari 1 lagi setiap bulan (mengikuti bulan tanggal laporan).
   Fungsi di sini murni (tanpa tampilan) agar mudah diuji.
   ===================================================== */
(function (root) {
  'use strict';
  const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const cfg = { prefix: 'OOSC/LK', pad: 0 };
  const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');

  function atur(o) { if (o) { if (o.prefix) cfg.prefix = String(o.prefix); if (o.pad != null) cfg.pad = Math.max(0, parseInt(o.pad, 10) || 0); } return Object.assign({}, cfg); }
  const kunciBulan = (y, m) => y + '-' + String(m + 1).padStart(2, '0');

  function format(urut, y, m) {
    const n = cfg.pad > 0 ? String(urut).padStart(cfg.pad, '0') : String(urut);
    return `${cfg.prefix}/${n}/${ROMAWI[m]}/${String(y).slice(-2)}`;
  }
  // "OOSC/LK/5/IX/26" → { urut: 5, m: 8, y: 2026 } ; format lain → null
  function parse(s) {
    const re = new RegExp('^' + escRe(cfg.prefix) + '/(\\d+)/(XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)/(\\d{2})$', 'i');
    const x = String(s == null ? '' : s).trim().match(re);
    if (!x) return null;
    return { urut: parseInt(x[1], 10), m: ROMAWI.indexOf(x[2].toUpperCase()), y: 2000 + parseInt(x[3], 10) };
  }
  // nomor terbesar yang sudah terpakai pada bulan itu: dari laporan tersimpan dan dari pencatat (counter)
  function urutTerakhir(records, counter, y, m) {
    let mx = (counter && counter[kunciBulan(y, m)]) || 0;
    (records || []).forEach((r) => { const p = parse(r && r.fileNumber); if (p && p.y === y && p.m === m && p.urut > mx) mx = p.urut; });
    return mx;
  }
  // nomor terbesar yang ada di laporan tersimpan saja (batas bawah saat urutan diatur manual)
  function urutTertinggiTersimpan(records, y, m) { return urutTerakhir(records, null, y, m); }
  function usul(records, counter, y, m) { const last = urutTerakhir(records, counter, y, m); return { urut: last + 1, nomor: format(last + 1, y, m) }; }
  // naikkan pencatat bila nomor ini lebih besar (tidak pernah menurunkan)
  function catat(counter, urut, y, m) { const c = Object.assign({}, counter || {}), k = kunciBulan(y, m); if ((c[k] || 0) < urut) c[k] = urut; return c; }

  const API = { ROMAWI, atur, format, parse, kunciBulan, urutTerakhir, urutTertinggiTersimpan, usul, catat, config: () => Object.assign({}, cfg) };
  root.KejadianNomor = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
