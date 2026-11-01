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
    hasil.diabaikanBerdinas = hasil.personel.diabaikan.filter((p) => Object.keys(p.kode).length);
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

  // Selisih terhadap cadangan (kategori.js / personel.js). Tidak mengubah apa pun.
  ns.bandingkan = function (ringkasan, bawaan) {
    bawaan = bawaan || {};
    const kat = bawaan.kategori || (typeof KATEGORI_BAWAAN !== 'undefined' ? KATEGORI_BAWAAN : []);
    const nama = bawaan.personel || (typeof DAFTAR_PERSONEL !== 'undefined' ? DAFTAR_PERSONEL : []);
    const katById = {}; kat.forEach((k) => { katById[k.id] = k; });
    const kategoriBaru = [], jamBeda = [];
    (ringkasan.kategori || []).forEach((k) => {
      const id = PADANAN_AWAL[k.kunci], b = id ? katById[id] : null;
      if (!b) { kategoriBaru.push(k); return; }
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
