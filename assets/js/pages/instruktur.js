/**
 * Instruktur / Dosen: KPI, tabel dengan beban mengajar (BKD), tambah/edit (modal),
 * detail kursus yang diampu, hapus, dan ekspor CSV.
 */
(function () {
  "use strict";

  var S = Nexus.services;
  var ui = Nexus.ui;
  var u = Nexus.utils;
  var html = ui.html;
  var $ = function (id) { return document.getElementById(id); };

  var JABATAN = ["Asisten Ahli", "Lektor", "Lektor Kepala", "Guru Besar"];
  var BEBAN = {
    kurang: ["Di bawah 12 SKS", "border-amber-200 bg-amber-50 text-amber-700"],
    optimal: ["Optimal", "border-emerald-200 bg-emerald-50 text-emerald-700"],
    lebih: ["Lebih dari 16 SKS", "border-red-200 bg-red-50 text-red-700"],
  };
  var db = {};

  function statusBeban(sks) { return sks < 12 ? "kurang" : sks > 16 ? "lebih" : "optimal"; }

  async function loadAll() {
    var r = await Promise.all([S.instruktur.list(), S.programStudi.list(), S.kursus.list()]);
    db = { dosen: r[0], prodi: r[1], kursus: r[2] };
    db.prodiMap = {}; db.prodi.forEach(function (p) { db.prodiMap[p.id] = p; });
    if ($("f-prodi").options.length === 1) db.prodi.forEach(function (p) { $("f-prodi").add(new Option(p.nama, p.id)); });

    db.rows = db.dosen.map(function (d) {
      var diampu = db.kursus.filter(function (k) { return k.instruktur_id === d.id && k.status !== "arsip"; });
      var aktif = diampu.filter(function (k) { return k.status === "publikasi"; });
      var sks = aktif.reduce(function (n, k) { return n + k.sks; }, 0);
      return Object.assign({}, d, {
        prodi: db.prodiMap[d.prodi_id] ? db.prodiMap[d.prodi_id].nama : "-",
        diampu: diampu, sks: sks, beban: statusBeban(sks),
      });
    });
    renderKpi();
    return db.rows;
  }

  function renderKpi() {
    var rows = db.rows;
    var serdos = rows.filter(function (d) { return d.serdos; }).length;
    var edom = rows.filter(function (d) { return d.nilai_edom != null; });
    $("kpi-total").textContent = rows.length;
    $("kpi-total-sub").textContent = JABATAN.map(function (j) { return rows.filter(function (d) { return d.jabatan_akademik === j; }).length + " " + j; }).filter(function (t) { return !/^0 /.test(t); }).join(" · ");
    $("kpi-serdos").textContent = u.formatPercent(serdos, rows.length, 0);
    $("kpi-serdos-sub").textContent = serdos + " dari " + rows.length + " dosen";
    $("kpi-edom").textContent = edom.length ? u.formatNumber(edom.reduce(function (n, d) { return n + d.nilai_edom; }, 0) / edom.length, 2) : "-";
    $("kpi-beban").textContent = rows.length ? u.formatNumber(rows.reduce(function (n, d) { return n + d.sks; }, 0) / rows.length, 1) + " SKS" : "-";
    $("kpi-beban-sub").textContent = rows.filter(function (d) { return d.beban === "optimal"; }).length + " optimal · " + rows.filter(function (d) { return d.beban === "lebih"; }).length + " berlebih (ketentuan BKD 12–16 SKS)";
  }

  var table = ui.dataTable({
    tbody: $("tabel-dosen"),
    colspan: 7,
    pageSize: 10,
    load: loadAll,
    emptyText: "Belum ada data dosen.",
    search: { input: $("f-cari"), fields: ["nama", "nidn", "email", "bidang_keahlian"] },
    filters: [
      { el: $("f-prodi"), match: function (d, v) { return d.prodi_id === v; } },
      { el: $("f-jabatan"), match: function (d, v) { return d.jabatan_akademik === v; } },
      { el: $("f-serdos"), match: function (d, v) { return (v === "ya") === !!d.serdos; } },
      { el: $("f-beban"), match: function (d, v) { return d.beban === v; } },
    ],
    defaultSort: "nama",
    sorters: { nama: function (a, b) { return a.nama.replace(/^((Prof|Dr|Ir)\.?\s+)+/i, "").localeCompare(b.nama.replace(/^((Prof|Dr|Ir)\.?\s+)+/i, ""), "id"); } },
    counter: $("tabel-counter"),
    pager: $("tabel-pager"),
    render: function (d) {
      var b = BEBAN[d.beban];
      return html`<tr class="hover:bg-slate-50">
        <td class="px-4 py-3">
          <div class="flex items-center gap-3">
            <span class="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700" aria-hidden="true">${u.initials(d.nama)}</span>
            <div class="min-w-[13rem]"><p class="font-medium text-slate-900">${d.nama}</p><p class="text-xs text-slate-500"><span class="font-mono">NIDN ${d.nidn}</span> · ${d.email}</p></div>
          </div>
        </td>
        <td class="px-4 py-3"><p class="whitespace-nowrap text-slate-700">${d.prodi}</p><p class="text-xs text-slate-500">${d.bidang_keahlian || "-"}</p></td>
        <td class="whitespace-nowrap px-4 py-3 text-slate-700">${d.jabatan_akademik}</td>
        <td class="whitespace-nowrap px-4 py-3">
          <button type="button" data-detail="${d.id}" class="text-left hover:underline" aria-label="Lihat kursus yang diampu ${d.nama}">
            <span class="font-semibold tabular-nums text-slate-900">${d.sks} SKS</span> <span class="text-xs text-slate-500">· ${d.diampu.length} kursus</span>
          </button>
          <p class="mt-1"><span class="inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${b[1]}">${b[0]}</span></p>
        </td>
        <td class="px-4 py-3 text-right font-semibold tabular-nums ${d.nilai_edom != null && d.nilai_edom < 3 ? "text-red-600" : "text-slate-800"}">${d.nilai_edom != null ? u.formatNumber(d.nilai_edom, 2) : "-"}</td>
        <td class="px-4 py-3">${d.serdos ? ui.badge("terbit", "Serdos") : ui.badge("draft", "Belum")}</td>
        <td class="whitespace-nowrap px-4 py-3 text-right">
          <button type="button" data-edit="${d.id}" class="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Edit ${d.nama}" title="Edit"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">edit</span></button>
          <button type="button" data-hapus="${d.id}" class="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500" aria-label="Hapus ${d.nama}" title="Hapus"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span></button>
        </td>
      </tr>`;
    },
  });

  function formFields() {
    return html`
      ${ui.field({ name: "nidn", label: "NIDN", required: true, placeholder: "0012345678", attrs: 'inputmode="numeric" maxlength="10" autocomplete="off"', help: "10 digit angka." })}
      ${ui.field({ name: "nama", label: "Nama lengkap & gelar", required: true, placeholder: "Dr. Nama Dosen, M.Kom." })}
      ${ui.field({ name: "email", label: "Email", type: "email", required: true, placeholder: "nama@nexus.ac.id", span: "sm:col-span-2" })}
      ${ui.field({ name: "prodi_id", label: "Program studi", type: "select", required: true, options: db.prodi.map(function (p) { return [p.id, p.nama]; }) })}
      ${ui.field({ name: "jabatan_akademik", label: "Jabatan akademik", type: "select", required: true, options: JABATAN.map(function (j) { return [j, j]; }) })}
      ${ui.field({ name: "bidang_keahlian", label: "Bidang keahlian", placeholder: "Contoh: Rekayasa Perangkat Lunak", span: "sm:col-span-2" })}
      ${ui.field({ name: "nilai_edom", label: "Nilai EDOM", type: "number", attrs: 'min="0" max="4" step="0.01"', help: "Opsional, 0,00 – 4,00." })}
      ${ui.field({ name: "serdos", label: "Sudah memiliki sertifikat pendidik (Serdos)", type: "checkbox", span: "self-end pb-2" })}`;
  }

  async function openForm(d) {
    var saved = await ui.formModal({
      title: d ? "Edit Dosen" : "Tambah Dosen",
      fields: formFields(),
      service: S.instruktur,
      initial: d || { serdos: false },
      save: function (data) { return d ? S.instruktur.update(d.id, data) : S.instruktur.create(data); },
      success: function (row) { return "Data " + row.nama + " berhasil " + (d ? "diperbarui" : "ditambahkan") + "."; },
    });
    if (saved) table.refresh();
  }

  function openDetail(d) {
    ui.modal({
      title: "Kursus diampu — " + d.nama,
      size: "lg",
      body: d.diampu.length ? html`
        <ul class="divide-y divide-slate-100 rounded-lg border border-slate-200">
          ${d.diampu.map(function (k) {
            return html`<li class="flex items-center justify-between gap-3 p-3">
              <div><span class="font-mono text-xs text-slate-500">${k.kode_mk} · ${k.sks} SKS</span><p class="font-medium text-slate-800">${k.nama}</p></div>
              <div class="flex items-center gap-2">${ui.badge(k.status)}
                <a href="form.html?id=${encodeURIComponent(k.id)}" class="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600" aria-label="Buka ${k.kode_mk}"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">open_in_new</span></a></div>
            </li>`;
          })}
        </ul>
        <p class="mt-3 text-xs text-slate-500">Beban dihitung dari kursus berstatus publikasi: <strong>${d.sks} SKS</strong> (${BEBAN[d.beban][0].toLowerCase()}).</p>`
        : html`<p class="py-6 text-center text-sm text-slate-500">Dosen ini belum mengampu kursus.</p>`,
      actions: [{ label: "Tutup", variant: "primary" }],
    });
  }

  $("tabel-dosen").addEventListener("click", async function (e) {
    var btn = e.target.closest("[data-edit],[data-hapus],[data-detail]");
    if (!btn) return;
    var id = btn.getAttribute("data-edit") || btn.getAttribute("data-hapus") || btn.getAttribute("data-detail");
    var d = db.rows.filter(function (r) { return r.id === id; })[0];
    if (!d) return;
    if (btn.hasAttribute("data-edit")) openForm(d);
    else if (btn.hasAttribute("data-detail")) openDetail(d);
    else if (await ui.confirmDelete(S.instruktur, d.id, d.nama)) table.refresh();
  });

  $("btn-tambah").addEventListener("click", function () { openForm(null); });
  $("btn-reset").addEventListener("click", function () { table.reset(); });
  $("btn-ekspor").addEventListener("click", function () {
    var rows = table.visible();
    if (!rows.length) return ui.toast("Tidak ada data untuk diekspor.", "warning");
    u.download("data-dosen-" + u.localDate() + ".csv", u.toCSV(rows, [
      { label: "NIDN", value: "nidn" }, { label: "Nama", value: "nama" }, { label: "Email", value: "email" }, { label: "Program Studi", value: "prodi" },
      { label: "Jabatan", value: "jabatan_akademik" }, { label: "Bidang Keahlian", value: "bidang_keahlian" },
      { label: "Kursus Diampu", value: function (d) { return d.diampu.map(function (k) { return k.kode_mk; }).join(" "); } },
      { label: "Beban (SKS)", value: "sks" }, { label: "Status Beban", value: function (d) { return BEBAN[d.beban][0]; } },
      { label: "EDOM", value: function (d) { return d.nilai_edom == null ? "" : d.nilai_edom.toFixed(2); } }, { label: "Serdos", value: function (d) { return d.serdos ? "Ya" : "Tidak"; } },
    ]), "text/csv;charset=utf-8");
    ui.toast(rows.length + " dosen diekspor.", "success");
  });

  table.refresh();
  ui.onDataChange(["instruktur", "kursus"], function (d) { if (d.action === "sync" || d.action === "reset") table.refresh(); });
})();
