/**
 * Nexus.auth — login demo, sesi, dan proteksi halaman admin.
 *
 * PENTING: aplikasi ini sepenuhnya client-side, sehingga login hanyalah SIMULASI
 * (lihat SECURITY.md). Autentikasi sungguhan direncanakan dengan Supabase Auth (Tahap 7).
 *
 * Dimuat TANPA defer di <head> halaman admin agar pengecekan sesi berjalan sebelum
 * konten tampil (tidak ada kilasan halaman bagi pengguna yang belum login).
 */
(function (global) {
  "use strict";

  var Nexus = (global.Nexus = global.Nexus || {});

  // Sembunyikan <main> sampai semua skrip defer selesai menyusun halaman, agar kerangka
  // kosong tidak tergambar lalu bergeser (CLS). DOMContentLoaded tetap terpicu walau ada
  // skrip yang gagal, jadi konten tidak pernah tertahan; tanpa JS kelas ini tidak dipasang.
  var root = global.document && global.document.documentElement;
  if (root) {
    root.classList.add("js-pending");
    global.document.addEventListener("DOMContentLoaded", function () { root.classList.remove("js-pending"); });
  }

  var SESSION_KEY = "nexus-lms:session";
  var LOCK_KEY = "nexus-lms:login-lock";
  var DEMO_PASSWORD = "nexus2026"; // tercantum di README (akun demo)
  var REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;
  var DEFAULT_IDLE_MIN = 30;
  var MAX_ATTEMPTS = 5;
  var LOCK_MS = 30 * 1000;
  var TOUCH_INTERVAL_MS = 30 * 1000;

  // Halaman tujuan yang diizinkan setelah login, per area (mencegah open redirect).
  var PAGES = ["dashboard.html", "laporan.html", "data-master.html", "form.html", "tugas-kuis.html", "kelas-virtual.html",
    "mahasiswa.html", "instruktur.html", "sertifikasi.html", "pengaturan.html", "layout.html"];
  var PAGES_PELAJAR = ["beranda.html", "kursus.html", "jadwal.html", "tugas.html", "nilai.html"];
  var AREA = {
    admin: { folder: "pages", home: "dashboard.html", pages: PAGES },
    pelajar: { folder: "pelajar", home: "beranda.html", pages: PAGES_PELAJAR },
  };
  var NIM_PATTERN = /^\d{8,12}$/;

  /** Area milik pengguna: mahasiswa → "pelajar", selain itu (admin) → "admin". */
  function areaOf(user) {
    return user && user.peran === "mahasiswa" ? "pelajar" : "admin";
  }

  function AuthError(code, message, extra) {
    this.name = "AuthError";
    this.code = code;
    this.message = message;
    Object.assign(this, extra || {});
  }
  AuthError.prototype = Object.create(Error.prototype);
  AuthError.prototype.constructor = AuthError;

  function store(kind) {
    try {
      var s = global[kind];
      var probe = "nexus-lms:__probe";
      s.setItem(probe, "1");
      s.removeItem(probe);
      return s;
    } catch (e) {
      return null;
    }
  }
  var local = store("localStorage");
  var session = store("sessionStorage");
  var memorySession = null; // cadangan bila keduanya diblokir

  function now() { return Date.now(); }

  function readRaw() {
    var raw = (session && session.getItem(SESSION_KEY)) || (local && local.getItem(SESSION_KEY));
    if (!raw) return memorySession;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function writeRaw(s) {
    clearRaw();
    var target = s.expires_at ? local : session;
    if (target) target.setItem(SESSION_KEY, JSON.stringify(s));
    else memorySession = s;
  }

  function clearRaw() {
    if (session) session.removeItem(SESSION_KEY);
    if (local) local.removeItem(SESSION_KEY);
    memorySession = null;
  }

  /** Sesi aktif, atau null bila tidak ada / kedaluwarsa / idle terlalu lama. */
  function readSession() {
    var s = readRaw();
    if (!s || !s.user) return null;
    var t = now();
    var idleLimit = (s.idle_min || DEFAULT_IDLE_MIN) * 60 * 1000;
    if ((s.expires_at && t > s.expires_at) || t - s.last_active > idleLimit) {
      clearRaw();
      return null;
    }
    return s;
  }

  var lastTouch = 0;
  function touch() {
    var t = now();
    if (t - lastTouch < TOUCH_INTERVAL_MS) return;
    var s = readSession();
    if (!s) return;
    lastTouch = t;
    s.last_active = t;
    writeRaw(s);
  }

  /* ---------- Pembatasan percobaan login ---------- */
  function readLock() {
    try { return JSON.parse((local && local.getItem(LOCK_KEY)) || "null") || { count: 0, until: 0 }; }
    catch (e) { return { count: 0, until: 0 }; }
  }
  function writeLock(l) { if (local) local.setItem(LOCK_KEY, JSON.stringify(l)); }

  function lockRemaining() {
    return Math.max(0, Math.ceil((readLock().until - now()) / 1000));
  }

  function registerFailure() {
    var l = readLock();
    l.count += 1;
    if (l.count >= MAX_ATTEMPTS) {
      l = { count: 0, until: now() + LOCK_MS };
    }
    writeLock(l);
    return MAX_ATTEMPTS - l.count;
  }

  /* ---------- Navigasi ---------- */
  /** Area halaman saat ini dari foldernya: "admin" (pages/), "pelajar" (pelajar/), atau null (login). */
  function currentArea() {
    var m = global.location && /\/(pages|pelajar)\/[^/]*$/.exec(global.location.pathname);
    return m ? (m[1] === "pages" ? "admin" : "pelajar") : null;
  }

  function currentPage() {
    return global.location ? global.location.pathname.split("/").pop() : "";
  }

  /** Nama halaman aman untuk ?next= (hanya daftar internal area tersebut). */
  function safeNext(next, area) {
    var a = AREA[area || "admin"];
    return a.pages.indexOf(next) !== -1 ? next : a.home;
  }

  /** Jalur (relatif dari root situs) halaman tujuan setelah login sesuai peran. */
  function homePath(user, next) {
    var area = areaOf(user);
    return AREA[area].folder + "/" + safeNext(next, area);
  }

  function loginUrl(reason) {
    var q = "?next=" + encodeURIComponent(currentPage()) + (reason ? "&alasan=" + reason : "");
    return "../index.html" + q;
  }

  /* ---------- API publik ---------- */
  var auth = {
    DEMO_PASSWORD: DEMO_PASSWORD,
    MAX_ATTEMPTS: MAX_ATTEMPTS,
    AuthError: AuthError,
    safeNext: safeNext,
    homePath: homePath,
    areaOf: areaOf,
    lockRemaining: lockRemaining,

    currentUser: function () {
      var s = readSession();
      return s ? s.user : null;
    },

    isLoggedIn: function () {
      return !!readSession();
    },

    /**
     * Masuk dengan kata sandi demo sebagai admin (email) atau mahasiswa (NIM / email mahasiswa).
     * options.role: "admin" (bawaan) | "mahasiswa"; options.remember: ingat 30 hari.
     * @throws AuthError LOCKED | INVALID_INPUT | INVALID_CREDENTIALS | ACCOUNT_INACTIVE
     */
    login: async function (identifier, password, options) {
      var wait = lockRemaining();
      if (wait > 0) throw new AuthError("LOCKED", "Terlalu banyak percobaan gagal. Coba lagi dalam " + wait + " detik.", { seconds: wait });

      var asStudent = !!(options && options.role === "mahasiswa");
      var errors = {};
      var id = String(identifier || "").trim().toLowerCase();
      var isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(id);
      if (!id) errors.identifier = asStudent ? "NIM atau email wajib diisi." : "Email wajib diisi.";
      else if (asStudent && !isEmail && !NIM_PATTERN.test(id)) errors.identifier = "Masukkan NIM (8–12 digit) atau email mahasiswa yang valid.";
      else if (!asStudent && !isEmail) errors.identifier = "Format email tidak valid.";
      if (!password) errors.password = "Kata sandi wajib diisi.";
      if (Object.keys(errors).length) throw new AuthError("INVALID_INPUT", errors.identifier || errors.password, { errors: errors });

      var db = Nexus.storage;
      var account = asStudent
        ? (await db.query("mahasiswa", function (m) { return isEmail ? m.email.toLowerCase() === id : m.nim === id; }))[0]
        : (await db.query("admin", function (a) { return a.email.toLowerCase() === id; }))[0];
      if (!account || password !== DEMO_PASSWORD) {
        var left = registerFailure();
        var locked = lockRemaining() > 0;
        throw new AuthError(
          locked ? "LOCKED" : "INVALID_CREDENTIALS",
          locked
            ? "Terlalu banyak percobaan gagal. Login dikunci selama " + LOCK_MS / 1000 + " detik."
            : (asStudent ? "NIM/email" : "Email") + " atau kata sandi salah. Sisa percobaan: " + left + ".",
          { seconds: locked ? LOCK_MS / 1000 : 0, attemptsLeft: left }
        );
      }

      // Mahasiswa nonaktif (DO/mengundurkan diri) tidak dapat masuk; cuti dan lulus tetap bisa melihat datanya.
      if (asStudent && account.status === "nonaktif") {
        throw new AuthError("ACCOUNT_INACTIVE", "Akun mahasiswa berstatus nonaktif. Hubungi BAAK melalui helpdesk@nexus.ac.id.");
      }

      writeLock({ count: 0, until: 0 });
      var idle = Number((await db.get("pengaturan", "sesi_timeout_menit") || {}).nilai) || DEFAULT_IDLE_MIN;
      var t = now();
      var user = asStudent
        ? { id: account.id, nama: account.nama, email: account.email, peran: "mahasiswa", mahasiswa_id: account.id, nim: account.nim, prodi_id: account.prodi_id }
        : { id: account.id, nama: account.nama, email: account.email, peran: account.peran };
      writeRaw({
        user: user,
        created_at: t,
        last_active: t,
        idle_min: idle,
        expires_at: options && options.remember ? t + REMEMBER_MS : null,
      });
      lastTouch = t;

      if (asStudent) {
        await db.insert("log_aktivitas", {
          admin_id: null, mahasiswa_id: account.id, aksi: "login", entitas: "mahasiswa", entitas_id: account.id,
          deskripsi: "Masuk ke portal pelajar", waktu: new Date(t).toISOString(),
        });
      } else {
        await db.update("admin", account.id, { login_terakhir: new Date(t).toISOString() });
        await db.insert("log_aktivitas", {
          admin_id: account.id, aksi: "login", entitas: "admin", entitas_id: account.id,
          deskripsi: "Masuk ke panel admin", waktu: new Date(t).toISOString(),
        });
      }
      return user;
    },

    logout: function () {
      clearRaw();
    },

    /** Label peran untuk tampilan. */
    roleLabel: function (peran) {
      return { super_admin: "Super Administrator", admin_akademik: "Admin Akademik (BAAK)", mahasiswa: "Mahasiswa" }[peran] || peran;
    },
  };

  Nexus.auth = auth;

  /* ---------- Proteksi halaman admin & portal pelajar (berjalan segera) ---------- */
  var area = currentArea();
  if (area) {
    var active = readSession();
    if (!active) {
      global.location.replace(loginUrl());
      return;
    }
    // Peran lain tidak boleh membuka area ini → kembali ke beranda perannya sendiri.
    if (areaOf(active.user) !== area) {
      global.location.replace("../" + homePath(active.user));
      return;
    }
    touch();
    ["click", "keydown", "scroll", "touchstart"].forEach(function (evt) {
      global.addEventListener(evt, touch, { passive: true });
    });
    // Cek berkala: sesi habis karena idle → kembali ke login.
    global.setInterval(function () {
      if (!readSession()) global.location.replace(loginUrl("sesi-berakhir"));
    }, 60 * 1000);
    // Keluar dari tab lain → ikut keluar.
    global.addEventListener("storage", function (e) {
      if (e.key === SESSION_KEY && !e.newValue && !readSession()) global.location.replace(loginUrl());
    });
  }
})(typeof window !== "undefined" ? window : globalThis);
