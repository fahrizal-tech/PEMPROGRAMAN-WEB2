/**
 * Mahasiswa: KPI, antrean validasi KRS, tabel mahasiswa, tambah/edit (modal),
 * detail KRS per mahasiswa, hapus, dan ekspor CSV.
 */
(function () {
  "use strict";

  var S = Nexus.services;
  var ui = Nexus.ui;
  var u = Nexus.utils;
  var html = ui.html;
  var $ = function (id) { return document.getElementById(id); };

  var db = {};
  var CURRENT_YEAR = new Date().getFullYear();

  function predikat(m) {
    if (!m.ipk) return ["Belum ada", "text-slate-400"];
    if (m.ipk < 2) return ["Perlu bimbingan", "text-red-600"];
    if (m.ipk <= 2.75) return ["Memuaskan", "text-amber-700"];
    if (m.ipk <= 3.5) return ["Sangat memuaskan", "text-blue-700"];
    return ["Dengan pujian", "text-emerald-700"];
  }

  /* ---------- Muat & gabungkan data ---------- */
  async function loadAll() {
    var r = await Promise.all([S.mahasiswa.list(), S.programStudi.list(), S.krs.list(), S.presensi.list(), S.kursus.list(), S.pengaturan.get("periode_aktif")]);
    db = { mhs: r[0], prodi: r[1], krs: r[2], presensi: r[3], kursus: r[4] };
    db.prodiMap = {}; db.prodi.forEach(function (p) { db.prodiMap[p.id] = p; });
    db.kursusMap = {}; db.kursus.forEach(function (k) { db.kursusMap[k.id] = k; });
    $("periode-aktif").textContent = r[5] || "-";

    if ($("f-prodi").options.length === 1) db.prodi.forEach(function (p) { $("f-prodi").add(new Option(p.nama, p.id)); });
    var years = db.mhs.map(function (m) { return m.angkatan; }).filter(function (y, i, a) { return a.indexOf(y) === i; }).sort().reverse();
    var fa = $("f-angkatan"), keep = fa.value;
    fa.length = 1;
    years.forEach(function (y) { fa.add(new Option("Angkatan " + y, y)); });
    fa.value = keep;

    db.rows = db.mhs.map(function (m) {
      var pres = db.presensi.filter(function (p) { return p.mahasiswa_id === m.id; });
      var hadir = pres.filter(function (p) { return p.status === "hadir"; }).length;
      var kehadiran = pres.length ? (hadir / pres.length) * 100 : null;
      var krsMhs = db.krs.filter(function (x) { return x.mahasiswa_id === m.id; });
      return Object.assign({}, m, {
        prodi: db.prodiMap[m.prodi_id] ? db.prodiMap[m.prodi_id].nama : "-",
        kehadiran: kehadiran,
        jumlahKrs: krsMhs.filter(function (x) { return x.status === "disetujui"; }).length,
        krsMenunggu: krsMhs.filter(function (x) { return x.status === "diajukan"; }).length,
        atensi: m.status === "aktif" && ((m.ipk > 0 && m.ipk < 2) || (kehadiran != null && kehadiran < 75)),
      });
    });
    renderKpi();
    renderQueue();
    return db.rows;
  }

  function renderKpi() {
    var rows = db.rows;
    var aktif = rows.filter(function (m) { return m.status === "aktif"; });
    var withIpk = aktif.filter(function (m) { return m.ipk > 0; });
    $("kpi-total").textContent = u.formatNumber(rows.length);
    $("kpi-total-sub").textContent = db.prodi.filter(function (p) { return rows.some(function (m) { return m.prodi_id === p.id; }); }).length + " program studi";
    $("kpi-aktif").textContent = u.formatNumber(aktif.length);
    $("kpi-aktif-sub").textContent = ["cuti", "nonaktif", "lulus"].map(function (s) { return rows.filter(function (m) { return m.status === s; }).length + " " + s; }).join(" · ");
    $("kpi-ipk").textContent = withIpk.length ? u.formatNumber(withIpk.reduce(function (n, m) { return n + m.ipk; }, 0) / withIpk.length, 2) : "-";
    $("kpi-atensi").textContent = rows.filter(function (m) { return m.atensi; }).length;
  }

  /* ---------- Antrean KRS ---------- */
  function terisi(kursusId) {
    return db.krs.filter(function (x) { return x.kursus_id === kursusId && x.status === "disetujui"; }).length;
  }

  function renderQueue() {
    var queue = db.krs.filter(function (x) { return x.status === "diajukan"; })
      .sort(function (a, b) { return String(a.diajukan_pada).localeCompare(String(b.diajukan_pada)); });
    $("krs-count").textContent = queue.length;
    $("btn-setujui-semua").disabled = !queue.length;
    var mhsMap = {}; db.mhs.forEach(function (m) { mhsMap[m.id] = m; });
    $("tabel-krs").innerHTML = queue.length ? queue.map(function (x) {
      var m = mhsMap[x.mahasiswa_id] || {}, k = db.kursusMap[x.kursus_id] || {};
      var t = terisi(x.kursus_id), full = t >= k.kuota;
      return html`<tr class="hover:bg-slate-50">
        <td class="px-4 py-3"><p class="font-medium text-slate-900">${m.nama}</p><p class="font-mono text-xs text-slate-500">${m.nim}${m.status !== "aktif" ? " · " + ui.statusLabel(m.status) : ""}</p></td>
        <td class="px-4 py-3"><span class="font-mono text-xs text-slate-500">${k.kode_mk}</span><p class="text-slate-800">${k.nama}</p></td>
        <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums ${full ? "font-semibold text-red-600" : "text-slate-700"}">${t} / ${k.kuota}${full ? " (penuh)" : ""}</td>
        <td class="whitespace-nowrap px-4 py-3 text-xs text-slate-600">${u.formatDate(x.diajukan_pada, true)}</td>
        <td class="whitespace-nowrap px-4 py-3 text-right">
          <button type="button" data-approve="${x.id}" class="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">Setujui</button>
          <button type="button" data-reject="${x.id}" class="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500">Tolak</button>
        </td>
      </tr>`.value;
    }).join("") : html`<tr><td colspan="5" class="px-4 py-8 text-center text-sm text-slate-500">
        <span class="material-symbols-outlined text-[28px] text-emerald-500" aria-hidden="true">task_alt</span>
        <p class="mt-1">Tidak ada KRS yang menunggu validasi.</p></td></tr>`.value;
  }

  async function approve(id) {
    try {
      await S.krs.approve(id);
      ui.toast("KRS disetujui.", "success");
    } catch (e) {
      ui.toast(e.message, "error");
    }
    await refreshAll();
  }

  async function reject(id) {
    var alasan = "";
    var ok = await new Promise(function (resolve) {
      var m = ui.modal({
        title: "Tolak KRS?",
        body: html`<label for="alasan-tolak" class="mb-1 block text-sm font-medium text-slate-700">Alasan penolakan (opsional)</label>
          <textarea id="alasan-tolak" rows="3" maxlength="200" class="block w-full rounded-lg border-slate-300 text-sm focus:border-red-500 focus:ring-red-500" placeholder="Contoh: prasyarat belum terpenuhi"></textarea>
          <p class="mt-2 text-xs text-slate-500">Alasan dicatat di log aktivitas.</p>`,
        onClose: function (v) { resolve(v === true); },
        actions: [
          { label: "Batal", variant: "secondary", value: false },
          { label: "Tolak KRS", variant: "danger", value: true, onClick: function () { alasan = document.getElementById("alasan-tolak").value.trim(); } },
        ],
      });
      return m;
    });
    if (!ok) return;
    try {
      await S.krs.reject(id, alasan);
      ui.toast("KRS ditolak.", "info");
    } catch (e) {
      ui.toast(e.message, "error");
    }
    await refreshAll();
  }

  $("tabel-krs").addEventListener("click", function (e) {
    var a = e.target.closest("[data-approve]"), r = e.target.closest("[data-reject]");
    if (a) approve(a.getAttribute("data-approve"));
    if (r) reject(r.getAttribute("data-reject"));
  });

  $("btn-setujui-semua").addEventListener("click", async function () {
    var queue = db.krs.filter(function (x) { return x.status === "diajukan"; });
    var ok = await ui.confirm({ title: "Setujui semua KRS?", message: queue.length + " pengajuan akan diproses. Pengajuan yang melebihi kuota atau milik mahasiswa tidak aktif akan dilewati.", confirmLabel: "Setujui semua" });
    if (!ok) return;
    var gagal = [];
    for (var i = 0; i < queue.length; i++) {
      try { await S.krs.approve(queue[i].id); } catch (e) { gagal.push(e.message); }
    }
    await refreshAll();
    var sukses = queue.length - gagal.length;
    if (!gagal.length) return ui.toast(sukses + " KRS disetujui.", "success");
    ui.modal({
      title: "Hasil validasi KRS",
      body: html`<p><strong class="text-emerald-700">${sukses} disetujui</strong>, <strong class="text-red-600">${gagal.length} dilewati</strong>:</p>
        <ul class="mt-2 max-h-60 list-disc space-y-1 overflow-y-auto pl-5">${gagal.map(function (g) { return html`<li>${g}</li>`; })}</ul>`,
      actions: [{ label: "Tutup", variant: "primary", autofocus: true }],
    });
  });

  /* ---------- Tabel mahasiswa ---------- */
  var table = ui.dataTable({
    tbody: $("tabel-mhs"),
    colspan: 8,
    pageSize: 10,
    load: loadAll,
    emptyText: "Belum ada data mahasiswa.",
    search: { input: $("f-cari"), fields: ["nama", "nim", "email"] },
    filters: [
      { el: $("f-prodi"), match: function (m, v) { return m.prodi_id === v; } },
      { el: $("f-angkatan"), match: function (m, v) { return String(m.angkatan) === v; } },
      { el: $("f-status"), match: function (m, v) { return v === "atensi" ? m.atensi : m.status === v; } },
    ],
    sortSelect: $("f-urut"),
    defaultSort: "nama",
    sorters: {
      nama: function (a, b) { return a.nama.localeCompare(b.nama, "id"); },
      nim: function (a, b) { return a.nim.localeCompare(b.nim); },
      ipk: function (a, b) { return b.ipk - a.ipk; },
      "ipk-asc": function (a, b) { return (a.ipk || 9) - (b.ipk || 9); },
    },
    counter: $("tabel-counter"),
    pager: $("tabel-pager"),
    render: function (m) {
      var p = predikat(m);
      var hadirCls = m.kehadiran == null ? "text-slate-400" : m.kehadiran < 75 ? "font-semibold text-red-600" : "text-slate-700";
      return html`<tr class="hover:bg-slate-50 ${m.atensi ? "bg-red-50/40" : ""}">
        <td class="px-4 py-3">
          <div class="flex items-center gap-3">
            <span class="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700" aria-hidden="true">${u.initials(m.nama)}</span>
            <div class="min-w-[12rem]">
              <p class="font-medium text-slate-900">${m.nama}${m.atensi ? html` <span class="material-symbols-outlined align-middle text-[16px] text-red-500" title="Perlu perhatian" aria-label="Perlu perhatian">warning</span>` : ""}</p>
              <p class="text-xs text-slate-500"><span class="font-mono">${m.nim}</span> · ${m.email}</p>
            </div>
          </div>
        </td>
        <td class="whitespace-nowrap px-4 py-3"><p class="text-slate-700">${m.prodi}</p><p class="text-xs text-slate-500">Angkatan ${m.angkatan}</p></td>
        <td class="px-4 py-3 text-right tabular-nums text-slate-700">${m.semester}</td>
        <td class="whitespace-nowrap px-4 py-3"><p class="font-semibold tabular-nums text-slate-900">${m.ipk ? u.formatNumber(m.ipk, 2) : "-"}</p><p class="text-xs ${p[1]}">${p[0]}</p></td>
        <td class="px-4 py-3 text-right tabular-nums ${hadirCls}">${m.kehadiran == null ? "-" : u.formatNumber(m.kehadiran, 1) + "%"}</td>
        <td class="whitespace-nowrap px-4 py-3 text-right">
          <button type="button" data-detail="${m.id}" class="rounded-lg px-2 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 hover:underline" aria-label="Lihat KRS ${m.nama}">${m.jumlahKrs}${m.krsMenunggu ? html` <span class="text-xs text-amber-700">(+${m.krsMenunggu})</span>` : ""}</button>
        </td>
        <td class="px-4 py-3">${ui.badge(m.status)}</td>
        <td class="whitespace-nowrap px-4 py-3 text-right">
          <button type="button" data-edit="${m.id}" class="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Edit ${m.nama}" title="Edit"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">edit</span></button>
          <button type="button" data-hapus="${m.id}" class="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500" aria-label="Hapus ${m.nama}" title="Hapus"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span></button>
        </td>
      </tr>`;
    },
  });

  function refreshAll() { return table.refresh(); }

  /* ---------- Tambah / edit ---------- */
  function formFields() {
    var prodiOpts = db.prodi.map(function (p) { return [p.id, p.nama + " (" + p.jenjang + ")"]; });
    return html`
      ${ui.field({ name: "nim", label: "NIM", required: true, placeholder: "2610511001", attrs: 'inputmode="numeric" maxlength="12" autocomplete="off"', help: "8–12 digit angka." })}
      ${ui.field({ name: "nama", label: "Nama lengkap", required: true, attrs: 'maxlength="100"' })}
      ${ui.field({ name: "email", label: "Email", type: "email", required: true, placeholder: "nama@student.nexus.ac.id", span: "sm:col-span-2" })}
      ${ui.field({ name: "prodi_id", label: "Program studi", type: "select", required: true, options: prodiOpts })}
      ${ui.field({ name: "angkatan", label: "Angkatan", type: "number", required: true, attrs: 'min="2000" max="' + (CURRENT_YEAR + 1) + '"' })}
      ${ui.field({ name: "semester", label: "Semester", type: "number", required: true, attrs: 'min="1" max="14"' })}
      ${ui.field({ name: "ipk", label: "IPK", type: "number", required: true, attrs: 'min="0" max="4" step="0.01"', help: "0,00 – 4,00. Isi 0 untuk mahasiswa baru." })}
      ${ui.field({ name: "status", label: "Status", type: "select", required: true, placeholder: false, options: [["aktif", "Aktif"], ["cuti", "Cuti"], ["nonaktif", "Nonaktif"], ["lulus", "Lulus"]], span: "sm:col-span-2" })}`;
  }

  async function openForm(m) {
    var saved = await ui.formModal({
      title: m ? "Edit Mahasiswa" : "Tambah Mahasiswa",
      fields: formFields(),
      service: S.mahasiswa,
      initial: m || { angkatan: CURRENT_YEAR, semester: 1, ipk: 0, status: "aktif" },
      save: function (data) { return m ? S.mahasiswa.update(m.id, data) : S.mahasiswa.create(data); },
      success: function (row) { return "Data " + row.nama + " berhasil " + (m ? "diperbarui" : "ditambahkan") + "."; },
    });
    if (saved) refreshAll();
  }

  /* ---------- Detail KRS mahasiswa ---------- */
  function openDetail(m) {
    var list = db.krs.filter(function (x) { return x.mahasiswa_id === m.id; });
    var modal = ui.modal({
      title: "KRS — " + m.nama,
      size: "lg",
      body: list.length ? html`
        <p class="mb-3 text-xs text-slate-500"><span class="font-mono">${m.nim}</span> · ${m.prodi} · Semester ${m.semester}</p>
        <ul class="divide-y divide-slate-100 rounded-lg border border-slate-200">
          ${list.map(function (x) {
            var k = db.kursusMap[x.kursus_id] || {};
            return html`<li class="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div><span class="font-mono text-xs text-slate-500">${k.kode_mk} · ${k.sks} SKS</span><p class="font-medium text-slate-800">${k.nama}</p>
                <p class="text-xs text-slate-500">${x.periode}${x.nilai_akhir != null ? " · Nilai akhir " + u.formatNumber(x.nilai_akhir, 1) : ""}</p></div>
              <div class="flex items-center gap-2">${ui.badge(x.status)}
                ${x.status === "diajukan" ? html`<button type="button" data-approve="${x.id}" class="rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-800">Setujui</button>
                  <button type="button" data-reject="${x.id}" class="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Tolak</button>` : ""}
              </div></li>`;
          })}
        </ul>
        <p class="mt-3 text-xs text-slate-500">Total SKS disetujui: <strong>${list.filter(function (x) { return x.status === "disetujui"; }).reduce(function (n, x) { return n + ((db.kursusMap[x.kursus_id] || {}).sks || 0); }, 0)}</strong></p>`
        : html`<p class="py-6 text-center text-sm text-slate-500">Mahasiswa ini belum memiliki KRS.</p>`,
      actions: [{ label: "Tutup", variant: "primary" }],
    });
    modal.el.addEventListener("click", function (e) {
      var a = e.target.closest("[data-approve]"), r = e.target.closest("[data-reject]");
      if (!a && !r) return;
      modal.close();
      if (a) approve(a.getAttribute("data-approve"));
      if (r) reject(r.getAttribute("data-reject"));
    });
  }

  /* ---------- Aksi tabel ---------- */
  $("tabel-mhs").addEventListener("click", async function (e) {
    var btn = e.target.closest("[data-edit],[data-hapus],[data-detail]");
    if (!btn) return;
    var id = btn.getAttribute("data-edit") || btn.getAttribute("data-hapus") || btn.getAttribute("data-detail");
    var m = db.rows.filter(function (r) { return r.id === id; })[0];
    if (!m) return;
    if (btn.hasAttribute("data-edit")) openForm(m);
    else if (btn.hasAttribute("data-detail")) openDetail(m);
    else if (await ui.confirmDelete(S.mahasiswa, m.id, m.nama + " (" + m.nim + ")")) refreshAll();
  });

  $("btn-tambah").addEventListener("click", function () { openForm(null); });
  $("btn-reset").addEventListener("click", function () { $("f-urut").value = "nama"; table.setSort("nama"); table.reset(); });

  $("btn-ekspor").addEventListener("click", function () {
    var rows = table.visible();
    if (!rows.length) return ui.toast("Tidak ada data untuk diekspor.", "warning");
    u.download("data-mahasiswa-" + u.localDate() + ".csv", u.toCSV(rows, [
      { label: "NIM", value: "nim" }, { label: "Nama", value: "nama" }, { label: "Email", value: "email" }, { label: "Program Studi", value: "prodi" },
      { label: "Angkatan", value: "angkatan" }, { label: "Semester", value: "semester" }, { label: "IPK", value: function (m) { return m.ipk ? m.ipk.toFixed(2) : ""; } },
      { label: "Kehadiran (%)", value: function (m) { return m.kehadiran == null ? "" : m.kehadiran.toFixed(1); } },
      { label: "KRS Disetujui", value: "jumlahKrs" }, { label: "Status", value: function (m) { return ui.statusLabel(m.status); } },
    ]), "text/csv;charset=utf-8");
    ui.toast(rows.length + " mahasiswa diekspor.", "success");
  });

  // Tautan dari dashboard (#krs) → gulir ke antrean.
  table.refresh().then(function () { if (location.hash === "#krs") $("krs").scrollIntoView({ block: "start" }); });
  ui.onDataChange(["mahasiswa", "krs"], function (d) { if (d.action === "sync" || d.action === "reset") refreshAll(); });
})();
