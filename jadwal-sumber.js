/* =====================================================
   JADWAL DINAS SEBAGAI SUMBER KATEGORI & NAMA PERSONEL
   Modul bersama (satu logika, dipakai Jadwal Dinas, Laporan Personel, Kejadian)
   -- lihat RENCANA-PENGEMBANGAN.md, "RANGKAIAN BERURUTAN", langkah 2.

   Membaca data hasil impor (savedJadwalDinas[bulan] = {units:[{nama,legenda,grup:[{nama,orang}]}]})
   dan menurunkan:
   - kategori : kombinasi (sheet, kode) yang benar-benar dipakai personel, lengkap dengan jam dari
                legenda Excel (mulai/selesai). Jam SELALU ikut Excel.
   - personel : nama + jabatan personel yang ikut dihitung dinas.
   - diabaikan: kelompok yang tidak dihitung (A D M, ADM PAS ID). Bila ada di antaranya yang
                berkode DINAS (selain OH), dilaporkan agar pengguna yang memutuskan.
   - bandingkan: selisih terhadap kategori.js / personel.js (cadangan) supaya kode atau personel
                baru DIMUNCULKAN, tidak dimasukkan/dibuang diam-diam.

   Aturan (dari pengguna):
   - kelompok A D M (ORGANIK) dan ADM PAS ID (IASS) diabaikan;
   - kelompok LALIN (sheet IASS) = RDO; kodenya P/M dibaca sebagai "P RDO"/"M RDO" di legenda;
   - sheet tanpa legenda (mis. sheet turunan "ORGANIK") tidak dipakai menurunkan kategori.
   Modul ini TIDAK menulis apa pun ke localStorage.
   ===================================================== */
(function (root) {
  'use strict';
  const ns = {};
  const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const kunciGrup = (g) => norm(g).toUpperCase().replace(/\s+/g, '');
  const GRUP_DIABAIKAN = ['ADM', 'ADMPASID'];
  const diabaikan = (g) => GRUP_DIABAIKAN.includes(kunciGrup(g));
  const isRdo = (unit, g) => /IASS/i.test(unit.nama) && !/NEW/i.test(unit.nama) && kunciGrup(g) === 'LALIN';

  // Padanan awal (sheet|kode) -> id kategori di kategori.js. Dasar tabel nama tampilan (langkah 3:
  // dibuat bisa diatur pengguna). "ROSTER ORGANIK|M" juga ORGANIK karena kategori itu tanpa jam.
  const PADANAN_AWAL = {
    'ROSTER ORGANIK|P': 'org_pagi', 'ROSTER ORGANIK|M': 'org_pagi', 'ROSTER ORGANIK|PJD': 'org_pjd',
    'IASS|P': 'iass_pagi', 'IASS|M': 'iass_malam', 'IASS|PP': 'iass_pp', 'IASS|PS': 'iass_ps',
    'IASS|P RDO': 'rdo_pagi', 'IASS|M RDO': 'rdo_malam',
    'NEW IASS|PP': 'iass_ojt', 'NEW IASS|PS': 'iass_ojt1', 'NEW IASS|PM': 'iass_ojt2'
  };
  ns.PADANAN_AWAL = PADANAN_AWAL;

  function aliasNama(n) {
    const t = norm(n);
    const peta = (typeof ALIAS_NAMA !== 'undefined' && ALIAS_NAMA) || {};   // const global di personel.js (bukan properti window)
    return peta[t.toUpperCase()] || t;
  }

  function legendaPeta(unit) {
    const m = {};
    (unit.legenda || []).forEach((l) => { m[String(l.kode).toUpperCase()] = l; });
    return m;
  }

  // dataBulan: objek {units:[...]} seperti tersimpan di savedJadwalDinas[bulan]
  ns.ringkas = function (dataBulan) {
    const hasil = { ada: false, kategori: [], personel: { aktif: [], diabaikan: [] }, diabaikanBerdinas: [], kodeTanpaLegenda: [] };
    if (!dataBulan || !Array.isArray(dataBulan.units)) return hasil;
    const units = dataBulan.units.filter((u) => u && (u.legenda || []).length);   // sheet tanpa legenda dilewati
    if (!units.length) return hasil;
    hasil.ada = true;
    const kat = {}, aktif = new Map(), abai = new Map(), tak = {};
    units.forEach((u) => {
      const peta = legendaPeta(u);
      u.grup.forEach((g) => {
        const grupAbai = diabaikan(g.nama), rdo = isRdo(u, g.nama);
        g.orang.forEach((o) => {
          const nama = aliasNama(o.nama), key = nama.toUpperCase();
          const kodeCount = {};
          Object.values(o.jadwal || {}).forEach((k) => { k = String(k).toUpperCase(); kodeCount[k] = (kodeCount[k] || 0) + 1; });
          if (grupAbai) {
            const rec = abai.get(key) || { nama, grup: norm(g.nama), unit: u.nama, kode: {} };
            Object.entries(kodeCount).forEach(([k, n]) => {
              const e = peta[k];
              if (e && e.mulai && k !== 'OH') rec.kode[k] = (rec.kode[k] || 0) + n;
            });
            abai.set(key, rec); return;
          }
          if (!aktif.has(key)) aktif.set(key, { nama, jabatan: norm(o.jabatan), unit: u.nama, grup: norm(g.nama) || '', rdo });
          Object.entries(kodeCount).forEach(([k, n]) => {
            let e = peta[k];
            if (rdo && peta[k + ' RDO']) e = peta[k + ' RDO'];
            if (!e) { const t = `${u.nama}|${k}`; (tak[t] ||= { unit: u.nama, kode: k, n: 0 }).n += n; return; }
            if (!e.mulai) return;   // LIBUR dan kode tanpa jam tidak membentuk kategori
            const kunci = `${u.nama}|${e.kode}`;
            const r = (kat[kunci] ||= { kunci, unit: u.nama, kode: e.kode, mulai: e.mulai, selesai: e.selesai, orang: new Set(), hari: 0 });
            r.orang.add(key); r.hari += n;
          });
        });
      });
    });
    hasil.kategori = Object.values(kat).map((r) => ({ kunci: r.kunci, unit: r.unit, kode: r.kode, mulai: r.mulai, selesai: r.selesai, orang: r.orang.size, hari: r.hari }));
    hasil.personel.aktif = [...aktif.values()].sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
    hasil.personel.diabaikan = [...abai.values()].sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
    // Nama yang SUDAH diputuskan pengguna tetap diabaikan (DIABAIKAN_TETAP di personel.js) tidak dimunculkan lagi.
    const tetap = new Set(((typeof DIABAIKAN_TETAP !== 'undefined' && DIABAIKAN_TETAP) || []).map((n) => norm(n).toUpperCase()));
    hasil.diabaikanBerdinas = hasil.personel.diabaikan.filter((p) => Object.keys(p.kode).length && !tetap.has(p.nama.toUpperCase()));
    hasil.kodeTanpaLegenda = Object.values(tak).filter((t) => !/^L$/i.test(t.kode));
    return hasil;
  };

  function semuaData() { try { return JSON.parse(localStorage.getItem('savedJadwalDinas') || '{}'); } catch (e) { return {}; } }
  // ym: "YYYY-MM"
  ns.ringkasBulan = function (ym) { return ns.ringkas(semuaData()[ym] || null); };

  // Daftar nama untuk saran isian; null bila bulan itu belum ada jadwalnya (pemanggil memakai personel.js).
  ns.daftarNamaSaran = function (ym) {
    const r = ns.ringkasBulan(ym);
    return r.ada && r.personel.aktif.length ? r.personel.aktif.map((p) => p.nama) : null;
  };

  // ---------- Nama tampilan kategori (alias) ----------
  // Disimpan di localStorage['savedKategoriAlias'] = { "SHEET|KODE": "Nama di laporan" } (berlaku lintas bulan).
  // Tanpa isian pengguna: pakai nama kategori.js lewat PADANAN_AWAL; tanpa itu juga: "SHEET · KODE".
  const LS_ALIAS = 'savedKategoriAlias';
  function aliasTersimpan() { try { const o = JSON.parse(localStorage.getItem(LS_ALIAS) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
  function katBawaan() { return (typeof KATEGORI_BAWAAN !== 'undefined' && Array.isArray(KATEGORI_BAWAAN)) ? KATEGORI_BAWAAN : []; }
  ns.punyaNama = function (kunci) {
    const a = aliasTersimpan();
    return !!(norm(a[kunci]) || (PADANAN_AWAL[kunci] && katBawaan().some((k) => k.id === PADANAN_AWAL[kunci])));
  };
  ns.namaTampil = function (kunci, unit, kode) {
    const a = aliasTersimpan();
    if (norm(a[kunci])) return norm(a[kunci]);
    const id = PADANAN_AWAL[kunci], b = id ? katBawaan().find((k) => k.id === id) : null;
    return b ? b.nama : `${unit} · ${kode}`;
  };
  // nama bawaan (tanpa isian pengguna), untuk placeholder; '' bila tidak ada padanan
  ns.namaBawaan = function (kunci) {
    const id = PADANAN_AWAL[kunci], b = id ? katBawaan().find((k) => k.id === id) : null;
    return b ? b.nama : '';
  };
  ns.simpanAlias = function (kunci, nama) {
    const a = aliasTersimpan(), t = norm(nama);
    if (t && t !== ns.namaBawaan(kunci)) a[kunci] = t; else delete a[kunci];
    try { if (Object.keys(a).length) localStorage.setItem(LS_ALIAS, JSON.stringify(a)); else localStorage.removeItem(LS_ALIAS); } catch (e) { return false; }
    return true;
  };
  const slug = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  // Daftar kategori untuk form Laporan Personel (Kekuatan Personel), dari jadwal bulan ym.
  // Bentuk sama dgn KATEGORI_BAWAAN: {id, nama, mulai, selesai}. Jam SELALU dari Excel; bila satu nama
  // dipakai beberapa jam (mis. ORGANIK = kode P dan M) jamnya dikosongkan. id memakai id kategori.js
  // (PADANAN_AWAL) bila ada supaya laporan lama/terakhir-dipakai tetap cocok. null bila jadwal tidak ada.
  ns.kategoriForm = function (ym) {
    const r = ns.ringkasBulan(ym);
    if (!r.ada || !r.kategori.length) return null;
    const grup = new Map();
    r.kategori.forEach((k) => {
      const id = PADANAN_AWAL[k.kunci] || ('jd_' + slug(k.kunci));
      const nama = ns.namaTampil(k.kunci, k.unit, k.kode);
      const g = grup.get(id) || { id, nama, jam: new Set(), mulai: k.mulai, selesai: k.selesai };
      g.jam.add(k.mulai + '-' + k.selesai); grup.set(id, g);
    });
    const urutBawaan = katBawaan().map((k) => k.id);
    return [...grup.values()]
      .map((g, i) => ({ id: g.id, nama: g.nama, mulai: g.jam.size > 1 ? '' : g.mulai, selesai: g.jam.size > 1 ? '' : g.selesai, _i: i }))
      .sort((x, y) => { const ax = urutBawaan.indexOf(x.id), ay = urutBawaan.indexOf(y.id); return (ax < 0 ? 999 : ax) - (ay < 0 ? 999 : ay) || x._i - y._i; })
      .map(({ _i, ...k }) => k);
  };

  // ---------- Tampilan Harian (per tanggal & shift) ----------
  // Satu logika untuk tampilan Harian (langkah 4) dan, nanti, isi otomatis Laporan Personel (langkah 5).
  // Mengikuti referensi "Shift Planning" v95: personel dikelompokkan per kategori+kode+jam; shift Pagi =
  // kode berjam mulai < 12:00, shift Malam = mulai >= 12:00 ditambah personel yang masuk esok pagi
  // SEBELUM 08:00 (selain kode OH). RDO (LALIN) yang masuk esok pagi dan dinas pagi yang selesai lewat
  // 20:00 ikut tercatat di dinas malam tetapi bertanda placeOnly (tidak ditampilkan/dihitung di Harian).
  // Grup bertugas = grup ORGANIK ALPHA..DELTA dengan kode P (pagi) / M (malam) terbanyak pada hari itu.
  // Rencana Cuti belum ada, jadi tak ada yang ditandai cuti.
  const GRUP_TUGAS = ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA'];
  const shiftDari = (m) => (parseInt(String(m).slice(0, 2), 10) < 12 ? 'pagi' : 'malam');
  ns.bangunHari = function (dataBulan, ym, tanpaLanjut) {
    const [Y, M] = ym.split('-').map(Number), n = new Date(Y, M, 0).getDate();
    const pad = (x) => String(x).padStart(2, '0');
    const hari = {};
    for (let d = 1; d <= n; d++) { const iso = `${ym}-${pad(d)}`; hari[iso] = { d: iso, g: { pagi: null, malam: null }, pagi: [], malam: [] }; }
    const units = ((dataBulan && dataBulan.units) || []).filter((u) => u && (u.legenda || []).length);
    units.forEach((u) => {
      const peta = legendaPeta(u);
      const tipe = /NEW/i.test(u.nama) || u.punyaGrup === false ? 'N' : (/IASS/i.test(u.nama) ? 'I' : 'R');
      u.grup.forEach((g) => {
        if (diabaikan(g.nama)) return;
        const rdo = isRdo(u, g.nama);
        g.orang.forEach((o) => {
          Object.entries(o.jadwal || {}).forEach(([iso, kode]) => {
            const day = hari[iso]; if (!day) return;
            const k = String(kode).toUpperCase();
            let e = peta[k]; if (rdo && peta[k + ' RDO']) e = peta[k + ' RDO'];
            if (!e || !e.mulai) return;
            day[shiftDari(e.mulai)].push({ s: tipe, u: u.nama, kunci: `${u.nama}|${e.kode}`, g: norm(g.nama), n: aliasNama(o.nama), j: norm(o.jabatan), k, m: e.mulai, e: e.selesai, rdo });
          });
        });
      });
    });
    const list = Object.values(hari).sort((a, b) => a.d.localeCompare(b.d));
    // Hari terakhir bulan: personel yang masuk besok (tanggal 1 bulan berikutnya) sebelum 08:00 juga ikut dinas malam,
    // jadi tanggal 1 bulan berikutnya dibaca dari jadwal bulan itu bila sudah diunggah.
    let hariBerikut = null;
    if (!tanpaLanjut) {
      const dt = new Date(Y, M, 1), ymB = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`;
      const dataB = semuaData()[ymB];
      if (dataB) { try { hariBerikut = ns.bangunHari(dataB, ymB, true)[0] || null; } catch (e) { hariBerikut = null; } }
    }
    list.forEach((d, i) => {
      const nx = list[i + 1] || hariBerikut;
      const have = new Set(d.malam.map((e) => e.n.toUpperCase()));
      if (nx) nx.pagi.forEach((e) => {
        if (have.has(e.n.toUpperCase())) return;
        if (e.rdo) { if (e.m < '08:00') { d.malam.push(Object.assign({}, e, { early: true, placeOnly: true, fromD: nx.d })); have.add(e.n.toUpperCase()); } }
        else if (e.m < '08:00' && e.k !== 'OH') { d.malam.push(Object.assign({}, e, { early: true, fromD: nx.d })); have.add(e.n.toUpperCase()); }
      });
      d.pagi.forEach((e) => { if (e.e > '20:00' && e.e > e.m && !have.has(e.n.toUpperCase())) { d.malam.push(Object.assign({}, e, { lateStay: true, placeOnly: true })); have.add(e.n.toUpperCase()); } });
      [['pagi', 'P'], ['malam', 'M']].forEach(([sh, kode]) => {
        const c = {};
        d[sh].forEach((e) => { if (e.s === 'R' && e.k === kode && GRUP_TUGAS.includes(e.g) && !e.placeOnly) c[e.g] = (c[e.g] || 0) + 1; });
        const g = Object.keys(c).sort((a, b) => c[b] - c[a])[0];
        d.g[sh] = g || null;
      });
    });
    return list;
  };
  // kategori bagian: urutan tampil (p) dan label
  function katBagian(x, g) {
    if (x.s === 'N') return { p: 6, label: 'NEW IASS' };
    if (x.s === 'I' && x.g === 'LALIN') return { p: 5, label: 'RDO' };
    if (x.s === 'I') return x.g === g ? { p: 1, label: `IASS · ${x.g}` } : { p: 4, label: `IASS · ${x.g}` };
    return x.g === g ? { p: 0, label: `ORGANIK · ${x.g}` } : { p: 2, label: `ORGANIK · ${x.g}` };
  }
  function kolomBagian(b) {
    if (b.p === 0 || b.p === 5) return 1;
    if (b.p === 1) return 2;
    if (b.p === 4 || b.p === 6) return b.k === 'PP' ? 2 : 3;
    return 3;
  }
  // Bagian tampilan Harian untuk satu hari & shift: [{t, items, col}] (placeOnly tidak ikut).
  ns.bagianHarian = function (day, shift) {
    const g = day.g[shift], b = new Map();
    day[shift].forEach((x) => {
      if (x.placeOnly) return;
      const c = katBagian(x, g), key = `${c.p}|${c.label}|${x.k}|${x.m}|${x.e}`;
      if (!b.has(key)) b.set(key, { p: c.p, label: c.label, k: x.k, m: x.m, e: x.e, items: [] });
      b.get(key).items.push(x);
    });
    return [...b.values()]
      .sort((a, c) => (a.p - c.p) || a.label.localeCompare(c.label) || a.m.localeCompare(c.m) || a.k.localeCompare(c.k))
      .map((x) => ({ t: `${x.label} · ${x.k} · ${x.m}-${x.e}`, items: x.items, col: kolomBagian(x) }));
  };
  ns.jumlahTersedia = function (day, shift) { return day[shift].filter((x) => !x.placeOnly).length; };

  // ---------- Rencana isi Laporan Personel (langkah 5) ----------
  // Dari jadwal bulan `ym`, tanggal & shift ('pagi'|'malam') -> bahan mengisi Laporan Personel:
  //   grup bertugas, jumlah per kategori (id/nama/jam seperti kategoriForm), dan daftar personel
  //   (nama, peran, kategori, jam dinas) berurutan seperti penempatan di referensi v95: anggota grup
  //   bertugas dulu (jabatan lalu nama), lalu yang lain menurut jam masuk (yang masuk esok hari terakhir).
  // Tidak menulis apa pun. Siapa yang tidak hadir TIDAK diketahui jadwal (diisi manual oleh pengguna).
  const JAB_URUT = { 'CHIEF': 1, 'CHIEF ASST': 2, 'CHIEF ASSISTANT': 2, 'SUPERVISOR': 3, 'OFFICER': 4 };
  const rankJab = (e) => (e.s === 'N' ? 6 : e.s === 'I' ? 5 : (JAB_URUT[norm(e.j).toUpperCase()] || 4.5));
  function peranDari(j) {
    const t = norm(j).toUpperCase();
    if (t === 'CHIEF') return '(Chief)';
    if (t === 'CHIEF ASST' || t === 'CHIEF ASSISTANT') return '(Assistant chief)';
    if (t === 'SUPERVISOR') return '(Supervisor)';
    return '';
  }
  function idKategoriDari(kunci) { return PADANAN_AWAL[kunci] || ('jd_' + slug(kunci)); }
  ns.rencanaLaporan = function (ym, tanggalISO, shift) {
    const hasil = { ada: false, grup: null, kategori: [], personel: [], tanpaNama: [], ganda: [] };
    const data = semuaData()[ym] || null;
    const form = ns.kategoriForm(ym);
    if (!data || !form) return hasil;
    const hari = ns.bangunHari(data, ym), day = hari.find((d) => d.d === tanggalISO);
    if (!day) return hasil;
    hasil.ada = true; hasil.grup = day.g[shift];
    // Dinas malam di hari terakhir bulan butuh jadwal bulan berikutnya (yang masuk besok sebelum 08:00); beri tahu bila belum ada.
    if (shift === 'malam' && hari[hari.length - 1].d === tanggalISO) {
      const [Y, M] = ym.split('-').map(Number), dt = new Date(Y, M, 1);
      hasil.tanpaBulanBerikut = !semuaData()[`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`];
    }
    const g = day.g[shift];
    // Dinas pagi: hanya yang bertugas pagi. Dinas malam: yang bertugas malam, ditambah (aturan pengguna) personel dinas
    // pagi yang pulang LEBIH dari 20:00 dan personel esok hari yang masuk SEBELUM 08:00 (termasuk RDO) -- semuanya
    // ikut dihitung dalam Jumlah/Hadir kategorinya dan diberi tag agar jelas asalnya.
    const list = day[shift].filter((x) => shift === 'malam' || !x.placeOnly);
    const tagDari = (x) => (x.early ? 'masuk esok, sebelum 08:00' : (x.lateStay ? `pulang ${x.e}` : ''));
    const daftar = {}, dasar = {}, tanpa = new Set();
    const mnt = (m) => { const [h, mi] = String(m).split(':').map(Number); return h * 60 + mi; };
    const kunciUrut = (x) => { const own = (x.s === 'R' || x.s === 'I') && x.g === g; let t = mnt(x.m); if (shift === 'malam' && x.early) t += 1440; return [own ? 0 : 1, own ? 0 : t, rankJab(x), x.n]; };
    const urut = list.slice().sort((a, b) => { const p = kunciUrut(a), q = kunciUrut(b); for (let i = 0; i < 3; i++) if (p[i] !== q[i]) return p[i] - q[i]; return String(p[3]).localeCompare(String(q[3]), 'id'); });
    urut.forEach((x) => {
      const id = idKategoriDari(x.kunci);
      const ku = kunciUrut(x);
      const orang = { nama: x.n, peran: peranDari(x.j), jabatan: x.j, kategoriId: id, jam: `${x.m}–${x.e}`, tag: tagDari(x), kunci: x.kunci, early: !!x.early, u: [ku[0], ku[1], ku[2]] };
      (daftar[id] ||= []).push(orang); (dasar[id] ||= new Set()).add(x.kunci);
      if (!ns.punyaNama(x.kunci)) tanpa.add(x.kunci);
      hasil.personel.push(orang);
    });
    hasil.tanpaNama = [...tanpa];
    hasil.kategori = form.map((k) => ({ id: k.id, nama: k.nama, mulai: k.mulai, selesai: k.selesai, jml: (daftar[k.id] || []).length, dasar: [...(dasar[k.id] || [])], daftar: daftar[k.id] || [] }));
    const hitung = {}; hasil.personel.forEach((p) => { hitung[p.nama.toUpperCase()] = (hitung[p.nama.toUpperCase()] || 0) + 1; });
    hasil.ganda = Object.keys(hitung).filter((k) => hitung[k] > 1);
    return hasil;
  };

  // Selisih terhadap cadangan (kategori.js / personel.js). Tidak mengubah apa pun.
  ns.bandingkan = function (ringkasan, bawaan) {
    bawaan = bawaan || {};
    const kat = bawaan.kategori || (typeof KATEGORI_BAWAAN !== 'undefined' ? KATEGORI_BAWAAN : []);
    const nama = bawaan.personel || (typeof DAFTAR_PERSONEL !== 'undefined' ? DAFTAR_PERSONEL : []);
    const katById = {}; kat.forEach((k) => { katById[k.id] = k; });
    const kategoriBaru = [], jamBeda = [];
    (ringkasan.kategori || []).forEach((k) => {
      const id = PADANAN_AWAL[k.kunci], b = id ? katById[id] : null;
      if (!ns.punyaNama(k.kunci)) { kategoriBaru.push(k); return; }
      if (!b) return;   // sudah diberi nama pengguna, tidak ada kategori.js pembanding
      if (b.mulai && (b.mulai !== k.mulai || b.selesai !== k.selesai)) jamBeda.push({ kategori: k, bawaan: b });
    });
    const setLama = new Set(nama.map((n) => norm(n).toUpperCase()));
    const setBaru = new Set((ringkasan.personel.aktif || []).map((p) => p.nama.toUpperCase()));
    return {
      kategoriBaru, jamBeda,
      personelBelumAda: (ringkasan.personel.aktif || []).filter((p) => !setLama.has(p.nama.toUpperCase())),
      personelTakAda: nama.map(norm).filter((n) => n && !setBaru.has(n.toUpperCase()))
    };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = ns;
  else { root.AVS = root.AVS || {}; root.AVS.JadwalSumber = ns; }
})(typeof window !== 'undefined' ? window : this);
