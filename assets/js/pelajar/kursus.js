/**
 * Portal Pelajar — Kursus Saya: KRS milik sendiri (batalkan bila masih diajukan)
 * dan katalog kursus yang dibuka (ajukan KRS).
 */
(function () {
  "use strict";

  var S = Nexus.services;
  var ui = Nexus.ui;
  var u = Nexus.utils;
  var html = ui.html;
  var $ = function (id) { return document.getElementById(id); };

  var TONE = {
    disetujui: "bg-emerald-50 text-emerald-800", diajukan: "bg-amber-50 text-amber-800",
    ditolak: "bg-red-50 text-red-800", lain: "bg-slate-100 text-slate-600",
  };

  var state = { me: null, mine: [], katalog: [], prodi: {}, dosen: {}, batas: null, periode: "" };

  function batasLewat() {
    return !!state.batas && u.localDate(new Date()) > state.batas;
  }

  async function load() {
    var r = await Promise.all([
      S.pelajar.me(), S.pelajar.kursusSaya(), S.pelajar.katalog(), S.programStudi.list(), S.instruktur.list(),
      S.pengaturan.get("batas_krs"), S.pengaturan.get("periode_aktif"),
    ]);
    state.me = r[0];
    state.mine = r[1];
    state.katalog = r[2];
    state.prodi = {}; r[3].forEach(function (p) { state.prodi[p.id] = p; });
    state.dosen = {}; r[4].forEach(function (d) { state.dosen[d.id] = d; });
    state.batas = r[5];
    state.periode = r[6] || "";
    render();
  }

  function render() {
    var m = state.me;
    var disetujui = state.mine.filter(function (x) { return x.krs.status === "disetujui" && x.kursus; });
    var sks = disetujui.reduce(function (n, x) { return n + (x.kursus.sks || 0); }, 0);

    $("info-periode").textContent = "Kartu Rencana Studi · " + state.periode.replace("-", " ");
    $("info-krs").textContent = m.status !== "aktif"
      ? "Status akademik Anda " + ui.statusLabel(m.status).toLowerCase() + ", sehingga pengajuan KRS tidak tersedia."
      : state.batas
        ? (batasLewat() ? "Masa pengisian KRS sudah berakhir pada " : "Batas pengisian KRS: ") + u.formatDate(state.batas)
        : "Kursus yang Anda ambil semester ini dan pengajuan KRS.";
    $("ringkas-krs").textContent = disetujui.length + " kursus disetujui · " + sks + " SKS";

    /* ---------- Tabel KRS saya ---------- */
    var rows = state.mine.slice().sort(function (a, b) { return (b.krs.diajukan_pada || "") < (a.krs.diajukan_pada || "") ? -1 : 1; });
    $("tabel-krs").innerHTML = rows.length ? rows.map(function (x) {
      var k = x.kursus || {};
      return html`<tr class="align-top">
        <td class="px-5 py-3"><p class="font-mono text-xs text-slate-500">${k.kode_mk || "-"}</p><p class="font-medium text-slate-900">${k.nama || "Kursus dihapus"}</p></td>
        <td class="px-5 py-3 text-slate-700">${k.sks || "-"}</td>
        <td class="px-5 py-3 text-slate-700">${x.dosen ? x.dosen.nama : "-"}</td>
        <td class="whitespace-nowrap px-5 py-3 text-slate-700">${x.krs.diajukan_pada ? u.formatDate(x.krs.diajukan_pada) : "-"}</td>
        <td class="px-5 py-3">${ui.badge(x.krs.status)}</td>
        <td class="px-5 py-3 text-right">${x.krs.status === "diajukan"
          ? html`<button type="button" data-batal="${x.krs.id}" class="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">Batalkan</button>`
          : html`<span class="text-xs text-slate-400" aria-hidden="true">—</span>`}</td>
      </tr>`.value;
    }).join("") : html`<tr><td colspan="6">${ui.emptyState("Belum ada KRS", "Pilih kursus dari katalog di bawah lalu tekan Ajukan KRS.")}</td></tr>`.value;

    renderKatalog();
  }

  /** Alasan tombol Ajukan tidak tersedia (null = boleh). */
  function alasanTidakBisa(x) {
    if (x.krs) return { label: x.krs.status === "ditolak" ? "KRS ditolak · hubungi BAAK" : "KRS " + ui.statusLabel(x.krs.status).toLowerCase(), tone: x.krs.status };
    if (state.me.status !== "aktif") return { label: "Tidak tersedia" };
    if (batasLewat()) return { label: "Masa KRS berakhir" };
    if (x.terisi >= x.kursus.kuota) return { label: "Kuota penuh" };
    return null;
  }

  function renderKatalog() {
    var q = $("cari").value.trim().toLowerCase();
    var list = state.katalog.filter(function (x) {
      var d = state.dosen[x.kursus.instruktur_id];
      return !q || (x.kursus.kode_mk + " " + x.kursus.nama + " " + (d ? d.nama : "")).toLowerCase().indexOf(q) !== -1;
    });
    $("katalog").innerHTML = list.length ? list.map(function (x) {
      var k = x.kursus, d = state.dosen[k.instruktur_id], p = state.prodi[k.prodi_id];
      var pct = k.kuota ? Math.min(100, Math.round((x.terisi / k.kuota) * 100)) : 0;
      var bar = pct >= 100 ? "bg-red-500" : pct >= 85 ? "bg-amber-500" : "bg-blue-600";
      var blok = alasanTidakBisa(x);
      return html`<article class="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="relative aspect-video overflow-hidden">${Nexus.cover.render(k, p && p.kode, "h-full w-full")}</div>
        <div class="flex flex-1 flex-col gap-2 p-4">
          <p class="font-mono text-[11px] text-slate-500">${k.kode_mk} · ${k.sks} SKS · ${p ? p.nama : "-"}</p>
          <h4 class="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">${k.nama}</h4>
          <p class="truncate text-xs text-slate-500">${d ? d.nama : "-"}</p>
          <div class="mt-auto pt-2">
            <div class="flex justify-between text-xs text-slate-500"><span>Kuota</span><span>${x.terisi} / ${k.kuota}</span></div>
            <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Kuota terisi ${k.kode_mk}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><div class="h-full rounded-full ${bar}" style="width:${pct}%"></div></div>
          </div>
          ${blok
            ? html`<p class="mt-2 rounded-lg px-3 py-2 text-center text-xs font-semibold ${TONE[blok.tone] || TONE.lain}">${blok.label}</p>`
            : html`<button type="button" data-ajukan="${k.id}" class="mt-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">Ajukan KRS</button>`}
        </div>
      </article>`.value;
    }).join("") : html`<div class="rounded-xl border border-slate-200 bg-white sm:col-span-2 xl:col-span-3">${ui.emptyState(q ? "Tidak ada kursus yang cocok" : "Belum ada kursus yang dibuka", q ? "Coba kata kunci lain." : "Kursus akan tampil setelah dipublikasikan BAAK.")}</div>`.value;
  }

  /* ---------- Aksi ---------- */
  $("katalog").addEventListener("click", async function (e) {
    var b = e.target.closest("[data-ajukan]");
    if (!b) return;
    var x = state.katalog.filter(function (y) { return y.kursus.id === b.getAttribute("data-ajukan"); })[0];
    var ok = await ui.confirm({
      title: "Ajukan KRS",
      message: html`<p class="text-sm text-slate-600">Ajukan <b>${x.kursus.kode_mk} ${x.kursus.nama}</b> (${x.kursus.sks} SKS)? Pengajuan akan divalidasi oleh BAAK.</p>`,
      confirmLabel: "Ajukan",
    });
    if (!ok) return;
    b.disabled = true;
    try {
      await S.pelajar.ajukanKrs(x.kursus.id);
      ui.toast("KRS " + x.kursus.kode_mk + " diajukan. Menunggu persetujuan BAAK.", "success");
      await load();
    } catch (err) {
      b.disabled = false;
      ui.toast(err.errors ? Object.values(err.errors)[0] : err.message || String(err), "error");
    }
  });

  $("tabel-krs").addEventListener("click", async function (e) {
    var b = e.target.closest("[data-batal]");
    if (!b) return;
    var x = state.mine.filter(function (y) { return y.krs.id === b.getAttribute("data-batal"); })[0];
    var ok = await ui.confirm({
      title: "Batalkan pengajuan KRS",
      message: html`<p class="text-sm text-slate-600">Batalkan pengajuan <b>${x.kursus ? x.kursus.kode_mk + " " + x.kursus.nama : x.krs.kursus_id}</b>?</p>`,
      confirmLabel: "Batalkan pengajuan",
      cancelLabel: "Kembali",
      danger: true,
    });
    if (!ok) return;
    try {
      await S.pelajar.batalKrs(x.krs.id);
      ui.toast("Pengajuan KRS dibatalkan.", "success");
      await load();
    } catch (err) {
      ui.toast(err.message || String(err), "error");
    }
  });

  $("cari").addEventListener("input", u.debounce(renderKatalog, 200));

  load().catch(function (err) {
    ui.toast("Gagal memuat kursus: " + (err.message || err), "error");
    console.error(err);
  });
  ui.onDataChange(["*"], function (d) { if (d.action === "sync" || d.action === "reset") load(); });
})();
