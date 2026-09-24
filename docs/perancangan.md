# Dokumen Perancangan — Nexus LMS Admin Panel

> **Milestone 1** · Perencanaan Menu, ER-D, User Flow & UI Design
> Mata kuliah Pemrograman Web 2 (Client-Side Programming)

| Info | Keterangan |
| --- | --- |
| Sistem informasi | Learning Management System (LMS), panel admin (back-office) |
| Pengguna sistem | Admin akademik / BAAK (Biro Administrasi Akademik & Kemahasiswaan) |
| Tema visual | **Material Design**, dengan color role Material 3 (lihat [§5](#5-design-system)) |
| Tools desain | Google Stitch (wireframe & UI high-fidelity), Figma (desain awal) |
| Desain Figma | [LMS Admin Panel — Figma](https://www.figma.com/design/7aUyoUDLLLjVhcwW6yczcT/LMS-Admin-Panel?node-id=2-112&t=kEYvoVaPdIVuAusP-1) |
| Rencana kerja | [roadmap.md](roadmap.md) |

## Daftar Isi
1. [Deskripsi Sistem](#1-deskripsi-sistem)
2. [Hirarki Menu](#2-hirarki-menu)
3. [User Flow](#3-user-flow)
4. [ER-D & Kamus Data](#4-er-d--kamus-data)
5. [Design System](#5-design-system)
6. [Rancangan UI (Stitch)](#6-rancangan-ui-stitch)

---

## 1. Deskripsi Sistem

**Nexus LMS Admin Panel** adalah antarmuka back-office untuk mengelola seluruh operasional pembelajaran daring di perguruan tinggi, meliputi kursus beserta modulnya, mahasiswa dan KRS-nya, dosen, kelas virtual, tugas dan kuis, sertifikat, sampai laporan akademik.

**Ruang lingkup:**
- Panel ini hanya untuk peran **Admin / BAAK**. Halaman login memang menampilkan tab *Dosen* dan *Mahasiswa* (sesuai desain portal terpadu), tapi portal kedua peran itu berada di luar lingkup tugas ini. Jika dipilih, akan muncul pemberitahuan.
- Sesuai ketentuan tugas, aplikasi berjalan **sepenuhnya di sisi klien**. Data disimpan di browser (localStorage) melalui lapisan service, sehingga nantinya dapat diganti ke database online tanpa mengubah halaman (lihat [roadmap §1.1](roadmap.md#11-kesesuaian-dengan-ketentuan-dosen)).

---

## 2. Hirarki Menu

### 2.1 Struktur Sidebar

```mermaid
flowchart LR
    ROOT((Nexus LMS)) --> M[Main]
    ROOT --> A[Akademik & Kursus]
    ROOT --> P[Pengguna]
    ROOT --> G[Manajemen]

    M --> M1[Dashboard]
    M --> M2[Laporan & Analitik]

    A --> A1[Data Master Kursus]
    A1 -.-> A1a[Form Kursus<br/>tambah / edit + modul]
    A --> A2[Tugas & Kuis]
    A --> A3[Kelas Virtual]

    P --> P1[Mahasiswa]
    P --> P2[Instruktur / Dosen]

    G --> G1[Sertifikasi Digital]
    G --> G2[Pengaturan Sistem]
```

> Garis putus-putus berarti halaman tersebut **tidak muncul di sidebar**. Halaman itu dibuka melalui tombol aksi (Tambah/Edit) di halaman induknya.

### 2.2 Peta Halaman

| Grup | Menu | File | Fungsi utama | Kategori tugas |
| --- | --- | --- | --- | --- |
| — | Login | `index.html` | Autentikasi admin, validasi input, tampil/sembunyikan kata sandi | Halaman utama |
| Main | Dashboard | `pages/dashboard.html` | Kartu statistik, grafik tren (Chart.js), kursus teratas | **Wajib: Dashboard** |
| Main | Laporan & Analitik | `pages/laporan.html` | Rekap kinerja mata kuliah, log aktivitas, cetak & ekspor CSV | **Wajib: Laporan** |
| Akademik | Data Master Kursus | `pages/data-master.html` | Tabel kursus: cari, filter, urut, paginasi, Tambah/Edit/Hapus | **Wajib: Data Master** |
| Akademik | ↳ Form Kursus | `pages/form.html` | Input/edit kursus + struktur modul mingguan, validasi real-time | **Wajib: Form** |
| Akademik | Tugas & Kuis | `pages/tugas-kuis.html` | CRUD tugas, bobot nilai, progres pengumpulan, penilaian rubrik | Pendukung |
| Akademik | Kelas Virtual | `pages/kelas-virtual.html` | Jadwal sesi daring, status live/selesai, presensi | Pendukung |
| Pengguna | Mahasiswa | `pages/mahasiswa.html` | Direktori mahasiswa, modal edit, validasi KRS | Pendukung |
| Pengguna | Instruktur / Dosen | `pages/instruktur.html` | Direktori dosen, beban mengajar (BKD), nilai EDOM | Pendukung |
| Manajemen | Sertifikasi Digital | `pages/sertifikasi.html` | Terbitkan/cabut sertifikat, verifikasi nomor registrasi | Pendukung |
| Manajemen | Pengaturan Sistem | `pages/pengaturan.html` | Identitas institusi, periode semester, kebijakan keamanan, reset data | Pendukung |

### 2.3 Keputusan Desain Menu

Sidebar hasil ekspor Stitch memuat tiga menu yang tidak punya halaman sendiri. Berikut keputusan untuk masing-masing:

| Menu Stitch | Keputusan | Alasan |
| --- | --- | --- |
| Modul & Materi | Digabung ke **Form Kursus** | Form kursus sudah memiliki bagian *Struktur Modul & Silabus Mingguan*. Modul selalu melekat pada satu kursus (entitas `MODUL`) |
| Hak Akses & Peran | Digabung ke **Pengaturan Sistem** | Pengaturan sudah memiliki bagian *Autentikasi & Kebijakan Keamanan Pengguna* |
| Keuangan & Transaksi | **Dihapus** | Di luar lingkup LMS (ranah sistem keuangan kampus) dan tidak memiliki rancangan UI |
| Analytics & Reports | Diganti nama menjadi **Laporan & Analitik** | Konsistensi Bahasa Indonesia di seluruh antarmuka |

---

## 3. User Flow

Alur utama admin, dari login sampai pengelolaan data:

```mermaid
flowchart TD
    A([Buka aplikasi]) --> B{Sudah login?}
    B -- Belum --> C[Halaman Login<br/>index.html]
    C --> D[Pilih peran Admin/BAAK<br/>isi email/NIDN + kata sandi]
    D --> E{Validasi input}
    E -- Tidak valid --> F[Pesan error di bawah field] --> D
    E -- Valid --> G[Simpan sesi]
    B -- Sudah --> H
    G --> H[Dashboard<br/>kartu statistik + grafik]

    H --> I[Data Master Kursus<br/>tabel + cari/filter/urut]
    I --> J{Pilih aksi}
    J -- Tambah --> K[Form Kursus<br/>form.html]
    J -- Edit --> K2[Form Kursus<br/>form.html?id=...]
    K --> L{Validasi form}
    K2 --> L
    L -- Tidak valid --> M[Tandai field error] --> L
    L -- Valid --> N[Simpan ke data lokal<br/>+ catat log aktivitas]
    N --> O[Toast sukses] --> I
    J -- Hapus --> P[Modal konfirmasi hapus]
    P -- Batal --> I
    P -- Ya --> Q{Masih punya relasi aktif?}
    Q -- Ya --> R[Tolak + jelaskan alasannya] --> I
    Q -- Tidak --> N

    H --> S[Mahasiswa] --> S1[Validasi KRS<br/>setujui / tolak]
    H --> T[Instruktur / Kelas Virtual /<br/>Tugas & Kuis / Sertifikasi]
    H --> U[Laporan & Analitik]
    U --> U1[Filter periode] --> U2[Cetak / Ekspor CSV]
    H --> V[Pengaturan] --> V1[Profil institusi,<br/>keamanan, reset data]
    H --> W([Logout]) --> C
```

**Aturan UX yang berlaku di semua alur:**
- Setiap aksi yang mengubah data diberi umpan balik berupa *toast* (berhasil atau gagal).
- Aksi yang tidak bisa dibatalkan (hapus, cabut sertifikat, reset data) **wajib melewati modal konfirmasi**.
- Hapus ditolak jika data masih dipakai entitas lain. Contoh: kursus yang masih punya KRS berstatus *disetujui*.
- Setiap create, update, dan delete otomatis dicatat ke `LOG_AKTIVITAS`, yang menjadi sumber data halaman Laporan.

---

## 4. ER-D & Kamus Data

### 4.1 Entity Relationship Diagram

Atribut diturunkan dari kolom tabel dan field form pada rancangan UI Stitch.

```mermaid
erDiagram
    PROGRAM_STUDI ||--o{ MAHASISWA : "menaungi"
    PROGRAM_STUDI ||--o{ INSTRUKTUR : "menaungi"
    PROGRAM_STUDI ||--o{ KURSUS : "menawarkan"
    INSTRUKTUR ||--o{ KURSUS : "mengampu"
    KURSUS ||--|{ MODUL : "tersusun atas"
    MAHASISWA ||--o{ KRS : "mengajukan"
    KURSUS ||--o{ KRS : "diambil melalui"
    KURSUS ||--o{ KELAS_VIRTUAL : "dijadwalkan"
    MODUL ||--o{ KELAS_VIRTUAL : "dibahas pada"
    KELAS_VIRTUAL ||--o{ PRESENSI : "mencatat"
    MAHASISWA ||--o{ PRESENSI : "hadir di"
    KURSUS ||--o{ TUGAS_KUIS : "memiliki"
    TUGAS_KUIS ||--o{ PENGUMPULAN : "menerima"
    MAHASISWA ||--o{ PENGUMPULAN : "mengumpulkan"
    MAHASISWA ||--o{ SERTIFIKAT : "menerima"
    KURSUS ||--o{ SERTIFIKAT : "menerbitkan"
    ADMIN ||--o{ LOG_AKTIVITAS : "melakukan"

    PROGRAM_STUDI {
        string id PK
        string kode UK
        string nama
        string fakultas
        string jenjang "D3 | S1 | S2"
    }
    MAHASISWA {
        string id PK
        string nim UK
        string nama
        string email UK
        string prodi_id FK
        int angkatan
        int semester
        float ipk
        string status "aktif | cuti | nonaktif | lulus"
    }
    INSTRUKTUR {
        string id PK
        string nidn UK
        string nama
        string email UK
        string prodi_id FK
        string jabatan_akademik
        string bidang_keahlian
        boolean serdos
        float nilai_edom
    }
    KURSUS {
        string id PK
        string kode_mk UK
        string nama
        text deskripsi
        string prodi_id FK
        string instruktur_id FK
        string tingkat "dasar | menengah | lanjut"
        int sks
        int kuota
        int passing_grade
        string periode
        string status "draft | publikasi | arsip"
    }
    MODUL {
        string id PK
        string kursus_id FK
        int pertemuan_ke
        string judul
        string tipe_materi "video | dokumen | kuis"
    }
    KRS {
        string id PK
        string mahasiswa_id FK
        string kursus_id FK
        string periode
        string status "diajukan | disetujui | ditolak"
        float nilai_akhir
        datetime diajukan_pada
    }
    KELAS_VIRTUAL {
        string id PK
        string kursus_id FK
        string modul_id FK
        string judul
        datetime waktu_mulai
        int durasi_menit
        string platform "zoom | meet | teams"
        string tautan
        string status "terjadwal | live | selesai"
    }
    PRESENSI {
        string id PK
        string kelas_virtual_id FK
        string mahasiswa_id FK
        string status "hadir | izin | alpa"
    }
    TUGAS_KUIS {
        string id PK
        string kursus_id FK
        string judul
        string jenis "tugas | kuis | uts | uas"
        int bobot_persen
        datetime deadline
        string status "draft | aktif | ditutup"
    }
    PENGUMPULAN {
        string id PK
        string tugas_id FK
        string mahasiswa_id FK
        datetime dikumpulkan_pada
        float nilai
        int skor_plagiarisme
        string status "menunggu | dinilai | revisi"
    }
    SERTIFIKAT {
        string id PK
        string nomor_registrasi UK
        string mahasiswa_id FK
        string kursus_id FK
        string jenis
        date tanggal_terbit
        string penandatangan
        string status "menunggu_tte | terbit | dicabut"
    }
    ADMIN {
        string id PK
        string nama
        string email UK
        string peran "super_admin | admin_akademik"
        datetime login_terakhir
    }
    LOG_AKTIVITAS {
        string id PK
        string admin_id FK
        string aksi "create | update | delete | login"
        string entitas
        string entitas_id
        string deskripsi
        datetime waktu
    }
    PENGATURAN {
        string kunci PK
        string nilai
    }
```

**Keterangan notasi:** `PK` primary key · `FK` foreign key · `UK` unique · `||--o{` satu ke banyak (boleh nol) · `||--|{` satu ke banyak (minimal satu).

### 4.2 Relasi Penting

| Relasi | Kardinalitas | Keterangan |
| --- | --- | --- |
| MAHASISWA ↔ KURSUS | Banyak ke banyak | Dipecah melalui **KRS** (satu baris = satu mahasiswa mengambil satu kursus pada satu periode) |
| MAHASISWA ↔ KELAS_VIRTUAL | Banyak ke banyak | Dipecah melalui **PRESENSI** |
| MAHASISWA ↔ TUGAS_KUIS | Banyak ke banyak | Dipecah melalui **PENGUMPULAN**, yang sekaligus menyimpan nilai |
| KURSUS → MODUL | Satu ke banyak (min. 1) | Kursus minimal punya satu modul agar bisa dipublikasikan |
| ADMIN → LOG_AKTIVITAS | Satu ke banyak | Jejak audit untuk halaman Laporan |

### 4.3 Kamus Data

<details>
<summary><b>PROGRAM_STUDI</b>: data program studi</summary>

| Atribut | Tipe | Aturan | Contoh |
| --- | --- | --- | --- |
| id | string | PK, dibuat otomatis | `prd_01` |
| kode | string | unik, 2–6 huruf kapital | `TIF` |
| nama | string | wajib | `Teknik Informatika` |
| fakultas | string | wajib | `Fakultas Ilmu Komputer` |
| jenjang | enum | `D3` / `S1` / `S2` | `S1` |
</details>

<details>
<summary><b>MAHASISWA</b>: data mahasiswa</summary>

| Atribut | Tipe | Aturan | Contoh |
| --- | --- | --- | --- |
| id | string | PK | `mhs_0001` |
| nim | string | unik, 8–12 digit angka | `2210511042` |
| nama | string | wajib, 3–100 karakter | `Nadia Aurelia` |
| email | string | unik, format email | `n.aurelia@student.nexus.ac.id` |
| prodi_id | string | FK → PROGRAM_STUDI | `prd_01` |
| angkatan | int | 2015 – tahun berjalan | `2022` |
| semester | int | 1–14 | `5` |
| ipk | float | 0.00 – 4.00 | `3.62` |
| status | enum | `aktif` / `cuti` / `nonaktif` / `lulus` | `aktif` |
</details>

<details>
<summary><b>INSTRUKTUR</b>: data dosen pengampu</summary>

| Atribut | Tipe | Aturan | Contoh |
| --- | --- | --- | --- |
| id | string | PK | `dsn_001` |
| nidn | string | unik, 10 digit angka | `0012058901` |
| nama | string | wajib, termasuk gelar | `Dr. Rina Kusuma, M.Kom.` |
| email | string | unik, format email | `a.wicaksono@nexus.ac.id` |
| prodi_id | string | FK → PROGRAM_STUDI | `prd_01` |
| jabatan_akademik | enum | `Asisten Ahli` / `Lektor` / `Lektor Kepala` / `Guru Besar` | `Lektor` |
| bidang_keahlian | string | opsional | `Rekayasa Perangkat Lunak` |
| serdos | boolean | sudah tersertifikasi dosen? | `true` |
| nilai_edom | float | 0.00 – 4.00 (evaluasi dosen oleh mahasiswa) | `3.71` |
</details>

<details>
<summary><b>KURSUS</b>: mata kuliah / kursus daring</summary>

| Atribut | Tipe | Aturan | Contoh |
| --- | --- | --- | --- |
| id | string | PK | `krs_101` |
| kode_mk | string | unik, 2–4 huruf kapital + 3 digit | `CS-301` |
| nama | string | wajib, 5–120 karakter | `Pemrograman Web Lanjut` |
| deskripsi | text | wajib, min. 30 karakter (silabus & CPL) | `Mahasiswa mampu membangun…` |
| prodi_id | string | FK → PROGRAM_STUDI | `prd_01` |
| instruktur_id | string | FK → INSTRUKTUR | `dsn_001` |
| tingkat | enum | `dasar` / `menengah` / `lanjut` | `menengah` |
| sks | int | 1–6 | `3` |
| kuota | int | 1–500 | `60` |
| passing_grade | int | 0–100 | `60` |
| periode | string | format `YYYY/YYYY-Ganjil\|Genap` | `2025/2026-Ganjil` |
| status | enum | `draft` / `publikasi` / `arsip` | `publikasi` |
</details>

<details>
<summary><b>MODUL</b>: pertemuan / bahan ajar per kursus</summary>

| Atribut | Tipe | Aturan | Contoh |
| --- | --- | --- | --- |
| id | string | PK | `mod_101_01` |
| kursus_id | string | FK → KURSUS | `krs_101` |
| pertemuan_ke | int | 1–16, unik per kursus | `1` |
| judul | string | wajib | `Pengenalan DOM & Event` |
| tipe_materi | enum | `video` / `dokumen` / `kuis` | `video` |
</details>

<details>
<summary><b>KRS</b>: pengambilan kursus oleh mahasiswa</summary>

| Atribut | Tipe | Aturan | Contoh |
| --- | --- | --- | --- |
| id | string | PK | `krx_0001` |
| mahasiswa_id | string | FK → MAHASISWA | `mhs_0001` |
| kursus_id | string | FK → KURSUS; kombinasi mahasiswa+kursus+periode unik | `krs_101` |
| periode | string | sama dengan periode kursus | `2025/2026-Ganjil` |
| status | enum | `diajukan` / `disetujui` / `ditolak` | `diajukan` |
| nilai_akhir | float | 0–100, kosong sebelum dinilai | `84.5` |
| diajukan_pada | datetime | ISO 8601 | `2025-08-20T09:15:00` |
</details>

<details>
<summary><b>KELAS_VIRTUAL</b> & <b>PRESENSI</b>: sesi daring dan kehadirannya</summary>

| Atribut | Tipe | Aturan | Contoh |
| --- | --- | --- | --- |
| id | string | PK | `kv_0001` |
| kursus_id | string | FK → KURSUS | `krs_101` |
| modul_id | string | FK → MODUL, opsional | `mod_101_03` |
| judul | string | wajib | `Live Coding: Fetch API` |
| waktu_mulai | datetime | ISO 8601 | `2025-09-02T13:00:00` |
| durasi_menit | int | 15–240 | `100` |
| platform | enum | `zoom` / `meet` / `teams` | `meet` |
| tautan | string | URL `https://` | `https://meet.google.com/abc-defg-hij` |
| status | enum | `terjadwal` / `live` / `selesai` | `terjadwal` |

**PRESENSI**: `id` (PK), `kelas_virtual_id` (FK), `mahasiswa_id` (FK), `status` (`hadir` / `izin` / `alpa`).
</details>

<details>
<summary><b>TUGAS_KUIS</b> & <b>PENGUMPULAN</b>: evaluasi dan nilainya</summary>

| Atribut | Tipe | Aturan | Contoh |
| --- | --- | --- | --- |
| id | string | PK | `tgs_0001` |
| kursus_id | string | FK → KURSUS | `krs_101` |
| judul | string | wajib | `Tugas 2: CRUD dengan localStorage` |
| jenis | enum | `tugas` / `kuis` / `uts` / `uas` | `tugas` |
| bobot_persen | int | 1–100; total per kursus ≤ 100 | `15` |
| deadline | datetime | harus setelah waktu dibuat | `2025-09-30T23:59:00` |
| status | enum | `draft` / `aktif` / `ditutup` | `aktif` |

**PENGUMPULAN**: `id` (PK), `tugas_id` (FK), `mahasiswa_id` (FK), `dikumpulkan_pada` (datetime), `nilai` (0–100), `skor_plagiarisme` (0–100 %), `status` (`menunggu` / `dinilai` / `revisi`).
</details>

<details>
<summary><b>SERTIFIKAT</b>: sertifikat digital kelulusan kursus</summary>

| Atribut | Tipe | Aturan | Contoh |
| --- | --- | --- | --- |
| id | string | PK | `srt_0001` |
| nomor_registrasi | string | unik, format `NXS/AAA/YYYY/00000` | `NXS/TIF/2025/00042` |
| mahasiswa_id | string | FK → MAHASISWA; hanya jika nilai_akhir ≥ passing_grade | `mhs_0001` |
| kursus_id | string | FK → KURSUS | `krs_101` |
| jenis | string | wajib | `Sertifikat Kelulusan Kursus` |
| tanggal_terbit | date | ISO 8601 | `2026-01-15` |
| penandatangan | string | nama pejabat | `Dr. Adrian Wicaksono, M.Kom.` |
| status | enum | `menunggu_tte` / `terbit` / `dicabut` | `terbit` |
</details>

<details>
<summary><b>ADMIN</b>, <b>LOG_AKTIVITAS</b> & <b>PENGATURAN</b>: sistem</summary>

**ADMIN**: `id` (PK), `nama`, `email` (unik), `peran` (`super_admin` / `admin_akademik`), `login_terakhir` (datetime).
Pada versi client-side, akun admin adalah **akun demo**. Kata sandi tidak disimpan di data (lihat [SECURITY.md](../SECURITY.md)).

**LOG_AKTIVITAS**: `id` (PK), `admin_id` (FK), `aksi` (`create` / `update` / `delete` / `login`), `entitas` (nama tabel), `entitas_id`, `deskripsi`, `waktu` (datetime).

**PENGATURAN**: pasangan `kunci` → `nilai`. Contoh: `nama_institusi`, `periode_aktif`, `zona_waktu`, `sesi_timeout_menit`.
</details>

---

## 5. Design System

Design system **Academic Admin Studio** dihasilkan dari Google Stitch. Spesifikasi lengkapnya ada di [design-system-stitch.md](design-system-stitch.md).

### 5.1 Penerapan Material Design

| Prinsip Material Design | Penerapan di Nexus LMS |
| --- | --- |
| **Color roles** (Material 3) | Token `primary`, `on-primary`, `surface`, `surface-container-*`, `outline`, `error` memakai skema peran warna Material 3 |
| **Elevation** | 3 tingkat bayangan halus: *resting* (kartu), *hover*, *overlay* (modal & dropdown) |
| **Surface & card** | Konten dikelompokkan dalam kartu putih di atas kanvas `#f8fafc` |
| **Grid 4/8 px** | Spasi 4 · 8 · 12 · 16 · 24 · 32 px |
| **Ikon** | Material Symbols Outlined |
| **Umpan balik** | Focus ring, state hover/active, toast, modal konfirmasi |

### 5.2 Palet Warna

| Peran | Token | HEX | Penggunaan |
| --- | --- | --- | --- |
| Primary | `primary-container` | `#2563EB` | Tombol utama, menu aktif, tautan |
| Primary hover | — | `#1D4ED8` | Hover/pressed tombol utama |
| Primary tint | — | `#EFF6FF` | Latar menu aktif, baris terpilih |
| Background | `background` | `#F8FAFC` | Kanvas halaman |
| Surface | `surface-container-lowest` | `#FFFFFF` | Kartu, tabel, modal |
| Border | `outline-variant` | `#E2E8F0` | Garis pemisah 1px |
| Teks utama | `on-surface` | `#0F172A` | Judul, isi tabel |
| Teks sekunder | `on-surface-variant` | `#475569` | Label, keterangan |
| Success | — | `#10B981` | Aktif, lulus, disetujui |
| Warning | — | `#D97706` | Menunggu, pending |
| Danger | `error` | `#DC2626` | Hapus, ditolak, error validasi |
| Info | — | `#0284C7` | Terjadwal, draft |

### 5.3 Tipografi

Font utama **Inter** (UI) dan **JetBrains Mono** (kode MK, NIM, nomor registrasi).

| Gaya | Ukuran / Line-height | Bobot | Penggunaan |
| --- | --- | --- | --- |
| Display | 32 / 40 px (mobile 26 / 34) | 700 | Judul halaman utama |
| Headline LG | 24 / 32 px | 600 | Judul halaman |
| Headline MD | 20 / 28 px | 600 | Judul kartu/section |
| Headline SM | 16 / 24 px | 600 | Sub-judul |
| Body MD | 14 / 20 px | 400 | Teks isi, input |
| Body SM | 13 / 18 px | 400 | Sel tabel |
| Label XS | 11 / 14 px, uppercase | 600 | Header kolom tabel, badge |
| Code SM | 12 / 16 px, JetBrains Mono | 400 | NIM, kode MK, ID |

### 5.4 Komponen Reusable

| Komponen | Varian | Spesifikasi kunci |
| --- | --- | --- |
| **Button** | Primary · Secondary/Outline · Ghost · Destructive | Tinggi 36px (compact 28px), radius 4–8px, focus ring 3px |
| **Input** | Text · Select · Textarea · Checkbox · Radio | Tinggi 36px, border `#CBD5E1`, fokus `#2563EB`, error `#EF4444` + pesan 12px |
| **Card** | Statistik · Konten · Grafik | Putih, border 1px `#E2E8F0`, radius 8px, bayangan *resting* |
| **Badge / Status chip** | Hijau · Kuning · Merah · Netral | Tinggi 20–22px, radius penuh, font 11px |
| **Data Table** | Standar · Padat | Header `#F8FAFC` uppercase, baris 44px, hover `#F8FAFC`, paginasi di footer |
| **Modal** | Form · Konfirmasi hapus | Backdrop `rgba(15,23,42,.45)`, bayangan *overlay* |
| **Toast** | Sukses · Error · Info | Pojok kanan atas, hilang otomatis dalam 4 detik |
| **Sidebar** | Desktop (tetap 256px) · Mobile (drawer) | Breakpoint drawer < 1024px |

---

## 6. Rancangan UI (Stitch)

Rancangan high-fidelity dibuat dengan **Google Stitch** untuk seluruh halaman, termasuk *state* interaksi (modal, CRUD, penilaian). Klik gambar untuk melihat ukuran penuh.

### 6.1 Halaman Wajib

| Login | Dashboard |
| :---: | :---: |
| <a href="img/stitch/portal-login-mandiri-terpadu.webp"><img src="img/stitch/portal-login-mandiri-terpadu.webp" width="380" alt="Rancangan halaman login"></a> | <a href="img/stitch/executive-dashboard.webp"><img src="img/stitch/executive-dashboard.webp" width="380" alt="Rancangan dashboard"></a> |
| **Data Master Kursus** | **Form Kursus** |
| <a href="img/stitch/data-master-kursus.webp"><img src="img/stitch/data-master-kursus.webp" width="380" alt="Rancangan data master kursus"></a> | <a href="img/stitch/manajemen-kurikulum-form-kursus.webp"><img src="img/stitch/manajemen-kurikulum-form-kursus.webp" width="380" alt="Rancangan form kursus"></a> |
| **Laporan & Analitik** | **State: Operasi CRUD** |
| <a href="img/stitch/analytics-laporan-akademik.webp"><img src="img/stitch/analytics-laporan-akademik.webp" width="380" alt="Rancangan laporan akademik"></a> | <a href="img/stitch/data-master-kursus-state-crud.webp"><img src="img/stitch/data-master-kursus-state-crud.webp" width="380" alt="State CRUD data master"></a> |

### 6.2 Halaman Pendukung

| Mahasiswa | State: Modal Edit & Validasi KRS |
| :---: | :---: |
| <a href="img/stitch/mahasiswa-siswa.webp"><img src="img/stitch/mahasiswa-siswa.webp" width="380" alt="Rancangan halaman mahasiswa"></a> | <a href="img/stitch/mahasiswa-siswa-state-modal-krs.webp"><img src="img/stitch/mahasiswa-siswa-state-modal-krs.webp" width="380" alt="State modal edit mahasiswa"></a> |
| **Instruktur / Dosen** | **Kelas Virtual** |
| <a href="img/stitch/instruktur-dosen.webp"><img src="img/stitch/instruktur-dosen.webp" width="380" alt="Rancangan halaman instruktur"></a> | <a href="img/stitch/kelas-virtual.webp"><img src="img/stitch/kelas-virtual.webp" width="380" alt="Rancangan kelas virtual"></a> |
| **Tugas & Kuis** | **State: Penilaian Rubrik** |
| <a href="img/stitch/tugas-kuis.webp"><img src="img/stitch/tugas-kuis.webp" width="380" alt="Rancangan tugas dan kuis"></a> | <a href="img/stitch/tugas-kuis-state-rubrik.webp"><img src="img/stitch/tugas-kuis-state-rubrik.webp" width="380" alt="State penilaian rubrik"></a> |
| **Sertifikasi Digital** | **Pengaturan Sistem** |
| <a href="img/stitch/sertifikasi-digital.webp"><img src="img/stitch/sertifikasi-digital.webp" width="380" alt="Rancangan sertifikasi digital"></a> | <a href="img/stitch/pengaturan-sistem.webp"><img src="img/stitch/pengaturan-sistem.webp" width="380" alt="Rancangan pengaturan sistem"></a> |

### 6.3 Evolusi Desain (Figma → Stitch)

Desain dikembangkan bertahap dari wireframe sederhana sampai UI high-fidelity:

```mermaid
flowchart LR
    W["1 · Wireframe<br/>low-fidelity<br/>(Figma)"] --> K["2 · Komponen dasar<br/>Sidebar, Header,<br/>StatCard, Button, Table"] --> MF["3 · Mid-fidelity<br/>warna & tipografi<br/>(Figma)"] --> HF["4 · High-fidelity<br/>+ state interaksi<br/>(Stitch)"]
```

| 1 · Wireframe: Dashboard | 1 · Wireframe: Data Master |
| :---: | :---: |
| <img src="img/design-awal/wireframe-dashboard.png" width="380" alt="Wireframe low-fidelity dashboard"> | <img src="img/design-awal/wireframe-data-master.png" width="380" alt="Wireframe low-fidelity data master"> |
| **2 · Komponen dasar** | **3 · Mid-fidelity** |
| <img src="img/design-awal/komponen-dasar.png" width="380" alt="Komponen dasar di Figma"> | <img src="img/design-awal/mid-fidelity-dashboard-data-master.png" width="380" alt="Mid-fidelity dashboard dan data master"> |

Tahap 4 (high-fidelity) ditampilkan pada [§6.1](#61-halaman-wajib) dan [§6.2](#62-halaman-pendukung).
