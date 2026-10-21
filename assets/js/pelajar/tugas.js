/**
 * Portal Pelajar — Tugas & Kuis: daftar asesmen dari kursus yang disetujui, status
 * pengumpulan & nilai, serta form kumpulkan/perbarui jawaban (tautan berkas + catatan).
 */
(function () {
  "use strict";

  var S = Nexus.services;
  var ui = Nexus.ui;
  var u = Nexus.utils;
  var html = ui.html;
  var $ = function (id) { return document.getElementById(id); };

  var JENIS = { tugas: "Tugas", kuis: "Kuis", uts: "UTS", uas: "UAS" };
  var list = [];
  var filter = "semua";

  // Adapter untuk ui.formModal: validasi per kolom memakai skema pengumpulan.
  var formService = {
    schema: S.pelajar.schemaPengumpulan,
    validate: function (data, options) { return Nexus.validate(S.pelajar.schemaPengumpulan, data, options); },
  };

  /** Status tampilan satu tugas bagi mahasiswa. */
  function kondisi(x) {
    var lewat = new Date(x.tugas.deadline).getTime() < Date.now();
    var p = x.pengumpulan;
    if (p && p.status === "dinilai") return { kunci: "dinilai", bisa: false };
    if (p) return { kunci: "menunggu", bisa: x.tugas.status === "aktif" && !lewat };
    return { kunci: "belum", bisa: x.tugas.status === "aktif" && !lewat, lewat: lewat || x.tugas.status === "ditutup" };
  }

  function sisa(iso) {
    var ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return null;
    var jam = Math.floor(ms / 3600000);
    return jam >= 48 ? Math.floor(jam / 24) + " hari lagi" : jam >= 1 ? jam + " jam lagi" : Math.max(1, Math.round(ms / 60000)) + " menit lagi";
  }

  function card(x) {
    var c = kondisi(x), p = x.pengumpulan, t = x.tugas;
    var s = sisa(t.deadline);
    var status = c.kunci === "dinilai" ? ui.badge("dinilai", "Dinilai")
      : c.kunci === "menunggu" ? ui.badge(p.status === "revisi" ? "revisi" : "menunggu", p.status === "revisi" ? "Perlu revisi" : "Menunggu nilai")
      : c.lewat ? ui.badge("ditolak", "Tidak dikumpulkan") : ui.badge("draft", "Belum dikumpulkan");
    var tenggatTone = !s ? "text-slate-500" : /menit|jam/.test(s) ? "text-red-700" : "text-slate-600";
    return html`<article class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="font-mono text-[11px] text-slate-500">${x.kursus ? x.kursus.kode_mk : ""} · ${JENIS[t.jenis] || t.jenis} · bobot ${t.bobot_persen}%</p>
          <h3 class="mt-0.5 text-sm font-semibold leading-snug text-slate-900">${t.judul}</h3>
        </div>
        ${status}
      </div>
      <p class="text-xs ${tenggatTone}"><span class="font-semibold">Tenggat:</span> ${u.formatDate(t.deadline, true)}${s ? " · " + s : " · sudah lewat"}</p>
      ${p ? html`<div class="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        <p>Dikumpulkan ${u.formatDate(p.dikumpulkan_pada, true)}${p.tautan ? html` · <a href="${p.tautan}" target="_blank" rel="noopener noreferrer" class="font-medium text-blue-700 hover:underline">Lihat jawaban ↗</a>` : ""}</p>
        ${p.catatan ? html`<p class="mt-1">Catatan: ${p.catatan}</p>` : ""}
      </div>` : ""}
      <div class="mt-auto flex items-center justify-between gap-3">
        <p class="text-sm">${p && p.nilai != null ? html`Nilai <span class="text-xl font-bold text-slate-900">${u.formatNumber(p.nilai)}</span>` : html`<span class="text-xs text-slate-400">Belum ada nilai</span>`}</p>
        ${c.bisa ? html`<button type="button" data-kumpul="${t.id}" class="rounded-lg ${p ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50" : "bg-blue-600 text-white hover:bg-blue-700"} px-4 py-2 text-sm font-semibold">${p ? "Perbarui jawaban" : "Kumpulkan"}</button>` : ""}
      </div>
    </article>`;
  }

  function render() {
    var shown = list.filter(function (x) { return filter === "semua" || kondisi(x).kunci === filter; });
    document.querySelectorAll("#filter-tugas [data-filter]").forEach(function (b) {
      var on = b.getAttribute("data-filter") === filter;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.className = "rounded-full border px-3.5 py-1.5 text-sm font-semibold " + (on ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50");
    });
    $("daftar-tugas").innerHTML = shown.length ? shown.map(function (x) { return card(x).value; }).join("")
      : html`<div class="rounded-xl border border-slate-200 bg-white lg:col-span-2">${ui.emptyState(list.length ? "Tidak ada tugas pada filter ini" : "Belum ada tugas", list.length ? "Pilih filter lain." : "Tugas tampil setelah KRS disetujui dan dosen menerbitkannya.")}</div>`.value;
  }

  async function load() {
    list = await S.pelajar.tugas();
    // Belum dikumpulkan & masih bisa dikerjakan di atas, lalu urut tenggat.
    list.sort(function (a, b) {
      var ka = kondisi(a).bisa && !a.pengumpulan ? 0 : 1, kb = kondisi(b).bisa && !b.pengumpulan ? 0 : 1;
      return ka - kb || (a.tugas.deadline < b.tugas.deadline ? -1 : 1);
    });
    render();
  }

  $("filter-tugas").addEventListener("click", function (e) {
    var b = e.target.closest("[data-filter]");
    if (!b) return;
    filter = b.getAttribute("data-filter");
    render();
  });

  $("daftar-tugas").addEventListener("click", function (e) {
    var b = e.target.closest("[data-kumpul]");
    if (!b) return;
    var x = list.filter(function (y) { return y.tugas.id === b.getAttribute("data-kumpul"); })[0];
    ui.formModal({
      title: (x.pengumpulan ? "Perbarui jawaban: " : "Kumpulkan: ") + x.tugas.judul,
      size: "md",
      service: formService,
      initial: x.pengumpulan ? { tautan: x.pengumpulan.tautan || "", catatan: x.pengumpulan.catatan || "" } : {},
      submitLabel: x.pengumpulan ? "Perbarui" : "Kumpulkan",
      fields: html`
        ${ui.field({ name: "tautan", label: "Tautan berkas jawaban", type: "url", required: true, span: "sm:col-span-2", placeholder: "https://drive.google.com/…", help: "Unggah berkas ke Google Drive/OneDrive lalu tempel tautan yang dapat dibuka dosen." })}
        ${ui.field({ name: "catatan", label: "Catatan untuk dosen (opsional)", type: "textarea", span: "sm:col-span-2", rows: 3 })}`,
      save: function (data) { return S.pelajar.kumpulkan(x.tugas.id, data); },
      success: function () { return "Jawaban \"" + x.tugas.judul + "\" berhasil " + (x.pengumpulan ? "diperbarui" : "dikumpulkan") + "."; },
    }).then(function (row) { if (row) load(); });
  });

  load().catch(function (err) {
    ui.toast("Gagal memuat tugas: " + (err.message || err), "error");
    console.error(err);
  });
})();
