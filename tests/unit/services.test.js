const test = require("node:test");
const assert = require("node:assert/strict");
const { loadScripts, CORE } = require("../helpers/env");

const FILES = [...CORE, "assets/js/core/utils.js", "assets/js/core/validators.js", "assets/js/core/services.js"];

function fresh() {
  const { Nexus } = loadScripts(FILES);
  return { S: Nexus.services, db: Nexus.storage, Nexus };
}

const kursusBaru = (over = {}) => ({
  kode_mk: "ts-101", nama: "Kursus Pengujian", deskripsi: "Deskripsi kursus pengujian yang cukup panjang untuk lolos validasi.",
  prodi_id: "prd_tif", instruktur_id: "dsn_001", tingkat: "dasar", sks: "3", kuota: "40", passing_grade: "60",
  periode: "2026/2027-Ganjil", status: "draft", ...over,
});

/* ---------- Validasi & integritas ---------- */

test("kursus: data valid tersimpan, kode dinormalisasi, angka dari form diubah ke number", async () => {
  const { S } = fresh();
  const k = await S.kursus.create(kursusBaru());
  assert.equal(k.kode_mk, "TS-101");
  assert.equal(k.sks, 3);
  assert.equal(typeof k.kuota, "number");
});

test("kursus: pesan error per kolom untuk data tidak valid", async () => {
  const { S } = fresh();
  await assert.rejects(
    S.kursus.create(kursusBaru({ kode_mk: "salah", nama: "", sks: "9", periode: "2026" })),
    (e) => {
      assert.equal(e.code, "VALIDATION");
      assert.match(e.errors.kode_mk, /2–4 huruf/);
      assert.match(e.errors.nama, /wajib diisi/);
      assert.match(e.errors.sks, /maksimal 6/);
      assert.match(e.errors.periode, /Ganjil/);
      return true;
    }
  );
});

test("kursus: kode MK unik (tidak peka huruf besar/kecil) & relasi harus ada", async () => {
  const { S } = fresh();
  await assert.rejects(S.kursus.create(kursusBaru({ kode_mk: "cs-301" })), (e) => /sudah digunakan/.test(e.errors.kode_mk));
  await assert.rejects(S.kursus.create(kursusBaru({ instruktur_id: "dsn_999" })), (e) => /tidak ditemukan/.test(e.errors.instruktur_id));
});

test("kursus: update tidak menganggap dirinya sendiri sebagai duplikat", async () => {
  const { S } = fresh();
  const k = await S.kursus.update("krs_101", { nama: "Arsitektur Cloud Computing (Revisi)" });
  assert.equal(k.kode_mk, "CS-301");
  assert.equal(k.nama, "Arsitektur Cloud Computing (Revisi)");
});

test("kursus: kuota tidak boleh di bawah jumlah KRS disetujui", async () => {
  const { S, db } = fresh();
  const n = (await db.query("krs", (x) => x.kursus_id === "krs_101" && x.status === "disetujui")).length;
  assert.ok(n > 0);
  await assert.rejects(S.kursus.update("krs_101", { kuota: n - 1 }), (e) => /tidak boleh kurang/.test(e.errors.kuota));
});

test("kursus: publikasi butuh minimal 1 modul", async () => {
  const { S } = fresh();
  const k = await S.kursus.create(kursusBaru());
  await assert.rejects(S.kursus.update(k.id, { status: "publikasi" }), (e) => /minimal 1 modul/.test(e.errors.status));
  await S.modul.create({ kursus_id: k.id, pertemuan_ke: 1, judul: "Pengantar", tipe_materi: "video" });
  assert.equal((await S.kursus.update(k.id, { status: "publikasi" })).status, "publikasi");
});

/* ---------- Hapus & relasi ---------- */

test("kursus dengan KRS aktif tidak dapat dihapus (pesan jelas)", async () => {
  const { S } = fresh();
  const impact = await S.kursus.impact("krs_101");
  assert.ok(impact.blockers.length > 0);
  await assert.rejects(S.kursus.remove("krs_101"), { code: "HAS_RELATIONS" });
  assert.ok(await S.kursus.get("krs_101"), "kursus tetap ada");
});

test("hapus kursus tanpa relasi aktif ikut menghapus modul, tugas, kelas virtual", async () => {
  const { S, db } = fresh();
  const k = await S.kursus.create(kursusBaru());
  await S.modul.create({ kursus_id: k.id, pertemuan_ke: 1, judul: "Pengantar", tipe_materi: "video" });
  await S.tugasKuis.create({ kursus_id: k.id, judul: "Tugas Pertama", jenis: "tugas", bobot_persen: 20, deadline: "2026-10-10T23:59:00", status: "draft" });
  const impact = await S.kursus.impact(k.id);
  assert.deepEqual(impact.blockers, []);
  assert.ok(impact.cascades.some((c) => /modul/.test(c)));
  await S.kursus.remove(k.id);
  assert.equal((await db.query("modul", (m) => m.kursus_id === k.id)).length, 0);
  assert.equal((await db.query("tugas_kuis", (t) => t.kursus_id === k.id)).length, 0);
});

test("dosen yang masih mengampu kursus tidak dapat dihapus", async () => {
  const { S } = fresh();
  await assert.rejects(S.instruktur.remove("dsn_001"), (e) => e.code === "HAS_RELATIONS" && /mengampu/.test(e.message));
});

test("mahasiswa dengan KRS disetujui tidak dapat dihapus; tanpa relasi bisa", async () => {
  const { S } = fresh();
  await assert.rejects(S.mahasiswa.remove("mhs_0001"), { code: "HAS_RELATIONS" });
  const m = await S.mahasiswa.create({ nim: "2610511999", nama: "Mahasiswa Baru", email: "Baru@Student.Nexus.ac.id", prodi_id: "prd_tif", angkatan: 2026, semester: 1, ipk: 0, status: "aktif" });
  assert.equal(m.email, "baru@student.nexus.ac.id");
  await S.mahasiswa.remove(m.id);
  assert.equal(await S.mahasiswa.get(m.id), null);
});

/* ---------- KRS ---------- */

test("KRS: tidak boleh ganda & hanya untuk kursus berstatus publikasi", async () => {
  const { S, db } = fresh();
  const ada = (await db.query("krs", () => true))[0];
  await assert.rejects(S.krs.create({ mahasiswa_id: ada.mahasiswa_id, kursus_id: ada.kursus_id, periode: ada.periode }), (e) => /sudah mengambil/.test(e.errors.kursus_id));
  await assert.rejects(S.krs.create({ mahasiswa_id: "mhs_0001", kursus_id: "krs_105", periode: "2026/2027-Ganjil" }), (e) => /draft/.test(e.errors.kursus_id));
});

test("KRS: setujui mengecek kuota & status mahasiswa; tolak tercatat", async () => {
  const { S, db } = fresh();
  const k = await S.kursus.create(kursusBaru({ kuota: 1 }));
  await S.modul.create({ kursus_id: k.id, pertemuan_ke: 1, judul: "Pengantar", tipe_materi: "video" });
  await S.kursus.update(k.id, { status: "publikasi" });
  const a = await S.krs.create({ mahasiswa_id: "mhs_0001", kursus_id: k.id, periode: "2026/2027-Ganjil" });
  const b = await S.krs.create({ mahasiswa_id: "mhs_0002", kursus_id: k.id, periode: "2026/2027-Ganjil" });
  assert.equal(a.status, "diajukan");
  assert.equal((await S.krs.approve(a.id)).status, "disetujui");
  await assert.rejects(S.krs.approve(b.id), { code: "KUOTA_PENUH" });
  assert.equal((await S.krs.reject(b.id, "kuota penuh")).status, "ditolak");

  const cuti = await S.krs.create({ mahasiswa_id: "mhs_0005", kursus_id: "krs_101", periode: "2026/2027-Genap" });
  await assert.rejects(S.krs.approve(cuti.id), { code: "MAHASISWA_TIDAK_AKTIF" });

  const logs = await db.query("log_aktivitas", (l) => /Menolak KRS/.test(l.deskripsi));
  assert.ok(logs.some((l) => /kuota penuh/.test(l.deskripsi)));
});

/* ---------- Tugas, kelas virtual, sertifikat ---------- */

test("tugas: total bobot per kursus maksimal 100%", async () => {
  const { S } = fresh();
  const k = await S.kursus.create(kursusBaru());
  const base = { kursus_id: k.id, jenis: "tugas", deadline: "2026-10-10T23:59:00", status: "aktif" };
  await S.tugasKuis.create({ ...base, judul: "Tugas Satu", bobot_persen: 60 });
  await assert.rejects(S.tugasKuis.create({ ...base, judul: "Tugas Dua", bobot_persen: 50 }), (e) => /maksimal 100%/.test(e.errors.bobot_persen) && /Sisa bobot tersedia: 40%/.test(e.errors.bobot_persen));
});

test("tugas: beri nilai 0–100 mengubah status pengumpulan", async () => {
  const { S, db } = fresh();
  const [p] = await db.list("pengumpulan");
  await assert.rejects(S.tugasKuis.grade(p.id, 120), { code: "VALIDATION" });
  const row = await S.tugasKuis.grade(p.id, "87,5");
  assert.equal(row.nilai, 87.5);
  assert.equal(row.status, "dinilai");
});

test("kelas virtual: tautan wajib https & modul harus milik kursus yang sama", async () => {
  const { S } = fresh();
  const base = { kursus_id: "krs_101", judul: "Sesi Tambahan", waktu_mulai: "2026-10-01T09:00:00", durasi_menit: 90, platform: "zoom", status: "terjadwal" };
  await assert.rejects(S.kelasVirtual.create({ ...base, tautan: "http://zoom.us/j/1" }), (e) => /https/.test(e.errors.tautan));
  await assert.rejects(S.kelasVirtual.create({ ...base, tautan: "https://zoom.us/j/1", modul_id: "mod_102_01" }), (e) => /tidak termasuk/.test(e.errors.modul_id));
  assert.ok(await S.kelasVirtual.create({ ...base, tautan: "https://zoom.us/j/1", modul_id: "mod_101_01" }));
});

test("sertifikat: nomor otomatis, syarat kelulusan, terbit/cabut, verifikasi", async () => {
  const { S, db } = fresh();
  await assert.rejects(S.sertifikat.create({ mahasiswa_id: "mhs_0003", kursus_id: "krs_101", jenis: "Sertifikat Kelulusan Kursus", penandatangan: "Dr. Adrian Wicaksono" }), (e) => /belum lulus/.test(e.errors.mahasiswa_id));

  const lulus = (await db.query("krs", (x) => x.status === "disetujui" && x.nilai_akhir >= 60))[0];
  const s = await S.sertifikat.create({ mahasiswa_id: lulus.mahasiswa_id, kursus_id: lulus.kursus_id, jenis: "Sertifikat Kelulusan Kursus", penandatangan: "Dr. Adrian Wicaksono" });
  assert.match(s.nomor_registrasi, /^NXS\/[A-Z]{3}\/\d{4}\/00048$/);
  assert.equal(s.status, "menunggu_tte");
  assert.equal((await S.sertifikat.verify(s.nomor_registrasi.toLowerCase())).valid, false);
  await S.sertifikat.terbitkan(s.id);
  assert.equal((await S.sertifikat.verify(s.nomor_registrasi)).valid, true);
  await S.sertifikat.cabut(s.id);
  assert.match((await S.sertifikat.verify(s.nomor_registrasi)).pesan, /DICABUT/);
  await assert.rejects(S.sertifikat.terbitkan(s.id), { code: "SUDAH_DICABUT" });
  assert.equal((await S.sertifikat.verify("NXS/XXX/0000/00000")).valid, false);
});

/* ---------- Pengaturan & log ---------- */

test("pengaturan: validasi per kunci & tersimpan", async () => {
  const { S } = fresh();
  await assert.rejects(S.pengaturan.save({ kode_pt: "12" }), (e) => /6 digit/.test(e.errors.kode_pt));
  const all = await S.pengaturan.save({ nama_institusi: "Institut Nexus Baru", sesi_timeout_menit: "45" });
  assert.equal(all.nama_institusi, "Institut Nexus Baru");
  assert.equal(all.sesi_timeout_menit, "45");
});

test("setiap perubahan tercatat di log aktivitas (terbaru di atas)", async () => {
  const { S } = fresh();
  const k = await S.kursus.create(kursusBaru());
  await S.kursus.update(k.id, { nama: "Kursus Pengujian Diubah" });
  await S.kursus.remove(k.id);
  const [latest, prev, first] = await S.logAktivitas.recent(3);
  assert.equal(latest.aksi, "delete");
  assert.equal(prev.aksi, "update");
  assert.equal(first.aksi, "create");
  assert.match(first.deskripsi, /TS-101 Kursus Pengujian/);
});

/* ---------- Struktur modul ---------- */

test("modul: simpan struktur sekaligus (tukar urutan, ubah, tambah, hapus)", async () => {
  const { S } = fresh();
  const k = await S.kursus.create(kursusBaru());
  let list = await S.modul.saveForKursus(k.id, [
    { judul: "Pengantar", tipe_materi: "video" },
    { judul: "Lanjutan", tipe_materi: "dokumen" },
  ]);
  const [a, b] = list.sort((x, y) => x.pertemuan_ke - y.pertemuan_ke);
  list = await S.modul.saveForKursus(k.id, [
    { id: b.id, judul: "Lanjutan (revisi)", tipe_materi: "dokumen" },
    { id: a.id, judul: "Pengantar", tipe_materi: "video" },
    { judul: "Kuis Akhir", tipe_materi: "kuis" },
  ]);
  const byOrder = list.sort((x, y) => x.pertemuan_ke - y.pertemuan_ke).map((m) => m.judul);
  assert.deepEqual(byOrder, ["Lanjutan (revisi)", "Pengantar", "Kuis Akhir"]);
  list = await S.modul.saveForKursus(k.id, [{ id: a.id, judul: "Pengantar", tipe_materi: "video" }]);
  assert.equal(list.length, 1);
  assert.equal(list[0].pertemuan_ke, 1);
});

test("modul: error per baris & modul yang dipakai kelas virtual tidak bisa dihapus", async () => {
  const { S } = fresh();
  const v = S.modul.validateStructure([{ judul: "OK judul", tipe_materi: "video" }, { judul: "x", tipe_materi: "audio" }]);
  assert.equal(v.valid, false);
  assert.match(v.errors.modul_1_judul, /^Modul 2: .*minimal 3/);
  assert.ok(v.errors.modul_1_tipe_materi);
  // krs_101 punya kelas virtual yang memakai modul pertemuan 4 → menghapus semua modul ditolak.
  await assert.rejects(S.modul.saveForKursus("krs_101", [{ judul: "Satu-satunya", tipe_materi: "video" }]), (e) => /kelas virtual/.test(e.errors.modul));
});
