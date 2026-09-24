/**
 * Nexus.storage — mesin penyimpanan data lokal (LocalAdapter).
 *
 * - Data disimpan di localStorage, satu kunci per tabel: "nexus-lms:<tabel>".
 * - Semua method bersifat async (Promise) agar kelak bisa diganti adapter database
 *   online (mis. Supabase) tanpa mengubah kode halaman.
 * - Bila localStorage tidak tersedia (diblokir browser), otomatis memakai memori
 *   (data hilang saat halaman ditutup) dan Nexus.storage.mode bernilai "memory".
 *
 * Bergantung pada: assets/data/seed.js (NexusSeed).
 */
(function (global) {
  "use strict";

  var Nexus = (global.Nexus = global.Nexus || {});
  var PREFIX = "nexus-lms:";
  var META_KEY = PREFIX + "meta";

  // Tabel yang dikenal + kolom kunci + prefix ID untuk data baru.
  var TABLES = {
    program_studi: { key: "id", prefix: "prd" },
    instruktur: { key: "id", prefix: "dsn" },
    kursus: { key: "id", prefix: "krs" },
    modul: { key: "id", prefix: "mod" },
    mahasiswa: { key: "id", prefix: "mhs" },
    krs: { key: "id", prefix: "krx" },
    kelas_virtual: { key: "id", prefix: "kv" },
    presensi: { key: "id", prefix: "prs" },
    tugas_kuis: { key: "id", prefix: "tgs" },
    pengumpulan: { key: "id", prefix: "pgm" },
    sertifikat: { key: "id", prefix: "srt" },
    admin: { key: "id", prefix: "adm" },
    log_aktivitas: { key: "id", prefix: "log" },
    pengaturan: { key: "kunci", prefix: null },
  };

  /* ---------- Error ---------- */
  function StorageError(code, message) {
    this.name = "StorageError";
    this.code = code;
    this.message = message;
  }
  StorageError.prototype = Object.create(Error.prototype);
  StorageError.prototype.constructor = StorageError;

  /* ---------- Backend: localStorage atau memori ---------- */
  function createBackend() {
    try {
      var ls = global.localStorage;
      var probe = PREFIX + "__probe";
      ls.setItem(probe, "1");
      ls.removeItem(probe);
      return {
        mode: "local",
        get: function (k) { return ls.getItem(k); },
        set: function (k, v) { ls.setItem(k, v); },
        remove: function (k) { ls.removeItem(k); },
      };
    } catch (e) {
      var mem = {};
      return {
        mode: "memory",
        get: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
        set: function (k, v) { mem[k] = String(v); },
        remove: function (k) { delete mem[k]; },
      };
    }
  }

  var backend = createBackend();
  var cache = {};

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function now() {
    return new Date().toISOString();
  }

  function assertTable(table) {
    if (!Object.prototype.hasOwnProperty.call(TABLES, table)) {
      throw new StorageError("UNKNOWN_TABLE", "Tabel tidak dikenal: " + table);
    }
  }

  function readTable(table) {
    if (!cache[table]) {
      var raw = backend.get(PREFIX + table);
      var rows = [];
      if (raw) {
        try {
          rows = JSON.parse(raw);
          if (!Array.isArray(rows)) throw new Error("bukan array");
        } catch (e) {
          // Data rusak (diedit manual / terpotong): pulihkan seluruh data ke kondisi awal.
          console.warn("[Nexus] Data tabel '" + table + "' rusak, data dipulihkan ke kondisi awal.", e);
          seed();
          return cache[table];
        }
      }
      cache[table] = rows;
    }
    return cache[table];
  }

  function writeTable(table, rows) {
    try {
      backend.set(PREFIX + table, JSON.stringify(rows));
    } catch (e) {
      throw new StorageError("QUOTA_EXCEEDED", "Penyimpanan browser penuh. Hapus sebagian data atau lakukan reset data.");
    }
    cache[table] = rows;
  }

  function seed() {
    if (!global.NexusSeed) throw new StorageError("NO_SEED", "Data awal (seed.js) belum dimuat.");
    var data = global.NexusSeed.build();
    Object.keys(TABLES).forEach(function (t) { writeTable(t, data[t] || []); });
    backend.set(META_KEY, JSON.stringify({ version: global.NexusSeed.version, seeded_at: now() }));
  }

  function readMeta() {
    try { return JSON.parse(backend.get(META_KEY) || "null"); } catch (e) { return null; }
  }

  // Isi data awal bila belum ada, atau bila versi seed berubah (migrasi sederhana: reset ke versi baru).
  function ensureReady() {
    var meta = readMeta();
    if (!meta || !global.NexusSeed || meta.version !== global.NexusSeed.version) seed();
  }

  function newId(table) {
    var prefix = TABLES[table].prefix;
    var rows = readTable(table);
    var id;
    do {
      id = prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    } while (rows.some(function (r) { return r.id === id; }));
    return id;
  }

  function indexOf(table, id) {
    var key = TABLES[table].key;
    var rows = readTable(table);
    for (var i = 0; i < rows.length; i++) if (rows[i][key] === id) return i;
    return -1;
  }

  function notify(table, action, id) {
    if (typeof global.dispatchEvent === "function" && typeof global.CustomEvent === "function") {
      global.dispatchEvent(new CustomEvent("nexus:data-changed", { detail: { table: table, action: action, id: id } }));
    }
  }

  // Sinkron antar-tab: bila tab lain mengubah data, buang cache agar dibaca ulang.
  if (typeof global.addEventListener === "function") {
    global.addEventListener("storage", function (e) {
      if (!e.key || e.key.indexOf(PREFIX) !== 0) return;
      var table = e.key.slice(PREFIX.length);
      delete cache[table];
      if (TABLES[table]) notify(table, "sync", null);
    });
  }

  /* ---------- API publik (async) ---------- */
  function run(fn) {
    return new Promise(function (resolve) { resolve(fn()); });
  }

  var storage = {
    get mode() { return backend.mode; },
    tables: Object.keys(TABLES),

    /** Semua baris sebuah tabel (salinan). */
    list: function (table) {
      return run(function () { assertTable(table); ensureReady(); return clone(readTable(table)); });
    },

    /** Satu baris berdasarkan kunci, atau null. */
    get: function (table, id) {
      return run(function () {
        assertTable(table); ensureReady();
        var i = indexOf(table, id);
        return i === -1 ? null : clone(readTable(table)[i]);
      });
    },

    /** Baris yang memenuhi predikat. */
    query: function (table, predicate) {
      return run(function () {
        assertTable(table); ensureReady();
        return clone(readTable(table).filter(predicate));
      });
    },

    /** Tambah baris; ID & timestamp diisi otomatis. */
    insert: function (table, record) {
      return run(function () {
        assertTable(table); ensureReady();
        var key = TABLES[table].key;
        var row = clone(record) || {};
        if (row[key] == null || row[key] === "") {
          if (!TABLES[table].prefix) throw new StorageError("KEY_REQUIRED", "Kolom '" + key + "' wajib diisi.");
          row[key] = newId(table);
        } else if (indexOf(table, row[key]) !== -1) {
          throw new StorageError("DUPLICATE_KEY", "Data dengan " + key + " '" + row[key] + "' sudah ada.");
        }
        row.dibuat_pada = row.diubah_pada = now();
        var rows = readTable(table).concat([row]);
        writeTable(table, rows);
        notify(table, "create", row[key]);
        return clone(row);
      });
    },

    /** Ubah sebagian kolom; kolom kunci tidak dapat diubah. */
    update: function (table, id, patch) {
      return run(function () {
        assertTable(table); ensureReady();
        var key = TABLES[table].key;
        var i = indexOf(table, id);
        if (i === -1) throw new StorageError("NOT_FOUND", "Data tidak ditemukan (" + table + ": " + id + ").");
        var rows = readTable(table).slice();
        var row = Object.assign({}, rows[i], clone(patch) || {});
        row[key] = id;
        row.diubah_pada = now();
        rows[i] = row;
        writeTable(table, rows);
        notify(table, "update", id);
        return clone(row);
      });
    },

    /** Hapus satu baris; mengembalikan baris yang dihapus. */
    remove: function (table, id) {
      return run(function () {
        assertTable(table); ensureReady();
        var i = indexOf(table, id);
        if (i === -1) throw new StorageError("NOT_FOUND", "Data tidak ditemukan (" + table + ": " + id + ").");
        var rows = readTable(table).slice();
        var removed = rows.splice(i, 1)[0];
        writeTable(table, rows);
        notify(table, "delete", id);
        return clone(removed);
      });
    },

    /** Kembalikan seluruh data ke kondisi awal. */
    reset: function () {
      return run(function () { cache = {}; seed(); notify("*", "reset", null); return true; });
    },

    /** Cadangan seluruh data (untuk diunduh sebagai JSON). */
    exportAll: function () {
      return run(function () {
        ensureReady();
        var data = {};
        Object.keys(TABLES).forEach(function (t) { data[t] = clone(readTable(t)); });
        return { app: "nexus-lms", version: readMeta().version, exported_at: now(), data: data };
      });
    },

    /** Pulihkan dari cadangan exportAll(); divalidasi dulu sebelum menimpa data. */
    importAll: function (backup) {
      return run(function () {
        if (!backup || backup.app !== "nexus-lms" || !backup.data) {
          throw new StorageError("INVALID_BACKUP", "File cadangan tidak valid (bukan cadangan Nexus LMS).");
        }
        Object.keys(TABLES).forEach(function (t) {
          if (!Array.isArray(backup.data[t])) throw new StorageError("INVALID_BACKUP", "File cadangan tidak lengkap: tabel '" + t + "' tidak ada.");
        });
        Object.keys(TABLES).forEach(function (t) { writeTable(t, clone(backup.data[t])); });
        backend.set(META_KEY, JSON.stringify({ version: global.NexusSeed ? global.NexusSeed.version : backup.version, seeded_at: now(), imported: true }));
        notify("*", "import", null);
        return true;
      });
    },
  };

  Nexus.StorageError = StorageError;
  Nexus.storage = storage;
})(typeof window !== "undefined" ? window : globalThis);
