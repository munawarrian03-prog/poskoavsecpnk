/* =====================================================
   BERITA ACARA SERAH TERIMA (BAST)
   Modul terpisah dari logic Laporan Kejadian (LK) di kejadian.html, tapi
   berbagi scope global yang sama (classic script) serta berbagi
   penyimpanan IndexedDB (store 'laporan', dibedakan lewat field `jenis`).
   Semua fungsi di sini diberi awalan "bast" supaya tidak bentrok dengan
   fungsi LK yang sudah ada. Dipanggil langsung sebagai global function
   dari atribut onclick/oninput di HTML, persis gaya kode kejadian.html.
   ===================================================== */
'use strict';

/* ---------- Terbilang (angka -> kata, Bahasa Indonesia) ---------- */
function bastAngkaKeKata(n) {
  n = Math.floor(Math.abs(Number(n) || 0));
  const SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  if (n < 12) return SATUAN[n];
  if (n < 20) return bastAngkaKeKata(n - 10) + ' belas';
  if (n < 100) return bastAngkaKeKata(Math.floor(n / 10)) + ' puluh' + (n % 10 ? ' ' + bastAngkaKeKata(n % 10) : '');
  if (n < 200) return 'seratus' + (n % 100 ? ' ' + bastAngkaKeKata(n % 100) : '');
  if (n < 1000) return bastAngkaKeKata(Math.floor(n / 100)) + ' ratus' + (n % 100 ? ' ' + bastAngkaKeKata(n % 100) : '');
  if (n < 2000) return 'seribu' + (n % 1000 ? ' ' + bastAngkaKeKata(n % 1000) : '');
  if (n < 1000000) return bastAngkaKeKata(Math.floor(n / 1000)) + ' ribu' + (n % 1000 ? ' ' + bastAngkaKeKata(n % 1000) : '');
  if (n < 1000000000) return bastAngkaKeKata(Math.floor(n / 1000000)) + ' juta' + (n % 1000000 ? ' ' + bastAngkaKeKata(n % 1000000) : '');
  return String(n);
}
function bastAngkaKeKataKapital(n) { return bastAngkaKeKata(n).replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1)); }
function bastFormatWaktu(hhmm) {
  const m = String(hhmm || '').match(/^(\d{2}):(\d{2})$/);
  return m ? `${m[1]}.${m[2]} WIB` : '-';
}

/* ---------- Kategori & kolom dinamis ---------- */
function bastKolomKategori(kat) {
  const K = (typeof KATEGORI_BAST !== 'undefined') ? KATEGORI_BAST : {};
  return K[kat] || K.lainnya || { label: 'Lainnya', kalimat: 'barang/hal', kolom: [{ key: 'nama', label: 'Nama Item' }, { key: 'jumlah', label: 'Jumlah' }, { key: 'keterangan', label: 'Keterangan' }] };
}
function bastBarisKosong(kat) {
  const o = {}; bastKolomKategori(kat).kolom.forEach((c) => { o[c.key] = ''; }); return o;
}

/* ---------- State & Model ---------- */
let bastLaporan = null;
let bastEditingId = null;
let bastDirty = false;

function bastModelBaru() {
  const now = new Date(), p2 = (n) => String(n).padStart(2, '0');
  const kat = (typeof KATEGORI_BAST_AWAL !== 'undefined') ? KATEGORI_BAST_AWAL : 'barang_bukti';
  return {
    id: null, jenis: 'BAST', kategori: kat,
    tanggal: hariIni(), waktu: `${p2(now.getHours())}:${p2(now.getMinutes())}`, tempat: (typeof TEMPAT_DEF !== 'undefined' ? TEMPAT_DEF : ''),
    nomorBast: '', nomorOtomatis: true, nomorDikunci: false,
    pihakSatu: { nama: '', jabatan: '', nik: '', instansi: '' },
    pihakDua: { nama: '', jabatan: '', nik: '', instansi: '' },
    saksi: [],
    items: [bastBarisKosong(kat)],
    catatan: ''
  };
}
function bastLengkapiModel(r) {
  const b = bastModelBaru(), m = Object.assign(b, r || {});
  m.pihakSatu = Object.assign({ nama: '', jabatan: '', nik: '', instansi: '' }, (r && r.pihakSatu) || {});
  m.pihakDua = Object.assign({ nama: '', jabatan: '', nik: '', instansi: '' }, (r && r.pihakDua) || {});
  if (!Array.isArray(m.saksi)) m.saksi = [];
  if (!(typeof KATEGORI_BAST !== 'undefined' && KATEGORI_BAST[m.kategori])) m.kategori = b.kategori;
  if (!Array.isArray(m.items) || !m.items.length) m.items = [bastBarisKosong(m.kategori)];
  if (r && r.nomorOtomatis === undefined) { m.nomorOtomatis = false; m.nomorDikunci = false; }
  return m;
}

/* ---------- Penomoran BAST (counter terpisah dari LK) ---------- */
const BAST_NOMOR_KEY = 'nomorBast';
function bastBacaCounter() { try { return JSON.parse(localStorage.getItem(BAST_NOMOR_KEY) || '{}') || {}; } catch (e) { return {}; } }
function bastTulisCounter(o) { try { localStorage.setItem(BAST_NOMOR_KEY, JSON.stringify(o)); } catch (e) { /* penyimpanan diblokir */ } }
async function bastRekamTersimpan() { try { return (await dbAll()).filter((r) => r.jenis === 'BAST'); } catch (e) { return []; } }
async function bastUsulNomor(tanggal, kecualiId) {
  const p = pecahTgl(tanggal); if (!p) return null;
  const recs = (await bastRekamTersimpan()).filter((r) => r.id !== kecualiId);
  return Object.assign({ y: p.y, m: p.m }, BastNomor.usul(recs, bastBacaCounter(), p.y, p.m));
}
function bastCatatNomor(rec) { const p = BastNomor.parse(rec.nomorBast); if (p) bastTulisCounter(BastNomor.catat(bastBacaCounter(), p.urut, p.y, p.m)); }
function bastRenderNomor() {
  const inp = $('bastFileNumber'); if (!inp || !bastLaporan) return;
  const auto = !!bastLaporan.nomorOtomatis;
  inp.value = bastLaporan.nomorBast || '';
  inp.placeholder = auto ? 'Menghitung nomor…' : 'Ketik nomor BAST (boleh dikosongkan)';
  const tag = $('bastAutoTag'); if (tag) tag.style.display = auto ? '' : 'none';
  const btn = $('bastBtnNomorMode'); if (btn) { btn.textContent = auto ? '✎' : '↺'; btn.title = auto ? 'Ubah nomor secara manual' : 'Kembali ke nomor otomatis'; }
}
async function bastPerbaruiNomor() {
  if (!bastLaporan.nomorOtomatis) return;
  const u = await bastUsulNomor(bastLaporan.tanggal, bastEditingId);
  bastLaporan.nomorBast = u ? u.nomor : '';
  bastRenderNomor();
}
async function bastUbahModeNomor() {
  if (bastLaporan.nomorOtomatis) { bastLaporan.nomorOtomatis = false; bastLaporan.nomorDikunci = false; bastRenderNomor(); const f = $('bastFileNumber'); if (f) f.focus(); bastUbah(); return; }
  if (bastEditingId && rapikan(bastLaporan.nomorBast) && !confirm('Nomor BAST ini akan diganti dengan nomor otomatis berikutnya. Lanjutkan?')) return;
  bastLaporan.nomorOtomatis = true; bastLaporan.nomorDikunci = false; bastLaporan.nomorBast = '';
  await bastPerbaruiNomor(); bastUbah();
}

/* ---------- Atur Urutan Nomor (modal #urutModal, dipakai bersama LK - lihat modeUrutanAktif di kejadian.html) ---------- */
let bastUR = null;
async function bastBukaUrutan() {
  modeUrutanAktif = 'BAST';
  const t = pecahTgl(bastLaporan.tanggal) || { y: new Date().getFullYear(), m: new Date().getMonth() }, recs = await bastRekamTersimpan();
  const minim = BastNomor.urutTertinggiTersimpan(recs, t.y, t.m), efektif = BastNomor.urutTerakhir(recs, bastBacaCounter(), t.y, t.m);
  bastUR = { t, minim };
  $('urutSub').textContent = `${AVS.BULAN[t.m]} ${t.y} (mengikuti tanggal BAST)`;
  $('urutInput').min = minim; $('urutInput').value = efektif;
  const ada = recs.map((r) => BastNomor.parse(r.nomorBast)).filter((p) => p && p.y === t.y && p.m === t.m).map((p) => p.urut).sort((a, b) => a - b);
  $('urutRiwayat').textContent = ada.length ? 'Nomor yang sudah ada di BAST tersimpan bulan ini: ' + ada.join(', ') + '.' : 'Belum ada BAST bernomor otomatis pada bulan ini.';
  $('urutInfo').textContent = minim ? `Tidak dapat lebih kecil dari ${minim} (nomor tertinggi yang sudah tersimpan).` : 'Isi 0 untuk memulai dari nomor 1.';
  bastUbahInputUrutan(); $('urutModal').style.display = 'flex';
}
function bastUbahInputUrutan() { if (!bastUR) return; const v = Math.max(bastUR.minim, parseInt($('urutInput').value, 10) || 0); $('urutNext').textContent = BastNomor.format(v + 1, bastUR.t.y, bastUR.t.m); }
function bastTutupUrutan() { $('urutModal').style.display = 'none'; bastUR = null; }
async function bastSimpanUrutan() {
  if (!bastUR) return;
  const v = parseInt($('urutInput').value, 10);
  if (!Number.isFinite(v) || v < 0) { toast('Isi angka 0 atau lebih.', 'err'); return; }
  if (v < bastUR.minim) { toast(`Nomor terakhir tidak boleh kurang dari ${bastUR.minim}.`, 'err'); return; }
  const t = bastUR.t, c = bastBacaCounter(); c[BastNomor.kunciBulan(t.y, t.m)] = v; bastTulisCounter(c);
  bastTutupUrutan(); await bastPerbaruiNomor();
  toast(`Urutan diatur. Nomor berikutnya: ${BastNomor.format(v + 1, t.y, t.m)}`);
}
async function bastTetapkanNomor(rec) {
  if (rec.nomorOtomatis) {
    let lama = null; if (bastEditingId) { try { const o = await dbGet(bastEditingId); lama = o && o.nomorBast; } catch (e) { /* abaikan */ } }
    if (!(lama && rec.nomorBast === lama && BastNomor.parse(lama))) { const u = await bastUsulNomor(rec.tanggal, bastEditingId); if (u) rec.nomorBast = u.nomor; }
    rec.nomorDikunci = !!rapikan(rec.nomorBast);
  } else rec.nomorDikunci = false;
}

/* ---------- Render Form ---------- */
function bastFieldChanged(el) {
  if (el.dataset.f === 'nomorBast' && bastLaporan.nomorOtomatis && el.value !== bastLaporan.nomorBast) {
    bastLaporan.nomorOtomatis = false; bastLaporan.nomorDikunci = false;
    const tag = $('bastAutoTag'); if (tag) tag.style.display = 'none';
    const btn = $('bastBtnNomorMode'); if (btn) { btn.textContent = '↺'; btn.title = 'Kembali ke nomor otomatis'; }
  }
  setPath(bastLaporan, el.dataset.f, el.value); if (el.dataset.f === 'tanggal') bastPerbaruiNomor(); bastUbah();
}
function bastPihakInput(slot, field, val) { bastLaporan[slot][field] = val; bastUbah(); }
function cariNikDariJadwal(nama) {
  const norm = (s) => rapikan(s).toUpperCase().replace(/\s+/g, ' ');
  const target = norm(nama); if (!target) return null;
  let semua; try { semua = JSON.parse(localStorage.getItem('savedJadwalDinas') || '{}'); } catch (e) { return null; }
  const kunciUrut = Object.keys(semua).sort().reverse();
  for (const k of kunciUrut) {
    for (const unit of ((semua[k] && semua[k].units) || [])) {
      for (const g of (unit.grup || [])) {
        for (const o of (g.orang || [])) {
          if (norm(o.nama) === target && o.nik) return o.nik;
        }
      }
    }
  }
  return null;
}
function bastIsiNikDariJadwal(nama) {
  const nik = cariNikDariJadwal(nama); if (!nik) return;
  bastLaporan.pihakSatu.nik = nik;
  const inp = $('bastPihakSatuNik'); if (inp) inp.value = nik;
  bastUbah();
}
function bastItemInput(i, key, val) { if (bastLaporan.items[i]) { bastLaporan.items[i][key] = val; bastUbah(); } }
function bastSaksiInput(i, field, val) { if (bastLaporan.saksi[i]) { bastLaporan.saksi[i][field] = val; bastUbah(); } }
function bastTambahItem() { bastLaporan.items.push(bastBarisKosong(bastLaporan.kategori)); bastRenderForm(); bastUbah(); }
function bastHapusItem(i) { if (bastLaporan.items.length <= 1) { toast('Minimal harus ada 1 baris.', 'err'); return; } bastLaporan.items.splice(i, 1); bastRenderForm(); bastUbah(); }
function bastTambahSaksi() { bastLaporan.saksi.push({ nama: '', jabatan: '' }); bastRenderForm(); bastUbah(); }
function bastHapusSaksi(i) { bastLaporan.saksi.splice(i, 1); bastRenderForm(); bastUbah(); }
function bastGantiKategori(kat) {
  bastLaporan.kategori = kat;
  bastLaporan.items = [bastBarisKosong(kat)];
  bastRenderForm(); bastUbah();
  toast('Kolom tabel disesuaikan dengan kategori "' + bastKolomKategori(kat).label + '".');
}
function bastUbah() { bastDirty = true; bastRenderPreview(); bastUpdateBadge(); }

function bastTabelItemHTML() {
  const kolom = bastKolomKategori(bastLaporan.kategori).kolom;
  const head = kolom.map((c) => `<th>${esc(c.label)}</th>`).join('');
  const rows = bastLaporan.items.map((row, i) => {
    const cells = kolom.map((c) => `<td><input value="${esc(row[c.key])}" oninput="bastItemInput(${i},'${c.key}',this.value)"></td>`).join('');
    return `<tr><td>${i + 1}</td>${cells}<td><button type="button" class="bast-rm" onclick="bastHapusItem(${i})" title="Hapus baris">✕</button></td></tr>`;
  }).join('');
  return `<table class="bast-dyn"><thead><tr><th style="width:26px">#</th>${head}<th style="width:30px"></th></tr></thead><tbody>${rows}</tbody></table>`;
}
function bastTabelSaksiHTML() {
  const rows = bastLaporan.saksi.map((s, i) => `<tr><td>${i + 1}</td><td><input value="${esc(s.nama)}" placeholder="Nama saksi" oninput="bastSaksiInput(${i},'nama',this.value)"></td><td><input value="${esc(s.jabatan)}" placeholder="Jabatan" oninput="bastSaksiInput(${i},'jabatan',this.value)"></td><td><button type="button" class="bast-rm" onclick="bastHapusSaksi(${i})">✕</button></td></tr>`).join('');
  return `<table class="bast-dyn"><thead><tr><th style="width:26px">#</th><th>Nama</th><th>Jabatan</th><th style="width:30px"></th></tr></thead><tbody>${rows}</tbody></table>`;
}
function bastKategoriOptionsHTML() {
  const urutan = (typeof KATEGORI_BAST_URUTAN !== 'undefined') ? KATEGORI_BAST_URUTAN : Object.keys(KATEGORI_BAST || {});
  return urutan.map((k) => `<option value="${k}"${bastLaporan.kategori === k ? ' selected' : ''}>${esc(bastKolomKategori(k).label)}</option>`).join('');
}

function bastRenderForm() {
  const col = $('bastFormCol'); if (!col || !bastLaporan) return;
  const L = bastLaporan;
  col.innerHTML = `
<div class="bast-sec">
  <div class="bast-hd"><div class="bast-num">1</div><b>Info Umum</b></div>
  <div class="bast-bd">
    <div class="bast-f">
      <label>Nomor BAST</label>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="nomor-wrap" id="bastNomorWrap"><input type="text" id="bastFileNumber" data-f="nomorBast" oninput="bastFieldChanged(this)" placeholder="Menghitung nomor…" autocomplete="off" spellcheck="false"><span class="autotag" id="bastAutoTag">AUTO</span></div>
        <button type="button" class="hbtn" id="bastBtnNomorMode" onclick="bastUbahModeNomor()" title="Ubah nomor secara manual">✎</button>
        <button type="button" class="hbtn" onclick="bastBukaUrutan()" title="Atur urutan nomor bulan ini">⚙</button>
      </div>
    </div>
    <div class="bast-g4" style="margin-bottom:0">
      <div class="bast-f"><label>Tanggal</label><input type="date" value="${esc(L.tanggal)}" data-f="tanggal" oninput="bastFieldChanged(this)"></div>
      <div class="bast-f"><label>Waktu</label><input type="time" value="${esc(L.waktu)}" data-f="waktu" oninput="bastFieldChanged(this)"></div>
      <div class="bast-f"><label>Tempat</label><input value="${esc(L.tempat)}" data-f="tempat" oninput="bastFieldChanged(this)"></div>
      <div class="bast-f"><label>Kategori BAST</label><select onchange="bastGantiKategori(this.value)">${bastKategoriOptionsHTML()}</select></div>
    </div>
  </div>
</div>

<div class="bast-sec">
  <div class="bast-hd"><div class="bast-num">2</div><b>Pihak yang Menyerahkan &amp; Menerima</b></div>
  <div class="bast-bd">
    <div class="bast-pihak2">
      <div class="bast-pihak-box">
        <div class="bast-tt">PIHAK PERTAMA (Menyerahkan) <span class="bast-src-tag">dari daftar personel</span></div>
        <div class="bast-f"><label>Nama</label><input list="listPersonel" value="${esc(L.pihakSatu.nama)}" oninput="bastPihakInput('pihakSatu','nama',this.value)" onblur="bastIsiNikDariJadwal(this.value)"></div>
        <div class="bast-f"><label>NIK <small>ditulis manual</small></label><input id="bastPihakSatuNik" value="${esc(L.pihakSatu.nik)}" oninput="bastPihakInput('pihakSatu','nik',this.value)"></div>
        <div class="bast-f"><label>Jabatan</label><input list="listJabatan" value="${esc(L.pihakSatu.jabatan)}" oninput="bastPihakInput('pihakSatu','jabatan',this.value)"></div>
        <div class="bast-f"><label>Instansi <small>ditulis manual</small></label><input value="${esc(L.pihakSatu.instansi)}" placeholder="Ketik instansi" oninput="bastPihakInput('pihakSatu','instansi',this.value)"></div>
      </div>
      <div class="bast-pihak-box manual">
        <div class="bast-tt">PIHAK KEDUA (Menerima) <span class="bast-src-tag">manual semua</span></div>
        <div class="bast-f"><label>Nama</label><input value="${esc(L.pihakDua.nama)}" placeholder="Ketik nama lengkap" oninput="bastPihakInput('pihakDua','nama',this.value)"></div>
        <div class="bast-f"><label>NIK <small>ditulis manual</small></label><input value="${esc(L.pihakDua.nik)}" oninput="bastPihakInput('pihakDua','nik',this.value)"></div>
        <div class="bast-f"><label>Jabatan</label><input value="${esc(L.pihakDua.jabatan)}" placeholder="Ketik jabatan" oninput="bastPihakInput('pihakDua','jabatan',this.value)"></div>
        <div class="bast-f"><label>Instansi</label><input value="${esc(L.pihakDua.instansi)}" placeholder="Ketik instansi" oninput="bastPihakInput('pihakDua','instansi',this.value)"></div>
      </div>
    </div>
  </div>
</div>

<div class="bast-sec">
  <div class="bast-hd"><div class="bast-num">3</div><b>Daftar ${esc(bastKolomKategori(L.kategori).label)}</b></div>
  <div class="bast-bd">
    ${bastTabelItemHTML()}
    <button type="button" class="bast-addrow" onclick="bastTambahItem()">+ Tambah Baris</button>
  </div>
</div>

<div class="bast-sec">
  <div class="bast-hd"><div class="bast-num">4</div><b>Saksi-saksi <small style="font-weight:600;color:#94a3b8">(opsional)</small></b></div>
  <div class="bast-bd">
    ${bastTabelSaksiHTML()}
    <button type="button" class="bast-addrow" onclick="bastTambahSaksi()">+ Tambah Saksi</button>
  </div>
</div>

<div class="bast-sec">
  <div class="bast-hd"><div class="bast-num">5</div><b>Catatan Tambahan <small style="font-weight:600;color:#94a3b8">(opsional)</small></b></div>
  <div class="bast-bd"><textarea rows="3" data-f="catatan" oninput="bastFieldChanged(this)" placeholder="Catatan atau keterangan tambahan...">${esc(L.catatan)}</textarea></div>
</div>
<div style="height:8px"></div>`;
  bastRenderNomor();
}

/* ---------- Live Preview A4 ---------- */
function bastKalimatPembuka() {
  const L = bastLaporan, t = pecahTgl(L.tanggal);
  if (!t) return { hari: '-', tglKata: '-', bulan: '-', tahunKata: '-', tglAngka: L.tanggal || '-' };
  const d = new Date(t.y, t.m, +String(L.tanggal).slice(-2));
  const hari = (typeof AVS !== 'undefined' && AVS.HARI) ? AVS.HARI[d.getDay()] : '';
  const bulan = (typeof AVS !== 'undefined' && AVS.BULAN) ? AVS.BULAN[t.m] : '';
  return { hari, tglKata: bastAngkaKeKataKapital(d.getDate()), bulan, tahunKata: bastAngkaKeKataKapital(t.y), tglAngka: `${String(d.getDate()).padStart(2, '0')}-${String(t.m + 1).padStart(2, '0')}-${t.y}` };
}
function bastIdList(o, label) {
  return `<table class="id-list">
<tr><td>Nama</td><td>:</td><td>${esc(((o && o.nama) || '-').toUpperCase())}</td></tr>
<tr><td>NIK</td><td>:</td><td>${esc((o && o.nik) || '-')}</td></tr>
<tr><td>Jabatan</td><td>:</td><td>${esc((o && o.jabatan) || '-')}</td></tr>
<tr><td>Instansi</td><td>:</td><td>${esc((o && o.instansi) || '-')}</td></tr>
</table>
<p class="body" style="margin-top:2px">Selanjutnya disebut <b>${esc(label)}</b>.</p>`;
}
function bastRenderPreview() {
  const box = $('bastPreviewA4'); if (!box || !bastLaporan) return;
  const L = bastLaporan, kat = bastKolomKategori(L.kategori), kb = bastKalimatPembuka();
  const head = kat.kolom.map((c) => `<th>${esc(c.label)}</th>`).join('');
  const rows = L.items.map((row, i) => `<tr><td style="text-align:center">${i + 1}</td>${kat.kolom.map((c) => `<td>${esc(row[c.key] || '-')}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${kat.kolom.length + 1}" style="text-align:center;color:#888">Belum ada data</td></tr>`;
  const saksiHtml = L.saksi.filter((s) => rapikan(s.nama)).length
    ? `<p class="body">Disaksikan oleh:</p><table><tr><th>No</th><th>Nama</th><th>Jabatan</th></tr>${L.saksi.filter((s) => rapikan(s.nama)).map((s, i) => `<tr><td style="text-align:center">${i + 1}</td><td>${esc(s.nama)}</td><td>${esc(s.jabatan || '-')}</td></tr>`).join('')}</table>`
    : '';
  box.innerHTML = `
<span class="badge-cat">${esc(kat.label.toUpperCase())}</span>
<h1>BERITA ACARA SERAH TERIMA</h1>
<h2>No: ${esc(L.nomorBast || '-')}</h2>
<div class="line"></div>
<p class="body">Pada hari ini, <b>${esc(kb.hari)}</b>, tanggal <b>${esc(kb.tglKata)}</b> bulan <b>${esc(kb.bulan)}</b> tahun <b>${esc(kb.tahunKata)}</b> (${esc(kb.tglAngka)}), pukul <b>${esc(bastFormatWaktu(L.waktu))}</b>${L.tempat ? ', bertempat di <b>' + esc(L.tempat) + '</b>' : ''}, kami yang bertanda tangan di bawah ini:</p>
${bastIdList(L.pihakSatu, 'PIHAK PERTAMA')}
${bastIdList(L.pihakDua, 'PIHAK KEDUA')}
<p class="body">PIHAK PERTAMA telah menyerahkan kepada PIHAK KEDUA berupa <b>${esc(kat.kalimat)}</b> sebagai berikut:</p>
<table><tr><th>No</th>${head}</tr>${rows}</table>
${saksiHtml}
${L.catatan ? '<p class="body"><b>Catatan:</b> ' + esc(L.catatan) + '</p>' : ''}
<p class="body">Demikian Berita Acara ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
<div class="ttd">
  <div class="col">PIHAK PERTAMA<div class="space"></div><div class="nm">${esc((L.pihakSatu.nama || '-').toUpperCase())}</div>${esc(L.pihakSatu.jabatan || '-')}</div>
  <div class="col">PIHAK KEDUA<div class="space"></div><div class="nm">${esc((L.pihakDua.nama || '-').toUpperCase())}</div>${esc(L.pihakDua.jabatan || '-')}</div>
</div>
${bastTtdSaksiHTML()}`;
}
function bastTtdSaksiHTML() {
  const saksi = bastLaporan.saksi.filter((s) => rapikan(s.nama));
  if (!saksi.length) return '';
  const potong = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };
  return potong(saksi, 3).map((grup) => `<div class="ttd">${grup.map((s) => `<div class="col">SAKSI<div class="space"></div><div class="nm">${esc((s.nama || '-').toUpperCase())}</div>${esc(s.jabatan || '-')}</div>`).join('')}</div>`).join('');
}

/* ---------- Badge "Mengubah laporan tersimpan" ---------- */
function bastUpdateBadge() {
  const b = $('editBadge'); if (!b) return;
  if (jenisAktif !== 'BAST') return; // biarkan LK yang mengatur strip saat jenis LK aktif
  if (!bastEditingId) { b.style.display = 'none'; b.innerHTML = ''; return; }
  dbGet(bastEditingId).then((r) => {
    if (!r) { b.style.display = 'none'; b.innerHTML = ''; return; }
    const k = AVS.ketJejak(r);
    b.innerHTML = `<b>✎ Mengubah laporan tersimpan</b><span class="sep">•</span><span>${esc(k.dibuat)}</span><span class="sep">•</span><b>${esc(k.ubah)}</b>` +
      `<button type="button" class="rw" onclick="bukaRiwayat('${esc(bastEditingId)}')">Riwayat ▾</button>` +
      `<button type="button" class="batal" onclick="bastNewReport()">Batal</button>`;
    b.style.display = 'flex';
  }).catch(() => { b.style.display = 'none'; });
}

/* ---------- Simpan / Muat / Hapus ---------- */
function bastValidasi() {
  const L = bastLaporan;
  if (!L.tanggal) return 'Isi Tanggal terlebih dahulu.';
  if (!rapikan(L.pihakSatu.nama)) return 'Isi Nama Pihak Pertama terlebih dahulu.';
  if (!rapikan(L.pihakDua.nama)) return 'Isi Nama Pihak Kedua terlebih dahulu.';
  return null;
}
async function bastCekDuplikatNomor(nomor, kecualiId) {
  const target = rapikan(nomor).toUpperCase(); if (!target) return null;
  const recs = await bastRekamTersimpan();
  return recs.find((r) => r.id !== kecualiId && rapikan(r.nomorBast).toUpperCase() === target) || null;
}
async function bastSimpan() {
  const err = bastValidasi(); if (err) { toast(err, 'err'); return; }
  if (!bastLaporan.nomorOtomatis) {
    const bentrok = await bastCekDuplikatNomor(bastLaporan.nomorBast, bastEditingId);
    if (bentrok) { toast(`Nomor BAST "${rapikan(bastLaporan.nomorBast)}" sudah dipakai pada laporan lain. Gunakan nomor lain.`, 'err'); return; }
  }
  const rec = clone(bastLaporan);
  rec.id = bastEditingId || ('ba' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5));
  rec.jenis = 'BAST'; rec.savedAt = new Date().toISOString(); rec.versi = 1;
  try {
    await bastTetapkanNomor(rec);
    let lama = null; if (bastEditingId) { try { lama = await dbGet(bastEditingId); } catch (e) { /* abaikan */ } }
    AVS.catatJejak(rec, lama, []);
    await dbPut(rec);
    bastCatatNomor(rec);
    bastLaporan.nomorBast = rec.nomorBast; bastLaporan.nomorDikunci = rec.nomorDikunci; bastRenderNomor();
    bastEditingId = bastLaporan.id = rec.id; bastDirty = false; bastUpdateBadge();
    updateCount();
    toast((lama ? 'BAST diperbarui (' + AVS.waktu(rec.diperbaruiPada) + ')' : 'BAST berhasil disimpan') + (rec.nomorBast ? ' dengan nomor ' + rec.nomorBast : '') + '.', 'ok', 5500);
    switchPage('saved');
  } catch (e) { toast('Gagal menyimpan: penyimpanan browser penuh atau diblokir.', 'err'); }
}
function bastNewReport() {
  if (bastDirty && !confirm('Mulai BAST baru? Isian saat ini akan dikosongkan (BAST yang sudah disimpan tidak terpengaruh).')) return;
  bastLaporan = bastModelBaru(); bastEditingId = null; bastDirty = false;
  bastRenderForm(); bastRenderPreview(); bastUpdateBadge();
  switchPage('form');
}
async function bastEditReport(id) {
  const r = await dbGet(id); if (!r) return;
  if (jenisAktif === 'BAST' && bastDirty && !confirm('Isian yang sedang dibuka belum disimpan dan akan diganti. Lanjutkan?')) return;
  if (jenisAktif === 'LK' && dirty && !confirm('Isian Laporan Kejadian yang sedang dibuka belum disimpan dan akan diganti. Lanjutkan?')) return;
  pilihJenisLaporan('BAST');
  bastLaporan = bastLengkapiModel(clone(r)); bastEditingId = r.id; bastLaporan.id = r.id; bastDirty = false;
  bastRenderForm(); bastRenderPreview(); bastUpdateBadge();
  switchPage('form');
}
async function bastHapusLaporan(id) {
  if (!confirm('Hapus BAST ini? Tindakan ini tidak dapat dibatalkan.')) return;
  await dbDel(id);
  if (bastEditingId === id) { bastEditingId = null; bastLaporan.id = null; bastUpdateBadge(); }
  updateCount(); renderTersimpan();
}

/* ---------- PDF ---------- */
function bastSiapPdf() {
  if (typeof pdfMake === 'undefined' || typeof buildBastDoc === 'undefined') throw new Error('Pustaka PDF BAST tidak termuat.');
  pdfMake.vfs = Object.assign({}, window.KEJADIAN_VFS || {}, window.MONTSERRAT_VFS || {});
  pdfMake.fonts = Object.assign({}, window.KEJADIAN_FONTS || {}, window.MONTSERRAT_FONTS || {});
}
function bastNamaFilePdf(r) {
  const kat = bastKolomKategori(r.kategori).label;
  return `BAST ${kat} (${r.tanggal || hariIni()}).pdf`;
}
async function bastCetakPdf(r, mode) {
  try {
    bastSiapPdf();
    let win = null; if (mode !== 'unduh') win = window.open('', '_blank');
    const pdf = pdfMake.createPdf(buildBastDoc(r));
    if (mode === 'unduh') { pdf.download(bastNamaFilePdf(r)); toast('PDF sedang diunduh...'); return; }
    pdf.getBlob((blob) => {
      const url = URL.createObjectURL(blob);
      if (win) { win.location.href = url; } else { toast('Jendela pratinjau diblokir browser. Gunakan tombol Unduh PDF.', 'err'); }
    });
  } catch (e) { toast('Gagal membuat PDF: ' + e.message, 'err'); }
}
async function bastCetakPdfKeIframe(r) {
  try {
    bastSiapPdf();
    const pdf = pdfMake.createPdf(buildBastDoc(r));
    return new Promise((resolve) => pdf.getBlob((blob) => { document.getElementById('pdfFrameWeb').src = URL.createObjectURL(blob); resolve(true); }));
  } catch (e) { toast('Gagal membuat PDF: ' + e.message, 'err'); return false; }
}
async function bastUnduhId(id) { const r = await dbGet(id); if (r) bastCetakPdf(bastLengkapiModel(r), 'unduh'); }
async function bastPratinjauId(id) { const r = await dbGet(id); if (r) bastCetakPdf(bastLengkapiModel(r), 'pratinjau'); }

/* ---------- Kartu untuk daftar "Laporan Tersimpan" gabungan ---------- */
function bastRenderKartu(r) {
  const kat = bastKolomKategori(r.kategori);
  const kolomUtama = kat.kolom[0] ? kat.kolom[0].key : null;
  const ringkasItem = (r.items || []).map((it) => kolomUtama ? it[kolomUtama] : '').filter(Boolean);
  const ringkas = ringkasItem.slice(0, 2).join(', ') + (ringkasItem.length > 2 ? `, +${ringkasItem.length - 2} lainnya` : '');
  return `
<div class="saved-card">
<div style="min-width:0;">
<div style="font-weight:bold;color:var(--primary);font-size:14px;"><span class="jenis-tag bast">BAST</span>${esc(tglIndo(r.tanggal))}${r.nomorBast ? ' • No. ' + esc(r.nomorBast) : ''}</div>
<div class="saved-cases">Serah terima: ${esc(ringkas || '(belum ada item)')}</div>
<div class="jejak">${jejakHTML(r)}</div>
<div class="saved-meta">Kategori: ${esc(kat.label)} • Pihak 1: ${esc(r.pihakSatu && r.pihakSatu.nama || '-')} • Pihak 2: ${esc(r.pihakDua && r.pihakDua.nama || '-')}</div>
</div>
<div class="saved-actions">
<button type="button" class="btn-info" onclick="bastPratinjauId('${esc(r.id)}')">Pratinjau</button>
<button type="button" class="btn-warning" onclick="bastEditReport('${esc(r.id)}')">Ubah</button>
<button type="button" class="btn-success" onclick="bastUnduhId('${esc(r.id)}')">Unduh PDF</button>
<button type="button" class="btn-info" style="background:#EEF1F6;color:#475569" onclick="bukaRiwayat('${esc(r.id)}')">Riwayat</button>
<button type="button" class="btn-danger" onclick="bastHapusLaporan('${esc(r.id)}')">Hapus</button>
</div></div>`;
}
