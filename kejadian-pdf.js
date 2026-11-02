/* =====================================================
   PEMBUAT PDF: SECURITY INCIDENT/ACCIDENT REPORT
   Menyusun definisi dokumen untuk pdfmake (teks asli, bukan gambar).
   Ukuran halaman & lebar kolom mengikuti format Word asli.
   ===================================================== */
(function (root) {
  'use strict';

  const LEBAR_HALAMAN = 595.28, MARGIN_KIRI_KANAN = 36;
  const BULAN_LEBAR = 523;          // lebar area foto (pt)
  const AREA = LEBAR_HALAMAN - 2 * MARGIN_KIRI_KANAN;   // lebar area cetak = 523,28 pt
  const PAD = 4, GARIS = 0.7;
  // pdfmake menambahkan padding kiri/kanan sel dan tebal garis di luar 'widths',
  // jadi lebar isi dihitung: AREA - (padding semua kolom) - (garis vertikal)
  const isiLebar = (jumlahKolom, jumlahGaris) => AREA - jumlahKolom * 2 * PAD - jumlahGaris * GARIS;
  const HITAM = '#000000';

  const rapikan = (s) => String(s == null ? '' : s).replace(/\r/g, '').trim();
  const barisRapi = (s) => rapikan(s).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');

  function tglIndo(ymd) {
    if (!ymd) return '';
    const m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(ymd);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // "nama (jabatan)" dalam dua baris, didahului titik dua seperti format asli
  function selOrang(o) {
    const nama = rapikan(o && o.nama), jab = rapikan(o && o.jabatan);
    const isi = [];
    if (nama) isi.push({ text: nama });
    if (jab) isi.push({ text: '(' + jab + ')' });
    return { columns: [{ width: 7, text: ':' }, { width: '*', stack: isi.length ? isi : [{ text: ' ' }] }] };
  }
  function selNilai(teks) {
    return { columns: [{ width: 7, text: ':' }, { width: '*', text: rapikan(teks) || ' ' }] };
  }
  const labelHdr = (t) => ({ text: t });

  function labelSeksi(en, id) {
    return { stack: [{ text: en, bold: true }, { text: '(' + id + ')' }] };
  }

  function buildKejadianDoc(r) {
    r = r || {};
    const tanggal = tglIndo(r.tanggal);

    /* ---------- Judul ---------- */
    const judul = [
      { text: 'SECURITY INCIDENT/ACCIDENT REPORT', bold: true, alignment: 'center', fontSize: 13 },
      { text: 'SUPADIO INTERNATIONAL AIRPORT', bold: true, alignment: 'center', fontSize: 10.5, margin: [0, 2, 0, 12] }
    ];

    /* ---------- Tabel kepala ---------- */
    const kepala = {
      table: {
        widths: (() => { const t = isiLebar(4, 2), a = [100, 161, 72]; return [...a, t - a.reduce((x, y) => x + y, 0)]; })(),
        body: [
          [labelHdr('FILE NUMBER'), selNilai(r.fileNumber), labelHdr('PREPARED BY'), selOrang(r.preparedBy)],
          [labelHdr('DATE'), selNilai(tanggal), labelHdr('SIGNED BY'), selOrang(r.signedBy)],
          [labelHdr('DISTRIBUTION TO & SERVICE'), selOrang(r.distribution), labelHdr('APPROVED BY'), selOrang(r.approvedBy)]
        ]
      },
      layout: {
        hLineWidth: () => 0.7, hLineColor: () => HITAM,
        vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length) ? 0.7 : 0, vLineColor: () => HITAM,
        paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 3, paddingBottom: () => 3
      },
      margin: [0, 0, 0, 12]
    };

    /* ---------- Tabel utama (4 kolom: label | jam/label | ":" | isi) ---------- */
    const rows = [];
    const awalSeksi = new Set();
    const kosong = () => ({ text: '' });
    const span3 = (isi) => [Object.assign({}, isi, { colSpan: 3 }), {}, {}];
    const baris = (label, isi, mulaiSeksi) => {
      if (mulaiSeksi) awalSeksi.add(rows.length);
      rows.push([label || kosong(), ...span3(isi)]);
    };
    const barisKolom = (a, b, c) => rows.push([kosong(), a, b, c]);
    const ul = (arr) => arr.length ? { ul: arr.map((t) => ({ text: t })), margin: [0, 0, 0, 0] } : { text: '-' };
    const isiTeks = (t) => ({ text: barisRapi(t) || '-', alignment: 'left' });

    // 1. Informasi kasus
    baris(labelSeksi('CASES INFORMATION', 'Informasi kasus'), isiTeks(r.caseInfo), true);

    // 2. Dasar hukum
    const dasar = (r.dasarHukum || []).map(rapikan).filter(Boolean);
    baris(labelSeksi('ACTION REFERENCES', 'Dasar Hukum'), ul(dasar), true);

    // 3. Kronologis & tindak lanjut
    const kron = barisRapi(r.kronologis);
    const tl = (r.tindakLanjut || []).filter((x) => rapikan(x.uraian) || rapikan(x.jam));
    baris(labelSeksi('CRONOLOGY AND FOLLOW UP', 'Kronologis dan tindak lanjut'),
      { stack: [{ text: 'Kronologis', bold: true }, { text: kron || '-', alignment: 'justify' }] }, true);
    if (tl.length) {
      baris(null, { text: 'Tindak Lanjut', bold: true, margin: [0, 6, 0, 0] }, false);
      tl.forEach((x) => {
        const jam = rapikan(x.jam);
        barisKolom({ text: jam ? jam + ' WIB' : '-' }, { text: ':', alignment: 'center' }, { text: barisRapi(x.uraian) || '-', alignment: 'justify', margin: [0, 0, 0, 2] });
      });
    }

    // 4. Informasi lainnya
    awalSeksi.add(rows.length);
    const dataRows = (r.dataRows || []).filter((d) => rapikan(d.label) || rapikan(d.nilai));
    const terlampir = (r.terlampir || []).map(rapikan).filter(Boolean);
    const judulData = rapikan(r.dataJudul);
    const labelLain = labelSeksi('OTHER INFORMATION', 'Informasi lainnya');
    let sudahLabel = false;
    const kepalaLain = (isi) => { rows.push([sudahLabel ? kosong() : labelLain, ...span3(isi)]); sudahLabel = true; };
    if (judulData || dataRows.length) {
      if (judulData) kepalaLain({ text: judulData.replace(/:?\s*$/, '') + ':', bold: true });
      dataRows.forEach((d) => {
        rows.push([sudahLabel ? kosong() : labelLain, { text: rapikan(d.label) }, { text: ':', alignment: 'center' }, { text: rapikan(d.nilai) || '-' }]);
        sudahLabel = true;
      });
    }
    if (terlampir.length) {
      kepalaLain({ text: 'Terlampir:', bold: true, margin: [0, (judulData || dataRows.length) ? 6 : 0, 0, 0] });
      rows.push([kosong(), ...span3(ul(terlampir))]);
    }
    if (!sudahLabel) kepalaLain({ text: '-' });

    // 5. Penutup
    baris(labelSeksi('CLOSING', 'Penutup'), { text: barisRapi(r.penutup) || '-', alignment: 'left' }, true);

    const utama = {
      table: { widths: (() => { const t = isiLebar(4, 3), a = [138, 63, 6]; return [...a, t - a.reduce((x, y) => x + y, 0)]; })(), body: rows },
      layout: {
        hLineWidth: (i, node) => (i === 0 || i === node.table.body.length || awalSeksi.has(i)) ? 0.7 : 0,
        hLineColor: () => HITAM,
        vLineWidth: (i) => (i === 0 || i === 1 || i === 4) ? 0.7 : 0,
        vLineColor: () => HITAM,
        paddingLeft: () => 4, paddingRight: () => 4,
        paddingTop: (i) => awalSeksi.has(i) ? 4 : 1,
        paddingBottom: (i, node) => (i === node.table.body.length - 1 || awalSeksi.has(i + 1)) ? 4 : 1
      }
    };

    /* ---------- Tanda tangan: 3 kolom, gambar tanda tangan opsional ---------- */
    const gbr = r.pakaiTTD === false ? {} : (r.ttdGambar || {});   // { approvedBy, signedBy, preparedBy } berisi dataURL
    const tempatTgl = [rapikan(r.tempat), tanggal].filter(Boolean).join(', ');
    // ukuran PNG dibaca dari header agar tinggi ruang tanda tangan seragam (nama di bawahnya selalu sejajar)
    const dimPng = (u) => {
      try {
        const b64 = String(u).split(',')[1].slice(0, 40);
        const bin = typeof atob !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
        if (bin.charCodeAt(1) !== 0x50) return null;
        const n = (i) => ((bin.charCodeAt(i) << 24) | (bin.charCodeAt(i + 1) << 16) | (bin.charCodeAt(i + 2) << 8) | bin.charCodeAt(i + 3)) >>> 0;
        return { w: n(16), h: n(20) };
      } catch (e) { return null; }
    };
    const TTD_W = 125, TTD_H = 62;
    // dua baris judul (baris1 = tempat/tanggal, baris2 = "Mengetahui,") lalu jabatan: jabatan ketiga kolom selalu sejajar
    const kolomTtd = (baris1, baris2, o, gambar) => {
      let isiGambar;
      if (gambar) {
        const d = dimPng(gambar), tampil = d ? d.h * Math.min(TTD_W / d.w, TTD_H / d.h) : TTD_H * 0.6;
        isiGambar = { image: gambar, fit: [TTD_W, TTD_H], alignment: 'center', margin: [0, 6 + Math.max(0, TTD_H - tampil), 0, -6] };
      } else isiGambar = { text: ' ', margin: [0, 26, 0, 26] };
      return {
        alignment: 'center',
        stack: [
          { text: baris1 || ' ' },
          { text: baris2 || ' ' },
          { text: rapikan(o && o.jabatan) || ' ' },
          isiGambar,
          { text: rapikan(o && o.nama) || '(....................)', bold: true, decoration: 'underline' }
        ]
      };
    };
    const ttd = {
      unbreakable: true, margin: [0, 22, 0, 0],
      table: { widths: ['*', '*', '*'], body: [[
        kolomTtd('', '', r.approvedBy, gbr.approvedBy),
        kolomTtd('', 'Mengetahui,', r.signedBy, gbr.signedBy),
        kolomTtd(tempatTgl, '', r.preparedBy, gbr.preparedBy)
      ]] },
      layout: 'noBorders'
    };

    const isi = [...judul, kepala, utama, ttd];

    /* ---------- Lampiran foto ---------- */
    const fotos = (r.fotos || []).filter((f) => f && f.dataUrl);
    const per = [1, 2, 4].includes(+r.fotoPerHal) ? +r.fotoPerHal : 2;
    if (fotos.length) {
      const kotak = (f, w, h) => ({
        stack: [
          { image: f.dataUrl, fit: [w, h], alignment: 'center' },
          ...(rapikan(f.caption) ? [{ text: rapikan(f.caption), italics: true, alignment: 'center', fontSize: 9, margin: [0, 3, 0, 0] }] : [])
        ],
        margin: [0, 0, 0, 10]
      });
      for (let i = 0; i < fotos.length; i += per) {
        const grup = fotos.slice(i, i + per);
        const konten = [];
        if (i === 0) konten.push({ text: 'LAMPIRAN DOKUMENTASI', bold: true, alignment: 'center', fontSize: 11, margin: [0, 0, 0, 10] });
        if (per === 1) konten.push(kotak(grup[0], BULAN_LEBAR, 650));
        else if (per === 2) grup.forEach((f) => konten.push(kotak(f, BULAN_LEBAR, 315)));
        else {
          for (let j = 0; j < grup.length; j += 2) {
            const pasang = grup.slice(j, j + 2);
            konten.push({ columns: pasang.map((f) => kotak(f, 252, 315)), columnGap: 12, margin: [0, 0, 0, 0] });
          }
        }
        isi.push({ stack: konten, pageBreak: 'before' });
      }
    }

    return {
      info: { title: 'Security Incident/Accident Report - Supadio International Airport', subject: rapikan(r.caseInfo).slice(0, 120) },
      pageSize: 'A4',
      pageMargins: [36, 34, 36, 40],
      defaultStyle: { font: 'Montserrat', fontSize: 10, lineHeight: 1.15 },
      footer: (cur, total) => ({ text: 'Halaman ' + cur + ' dari ' + total, alignment: 'right', fontSize: 8, color: '#666666', margin: [0, 14, 36, 0] }),
      content: isi
    };
  }

  root.buildKejadianDoc = buildKejadianDoc;
  root.tglIndoKejadian = tglIndo;
  if (typeof module !== 'undefined' && module.exports) module.exports = { buildKejadianDoc, tglIndo };
})(typeof window !== 'undefined' ? window : globalThis);
