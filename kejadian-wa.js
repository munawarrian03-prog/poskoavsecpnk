/* =====================================================
   TEKS WHATSAPP LAPORAN KEJADIAN (laporan awal / lanjutan / akhir)
   Fungsi murni (tanpa tampilan) agar mudah diuji.
   ===================================================== */
(function (root) {
  'use strict';
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const STATUS = {
    awal: 'Laporan awal. Laporan lengkap (PDF) menyusul.',
    lanjutan: 'Laporan lanjutan. Laporan lengkap (PDF) menyusul.',
    akhir: 'Laporan akhir. PDF laporan lengkap tersedia.'
  };
  const satuBaris = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

  function hariTgl(ymd) {
    const m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return '-';
    const d = new Date(+m[1], +m[2] - 1, +m[3]); if (isNaN(d)) return '-';
    return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
  }
  function kronologisRapi(s) {   // paragraf dipertahankan, spasi berlebih dirapikan
    const t = String(s == null ? '' : s).replace(/\r/g, '').split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
    return t || '-';
  }
  function buildWAKejadian(r) {
    r = r || {};
    const pel = r.preparedBy || {}, nama = satuBaris(pel.nama), jab = satuBaris(pel.jabatan);
    const pelapor = nama ? nama + (jab ? ` (${jab})` : '') : '-';
    const tl = (r.tindakLanjut || []).filter((x) => x && (satuBaris(x.uraian) || satuBaris(x.jam)))
      .map((x) => `${satuBaris(x.jam) ? satuBaris(x.jam) + ' WIB' : '-'} - ${satuBaris(x.uraian) || '-'}`);
    const status = STATUS[r.waStatus] || STATUS.awal;
    return [
      '*LAPORAN KEJADIAN*',
      '*AVSEC BANDARA SUPADIO*',
      '',
      `Nomor : ${satuBaris(r.fileNumber) || '-'}`,
      `Hari/Tgl : ${hariTgl(r.tanggal)}`,
      `Pelapor : ${pelapor}`,
      '',
      '*INFORMASI KASUS*',
      satuBaris(r.caseInfo) || '-',
      '',
      '*KRONOLOGIS*',
      kronologisRapi(r.kronologis),
      '',
      '*TINDAK LANJUT*',
      tl.length ? tl.join('\n') : '-',
      '',
      '*STATUS*',
      status,
      '',
      'Dibuat oleh,',
      nama || '-',
      ...(jab ? [jab] : [])
    ].join('\n');
  }
  const API = { buildWAKejadian, hariTgl, STATUS };
  root.KejadianWA = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
