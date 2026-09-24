/**
 * Uji E2E di browser sungguhan (Edge/Chrome yang terpasang, via puppeteer-core).
 *
 *   npm run test:e2e              → uji file lokal
 *   npm run test:e2e -- --online  → uji website di GitHub Pages
 *
 * Browser dicari otomatis; bisa diatur manual lewat variabel BROWSER_PATH.
 */
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const puppeteer = require("puppeteer-core");

const ONLINE_URL = "https://fahrizal-tech.github.io/PEMPROGRAMAN-WEB2/";
const ROOT = process.argv.includes("--online") ? ONLINE_URL : pathToFileURL(path.resolve(__dirname, "../..")).href + "/";
const MENU = ["dashboard", "laporan", "data-master", "tugas-kuis", "kelas-virtual", "mahasiswa", "instruktur", "sertifikasi", "pengaturan"];
const DEMO = { email: "admin@nexus.ac.id", password: "nexus2026" };
const NAV = { waitUntil: "domcontentloaded", timeout: 60000 };

function findBrowser() {
  const candidates = [
    process.env.BROWSER_PATH,
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/microsoft-edge",
  ].filter(Boolean);
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error("Browser tidak ditemukan. Atur variabel BROWSER_PATH ke lokasi Chrome/Edge.");
  return found;
}

(async () => {
  console.log(`Target: ${ROOT}\n`);
  const browser = await puppeteer.launch({ executablePath: findBrowser(), headless: true, args: ["--allow-file-access-from-files"] });
  const page = await browser.newPage();
  const errors = [];
  const where = () => page.url().split("/").pop();
  page.on("pageerror", (e) => errors.push(`${where()}: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/fonts\.g|Tracking|favicon/.test(m.text())) errors.push(`${where()}: ${m.text()}`);
  });

  let beforeUnloadDialogs = 0;
  page.on("dialog", (d) => { if (d.type() === "beforeunload") beforeUnloadDialogs++; d.accept(); });

  let pass = 0, fail = 0;
  const check = (ok, msg) => { ok ? pass++ : fail++; console.log(`${ok ? "OK   " : "GAGAL"} ${msg}`); };
  const nav = (fn) => Promise.all([page.waitForNavigation(NAV), fn()]);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  try {
    await page.setViewport({ width: 1280, height: 800 });

    /* ---------- Login & proteksi ---------- */
    await page.goto(ROOT + "pages/mahasiswa.html", NAV);
    await page.waitForSelector("#login-form");
    check(where().startsWith("index.html?next=mahasiswa.html"), `tanpa sesi dialihkan → ${where()}`);

    await page.click('.role-tab[data-role="lecturer"]');
    check(await page.$eval("#identifier", (i) => i.disabled), "tab Dosen menonaktifkan form");
    await page.click('.role-tab[data-role="admin"]');

    await page.click('#login-form button[type="submit"]');
    await page.waitForSelector("#identifier-error");
    check(true, `form kosong → "${await page.$eval("#identifier-error", (e) => e.textContent)}"`);

    await page.type("#identifier", DEMO.email);
    await page.type("#password", "salah123");
    await page.click('#login-form button[type="submit"]');
    await page.waitForFunction(() => /salah/.test(document.getElementById("login-alert").textContent));
    check(where().startsWith("index.html"), "kata sandi salah ditolak dengan pesan");

    await page.type("#password", DEMO.password);
    await nav(() => page.click('#login-form button[type="submit"]'));
    check(where() === "mahasiswa.html", `login berhasil → kembali ke ${where()}`);
    check(/Super Administrator/.test(await page.$eval("header", (h) => h.textContent)), "topbar menampilkan peran dari sesi");

    /* ---------- Navigasi semua menu ---------- */
    for (const m of MENU) {
      if (where() !== `${m}.html`) await nav(() => page.click(`#sidebar a[href="${m}.html"]`));
      const active = await page.$eval('#sidebar a[aria-current="page"]', (a) => a.getAttribute("href"));
      check(where() === `${m}.html` && active === `${m}.html`, `menu ${m}.html aktif`);
    }
    await page.goto(ROOT + "pages/form.html", NAV);
    check((await page.$eval('#sidebar a[aria-current="page"]', (a) => a.getAttribute("href"))) === "data-master.html", "form.html menandai Data Master");

    /* ---------- Komponen UI (etalase di layout.html) ---------- */
    await page.goto(ROOT + "pages/layout.html", NAV);
    await page.waitForFunction(() => document.querySelectorAll("#demo-tbody tr").length === 5);
    check(/1–5 dari 12/.test(await page.$eval("#demo-counter", (e) => e.textContent)), "tabel: 5 baris per halaman dari 12 kursus");
    await page.type("#demo-cari", "cloud");
    await page.waitForFunction(() => document.querySelectorAll("#demo-tbody tr").length === 1);
    check(true, "tabel: pencarian 'cloud' → 1 baris");
    await page.$eval("#demo-cari", (e) => { e.value = ""; e.dispatchEvent(new Event("input")); });
    await page.select("#demo-status", "draft");
    await page.waitForFunction(() => document.querySelectorAll("#demo-tbody tr").length === 2);
    check(true, "tabel: filter status draft → 2 baris");
    await page.select("#demo-status", "");

    // XSS: nama berisi tag HTML harus tampil sebagai teks, bukan dieksekusi.
    await page.evaluate(() => Nexus.storage.insert("kursus", { kode_mk: "XS-001", nama: '<img src=x onerror="window.__xss=1">', status: "draft", kuota: 1 }));
    await page.type("#demo-cari", "XS-001");
    await page.waitForFunction(() => document.querySelectorAll("#demo-tbody tr").length === 1);
    const xss = await page.evaluate(() => ({ img: !!document.querySelector("#demo-tbody img"), ran: !!window.__xss, text: document.querySelector("#demo-tbody").textContent.includes("<img") }));
    check(!xss.img && !xss.ran && xss.text, "anti-XSS: tag HTML di data tampil sebagai teks");
    await page.evaluate(() => Nexus.storage.reset());

    await page.click('[data-demo="toast"]');
    await page.waitForSelector("#toast-region > div");
    check(true, "toast tampil");

    await page.click('[data-demo="modal"]');
    await page.waitForSelector('[role="dialog"]');
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
    const focusBack = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute("data-demo"));
    check(focusBack === "modal", "modal: tutup dengan Esc, fokus kembali ke tombol");

    await page.click('[data-demo="delete"]');
    await page.waitForSelector('[role="dialog"]');
    const blocked = await page.$eval('[role="dialog"]', (d) => d.textContent);
    check(/Tidak dapat dihapus/.test(blocked) && /KRS aktif/.test(blocked), "hapus kursus ber-KRS aktif → ditolak dengan alasan");
    await page.keyboard.press("Escape");

    await page.click('#demo-form button[type="submit"]');
    await page.waitForSelector("#demo-kode-error");
    const nErr = await page.$$eval("#demo-form [aria-invalid=true]", (els) => els.length);
    check(nErr === 3, `form kosong → ${nErr} kolom ditandai error`);
    await page.type("#demo-kode", "ab-123");
    await page.type("#demo-nama", "Pemrograman Web");
    await page.select("#demo-tingkat", "menengah");
    await page.click('#demo-form button[type="submit"]');
    await page.waitForFunction(() => /Valid: AB-123/.test(document.getElementById("toast-region").textContent));
    check((await page.$$eval("#demo-form [aria-invalid=true]", (els) => els.length)) === 0, "form valid → error hilang, kode dinormalisasi (AB-123)");

    /* ---------- Data Master & Form Kursus (CRUD) ---------- */
    const rowsIn = (sel) => page.$$eval(`${sel} tr`, (trs) => trs.filter((t) => !t.querySelector("td[colspan]")).length);
    const toastHas = (re) => page.waitForFunction((src) => new RegExp(src).test((document.getElementById("toast-region") || {}).textContent || ""), {}, re.source);

    await page.goto(ROOT + "pages/data-master.html", NAV);
    await page.waitForFunction(() => /dari 12/.test(document.getElementById("tabel-counter").textContent));
    check((await page.$eval("#kpi-total", (e) => e.textContent)) === "12", "data master: 12 kursus + KPI dari data");
    await page.select("#f-status", "draft");
    await page.waitForFunction(() => /dari 2 data/.test(document.getElementById("tabel-counter").textContent));
    check((await rowsIn("#tabel-kursus")) === 2, "data master: filter status draft → 2");
    await page.click("#btn-reset");

    await nav(() => page.click('a[href="form.html"]'));
    await page.waitForFunction(() => document.getElementById("instruktur_id").options.length > 1);
    await page.click("#btn-simpan");
    await page.waitForSelector("#kode_mk-error");
    check(true, `form tambah: kolom kosong ditandai (${await page.$eval("#kode_mk-error", (e) => e.textContent)})`);

    await page.type("#kode_mk", "cs-301");
    await page.select("#prodi_id", "prd_tif");
    await page.select("#tingkat", "menengah");
    await page.type("#nama", "Kursus Uji Otomatis");
    await page.type("#deskripsi", "Kursus ini dibuat oleh uji otomatis E2E untuk memastikan alur tambah data berjalan.");
    await page.select("#instruktur_id", "dsn_002");
    await page.type("#modul-judul-0", "Pengantar");
    await page.click("#btn-tambah-modul");
    await page.type("#modul-judul-1", "Pendalaman Materi");
    await page.click('input[name="status"][value="publikasi"]');
    await page.click("#btn-simpan");
    await page.waitForSelector("#kode_mk-error");
    check(/sudah digunakan/.test(await page.$eval("#kode_mk-error", (e) => e.textContent)), "form: kode MK ganda (CS-301) ditolak");

    await page.$eval("#kode_mk", (e) => { e.value = ""; });
    await page.type("#kode_mk", "ts-201");
    await nav(() => page.click("#btn-simpan"));
    await toastHas(/TS-201 berhasil ditambahkan/);
    await page.waitForFunction(() => /dari 13/.test(document.getElementById("tabel-counter").textContent));
    check(where() === "data-master.html", "tambah kursus → kembali ke data master + toast, total 13");

    await page.type("#f-cari", "TS-201");
    await page.waitForFunction(() => /2 modul/.test(document.getElementById("tabel-kursus").textContent));
    await nav(() => page.click('a[href^="form.html?id="]'));
    await page.waitForFunction(() => document.getElementById("nama").value === "Kursus Uji Otomatis");
    check(/Edit Kursus TS-201/.test(await page.$eval("#judul-form", (e) => e.textContent)), "edit: data & 2 modul dimuat");
    await page.click('[data-index="1"] [data-modul-action="up"]');
    await page.$eval("#nama", (e) => { e.value = ""; });
    await page.type("#nama", "Kursus Uji Otomatis (Revisi)");
    await nav(() => page.click("#btn-simpan"));
    await toastHas(/TS-201 berhasil diperbarui/);
    const order = await page.evaluate(async () => {
      const k = (await Nexus.services.kursus.query((x) => x.kode_mk === "TS-201"))[0];
      return (await Nexus.services.modul.query((m) => m.kursus_id === k.id)).sort((a, b) => a.pertemuan_ke - b.pertemuan_ke).map((m) => m.judul).join(" > ") + " | " + k.nama;
    });
    check(order === "Pendalaman Materi > Pengantar | Kursus Uji Otomatis (Revisi)", `edit tersimpan: ${order}`);

    await page.type("#f-cari", "TS-201");
    await page.waitForFunction(() => document.querySelectorAll("#tabel-kursus [data-hapus]").length === 1);
    await page.click("#tabel-kursus [data-hapus]");
    await page.waitForSelector('[role="dialog"]');
    const dlg = await page.$eval('[role="dialog"]', (d) => d.textContent);
    check(/2 modul/.test(dlg), "hapus: konfirmasi menyebutkan 2 modul ikut terhapus");
    await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button')].find((b) => /Ya, hapus/.test(b.textContent)).click());
    await toastHas(/berhasil dihapus/);
    await page.click("#btn-reset");
    await page.waitForFunction(() => /dari 12/.test(document.getElementById("tabel-counter").textContent));
    check(true, "hapus kursus → toast, total kembali 12");

    await page.goto(ROOT + "pages/form.html", NAV);
    await page.waitForFunction(() => document.getElementById("modul-list").children.length === 1);
    await page.click('[data-modul-action="remove"]');
    await page.click('input[name="status"][value="publikasi"]');
    for (const [sel, v] of [["#kode_mk", "ts-202"], ["#nama", "Tanpa Modul"], ["#deskripsi", "Deskripsi cukup panjang untuk lolos validasi kolom deskripsi."]]) await page.type(sel, v);
    await page.select("#prodi_id", "prd_tif"); await page.select("#tingkat", "dasar"); await page.select("#instruktur_id", "dsn_002");
    await page.click("#btn-simpan");
    await page.waitForSelector("#form-kursus-status-error");
    check(/minimal 1 modul/.test(await page.$eval("#form-kursus-status-error", (e) => e.textContent)), "publikasi tanpa modul ditolak (pesan di grup status)");
    await page.goto(ROOT + "pages/form.html?id=tidak_ada", NAV);
    check(beforeUnloadDialogs >= 1, "meninggalkan form yang belum disimpan → muncul peringatan");
    await page.waitForFunction(() => !document.getElementById("not-found").classList.contains("hidden"));
    check(true, "form dengan ID tidak ada → pesan 'Kursus tidak ditemukan'");

    /* ---------- Mobile: drawer ---------- */
    await page.setViewport({ width: 390, height: 844 });
    await sleep(400);
    const hidden = await page.$eval("#sidebar", (s) => s.getBoundingClientRect().right <= 0);
    await page.click("#sidebar-toggle");
    await sleep(350);
    const opened = await page.$eval("#sidebar", (s) => s.getBoundingClientRect().left >= 0);
    await page.keyboard.press("Escape");
    await sleep(350);
    const closed = await page.$eval("#sidebar-toggle", (b) => b.getAttribute("aria-expanded") === "false");
    check(hidden && opened && closed, "drawer mobile: tersembunyi → buka → tutup (Esc)");

    /* ---------- Mobile: tanpa scroll horizontal, font diblokir (jaringan lambat) ---------- */
    const mobile = await browser.newPage();
    await mobile.setViewport({ width: 390, height: 844 });
    await mobile.setRequestInterception(true);
    mobile.on("request", (r) => (/fonts\.(googleapis|gstatic)/.test(r.url()) ? r.abort() : r.continue()));
    const wide = [];
    for (const m of ["index", ...MENU.map((x) => `pages/${x}`), "pages/form", "pages/layout"]) {
      await mobile.goto(`${ROOT}${m}.html`, NAV);
      await sleep(300);
      const w = await mobile.evaluate(() => document.documentElement.scrollWidth);
      if (w > 390) wide.push(`${m} (${w}px)`);
    }
    check(wide.length === 0, `12 halaman pas di 390px tanpa font: ${wide.join(", ") || "semua pas"}`);
    await mobile.close();

    /* ---------- Keluar ---------- */
    await page.setViewport({ width: 1280, height: 800 });
    // Tunggu animasi sidebar selesai kembali ke posisi desktop sebelum mengklik.
    await page.waitForFunction(() => document.getElementById("sidebar").getBoundingClientRect().left === 0);
    await sleep(300);
    await nav(() => page.click('[data-action="logout"]'));
    check(where() === "index.html", "keluar → halaman login");
    await page.goto(ROOT + "pages/laporan.html", NAV);
    await page.waitForSelector("#login-form");
    check(where().startsWith("index.html?next=laporan.html"), "setelah keluar, halaman admin terkunci lagi");

    check(errors.length === 0, `error JavaScript: ${errors.length ? errors.join(" | ") : "tidak ada"}`);
  } catch (e) {
    fail++;
    console.log(`GAGAL error tak terduga: ${e.message}`);
  } finally {
    await browser.close();
  }

  console.log(`\nHasil E2E: ${pass} lulus, ${fail} gagal`);
  process.exit(fail ? 1 : 0);
})();
