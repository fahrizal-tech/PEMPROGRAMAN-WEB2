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

  var SESSION_KEY = "nexus-lms:session";
  var LOCK_KEY = "nexus-lms:login-lock";
  var DEMO_PASSWORD = "nexus2026"; // tercantum di README (akun demo)
  var REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;
  var DEFAULT_IDLE_MIN = 30;
  var MAX_ATTEMPTS = 5;
  var LOCK_MS = 30 * 1000;
  var TOUCH_INTERVAL_MS = 30 * 1000;

  // Halaman tujuan yang diizinkan setelah login (mencegah open redirect).
  var PAGES = ["dashboard.html", "laporan.html", "data-master.html", "form.html", "tugas-kuis.html", "kelas-virtual.html",
    "mahasiswa.html", "instruktur.html", "sertifikasi.html", "pengaturan.html", "layout.html"];

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
  function inPagesFolder() {
    return !!global.location && /\/pages\/[^/]*$/.test(global.location.pathname);
  }

  function currentPage() {
    return global.location ? global.location.pathname.split("/").pop() : "";
  }

  /** Nama halaman aman untuk ?next= (hanya daftar internal). */
  function safeNext(next) {
    return PAGES.indexOf(next) !== -1 ? next : "dashboard.html";
  }

  function loginUrl(reason) {
    var q = "?next=" + encodeURIComponent(safeNext(currentPage())) + (reason ? "&alasan=" + reason : "");
    return "../index.html" + q;
  }

  /* ---------- API publik ---------- */
  var auth = {
    DEMO_PASSWORD: DEMO_PASSWORD,
    MAX_ATTEMPTS: MAX_ATTEMPTS,
    AuthError: AuthError,
    safeNext: safeNext,
    lockRemaining: lockRemaining,

    currentUser: function () {
      var s = readSession();
      return s ? s.user : null;
    },

    isLoggedIn: function () {
      return !!readSession();
    },

    /**
     * Masuk dengan email admin + kata sandi demo.
     * @throws AuthError LOCKED | INVALID_INPUT | INVALID_CREDENTIALS
     */
    login: async function (email, password, options) {
      var wait = lockRemaining();
      if (wait > 0) throw new AuthError("LOCKED", "Terlalu banyak percobaan gagal. Coba lagi dalam " + wait + " detik.", { seconds: wait });

      var errors = {};
      var mail = String(email || "").trim().toLowerCase();
      if (!mail) errors.identifier = "Email wajib diisi.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) errors.identifier = "Format email tidak valid.";
      if (!password) errors.password = "Kata sandi wajib diisi.";
      if (Object.keys(errors).length) throw new AuthError("INVALID_INPUT", errors.identifier || errors.password, { errors: errors });

      var db = Nexus.storage;
      var admin = (await db.query("admin", function (a) { return a.email.toLowerCase() === mail; }))[0];
      if (!admin || password !== DEMO_PASSWORD) {
        var left = registerFailure();
        var locked = lockRemaining() > 0;
        throw new AuthError(
          locked ? "LOCKED" : "INVALID_CREDENTIALS",
          locked
            ? "Terlalu banyak percobaan gagal. Login dikunci selama " + LOCK_MS / 1000 + " detik."
            : "Email atau kata sandi salah. Sisa percobaan: " + left + ".",
          { seconds: locked ? LOCK_MS / 1000 : 0, attemptsLeft: left }
        );
      }

      writeLock({ count: 0, until: 0 });
      var idle = Number((await db.get("pengaturan", "sesi_timeout_menit") || {}).nilai) || DEFAULT_IDLE_MIN;
      var t = now();
      var user = { id: admin.id, nama: admin.nama, email: admin.email, peran: admin.peran };
      writeRaw({
        user: user,
        created_at: t,
        last_active: t,
        idle_min: idle,
        expires_at: options && options.remember ? t + REMEMBER_MS : null,
      });
      lastTouch = t;

      await db.update("admin", admin.id, { login_terakhir: new Date(t).toISOString() });
      await db.insert("log_aktivitas", {
        admin_id: admin.id, aksi: "login", entitas: "admin", entitas_id: admin.id,
        deskripsi: "Masuk ke panel admin", waktu: new Date(t).toISOString(),
      });
      return user;
    },

    logout: function () {
      clearRaw();
    },

    /** Label peran untuk tampilan. */
    roleLabel: function (peran) {
      return { super_admin: "Super Administrator", admin_akademik: "Admin Akademik (BAAK)" }[peran] || peran;
    },
  };

  Nexus.auth = auth;

  /* ---------- Proteksi halaman admin (berjalan segera) ---------- */
  if (inPagesFolder()) {
    if (!readSession()) {
      global.location.replace(loginUrl());
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
