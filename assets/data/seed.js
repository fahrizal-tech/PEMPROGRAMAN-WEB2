/**
 * Data awal (seed) Nexus LMS — mock database.
 *
 * Struktur mengikuti ER-D & kamus data di docs/perancangan.md §4.
 * Semua nama, NIM, NIDN, dan email adalah FIKTIF.
 *
 * Ditulis sebagai file JS (bukan JSON) agar tetap bisa dimuat saat index.html
 * dibuka langsung dari disk (file://), di mana fetch() ke file JSON diblokir browser.
 *
 * NexusSeed.build() selalu menghasilkan salinan baru yang identik (deterministik),
 * sehingga "reset data" selalu kembali ke kondisi yang sama.
 */
(function (global) {
  "use strict";

  var VERSION = 1;
  var PERIODE = "2026/2027-Ganjil";

  // PRNG deterministik (mulberry32) agar data relasi selalu sama setiap build.
  function rng(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pad(n, len) {
    return String(n).padStart(len, "0");
  }

  function slugEmail(nama, domain) {
    var parts = nama.replace(/,.*$/, "").replace(/^((Prof|Dr|Ir)\.?\s+)+/i, "").toLowerCase().split(/\s+/);
    return parts[0].charAt(0) + "." + parts[parts.length > 1 ? 1 : 0] + "@" + domain;
  }

  function build() {
    var rand = rng(20260924);
    var pick = function (arr) { return arr[Math.floor(rand() * arr.length)]; };

    /* ---------------- PROGRAM_STUDI ---------------- */
    var prodi = [
      ["prd_tif", "TIF", "Teknik Informatika", "Fakultas Ilmu Komputer", "S1"],
      ["prd_sif", "SIF", "Sistem Informasi", "Fakultas Ilmu Komputer", "S1"],
      ["prd_sda", "SDA", "Sains Data", "Fakultas Ilmu Komputer", "S1"],
      ["prd_tkm", "TKM", "Teknik Komputer", "Fakultas Teknik", "S1"],
      ["prd_dkv", "DKV", "Desain Komunikasi Visual", "Fakultas Desain", "S1"],
      ["prd_bdg", "BDG", "Bisnis Digital", "Fakultas Ekonomi & Bisnis", "S1"],
    ].map(function (r) {
      return { id: r[0], kode: r[1], nama: r[2], fakultas: r[3], jenjang: r[4] };
    });

    /* ---------------- INSTRUKTUR ---------------- */
    var instruktur = [
      ["dsn_001", "0418088201", "Dr. Adrian Wicaksono, M.Kom.", "prd_tif", "Lektor Kepala", "Cloud Computing & Arsitektur Sistem", true, 3.86],
      ["dsn_002", "0329048902", "Siti Paramitha, S.T., M.Sc.", "prd_tif", "Lektor", "Rekayasa Web & Front-End", true, 3.79],
      ["dsn_003", "0012017301", "Prof. Rian Hidayat, Ph.D.", "prd_sda", "Guru Besar", "Machine Learning & Computer Vision", true, 3.91],
      ["dsn_004", "0405118503", "Nadia Maharani, M.Ds.", "prd_dkv", "Lektor", "Interaksi Manusia & Komputer", true, 3.74],
      ["dsn_005", "0214068001", "Faisal Akbar, MBA, CFA", "prd_bdg", "Lektor", "Keuangan Digital & FinTech", false, 3.52],
      ["dsn_006", "0422078601", "Taufik Hidayat, M.Kom., CEH", "prd_tif", "Lektor", "Keamanan Siber", true, 3.68],
      ["dsn_007", "0108037802", "Lestari Wahyuni, S.E., M.M.", "prd_bdg", "Lektor Kepala", "Manajemen Operasional", true, 3.63],
      ["dsn_008", "0012017302", "Prof. Dr. Ir. Budi Rahardjo, M.Sc.", "prd_tif", "Guru Besar", "Sistem Terdistribusi", true, 3.93],
      ["dsn_009", "0028048402", "Dr. Ayu Nur Safitri, M.Eng.", "prd_sda", "Lektor Kepala", "Deep Learning", true, 3.88],
      ["dsn_010", "0015098904", "Hendrik Pratama, S.T., M.Kom.", "prd_tif", "Lektor", "Pemrograman Mobile", true, 3.61],
      ["dsn_011", "0003057805", "Dr. Muhammad Satrio Utomo, M.T.", "prd_sif", "Lektor Kepala", "Enterprise Architecture & ERP", true, 3.80],
      ["dsn_012", "0019129201", "Ratna Wulandari, S.Si., M.Stat.", "prd_sda", "Asisten Ahli", "Statistika Inferensial & Big Data", false, 3.47],
    ].map(function (r) {
      return {
        id: r[0], nidn: r[1], nama: r[2], email: slugEmail(r[2], "nexus.ac.id"), prodi_id: r[3],
        jabatan_akademik: r[4], bidang_keahlian: r[5], serdos: r[6], nilai_edom: r[7],
      };
    });

    /* ---------------- KURSUS + MODUL ---------------- */
    // [id, kode, nama, deskripsi, prodi, instruktur, tingkat, sks, kuota, status, [topik modul]]
    var kursusRows = [
      ["krs_101", "CS-301", "Arsitektur Cloud Computing", "Sistem terdistribusi, microservices, dan cloud native dengan Kubernetes. Mahasiswa mampu merancang dan men-deploy layanan cloud yang andal.", "prd_tif", "dsn_001", "lanjut", 3, 150, "publikasi",
        ["Konsep Cloud & Model Layanan", "Virtualisasi & Container", "Docker Lanjutan", "Orkestrasi Kubernetes", "Helm & CI/CD", "Observability & Monitoring"]],
      ["krs_102", "WD-204", "Client-Side Web Frameworks", "Arsitektur komponen modern, manajemen state reaktif, dan TypeScript untuk membangun aplikasi web interaktif.", "prd_tif", "dsn_002", "menengah", 3, 120, "publikasi",
        ["DOM & Event Loop", "Komponen & Props", "State Management", "Routing SPA", "TypeScript Dasar", "Testing Front-End"]],
      ["krs_103", "DS-402", "Machine Learning Terapan", "Deep learning, computer vision, dan analitik prediktif menggunakan data nyata dari berbagai domain industri.", "prd_sda", "dsn_003", "lanjut", 4, 100, "publikasi",
        ["Regresi & Klasifikasi", "Evaluasi Model", "Neural Network", "Convolutional Neural Network", "Transfer Learning"]],
      ["krs_104", "UX-101", "Human-Computer Interaction & Ergonomi", "Prinsip usability, evaluasi heuristik, dan design system untuk menghasilkan antarmuka yang mudah digunakan.", "prd_dkv", "dsn_004", "dasar", 2, 60, "publikasi",
        ["Prinsip Usability", "User Research & Persona", "Evaluasi Heuristik", "Usability Testing"]],
      ["krs_105", "BF-210", "Corporate Governance & Finansial FinTech", "Struktur regulasi FinTech, risiko likuiditas, dan smart contract dalam ekosistem keuangan digital.", "prd_bdg", "dsn_005", "menengah", 3, 80, "draft",
        ["Regulasi FinTech", "Manajemen Risiko", "Smart Contract"]],
      ["krs_106", "CS-102", "Algoritma & Struktur Data Lanjutan", "Teori graf, dynamic programming, dan analisis kompleksitas Big-O untuk pemecahan masalah komputasi.", "prd_tif", "dsn_001", "menengah", 3, 180, "publikasi",
        ["Analisis Kompleksitas", "Struktur Data Pohon", "Graf & Traversal", "Greedy", "Dynamic Programming"]],
      ["krs_107", "CY-409", "Keamanan Siber & Ethical Hacking", "Penetration testing, OWASP Top 10, dan analisis kerentanan jaringan secara etis dan terukur.", "prd_tif", "dsn_006", "lanjut", 3, 60, "publikasi",
        ["Etika & Hukum Siber", "OWASP Top 10", "Network Scanning", "Penetration Testing"]],
      ["krs_108", "BM-105", "Fundamental Manajemen Operasional", "Dasar supply chain, prinsip lean, dan gambaran Six Sigma untuk meningkatkan efisiensi operasional organisasi.", "prd_bdg", "dsn_007", "dasar", 2, 75, "publikasi",
        ["Pengantar Operasional", "Supply Chain", "Lean Principles", "Six Sigma"]],
      ["krs_109", "SI-201", "Basis Data Relasional", "Pemodelan ER, normalisasi, dan SQL untuk merancang basis data yang konsisten dan efisien.", "prd_sif", "dsn_011", "dasar", 3, 120, "publikasi",
        ["Model Relasional & ERD", "Normalisasi", "SQL Dasar", "Join & Subquery", "Indeks & Transaksi"]],
      ["krs_110", "SD-210", "Statistika Inferensial", "Estimasi, uji hipotesis, dan regresi sebagai dasar pengambilan keputusan berbasis data.", "prd_sda", "dsn_012", "menengah", 3, 90, "publikasi",
        ["Distribusi Sampling", "Estimasi Interval", "Uji Hipotesis", "Regresi Linear"]],
      ["krs_111", "TK-320", "Sistem Tertanam & IoT", "Mikrokontroler, sensor, dan protokol komunikasi IoT untuk membangun perangkat pintar terhubung.", "prd_tkm", "dsn_010", "menengah", 3, 50, "draft",
        ["Mikrokontroler", "Sensor & Aktuator", "Protokol MQTT"]],
      ["krs_112", "SI-110", "Pengantar Sistem Informasi", "Konsep dasar sistem informasi organisasi. Kursus kurikulum lama yang telah diarsipkan.", "prd_sif", "dsn_011", "dasar", 2, 100, "arsip",
        ["Konsep Sistem Informasi", "Proses Bisnis", "Sistem Enterprise"]],
    ];
    var tipeMateri = ["video", "dokumen", "video", "kuis"];
    var modul = [];
    var kursus = kursusRows.map(function (r) {
      r[10].forEach(function (judul, i) {
        modul.push({ id: "mod_" + r[0].slice(4) + "_" + pad(i + 1, 2), kursus_id: r[0], pertemuan_ke: i + 1, judul: judul, tipe_materi: tipeMateri[i % tipeMateri.length] });
      });
      return {
        id: r[0], kode_mk: r[1], nama: r[2], deskripsi: r[3], prodi_id: r[4], instruktur_id: r[5],
        tingkat: r[6], sks: r[7], kuota: r[8], passing_grade: 60, periode: PERIODE, status: r[9],
      };
    });

    /* ---------------- MAHASISWA ---------------- */
    // [nim, nama, prodi, angkatan, ipk, status]
    var mhsRows = [
      ["2210511042", "Ahmad Danial Pratama", "prd_tif", 2022, 3.88, "aktif"],
      ["2310512015", "Nadia Aurelia Rahma", "prd_sda", 2023, 3.95, "aktif"],
      ["2110511088", "Rian Fahreza Kusuma", "prd_tif", 2021, 1.94, "aktif"],
      ["2310513009", "Devi Safitri Nugraha", "prd_sif", 2023, 3.46, "aktif"],
      ["2210514019", "Bagus Wicaksono", "prd_tkm", 2022, 3.21, "cuti"],
      ["2610511002", "Muhammad Satria Utama", "prd_tif", 2026, 0, "aktif"],
      ["2310512044", "Tania Kusuma Wardhani", "prd_sda", 2023, 3.82, "aktif"],
      ["2410511017", "Kevin Aditya Nugroho", "prd_tif", 2024, 3.35, "aktif"],
      ["2410513021", "Salsabila Putri Ramadhani", "prd_sif", 2024, 3.67, "aktif"],
      ["2510511030", "Galih Prakoso", "prd_tif", 2025, 3.12, "aktif"],
      ["2510516008", "Intan Permata Sari", "prd_bdg", 2025, 3.58, "aktif"],
      ["2410515012", "Yoga Pratama Putra", "prd_dkv", 2024, 3.41, "aktif"],
      ["2310516027", "Citra Lestari Anggraini", "prd_bdg", 2023, 3.73, "aktif"],
      ["2210512033", "Fikri Maulana Hakim", "prd_sda", 2022, 2.87, "aktif"],
      ["2510512011", "Aisyah Nurul Hidayah", "prd_sda", 2025, 3.90, "aktif"],
      ["2410514005", "Rizky Ramadhan", "prd_tkm", 2024, 3.05, "aktif"],
      ["2310515014", "Maya Anggraeni Putri", "prd_dkv", 2023, 3.62, "aktif"],
      ["2210513040", "Dimas Arya Saputra", "prd_sif", 2022, 2.45, "nonaktif"],
      ["2510511045", "Laras Ayu Pramesti", "prd_tif", 2025, 3.77, "aktif"],
      ["2410511050", "Bima Satya Nugraha", "prd_tif", 2024, 3.28, "aktif"],
      ["2610513003", "Zahra Aulia Rahman", "prd_sif", 2026, 0, "aktif"],
      ["2310511061", "Farel Alfarizi", "prd_tif", 2023, 3.49, "aktif"],
      ["2110511124", "Arya Dananjaya", "prd_tif", 2021, 3.84, "lulus"],
      ["2110513049", "Clarissa Aurelia Permata", "prd_sif", 2021, 3.71, "lulus"],
      ["2010512088", "Muhammad Rizky Pratama", "prd_sda", 2020, 3.55, "lulus"],
      ["2110511031", "Farhan Alamsyah", "prd_tif", 2021, 3.66, "lulus"],
    ];
    var TAHUN = 2026;
    var mahasiswa = mhsRows.map(function (r, i) {
      var semester = Math.min(14, (TAHUN - r[3]) * 2 + 1);
      return {
        id: "mhs_" + pad(i + 1, 4), nim: r[0], nama: r[1], email: slugEmail(r[1], "student.nexus.ac.id"),
        prodi_id: r[2], angkatan: r[3], semester: r[5] === "lulus" ? 8 : semester, ipk: r[4], status: r[5],
      };
    });

    /* ---------------- KRS (mahasiswa ↔ kursus) ---------------- */
    var krs = [];
    var bukaKrs = kursus.filter(function (k) { return k.status === "publikasi"; });
    mahasiswa.forEach(function (m) {
      if (m.status === "lulus" || m.status === "nonaktif") return;
      var sameProdi = bukaKrs.filter(function (k) { return k.prodi_id === m.prodi_id; });
      var pool = sameProdi.concat(bukaKrs.filter(function (k) { return sameProdi.indexOf(k) === -1; }));
      var jumlah = m.status === "cuti" ? 0 : 3 + Math.floor(rand() * 2);
      for (var i = 0; i < jumlah && i < pool.length; i++) {
        var idx = i < sameProdi.length ? i : sameProdi.length + Math.floor(rand() * (pool.length - sameProdi.length));
        var k = pool[idx];
        if (krs.some(function (x) { return x.mahasiswa_id === m.id && x.kursus_id === k.id; })) continue;
        var roll = rand();
        var status = roll < 0.72 ? "disetujui" : roll < 0.92 ? "diajukan" : "ditolak";
        krs.push({
          id: "krx_" + pad(krs.length + 1, 4), mahasiswa_id: m.id, kursus_id: k.id, periode: PERIODE, status: status,
          nilai_akhir: status === "disetujui" && rand() < 0.35 ? Math.round((55 + rand() * 43) * 10) / 10 : null,
          diajukan_pada: "2026-08-" + pad(18 + Math.floor(rand() * 10), 2) + "T" + pad(8 + Math.floor(rand() * 9), 2) + ":" + pad(Math.floor(rand() * 60), 2) + ":00",
        });
      }
    });

    /* ---------------- KELAS_VIRTUAL + PRESENSI ---------------- */
    var kelasVirtual = [
      ["kv_0001", "krs_102", 7, "Component Lifecycle & State Management", "2026-09-24T08:00:00", 100, "meet", "https://meet.google.com/gmt-tech-204", "selesai"],
      ["kv_0002", "krs_101", 4, "Kubernetes Orchestration & Helm Deployment", "2026-09-24T09:00:00", 150, "zoom", "https://zoom.us/j/8842910000", "live"],
      ["kv_0003", "krs_103", 4, "Convolutional Neural Network untuk Klasifikasi Citra", "2026-09-24T10:00:00", 100, "zoom", "https://zoom.us/j/9124021000", "live"],
      ["kv_0004", "krs_104", 4, "Usability Testing Lab & Cognitive Walkthrough", "2026-09-24T13:00:00", 100, "meet", "https://meet.google.com/gmt-ux-101", "terjadwal"],
      ["kv_0005", "krs_107", 4, "Penetration Testing Live Demo", "2026-09-24T14:00:00", 150, "teams", "https://teams.microsoft.com/l/meetup-join/cy409", "terjadwal"],
      ["kv_0006", "krs_108", 3, "Lean Six Sigma & Supply Chain Resilience", "2026-09-24T16:00:00", 100, "zoom", "https://zoom.us/j/7711050000", "terjadwal"],
      ["kv_0007", "krs_109", 2, "Normalisasi hingga BCNF", "2026-09-23T13:00:00", 100, "meet", "https://meet.google.com/gmt-si-201", "selesai"],
      ["kv_0008", "krs_106", 5, "Dynamic Programming: Knapsack & LCS", "2026-09-25T08:00:00", 100, "zoom", "https://zoom.us/j/6106102000", "terjadwal"],
    ].map(function (r) {
      var mod = modul.filter(function (m) { return m.kursus_id === r[1]; })[Math.min(r[2], 99) - 1];
      return { id: r[0], kursus_id: r[1], modul_id: mod ? mod.id : null, judul: r[3], waktu_mulai: r[4], durasi_menit: r[5], platform: r[6], tautan: r[7], status: r[8] };
    });
    var presensi = [];
    kelasVirtual.forEach(function (kv) {
      if (kv.status === "terjadwal") return;
      krs.forEach(function (x) {
        if (x.kursus_id !== kv.kursus_id || x.status !== "disetujui") return;
        var roll = rand();
        presensi.push({ id: "prs_" + pad(presensi.length + 1, 4), kelas_virtual_id: kv.id, mahasiswa_id: x.mahasiswa_id, status: roll < 0.88 ? "hadir" : roll < 0.95 ? "izin" : "alpa" });
      });
    });

    /* ---------------- TUGAS_KUIS + PENGUMPULAN ---------------- */
    var tugas = [
      ["tgs_0001", "krs_102", "Tugas 03: Implementasi SPA dengan State Management", "tugas", 15, "2026-10-01T23:59:00", "aktif"],
      ["tgs_0002", "krs_106", "Kuis Formatif 02: Greedy & Dynamic Programming", "kuis", 10, "2026-09-20T18:00:00", "ditutup"],
      ["tgs_0003", "krs_101", "UTS: Perancangan Arsitektur Microservices", "uts", 25, "2026-10-20T23:59:00", "draft"],
      ["tgs_0004", "krs_107", "Tugas Praktik 01: Audit Kerentanan OWASP Top 10", "tugas", 20, "2026-09-18T23:59:00", "ditutup"],
      ["tgs_0005", "krs_104", "Kuis Singkat 04: Heuristic Usability & Persona", "kuis", 5, "2026-09-26T17:00:00", "aktif"],
      ["tgs_0006", "krs_109", "Tugas 02: Normalisasi Skema Basis Data", "tugas", 15, "2026-09-30T23:59:00", "aktif"],
      ["tgs_0007", "krs_103", "Tugas 01: Klasifikasi Citra dengan CNN", "tugas", 20, "2026-10-05T23:59:00", "aktif"],
      ["tgs_0008", "krs_110", "Kuis 01: Distribusi Sampling", "kuis", 10, "2026-09-19T12:00:00", "ditutup"],
    ].map(function (r) {
      return { id: r[0], kursus_id: r[1], judul: r[2], jenis: r[3], bobot_persen: r[4], deadline: r[5], status: r[6] };
    });
    var pengumpulan = [];
    tugas.forEach(function (t) {
      if (t.status === "draft") return;
      krs.forEach(function (x) {
        if (x.kursus_id !== t.kursus_id || x.status !== "disetujui") return;
        if (t.status === "aktif" && rand() < 0.35) return; // belum mengumpulkan
        var dinilai = t.status === "ditutup" || rand() < 0.4;
        pengumpulan.push({
          id: "pgm_" + pad(pengumpulan.length + 1, 4), tugas_id: t.id, mahasiswa_id: x.mahasiswa_id,
          dikumpulkan_pada: t.deadline.slice(0, 8) + pad(Math.max(1, Number(t.deadline.slice(8, 10)) - Math.floor(rand() * 4)), 2) + "T" + pad(9 + Math.floor(rand() * 13), 2) + ":" + pad(Math.floor(rand() * 60), 2) + ":00",
          nilai: dinilai ? Math.round(58 + rand() * 40) : null,
          skor_plagiarisme: Math.floor(rand() * (rand() < 0.1 ? 35 : 12)),
          status: dinilai ? "dinilai" : rand() < 0.1 ? "revisi" : "menunggu",
        });
      });
    });

    /* ---------------- SERTIFIKAT ---------------- */
    function mhsByNim(nim) {
      return mahasiswa.filter(function (m) { return m.nim === nim; })[0].id;
    }
    var sertifikat = [
      ["srt_0001", "NXS/TIF/2026/00041", "2110511124", "krs_101", "Sertifikat Kelulusan Kursus", "2026-07-18", "Dr. Adrian Wicaksono, M.Kom.", "terbit"],
      ["srt_0002", "NXS/SIF/2026/00042", "2110513049", "krs_109", "Sertifikat Kelulusan Kursus", "2026-07-18", "Dr. Muhammad Satrio Utomo, M.T.", "menunggu_tte"],
      ["srt_0003", "NXS/SDA/2026/00043", "2010512088", "krs_103", "Sertifikat Kompetensi Associate Data Scientist", "2026-07-12", "Prof. Rian Hidayat, Ph.D.", "terbit"],
      ["srt_0004", "NXS/TIF/2026/00044", "2110511031", "krs_107", "Sertifikat Kelulusan Kursus", "2026-07-18", "Taufik Hidayat, M.Kom., CEH", "terbit"],
      ["srt_0005", "NXS/TIF/2026/00045", "2110511124", "krs_106", "Sertifikat Kelulusan Kursus", "2026-07-20", "Dr. Adrian Wicaksono, M.Kom.", "terbit"],
      ["srt_0006", "NXS/SIF/2026/00046", "2110513049", "krs_112", "Sertifikat Kelulusan Kursus", "2025-12-15", "Dr. Muhammad Satrio Utomo, M.T.", "dicabut"],
      ["srt_0007", "NXS/TIF/2026/00047", "2110511031", "krs_102", "Sertifikat Kelulusan Kursus", "2026-07-20", "Siti Paramitha, S.T., M.Sc.", "menunggu_tte"],
    ].map(function (r) {
      return { id: r[0], nomor_registrasi: r[1], mahasiswa_id: mhsByNim(r[2]), kursus_id: r[3], jenis: r[4], tanggal_terbit: r[5], penandatangan: r[6], status: r[7] };
    });

    /* ---------------- ADMIN, LOG, PENGATURAN ---------------- */
    var admin = [
      { id: "adm_001", nama: "Dr. Adrian Wicaksono, M.Kom.", email: "admin@nexus.ac.id", peran: "super_admin", login_terakhir: "2026-09-23T16:42:00" },
      { id: "adm_002", nama: "Rina Puspitasari, S.Kom.", email: "baak@nexus.ac.id", peran: "admin_akademik", login_terakhir: "2026-09-24T07:55:00" },
    ];

    var logAktivitas = [
      ["2026-09-24T07:55:00", "adm_002", "login", "admin", "adm_002", "Masuk ke panel admin"],
      ["2026-09-24T08:10:00", "adm_002", "update", "krs", "krx_0003", "Menyetujui KRS mahasiswa"],
      ["2026-09-23T16:42:00", "adm_001", "login", "admin", "adm_001", "Masuk ke panel admin"],
      ["2026-09-23T16:50:00", "adm_001", "create", "kursus", "krs_111", "Menambahkan kursus TK-320 Sistem Tertanam & IoT"],
      ["2026-09-23T17:05:00", "adm_001", "update", "kursus", "krs_105", "Mengubah status BF-210 menjadi draft"],
      ["2026-09-22T10:20:00", "adm_002", "create", "kelas_virtual", "kv_0008", "Menjadwalkan sesi Dynamic Programming (CS-102)"],
      ["2026-09-22T09:15:00", "adm_002", "update", "mahasiswa", "mhs_0005", "Mengubah status Bagus Wicaksono menjadi cuti"],
      ["2026-09-21T14:30:00", "adm_001", "update", "sertifikat", "srt_0006", "Mencabut sertifikat NXS/SIF/2026/00046"],
      ["2026-09-20T11:00:00", "adm_001", "create", "tugas_kuis", "tgs_0006", "Membuat Tugas 02: Normalisasi Skema Basis Data"],
      ["2026-09-19T08:45:00", "adm_002", "delete", "kursus", "krs_099", "Menghapus kursus uji coba TST-001"],
    ].map(function (r, i) {
      return { id: "log_" + pad(i + 1, 4), admin_id: r[1], aksi: r[2], entitas: r[3], entitas_id: r[4], deskripsi: r[5], waktu: r[0] };
    });

    var pengaturan = [
      ["nama_institusi", "Institut Teknologi dan Komputasi Nexus"],
      ["kode_pt", "001024"],
      ["email_helpdesk", "helpdesk@nexus.ac.id"],
      ["periode_aktif", PERIODE],
      ["batas_krs", "2026-09-30"],
      ["zona_waktu", "Asia/Jakarta"],
      ["sesi_timeout_menit", "30"],
      ["passing_grade_default", "60"],
    ].map(function (r) { return { kunci: r[0], nilai: r[1] }; });

    return {
      program_studi: prodi,
      instruktur: instruktur,
      kursus: kursus,
      modul: modul,
      mahasiswa: mahasiswa,
      krs: krs,
      kelas_virtual: kelasVirtual,
      presensi: presensi,
      tugas_kuis: tugas,
      pengumpulan: pengumpulan,
      sertifikat: sertifikat,
      admin: admin,
      log_aktivitas: logAktivitas,
      pengaturan: pengaturan,
    };
  }

  global.NexusSeed = { version: VERSION, periode: PERIODE, build: build };
})(typeof window !== "undefined" ? window : globalThis);
