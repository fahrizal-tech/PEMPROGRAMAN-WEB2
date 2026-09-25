# Naskah Demo — Nexus LMS Admin Panel (5–7 menit)

Panduan presentasi Tugas 1 Pemrograman Web 2. Kolom **Aksi** = yang diklik/ditunjukkan, kolom **Ucapan** = poin yang disampaikan (tidak perlu dihafal kata per kata).

**Link demo:** https://fahrizal-tech.github.io/PEMPROGRAMAN-WEB2/ · **Akun:** `admin@nexus.ac.id` / `nexus2026`

## Persiapan (sebelum presentasi)

- [ ] Buka link demo di Chrome/Edge, **Pengaturan → Reset ke Data Awal** agar data kembali bersih.
- [ ] Keluar (logout) lagi supaya demo dimulai dari halaman login.
- [ ] Siapkan tab kedua: repository GitHub (README, tab *Actions*, *Releases*).
- [ ] Siapkan satu gambar JPG/PNG untuk demo unggah sampul (opsional).
- [ ] Zoom browser 100–110 %, tutup notifikasi, sambungkan ke proyektor lebih awal.

## Alur Demo

| Waktu | Aksi | Ucapan |
| --- | --- | --- |
| **0:00 – 0:40**<br>Pembuka | Tampilkan README (gambar Dashboard). | "Nexus LMS adalah admin panel Learning Management System. Seluruhnya berjalan di sisi klien: HTML5, Tailwind CSS, dan JavaScript tanpa framework. Data disimpan lokal lewat lapisan *service*, sehingga nanti bisa dipindah ke database online tanpa mengubah halaman." |
| **0:40 – 1:20**<br>Login | Klik **Masuk** dengan kolom kosong → pesan error. Isi akun demo, centang *Ingat saya*, masuk. | "Form login memvalidasi input, membatasi 5 kali percobaan gagal (dikunci 30 detik), dan menjaga halaman admin: tanpa sesi, semua halaman dialihkan ke login." |
| **1:20 – 2:10**<br>Dashboard | Tunjuk banner ringkasan, 5 KPI, kartu **Sedang Live**, arahkan kursor ke 3 grafik Chart.js. | "Dashboard merangkum kondisi hari ini: KRS menunggu, sesi yang sedang live, dan tugas yang perlu dikoreksi. Grafik memakai Chart.js yang disimpan lokal. Semua angka dihitung langsung dari data, bukan angka statis." |
| **2:10 – 3:40**<br>Data Master (CRUD) | **Data Master Kursus** → tunjukkan kartu, klik **Tabel**, ketik di pencarian, urutkan kolom. Klik **Tambah Kursus Baru** → tekan **Simpan** kosong (error per kolom) → isi kode `ws-101` (otomatis jadi `WS-101`), nama, dosen, tambah 1 modul, (opsional) unggah sampul → Simpan. Kembali ke daftar, **Hapus** kursus tadi → baca dialog dampaknya. | "Ini fitur CRUD lengkap: tampil sebagai kartu atau tabel, bisa dicari, difilter, diurutkan, dan diekspor ke CSV. Validasinya dijalankan per kolom dengan JavaScript, misalnya kode MK harus 2–4 huruf, tanda hubung, dan 3 digit. Sebelum menghapus, sistem menjelaskan dampaknya: data apa saja yang ikut terhapus, atau alasan penghapusan ditolak." |
| **3:40 – 4:30**<br>Modul akademik | **Mahasiswa** → klik **Setujui** pada satu KRS. **Kelas Virtual** → tunjukkan badge LIVE dan hitung mundur. **Sertifikasi** → klik ikon pratinjau sertifikat. | "Modul lain saling terhubung: menyetujui KRS mengubah jumlah peserta kursus, kelas virtual punya presensi, dan sertifikat bisa diverifikasi lewat nomor registrasi lalu dicetak." |
| **4:30 – 5:20**<br>Laporan | **Laporan & Analitik** → ganti filter program studi, klik **CSV**, lalu **Cetak / Simpan PDF** (tampilkan pratinjau cetak). | "Halaman laporan menampilkan rekap per mata kuliah dan log aktivitas admin. Laporan bisa diekspor ke CSV atau dicetak ke A4/PDF dengan kop institusi. Tampilan cetak memakai CSS khusus." |
| **5:20 – 6:00**<br>Responsif | Buka DevTools (F12) → mode perangkat → iPhone/390 px. Buka menu ☰, pindah halaman, tekan Esc. | "Tampilannya responsif. Di HP, sidebar berubah menjadi drawer yang bisa dipakai dengan keyboard, dan tidak ada halaman yang melebar ke samping." |
| **6:00 – 6:50**<br>Proses & kualitas | Tab GitHub: **README**, **Actions** (centang hijau), **Releases** (v0.1.0 → v1.2.0), `docs/roadmap.md`. | "Pengerjaannya bertahap sesuai roadmap: perancangan, slicing, fitur, lalu QA. Setiap tahap dikerjakan di branch, lewat Pull Request, dan diuji otomatis: 57 uji unit, 99 uji E2E di Edge, Chrome, dan Firefox, validasi HTML, audit aksesibilitas, dan pemindai rahasia. Skor Lighthouse 98–100, dan Content-Security-Policy aktif." |
| **6:50 – 7:00**<br>Penutup | Kembali ke Dashboard. | "Tahap berikutnya adalah memindahkan data ke Supabase dengan login sungguhan. Arsitekturnya sudah disiapkan untuk itu. Terima kasih." |

> Jika waktu hanya 5 menit: persingkat bagian *Modul akademik* (cukup Mahasiswa) dan *Proses & kualitas* (cukup tab Actions).

## Pemetaan ke Instruksi Tugas

| Instruksi dosen | Bukti di proyek |
| --- | --- |
| Milestone 1 — menu, ER-D, desain | [`docs/perancangan.md`](perancangan.md) (struktur menu, ER-D Mermaid, desain Stitch/Figma) |
| Milestone 2 — slicing layout | [`pages/layout.html`](../pages/layout.html) + komponen `layout.js` (sidebar, topbar, footer) |
| Milestone 3 — Dashboard + grafik | `pages/dashboard.html` (Chart.js: 3 grafik) |
| Milestone 3 — Data Master CRUD | `pages/data-master.html` (+ Mahasiswa, Dosen, Tugas, Kelas Virtual, Sertifikasi) |
| Milestone 3 — Form + validasi JS | `pages/form.html`, form modal di setiap modul (validasi per kolom) |
| Milestone 3 — Laporan | `pages/laporan.html` (filter, CSV, cetak) |
| Tema Material Design | Design system *Academic Admin Studio* (Material Symbols, elevasi, komponen kartu) |
| Mock data tanpa back-end | `assets/data/seed.js` + localStorage lewat `Nexus.storage` |
| GitHub + hosting | Repository publik + GitHub Pages (link di atas) |

## Antisipasi Pertanyaan

| Pertanyaan | Jawaban singkat |
| --- | --- |
| Datanya disimpan di mana? | Di `localStorage` browser, lewat lapisan `storage` → `services`. Data awal dari `seed.js`. Setiap browser punya salinannya sendiri. |
| Kalau data dihapus/rusak? | Pengaturan → *Unduh Cadangan* (JSON), *Pulihkan dari Cadangan*, atau *Reset ke Data Awal*. |
| Apakah login-nya aman? | Untuk tugas ini login masih simulasi di sisi klien (dijelaskan di `SECURITY.md`). Autentikasi sungguhan direncanakan dengan Supabase Auth. |
| Kenapa tanpa framework (React/Vue)? | Sesuai fokus mata kuliah Client-Side Programming: DOM, event, validasi, dan modul JS murni. Tailwind hanya dipakai untuk CSS. |
| Bagaimana mencegah XSS? | Semua data dirender lewat template yang otomatis melakukan *escape*, ekspor CSV dilindungi dari *formula injection*, dan CSP menolak skrip dari luar. |
| Bagaimana cara mengujinya? | `npm test` (unit), `npm run test:e2e` (alur di browser), serta `test:html`, `test:a11y`, dan `test:lighthouse`. Semuanya berjalan otomatis di GitHub Actions. |
