# Kebijakan Keamanan

## Ruang Lingkup

Nexus LMS Admin Panel adalah proyek **client-side** untuk keperluan akademik. Seluruh data yang ada di repo ini adalah **data fiktif (mock data)**. Tidak ada data pribadi nyata mahasiswa, dosen, maupun institusi.

## Prinsip yang Diterapkan

1. **Tidak ada rahasia di repo.** API key, token, password, dan file `.env` diblokir lewat `.gitignore`, dan setiap push dipindai otomatis oleh workflow [Secret Scan](.github/workflows/secret-scan.yml) (Gitleaks).
2. **Login pada versi client-side hanya simulasi.** Akun demo tidak melindungi data apa pun, karena semua kode dan data berjalan di browser pengguna. Autentikasi sungguhan direncanakan pada tahap produksi (lihat [roadmap](docs/roadmap.md#tahap-7--pasca-tugas-menuju-produksi)).
3. **Aman dari XSS.** Data yang diketik pengguna dirender memakai `textContent`/escape, tidak disisipkan mentah ke `innerHTML`.
4. **Content-Security-Policy.** Setiap halaman memuat `<meta http-equiv="Content-Security-Policy">`: skrip hanya dari situs sendiri (tanpa skrip inline/`eval`), font hanya dari Google Fonts, gambar hanya dari situs sendiri atau `data:`/`blob:` (sampul kursus), `object-src 'none'`, `base-uri` & `form-action` dibatasi ke `'self'`. Uji E2E gagal bila ada pelanggaran CSP.
5. **Tautan keluar** memakai `rel="noopener noreferrer"`. SRI (`integrity`) tidak dipakai karena tidak ada skrip CDN: Chart.js disimpan lokal di `assets/vendor/`, sedangkan CSS Google Fonts berbeda per browser sehingga tidak bisa di-hash.
6. **Dependensi.** Semua paket npm hanya alat pengembangan (build CSS & pengujian), tidak dikirim ke browser. Dependabot membuka PR pembaruan mingguan (npm & GitHub Actions) dan CI menjalankan `npm audit`.
7. **Tahap produksi:** hanya *public/anon key* yang boleh berada di front-end, dan harus dilindungi Row Level Security di database. *Service role key* tidak boleh berada di kode front-end.

## Melaporkan Masalah Keamanan

Jika Anda menemukan celah keamanan atau data sensitif yang tidak sengaja ter-publish, **jangan membuka Issue publik**. Laporkan secara privat melalui tab **Security → Report a vulnerability** di repository ini.
