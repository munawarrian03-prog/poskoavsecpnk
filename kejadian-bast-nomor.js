/* =====================================================
   PENOMORAN BERITA ACARA SERAH TERIMA (BAST)
   Format : BA/OOSC/<nomor urut>/<bulan romawi>/<tahun 2 angka>
   Contoh : BA/OOSC/1/IX/26
   Nomor urut mulai dari 1 lagi setiap bulan (mengikuti bulan tanggal BAST).
   State counter TERPISAH dari nomor Laporan Kejadian (KejadianNomor) -
   supaya urutan BAST tidak tercampur dengan urutan LK.
   ===================================================== */
(function (root) {
  'use strict';
  const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const cfg = { prefix: 'BA/OOSC', pad: 0 };
  const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');

  function atur(o) { if (o) { if (o.prefix) cfg.prefix = String(o.prefix); if (o.pad != null) cfg.pad = Math.max(0, parseInt(o.pad, 10) || 0); } return Object.assign({}, cfg); }
  const kunciBulan = (y, m) => y + '-' + String(m + 1).padStart(2, '0');

  function format(urut, y, m) {
    const n = cfg.pad > 0 ? String(urut).padStart(cfg.pad, '0') : String(urut);
    return `${cfg.prefix}/${n}/${ROMAWI[m]}/${String(y).slice(-2)}`;
  }
  function parse(s) {
    const re = new RegExp('^' + escRe(cfg.prefix) + '/(\\d+)/(XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)/(\\d{2})$', 'i');
    const x = String(s == null ? '' : s).trim().match(re);
    if (!x) return null;
    return { urut: parseInt(x[1], 10), m: ROMAWI.indexOf(x[2].toUpperCase()), y: 2000 + parseInt(x[3], 10) };
  }
  function urutTerakhir(records, counter, y, m) {
    let mx = (counter && counter[kunciBulan(y, m)]) || 0;
    (records || []).forEach((r) => { const p = parse(r && r.nomorBast); if (p && p.y === y && p.m === m && p.urut > mx) mx = p.urut; });
    return mx;
  }
  function urutTertinggiTersimpan(records, y, m) { return urutTerakhir(records, null, y, m); }
  function usul(records, counter, y, m) { const last = urutTerakhir(records, counter, y, m); return { urut: last + 1, nomor: format(last + 1, y, m) }; }
  function catat(counter, urut, y, m) { const c = Object.assign({}, counter || {}), k = kunciBulan(y, m); if ((c[k] || 0) < urut) c[k] = urut; return c; }

  const API = { ROMAWI, atur, format, parse, kunciBulan, urutTerakhir, urutTertinggiTersimpan, usul, catat, config: () => Object.assign({}, cfg) };
  root.BastNomor = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
