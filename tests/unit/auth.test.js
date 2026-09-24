const test = require("node:test");
const assert = require("node:assert/strict");
const { FakeStorage, loadScripts, CORE } = require("../helpers/env");

const FILES = [...CORE, "assets/js/core/auth.js"];
const KEY = "nexus-lms:session";

function fresh(opts) {
  const env = loadScripts(FILES, opts);
  return { ...env, auth: env.Nexus.auth, db: env.Nexus.storage };
}

test("login berhasil: sesi aktif, login_terakhir diperbarui, tercatat di log", async () => {
  const { auth, db } = fresh();
  const user = await auth.login(" ADMIN@nexus.ac.id ", auth.DEMO_PASSWORD);
  assert.equal(user.email, "admin@nexus.ac.id");
  assert.equal(auth.currentUser().id, "adm_001");
  assert.ok(auth.isLoggedIn());
  const admin = await db.get("admin", "adm_001");
  assert.ok(Date.now() - Date.parse(admin.login_terakhir) < 5000);
  const logs = await db.query("log_aktivitas", (l) => l.aksi === "login" && l.admin_id === "adm_001");
  assert.ok(logs.some((l) => Date.now() - Date.parse(l.waktu) < 5000));
});

test("input kosong/format salah → pesan per kolom", async () => {
  const { auth } = fresh();
  await assert.rejects(auth.login("", ""), (e) => e.code === "INVALID_INPUT" && !!e.errors.identifier && !!e.errors.password);
  await assert.rejects(auth.login("bukan-email", "x"), (e) => /Format email/.test(e.errors.identifier));
});

test("kredensial salah → pesan umum (tidak membocorkan email mana yang terdaftar)", async () => {
  const { auth } = fresh();
  const msgs = [];
  for (const email of ["admin@nexus.ac.id", "tidakada@nexus.ac.id"]) {
    await assert.rejects(auth.login(email, "salah"), (e) => { msgs.push(e.message.replace(/\d+/, "N")); return e.code === "INVALID_CREDENTIALS"; });
  }
  assert.equal(msgs[0], msgs[1]);
});

test("5 kali gagal → terkunci 30 detik, kata sandi benar pun ditolak", async () => {
  const { auth } = fresh();
  for (let i = 1; i <= 4; i++) {
    await assert.rejects(auth.login("admin@nexus.ac.id", "salah"), (e) => e.attemptsLeft === 5 - i);
  }
  await assert.rejects(auth.login("admin@nexus.ac.id", "salah"), { code: "LOCKED" });
  assert.ok(auth.lockRemaining() > 25);
  await assert.rejects(auth.login("admin@nexus.ac.id", auth.DEMO_PASSWORD), { code: "LOCKED" });
});

test("ingat sesi → localStorage dengan masa berlaku; tanpa centang → sessionStorage", async () => {
  let env = fresh();
  await env.auth.login("admin@nexus.ac.id", env.auth.DEMO_PASSWORD, { remember: true });
  const saved = JSON.parse(env.storage.getItem(KEY));
  assert.ok(saved.expires_at - Date.now() > 29 * 24 * 3600 * 1000);
  assert.equal(env.session.getItem(KEY), null);

  env = fresh();
  await env.auth.login("baak@nexus.ac.id", env.auth.DEMO_PASSWORD);
  assert.ok(env.session.getItem(KEY));
  assert.equal(env.storage.getItem(KEY), null);
  assert.equal(env.auth.currentUser().peran, "admin_akademik");
});

test("sesi berakhir bila idle melewati batas pengaturan atau masa berlaku habis", async () => {
  const { auth, session, storage } = fresh();
  await auth.login("admin@nexus.ac.id", auth.DEMO_PASSWORD);
  const s = JSON.parse(session.getItem(KEY));
  assert.equal(s.idle_min, 30, "diambil dari pengaturan sesi_timeout_menit");
  session.setItem(KEY, JSON.stringify({ ...s, last_active: Date.now() - 31 * 60 * 1000 }));
  assert.equal(auth.currentUser(), null);
  assert.equal(session.getItem(KEY), null, "sesi kedaluwarsa dibersihkan");

  await auth.login("admin@nexus.ac.id", auth.DEMO_PASSWORD, { remember: true });
  const r = JSON.parse(storage.getItem(KEY));
  storage.setItem(KEY, JSON.stringify({ ...r, expires_at: Date.now() - 1 }));
  assert.equal(auth.isLoggedIn(), false);
});

test("logout menghapus sesi", async () => {
  const { auth } = fresh();
  await auth.login("admin@nexus.ac.id", auth.DEMO_PASSWORD);
  auth.logout();
  assert.equal(auth.currentUser(), null);
});

test("tujuan setelah login hanya halaman internal (anti open-redirect)", () => {
  const { auth } = fresh();
  assert.equal(auth.safeNext("mahasiswa.html"), "mahasiswa.html");
  for (const bad of ["https://evil.example", "//evil.example", "../index.html", "javascript:alert(1)", null, ""]) {
    assert.equal(auth.safeNext(bad), "dashboard.html", String(bad));
  }
});

test("sesi rusak diabaikan tanpa error", () => {
  const session = new FakeStorage();
  session.setItem(KEY, "{rusak");
  const { auth } = fresh({ session });
  assert.equal(auth.currentUser(), null);
});
