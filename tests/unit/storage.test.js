const test = require("node:test");
const assert = require("node:assert/strict");
const { FakeStorage, loadScripts, CORE } = require("../helpers/env");

test("data awal otomatis terisi saat pertama diakses", async () => {
  const { Nexus, NexusSeed } = loadScripts(CORE);
  const seed = NexusSeed.build();
  for (const t of Nexus.storage.tables) {
    assert.equal((await Nexus.storage.list(t)).length, seed[t].length, `jumlah baris ${t}`);
  }
  assert.equal(Nexus.storage.mode, "local");
});

test("data tersimpan permanen (dibaca ulang oleh instance baru)", async () => {
  const shared = new FakeStorage();
  let { Nexus } = loadScripts(CORE, { storage: shared });
  const row = await Nexus.storage.insert("kursus", { kode_mk: "TS-999", nama: "Kursus Uji" });
  ({ Nexus } = loadScripts(CORE, { storage: shared }));
  const again = await Nexus.storage.get("kursus", row.id);
  assert.equal(again.nama, "Kursus Uji");
});

test("insert: ID dengan prefix tabel, timestamp, dan tolak kunci ganda", async () => {
  const { Nexus } = loadScripts(CORE);
  const row = await Nexus.storage.insert("mahasiswa", { nama: "Uji" });
  assert.match(row.id, /^mhs_/);
  assert.ok(row.dibuat_pada && row.diubah_pada);
  await assert.rejects(Nexus.storage.insert("mahasiswa", { id: row.id }), { code: "DUPLICATE_KEY" });
  await assert.rejects(Nexus.storage.insert("pengaturan", { nilai: "x" }), { code: "KEY_REQUIRED" });
});

test("update: gabung kolom, kunci tidak berubah, NOT_FOUND bila tak ada", async () => {
  const { Nexus } = loadScripts(CORE);
  const [k] = await Nexus.storage.list("kursus");
  const updated = await Nexus.storage.update("kursus", k.id, { nama: "Nama Baru", id: "diganti" });
  assert.equal(updated.id, k.id);
  assert.equal(updated.nama, "Nama Baru");
  assert.equal(updated.kode_mk, k.kode_mk);
  await assert.rejects(Nexus.storage.update("kursus", "tidak_ada", {}), { code: "NOT_FOUND" });
});

test("remove: mengembalikan baris yang dihapus", async () => {
  const { Nexus } = loadScripts(CORE);
  const before = await Nexus.storage.list("tugas_kuis");
  const removed = await Nexus.storage.remove("tugas_kuis", before[0].id);
  assert.equal(removed.id, before[0].id);
  assert.equal((await Nexus.storage.list("tugas_kuis")).length, before.length - 1);
  await assert.rejects(Nexus.storage.remove("tugas_kuis", before[0].id), { code: "NOT_FOUND" });
});

test("data yang dikembalikan adalah salinan (tidak bisa mengubah isi penyimpanan)", async () => {
  const { Nexus } = loadScripts(CORE);
  const [k] = await Nexus.storage.list("kursus");
  k.nama = "DIUBAH DI LUAR";
  assert.notEqual((await Nexus.storage.get("kursus", k.id)).nama, "DIUBAH DI LUAR");
});

test("query dengan predikat", async () => {
  const { Nexus } = loadScripts(CORE);
  const draft = await Nexus.storage.query("kursus", (k) => k.status === "draft");
  assert.ok(draft.length > 0 && draft.every((k) => k.status === "draft"));
});

test("tabel tidak dikenal ditolak", async () => {
  const { Nexus } = loadScripts(CORE);
  await assert.rejects(Nexus.storage.list("pembayaran"), { code: "UNKNOWN_TABLE" });
});

test("data rusak dipulihkan otomatis ke kondisi awal", async () => {
  const shared = new FakeStorage();
  let { Nexus } = loadScripts(CORE, { storage: shared });
  await Nexus.storage.list("kursus");
  shared.setItem("nexus-lms:kursus", "{rusak");
  ({ Nexus } = loadScripts(CORE, { storage: shared }));
  const rows = await Nexus.storage.list("kursus");
  assert.equal(rows.length, 12);
});

test("localStorage diblokir → tetap berjalan di memori", async () => {
  const { Nexus } = loadScripts(CORE, { storage: new FakeStorage({ throwOnAccess: true }) });
  assert.equal(Nexus.storage.mode, "memory");
  const row = await Nexus.storage.insert("kursus", { nama: "Di memori" });
  assert.equal((await Nexus.storage.get("kursus", row.id)).nama, "Di memori");
});

test("penyimpanan penuh → error QUOTA_EXCEEDED yang jelas", async () => {
  const shared = new FakeStorage();
  let { Nexus } = loadScripts(CORE, { storage: shared });
  await Nexus.storage.list("kursus");
  const used = [...shared.map].reduce((n, [k, v]) => n + k.length + v.length, 0);
  shared.quotaBytes = used + 50;
  await assert.rejects(Nexus.storage.insert("kursus", { nama: "x".repeat(500) }), { code: "QUOTA_EXCEEDED" });
  assert.equal((await Nexus.storage.list("kursus")).length, 12, "data lama tetap utuh");
});

test("versi seed berubah → data diperbarui ke versi baru", async () => {
  const shared = new FakeStorage();
  let { Nexus } = loadScripts(CORE, { storage: shared });
  await Nexus.storage.insert("kursus", { nama: "Akan hilang saat migrasi" });
  shared.setItem("nexus-lms:meta", JSON.stringify({ version: 0 }));
  ({ Nexus } = loadScripts(CORE, { storage: shared }));
  assert.equal((await Nexus.storage.list("kursus")).length, 12);
});

test("reset mengembalikan data ke kondisi awal", async () => {
  const { Nexus } = loadScripts(CORE);
  const [k] = await Nexus.storage.list("kursus");
  await Nexus.storage.remove("kursus", k.id);
  await Nexus.storage.reset();
  assert.ok(await Nexus.storage.get("kursus", k.id));
});

test("export → import mengembalikan data; cadangan tidak valid ditolak tanpa merusak data", async () => {
  const { Nexus } = loadScripts(CORE);
  await Nexus.storage.insert("kursus", { nama: "Sebelum export" });
  const backup = await Nexus.storage.exportAll();
  await Nexus.storage.reset();
  await Nexus.storage.importAll(backup);
  assert.ok((await Nexus.storage.list("kursus")).some((k) => k.nama === "Sebelum export"));

  await assert.rejects(Nexus.storage.importAll({ app: "lain" }), { code: "INVALID_BACKUP" });
  const partial = { app: "nexus-lms", data: { kursus: [] } };
  await assert.rejects(Nexus.storage.importAll(partial), { code: "INVALID_BACKUP" });
  assert.equal((await Nexus.storage.list("kursus")).length, 13, "data tidak berubah setelah import gagal");
});
