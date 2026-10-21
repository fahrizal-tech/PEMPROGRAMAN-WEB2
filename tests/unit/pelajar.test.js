// Portal pelajar: login mahasiswa, pemisahan area per peran, dan aturan data milik sendiri.
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadScripts, CORE } = require("../helpers/env");

const FILES = [...CORE, "assets/js/core/utils.js", "assets/js/core/validators.js", "assets/js/core/auth.js", "assets/js/core/services.js"];
const BIMA = "2410511050"; // aktif, 4 kursus disetujui (data contoh)
const ARYA = "2110511124"; // lulus, punya sertifikat

function fresh() {
  const env = loadScripts(FILES);
  return { auth: env.Nexus.auth, db: env.Nexus.storage, S: env.Nexus.services };
}

async function masukSebagai(auth, nim) {
  return auth.login(nim, auth.DEMO_PASSWORD, { role: "mahasiswa" });
}

test("login mahasiswa dengan NIM atau email → peran mahasiswa, tercatat di log", async () => {
  const { auth, db } = fresh();
  const user = await masukSebagai(auth, BIMA);
  assert.equal(user.peran, "mahasiswa");
  assert.equal(user.nim, BIMA);
  assert.equal(auth.homePath(user), "pelajar/beranda.html");
  const logs = await db.query("log_aktivitas", (l) => l.aksi === "login" && l.mahasiswa_id === user.mahasiswa_id);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].admin_id, null);

  auth.logout();
  const viaEmail = await auth.login(user.email.toUpperCase(), auth.DEMO_PASSWORD, { role: "mahasiswa" });
  assert.equal(viaEmail.mahasiswa_id, user.mahasiswa_id);
});

test("login mahasiswa: validasi input, akun salah, dan status nonaktif ditolak", async () => {
  const { auth, db } = fresh();
  await assert.rejects(auth.login("12ab", "x", { role: "mahasiswa" }), (e) => e.code === "INVALID_INPUT" && /NIM/.test(e.errors.identifier));
  await assert.rejects(auth.login("9999999999", auth.DEMO_PASSWORD, { role: "mahasiswa" }), (e) => e.code === "INVALID_CREDENTIALS");
  // Email admin tidak bisa dipakai di tab mahasiswa, dan sebaliknya.
  await assert.rejects(auth.login("admin@nexus.ac.id", auth.DEMO_PASSWORD, { role: "mahasiswa" }), (e) => e.code === "INVALID_CREDENTIALS");
  await assert.rejects(auth.login(BIMA, auth.DEMO_PASSWORD), (e) => e.code === "INVALID_INPUT");
  const nonaktif = (await db.query("mahasiswa", (m) => m.status === "nonaktif"))[0];
  await assert.rejects(auth.login(nonaktif.nim, auth.DEMO_PASSWORD, { role: "mahasiswa" }), (e) => e.code === "ACCOUNT_INACTIVE");
  assert.equal(auth.isLoggedIn(), false);
});

test("tujuan setelah login dibatasi per area (anti open-redirect & anti salah area)", async () => {
  const { auth } = fresh();
  const mhs = { peran: "mahasiswa" }, admin = { peran: "super_admin" };
  assert.equal(auth.homePath(mhs, "tugas.html"), "pelajar/tugas.html");
  assert.equal(auth.homePath(mhs, "pengaturan.html"), "pelajar/beranda.html");
  assert.equal(auth.homePath(admin, "tugas.html"), "pages/dashboard.html");
  assert.equal(auth.homePath(admin, "mahasiswa.html"), "pages/mahasiswa.html");
  for (const bad of ["https://evil.example", "../index.html", null]) assert.equal(auth.homePath(mhs, bad), "pelajar/beranda.html");
});

test("service pelajar menolak pengguna yang bukan mahasiswa", async () => {
  const { auth, S } = fresh();
  await assert.rejects(S.pelajar.kursusSaya(), (e) => e.code === "BUKAN_MAHASISWA");
  await auth.login("admin@nexus.ac.id", auth.DEMO_PASSWORD);
  await assert.rejects(S.pelajar.tugas(), (e) => e.code === "BUKAN_MAHASISWA");
});

test("data portal hanya milik mahasiswa yang masuk", async () => {
  const { auth, S } = fresh();
  const user = await masukSebagai(auth, BIMA);
  const kursus = await S.pelajar.kursusSaya();
  assert.ok(kursus.length > 0 && kursus.every((x) => x.krs.mahasiswa_id === user.mahasiswa_id));
  const tugas = await S.pelajar.tugas();
  assert.ok(tugas.every((x) => !x.pengumpulan || x.pengumpulan.mahasiswa_id === user.mahasiswa_id));
  assert.ok(tugas.every((x) => x.tugas.status !== "draft"));
  const jadwal = await S.pelajar.jadwal();
  const ids = kursus.filter((x) => x.krs.status === "disetujui").map((x) => x.kursus.id);
  assert.ok(jadwal.every((x) => ids.includes(x.sesi.kursus_id)));
});

test("ajukan & batalkan KRS: aturan duplikat, kuota, status, dan kepemilikan", async () => {
  const { auth, db, S } = fresh();
  const user = await masukSebagai(auth, BIMA);
  const katalog = await S.pelajar.katalog();
  const target = katalog.find((x) => !x.krs && x.terisi < x.kursus.kuota);
  const row = await S.pelajar.ajukanKrs(target.kursus.id);
  assert.equal(row.status, "diajukan");
  assert.equal(row.mahasiswa_id, user.mahasiswa_id);
  await assert.rejects(S.pelajar.ajukanKrs(target.kursus.id), (e) => e.name === "ValidationError");

  // Kuota penuh ditolak.
  const lain = (await S.pelajar.katalog()).find((x) => !x.krs);
  await db.update("kursus", lain.kursus.id, { kuota: lain.terisi });
  await assert.rejects(S.pelajar.ajukanKrs(lain.kursus.id), (e) => e.code === "KUOTA_PENUH");

  // KRS mahasiswa lain tidak bisa dibatalkan; KRS yang sudah disetujui juga tidak.
  const milikLain = (await db.query("krs", (x) => x.mahasiswa_id !== user.mahasiswa_id && x.status === "diajukan"))[0];
  await assert.rejects(S.pelajar.batalKrs(milikLain.id), (e) => e.code === "NOT_FOUND");
  const disetujui = (await db.query("krs", (x) => x.mahasiswa_id === user.mahasiswa_id && x.status === "disetujui"))[0];
  await assert.rejects(S.pelajar.batalKrs(disetujui.id), (e) => e.code === "SUDAH_DIPROSES");
  assert.equal(await S.pelajar.batalKrs(row.id), true);
  assert.equal(await db.get("krs", row.id), null);

  // Mahasiswa lulus tidak dapat mengajukan KRS.
  auth.logout();
  await masukSebagai(auth, ARYA);
  await assert.rejects(S.pelajar.ajukanKrs(target.kursus.id), (e) => e.code === "MAHASISWA_TIDAK_AKTIF");
});

test("masuk kelas live mencatat presensi hadir; sesi belum live ditolak", async () => {
  const { auth, db, S } = fresh();
  const user = await masukSebagai(auth, BIMA);
  const jadwal = await S.pelajar.jadwal();
  const sesi = jadwal[0].sesi;
  await db.update("kelas_virtual", sesi.id, { status: "terjadwal" });
  await assert.rejects(S.pelajar.masukKelas(sesi.id), (e) => e.code === "BELUM_LIVE");
  await db.update("kelas_virtual", sesi.id, { status: "live" });
  assert.equal(await S.pelajar.masukKelas(sesi.id), sesi.tautan);
  const pres = await db.query("presensi", (p) => p.kelas_virtual_id === sesi.id && p.mahasiswa_id === user.mahasiswa_id);
  assert.equal(pres.length, 1);
  assert.equal(pres[0].status, "hadir");
  await S.pelajar.masukKelas(sesi.id); // masuk ulang tidak menggandakan presensi
  assert.equal((await db.query("presensi", (p) => p.kelas_virtual_id === sesi.id && p.mahasiswa_id === user.mahasiswa_id)).length, 1);
  // Sesi kursus yang tidak diambil tidak dapat dibuka.
  const ids = jadwal.map((x) => x.sesi.kursus_id);
  const asing = (await db.query("kelas_virtual", (v) => !ids.includes(v.kursus_id)))[0];
  if (asing) await assert.rejects(S.pelajar.masukKelas(asing.id), (e) => e.code === "NOT_FOUND");
});

test("kumpulkan tugas: validasi tautan, tenggat, status, dan jawaban yang sudah dinilai", async () => {
  const { auth, db, S } = fresh();
  await masukSebagai(auth, BIMA);
  const list = await S.pelajar.tugas();
  const aktif = list.find((x) => x.tugas.status === "aktif" && (!x.pengumpulan || x.pengumpulan.status !== "dinilai"));
  await db.update("tugas_kuis", aktif.tugas.id, { deadline: new Date(Date.now() + 86400000).toISOString() });
  await assert.rejects(S.pelajar.kumpulkan(aktif.tugas.id, { tautan: "bukan-url" }), (e) => e.name === "ValidationError" && !!e.errors.tautan);
  const row = await S.pelajar.kumpulkan(aktif.tugas.id, { tautan: "https://drive.example/jawaban.pdf", catatan: "Versi akhir" });
  assert.equal(row.status, "menunggu");
  assert.equal(row.tautan, "https://drive.example/jawaban.pdf");

  await db.update("tugas_kuis", aktif.tugas.id, { deadline: new Date(Date.now() - 60000).toISOString() });
  await assert.rejects(S.pelajar.kumpulkan(aktif.tugas.id, { tautan: "https://drive.example/a.pdf" }), (e) => e.code === "LEWAT_TENGGAT");

  const dinilai = list.find((x) => x.pengumpulan && x.pengumpulan.status === "dinilai");
  if (dinilai) {
    await db.update("tugas_kuis", dinilai.tugas.id, { status: "aktif", deadline: new Date(Date.now() + 86400000).toISOString() });
    await assert.rejects(S.pelajar.kumpulkan(dinilai.tugas.id, { tautan: "https://drive.example/b.pdf" }), (e) => e.code === "SUDAH_DINILAI");
  }
});

test("sertifikat hanya milik sendiri", async () => {
  const { auth, S } = fresh();
  const user = await masukSebagai(auth, ARYA);
  const list = await S.pelajar.sertifikat();
  assert.ok(list.length > 0 && list.every((x) => x.sertifikat.mahasiswa_id === user.mahasiswa_id));
});
