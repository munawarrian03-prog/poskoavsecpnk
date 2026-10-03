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

  let personel = [], fasilitas = [], logbook = [], kejadian = [];
  let RP = null, RF = null, RK = null, RQ = null, filterAktif = { mulai: '', akhir: '', regu: 'all' };
  let tataDibangun = false;

  function toast(msg, tipe, ms) { const t = $('toast'); t.textContent = msg; t.className = 'show ' + (tipe || 'ok'); clearTimeout(toast.t); toast.t = setTimeout(() => { t.className = ''; }, ms || 4200); }
  const pad2 = (n) => String(n).padStart(2, '0');
  const isoHariIni = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const tglPendek = (iso) => iso ? iso.split('-').reverse().join('/') : '-';
  const skalaY = (maxVal) => { const mv = Math.max(4, maxVal), step = mv <= 6 ? 2 : mv <= 12 ? 4 : Math.ceil(mv / 3 / 2) * 2; return { step, max: Math.ceil(mv / step) * step }; };

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
  function grafikBatangHorizontal(items, w) {
    w = w || 520; const rh = 30, gap = 12, laby = 130, mx = Math.max(...items.map((x) => x.jumlah)) || 1;
    const potong = (s) => s.length > 17 ? s.slice(0, 16) + '\u2026' : s;
    const h = items.length * (rh + gap) - gap;
    let s = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto">`;
    items.forEach((it, i) => {
      const y = i * (rh + gap), bw = (it.jumlah / mx) * (w - laby - 40);
      s += `<text x="0" y="${y + rh / 2 + 4}" font-size="12" font-weight="800" fill="#1A2233"><title>${E(it.label)}</title>${E(potong(it.label))}</text>`;
      s += `<rect x="${laby}" y="${y + 4}" width="${w - laby - 40}" height="${rh - 8}" rx="7" fill="#EEF1F6"/>`;
      s += `<rect x="${laby}" y="${y + 4}" width="${Math.max(bw, 3)}" height="${rh - 8}" rx="7" fill="${it.warna}"/>`;
      s += `<text x="${w - 2}" y="${y + rh / 2 + 4}" text-anchor="end" font-size="13" font-weight="800" fill="${it.warna}">${it.jumlah}</text>`;
    });
    return s + '</svg>';
  }
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

  /* =========================================================
     TANGGAL MEKAR (klik baris -> tampilkan tanggal di bawahnya)
     ========================================================= */
  function badgeTanggal(list) {
    return list.map((x) => {
      const alasan = x.alasan || null, warna = alasan ? (WARNA_ALASAN[alasan] || '#B9C4D6') : '#8A94A6';
      return `<span class="tgi"><i style="background:${warna}"></i>${E(tglPendek(x.tgl || x))}${alasan ? ' &middot; ' + E(alasan) : ''}</span>`;
    }).join('');
  }
  function toggleMekar(rowEl, isiHtml) {
    const next = rowEl.nextElementSibling;
    if (next && next.classList.contains('mekar')) { next.remove(); return; }
    document.querySelectorAll('tr.mekar').forEach((r) => r.remove());
    const tr = document.createElement('tr'); tr.className = 'mekar';
    const kolom = rowEl.children.length;
    tr.innerHTML = `<td colspan="${kolom}">${isiHtml}</td>`;
    rowEl.parentElement.insertBefore(tr, rowEl.nextSibling);
  }

  // Tabel yang barisnya bisa diklik: aksi klik HANYA dipasang ke baris tabel ini sendiri
  // (id unik), supaya data tabel lain (mis. Personel) tidak ikut menempel ke baris tabel ini.
  let nomorTabel = 0;
  function tabelKlik(rows, thead, trs) {
    const id = 'rtbl' + (++nomorTabel);
    setTimeout(() => {
      document.querySelectorAll(`#${id} tr.klik`).forEach((tr) => {
        tr.onclick = () => { const i = +tr.dataset.i; if (rows[i]) toggleMekar(tr, badgeTanggal(rows[i].tanggal)); };
      });
    }, 0);
    return `<table class="rtbl" id="${id}"><thead><tr>${thead}</tr></thead><tbody>${trs}</tbody></table>`;
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
  // Render badge expand-row: satu badge PER ALASAN berisi semua tanggalnya, mis. "Sakit · 01/09/26; 02/09/26"
  function badgeAlasanTanggal(tanggalArray) {
    return kelompokkanTanggal(tanggalArray).map((g) => {
      const warna = WARNA_ALASAN[g.alasan] || '#B9C4D6';
      return `<span class="tgi"><i style="background:${warna}"></i>${E(g.alasan)} &middot; ${g.tanggal.map((t) => E(tglPendek(t))).join('; ')}</span>`;
    }).join('');
  }
  function tabelPersonel(daftar, penuh) {
    const rows = (penuh ? daftar : daftar.slice(0, 5));
    if (!rows.length) return '<div class="empty">Belum ada data ketidakhadiran<br>pada rentang ini.</div>';
    const id = 'rtbl' + (++nomorTabel);
    const trs = rows.map((x, i) => `<tr class="klik" data-i="${i}"><td>${i + 1}</td><td class="nm">${E(x.nama.toUpperCase())}</td><td><b>${x.jumlah}</b></td><td>${formatAlasanBadges(x.tanggal)}</td></tr>`).join('');
    setTimeout(() => {
      document.querySelectorAll(`#${id} tr.klik`).forEach((tr) => {
        tr.onclick = () => { const i = +tr.dataset.i; if (rows[i]) toggleMekar(tr, badgeAlasanTanggal(rows[i].tanggal)); };
      });
    }, 0);
    return `<table class="rtbl" id="${id}"><thead><tr><th>#</th><th>Nama</th><th>Hari</th><th>Alasan (N Hari)</th></tr></thead><tbody>${trs}</tbody></table>`;
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
    $('rowPersonel2').innerHTML = `<div class="dcard c12 rauto"><div class="h"><div><h3>Ketidakhadiran per Personel</h3><div class="sub">5 teratas - klik baris untuk lihat tanggal</div></div><div class="sp"></div>${r.daftar.length > 5 ? `<button class="lihatsemua" onclick="Rekap.bukaLaci('personel')">Lihat Semua (${r.daftar.length}) &rsaquo;</button>` : ''}</div>${tabelPersonel(r.daftar, false)}</div>`;
  }

  /* =========================================================
     BLOK FASILITAS
     ========================================================= */
  function tabelFasilitas(daftar, penuh) {
    const rows = (penuh ? daftar : daftar.slice(0, 5));
    if (!rows.length) return '<div class="empty">Belum ada masalah fasilitas<br>dilaporkan pada rentang ini.</div>';
    const warna = (j) => j === 'Rusak' ? '#A82F24' : '#9A5F12', bg = (j) => j === 'Rusak' ? '#FBE9E7' : '#FCF1DF';
    const trs = rows.map((x, i) => `<tr class="klik" data-i="${i}"><td>${i + 1}</td><td class="nm">${E(x.item)}</td><td>${E(x.pos)}</td><td><b>${x.jumlah}</b></td><td><span class="tag" style="background:${bg(x.jenis)};color:${warna(x.jenis)}">${E(x.jenis)}</span></td></tr>`).join('');
    return tabelKlik(rows, '<th>#</th><th>Item</th><th>Pos</th><th>Kali</th><th>Jenis</th>', trs);
  }
  function renderFasilitas() {
    const r = RF;
    $('kpiFasilitas').innerHTML = `
<div class="kpi" style="--acc:#A82F24;--acc-bg:#FBE9E7;height:96px"><div class="lbl">Total Masalah</div><div class="val">${r.totalMasalah}<small>kali</small></div><div class="ico"><svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21z"/></svg></div></div>
<div class="kpi" style="--acc:#9A5F12;--acc-bg:#FCF1DF;height:96px"><div class="lbl">Tidak Digunakan</div><div class="val">${r.tidakDigunakan}<small>kali</small></div><div class="ico"><svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21z"/></svg></div></div>
<div class="kpi" style="--acc:#157A82;--acc-bg:#E4F3F4;height:96px"><div class="lbl">Kelengkapan Dokumen</div><div class="val">${r.dokPct == null ? '-' : r.dokPct}<small>${r.dokPct == null ? '' : '%'}</small></div><div class="ico">${svg(IC.doc)}</div></div>
<div class="kpi" style="--acc:#1D3A5C;--acc-bg:#E6ECF4;height:96px"><div class="lbl">Laporan Tersimpan</div><div class="val">${r.laporanTersimpan}<small>laporan</small></div><div class="ico">${svg(IC.doc)}</div></div>`;
    $('rowFasilitas1').innerHTML = `<div class="dcard c12 rauto"><div class="h"><div><h3>Alat Bermasalah</h3><div class="sub">5 teratas - klik baris untuk lihat tanggal</div></div><div class="sp"></div>${r.daftar.length > 5 ? `<button class="lihatsemua" onclick="Rekap.bukaLaci('fasilitas')">Lihat Semua (${r.daftar.length}) &rsaquo;</button>` : ''}</div>${tabelFasilitas(r.daftar, false)}</div>`;
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

  function tabelKejadianLK(daftar, penuh) {
    const rows = (penuh ? daftar : daftar.slice(0, 5));
    if (!rows.length) return '<div class="empty">Belum ada laporan kejadian<br>pada rentang ini.</div>';
    const trs = rows.map((x, i) => `<tr><td>${i + 1}</td><td class="nm"><a href="kejadian.html#ubah=${encodeURIComponent(x.id)}" style="color:inherit;text-decoration:none">${E(x.judul)}</a></td><td style="white-space:nowrap"><b>${E(tglPendek(x.tanggal))}</b></td></tr>`).join('');
    return `<table class="rtbl"><thead><tr><th>No</th><th>Laporan Kejadian</th><th>Tanggal</th></tr></thead><tbody>${trs}</tbody></table>`;
  }
  function tabelKejadianBAST(daftar, penuh) {
    const rows = (penuh ? daftar : daftar.slice(0, 5));
    if (!rows.length) return '<div class="empty">Belum ada BAST<br>pada rentang ini.</div>';
    const trs = rows.map((x, i) => `<tr><td>${i + 1}</td><td class="nm"><a href="kejadian.html#ubah=${encodeURIComponent(x.id)}" style="color:inherit;text-decoration:none">${E(ringkasBast(x))}</a></td><td style="white-space:nowrap"><b>${E(tglPendek(x.tanggal))}</b></td></tr>`).join('');
    return `<table class="rtbl"><thead><tr><th>No</th><th>Serah Terima</th><th>Tanggal</th></tr></thead><tbody>${trs}</tbody></table>`;
  }
  function renderKejadian() {
    const r = RK, unitLabel = UNIT[r.granularitas];
    const cntLokasi = {}; r.lk.daftar.forEach((x) => { const l = x.lokasiKejadian && x.lokasiKejadian !== '-' ? x.lokasiKejadian : null; if (l) cntLokasi[l] = (cntLokasi[l] || 0) + 1; });
    const lokasiTop = Object.entries(cntLokasi).sort((a, b) => b[1] - a[1])[0];
    const cntKategori = {}; r.bast.daftar.forEach((x) => { if (x.kategori) cntKategori[x.kategori] = (cntKategori[x.kategori] || 0) + 1; });
    const kategoriTop = Object.entries(cntKategori).sort((a, b) => b[1] - a[1])[0];
    const rataLK = r.lk.tren && r.lk.tren.length ? (r.lk.jumlah / r.lk.tren.length).toFixed(1) : '-';
    const rataBAST = r.bast.tren && r.bast.tren.length ? (r.bast.jumlah / r.bast.tren.length).toFixed(1) : '-';
    $('kpiKejadian').style.gridTemplateColumns = 'repeat(3, 1fr)';
    $('kpiKejadian').innerHTML = `
<div class="kpi2"><div class="kpi2-lbl">Jumlah Laporan</div>
<div class="kpi2-row"><span class="jenis-tag lk">LK</span><span class="kpi2-val">${r.lk.jumlah}<small>kasus</small></span></div>
<div class="kpi2-row"><span class="jenis-tag bast">BAST</span><span class="kpi2-val">${r.bast.jumlah}<small>BAST</small></span></div></div>
<div class="kpi2"><div class="kpi2-lbl">Rata-rata per ${unitLabel}</div>
<div class="kpi2-row"><span class="jenis-tag lk">LK</span><span class="kpi2-val">${rataLK}<small>kasus</small></span></div>
<div class="kpi2-row"><span class="jenis-tag bast">BAST</span><span class="kpi2-val">${rataBAST}<small>BAST</small></span></div></div>
<div class="kpi2"><div class="kpi2-lbl">Terbanyak</div>
<div class="kpi2-row"><span class="jenis-tag lk">LK</span><span class="kpi2-txt"><div class="l">Pos Jaga</div><div class="v">${lokasiTop ? E(lokasiTop[0]) : '-'}</div></span></div>
<div class="kpi2-row"><span class="jenis-tag bast">BAST</span><span class="kpi2-txt"><div class="l">Kategori</div><div class="v">${kategoriTop ? E(labelKategoriBast(kategoriTop[0])) : '-'}</div></span></div></div>`;
    $('rowKejadian1').innerHTML = `
<div class="dcard c12 rauto"><div class="h"><div><h3>Tren Laporan per ${unitLabel}</h3><div class="sub">Rentang terpilih</div></div><div class="sp"></div><div class="tren-legend"><span><i style="background:#E58A80"></i>LK</span><span><i style="background:#7FB9BE"></i>BAST</span></div></div>${wadahGrafikTrenDua('grafikTrenKejadian', r.lk.tren, r.bast.tren, '#E58A80', '#7FB9BE')}</div>
<div class="dcard c6 rauto"><div class="h"><div><h3>Daftar Laporan Kejadian</h3><div class="sub">5 terbaru \u2022 klik untuk membuka laporan</div></div><div class="sp"></div>${r.lk.daftar.length > 5 ? `<button class="lihatsemua" onclick="Rekap.bukaLaci('kejadianLK')">Lihat Semua (${r.lk.daftar.length}) \u203a</button>` : ''}</div>${tabelKejadianLK(r.lk.daftar, false)}</div>
<div class="dcard c6 rauto"><div class="h"><div><h3>Daftar Serah Terima</h3><div class="sub">5 terbaru \u2022 klik untuk membuka laporan</div></div><div class="sp"></div>${r.bast.daftar.length > 5 ? `<button class="lihatsemua" onclick="Rekap.bukaLaci('kejadianBAST')">Lihat Semua (${r.bast.daftar.length}) \u203a</button>` : ''}</div>${tabelKejadianBAST(r.bast.daftar, false)}</div>`;
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
  function tabelKepatuhan(daftar, penuh) {
    const rows = (penuh ? daftar : daftar.slice(0, 5));
    if (!rows.length) return '<div class="empty">Semua shift pada rentang ini<br>sudah lengkap dilaporkan.</div>';
    const tagW = (j) => j === 'Personel' ? ['#E6ECF4', '#1D3A5C'] : j === 'Fasilitas' ? ['#FCF1DF', '#9A5F12'] : ['#FBE9E7', '#A82F24'];
    const trs = rows.map((x) => `<tr><td style="white-space:nowrap"><b>${E(tglPendek(x.tanggal))}</b></td><td>${E(x.shift)}</td><td>${E(x.regu || '-')}</td><td>${x.kurang.map((j) => { const c = tagW(j); return `<span class="tag" style="background:${c[0]};color:${c[1]};margin-right:4px">${E(j)}</span>`; }).join('')}</td></tr>`).join('');
    return `<table class="rtbl"><thead><tr><th>Tanggal</th><th>Shift</th><th>Regu</th><th>Belum Diisi</th></tr></thead><tbody>${trs}</tbody></table>`;
  }
  function renderKepatuhan() {
    const r = RQ;
    // 3 KPI sama lebar (kisi 3 kolom KHUSUS baris ini, terpisah dari .kpis yang default 4 kolom)
    $('kpiKepatuhan').style.gridTemplateColumns = 'repeat(3, 1fr)';
    $('kpiKepatuhan').innerHTML = `
<div class="kpi" style="--acc:#157A82;--acc-bg:#E4F3F4;height:96px"><div class="lbl">Personel Belum Diisi</div><div class="val">${r.personelBelum}<small>/ ${r.total} shift</small></div><div class="ico">${svg(IC.people)}</div></div>
<div class="kpi" style="--acc:#9A5F12;--acc-bg:#FCF1DF;height:96px"><div class="lbl">Fasilitas Belum Diisi</div><div class="val">${r.fasilitasBelum}<small>/ ${r.total} shift</small></div><div class="ico"><svg viewBox="0 0 24 24"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6l-3 3-4.3-4.3C.6 7.1 1 10.1 3 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.4-.5.4-1.1 0-1.4z"/></svg></div></div>
<div class="kpi" style="--acc:#A82F24;--acc-bg:#FBE9E7;height:96px"><div class="lbl">Log Book Belum Diisi</div><div class="val">${r.logbookBelum}<small>/ ${r.total} shift</small></div><div class="ico">${svg(IC.doc)}</div></div>`;
    const grafik = grafikBatangHorizontal([
      { label: 'Laporan Personel', jumlah: r.personelBelum, warna: '#157A82' },
      { label: 'Laporan Fasilitas', jumlah: r.fasilitasBelum, warna: '#9A5F12' },
      { label: 'Log Book', jumlah: r.logbookBelum, warna: '#A82F24' }
    ]);
    $('rowKepatuhan1').innerHTML = `
<div class="dcard c6 rauto"><div class="h"><div><h3>Shift Belum Diisi - per Jenis Laporan</h3><div class="sub">Dari ${r.total} shift dalam rentang terpilih</div></div></div><div style="padding:8px 4px;max-width:420px">${grafik}</div></div>
<div class="dcard c6 rauto"><div class="h"><div><h3>Daftar Shift Belum Lengkap</h3><div class="sub">5 teratas - rentang terpilih</div></div><div class="sp"></div>${r.daftar.length > 5 ? `<button class="lihatsemua" onclick="Rekap.bukaLaci('kepatuhan')">Lihat Semua (${r.daftar.length}) &rsaquo;</button>` : ''}</div>${tabelKepatuhan(r.daftar, false)}<div style="font-size:10px;color:#8A94A6;font-weight:600;margin-top:8px">Dikelompokkan otomatis per regu berdasarkan data Jadwal Dinas yang diunggah.</div></div>`;
  }

  /* =========================================================
     LACI "LIHAT SEMUA"
     ========================================================= */
  function bukaLaci(jenis) {
    const map = {
      personel: { judul: 'KETIDAKHADIRAN PER PERSONEL', sub: `Seluruh ${RP.daftar.length} personel - ${tglPendek(filterAktif.mulai)} s.d. ${tglPendek(filterAktif.akhir)}`, html: tabelPersonel(RP.daftar, true) },
      fasilitas: { judul: 'ALAT BERMASALAH', sub: `Seluruh ${RF.daftar.length} item - ${tglPendek(filterAktif.mulai)} s.d. ${tglPendek(filterAktif.akhir)}`, html: tabelFasilitas(RF.daftar, true) },
      kejadianLK: { judul: 'DAFTAR LAPORAN KEJADIAN', sub: `Seluruh ${RK.lk.daftar.length} laporan - ${tglPendek(filterAktif.mulai)} s.d. ${tglPendek(filterAktif.akhir)}`, html: tabelKejadianLK(RK.lk.daftar, true) },
      kejadianBAST: { judul: 'DAFTAR SERAH TERIMA', sub: `Seluruh ${RK.bast.daftar.length} BAST - ${tglPendek(filterAktif.mulai)} s.d. ${tglPendek(filterAktif.akhir)}`, html: tabelKejadianBAST(RK.bast.daftar, true) },
      kepatuhan: { judul: 'DAFTAR SHIFT BELUM LENGKAP', sub: `Seluruh ${RQ.daftar.length} shift - ${tglPendek(filterAktif.mulai)} s.d. ${tglPendek(filterAktif.akhir)}`, html: tabelKepatuhan(RQ.daftar, true) }
    };
    const m = map[jenis]; if (!m) return;
    $('laciJudul').textContent = m.judul; $('laciSub').textContent = m.sub; $('laciIsi').innerHTML = m.html;
    $('laciSemua').classList.add('open');
  }
  function tutupLaci() { $('laciSemua').classList.remove('open'); }

  /* =========================================================
     FILTER
     ========================================================= */
  function terapkanFilter() {
    const mulai = $('fMulai').value, akhir = $('fAkhir').value, regu = $('fRegu').value;
    if (!mulai || !akhir) { toast('Lengkapi tanggal mulai dan akhir.', 'err'); return; }
    if (mulai > akhir) { toast('Tanggal mulai tidak boleh setelah tanggal akhir.', 'err'); return; }
    filterAktif = { mulai, akhir, regu };
    if (!tataDibangun) { bangunTata(); tataDibangun = true; }
    $('btnPdf').disabled = false;
    hitungUlang(); renderSemua();
  }
  // Tanggal laporan paling awal dari seluruh jenis (Personel/Fasilitas/Log Book/Kejadian) --
  // dipakai sbg batas awal baku saat kotak "Dari Tanggal" masih dikosongkan pengguna.
  function tanggalPalingAwal() {
    const semua = [].concat(personel, fasilitas, logbook, kejadian).map((r) => r && r.tanggal).filter(Boolean);
    return semua.length ? semua.reduce((min, t) => (t < min ? t : min)) : isoHariIni(HARI_INI);
  }
  // Tampilkan rekap "sampai hari ini" secara otomatis (kotak tanggal TETAP terlihat kosong,
  // mengikuti gaya Laporan Tersimpan) -- pengguna masih bisa mempersempit lewat Terapkan.
  function terapkanDefault() {
    filterAktif = { mulai: tanggalPalingAwal(), akhir: isoHariIni(HARI_INI), regu: 'all' };
    if (!tataDibangun) { bangunTata(); tataDibangun = true; }
    $('btnPdf').disabled = false;
    hitungUlang(); renderSemua();
  }
  function hitungUlang() {
    const { mulai, akhir, regu } = filterAktif;
    RP = D.statPersonelRentang(personel, mulai, akhir, regu);
    RF = D.statFasilitasRentang(fasilitas, mulai, akhir, regu);
    RK = D.statKejadianRentang(kejadian, mulai, akhir);
    RQ = D.kepatuhanRentang(personel, fasilitas, logbook, mulai, akhir, HARI_INI);
    RQ.daftar.forEach((x) => { x.regu = reguBertugasJadwal(x.tanggal, x.shift); });
    if (regu !== 'all') RQ.daftar = RQ.daftar.filter((x) => x.regu === regu);
  }
  function renderSemua() { renderPersonel(); renderFasilitas(); renderKejadian(); renderKepatuhan(); gambarGrafikTren(); }

  function bangunTata() {
    $('isiRekap').innerHTML = `
<div class="blokhdr"><div class="ic" style="background:#157A82">${svg(IC.people)}</div><h2>Laporan Personel</h2><span>rentang &amp; regu terpilih</span><div class="blokline"></div></div>
<div class="kpis" id="kpiPersonel"></div>
<div class="grid12" id="rowPersonel1"></div>
<div class="grid12" id="rowPersonel2"></div>

<div class="blokhdr"><div class="ic" style="background:#9A5F12"><svg viewBox="0 0 24 24" fill="#fff"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6l-3 3-4.3-4.3C.6 7.1 1 10.1 3 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.4-.5.4-1.1 0-1.4z"/></svg></div><h2>Laporan Fasilitas</h2><span>rentang &amp; regu terpilih</span><div class="blokline"></div></div>
<div class="kpis" id="kpiFasilitas"></div>
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
  function bukaBackup() { $('hasilImpor').textContent = ''; $('backupOverlay').style.display = 'flex'; }
  function tutupBackup() { $('backupOverlay').style.display = 'none'; }
  function ekspor() {
    const data = { app: 'sistem-pelaporan-avsec-supadio', versi: 1, dicetak: new Date().toISOString(), personel, fasilitas, logbook, kejadian };
    const total = personel.length + fasilitas.length + logbook.length + kejadian.length;
    if (!total) { toast('Belum ada laporan apa pun untuk dicadangkan.', 'err'); return; }
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `backup-avsec-semua-laporan-${isoHariIni(HARI_INI)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
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
        personel = D.bacaPersonel(); fasilitas = D.bacaFasilitas(); logbook = D.bacaLogbook(); kejadian = await D.bacaKejadian();
        hitungUlang(); renderSemua();
        toast('Data berhasil dipulihkan.');
      } catch (e) { $('hasilImpor').innerHTML = '<b style="color:#A82F24">Berkas cadangan tidak valid.</b>'; }
      input.value = '';
    };
    reader.readAsText(file);
  }

  /* ---------- Mulai ---------- */
  async function mulai() {
    A.pasangKunci(); A.nav('beranda');
    personel = D.bacaPersonel(); fasilitas = D.bacaFasilitas(); logbook = D.bacaLogbook();
    terapkanDefault();
    kejadian = await D.bacaKejadian();
    terapkanDefault();
  }

  window.Rekap = { terapkanFilter, bukaLaci, tutupLaci, unduhPDF, bukaBackup, tutupBackup, ekspor, impor };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai); else mulai();
  window.adaPerubahanBelumTersimpan = () => false;
  AVS.daftarSW();
})();
