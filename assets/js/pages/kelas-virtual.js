/**
 * Kelas Virtual: jadwal sesi, status (terjadwal → live → selesai), presensi, tambah/edit, hapus.
 */
(function () {
  "use strict";

  var S = Nexus.services;
  var ui = Nexus.ui;
  var u = Nexus.utils;
  var html = ui.html;
  var $ = function (id) { return document.getElementById(id); };

  var PLATFORM = { zoom: ["Zoom", "videocam"], meet: ["Google Meet", "video_call"], teams: ["Microsoft Teams", "groups"] };
  var db = {};

  function jam(iso, menit) {
    var d = new Date(iso);
    var fmt = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
    return fmt.format(d) + "–" + fmt.format(new Date(d.getTime() + menit * 60000));
  }

  async function loadAll() {
    var r = await Promise.all([S.kelasVirtual.list(), S.kursus.list(), S.modul.list(), S.instruktur.list(), S.krs.list(), S.presensi.list(), S.programStudi.list()]);
    db = { sesi: r[0], kursus: r[1], modul: r[2], dosen: r[3], krs: r[4], presensi: r[5] };
    db.prodiKode = {}; r[6].forEach(function (p) { db.prodiKode[p.id] = p.kode; });
    var map = function (list) { var m = {}; list.forEach(function (x) { m[x.id] = x; }); return m; };
    db.kursusMap = map(db.kursus); db.modulMap = map(db.modul); db.dosenMap = map(db.dosen);

    db.rows = db.sesi.map(function (s) {
      var k = db.kursusMap[s.kursus_id] || {};
      var d = db.dosenMap[k.instruktur_id] || {};
      var peserta = db.krs.filter(function (x) { return x.kursus_id === s.kursus_id && x.status === "disetujui"; }).length;
      var pres = db.presensi.filter(function (p) { return p.kelas_virtual_id === s.id; });
      return Object.assign({}, s, {
        kode: k.kode_mk, kursus: k.nama, dosen: d.nama || "-", modul: db.modulMap[s.modul_id], kursusObj: k, prodiKode: db.prodiKode[k.prodi_id],
        peserta: peserta, tercatat: pres.length, hadir: pres.filter(function (p) { return p.status === "hadir"; }).length,
        tanggal: u.localDate(s.waktu_mulai),
      });
    });
    renderKpi();
    return db.rows;
  }

  function renderKpi() {
    var rows = db.rows, by = function (st) { return rows.filter(function (s) { return s.status === st; }); };
    var today = u.localDate();
    $("kpi-live").textContent = by("live").length;
    $("kpi-terjadwal").textContent = by("terjadwal").length;
    $("kpi-terjadwal-sub").textContent = by("terjadwal").filter(function (s) { return s.tanggal === today; }).length + " dijadwalkan hari ini";
    $("kpi-selesai").textContent = by("selesai").length;
    $("kpi-selesai-sub").textContent = by("selesai").filter(function (s) { return s.tercatat === 0; }).length + " belum ada presensi";
    var hadir = rows.reduce(function (n, s) { return n + s.hadir; }, 0), total = rows.reduce(function (n, s) { return n + s.tercatat; }, 0);
    $("kpi-hadir").textContent = total ? u.formatPercent(hadir, total) : "-";
    $("kpi-hadir-sub").textContent = hadir + " hadir dari " + total + " catatan";
  }

  var ORDER = { live: 0, terjadwal: 1, selesai: 2 };

  /* ---------- Tampilan kartu ---------- */
  var PLATFORM_STYLE = { zoom: "text-blue-700", meet: "text-emerald-700", teams: "text-indigo-700" };
  var GROUPS = [
    ["live", "Sedang Live", "sensors", "text-red-600"],
    ["terjadwal", "Akan Datang", "event_upcoming", "text-blue-600"],
    ["selesai", "Selesai", "task_alt", "text-slate-500"],
  ];

  function durasi(ms) {
    var m = Math.round(ms / 60000);
    if (m < 60) return m + " menit";
    if (m < 1440) return Math.round(m / 60) + " jam";
    return Math.round(m / 1440) + " hari";
  }

  /** Keterangan waktu relatif: hitung mundur mulai/selesai atau "N hari lalu". */
  function waktuRelatif(s) {
    var now = Date.now(), start = new Date(s.waktu_mulai).getTime(), end = start + s.durasi_menit * 60000;
    if (s.status === "live") return now < end ? ["Berakhir " + durasi(end - now) + " lagi", "bg-red-600"] : ["Melewati jadwal selesai", "bg-amber-600"];
    if (s.status === "terjadwal") return now < start ? ["Mulai " + durasi(start - now) + " lagi", "bg-blue-600"] : ["Terlambat dimulai", "bg-amber-600"];
    return ["Selesai " + u.timeAgo(new Date(end).toISOString()), "bg-slate-700"];
  }

  function card(s) {
    var p = PLATFORM[s.platform] || [s.platform, "link"];
    var rel = waktuRelatif(s);
    var pct = s.peserta ? Math.round((s.hadir / s.peserta) * 100) : 0;
    var badge = s.status === "live"
      ? html`<span class="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow"><span class="relative flex h-2 w-2"><span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span><span class="relative inline-flex h-2 w-2 rounded-full bg-white"></span></span>Live</span>`
      : html`<span class="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow">${ui.statusLabel(s.status)}</span>`;
    var aksi = s.status === "terjadwal"
      ? html`<button type="button" data-status="${s.id}" data-to="live" class="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700">Mulai Sesi</button>`
      : s.status === "live"
        ? html`<a href="${s.tautan}" target="_blank" rel="noopener noreferrer" class="flex-1 whitespace-nowrap rounded-lg bg-blue-600 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-blue-700">Masuk ↗</a>
          <button type="button" data-status="${s.id}" data-to="selesai" class="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Selesaikan</button>`
        : html`<button type="button" data-presensi="${s.id}" class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">${s.tercatat ? "Lihat Presensi" : "Isi Presensi"}</button>`;
    return html`<article class="group flex flex-col overflow-hidden rounded-2xl border ${s.status === "live" ? "border-red-200 ring-1 ring-red-100" : "border-slate-200"} bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div class="relative aspect-video overflow-hidden">
        ${Nexus.cover.render(Object.assign({}, s.kursusObj, { kode_mk: s.kode }), s.prodiKode, "h-full w-full transition duration-300 group-hover:scale-[1.03]")}
        <div class="absolute right-3 top-3">${badge}</div>
        <span class="absolute bottom-3 left-3 rounded-md ${rel[1]} px-2 py-1 text-[11px] font-semibold text-white shadow">${rel[0]}</span>
        <span class="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-[11px] font-semibold shadow ${PLATFORM_STYLE[s.platform] || "text-slate-700"}">
          <span class="material-symbols-outlined text-[14px]" aria-hidden="true">${p[1]}</span>${p[0]}</span>
      </div>
      <div class="flex flex-1 flex-col p-4">
        <p class="text-[11px] font-medium text-slate-500"><span class="font-mono">${s.kode}</span>${s.modul ? " · Pertemuan " + s.modul.pertemuan_ke : ""}</p>
        <h4 class="mt-1 line-clamp-2 font-semibold leading-snug text-slate-900">${s.judul}</h4>
        <p class="mt-0.5 line-clamp-1 text-xs text-slate-500">${s.kursus}</p>
        <p class="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
          <span class="material-symbols-outlined text-[16px] text-slate-400" aria-hidden="true">schedule</span>${u.formatDate(s.waktu_mulai)} · ${jam(s.waktu_mulai, s.durasi_menit)}
        </p>
        <div class="mt-2 flex items-center gap-2">
          <span class="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-700" aria-hidden="true">${u.initials(s.dosen)}</span>
          <span class="truncate text-xs text-slate-700">${s.dosen}</span>
        </div>
        <div class="mt-3">
          ${s.status === "terjadwal" ? html`<p class="text-xs text-slate-500"><span class="font-semibold text-slate-800">${s.peserta}</span> peserta terdaftar</p>` : html`
            <div class="flex justify-between text-xs"><span class="text-slate-500">Kehadiran</span><span class="font-semibold text-slate-800">${s.tercatat ? s.hadir + " / " + s.peserta : "Belum diisi"}</span></div>
            <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full ${s.tercatat ? "bg-emerald-500" : "bg-slate-200"}" style="width:${s.tercatat ? pct : 0}%"></div></div>`}
        </div>
        <div class="mt-auto flex items-center gap-2 pt-4">
          ${aksi}
          ${s.status === "live" ? html`<button type="button" data-presensi="${s.id}" class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600" aria-label="Presensi ${s.judul}" title="Presensi"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">how_to_reg</span></button>` : ""}
          <button type="button" data-edit="${s.id}" class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600" aria-label="Edit ${s.judul}" title="Edit"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">edit</span></button>
          <button type="button" data-hapus="${s.id}" class="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600" aria-label="Hapus ${s.judul}" title="Hapus"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span></button>
        </div>
      </div>
    </article>`;
  }

  /** Kartu dikelompokkan per status; jumlah grup dihitung dari seluruh hasil filter. */
  function renderGroups(slice, list) {
    return html`${GROUPS.map(function (g) {
      var items = slice.filter(function (s) { return s.status === g[0]; });
      if (!items.length) return "";
      var total = list.filter(function (s) { return s.status === g[0]; }).length;
      return html`<div class="col-span-full flex items-center gap-2 pt-2 first:pt-0">
          <span class="material-symbols-outlined text-[20px] ${g[3]}" aria-hidden="true">${g[2]}</span>
          <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-700">${g[1]}</h3>
          <span class="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">${total}</span>
          <span class="h-px flex-1 bg-slate-200" aria-hidden="true"></span>
        </div>
        ${items.map(card)}`;
    })}`;
  }
  var table = ui.dataTable({
    tbody: $("tabel-sesi"),
    colspan: 7,
    pageSize: 12,
    cards: { container: $("kartu-sesi"), renderAll: renderGroups, emptyTitle: "Belum ada sesi kelas virtual" },
    load: loadAll,
    emptyText: "Belum ada sesi. Klik \"Jadwalkan Sesi\" untuk menambahkan.",
    search: { input: $("f-cari"), fields: ["judul", "kode", "kursus", "dosen"] },
    filters: [
      { el: $("f-tanggal"), match: function (s, v) { return s.tanggal === v; } },
      { el: $("f-platform"), match: function (s, v) { return s.platform === v; } },
      { el: $("f-status"), match: function (s, v) { return s.status === v; } },
    ],
    defaultSort: "status",
    // Live di atas, lalu terjadwal (terdekat dulu), lalu selesai (terbaru dulu).
    sorters: {
      status: function (a, b) {
        if (ORDER[a.status] !== ORDER[b.status]) return ORDER[a.status] - ORDER[b.status];
        return a.status === "selesai" ? b.waktu_mulai.localeCompare(a.waktu_mulai) : a.waktu_mulai.localeCompare(b.waktu_mulai);
      },
    },
    counter: $("tabel-counter"),
    pager: $("tabel-pager"),
    render: function (s) {
      var p = PLATFORM[s.platform] || [s.platform, "link"];
      var presensi = s.status === "terjadwal"
        ? html`<span class="text-xs text-slate-500">${s.peserta} peserta terdaftar</span>`
        : html`<button type="button" data-presensi="${s.id}" class="text-left hover:underline" aria-label="Isi presensi ${s.judul}">
            <span class="font-semibold tabular-nums text-slate-900">${s.hadir} / ${s.peserta}</span> <span class="text-xs text-slate-500">hadir</span>
            ${s.tercatat === 0 ? html`<p class="text-[11px] font-medium text-amber-700">Belum diisi</p>` : ""}</button>`;
      var next = s.status === "terjadwal" ? html`<button type="button" data-status="${s.id}" data-to="live" class="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700">Mulai</button>`
        : s.status === "live" ? html`<button type="button" data-status="${s.id}" data-to="selesai" class="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">Selesaikan</button>` : "";
      return html`<tr class="align-top hover:bg-slate-50 ${s.status === "live" ? "bg-red-50/40" : ""}">
        <td class="whitespace-nowrap px-4 py-3"><p class="font-semibold tabular-nums text-slate-900">${jam(s.waktu_mulai, s.durasi_menit)}</p><p class="text-xs text-slate-500">${u.formatDate(s.waktu_mulai)} · ${s.durasi_menit} menit</p></td>
        <td class="px-4 py-3"><p class="min-w-[14rem] font-medium text-slate-900">${s.judul}</p><p class="text-xs text-slate-500"><span class="font-mono">${s.kode}</span> ${s.kursus}${s.modul ? " · Pertemuan " + s.modul.pertemuan_ke : ""}</p></td>
        <td class="whitespace-nowrap px-4 py-3 text-slate-700">${s.dosen}</td>
        <td class="whitespace-nowrap px-4 py-3">
          <span class="inline-flex items-center gap-1.5 text-slate-700"><span class="material-symbols-outlined text-[18px] text-slate-400" aria-hidden="true">${p[1]}</span>${p[0]}</span>
          ${s.status !== "selesai" ? html`<p><a href="${s.tautan}" target="_blank" rel="noopener noreferrer" class="text-xs font-medium text-blue-600 hover:underline">Buka tautan ↗</a></p>` : ""}
        </td>
        <td class="whitespace-nowrap px-4 py-3">${presensi}</td>
        <td class="px-4 py-3">${ui.badge(s.status)}</td>
        <td class="whitespace-nowrap px-4 py-3 text-right">
          ${next}
          <button type="button" data-edit="${s.id}" class="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Edit ${s.judul}" title="Edit"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">edit</span></button>
          <button type="button" data-hapus="${s.id}" class="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500" aria-label="Hapus ${s.judul}" title="Hapus"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span></button>
        </td>
      </tr>`;
    },
  });

  /* ---------- Tambah / edit (modul menyesuaikan kursus) ---------- */
  function fillModul(select, kursusId, selected) {
    select.length = 1;
    db.modul.filter(function (m) { return m.kursus_id === kursusId; })
      .sort(function (a, b) { return a.pertemuan_ke - b.pertemuan_ke; })
      .forEach(function (m) { select.add(new Option("Pertemuan " + m.pertemuan_ke + ": " + m.judul, m.id)); });
    select.value = selected || "";
    select.disabled = !kursusId;
  }

  async function openForm(s) {
    var kursusOpts = db.kursus.filter(function (k) { return k.status === "publikasi" || (s && k.id === s.kursus_id); })
      .map(function (k) { return [k.id, k.kode_mk + " — " + k.nama]; });
    var saved = await ui.formModal({
      title: s ? "Edit Sesi" : "Jadwalkan Sesi Baru",
      service: S.kelasVirtual,
      initial: s ? Object.assign({}, s, { waktu_mulai: String(s.waktu_mulai).slice(0, 16) }) : { durasi_menit: 100, platform: "zoom", status: "terjadwal" },
      fields: html`
        ${ui.field({ name: "kursus_id", label: "Kursus", type: "select", required: true, options: kursusOpts, span: "sm:col-span-2" })}
        ${ui.field({ name: "modul_id", label: "Modul yang dibahas", type: "select", placeholder: "Tanpa modul khusus", span: "sm:col-span-2" })}
        ${ui.field({ name: "judul", label: "Judul sesi", required: true, placeholder: "Contoh: Live Coding Fetch API", span: "sm:col-span-2" })}
        ${ui.field({ name: "waktu_mulai", label: "Waktu mulai", type: "datetime-local", required: true })}
        ${ui.field({ name: "durasi_menit", label: "Durasi (menit)", type: "number", required: true, attrs: 'min="15" max="240" step="5"' })}
        ${ui.field({ name: "platform", label: "Platform", type: "select", required: true, placeholder: false, options: [["zoom", "Zoom"], ["meet", "Google Meet"], ["teams", "Microsoft Teams"]] })}
        ${ui.field({ name: "status", label: "Status", type: "select", required: true, placeholder: false, options: [["terjadwal", "Terjadwal"], ["live", "Live"], ["selesai", "Selesai"]] })}
        ${ui.field({ name: "tautan", label: "Tautan meeting", type: "url", required: true, placeholder: "https://…", span: "sm:col-span-2", help: "Harus diawali https://" })}`,
      onOpen: function (form) {
        var kSel = form.elements.namedItem("kursus_id"), mSel = form.elements.namedItem("modul_id");
        fillModul(mSel, kSel.value, s && s.modul_id);
        kSel.addEventListener("change", function () { fillModul(mSel, kSel.value, null); });
      },
      save: function (data) { return s ? S.kelasVirtual.update(s.id, data) : S.kelasVirtual.create(data); },
      success: function (row) { return "Sesi \"" + row.judul + "\" berhasil " + (s ? "diperbarui" : "dijadwalkan") + "."; },
    });
    if (saved) table.refresh();
  }

  /* ---------- Presensi ---------- */
  async function openPresensi(s) {
    var peserta = (await S.kelasVirtual.peserta(s.id)).sort(function (a, b) { return a.nama.localeCompare(b.nama, "id"); });
    var current = {};
    db.presensi.filter(function (p) { return p.kelas_virtual_id === s.id; }).forEach(function (p) { current[p.mahasiswa_id] = p.status; });
    var OPTS = [["hadir", "Hadir"], ["izin", "Izin"], ["alpa", "Alpa"]];
    var m = ui.modal({
      title: "Presensi — " + s.judul,
      size: "lg",
      body: peserta.length ? html`
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p class="text-xs text-slate-500">${s.kode} · ${u.formatDate(s.waktu_mulai, true)} · ${peserta.length} peserta</p>
          <button type="button" id="semua-hadir" class="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">Tandai semua hadir</button>
        </div>
        <ul class="divide-y divide-slate-100 rounded-lg border border-slate-200" id="daftar-presensi">
          ${peserta.map(function (p) {
            var cur = current[p.id] || "";
            return html`<li class="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p class="font-medium text-slate-800">${p.nama}</p><p class="font-mono text-xs text-slate-500">${p.nim}</p></div>
              <fieldset class="flex gap-1" data-mhs="${p.id}"><legend class="sr-only">Status presensi ${p.nama}</legend>
                ${OPTS.map(function (o) {
                  return html`<label class="cursor-pointer rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-700">
                    <input type="radio" class="sr-only" name="pr-${p.id}" value="${o[0]}" ${ui.raw(cur === o[0] ? "checked" : "")}>${o[1]}</label>`;
                })}
              </fieldset></li>`;
          })}
        </ul>` : html`<p class="py-6 text-center text-sm text-slate-500">Belum ada mahasiswa dengan KRS disetujui pada kursus ini.</p>`,
      actions: peserta.length ? [
        { label: "Batal", variant: "secondary" },
        { label: "Simpan Presensi", variant: "primary", onClick: async function () {
          var entries = [], kosong = 0;
          m.el.querySelectorAll("[data-mhs]").forEach(function (fs) {
            var c = fs.querySelector("input:checked");
            if (c) entries.push({ mahasiswa_id: fs.getAttribute("data-mhs"), status: c.value }); else kosong++;
          });
          if (kosong) { ui.toast(kosong + " mahasiswa belum diberi status presensi.", "warning"); return false; }
          try {
            await S.kelasVirtual.savePresensi(s.id, entries);
            ui.toast("Presensi disimpan (" + entries.filter(function (e) { return e.status === "hadir"; }).length + "/" + entries.length + " hadir).", "success");
            table.refresh();
          } catch (e) { ui.toast(e.message, "error"); return false; }
        } },
      ] : [{ label: "Tutup", variant: "primary" }],
    });
    var all = m.el.querySelector("#semua-hadir");
    if (all) all.addEventListener("click", function () { m.el.querySelectorAll('input[value="hadir"]').forEach(function (i) { i.checked = true; }); });
  }

  /* ---------- Aksi tabel ---------- */
  async function onAction(e) {
    var btn = e.target.closest("[data-edit],[data-hapus],[data-presensi],[data-status]");
    if (!btn) return;
    var id = btn.getAttribute("data-edit") || btn.getAttribute("data-hapus") || btn.getAttribute("data-presensi") || btn.getAttribute("data-status");
    var s = db.rows.filter(function (r) { return r.id === id; })[0];
    if (!s) return;
    if (btn.hasAttribute("data-edit")) return openForm(s);
    if (btn.hasAttribute("data-presensi")) return openPresensi(s);
    if (btn.hasAttribute("data-status")) {
      var to = btn.getAttribute("data-to");
      try {
        await S.kelasVirtual.update(s.id, { status: to });
        ui.toast(to === "live" ? "Sesi dimulai (live)." : "Sesi diselesaikan. Jangan lupa mengisi presensi.", "success");
        await table.refresh();
      } catch (err) { ui.toast(err.message, "error"); }
      return;
    }
    if (await ui.confirmDelete(S.kelasVirtual, s.id, "Sesi \"" + s.judul + "\"")) table.refresh();
  }
  $("tabel-sesi").addEventListener("click", onAction);
  $("kartu-sesi").addEventListener("click", onAction);

  $("btn-tambah").addEventListener("click", function () { openForm(null); });
  $("btn-reset").addEventListener("click", function () { table.reset(); });

  ui.viewToggle($("view-toggle"), {
    key: "kelas-virtual",
    onChange: function (mode) {
      $("kartu-sesi").classList.toggle("hidden", mode !== "kartu");
      $("tabel-wrap").classList.toggle("hidden", mode !== "tabel");
      table.setMode(mode);
    },
  });
  table.refresh();
  // Perbarui hitung mundur setiap menit tanpa memuat ulang data.
  setInterval(function () { table.render(); }, 60000);
  ui.onDataChange(["kelas_virtual", "presensi"], function (d) { if (d.action === "sync" || d.action === "reset") table.refresh(); });
})();
