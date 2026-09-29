/* =====================================================
   PEMBUAT PDF: BERITA ACARA SERAH TERIMA (BAST)
   Menyusun definisi dokumen untuk pdfmake (teks asli, bukan gambar).
   Mandiri (tidak bergantung file lain) agar mudah diuji terpisah, sama
   seperti pola kejadian-pdf.js.
   ===================================================== */
(function (root) {
  'use strict';

  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const rapikan = (s) => String(s == null ? '' : s).replace(/\r/g, '').trim();

  function terbilang(n) {
    n = Math.floor(Math.abs(Number(n) || 0));
    const S = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
    if (n < 12) return S[n];
    if (n < 20) return terbilang(n - 10) + ' belas';
    if (n < 100) return terbilang(Math.floor(n / 10)) + ' puluh' + (n % 10 ? ' ' + terbilang(n % 10) : '');
    if (n < 200) return 'seratus' + (n % 100 ? ' ' + terbilang(n % 100) : '');
    if (n < 1000) return terbilang(Math.floor(n / 100)) + ' ratus' + (n % 100 ? ' ' + terbilang(n % 100) : '');
    if (n < 2000) return 'seribu' + (n % 1000 ? ' ' + terbilang(n % 1000) : '');
    if (n < 1000000) return terbilang(Math.floor(n / 1000)) + ' ribu' + (n % 1000 ? ' ' + terbilang(n % 1000) : '');
    return terbilang(Math.floor(n / 1000000)) + ' juta' + (n % 1000000 ? ' ' + terbilang(n % 1000000) : '');
  }
  function terbilangKapital(n) { return terbilang(n).replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1)); }
  function pecahTgl(ymd) { const m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null; }
  function formatWaktu(hhmm) { const m = String(hhmm || '').match(/^(\d{2}):(\d{2})$/); return m ? `${m[1]}.${m[2]} WIB` : '-'; }

  function kalimatPembuka(r) {
    const t = pecahTgl(r.tanggal);
    if (!t) return `Pada hari ini, ${rapikan(r.tanggal) || '-'}, pukul ${formatWaktu(r.waktu)}${r.tempat ? ', bertempat di ' + rapikan(r.tempat) : ''}, kami yang bertanda tangan di bawah ini:`;
    const d = new Date(t.y, t.m, t.d);
    const tglAngka = `${String(t.d).padStart(2, '0')}-${String(t.m + 1).padStart(2, '0')}-${t.y}`;
    return `Pada hari ini, ${HARI[d.getDay()]}, tanggal ${terbilangKapital(t.d)} bulan ${BULAN[t.m]} tahun ${terbilangKapital(t.y)} (${tglAngka}), pukul ${formatWaktu(r.waktu)}${r.tempat ? ', bertempat di ' + rapikan(r.tempat) : ''}, kami yang bertanda tangan di bawah ini:`;
  }

  function kolomKategori(kat, KATEGORI_BAST) {
    const K = KATEGORI_BAST || (typeof root.KATEGORI_BAST !== 'undefined' ? root.KATEGORI_BAST : {});
    return K[kat] || K.lainnya || { label: 'Lainnya', kalimat: 'barang/hal', kolom: [{ key: 'nama', label: 'Nama Item' }, { key: 'jumlah', label: 'Jumlah' }, { key: 'keterangan', label: 'Keterangan' }] };
  }

  function orangPara(label, o) {
    const nama = rapikan(o && o.nama), jab = rapikan(o && o.jabatan), nik = rapikan(o && o.nik);
    const detail = [jab, nik ? 'NIK: ' + nik : ''].filter(Boolean).join(' — ');
    return { text: [{ text: 'Nama: ', bold: true }, nama || '-', { text: '  —  Jabatan: ', bold: true }, jab || '-', nik ? { text: '  —  NIK: ' } : '', nik || '', `\nSelanjutnya disebut sebagai ${label}.`], margin: [0, 0, 0, 8] };
  }

  function buildBastDoc(r) {
    r = r || {};
    const kat = kolomKategori(r.kategori);
    const items = Array.isArray(r.items) ? r.items : [];
    const saksi = (Array.isArray(r.saksi) ? r.saksi : []).filter((s) => rapikan(s && s.nama));

    const judul = [
      { text: 'BERITA ACARA SERAH TERIMA', bold: true, alignment: 'center', fontSize: 13 },
      { text: kat.label.toUpperCase(), bold: true, alignment: 'center', fontSize: 10, color: '#157A82', margin: [0, 2, 0, 2] },
      { text: 'No: ' + (rapikan(r.nomorBast) || '-'), alignment: 'center', fontSize: 9.5, margin: [0, 0, 0, 12] }
    ];

    const pembuka = { text: kalimatPembuka(r), alignment: 'justify', margin: [0, 0, 0, 8] };
    const pihak = [orangPara('PIHAK PERTAMA', r.pihakSatu), orangPara('PIHAK KEDUA', r.pihakDua)];
    const pengantarItem = { text: `PIHAK PERTAMA telah menyerahkan kepada PIHAK KEDUA berupa ${kat.kalimat} sebagai berikut:`, alignment: 'justify', margin: [0, 0, 0, 6] };

    const lebarKolom = kat.kolom.map(() => '*');
    const tabelItem = {
      table: {
        widths: ['auto', ...lebarKolom],
        body: [
          [{ text: 'No', bold: true, alignment: 'center' }, ...kat.kolom.map((c) => ({ text: c.label, bold: true, alignment: 'center' }))],
          ...(items.length ? items.map((it, i) => [{ text: String(i + 1), alignment: 'center' }, ...kat.kolom.map((c) => ({ text: rapikan(it[c.key]) || '-' }))])
            : [[{ text: '-', alignment: 'center' }, ...kat.kolom.map(() => ({ text: '-' }))]])
        ]
      },
      layout: { hLineWidth: () => 0.7, vLineWidth: () => 0.7, hLineColor: () => '#000', vLineColor: () => '#000', paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 3, paddingBottom: () => 3 },
      margin: [0, 0, 0, 10]
    };

    const blokSaksi = saksi.length ? [
      { text: 'Disaksikan oleh:', margin: [0, 0, 0, 6] },
      {
        table: { widths: ['auto', '*', '*'], body: [[{ text: 'No', bold: true, alignment: 'center' }, { text: 'Nama', bold: true }, { text: 'Jabatan', bold: true }], ...saksi.map((s, i) => [{ text: String(i + 1), alignment: 'center' }, { text: rapikan(s.nama) || '-' }, { text: rapikan(s.jabatan) || '-' }])] },
        layout: { hLineWidth: () => 0.7, vLineWidth: () => 0.7, hLineColor: () => '#000', vLineColor: () => '#000', paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 3, paddingBottom: () => 3 },
        margin: [0, 0, 0, 10]
      }
    ] : [];

    const catatan = rapikan(r.catatan) ? [{ text: [{ text: 'Catatan: ', bold: true }, rapikan(r.catatan)], alignment: 'justify', margin: [0, 0, 0, 8] }] : [];
    const penutup = { text: 'Demikian Berita Acara ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.', alignment: 'justify', margin: [0, 4, 0, 0] };

    const kolomTtd = (o) => ({
      alignment: 'center',
      stack: [
        { text: ' ', margin: [0, 26, 0, 0] },
        { text: rapikan(o && o.nama) || '(....................)', bold: true, decoration: 'underline' },
        { text: rapikan(o && o.jabatan) || ' ' }
      ]
    });
    const ttd = {
      unbreakable: true, margin: [0, 22, 0, 0],
      table: { widths: ['*', '*'], body: [[{ text: 'PIHAK PERTAMA', alignment: 'center', bold: true }, { text: 'PIHAK KEDUA', alignment: 'center', bold: true }], [kolomTtd(r.pihakSatu), kolomTtd(r.pihakDua)]] },
      layout: 'noBorders'
    };

    return {
      info: { title: 'Berita Acara Serah Terima - ' + kat.label, subject: kat.label },
      pageSize: 'A4',
      pageMargins: [36, 34, 36, 40],
      defaultStyle: { font: 'Montserrat', fontSize: 10, lineHeight: 1.15 },
      footer: (cur, total) => ({ text: 'Halaman ' + cur + ' dari ' + total, alignment: 'right', fontSize: 8, color: '#666666', margin: [0, 14, 36, 0] }),
      content: [...judul, pembuka, ...pihak, pengantarItem, tabelItem, ...blokSaksi, ...catatan, penutup, ttd]
    };
  }

  root.buildBastDoc = buildBastDoc;
  if (typeof module !== 'undefined' && module.exports) module.exports = { buildBastDoc };
})(typeof window !== 'undefined' ? window : globalThis);
