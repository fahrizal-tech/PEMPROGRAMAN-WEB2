# Changelog

Semua perubahan penting pada proyek ini dicatat di file ini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/), dan versi mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [Unreleased]

## [0.2.1] — 2026-09-24

### Diperbaiki
- Layout tidak lagi melebar di HP saat font ikon (Material Symbols) belum termuat di jaringan lambat: ikon dikunci selebar 1em.
- Bar aksi massal di Instruktur dan Sertifikasi dapat turun baris di layar sempit.
- Diuji ulang dengan font Google diblokir: seluruh 11 halaman pas di lebar 390px.

## [0.2.0] — 2026-09-24 · Milestone 2

### Tahap 2 — Slicing & Layouting

#### Ditambahkan
- Build Tailwind CSS via CLI (`tailwind.config.js`, `npm run build:css`) dengan token design system; hasil build `assets/css/app.css` di-commit.
- Komponen layout bersama `assets/js/components/layout.js`: sidebar (menu dari satu sumber data), topbar (breadcrumb, judul, profil), footer, skip link.
- Sidebar responsif: drawer + overlay + tombol burger di bawah 1024px, tutup via overlay/Esc, scroll terkunci.
- `pages/layout.html`: template master + contoh komponen design system.
- Favicon dan varian logo untuk latar gelap.

#### Diubah
- Kesebelas halaman memakai head & layout standar; Tailwind CDN dan konfigurasi inline dihapus (sekitar 1.700 baris lebih ringkas).
- Menu sidebar mengikuti hirarki final `perancangan.md`; branding seragam.
- Tombol aksi yang sebelumnya berada di header Stitch berada di konten tiap halaman.
- Form: bar aksi menjadi sticky di dalam konten. Laporan: filter tidak meluber di HP. Dashboard: KPI 5 kolom hanya di layar >= 1536px.
- Login: tombol Masuk (dengan validasi `required`) menuju Dashboard tanpa mengirim data ke URL.

#### Keamanan
- 20 gambar yang dimuat dari `lh3.googleusercontent.com` diganti aset lokal / avatar inisial / placeholder, sehingga tidak ada lagi permintaan ke server gambar pihak ketiga.

#### Pengujian
- Uji E2E otomatis (Edge + puppeteer): login, 9 menu, penanda menu aktif, drawer mobile, tanpa scroll horizontal, keluar, tanpa error JS: 16/16 lulus.
- Screenshot desktop 1280px & mobile 390px untuk seluruh halaman.

## [0.1.0] — 2026-09-24 · Milestone 1

### Tahap 1 — Dokumentasi Perancangan

#### Ditambahkan
- `docs/perancangan.md` ditulis ulang: deskripsi & ruang lingkup sistem, hirarki menu (diagram + peta halaman), user flow, ER-D 14 entitas, kamus data, design system (Material Design, warna, tipografi, komponen), galeri rancangan Stitch, evolusi desain Figma → Stitch.

#### Diubah
- Nama screenshot Figma diperjelas: `wireframe-dashboard`, `wireframe-data-master`, `komponen-dasar`, `mid-fidelity-dashboard-data-master`.
- Hirarki menu final: *Modul & Materi* digabung ke Form Kursus, *Hak Akses & Peran* ke Pengaturan, *Keuangan & Transaksi* dihapus.

### Tahap 0 — Fondasi & Kerapian Repo

#### Ditambahkan
- Halaman hasil desain Stitch: Login, Mahasiswa, Instruktur, Kelas Virtual, Form Kursus, Tugas & Kuis, Sertifikasi, Pengaturan.
- Halaman Stitch yang sebelumnya belum diimpor: `dashboard.html`, `data-master.html`, `laporan.html`.
- Screenshot rancangan Stitch (WebP, 7,4 MB → 1,8 MB) di `docs/img/stitch/` dan desain awal Figma di `docs/img/design-awal/`.
- Spesifikasi design system: `docs/design-system-stitch.md`.
- Logo `assets/img/logo-nexus-lms.svg`.
- Dokumen `docs/roadmap.md` (strategi, aturan kerja, checklist per tahap).
- Konfigurasi repo: `.gitattributes`, `.editorconfig`.

#### Keamanan
- Audit seluruh riwayat git: tidak ditemukan API key, token, maupun password.
- Email pribadi pada metadata commit diganti email *noreply* GitHub (riwayat ditulis ulang).
- `.gitignore` memblokir file rahasia (`.env`, `*.key`, `credentials*.json`, dll.).
- `SECURITY.md` dan workflow `Secret Scan` (Gitleaks) di setiap push & pull request.

#### Diubah
- `pages/kurikulum.html` diganti nama menjadi `pages/form.html` sesuai format pengumpulan.
- `README.md` ditulis ulang sesuai struktur dan fitur terbaru.
- `.gitignore` diperbarui (rahasia, folder referensi Stitch, tools lokal, arsip).

#### Dihapus
- Versi multi-page lama berbasis `style.css`: `dashboard`, `data-master`, `form`, `laporan`, `layout`.
- Versi SPA: `pages/spa-app.html`, `assets/js/spa-app.js`.
- `docs/checklist.html` dan `docs/laporan.html`, digantikan `docs/roadmap.md` dan `CHANGELOG.md`.
- Folder `_backup_spa_sebelumnya/` (diarsipkan sebagai zip di luar repo).
- Worktree `.kilo/worktrees/` yang tidak terpakai.

## Riwayat Sebelumnya

| Tanggal | Perubahan |
| --- | --- |
| 2026-09-10 | Setup struktur proyek, layout multi-page awal, eksperimen SPA |
| 2026-09-20 | Pembaruan `perancangan.md` sesuai desain Stitch, ekspor halaman Stitch |
