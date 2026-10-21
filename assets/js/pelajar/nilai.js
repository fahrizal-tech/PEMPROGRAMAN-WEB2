/**
 * Portal Pelajar — Nilai & Sertifikat: rekap nilai per kursus (nilai sementara dari
 * tugas yang dinilai sesuai bobot, nilai akhir dari dosen) dan sertifikat milik sendiri.
 */
(function () {
  "use strict";

  var S = Nexus.services;
  var ui = Nexus.ui;
  var u = Nexus.utils;
  var html = ui.html;
  var $ = function (id) { return document.getElementById(id); };

  var me = null, institusi = "", sertifikat = [];

  /** Huruf mutu dari nilai angka (skala umum perguruan tinggi). */
  function huruf(n) {
    var skala = [[85, "A"], [80, "A-"], [75, "B+"], [70, "B"], [65, "B-"], [60, "C+"], [55, "C"], [40, "D"]];
    for (var i = 0; i < skala.length; i++) if (n >= skala[i][0]) return skala[i][1];
    return "E";
  }

  /** Nilai sementara = rata-rata berbobot dari tugas yang sudah dinilai. */
  function sementara(tugas) {
    var dinilai = tugas.filter(function (x) { return x.pengumpulan && x.pengumpulan.status === "dinilai" && x.pengumpulan.nilai != null; });
    var bobot = dinilai.reduce(function (n, x) { return n + x.tugas.bobot_persen; }, 0);
    return {
      dinilai: dinilai.length,
      total: tugas.length,
      nilai: bobot ? dinilai.reduce(function (n, x) { return n + x.pengumpulan.nilai * x.tugas.bobot_persen; }, 0) / bobot : null,
    };
  }

  async function render() {
    var r = await Promise.all([S.pelajar.me(), S.pelajar.kursusSaya(), S.pelajar.tugas(), S.pelajar.sertifikat(), S.pengaturan.get("nama_institusi")]);
    me = r[0];
    var kursus = r[1].filter(function (x) { return x.krs.status === "disetujui" && x.kursus; });
    var tugas = r[2];
    sertifikat = r[3];
    institusi = r[4] || "";

    var rows = kursus.map(function (x) {
      var s = sementara(tugas.filter(function (t) { return t.tugas.kursus_id === x.kursus.id; }));
      var akhir = x.krs.nilai_akhir;
      var lulus = akhir != null ? akhir >= (x.kursus.passing_grade || 60) : null;
      return { x: x, s: s, akhir: akhir, lulus: lulus };
    });
    var lulus = rows.filter(function (r) { return r.lulus; });
    var terbit = sertifikat.filter(function (s) { return s.sertifikat.status === "terbit"; });

    /* ---------- KPI ---------- */
    $("kpi-ipk").textContent = me.ipk ? u.formatNumber(me.ipk, 2) : "-";
    $("kpi-ipk-sub").textContent = "Semester " + me.semester + " · " + ui.statusLabel(me.status);
    $("kpi-lulus").textContent = lulus.length;
    $("kpi-lulus-sub").textContent = lulus.reduce(function (n, r) { return n + (r.x.kursus.sks || 0); }, 0) + " SKS dari " + rows.length + " kursus diambil";
    $("kpi-sertifikat").textContent = terbit.length;
    $("kpi-sertifikat-sub").textContent = !sertifikat.length ? "Belum ada sertifikat"
      : sertifikat.length - terbit.length ? (sertifikat.length - terbit.length) + " lainnya menunggu TTE / dicabut" : "Semua sertifikat sudah terbit";

    /* ---------- Rekap nilai ---------- */
    $("tabel-nilai").innerHTML = rows.length ? rows.map(function (r) {
      var k = r.x.kursus;
      var status = r.lulus === true ? ui.badge("aktif", "Lulus") : r.lulus === false ? ui.badge("ditolak", "Belum lulus") : ui.badge("terjadwal", "Berjalan");
      return html`<tr class="align-top">
        <td class="px-5 py-3"><p class="font-mono text-xs text-slate-500">${k.kode_mk}</p><p class="font-medium text-slate-900">${k.nama}</p></td>
        <td class="px-5 py-3 text-slate-700">${k.sks}</td>
        <td class="px-5 py-3 text-slate-700">${r.s.dinilai} / ${r.s.total}</td>
        <td class="px-5 py-3 text-slate-700">${r.s.nilai != null ? u.formatNumber(r.s.nilai, 1) : "-"}</td>
        <td class="px-5 py-3">${r.akhir != null ? html`<span class="font-semibold text-slate-900">${u.formatNumber(r.akhir)}</span> <span class="ml-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">${huruf(r.akhir)}</span>` : html`<span class="text-xs text-slate-400">Belum ditetapkan</span>`}</td>
        <td class="px-5 py-3">${status}</td>
      </tr>`.value;
    }).join("") : html`<tr><td colspan="6">${me.status === "lulus"
      ? ui.emptyState("Tidak ada kursus pada periode aktif", "Anda sudah lulus. Sertifikat kelulusan kursus tersedia di bawah.")
      : ui.emptyState("Belum ada kursus", "Nilai tampil setelah KRS Anda disetujui.")}</td></tr>`.value;

    /* ---------- Sertifikat ---------- */
    $("daftar-sertifikat").innerHTML = sertifikat.length ? sertifikat.map(function (y) {
      var s = y.sertifikat, k = y.kursus || {};
      return html`<article class="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <span class="material-symbols-outlined rounded-xl bg-blue-50 p-3 text-[28px] text-blue-700" aria-hidden="true">workspace_premium</span>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="font-mono text-xs text-slate-500">${s.nomor_registrasi}</p>
            ${ui.badge(s.status)}
          </div>
          <h4 class="mt-1 text-sm font-semibold text-slate-900">${s.jenis}</h4>
          <p class="text-xs text-slate-600">${k.kode_mk} — ${k.nama}</p>
          <p class="mt-1 text-xs text-slate-500">${s.status === "terbit" ? "Terbit " + u.formatDate(s.tanggal_terbit) : s.status === "menunggu_tte" ? "Menunggu tanda tangan elektronik" : "Dicabut oleh BAAK"}</p>
          ${s.status !== "dicabut" ? html`<button type="button" data-lihat="${s.id}" class="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">${s.status === "terbit" ? "Lihat & cetak" : "Lihat draf"}</button>` : ""}
        </div>
      </article>`.value;
    }).join("") : html`<div class="rounded-xl border border-slate-200 bg-white md:col-span-2">${ui.emptyState("Belum ada sertifikat", "Sertifikat diterbitkan BAAK setelah Anda lulus kursus.")}</div>`.value;
  }

  $("daftar-sertifikat").addEventListener("click", function (e) {
    var b = e.target.closest("[data-lihat]");
    if (!b) return;
    var y = sertifikat.filter(function (z) { return z.sertifikat.id === b.getAttribute("data-lihat"); })[0];
    // Hanya sertifikat yang sudah terbit (bertanda tangan) yang dapat dicetak.
    Nexus.sertifikat.preview({
      sertifikat: y.sertifikat, kursus: y.kursus, nama: me.nama, nim: me.nim, institusi: institusi,
      allowPrint: y.sertifikat.status === "terbit",
    });
  });

  render().catch(function (err) {
    ui.toast("Gagal memuat nilai: " + (err.message || err), "error");
    console.error(err);
  });
})();
