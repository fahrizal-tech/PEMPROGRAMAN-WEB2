const test = require("node:test");
const assert = require("node:assert/strict");
const { loadScripts } = require("../helpers/env");

const { NexusSeed } = loadScripts(["assets/data/seed.js"]);
const data = NexusSeed.build();

const FOREIGN_KEYS = [
  ["mahasiswa", "prodi_id", "program_studi"],
  ["instruktur", "prodi_id", "program_studi"],
  ["kursus", "prodi_id", "program_studi"],
  ["kursus", "instruktur_id", "instruktur"],
  ["modul", "kursus_id", "kursus"],
  ["krs", "mahasiswa_id", "mahasiswa"],
  ["krs", "kursus_id", "kursus"],
  ["kelas_virtual", "kursus_id", "kursus"],
  ["kelas_virtual", "modul_id", "modul"],
  ["presensi", "kelas_virtual_id", "kelas_virtual"],
  ["presensi", "mahasiswa_id", "mahasiswa"],
  ["tugas_kuis", "kursus_id", "kursus"],
  ["pengumpulan", "tugas_id", "tugas_kuis"],
  ["pengumpulan", "mahasiswa_id", "mahasiswa"],
  ["sertifikat", "mahasiswa_id", "mahasiswa"],
  ["sertifikat", "kursus_id", "kursus"],
  ["log_aktivitas", "admin_id", "admin"],
];

const UNIQUE = [
  ["program_studi", "kode"], ["mahasiswa", "nim"], ["mahasiswa", "email"], ["instruktur", "nidn"],
  ["instruktur", "email"], ["kursus", "kode_mk"], ["sertifikat", "nomor_registrasi"], ["admin", "email"],
];

test("seed deterministik (build berulang identik)", () => {
  assert.deepEqual(NexusSeed.build(), NexusSeed.build());
});

test("setiap foreign key menunjuk data yang ada", () => {
  for (const [table, col, ref] of FOREIGN_KEYS) {
    const ids = new Set(data[ref].map((r) => r.id));
    for (const row of data[table]) {
      if (row[col] != null) assert.ok(ids.has(row[col]), `${table}.${col} = ${row[col]} tidak ada di ${ref}`);
    }
  }
});

test("kolom unik tidak ganda", () => {
  for (const [table, col] of UNIQUE) {
    const values = data[table].map((r) => r[col]);
    assert.equal(new Set(values).size, values.length, `${table}.${col} ganda`);
  }
  for (const table of Object.keys(data).filter((t) => t !== "pengaturan")) {
    const ids = data[table].map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length, `${table}.id ganda`);
  }
  const krs = data.krs.map((r) => `${r.mahasiswa_id}|${r.kursus_id}|${r.periode}`);
  assert.equal(new Set(krs).size, krs.length, "KRS mahasiswa+kursus+periode ganda");
});

test("format data sesuai kamus data", () => {
  data.mahasiswa.forEach((m) => {
    assert.match(m.nim, /^\d{8,12}$/);
    assert.ok(m.ipk >= 0 && m.ipk <= 4, `IPK ${m.nim}`);
    assert.match(m.email, /^[a-z]\.[a-z]+@student\.nexus\.ac\.id$/);
  });
  data.instruktur.forEach((d) => assert.match(d.nidn, /^\d{10}$/));
  data.kursus.forEach((k) => {
    assert.match(k.kode_mk, /^[A-Z]{2,4}-\d{3}$/);
    assert.ok(k.deskripsi.length >= 30, `deskripsi ${k.kode_mk}`);
    assert.ok(["draft", "publikasi", "arsip"].includes(k.status));
  });
});
