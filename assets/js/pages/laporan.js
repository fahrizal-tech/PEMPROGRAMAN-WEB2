/**
 * Laporan & Analitik: KPI akademik, rekap mata kuliah, log aktivitas, cetak & ekspor CSV.
 */
(function () {
  "use strict";

  var S = Nexus.services;
  var ui = Nexus.ui;
  var u = Nexus.utils;
  var html = ui.html;
  var $ = function (id) { return document.getElementById(id); };

  var AKSI = { create: ["Tambah", "green"], update: ["Ubah", "blue"], delete: ["Hapus", "red"], login: ["Login", "slate"] };
  var ENTITAS = {
    kursus: "Kursus", modul: "Modul", mahasiswa: "Mahasiswa", instruktur: "Dosen", krs: "KRS", kelas_virtual: "Kelas virtual",
    tugas_kuis: "Tugas & kuis", pengumpulan: "Pengumpulan", sertifikat: "Sertifikat", pengaturan: "Pengaturan", admin: "Admin",
  };
  var AKSI_TONE = { green: "border-emerald-200 bg-emerald-50 text-emerald-700", blue: "border-blue-200 bg-blue-50 text-blue-700", red: "border-red-200 bg-red-50 text-red-700", slate: "border-slate-200 bg-slate-100 text-slate-600" };

  var db = {};

  async function loadAll() {
    var r = await Promise.all([
      S.kursus.list(), S.mahasiswa.list(), S.krs.list(), S.presensi.list(), S.kelasVirtual.list(),
      S.instruktur.list(), S.programStudi.list(), S.logAktivitas.recent(), S.admin.list(), S.pengaturan.all(),
    ]);
    db = { kursus: r[0], mahasiswa: r[1], krs: r[2], presensi: r[3], kelas: r[4], dosen: r[5], prodi: r[6], log: r[7], admin: r[8], set: r[9] };
    db.dosenMap = {}; db.dosen.forEach(function (d) { db.dosenMap[d.id] = d; });
    db.adminMap = {}; db.admin.forEach(function (a) { db.adminMap[a.id] = a; });
    $("periode-aktif").textContent = db.set.periode_aktif || "-";
    $("kop-institusi").textContent = db.set.nama_institusi || "Nexus LMS";
    var sel = $("f-prodi");
    if (sel.options.length === 1) db.prodi.forEach(function (p) { sel.add(new Option(p.nama, p.id)); });
  }

  function avg(list) { return list.length ? list.reduce(function (a, b) { return a + b; }, 0) / list.length : null; }

  /* ---------- KPI & rekap (mengikuti filter prodi) ---------- */
  function rekapRows() {
    var prodi = $("f-prodi").value;
    var kursus = db.kursus.filter(function (k) { return !prodi || k.prodi_id === prodi; });
    return kursus.map(function (k) {
      var krs = db.krs.filter(function (x) { return x.kursus_id === k.id && x.status === "disetujui"; });
      var nilai = krs.filter(function (x) { return x.nilai_akhir != null; });
      var kelasIds = db.kelas.filter(function (v) { return v.kursus_id === k.id; }).map(function (v) { return v.id; });
      var pres = db.presensi.filter(function (p) { return kelasIds.indexOf(p.kelas_virtual_id) !== -1; });
      var d = db.dosenMap[k.instruktur_id];
      return {
        id: k.id, kode_mk: k.kode_mk, nama: k.nama, dosen: d ? d.nama : "-", status: k.status,
        peserta: krs.length,
        dinilai: nilai.length,
        rata: avg(nilai.map(function (x) { return x.nilai_akhir; })),
        lulus: nilai.filter(function (x) { return x.nilai_akhir >= k.passing_grade; }).length,
        hadir: pres.filter(function (p) { return p.status === "hadir"; }).length,
        presensi: pres.length,
      };
    });
  }

  function pct(a, b) { return b ? (a / b) * 100 : null; }
  function fmtPct(v) { return v == null ? "-" : u.formatNumber(v, 1) + "%"; }

  function renderKpi(rows) {
    var prodi = $("f-prodi").value;
    var mhs = db.mahasiswa.filter(function (m) { return m.status === "aktif" && m.ipk > 0 && (!prodi || m.prodi_id === prodi); });
    var ipk = avg(mhs.map(function (m) { return m.ipk; }));
    $("kpi-ipk").textContent = ipk == null ? "-" : u.formatNumber(ipk, 2);
    $("kpi-ipk-sub").textContent = mhs.length + " mahasiswa aktif (tidak termasuk semester 1)";

    var dinilai = rows.reduce(function (n, r) { return n + r.dinilai; }, 0);
    var totalNilai = rows.reduce(function (n, r) { return n + (r.rata || 0) * r.dinilai; }, 0);
    $("kpi-nilai").textContent = dinilai ? u.formatNumber(totalNilai / dinilai, 1) : "-";
    $("kpi-nilai-sub").textContent = dinilai + " nilai akhir dari " + rows.reduce(function (n, r) { return n + r.peserta; }, 0) + " peserta";

    var lulus = rows.reduce(function (n, r) { return n + r.lulus; }, 0);
    $("kpi-lulus").textContent = fmtPct(pct(lulus, dinilai));
    $("kpi-lulus-sub").textContent = lulus + " lulus dari " + dinilai + " yang sudah dinilai";

    var hadir = rows.reduce(function (n, r) { return n + r.hadir; }, 0);
    var pres = rows.reduce(function (n, r) { return n + r.presensi; }, 0);
    $("kpi-hadir").textContent = fmtPct(pct(hadir, pres));
    $("kpi-hadir-sub").textContent = hadir + " hadir dari " + pres + " catatan presensi";
  }

  var rekap = ui.dataTable({
    tbody: $("tabel-rekap"),
    colspan: 8,
    pageSize: 100,
    load: async function () { var rows = rekapRows(); renderKpi(rows); return rows; },
    emptyText: "Tidak ada mata kuliah untuk program studi ini.",
    sortSelect: $("f-urut"),
    defaultSort: "kode",
    sorters: {
      kode: function (a, b) { return a.kode_mk.localeCompare(b.kode_mk); },
      peserta: function (a, b) { return b.peserta - a.peserta; },
      nilai: function (a, b) { return (b.rata || -1) - (a.rata || -1); },
      lulus: function (a, b) { return (pct(b.lulus, b.dinilai) || -1) - (pct(a.lulus, a.dinilai) || -1); },
    },
    render: function (r) {
      var l = pct(r.lulus, r.dinilai);
      return html`<tr class="hover:bg-slate-50">
        <td class="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">${r.kode_mk}</td>
        <td class="px-4 py-3 font-medium text-slate-900">${r.nama}</td>
        <td class="whitespace-nowrap px-4 py-3 text-slate-600">${r.dosen}</td>
        <td class="px-4 py-3 text-right tabular-nums">${r.peserta}</td>
        <td class="px-4 py-3 text-right tabular-nums">${r.rata == null ? "-" : u.formatNumber(r.rata, 1)}</td>
        <td class="px-4 py-3 text-right tabular-nums ${l != null && l < 70 ? "font-semibold text-red-600" : ""}">${fmtPct(l)}</td>
        <td class="px-4 py-3 text-right tabular-nums">${fmtPct(pct(r.hadir, r.presensi))}</td>
        <td class="px-4 py-3">${ui.badge(r.status)}</td>
      </tr>`;
    },
  });

  /* ---------- Log aktivitas ---------- */
  function logRows() {
    return db.log.map(function (l) {
      var a = db.adminMap[l.admin_id];
      return Object.assign({}, l, { admin: a ? a.nama : "Sistem", tanggal: String(l.waktu).slice(0, 10) });
    });
  }

  var log = ui.dataTable({
    tbody: $("tabel-log"),
    colspan: 5,
    pageSize: 10,
    load: async function () { return logRows(); },
    emptyText: "Belum ada aktivitas tercatat.",
    search: { input: $("log-cari"), fields: ["deskripsi", "admin"] },
    filters: [
      { el: $("log-aksi"), match: function (l, v) { return l.aksi === v; } },
      { el: $("log-dari"), match: function (l, v) { return l.tanggal >= v; } },
      { el: $("log-sampai"), match: function (l, v) { return l.tanggal <= v; } },
    ],
    counter: $("log-counter"),
    pager: $("log-pager"),
    render: function (l) {
      var a = AKSI[l.aksi] || [l.aksi, "slate"];
      return html`<tr class="align-top hover:bg-slate-50">
        <td class="whitespace-nowrap px-4 py-3 text-xs text-slate-600"><time datetime="${l.waktu}">${u.formatDate(l.waktu, true)}</time></td>
        <td class="whitespace-nowrap px-4 py-3 text-slate-700">${l.admin}</td>
        <td class="px-4 py-3"><span class="inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${AKSI_TONE[a[1]]}">${a[0]}</span></td>
        <td class="whitespace-nowrap px-4 py-3 text-slate-600">${ENTITAS[l.entitas] || l.entitas}</td>
        <td class="px-4 py-3 text-slate-800">${l.deskripsi}</td>
      </tr>`;
    },
  });

  /* ---------- Ekspor CSV ---------- */
  function stamp() { return new Date().toISOString().slice(0, 10); }

  $("btn-csv-rekap").addEventListener("click", function () {
    var rows = rekap.visible();
    if (!rows.length) return ui.toast("Tidak ada data untuk diekspor.", "warning");
    u.download("rekap-mata-kuliah-" + stamp() + ".csv", u.toCSV(rows, [
      { label: "Kode MK", value: "kode_mk" }, { label: "Mata Kuliah", value: "nama" }, { label: "Dosen", value: "dosen" },
      { label: "Peserta", value: "peserta" }, { label: "Rata-rata Nilai", value: function (r) { return r.rata == null ? "" : r.rata.toFixed(1); } },
      { label: "Lulus (%)", value: function (r) { var v = pct(r.lulus, r.dinilai); return v == null ? "" : v.toFixed(1); } },
      { label: "Hadir (%)", value: function (r) { var v = pct(r.hadir, r.presensi); return v == null ? "" : v.toFixed(1); } },
      { label: "Status", value: function (r) { return ui.statusLabel(r.status); } },
    ]), "text/csv;charset=utf-8");
    ui.toast(rows.length + " baris rekap diekspor.", "success");
  });

  $("btn-csv-log").addEventListener("click", function () {
    var rows = log.visible();
    if (!rows.length) return ui.toast("Tidak ada log untuk diekspor.", "warning");
    u.download("log-aktivitas-" + stamp() + ".csv", u.toCSV(rows, [
      { label: "Waktu", value: function (l) { return u.formatDate(l.waktu, true); } }, { label: "Admin", value: "admin" },
      { label: "Aksi", value: function (l) { return (AKSI[l.aksi] || [l.aksi])[0]; } },
      { label: "Data", value: function (l) { return ENTITAS[l.entitas] || l.entitas; } }, { label: "Deskripsi", value: "deskripsi" },
    ]), "text/csv;charset=utf-8");
    ui.toast(rows.length + " log diekspor.", "success");
  });

  /* ---------- Cetak ---------- */
  function kopDetail() {
    var prodiSel = $("f-prodi");
    var parts = ["Periode " + (db.set.periode_aktif || "-"), "Program studi: " + prodiSel.options[prodiSel.selectedIndex].text];
    if ($("log-dari").value || $("log-sampai").value) parts.push("Log: " + ($("log-dari").value || "awal") + " s.d. " + ($("log-sampai").value || "sekarang"));
    var user = Nexus.auth.currentUser();
    parts.push("Dicetak " + u.formatDate(new Date().toISOString(), true) + (user ? " oleh " + user.nama : ""));
    $("kop-detail").textContent = parts.join(" · ");
  }
  window.addEventListener("beforeprint", function () { kopDetail(); log.setPageSize(100000); });
  window.addEventListener("afterprint", function () { log.setPageSize(10); });
  $("btn-cetak").addEventListener("click", function () { window.print(); });

  /* ---------- Muat ---------- */
  $("f-prodi").addEventListener("change", function () { rekap.refresh(); });
  loadAll().then(function () { rekap.refresh(); log.refresh(); }).catch(function (e) {
    ui.toast("Gagal memuat laporan: " + e.message, "error");
    console.error(e);
  });
})();
