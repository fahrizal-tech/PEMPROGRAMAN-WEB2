/**
 * Validasi HTML (html-validate):
 *  1. file HTML mentah (index.html + pages/*.html)
 *  2. DOM hasil render di browser setelah login (isi dinamis: tabel, kartu, grafik)
 *
 *   npm run test:html            → ringkasan + detail kesalahan
 *   npm run test:html -- --static → hanya file mentah (tanpa browser)
 */
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { HtmlValidate } = require("html-validate");

const ROOT = path.resolve(__dirname, "../..");
const PAGES = ["index.html", ...fs.readdirSync(path.join(ROOT, "pages")).filter((f) => f.endsWith(".html")).map((f) => "pages/" + f)];
const config = JSON.parse(fs.readFileSync(path.join(ROOT, ".htmlvalidate.json"), "utf8"));
const validator = new HtmlValidate(config);
// Aturan gaya penulisan yang tidak relevan untuk DOM hasil render:
//  - browser selalu menserialisasi atribut boolean sebagai x=""
//  - spasi akhir baris berasal dari template literal
//  - lebar progress bar dinamis wajib lewat style="width:%" (div role=progressbar, bukan <progress>, agar bisa diberi gaya)
const RENDER_OFF = ["attribute-boolean-style", "attribute-empty-style", "no-trailing-whitespace", "no-inline-style", "prefer-native-element"];
const renderValidator = new HtmlValidate({ ...config, rules: { ...config.rules, ...Object.fromEntries(RENDER_OFF.map((r) => [r, "off"])) } });

function report(label, res) {
  const msgs = res.results.flatMap((r) => r.messages);
  if (msgs.length) {
    console.log(`GAGAL ${label}: ${msgs.length} masalah`);
    msgs.slice(0, 8).forEach((m) => console.log(`      [${m.ruleId}] baris ${m.line}: ${m.message}`));
    if (msgs.length > 8) console.log(`      … ${msgs.length - 8} lainnya`);
  } else {
    console.log(`OK    ${label}`);
  }
  return msgs.length;
}

(async () => {
  let total = 0;
  console.log("== File HTML mentah");
  for (const p of PAGES) total += report(p, await validator.validateFile(path.join(ROOT, p)));

  if (!process.argv.includes("--static")) {
    console.log("\n== DOM hasil render (setelah login)");
    const puppeteer = require("puppeteer-core");
    const exe = [process.env.BROWSER_PATH, "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
      "C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].filter(Boolean).find(fs.existsSync);
    const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--allow-file-access-from-files"] });
    const page = await browser.newPage();
    const base = pathToFileURL(ROOT).href + "/";
    await page.goto(base + "index.html", { waitUntil: "domcontentloaded" });
    await page.type("#identifier", "admin@nexus.ac.id");
    await page.type("#password", "nexus2026");
    await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded" }), page.click('#login-form button[type="submit"]')]);
    for (const p of PAGES.filter((x) => x !== "index.html")) {
      await page.goto(base + p, { waitUntil: "domcontentloaded" });
      await new Promise((r) => setTimeout(r, 1500));
      const html = "<!DOCTYPE html>\n" + (await page.evaluate(() => document.documentElement.outerHTML));
      total += report(p + " (render)", await renderValidator.validateString(html, p));
    }
    await browser.close();
  }
  console.log(`\nTotal masalah HTML: ${total}`);
  process.exit(total ? 1 : 0);
})();
