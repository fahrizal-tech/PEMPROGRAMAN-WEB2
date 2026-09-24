# Nexus LMS — Admin Panel

Admin Panel (back-office) untuk **Learning Management System**. Dikembangkan sebagai Tugas 1 mata kuliah **Pemrograman Web 2 (Client-Side Programming)**.

Aplikasi berjalan sepenuhnya di sisi klien (HTML5, CSS3/Tailwind, JavaScript). Data disimpan lokal di browser melalui lapisan service yang nantinya bisa diganti ke database online tanpa mengubah halaman.

> **Status:** layout, navigasi, data lokal, dan login demo sudah berjalan. Fitur CRUD & grafik sedang dikembangkan (Milestone 3). Lihat [Roadmap](docs/roadmap.md) dan [Changelog](CHANGELOG.md).

## Fitur Utama

| Modul | Halaman | Ringkasan |
| --- | --- | --- |
| Portal Login | `index.html` | Autentikasi admin |
| Dashboard | `pages/dashboard.html` | Ringkasan statistik & grafik (Chart.js) |
| Data Master Kursus | `pages/data-master.html` | Tabel kursus dengan aksi Tambah / Edit / Hapus |
| Form Kursus | `pages/form.html` | Input & edit data kursus dengan validasi |
| Laporan & Analitik | `pages/laporan.html` | Rekap aktivitas akademik, cetak & ekspor |
| Mahasiswa | `pages/mahasiswa.html` | Direktori mahasiswa & validasi KRS |
| Instruktur | `pages/instruktur.html` | Direktori dosen & beban kinerja |
| Kelas Virtual | `pages/kelas-virtual.html` | Jadwal & status sesi daring |
| Tugas & Kuis | `pages/tugas-kuis.html` | Manajemen tugas & penilaian rubrik |
| Sertifikasi | `pages/sertifikasi.html` | Penerbitan sertifikat digital |
| Pengaturan | `pages/pengaturan.html` | Konfigurasi sistem |

## Desain

- **Tema visual:** Material Design, diterapkan lewat design system *Academic Admin Studio* ([spesifikasi](docs/design-system-stitch.md))
- **Tools:** Google Stitch (wireframe & UI), Figma ([desain awal](https://www.figma.com/design/7aUyoUDLLLjVhcwW6yczcT/LMS-Admin-Panel?node-id=2-112&t=kEYvoVaPdIVuAusP-1))
- **Dokumen perancangan:** [docs/perancangan.md](docs/perancangan.md)

## Struktur Direktori

```text
├── docs/
│   ├── perancangan.md          # Milestone 1: menu, ER-D, user flow, design system
│   ├── roadmap.md              # Rencana & checklist pengembangan
│   ├── design-system-stitch.md # Token desain dari Stitch
│   └── img/                    # Screenshot rancangan (Stitch & Figma)
├── assets/
│   ├── css/                    # Stylesheet
│   ├── js/                     # Script aplikasi
│   ├── img/                    # Logo & gambar
│   └── data/                   # Seed data (mock database)
├── pages/                      # Halaman admin panel
├── index.html                  # Halaman Login
├── .github/workflows/          # Otomasi (pemindai rahasia)
├── CHANGELOG.md
├── SECURITY.md
└── README.md
```

## Menjalankan Secara Lokal

Tidak perlu instalasi. Cukup buka `index.html` di browser (klik dua kali), lalu masuk dengan akun demo:

| Email | Kata sandi | Peran |
| --- | --- | --- |
| `admin@nexus.ac.id` | `nexus2026` | Super Administrator |
| `baak@nexus.ac.id` | `nexus2026` | Admin Akademik (BAAK) |

> Login pada versi ini adalah **simulasi** (aplikasi berjalan sepenuhnya di browser), lihat [SECURITY.md](SECURITY.md). Data tersimpan di localStorage browser dan dapat dikembalikan ke kondisi awal dari halaman Pengaturan.
Semua halaman memakai CSS yang sudah di-build (`assets/css/app.css`) dan JavaScript biasa, sehingga bisa berjalan tanpa server.

Jika ingin memakai server lokal (misalnya untuk demo):
```bash
npm run serve        # lalu buka http://localhost:3000
```

### Menjalankan pengujian
```bash
npm test             # uji unit: data, storage, service, auth, utilitas
npm run test:e2e     # uji alur di browser (memakai Edge/Chrome yang terpasang)
npm run test:e2e -- --online   # uji yang sama ke website di GitHub Pages
```

### Build ulang CSS (hanya jika mengubah class Tailwind)
```bash
npm install
npm run build:css    # sekali build
npm run watch:css    # build otomatis saat file berubah
```

## Teknologi

- HTML5 semantik
- Tailwind CSS 3 (build via CLI, token dari design system Stitch)
- JavaScript (vanilla, tanpa framework)
- Chart.js
- Material Symbols & font Inter

---
Dibuat untuk keperluan tugas perkuliahan Pemrograman Web 2.
