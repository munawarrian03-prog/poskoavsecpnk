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

### 1. Unduh PDF dari drawer pratinjau (ikon mata) di Pantau Posko — Personel/Fasilitas/Logbook
- **Status:** Direncanakan
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
- **Status:** Direncanakan — ADA PERTANYAAN TERBUKA, belum bisa dikerjakan
- **Dicatat:** 2026-10-22
- **Rencana dari pengguna:** di tabel Pantau Posko, di samping kolom Log Book, tambah
  kolom Kejadian dan BAST — tidak wajib terisi (beda dari Personel/Fasilitas/Logbook).
  Terisi → ikon mata (pratinjau + Unduh PDF, sama seperti #1). Tidak terisi → tulisan
  "Nihil" (bukan badge "Belum Terisi" yang berkonotasi "seharusnya ada tapi belum").
- **Kendala yang ditemukan saat audit:** tabel Pantau Posko disusun PER SHIFT (Pagi/
  Malam per tanggal) — cocok untuk Personel/Fasilitas/Logbook/**Kejadian** karena
  ketiganya (+Kejadian) punya field `shift`. **BAST tidak punya field `shift` sama
  sekali** (`kejadian-bast.js`) — modelnya cuma `tanggal` + `waktu` (jam kejadian
  serah-terima), bisa terjadi nol, satu, atau beberapa kali sehari, tidak terikat
  batas Pagi/Malam. Jadi "keterisian BAST per baris shift" tidak punya definisi yang
  jelas dari data yang ada sekarang.
- **Pertanyaan untuk pengguna (perlu dijawab sebelum dikerjakan):**
  1. Untuk kolom **BAST**, bagaimana menentukan "terisi" per baris shift? Pilihan:
     (a) cocokkan hanya berdasar `tanggal` (BAST dgn tanggal itu, shift mana pun, muncul
     di KEDUA baris Pagi & Malam hari itu), atau (b) tentukan "Pagi"/"Malam" dari jam
     `waktu` BAST itu sendiri (mis. sebelum 20:00 = Pagi), atau (c) bentuk tabel/kolom
     lain di luar struktur per-shift yang ada sekarang khusus utk BAST.
  2. Kalau SATU shift punya LEBIH DARI SATU laporan Kejadian/BAST (mis. 2 BAST di
     shift Pagi yang sama) — ikon mata membuka daftar/dropdown, atau langsung yang
     pertama/terbaru?
- **Rencana perbaikan (setelah pertanyaan di atas terjawab):** perluas
  `D.statusPantauPosko()` (`data.js`) menerima daftar kejadian juga, tambah kolom di
  `pantau-posko.html`; "Unduh PDF" memakai `kejadian-pdf.js`/`kejadian-bast-pdf.js`
  yang sudah ada (pola sama seperti #1).

### 3. Hilangkan menu "Laporan Kejadian" dari navigasi akun Admin
- **Status:** Direncanakan
- **Dicatat:** 2026-10-22
- **Rencana:** di `MENU_ADMIN` (`shell.js`), hapus entri `kejadian`. Menu Posko
  (`MENU_POSKO`) tidak berubah — Posko tetap punya akses Laporan Kejadian seperti
  sekarang.
- **Catatan:** `kejadian.html` sendiri memakai gerbang umum (`AVS_gerbangUtama`, bukan
  admin-only) — Admin masih BISA membuka halaman itu lewat URL langsung/bookmark kalau
  tahu alamatnya, cuma tidak ada lagi tautannya di menu. Perlu dikonfirmasi apakah itu
  cukup (sesuai permintaan: "hilangkan **menu**"), atau Admin juga harus diblokir total
  dari halaman itu (perlu gerbang baru, beda dari sekadar menyembunyikan menu).

### 4. Keterangan pada item "Alat Bermasalah" di Rekap
- **Status:** Direncanakan — perlu klarifikasi kecil
- **Dicatat:** 2026-10-22
- **Rencana:** di kartu "Fasilitas Sering Bermasalah"/alat bermasalah pada Rekap, tambah
  kolom/baris "Keterangan" di tabelnya.
- **Perlu diperjelas:** keterangan yang dimaksud itu teks APA? Record Fasilitas memang
  sudah punya field `keterangan` per-item (dipakai `ringkasBermasalahFasilitas` di
  `beranda.js`: `it.keterangan || (Rusak/Tidak Digunakan)`) — kemungkinan besar ini
  yang dimaksud (menampilkan isi keterangan asli dari laporan), tapi `D.statFasilitas()`
  di `data.js` SAAT INI hanya mengagregasi `jumlah`/`jenis`, tidak menyimpan teks
  keterangan per kemunculan (kalau sama 1 alat rusak 3x dgn keterangan beda-beda, perlu
  diputuskan: tampilkan keterangan yang mana — yang terbaru? digabung semua?).

### 5. Kartu "Shift Belum Lengkap" di Beranda jadi "Kepatuhan Grup"
- **Status:** Direncanakan — ADA PERTANYAAN TERBUKA, belum bisa dikerjakan
- **Dicatat:** 2026-10-22
- **Rencana dari pengguna:** judul & isi kartu "Shift Belum Lengkap" di Beranda diubah
  jadi "Kepatuhan Grup"; tapi saat ikon mata diklik, isi modalnya TETAP menampilkan
  "shift belum lengkap" (tabel yang sudah ada, `tabelKepatuhanPenuh`). Pastikan
  tampilan Beranda akun Posko & Admin tetap identik (sejauh pengecekan saya, SAAT INI
  memang sudah identik — `beranda.js` tidak punya percabangan berdasar peran sama
  sekali; ini jadi syarat yang harus dijaga, bukan bug yang sudah ada).
- **Pertanyaan untuk pengguna:** "Kepatuhan Grup" itu isinya seperti apa? Kartu yang
  ada sekarang (`renderKepatuhanIndikator`) menunjukkan 3 baris progres PER JENIS
  laporan (Personel/Fasilitas/Log Book) — bukan per Regu/Grup. Apakah maksudnya:
  (a) isi kartu diganti jadi breakdown PER REGU (A/B/C/D — regu mana yang paling
  rajin/lalai melapor), dengan 3 baris jenis yang sekarang dipindah/dihapus, atau
  (b) sekadar ganti judul & kata-kata saja, isinya (3 baris per jenis) tetap sama?
  Kalau (a), perlu data tambahan: `kepatuhanRentang()` di `data.js` saat ini
  menghitung per JENIS, belum per REGU — perlu fungsi baru.

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
- **Status:** Direncanakan
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

### (Dibatalkan) Sinkronisasi Laporan Kejadian & BAST lintas perangkat
- **Status:** Dibatalkan
- **Dicatat:** 2026-10-20
- **Dibatalkan:** 2026-10-22
- **Masalah (konteks sebelum dibatalkan):** Laporan Kejadian bisa membawa foto lampiran &
  tanda tangan sebagai base64 — berisiko melebihi batas 50.000 karakter per sel Google
  Sheets yang dipakai backend sync saat ini. BAST (tanpa foto) aman memakai pola yang sama
  seperti Personel/Fasilitas/Logbook, tapi Kejadian tetap jadi ganjalan karena foto.
- **Keputusan:** dibatalkan atas permintaan pengguna — tidak dilanjutkan baik Opsi A
  (teks saja) maupun Opsi B (redesain backend ke Google Drive untuk foto). Laporan
  Kejadian & BAST tetap bersifat lokal-per-perangkat seperti sebelum fitur sinkronisasi
  dibangun, tidak ikut digabung lintas posko.

### Tombol "Muat Ulang" manual di Rekap & Beranda
- **Status:** Direncanakan
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

### (Dibatalkan) Tombol "Cadangkan Data" di menu Akun Posko
- **Status:** Dibatalkan
- **Dicatat:** 2026-10-20
- **Dibatalkan:** 2026-10-22
- **Keputusan desain yang sudah diambil sebelum dibatalkan:** ditaruh di dropdown "Akun"
  (bukan menu baru), cuma Cadangkan (bukan Pulihkan — tetap Admin-saja di Rekap demi
  keamanan data), dan membawa data **gabungan seluruh posko** (sama seperti `ekspor()`
  di Rekap), bukan cuma data lokal device itu sendiri.
- **Keputusan:** dibatalkan atas permintaan pengguna, mockup tidak dilanjutkan jadi kode.
  Cadangkan/Pulihkan tetap hanya ada di Rekap (Admin), seperti sebelum diskusi ini.
