# Changelog

Semua perubahan penting pada proyek ini dicatat di file ini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/), dan versi mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [Unreleased]

### Tahap 0 — Fondasi & Kerapian Repo (2026-09-24)

#### Ditambahkan
- Halaman hasil desain Stitch: Login, Mahasiswa, Instruktur, Kelas Virtual, Form Kursus, Tugas & Kuis, Sertifikasi, Pengaturan.
- Halaman Stitch yang sebelumnya belum diimpor: `dashboard.html`, `data-master.html`, `laporan.html`.
- Screenshot rancangan Stitch di `docs/img/stitch/` dan desain awal Figma di `docs/img/design-awal/`.
- Spesifikasi design system: `docs/design-system-stitch.md`.
- Logo `assets/img/logo-nexus-lms.svg`.
- Dokumen `docs/roadmap.md` (strategi, aturan kerja, checklist per tahap).
- Konfigurasi repo: `.gitattributes`, `.editorconfig`.

#### Diubah
- `pages/kurikulum.html` diganti nama menjadi `pages/form.html` sesuai format pengumpulan.
- `README.md` ditulis ulang sesuai struktur dan fitur terbaru.
- `.gitignore` diperbarui (folder referensi Stitch, tools lokal, arsip).

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
