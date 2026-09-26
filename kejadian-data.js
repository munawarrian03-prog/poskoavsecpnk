// =====================================================
// DATA BAWAAN LAPORAN KEJADIAN (boleh diedit)
// Setelah diubah, upload ulang file ini saja ke hosting.
// =====================================================

// Jabatan yang muncul sebagai saran ketikan
const JABATAN_UMUM = [
  'Airport Security Supervisor',
  'Airport Security Chief Asst',
  'Airport Security Chief',
  'Airport Security Department Head'
];

// Jabatan awal pada tiap kolom (bisa diubah di formulir)
const JABATAN_AWAL = {
  preparedBy: 'Airport Security Supervisor',
  signedBy: 'Airport Security Chief Asst',
  distribution: 'Airport Security Department Head',
  approvedBy: 'Airport Security Chief'
};

// Dasar hukum yang bisa dipilih cepat (satu item per baris)
const DASAR_HUKUM_UMUM = [
  'Undang-Undang Nomor 1 Tahun 2009 tentang Penerbangan;',
  'Undang-Undang Nomor 35 Tahun 2009 tentang Narkotika (Lembaran Negara Republik Indonesia Tahun 2009 Nomor 143, Tambahan Lembaran Negara Republik Indonesia Nomor 5062);',
  'Peraturan Pemerintah Nomor 40 Tahun 2013 tentang Pelaksanaan Undang-Undang Nomor 35 Tahun 2009 tentang Narkotika (Lembaran Negara Republik Indonesia Tahun 2013 Nomor 96, Tambahan Lembaran Negara Republik Indonesia Nomor 5419).'
];

// Saran isi daftar "Terlampir"
const TERLAMPIR_UMUM = [
  'Dokumentasi Barang Bukti',
  'Dokumentasi KTP & Boarding Pass',
  'Berita Acara Serah Terima Orang dan Barang',
  'Dokumentasi serah terima kepada pihak berwenang'
];

const TEMPAT_AWAL = 'Kubu Raya';
const JUDUL_DATA_AWAL = 'Berikut Data Penumpang';
const LABEL_DATA_AWAL = ['Nama', 'TTL', 'Jenis Kelamin', 'Alamat'];
const PENUTUP_AWAL = 'Demikian laporan ini dibuat dengan sebenar-benarnya sebagai laporan pelaksanaan tugas kepada Airport Security Department Head.';

// Penomoran otomatis: <NOMOR_AWALAN>/<urut>/<bulan romawi>/<tahun 2 angka>, mis. OOSC/LK/1/IX/26
// Nomor urut mulai dari 1 lagi setiap bulan. NOMOR_PAD > 0 menambah angka nol di depan (mis. 3 → 001).
const NOMOR_AWALAN = 'OOSC/LK';
const NOMOR_PAD = 0;
