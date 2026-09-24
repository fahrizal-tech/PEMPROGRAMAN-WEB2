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
