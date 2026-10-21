/**
 * Portal Pelajar — Jadwal Kelas: sesi kelas virtual dari kursus yang disetujui,
 * dikelompokkan Sedang Live / Akan Datang / Selesai, dengan status presensi.
 * Tombol Masuk (hanya saat live) mencatat presensi hadir lalu membuka tautan sesi.
 */
(function () {
  "use strict";

  var S = Nexus.services;
  var ui = Nexus.ui;
  var u = Nexus.utils;
  var html = ui.html;
  var $ = function (id) { return document.getElementById(id); };

  var PLATFORM = { zoom: "Zoom", meet: "Google Meet", teams: "Microsoft Teams" };
  var GRUP = [
    ["live", "Sedang Live", "sensors", "text-red-600"],
    ["terjadwal", "Akan Datang", "event_upcoming", "text-blue-600"],
    ["selesai", "Selesai", "task_alt", "text-slate-500"],
  ];
  var prodiMap = {};

  function jam(iso, durasi) {
    var a = new Date(iso), b = new Date(a.getTime() + durasi * 60000);
    var f = function (d) { return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }); };
    return f(a) + "–" + f(b);
  }

  function keterangan(x) {
    var now = Date.now(), start = new Date(x.sesi.waktu_mulai).getTime(), end = start + x.sesi.durasi_menit * 60000;
    var menit = function (ms) { var m = Math.round(ms / 60000); return m >= 60 ? Math.floor(m / 60) + " jam " + (m % 60) + " menit" : m + " menit"; };
    if (x.sesi.status === "live") return now < end ? "Berakhir " + menit(end - now) + " lagi" : "Melewati jadwal selesai";
    if (x.sesi.status === "terjadwal") return now < start ? "Mulai " + menit(start - now) + " lagi" : "Menunggu dosen memulai sesi";
    return "Selesai " + u.timeAgo(new Date(end).toISOString());
  }

  function card(x) {
    var k = x.kursus || {}, p = prodiMap[k.prodi_id];
    var live = x.sesi.status === "live";
    var pres = x.presensi
      ? ui.badge(x.presensi.status, "Presensi: " + ui.statusLabel(x.presensi.status))
      : x.sesi.status === "selesai" ? ui.badge("alpa", "Tidak tercatat hadir") : "";
    return html`<article class="flex overflow-hidden rounded-2xl border ${live ? "border-red-200 ring-1 ring-red-100" : "border-slate-200"} bg-white shadow-sm">
      <div class="relative w-28 flex-shrink-0 overflow-hidden sm:w-36">${Nexus.cover.render(k, p && p.kode, "h-full w-full", { compact: true })}</div>
      <div class="flex min-w-0 flex-1 flex-col gap-1.5 p-4">
        <p class="font-mono text-[11px] text-slate-500">${k.kode_mk || ""} · ${PLATFORM[x.sesi.platform] || x.sesi.platform}</p>
        <h4 class="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">${x.sesi.judul}</h4>
        <p class="text-xs text-slate-600">${u.formatDate(x.sesi.waktu_mulai)} · ${jam(x.sesi.waktu_mulai, x.sesi.durasi_menit)} WIB</p>
        <p class="text-xs font-semibold ${live ? "text-red-700" : "text-slate-500"}">${keterangan(x)}</p>
        <div class="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
          <span>${pres}</span>
          ${live ? html`<button type="button" data-masuk="${x.sesi.id}" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Masuk ↗</button>` : ""}
        </div>
      </div>
    </article>`;
  }

  async function render() {
    var r = await Promise.all([S.pelajar.jadwal(), S.programStudi.list()]);
    var list = r[0];
    prodiMap = {}; r[1].forEach(function (p) { prodiMap[p.id] = p; });
    var hadir = list.filter(function (x) { return x.presensi && x.presensi.status === "hadir"; }).length;
    var tercatat = list.filter(function (x) { return x.presensi; }).length;
    $("info-jadwal").textContent = list.length
      ? list.length + " sesi dari kursus Anda · kehadiran " + (tercatat ? u.formatPercent(hadir, tercatat) : "-") + ". Presensi tercatat otomatis saat Anda masuk ke sesi yang sedang live."
      : "Belum ada sesi kelas virtual untuk kursus Anda.";

    if (!list.length) {
      $("grup-jadwal").innerHTML = html`<div class="rounded-xl border border-slate-200 bg-white">${ui.emptyState("Belum ada jadwal kelas", "Jadwal tampil setelah KRS Anda disetujui dan dosen menjadwalkan sesi.")}</div>`.value;
      return;
    }
    $("grup-jadwal").innerHTML = GRUP.map(function (g) {
      var items = list.filter(function (x) { return x.sesi.status === g[0]; });
      if (g[0] === "selesai") items = items.slice().reverse(); // terbaru dulu
      if (!items.length) return "";
      return html`<section aria-labelledby="grup-${g[0]}">
        <h3 id="grup-${g[0]}" class="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-700">
          <span class="material-symbols-outlined text-[20px] ${g[3]}" aria-hidden="true">${g[2]}</span>${g[1]}
          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">${items.length}</span>
        </h3>
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">${items.map(card)}</div>
      </section>`.value;
    }).join("");
  }

  $("grup-jadwal").addEventListener("click", async function (e) {
    var b = e.target.closest("[data-masuk]");
    if (!b) return;
    // Tab dibuka langsung dari klik agar tidak diblokir pemblokir pop-up.
    var tab = window.open("about:blank", "_blank");
    try {
      var url = await S.pelajar.masukKelas(b.getAttribute("data-masuk"));
      if (tab) { tab.opener = null; tab.location.href = url; }
      ui.toast("Presensi tercatat: hadir. Selamat belajar!", "success");
      render();
    } catch (err) {
      if (tab) tab.close();
      ui.toast(err.message || String(err), "error");
    }
  });

  render().catch(function (err) {
    ui.toast("Gagal memuat jadwal: " + (err.message || err), "error");
    console.error(err);
  });
  // Perbarui hitung mundur setiap menit.
  setInterval(function () { render().catch(function () {}); }, 60000);
})();
