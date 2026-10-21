/**
 * Nexus.sertifikat — pratinjau & cetak sertifikat (dipakai panel admin dan portal pelajar).
 *
 *   Nexus.sertifikat.preview({ sertifikat, kursus, nama, nim, institusi, allowPrint })
 *
 * Sertifikat berstatus menunggu TTE diberi tanda air DRAF, yang dicabut DICABUT.
 * Cetak memakai gaya cetak body.cetak-sertifikat (assets/css/src/app.css).
 */
(function () {
  "use strict";

  var Nexus = window.Nexus;

  function preview(o) {
    var ui = Nexus.ui, u = Nexus.utils, html = ui.html;
    var s = o.sertifikat, k = o.kursus || {};
    var watermark = s.status === "dicabut" ? "DICABUT" : s.status === "menunggu_tte" ? "DRAF" : "";
    var actions = [{ label: "Tutup", variant: "secondary" }];
    if (o.allowPrint !== false) {
      actions.push({ label: "Cetak / Simpan PDF", variant: "primary", onClick: function () {
        document.body.classList.add("cetak-sertifikat");
        window.print();
        document.body.classList.remove("cetak-sertifikat");
        return false;
      } });
    }
    return ui.modal({
      title: "Pratinjau Sertifikat",
      size: "lg",
      body: html`
        <div id="sertifikat-cetak" class="relative overflow-hidden rounded-lg border-4 border-double border-blue-800 bg-white p-6 text-center sm:p-10">
          ${watermark ? html`<p class="pointer-events-none absolute inset-0 flex -rotate-12 items-center justify-center text-7xl font-black tracking-widest text-red-500/15" aria-hidden="true">${watermark}</p>` : ""}
          <img src="../assets/img/logo-nexus-lms.svg" alt="" class="mx-auto h-9 w-auto">
          <p class="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">${o.institusi || "Nexus LMS"}</p>
          <h3 class="mt-4 font-serif text-2xl font-bold text-blue-900 sm:text-3xl">${s.jenis}</h3>
          <p class="mt-4 text-sm text-slate-600">Diberikan kepada</p>
          <p class="mt-1 text-2xl font-bold text-slate-900">${o.nama}</p>
          <p class="font-mono text-xs text-slate-500">NIM ${o.nim}</p>
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
      actions: actions,
    });
  }

  Nexus.sertifikat = { preview: preview };
})();
