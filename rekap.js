/* =====================================================
   REKAP.JS — Tahap 4: "Lihat Semua Rekap"
   Berbeda dari beranda.js: SEMUA statistik di sini berbasis RENTANG
   TANGGAL bebas (data.js: statPersonelRentang dkk), bukan per-bulan.
   ===================================================== */
(function () {
  'use strict';
  const D = window.AVS_DATA, A = window.AVS, E = A.esc, IC = A.IC, svg = A.svg;
  const $ = (id) => document.getElementById(id);
  const HARI_INI = new Date();
  const WARNA_ALASAN = { 'Cuti Tahunan': '#157A82', 'Sakit': '#C93B2E', 'Izin': '#D98A22', 'Dinas Luar': '#1D3A5C', 'Cuti Alasan Penting': '#4F8A3D', 'Cuti Melahirkan': '#8E5BA8', 'Tanpa Keterangan': '#7A8496', 'Lainnya': '#B9C4D6' };
  // Palet kategorikal tervalidasi (CVD-safe) utk kategori bebas (mis. nama Pos) yang jumlahnya
  // tidak tetap -- urutan TETAP, tidak pernah diputar ulang; lebih dari 8 kategori dilipat ke "Lainnya".
  const WARNA_KATEGORI = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
  const BULAN_PENDEK = A.BULAN_PENDEK;

  let personel = [], fasilitas = [], logbook = [], kejadian = [];
  let RP = null, RF = null, RK = null, RQ = null, filterAktif = { mulai: '', akhir: '', regu: 'all' };

  function toast(msg, tipe, ms) { const t = $('toast'); t.textContent = msg; t.className = 'show ' + (tipe || 'ok'); clearTimeout(toast.t); toast.t = setTimeout(() => { t.className = ''; }, ms || 4200); }
  const pad2 = (n) => String(n).padStart(2, '0');
  const isoHariIni = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const tglPendek = (iso) => iso ? iso.split('-').reverse().join('/') : '-';
  const skalaY = (maxVal) => { const mv = Math.max(4, maxVal), step = mv <= 6 ? 2 : mv <= 12 ? 4 : Math.ceil(mv / 3 / 2) * 2; return { step, max: Math.ceil(mv / step) * step }; };

  /* =========================================================
     RINGKAS TANGGAL: gabungkan tanggal berurutan (>2 hari, bulan sama)
     jadi rentang "1-5 Sep 26"; selebihnya ditulis satuan "3 Sep 26".
     ========================================================= */
  function labelTunggal(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return `${d} ${BULAN_PENDEK[m - 1]} ${String(y).slice(-2)}`;
  }
  function labelRentang(isoAwal, isoAkhir) {
    const [y, m, dAwal] = isoAwal.split('-').map(Number), dAkhir = +isoAkhir.split('-')[2];
    return `${dAwal}-${dAkhir} ${BULAN_PENDEK[m - 1]} ${String(y).slice(-2)}`;
  }
  // Benar-benar H+1 kalender (bukan cuma selisih string) & masih di bulan yang sama.
  function berurutanSebulan(isoA, isoB) {
    const [yA, mA, dA] = isoA.split('-').map(Number), [yB, mB] = isoB.split('-').map(Number);
    if (yA !== yB || mA !== mB) return false;
    return (new Date(yB, mB - 1, +isoB.split('-')[2]) - new Date(yA, mA - 1, dA)) === 86400000;
  }
  function ringkasTanggalList(isoArray) {
    const uniq = Array.from(new Set((isoArray || []).filter(Boolean))).sort();
    if (!uniq.length) return '-';
    const parts = [];
    let i = 0;
    while (i < uniq.length) {
      let j = i;
      while (j + 1 < uniq.length && berurutanSebulan(uniq[j], uniq[j + 1])) j++;
      if (j - i + 1 > 2) parts.push(labelRentang(uniq[i], uniq[j]));
      else for (let k = i; k <= j; k++) parts.push(labelTunggal(uniq[k]));
      i = j + 1;
    }
    return parts.join(', ');
  }

  /* =========================================================
     GRAFIK BATANG TREN (harian/mingguan/bulanan)
     Digambar sesuai ukuran kartu sebenarnya agar memenuhi lebar & tinggi kartu.
     ========================================================= */
  const UNIT = { harian: 'Hari', mingguan: 'Minggu', bulanan: 'Bulan' };
  const grafikTren = {};
  function wadahGrafikTren(id, bucket, warna) {
    grafikTren[id] = { bucket, warna };
    return `<div class="grafik-tren" id="${id}"></div>`;
  }
  // Tren dua seri berdampingan per bucket (mis. LK & BAST) - dipakai blok Laporan Kejadian.
  function wadahGrafikTrenDua(id, bucketA, bucketB, warnaA, warnaB) {
    grafikTren[id] = { dual: true, bucketA, bucketB, warnaA, warnaB };
    return `<div class="grafik-tren" id="${id}"></div>`;
  }
  function svgBatang(d, warna, W, H) {
    if (!d || !d.length) return '<div class="empty">Belum ada data.</div>';
    const padL = 30, padR = 6, top = 16, base = H - 20, n = d.length;
    const slot = (W - padL - padR) / n, bw = Math.max(3, Math.min(44, slot * 0.64));
    const sk = skalaY(Math.max(0, ...d.map((x) => x.jumlah)));
    const lebarLabel = Math.max(...d.map((x) => String(x.label).length)) * 6 + 6, tiapLabel = Math.max(1, Math.ceil(lebarLabel / slot));
    let s = '';
    for (let g = 0; g <= sk.max; g += sk.step) { const y = base - g / sk.max * (base - top); s += `<line x1="${padL - 4}" x2="${W - padR}" y1="${y}" y2="${y}" stroke="#E9EDF4"/><text x="${padL - 8}" y="${y + 3.5}" text-anchor="end" font-size="9" fill="#8A94A6" font-weight="600">${g}</text>`; }
    d.forEach((w, i) => {
      const cx = padL + slot * (i + 0.5), x = cx - bw / 2, h = w.jumlah / sk.max * (base - top);
      const judul = `<title>${E(w.mulai === w.akhir ? tglPendek(w.mulai) : tglPendek(w.mulai) + ' s.d. ' + tglPendek(w.akhir))}: ${w.jumlah}</title>`;
      s += w.jumlah === 0
        ? `<rect x="${x}" y="${base - 2}" width="${bw}" height="2" rx="1" fill="#D5DCE7">${judul}</rect>`
        : `<rect x="${x}" y="${base - h}" width="${bw}" height="${h}" rx="${Math.min(3, bw / 3)}" fill="${warna}">${judul}</rect>` + (slot >= 12 ? `<text x="${cx}" y="${base - h - 4}" text-anchor="middle" font-size="10" font-weight="800" fill="#10243D">${w.jumlah}</text>` : '');
      if (i % tiapLabel === 0) s += `<text x="${cx}" y="${base + 13}" text-anchor="middle" font-size="9" font-weight="700" fill="#5C6675">${E(w.label)}</text>`;
    });
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${s}</svg>`;
  }
  // Sama seperti svgBatang, tapi dua batang berdampingan per titik (dua seri dibandingkan langsung).
  function svgBatangDua(dA, dB, warnaA, warnaB, W, H) {
    if (!dA || !dA.length) return '<div class="empty">Belum ada data.</div>';
    const padL = 30, padR = 6, top = 16, base = H - 20, n = dA.length;
    const slot = (W - padL - padR) / n, bw = Math.max(2, Math.min(18, slot * 0.26)), gap = Math.max(2, bw * 0.3);
    const sk = skalaY(Math.max(0, ...dA.map((x) => x.jumlah), ...dB.map((x) => x.jumlah)));
    const lebarLabel = Math.max(...dA.map((x) => String(x.label).length)) * 6 + 6, tiapLabel = Math.max(1, Math.ceil(lebarLabel / slot));
    let s = '';
    for (let g = 0; g <= sk.max; g += sk.step) { const y = base - g / sk.max * (base - top); s += `<line x1="${padL - 4}" x2="${W - padR}" y1="${y}" y2="${y}" stroke="#E9EDF4"/><text x="${padL - 8}" y="${y + 3.5}" text-anchor="end" font-size="9" fill="#8A94A6" font-weight="600">${g}</text>`; }
    dA.forEach((wA, i) => {
      const wB = dB[i], cx = padL + slot * (i + 0.5), xA = cx - gap / 2 - bw, xB = cx + gap / 2;
      const hA = wA.jumlah / sk.max * (base - top), hB = wB.jumlah / sk.max * (base - top);
      const rentang = E(wA.mulai === wA.akhir ? tglPendek(wA.mulai) : tglPendek(wA.mulai) + ' s.d. ' + tglPendek(wA.akhir));
      const judul = `<title>${rentang}: LK ${wA.jumlah}, BAST ${wB.jumlah}</title>`;
      s += hA === 0 ? `<rect x="${xA}" y="${base - 2}" width="${bw}" height="2" rx="1" fill="#D5DCE7">${judul}</rect>` : `<rect x="${xA}" y="${base - hA}" width="${bw}" height="${hA}" rx="${Math.min(2, bw / 3)}" fill="${warnaA}">${judul}</rect>`;
      s += hB === 0 ? `<rect x="${xB}" y="${base - 2}" width="${bw}" height="2" rx="1" fill="#D5DCE7">${judul}</rect>` : `<rect x="${xB}" y="${base - hB}" width="${bw}" height="${hB}" rx="${Math.min(2, bw / 3)}" fill="${warnaB}">${judul}</rect>`;
      if (i % tiapLabel === 0) s += `<text x="${cx}" y="${base + 13}" text-anchor="middle" font-size="9" font-weight="700" fill="#5C6675">${E(wA.label)}</text>`;
    });
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${s}</svg>`;
  }
  function gambarGrafikTren() {
    Object.keys(grafikTren).forEach((id) => {
      const el = $(id); if (!el || !el.clientWidth) return;
      const g = grafikTren[id];
      el.innerHTML = g.dual ? svgBatangDua(g.bucketA, g.bucketB, g.warnaA, g.warnaB, el.clientWidth, el.clientHeight) : svgBatang(g.bucket, g.warna, el.clientWidth, el.clientHeight);
    });
  }
  let rafResize = 0;
  window.addEventListener('resize', () => { cancelAnimationFrame(rafResize); rafResize = requestAnimationFrame(gambarGrafikTren); });
  function grafikDonat(alasanList) {
    if (!alasanList.length) return null;
    const data = {}; alasanList.forEach((x) => { data[x.alasan] = (data[x.alasan] || 0) + 1; });
    const arr = Object.entries(data).map(([nama, jumlah]) => ({ nama, jumlah })).sort((a, b) => b.jumlah - a.jumlah);
    const tot = arr.reduce((a, b) => a + b.jumlah, 0), Ro = 56, ri = 37, cx = 62, cy = 62; let a0 = -Math.PI / 2, paths = '';
    if (arr.length === 1) paths = `<circle cx="${cx}" cy="${cy}" r="${(Ro + ri) / 2}" fill="none" stroke="${WARNA_ALASAN[arr[0].nama] || '#B9C4D6'}" stroke-width="${Ro - ri}"/>`;
    else arr.forEach((d) => {
      const ang = (d.jumlah / tot) * Math.PI * 2, a1 = a0 + ang - 0.025, lg = (a1 - a0) > Math.PI ? 1 : 0;
      const p = (rad, an) => [cx + rad * Math.cos(an), cy + rad * Math.sin(an)];
      const [x0, y0] = p(Ro, a0), [x1, y1] = p(Ro, a1), [x2, y2] = p(ri, a1), [x3, y3] = p(ri, a0);
      paths += `<path d="M${x0} ${y0} A${Ro} ${Ro} 0 ${lg} 1 ${x1} ${y1} L${x2} ${y2} A${ri} ${ri} 0 ${lg} 0 ${x3} ${y3}Z" fill="${WARNA_ALASAN[d.nama] || '#B9C4D6'}"/>`; a0 += ang;
    });
    const svgD = `<svg width="124" height="124" viewBox="0 0 124 124">${paths}<text x="62" y="63" text-anchor="middle" font-size="24" font-weight="800" fill="#10243D">${tot}</text><text x="62" y="78" text-anchor="middle" font-size="10" font-weight="700" fill="#5C6675">hari</text></svg>`;
    const leg = arr.map((d) => `<div><i style="background:${WARNA_ALASAN[d.nama] || '#B9C4D6'}"></i>${E(d.nama)}<b>${d.jumlah}</b><u>${Math.round(d.jumlah / tot * 100)}%</u></div>`).join('');
    return `<div class="donutwrap">${svgD}<div class="dl">${leg}</div></div>`;
  }
  // Donat "Masalah per Pos" -- jumlah masalah fasilitas dikelompokkan per lokasi/pos. Lebih dari
  // 8 pos berbeda dilipat jadi "Lainnya" (tidak pernah membuat warna kategorikal baru di luar palet).
  function grafikDonatPos(daftarFasilitas) {
    if (!daftarFasilitas.length) return null;
    const data = {}; daftarFasilitas.forEach((x) => { data[x.pos] = (data[x.pos] || 0) + x.jumlah; });
    let arr = Object.entries(data).map(([nama, jumlah]) => ({ nama, jumlah })).sort((a, b) => b.jumlah - a.jumlah);
    if (arr.length > 8) {
      const sisa = arr.slice(7).reduce((a, b) => a + b.jumlah, 0);
      arr = arr.slice(0, 7).concat([{ nama: 'Lainnya', jumlah: sisa }]);
    }
    const warna = {}; arr.forEach((d, i) => { warna[d.nama] = WARNA_KATEGORI[i] || '#B9C4D6'; });
    const tot = arr.reduce((a, b) => a + b.jumlah, 0), Ro = 56, ri = 37, cx = 62, cy = 62; let a0 = -Math.PI / 2, paths = '';
    if (arr.length === 1) paths = `<circle cx="${cx}" cy="${cy}" r="${(Ro + ri) / 2}" fill="none" stroke="${warna[arr[0].nama]}" stroke-width="${Ro - ri}"/>`;
    else arr.forEach((d) => {
      const ang = (d.jumlah / tot) * Math.PI * 2, a1 = a0 + ang - 0.025, lg = (a1 - a0) > Math.PI ? 1 : 0;
      const p = (rad, an) => [cx + rad * Math.cos(an), cy + rad * Math.sin(an)];
      const [x0, y0] = p(Ro, a0), [x1, y1] = p(Ro, a1), [x2, y2] = p(ri, a1), [x3, y3] = p(ri, a0);
      paths += `<path d="M${x0} ${y0} A${Ro} ${Ro} 0 ${lg} 1 ${x1} ${y1} L${x2} ${y2} A${ri} ${ri} 0 ${lg} 0 ${x3} ${y3}Z" fill="${warna[d.nama]}"/>`; a0 += ang;
    });
    const svgD = `<svg width="124" height="124" viewBox="0 0 124 124">${paths}<text x="62" y="63" text-anchor="middle" font-size="24" font-weight="800" fill="#10243D">${tot}</text><text x="62" y="78" text-anchor="middle" font-size="10" font-weight="700" fill="#5C6675">kali</text></svg>`;
    const leg = arr.map((d) => `<div><i style="background:${warna[d.nama]}"></i>${E(d.nama)}<b>${d.jumlah}</b><u>${Math.round(d.jumlah / tot * 100)}%</u></div>`).join('');
    return `<div class="donutwrap">${svgD}<div class="dl">${leg}</div></div>`;
  }
  // "Kepatuhan Grup" -- SETIAP grup dihitung SENDIRI-SENDIRI (bukan lagi satu donat gabungan):
  // kepatuhan Grup X = (jumlah shift grup X yang dinilai - jumlah shift grup X yang belum
  // lengkap) / jumlah shift grup X yang dinilai. Kalau shift belum lengkap pada grup itu kosong
  // -> cincinnya 100%. Grup yang di rentang ini tidak kebagian shift sama sekali (data Jadwal
  // Dinas) ditandai "-" (abu-abu), bukan 0%, supaya tidak disalahartikan sbg "sama sekali tidak
  // patuh" padahal datanya memang belum ada.
  // Ukuran cincin "auto-fit" mengikuti ruang yang tersedia (height:100%;width:auto, viewBox
  // bujur sangkar jadi lebar ikut proporsional) -- BUKAN ukuran tetap lagi -- supaya donat
  // membesar memenuhi luas kartu, tapi kartunya sendiri (c4 rauto) sudah dibatasi CSS Grid
  // stretch supaya tingginya tidak pernah melebihi kartu "Daftar Shift Belum Lengkap" di
  // sampingnya (rauto jg, baris grid yg sama) -- jadi otomatis tidak akan melebihi itu.
  function cincinKepatuhan(grup, pct, warna, adaData) {
    const R = 30, lebar = 8, cx = 36, cy = 36, keliling = 2 * Math.PI * R;
    const dash = adaData ? Math.max(0, Math.min(1, pct / 100)) * keliling : 0;
    return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:0;height:100%;width:100%">
<div style="flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center">
<svg viewBox="0 0 72 72" style="width:auto;height:auto;max-width:100%;max-height:100%;display:block">
<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#E9EDF4" stroke-width="${lebar}"/>
<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${warna}" stroke-width="${lebar}" stroke-linecap="round" stroke-dasharray="${dash} ${keliling}" transform="rotate(-90 ${cx} ${cy})"/>
<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="15" font-weight="800" fill="#10243D">${adaData ? pct + '%' : '-'}</text>
</svg>
</div>
<div style="font-size:11px;font-weight:700;color:#1A2233;display:flex;align-items:center;gap:5px;white-space:nowrap;flex:none"><i style="width:8px;height:8px;border-radius:2px;background:${warna};flex:none"></i>Grup ${E(grup)}</div>
</div>`;
  }
  function grafikKepatuhanPerGrup(totalPerGrup, belumPerGrup, takTerpetakan, warnaMap) {
    const cincin = D.REGU.map((g) => {
      const total = totalPerGrup[g], blm = belumPerGrup[g], adaData = total > 0;
      const pct = adaData ? Math.round((total - blm) / total * 100) : 0;
      return cincinKepatuhan(g, pct, warnaMap[g], adaData);
    }).join('');
    const catatanTak = takTerpetakan > 0 ? `<div style="font-size:10px;color:#8A94A6;font-weight:600;text-align:center;flex:none">${takTerpetakan} shift belum lengkap regu-nya tak terpetakan</div>` : '';
    return `<div style="display:flex;flex-direction:column;flex:1;min-height:0;gap:8px">
<div style="flex:1;min-height:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:6px 8px">${cincin}</div>
${catatanTak}
</div>`;
  }

  /* =========================================================
     BLOK PERSONEL
     ========================================================= */
  // Hitung jumlah hari per alasan dari tanggal[] milik satu personel: { "Sakit": 3, "Cuti Tahunan": 2 }
  function hitungAlasan(tanggalArray) {
    const counts = {};
    (tanggalArray || []).forEach((item) => { counts[item.alasan] = (counts[item.alasan] || 0) + 1; });
    return counts;
  }
  // Render badge "Alasan (N)" untuk kolom tabel, urutan sesuai konstanta ALASAN standar
  function formatAlasanBadges(tanggalArray) {
    const counts = hitungAlasan(tanggalArray);
    return Object.keys(counts)
      .sort((a, b) => D.ALASAN.indexOf(a) - D.ALASAN.indexOf(b))
      .map((alasan) => { const w = WARNA_ALASAN[alasan] || '#B9C4D6'; return `<span class="tag" style="background:${w}1A;color:${w}">${E(alasan)} (${counts[alasan]})</span>`; })
      .join(' ');
  }
  // Group tanggal[] per alasan (tanggal digabung, urut ASC), urutan grup sesuai ALASAN standar
  function kelompokkanTanggal(tanggalArray) {
    const grouped = {};
    (tanggalArray || []).forEach((item) => { (grouped[item.alasan] || (grouped[item.alasan] = [])).push(item.tgl); });
    Object.values(grouped).forEach((arr) => arr.reverse());
    return Object.keys(grouped)
      .sort((a, b) => D.ALASAN.indexOf(a) - D.ALASAN.indexOf(b))
      .map((alasan) => ({ alasan, tanggal: grouped[alasan] }));
  }
  // Kolom "Tanggal" tabel Personel: satu tag per alasan (titik warna sama dengan badge Alasan di
  // kolom sebelumnya), isinya tanggal yang sudah diringkas (ringkasTanggalList).
  function selTanggalPersonel(tanggalArray) {
    return kelompokkanTanggal(tanggalArray).map((g) => {
      const warna = WARNA_ALASAN[g.alasan] || '#B9C4D6';
      return `<span class="tgi"><i style="background:${warna}"></i>${E(ringkasTanggalList(g.tanggal))}</span>`;
    }).join('');
  }
  function tabelPersonel(daftar) {
    const rows = daftar;
    if (!rows.length) return '<div class="empty">Belum ada data ketidakhadiran<br>pada rentang ini.</div>';
    const trs = rows.map((x, i) => `<tr><td>${i + 1}</td><td class="nm">${E(x.nama.toUpperCase())}</td><td><b>${x.jumlah}</b></td><td>${formatAlasanBadges(x.tanggal)}</td><td class="col-tgl">${selTanggalPersonel(x.tanggal)}</td></tr>`).join('');
    return `<table class="rtbl"><thead><tr><th>#</th><th>Nama</th><th>Hari</th><th>Alasan (N Hari)</th><th>Tanggal</th></tr></thead><tbody>${trs}</tbody></table>`;
  }
  function renderPersonel() {
    const r = RP;
    $('kpiPersonel').innerHTML = `
<div class="kpi" style="--acc:#C93B2E;--acc-bg:#FBE9E7;height:96px"><div class="lbl">Personel Tidak Hadir</div><div class="val">${r.tidakHadir}<small>hari</small></div><div class="ico">${svg(IC.people)}</div></div>
<div class="kpi" style="--acc:#D98A22;--acc-bg:#FCF1DF;height:96px"><div class="lbl">Personel Terlibat</div><div class="val">${r.orangTerlibat}<small>orang</small></div><div class="ico">${svg(IC.people)}</div></div>
<div class="kpi" style="--acc:#157A82;--acc-bg:#E4F3F4;height:96px"><div class="lbl">Rata-rata Kehadiran</div><div class="val">${r.kehadiran == null ? '-' : r.kehadiran.toFixed(1)}<small>${r.kehadiran == null ? '' : '%'}</small></div><div class="ico">${svg(IC.doc)}</div></div>
<div class="kpi" style="--acc:#1D3A5C;--acc-bg:#E6ECF4;height:96px"><div class="lbl">Laporan Tersimpan</div><div class="val">${r.laporanTersimpan}<small>laporan</small></div><div class="ico">${svg(IC.doc)}</div></div>`;
    $('rowPersonel1').innerHTML = `
<div class="dcard c6 r250"><div class="h"><div><h3>Tren Ketidakhadiran per ${UNIT[r.granularitas]}</h3><div class="sub">Rentang terpilih</div></div></div>${wadahGrafikTren('grafikTrenPersonel', r.tren, '#7FB9BE')}</div>
<div class="dcard c6 r250"><div class="h"><div><h3>Alasan Ketidakhadiran</h3><div class="sub">Komposisi rentang terpilih</div></div></div>${grafikDonat(r.daftar.flatMap((x) => x.tanggal)) || '<div class="empty">Belum ada data<br>pada rentang ini.</div>'}</div>`;
    $('rowPersonel2').innerHTML = `<div class="dcard c12 rauto"><div class="h"><div><h3>Ketidakhadiran per Personel</h3><div class="sub">${r.daftar.length} personel &bull; diurutkan dari yang terbanyak</div></div></div>${tabelPersonel(r.daftar)}</div>`;
  }

  /* =========================================================
     BLOK FASILITAS
     ========================================================= */
  function tabelFasilitas(daftar) {
    const rows = daftar;
    if (!rows.length) return '<div class="empty">Belum ada masalah fasilitas<br>dilaporkan pada rentang ini.</div>';
    const warna = (j) => j === 'Rusak' ? '#A82F24' : '#9A5F12', bg = (j) => j === 'Rusak' ? '#FBE9E7' : '#FCF1DF';
    const trs = rows.map((x, i) => `<tr><td>${i + 1}</td><td class="nm">${E(x.item)}</td><td>${E(x.pos)}</td><td><b>${x.jumlah}</b></td><td><span class="tag" style="background:${bg(x.jenis)};color:${warna(x.jenis)}">${E(x.jenis)}</span></td><td class="col-tgl"><span class="tgi"><i style="background:#8A94A6"></i>${E(ringkasTanggalList(x.tanggal))}</span></td></tr>`).join('');
    return `<table class="rtbl"><thead><tr><th>#</th><th>Item</th><th>Pos</th><th>Kali</th><th>Jenis</th><th>Tanggal</th></tr></thead><tbody>${trs}</tbody></table>`;
  }
  function renderFasilitas() {
    const r = RF;
    $('kpiFasilitas').innerHTML = `
<div class="kpi" style="--acc:#A82F24;--acc-bg:#FBE9E7;height:96px"><div class="lbl">Total Masalah</div><div class="val">${r.totalMasalah}<small>kali</small></div><div class="ico"><svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21z"/></svg></div></div>
<div class="kpi" style="--acc:#9A5F12;--acc-bg:#FCF1DF;height:96px"><div class="lbl">Tidak Digunakan</div><div class="val">${r.tidakDigunakan}<small>kali</small></div><div class="ico"><svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21z"/></svg></div></div>
<div class="kpi" style="--acc:#157A82;--acc-bg:#E4F3F4;height:96px"><div class="lbl">Kelengkapan Dokumen</div><div class="val">${r.dokPct == null ? '-' : r.dokPct}<small>${r.dokPct == null ? '' : '%'}</small></div><div class="ico">${svg(IC.doc)}</div></div>
<div class="kpi" style="--acc:#1D3A5C;--acc-bg:#E6ECF4;height:96px"><div class="lbl">Laporan Tersimpan</div><div class="val">${r.laporanTersimpan}<small>laporan</small></div><div class="ico">${svg(IC.doc)}</div></div>`;
    $('rowFasilitasTren').innerHTML = `
<div class="dcard c6 r250"><div class="h"><div><h3>Tren Masalah Fasilitas per ${UNIT[r.granularitas]}</h3><div class="sub">Rentang terpilih</div></div></div>${wadahGrafikTren('grafikTrenFasilitas', r.tren, '#D9A24B')}</div>
<div class="dcard c6 r250"><div class="h"><div><h3>Masalah per Pos</h3><div class="sub">Komposisi rentang terpilih</div></div></div>${grafikDonatPos(r.daftar) || '<div class="empty">Belum ada masalah fasilitas<br>pada rentang ini.</div>'}</div>`;
    $('rowFasilitas1').innerHTML = `<div class="dcard c12 rauto"><div class="h"><div><h3>Alat Bermasalah</h3><div class="sub">${r.daftar.length} item &bull; diurutkan dari yang terbanyak</div></div></div>${tabelFasilitas(r.daftar)}</div>`;
  }

  /* =========================================================
     BLOK KEJADIAN (Laporan Kejadian / LK & Berita Acara Serah Terima / BAST, dipisah)
     ========================================================= */
  // Label kategori BAST dari KATEGORI_BAST (kejadian-bast-data.js) - dimuat sebagai <script>
  // terpisah di rekap.html, terlihat di sini sebagai variabel bebas lintas-<script> (bukan lewat
  // window.KATEGORI_BAST, yang tidak ada karena deklarasinya "const" - lihat catatan yang sama
  // di kejadian-bast-pdf.js).
  function labelKategoriBast(kat) {
    const K = (typeof KATEGORI_BAST !== 'undefined') ? KATEGORI_BAST : {};
    return (K[kat] && K[kat].label) || 'Lainnya';
  }
  function ringkasBast(x) { return `${labelKategoriBast(x.kategori)} \u2014 ${x.pihakSatu || '-'} \u2192 ${x.pihakDua || '-'}`; }

  function tabelKejadianLK(daftar) {
    const rows = daftar;
    if (!rows.length) return '<div class="empty">Belum ada laporan kejadian<br>pada rentang ini.</div>';
    const trs = rows.map((x, i) => `<tr><td>${i + 1}</td><td class="nm"><a href="kejadian.html#ubah=${encodeURIComponent(x.id)}" style="color:inherit;text-decoration:none">${E(x.judul)}</a></td><td style="white-space:nowrap"><b>${E(tglPendek(x.tanggal))}</b></td></tr>`).join('');
    return `<table class="rtbl"><thead><tr><th>No</th><th>Laporan Kejadian</th><th>Tanggal</th></tr></thead><tbody>${trs}</tbody></table>`;
  }
  function tabelKejadianBAST(daftar) {
    const rows = daftar;
    if (!rows.length) return '<div class="empty">Belum ada BAST<br>pada rentang ini.</div>';
    const trs = rows.map((x, i) => `<tr><td>${i + 1}</td><td class="nm"><a href="kejadian.html#ubah=${encodeURIComponent(x.id)}" style="color:inherit;text-decoration:none">${E(ringkasBast(x))}</a></td><td style="white-space:nowrap"><b>${E(tglPendek(x.tanggal))}</b></td></tr>`).join('');
    return `<table class="rtbl"><thead><tr><th>No</th><th>Serah Terima</th><th>Tanggal</th></tr></thead><tbody>${trs}</tbody></table>`;
  }
  function renderKejadian() {
    const r = RK, unitLabel = UNIT[r.granularitas];
    // KPI disederhanakan jadi 2 kartu (Jumlah LK, Jumlah BAST) dgn gaya ".kpi" standar yang sama
    // dgn blok Personel/Fasilitas -- lebih konsisten lintas blok dibanding gaya ".kpi2" lama,
    // dan warna aksen disamakan dgn .jenis-tag.lk/.bast yang sudah dipakai di tabel di bawahnya.
    $('kpiKejadian').style.gridTemplateColumns = 'repeat(2, 1fr)';
    $('kpiKejadian').innerHTML = `
<div class="kpi" style="--acc:#1D3A5C;--acc-bg:#E6ECF4;height:96px"><div class="lbl">Laporan Kejadian (LK)</div><div class="val">${r.lk.jumlah}<small>kasus</small></div><div class="ico">${svg(IC.doc)}</div></div>
<div class="kpi" style="--acc:#0F5F52;--acc-bg:#E4F3F4;height:96px"><div class="lbl">Serah Terima (BAST)</div><div class="val">${r.bast.jumlah}<small>BAST</small></div><div class="ico">${svg(IC.doc)}</div></div>`;
    $('rowKejadian1').innerHTML = `
<div class="dcard c12 rauto"><div class="h"><div><h3>Tren Laporan per ${unitLabel}</h3><div class="sub">Rentang terpilih</div></div><div class="sp"></div><div class="tren-legend"><span><i style="background:#E58A80"></i>LK</span><span><i style="background:#7FB9BE"></i>BAST</span></div></div>${wadahGrafikTrenDua('grafikTrenKejadian', r.lk.tren, r.bast.tren, '#E58A80', '#7FB9BE')}</div>
<div class="dcard c6 rauto"><div class="h"><div><h3>Daftar Laporan Kejadian</h3><div class="sub">${r.lk.daftar.length} laporan \u2022 klik untuk membuka laporan</div></div></div>${tabelKejadianLK(r.lk.daftar)}</div>
<div class="dcard c6 rauto"><div class="h"><div><h3>Daftar Serah Terima</h3><div class="sub">${r.bast.daftar.length} BAST \u2022 klik untuk membuka laporan</div></div></div>${tabelKejadianBAST(r.bast.daftar)}</div>`;
  }

  /* =========================================================
     BLOK KEPATUHAN
     ========================================================= */
  function reguBertugasJadwal(tanggalISO, shiftLabel) {
    const kode = shiftLabel === 'Pagi' ? 'P' : shiftLabel === 'Malam' ? 'M' : null;
    if (!kode) return null;
    let semua; try { semua = JSON.parse(localStorage.getItem('savedJadwalDinas') || '{}'); } catch (e) { return null; }
    const data = semua[tanggalISO.slice(0, 7)]; if (!data || !data.units) return null;
    const unit = data.units.find((u) => u.punyaGrup && /ORGANIK/i.test(u.nama)) || data.units.find((u) => u.punyaGrup);
    if (!unit) return null;
    const PETA = { ALPHA: 'A', BRAVO: 'B', CHARLIE: 'C', DELTA: 'D' };
    for (const g of unit.grup) {
      if (!g.orang.length) continue;
      const cnt = {};
      g.orang.forEach((o) => { const k = (o.jadwal && o.jadwal[tanggalISO]) || '-'; cnt[k] = (cnt[k] || 0) + 1; });
      const kodeUtama = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
      if (kodeUtama === kode) { const nama = String(g.nama || '').toUpperCase(); return PETA[nama] || nama.slice(0, 1) || null; }
    }
    return null;
  }
  // Tabel "Daftar Shift Belum Lengkap", pola sama seperti tabelPersonel: satu baris per
  // kategori (di sini Grup x Jenis Laporan, bukan per orang), kolom Tanggal berisi tanggal yang
  // sudah diringkas (ringkasTanggalList) -- dibatasi 4 grup x 3 jenis = 12 baris tetap, supaya
  // TIDAK memanjang ke bawah seiring bertambahnya jumlah shift seperti versi lama (1 baris/shift).
  function tabelKepatuhanGrup(daftar, warnaMap) {
    const JENIS = ['Personel', 'Fasilitas', 'Log Book'];
    const warnaJenis = { 'Personel': '#1D3A5C', 'Fasilitas': '#9A5F12', 'Log Book': '#A82F24' };
    const bgJenis = { 'Personel': '#E6ECF4', 'Fasilitas': '#FCF1DF', 'Log Book': '#FBE9E7' };
    const data = D.REGU.map((g) => ({ grup: g, jenis: JENIS.map((j) => ({ nama: j, tanggal: daftar.filter((x) => x.regu === g && x.kurang.includes(j)).map((x) => x.tanggal) })) }));
    if (!data.some((g) => g.jenis.some((j) => j.tanggal.length))) return '<div class="empty">Semua shift pada rentang ini<br>sudah lengkap dilaporkan.</div>';
    const trs = [];
    data.forEach((g, gi) => {
      g.jenis.forEach((j, ji) => {
        const b = ji === 0 && gi > 0 ? ' style="border-top:2px solid #E3E8F0"' : '';
        const grupTd = ji === 0 ? `<td class="nm" rowspan="3"${b}><span class="tgi"><i style="background:${warnaMap[g.grup]}"></i>Grup ${E(g.grup)}</span></td>` : '';
        trs.push(`<tr>${grupTd}<td${b}><span class="tag" style="background:${bgJenis[j.nama]};color:${warnaJenis[j.nama]}">${E(j.nama)}</span></td><td${b}>${j.tanggal.length ? E(ringkasTanggalList(j.tanggal)) : '<span style="color:#C7CEDA">&ndash;</span>'}</td></tr>`);
      });
    });
    return `<table class="rtbl"><thead><tr><th>Grup</th><th>Laporan</th><th>Tanggal</th></tr></thead><tbody>${trs.join('')}</tbody></table>`;
  }
  function renderKepatuhan() {
    const r = RQ;
    // 3 KPI sama lebar (kisi 3 kolom KHUSUS baris ini, terpisah dari .kpis yang default 4 kolom)
    $('kpiKepatuhan').style.gridTemplateColumns = 'repeat(3, 1fr)';
    $('kpiKepatuhan').innerHTML = `
<div class="kpi" style="--acc:#157A82;--acc-bg:#E4F3F4;height:96px"><div class="lbl">Personel Belum Diisi</div><div class="val">${r.personelBelum}<small>/ ${r.total} shift</small></div><div class="ico">${svg(IC.people)}</div></div>
<div class="kpi" style="--acc:#9A5F12;--acc-bg:#FCF1DF;height:96px"><div class="lbl">Fasilitas Belum Diisi</div><div class="val">${r.fasilitasBelum}<small>/ ${r.total} shift</small></div><div class="ico"><svg viewBox="0 0 24 24"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6l-3 3-4.3-4.3C.6 7.1 1 10.1 3 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.4-.5.4-1.1 0-1.4z"/></svg></div></div>
<div class="kpi" style="--acc:#A82F24;--acc-bg:#FBE9E7;height:96px"><div class="lbl">Log Book Belum Diisi</div><div class="val">${r.logbookBelum}<small>/ ${r.total} shift</small></div><div class="ico">${svg(IC.doc)}</div></div>`;
    // "Kepatuhan Grup" -- lihat catatan logika baru di grafikKepatuhanPerGrup(): tiap grup
    // dihitung sendiri-sendiri. Regu tiap baris sudah dipetakan dari Jadwal Dinas di
    // hitungUlang() (reguBertugasJadwal); baris yang regu-nya tidak ketemu (jadwal belum
    // diunggah utk bulan itu) dihitung terpisah sbg "tak terpetakan", tidak masuk ke grup manapun.
    const WARNA_GRUP = { A: '#2a78d6', B: '#eb6834', C: '#1baf7a', D: '#eda100' };
    const belumPerGrup = { A: 0, B: 0, C: 0, D: 0 }, totalPerGrup = { A: 0, B: 0, C: 0, D: 0 };
    let takTerpetakan = 0;
    r.daftar.forEach((x) => { if (belumPerGrup[x.regu] !== undefined) belumPerGrup[x.regu]++; else takTerpetakan++; });
    r.semuaShift.forEach((x) => { if (totalPerGrup[x.regu] !== undefined) totalPerGrup[x.regu]++; });
    const isiDonatGrup = r.total > 0
      ? grafikKepatuhanPerGrup(totalPerGrup, belumPerGrup, takTerpetakan, WARNA_GRUP)
      : '<div class="empty">Belum ada shift yang dinilai<br>pada rentang ini.</div>';
    $('rowKepatuhan1').innerHTML = `
<div class="dcard c4 rauto"><div class="h"><div><h3>Kepatuhan Grup</h3><div class="sub">Kepatuhan tiap grup dihitung sendiri-sendiri</div></div></div>${isiDonatGrup}</div>
<div class="dcard c8 rauto"><div class="h"><div><h3>Daftar Shift Belum Lengkap</h3><div class="sub">Dikelompokkan per grup &amp; jenis laporan</div></div></div>${tabelKepatuhanGrup(r.daftar, WARNA_GRUP)}</div>`;
  }

  /* =========================================================
     FILTER
     ========================================================= */
  function terapkanFilter() {
    const mulai = $('fMulai').value, akhir = $('fAkhir').value, regu = $('fRegu').value;
    if (!mulai || !akhir) { toast('Lengkapi tanggal mulai dan akhir.', 'err'); return; }
    if (mulai > akhir) { toast('Tanggal mulai tidak boleh setelah tanggal akhir.', 'err'); return; }
    filterAktif = { mulai, akhir, regu };
    hitungUlang(); renderSemua();
  }
  function hitungUlang() {
    const { mulai, akhir, regu } = filterAktif;
    RP = D.statPersonelRentang(personel, mulai, akhir, regu);
    RF = D.statFasilitasRentang(fasilitas, mulai, akhir, regu);
    RK = D.statKejadianRentang(kejadian, mulai, akhir);
    RQ = D.kepatuhanRentang(personel, fasilitas, logbook, mulai, akhir, HARI_INI);
    RQ.daftar.forEach((x) => { x.regu = reguBertugasJadwal(x.tanggal, x.shift); });
    RQ.semuaShift.forEach((x) => { x.regu = reguBertugasJadwal(x.tanggal, x.shift); });
    if (regu !== 'all') { RQ.daftar = RQ.daftar.filter((x) => x.regu === regu); RQ.semuaShift = RQ.semuaShift.filter((x) => x.regu === regu); }
  }
  function renderSemua() { renderPersonel(); renderFasilitas(); renderKejadian(); renderKepatuhan(); gambarGrafikTren(); }

  // Muat ulang Personel/Fasilitas/Log Book dari localStorage LOKAL, lalu -- kalau sinkronisasi
  // lintas perangkat aktif (lihat sync.js) -- gabung dgn salinan dari seluruh posko di server,
  // supaya Rekap yg dibuka Admin ikut menghitung laporan yg disimpan Posko di komputer lain.
  // Dipanggil sekali saat halaman dibuka (sama seperti Kejadian, data.js bacaKejadian()), BUKAN
  // tiap klik "Terapkan" -- rentang tanggal cuma menyaring data yg sudah termuat, tidak perlu
  // tarik ulang dari server tiap ganti filter.
  async function muatData() {
    personel = D.bacaPersonel(); fasilitas = D.bacaFasilitas(); logbook = D.bacaLogbook();
    if (typeof AVS_SYNC !== 'undefined' && AVS_SYNC.aktif()) {
      const [rp, rf, rl] = await Promise.all([AVS_SYNC.ambilSemua('personel'), AVS_SYNC.ambilSemua('fasilitas'), AVS_SYNC.ambilSemua('logbook')]);
      personel = AVS_SYNC.gabung(personel, rp);
      fasilitas = AVS_SYNC.gabung(fasilitas, rf);
      logbook = AVS_SYNC.gabung(logbook, rl);
    }
  }

  function bangunTata() {
    $('isiRekap').innerHTML = `
<div class="blokhdr"><div class="ic" style="background:#157A82">${svg(IC.people)}</div><h2>Laporan Personel</h2><span>rentang &amp; regu terpilih</span><div class="blokline"></div></div>
<div class="kpis" id="kpiPersonel"></div>
<div class="grid12" id="rowPersonel1"></div>
<div class="grid12" id="rowPersonel2"></div>

<div class="blokhdr"><div class="ic" style="background:#9A5F12"><svg viewBox="0 0 24 24" fill="#fff"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6l-3 3-4.3-4.3C.6 7.1 1 10.1 3 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.4-.5.4-1.1 0-1.4z"/></svg></div><h2>Laporan Fasilitas</h2><span>rentang &amp; regu terpilih</span><div class="blokline"></div></div>
<div class="kpis" id="kpiFasilitas"></div>
<div class="grid12" id="rowFasilitasTren"></div>
<div class="grid12" id="rowFasilitas1"></div>

<div class="blokhdr"><div class="ic" style="background:#1D3A5C">${svg(IC.doc)}</div><h2>Laporan Kejadian</h2><span>rentang terpilih (tidak dibedakan regu)</span><div class="blokline"></div></div>
<div class="kpis" id="kpiKejadian"></div>
<div class="grid12" id="rowKejadian1"></div>

<div class="blokhdr"><div class="ic" style="background:#5C6675">&#9989;</div><h2>Kepatuhan Pelaporan Shift</h2><span>seluruh 3 jenis laporan, rentang terpilih</span><div class="blokline"></div></div>
<div class="kpis" id="kpiKepatuhan"></div>
<div class="grid12" id="rowKepatuhan1"></div>
`;
  }

  /* =========================================================
     PDF — satu alur html2pdf, sampul + 4 blok
     ========================================================= */
  function muat(src) { return new Promise((res, rej) => { if (document.querySelector(`script[data-lz="${src}"]`)) { res(); return; } const s = document.createElement('script'); s.src = src; s.dataset.lz = src; s.onload = res; s.onerror = () => rej(new Error('Gagal memuat ' + src)); document.head.appendChild(s); }); }
  async function unduhPDF() {
    const btn = $('btnPdf'); btn.disabled = true;
    try {
      await muat('lib/html2pdf.bundle.min.js');
      if (typeof window.buildRekapPdfHTML !== 'function') await muat('rekap-pdf.js');
      const html = window.buildRekapPdfHTML({ RP, RF, RK, RQ, filter: filterAktif, dicetak: new Date() });
      const holder = document.getElementById('pdfContent');
      holder.innerHTML = html;
      await new Promise((res) => requestAnimationFrame(() => setTimeout(res, 80)));
      await A.tungguFontSiap();
      await html2pdf().set({
        margin: 0, filename: `Rekap AVSEC (${filterAktif.mulai} sd ${filterAktif.akhir}).pdf`,
        image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, pagebreak: { mode: ['css'], avoid: ['tr', '.ttd-block'] }
      }).from(holder).save();
      toast('Rekap PDF sedang diunduh...');
    } catch (e) { toast('Gagal membuat rekap PDF: ' + e.message, 'err', 6000); }
    btn.disabled = false;
  }

  /* =========================================================
     CADANGKAN / PULIHKAN (butir 4.4, gabungan 4 jenis laporan)
     ========================================================= */
  /* ---- Folder cadangan tersimpan (File System Access API) -- Chrome/Edge saja; browser lain
     otomatis jatuh ke cara lama (unduh ke folder Downloads). Handle folder yg dipilih user
     disimpan di IndexedDB (bukan localStorage -- FileSystemDirectoryHandle tidak bisa di-JSON)
     supaya backup2 berikutnya langsung tersimpan ke situ tanpa dialog pilih folder lagi. ---- */
  const DB_FOLDER = 'avsec-config', STORE_FOLDER = 'preferensi', KEY_FOLDER = 'folderBackup';
  function bukaDbFolder() {
    return new Promise((resolve, reject) => {
      const q = indexedDB.open(DB_FOLDER, 1);
      q.onupgradeneeded = () => { const db = q.result; if (!db.objectStoreNames.contains(STORE_FOLDER)) db.createObjectStore(STORE_FOLDER); };
      q.onsuccess = () => resolve(q.result);
      q.onerror = () => reject(q.error);
    });
  }
  async function bacaHandleFolder() {
    try {
      const db = await bukaDbFolder();
      return await new Promise((resolve) => {
        const req = db.transaction(STORE_FOLDER, 'readonly').objectStore(STORE_FOLDER).get(KEY_FOLDER);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (e) { return null; }
  }
  async function simpanHandleFolder(handle) {
    try {
      const db = await bukaDbFolder();
      await new Promise((resolve) => {
        const tx = db.transaction(STORE_FOLDER, 'readwrite');
        tx.objectStore(STORE_FOLDER).put(handle, KEY_FOLDER);
        tx.oncomplete = resolve; tx.onerror = resolve;
      });
    } catch (e) { /* abaikan -- folder tersimpan cuma kenyamanan, bukan fitur wajib */ }
  }
  async function pastikanIzinFolder(handle, minta) {
    const opsi = { mode: 'readwrite' };
    if ((await handle.queryPermission(opsi)) === 'granted') return true;
    if (!minta) return false;
    try { return (await handle.requestPermission(opsi)) === 'granted'; } catch (e) { return false; }
  }
  // true = tersimpan ke folder pilihan user. false = browser tdk dukung/gagal diam2 -> caller fallback ke unduh biasa.
  // Melempar error kalau user sendiri yg membatalkan dialog pilih folder (supaya TIDAK diam2 fallback ke Downloads).
  async function unduhKeFolderTersimpan(namaFile, blob) {
    if (!('showDirectoryPicker' in window)) return false;
    let handle = await bacaHandleFolder();
    if (handle && !(await pastikanIzinFolder(handle, true))) handle = null;
    if (!handle) {
      handle = await window.showDirectoryPicker({ id: 'avsec-backup', mode: 'readwrite' }); // bisa throw AbortError kalau user batal
      await simpanHandleFolder(handle);
    }
    const fh = await handle.getFileHandle(namaFile, { create: true });
    const ws = await fh.createWritable();
    await ws.write(blob);
    await ws.close();
    renderInfoFolder(handle);
    return true;
  }
  function renderInfoFolder(handle) {
    const el = $('folderBackupInfo'); if (!el) return;
    el.innerHTML = handle ? `Tersimpan ke folder <b>${E(handle.name)}</b> &middot; <a href="#" onclick="Rekap.gantiFolderBackup();return false">Ganti folder</a>` : '';
  }
  async function gantiFolderBackup() {
    if (!('showDirectoryPicker' in window)) { toast('Browser ini tidak mendukung pilih folder -- backup akan diunduh ke folder Downloads seperti biasa.', 'err'); return; }
    try {
      const handle = await window.showDirectoryPicker({ id: 'avsec-backup', mode: 'readwrite' });
      await simpanHandleFolder(handle);
      renderInfoFolder(handle);
      toast(`Folder cadangan diganti ke "${handle.name}".`);
    } catch (e) { /* user batal -- biarkan, folder lama (kalau ada) tetap dipakai */ }
  }
  function bukaBackup() {
    $('hasilImpor').textContent = '';
    $('backupOverlay').style.display = 'flex';
    bacaHandleFolder().then((h) => { if (h) pastikanIzinFolder(h, false).then((ok) => renderInfoFolder(ok ? h : null)); });
  }
  function tutupBackup() { $('backupOverlay').style.display = 'none'; }
  async function ekspor() {
    const data = { app: 'sistem-pelaporan-avsec-supadio', versi: 1, dicetak: new Date().toISOString(), personel, fasilitas, logbook, kejadian };
    const total = personel.length + fasilitas.length + logbook.length + kejadian.length;
    if (!total) { toast('Belum ada laporan apa pun untuk dicadangkan.', 'err'); return; }
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    const namaFile = `backup-avsec-semua-laporan-${isoHariIni(HARI_INI)}.json`;
    let keFolder = false;
    try { keFolder = await unduhKeFolderTersimpan(namaFile, blob); }
    catch (e) { return; } // user membatalkan dialog pilih folder -- jangan diam2 unduh ke Downloads
    if (!keFolder) {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = namaFile;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
    toast(`Dicadangkan: ${personel.length} Personel, ${fasilitas.length} Fasilitas, ${logbook.length} Log Book, ${kejadian.length} Kejadian.`);
  }
  function timpaLS(key, arrBaru, wajib, hasilRef) {
    if (!Array.isArray(arrBaru)) return 0;
    let list; try { list = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { list = []; }
    const map = new Map(list.map((r) => [String(r.id), r]));
    let n = 0;
    arrBaru.forEach((r) => { if (!r || !r.id || !wajib(r)) { hasilRef.lewat++; return; } r.id = String(r.id); map.set(r.id, r); n++; });
    localStorage.setItem(key, JSON.stringify(Array.from(map.values())));
    return n;
  }
  function timpaKejadianDB(arr) {
    return new Promise((resolve) => {
      const q = indexedDB.open('avsec-kejadian', 2);
      q.onupgradeneeded = () => { const db = q.result; if (!db.objectStoreNames.contains('laporan')) db.createObjectStore('laporan', { keyPath: 'id' }); if (!db.objectStoreNames.contains('tandatangan')) db.createObjectStore('tandatangan', { keyPath: 'key' }); };
      q.onerror = () => resolve(0);
      q.onsuccess = () => {
        const db = q.result, tx = db.transaction('laporan', 'readwrite'), store = tx.objectStore('laporan');
        let n = 0; arr.forEach((r) => { if (r && r.id && r.tanggal) { store.put(r); n++; } });
        tx.oncomplete = () => { db.close(); resolve(n); }; tx.onerror = () => { db.close(); resolve(n); };
      };
    });
  }
  function impor(input) {
    const file = input.files && input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const d = JSON.parse(reader.result);
        const hasil = { personel: 0, fasilitas: 0, logbook: 0, kejadian: 0, lewat: 0 };
        hasil.personel = timpaLS('savedReports', d.personel, (r) => r.tanggal && Array.isArray(r.kategoriKekuatan) && Array.isArray(r.posPenempatan), hasil);
        hasil.fasilitas = timpaLS('savedFasilitas', d.fasilitas, (r) => r.tanggal && Array.isArray(r.posFasilitas), hasil);
        hasil.logbook = timpaLS('savedLogbook', d.logbook, (r) => r.tanggal, hasil);
        if (Array.isArray(d.kejadian) && d.kejadian.length) hasil.kejadian = await timpaKejadianDB(d.kejadian);
        $('hasilImpor').innerHTML = `<b style="color:#0F5F65">Impor selesai:</b> ${hasil.personel} Personel, ${hasil.fasilitas} Fasilitas, ${hasil.logbook} Log Book, ${hasil.kejadian} Kejadian ditambahkan/ditimpa.${hasil.lewat ? ` (${hasil.lewat} data tidak valid dilewati)` : ''}`;
        kejadian = await D.bacaKejadian();
        await muatData();
        hitungUlang(); renderSemua();
        toast('Data berhasil dipulihkan.');
      } catch (e) { $('hasilImpor').innerHTML = '<b style="color:#A82F24">Berkas cadangan tidak valid.</b>'; }
      input.value = '';
    };
    reader.readAsText(file);
  }

  /* ---------- Mulai ---------- */
  async function mulai() {
    A.pasangKunci(); A.nav('rekap');
    bangunTata();
    const awalBulan = new Date(HARI_INI.getFullYear(), HARI_INI.getMonth(), 1);
    $('fMulai').value = isoHariIni(awalBulan); $('fAkhir').value = isoHariIni(HARI_INI);
    personel = D.bacaPersonel(); fasilitas = D.bacaFasilitas(); logbook = D.bacaLogbook();
    filterAktif = { mulai: $('fMulai').value, akhir: $('fAkhir').value, regu: 'all' };
    hitungUlang(); renderSemua();
    kejadian = await D.bacaKejadian();
    hitungUlang(); renderSemua();
    await muatData(); // tarik salinan Personel/Fasilitas/Log Book dari posko lain (kalau sinkronisasi aktif)
    hitungUlang(); renderSemua();
  }

  window.Rekap = { terapkanFilter, unduhPDF, bukaBackup, tutupBackup, ekspor, impor, gantiFolderBackup };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai); else mulai();
  window.adaPerubahanBelumTersimpan = () => false;
  AVS.daftarSW();
})();
