/**
 * Etalase komponen di pages/layout.html (template master):
 * toast, modal, konfirmasi, hapus beralasan, form tervalidasi, dan tabel data.
 */
(function () {
  "use strict";

  var ui = Nexus.ui;
  var S = Nexus.services;
  var html = ui.html;

  /* ---------- Badge status ---------- */
  document.getElementById("demo-badges").innerHTML = ["publikasi", "diajukan", "ditolak", "draft", "terjadwal", "live"]
    .map(function (s) { return ui.badge(s).value; }).join("");

  /* ---------- Tombol demo ---------- */
  var demos = {
    toast: function () {
      ui.toast("Data berhasil disimpan.", "success");
      setTimeout(function () { ui.toast("Ini contoh pesan informasi.", "info"); }, 350);
    },
    modal: function () {
      ui.modal({
        title: "Contoh Modal",
        body: html`<p>Modal dapat ditutup dengan tombol <kbd class="rounded border px-1 text-xs">Esc</kbd>, klik latar, atau tombol Tutup. Fokus keyboard tetap di dalam modal.</p>`,
        actions: [{ label: "Tutup", variant: "primary", autofocus: true }],
      });
    },
    confirm: async function () {
      var ok = await ui.confirm({ title: "Simpan perubahan?", message: "Perubahan akan langsung diterapkan.", confirmLabel: "Simpan" });
      ui.toast(ok ? "Anda memilih: Simpan." : "Dibatalkan.", ok ? "success" : "info");
    },
    delete: function () {
      // Kursus CS-301 memiliki KRS aktif → contoh penghapusan yang ditolak beserta alasannya.
      ui.confirmDelete(S.kursus, "krs_101", "Kursus CS-301 Arsitektur Cloud Computing");
    },
  };
  document.querySelectorAll("[data-demo]").forEach(function (b) {
    b.addEventListener("click", function () { demos[b.getAttribute("data-demo")](); });
  });

  /* ---------- Form tervalidasi (skema subset kursus, tidak menyimpan) ---------- */
  var kursusSchema = S.kursus.schema;
  var demoSchema = { kode_mk: kursusSchema.kode_mk, nama: kursusSchema.nama, tingkat: kursusSchema.tingkat };
  ui.bindForm(document.getElementById("demo-form"), {
    service: {
      schema: demoSchema,
      validate: function (data, opt) { return Nexus.validate(demoSchema, data, opt); },
    },
    onSubmit: async function (data) {
      ui.toast("Valid: " + data.kode_mk + " — " + data.nama + " (contoh, tidak disimpan).", "success");
    },
  });

  /* ---------- Tabel data kursus ---------- */
  var table = ui.dataTable({
    tbody: document.getElementById("demo-tbody"),
    colspan: 4,
    pageSize: 5,
    load: function () { return S.kursus.list(); },
    search: { input: document.getElementById("demo-cari"), fields: ["kode_mk", "nama"] },
    filters: [{ el: document.getElementById("demo-status"), match: function (r, v) { return r.status === v; } }],
    sortSelect: document.getElementById("demo-urut"),
    defaultSort: "kode",
    sorters: {
      kode: function (a, b) { return a.kode_mk.localeCompare(b.kode_mk); },
      nama: function (a, b) { return a.nama.localeCompare(b.nama, "id"); },
      kuota: function (a, b) { return b.kuota - a.kuota; },
    },
    counter: document.getElementById("demo-counter"),
    pager: document.getElementById("demo-pager"),
    render: function (k) {
      return html`<tr class="hover:bg-slate-50">
        <td class="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">${k.kode_mk}</td>
        <td class="px-4 py-3 font-medium text-slate-900">${k.nama}</td>
        <td class="px-4 py-3 text-right tabular-nums text-slate-600">${k.kuota}</td>
        <td class="px-4 py-3">${ui.badge(k.status)}</td>
      </tr>`;
    },
  });
  table.refresh();
  ui.onDataChange(["kursus"], table.refresh);
})();
