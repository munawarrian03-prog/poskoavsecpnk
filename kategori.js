// =====================================================
// KATEGORI SHIFT BAWAAN (Kekuatan Personel)
// nama    : nama kategori (tanpa jam)
// mulai   : jam mulai "HH:MM" (kosongkan '' bila tidak ada jam)
// selesai : jam selesai "HH:MM"
// Di laporan tampil sebagai: NAMA (mulai - selesai) WIB
// Perubahan di aplikasi hanya berlaku untuk laporan yang
// sedang dibuat; file ini adalah nilai awalnya.
// id harus unik dan tidak diubah-ubah (huruf kecil, angka, _).
// =====================================================
const KATEGORI_BAWAAN = [
  { id: 'org_pagi',   nama: 'ORGANIK (SHIFT PAGI/MALAM)', mulai: '',      selesai: ''      },
  { id: 'sec_org',    nama: 'SECWAN ORGANIK',             mulai: '05:00', selesai: '17:00' },
  { id: 'org_pjd',    nama: 'ORGANIK PJD',                mulai: '06:00', selesai: '18:00' },
  { id: 'iass_pagi',  nama: 'IASS PAGI',                  mulai: '08:00', selesai: '20:00' },
  { id: 'iass_malam', nama: 'IASS MALAM',                 mulai: '20:00', selesai: '08:00' },
  { id: 'iass_pp',    nama: 'IASS PP',                    mulai: '05:00', selesai: '17:00' },
  { id: 'iass_ojt',   nama: 'IASS OJT',                   mulai: '05:00', selesai: '15:00' },
  { id: 'iass_ojt1',  nama: 'IASS OJT',                   mulai: '13:00', selesai: '21:00' },
  { id: 'iass_ojt2',  nama: 'IASS OJT',                   mulai: '07:30', selesai: '16:30' },
  { id: 'rdo',        nama: 'PERSONEL RDO',               mulai: '07:00', selesai: '19:00' }
];

// Pos penempatan (tidak berubah-ubah, jadi tetap di sini)
const POS_BAWAAN = [
  { id: 'posko',          name: 'POSKO' },
  { id: 'pscp',           name: 'PSCP' },
  { id: 'scp_int',        name: 'PSCP LAGs' },
  { id: 'hbscp',          name: 'HBSCP' },
  { id: 'scp_transit',    name: 'SSCP + KEDATANGAN' },
  { id: 'acp_brc',        name: 'ASCP (BRC)' },
  { id: 'cctv',           name: 'CCTV' },
  { id: 'scp_vip',        name: 'SCP VIP' },
  { id: 'ph_protection',  name: 'PUBLIC HALL' }
];
