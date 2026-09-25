/**
 * Nexus.ui — komponen antarmuka bersama:
 *   html (template aman XSS), badge, toast, modal, confirm, confirmDelete,
 *   bindForm (validasi per kolom), dataTable (cari/filter/urut/halaman), onDataChange.
 *
 * Bergantung pada: utils.js (escapeHTML), validators.js (ValidationError).
 */
(function (global) {
  "use strict";

  var Nexus = (global.Nexus = global.Nexus || {});
  var esc = function (v) { return Nexus.utils.escapeHTML(v); };

  /* =====================================================================
   * Template HTML aman: semua nilai ${...} di-escape otomatis,
   * kecuali dibungkus ui.raw() (hanya untuk HTML yang dibuat sendiri).
   * ===================================================================== */
  function Raw(value) { this.value = value; }
  function raw(value) { return new Raw(value); }

  function renderValue(v) {
    if (v == null || v === false) return "";
    if (v instanceof Raw) return v.value;
    if (Array.isArray(v)) return v.map(renderValue).join("");
    return esc(v);
  }

  function html(strings) {
    var out = strings[0];
    for (var i = 1; i < arguments.length; i++) out += renderValue(arguments[i]) + strings[i];
    return raw(out);
  }

  function toNode(content) {
    if (content instanceof Node) return content;
    var t = document.createElement("template");
    t.innerHTML = content instanceof Raw ? content.value : esc(content);
    return t.content;
  }

  /* =====================================================================
   * Badge status (warna konsisten di seluruh aplikasi)
   * ===================================================================== */
  var STATUS = {
    // hijau
    aktif: ["Aktif", "green"], publikasi: ["Publikasi", "green"], disetujui: ["Disetujui", "green"],
    terbit: ["Terbit", "green"], hadir: ["Hadir", "green"], dinilai: ["Dinilai", "green"], selesai: ["Selesai", "slate"],
    lulus: ["Lulus", "blue"], live: ["Live", "red-solid"],
    // kuning
    diajukan: ["Diajukan", "amber"], menunggu: ["Menunggu", "amber"], menunggu_tte: ["Menunggu TTE", "amber"],
    cuti: ["Cuti", "amber"], izin: ["Izin", "amber"], revisi: ["Revisi", "amber"], terjadwal: ["Terjadwal", "blue"],
    // merah
    ditolak: ["Ditolak", "red"], dicabut: ["Dicabut", "red"], nonaktif: ["Nonaktif", "red"], alpa: ["Alpa", "red"],
    // netral
    draft: ["Draft", "slate"], arsip: ["Arsip", "slate"], ditutup: ["Ditutup", "slate"],
  };
  var TONE = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
    "red-solid": "border-red-600 bg-red-600 text-white",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    slate: "border-slate-200 bg-slate-100 text-slate-600",
  };

  function statusLabel(status) {
    return (STATUS[status] || [status])[0];
  }

  function badge(status, label) {
    var s = STATUS[status] || [status, "slate"];
    return html`<span class="inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${TONE[s[1]]}">${label || s[0]}</span>`;
  }

  /* =====================================================================
   * Toast
   * ===================================================================== */
  var TOAST_TONE = {
    success: ["check_circle", "border-emerald-200 bg-white text-slate-800", "text-emerald-600"],
    error: ["error", "border-red-200 bg-white text-slate-800", "text-red-600"],
    warning: ["warning", "border-amber-200 bg-white text-slate-800", "text-amber-600"],
    info: ["info", "border-blue-200 bg-white text-slate-800", "text-blue-600"],
  };

  function toastRegion() {
    var r = document.getElementById("toast-region");
    if (!r) {
      r = document.createElement("div");
      r.id = "toast-region";
      r.setAttribute("aria-live", "polite");
      r.setAttribute("role", "status");
      // HP: di bawah layar (tidak menutupi topbar/tombol menu). Desktop: kanan atas.
      r.className = "pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex flex-col items-end gap-2 sm:bottom-auto sm:left-auto sm:right-6 sm:top-6";
      document.body.appendChild(r);
    }
    return r;
  }

  function toast(message, tone, timeout) {
    var t = TOAST_TONE[tone || "success"] || TOAST_TONE.info;
    var region = toastRegion();
    while (region.children.length >= 4) region.firstChild.remove();
    var el = document.createElement("div");
    // Badan toast tembus-klik agar tidak menghalangi tombol di bawahnya (mis. di dalam modal);
    // hanya tombol tutup yang dapat diklik.
    el.className = "pointer-events-none flex w-full max-w-sm items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg transition-all duration-200 " + t[1];
    el.appendChild(toNode(html`
      <span class="material-symbols-outlined text-[20px] ${t[2]}" aria-hidden="true">${t[0]}</span>
      <p class="flex-1 leading-snug">${message}</p>
      <button type="button" class="pointer-events-auto -mr-1 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup notifikasi">
        <span class="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
      </button>`));
    var remove = function () { el.classList.add("opacity-0"); setTimeout(function () { el.remove(); }, 200); };
    el.querySelector("button").addEventListener("click", remove);
    region.appendChild(el);
    setTimeout(remove, timeout || (tone === "error" ? 7000 : 4000));
    return el;
  }

  /* =====================================================================
   * Modal (dialog aksesibel: fokus terkunci, Esc, klik latar, kembalikan fokus)
   * ===================================================================== */
  var BTN = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
    secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-blue-500",
  };
  var openModals = 0;
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  /**
   * @param {object} o { title, body (string|ui.html|Node), size: "md"|"lg", actions: [{label, variant, onClick(close) → false untuk tetap terbuka}] , onClose }
   */
  function modal(o) {
    var previous = document.activeElement;
    var id = "modal-" + Math.random().toString(36).slice(2, 8);
    var root = document.createElement("div");
    root.className = "fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4";
    root.appendChild(toNode(html`
      <div class="absolute inset-0 bg-slate-900/45" data-modal-backdrop></div>
      <div role="dialog" aria-modal="true" aria-labelledby="${id}-title"
           class="relative flex max-h-[92vh] w-full ${o.size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg"} flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-xl">
        <div class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 id="${id}-title" class="text-base font-semibold text-slate-900">${o.title}</h2>
          <button type="button" data-modal-close class="-mr-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Tutup">
            <span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
          </button>
        </div>
        <div class="overflow-y-auto px-5 py-4 text-sm text-slate-600" data-modal-body></div>
        <div class="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:flex-row sm:justify-end" data-modal-actions></div>
      </div>`));
    root.querySelector("[data-modal-body]").appendChild(toNode(o.body || ""));

    var closed = false;
    function close(result) {
      if (closed) return;
      closed = true;
      root.remove();
      openModals--;
      if (!openModals) document.body.classList.remove("overflow-hidden");
      document.removeEventListener("keydown", onKey, true);
      if (previous && previous.focus) previous.focus();
      if (o.onClose) o.onClose(result);
    }

    var actionsEl = root.querySelector("[data-modal-actions]");
    (o.actions || [{ label: "Tutup", variant: "secondary" }]).forEach(function (a) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 " + BTN[a.variant || "secondary"];
      b.textContent = a.label;
      if (a.autofocus) b.setAttribute("data-autofocus", "");
      b.addEventListener("click", async function () {
        if (!a.onClick) return close(a.value);
        b.disabled = true;
        try {
          var keep = await a.onClick(close, b);
          if (keep !== false) close(a.value);
        } finally {
          b.disabled = false;
        }
      });
      actionsEl.appendChild(b);
    });

    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab") return;
      var f = Array.prototype.slice.call(root.querySelectorAll(FOCUSABLE)).filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }

    root.querySelector("[data-modal-backdrop]").addEventListener("click", function () { close(); });
    root.querySelector("[data-modal-close]").addEventListener("click", function () { close(); });
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(root);
    document.body.classList.add("overflow-hidden");
    openModals++;
    var first = root.querySelector("[data-autofocus]") || root.querySelector("[data-modal-body] " + FOCUSABLE) || root.querySelector("[data-modal-actions] button:last-child");
    if (first) first.focus();
    return { el: root, close: close };
  }

  /** Konfirmasi ya/tidak → Promise<boolean>. */
  function confirm(o) {
    return new Promise(function (resolve) {
      modal({
        title: o.title || "Konfirmasi",
        body: o.message,
        onClose: function (v) { resolve(v === true); },
        actions: [
          { label: o.cancelLabel || "Batal", variant: "secondary", value: false },
          { label: o.confirmLabel || "Ya, lanjutkan", variant: o.danger ? "danger" : "primary", value: true, autofocus: !o.danger },
        ],
      });
    });
  }

  /**
   * Hapus data melalui service dengan konfirmasi yang menjelaskan dampaknya.
   * - Ada penghalang (relasi aktif) → tampilkan alasan, tidak menghapus.
   * - Ada data turunan → sebutkan apa saja yang ikut terhapus.
   * @returns Promise<boolean> true bila terhapus
   */
  async function confirmDelete(service, id, name) {
    var effect;
    try {
      effect = await service.impact(id);
    } catch (e) {
      toast(e.message, "error");
      return false;
    }
    if (effect.blockers.length) {
      await new Promise(function (resolve) {
        modal({
          title: "Tidak dapat dihapus",
          onClose: resolve,
          body: html`
            <div class="flex gap-3">
              <span class="material-symbols-outlined mt-0.5 text-[22px] text-amber-600" aria-hidden="true">block</span>
              <div>
                <p><strong class="text-slate-900">${name}</strong> tidak dapat dihapus karena:</p>
                <ul class="mt-2 list-disc space-y-1 pl-5">${effect.blockers.map(function (b) { return html`<li>${b}</li>`; })}</ul>
                <p class="mt-3 text-xs text-slate-500">Selesaikan atau pindahkan data terkait terlebih dahulu, atau ubah statusnya menjadi arsip/nonaktif.</p>
              </div>
            </div>`,
          actions: [{ label: "Mengerti", variant: "primary", autofocus: true }],
        });
      });
      return false;
    }
    var ok = await confirm({
      title: "Hapus data?",
      danger: true,
      confirmLabel: "Ya, hapus",
      message: html`
        <div class="flex gap-3">
          <span class="material-symbols-outlined mt-0.5 text-[22px] text-red-600" aria-hidden="true">delete_forever</span>
          <div>
            <p><strong class="text-slate-900">${name}</strong> akan dihapus permanen.</p>
            ${effect.cascades.length ? html`<p class="mt-2">Data terkait yang ikut terhapus:</p>
              <ul class="mt-1 list-disc space-y-1 pl-5">${effect.cascades.map(function (c) { return html`<li>${c}</li>`; })}</ul>` : ""}
            <p class="mt-3 text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
          </div>
        </div>`,
    });
    if (!ok) return false;
    try {
      await service.remove(id);
      toast(name + " berhasil dihapus.", "success");
      return true;
    } catch (e) {
      toast(e.message, "error");
      return false;
    }
  }

  /* =====================================================================
   * Form: ambil/isi nilai & validasi per kolom
   * ===================================================================== */
  function formData(form) {
    var data = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.disabled) return;
      if (el.type === "checkbox") data[el.name] = el.checked;
      else if (el.type === "radio") { if (el.checked) data[el.name] = el.value; }
      else data[el.name] = el.value;
    });
    return data;
  }

  function fillForm(form, data) {
    Object.keys(data || {}).forEach(function (k) {
      var el = form.elements.namedItem(k);
      if (!el) return;
      if (el.type === "checkbox") el.checked = !!data[k];
      else if (el.type === "datetime-local" && data[k]) el.value = String(data[k]).slice(0, 16);
      else el.value = data[k] == null ? "" : data[k];
    });
  }

  function setFieldError(form, name, message) {
    var el = form.elements.namedItem(name);
    if (!el) return;
    // Grup radio: pesan diletakkan setelah pembungkus [data-field].
    if (!el.tagName && el.length) {
      var group = el[0].closest("[data-field]");
      var gId = form.id + "-" + name + "-error";
      var gErr = document.getElementById(gId);
      if (!message) { if (gErr) gErr.remove(); if (group) group.removeAttribute("aria-invalid"); return; }
      if (!gErr && group) {
        gErr = document.createElement("p");
        gErr.id = gId;
        gErr.className = "mt-1 flex items-center gap-1 text-xs font-medium text-red-600";
        group.insertAdjacentElement("afterend", gErr);
      }
      if (gErr) gErr.textContent = message;
      if (group) { group.setAttribute("aria-invalid", "true"); group.setAttribute("aria-describedby", gId); }
      return;
    }
    if (!el.id) return;
    var errId = el.id + "-error";
    var err = document.getElementById(errId);
    if (!message) {
      if (err) err.remove();
      el.removeAttribute("aria-invalid");
      el.classList.remove("border-red-400", "focus:border-red-500", "focus:ring-red-500");
      return;
    }
    if (!err) {
      err = document.createElement("p");
      err.id = errId;
      err.className = "mt-1 flex items-center gap-1 text-xs font-medium text-red-600";
      (el.closest("[data-field]") || el).insertAdjacentElement("afterend", err);
    }
    err.textContent = message;
    el.setAttribute("aria-invalid", "true");
    el.setAttribute("aria-describedby", errId);
    el.classList.add("border-red-400", "focus:border-red-500", "focus:ring-red-500");
  }

  function clearErrors(form) {
    Array.prototype.forEach.call(form.elements, function (el) { if (el.name) setFieldError(form, el.name, null); });
  }

  function showErrors(form, errors) {
    var first = null;
    Object.keys(errors).forEach(function (k) {
      setFieldError(form, k, errors[k]);
      if (!first) first = form.elements.namedItem(k);
    });
    if (first && !first.tagName && first.length) first = first[0]; // grup radio
    if (first && first.focus) first.focus();
  }

  /**
   * Hubungkan form ke service: validasi kolom saat ditinggalkan (blur) & saat
   * diperbaiki, validasi penuh saat submit, tampilkan error dari service.
   * @param {object} o { service, onSubmit(data) → Promise, submitButton }
   */
  function bindForm(form, o) {
    form.setAttribute("novalidate", "");
    var touched = {};
    function validateField(name) {
      var res = o.service.validate(formData(form), { only: [name] });
      setFieldError(form, name, res.errors[name] || null);
    }
    form.addEventListener("focusout", function (e) {
      if (!e.target.name || !o.service.schema[e.target.name]) return;
      touched[e.target.name] = true;
      validateField(e.target.name);
    });
    // Validasi ulang saat mengetik/memilih bila kolom sudah pernah disentuh ATAU sedang error.
    // Error dihapus segera saat diperbaiki (bukan saat blur) agar tata letak tidak bergeser
    // tepat ketika pengguna mengklik tombol simpan.
    function onEdit(e) {
      var name = e.target.name;
      if (!name || !o.service.schema[name]) return;
      if (touched[name] || e.target.getAttribute("aria-invalid") === "true") validateField(name);
    }
    form.addEventListener("input", onEdit);
    form.addEventListener("change", onEdit);
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var data = formData(form);
      var res = o.service.validate(data);
      clearErrors(form);
      if (!res.valid) {
        showErrors(form, res.errors);
        toast("Periksa kembali isian yang ditandai merah.", "error");
        return;
      }
      var btn = o.submitButton || form.querySelector('[type="submit"]');
      var label = btn ? btn.innerHTML : "";
      if (btn) { btn.disabled = true; btn.textContent = "Menyimpan…"; }
      try {
        await o.onSubmit(res.data);
      } catch (err) {
        if (err && err.code === "VALIDATION") {
          showErrors(form, err.errors);
          toast(err.message, "error");
        } else {
          toast((err && err.message) || "Terjadi kesalahan.", "error");
          console.error(err);
        }
      } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = label; }
      }
    });
    return { validateField: validateField, showErrors: function (errs) { showErrors(form, errs); }, clear: function () { clearErrors(form); } };
  }

  /* =====================================================================
   * Kolom form & form dalam modal (dipakai halaman-halaman CRUD)
   * ===================================================================== */
  var INPUT = "block w-full rounded-lg border-slate-300 text-sm focus:border-blue-500 focus:ring-blue-500";

  /**
   * Satu kolom form lengkap.
   * @param {object} o { name, label, type ("text"|"email"|"number"|"date"|"datetime-local"|"select"|"textarea"|"checkbox"),
   *                     required, options [[nilai, label]], placeholder, help, span (kelas grid), attrs (string atribut tambahan) }
   */
  function field(o) {
    var id = "fld-" + o.name;
    var star = o.required ? html` <span class="text-red-500" aria-hidden="true">*</span>` : "";
    var attrs = raw(o.attrs || "");
    var control;
    if (o.type === "select") {
      control = html`<select id="${id}" name="${o.name}" class="${INPUT}" ${attrs}>
        ${o.placeholder !== false ? html`<option value="">${o.placeholder || "Pilih…"}</option>` : ""}
        ${(o.options || []).map(function (op) { return html`<option value="${op[0]}">${op[1]}</option>`; })}
      </select>`;
    } else if (o.type === "textarea") {
      control = html`<textarea id="${id}" name="${o.name}" rows="${o.rows || 3}" placeholder="${o.placeholder || ""}" class="${INPUT}" ${attrs}></textarea>`;
    } else if (o.type === "checkbox") {
      return html`<div class="${o.span || ""}">
        <label class="flex items-center gap-2 text-sm text-slate-700"><input id="${id}" name="${o.name}" type="checkbox" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500" ${attrs}>${o.label}</label>
        ${o.help ? html`<p class="mt-1 text-xs text-slate-500">${o.help}</p>` : ""}
      </div>`;
    } else {
      control = html`<input id="${id}" name="${o.name}" type="${o.type || "text"}" placeholder="${o.placeholder || ""}" class="${INPUT}" ${attrs}>`;
    }
    return html`<div class="${o.span || ""}">
      <label for="${id}" class="mb-1 block text-sm font-medium text-slate-700">${o.label}${star}</label>
      ${control}
      ${o.help ? html`<p class="mt-1 text-xs text-slate-500">${o.help}</p>` : ""}
    </div>`;
  }

  /**
   * Buka form dalam modal yang terhubung ke service.
   * @param {object} o { title, fields (ui.html), service, initial, save: async (data) → row, success: (row) → pesan, size,
   *                     onOpen: (form) → void untuk kolom yang saling bergantung }
   * @returns Promise<row|null>
   */
  function formModal(o) {
    return new Promise(function (resolve) {
      var formId = "form-" + Math.random().toString(36).slice(2, 8);
      var form;
      var m = modal({
        title: o.title,
        size: o.size || "lg",
        body: html`<form id="${formId}" novalidate class="grid grid-cols-1 gap-4 sm:grid-cols-2">${o.fields}<button type="submit" class="hidden" tabindex="-1" aria-hidden="true"></button></form>`,
        onClose: function (row) { resolve(row || null); },
        actions: [
          { label: "Batal", variant: "secondary" },
          { label: o.submitLabel || "Simpan", variant: "primary", onClick: function () { form.requestSubmit(); return false; } },
        ],
      });
      form = document.getElementById(formId);
      fillForm(form, o.initial || {});
      bindForm(form, {
        service: o.service,
        onSubmit: async function (data) {
          var row = await o.save(data);
          if (o.success) toast(o.success(row), "success");
          m.close(row);
        },
      });
      if (o.onOpen) o.onOpen(form);
      var first = form.querySelector("input:not([type=hidden]):not([type=checkbox]), select, textarea");
      if (first) first.focus();
    });
  }

  /* =====================================================================
   * Tampilan kosong berilustrasi & tombol Kartu ⇄ Tabel
   * ===================================================================== */
  function emptyState(title, text) {
    return html`<div class="flex flex-col items-center px-6 py-12 text-center">
      <svg viewBox="0 0 160 120" class="h-28 w-36" aria-hidden="true">
        <rect x="20" y="28" width="120" height="78" rx="12" fill="#eff6ff"/>
        <rect x="34" y="44" width="56" height="8" rx="4" fill="#bfdbfe"/><rect x="34" y="60" width="88" height="6" rx="3" fill="#dbeafe"/><rect x="34" y="72" width="72" height="6" rx="3" fill="#dbeafe"/>
        <circle cx="118" cy="30" r="18" fill="#2563eb"/><path d="M111 30 h14 M118 23 v14" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
      </svg>
      <p class="mt-3 text-sm font-semibold text-slate-800">${title}</p>
      ${text ? html`<p class="mt-1 max-w-sm text-xs text-slate-500">${text}</p>` : ""}
    </div>`;
  }

  /**
   * Tombol Kartu ⇄ Tabel; pilihan diingat per halaman (localStorage, bila tersedia).
   * @param {Element} el wadah tombol
   * @param {object} o { key, onChange(mode), default: "kartu" }
   */
  function viewToggle(el, o) {
    var storeKey = "nexus-lms:view:" + o.key;
    var mode = null;
    try { mode = global.localStorage.getItem(storeKey); } catch (e) { /* diblokir */ }
    if (mode !== "kartu" && mode !== "tabel") mode = o.default || "kartu";
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", "Pilih tampilan");
    el.className = "inline-flex rounded-lg border border-slate-300 bg-white p-0.5";
    function draw() {
      el.innerHTML = [["kartu", "grid_view", "Kartu"], ["tabel", "table_rows", "Tabel"]].map(function (v) {
        var on = mode === v[0];
        return html`<button type="button" data-view="${v[0]}" aria-pressed="${on ? "true" : "false"}"
          class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${on ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}">
          <span class="material-symbols-outlined text-[16px]" aria-hidden="true">${v[1]}</span>${v[2]}</button>`.value;
      }).join("");
    }
    el.addEventListener("click", function (e) {
      var b = e.target.closest("[data-view]");
      if (!b || b.getAttribute("data-view") === mode) return;
      mode = b.getAttribute("data-view");
      try { global.localStorage.setItem(storeKey, mode); } catch (err) { /* diblokir */ }
      draw();
      o.onChange(mode);
    });
    draw();
    o.onChange(mode);
    return { get: function () { return mode; } };
  }

  /* =====================================================================
   * Tabel data: cari, filter, urut, halaman, tampilan kosong
   * (opsional: mode kartu → o.cards { container, render, emptyTitle })
   * ===================================================================== */
  /**
   * @param {object} o {
   *   tbody, colspan, load: async () => rows, render: (row) => ui.html,
   *   search: { input, fields: [..] | fn(row) → string },
   *   filters: [{ el, match: (row, value) → bool }],
   *   sorters: { key: (a, b) → number }, sortSelect, defaultSort,
   *   pageSize, pager (elemen), counter (elemen), emptyText
   * }
   */
  function dataTable(o) {
    var rows = [];
    var page = 1;
    var sortKey = o.defaultSort || null;
    var pageSize = o.pageSize || 10;
    var mode = o.cards ? "kartu" : "tabel";

    function searchable(row) {
      if (!o.search) return "";
      if (typeof o.search.fields === "function") return o.search.fields(row).toLowerCase();
      return o.search.fields.map(function (f) { return row[f] == null ? "" : String(row[f]); }).join(" ").toLowerCase();
    }

    function visible() {
      var q = o.search && o.search.input ? o.search.input.value.trim().toLowerCase() : "";
      var list = rows.filter(function (r) {
        if (q && searchable(r).indexOf(q) === -1) return false;
        return (o.filters || []).every(function (f) { return !f.el.value || f.match(r, f.el.value); });
      });
      if (sortKey && o.sorters && o.sorters[sortKey]) list = list.slice().sort(o.sorters[sortKey]);
      return list;
    }

    function renderPager(total, pages) {
      if (o.counter) {
        var from = total ? (page - 1) * pageSize + 1 : 0;
        o.counter.textContent = total ? "Menampilkan " + from + "–" + Math.min(total, page * pageSize) + " dari " + total + " data" : "Tidak ada data";
      }
      if (!o.pager) return;
      o.pager.innerHTML = "";
      if (pages <= 1) return;
      var mk = function (label, target, disabled, current, aria) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "min-w-[2rem] rounded-md border px-2 py-1 text-xs font-medium " +
          (current ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50") +
          " disabled:cursor-not-allowed disabled:opacity-40";
        b.textContent = label;
        b.disabled = disabled;
        if (aria) b.setAttribute("aria-label", aria);
        if (current) b.setAttribute("aria-current", "page");
        b.addEventListener("click", function () { page = target; render(); });
        o.pager.appendChild(b);
      };
      mk("‹", page - 1, page === 1, false, "Halaman sebelumnya");
      for (var i = 1; i <= pages; i++) {
        if (pages > 7 && i > 2 && i < pages - 1 && Math.abs(i - page) > 1) {
          if (i === 3 || i === pages - 2) { var s = document.createElement("span"); s.className = "px-1 text-xs text-slate-400"; s.textContent = "…"; o.pager.appendChild(s); }
          continue;
        }
        mk(String(i), i, false, i === page, "Halaman " + i);
      }
      mk("›", page + 1, page === pages, false, "Halaman berikutnya");
    }

    function render() {
      var list = visible();
      var pages = Math.max(1, Math.ceil(list.length / pageSize));
      if (page > pages) page = pages;
      var slice = list.slice((page - 1) * pageSize, page * pageSize);
      if (o.cards && mode === "kartu") {
        o.cards.container.innerHTML = slice.length
          ? slice.map(function (r) { return o.cards.render(r).value; }).join("")
          : html`<div class="col-span-full">${emptyState(rows.length ? "Tidak ada data yang cocok" : (o.cards.emptyTitle || "Belum ada data"), rows.length ? "Ubah kata kunci pencarian atau filter." : o.emptyText)}</div>`.value;
        renderPager(list.length, pages);
        if (o.onRender) o.onRender(list, slice);
        return;
      }
      if (!slice.length) {
        o.tbody.innerHTML = html`<tr><td colspan="${o.colspan}" class="px-4 py-12 text-center">
          <span class="material-symbols-outlined text-[36px] text-slate-300" aria-hidden="true">inbox</span>
          <p class="mt-2 text-sm font-medium text-slate-600">${rows.length ? "Tidak ada data yang cocok dengan pencarian/filter." : o.emptyText || "Belum ada data."}</p>
        </td></tr>`.value;
      } else {
        o.tbody.innerHTML = slice.map(function (r) { return o.render(r).value; }).join("");
      }
      renderPager(list.length, pages);
      if (o.onRender) o.onRender(list, slice);
    }

    function loading() {
      if (o.cards && mode === "kartu") {
        o.cards.container.innerHTML = html`<div class="col-span-full py-10 text-center text-sm text-slate-500"><span class="material-symbols-outlined animate-spin text-[22px] text-blue-500" aria-hidden="true">progress_activity</span><p class="mt-1">Memuat data…</p></div>`.value;
        return;
      }
      o.tbody.innerHTML = html`<tr><td colspan="${o.colspan}" class="px-4 py-10 text-center text-sm text-slate-500">
        <span class="material-symbols-outlined animate-spin text-[22px] text-blue-500" aria-hidden="true">progress_activity</span>
        <p class="mt-1">Memuat data…</p></td></tr>`.value;
    }

    async function refresh() {
      loading();
      try {
        rows = await o.load();
        render();
      } catch (e) {
        o.tbody.innerHTML = html`<tr><td colspan="${o.colspan}" class="px-4 py-10 text-center text-sm text-red-600">Gagal memuat data: ${e.message}</td></tr>`.value;
        console.error(e);
      }
    }

    var reRender = Nexus.utils.debounce(function () { page = 1; render(); }, 200);
    if (o.search && o.search.input) o.search.input.addEventListener("input", reRender);
    (o.filters || []).forEach(function (f) { f.el.addEventListener("change", function () { page = 1; render(); }); });
    if (o.sortSelect) o.sortSelect.addEventListener("change", function () { sortKey = o.sortSelect.value; render(); });

    return {
      refresh: refresh,
      render: render,
      rows: function () { return rows; },
      visible: visible,
      setSort: function (k) { sortKey = k; render(); },
      /** Ganti tampilan "kartu" / "tabel" (bila o.cards tersedia). */
      setMode: function (m) { mode = m; render(); },
      /** Ubah jumlah baris per halaman (mis. 100000 saat mencetak semua baris). */
      setPageSize: function (n) { pageSize = n; page = 1; render(); },
      reset: function () {
        if (o.search && o.search.input) o.search.input.value = "";
        (o.filters || []).forEach(function (f) { f.el.value = ""; });
        page = 1;
        render();
      },
    };
  }

  /* =====================================================================
   * Muat ulang tampilan saat data berubah (termasuk dari tab lain)
   * ===================================================================== */
  function onDataChange(tables, fn) {
    global.addEventListener("nexus:data-changed", function (e) {
      var t = e.detail.table;
      if (t === "*" || tables.indexOf(t) !== -1) fn(e.detail);
    });
  }

  /* =====================================================================
   * Pesan kilat: ditampilkan sebagai toast di halaman berikutnya (setelah redirect)
   * ===================================================================== */
  var FLASH_KEY = "nexus-lms:flash";
  function flash(message, tone) {
    try { global.sessionStorage.setItem(FLASH_KEY, JSON.stringify({ message: message, tone: tone || "success" })); } catch (e) { /* abaikan */ }
  }
  function showFlash() {
    try {
      var raw = global.sessionStorage.getItem(FLASH_KEY);
      if (!raw) return;
      global.sessionStorage.removeItem(FLASH_KEY);
      var f = JSON.parse(raw);
      toast(f.message, f.tone);
    } catch (e) { /* abaikan */ }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", showFlash);
  else showFlash();

  Nexus.ui = {
    flash: flash,
    html: html,
    raw: raw,
    badge: badge,
    statusLabel: statusLabel,
    toast: toast,
    modal: modal,
    confirm: confirm,
    confirmDelete: confirmDelete,
    formData: formData,
    fillForm: fillForm,
    bindForm: bindForm,
    field: field,
    emptyState: emptyState,
    viewToggle: viewToggle,
    formModal: formModal,
    setFieldError: setFieldError,
    dataTable: dataTable,
    onDataChange: onDataChange,
  };
})(window);
