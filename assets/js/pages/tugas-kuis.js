/**
 * Tugas & Kuis: KPI, tabel asesmen, buat/edit (sisa bobot kursus), penilaian pengumpulan, ekspor nilai.
 */
(function () {
  "use strict";

  var S = Nexus.services;
  var ui = Nexus.ui;
  var u = Nexus.utils;
  var html = ui.html;
  var $ = function (id) { return document.getElementById(id); };

  var JENIS = { tugas: "Tugas", kuis: "Kuis", uts: "UTS", uas: "UAS" };
  var PLAGIAT_BATAS = 20;
  var db = {};

  function sisaWaktu(iso) {
    var ms = new Date(iso) - new Date();
    if (ms <= 0) return ["Tenggat lewat", "text-slate-500"];
    var jam = Math.floor(ms / 3600000);
    if (jam < 24) return [jam + " jam lagi", "font-semibold text-red-600"];
    var hari = Math.floor(jam / 24);
    return [hari + " hari lagi", hari <= 3 ? "font-semibold text-amber-700" : "text-slate-600"];
  }

  function terlambat(p, t) { return p.dikumpulkan_pada && p.dikumpulkan_pada > t.deadline; }

  async function loadAll() {
    var r = await Promise.all([S.tugasKuis.list(), S.kursus.list(), S.krs.list(), S.pengumpulan.list(), S.mahasiswa.list()]);
    db = { tugas: r[0], kursus: r[1], krs: r[2], kumpul: r[3], mhs: r[4] };
    db.kursusMap = {}; db.kursus.forEach(function (k) { db.kursusMap[k.id] = k; });
    db.mhsMap = {}; db.mhs.forEach(function (m) { db.mhsMap[m.id] = m; });

    var fk = $("f-kursus");
    if (fk.options.length === 1) {
      db.kursus.filter(function (k) { return db.tugas.some(function (t) { return t.kursus_id === k.id; }) || k.status === "publikasi"; })
        .sort(function (a, b) { return a.kode_mk.localeCompare(b.kode_mk); })
        .forEach(function (k) { fk.add(new Option(k.kode_mk + " — " + k.nama, k.id)); });
    }

    db.rows = db.tugas.map(function (t) {
      var k = db.kursusMap[t.kursus_id] || {};
      var peserta = db.krs.filter(function (x) { return x.kursus_id === t.kursus_id && x.status === "disetujui"; }).length;
      var sub = db.kumpul.filter(function (p) { return p.tugas_id === t.id; });
      return Object.assign({}, t, {
        kode: k.kode_mk, kursus: k.nama, peserta: peserta,
        terkumpul: sub.length, menunggu: sub.filter(function (p) { return p.nilai == null; }).length,
        plagiat: sub.filter(function (p) { return p.skor_plagiarisme > PLAGIAT_BATAS; }).length,
        totalBobot: db.tugas.filter(function (x) { return x.kursus_id === t.kursus_id; }).reduce(function (n, x) { return n + x.bobot_persen; }, 0),
      });
    });
    renderKpi();
    return db.rows;
  }

  function renderKpi() {
    var aktif = db.rows.filter(function (t) { return t.status === "aktif"; });
    $("kpi-aktif").textContent = aktif.length;
    $("kpi-aktif-sub").textContent = db.rows.filter(function (t) { return t.status === "draft"; }).length + " draft · " + db.rows.filter(function (t) { return t.status === "ditutup"; }).length + " ditutup";
    $("kpi-koreksi").textContent = db.kumpul.filter(function (p) { return p.nilai == null; }).length;
    var dibuka = db.rows.filter(function (t) { return t.status !== "draft"; });
    var kumpul = dibuka.reduce(function (n, t) { return n + t.terkumpul; }, 0), target = dibuka.reduce(function (n, t) { return n + t.peserta; }, 0);
    $("kpi-kumpul").textContent = target ? u.formatPercent(kumpul, target) : "-";
    $("kpi-kumpul-sub").textContent = kumpul + " dari " + target + " pengumpulan yang diharapkan";
    var skor = db.kumpul.map(function (p) { return p.skor_plagiarisme; });
    $("kpi-plagiat").textContent = skor.length ? u.formatNumber(skor.reduce(function (a, b) { return a + b; }, 0) / skor.length, 1) + "%" : "-";
    $("kpi-plagiat-sub").textContent = skor.filter(function (s) { return s > PLAGIAT_BATAS; }).length + " pengumpulan di atas " + PLAGIAT_BATAS + "%";
  }

  var table = ui.dataTable({
    tbody: $("tabel-tugas"),
    colspan: 7,
    pageSize: 10,
    load: loadAll,
    emptyText: "Belum ada asesmen. Klik \"Buat Asesmen\" untuk menambahkan.",
    search: { input: $("f-cari"), fields: ["judul", "kode", "kursus"] },
    filters: [
      { el: $("f-kursus"), match: function (t, v) { return t.kursus_id === v; } },
      { el: $("f-jenis"), match: function (t, v) { return t.jenis === v; } },
      { el: $("f-status"), match: function (t, v) { return t.status === v; } },
    ],
    defaultSort: "deadline",
    sorters: { deadline: function (a, b) { var o = { aktif: 0, draft: 1, ditutup: 2 }; return o[a.status] - o[b.status] || a.deadline.localeCompare(b.deadline); } },
    counter: $("tabel-counter"),
    pager: $("tabel-pager"),
    render: function (t) {
      var sisa = t.status === "aktif" ? sisaWaktu(t.deadline) : null;
      var pct = t.peserta ? Math.min(100, Math.round((t.terkumpul / t.peserta) * 100)) : 0;
      return html`<tr class="align-top hover:bg-slate-50">
        <td class="px-4 py-3"><p class="min-w-[15rem] font-medium text-slate-900">${t.judul}</p><p class="text-xs text-slate-500"><span class="font-mono">${t.kode}</span> ${t.kursus}</p></td>
        <td class="whitespace-nowrap px-4 py-3"><p class="text-slate-700">${JENIS[t.jenis]}</p><p class="text-xs text-slate-500">Bobot ${t.bobot_persen}% · total kursus ${t.totalBobot}%</p></td>
        <td class="whitespace-nowrap px-4 py-3"><p class="text-slate-700">${u.formatDate(t.deadline, true)}</p>${sisa ? html`<p class="text-xs ${sisa[1]}">${sisa[0]}</p>` : ""}</td>
        <td class="px-4 py-3">${t.status === "draft" ? html`<span class="text-xs text-slate-500">Belum dibuka</span>` : html`
          <div class="w-36"><div class="flex justify-between text-xs"><span class="font-semibold text-slate-800">${t.terkumpul} / ${t.peserta}</span><span class="text-slate-500">${pct}%</span></div>
          <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full bg-emerald-500" style="width:${pct}%"></div></div></div>`}</td>
        <td class="whitespace-nowrap px-4 py-3">${t.terkumpul ? html`
          <button type="button" data-nilai="${t.id}" class="text-left text-sm hover:underline" aria-label="Beri nilai ${t.judul}">
            ${t.menunggu ? html`<span class="font-semibold text-amber-700">${t.menunggu} menunggu</span>` : html`<span class="text-emerald-700">Semua dinilai</span>`}
          </button>${t.plagiat ? html`<p class="text-xs text-red-600">${t.plagiat} plagiarisme &gt; ${PLAGIAT_BATAS}%</p>` : ""}` : html`<span class="text-xs text-slate-400">-</span>`}</td>
        <td class="px-4 py-3">${ui.badge(t.status)}</td>
        <td class="whitespace-nowrap px-4 py-3 text-right">
          ${t.terkumpul ? html`<button type="button" data-nilai="${t.id}" class="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700">Nilai</button>` : ""}
          <button type="button" data-edit="${t.id}" class="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Edit ${t.judul}" title="Edit"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">edit</span></button>
          <button type="button" data-hapus="${t.id}" class="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500" aria-label="Hapus ${t.judul}" title="Hapus"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span></button>
        </td>
      </tr>`;
    },
  });

  /* ---------- Buat / edit ---------- */
  function sisaBobot(kursusId, exceptId) {
    return 100 - db.tugas.filter(function (t) { return t.kursus_id === kursusId && t.id !== exceptId; }).reduce(function (n, t) { return n + t.bobot_persen; }, 0);
  }

  async function openForm(t) {
    var opts = db.kursus.filter(function (k) { return k.status === "publikasi" || (t && k.id === t.kursus_id); })
      .map(function (k) { return [k.id, k.kode_mk + " — " + k.nama]; });
    var saved = await ui.formModal({
      title: t ? "Edit Asesmen" : "Buat Asesmen Baru",
      service: S.tugasKuis,
      initial: t ? Object.assign({}, t, { deadline: String(t.deadline).slice(0, 16) }) : { jenis: "tugas", status: "draft" },
      fields: html`
        ${ui.field({ name: "kursus_id", label: "Kursus", type: "select", required: true, options: opts, span: "sm:col-span-2" })}
        ${ui.field({ name: "judul", label: "Judul asesmen", required: true, placeholder: "Contoh: Tugas 04 — Implementasi REST API", span: "sm:col-span-2" })}
        ${ui.field({ name: "jenis", label: "Jenis", type: "select", required: true, placeholder: false, options: [["tugas", "Tugas"], ["kuis", "Kuis"], ["uts", "UTS"], ["uas", "UAS"]] })}
        ${ui.field({ name: "bobot_persen", label: "Bobot nilai (%)", type: "number", required: true, attrs: 'min="1" max="100"', help: "Pilih kursus untuk melihat sisa bobot." })}
        ${ui.field({ name: "deadline", label: "Tenggat pengumpulan", type: "datetime-local", required: true })}
        ${ui.field({ name: "status", label: "Status", type: "select", required: true, placeholder: false, options: [["draft", "Draft"], ["aktif", "Aktif (dibuka)"], ["ditutup", "Ditutup"]] })}`,
      onOpen: function (form) {
        var k = form.elements.namedItem("kursus_id");
        var help = form.querySelector("#fld-bobot_persen").parentNode.querySelector("p.text-slate-500");
        function update() {
          if (!k.value) { help.textContent = "Pilih kursus untuk melihat sisa bobot."; return; }
          var sisa = sisaBobot(k.value, t && t.id);
          help.textContent = "Sisa bobot kursus ini: " + sisa + "% (total maksimal 100%).";
          help.className = "mt-1 text-xs " + (sisa <= 0 ? "text-red-600" : "text-slate-500");
        }
        k.addEventListener("change", update);
        update();
      },
      save: function (data) { return t ? S.tugasKuis.update(t.id, data) : S.tugasKuis.create(data); },
      success: function (row) { return "Asesmen \"" + row.judul + "\" berhasil " + (t ? "diperbarui" : "dibuat") + "."; },
    });
    if (saved) table.refresh();
  }

  /* ---------- Penilaian ---------- */
  function openNilai(t) {
    var list = db.kumpul.filter(function (p) { return p.tugas_id === t.id; })
      .map(function (p) { return Object.assign({}, p, { mhs: db.mhsMap[p.mahasiswa_id] || {} }); })
      .sort(function (a, b) { return (a.nilai == null ? 0 : 1) - (b.nilai == null ? 0 : 1) || a.mhs.nama.localeCompare(b.mhs.nama, "id"); });
    var m = ui.modal({
      title: "Penilaian — " + t.judul,
      size: "lg",
      body: html`
        <p class="mb-3 text-xs text-slate-500">${t.kode} · Tenggat ${u.formatDate(t.deadline, true)} · ${list.length} pengumpulan. Isi nilai 0–100, kosongkan bila belum dinilai.</p>
        <ul class="divide-y divide-slate-100 rounded-lg border border-slate-200">
          ${list.map(function (p) {
            var late = terlambat(p, t), plag = p.skor_plagiarisme > PLAGIAT_BATAS;
            return html`<li class="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0">
                <p class="font-medium text-slate-800">${p.mhs.nama}</p>
                <p class="text-xs text-slate-500"><span class="font-mono">${p.mhs.nim}</span> · dikumpulkan ${u.formatDate(p.dikumpulkan_pada, true)}
                  ${late ? html` · <span class="font-semibold text-amber-700">terlambat</span>` : ""}</p>
                <p class="text-xs ${plag ? "font-semibold text-red-600" : "text-slate-500"}">Plagiarisme ${p.skor_plagiarisme}%${plag ? " — perlu ditinjau" : ""}</p>
              </div>
              <div class="flex items-center gap-2">
                <label for="nilai-${p.id}" class="sr-only">Nilai ${p.mhs.nama}</label>
                <input id="nilai-${p.id}" data-kumpul="${p.id}" data-awal="${p.nilai == null ? "" : p.nilai}" type="number" min="0" max="100" step="0.5" inputmode="decimal"
                  value="${p.nilai == null ? "" : p.nilai}" placeholder="-" class="w-24 rounded-lg border-slate-300 text-right text-sm focus:border-blue-500 focus:ring-blue-500">
                ${ui.badge(p.status)}
              </div>
            </li>`;
          })}
        </ul>`,
      actions: [
        { label: "Batal", variant: "secondary" },
        { label: "Simpan Nilai", variant: "primary", onClick: async function () {
          var inputs = Array.prototype.slice.call(m.el.querySelectorAll("[data-kumpul]"));
          var changed = inputs.filter(function (i) { return i.value.trim() !== "" && i.value.trim() !== i.getAttribute("data-awal"); });
          var invalid = changed.filter(function (i) { var v = Number(i.value.replace(",", ".")); return isNaN(v) || v < 0 || v > 100; });
          inputs.forEach(function (i) { i.classList.toggle("border-red-400", invalid.indexOf(i) !== -1); i.setAttribute("aria-invalid", invalid.indexOf(i) !== -1 ? "true" : "false"); });
          if (invalid.length) { ui.toast(invalid.length + " nilai di luar rentang 0–100.", "error"); invalid[0].focus(); return false; }
          if (!changed.length) { ui.toast("Tidak ada nilai yang diubah.", "info"); return; }
          for (var i = 0; i < changed.length; i++) await S.tugasKuis.grade(changed[i].getAttribute("data-kumpul"), changed[i].value);
          ui.toast(changed.length + " nilai disimpan.", "success");
          table.refresh();
        } },
      ],
    });
  }

  /* ---------- Aksi ---------- */
  $("tabel-tugas").addEventListener("click", async function (e) {
    var btn = e.target.closest("[data-edit],[data-hapus],[data-nilai]");
    if (!btn) return;
    var id = btn.getAttribute("data-edit") || btn.getAttribute("data-hapus") || btn.getAttribute("data-nilai");
    var t = db.rows.filter(function (r) { return r.id === id; })[0];
    if (!t) return;
    if (btn.hasAttribute("data-edit")) return openForm(t);
    if (btn.hasAttribute("data-nilai")) return openNilai(t);
    if (await ui.confirmDelete(S.tugasKuis, t.id, "Asesmen \"" + t.judul + "\"")) table.refresh();
  });

  $("btn-tambah").addEventListener("click", function () { openForm(null); });
  $("btn-reset").addEventListener("click", function () { table.reset(); });
  $("btn-ekspor").addEventListener("click", function () {
    var tugasIds = table.visible().map(function (t) { return t.id; });
    var rows = db.kumpul.filter(function (p) { return tugasIds.indexOf(p.tugas_id) !== -1; }).map(function (p) {
      var t = db.rows.filter(function (x) { return x.id === p.tugas_id; })[0], m = db.mhsMap[p.mahasiswa_id] || {};
      return { kode: t.kode, judul: t.judul, jenis: JENIS[t.jenis], nim: m.nim, nama: m.nama, waktu: u.formatDate(p.dikumpulkan_pada, true), terlambat: terlambat(p, t) ? "Ya" : "Tidak", plagiat: p.skor_plagiarisme, nilai: p.nilai == null ? "" : p.nilai };
    });
    if (!rows.length) return ui.toast("Tidak ada pengumpulan untuk diekspor.", "warning");
    u.download("nilai-asesmen-" + new Date().toISOString().slice(0, 10) + ".csv", u.toCSV(rows, [
      { label: "Kode MK", value: "kode" }, { label: "Asesmen", value: "judul" }, { label: "Jenis", value: "jenis" }, { label: "NIM", value: "nim" },
      { label: "Nama", value: "nama" }, { label: "Dikumpulkan", value: "waktu" }, { label: "Terlambat", value: "terlambat" },
      { label: "Plagiarisme (%)", value: "plagiat" }, { label: "Nilai", value: "nilai" },
    ]), "text/csv;charset=utf-8");
    ui.toast(rows.length + " baris nilai diekspor.", "success");
  });

  table.refresh();
  ui.onDataChange(["tugas_kuis", "pengumpulan"], function (d) { if (d.action === "sync" || d.action === "reset") table.refresh(); });
})();
