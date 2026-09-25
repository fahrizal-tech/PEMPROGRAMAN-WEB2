/**
 * Form Kursus: tambah (form.html) atau edit (form.html?id=...), termasuk struktur modul.
 */
(function () {
  "use strict";

  var S = Nexus.services;
  var ui = Nexus.ui;
  var u = Nexus.utils;
  var html = ui.html;
  var $ = function (id) { return document.getElementById(id); };

  var form = $("form-kursus");
  var list = $("modul-list");
  var id = u.param("id");
  var modules = []; // [{ id?, judul, tipe_materi }]
  var dirty = false;

  var TIPE = { video: "Video", dokumen: "Dokumen", kuis: "Kuis" };

  /* ---------- Status perubahan ---------- */
  function setDirty(v) {
    dirty = v;
    $("save-state").innerHTML = (v
      ? html`<span class="material-symbols-outlined text-[16px] text-amber-600" aria-hidden="true">edit</span><span class="text-amber-700">Ada perubahan yang belum disimpan.</span>`
      : html`<span class="material-symbols-outlined text-[16px] text-emerald-600" aria-hidden="true">check_circle</span><span>Belum ada perubahan.</span>`).value;
  }
  window.addEventListener("beforeunload", function (e) {
    if (dirty) { e.preventDefault(); e.returnValue = ""; }
  });
  form.addEventListener("input", function (e) { if (!e.target.closest("[data-no-dirty]")) setDirty(true); });
  form.addEventListener("change", function () { setDirty(true); });

  /* ---------- Penghitung deskripsi ---------- */
  var desc = $("deskripsi");
  function updateCounter() { $("deskripsi-counter").textContent = desc.value.length + " / 2000"; }
  desc.addEventListener("input", updateCounter);

  /* ---------- Daftar modul ---------- */
  function renderModules() {
    $("modul-count").textContent = modules.length + " modul";
    $("modul-empty").classList.toggle("hidden", modules.length > 0);
    $("btn-tambah-modul").disabled = modules.length >= 16;
    list.innerHTML = modules.map(function (m, i) {
      return html`<li class="rounded-lg border border-slate-200 bg-slate-50/60 p-3" data-index="${i}">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
          <span class="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white font-mono text-sm font-semibold text-slate-700 ring-1 ring-slate-200" aria-hidden="true">${i + 1}</span>
          <div class="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-[1fr_10rem]">
            <div>
              <label for="modul-judul-${i}" class="sr-only">Judul modul pertemuan ${i + 1}</label>
              <input id="modul-judul-${i}" data-modul-field="judul" type="text" maxlength="120" value="${m.judul}" placeholder="Judul pertemuan ${i + 1}" class="block w-full rounded-lg border-slate-300 text-sm focus:border-blue-500 focus:ring-blue-500">
              <p id="modul-error-${i}" class="mt-1 hidden text-xs font-medium text-red-600"></p>
            </div>
            <div>
              <label for="modul-tipe-${i}" class="sr-only">Tipe materi pertemuan ${i + 1}</label>
              <select id="modul-tipe-${i}" data-modul-field="tipe_materi" class="block w-full rounded-lg border-slate-300 text-sm focus:border-blue-500 focus:ring-blue-500">
                ${Object.keys(TIPE).map(function (t) { return html`<option value="${t}" ${ui.raw(m.tipe_materi === t ? "selected" : "")}>${TIPE[t]}</option>`; })}
              </select>
            </div>
          </div>
          <div class="flex gap-1 self-end sm:self-auto">
            <button type="button" data-modul-action="up" ${ui.raw(i === 0 ? "disabled" : "")} class="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-800 disabled:opacity-30" aria-label="Naikkan modul ${i + 1}"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_upward</span></button>
            <button type="button" data-modul-action="down" ${ui.raw(i === modules.length - 1 ? "disabled" : "")} class="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-800 disabled:opacity-30" aria-label="Turunkan modul ${i + 1}"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_downward</span></button>
            <button type="button" data-modul-action="remove" class="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600" aria-label="Hapus modul ${i + 1}"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span></button>
          </div>
        </div>
      </li>`.value;
    }).join("");
  }

  function modulIndex(el) { return Number(el.closest("[data-index]").getAttribute("data-index")); }

  list.addEventListener("input", function (e) {
    var f = e.target.getAttribute("data-modul-field");
    if (!f) return;
    var i = modulIndex(e.target);
    modules[i][f] = e.target.value;
    showModuleError(i, null);
  });
  list.addEventListener("change", function (e) {
    var f = e.target.getAttribute("data-modul-field");
    if (f) modules[modulIndex(e.target)][f] = e.target.value;
  });
  list.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-modul-action]");
    if (!btn) return;
    var i = modulIndex(btn);
    var act = btn.getAttribute("data-modul-action");
    if (act === "remove") modules.splice(i, 1);
    if (act === "up" && i > 0) modules.splice(i - 1, 0, modules.splice(i, 1)[0]);
    if (act === "down" && i < modules.length - 1) modules.splice(i + 1, 0, modules.splice(i, 1)[0]);
    setDirty(true);
    renderModules();
    var target = act === "remove" ? null : list.querySelector('[data-index="' + (act === "up" ? i - 1 : i + 1) + '"] [data-modul-action="' + act + '"]');
    if (target && !target.disabled) target.focus();
  });
  $("btn-tambah-modul").addEventListener("click", function () {
    modules.push({ judul: "", tipe_materi: "video" });
    setDirty(true);
    renderModules();
    $("modul-judul-" + (modules.length - 1)).focus();
  });

  function showModuleError(i, message) {
    var p = $("modul-error-" + i);
    var input = $("modul-judul-" + i);
    if (!p) return;
    p.textContent = message || "";
    p.classList.toggle("hidden", !message);
    input.classList.toggle("border-red-400", !!message);
    if (message) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
  }

  function showModuleErrors(errors) {
    var general = $("modul-error");
    general.classList.toggle("hidden", !errors.modul);
    general.textContent = errors.modul || "";
    var first = null;
    Object.keys(errors).forEach(function (k) {
      var m = k.match(/^modul_(\d+)_/);
      if (!m) return;
      showModuleError(Number(m[1]), errors[k]);
      if (first === null) first = Number(m[1]);
    });
    if (first !== null) $("modul-judul-" + first).focus();
    else if (errors.modul) general.scrollIntoView({ block: "center" });
  }

  /* ---------- Isi pilihan & data awal ---------- */
  async function init() {
    var r = await Promise.all([S.programStudi.list(), S.instruktur.list(), S.pengaturan.all()]);
    r[0].forEach(function (p) { $("prodi_id").add(new Option(p.nama + " (" + p.jenjang + ")", p.id)); });
    r[1].sort(function (a, b) { return a.nama.localeCompare(b.nama, "id"); })
      .forEach(function (d) { $("instruktur_id").add(new Option(d.nama + " — NIDN " + d.nidn, d.id)); });

    if (!id) {
      ui.fillForm(form, { periode: r[2].periode_aktif, passing_grade: r[2].passing_grade_default || 60, sks: 3, kuota: 40, status: "draft" });
      modules = [{ judul: "", tipe_materi: "video" }];
    } else {
      var k = await S.kursus.get(id);
      if (!k) {
        form.classList.add("hidden");
        $("not-found").classList.remove("hidden");
        return;
      }
      document.title = "Edit " + k.kode_mk + " · Nexus LMS";
      $("crumb-mode").textContent = "Edit " + k.kode_mk;
      $("judul-form").textContent = "Edit Kursus " + k.kode_mk;
      $("sub-form").textContent = (k.diubah_pada ? "Terakhir diubah " + u.formatDate(k.diubah_pada, true) + "." : "Data awal sistem, belum pernah diubah.") + " Perubahan langsung berlaku setelah disimpan.";
      ui.fillForm(form, k);
      modules = (await S.modul.query(function (m) { return m.kursus_id === id; }))
        .sort(function (a, b) { return a.pertemuan_ke - b.pertemuan_ke; })
        .map(function (m) { return { id: m.id, judul: m.judul, tipe_materi: m.tipe_materi }; });
    }
    updateCounter();
    renderModules();
    setDirty(false);
  }

  /* ---------- Simpan ---------- */
  var binding = ui.bindForm(form, {
    service: S.kursus,
    submitButton: $("btn-simpan"),
    onSubmit: async function (data) {
      var check = S.modul.validateStructure(modules);
      if (!check.valid) {
        showModuleErrors(check.errors);
        ui.toast("Periksa kembali struktur modul.", "error");
        return;
      }
      if (data.status === "publikasi" && !modules.length) {
        binding.showErrors({ status: "Kursus harus memiliki minimal 1 modul sebelum dipublikasikan." });
        ui.toast("Tambahkan minimal 1 modul atau simpan sebagai draft.", "error");
        return;
      }
      var saved;
      if (id) {
        // Simpan modul lebih dulu agar aturan "publikasi butuh modul" terpenuhi.
        await S.modul.saveForKursus(id, modules).catch(function (e) { if (e.errors) showModuleErrors(e.errors); throw e; });
        saved = await S.kursus.update(id, data);
      } else {
        saved = await S.kursus.create(data);
        await S.modul.saveForKursus(saved.id, modules);
      }
      setDirty(false);
      ui.flash("Kursus " + saved.kode_mk + " berhasil " + (id ? "diperbarui" : "ditambahkan") + ".", "success");
      location.href = "data-master.html";
    },
  });

  init().catch(function (e) {
    ui.toast("Gagal memuat form: " + e.message, "error");
    console.error(e);
  });
})();
