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
  // Lebar kolom tabel Kekuatan (Kategori, Jumlah, Hadir, Kurang, Keterangan, dalam %).
  const W1 = 28, W2 = 10, W3 = 10, W4 = 10, W5 = 42;

  /* ---------- Rincian "Total per rentang waktu" (Kekuatan & Penempatan) ----------
     Dipakai jg oleh laporan-personel.html (WA/drawer Lihat) lewat root.AVS_rincianWaktu,
     supaya PDF/WA/Lihat selalu menampilkan angka yang SAMA PERSIS (satu sumber logika).
     "Waktu" yang dipakai utk menghitung SELALU dari jam KATEGORI (mulai/selesai di
     kategoriKekuatan), BUKAN dari teks bebas `jam` per orang (yg bisa sudah diedit manual)
     -- supaya rentang yg dihitung konsisten & bisa diandalkan (teks bebas tdk selalu bisa
     diparse). Entri tanpa kategori (atau kategori tanpa jam tetap) dianggap sepanjang
     shift penuh -- tdk ada info lebih spesifik yg bisa dipakai. */
  function waktuKeMenit(hhmm) { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + m; }
  function parseJamShift(shiftLabel) {
    const m = String(shiftLabel || '').match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
    return m ? { mulai: m[1], selesai: m[2] } : null;
  }
  // Cari overlap kategori thd jendela shift, coba offset -1 hari / hari sama / +1 hari
  // (krn kategori bisa mulai sblm jam shift dimulai, mis. kategori 05:00 utk shift Pagi
  // 08:00, atau kategori sendiri lewat tengah malam) -- ambil overlap TERBESAR yg >0.
  function overlapDenganShift(mulai, selesai, shiftA, shiftB) {
    let terbaik = null;
    [0, -1440, 1440].forEach((off) => {
      let a = waktuKeMenit(mulai) + off, b = waktuKeMenit(selesai) + off;
      if (b <= a) b += 1440;
      const os = Math.max(a, shiftA), oe = Math.min(b, shiftB);
      if (oe > os && (!terbaik || (oe - os) > (terbaik.oe - terbaik.os))) terbaik = { os, oe };
    });
    return terbaik;
  }
  function keJamWallclock(relMin, shiftMulaiMin) {
    const total = (shiftMulaiMin + relMin) % 1440, h = Math.floor(total / 60), m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  // items: [{ mulai, selesai, bobot }] -- mulai/selesai "HH:MM" (kosong/null = dianggap
  // sepanjang shift penuh), bobot = berapa orang direpresentasikan entri ini (1 per orang
  // utk Penempatan, = jumlah Hadir per kategori utk Kekuatan krn tdk ada nama individu).
  function segmentasiWaktu(items, shiftLabel) {
    const sh = parseJamShift(shiftLabel); if (!sh) return [];
    const shiftMulaiMin = waktuKeMenit(sh.mulai);
    let totalMenit = waktuKeMenit(sh.selesai) - shiftMulaiMin; if (totalMenit <= 0) totalMenit += 1440;
    const olah = items.map((it) => {
      if (it.mulai && it.selesai) {
        const ov = overlapDenganShift(it.mulai, it.selesai, shiftMulaiMin, shiftMulaiMin + totalMenit);
        return ov ? { s: ov.os - shiftMulaiMin, e: ov.oe - shiftMulaiMin, bobot: it.bobot } : null;
      }
      return { s: 0, e: totalMenit, bobot: it.bobot };
    }).filter((x) => x && x.bobot > 0);
    if (!olah.length) return [];
    const titik = new Set([0, totalMenit]);
    olah.forEach((it) => { titik.add(it.s); titik.add(it.e); });
    const urut = Array.from(titik).sort((a, b) => a - b);
    const segmen = [];
    for (let i = 0; i < urut.length - 1; i++) {
      const t1 = urut[i], t2 = urut[i + 1]; if (t2 <= t1) continue;
      const jumlah = olah.filter((it) => it.s <= t1 && it.e >= t2).reduce((a, it) => a + it.bobot, 0);
      segmen.push({ t1, t2, jumlah });
    }
    const gabung = [];
    segmen.forEach((s) => {
      const last = gabung[gabung.length - 1];
      if (last && last.jumlah === s.jumlah) last.t2 = s.t2; else gabung.push(Object.assign({}, s));
    });
    return gabung.filter((g) => g.jumlah > 0).map((g) => ({ jumlah: g.jumlah, mulai: keJamWallclock(g.t1, shiftMulaiMin), selesai: keJamWallclock(g.t2, shiftMulaiMin) }));
  }
  root.AVS_rincianWaktu = segmentasiWaktu;

  const MUT = '#8A94A6', KRG = '#C0392B';
  const nomEsc = (n) => (n > 0 ? String(n) : '–');
  const labelRentang = (r) => (r.mulai ? `${r.mulai} – ${r.selesai}` : 'Seluruh shift');
  // Tabel kecil "Total ... per rentang" (Kekuatan & Penempatan): judul kolom + rentang di kiri,
  // angka rata kanan. Tidak lagi baris melayang di bawah kolom tabel lain.
  function tabelRentang(judul, rincian, fallbackJumlah) {
    const list = rincian.length ? rincian : [{ jumlah: fallbackJumlah, mulai: null, selesai: null }];
    const rows = list.map((r) => `<tr style="page-break-inside:avoid;break-inside:avoid"><td style="${TD}">${esc(labelRentang(r))}</td><td style="${TD};text-align:center;font-weight:800">${r.jumlah}</td></tr>`).join('');
    return `<table style="width:100%;border-collapse:collapse;font-size:8pt;margin-bottom:6px;table-layout:fixed"><tr><th style="${TH}">${esc(judul)}</th><th style="${TH};text-align:center;width:${W4 + W2}%">Personel</th></tr>${rows}</table>`;
  }

  function tabelKekuatan(kat, shiftLabel) {
    let totalHadir = 0, totalJml = 0, totalKrg = 0;
    const rows = (kat || []).map((k) => {
      const valid = (k.absen || []).filter(adaNama);
      const jml = Math.max(0, parseInt(k.jml, 10) || 0);
      const krg = valid.length, hdr = Math.max(0, jml - krg);
      totalHadir += hdr; totalJml += jml; totalKrg += krg;
      // Keterangan: satu personel per blok, alasan di baris kecil di bawah nama
      // (gaya sama dgn rentang jam di bawah nama kategori).
      const ket = jml === 0 ? '-' : (krg > 0
        ? valid.map((p) => `<div style="padding-bottom:3px">${esc(rapikan(p.nama))}<div style="font-size:7pt;color:${MUT};font-weight:500">${esc(alasanText(p))}</div></div>`).join('')
        : 'Lengkap');
      const jam = (k.mulai && k.selesai) ? `<div style="font-size:7pt;color:${MUT};font-weight:500">${esc(k.mulai)}–${esc(k.selesai)}</div>` : '';
      return `<tr style="page-break-inside:avoid;break-inside:avoid"><td style="${TD};width:${W1}%;vertical-align:top;font-weight:700">${esc(rapikan(k.nama))}${jam}</td><td style="${TD};text-align:center;width:${W2}%;vertical-align:top">${jml}</td><td style="${TD};text-align:center;width:${W3}%;vertical-align:top">${hdr}</td><td style="${TD};text-align:center;width:${W4}%;vertical-align:top;${krg ? `color:${KRG};font-weight:800` : `color:${MUT}`}">${nomEsc(krg)}</td><td style="${TD};width:${W5}%;vertical-align:top">${ket}</td></tr>`;
    }).join('');
    const sumRow = `<tr style="font-weight:800;background:#F6F8FB;page-break-inside:avoid;break-inside:avoid"><td style="${TD};border-top:1.5px solid #10243D">Jumlah</td><td style="${TD};border-top:1.5px solid #10243D;text-align:center">${totalJml}</td><td style="${TD};border-top:1.5px solid #10243D;text-align:center">${totalHadir}</td><td style="${TD};border-top:1.5px solid #10243D;text-align:center">${nomEsc(totalKrg)}</td><td style="${TD};border-top:1.5px solid #10243D"></td></tr>`;
    const rincian = segmentasiWaktu((kat || []).map((k) => { const v = (k.absen || []).filter(adaNama); return { mulai: k.mulai, selesai: k.selesai, bobot: Math.max(0, (Math.max(0, parseInt(k.jml, 10) || 0)) - v.length) }; }), shiftLabel);
    return { html: `<table style="width:100%;border-collapse:collapse;font-size:8pt;margin-bottom:8px;table-layout:fixed"><tr><th style="${TH};width:${W1}%">Kategori</th><th style="${TH};text-align:center;width:${W2}%">Jumlah</th><th style="${TH};text-align:center;width:${W3}%">Hadir</th><th style="${TH};text-align:center;width:${W4}%">Kurang</th><th style="${TH};width:${W5}%">Keterangan</th></tr>${rows}${sumRow}</table>${tabelRentang('Total hadir per rentang', rincian, totalHadir)}`, totalHadir };
  }
  // Penempatan: satu baris per personel (no., nama + peran kecil, jam rata kanan di baris yg
  // sama) supaya jam tidak bisa bergeser dari pemiliknya saat nama membungkus. Tiap pos satu
  // <tbody>; pos <= 5 orang tidak boleh terbelah halaman (lebih panjang boleh, antar baris). Semua pos ditampilkan; pos kosong = "Nihil".
  function tabelPenempatan(pos, kat, shiftLabel) {
    let total = 0, totalBersih = 0;
    const kategoriById = {}; (kat || []).forEach((k) => { kategoriById[k.id] = k; });
    const NO = 7, JAM = 24;
    const rows = (pos || []).map((p) => {
      const valid = (p.personel || []).filter(adaNama);
      total += valid.length;
      totalBersih += valid.filter((x) => x.jenis !== 'penggantian').length;
      const nama = esc(root.AVS.namaPosPersonelTerbaru(p.id, p.name));
      const kepala = `<tr style="page-break-inside:avoid;break-inside:avoid"><td colspan="2" style="padding:4px 6px 1px;font-weight:800;color:#10243D">${nama}</td><td style="padding:4px 6px 1px;text-align:center;font-size:7pt;color:${MUT}">${valid.length ? '' : '<i>Nihil</i>'}</td></tr>`;
      const baris = valid.map((x, i) => `<tr><td style="padding:1px 6px;text-align:right;color:${MUT};vertical-align:top;width:${NO}%">${i + 1}.</td><td style="padding:1px 6px;vertical-align:top">${esc(rapikan(x.nama))}${x.peran ? `<span style="font-size:7pt;color:${MUT};margin-left:4px">${esc(x.peran)}</span>` : ''}</td><td style="padding:1px 6px;text-align:center;vertical-align:top;white-space:nowrap;width:${JAM}%">${esc(x.jam || '-')}</td></tr>`).join('');
      const jaga = valid.length <= 5 ? 'page-break-inside:avoid;break-inside:avoid' : ''; // pos panjang boleh terbelah antar baris
      return `<tbody style="${jaga}">${kepala}${baris}<tr><td colspan="3" style="padding:0;height:2px;border-bottom:1px solid #F1F4F8"></td></tr></tbody>`;
    }).join('');
    const itemsWaktu = [];
    (pos || []).forEach((p) => (p.personel || []).filter(adaNama).forEach((x) => {
      const k = x.kategoriId ? kategoriById[x.kategoriId] : null;
      itemsWaktu.push({ mulai: k ? k.mulai : null, selesai: k ? k.selesai : null, bobot: 1 });
    }));
    const rincian = segmentasiWaktu(itemsWaktu, shiftLabel);
    return { html: `<table style="width:100%;border-collapse:collapse;font-size:8pt;margin-bottom:8px;table-layout:fixed"><colgroup><col style="width:${NO}%"><col><col style="width:${JAM}%"></colgroup><thead><tr><th colspan="2" style="${TH}">Pos / personel</th><th style="${TH};text-align:center">Jam Dinas</th></tr></thead>${rows}</table>${tabelRentang('Total penempatan per rentang', rincian, totalBersih)}`, total: totalBersih };
  }
  function ttdBlok(pembuat) {
    const nama = pembuat && pembuat.ada && pembuat.nama ? pembuat.nama.toUpperCase() : '....................';
    const jab = pembuat && pembuat.ada && pembuat.nama ? pembuat.jabatanLabel : 'CHIEF';
    const jabHtml = jab.split(', ').map(esc).join(',<br>');
    return `<div class="ttd-block" style="page-break-inside:avoid;break-inside:avoid;width:100%;margin-top:10mm;text-align:center">
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
    const kk = tabelKekuatan(r.kategoriKekuatan, r.shift);
    const pp = tabelPenempatan(r.posPenempatan, r.kategoriKekuatan, r.shift);
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
