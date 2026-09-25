/**
 * Audit Lighthouse (Performance, Accessibility, Best Practices, SEO) untuk semua halaman.
 * Situs disajikan lewat server HTTP lokal kecil, login dulu ("ingat saya" agar sesi
 * terbawa ke tab audit), lalu tiap halaman diaudit.
 *
 *   npm run test:lighthouse               → profil HP (default Lighthouse, dengan throttling)
 *   npm run test:lighthouse -- --desktop  → profil desktop
 *   npm run test:lighthouse -- --detail   → tampilkan audit yang belum lulus
 */
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const puppeteer = require("puppeteer-core");

const ROOT = path.resolve(__dirname, "../..");
const PORT = 4173;
const DEBUG_PORT = 9333;
const MIN = 90;
const DESKTOP = process.argv.includes("--desktop");
const DETAIL = process.argv.includes("--detail");
const PAGES = ["index.html", ...fs.readdirSync(path.join(ROOT, "pages")).filter((f) => f.endsWith(".html") && f !== "layout.html").map((f) => "pages/" + f)];
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".ico": "image/x-icon", ".json": "application/json" };

function serve() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const file = path.join(ROOT, url === "/" ? "index.html" : url);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "max-age=3600" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(PORT, () => r(server)));
}

function findBrowser() {
  return [process.env.BROWSER_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].filter(Boolean).find(fs.existsSync);
}

(async () => {
  const { default: lighthouse } = await import("lighthouse");
  const desktopConfig = DESKTOP ? (await import("lighthouse/core/config/desktop-config.js")).default : undefined;
  const server = await serve();
  const base = `http://localhost:${PORT}/`;
  const browser = await puppeteer.launch({ executablePath: findBrowser(), headless: true, args: [`--remote-debugging-port=${DEBUG_PORT}`] });

  const page = await browser.newPage();
  // Login dengan "ingat saya" → sesi di localStorage, terbaca di tab audit.
  async function login() {
    await page.goto(base + "index.html");
    await page.type("#identifier", "admin@nexus.ac.id");
    await page.type("#password", "nexus2026");
    await page.click("#remember_me");
    await Promise.all([page.waitForNavigation(), page.click('#login-form button[type="submit"]')]);
  }

  const CATS = ["performance", "accessibility", "best-practices", "seo"];
  const LABEL = { performance: "Perf", accessibility: "A11y", "best-practices": "BP", seo: "SEO" };
  let gagal = 0;
  let loggedIn = false;
  console.log(`Profil: ${DESKTOP ? "desktop" : "HP (throttling)"} · ambang ${MIN}\n`);
  console.log("Halaman".padEnd(26) + CATS.map((c) => LABEL[c].padStart(6)).join(""));

  for (const p of PAGES) {
    // index.html (halaman login) diaudit lebih dulu tanpa sesi; halaman lain setelah login.
    if (p !== "index.html" && !loggedIn) { await login(); loggedIn = true; }
    const { lhr } = await lighthouse(base + p, { port: DEBUG_PORT, output: "json", logLevel: "error", onlyCategories: CATS, disableStorageReset: true }, desktopConfig);
    if (lhr.finalDisplayedUrl.includes("index.html") && p !== "index.html") {
      console.log(`${p.padEnd(26)}  DIALIHKAN KE LOGIN (sesi tidak terbawa)`);
      gagal++;
      continue;
    }
    const scores = CATS.map((c) => Math.round(lhr.categories[c].score * 100));
    const low = scores.some((s) => s < MIN);
    if (low) gagal++;
    console.log(p.padEnd(26) + scores.map((s) => String(s).padStart(6)).join("") + (low ? "   ← di bawah " + MIN : ""));
    if (DETAIL) {
      (lhr.audits["layout-shifts"]?.details?.items || []).slice(0, 4).forEach((i) => console.log(`      [CLS] ${i.score?.toFixed(3)} ${(i.node?.snippet || "").slice(0, 140)}`));
      for (const c of CATS) {
        for (const ref of lhr.categories[c].auditRefs) {
          const a = lhr.audits[ref.id];
          if (ref.weight > 0 && a.score !== null && a.score < 0.9) {
            console.log(`      [${LABEL[c]}] ${a.id}: ${a.title}${a.displayValue ? " — " + a.displayValue : ""}`);
            if (a.id === "color-contrast") (a.details?.items || []).slice(0, 5).forEach((i) => console.log("          " + i.node.snippet.slice(0, 140)));
          }
        }
      }
    }
  }
  await browser.close();
  server.close();
  console.log(`\n${gagal ? gagal + " halaman di bawah ambang" : "Semua halaman ≥ " + MIN}`);
  process.exit(gagal ? 1 : 0);
})();
