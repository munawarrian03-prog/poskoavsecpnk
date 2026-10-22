# Rencana Pengembangan — Sistem Pelaporan AVSEC Bandara Supadio

Berkas ini dirujuk dari banyak komentar di kode (`shell.js`, `data.js`, `beranda.js`,
`rekap.html`, `logbook.html`, dll) sebagai tempat catatan desain, keterbatasan yang
sudah diketahui, dan rencana perubahan — tapi belum pernah benar-benar ada di repo ini.
Dibuat sekarang sebagai titik awal, supaya rujukan-rujukan itu punya tempat yang nyata,
dan sebagai **inventaris perubahan** yang hidup untuk perubahan berikutnya.

Format tiap entri: **Status** (Direncanakan / Dikerjakan / Selesai), kapan dicatat,
masalah yang melatarinya, dan rencana perbaikannya — supaya sebelum sebuah perubahan
dikerjakan, sudah ada jejak diskusi & keputusannya di sini.

---

## Inventaris Perubahan

### Catatan Kesiapan Tugas (Apel/Briefing) di Log Book + waktu manual + rapikan PDF
- **Status:** Selesai
- **Dicatat:** 2026-10-23
- **Diverifikasi:** Playwright — dropdown Pemimpin terisi benar dari Personel posisi
  POSKO; Lokasi ikut berubah otomatis saat Kegiatan diganti (Apel/Briefing); entri
  baru Catatan Kegiatan punya jam kosong (bukan auto jam sekarang); data tersimpan &
  termuat ulang benar; drawer "Lihat" & PDF menampilkan bagian Kesiapan Tugas dengan
  benar, termasuk judul PDF "Log Book Harian". Regresi: record LAMA tanpa field
  `kesiapanTugas` tetap tampil "Belum diisi" (tidak error) di drawer maupun PDF; form
  baru/kosong tidak error (dropdown Pemimpin cuma "— pilih —").
- **Keputusan (mockup disetujui, https://claude.ai/artifact/Ntu8ie1xLKCqbTEXkrvaBk):**
  - Panel baru **"Catatan Kesiapan Tugas"** di `logbook.html`, ditaruh sebelum panel
    "Catatan Kegiatan". **SATU kartu tetap** per laporan (bukan list berulang) — tidak
    ada tombol tambah/hapus.
  - Field: **Kegiatan** (dropdown Apel/Briefing) — **Lokasi** otomatis mengikuti
    Kegiatan (Apel → "Ruang Kelas Avsec", Briefing → "Whatsapp Grup", field terkunci) —
    **Pemimpin** (dropdown, sumbernya nama personel di posisi POSKO pada Laporan
    Personel utk tanggal+shift+regu yang sama — pola sama seperti "Disusun Oleh") —
    **Materi** (teks manual) — **Waktu Pelaksanaan** (jam mulai s.d. jam selesai).
  - **Catatan Kegiatan** (sudah ada): tombol "+ Tambah Catatan Waktu" **tidak lagi
    otomatis mengisi jam sekarang** — kolom jam kosong, wajib diisi manual.
  - **PDF Log Book** (`logbook-pdf.js`): judul diubah dari "Log Book Serah Terima"
    jadi **"Log Book Harian"**; bagian "Catatan Kesiapan Tugas" ditambahkan tepat
    sebelum "Catatan Kegiatan"; skala tipografi dirapikan (judul 14pt, label kotak
    identitas 6.5pt kapital+spasi huruf, nilai 10pt tebal, judul seksi 9.5pt kapital +
    garis bawah tipis, isi 8.5–9pt, footer 6.5pt) — sebelumnya semua ukuran berkerumun
    di 8.5–11pt.
- **Lingkup:** `logbook.html` + `logbook-pdf.js` saja. Drawer pratinjau WEB milik
  Pantau Posko (`pantau-posko.html`, fungsi `renderLihatLogbook` miliknya sendiri,
  BUKAN PDF) belum ikut diperbarui menampilkan Catatan Kesiapan Tugas — PDF yang
  diunduh dari Pantau Posko tetap ikut (memakai `buildLogbookPdfHTML` yang sama),
  cuma pratinjau teks di drawer web-nya yang belum. Beri tahu kalau ingin disamakan.

### 1. Unduh PDF dari drawer pratinjau (ikon mata) di Pantau Posko — Personel/Fasilitas/Logbook
- **Status:** Selesai
- **Diverifikasi:** mock-server + Playwright — klik mata → tombol Unduh PDF muncul →
  berkas PDF benar-benar terunduh; utk Fasilitas (shift remote-only), "Disusun Oleh"
  terisi nama yang benar (dari `gabunganTerkini.personel`, bukan kosong).
- **Dicatat:** 2026-10-22
- **Konteks:** Admin yang klik ikon mata di Pantau Posko cuma melihat pratinjau web
  (`bukaPratinjau()`), tidak bisa mengunduh PDF-nya langsung dari situ — harus minta
  Posko mengunduhkan sendiri.
- **Temuan saat audit kelayakan:** `personel-pdf.js`/`fasilitas-pdf.js`/`logbook-pdf.js`
  adalah modul murni (bangun HTML dari data record), tidak terikat ke halaman tertentu —
  `pantau-posko.html` sudah punya record lengkapnya di `gabunganTerkini`, jadi bisa
  dipakai lagi. TAPI: PDF Fasilitas & Log Book mencari laporan Personel (Log Book juga
  Fasilitas) yang cocok tanggal+shift+regu untuk mengisi "Disusun Oleh" & ringkasan —
  pencarian itu (`AVS.cariLaporanPersonel`, `AVS.infoPembuatDariPersonel` di `shell.js`)
  SELALU membaca `localStorage` lokal saja, bukan data gabungan. Tanpa perbaikan, PDF
  utk shift yang dilaporkan dari posko LAIN akan punya "Disusun Oleh" kosong.
- **Rencana perbaikan:** muat `html2pdf.bundle.min.js` + 3 modul `*-pdf.js` di
  `pantau-posko.html`; tambah tombol "Unduh PDF" di drawer pratinjau; beri
  `AVS.cariLaporanPersonel`/`AVS.infoPembuatDariPersonel` parameter opsional "daftar
  data" (default: tetap baca lokal seperti sekarang, tidak mengubah 3 halaman editor)
  supaya Pantau Posko bisa mengoper `gabunganTerkini.personel` ke situ.
- **Lingkup:** Personel, Fasilitas, Log Book saja pada tahap ini (lihat #2 di bawah
  utk Kejadian & BAST — berkaitan tapi punya kerumitan tersendiri).

### 2. Kolom keterisian Kejadian & BAST di tabel Pantau Posko (opsional, tampilkan "Nihil")
- **Status:** Selesai
- **Diverifikasi:** mock-server + Playwright — record Kejadian/BAST remote-only tampil
  "Terisi" + ikon mata di baris shift yang benar (BAST dibuktikan masuk baris Malam
  krn jam 21:15), drawer menampilkan isi teks yang benar, tidak ada tombol Unduh PDF.
- **Dicatat:** 2026-10-22
- **Keputusan final:** di tabel Pantau Posko, di samping kolom Log Book, tambah kolom
  Kejadian dan BAST — tidak wajib terisi. Terisi → ikon mata (**pratinjau drawer SAJA,
  TANPA tombol Unduh PDF** — dibatalkan oleh pengguna, lihat alasan di bawah). Tidak
  terisi → tulisan "Nihil".
- **Kenapa Unduh PDF dibatalkan utk Kejadian/BAST di sini (meski secara teknis
  memungkinkan & sederhana — lihat catatan teknis di bawah):** karena sinkronisasi
  Kejadian hanya membawa TEKS (lihat entri sinkronisasi di bawah — foto/tanda tangan
  SENGAJA dibuang sebelum dikirim, demi batas 50.000 karakter/sel Google Sheets), PDF
  yang dibangun dari data gabungan di Pantau Posko tidak akan identik dengan PDF asli
  dari akun Posko (hilang bagian foto lampiran & tanda tangan). Pengguna memutuskan
  lebih baik TIDAK ada tombol Unduh PDF sama sekali di sini daripada ada tombol yang
  hasilnya berbeda/kurang dari yang diharapkan — drawer pratinjau teks saja sudah cukup.
- **Keputusan BAST:** baris shift ditentukan dari jam `waktu` BAST itu sendiri — sebelum
  20:00 = baris shift Pagi, 20:00 ke atas = baris shift Malam.
- **Rencana perbaikan:** perluas `D.statusPantauPosko()` (`data.js`) menerima daftar
  kejadian juga (hasil gabungan `AVS_SYNC.gabung()`, sama pola seperti Personel/
  Fasilitas/Logbook), tambah 2 kolom di `pantau-posko.html`, drawer pratinjau pakai
  render yang sudah ada di `kejadian.html` (disederhanakan utk web, bukan PDF).
- **Prasyarat:** entri "Sinkronisasi Kejadian & BAST" di bawah harus dikerjakan dulu
  (reaktivasi, Opsi A) — tanpa itu kolom ini cuma mencerminkan data lokal Admin sendiri.

### 3. Hilangkan menu "Laporan Kejadian" dari navigasi akun Admin
- **Status:** Selesai
- **Catatan implementasi:** menghapus item ini dari `MENU_ADMIN` (3 item persis
  JUMLAH_TETAP) membuka bug lama di `renderNav()` yang akan menduplikasi menu terakhir
  (slot "dinamis" jatuh ke item yang sudah tampil di "tetap") -- diperbaiki sekaligus
  (`bacaDinamis`/`renderNav` sekarang aman utk menu sepanjang berapa pun).
- **Diverifikasi:** Playwright — menu Admin tampil [Beranda, Pantau Laporan, Rekap,
  Jadwal Dinas] tanpa duplikat & tanpa ikon overflow; menu Posko tidak berubah.
- **Dicatat:** 2026-10-22
- **Rencana:** di `MENU_ADMIN` (`shell.js`), hapus entri `kejadian`. Menu Posko
  (`MENU_POSKO`) tidak berubah — Posko tetap punya akses Laporan Kejadian seperti
  sekarang.
- **Catatan:** `kejadian.html` sendiri memakai gerbang umum (`AVS_gerbangUtama`, bukan
  admin-only) — Admin masih BISA membuka halaman itu lewat URL langsung/bookmark kalau
  tahu alamatnya, cuma tidak ada lagi tautannya di menu. Perlu dikonfirmasi apakah itu
  cukup (sesuai permintaan: "hilangkan **menu**"), atau Admin juga harus diblokir total
  dari halaman itu (perlu gerbang baru, beda dari sekadar menyembunyikan menu).

### 4. Kolom Kondisi/Status/Keterangan pada "Alat Bermasalah" di Rekap
- **Status:** Selesai
- **Diverifikasi:** Playwright — 1 alat rusak 2x dgn keterangan & tanggal berbeda
  tampil sbg 2 baris-dalam di bawah nomor yang sama (rowspan benar), kolom Kondisi/
  Status/Keterangan terisi benar per kemunculan.
- **Dicatat:** 2026-10-22 (diperjelas 2026-10-22)
- **Keputusan final — susunan kolom:** `# | Item | Pos | Kali | Kondisi | Status | Keterangan`.
  - Kolom **"Jenis"** yang ada sekarang (isinya campuran "Rusak"/"Tidak Digunakan")
    **diganti nama jadi "Kondisi"**, isinya khusus **Baik/Rusak** — sesuai field
    `kondisi` yang sudah ada di form Laporan Fasilitas (bentuk A).
  - Kolom baru **"Status"**: **Digunakan/Tidak Digunakan** — sesuai field `status`
    yang sudah ada di form Laporan Fasilitas (bentuk A). Diletakkan ANTARA Kondisi
    dan Keterangan.
  - Kolom baru **"Keterangan"**: teks keterangan asli dari laporan.
  - Kalau alat yang sama (nomor urut yang sama) punya LEBIH DARI SATU kemunculan
    dengan Kondisi/Status/Keterangan berbeda-beda, semua kemunculan itu ditampilkan
    sebagai baris-dalam di bawah nomor yang sama (rowspan pada # /Item/Pos/Kali),
    masing-masing baris-dalam punya Kondisi, Status, Keterangan, DAN tanggal
    laporannya sendiri (supaya tetap bisa dibedakan laporan kapan):
    ```
    [Kondisi 1] [Status 1] [Keterangan 1] [Tanggal 1]
    [Kondisi 2] [Status 2] [Keterangan 2] [Tanggal 2]
    ```
  - Mockup: lihat bagian #5 di https://claude.ai/artifact/Hyh9e8oeG4xDcksj8eWRMH
- **Rencana perbaikan:** kartu "Alat Bermasalah" di Rekap dipakai lewat
  `D.statFasilitasRentang()` (`data.js`) + `tabelFasilitas()` (`rekap.js`) — BUKAN
  fungsi `statFasilitas()`/`tabelFasilitasRingkas()` yang dipakai kartu serupa di
  Beranda (beda fungsi, scope perbaikan ini hanya di Rekap sesuai permintaan).
  `statFasilitasRentang()` saat ini hanya mengagregasi `jumlah`/`jenis` (digabung
  Rusak+Tidak Digunakan jadi satu label) per alat — perlu diubah menyimpan array
  kemunculan `[{ tanggal, kondisi, status, keterangan }]` per alat (field `kondisi`/
  `status`/`keterangan` sudah ada di item Fasilitas bentuk A, tinggal dibaca apa
  adanya), lalu `tabelFasilitas()` dirender ulang dgn `rowspan` per alat.

### 5. Kartu "Shift Belum Lengkap" di Beranda jadi "Kepatuhan Grup" (breakdown per Regu)
- **Status:** Selesai
- **Dicatat:** 2026-10-22 (diperjelas 2026-10-22)
- **Catatan implementasi (berubah dari rencana awal):** ternyata Rekap SUDAH punya
  widget "Kepatuhan Grup" yang lengkap (`cincinKepatuhan`/`grafikKepatuhanPerGrup`/
  `reguBertugasJadwal` di `rekap.js`, sudah ada sebelum sesi ini) -- 4 cincin progres
  per regu, regu tiap shift dipetakan dari Jadwal Dinas yang sudah diunggah
  (`localStorage['savedJadwalDinas']`), BUKAN dari field `regu` di laporan. Ini jauh
  lebih akurat daripada rencana donat-komposisi di bawah (yang tidak punya cara
  mengetahui regu yang BERTUGAS pada shift tanpa laporan sama sekali) -- jadi widget
  ini DIPORTING ke `beranda.js` apa adanya (bukan dibuat ulang dgn `grafikDonat`),
  termasuk aturan "-" abu-abu utk regu yang Jadwal Dinas bulan itu belum diunggah.
- **Keputusan:** judul & ISI kartu "Shift Belum Lengkap" di Beranda diganti jadi
  "Kepatuhan Grup" — isinya breakdown **per Regu (A/B/C/D)**, bukan lagi 3 baris per
  jenis laporan (Personel/Fasilitas/Log Book) seperti sekarang. Ditampilkan sebagai
  **grafik donat** (gaya & pola sama seperti donat yang sudah ada di Rekap/Beranda,
  mis. `grafikDonat`/`grafikDonatPos`) — satu warna per regu + legenda persentase
  kelengkapan di sampingnya, bukan 4 baris progres linear. Saat ikon mata diklik,
  modal yang terbuka TETAP menampilkan "Shift Belum Lengkap" apa adanya (tabel yang
  sudah ada, `tabelKepatuhanPenuh`) — jadi hanya tampilan kartu ringkasnya yang berubah
  sudut pandang & bentuk grafik, detail di modal tidak berubah.
  - Mockup (arah awal, sebelum ditemukan widget Rekap yang sudah ada): bagian #6 di
    https://claude.ai/artifact/Hyh9e8oeG4xDcksj8eWRMH
- **Diverifikasi:** Playwright — data uji dgn Jadwal Dinas (Regu A piket Pagi, Regu B
  piket Malam) + laporan sebagian lengkap: cincin Regu A=50%, Regu B=0%, C/D="-" (tak
  ada jadwal) — sesuai hitungan manual. Tampilan identik Admin vs Posko (dicek HTML
  sama persis). Modal "lihat semua" tetap tabel shift belum lengkap, tidak berubah.
- **Syarat:** tampilan Beranda akun Posko & Admin harus tetap identik (dicek: SAAT INI
  memang sudah identik — `beranda.js` tidak punya percabangan berdasar peran sama
  sekali; kartu baru ini juga tidak boleh beda antar peran).
- **Rencana perbaikan:** `kepatuhanRentang()` (`data.js`) saat ini menghitung
  kepatuhan per JENIS laporan (dipakai `renderKepatuhanIndikator`) — perlu fungsi
  baru (atau perluasan) yang mengelompokkan hasil per REGU: dari shift-shift yang
  jatuh tempo pada rentang terpilih, hitung per regu berapa yang lengkap vs belum
  (gabungan 3 jenis laporan), lalu kartu baru menampilkan 4 baris progres (Regu
  A/B/C/D) menggantikan 3 baris jenis yang ada sekarang.

### Bug: tanggal mundur/maju satu hari saat impor Jadwal Dinas dari Excel (sheet tipe GRUP)
- **Status:** Selesai
- **Dicatat:** 2026-10-21
- **Konteks:** Pengguna melaporkan setelah mengunggah Excel jadwal dinas, tanggal yang
  seharusnya "Libur" di kalender web malah tampil "Masuk Pagi" — kode shift tergeser satu
  hari dari tanggal aslinya.
- **Masalah ditemukan:** di `jadwal-dinas-import.js`, fungsi `parseSheetGrup()` (dipakai
  sheet tipe GRUP, mis. ROSTER ORGANIK & IASS — sheet tipe DATAR mis. NEW IASS TIDAK
  terdampak karena tidak memakai objek `Date` sama sekali, hanya angka 1-31 polos), baris:
  ```js
  jadwal[isoTanggal(date.getFullYear(), date.getMonth(), date.getDate())] = kode.toUpperCase();
  ```
  `date` adalah objek `Date` hasil `XLSX.read(..., { cellDates: true })` (SheetJS 0.18.5,
  `lib/xlsx.core.min.js`). Dibuktikan lewat reproduksi langsung (bikin file Excel dgn
  serial tanggal bersih/tanpa pecahan, baca ulang dgn library yang sama): di zona waktu
  **Asia/Jakarta (WIB)**, objek `Date` yang dihasilkan SheetJS untuk serial tanggal
  tersebut melenceng beberapa detik SEBELUM tengah malam yang dimaksud (bukan pas tengah
  malam) — kemungkinan besar imbas offset historis zona waktu Jakarta era 1899 yang
  dipakai SheetJS sbg basis perhitungan serial. Akibatnya `getFullYear()/getMonth()/
  getDate()` (pembaca waktu LOKAL) membaca tanggal SATU HARI LEBIH MUNDUR dari yang
  sebenarnya — kode shift tanggal 2 tersimpan ke kunci ISO tanggal 1, kode tanggal 3 ke
  tanggal 2, dst. Tidak muncul di UTC atau zona waktu lain yang sudah dicoba (hanya WIB).
- **Keputusan:** disetujui untuk diperbaiki.
- **Rencana perbaikan:** sebelum membaca tanggal dari objek `Date` tsb, geser dulu ke
  tengah hari (+12 jam) supaya kemelesetan beberapa detik/menit itu tidak pernah
  melompati batas hari, baru baca `getFullYear()/getMonth()/getDate()` dari hasil
  geseran itu. Perbaikan lokal di satu fungsi saja, tidak mengubah `XLSX.read()` atau
  cara deteksi sel tanggal (`instanceof Date`).
- **Dampak ke pengguna:** jadwal yang SUDAH terlanjur diunggah dgn tanggal salah (sheet
  tipe GRUP) perlu diunggah ulang setelah perbaikan ini dipasang — perbaikan ini tidak
  mengoreksi data yang sudah tersimpan, hanya mencegah kesalahan yang sama terulang pada
  unggahan berikutnya.
- **Diverifikasi:** reproduksi manual dgn `lib/xlsx.core.min.js` (versi persis yang
  dipakai web ini) di TZ=Asia/Jakarta, TZ=UTC, dan TZ=America/New_York — sebelum
  perbaikan: tanggal mundur satu hari di WIB (benar di UTC/New_York). Sesudah
  perbaikan: benar di ketiganya. Diverifikasi juga lewat `praProsesWorkbook()` yang
  sebenarnya (bukan cuma fungsi tanggalnya saja) dengan sheet GRUP tiruan (5 kolom
  tanggal berurutan + legenda) di ketiga zona waktu tsb — hasil akhir `jadwal{}` persis
  cocok dengan tanggal aslinya di Excel.

### Pulihkan (restore) di Rekap belum ikut tersinkron ke server (sync GAS)
- **Status:** Selesai
- **Dicatat:** 2026-10-20
- **Konteks:** Setelah fitur sinkronisasi lintas perangkat (Google Apps Script) dipasang
  di Pantau Posko, Rekap, dan Beranda (lihat `sync.js`, `AVS_SYNC`), muncul pertanyaan:
  kalau Admin **Memulihkan** data dari berkas cadangan (`Rekap.impor()`), apakah data itu
  ikut menyebar lagi ke Posko di perangkat lain?
- **Masalah ditemukan:** Tidak. `impor()` di `rekap.js` menulis langsung ke
  `localStorage` (`timpaLS()`) dan IndexedDB (`timpaKejadianDB()`) milik browser Admin itu
  sendiri saja — berbeda dari jalur simpan normal (`saveReport()` di 3 halaman editor)
  yang selalu memanggil `AVS_SYNC.kirim()` setelah simpan lokal berhasil. Akibatnya,
  laporan yang dipulihkan di Admin **tidak otomatis terkirim ke Google Sheet**, sehingga
  **tidak muncul di Posko** (atau Admin PC lain) sampai laporan itu disimpan ulang secara
  manual lewat jalur normal.
  - Catatan tambahan (bukan bug baru, tapi berkaitan): proses timpa ini juga tidak
    membandingkan `diperbaruiPada` — beda dari `AVS_SYNC.gabung()` yang memang
    membandingkan waktu untuk menentukan versi mana yang menang. Jadi memulihkan cadangan
    yang lebih lama dari data yang sedang aktif bisa menimpanya jadi versi lama, tanpa
    peringatan. (Tidak menyebabkan data dobel — penimpaan tetap berdasarkan `id` yang
    sama — tapi berisiko menimpa versi yang lebih baru.)
- **Keputusan:** disetujui untuk diperbaiki — Pulihkan harus ikut menyinkronkan data yang
  berhasil dipulihkan ke seluruh pihak (Posko & Admin PC lain), bukan cuma ke perangkat
  Admin yang memulihkan.
- **Rencana perbaikan:** di `impor()` (`rekap.js`), setelah `timpaLS()`/`timpaKejadianDB()`
  berhasil menyimpan tiap record secara lokal, panggil juga `AVS_SYNC.kirim(jenis, record)`
  untuk tiap record yang berhasil dipulihkan (jenis `personel`/`fasilitas`/`logbook`) —
  mengikuti pola aditif yang sama seperti 3 halaman editor. Untuk Kejadian/BAST, lihat
  dulu apakah perlu diskusi terpisah (lihat entri terkait foto lampiran di bawah) sebelum
  diikutkan, karena record Kejadian bisa membawa foto base64 yang belum aman dikirim ke
  backend Google Sheet saat ini.
- **Dampak ke pengguna:** tidak ada perubahan perilaku untuk yang belum memasang
  sinkronisasi (`AVS_SYNC.aktif() === false`) — perbaikan ini murni menambah pengiriman
  di belakang layar, memakai pola aman (antrian retry) yang sudah ada.
- **Bug tersembunyi yang ditemukan & ikut diperbaiki saat verifikasi:** `flush()` di
  `sync.js` menyimpan salinan antrian LOKAL (basi) di awal, lalu menimpa SELURUH antrian
  di `localStorage` dengan salinan itu setiap kali satu entri berhasil terkirim. Karena
  `impor()` memanggil `AVS_SYNC.kirim()` tiga kali beruntun (Personel, Fasilitas, Log Book)
  dalam satu tick yang sama, entri ke-2 & ke-3 yang baru ditambahkan ke antrian SELAGI
  entri ke-1 masih dikirim (fetch belum selesai) ikut tertimpa/hilang — hanya entri
  pertama yang benar-benar terkirim ke server. Diperbaiki dengan membuat `flush()` selalu
  membaca ulang antrian dari `localStorage` di tiap putaran, dan menghapus HANYA entri
  yang baru sukses terkirim (`hapusDariAntrian()`) — bukan menimpa seluruh antrian dengan
  snapshot lama. Ini juga memperbaiki potensi bug yang sama kalau pengguna menyimpan
  beberapa laporan sangat berdekatan waktunya di 3 halaman editor.
- **Diverifikasi:** mock-server + Playwright — Pulihkan 1 record tiap jenis (Personel/
  Fasilitas/Log Book) dari berkas cadangan, ketiganya terkonfirmasi sampai di server
  (sebelum perbaikan `flush()`, hanya 1 dari 3 yang sampai). Kejadian/BAST SENGAJA belum
  diikutkan (lihat entri terkait foto lampiran di bawah). Regresi dicek ulang: Pantau
  Posko (simpan/hapus/offline-retry), Rekap, Beranda, dan kondisi sync belum dikonfigurasi
  — semua tetap sesuai perilaku sebelumnya (errors: bersih).

### Pindahkan akses Cadangkan/Pulihkan dari Admin ke Posko di Rekap
- **Status:** Selesai
- **Diverifikasi:** Playwright — akun Admin: tombol tersembunyi; akun Posko: tombol
  tampil & menu Rekap muncul di navigasi (via ikon overflow, setelah Jadwal Dinas).
- **Dicatat:** 2026-10-22
- **Konteks:** Lanjutan dari perbaikan Pulihkan di atas — setelah Pulihkan ikut
  tersinkron ke server, pengguna memutuskan tombol Cadangkan/Pulihkan sebaiknya dipegang
  Posko (yang mengisi laporan sehari-hari), bukan Admin.
- **Keputusan:**
  - Di akun **Admin**, menu Rekap: tombol **Cadangkan/Pulihkan disembunyikan**. Admin
    tetap bisa membuka Rekap untuk melihat rekap/grafik, hanya tombol itu yang hilang.
  - Di akun **Posko**: menu **Rekap dimunculkan** di navigasi utama, diletakkan
    **setelah menu Jadwal Dinas** (`MENU_POSKO` di `shell.js`). Tombol
    Cadangkan/Pulihkan **dimunculkan** di Rekap milik Posko.
- **Rencana perbaikan:** tambah `rekap` ke `MENU_POSKO` di `shell.js` (urutan setelah
  `jadwal`); di `rekap.html`/`rekap.js`, bungkus tombol Cadangkan/Pulihkan dengan
  pengecekan `AVS_PERAN() === 'posko'` (tampil) vs `=== 'admin'` (sembunyi) — kebalikan
  dari asumsi awal (Pulihkan dikira perlu dibatasi ke Admin demi keamanan; pengguna
  memutuskan sebaliknya).
- **Dampak ke pengguna:** Posko mendapat akses penuh ke Rekap (termasuk grafik/rekap
  yang sebelumnya cuma bisa dilihat Admin) sekaligus Cadangkan/Pulihkan; Admin kehilangan
  tombol Cadangkan/Pulihkan di Rekap miliknya (tapi tetap bisa lihat data).

### Sinkronisasi Laporan Kejadian & BAST lintas perangkat (Opsi A — teks saja)
- **Status:** Selesai (kode repo) — LANGKAH GOOGLE SHEET/CODE.GS BELUM DIKERJAKAN PENGGUNA
- **Diverifikasi (kode repo):** mock-server + Playwright — simpan Kejadian dgn
  fotos[]+ttd terisi → sampai di server TANPA fotos/ttd (field lain penuh); simpan
  BAST → sampai di server LENGKAP; hapus Kejadian → ikut terhapus dari server dgn
  jenis yang benar ('kejadian' vs 'bast', dibedakan dari `r.jenis` sebelum dihapus).
- **PENTING, belum dikerjakan:** langkah di Google Sheet & Code.gs (2 tab baru,
  pemetaan `SHEETS`, redeploy) MASIH PERLU DIKERJAKAN SENDIRI oleh pengguna di
  deployment Apps Script miliknya — tanpa itu, pengiriman akan gagal diam-diam
  (masuk antrian retry selamanya) sampai tab & pemetaannya ada.
- **Dicatat:** 2026-10-20 (dibatalkan 2026-10-22, DIAKTIFKAN KEMBALI 2026-10-22 demi #2)
- **Masalah:** Laporan Kejadian bisa membawa foto lampiran & tanda tangan sebagai
  base64 — berisiko melebihi batas 50.000 karakter per sel Google Sheets yang dipakai
  backend sync. BAST (tanpa foto) aman memakai pola yang sama seperti Personel/
  Fasilitas/Logbook.
- **Riwayat keputusan:** sempat dibatalkan total, lalu diaktifkan kembali karena
  dibutuhkan sebagai prasyarat kolom keterisian Kejadian/BAST di Pantau Posko (lihat
  entri #2 di atas). Lingkupnya dipersempit: **Opsi A saja** (teks, tanpa foto) — Opsi
  B (Google Drive utk foto) TETAP tidak dikerjakan, sudah dikonfirmasi tidak diperlukan
  karena Unduh PDF utk Kejadian/BAST di Pantau Posko juga dibatalkan (lihat #2) — jadi
  tidak ada kebutuhan PDF identik yang butuh foto di sisi Admin.
- **Keputusan akhir:**
  - **BAST:** disinkronkan APA ADANYA (tidak ada foto di model BAST, aman).
  - **Kejadian:** disinkronkan TEKS SAJA — field `fotos` (array foto lampiran) dan
    gambar tanda tangan (`ttd`) **dibuang dari record SEBELUM dikirim** ke GAS, sisanya
    (kronologi, lokasi, dasar hukum, nomor, tindak lanjut, dll) dikirim penuh.
- **Yang perlu dikerjakan di Google Sheet & Code.gs (di luar repo, dikerjakan
  pengguna + saya siapkan teks Code.gs-nya):**
  1. Tambah 2 tab baru di spreadsheet yang SUDAH ADA (bukan spreadsheet baru):
     `Kejadian` dan `BAST`, header sama seperti 3 tab lain
     (`id | tanggal | shift | regu | dataJson | dibuatPada | diperbaruiPada`; kolom
     `shift` boleh kosong utk BAST).
  2. `Code.gs`: tambah `kejadian`/`bast` ke pemetaan `SHEETS` yang sudah ada — logika
     `doGet`/`doPost`/upsert tidak perlu ditulis ulang (sudah generik).
  3. **Redeploy** lewat *Manage deployments → Edit → New version* — URL & TOKEN tidak
     berubah.
- **Rencana perbaikan di kode (repo):** di `kejadian.html`/`kejadian-bast.js`, setelah
  simpan lokal (`simpan()`/BAST-nya) sukses, panggil `AVS_SYNC.kirim('kejadian'|'bast',
  record)` — utk Kejadian, kirim SALINAN record dgn `fotos`/`ttd` dihapus dulu (bukan
  record aslinya, supaya data lokal Kejadian di perangkat itu sendiri tetap lengkap
  dgn foto). Hapus juga disinkronkan (`AVS_SYNC.hapus()`) sama seperti 3 jenis lain.

### Tombol "Muat Ulang" manual di Rekap & Beranda
- **Status:** Selesai
- **Diverifikasi:** Playwright — tombol tampil hanya utk Admin di kedua halaman,
  tersembunyi utk Posko; diklik tidak menimbulkan error.
- **Dicatat:** 2026-10-20 (diaktifkan kembali 2026-10-22)
- **Konteks:** Rekap & Beranda cuma menarik data sinkronisasi sekali saat halaman dimuat
  (tidak ada polling seperti Pantau Posko). Opsi 4 (tombol manual "Muat Ulang" di toolbar
  Rekap / header Beranda) sudah di-mockup, sempat diarsipkan, sekarang dilanjutkan.
- **Keputusan baru:** tombol ini **khusus muncul di akun Admin saja** — dibungkus
  pengecekan `AVS_PERAN() === 'admin'` sebelum dirender, sama seperti pola yang dipakai
  untuk fitur Admin-only lain. Posko tidak melihat tombol ini di Beranda miliknya.
  (Di Rekap otomatis Admin-saja secara praktik, tapi sejak Rekap juga dimunculkan di
  menu Posko — lihat entri di atas — pengecekan peran ini jadi WAJIB, bukan cuma
  kebetulan karena menu tersembunyi.)

### Update daftar "Pos Penempatan" di Laporan Personel (19 pos baru)
- **Status:** Selesai
- **Diverifikasi:** Playwright —
  (1) form baru menampilkan ke-19 pos sesuai urutan & nama baru, simpan ke
  localStorage menyimpan ke-19 entri, PDF memuat ke-19 nama baru lengkap dengan data
  personel yang diisi;
  (2) regresi data lama: record tersimpan yang merujuk id `scp_transit` (dihapus dari
  daftar baru) tetap tampil dengan nama tersimpan "SSCP + (Dep & Arr)" tanpa error;
  record yang merujuk id `scp_vip` (masih ada, namanya diganti) otomatis tampil nama
  baru "PSCP VIP" di PDF; nama-nama personel lama tetap muncul; tidak ada error
  console/halaman di kedua skenario.
- **Dicatat:** 2026-10-22
- **Konteks:** Permintaan pengguna — daftar `POS_BAWAAN` di `kategori.js` diganti dari
  9 pos menjadi 19 pos (beberapa di-rename: `scp_int` "PSCP LAGs" → "LAGs INSPECTION",
  `scp_vip` "SCP VIP" → "PSCP VIP"; `scp_transit` "SSCP + (Dep & Arr)" dihapus total,
  dipecah jadi 5 pos baru yang lebih rinci: `sscp`, `sscp_ci`, `sscp_ad`, `sscp_ai`,
  `sscp_remote`; ditambah 9 pos baru lain: `ph_dz`, `ph_pz`, `walking_P`, `vp_r4`,
  `P_15`, `P_33`).
- **Analisis sebelum ubah kode:** `laporan-personel.html` dan `personel-pdf.js`
  terbukti 100% generik terhadap isi `POS_BAWAAN` (dibangun lewat `.map()`, hanya satu
  id yang hardcode yaitu `'posko'` untuk kolom "Disusun Oleh" — id ini tidak berubah).
  Jadi **satu-satunya perubahan kode yang diperlukan adalah array `POS_BAWAAN` di
  `kategori.js`** — tidak ada baris lain yang perlu disentuh di kedua berkas tsb.
  `kejadian.html` (daftar pos jaga) juga generik, otomatis ikut ke-19 nama baru.
- **Mekanisme graceful fallback (sudah ada, tidak diubah):** `AVS.namaPosPersonelTerbaru`
  di `shell.js` membuat laporan LAMA otomatis ikut nama BARU kalau id-nya masih ada di
  `POS_BAWAAN` (contoh: `scp_vip`), dan tetap tampil dengan nama yang tersimpan dulu
  (tanpa error) kalau id-nya sudah dihapus dari daftar (contoh: `scp_transit`).
- **Belum dikerjakan / perlu konfirmasi pengguna:** `fasilitas-data.js` punya daftar
  `POS_FASILITAS_BAWAAN` TERPISAH (nama/id ditulis sendiri, bukan diturunkan otomatis
  dari `POS_BAWAAN`) yang sengaja disamakan id-nya dengan sebagian pos di
  `POS_BAWAAN` untuk rujukan silang (mis. kolom "Dibuat oleh" di Fasilitas mengambil
  nama orang pertama di pos POSKO dari Laporan Personel). Perubahan di atas TIDAK
  merambat ke `fasilitas-data.js` — saat ini nama pos di Fasilitas untuk `scp_int`
  masih "PSCP LAGs" (belum "LAGs INSPECTION") dan `scp_transit` masih ada sebagai satu
  pos checklist peralatan (padahal di Personel sudah dipecah jadi 5 pos). `scp_vip` di
  Fasilitas juga masih belum punya checklist peralatan sama sekali (TODO lama, lihat
  Tahap 1). Pengguna perlu memutuskan apakah/bagaimana checklist Fasilitas ingin
  disesuaikan menyusul perubahan ini — lingkupnya sengaja dibatasi hanya ke Laporan
  Personel sesuai permintaan, tidak menyentuh Fasilitas tanpa konfirmasi.

### Sinkronkan penamaan pos di Fasilitas dengan daftar Pos Penempatan baru (Personel)
- **Status:** Selesai
- **Diverifikasi:** Playwright — form baru Fasilitas menampilkan `scp_int` sbg "LAGs
  INSPECTION", pos SSCP kini id `sscp` nama "SSCP" (bukan lagi `scp_transit`/"SSCP +
  (Dep & Arr)"), `ph_protection` kini "PUBLIC HALL" (huruf besar, konsisten dgn
  Personel); `scp_vip` & 6 pos patroli baru (ph_dz/ph_pz/walking_P/vp_r4/P_15/P_33)
  sengaja TIDAK ditambahkan (lihat keputusan di bawah); regresi — record Fasilitas
  LAMA yang merujuk id `scp_transit` (sudah di-rename) tetap tampil dgn nama
  tersimpan "SSCP + (Dep & Arr)" tanpa error, PDF tetap terunduh normal.
- **Dicatat:** 2026-10-22
- **Konteks:** Lanjutan dari entri "Update daftar Pos Penempatan di Laporan Personel"
  — pengguna minta semua disesuaikan dgn perubahan kategori. `fasilitas-data.js`
  (`POS_FASILITAS_BAWAAN`) punya nama/id ditulis manual sendiri (bukan diturunkan
  otomatis dari `POS_BAWAAN`), jadi tidak ikut berubah otomatis dan perlu disunting
  manual: `scp_int` "PSCP LAGs" → "LAGs INSPECTION"; `scp_transit` (id) → `sscp` (id),
  nama "SSCP + (Dep & Arr)" → "SSCP" (SSCP di Personel kini dipecah jadi 5 pos
  `sscp`/`sscp_ci`/`sscp_ad`/`sscp_ai`/`sscp_remote` untuk penugasan personel, tapi
  checklist peralatan fisiknya tetap satu — dipakai bersama); `ph_protection` nama
  "Public Hall" → "PUBLIC HALL" (menyamakan huruf besar dgn Personel).
- **Keputusan pengguna (ditanya via pertanyaan singkat):**
  - **PSCP VIP** (id `scp_vip`): checklist peralatan **belum diisi** — pengguna pilih
    isi sendiri nanti, TODO di `fasilitas-data.js` tetap dipertahankan.
  - **6 pos patroli baru** (Drop Zone, Pick Up Zone, Walking Patrol, Patroli R.4,
    Perimeter 15, Perimeter 33): **sengaja tidak ditambahkan** ke Fasilitas —
    sifatnya mobile/patroli, tidak punya checklist peralatan tetap tersendiri.
- **Tidak diubah:** `fasilitas.html` dan `fasilitas-pdf.js` (sudah generik terhadap
  isi `POS_FASILITAS_BAWAAN`, sama seperti Laporan Personel).

### Perkecil donat "Kepatuhan Grup" (Rekap & Beranda) + gabung baris "Alat Bermasalah" per rentang tanggal
- **Status:** Selesai
- **Diverifikasi:** Playwright —
  (1) ukuran SVG donat Kepatuhan Grup kini maksimal 78x78px di Rekap & Beranda (sebelumnya
  auto-membesar mengikuti kartu sebelahnya, bisa >150px kalau kartu "Daftar Shift Belum
  Lengkap"-nya tinggi/kosong);
  (2) tabel "Alat Bermasalah" di Rekap — data uji 6 laporan berurutan (1-4 Okt nilai sama,
  5-6 Okt nilai lain, 1 Nov nilai sama persis dgn 5-6 Okt tapi beda bulan) menghasilkan TEPAT
  3 baris catatan: "1-4 Okt 26", "5-6 Okt 26", dan "1 Nov 26" terpisah sendiri (tidak ikut
  digabung ke 5-6 Okt meski nilainya identik — krn beda bulan, sesuai aturan tidak pernah
  menggabung lintas bulan);
  (3) regresi — tabel kosong (belum ada data) tetap tampil pesan "Belum ada masalah..." tanpa
  error; kemunculan tunggal (cuma 1 laporan) tetap tampil tanggal tunggal (bukan format
  rentang); item Bentuk B (checklist jumlah/rusak, tanpa konsep Status) tetap tampil normal.
- **Dicatat:** 2026-10-22
- **Konteks:** 2 permintaan pengguna sekaligus (sudah dikonfirmasi lewat mockup sebelum
  dikerjakan):
  1. Donat "Kepatuhan Grup" terlalu besar karena CSS-nya auto-fit penuh ke tinggi kartu
     (`max-width:100%;max-height:100%`) — diubah jadi dibatasi tetap (`max-width:78px;
     max-height:78px`), masih `width:auto;height:auto` di bawah batas itu jadi tetap menyusut
     kalau ruang kartu sungguhan lebih kecil (layar sempit). Perubahan identik dilakukan di
     `rekap.js` (`cincinKepatuhan`) dan `beranda.js` (`cincinKepatuhan`, duplikat fungsi yang
     sama — lihat komentar "porting PERSIS dari rekap.js" di beranda.js).
  2. Tabel "Alat Bermasalah" di Rekap sebelumnya membuat satu baris per LAPORAN (jadi kalau
     satu alat rusak dgn keterangan sama dilaporkan 10 hari berturut-turut, tampil 10 baris
     identik). Sekarang kemunculan BERURUTAN (diurutkan tanggal+shift naik) yang Kondisi/
     Status/Keterangan-nya PERSIS SAMA digabung jadi satu baris rentang tanggal (mis.
     "1-4 Okt 26"); begitu salah satu dari ketiganya berubah pada kemunculan berikutnya,
     mulai baris baru. Penggabungan TIDAK PERNAH melewati batas bulan (supaya format label
     rentang tanggal tetap benar — pola yang sama dgn `ringkasTanggalList` yang sudah ada).
     Logika gabung (`gabungkanCatatan`) ditaruh di `data.js` (`statFasilitasRentang`, sumber
     data), bukan di `rekap.js` (lapisan tampilan) — `tabelFasilitas` di rekap.js tinggal
     pakai field `mulai`/`akhir` hasil gabungan utk membentuk label (reuse `labelTunggal`/
     `labelRentang` yang sudah ada).
- **Tidak diubah:** `rekap-pdf.js` (PDF Rekap menangkap DOM yang sudah dirender, jadi otomatis
  ikut tabel yang sudah digabung tanpa perlu disentuh).

### Log Book: hapus label "(otomatis)" pada Lokasi + waktu tunggal utk Briefing
- **Status:** Selesai
- **Diverifikasi:** Playwright — label kt-fld tidak ada lagi yang berisi "(otomatis)"; mode
  Apel (default) tetap tampil rentang Waktu Mulai/s.d./Waktu Selesai seperti sebelumnya
  (regresi: isi 07:00–07:30 tetap tampil rentang di drawer Lihat & PDF, Lokasi "Ruang Kelas
  Avsec" tetap benar); ganti Kegiatan ke Briefing (Lokasi otomatis jadi "Whatsapp Grup") ->
  field berubah jadi satu "Waktu" tunggal (s.d. & Waktu Selesai disembunyikan); isi 07:30 ->
  drawer Lihat & PDF tampil "07:30" tunggal, tidak ada tanda rentang "–"; tidak ada error
  console/halaman di kedua mode.
- **Dicatat:** 2026-10-22
- **Konteks:** 2 permintaan pengguna:
  1. Label "Lokasi (otomatis)" di Catatan Kesiapan Tugas disederhanakan jadi "Lokasi" saja
     (field tetap non-aktif/auto-terisi dari Kegiatan, cuma teks "(otomatis)"-nya dihapus).
  2. Briefing (lokasi "Whatsapp Grup") sifatnya beda dari Apel (lokasi "Ruang Kelas Avsec")
     — briefing lewat WA grup biasanya tercatat sbg satu waktu kirim, bukan rentang
     mulai-selesai seperti apel tatap muka. Field waktu kini otomatis berubah jadi satu
     "Waktu" tunggal saat Lokasi = "Whatsapp Grup", dan kembali jadi rentang "Waktu Mulai
     s.d. Waktu Selesai" saat Lokasi = "Ruang Kelas Avsec".
- **Keputusan desain:** nilai `waktuSelesai` yang sudah tersimpan TIDAK dihapus saat
  berpindah ke mode tunggal (field cuma disembunyikan) — supaya kalau Kegiatan diganti
  balik ke Apel, isian rentang sebelumnya tidak hilang. Toggle mode ditentukan dari nilai
  `kesiapanTugas.lokasi === 'Whatsapp Grup'` (dicek di `logbook.html`: form + drawer "Lihat",
  dan `logbook-pdf.js`: PDF) — konsisten di ketiga tempat yang menampilkan Waktu Pelaksanaan.
