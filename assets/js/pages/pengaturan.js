/**
 * Pengaturan Sistem: profil institusi, akademik, keamanan sesi, akun admin,
 * serta cadangan / pemulihan / reset data.
 */
(function () {
  "use strict";

  var S = Nexus.services;
  var ui = Nexus.ui;
  var u = Nexus.utils;
  var html = ui.html;
  var db = Nexus.storage;
  var $ = function (id) { return document.getElementById(id); };

  var form = $("form-pengaturan");
  var schema = S.pengaturan.schema;
  var saved = {};
  var dirty = false;

  /* ---------- Susun kolom dari skema ---------- */
  $("grup-institusi").innerHTML = html`
    ${ui.field({ name: "nama_institusi", label: "Nama institusi", required: true, span: "sm:col-span-2" })}
    ${ui.field({ name: "kode_pt", label: "Kode perguruan tinggi", required: true, attrs: 'inputmode="numeric" maxlength="6"', help: "6 digit kode PT." })}
    ${ui.field({ name: "email_helpdesk", label: "Email helpdesk", type: "email", required: true })}`.value;
  $("grup-akademik").innerHTML = html`
    ${ui.field({ name: "periode_aktif", label: "Periode aktif", required: true, placeholder: "2026/2027-Ganjil", help: "Format: 2026/2027-Ganjil" })}
    ${ui.field({ name: "batas_krs", label: "Batas pengisian KRS", type: "date", required: true })}
    ${ui.field({ name: "passing_grade_default", label: "Passing grade default", type: "number", required: true, attrs: 'min="0" max="100"' })}`.value;
  $("grup-keamanan").innerHTML = html`
    ${ui.field({ name: "sesi_timeout_menit", label: "Batas sesi idle (menit)", type: "number", required: true, attrs: 'min="5" max="480"', help: "Admin otomatis keluar bila tidak aktif selama waktu ini." })}
    ${ui.field({ name: "zona_waktu", label: "Zona waktu", type: "select", required: true, placeholder: false, options: [["Asia/Jakarta", "WIB (Asia/Jakarta)"], ["Asia/Makassar", "WITA (Asia/Makassar)"], ["Asia/Jayapura", "WIT (Asia/Jayapura)"]] })}`.value;

  /* ---------- Status perubahan ---------- */
  function setDirty(v) {
    dirty = v;
    $("btn-batal").disabled = !v;
    $("save-state").textContent = v ? "Ada perubahan yang belum disimpan." : "Semua pengaturan tersimpan.";
    $("save-state").className = "text-xs " + (v ? "font-medium text-amber-700" : "text-slate-500");
  }
  form.addEventListener("input", function () { setDirty(true); });
  form.addEventListener("change", function () { setDirty(true); });
  window.addEventListener("beforeunload", function (e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  async function loadSettings() {
    saved = await S.pengaturan.all();
    ui.fillForm(form, saved);
    setDirty(false);
  }

  $("btn-batal").addEventListener("click", function () {
    ui.fillForm(form, saved);
    Object.keys(schema).forEach(function (k) { ui.setFieldError(form, k, null); });
    setDirty(false);
  });

  ui.bindForm(form, {
    service: { schema: schema, validate: function (d, o) { return Nexus.validate(schema, d, o); } },
    submitButton: $("btn-simpan"),
    onSubmit: async function (data) {
      var changed = {};
      Object.keys(data).forEach(function (k) { if (schema[k] && String(data[k]) !== String(saved[k])) changed[k] = data[k]; });
      if (!Object.keys(changed).length) { ui.toast("Tidak ada perubahan untuk disimpan.", "info"); setDirty(false); return; }
      saved = await S.pengaturan.save(changed);
      ui.fillForm(form, saved);
      setDirty(false);
      ui.toast(Object.keys(changed).length + " pengaturan berhasil disimpan.", "success");
    },
  });

  /* ---------- Akun admin ---------- */
  async function loadAdmins() {
    var me = Nexus.auth.currentUser();
    var admins = await S.admin.list();
    $("tabel-admin").innerHTML = admins.map(function (a) {
      return html`<tr>
        <td class="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900">${a.nama}${me && me.id === a.id ? html` <span class="ml-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-700">Anda</span>` : ""}</td>
        <td class="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-600">${a.email}</td>
        <td class="whitespace-nowrap px-4 py-2.5 text-slate-700">${Nexus.auth.roleLabel(a.peran)}</td>
        <td class="whitespace-nowrap px-4 py-2.5 text-slate-600">${a.login_terakhir ? u.timeAgo(a.login_terakhir) : "-"}</td>
      </tr>`.value;
    }).join("");
  }

  /* ---------- Info data ---------- */
  function storageBytes() {
    var total = 0;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k.indexOf("nexus-lms:") === 0) total += (k.length + (localStorage.getItem(k) || "").length) * 2;
      }
    } catch (e) { /* diblokir */ }
    return total;
  }

  async function loadInfo() {
    var r = await Promise.all([S.kursus.list(), S.mahasiswa.list(), S.logAktivitas.list()]);
    var items = [
      ["Mode penyimpanan", db.mode === "local" ? "Browser (permanen)" : "Memori (sementara)"],
      ["Ukuran data", u.formatNumber(storageBytes() / 1024, 1) + " KB"],
      ["Kursus · Mahasiswa", r[0].length + " · " + r[1].length],
      ["Catatan log", u.formatNumber(r[2].length)],
    ];
    $("info-data").innerHTML = items.map(function (x) {
      return html`<div class="rounded-lg bg-slate-50 px-3 py-2"><dt class="text-xs text-slate-500">${x[0]}</dt><dd class="mt-0.5 font-semibold text-slate-900">${x[1]}</dd></div>`.value;
    }).join("");
    if (db.mode !== "local") ui.toast("Browser memblokir penyimpanan lokal: perubahan data akan hilang saat halaman ditutup.", "warning", 9000);
  }

  /* ---------- Cadangan, pemulihan, reset ---------- */
  $("btn-cadangan").addEventListener("click", async function () {
    var backup = await db.exportAll();
    u.download("nexus-lms-cadangan-" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify(backup, null, 2), "application/json");
    ui.toast("Cadangan data diunduh.", "success");
  });

  $("file-pulihkan").addEventListener("change", async function (e) {
    var file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return ui.toast("File terlalu besar (maksimal 5 MB).", "error");
    var backup;
    try { backup = JSON.parse(await file.text()); } catch (err) { return ui.toast("File bukan JSON yang valid.", "error"); }
    if (!backup || backup.app !== "nexus-lms" || !backup.data) return ui.toast("File ini bukan cadangan Nexus LMS.", "error");
    var counts = ["kursus", "mahasiswa", "instruktur", "krs"].map(function (t) { return (Array.isArray(backup.data[t]) ? backup.data[t].length : 0) + " " + t; }).join(", ");
    var ok = await ui.confirm({
      title: "Pulihkan data dari cadangan?", danger: true, confirmLabel: "Ya, pulihkan",
      message: html`<p>Seluruh data saat ini akan <strong class="text-slate-900">diganti</strong> dengan isi file <span class="font-mono">${file.name}</span>.</p>
        <p class="mt-2 text-xs text-slate-500">Dibuat: ${backup.exported_at ? u.formatDate(backup.exported_at, true) : "-"} · Isi: ${counts}</p>`,
    });
    if (!ok) return;
    try {
      await db.importAll(backup);
      ui.flash("Data berhasil dipulihkan dari " + file.name + ".", "success");
      location.reload();
    } catch (err) {
      ui.toast(err.message, "error");
    }
  });

  $("btn-reset-data").addEventListener("click", function () {
    var m = ui.modal({
      title: "Reset ke data awal?",
      body: html`<p>Semua perubahan (kursus, mahasiswa, KRS, nilai, sertifikat, log, pengaturan) akan <strong class="text-red-700">dihapus permanen</strong> dan diganti data contoh awal.</p>
        <p class="mt-2">Disarankan mengunduh cadangan terlebih dahulu.</p>
        <label for="konfirmasi-reset" class="mt-4 block text-sm font-medium text-slate-700">Ketik <span class="font-mono font-bold">RESET</span> untuk melanjutkan</label>
        <input id="konfirmasi-reset" type="text" autocomplete="off" class="mt-1 block w-full rounded-lg border-slate-300 font-mono text-sm focus:border-red-500 focus:ring-red-500">`,
      actions: [
        { label: "Batal", variant: "secondary" },
        { label: "Reset Data", variant: "danger", onClick: async function () {
          if (document.getElementById("konfirmasi-reset").value.trim() !== "RESET") {
            ui.toast("Ketik RESET (huruf kapital) untuk mengonfirmasi.", "warning");
            return false;
          }
          await db.reset();
          ui.flash("Data berhasil dikembalikan ke kondisi awal.", "success");
          dirty = false;
          location.reload();
        } },
      ],
    });
    return m;
  });

  Promise.all([loadSettings(), loadAdmins(), loadInfo()]).catch(function (e) {
    ui.toast("Gagal memuat pengaturan: " + e.message, "error");
    console.error(e);
  });
})();
