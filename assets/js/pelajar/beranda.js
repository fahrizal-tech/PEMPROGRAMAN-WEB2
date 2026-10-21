/**
 * Portal Pelajar — Beranda: sapaan, ringkasan belajar, sesi live, tenggat terdekat, kursus saya.
 */
(function () {
  "use strict";

  var S = Nexus.services;
  var ui = Nexus.ui;
  var u = Nexus.utils;
  var html = ui.html;
  var $ = function (id) { return document.getElementById(id); };
  var JENIS = { tugas: "Tugas", kuis: "Kuis", uts: "UTS", uas: "UAS" };

  function sapaan() {
    var h = new Date().getHours();
    return h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam";
  }

  async function render() {
    var r = await Promise.all([S.pelajar.me(), S.pelajar.kursusSaya(), S.pelajar.tugas(), S.pelajar.jadwal(), S.programStudi.list()]);
    var m = r[0], kursus = r[1], tugas = r[2], jadwal = r[3];
    var prodi = r[4].filter(function (p) { return p.id === m.prodi_id; })[0];

    var aktif = kursus.filter(function (x) { return x.krs.status === "disetujui" && x.kursus; });
    var menunggu = kursus.filter(function (x) { return x.krs.status === "diajukan"; });
    var now = Date.now();
    var belum = tugas.filter(function (x) {
      return x.tugas.status === "aktif" && !x.pengumpulan && new Date(x.tugas.deadline).getTime() > now;
    });
    var live = jadwal.filter(function (x) { return x.sesi.status === "live"; });
    var tercatat = jadwal.filter(function (x) { return x.presensi; });
    var hadir = tercatat.filter(function (x) { return x.presensi.status === "hadir"; }).length;

    /* ---------- Banner ---------- */
    $("info-mhs").textContent = "Portal Pelajar · " + m.nim + (prodi ? " · " + prodi.nama : "");
    $("sapaan").textContent = sapaan() + ", " + m.nama.split(" ")[0] + " 👋";
    var bagian = [];
    if (live.length) bagian.push(live.length + " sesi sedang live");
    bagian.push(belum.length + " tugas belum dikumpulkan");
    if (menunggu.length) bagian.push(menunggu.length + " KRS menunggu persetujuan");
    if (m.status !== "aktif") bagian.unshift("Status akademik: " + ui.statusLabel(m.status));
    $("ringkasan").textContent = bagian.join(" · ");

    /* ---------- KPI ---------- */
    var sks = aktif.reduce(function (n, x) { return n + (x.kursus.sks || 0); }, 0);
    $("kpi-kursus").textContent = aktif.length;
    $("kpi-kursus-sub").textContent = sks + " SKS" + (menunggu.length ? " · " + menunggu.length + " menunggu persetujuan" : "");
    $("kpi-tugas").textContent = belum.length;
    $("kpi-tugas-sub").textContent = belum.length ? "Terdekat: " + u.formatDate(belum[0].tugas.deadline, true) : "Semua tugas aktif sudah dikumpulkan";
    $("kpi-hadir").textContent = tercatat.length ? u.formatPercent(hadir, tercatat.length) : "-";
    $("kpi-hadir-sub").textContent = tercatat.length ? hadir + " hadir dari " + tercatat.length + " sesi tercatat" : "Belum ada presensi";
    $("kpi-ipk").textContent = m.ipk ? u.formatNumber(m.ipk, 2) : "-";
    $("kpi-ipk-sub").textContent = "Semester " + m.semester + " · angkatan " + m.angkatan;

    /* ---------- Sesi live ---------- */
    $("live-section").classList.toggle("hidden", !live.length);
    $("live-list").innerHTML = live.map(function (x) {
      var end = new Date(x.sesi.waktu_mulai).getTime() + x.sesi.durasi_menit * 60000;
      var sisa = Math.max(0, Math.round((end - now) / 60000));
      return html`<article class="flex items-center gap-4 rounded-2xl border border-red-200 bg-white p-4 shadow-sm ring-1 ring-red-100">
        <div class="min-w-0 flex-1">
          <p class="font-mono text-[11px] text-slate-500">${x.kursus ? x.kursus.kode_mk : ""}</p>
          <p class="line-clamp-2 text-sm font-semibold text-slate-900">${x.sesi.judul}</p>
          <p class="mt-1 text-xs font-semibold text-red-700">Berakhir ${sisa} menit lagi${x.presensi && x.presensi.status === "hadir" ? " · Anda tercatat hadir" : ""}</p>
        </div>
        <button type="button" data-masuk="${x.sesi.id}" class="flex-shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Masuk ↗</button>
      </article>`.value;
    }).join("");

    /* ---------- Tenggat terdekat ---------- */
    var dekat = belum.slice(0, 5);
    $("tenggat-list").innerHTML = dekat.length ? dekat.map(function (x) {
      var jam = (new Date(x.tugas.deadline).getTime() - now) / 3600000;
      var tone = jam < 24 ? "text-red-700" : jam < 72 ? "text-amber-700" : "text-slate-500";
      return html`<li class="px-5 py-3">
        <p class="text-sm font-medium text-slate-900">${x.tugas.judul}</p>
        <p class="mt-0.5 text-xs text-slate-500">${x.kursus ? x.kursus.kode_mk : ""} · ${JENIS[x.tugas.jenis] || x.tugas.jenis} · bobot ${x.tugas.bobot_persen}%</p>
        <p class="mt-0.5 text-xs font-semibold ${tone}">Tenggat ${u.formatDate(x.tugas.deadline, true)}</p>
      </li>`.value;
    }).join("") : html`<li>${ui.emptyState("Tidak ada tenggat terdekat", "Semua tugas aktif sudah Anda kumpulkan.")}</li>`.value;

    /* ---------- Kursus saya ---------- */
    var prodiMap = {};
    r[4].forEach(function (p) { prodiMap[p.id] = p; });
    $("kursus-list").innerHTML = aktif.length ? aktif.slice(0, 4).map(function (x) {
      var k = x.kursus;
      return html`<a href="kursus.html" class="group flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:border-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
        <div class="relative w-28 flex-shrink-0 overflow-hidden sm:w-32">${Nexus.cover.render(k, prodiMap[k.prodi_id] && prodiMap[k.prodi_id].kode, "h-full w-full", { compact: true })}</div>
        <div class="min-w-0 flex-1 p-3">
          <p class="font-mono text-[11px] text-slate-500">${k.kode_mk} · ${k.sks} SKS</p>
          <p class="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 group-hover:text-blue-700">${k.nama}</p>
          <p class="mt-1 truncate text-xs text-slate-500">${x.dosen ? x.dosen.nama : "-"}</p>
        </div>
      </a>`.value;
    }).join("") : html`<div class="rounded-xl border border-slate-200 bg-white sm:col-span-2">${ui.emptyState("Belum ada kursus yang disetujui", "Ajukan KRS di halaman Kursus Saya.")}</div>`.value;
  }

  /* ---------- Masuk sesi live: presensi tercatat, tautan dibuka di tab baru ---------- */
  $("live-list").addEventListener("click", async function (e) {
    var b = e.target.closest("[data-masuk]");
    if (!b) return;
    // Tab dibuka lebih dulu (langsung dari klik) agar tidak diblokir pemblokir pop-up.
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
    ui.toast("Gagal memuat beranda: " + (err.message || err), "error");
    console.error(err);
  });
  ui.onDataChange(["*"], function () { render(); });
})();
