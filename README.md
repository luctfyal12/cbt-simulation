# SIMULA — Simulasi CBT Uji Kompetensi

Situs latihan ujian berbasis komputer (CBT) untuk **D3 Teknologi Bank Darah**,
dibangun dari tiga berkas *attempt review* latihan UKom.

## Menjalankan

Buka `index.html` langsung di browser — tidak perlu server, tidak ada dependensi.

Atau lewat server lokal:

```bash
python3 -m http.server 4173
```

Lalu buka <http://localhost:4173>.

## Isi bank soal

| Paket | Sumber PDF | Jumlah soal |
|---|---|---|
| Paket 1 | `1. Latihan Soal UKom 2` | 180 |
| Paket 2 | `2. Latihan Soal Ukom I` | 180 |
| Paket 3 | `3. LATIHAN SOAL UKOM II` | 161 |
| **Total** | | **521** |

> Paket 3 berisi 161 soal karena berkas PDF sumbernya memang terpotong pada soal ke-161
> (ekspor "page 1 of 20"), meskipun header ujiannya menyebut 180 butir.

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

PDF sumber hanya memuat **kunci jawaban**, tanpa uraian pembahasan. Karena itu panel
di bawah tiap soal diberi judul *Kunci Jawaban* dan menampilkan kunci resmi beserta
jawaban yang dipilih — bukan penjelasan yang dikarang sendiri.

## Menambah atau mengubah soal

Sunting `data/soal.js`. Formatnya:

```js
window.BANK_SOAL = [
  {
    id: "paket1", nama: "Paket 1", judul: "...", deskripsi: "...",
    jumlah: 180,
    soal: [
      { q: "teks soal", o: ["opsi A","opsi B","opsi C","opsi D","opsi E"], a: 2 }
      //  a = indeks jawaban benar (0 = opsi pertama)
    ]
  }
];
```

Pastikan `jumlah` sama dengan panjang array `soal`.
