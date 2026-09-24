# Nexus LMS — Admin Panel

Admin Panel (back-office) untuk **Learning Management System**. Dikembangkan sebagai Tugas 1 mata kuliah **Pemrograman Web 2 (Client-Side Programming)**.

Aplikasi berjalan sepenuhnya di sisi klien (HTML5, CSS3/Tailwind, JavaScript). Data disimpan lokal di browser melalui lapisan service yang nantinya bisa diganti ke database online tanpa mengubah halaman.

> **Status:** dalam pengembangan. Lihat [Roadmap](docs/roadmap.md) dan [Changelog](CHANGELOG.md).

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

Aplikasi memakai JavaScript modules, jadi harus dibuka lewat web server lokal (tidak bisa dibuka langsung sebagai `file://`).

**Opsi 1: VS Code**, pasang ekstensi *Live Server*, klik kanan `index.html`, lalu pilih **Open with Live Server**.

**Opsi 2: Terminal**
```bash
npx serve .
```
Setelah itu buka `http://localhost:3000`.

## Teknologi

- HTML5 semantik
- Tailwind CSS
- JavaScript (ES Modules), tanpa framework
- Chart.js
- Material Symbols & font Inter

---
Dibuat untuk keperluan tugas perkuliahan Pemrograman Web 2.
