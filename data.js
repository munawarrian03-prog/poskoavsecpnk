/* =====================================================
   DATA & REKAP untuk Beranda.
   Membaca laporan personel (localStorage) dan laporan kejadian
   (IndexedDB), lalu menghitung rekap per bulan.
   Fungsi hitung bersifat murni (tanpa DOM) sehingga mudah diuji.
   ===================================================== */
(function (root) {
  'use strict';

  const ALASAN = ['Cuti Tahunan', 'Sakit', 'Izin', 'Dinas Luar', 'Cuti Alasan Penting', 'Cuti Melahirkan', 'Tanpa Keterangan', 'Lainnya'];
  const REGU = ['A', 'B', 'C', 'D'];
  const rapikan = (s) => String(s == null ? '' : s).trim().replace(/\s+/g, ' ');
  const kunciNama = (s) => rapikan(s).toUpperCase();
  const reguKey = (s) => { const m = String(s || '').trim().match(/^([A-Za-z])/); return m ? m[1].toUpperCase() : '?'; };
  const alasanKat = (p) => (p && ALASAN.includes(p.alasan)) ? p.alasan : 'Lainnya';
  const hariBulan = (y, m) => new Date(y, m + 1, 0).getDate();
  function pecah(t) { const x = String(t || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return x ? { y: +x[1], m: +x[2] - 1, d: +x[3] } : null; }
  const cmpBulan = (y, m, h) => (y * 12 + m) - (h.getFullYear() * 12 + h.getMonth());   // <0 lampau, 0 berjalan, >0 depan
  const hariBerjalan = (y, m, h) => { const c = cmpBulan(y, m, h); return c < 0 ? hariBulan(y, m) : c === 0 ? h.getDate() : 0; };
  const shiftKey = (s) => (/malam/i.test(String(s || '')) ? 'M' : 'P');

  // mode: 'kejadian' (bawaan, satu baris personel tidak hadir = satu hitungan, seperti sebelumnya)
  //    atau 'orang-hari' (satu orang yang tidak hadir di lebih dari satu shift pada HARI YANG SAMA
  //    dihitung SATU KALI; alasan & regu diambil dari laporan paling awal hari itu — Pagi sebelum Malam).
  function statPersonel(list, y, m, regu, hariIni, mode) {
    regu = regu || 'all'; hariIni = hariIni || new Date(); mode = mode === 'orang-hari' ? 'orang-hari' : 'kejadian';
    const n = hariBulan(y, m), perHari = new Array(n).fill(0), alasan = {}, perRegu = { A: 0, B: 0, C: 0, D: 0 }, orang = new Map(), shifts = new Set();
    let laporan = 0, tidakHadir = 0, totalJml = 0, totalHadir = 0;
    // orang-hari: dulu kelompokkan setiap baris tidak hadir menurut hari+nama, pilih alasan/regu dari shift paling awal
    const grupHari = new Map();   // kunci: 'd|NAMA' -> { d, nama, alasan, rk, urutanShift }
    (list || []).forEach((r) => {
      const t = pecah(r && r.tanggal); if (!t || t.y !== y || t.m !== m) return;
      const rk = reguKey(r.regu);
      if (regu !== 'all' && rk !== regu) { shifts.add(t.d + '|' + shiftKey(r.shift) + '|x'); return; }
      laporan++; shifts.add(t.d + '|' + shiftKey(r.shift));
      const urutanShift = shiftKey(r.shift) === 'P' ? 0 : 1;
      (r.kategoriKekuatan || []).forEach((k) => {
        if (!k) return;
        const jml = Math.max(0, parseInt(k.jml, 10) || 0);
        const valid = (k.absen || []).filter((p) => rapikan(p && p.nama) !== '');
        totalJml += jml; totalHadir += Math.max(0, jml - valid.length);
        valid.forEach((p) => {
          const a = alasanKat(p);
          if (mode === 'kejadian') {
            tidakHadir++; perHari[t.d - 1]++;
            alasan[a] = (alasan[a] || 0) + 1;
            if (perRegu[rk] !== undefined) perRegu[rk]++;
            const key = kunciNama(p.nama); let o = orang.get(key);
            if (!o) { o = { nama: rapikan(p.nama), jumlah: 0, alasan: {}, regu: {} }; orang.set(key, o); }
            o.jumlah++; o.alasan[a] = (o.alasan[a] || 0) + 1; o.regu[rk] = (o.regu[rk] || 0) + 1;
          } else {
            const gk = t.d + '|' + kunciNama(p.nama); let g = grupHari.get(gk);
            if (!g || urutanShift < g.urutanShift) grupHari.set(gk, { d: t.d, nama: rapikan(p.nama), alasan: a, rk, urutanShift });
          }
        });
      });
    });
    if (mode === 'orang-hari') {
      grupHari.forEach((g) => {
        tidakHadir++; perHari[g.d - 1]++;
        alasan[g.alasan] = (alasan[g.alasan] || 0) + 1;
        if (perRegu[g.rk] !== undefined) perRegu[g.rk]++;
        const key = kunciNama(g.nama); let o = orang.get(key);
        if (!o) { o = { nama: g.nama, jumlah: 0, alasan: {}, regu: {} }; orang.set(key, o); }
        o.jumlah++; o.alasan[g.alasan] = (o.alasan[g.alasan] || 0) + 1; o.regu[g.rk] = (o.regu[g.rk] || 0) + 1;
      });
    }
    const dominan = (o) => Object.entries(o).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
    const alasanList = Object.entries(alasan).map(([nama, jumlah]) => ({ nama, jumlah })).sort((a, b) => b.jumlah - a.jumlah || ALASAN.indexOf(a.nama) - ALASAN.indexOf(b.nama));
    const top = Array.from(orang.values()).sort((a, b) => b.jumlah - a.jumlah || a.nama.localeCompare(b.nama, 'id')).slice(0, 5)
      .map((o) => ({ nama: o.nama, jumlah: o.jumlah, regu: dominan(o.regu), alasan: dominan(o.alasan) }));
    const semuaShift = new Set(Array.from(shifts).map((s) => s.replace(/\|x$/, '')));
    return {
      laporan, tidakHadir, totalJml, totalHadir, perHari, alasan: alasanList, perRegu, top, mode,
      kehadiran: totalJml > 0 ? (totalHadir / totalJml) * 100 : null,
      shiftTerlapor: semuaShift.size, shiftHarapan: hariBerjalan(y, m, hariIni) * 2
    };
  }

  const pad2 = (n) => String(n).padStart(2, '0');
  const fmtISO = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;
  const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const BULAN_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  // Shift yang belum ada laporan personel-nya (Tahap 1: hanya tanggal & shift, tanpa regu).
  // Pagi berakhir 20:00 hari yang sama; Malam berakhir 08:00 hari berikutnya. tenggangJam = jeda
  // setelah shift berakhir sebelum dianggap "kosong" (bukan "belum jatuh tempo").
  function shiftKosong(list, y, m, hariIni, tenggangJam) {
    hariIni = hariIni || new Date(); tenggangJam = tenggangJam == null ? 12 : tenggangJam;
    const ada = new Set();
    (list || []).forEach((r) => { const t = pecah(r && r.tanggal); if (!t || t.y !== y || t.m !== m) return; ada.add(t.d + '|' + shiftKey(r.shift)); });
    const batas = hariBerjalan(y, m, hariIni), now = hariIni.getTime(), out = [];
    for (let d = 1; d <= batas; d++) {
      [['P', 'Pagi', 20, 0, 0], ['M', 'Malam', 8, 0, 1]].forEach(([k, label, jam, menit, tambahHari]) => {
        if (ada.has(d + '|' + k)) return;
        const akhir = new Date(y, m, d + tambahHari, jam, menit, 0, 0).getTime();
        if (now - akhir < tenggangJam * 3600000) return;   // belum jatuh tempo
        out.push({ tanggal: fmtISO(y, m, d), hari: HARI_ID[new Date(y, m, d).getDay()], shift: label });
      });
    }
    return out;
  }
  // Teks siap-tempel untuk grup WhatsApp, merangkum shift yang kosong bulan itu.
  function teksPengingatKosong(kosong, y, m) {
    if (!kosong || !kosong.length) return '';
    const baris = kosong.map((x) => `${+x.tanggal.slice(8, 10)} ${BULAN_ID[m].slice(0, 3)} ${x.shift}`).join('; ');
    return `Shift belum dilaporkan, ${BULAN_ID[m]} ${y}: ${baris}. Mohon segera diisi.`;
  }

  /* ---------- Beranda baru (Tahap 3): shift sebelumnya, Fasilitas bulanan, kepatuhan 3-jenis ---------- */

  // Shift yang baru saja BERAKHIR relatif terhadap hariIni (Pagi berakhir 20:00 hari itu;
  // Malam berakhir 08:00 hari berikutnya). Dipakai kartu "Shift Sebelumnya" di Beranda.
  function shiftSebelumnya(hariIni) {
    hariIni = hariIni || new Date();
    const now = hariIni.getTime(), cand = [];
    for (let back = -1; back <= 3; back++) {
      const base = new Date(hariIni.getFullYear(), hariIni.getMonth(), hariIni.getDate() - back);
      const y = base.getFullYear(), m = base.getMonth(), d = base.getDate();
      cand.push({ y, m, d, shift: 'Pagi', shiftLabel: 'Pagi (08:00 - 20:00) WIB', akhir: new Date(y, m, d, 20, 0, 0).getTime(), tanggal: fmtISO(y, m, d), tanggalAkhir: fmtISO(y, m, d) });
      cand.push({ y, m, d, shift: 'Malam', shiftLabel: 'Malam (20:00 - 08:00) WIB', akhir: new Date(y, m, d + 1, 8, 0, 0).getTime(), tanggal: fmtISO(y, m, d), tanggalAkhir: fmtISO(y, m, d + 1) });
    }
    const lewat = cand.filter((c) => c.akhir <= now).sort((a, b) => b.akhir - a.akhir);
    return lewat[0] || null;
  }

  // Statistik Laporan Fasilitas bulanan: item yang paling sering bermasalah (Rusak / Tidak
  // Digunakan / unit Rusak pada item Bentuk B). Sejajar dengan statPersonel().top untuk Personel.
  function statFasilitas(list, y, m) {
    const bermasalah = new Map();
    let laporan = 0;
    (list || []).forEach((r) => {
      const t = pecah(r && r.tanggal); if (!t || t.y !== y || t.m !== m) return;
      laporan++;
      (r.posFasilitas || []).forEach((p) => (p.items || []).forEach((it) => {
        // Rusak & Tidak Digunakan dihitung terpisah, sama seperti ringkasLaporan di fasilitas.html.
        const jenisList = [];
        if (it.bentuk === 'A') {
          if (it.kondisi === 'Rusak') jenisList.push('Rusak');
          if (it.status === 'Tidak Digunakan') jenisList.push('Tidak Digunakan');
        } else if (it.bentuk === 'B' && (it.rusak || 0) > 0) {
          jenisList.push('Rusak');
        }
        if (!jenisList.length) return;
        const key = (p.name || '') + '|' + (it.name || ''); let e = bermasalah.get(key);
        if (!e) { e = { item: rapikan(it.name), pos: rapikan(p.name), jumlah: 0, jenis: {} }; bermasalah.set(key, e); }
        e.jumlah += jenisList.length; jenisList.forEach((jenis) => { e.jenis[jenis] = (e.jenis[jenis] || 0) + 1; });
      }));
    });
    const dominan = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0][0];
    const top = Array.from(bermasalah.values()).sort((a, b) => b.jumlah - a.jumlah || a.item.localeCompare(b.item, 'id')).slice(0, 5)
      .map((e) => ({ item: e.item, pos: e.pos, jumlah: e.jumlah, jenis: dominan(e.jenis) }));
    return { laporan, top };
  }

  // Shift yang belum lengkap dilaporkan, GABUNGAN 3 jenis laporan (Personel + Fasilitas + Log
  // Book). Log Book & Fasilitas TIDAK dicek per-regu (aplikasi belum punya jadwal dinas) — lihat
  // RENCANA-PENGEMBANGAN.md.
  function shiftKosongGabungan(personelList, fasilitasList, logbookList, y, m, hariIni, tenggangJam) {
    hariIni = hariIni || new Date(); tenggangJam = tenggangJam == null ? 12 : tenggangJam;
    const bikinSet = (list) => { const s = new Set(); (list || []).forEach((r) => { const t = pecah(r && r.tanggal); if (t && t.y === y && t.m === m) s.add(t.d + '|' + shiftKey(r.shift)); }); return s; };
    const adaP = bikinSet(personelList), adaF = bikinSet(fasilitasList), adaL = bikinSet(logbookList);
    const batas = hariBerjalan(y, m, hariIni), now = hariIni.getTime(), out = [];
    for (let d = 1; d <= batas; d++) {
      [['P', 'Pagi', 20, 0, 0], ['M', 'Malam', 8, 0, 1]].forEach(([k, label, jam, menit, tambahHari]) => {
        const akhir = new Date(y, m, d + tambahHari, jam, menit, 0, 0).getTime();
        if (now - akhir < tenggangJam * 3600000) return;
        const key = d + '|' + k, kurang = [];
        if (!adaP.has(key)) kurang.push('Personel');
        if (!adaF.has(key)) kurang.push('Fasilitas');
        if (!adaL.has(key)) kurang.push('Log Book');
        if (kurang.length) out.push({ tanggal: fmtISO(y, m, d), hari: HARI_ID[new Date(y, m, d).getDay()], shift: label, kurang });
      });
    }
    return out;
  }
  // Teks siap-tempel WA untuk daftar gabungan di atas.
  function teksPengingatKosongGabungan(kosong, y, m) {
    if (!kosong || !kosong.length) return '';
    const baris = kosong.map((x) => `${+x.tanggal.slice(8, 10)} ${BULAN_ID[m].slice(0, 3)}, ${x.shift} — ${x.kurang.join(', ')} belum`).join('\n');
    return `*LAPORAN BELUM LENGKAP*\n*AVSEC BANDARA SUPADIO*\n\n${BULAN_ID[m]} ${y} — mohon segera dilengkapi:\n\n${baris}\n\nTerima kasih.`;
  }

  // Status 3-tingkat (Terisi/Proses/Belum Terisi) per shift per jenis laporan, GABUNGAN 3 jenis
  // (Personel/Fasilitas/Log Book) -- dipakai halaman "Pantau Posko". Batas akhir shift sama dengan
  // shiftKosongGabungan (Pagi berakhir 20:00 hari itu, Malam berakhir 08:00 hari berikutnya), TANPA
  // tenggang: begitu lewat batas dan belum ada laporan, langsung dianggap "belum" (bukan "proses").
  function statusPantauPosko(personelList, fasilitasList, logbookList, y, m, hariIni) {
    hariIni = hariIni || new Date();
    const bikinSet = (list) => { const s = new Set(); (list || []).forEach((r) => { const t = pecah(r && r.tanggal); if (t && t.y === y && t.m === m) s.add(t.d + '|' + shiftKey(r.shift)); }); return s; };
    const adaP = bikinSet(personelList), adaF = bikinSet(fasilitasList), adaL = bikinSet(logbookList);
    const batas = hariBerjalan(y, m, hariIni), now = hariIni.getTime(), out = [];
    const status = (ada, akhir) => ada ? 'terisi' : (now < akhir ? 'proses' : 'belum');
    for (let d = 1; d <= batas; d++) {
      [['P', 'Pagi', 20, 0, 0], ['M', 'Malam', 8, 0, 1]].forEach(([k, label, jam, menit, tambahHari]) => {
        const akhir = new Date(y, m, d + tambahHari, jam, menit, 0, 0).getTime();
        const key = d + '|' + k;
        out.push({
          tanggal: fmtISO(y, m, d), hari: HARI_ID[new Date(y, m, d).getDay()], shift: label,
          personel: status(adaP.has(key), akhir), fasilitas: status(adaF.has(key), akhir), logbook: status(adaL.has(key), akhir)
        });
      });
    }
    return out.reverse();
  }

  /* =====================================================
     Tahap 4 — "Lihat Semua Rekap": statistik berbasis RENTANG TANGGAL
     bebas (bukan per-bulan seperti statPersonel/statKejadian di atas).
     Ketidakhadiran SELALU per-orang-per-hari (tidak ada mode lain,
     sesuai Tahap 0.1). Semua fungsi berikut mengembalikan DAFTAR
     LENGKAP (tidak dipotong 5) — pemotongan "5 teratas" dilakukan di
     lapisan tampilan (rekap.js), datanya sendiri utuh untuk laci.
     ===================================================== */
  function dalamRentang(tgl, startISO, endISO) { return tgl && tgl >= startISO && tgl <= endISO; }

  // Granularitas tren otomatis: harian (<= 31 hari), mingguan (<= 92 hari / ~3 bulan), bulanan (lebih dari itu).
  function bucketRentang(startISO, endISO) {
    const s = pecah(startISO), e = pecah(endISO);
    const sd = new Date(s.y, s.m, s.d), ed = new Date(e.y, e.m, e.d);
    const totalHari = Math.round((ed - sd) / 86400000) + 1;
    const iso = (d) => fmtISO(d.getFullYear(), d.getMonth(), d.getDate());
    const granularitas = totalHari <= 31 ? 'harian' : totalHari <= 92 ? 'mingguan' : 'bulanan';
    const buckets = [];
    if (granularitas === 'harian') {
      for (let i = 0; i < totalHari; i++) { const d = new Date(sd); d.setDate(d.getDate() + i); buckets.push({ mulai: iso(d), akhir: iso(d), label: String(d.getDate()) }); }
    } else if (granularitas === 'mingguan') {
      let cur = new Date(sd), idx = 1;
      while (cur <= ed) {
        const mulai = new Date(cur), akhir = new Date(cur); akhir.setDate(akhir.getDate() + 6); if (akhir > ed) akhir.setTime(ed.getTime());
        buckets.push({ mulai: iso(mulai), akhir: iso(akhir), label: 'Mg' + idx });
        cur.setDate(cur.getDate() + 7); idx++;
      }
    } else {
      const lintasTahun = sd.getFullYear() !== ed.getFullYear();
      let cur = new Date(sd.getFullYear(), sd.getMonth(), 1);
      while (cur <= ed) {
        const mulai = cur < sd ? new Date(sd) : new Date(cur), akhir = new Date(cur.getFullYear(), cur.getMonth() + 1, 0); if (akhir > ed) akhir.setTime(ed.getTime());
        buckets.push({ mulai: iso(mulai), akhir: iso(akhir), label: BULAN_ID[cur.getMonth()].slice(0, 3) + (lintasTahun ? " '" + String(cur.getFullYear()).slice(2) : '') });
        cur.setMonth(cur.getMonth() + 1);
      }
    }
    return { granularitas, totalHari, buckets };
  }
  function isiBucket(buckets, tanggalList) {
    return buckets.map((b) => ({ label: b.label, mulai: b.mulai, akhir: b.akhir, jumlah: tanggalList.filter((t) => t >= b.mulai && t <= b.akhir).length }));
  }

  // Ketidakhadiran personel, per orang per hari, GABUNGAN seluruh rentang (bukan per bulan).
  function statPersonelRentang(list, startISO, endISO, regu) {
    regu = regu || 'all';
    const grup = new Map();   // 'tgl|NAMA' -> { tgl, nama, alasan, rk, urutanShift }
    let laporanTersimpan = 0, totalJml = 0, totalHadir = 0;
    const perRegu = { A: 0, B: 0, C: 0, D: 0 }, shiftAda = new Set();
    (list || []).forEach((r) => {
      const tgl = r && r.tanggal; if (!dalamRentang(tgl, startISO, endISO)) return;
      const rk = reguKey(r.regu);
      if (regu !== 'all' && rk !== regu) return;
      laporanTersimpan++; shiftAda.add(tgl + '|' + shiftKey(r.shift));
      const urutanShift = shiftKey(r.shift) === 'P' ? 0 : 1;
      (r.kategoriKekuatan || []).forEach((k) => {
        const jml = Math.max(0, parseInt(k.jml, 10) || 0), valid = (k.absen || []).filter((p) => rapikan(p && p.nama) !== '');
        totalJml += jml; totalHadir += Math.max(0, jml - valid.length);
        valid.forEach((p) => {
          const gk = tgl + '|' + kunciNama(p.nama); const g = grup.get(gk);
          if (!g || urutanShift < g.urutanShift) grup.set(gk, { tgl, nama: rapikan(p.nama), alasan: alasanKat(p), rk, urutanShift });
        });
      });
    });
    const orang = new Map();
    grup.forEach((g) => {
      if (perRegu[g.rk] !== undefined) perRegu[g.rk]++;
      const key = kunciNama(g.nama); let o = orang.get(key);
      if (!o) { o = { nama: g.nama, regu: g.rk, jumlah: 0, tanggal: [] }; orang.set(key, o); }
      o.jumlah++; o.tanggal.push({ tgl: g.tgl, alasan: g.alasan });
    });
    const dominanAlasan = (arr) => { const c = {}; arr.forEach((x) => { c[x.alasan] = (c[x.alasan] || 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]; };
    const daftar = Array.from(orang.values()).map((o) => ({ nama: o.nama, regu: o.regu, jumlah: o.jumlah, alasan: dominanAlasan(o.tanggal), tanggal: o.tanggal.sort((a, b) => b.tgl.localeCompare(a.tgl)) }))
      .sort((a, b) => b.jumlah - a.jumlah || a.nama.localeCompare(b.nama, 'id'));
    const tidakHadir = grup.size, orangTerlibat = orang.size;
    const bk = bucketRentang(startISO, endISO), tren = isiBucket(bk.buckets, Array.from(grup.values()).map((g) => g.tgl));
    return { tidakHadir, orangTerlibat, kehadiran: totalJml > 0 ? (totalHadir / totalJml) * 100 : null, laporanTersimpan, shiftAda: shiftAda.size, perRegu, daftar, tren, granularitas: bk.granularitas };
  }

  // Fasilitas bermasalah, GABUNGAN seluruh rentang.
  function statFasilitasRentang(list, startISO, endISO, regu) {
    regu = regu || 'all';
    const bermasalah = new Map(); let laporanTersimpan = 0, totalMasalah = 0, tidakDigunakan = 0, dokTotal = 0, dokLengkap = 0;
    const shiftAda = new Set();
    (list || []).forEach((r) => {
      const tgl = r && r.tanggal; if (!dalamRentang(tgl, startISO, endISO)) return;
      if (regu !== 'all' && reguKey(r.regu) !== regu) return;
      laporanTersimpan++; shiftAda.add(tgl + '|' + shiftKey(r.shift));
      (r.posFasilitas || []).forEach((p) => (p.items || []).forEach((it) => {
        if (it.bentuk === 'C') { dokTotal++; if (it.lengkap) dokLengkap++; return; }
        // Bentuk A: Rusak & Tidak Digunakan dihitung TERPISAH (satu item bisa kena keduanya
        // sekaligus) — samakan dengan lencana kartu Laporan Tersimpan (ringkasLaporan di
        // fasilitas.html) supaya Total Masalah di rekap cocok dengan yang tersimpan.
        const jenisList = [];
        if (it.bentuk === 'A') {
          if (it.kondisi === 'Rusak') jenisList.push('Rusak');
          if (it.status === 'Tidak Digunakan') jenisList.push('Tidak Digunakan');
        } else if (it.bentuk === 'B' && (it.rusak || 0) > 0) {
          jenisList.push('Rusak');
        }
        if (!jenisList.length) return;
        totalMasalah += jenisList.length;
        const key = (p.name || '') + '|' + (it.name || ''); let e = bermasalah.get(key);
        if (!e) { e = { item: rapikan(it.name), pos: rapikan(p.name), jumlah: 0, jenis: {}, tanggal: [] }; bermasalah.set(key, e); }
        e.jumlah += jenisList.length; e.tanggal.push(tgl);
        jenisList.forEach((jenis) => { e.jenis[jenis] = (e.jenis[jenis] || 0) + 1; if (jenis === 'Tidak Digunakan') tidakDigunakan++; });
      }));
    });
    const dominan = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0][0];
    const daftar = Array.from(bermasalah.values()).map((e) => ({ item: e.item, pos: e.pos, jumlah: e.jumlah, jenis: dominan(e.jenis), tanggal: e.tanggal.sort().reverse() })).sort((a, b) => b.jumlah - a.jumlah || a.item.localeCompare(b.item, 'id'));
    return { totalMasalah, tidakDigunakan, dokTotal, dokLengkap, dokPct: dokTotal > 0 ? Math.round(dokLengkap / dokTotal * 100) : null, laporanTersimpan, shiftAda: shiftAda.size, daftar };
  }

  // Kejadian, GABUNGAN seluruh rentang (tidak dibedakan regu — Kejadian tidak mencatat regu).
  // Store 'laporan' (IndexedDB) memuat DUA jenis laporan (dibedakan field `jenis`): Laporan
  // Kejadian (LK) dan Berita Acara Serah Terima (BAST) — keduanya dihitung & didaftar TERPISAH
  // supaya BAST tidak ikut mencemari statistik "Laporan Kejadian" (LK tidak punya field `jenis`
  // pada data lama, jadi dianggap LK bila field itu kosong).
  function statKejadianRentang(list, startISO, endISO) {
    const semua = (list || []).filter((r) => dalamRentang(r && r.tanggal, startISO, endISO));
    const urutkan = (a, b) => String(b.tanggal).localeCompare(String(a.tanggal)) || String(b.savedAt || '').localeCompare(String(a.savedAt || ''));
    const daftarLK = semua.filter((r) => (r.jenis || 'LK') !== 'BAST').sort(urutkan)
      .map((r) => ({ id: r.id, tanggal: r.tanggal, judul: rapikan(r.caseInfo) || '(tanpa informasi kasus)', shift: rapikan(r.shift) || '-', lokasiKejadian: rapikan(r.lokasiKejadian) || '-', fileNumber: rapikan(r.fileNumber) }));
    const daftarBAST = semua.filter((r) => r.jenis === 'BAST').sort(urutkan)
      .map((r) => ({ id: r.id, tanggal: r.tanggal, kategori: r.kategori || '', pihakSatu: rapikan(r.pihakSatu && r.pihakSatu.nama), pihakDua: rapikan(r.pihakDua && r.pihakDua.nama), nomorBast: rapikan(r.nomorBast) }));
    const bk = bucketRentang(startISO, endISO);
    const trenLK = isiBucket(bk.buckets, daftarLK.map((x) => x.tanggal));
    const trenBAST = isiBucket(bk.buckets, daftarBAST.map((x) => x.tanggal));
    return {
      granularitas: bk.granularitas,
      lk: { jumlah: daftarLK.length, daftar: daftarLK, tren: trenLK },
      bast: { jumlah: daftarBAST.length, daftar: daftarBAST, tren: trenBAST }
    };
  }

  // Kepatuhan pelaporan shift, GABUNGAN 3 jenis (Personel/Fasilitas/Log Book), seluruh rentang.
  // TIDAK dipecah per regu (aplikasi belum punya jadwal dinas — lihat RENCANA-PENGEMBANGAN.md).
  function kepatuhanRentang(personelList, fasilitasList, logbookList, startISO, endISO, hariIni) {
    hariIni = hariIni || new Date();
    const s = pecah(startISO), e = pecah(endISO);
    const bikinSet = (list) => { const set = new Set(); (list || []).forEach((r) => { if (dalamRentang(r && r.tanggal, startISO, endISO)) set.add(r.tanggal + '|' + shiftKey(r.shift)); }); return set; };
    const adaP = bikinSet(personelList), adaF = bikinSet(fasilitasList), adaL = bikinSet(logbookList);
    const now = hariIni.getTime(), daftar = [], cur = new Date(s.y, s.m, s.d), akhir = new Date(e.y, e.m, e.d);
    let cP = 0, cF = 0, cL = 0, totalDinilai = 0;
    while (cur <= akhir) {
      const y = cur.getFullYear(), m = cur.getMonth(), d = cur.getDate();
      [['P', 'Pagi', 20, 0, 0], ['M', 'Malam', 8, 0, 1]].forEach(([k, label, jam, menit, tambahHari]) => {
        const akhirShift = new Date(y, m, d + tambahHari, jam, menit, 0, 0).getTime();
        if (now - akhirShift < 12 * 3600000) return;   // belum jatuh tempo (jeda 12 jam std) -> tidak dinilai sama sekali
        totalDinilai++;
        const tgl = fmtISO(y, m, d), key = tgl + '|' + k, kurang = [];
        if (!adaP.has(key)) { kurang.push('Personel'); cP++; }
        if (!adaF.has(key)) { kurang.push('Fasilitas'); cF++; }
        if (!adaL.has(key)) { kurang.push('Log Book'); cL++; }
        if (kurang.length) daftar.push({ tanggal: tgl, shift: label, kurang });
      });
      cur.setDate(cur.getDate() + 1);
    }
    daftar.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    return { total: totalDinilai, personelBelum: cP, fasilitasBelum: cF, logbookBelum: cL, daftar };
  }

  function statKejadian(list, y, m, hariIni) {
    hariIni = hariIni || new Date();
    const n = hariBulan(y, m), perHari = new Array(n).fill(0);
    const bulanIni = (list || []).filter((r) => { const t = pecah(r && r.tanggal); return t && t.y === y && t.m === m; })
      .sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)) || String(b.savedAt || '').localeCompare(String(a.savedAt || '')));
    bulanIni.forEach((r) => { perHari[pecah(r.tanggal).d - 1]++; });
    const batas = [[1, 7], [8, 14], [15, 21], [22, n]], c = cmpBulan(y, m, hariIni);
    const perMinggu = batas.map(([a, b], i) => ({
      label: 'Mg ' + (i + 1), rentang: a + '–' + b, jumlah: perHari.slice(a - 1, b).reduce((s, v) => s + v, 0),
      masaDepan: c > 0 || (c === 0 && a > hariIni.getDate())
    }));
    const terbaru = bulanIni.slice(0, 4).map((r) => {
      const t = pecah(r.tanggal), jam = ((r.tindakLanjut || []).find((x) => rapikan(x && x.jam)) || {}).jam;
      return { id: r.id, tanggal: r.tanggal, hari: t.d, judul: rapikan(r.caseInfo) || '(tanpa informasi kasus)', penyusun: rapikan(r.preparedBy && r.preparedBy.nama), jam: jam ? String(jam) : '' };
    });
    return { jumlah: bulanIni.length, perHari, perMinggu, terbaru };
  }

  function geser(y, m, d) { const n = y * 12 + m + d; return { y: Math.floor(n / 12), m: ((n % 12) + 12) % 12 }; }

  function rekapBulan(personel, kejadian, y, m, regu, hariIni, mode) {
    hariIni = hariIni || new Date();
    const p = statPersonel(personel, y, m, regu, hariIni, mode), k = statKejadian(kejadian, y, m, hariIni);
    const sb = geser(y, m, -1), pp = statPersonel(personel, sb.y, sb.m, regu, hariIni, mode), kk = statKejadian(kejadian, sb.y, sb.m, hariIni);
    // seri 6 bulan terakhir (termasuk bulan terpilih) untuk grafik mini
    const seri = { tidakHadir: [], kejadian: [], kehadiran: [] };
    for (let i = 5; i >= 0; i--) {
      const g = geser(y, m, -i), sp = statPersonel(personel, g.y, g.m, regu, hariIni, mode), sk = statKejadian(kejadian, g.y, g.m, hariIni);
      seri.tidakHadir.push(sp.tidakHadir); seri.kejadian.push(sk.jumlah); seri.kehadiran.push(sp.kehadiran);
    }
    return {
      y, m, regu: regu || 'all', mode: p.mode, hariBulan: hariBulan(y, m), hariBerjalan: hariBerjalan(y, m, hariIni),
      personel: p, kejadian: k, sebelumnya: { tidakHadir: pp.tidakHadir, kejadian: kk.jumlah, kehadiran: pp.kehadiran, ada: pp.laporan > 0 || kk.jumlah > 0 }, seri
    };
  }

  // ringkasan per bulan dalam satu tahun (untuk pemilih bulan)
  function ringkasTahun(personel, kejadian, y, regu, hariIni, mode) {
    return Array.from({ length: 12 }, (_, m) => { const p = statPersonel(personel, y, m, regu, hariIni, mode), k = statKejadian(kejadian, y, m, hariIni); return { laporan: p.laporan, tidakHadir: p.tidakHadir, kejadian: k.jumlah }; });
  }

  /* ---------- Pembaca data (browser) ---------- */
  function bacaPersonel() { try { const a = JSON.parse(localStorage.getItem('savedReports') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function bacaFasilitas() { try { const a = JSON.parse(localStorage.getItem('savedFasilitas') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function bacaLogbook() { try { const a = JSON.parse(localStorage.getItem('savedLogbook') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function bacaKejadian() {
    return new Promise((res) => {
      if (!root.indexedDB) { res([]); return; }
      let q; try { q = root.indexedDB.open('avsec-kejadian', 2); } catch (e) { res([]); return; }
      q.onupgradeneeded = () => {
        const db = q.result;
        if (!db.objectStoreNames.contains('laporan')) db.createObjectStore('laporan', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('tandatangan')) db.createObjectStore('tandatangan', { keyPath: 'key' });
      };
      q.onerror = () => res([]);
      q.onsuccess = () => {
        try {
          const db = q.result, t = db.transaction('laporan', 'readonly'), r = t.objectStore('laporan').getAll();
          t.oncomplete = () => { db.close(); res((r.result || []).filter((x) => x.id !== '__draft__')); };
          t.onerror = t.onabort = () => { db.close(); res([]); };
        } catch (e) { res([]); }
      };
    });
  }

  const API = { ALASAN, REGU, reguKey, statPersonel, statKejadian, statFasilitas, rekapBulan, ringkasTahun, bacaPersonel, bacaFasilitas, bacaLogbook, bacaKejadian, hariBulan, cmpBulan, geser, shiftKosong, teksPengingatKosong, shiftSebelumnya, shiftKosongGabungan, teksPengingatKosongGabungan, statusPantauPosko, statPersonelRentang, statFasilitasRentang, statKejadianRentang, kepatuhanRentang, bucketRentang };
  root.AVS_DATA = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
