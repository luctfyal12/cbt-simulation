# SIMULA — Simulasi CBT Uji Kompetensi

Situs latihan ujian berbasis komputer (CBT) untuk **D3 Teknologi Bank Darah**,
dibangun dari berkas *attempt review* latihan UKom dan arsip soal bergambar.

## Menjalankan

Buka `index.html` langsung di browser — tidak perlu server, tidak ada dependensi.

Atau lewat server lokal:

```bash
python3 -m http.server 4173
```

Lalu buka <http://localhost:4173>.

## Isi bank soal

| Paket | Sumber | Soal | Kunci jawaban |
|---|---|---|---|
| Paket 1 | PDF `1. Latihan Soal UKom 2` | 180 | Resmi (dari berkas) |
| Paket 2 | PDF `2. Latihan Soal Ukom I` | 180 | Resmi (dari berkas) |
| Paket 3 | PDF `3. LATIHAN SOAL UKOM II` | 161 | Resmi (dari berkas) |
| Paket 4 | Folder gambar `Dengan Jawaban` | 47 | Resmi (tanda merah di slide) |
| Paket 5 | Folder gambar `Soal tanpa jawaban` | 42 | **Hasil analisis — belum terverifikasi** |
| **Total** | | **610** | |

> **Paket 3** berisi 161 soal karena berkas PDF sumbernya memang terpotong pada soal ke-161
> (ekspor "page 1 of 20"), meskipun header ujiannya menyebut 180 butir.
>
> **Paket 4** berasal dari 50 gambar; 3 di antaranya duplikat sehingga tersisa 47 soal unik.
>
> **Paket 5** berasal dari 48 gambar (soal bernomor 1–45, tanpa nomor 3, 24, dan 34 yang tidak
> ada di folder); 6 duplikat dibuang sehingga tersisa 42 soal unik.

## Fitur

- **Dua mode** — *Ujian* (kunci disembunyikan sampai selesai) dan *Latihan* (kunci muncul tiap menjawab).
- **Sesi bisa diatur** — pilih paket, jumlah soal (20/50/100/semua), durasi, acak soal, acak opsi.
- **Timer mundur** dengan peringatan kuning (≤5 menit) dan merah (≤1 menit); ujian tersubmit otomatis saat waktu habis.
- **Peta soal** — status terjawab / ragu-ragu / kosong, lompat ke soal mana pun.
- **Penanda ragu-ragu** per soal.
- **Simpan otomatis** — sesi tersimpan di browser dan bisa dilanjutkan setelah tab ditutup.
- **Hasil & rincian** — nilai, jumlah benar/salah/kosong, waktu pakai, daftar jawaban yang bisa difilter.
- **Mode bahas** — telusuri tiap soal beserta kunci dan jawaban yang dipilih.
- **Tema terang/gelap** dan tata letak responsif sampai lebar ponsel.

### Pintasan papan ketik

| Tombol | Fungsi |
|---|---|
| `A`–`E` | Pilih jawaban |
| `←` `→` | Soal sebelumnya / selanjutnya |
| `F` | Tandai ragu-ragu |
| `M` | Buka/tutup peta soal |
| `Esc` | Tutup peta soal atau dialog |

## Struktur berkas

```
cbt-ukom/
├── index.html      # kerangka ketiga layar (beranda, ujian, hasil)
├── styles.css      # seluruh gaya + tema terang/gelap
├── app.js          # logika sesi, timer, penilaian, penyimpanan
├── data/soal.js    # bank soal (window.BANK_SOAL)
└── README.md
```

## Catatan tentang "Kunci Jawaban"

Sumber soal hanya memuat **kunci jawaban**, tanpa uraian pembahasan. Karena itu panel
di bawah tiap soal diberi judul *Kunci Jawaban* dan menampilkan kunci beserta
jawaban yang dipilih — bukan penjelasan yang dikarang sendiri.

### Paket 5 — kunci belum terverifikasi

Folder sumber Paket 5 tidak menyertakan kunci jawaban sama sekali. Kunci pada paket ini
**disusun lewat penalaran, bukan kunci resmi.** Konsekuensinya:

- Kartu Paket 5 diberi label `kunci belum terverifikasi`, dan sebuah peringatan muncul
  di beranda ketika paket itu dipilih.
- Setiap soal membawa tingkat keyakinan (`tinggi` / `sedang` / `rendah`) yang ditampilkan
  sebagai badge di panel Kunci Jawaban.
- Enam soal berkeyakinan **rendah** dan paling perlu diverifikasi: **no. 10, 13, 14, 17, 40, 45**
  (penomoran mengikuti nomor asli pada gambar, bukan urutan di aplikasi).

Cocokkan dengan buku pegangan atau dosen sebelum dijadikan patokan.

## Menambah atau mengubah soal

Sunting `data/soal.js`. Formatnya:

```js
window.BANK_SOAL = [
  {
    id: "paket1", nama: "Paket 1", judul: "...", deskripsi: "...",
    jumlah: 180,
    kunci: "resmi",          // "analisis" -> tampil label "kunci belum terverifikasi"
    soal: [
      { q: "teks soal", o: ["opsi A","opsi B","opsi C","opsi D","opsi E"], a: 2 }
      //  a = indeks jawaban benar (0 = opsi pertama)
      //  c = "tinggi" | "sedang" | "rendah"  (opsional, badge tingkat keyakinan)
    ]
  }
];
```

Pastikan `jumlah` sama dengan panjang array `soal`. Pilihan jumlah soal (20/50/100) yang
melebihi isi paket otomatis dinonaktifkan dan turun ke opsi valid terbesar.
