// =====================================================
// DATA DASAR LAPORAN FASILITAS
// Struktur per pos: { id, name, items: [...] }
// Setiap item punya bentuk:
//   'A' = Tunggal/Jalur   -> Kondisi (Baik/Rusak) + Status (Digunakan/Tidak) + Keterangan
//   'B' = Kumpulan Berjumlah -> Jumlah + Rusak (Baik dihitung otomatis), gaya sama seperti
//         Kekuatan Personel di laporan-personel.html
//   'C' = Kelengkapan     -> Lengkap/Tidak Lengkap + Keterangan
//
// id pos SENGAJA disamakan persis dengan POS_BAWAAN di kategori.js
// supaya rujukan silang ke Laporan Personel (mis. mengambil nama
// orang #1 di POSKO untuk kolom "Dibuat oleh") tetap konsisten.
//
// Perubahan di aplikasi (tombol "+ Tambah Pos/Item") hanya berlaku
// untuk laporan yang sedang dibuat; file ini adalah nilai awalnya.
// id item harus unik dalam satu pos, huruf kecil + underscore.
//
// CATATAN PENTING: pos "SCP VIP" (id: scp_vip di kategori.js) BELUM
// dimasukkan ke sini. Isinya menunggu konfirmasi pengguna — lihat
// RENCANA-PENGEMBANGAN.md, Tahap 1, sebelum melengkapi pos ini.
// =====================================================

const POS_FASILITAS_BAWAAN = [
  {
    id: 'posko',
    name: 'POSKO',
    items: [
      { id: 'posko_pc',   name: 'Komputer/PC',  bentuk: 'A' },
      { id: 'posko_pabx', name: 'PABX/Telepon', bentuk: 'A' },
      { id: 'posko_dok',  name: 'Dokumen',      bentuk: 'C' }
    ]
  },
  {
    id: 'hbscp',
    name: 'HBSCP',
    items: [
      { id: 'hbscp_xray1', name: 'Mesin X-Ray Line 1', bentuk: 'A' },
      { id: 'hbscp_xray2', name: 'Mesin X-Ray Line 2', bentuk: 'A' },
      { id: 'hbscp_xray3', name: 'Mesin X-Ray Line 3', bentuk: 'A' },
      { id: 'hbscp_xray4', name: 'Mesin X-Ray Line 4', bentuk: 'A' },
      { id: 'hbscp_etd',   name: 'ETD',                bentuk: 'A' },
      { id: 'hbscp_lock',  name: 'Locker',              bentuk: 'A' },
      { id: 'hbscp_pb',    name: 'Panic Button',        bentuk: 'A' },
      { id: 'hbscp_pabx',  name: 'PABX/Telepon',        bentuk: 'A' },
      { id: 'hbscp_dok',   name: 'Dokumen',              bentuk: 'C' }
    ]
  },
  {
    id: 'pscp',
    name: 'PSCP',
    items: [
      { id: 'pscp_xray1', name: 'Mesin X-Ray Line 1',    bentuk: 'A' },
      { id: 'pscp_xray2', name: 'Mesin X-Ray Line 2',    bentuk: 'A' },
      { id: 'pscp_xray3', name: 'Mesin X-Ray Line 3',    bentuk: 'A' },
      { id: 'pscp_wtmd1', name: 'WTMD Line 1',           bentuk: 'A' },
      { id: 'pscp_wtmd2', name: 'WTMD Line 2',           bentuk: 'A' },
      { id: 'pscp_wtmd3', name: 'WTMD Line 3',           bentuk: 'A' },
      { id: 'pscp_etd',   name: 'ETD',                   bentuk: 'A' },
      { id: 'pscp_hhm1',  name: 'Hand-Held Metal 1',     bentuk: 'A' },
      { id: 'pscp_hhm2',  name: 'Hand-Held Metal 2',     bentuk: 'A' },
      { id: 'pscp_tp1',   name: 'Totem Piona Line 1',    bentuk: 'A' },
      { id: 'pscp_tp2',   name: 'Totem Piona Line 2',    bentuk: 'A' },
      { id: 'pscp_tp3',   name: 'Totem Piona Line 3',    bentuk: 'A' },
      { id: 'pscp_lock',  name: 'Locker',                bentuk: 'A' },
      { id: 'pscp_baki',  name: 'Baki',  bentuk: 'B', jumlahBawaan: 50 },
      { id: 'pscp_dok',   name: 'Dokumen', bentuk: 'C' }
    ]
  },
  {
    id: 'scp_int', // = "PSCP LAGs" di kategori.js
    name: 'PSCP LAGs',
    items: [
      { id: 'lags_xray', name: 'Mesin X-Ray', bentuk: 'A' },
      { id: 'lags_lock', name: 'Locker',       bentuk: 'A' },
      { id: 'lags_baki', name: 'Baki', bentuk: 'B', jumlahBawaan: 7 },
      { id: 'lags_dok',  name: 'Dokumen', bentuk: 'C' }
    ]
  },
  {
    id: 'scp_transit', // = "SSCP + (Dep & Arr)" di kategori.js (nama disamakan dgn Laporan Personel)
    name: 'SSCP + (Dep & Arr)',
    items: [
      { id: 'sscp_xray', name: 'Mesin X-Ray', bentuk: 'A' },
      { id: 'sscp_wtmd', name: 'WTMD',         bentuk: 'A' },
      { id: 'sscp_hhmd', name: 'HHMD',         bentuk: 'A' },
      { id: 'sscp_baki', name: 'Baki', bentuk: 'B', jumlahBawaan: 2 },
      { id: 'sscp_dok',  name: 'Dokumen', bentuk: 'C' }
    ]
  },
  {
    id: 'cctv',
    name: 'CCTV',
    items: [
      { id: 'cctv_pabx',   name: 'PABX/Telepon', bentuk: 'A' },
      { id: 'cctv_ctp',    name: 'CTP',           bentuk: 'A' },
      { id: 'cctv_otp',    name: 'OTP',           bentuk: 'A' },
      { id: 'cctv_lock',   name: 'Locker',        bentuk: 'A' },
      { id: 'cctv_tab',    name: 'Tab Lofia',     bentuk: 'A' },
      { id: 'cctv_pc',     name: 'Computer/PC', bentuk: 'B', jumlahBawaan: 8 },
      { id: 'cctv_mon',    name: 'Monitor',      bentuk: 'B', jumlahBawaan: 8 },
      { id: 'cctv_ups',    name: 'UPS',          bentuk: 'B', jumlahBawaan: 2 },
      { id: 'cctv_charger',name: 'Charger HT',   bentuk: 'B', jumlahBawaan: 2 },
      { id: 'cctv_ht',     name: 'Handy Talky',  bentuk: 'B', jumlahBawaan: 10 },
      { id: 'cctv_dok',    name: 'Dokumen',      bentuk: 'C' }
    ]
  },
  {
    id: 'acp_brc', // = "ASCP (BRC)" di kategori.js
    name: 'ASCP (BRC)',
    items: [
      { id: 'ascp_xray',    name: 'Mesin X-Ray S-View', bentuk: 'A' },
      { id: 'ascp_wtmd',    name: 'WTMD',                bentuk: 'A' },
      { id: 'ascp_hhmd',    name: 'HHMD',                bentuk: 'A' },
      { id: 'ascp_lock',    name: 'Locker',              bentuk: 'A' },
      { id: 'ascp_mirror',  name: 'Mirror Detector',     bentuk: 'A' },
      { id: 'ascp_charger', name: 'Charger HT',          bentuk: 'A' },
      { id: 'ascp_ht',      name: 'Handy Talky', bentuk: 'B', jumlahBawaan: 4 },
      { id: 'ascp_dok',     name: 'Dokumen',     bentuk: 'C' }
    ]
  },
  {
    id: 'ph_protection', // = "PUBLIC HALL" di kategori.js
    name: 'Public Hall',
    items: [
      { id: 'ph_patroli', name: 'Mobil Patroli-03', bentuk: 'A' },
      { id: 'ph_dok',     name: 'Dokumen',          bentuk: 'C' }
    ]
  }

  // TODO (menunggu konfirmasi pengguna):
  // {
  //   id: 'scp_vip',
  //   name: 'SCP VIP',
  //   items: [ ... ]
  // }
];
