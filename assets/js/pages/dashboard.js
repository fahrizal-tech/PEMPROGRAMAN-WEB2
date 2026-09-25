/**
 * Dashboard: KPI, grafik Chart.js, aktivitas terbaru, dan kursus teratas — semua dari data.
 */
(function () {
  "use strict";

  var S = Nexus.services;
  var ui = Nexus.ui;
  var u = Nexus.utils;
  var html = ui.html;
  var $ = function (id) { return document.getElementById(id); };

  var COLORS = ["#2563eb", "#10b981", "#f59e0b", "#6366f1", "#0ea5e9", "#ec4899", "#64748b"];
  var charts = {};

  if (window.Chart) {
    Chart.defaults.font.family = "Inter, system-ui, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = "#64748b";
    Chart.defaults.plugins.legend.labels.boxWidth = 12;
    Chart.defaults.maintainAspectRatio = false;
  }

  function draw(id, config) {
    if (!window.Chart) return;
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart($(id), config);
  }

  // Ukuran label dihitung ulang setelah font web termuat (mencegah label terpotong).
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { Object.keys(charts).forEach(function (k) { charts[k].update(); }); });
  }

  /** Tabel tersembunyi berisi data grafik untuk pembaca layar. */
  function srTable(id, head, rows) {
    var cap = $(id).querySelector("caption").outerHTML;
    $(id).innerHTML = cap + html`<thead><tr>${head.map(function (h) { return html`<th scope="col">${h}</th>`; })}</tr></thead>
      <tbody>${rows.map(function (r) { return html`<tr>${r.map(function (c) { return html`<td>${c}</td>`; })}</tr>`; })}</tbody>`.value;
  }

  var AKSI_ICON = { create: ["add_circle", "text-emerald-600 bg-emerald-50"], update: ["edit", "text-blue-600 bg-blue-50"], delete: ["delete", "text-red-600 bg-red-50"], login: ["login", "text-slate-600 bg-slate-100"] };

  async function render() {
    var r = await Promise.all([
      S.mahasiswa.list(), S.kursus.list(), S.krs.list(), S.pengumpulan.list(), S.presensi.list(),
      S.kelasVirtual.list(), S.programStudi.list(), S.instruktur.list(), S.logAktivitas.recent(6), S.admin.list(), S.pengaturan.get("periode_aktif"),
    ]);
    var mhs = r[0], kursus = r[1], krs = r[2], kumpul = r[3], presensi = r[4], kelas = r[5], prodi = r[6], dosen = r[7], logs = r[8], admins = r[9];
    var byId = function (list) { var m = {}; list.forEach(function (x) { m[x.id] = x; }); return m; };
    var prodiMap = byId(prodi), dosenMap = byId(dosen), adminMap = byId(admins);

    /* ---------- Sambutan ---------- */
    var user = Nexus.auth.currentUser();
    var jam = Number(new Intl.DateTimeFormat("id-ID", { hour: "numeric", hour12: false, timeZone: "Asia/Jakarta" }).format(new Date()));
    $("sapaan").textContent = jam < 11 ? "Selamat pagi" : jam < 15 ? "Selamat siang" : jam < 18 ? "Selamat sore" : "Selamat malam";
    $("nama-admin").textContent = user ? user.nama.split(",")[0] : "Admin";
    $("periode-aktif").textContent = r[10] || "-";
    $("waktu-data").textContent = "Diperbarui " + u.formatDate(new Date().toISOString(), true);

    /* ---------- KPI ---------- */
    var count = function (list, fn) { return list.filter(fn).length; };
    var aktif = mhs.filter(function (m) { return m.status === "aktif"; });
    $("kpi-mhs").textContent = u.formatNumber(aktif.length);
    $("kpi-mhs-sub").textContent = "dari " + mhs.length + " terdaftar · " + count(mhs, function (m) { return m.status === "cuti"; }) + " cuti · " + count(mhs, function (m) { return m.status === "lulus"; }) + " lulus";

    var pub = kursus.filter(function (k) { return k.status === "publikasi"; });
    $("kpi-kursus").textContent = u.formatNumber(pub.length);
    $("kpi-kursus-sub").textContent = count(kursus, function (k) { return k.status === "draft"; }) + " draft · " + count(kursus, function (k) { return k.status === "arsip"; }) + " arsip";

    $("kpi-krs").textContent = u.formatNumber(count(krs, function (x) { return x.status === "diajukan"; }));

    var dinilai = kumpul.filter(function (p) { return p.nilai != null; });
    var avg = dinilai.length ? dinilai.reduce(function (n, p) { return n + p.nilai; }, 0) / dinilai.length : null;
    $("kpi-nilai").textContent = avg == null ? "-" : u.formatNumber(avg, 1);
    $("kpi-nilai-sub").textContent = dinilai.length + " dinilai · " + count(kumpul, function (p) { return p.status === "menunggu"; }) + " menunggu koreksi";

    var hadir = count(presensi, function (p) { return p.status === "hadir"; });
    $("kpi-hadir").textContent = presensi.length ? u.formatPercent(hadir, presensi.length) : "-";
    $("kpi-hadir-sub").textContent = count(kelas, function (k) { return k.status === "live"; }) + " sesi live · " + count(kelas, function (k) { return k.status === "terjadwal"; }) + " terjadwal";

    /* ---------- Grafik: tren KRS ---------- */
    var perHari = {};
    krs.forEach(function (x) { var d = x.diajukan_pada ? u.localDate(x.diajukan_pada) : ""; if (d) perHari[d] = (perHari[d] || 0) + 1; });
    var hari = Object.keys(perHari).sort();
    var kumulatif = 0;
    var dataKum = hari.map(function (d) { kumulatif += perHari[d]; return kumulatif; });
    var labelHari = hari.map(function (d) { return u.formatDate(d + "T12:00:00"); });
    draw("chart-krs", {
      data: {
        labels: labelHari,
        datasets: [
          { type: "bar", label: "Pengajuan per hari", data: hari.map(function (d) { return perHari[d]; }), backgroundColor: "#bfdbfe", borderRadius: 4, yAxisID: "y" },
          { type: "line", label: "Akumulasi", data: dataKum, borderColor: "#2563eb", backgroundColor: "#2563eb", tension: 0.3, pointRadius: 3, yAxisID: "y1" },
        ],
      },
      options: {
        interaction: { mode: "index", intersect: false },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: "Per hari" } },
          y1: { beginAtZero: true, position: "right", grid: { drawOnChartArea: false }, ticks: { precision: 0 }, title: { display: true, text: "Akumulasi" } },
        },
      },
    });
    srTable("data-krs", ["Tanggal", "Pengajuan", "Akumulasi"], hari.map(function (d, i) { return [labelHari[i], perHari[d], dataKum[i]]; }));

    /* ---------- Grafik: mahasiswa aktif per prodi ---------- */
    var perProdi = prodi.map(function (p) { return { nama: p.nama, n: count(aktif, function (m) { return m.prodi_id === p.id; }) }; })
      .filter(function (x) { return x.n > 0; }).sort(function (a, b) { return b.n - a.n; });
    draw("chart-prodi", {
      type: "doughnut",
      data: { labels: perProdi.map(function (x) { return x.nama; }), datasets: [{ data: perProdi.map(function (x) { return x.n; }), backgroundColor: COLORS, borderWidth: 2, borderColor: "#fff" }] },
      options: { cutout: "62%", plugins: { legend: { position: "bottom" } } },
    });
    srTable("data-prodi", ["Program studi", "Mahasiswa aktif"], perProdi.map(function (x) { return [x.nama, x.n]; }));

    /* ---------- Grafik: keterisian kursus ---------- */
    var terisiMap = {};
    krs.forEach(function (x) { if (x.status === "disetujui") terisiMap[x.kursus_id] = (terisiMap[x.kursus_id] || 0) + 1; });
    var isi = pub.map(function (k) { var t = terisiMap[k.id] || 0; return { kode: k.kode_mk, nama: k.nama, t: t, kuota: k.kuota, pct: k.kuota ? Math.round((t / k.kuota) * 1000) / 10 : 0 }; })
      .sort(function (a, b) { return b.pct - a.pct; });
    draw("chart-kursus", {
      type: "bar",
      data: {
        labels: isi.map(function (x) { return x.kode; }),
        datasets: [{ label: "Keterisian (%)", data: isi.map(function (x) { return x.pct; }), backgroundColor: isi.map(function (x) { return x.pct >= 100 ? "#ef4444" : x.pct >= 85 ? "#f59e0b" : "#2563eb"; }), borderRadius: 4 }],
      },
      options: {
        indexAxis: "y",
        scales: {
          // Skala menyesuaikan nilai tertinggi agar perbedaan antarkursus terlihat.
          x: { beginAtZero: true, max: Math.min(100, Math.ceil((Math.max.apply(null, isi.map(function (x) { return x.pct; }).concat([10])) + 5) / 10) * 10), ticks: { callback: function (v) { return v + "%"; } } },
          y: { grid: { display: false }, ticks: { font: { family: "JetBrains Mono, monospace" } } },
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: function (c) { var x = isi[c.dataIndex]; return " " + x.nama + ": " + x.t + "/" + x.kuota + " (" + x.pct + "%)"; } } },
        },
      },
    });
    srTable("data-kursus", ["Kode", "Kursus", "Terisi", "Kuota", "Persentase"], isi.map(function (x) { return [x.kode, x.nama, x.t, x.kuota, x.pct + "%"]; }));

    /* ---------- Aktivitas terbaru ---------- */
    $("log-list").innerHTML = logs.length ? logs.map(function (l) {
      var ic = AKSI_ICON[l.aksi] || AKSI_ICON.update;
      var a = adminMap[l.admin_id];
      return html`<li class="flex gap-3">
        <span class="material-symbols-outlined flex-shrink-0 rounded-lg p-1.5 text-[18px] ${ic[1]}" aria-hidden="true">${ic[0]}</span>
        <div class="min-w-0">
          <p class="text-sm text-slate-800">${l.deskripsi}</p>
          <p class="mt-0.5 text-xs text-slate-500">${a ? a.nama.split(",")[0] : "Sistem"} · <time datetime="${l.waktu}">${u.timeAgo(l.waktu)}</time></p>
        </div>
      </li>`.value;
    }).join("") : html`<li class="text-sm text-slate-500">Belum ada aktivitas.</li>`.value;

    /* ---------- Kursus teratas ---------- */
    var top = pub.map(function (k) {
      var nilai = krs.filter(function (x) { return x.kursus_id === k.id && x.nilai_akhir != null; }).map(function (x) { return x.nilai_akhir; });
      return { k: k, t: terisiMap[k.id] || 0, avg: nilai.length ? nilai.reduce(function (a, b) { return a + b; }, 0) / nilai.length : null };
    }).sort(function (a, b) { return b.t - a.t; }).slice(0, 5);
    $("top-kursus").innerHTML = top.map(function (x, i) {
      var d = dosenMap[x.k.instruktur_id];
      var prodiK = prodiMap[x.k.prodi_id] ? prodiMap[x.k.prodi_id].kode : null;
      return html`<a href="form.html?id=${encodeURIComponent(x.k.id)}" class="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
        <div class="relative aspect-video overflow-hidden">
          ${Nexus.cover.render(x.k, prodiK, "h-full w-full transition duration-300 group-hover:scale-[1.03]")}
          <span class="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-800 shadow"><span class="sr-only">Peringkat </span>#${i + 1}</span>
        </div>
        <div class="flex flex-1 flex-col p-4">
          <p class="font-mono text-[11px] text-slate-500">${x.k.kode_mk}</p>
          <p class="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-slate-900">${x.k.nama}</p>
          <p class="mt-1 truncate text-xs text-slate-500">${d ? d.nama : "-"}</p>
          <div class="mt-auto flex items-center justify-between pt-3 text-xs">
            <span class="inline-flex items-center gap-1 text-slate-600"><span class="material-symbols-outlined text-[16px] text-slate-400" aria-hidden="true">groups</span>${x.t} / ${x.k.kuota}</span>
            <span class="inline-flex items-center gap-1 font-semibold text-slate-800"><span class="material-symbols-outlined text-[16px] text-amber-500" aria-hidden="true">grade</span>${x.avg == null ? "-" : u.formatNumber(x.avg, 1)}</span>
          </div>
        </div>
      </a>`.value;
    }).join("");

    /* ---------- Sedang live & ringkasan banner ---------- */
    var live = kelas.filter(function (k) { return k.status === "live"; });
    var kursusMap = byId(kursus);
    $("live-section").classList.toggle("hidden", !live.length);
    $("live-list").innerHTML = live.slice(0, 4).map(function (s) {
      var k = kursusMap[s.kursus_id] || {}, d = dosenMap[k.instruktur_id];
      var pres = presensi.filter(function (p) { return p.kelas_virtual_id === s.id; });
      var hadir = pres.filter(function (p) { return p.status === "hadir"; }).length;
      var end = new Date(s.waktu_mulai).getTime() + s.durasi_menit * 60000;
      var sisa = Math.round((end - Date.now()) / 60000);
      return html`<article class="flex overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm ring-1 ring-red-100">
        <div class="relative w-32 flex-shrink-0 overflow-hidden sm:w-40">${Nexus.cover.render(k, prodiMap[k.prodi_id] && prodiMap[k.prodi_id].kode, "h-full w-full")}
          <span class="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow"><span class="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true"></span>Live</span></div>
        <div class="flex min-w-0 flex-1 flex-col p-3">
          <p class="font-mono text-[11px] text-slate-500">${k.kode_mk}</p>
          <p class="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">${s.judul}</p>
          <p class="mt-1 truncate text-xs text-slate-500">${d ? d.nama : "-"}</p>
          <div class="mt-auto flex items-center justify-between gap-2 pt-2 text-xs">
            <span class="${sisa > 0 ? "text-red-600" : "text-amber-700"} font-semibold">${sisa > 0 ? "Berakhir " + sisa + " menit lagi" : "Melewati jadwal"}</span>
            <span class="text-slate-600">${hadir} hadir</span>
          </div>
          <a href="${s.tautan}" target="_blank" rel="noopener noreferrer" class="mt-2 rounded-lg bg-blue-600 px-3 py-1.5 text-center text-xs font-semibold text-white hover:bg-blue-700">Masuk ↗</a>
        </div>
      </article>`.value;
    }).join("");

    var koreksi = count(kumpul, function (p) { return p.nilai == null; });
    var krsMenunggu = count(krs, function (x) { return x.status === "diajukan"; });
    $("ringkasan-hari").textContent = [
      live.length ? live.length + " sesi sedang live" : "Tidak ada sesi live",
      krsMenunggu + " KRS menunggu validasi",
      koreksi + " tugas menunggu koreksi",
    ].join(" · ");
  }

  render().catch(function (e) {
    ui.toast("Gagal memuat dashboard: " + e.message, "error");
    console.error(e);
  });
  ui.onDataChange(["*", "kursus", "mahasiswa", "krs"], function (d) { if (d.action === "sync" || d.action === "reset") render(); });
})();
