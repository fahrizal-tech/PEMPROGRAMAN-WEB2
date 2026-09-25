/**
 * Sertifikasi Digital: terbitkan (hanya yang lulus), TTE, cabut, verifikasi, pratinjau & cetak.
 */
(function () {
  "use strict";

  var S = Nexus.services;
  var ui = Nexus.ui;
  var u = Nexus.utils;
  var html = ui.html;
  var $ = function (id) { return document.getElementById(id); };

  var db = {};

  async function loadAll() {
    var r = await Promise.all([S.sertifikat.list(), S.mahasiswa.list(), S.kursus.list(), S.krs.list(), S.instruktur.list(), S.pengaturan.all()]);
    db = { srt: r[0], mhs: r[1], kursus: r[2], krs: r[3], dosen: r[4], set: r[5] };
    var map = function (list) { var m = {}; list.forEach(function (x) { m[x.id] = x; }); return m; };
    db.mhsMap = map(db.mhs); db.kursusMap = map(db.kursus); db.dosenMap = map(db.dosen);

    // Pasangan mahasiswa–kursus yang lulus (nilai ≥ passing grade) dan belum punya sertifikat aktif.
    db.eligible = db.krs.filter(function (x) {
      var k = db.kursusMap[x.kursus_id];
      return x.status === "disetujui" && x.nilai_akhir != null && k && x.nilai_akhir >= k.passing_grade &&
        !db.srt.some(function (s) { return s.mahasiswa_id === x.mahasiswa_id && s.kursus_id === x.kursus_id && s.status !== "dicabut"; });
    });

    db.rows = db.srt.map(function (s) {
      var m = db.mhsMap[s.mahasiswa_id] || {}, k = db.kursusMap[s.kursus_id] || {};
      return Object.assign({}, s, { nama: m.nama, nim: m.nim, kode: k.kode_mk, kursus: k.nama });
    });
    renderKpi();
    return db.rows;
  }

  function renderKpi() {
    var by = function (st) { return db.rows.filter(function (s) { return s.status === st; }).length; };
    $("kpi-total").textContent = db.rows.length;
    $("kpi-total-sub").textContent = by("dicabut") + " dicabut";
    $("kpi-terbit").textContent = by("terbit");
    $("kpi-tte").textContent = by("menunggu_tte");
    $("btn-tte-semua").disabled = !by("menunggu_tte");
    $("kpi-siap").textContent = db.eligible.length;
  }

  var table = ui.dataTable({
    tbody: $("tabel-srt"),
    colspan: 6,
    pageSize: 10,
    load: loadAll,
    emptyText: "Belum ada sertifikat.",
    search: { input: $("f-cari"), fields: ["nomor_registrasi", "nama", "nim", "kode", "kursus"] },
    filters: [{ el: $("f-status"), match: function (s, v) { return s.status === v; } }],
    defaultSort: "terbaru",
    sorters: { terbaru: function (a, b) { return b.nomor_registrasi.localeCompare(a.nomor_registrasi); } },
    counter: $("tabel-counter"),
    pager: $("tabel-pager"),
    render: function (s) {
      return html`<tr class="align-top hover:bg-slate-50 ${s.status === "dicabut" ? "text-slate-500" : ""}">
        <td class="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium ${s.status === "dicabut" ? "line-through" : "text-slate-800"}">${s.nomor_registrasi}</td>
        <td class="px-4 py-3"><p class="font-medium ${s.status === "dicabut" ? "" : "text-slate-900"}">${s.nama}</p><p class="font-mono text-xs text-slate-500">${s.nim}</p></td>
        <td class="px-4 py-3"><p class="min-w-[12rem]"><span class="font-mono text-xs text-slate-500">${s.kode}</span> ${s.kursus}</p><p class="text-xs text-slate-500">${s.jenis}</p></td>
        <td class="whitespace-nowrap px-4 py-3"><p>${u.formatDate(s.tanggal_terbit)}</p><p class="text-xs text-slate-500">${s.penandatangan}</p></td>
        <td class="px-4 py-3">${ui.badge(s.status)}</td>
        <td class="whitespace-nowrap px-4 py-3 text-right">
          ${s.status === "menunggu_tte" ? html`<button type="button" data-tte="${s.id}" class="rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-800">TTE</button>` : ""}
          ${s.status === "terbit" ? html`<button type="button" data-cabut="${s.id}" class="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Cabut</button>` : ""}
          <button type="button" data-lihat="${s.id}" class="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Pratinjau ${s.nomor_registrasi}" title="Pratinjau & cetak"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">visibility</span></button>
          ${s.status === "menunggu_tte" ? html`<button type="button" data-hapus="${s.id}" class="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500" aria-label="Hapus draf ${s.nomor_registrasi}" title="Hapus draf"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span></button>` : ""}
        </td>
      </tr>`;
    },
  });

  /* ---------- Verifikasi ---------- */
  $("form-verif").addEventListener("submit", async function (e) {
    e.preventDefault();
    var box = $("hasil-verif");
    var nomor = $("nomor-verif").value.trim();
    if (!nomor) { $("nomor-verif").focus(); return; }
    var r = await S.sertifikat.verify(nomor);
    var tone = r.valid ? ["verified", "border-emerald-200 bg-emerald-50", "text-emerald-700"]
      : r.sertifikat ? ["gpp_bad", "border-red-200 bg-red-50", "text-red-700"] : ["help", "border-slate-200 bg-slate-50", "text-slate-700"];
    box.className = "mt-4 rounded-lg border p-4 " + tone[1];
    box.innerHTML = html`<div class="flex gap-3">
      <span class="material-symbols-outlined text-[28px] ${tone[2]}" aria-hidden="true">${tone[0]}</span>
      <div class="text-sm">
        <p class="font-semibold ${tone[2]}">${r.pesan}</p>
        ${r.sertifikat ? html`<dl class="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-slate-700 sm:grid-cols-2">
          <div><dt class="inline text-slate-500">Nomor:</dt> <dd class="inline font-mono">${r.sertifikat.nomor_registrasi}</dd></div>
          <div><dt class="inline text-slate-500">Nama:</dt> <dd class="inline">${r.mahasiswa ? r.mahasiswa.nama : "-"}</dd></div>
          <div><dt class="inline text-slate-500">Kursus:</dt> <dd class="inline">${r.kursus ? r.kursus.kode_mk + " " + r.kursus.nama : "-"}</dd></div>
          <div><dt class="inline text-slate-500">Tanggal terbit:</dt> <dd class="inline">${u.formatDate(r.sertifikat.tanggal_terbit)}</dd></div>
        </dl>` : ""}
      </div></div>`.value;
  });

  /* ---------- Terbitkan baru ---------- */
  var FORM_SCHEMA = {
    mahasiswa_id: S.sertifikat.schema.mahasiswa_id, kursus_id: S.sertifikat.schema.kursus_id,
    jenis: S.sertifikat.schema.jenis, penandatangan: S.sertifikat.schema.penandatangan, tanggal_terbit: S.sertifikat.schema.tanggal_terbit,
  };

  async function openForm() {
    if (!db.eligible.length) return ui.toast("Belum ada mahasiswa yang lulus kursus dan belum bersertifikat.", "info");
    var mhsIds = db.eligible.map(function (x) { return x.mahasiswa_id; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    var mhsOpts = mhsIds.map(function (id) { var m = db.mhsMap[id]; return [id, m.nama + " — " + m.nim]; })
      .sort(function (a, b) { return a[1].localeCompare(b[1], "id"); });
    var saved = await ui.formModal({
      title: "Terbitkan Sertifikat",
      submitLabel: "Terbitkan (menunggu TTE)",
      service: { schema: FORM_SCHEMA, validate: function (d, o) { return Nexus.validate(FORM_SCHEMA, d, o); } },
      initial: { jenis: "Sertifikat Kelulusan Kursus", tanggal_terbit: u.localDate() },
      fields: html`
        ${ui.field({ name: "mahasiswa_id", label: "Mahasiswa (sudah lulus kursus)", type: "select", required: true, options: mhsOpts, span: "sm:col-span-2" })}
        ${ui.field({ name: "kursus_id", label: "Kursus yang lulus", type: "select", required: true, span: "sm:col-span-2", help: "Hanya kursus dengan nilai akhir ≥ passing grade." })}
        ${ui.field({ name: "jenis", label: "Jenis sertifikat", required: true, span: "sm:col-span-2" })}
        ${ui.field({ name: "penandatangan", label: "Penandatangan", required: true, help: "Default: dosen pengampu kursus." })}
        ${ui.field({ name: "tanggal_terbit", label: "Tanggal terbit", type: "date", required: true })}`,
      onOpen: function (form) {
        var mSel = form.elements.namedItem("mahasiswa_id"), kSel = form.elements.namedItem("kursus_id"), ttd = form.elements.namedItem("penandatangan");
        function fillKursus() {
          kSel.length = 1;
          db.eligible.filter(function (x) { return x.mahasiswa_id === mSel.value; }).forEach(function (x) {
            var k = db.kursusMap[x.kursus_id];
            kSel.add(new Option(k.kode_mk + " — " + k.nama + " (nilai " + u.formatNumber(x.nilai_akhir, 1) + ")", k.id));
          });
          kSel.disabled = !mSel.value;
          if (kSel.options.length === 2) { kSel.selectedIndex = 1; setTtd(); }
        }
        function setTtd() {
          var k = db.kursusMap[kSel.value], d = k && db.dosenMap[k.instruktur_id];
          if (d) ttd.value = d.nama;
        }
        mSel.addEventListener("change", fillKursus);
        kSel.addEventListener("change", setTtd);
        fillKursus();
      },
      save: function (data) { return S.sertifikat.create(data); },
      success: function (row) { return "Sertifikat " + row.nomor_registrasi + " dibuat (menunggu TTE)."; },
    });
    if (saved) table.refresh();
  }

  /* ---------- Pratinjau & cetak ---------- */
  function openPreview(s) {
    var k = db.kursusMap[s.kursus_id] || {};
    var watermark = s.status === "dicabut" ? "DICABUT" : s.status === "menunggu_tte" ? "DRAF" : "";
    var m = ui.modal({
      title: "Pratinjau Sertifikat",
      size: "lg",
      body: html`
        <div id="sertifikat-cetak" class="relative overflow-hidden rounded-lg border-4 border-double border-blue-800 bg-white p-6 text-center sm:p-10">
          ${watermark ? html`<p class="pointer-events-none absolute inset-0 flex -rotate-12 items-center justify-center text-7xl font-black tracking-widest text-red-500/15" aria-hidden="true">${watermark}</p>` : ""}
          <img src="../assets/img/logo-nexus-lms.svg" alt="" class="mx-auto h-9 w-auto">
          <p class="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">${db.set.nama_institusi || "Nexus LMS"}</p>
          <h3 class="mt-4 font-serif text-2xl font-bold text-blue-900 sm:text-3xl">${s.jenis}</h3>
          <p class="mt-4 text-sm text-slate-600">Diberikan kepada</p>
          <p class="mt-1 text-2xl font-bold text-slate-900">${s.nama}</p>
          <p class="font-mono text-xs text-slate-500">NIM ${s.nim}</p>
          <p class="mx-auto mt-4 max-w-md text-sm text-slate-600">atas keberhasilannya menyelesaikan kursus</p>
          <p class="mt-1 text-lg font-semibold text-slate-900">${k.kode_mk} — ${k.nama}</p>
          <p class="text-xs text-slate-500">${k.sks} SKS · Periode ${k.periode}</p>
          <div class="mt-8 flex flex-col items-center justify-between gap-6 text-left sm:flex-row sm:items-end">
            <div class="text-xs text-slate-500">
              <p>Nomor registrasi</p><p class="font-mono text-sm font-semibold text-slate-800">${s.nomor_registrasi}</p>
              <p class="mt-1">Verifikasi: halaman Sertifikasi Digital</p>
            </div>
            <div class="text-center text-xs text-slate-600">
              <p>${u.formatDate(s.tanggal_terbit)}</p>
              <p class="mt-6 border-t border-slate-400 pt-1 font-semibold text-slate-800">${s.penandatangan}</p>
              <p>${s.status === "terbit" ? "Ditandatangani secara elektronik" : "Belum ditandatangani"}</p>
            </div>
          </div>
        </div>`,
      actions: [
        { label: "Tutup", variant: "secondary" },
        { label: "Cetak / Simpan PDF", variant: "primary", onClick: function () {
          document.body.classList.add("cetak-sertifikat");
          window.print();
          document.body.classList.remove("cetak-sertifikat");
          return false;
        } },
      ],
    });
    return m;
  }

  /* ---------- Aksi ---------- */
  $("tabel-srt").addEventListener("click", async function (e) {
    var btn = e.target.closest("[data-tte],[data-cabut],[data-lihat],[data-hapus]");
    if (!btn) return;
    var id = btn.getAttribute("data-tte") || btn.getAttribute("data-cabut") || btn.getAttribute("data-lihat") || btn.getAttribute("data-hapus");
    var s = db.rows.filter(function (r) { return r.id === id; })[0];
    if (!s) return;
    try {
      if (btn.hasAttribute("data-lihat")) return openPreview(s);
      if (btn.hasAttribute("data-tte")) {
        await S.sertifikat.terbitkan(s.id);
        ui.toast("Sertifikat " + s.nomor_registrasi + " ditandatangani dan terbit.", "success");
      } else if (btn.hasAttribute("data-cabut")) {
        var ok = await ui.confirm({
          title: "Cabut sertifikat?", danger: true, confirmLabel: "Ya, cabut",
          message: html`<p>Sertifikat <strong class="font-mono text-slate-900">${s.nomor_registrasi}</strong> milik <strong class="text-slate-900">${s.nama}</strong> akan dicabut.</p>
            <p class="mt-2">Verifikasi publik akan menampilkan status <strong>DICABUT</strong>. Sertifikat yang dicabut tidak dapat diterbitkan ulang.</p>`,
        });
        if (!ok) return;
        await S.sertifikat.cabut(s.id);
        ui.toast("Sertifikat " + s.nomor_registrasi + " dicabut.", "info");
      } else if (!(await ui.confirmDelete(S.sertifikat, s.id, "Draf sertifikat " + s.nomor_registrasi))) {
        return;
      }
      table.refresh();
    } catch (err) {
      ui.toast(err.message, "error");
    }
  });

  $("btn-tte-semua").addEventListener("click", async function () {
    var list = db.rows.filter(function (s) { return s.status === "menunggu_tte"; });
    var ok = await ui.confirm({ title: "Tandatangani semua?", message: list.length + " sertifikat akan ditandatangani secara elektronik dan berstatus terbit.", confirmLabel: "Tandatangani semua" });
    if (!ok) return;
    for (var i = 0; i < list.length; i++) await S.sertifikat.terbitkan(list[i].id);
    ui.toast(list.length + " sertifikat diterbitkan.", "success");
    table.refresh();
  });

  $("btn-tambah").addEventListener("click", openForm);
  $("btn-reset").addEventListener("click", function () { table.reset(); });

  table.refresh();
  ui.onDataChange(["sertifikat"], function (d) { if (d.action === "sync" || d.action === "reset") table.refresh(); });
})();
