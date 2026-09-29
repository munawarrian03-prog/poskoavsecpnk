/* =====================================================
   IMPOR JADWAL DINAS DARI EXCEL
   Modul murni (tanpa DOM/localStorage) supaya bisa diuji terpisah.
   Menerima workbook hasil XLSX.read(...) (pustaka SheetJS) dan
   {tahun, bulan(0-11)} yang dipilih pengguna saat mengunggah, lalu
   mengembalikan struktur jadwal per Unit > (Grup) > Orang > tanggal:kode.

   Dikenali dua bentuk sheet:
   - GRUP: ada header berisi "GRUP" + "NAMA" + baris tanggal (objek Date
     berurutan) -- contoh: ROSTER ORGANIK, IASS.
   - DATAR: tanpa "GRUP", header "NO"+"NAMA" lalu baris angka tanggal
     1..31 (tanpa tahun/bulan eksplisit, dipakai {tahun,bulan} terpilih)
     -- contoh: NEW IASS.
   Sheet yang tidak cocok salah satu bentuk (mis. rekap jam dinas,
   daftar personel tanpa tanggal) dilewati dan dicatat di `dilewati`.
   ===================================================== */
(function (root) {
  'use strict';
  const ns = {};

  function bersih(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function normalisasiGrup(raw) {
    // "A\nD\nM" (huruf ditumpuk vertikal) -> "ADM"; "ADM PAS ID" (spasi asli) tetap apa adanya.
    const tanpaBaris = String(raw == null ? '' : raw).replace(/\n/g, '');
    return bersih(tanpaBaris).toUpperCase();
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function isoTanggal(y, m /*0-11*/, d) { return `${y}-${pad2(m + 1)}-${pad2(d)}`; }
  function jumlahHari(y, m) { return new Date(y, m + 1, 0).getDate(); }

  // Cari baris berisi >=5 sel Date berurutan (bentuk GRUP). Kembalikan {row, minCol, maxCol, tanggal:[{col,date}]} atau null.
  function cariBarisTanggalDate(rows, maxScan) {
    for (let r = 0; r < Math.min(rows.length, maxScan); r++) {
      const row = rows[r] || [];
      const sel = [];
      for (let c = 0; c < row.length; c++) if (row[c] instanceof Date) sel.push({ col: c, date: row[c] });
      if (sel.length >= 5) {
        const cols = sel.map((x) => x.col);
        return { row: r, minCol: Math.min(...cols), maxCol: Math.max(...cols), tanggal: sel };
      }
    }
    return null;
  }
  // Cari baris berisi >=5 bilangan bulat 1..31 berurutan naik (bentuk DATAR). Kembalikan {row, minCol, maxCol, hari:[{col,n}]} atau null.
  function cariBarisTanggalAngka(rows, maxScan) {
    for (let r = 0; r < Math.min(rows.length, maxScan); r++) {
      const row = rows[r] || [];
      const sel = [];
      for (let c = 0; c < row.length; c++) {
        const v = row[c];
        if (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 31) sel.push({ col: c, n: v });
      }
      if (sel.length >= 5) {
        // pastikan sebagian besar berurutan naik (bukan kebetulan kolom angka lain)
        let naik = 0;
        for (let i = 1; i < sel.length; i++) if (sel[i].n >= sel[i - 1].n) naik++;
        if (naik >= sel.length - 2) {
          const cols = sel.map((x) => x.col);
          return { row: r, minCol: Math.min(...cols), maxCol: Math.max(...cols), hari: sel };
        }
      }
    }
    return null;
  }
  function cariKolomHeader(rows, sampaiBaris, batasKolom) {
    const hasil = { colGrup: null, colNo: null, colJabatan: null, colNama: null, colNik: null };
    for (let r = 0; r <= sampaiBaris; r++) {
      const row = rows[r] || [];
      for (let c = 0; c < Math.min(row.length, batasKolom); c++) {
        const norm = bersih(row[c]).replace(/\s+/g, '').toUpperCase();
        if (!norm) continue;
        if (norm === 'GRUP') hasil.colGrup = c;
        else if (norm === 'NO') hasil.colNo = c;
        else if (norm.includes('JABATAN')) hasil.colJabatan = c;
        else if (norm === 'NAMA') hasil.colNama = c;
        else if (norm.includes('NIK')) hasil.colNik = c;
      }
    }
    return hasil;
  }
  function isBarisKeterangan(row) {
    return row.some((v) => bersih(v).toUpperCase().replace(/[^A-Z]/g, '') === 'KETERANGAN');
  }
  // Ambil legenda kode shift dari baris-baris setelah penanda "KETERANGAN".
  function ambilLegenda(rows, mulaiBaris) {
    const legenda = [];
    let kosongBerturut = 0;
    for (let r = mulaiBaris; r < rows.length && r < mulaiBaris + 25; r++) {
      const row = rows[r] || [];
      let ditemukan = false;
      // Bentuk A: kolom kedua = kode pendek, kolom ketiga diawali ":" = deskripsi (ROSTER ORGANIK, IASS)
      const c1 = bersih(row[1]), c2 = bersih(row[2]);
      if (c1 && !c1.includes(':') && c1.length <= 8 && c2.startsWith(':')) {
        legenda.push({ kode: c1.toUpperCase(), label: c2.replace(/^:\s*/, '').trim() });
        ditemukan = true;
      } else if (c1 && c1.includes(':')) {
        // Bentuk B: satu sel "KODE : deskripsi" (NEW IASS)
        const idx = c1.indexOf(':');
        const kode = c1.slice(0, idx).trim();
        const label = c1.slice(idx + 1).trim();
        if (kode && kode.length <= 8 && !/keterangan/i.test(kode)) { legenda.push({ kode: kode.toUpperCase(), label }); ditemukan = true; }
      }
      if (!ditemukan) { kosongBerturut++; if (kosongBerturut >= 3) break; } else kosongBerturut = 0;
    }
    // buang duplikat kode (ambil kemunculan pertama)
    const dilihat = new Set(), unik = [];
    legenda.forEach((l) => { if (!dilihat.has(l.kode)) { dilihat.add(l.kode); unik.push(l); } });
    return unik;
  }

  function parseSheetGrup(rows, tglInfo) {
    const kolom = cariKolomHeader(rows, tglInfo.row, tglInfo.minCol);
    if (kolom.colNama == null) return null;
    const grupList = [];
    let grupSaatIni = null;
    let barisKeteranganMulai = -1;
    for (let r = tglInfo.row + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      if (isBarisKeterangan(row)) { barisKeteranganMulai = r + 1; break; }
      const rawGrup = kolom.colGrup != null ? row[kolom.colGrup] : null;
      if (bersih(rawGrup)) grupSaatIni = normalisasiGrup(rawGrup);
      const nama = bersih(row[kolom.colNama]);
      if (!nama) continue;
      let bucket = grupList.find((g) => g.nama === (grupSaatIni || '(TANPA GRUP)'));
      if (!bucket) { bucket = { nama: grupSaatIni || '(TANPA GRUP)', orang: [] }; grupList.push(bucket); }
      const jadwal = {};
      tglInfo.tanggal.forEach(({ col, date }) => {
        const kode = bersih(row[col]);
        if (kode) jadwal[isoTanggal(date.getFullYear(), date.getMonth(), date.getDate())] = kode.toUpperCase();
      });
      bucket.orang.push({
        no: kolom.colNo != null ? row[kolom.colNo] : null,
        jabatan: kolom.colJabatan != null ? bersih(row[kolom.colJabatan]) : '',
        nama,
        nik: kolom.colNik != null ? bersih(row[kolom.colNik]) : '',
        jadwal
      });
    }
    const legenda = barisKeteranganMulai >= 0 ? ambilLegenda(rows, barisKeteranganMulai) : [];
    return { punyaGrup: true, legenda, grup: grupList };
  }

  function parseSheetDatar(rows, tglInfo, bulanTerpilih) {
    const kolom = cariKolomHeader(rows, tglInfo.row, tglInfo.minCol);
    if (kolom.colNama == null) return null;
    const orang = [];
    let barisKeteranganMulai = -1;
    const nHari = jumlahHari(bulanTerpilih.tahun, bulanTerpilih.bulan);
    for (let r = tglInfo.row + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      if (isBarisKeterangan(row)) { barisKeteranganMulai = r + 1; break; }
      const nama = bersih(row[kolom.colNama]);
      if (!nama) continue;
      const jadwal = {};
      tglInfo.hari.forEach(({ col, n }) => {
        if (n > nHari) return; // kolom melebihi jumlah hari bulan terpilih (mis. sheet dibuat untuk bulan 31 hari, dipakai di bulan 30 hari)
        const kode = bersih(row[col]);
        if (kode) jadwal[isoTanggal(bulanTerpilih.tahun, bulanTerpilih.bulan, n)] = kode.toUpperCase();
      });
      orang.push({ no: kolom.colNo != null ? row[kolom.colNo] : null, jabatan: '', nama, nik: '', jadwal });
    }
    const legenda = barisKeteranganMulai >= 0 ? ambilLegenda(rows, barisKeteranganMulai) : [];
    return { punyaGrup: false, legenda, grup: [{ nama: null, orang }] };
  }

  // sheetToRows: fungsi (nama sheet) -> array 2D nilai sel (raw, dengan Date utk sel bertanggal).
  // Disuntikkan dari pemanggil supaya modul ini tak bergantung langsung pada API SheetJS versi tertentu.
  ns.praProsesWorkbook = function (sheetNames, sheetToRows, bulanTerpilih) {
    const units = [], dilewati = [];
    sheetNames.forEach((nama) => {
      const rows = sheetToRows(nama) || [];
      if (!rows.length) { dilewati.push({ sheet: nama, alasan: 'sheet kosong' }); return; }
      const tglDate = cariBarisTanggalDate(rows, 12);
      if (tglDate) {
        const hasil = parseSheetGrup(rows, tglDate);
        if (hasil && hasil.grup.some((g) => g.orang.length)) { units.push(Object.assign({ nama, key: nama }, hasil)); return; }
      }
      const tglAngka = cariBarisTanggalAngka(rows, 6);
      if (tglAngka) {
        const hasil = parseSheetDatar(rows, tglAngka, bulanTerpilih);
        if (hasil && hasil.grup[0].orang.length) { units.push(Object.assign({ nama, key: nama }, hasil)); return; }
      }
      dilewati.push({ sheet: nama, alasan: 'tidak dikenali sebagai format jadwal harian (tidak ada baris tanggal)' });
    });
    return { bulan: bulanTerpilih, units, dilewati };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = ns;
  else { root.AVS = root.AVS || {}; root.AVS.JadwalImport = ns; }
})(typeof window !== 'undefined' ? window : this);
