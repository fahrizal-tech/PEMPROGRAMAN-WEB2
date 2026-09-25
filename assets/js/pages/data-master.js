/**
 * Data Master Kursus: ringkasan, filter, tabel, hapus, dan ekspor CSV.
 */
(function () {
  "use strict";

  var S = Nexus.services;
  var ui = Nexus.ui;
  var u = Nexus.utils;
  var html = ui.html;
  var $ = function (id) { return document.getElementById(id); };

  var lookup = { prodi: {}, dosen: {} };
  var TINGKAT = { dasar: "Dasar", menengah: "Menengah", lanjut: "Lanjut" };

  /** Gabungkan kursus dengan data relasi yang ditampilkan. */
  async function load() {
    var r = await Promise.all([S.kursus.list(), S.programStudi.list(), S.instruktur.list(), S.krs.list(), S.modul.list(), S.tugasKuis.list(), S.pengaturan.get("periode_aktif")]);
    var kursus = r[0], krs = r[3], modul = r[4], tugas = r[5];
    r[1].forEach(function (p) { lookup.prodi[p.id] = p; });
    r[2].forEach(function (d) { lookup.dosen[d.id] = d; });
    $("periode-aktif").textContent = r[6] || "-";
    fillProdiFilter(r[1]);

    var rows = kursus.map(function (k) {
      var dosen = lookup.dosen[k.instruktur_id];
      return Object.assign({}, k, {
        prodi: lookup.prodi[k.prodi_id] ? lookup.prodi[k.prodi_id].nama : "-",
        dosen: dosen ? dosen.nama : "-",
        nidn: dosen ? dosen.nidn : "",
        terisi: krs.filter(function (x) { return x.kursus_id === k.id && x.status === "disetujui"; }).length,
        menunggu: krs.filter(function (x) { return x.kursus_id === k.id && x.status === "diajukan"; }).length,
        jumlahModul: modul.filter(function (m) { return m.kursus_id === k.id; }).length,
        jumlahTugas: tugas.filter(function (t) { return t.kursus_id === k.id; }).length,
      });
    });
    renderKpi(rows);
    return rows;
  }

  function fillProdiFilter(prodi) {
    var sel = $("f-prodi");
    if (sel.options.length > 1) return;
    prodi.forEach(function (p) { sel.add(new Option(p.nama, p.id)); });
  }

  function renderKpi(rows) {
    var by = function (s) { return rows.filter(function (k) { return k.status === s; }); };
    var pub = by("publikasi");
    $("kpi-total").textContent = u.formatNumber(rows.length);
    $("kpi-total-sub").textContent = u.formatNumber(rows.reduce(function (n, k) { return n + k.sks; }, 0)) + " SKS · " + u.formatNumber(rows.reduce(function (n, k) { return n + k.jumlahModul; }, 0)) + " modul";
    $("kpi-publikasi").textContent = u.formatNumber(pub.length);
    var kuota = pub.reduce(function (n, k) { return n + k.kuota; }, 0);
    var terisi = pub.reduce(function (n, k) { return n + k.terisi; }, 0);
    $("kpi-publikasi-sub").textContent = "Keterisian " + u.formatPercent(terisi, kuota) + " (" + u.formatNumber(terisi) + "/" + u.formatNumber(kuota) + ")";
    $("kpi-draft").textContent = u.formatNumber(by("draft").length);
    $("kpi-arsip").textContent = u.formatNumber(by("arsip").length);
  }

  function kuotaBar(k) {
    var pct = k.kuota ? Math.min(100, Math.round((k.terisi / k.kuota) * 100)) : 0;
    var color = pct >= 100 ? "bg-red-500" : pct >= 85 ? "bg-amber-500" : "bg-blue-600";
    return html`<div class="w-40">
      <div class="flex justify-between text-xs"><span class="font-semibold text-slate-800">${k.terisi} / ${k.kuota}</span><span class="text-slate-500">${pct}%</span></div>
      <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Keterisian ${k.kode_mk}">
        <div class="h-full rounded-full ${color}" style="width:${pct}%"></div>
      </div>
      ${k.menunggu ? html`<p class="mt-1 text-[11px] text-amber-700">${k.menunggu} KRS menunggu</p>` : ""}
    </div>`;
  }

  function renderRow(k) {
    return html`<tr class="align-top hover:bg-slate-50">
      <td class="px-4 py-3">
        <div class="flex items-start gap-3">
          <span class="whitespace-nowrap rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-xs font-medium text-slate-700">${k.kode_mk}</span>
          <div class="min-w-[14rem]">
            <p class="font-semibold text-slate-900">${k.nama}</p>
            <p class="mt-0.5 line-clamp-2 text-xs text-slate-500">${k.deskripsi}</p>
          </div>
        </div>
      </td>
      <td class="whitespace-nowrap px-4 py-3">
        <p class="text-slate-700">${k.prodi}</p>
        <p class="mt-0.5 text-xs text-slate-500">${TINGKAT[k.tingkat] || k.tingkat} · ${k.sks} SKS</p>
      </td>
      <td class="px-4 py-3">
        <div class="flex items-center gap-2.5">
          <span class="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700" aria-hidden="true">${u.initials(k.dosen)}</span>
          <div class="min-w-[10rem]">
            <p class="text-slate-800">${k.dosen}</p>
            <p class="font-mono text-[11px] text-slate-500">NIDN ${k.nidn}</p>
          </div>
        </div>
      </td>
      <td class="px-4 py-3">${kuotaBar(k)}</td>
      <td class="whitespace-nowrap px-4 py-3 text-slate-600">${k.jumlahModul} modul · ${k.jumlahTugas} tugas</td>
      <td class="px-4 py-3">${ui.badge(k.status)}</td>
      <td class="whitespace-nowrap px-4 py-3 text-right">
        <a href="form.html?id=${encodeURIComponent(k.id)}" class="inline-flex rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Edit ${k.kode_mk}" title="Edit">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">edit</span>
        </a>
        <button type="button" data-hapus="${k.id}" class="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500" aria-label="Hapus ${k.kode_mk}" title="Hapus">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
        </button>
      </td>
    </tr>`;
  }

  /* ---------- Kartu katalog ---------- */
  var TINGKAT_STYLE = { dasar: "bg-emerald-600", menengah: "bg-amber-600", lanjut: "bg-rose-600" };

  function renderCard(k) {
    var pct = k.kuota ? Math.min(100, Math.round((k.terisi / k.kuota) * 100)) : 0;
    var bar = pct >= 100 ? "bg-red-500" : pct >= 85 ? "bg-amber-500" : "bg-blue-600";
    var prodi = lookup.prodi[k.prodi_id];
    return html`<article class="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <a href="form.html?id=${encodeURIComponent(k.id)}" class="relative block aspect-video overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500" aria-label="Buka ${k.kode_mk} ${k.nama}">
        ${Nexus.cover.render(k, prodi && prodi.kode, "h-full w-full transition duration-300 group-hover:scale-[1.03]")}
        <span class="absolute right-3 top-3">${ui.badge(k.status)}</span>
        <span class="absolute bottom-3 left-3 rounded-md ${TINGKAT_STYLE[k.tingkat] || "bg-slate-700"} px-2 py-1 text-[11px] font-semibold text-white shadow">${TINGKAT[k.tingkat] || k.tingkat}</span>
        <span class="absolute bottom-3 right-3 rounded-md bg-white/95 px-2 py-1 text-[11px] font-semibold text-slate-700 shadow">${k.sks} SKS</span>
      </a>
      <div class="flex flex-1 flex-col p-4">
        <p class="text-[11px] font-medium text-slate-500"><span class="font-mono">${k.kode_mk}</span> · ${k.prodi}</p>
        <h3 class="mt-1 line-clamp-2 font-semibold leading-snug text-slate-900">${k.nama}</h3>
        <p class="mt-1 line-clamp-2 text-xs text-slate-500">${k.deskripsi}</p>
        <div class="mt-3 flex items-center gap-2">
          <span class="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-700" aria-hidden="true">${u.initials(k.dosen)}</span>
          <span class="truncate text-xs text-slate-700">${k.dosen}</span>
        </div>
        <div class="mt-3">
          <div class="flex justify-between text-xs"><span class="text-slate-500">Kuota terisi</span><span class="font-semibold text-slate-800">${k.terisi} / ${k.kuota}</span></div>
          <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Keterisian ${k.kode_mk}"><div class="h-full rounded-full ${bar}" style="width:${pct}%"></div></div>
          ${k.menunggu ? html`<p class="mt-1 text-[11px] text-amber-700">${k.menunggu} KRS menunggu validasi</p>` : ""}
        </div>
        <div class="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <span class="inline-flex items-center gap-3 text-xs text-slate-500">
            <span class="inline-flex items-center gap-1"><span class="material-symbols-outlined text-[16px]" aria-hidden="true">view_list</span>${k.jumlahModul} modul</span>
            <span class="inline-flex items-center gap-1"><span class="material-symbols-outlined text-[16px]" aria-hidden="true">assignment</span>${k.jumlahTugas} tugas</span>
          </span>
          <span class="flex">
            <a href="form.html?id=${encodeURIComponent(k.id)}" class="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Edit ${k.kode_mk}" title="Edit"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">edit</span></a>
            <button type="button" data-hapus="${k.id}" class="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500" aria-label="Hapus ${k.kode_mk}" title="Hapus"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span></button>
          </span>
        </div>
      </div>
    </article>`;
  }

  var table = ui.dataTable({
    tbody: $("tabel-kursus"),
    colspan: 7,
    pageSize: 12,
    cards: { container: $("kartu-kursus"), render: renderCard, emptyTitle: "Belum ada kursus" },
    load: load,
    render: renderRow,
    emptyText: "Belum ada kursus. Klik \"Tambah Kursus Baru\" untuk memulai.",
    search: { input: $("f-cari"), fields: ["kode_mk", "nama", "dosen", "prodi"] },
    filters: [
      { el: $("f-prodi"), match: function (k, v) { return k.prodi_id === v; } },
      { el: $("f-tingkat"), match: function (k, v) { return k.tingkat === v; } },
      { el: $("f-status"), match: function (k, v) { return k.status === v; } },
    ],
    sortSelect: $("f-urut"),
    defaultSort: "kode",
    sorters: {
      kode: function (a, b) { return a.kode_mk.localeCompare(b.kode_mk); },
      nama: function (a, b) { return a.nama.localeCompare(b.nama, "id"); },
      terisi: function (a, b) { return b.terisi / b.kuota - a.terisi / a.kuota; },
      terbaru: function (a, b) { return String(b.diubah_pada || "").localeCompare(String(a.diubah_pada || "")); },
    },
    counter: $("tabel-counter"),
    pager: $("tabel-pager"),
  });

  // Hapus (delegasi event pada tbody)
  async function onHapus(e) {
    var btn = e.target.closest("[data-hapus]");
    if (!btn) return;
    var k = table.rows().filter(function (r) { return r.id === btn.getAttribute("data-hapus"); })[0];
    if (k && (await ui.confirmDelete(S.kursus, k.id, "Kursus " + k.kode_mk + " " + k.nama))) table.refresh();
  }
  $("tabel-kursus").addEventListener("click", onHapus);
  $("kartu-kursus").addEventListener("click", onHapus);

  $("btn-reset").addEventListener("click", function () {
    $("f-urut").value = "kode";
    table.setSort("kode");
    table.reset();
  });

  $("btn-ekspor").addEventListener("click", function () {
    var rows = table.visible();
    if (!rows.length) return ui.toast("Tidak ada data untuk diekspor.", "warning");
    var csv = u.toCSV(rows, [
      { label: "Kode MK", value: "kode_mk" }, { label: "Nama Kursus", value: "nama" }, { label: "Program Studi", value: "prodi" },
      { label: "Tingkat", value: function (k) { return TINGKAT[k.tingkat]; } }, { label: "SKS", value: "sks" },
      { label: "Dosen Pengampu", value: "dosen" }, { label: "Kuota", value: "kuota" }, { label: "Terisi", value: "terisi" },
      { label: "Jumlah Modul", value: "jumlahModul" }, { label: "Periode", value: "periode" },
      { label: "Status", value: function (k) { return ui.statusLabel(k.status); } },
    ]);
    u.download("data-kursus-" + u.localDate() + ".csv", csv, "text/csv;charset=utf-8");
    ui.toast(rows.length + " kursus diekspor ke CSV.", "success");
  });

  ui.viewToggle($("view-toggle"), {
    key: "data-master",
    onChange: function (mode) {
      $("kartu-kursus").classList.toggle("hidden", mode !== "kartu");
      $("tabel-wrap").classList.toggle("hidden", mode !== "tabel");
      table.setMode(mode);
    },
  });
  table.refresh();
  ui.onDataChange(["kursus", "krs", "modul", "tugas_kuis"], function (d) { if (d.action === "sync" || d.action === "reset") table.refresh(); });
})();
