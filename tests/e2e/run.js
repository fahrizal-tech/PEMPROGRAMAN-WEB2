/**
 * Uji E2E di browser sungguhan (Edge/Chrome yang terpasang, via puppeteer-core).
 *
 *   npm run test:e2e              → uji file lokal
 *   npm run test:e2e -- --online  → uji website di GitHub Pages
 *   npm run test:e2e -- --http    → uji lewat server HTTP lokal (wajib untuk Firefox,
 *                                   yang memperlakukan tiap file:// sebagai origin terpisah)
 *
 * Browser dicari otomatis; bisa diatur manual lewat variabel BROWSER_PATH
 * (Chrome/Edge via CDP, Firefox via WebDriver BiDi).
 */
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const puppeteer = require("puppeteer-core");

const ONLINE_URL = "https://fahrizal-tech.github.io/PEMPROGRAMAN-WEB2/";
const HTTP_PORT = 4174;
const USE_HTTP = process.argv.includes("--http");
const ROOT = process.argv.includes("--online") ? ONLINE_URL
  : USE_HTTP ? `http://localhost:${HTTP_PORT}/`
  : pathToFileURL(path.resolve(__dirname, "../..")).href + "/";
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
  const server = USE_HTTP ? await require("../helpers/server").serve(HTTP_PORT) : null;
  const exe = findBrowser();
  const firefox = /firefox/i.test(exe); // Firefox dijalankan lewat WebDriver BiDi
  const browser = await puppeteer.launch(firefox
    ? { browser: "firefox", executablePath: exe, headless: true }
    : { executablePath: exe, headless: true, args: ["--allow-file-access-from-files"] });
  console.log(`Browser: ${await browser.version()}`);
  const page = await browser.newPage();
  const errors = [];
  const where = () => page.url().split("/").pop();
  // URL dari dalam halaman: di Firefox (BiDi) page.url() tidak ikut berubah saat skrip memanggil location.replace().
  const here = () => page.evaluate(() => location.pathname.split("/").pop() + location.search);
  // Firefox melaporkan unduhan font yang dibatalkan (pindah halaman) sebagai error halaman.
  page.on("pageerror", (e) => { if (!/downloadable font/.test(e.message)) errors.push(`${where()}: ${e.message}`); });
  page.on("console", (m) => {
    if (m.type() === "error" && (/^CSP dilanggar/.test(m.text()) || !/fonts\.g|Tracking|favicon/.test(m.text()))) errors.push(`${where()}: ${m.text()}`);
  });
  // Setiap pelanggaran Content-Security-Policy dihitung sebagai error.
  await page.evaluateOnNewDocument(() => {
    document.addEventListener("securitypolicyviolation", (e) => console.error(`CSP dilanggar: ${e.violatedDirective} ← ${e.blockedURI || "inline"}`));
  });

  let beforeUnloadDialogs = 0;
  page.on("dialog", (d) => { if (d.type() === "beforeunload") beforeUnloadDialogs++; d.accept(); });

  let pass = 0, fail = 0;
  const check = (ok, msg) => { ok ? pass++ : fail++; console.log(`${ok ? "OK   " : "GAGAL"} ${msg}`); };
  const nav = (fn) => Promise.all([page.waitForNavigation(NAV), fn()]);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const toastHas = (re) => page.waitForFunction((src) => new RegExp(src).test((document.getElementById("toast-region") || {}).textContent || ""), {}, re.source);
  const clickDialog = (label) => page.evaluate((l) => [...document.querySelectorAll('[role="dialog"] button')].find((b) => b.textContent.trim() === l || new RegExp(l).test(b.textContent)).click(), label);

  try {
    await page.setViewport({ width: 1280, height: 800 });

    /* ---------- Login & proteksi ---------- */
    await page.goto(ROOT + "pages/mahasiswa.html", NAV);
    await page.waitForSelector("#login-form");
    await page.waitForFunction(() => document.readyState === "complete");
    const dialihkan = await here();
    check(dialihkan.startsWith("index.html?next=mahasiswa.html"), `tanpa sesi dialihkan → ${dialihkan}`);

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

    /* ---------- Dashboard ---------- */
    await page.goto(ROOT + "pages/dashboard.html", NAV);
    await page.waitForFunction(() => document.getElementById("kpi-krs").textContent !== "-" && document.querySelectorAll("#log-list li").length > 0);
    const dash = await page.evaluate(async () => {
      const krs = await Nexus.services.krs.list();
      const charts = ["chart-krs", "chart-prodi", "chart-kursus"].map((id) => !!(window.Chart && Chart.getChart(document.getElementById(id))));
      return {
        krsOk: document.getElementById("kpi-krs").textContent === String(krs.filter((x) => x.status === "diajukan").length),
        charts, logs: document.querySelectorAll("#log-list li").length, top: document.querySelectorAll("#top-kursus a").length, topCover: document.querySelectorAll("#top-kursus svg, #top-kursus img").length,
        live: document.querySelectorAll("#live-list article").length, liveHidden: document.getElementById("live-section").classList.contains("hidden"),
        ringkasan: document.getElementById("ringkasan-hari").textContent,
        srRows: document.querySelectorAll("#data-kursus tbody tr").length,
      };
    });
    check(dash.krsOk, "dashboard: KPI KRS menunggu sesuai data");
    check(dash.charts.every(Boolean), `dashboard: 3 grafik Chart.js tampil (${dash.charts.join(",")})`);
    check(dash.logs === 6 && dash.top === 5 && dash.topCover === 5, `dashboard: ${dash.logs} aktivitas terbaru & ${dash.top} kartu kursus teratas bersampul`);
    check(!dash.liveHidden && dash.live === 2, `dashboard: bagian Sedang Live menampilkan ${dash.live} sesi`);
    check(/2 sesi sedang live · \d+ KRS menunggu validasi · \d+ tugas menunggu koreksi/.test(dash.ringkasan), `banner: ${dash.ringkasan}`);
    check(dash.srRows > 0, "dashboard: data grafik tersedia untuk pembaca layar");

    /* ---------- Laporan ---------- */
    await page.goto(ROOT + "pages/laporan.html", NAV);
    await page.waitForFunction(() => document.querySelectorAll("#tabel-rekap tr").length === 12 && document.getElementById("kpi-lulus").textContent !== "-");
    check(true, `laporan: rekap 12 mata kuliah, kelulusan ${await page.$eval("#kpi-lulus", (e) => e.textContent)}`);
    const nSda = await page.evaluate(async () => (await Nexus.services.kursus.query((k) => k.prodi_id === "prd_sda")).length);
    await page.select("#f-prodi", "prd_sda");
    await page.waitForFunction((n) => document.querySelectorAll("#tabel-rekap tr").length === n, {}, nSda);
    check(true, `laporan: filter prodi Sains Data → ${nSda} mata kuliah & KPI ikut berubah`);
    await page.select("#f-prodi", "");
    await page.select("#log-aksi", "login");
    await page.waitForFunction(() => [...document.querySelectorAll("#tabel-log tr")].every((tr) => /Login/.test(tr.textContent)));
    check(true, "laporan: filter log aksi Login");
    await page.select("#log-aksi", "");
    const duaHariLalu = await page.evaluate(() => Nexus.utils.localDate(new Date(Date.now() - 2 * 86400000)));
    await page.$eval("#log-dari", (e, v) => { e.value = v; e.dispatchEvent(new Event("change")); }, duaHariLalu);
    await page.waitForFunction((v) => [...document.querySelectorAll("#tabel-log time")].every((t) => Nexus.utils.localDate(t.getAttribute("datetime")) >= v), {}, duaHariLalu);
    check(true, "laporan: filter log dari tanggal");
    await page.$eval("#log-dari", (e) => { e.value = ""; e.dispatchEvent(new Event("change")); });
    // Emulasi media print hanya ada di Chromium (CDP); di Firefox yang diuji logika beforeprint saja.
    if (!firefox) await page.emulateMediaType("print");
    await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
    const pr = await page.evaluate(() => ({
      sidebar: getComputedStyle(document.getElementById("sidebar")).display,
      kop: getComputedStyle(document.getElementById("kop-institusi").parentElement).display,
      kopText: document.getElementById("kop-detail").textContent,
      rows: document.querySelectorAll("#tabel-log tr").length,
    }));
    const totalLog = await page.evaluate(async () => (await Nexus.services.logAktivitas.list()).length);
    check((firefox || (pr.sidebar === "none" && pr.kop !== "none")) && /Dicetak/.test(pr.kopText) && pr.rows === totalLog, `cetak: sidebar disembunyikan, kop tampil, semua ${pr.rows} log tercetak`);
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
    if (!firefox) await page.emulateMediaType(null);

    /* ---------- Mahasiswa & validasi KRS ---------- */
    await page.goto(ROOT + "pages/mahasiswa.html", NAV);
    await page.waitForFunction(() => /dari \d+ data/.test(document.getElementById("tabel-counter").textContent));
    const antre = await page.evaluate(async () => (await Nexus.services.krs.query((x) => x.status === "diajukan")).length);
    check((await page.$eval("#krs-count", (e) => e.textContent)) === String(antre), `mahasiswa: antrean KRS ${antre} sesuai data`);
    const target = await page.evaluate(async () => {
      const S = Nexus.services; const mhs = await S.mahasiswa.list(); const krs = await S.krs.list(); const kursus = await S.kursus.list();
      return krs.find((x) => x.status === "diajukan" && mhs.find((m) => m.id === x.mahasiswa_id).status === "aktif" &&
        krs.filter((y) => y.kursus_id === x.kursus_id && y.status === "disetujui").length < kursus.find((k) => k.id === x.kursus_id).kuota).id;
    });
    await page.click(`[data-approve="${target}"]`);
    await toastHas(/KRS disetujui/);
    await page.waitForFunction((n) => document.getElementById("krs-count").textContent === String(n), {}, antre - 1);
    check((await page.evaluate(async (id) => (await Nexus.services.krs.get(id)).status, target)) === "disetujui", "setujui KRS → status disetujui, antrean berkurang");
    const rej = await page.$eval("[data-reject]", (b) => b.getAttribute("data-reject"));
    await page.click(`[data-reject="${rej}"]`);
    await page.waitForSelector("#alasan-tolak");
    await page.type("#alasan-tolak", "prasyarat belum terpenuhi");
    await clickDialog("Tolak KRS");
    await toastHas(/KRS ditolak/);
    const logTolak = await page.evaluate(async () => (await Nexus.services.logAktivitas.recent(1))[0].deskripsi);
    check(/prasyarat belum terpenuhi/.test(logTolak), "tolak KRS dengan alasan → tercatat di log");

    await page.click("#btn-tambah");
    await page.waitForSelector("#fld-nim");
    await page.type("#fld-nim", "12");
    await page.type("#fld-nama", "Mahasiswa Uji E2E");
    await page.type("#fld-email", "uji.e2e@student.nexus.ac.id");
    await page.select("#fld-prodi_id", "prd_tif");
    await clickDialog("Simpan");
    await page.waitForSelector("#fld-nim-error");
    check(/8–12 digit/.test(await page.$eval("#fld-nim-error", (e) => e.textContent)), "tambah mahasiswa: NIM tidak valid ditolak");
    await page.$eval("#fld-nim", (e) => { e.value = ""; });
    await page.type("#fld-nim", "2610599001");
    await clickDialog("Simpan");
    await toastHas(/Mahasiswa Uji E2E berhasil ditambahkan/);
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
    await page.type("#f-cari", "2610599001");
    await page.waitForFunction(() => document.querySelectorAll("#tabel-mhs [data-edit]").length === 1);
    check(true, "tambah mahasiswa via modal → muncul di tabel");
    await page.click("#tabel-mhs [data-edit]");
    await page.waitForSelector("#fld-status");
    await page.select("#fld-status", "cuti");
    await clickDialog("Simpan");
    await toastHas(/berhasil diperbarui/);
    await page.waitForFunction(() => /Cuti/.test(document.getElementById("tabel-mhs").textContent));
    check(true, "edit mahasiswa → status Cuti tampil");
    await page.click("#tabel-mhs [data-hapus]");
    await page.waitForSelector('[role="dialog"]');
    await clickDialog("Ya, hapus");
    await toastHas(/berhasil dihapus/);
    check(true, "hapus mahasiswa tanpa relasi → berhasil");
    await page.click("#btn-reset");
    await page.select("#f-status", "atensi");
    await page.waitForFunction(() => document.querySelectorAll("#tabel-mhs tr").length > 0);
    const atensiOk = await page.$$eval("#tabel-mhs tr", (trs) => trs.every((t) => t.querySelector("td[colspan]") || /warning/.test(t.textContent)));
    check(atensiOk, "filter Perlu perhatian hanya menampilkan mahasiswa bertanda");
    await page.click("#btn-reset");
    await page.waitForSelector('[data-detail="mhs_0001"]');
    await page.click('[data-detail="mhs_0001"]');
    await page.waitForSelector('[role="dialog"]');
    check(/KRS — Ahmad Danial Pratama/.test(await page.$eval('[role="dialog"]', (d) => d.textContent)), "detail KRS mahasiswa tampil di modal");
    await page.keyboard.press("Escape");

    /* ---------- Instruktur / Dosen ---------- */
    await page.goto(ROOT + "pages/instruktur.html", NAV);
    await page.waitForFunction(() => /dari 12 data/.test(document.getElementById("tabel-counter").textContent));
    check(true, "dosen: 12 dosen tampil dengan beban mengajar");
    await page.click('[data-hapus="dsn_001"]');
    await page.waitForSelector('[role="dialog"]');
    check(/mengampu/.test(await page.$eval('[role="dialog"]', (d) => d.textContent)), "hapus dosen yang mengampu kursus → ditolak dengan alasan");
    await page.keyboard.press("Escape");
    await page.click("#btn-tambah");
    await page.waitForSelector("#fld-nidn");
    await page.type("#fld-nidn", "0099887766");
    await page.type("#fld-nama", "Dosen Uji E2E, M.T.");
    await page.type("#fld-email", "dosen.uji@nexus.ac.id");
    await page.select("#fld-prodi_id", "prd_tif");
    await page.select("#fld-jabatan_akademik", "Lektor");
    await page.click("#fld-serdos");
    await clickDialog("Simpan");
    await toastHas(/Dosen Uji E2E, M.T. berhasil ditambahkan/);
    await page.waitForFunction(() => /dari 13 data/.test(document.getElementById("tabel-counter").textContent));
    await page.type("#f-cari", "0099887766");
    await page.waitForFunction(() => document.querySelectorAll("#tabel-dosen [data-hapus]").length === 1);
    check(/Serdos/.test(await page.$eval("#tabel-dosen", (t) => t.textContent)), "tambah dosen (Serdos) via modal → tampil");
    await page.click("#tabel-dosen [data-hapus]");
    await page.waitForSelector('[role="dialog"]');
    await clickDialog("Ya, hapus");
    await toastHas(/Dosen Uji E2E, M.T. berhasil dihapus/);
    check(true, "hapus dosen tanpa kursus → berhasil");

    /* ---------- Kelas Virtual ---------- */
    await page.goto(ROOT + "pages/kelas-virtual.html", NAV);
    await page.waitForFunction(() => /dari 8 data/.test(document.getElementById("tabel-counter").textContent));
    // Tampilan kartu (default): dikelompokkan, sesi live pertama, hitung mundur.
    const kartu = await page.evaluate(() => ({
      n: document.querySelectorAll("#kartu-sesi article").length,
      grup: [...document.querySelectorAll("#kartu-sesi h3")].map((h) => h.textContent.trim()),
      pertama: document.querySelector("#kartu-sesi article").textContent,
      tabelKosong: document.querySelectorAll("#tabel-sesi tr").length === 0,
    }));
    check(kartu.n === 8 && kartu.grup.join(",") === "Sedang Live,Akan Datang,Selesai" && /Live/.test(kartu.pertama) && kartu.tabelKosong,
      `kelas virtual (kartu): 8 kartu dalam grup ${kartu.grup.join(" · ")}`);
    check(/Mulai \d+ (menit|jam|hari) lagi/.test(await page.$eval("#kartu-sesi", (e) => e.textContent)), "kartu sesi terjadwal menampilkan hitung mundur");
    await page.click('[data-view="tabel"]');
    await page.waitForFunction(() => document.querySelectorAll("#tabel-sesi tr").length > 0 && document.getElementById("kartu-sesi").classList.contains("hidden"));
    check(/Live/.test(await page.$eval("#tabel-sesi tr", (t) => t.textContent)), "tombol Tabel → tabel tampil, sesi live di urutan teratas");
    const kvTerjadwal = await page.$eval('[data-to="live"]', (b) => b.getAttribute("data-status"));
    await page.click(`[data-status="${kvTerjadwal}"]`);
    await toastHas(/Sesi dimulai/);
    await page.waitForSelector(`[data-status="${kvTerjadwal}"][data-to="selesai"]`);
    await page.click(`[data-status="${kvTerjadwal}"][data-to="selesai"]`);
    await toastHas(/Sesi diselesaikan/);
    check((await page.evaluate(async (id) => (await Nexus.services.kelasVirtual.get(id)).status, kvTerjadwal)) === "selesai", "status sesi: terjadwal → live → selesai");
    // Tunggu tabel selesai digambar ulang setelah perubahan status sebelum mengklik.
    await page.waitForFunction((id) => !document.querySelector(`[data-status="${id}"]`), {}, kvTerjadwal);
    await sleep(300);
    await page.click('[data-presensi="kv_0002"]');
    await page.waitForSelector("#semua-hadir");
    await page.click("#semua-hadir");
    await clickDialog("Simpan Presensi");
    await toastHas(/Presensi disimpan/);
    const presInfo = await page.evaluate(async () => {
      const S = Nexus.services;
      const peserta = (await S.kelasVirtual.peserta("kv_0002")).map((m) => m.id);
      const rows = await S.presensi.query((p) => p.kelas_virtual_id === "kv_0002");
      return { peserta: peserta.length, rows: rows.length, bukanHadir: rows.filter((p) => p.status !== "hadir").map((p) => `${p.mahasiswa_id}:${p.status}:${peserta.includes(p.mahasiswa_id) ? "peserta" : "BUKAN-peserta"}`) };
    });
    check(presInfo.rows === presInfo.peserta && presInfo.bukanHadir.length === 0, `presensi: tandai semua hadir → ${JSON.stringify(presInfo)}`);
    await page.click("#btn-tambah");
    await page.waitForSelector("#fld-kursus_id");
    await page.select("#fld-kursus_id", "krs_101");
    const nModul = await page.$eval("#fld-modul_id", (s) => s.options.length - 1);
    check(nModul === 6, `form sesi: pilihan modul menyesuaikan kursus (${nModul} modul CS-301)`);
    await page.type("#fld-judul", "Sesi Tambahan Uji E2E");
    await page.$eval("#fld-waktu_mulai", (e) => { e.value = "2026-10-01T09:00"; });
    await page.type("#fld-tautan", "http://zoom.us/j/123");
    await clickDialog("Simpan");
    await page.waitForSelector("#fld-tautan-error");
    check(/https/.test(await page.$eval("#fld-tautan-error", (e) => e.textContent)), "form sesi: tautan non-https ditolak");
    await page.$eval("#fld-tautan", (e) => { e.value = ""; });
    await page.type("#fld-tautan", "https://zoom.us/j/123");
    await clickDialog("Simpan");
    await toastHas(/Sesi Tambahan Uji E2E.*berhasil dijadwalkan/);
    await page.waitForFunction(() => /dari 9 data/.test(document.getElementById("tabel-counter").textContent));
    check(true, "jadwalkan sesi baru → total 9 sesi");

    /* ---------- Tugas & Kuis ---------- */
    await page.goto(ROOT + "pages/tugas-kuis.html", NAV);
    await page.waitForFunction(() => /dari 8 data/.test(document.getElementById("tabel-counter").textContent));
    check(true, "tugas & kuis: 8 asesmen tampil");
    await page.click("#btn-tambah");
    await page.waitForSelector("#fld-kursus_id");
    await page.select("#fld-kursus_id", "krs_110");
    const help = await page.$eval("#fld-bobot_persen", (i) => i.parentNode.querySelector("p").textContent);
    check(/Sisa bobot kursus ini: 90%/.test(help), `form asesmen: ${help}`);
    await page.type("#fld-judul", "Tugas Uji E2E Statistika");
    await page.type("#fld-bobot_persen", "95");
    await page.$eval("#fld-deadline", (e) => { e.value = "2026-10-15T23:59"; });
    await clickDialog("Simpan");
    await page.waitForSelector("#fld-bobot_persen-error");
    check(/maksimal 100%/.test(await page.$eval("#fld-bobot_persen-error", (e) => e.textContent)), "bobot melebihi sisa → ditolak dengan pesan sisa bobot");
    await page.$eval("#fld-bobot_persen", (e) => { e.value = ""; });
    await page.type("#fld-bobot_persen", "20");
    await clickDialog("Simpan");
    await toastHas(/Tugas Uji E2E Statistika.*berhasil dibuat/);
    await page.waitForFunction(() => /dari 9 data/.test(document.getElementById("tabel-counter").textContent));
    check(true, "buat asesmen → total 9");
    await sleep(300);
    await page.click('button[data-nilai="tgs_0001"].bg-blue-600');
    await page.waitForSelector("[data-kumpul]");
    const kumpulId = await page.$eval("[data-kumpul]", (i) => i.getAttribute("data-kumpul"));
    await page.$eval("[data-kumpul]", (i) => { i.value = "150"; });
    await clickDialog("Simpan Nilai");
    await toastHas(/di luar rentang/);
    await page.$eval("[data-kumpul]", (i) => { i.value = "85"; });
    await clickDialog("Simpan Nilai");
    await toastHas(/nilai disimpan/);
    const nilai = await page.evaluate(async (id) => (await Nexus.services.pengumpulan.get(id)), kumpulId);
    check(nilai.nilai === 85 && nilai.status === "dinilai", "penilaian: nilai > 100 ditolak, nilai 85 tersimpan (dinilai)");

    /* ---------- Sertifikasi ---------- */
    await page.goto(ROOT + "pages/sertifikasi.html", NAV);
    await page.waitForFunction(() => /dari 7 data/.test(document.getElementById("tabel-counter").textContent));
    const verif = async (nomor) => {
      await page.$eval("#nomor-verif", (e) => { e.value = ""; });
      await page.type("#nomor-verif", nomor);
      await page.click('#form-verif button[type="submit"]');
      await page.waitForFunction((n) => (document.getElementById("hasil-verif").textContent || "").length > 0 && !document.getElementById("hasil-verif").dataset.prev?.includes(n), {}, nomor);
      await sleep(200);
      return page.$eval("#hasil-verif", (e) => e.textContent.replace(/\s+/g, " "));
    };
    check(/sah dan aktif/.test(await verif("NXS/TIF/2026/00041")), "verifikasi nomor terbit → sah");
    check(/DICABUT/.test(await verif("nxs/sif/2026/00046")), "verifikasi nomor dicabut (huruf kecil) → DICABUT");
    check(/tidak ditemukan/.test(await verif("NXS/XXX/0000/00000")), "verifikasi nomor tidak ada → tidak ditemukan");
    const tte = await page.$eval("[data-tte]", (b) => b.getAttribute("data-tte"));
    await page.click(`[data-tte="${tte}"]`);
    await toastHas(/ditandatangani dan terbit/);
    await page.waitForFunction((id) => !document.querySelector(`[data-tte="${id}"]`), {}, tte);
    await sleep(300);
    await page.click(`[data-cabut="${tte}"]`);
    await page.waitForSelector('[role="dialog"]');
    await clickDialog("Ya, cabut");
    await toastHas(/dicabut/);
    check((await page.evaluate(async (id) => (await Nexus.services.sertifikat.get(id)).status, tte)) === "dicabut", "sertifikat: TTE → terbit → cabut");
    await page.click("#btn-tambah");
    await page.waitForSelector("#fld-mahasiswa_id");
    await page.$eval("#fld-mahasiswa_id", (s) => { s.selectedIndex = 1; s.dispatchEvent(new Event("change")); });
    await page.$eval("#fld-kursus_id", (s) => { if (!s.value) { s.selectedIndex = 1; s.dispatchEvent(new Event("change")); } });
    check((await page.$eval("#fld-penandatangan", (i) => i.value)).length > 3, "form sertifikat: penandatangan otomatis = dosen pengampu");
    await clickDialog("Terbitkan");
    await toastHas(/dibuat \(menunggu TTE\)/);
    await page.waitForFunction(() => /dari 8 data/.test(document.getElementById("tabel-counter").textContent));
    check(true, "terbitkan sertifikat untuk mahasiswa lulus → nomor otomatis, menunggu TTE");
    await page.click("[data-lihat]");
    await page.waitForSelector("#sertifikat-cetak");
    check(/Diberikan kepada/.test(await page.$eval("#sertifikat-cetak", (e) => e.textContent)), "pratinjau sertifikat tampil (siap cetak)");
    await page.keyboard.press("Escape");

    /* ---------- Pengaturan Sistem ---------- */
    await page.goto(ROOT + "pages/pengaturan.html", NAV);
    await page.waitForFunction(() => document.getElementById("fld-nama_institusi").value.length > 0 && document.querySelectorAll("#tabel-admin tr").length === 2);
    check(/Anda/.test(await page.$eval("#tabel-admin", (t) => t.textContent)), "pengaturan: nilai dimuat, 2 akun admin (akun aktif ditandai)");
    await page.$eval("#fld-kode_pt", (e) => { e.value = ""; });
    await page.type("#fld-kode_pt", "12");
    await page.click("#btn-simpan");
    await page.waitForSelector("#fld-kode_pt-error");
    check(/6 digit/.test(await page.$eval("#fld-kode_pt-error", (e) => e.textContent)), "pengaturan: kode PT tidak valid ditolak");
    await page.click("#btn-batal");
    await page.$eval("#fld-nama_institusi", (e) => { e.value = ""; });
    await page.type("#fld-nama_institusi", "Universitas Uji E2E");
    await page.click("#btn-simpan");
    await toastHas(/1 pengaturan berhasil disimpan/);
    check((await page.evaluate(async () => Nexus.services.pengaturan.get("nama_institusi"))) === "Universitas Uji E2E", "pengaturan: nama institusi tersimpan (hanya kolom yang berubah)");

    const backupFile = path.join(require("node:os").tmpdir(), "nexus-e2e-cadangan.json");
    fs.writeFileSync(backupFile, JSON.stringify(await page.evaluate(() => Nexus.storage.exportAll())));
    await page.click("#btn-cadangan");
    await toastHas(/Cadangan data diunduh/);
    check(true, "unduh cadangan JSON");

    await page.click("#btn-reset-data");
    await page.waitForSelector("#konfirmasi-reset");
    await page.type("#konfirmasi-reset", "reset");
    await clickDialog("Reset Data");
    await toastHas(/Ketik RESET/);
    await page.$eval("#konfirmasi-reset", (e) => { e.value = "RESET"; });
    await nav(() => clickDialog("Reset Data"));
    await toastHas(/dikembalikan ke kondisi awal/);
    await page.waitForFunction(() => document.getElementById("fld-nama_institusi").value.length > 0);
    check((await page.$eval("#fld-nama_institusi", (e) => e.value)) === "Institut Teknologi dan Komputasi Nexus", "reset data: konfirmasi RESET wajib, data kembali ke awal");

    const fileInput = await page.$("#file-pulihkan");
    await fileInput.uploadFile(backupFile);
    await page.waitForSelector('[role="dialog"]');
    await nav(() => clickDialog("Ya, pulihkan"));
    await toastHas(/berhasil dipulihkan/);
    await page.waitForFunction(() => document.getElementById("fld-nama_institusi").value.length > 0);
    check((await page.$eval("#fld-nama_institusi", (e) => e.value)) === "Universitas Uji E2E", "pulihkan dari cadangan → data kembali seperti saat dicadangkan");
    fs.unlinkSync(backupFile);
    await page.evaluate(() => Nexus.storage.reset());

    /* ---------- Data Master & Form Kursus (CRUD) ---------- */
    const rowsIn = (sel) => page.$$eval(`${sel} tr`, (trs) => trs.filter((t) => !t.querySelector("td[colspan]")).length);

    await page.goto(ROOT + "pages/data-master.html", NAV);
    await page.waitForFunction(() => /dari 12/.test(document.getElementById("tabel-counter").textContent));
    check((await page.$eval("#kpi-total", (e) => e.textContent)) === "12", "data master: 12 kursus + KPI dari data");
    const katalog = await page.evaluate(() => ({ n: document.querySelectorAll("#kartu-kursus article").length, sampul: document.querySelectorAll("#kartu-kursus article svg, #kartu-kursus article img").length }));
    check(katalog.n === 12 && katalog.sampul === 12, `katalog (kartu): ${katalog.n} kartu kursus bersampul`);
    await page.click('[data-view="tabel"]');
    await page.waitForFunction(() => document.querySelectorAll("#tabel-kursus tr").length > 0 && document.getElementById("kartu-kursus").classList.contains("hidden"));
    check(true, "tombol Tabel → tabel kursus tampil");
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
    check(!!(await page.$("#sampul-preview svg")), "form: pratinjau sampul otomatis (SVG) tampil");
    const pngFile = path.join(require("node:os").tmpdir(), "nexus-e2e-sampul.png");
    fs.writeFileSync(pngFile, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR42mNk+M9QzwAEjDAGNzYAAB0HBf+Lx4PlAAAAAElFTkSuQmCC", "base64"));
    await (await page.$("#file-sampul")).uploadFile(pngFile);
    await page.waitForSelector("#sampul-preview img");
    check(/^data:image\/(webp|jpeg)/.test(await page.$eval("#cover", (e) => e.value)), "form: unggah PNG → dikompres (WebP/JPEG) & pratinjau berganti gambar");
    fs.unlinkSync(pngFile);
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
    check(await page.evaluate(async () => /^data:image\//.test(((await Nexus.services.kursus.query((k) => k.kode_mk === "TS-201"))[0] || {}).cover || "")), "sampul unggahan tersimpan bersama kursus");

    await page.type("#f-cari", "TS-201");
    // Tunggu pencarian diterapkan (tinggal 1 baris) sebelum mengklik Edit.
    await page.waitForFunction(() => document.querySelectorAll("#tabel-kursus [data-hapus]").length === 1 && /2 modul/.test(document.getElementById("tabel-kursus").textContent));
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
    // Halaman login diukur saat belum masuk (bila sudah masuk, login langsung dialihkan).
    const lebarLogin = {};
    for (const width of [390, 768]) {
      await mobile.setViewport({ width, height: 900 });
      await mobile.goto(`${ROOT}index.html`, NAV);
      await sleep(300);
      lebarLogin[width] = await mobile.evaluate(() => document.documentElement.scrollWidth);
    }
    // Tab baru tidak berbagi sessionStorage → login dulu agar halaman admin benar-benar terbuka.
    await mobile.type("#identifier", DEMO.email);
    await mobile.type("#password", DEMO.password);
    await Promise.all([mobile.waitForNavigation(NAV), mobile.click('#login-form button[type="submit"]')]);
    // Kembalikan pilihan tampilan ke default (kartu) agar tampilan kartu ikut diuji.
    await mobile.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("nexus-lms:view:")).forEach((k) => localStorage.removeItem(k)));
    for (const width of [390, 768]) {
      await mobile.setViewport({ width, height: 900 });
      const wide = lebarLogin[width] > width ? [`index (${lebarLogin[width]}px)`] : [];
      const dialihkan = [];
      for (const m of [...MENU, "form", "layout"]) {
        await mobile.goto(`${ROOT}pages/${m}.html`, NAV);
        await sleep(300);
        const info = await mobile.evaluate(() => ({ w: document.documentElement.scrollWidth, page: location.pathname.split("/").pop() }));
        if (info.page !== `${m}.html`) dialihkan.push(m);
        if (info.w > width) wide.push(`${m} (${info.w}px)`);
      }
      check(dialihkan.length === 0 && wide.length === 0,
        `12 halaman (termasuk login) pas di ${width}px tanpa font, mode kartu: ${wide.join(", ") || "semua pas"}${dialihkan.length ? " | DIALIHKAN: " + dialihkan.join(", ") : ""}`);
    }

    // Tampilan kosong berilustrasi pada katalog (mode kartu).
    await mobile.goto(`${ROOT}pages/data-master.html`, NAV);
    await mobile.waitForSelector('[data-view="kartu"]');
    const modeAwal = await mobile.$eval('[data-view="kartu"]', (b) => b.getAttribute("aria-pressed"));
    if (modeAwal !== "true") await mobile.click('[data-view="kartu"]');
    await mobile.waitForFunction(() => document.querySelectorAll("#kartu-kursus article").length > 0);
    await mobile.type("#f-cari", "tidak-ada-kursus-ini");
    await sleep(800);
    const kosong = await mobile.evaluate(() => ({ teks: document.getElementById("kartu-kursus").textContent.replace(/\s+/g, " ").trim().slice(0, 80), svg: !!document.querySelector("#kartu-kursus svg") }));
    check(/Tidak ada data yang cocok/.test(kosong.teks) && kosong.svg, `katalog: pencarian tanpa hasil → tampilan kosong berilustrasi (${kosong.teks})`);
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
    check((await here()).startsWith("index.html?next=laporan.html"), "setelah keluar, halaman admin terkunci lagi");

    check(errors.length === 0, `error JavaScript: ${errors.length ? errors.join(" | ") : "tidak ada"}`);
  } catch (e) {
    fail++;
    console.log(`GAGAL error tak terduga: ${e.message}`);
    const diag = await page.evaluate(() => ({
      url: location.pathname.split("/").pop() + location.search,
      dialog: [...document.querySelectorAll('[role="dialog"]')].map((d) => d.textContent.replace(/\s+/g, " ").slice(0, 120)),
      toast: ((document.getElementById("toast-region") || {}).textContent || "").replace(/\s+/g, " ").slice(0, 200),
    })).catch(() => ({}));
    console.log("      diagnostik:", JSON.stringify(diag));
    console.log("      " + String(e.stack).split("\n").find((l) => /run\.js:\d+/.test(l)));
  } finally {
    await browser.close();
    if (server) server.close();
  }

  console.log(`\nHasil E2E: ${pass} lulus, ${fail} gagal`);
  process.exit(fail ? 1 : 0);
})();
