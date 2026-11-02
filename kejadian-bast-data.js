// =====================================================
// DATA BAWAAN BERITA ACARA SERAH TERIMA / BAST (boleh diedit)
// Setiap kategori mendefinisikan kolom tabel item sendiri - form, live
// preview, dan PDF semuanya membaca definisi ini agar selalu konsisten.
// Setelah diubah, upload ulang file ini saja ke hosting.
// =====================================================

const KATEGORI_BAST = {
  barang_bukti: {
    label: 'Barang Bukti',
    kalimat: 'barang bukti',
    kolom: [
      { key: 'namaBarang', label: 'Nama Barang' },
      { key: 'jumlah', label: 'Jumlah' },
      { key: 'kondisi', label: 'Kondisi' },
      { key: 'keterangan', label: 'Keterangan' }
    ]
  },
  pax: {
    label: 'Penumpang (Pax)',
    kalimat: 'penumpang',
    kolom: [
      { key: 'namaPenumpang', label: 'Nama Penumpang' },
      { key: 'noIdentitas', label: 'No. Identitas/Paspor' },
      { key: 'noPenerbangan', label: 'No. Penerbangan' },
      { key: 'keterangan', label: 'Keterangan' }
    ]
  },
  lost_found: {
    label: 'Lost & Found',
    kalimat: 'barang temuan (lost & found)',
    kolom: [
      { key: 'namaBarang', label: 'Nama Barang' },
      { key: 'jumlah', label: 'Jumlah' },
      { key: 'lokasiDitemukan', label: 'Lokasi Ditemukan' },
      { key: 'keterangan', label: 'Keterangan' }
    ]
  },
  fasilitas: {
    label: 'Fasilitas',
    kalimat: 'fasilitas/peralatan',
    kolom: [
      { key: 'namaAlat', label: 'Nama Alat/Unit' },
      { key: 'jumlah', label: 'Jumlah' },
      { key: 'kondisi', label: 'Kondisi' },
      { key: 'lokasi', label: 'Lokasi' }
    ]
  },
  lainnya: {
    label: 'Lainnya',
    kalimat: 'barang/hal',
    kolom: [
      { key: 'nama', label: 'Nama Item' },
      { key: 'jumlah', label: 'Jumlah' },
      { key: 'keterangan', label: 'Keterangan' }
    ]
  }
};

const KATEGORI_BAST_URUTAN = ['barang_bukti', 'pax', 'lost_found', 'fasilitas', 'lainnya'];
const KATEGORI_BAST_AWAL = 'barang_bukti';

// Penomoran otomatis BAST: <NOMOR_AWALAN_BAST>/<urut>/<bulan romawi>/<tahun 2 angka>
// Sama persis strukturnya dengan penomoran Laporan Kejadian (OOSC/LK/...),
// hanya kode jenis laporannya yang beda: LK untuk Laporan Kejadian, ST untuk BAST.
const NOMOR_AWALAN_BAST = 'OOSC/ST';
const NOMOR_PAD_BAST = 0;
