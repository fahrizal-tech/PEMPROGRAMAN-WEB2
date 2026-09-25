/**
 * Audit aksesibilitas otomatis dengan axe-core (WCAG 2.1 A/AA + best practice)
 * untuk semua halaman dan beberapa kondisi interaktif (modal, drawer HP, error form).
 *
 *   npm run test:a11y
 */
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const puppeteer = require("puppeteer-core");

const ROOT = path.resolve(__dirname, "../..");
const AXE = require.resolve("axe-core/axe.min.js");
const base = pathToFileURL(ROOT).href + "/";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function findBrowser() {
  return [process.env.BROWSER_PATH, "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].filter(Boolean).find(fs.existsSync);
}

// [label, halaman, aksi opsional sebelum audit, lebar viewport]
const CASES = [
  ["login", "index.html"],
  ["login: error kosong", "index.html", async (p) => { await p.click('#login-form button[type="submit"]'); await wait(300); }],
  ...["dashboard", "laporan", "data-master", "form", "tugas-kuis", "kelas-virtual", "mahasiswa", "instruktur", "sertifikasi", "pengaturan", "layout"]
    .map((n) => [n, `pages/${n}.html`]),
  ["data-master: mode tabel", "pages/data-master.html", async (p) => { await p.click('[data-view="tabel"]'); await wait(300); }],
  ["form: error validasi", "pages/form.html", async (p) => { await p.click('#form-kursus button[type="submit"]'); await wait(300); }],
  ...["mahasiswa", "instruktur", "kelas-virtual", "tugas-kuis", "sertifikasi"].map((n) =>
    [`${n}: modal tambah`, `pages/${n}.html`, async (p) => { await p.click("#btn-tambah"); await p.waitForSelector('[role="dialog"]'); await wait(300); }]),
  ["mahasiswa: modal + error", "pages/mahasiswa.html", async (p) => {
    await p.click("#btn-tambah"); await p.waitForSelector('[role="dialog"] form');
    await p.$eval('[role="dialog"] form', (f) => f.requestSubmit()); await wait(300);
  }],
  ["dashboard: drawer HP", "pages/dashboard.html", async (p) => { await p.click("#sidebar-toggle"); await wait(400); }, 390],
];

(async () => {
  const browser = await puppeteer.launch({ executablePath: findBrowser(), headless: true, args: ["--allow-file-access-from-files"] });
  const page = await browser.newPage();
  await page.setBypassCSP(true); // axe disuntikkan sebagai skrip; CSP situs sendiri tetap diuji di E2E.
  let total = 0;

  async function login() {
    await page.goto(base + "index.html");
    await page.type("#identifier", "admin@nexus.ac.id");
    await page.type("#password", "nexus2026");
    await Promise.all([page.waitForNavigation(), page.click('#login-form button[type="submit"]')]);
  }

  for (const [label, url, action, width] of CASES) {
    await page.setViewport({ width: width || 1280, height: 900 });
    if (url === "index.html") await page.evaluate(() => { try { sessionStorage.clear(); localStorage.removeItem("nexus-lms:session"); } catch (e) {} }).catch(() => {});
    else if (!page.url().includes("/pages/")) await login();
    await page.goto(base + url, { waitUntil: "load" });
    await wait(1200);
    if (action) await action(page);
    await page.addScriptTag({ path: AXE });
    const res = await page.evaluate(async () => {
      const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] } });
      return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => n.target.join(" ")).slice(0, 4), count: v.nodes.length }));
    });
    const n = res.reduce((a, v) => a + v.count, 0);
    total += n;
    console.log(`${n ? "GAGAL" : "OK   "} ${label}${n ? ` — ${n} elemen` : ""}`);
    for (const v of res) {
      console.log(`      [${v.impact}] ${v.id}: ${v.help} (${v.count})`);
      v.nodes.forEach((t) => console.log(`          ${t}`));
    }
  }
  /* ---------- Navigasi keyboard ---------- */
  console.log("\n== Keyboard");
  const focused = () => page.evaluate(() => {
    const a = document.activeElement;
    return a ? { body: a === document.body, id: a.id, text: (a.getAttribute("aria-label") || a.textContent || "").trim().slice(0, 30), inMain: !!a.closest("main"),
      inDialog: !!a.closest('[role="dialog"]'), inSidebar: !!a.closest("#sidebar") } : {};
  });
  const check = (ok, label, info) => { console.log(`${ok ? "OK   " : "GAGAL"} ${label}${ok || !info ? "" : " — " + info}`); if (!ok) total++; };
  const fresh = async (url, width) => { await page.setViewport({ width: width || 1280, height: 900 }); await page.goto(base + url, { waitUntil: "load" }); await wait(1000); };

  // 1. Skip link: Tab pertama = "Lewati ke konten utama", Enter → Tab berikutnya ada di <main>.
  await fresh("pages/mahasiswa.html");
  await page.keyboard.press("Tab");
  const skip = await focused();
  check(/Lewati ke konten/.test(skip.text), "Tab pertama memfokuskan skip link", skip.text);
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  const afterSkip = await focused();
  check(afterSkip.inMain, "Skip link melompati menu ke konten utama", JSON.stringify(afterSkip));

  // 2. Indikator fokus terlihat pada 40 tab stop pertama.
  await fresh("pages/mahasiswa.html");
  const noRing = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const r = await page.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return null;
      const s = getComputedStyle(a);
      const visible = (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== "none");
      return visible ? null : a.outerHTML.slice(0, 90);
    });
    if (r) noRing.push(r);
  }
  check(!noRing.length, "Setiap elemen yang difokus punya indikator fokus terlihat", noRing.slice(0, 3).join(" | "));

  // 3. Modal: dibuka dengan Enter, fokus terkunci saat Tab/Shift+Tab, Escape menutup & fokus kembali.
  await fresh("pages/mahasiswa.html");
  await page.focus("#btn-tambah");
  await page.keyboard.press("Enter");
  await page.waitForSelector('[role="dialog"]');
  await wait(300);
  let escaped = false;
  for (let i = 0; i < 25; i++) { await page.keyboard.press("Tab"); if (!(await focused()).inDialog) escaped = true; }
  await page.keyboard.down("Shift");
  for (let i = 0; i < 25; i++) { await page.keyboard.press("Tab"); if (!(await focused()).inDialog) escaped = true; }
  await page.keyboard.up("Shift");
  check(!escaped, "Fokus terkunci di dalam modal (Tab & Shift+Tab)");
  await page.keyboard.press("Escape");
  await wait(300);
  const back = await focused();
  check(back.id === "btn-tambah" && !(await page.$('[role="dialog"]')), "Escape menutup modal & fokus kembali ke tombol pemicu", JSON.stringify(back));

  // 4. Drawer HP: dibuka lewat keyboard, fokus pindah ke menu, Escape menutup & fokus kembali.
  await fresh("pages/dashboard.html", 390);
  await page.focus("#sidebar-toggle");
  await page.keyboard.press("Enter");
  await wait(400);
  const inDrawer = await focused();
  check(inDrawer.inSidebar, "Drawer HP: fokus pindah ke menu", JSON.stringify(inDrawer));
  let leaked = false;
  // Tab setelah item terakhir boleh keluar ke UI browser (document.body) — perilaku normal.
  for (let i = 0; i < 25; i++) { await page.keyboard.press("Tab"); const f = await focused(); if (!f.inSidebar && !f.body) leaked = JSON.stringify(f); }
  check(!leaked, "Drawer HP: Tab tidak keluar ke konten di belakang overlay", leaked);
  await page.keyboard.press("Escape");
  await wait(400);
  const drawerBack = await focused();
  const closed = await page.$eval("#sidebar-toggle", (b) => b.getAttribute("aria-expanded") === "false");
  check(closed && drawerBack.id === "sidebar-toggle", "Drawer HP: Escape menutup & fokus kembali ke tombol menu", JSON.stringify(drawerBack));

  await browser.close();
  console.log(`\nTotal pelanggaran aksesibilitas: ${total}`);
  process.exit(total ? 1 : 0);
})();
