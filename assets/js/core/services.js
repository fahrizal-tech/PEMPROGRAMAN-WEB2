/**
 * Nexus.services — lapisan logika bisnis di atas Nexus.storage.
 *
 * Setiap service: list, get, query, create, update, remove (+ aksi khusus).
 * - Validasi skema (Nexus.validate) + cek unik & relasi (foreign key).
 * - Aturan bisnis (mis. kursus dengan KRS aktif tidak boleh dihapus).
 * - Setiap perubahan otomatis dicatat ke log_aktivitas.
 *
 * Halaman HANYA memanggil service ini, tidak langsung ke storage.
 * Bergantung pada: storage.js, validators.js.
 */
(function (global) {
  "use strict";

  var Nexus = (global.Nexus = global.Nexus || {});
  var db = Nexus.storage;
  var validate = Nexus.validate;
  var ValidationError = Nexus.ValidationError;

  function BusinessError(code, message) {
    this.name = "BusinessError";
    this.code = code;
    this.message = message;
  }
  BusinessError.prototype = Object.create(Error.prototype);
  BusinessError.prototype.constructor = BusinessError;

  var PERIODE_PATTERN = [/^\d{4}\/\d{4}-(Ganjil|Genap)$/, "Periode harus berformat 2026/2027-Ganjil atau 2026/2027-Genap."];
  var CURRENT_YEAR = new Date().getFullYear();

  /* ---------- Log aktivitas ---------- */
  function currentUser() {
    return Nexus.auth && typeof Nexus.auth.currentUser === "function" ? Nexus.auth.currentUser() : null;
  }

  // Pelaku aksi: admin dicatat di admin_id, mahasiswa (portal pelajar) di mahasiswa_id.
  function log(aksi, entitas, entitasId, deskripsi) {
    var user = currentUser();
    var student = !!(user && user.peran === "mahasiswa");
    return db.insert("log_aktivitas", {
      admin_id: user && !student ? user.id : null,
      mahasiswa_id: student ? user.mahasiswa_id : null,
      aksi: aksi,
      entitas: entitas,
      entitas_id: entitasId,
      deskripsi: deskripsi,
      waktu: new Date().toISOString(),
    });
  }

  /* ---------- Fabrik service generik ---------- */
  function createService(cfg) {
    var table = cfg.table;
    var schema = cfg.schema;

    async function checkIntegrity(data, selfId) {
      var errors = {};
      var fields = Object.keys(schema);
      for (var i = 0; i < fields.length; i++) {
        var f = fields[i], rule = schema[f], v = data[f];
        if (v == null || v === "") continue;
        if (rule.unique) {
          var dup = await db.query(table, function (r) {
            return r.id !== selfId && String(r[f]).toLowerCase() === String(v).toLowerCase();
          });
          if (dup.length) errors[f] = rule.label + " '" + v + "' sudah digunakan.";
        }
        if (rule.ref && !(await db.get(rule.ref, v))) {
          errors[f] = rule.label + " yang dipilih tidak ditemukan.";
        }
      }
      if (Object.keys(errors).length) throw new ValidationError(errors);
    }

    async function prepare(input, existing) {
      var merged = Object.assign({}, existing || {}, input);
      var result = validate(schema, merged);
      if (!result.valid) throw new ValidationError(result.errors);
      var data = result.data;
      await checkIntegrity(data, existing ? existing.id : null);
      if (cfg.check) await cfg.check(data, existing || null);
      return data;
    }

    var service = {
      table: table,
      schema: schema,
      describe: cfg.describe,

      list: function () { return db.list(table); },
      get: function (id) { return db.get(table, id); },
      query: function (fn) { return db.query(table, fn); },

      /** Validasi tanpa menyimpan (untuk form). */
      validate: function (data, options) { return validate(schema, data, options); },

      create: async function (input) {
        var data = await prepare(input, null);
        var row = await db.insert(table, pick(data, Object.keys(schema)));
        var desc = cfg.describeAsync ? await cfg.describeAsync(row) : cfg.describe(row);
        await log("create", table, row.id, "Menambahkan " + cfg.label + " " + desc);
        return row;
      },

      update: async function (id, patch) {
        var existing = await db.get(table, id);
        if (!existing) throw new BusinessError("NOT_FOUND", cfg.label.charAt(0).toUpperCase() + cfg.label.slice(1) + " tidak ditemukan.");
        var data = await prepare(patch, existing);
        var row = await db.update(table, id, pick(data, Object.keys(schema)));
        await log("update", table, id, (cfg.updateText ? cfg.updateText(existing, row) : "Mengubah " + cfg.label + " " + cfg.describe(row)));
        return row;
      },

      /** Apa saja yang terdampak bila data dihapus (untuk isi modal konfirmasi). */
      impact: async function (id) {
        return cfg.impact ? cfg.impact(id) : { blockers: [], cascades: [] };
      },

      remove: async function (id) {
        var row = await db.get(table, id);
        if (!row) throw new BusinessError("NOT_FOUND", cfg.label.charAt(0).toUpperCase() + cfg.label.slice(1) + " tidak ditemukan.");
        var effect = await service.impact(id);
        if (effect.blockers.length) {
          throw new BusinessError("HAS_RELATIONS", "Tidak dapat menghapus " + cfg.label + " " + cfg.describe(row) + ": " + effect.blockers.join("; ") + ".");
        }
        if (cfg.cascade) await cfg.cascade(row);
        await db.remove(table, id);
        await log("delete", table, id, "Menghapus " + cfg.label + " " + cfg.describe(row));
        return row;
      },
    };
    return service;
  }

  function pick(obj, keys) {
    var out = {};
    keys.forEach(function (k) { if (obj[k] !== undefined) out[k] = obj[k]; });
    return out;
  }

  function count(table, fn) {
    return db.query(table, fn).then(function (rows) { return rows.length; });
  }

  async function removeWhere(table, fn) {
    var rows = await db.query(table, fn);
    for (var i = 0; i < rows.length; i++) await db.remove(table, rows[i].id);
    return rows.length;
  }

  function plural(n, word) {
    return n + " " + word;
  }

  /* ==================== KURSUS ==================== */
  var kursus = createService({
    table: "kursus",
    label: "kursus",
    describe: function (k) { return k.kode_mk + " " + k.nama; },
    schema: {
      kode_mk: { label: "Kode MK", required: true, unique: true, transform: "upper",
        pattern: [/^[A-Z]{2,4}-\d{3}$/, "Kode MK harus 2–4 huruf kapital, tanda -, dan 3 digit (contoh: CS-301)."] },
      nama: { label: "Nama kursus", required: true, minLength: 5, maxLength: 120 },
      deskripsi: { label: "Deskripsi", required: true, minLength: 30, maxLength: 2000 },
      prodi_id: { label: "Program studi", required: true, ref: "program_studi" },
      instruktur_id: { label: "Dosen pengampu", required: true, ref: "instruktur" },
      tingkat: { label: "Tingkat", required: true, oneOf: ["dasar", "menengah", "lanjut"] },
      sks: { label: "SKS", required: true, type: "integer", min: 1, max: 6 },
      kuota: { label: "Kuota", required: true, type: "integer", min: 1, max: 500 },
      passing_grade: { label: "Passing grade", required: true, type: "integer", min: 0, max: 100 },
      periode: { label: "Periode", required: true, pattern: PERIODE_PATTERN },
      status: { label: "Status", required: true, oneOf: ["draft", "publikasi", "arsip"] },
      cover: { label: "Sampul", maxLength: 200000,
        pattern: [/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/, "Sampul harus berupa gambar WebP, JPEG, atau PNG."] },
    },
    check: async function (data, existing) {
      if (!existing) return;
      var disetujui = await count("krs", function (x) { return x.kursus_id === existing.id && x.status === "disetujui"; });
      if (data.kuota < disetujui) {
        throw new ValidationError({ kuota: "Kuota tidak boleh kurang dari jumlah KRS yang sudah disetujui (" + disetujui + ")." });
      }
      if (data.status === "publikasi") {
        var jumlahModul = await count("modul", function (m) { return m.kursus_id === existing.id; });
        if (!jumlahModul) throw new ValidationError({ status: "Kursus harus memiliki minimal 1 modul sebelum dipublikasikan." });
      }
    },
    impact: async function (id) {
      var blockers = [];
      var aktif = await count("krs", function (x) { return x.kursus_id === id && x.status !== "ditolak"; });
      var srt = await count("sertifikat", function (s) { return s.kursus_id === id; });
      if (aktif) blockers.push("masih memiliki " + plural(aktif, "KRS aktif"));
      if (srt) blockers.push("sudah menerbitkan " + plural(srt, "sertifikat"));
      var cascades = [];
      var nModul = await count("modul", function (m) { return m.kursus_id === id; });
      var nTugas = await count("tugas_kuis", function (t) { return t.kursus_id === id; });
      var nKelas = await count("kelas_virtual", function (k) { return k.kursus_id === id; });
      if (nModul) cascades.push(plural(nModul, "modul"));
      if (nTugas) cascades.push(plural(nTugas, "tugas/kuis"));
      if (nKelas) cascades.push(plural(nKelas, "sesi kelas virtual"));
      return { blockers: blockers, cascades: cascades };
    },
    cascade: async function (k) {
      var tugasIds = (await db.query("tugas_kuis", function (t) { return t.kursus_id === k.id; })).map(function (t) { return t.id; });
      var kelasIds = (await db.query("kelas_virtual", function (v) { return v.kursus_id === k.id; })).map(function (v) { return v.id; });
      await removeWhere("pengumpulan", function (p) { return tugasIds.indexOf(p.tugas_id) !== -1; });
      await removeWhere("presensi", function (p) { return kelasIds.indexOf(p.kelas_virtual_id) !== -1; });
      await removeWhere("tugas_kuis", function (t) { return t.kursus_id === k.id; });
      await removeWhere("kelas_virtual", function (v) { return v.kursus_id === k.id; });
      await removeWhere("krs", function (x) { return x.kursus_id === k.id; });
      await removeWhere("modul", function (m) { return m.kursus_id === k.id; });
    },
  });

  /* ==================== MODUL ==================== */
  var modul = createService({
    table: "modul",
    label: "modul",
    describe: function (m) { return "pertemuan " + m.pertemuan_ke + " \"" + m.judul + "\""; },
    schema: {
      kursus_id: { label: "Kursus", required: true, ref: "kursus" },
      pertemuan_ke: { label: "Pertemuan ke", required: true, type: "integer", min: 1, max: 16 },
      judul: { label: "Judul modul", required: true, minLength: 3, maxLength: 120 },
      tipe_materi: { label: "Tipe materi", required: true, oneOf: ["video", "dokumen", "kuis"] },
    },
    check: async function (data, existing) {
      var dup = await count("modul", function (m) {
        return m.kursus_id === data.kursus_id && m.pertemuan_ke === data.pertemuan_ke && (!existing || m.id !== existing.id);
      });
      if (dup) throw new ValidationError({ pertemuan_ke: "Pertemuan ke-" + data.pertemuan_ke + " sudah ada di kursus ini." });
    },
    impact: async function (id) {
      var n = await count("kelas_virtual", function (k) { return k.modul_id === id; });
      return { blockers: n ? ["dipakai oleh " + plural(n, "sesi kelas virtual")] : [], cascades: [] };
    },
  });

  /**
   * Validasi struktur modul (urutan array = nomor pertemuan).
   * Kunci error: "modul_<index>_<kolom>" atau "modul" untuk kesalahan umum.
   */
  modul.validateStructure = function (items) {
    var errors = {};
    if (items.length > 16) errors.modul = "Maksimal 16 modul (satu per pertemuan).";
    items.forEach(function (it, i) {
      var res = validate(modul.schema, { kursus_id: "x", pertemuan_ke: i + 1, judul: it.judul, tipe_materi: it.tipe_materi }, { only: ["judul", "tipe_materi"] });
      Object.keys(res.errors).forEach(function (k) { errors["modul_" + i + "_" + k] = "Modul " + (i + 1) + ": " + res.errors[k]; });
    });
    return { valid: Object.keys(errors).length === 0, errors: errors };
  };

  /** Simpan seluruh struktur modul kursus sekaligus (tambah, ubah, urutkan ulang, hapus). */
  modul.saveForKursus = async function (kursusId, items) {
    if (!(await db.get("kursus", kursusId))) throw new BusinessError("NOT_FOUND", "Kursus tidak ditemukan.");
    var check = modul.validateStructure(items);
    if (!check.valid) throw new ValidationError(check.errors);

    var existing = await db.query("modul", function (m) { return m.kursus_id === kursusId; });
    var keepIds = items.map(function (it) { return it.id; }).filter(Boolean);
    var removed = existing.filter(function (m) { return keepIds.indexOf(m.id) === -1; });
    for (var r = 0; r < removed.length; r++) {
      var dipakai = await count("kelas_virtual", function (k) { return k.modul_id === removed[r].id; });
      if (dipakai) {
        throw new ValidationError({ modul: "Modul \"" + removed[r].judul + "\" tidak dapat dihapus karena dipakai oleh " + dipakai + " sesi kelas virtual." });
      }
    }
    for (var d = 0; d < removed.length; d++) await db.remove("modul", removed[d].id);
    for (var i = 0; i < items.length; i++) {
      var data = { kursus_id: kursusId, pertemuan_ke: i + 1, judul: String(items[i].judul).trim(), tipe_materi: items[i].tipe_materi };
      if (items[i].id && existing.some(function (m) { return m.id === items[i].id; })) await db.update("modul", items[i].id, data);
      else await db.insert("modul", data);
    }
    var k = await db.get("kursus", kursusId);
    await log("update", "modul", kursusId, "Memperbarui struktur modul " + k.kode_mk + " (" + items.length + " modul)");
    return db.query("modul", function (m) { return m.kursus_id === kursusId; });
  };

  /* ==================== MAHASISWA ==================== */
  var mahasiswa = createService({
    table: "mahasiswa",
    label: "mahasiswa",
    describe: function (m) { return m.nim + " " + m.nama; },
    schema: {
      nim: { label: "NIM", required: true, unique: true, pattern: [/^\d{8,12}$/, "NIM harus 8–12 digit angka."] },
      nama: { label: "Nama", required: true, minLength: 3, maxLength: 100 },
      email: { label: "Email", required: true, unique: true, email: true, transform: "lower", maxLength: 120 },
      prodi_id: { label: "Program studi", required: true, ref: "program_studi" },
      angkatan: { label: "Angkatan", required: true, type: "integer", min: 2000, max: CURRENT_YEAR + 1 },
      semester: { label: "Semester", required: true, type: "integer", min: 1, max: 14 },
      ipk: { label: "IPK", required: true, type: "number", min: 0, max: 4 },
      status: { label: "Status", required: true, oneOf: ["aktif", "cuti", "nonaktif", "lulus"] },
    },
    impact: async function (id) {
      var blockers = [];
      var krsOk = await count("krs", function (x) { return x.mahasiswa_id === id && x.status === "disetujui"; });
      var srt = await count("sertifikat", function (s) { return s.mahasiswa_id === id; });
      if (krsOk) blockers.push("memiliki " + plural(krsOk, "KRS yang sudah disetujui"));
      if (srt) blockers.push("memiliki " + plural(srt, "sertifikat"));
      var nKrs = await count("krs", function (x) { return x.mahasiswa_id === id; });
      return { blockers: blockers, cascades: nKrs ? [plural(nKrs, "pengajuan KRS")] : [] };
    },
    cascade: async function (m) {
      await removeWhere("presensi", function (p) { return p.mahasiswa_id === m.id; });
      await removeWhere("pengumpulan", function (p) { return p.mahasiswa_id === m.id; });
      await removeWhere("krs", function (x) { return x.mahasiswa_id === m.id; });
    },
  });

  /* ==================== INSTRUKTUR ==================== */
  var instruktur = createService({
    table: "instruktur",
    label: "dosen",
    describe: function (d) { return d.nama + " (NIDN " + d.nidn + ")"; },
    schema: {
      nidn: { label: "NIDN", required: true, unique: true, pattern: [/^\d{10}$/, "NIDN harus 10 digit angka."] },
      nama: { label: "Nama", required: true, minLength: 3, maxLength: 120 },
      email: { label: "Email", required: true, unique: true, email: true, transform: "lower", maxLength: 120 },
      prodi_id: { label: "Program studi", required: true, ref: "program_studi" },
      jabatan_akademik: { label: "Jabatan akademik", required: true, oneOf: ["Asisten Ahli", "Lektor", "Lektor Kepala", "Guru Besar"] },
      bidang_keahlian: { label: "Bidang keahlian", maxLength: 100 },
      serdos: { label: "Sertifikasi dosen", type: "boolean" },
      nilai_edom: { label: "Nilai EDOM", type: "number", min: 0, max: 4 },
    },
    impact: async function (id) {
      var n = await count("kursus", function (k) { return k.instruktur_id === id; });
      return { blockers: n ? ["masih mengampu " + plural(n, "kursus")] : [], cascades: [] };
    },
  });

  /* ==================== KRS ==================== */
  var krsBase = createService({
    table: "krs",
    label: "KRS",
    describe: function (x) { return x.id; },
    describeAsync: function (x) { return describeKrs(x); },
    schema: {
      mahasiswa_id: { label: "Mahasiswa", required: true, ref: "mahasiswa" },
      kursus_id: { label: "Kursus", required: true, ref: "kursus" },
      periode: { label: "Periode", required: true, pattern: PERIODE_PATTERN },
      status: { label: "Status", required: true, oneOf: ["diajukan", "disetujui", "ditolak"] },
      nilai_akhir: { label: "Nilai akhir", type: "number", min: 0, max: 100 },
      diajukan_pada: { label: "Waktu pengajuan", type: "datetime" },
    },
    check: async function (data, existing) {
      var dup = await count("krs", function (x) {
        return x.mahasiswa_id === data.mahasiswa_id && x.kursus_id === data.kursus_id && x.periode === data.periode && (!existing || x.id !== existing.id);
      });
      if (dup) throw new ValidationError({ kursus_id: "Mahasiswa sudah mengambil kursus ini pada periode yang sama." });
      if (!existing) {
        var k = await db.get("kursus", data.kursus_id);
        if (k.status !== "publikasi") throw new ValidationError({ kursus_id: "Kursus belum/tidak dibuka (status: " + k.status + ")." });
      }
    },
  });

  async function describeKrs(x) {
    var m = await db.get("mahasiswa", x.mahasiswa_id);
    var k = await db.get("kursus", x.kursus_id);
    return (m ? m.nama : x.mahasiswa_id) + " – " + (k ? k.kode_mk : x.kursus_id);
  }

  var krs = Object.assign({}, krsBase, {
    create: function (input) {
      return krsBase.create(Object.assign({ status: "diajukan", diajukan_pada: new Date().toISOString() }, input));
    },

    /** Setujui KRS: cek status mahasiswa & kuota kursus. */
    approve: async function (id) {
      var x = await db.get("krs", id);
      if (!x) throw new BusinessError("NOT_FOUND", "KRS tidak ditemukan.");
      if (x.status === "disetujui") return x;
      var m = await db.get("mahasiswa", x.mahasiswa_id);
      if (!m || m.status !== "aktif") throw new BusinessError("MAHASISWA_TIDAK_AKTIF", "KRS tidak dapat disetujui karena mahasiswa berstatus " + (m ? m.status : "tidak ditemukan") + ".");
      var k = await db.get("kursus", x.kursus_id);
      var terisi = await count("krs", function (r) { return r.kursus_id === x.kursus_id && r.status === "disetujui"; });
      if (terisi >= k.kuota) throw new BusinessError("KUOTA_PENUH", "Kuota " + k.kode_mk + " sudah penuh (" + terisi + "/" + k.kuota + ").");
      var row = await db.update("krs", id, { status: "disetujui" });
      await log("update", "krs", id, "Menyetujui KRS " + (await describeKrs(x)));
      return row;
    },

    reject: async function (id, alasan) {
      var x = await db.get("krs", id);
      if (!x) throw new BusinessError("NOT_FOUND", "KRS tidak ditemukan.");
      var row = await db.update("krs", id, { status: "ditolak", nilai_akhir: null });
      await log("update", "krs", id, "Menolak KRS " + (await describeKrs(x)) + (alasan ? " (" + alasan + ")" : ""));
      return row;
    },
  });

  /* ==================== KELAS VIRTUAL ==================== */
  var kelasVirtual = createService({
    table: "kelas_virtual",
    label: "sesi kelas virtual",
    describe: function (v) { return "\"" + v.judul + "\""; },
    schema: {
      kursus_id: { label: "Kursus", required: true, ref: "kursus" },
      modul_id: { label: "Modul", ref: "modul" },
      judul: { label: "Judul sesi", required: true, minLength: 5, maxLength: 150 },
      waktu_mulai: { label: "Waktu mulai", required: true, type: "datetime" },
      durasi_menit: { label: "Durasi", required: true, type: "integer", min: 15, max: 240 },
      platform: { label: "Platform", required: true, oneOf: ["zoom", "meet", "teams"] },
      tautan: { label: "Tautan", required: true, url: true, maxLength: 300 },
      status: { label: "Status", required: true, oneOf: ["terjadwal", "live", "selesai"] },
    },
    check: async function (data) {
      if (data.modul_id) {
        var m = await db.get("modul", data.modul_id);
        if (m.kursus_id !== data.kursus_id) throw new ValidationError({ modul_id: "Modul tidak termasuk dalam kursus yang dipilih." });
      }
    },
    impact: async function (id) {
      var n = await count("presensi", function (p) { return p.kelas_virtual_id === id; });
      return { blockers: [], cascades: n ? [plural(n, "catatan presensi")] : [] };
    },
    cascade: function (v) { return removeWhere("presensi", function (p) { return p.kelas_virtual_id === v.id; }); },
  });

  /** Peserta sah sebuah sesi = mahasiswa dengan KRS disetujui pada kursus sesi tersebut. */
  kelasVirtual.peserta = async function (kelasId) {
    var kv = await db.get("kelas_virtual", kelasId);
    if (!kv) throw new BusinessError("NOT_FOUND", "Sesi kelas virtual tidak ditemukan.");
    var ids = (await db.query("krs", function (x) { return x.kursus_id === kv.kursus_id && x.status === "disetujui"; }))
      .map(function (x) { return x.mahasiswa_id; });
    return db.query("mahasiswa", function (m) { return ids.indexOf(m.id) !== -1; });
  };

  /**
   * Simpan presensi sebuah sesi. entries: [{ mahasiswa_id, status: hadir|izin|alpa }]
   * Mahasiswa di luar peserta sah ditolak; entri yang sudah ada diperbarui.
   */
  kelasVirtual.savePresensi = async function (kelasId, entries) {
    var kv = await db.get("kelas_virtual", kelasId);
    if (!kv) throw new BusinessError("NOT_FOUND", "Sesi kelas virtual tidak ditemukan.");
    if (kv.status === "terjadwal") throw new BusinessError("BELUM_MULAI", "Presensi hanya dapat diisi untuk sesi yang sedang live atau sudah selesai.");
    var peserta = (await kelasVirtual.peserta(kelasId)).map(function (m) { return m.id; });
    entries.forEach(function (e) {
      if (peserta.indexOf(e.mahasiswa_id) === -1) throw new BusinessError("BUKAN_PESERTA", "Mahasiswa " + e.mahasiswa_id + " bukan peserta kursus ini.");
      if (["hadir", "izin", "alpa"].indexOf(e.status) === -1) throw new ValidationError({ status: "Status presensi harus hadir, izin, atau alpa." });
    });
    var existing = await db.query("presensi", function (p) { return p.kelas_virtual_id === kelasId; });
    for (var i = 0; i < entries.length; i++) {
      var found = existing.filter(function (p) { return p.mahasiswa_id === entries[i].mahasiswa_id; })[0];
      if (found) { if (found.status !== entries[i].status) await db.update("presensi", found.id, { status: entries[i].status }); }
      else await db.insert("presensi", { kelas_virtual_id: kelasId, mahasiswa_id: entries[i].mahasiswa_id, status: entries[i].status });
    }
    var hadir = entries.filter(function (e) { return e.status === "hadir"; }).length;
    await log("update", "presensi", kelasId, "Menyimpan presensi sesi \"" + kv.judul + "\" (" + hadir + "/" + entries.length + " hadir)");
    return db.query("presensi", function (p) { return p.kelas_virtual_id === kelasId; });
  };

  /* ==================== TUGAS & KUIS ==================== */
  var tugasBase = createService({
    table: "tugas_kuis",
    label: "tugas/kuis",
    describe: function (t) { return "\"" + t.judul + "\""; },
    schema: {
      kursus_id: { label: "Kursus", required: true, ref: "kursus" },
      judul: { label: "Judul", required: true, minLength: 5, maxLength: 150 },
      jenis: { label: "Jenis", required: true, oneOf: ["tugas", "kuis", "uts", "uas"] },
      bobot_persen: { label: "Bobot", required: true, type: "integer", min: 1, max: 100 },
      deadline: { label: "Batas waktu", required: true, type: "datetime" },
      status: { label: "Status", required: true, oneOf: ["draft", "aktif", "ditutup"] },
    },
    check: async function (data, existing) {
      var lain = await db.query("tugas_kuis", function (t) { return t.kursus_id === data.kursus_id && (!existing || t.id !== existing.id); });
      var total = lain.reduce(function (n, t) { return n + t.bobot_persen; }, 0) + data.bobot_persen;
      if (total > 100) {
        throw new ValidationError({ bobot_persen: "Total bobot kursus ini menjadi " + total + "% (maksimal 100%). Sisa bobot tersedia: " + (100 - (total - data.bobot_persen)) + "%." });
      }
    },
    impact: async function (id) {
      var n = await count("pengumpulan", function (p) { return p.tugas_id === id; });
      return { blockers: [], cascades: n ? [plural(n, "pengumpulan mahasiswa")] : [] };
    },
    cascade: function (t) { return removeWhere("pengumpulan", function (p) { return p.tugas_id === t.id; }); },
  });

  var tugasKuis = Object.assign({}, tugasBase, {
    /** Beri nilai pada pengumpulan mahasiswa. */
    grade: async function (pengumpulanId, nilai) {
      var p = await db.get("pengumpulan", pengumpulanId);
      if (!p) throw new BusinessError("NOT_FOUND", "Pengumpulan tidak ditemukan.");
      var res = validate({ nilai: { label: "Nilai", required: true, type: "number", min: 0, max: 100 } }, { nilai: nilai });
      if (!res.valid) throw new ValidationError(res.errors);
      var row = await db.update("pengumpulan", pengumpulanId, { nilai: res.data.nilai, status: "dinilai" });
      var t = await db.get("tugas_kuis", p.tugas_id);
      var m = await db.get("mahasiswa", p.mahasiswa_id);
      await log("update", "pengumpulan", pengumpulanId, "Memberi nilai " + res.data.nilai + " untuk " + (m ? m.nama : "-") + " pada \"" + (t ? t.judul : "-") + "\"");
      return row;
    },
  });

  /* ==================== SERTIFIKAT ==================== */
  var sertifikatBase = createService({
    table: "sertifikat",
    label: "sertifikat",
    describe: function (s) { return s.nomor_registrasi; },
    schema: {
      nomor_registrasi: { label: "Nomor registrasi", required: true, unique: true, transform: "upper",
        pattern: [/^NXS\/[A-Z]{3}\/\d{4}\/\d{5}$/, "Nomor registrasi harus berformat NXS/TIF/2026/00001."] },
      mahasiswa_id: { label: "Mahasiswa", required: true, ref: "mahasiswa" },
      kursus_id: { label: "Kursus", required: true, ref: "kursus" },
      jenis: { label: "Jenis sertifikat", required: true, minLength: 5, maxLength: 120 },
      tanggal_terbit: { label: "Tanggal terbit", required: true, type: "date" },
      penandatangan: { label: "Penandatangan", required: true, minLength: 3, maxLength: 120 },
      status: { label: "Status", required: true, oneOf: ["menunggu_tte", "terbit", "dicabut"] },
    },
    check: async function (data, existing) {
      if (existing) return;
      var m = await db.get("mahasiswa", data.mahasiswa_id);
      var k = await db.get("kursus", data.kursus_id);
      var lulus = await db.query("krs", function (x) {
        return x.mahasiswa_id === m.id && x.kursus_id === k.id && x.status === "disetujui" && x.nilai_akhir != null && x.nilai_akhir >= k.passing_grade;
      });
      if (!lulus.length && m.status !== "lulus") {
        throw new ValidationError({ mahasiswa_id: m.nama + " belum lulus " + k.kode_mk + " (nilai akhir di bawah passing grade " + k.passing_grade + " atau belum dinilai)." });
      }
    },
    impact: async function (id) {
      var srt = await db.get("sertifikat", id);
      // Sertifikat terbit/dicabut adalah dokumen resmi: gunakan Cabut, bukan hapus (jejak verifikasi tetap ada).
      return { blockers: srt && srt.status !== "menunggu_tte" ? ["sertifikat berstatus " + (srt.status === "terbit" ? "terbit" : "dicabut") + " merupakan dokumen resmi — gunakan aksi Cabut"] : [], cascades: [] };
    },
  });

  async function nextNomorRegistrasi(kursusId, tanggal) {
    var k = await db.get("kursus", kursusId);
    var p = k ? await db.get("program_studi", k.prodi_id) : null;
    var tahun = String(tanggal || new Date().toISOString()).slice(0, 4);
    var semua = await db.list("sertifikat");
    var max = semua.reduce(function (n, s) { var x = Number(String(s.nomor_registrasi).slice(-5)); return x > n ? x : n; }, 0);
    return "NXS/" + (p ? p.kode : "GEN") + "/" + tahun + "/" + String(max + 1).padStart(5, "0");
  }

  async function setStatusSertifikat(id, status, verb) {
    var s = await db.get("sertifikat", id);
    if (!s) throw new BusinessError("NOT_FOUND", "Sertifikat tidak ditemukan.");
    if (status === "terbit" && s.status === "dicabut") throw new BusinessError("SUDAH_DICABUT", "Sertifikat yang sudah dicabut tidak dapat diterbitkan ulang.");
    var row = await db.update("sertifikat", id, { status: status });
    await log("update", "sertifikat", id, verb + " sertifikat " + s.nomor_registrasi);
    return row;
  }

  var sertifikat = Object.assign({}, sertifikatBase, {
    create: async function (input) {
      var data = Object.assign({ status: "menunggu_tte", tanggal_terbit: new Date().toISOString().slice(0, 10) }, input);
      if (!data.nomor_registrasi) data.nomor_registrasi = await nextNomorRegistrasi(data.kursus_id, data.tanggal_terbit);
      return sertifikatBase.create(data);
    },
    terbitkan: function (id) { return setStatusSertifikat(id, "terbit", "Menerbitkan"); },
    cabut: function (id) { return setStatusSertifikat(id, "dicabut", "Mencabut"); },

    /** Verifikasi publik berdasarkan nomor registrasi. */
    verify: async function (nomor) {
      var key = String(nomor || "").trim().toUpperCase();
      var found = (await db.query("sertifikat", function (s) { return s.nomor_registrasi === key; }))[0];
      if (!found) return { valid: false, pesan: "Nomor registrasi tidak ditemukan." };
      var m = await db.get("mahasiswa", found.mahasiswa_id);
      var k = await db.get("kursus", found.kursus_id);
      var valid = found.status === "terbit";
      return {
        valid: valid,
        pesan: valid ? "Sertifikat sah dan aktif." : found.status === "dicabut" ? "Sertifikat telah DICABUT." : "Sertifikat belum ditandatangani.",
        sertifikat: found, mahasiswa: m, kursus: k,
      };
    },
  });

  /* ==================== PENGATURAN ==================== */
  var SETTINGS_SCHEMA = {
    nama_institusi: { label: "Nama institusi", required: true, minLength: 5, maxLength: 150 },
    kode_pt: { label: "Kode PT", required: true, pattern: [/^\d{6}$/, "Kode PT harus 6 digit angka."] },
    email_helpdesk: { label: "Email helpdesk", required: true, email: true, transform: "lower" },
    periode_aktif: { label: "Periode aktif", required: true, pattern: PERIODE_PATTERN },
    batas_krs: { label: "Batas pengisian KRS", required: true, type: "date" },
    zona_waktu: { label: "Zona waktu", required: true, oneOf: ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"] },
    sesi_timeout_menit: { label: "Batas sesi", required: true, type: "integer", min: 5, max: 480 },
    passing_grade_default: { label: "Passing grade default", required: true, type: "integer", min: 0, max: 100 },
  };

  var pengaturan = {
    schema: SETTINGS_SCHEMA,
    /** Semua pengaturan sebagai objek { kunci: nilai }. */
    all: async function () {
      var rows = await db.list("pengaturan");
      var out = {};
      rows.forEach(function (r) { out[r.kunci] = r.nilai; });
      return out;
    },
    get: async function (kunci) {
      var r = await db.get("pengaturan", kunci);
      return r ? r.nilai : null;
    },
    /** Simpan beberapa pengaturan sekaligus (divalidasi semua dulu). */
    save: async function (values) {
      var only = Object.keys(values).filter(function (k) { return SETTINGS_SCHEMA[k]; });
      var res = validate(SETTINGS_SCHEMA, values, { only: only });
      if (!res.valid) throw new ValidationError(res.errors);
      for (var i = 0; i < only.length; i++) {
        var k = only[i], v = String(res.data[k]);
        if (await db.get("pengaturan", k)) await db.update("pengaturan", k, { nilai: v });
        else await db.insert("pengaturan", { kunci: k, nilai: v });
      }
      await log("update", "pengaturan", only.join(","), "Mengubah pengaturan: " + only.map(function (k) { return SETTINGS_SCHEMA[k].label.toLowerCase(); }).join(", "));
      return pengaturan.all();
    },
  };

  /* ==================== BACA-SAJA ==================== */
  function readOnly(table) {
    return {
      list: function () { return db.list(table); },
      get: function (id) { return db.get(table, id); },
      query: function (fn) { return db.query(table, fn); },
    };
  }

  var logAktivitas = Object.assign(readOnly("log_aktivitas"), {
    /** Log terbaru di atas. */
    recent: async function (limit) {
      var rows = (await db.list("log_aktivitas")).map(function (r, i) { return { r: r, i: i }; });
      // Urut waktu terbaru; bila waktu sama (aksi beruntun), yang dicatat belakangan di atas.
      rows.sort(function (a, b) { return b.r.waktu < a.r.waktu ? -1 : b.r.waktu > a.r.waktu ? 1 : b.i - a.i; });
      rows = rows.map(function (x) { return x.r; });
      return limit ? rows.slice(0, limit) : rows;
    },
  });

  /* ==================== PORTAL PELAJAR ==================== */
  // Semua fungsi memakai mahasiswa dari SESI (bukan parameter), sehingga mahasiswa
  // hanya dapat membaca dan mengubah datanya sendiri.
  var SUBMIT_SCHEMA = {
    tautan: { label: "Tautan berkas", required: true, url: true, maxLength: 300 },
    catatan: { label: "Catatan", maxLength: 500 },
  };

  async function me() {
    var user = currentUser();
    if (!user || user.peran !== "mahasiswa") throw new BusinessError("BUKAN_MAHASISWA", "Fitur ini hanya untuk mahasiswa yang sedang masuk.");
    var m = await db.get("mahasiswa", user.mahasiswa_id);
    if (!m) throw new BusinessError("NOT_FOUND", "Data mahasiswa tidak ditemukan.");
    return m;
  }

  /** KRS milik mahasiswa yang disetujui → daftar id kursus. */
  async function kursusDisetujui(mhsId) {
    var rows = await db.query("krs", function (x) { return x.mahasiswa_id === mhsId && x.status === "disetujui"; });
    return rows.map(function (x) { return x.kursus_id; });
  }

  var pelajar = {
    schemaPengumpulan: SUBMIT_SCHEMA,
    me: me,

    /** Semua KRS milik saya (semua status) beserta kursus & dosennya. */
    kursusSaya: async function () {
      var m = await me();
      var rows = await db.query("krs", function (x) { return x.mahasiswa_id === m.id; });
      var out = [];
      for (var i = 0; i < rows.length; i++) {
        var k = await db.get("kursus", rows[i].kursus_id);
        out.push({ krs: rows[i], kursus: k, dosen: k ? await db.get("instruktur", k.instruktur_id) : null });
      }
      return out;
    },

    /** Kursus yang dibuka (publikasi) + jumlah terisi + status KRS saya untuk kursus itu. */
    katalog: async function () {
      var m = await me();
      var kursusList = await db.query("kursus", function (k) { return k.status === "publikasi"; });
      var krs = await db.list("krs");
      return kursusList.map(function (k) {
        var mine = krs.filter(function (x) { return x.kursus_id === k.id && x.mahasiswa_id === m.id; })[0] || null;
        var terisi = krs.filter(function (x) { return x.kursus_id === k.id && x.status === "disetujui"; }).length;
        return { kursus: k, terisi: terisi, krs: mine };
      });
    },

    /** Ajukan KRS: mahasiswa aktif, sebelum batas KRS, kursus dibuka, belum diambil, kuota tersedia. */
    ajukanKrs: async function (kursusId) {
      var m = await me();
      if (m.status !== "aktif") throw new BusinessError("MAHASISWA_TIDAK_AKTIF", "Pengajuan KRS hanya untuk mahasiswa aktif (status Anda: " + m.status + ").");
      var batas = await pengaturan.get("batas_krs");
      if (batas && Nexus.utils && Nexus.utils.localDate(new Date()) > batas) {
        throw new BusinessError("BATAS_KRS", "Masa pengisian KRS sudah berakhir (" + batas + ").");
      }
      var k = await db.get("kursus", kursusId);
      if (!k || k.status !== "publikasi") throw new BusinessError("KURSUS_TUTUP", "Kursus ini tidak dibuka untuk KRS.");
      var terisi = await count("krs", function (x) { return x.kursus_id === k.id && x.status === "disetujui"; });
      if (terisi >= k.kuota) throw new BusinessError("KUOTA_PENUH", "Kuota " + k.kode_mk + " sudah penuh (" + terisi + "/" + k.kuota + ").");
      var periode = (await pengaturan.get("periode_aktif")) || k.periode;
      var row = await krs.create({ mahasiswa_id: m.id, kursus_id: k.id, periode: periode });
      return row;
    },

    /** Batalkan pengajuan KRS milik sendiri yang belum diproses. */
    batalKrs: async function (krsId) {
      var m = await me();
      var x = await db.get("krs", krsId);
      if (!x || x.mahasiswa_id !== m.id) throw new BusinessError("NOT_FOUND", "Pengajuan KRS tidak ditemukan.");
      if (x.status !== "diajukan") throw new BusinessError("SUDAH_DIPROSES", "KRS yang sudah diproses BAAK tidak dapat dibatalkan.");
      await db.remove("krs", krsId);
      var k = await db.get("kursus", x.kursus_id);
      await log("delete", "krs", krsId, "Membatalkan pengajuan KRS " + (k ? k.kode_mk : x.kursus_id));
      return true;
    },

    /** Sesi kelas virtual dari kursus yang disetujui + status presensi saya. */
    jadwal: async function () {
      var m = await me();
      var ids = await kursusDisetujui(m.id);
      var sesi = await db.query("kelas_virtual", function (v) { return ids.indexOf(v.kursus_id) !== -1; });
      var pres = await db.query("presensi", function (p) { return p.mahasiswa_id === m.id; });
      var out = [];
      for (var i = 0; i < sesi.length; i++) {
        var v = sesi[i];
        out.push({
          sesi: v,
          kursus: await db.get("kursus", v.kursus_id),
          presensi: pres.filter(function (p) { return p.kelas_virtual_id === v.id; })[0] || null,
        });
      }
      out.sort(function (a, b) { return a.sesi.waktu_mulai < b.sesi.waktu_mulai ? -1 : 1; });
      return out;
    },

    /** Masuk sesi yang sedang live: presensi tercatat "hadir", lalu tautan dikembalikan. */
    masukKelas: async function (sesiId) {
      var m = await me();
      var v = await db.get("kelas_virtual", sesiId);
      var ids = await kursusDisetujui(m.id);
      if (!v || ids.indexOf(v.kursus_id) === -1) throw new BusinessError("NOT_FOUND", "Sesi tidak ditemukan pada kursus Anda.");
      if (v.status !== "live") throw new BusinessError("BELUM_LIVE", v.status === "selesai" ? "Sesi ini sudah selesai." : "Sesi belum dimulai.");
      var p = (await db.query("presensi", function (x) { return x.kelas_virtual_id === v.id && x.mahasiswa_id === m.id; }))[0];
      if (!p) {
        await db.insert("presensi", { kelas_virtual_id: v.id, mahasiswa_id: m.id, status: "hadir" });
        await log("create", "presensi", v.id, "Hadir di kelas virtual \"" + v.judul + "\"");
      } else if (p.status !== "hadir") {
        await db.update("presensi", p.id, { status: "hadir" });
      }
      return v.tautan;
    },

    /** Tugas/kuis (bukan draft) dari kursus yang disetujui + pengumpulan saya. */
    tugas: async function () {
      var m = await me();
      var ids = await kursusDisetujui(m.id);
      var list = await db.query("tugas_kuis", function (t) { return ids.indexOf(t.kursus_id) !== -1 && t.status !== "draft"; });
      var kumpul = await db.query("pengumpulan", function (p) { return p.mahasiswa_id === m.id; });
      var out = [];
      for (var i = 0; i < list.length; i++) {
        var t = list[i];
        out.push({
          tugas: t,
          kursus: await db.get("kursus", t.kursus_id),
          pengumpulan: kumpul.filter(function (p) { return p.tugas_id === t.id; })[0] || null,
        });
      }
      out.sort(function (a, b) { return a.tugas.deadline < b.tugas.deadline ? -1 : 1; });
      return out;
    },

    /** Kumpulkan / perbarui jawaban: tugas aktif, sebelum tenggat, belum dinilai. */
    kumpulkan: async function (tugasId, input) {
      var m = await me();
      var t = await db.get("tugas_kuis", tugasId);
      var ids = await kursusDisetujui(m.id);
      if (!t || t.status === "draft" || ids.indexOf(t.kursus_id) === -1) throw new BusinessError("NOT_FOUND", "Tugas tidak ditemukan pada kursus Anda.");
      if (t.status !== "aktif") throw new BusinessError("TUGAS_DITUTUP", "Tugas ini sudah ditutup.");
      if (new Date(t.deadline).getTime() < Date.now()) throw new BusinessError("LEWAT_TENGGAT", "Batas waktu pengumpulan sudah lewat.");
      var res = validate(SUBMIT_SCHEMA, input || {});
      if (!res.valid) throw new ValidationError(res.errors);
      var data = { tautan: res.data.tautan, catatan: res.data.catatan || "", dikumpulkan_pada: new Date().toISOString(), status: "menunggu" };
      var p = (await db.query("pengumpulan", function (x) { return x.tugas_id === t.id && x.mahasiswa_id === m.id; }))[0];
      var row;
      if (p) {
        if (p.status === "dinilai") throw new BusinessError("SUDAH_DINILAI", "Jawaban sudah dinilai dan tidak dapat diubah.");
        row = await db.update("pengumpulan", p.id, data);
        await log("update", "pengumpulan", p.id, "Memperbarui jawaban \"" + t.judul + "\"");
      } else {
        row = await db.insert("pengumpulan", Object.assign({ tugas_id: t.id, mahasiswa_id: m.id, nilai: null, skor_plagiarisme: null }, data));
        await log("create", "pengumpulan", row.id, "Mengumpulkan \"" + t.judul + "\"");
      }
      return row;
    },

    /** Sertifikat milik saya (yang dicabut tetap ditampilkan dengan statusnya). */
    sertifikat: async function () {
      var m = await me();
      var rows = await db.query("sertifikat", function (s) { return s.mahasiswa_id === m.id; });
      var out = [];
      for (var i = 0; i < rows.length; i++) out.push({ sertifikat: rows[i], kursus: await db.get("kursus", rows[i].kursus_id) });
      return out;
    },
  };

  Nexus.BusinessError = BusinessError;
  Nexus.services = {
    pelajar: pelajar,
    kursus: kursus,
    modul: modul,
    mahasiswa: mahasiswa,
    instruktur: instruktur,
    krs: krs,
    kelasVirtual: kelasVirtual,
    tugasKuis: tugasKuis,
    pengumpulan: readOnly("pengumpulan"),
    presensi: readOnly("presensi"),
    sertifikat: sertifikat,
    pengaturan: pengaturan,
    programStudi: readOnly("program_studi"),
    admin: readOnly("admin"),
    logAktivitas: logAktivitas,
  };
})(typeof window !== "undefined" ? window : globalThis);
