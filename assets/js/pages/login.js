/**
 * Halaman login (index.html): tab peran, tampil/sembunyi kata sandi,
 * validasi per kolom, pembatasan percobaan, dan pengalihan setelah login.
 */
(function () {
  "use strict";

  var auth = Nexus.auth;
  var params = new URLSearchParams(location.search);
  var next = auth.safeNext(params.get("next"));

  // Sudah login → langsung ke halaman tujuan.
  if (auth.isLoggedIn()) {
    location.replace("pages/" + next);
    return;
  }

  var form = document.getElementById("login-form");
  var identifier = document.getElementById("identifier");
  var password = document.getElementById("password");
  var remember = document.getElementById("remember_me");
  var submit = form.querySelector('button[type="submit"]');
  var submitHTML = submit.innerHTML;
  var tabs = document.querySelectorAll(".role-tab");
  var identifierLabel = document.getElementById("identifierLabel");

  /* ---------- Kotak pesan ---------- */
  var alertBox = document.createElement("div");
  alertBox.id = "login-alert";
  alertBox.setAttribute("role", "alert");
  alertBox.className = "hidden rounded-lg border px-3.5 py-3 text-sm";
  form.parentNode.insertBefore(alertBox, form);

  var TONES = {
    error: "border-red-200 bg-red-50 text-red-700",
    info: "border-blue-200 bg-blue-50 text-blue-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
  };
  function showAlert(tone, text) {
    alertBox.className = "mb-4 rounded-lg border px-3.5 py-3 text-sm " + TONES[tone];
    alertBox.textContent = text;
  }
  function hideAlert() {
    alertBox.className = "hidden";
    alertBox.textContent = "";
  }

  /* ---------- Info akun demo ---------- */
  var demo = document.createElement("p");
  demo.className = "mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600";
  demo.innerHTML =
    '<span class="font-semibold text-slate-800">Akun demo:</span> ' +
    '<code class="font-mono">admin@nexus.ac.id</code> atau <code class="font-mono">baak@nexus.ac.id</code>, ' +
    'kata sandi <code class="font-mono">' + Nexus.utils.escapeHTML(auth.DEMO_PASSWORD) + "</code>";
  form.insertAdjacentElement("afterend", demo);

  if (params.get("alasan") === "sesi-berakhir") {
    showAlert("warning", "Sesi Anda berakhir karena tidak ada aktivitas. Silakan masuk kembali.");
  } else if (params.get("next")) {
    showAlert("info", "Silakan masuk terlebih dahulu untuk membuka halaman tersebut.");
  }

  /* ---------- Error per kolom ---------- */
  function fieldError(input, message) {
    var id = input.id + "-error";
    var el = document.getElementById(id);
    var box = input.closest(".relative") || input;
    if (!message) {
      if (el) el.remove();
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
      box.classList.remove("ring-2", "ring-red-300", "rounded-lg");
      return;
    }
    if (!el) {
      el = document.createElement("p");
      el.id = id;
      el.className = "mt-1.5 text-xs font-medium text-red-600";
      box.insertAdjacentElement("afterend", el);
    }
    el.textContent = message;
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", id);
    box.classList.add("ring-2", "ring-red-300", "rounded-lg");
  }

  [identifier, password].forEach(function (input) {
    input.addEventListener("input", function () { fieldError(input, null); });
  });

  /* ---------- Tab peran ---------- */
  var ROLE = {
    admin: { label: "Email Administrator / BAAK", placeholder: "admin@nexus.ac.id" },
    lecturer: { label: "NIDN / Surel Resmi Dosen", placeholder: "dosen@nexus.ac.id" },
    student: { label: "NIM / Surel Mahasiswa", placeholder: "nama@student.nexus.ac.id" },
  };
  var ACTIVE = ["bg-white", "text-brand-700", "shadow-sm"];

  function setRole(role) {
    tabs.forEach(function (t) {
      var on = t.getAttribute("data-role") === role;
      ACTIVE.forEach(function (c) { t.classList.toggle(c, on); });
      t.classList.toggle("text-slate-600", !on);
      t.setAttribute("aria-pressed", on ? "true" : "false");
    });
    identifierLabel.textContent = ROLE[role].label;
    identifier.placeholder = ROLE[role].placeholder;
    identifier.type = role === "admin" ? "email" : "text";
    var disabled = role !== "admin";
    [identifier, password, remember, submit].forEach(function (el) { el.disabled = disabled; });
    submit.classList.toggle("opacity-50", disabled);
    submit.classList.toggle("cursor-not-allowed", disabled);
    if (disabled) {
      showAlert("info", "Portal " + (role === "lecturer" ? "Dosen" : "Mahasiswa") + " belum tersedia pada versi ini. Panel ini khusus Admin / BAAK.");
    } else {
      hideAlert();
    }
  }
  tabs.forEach(function (t) {
    t.addEventListener("click", function () { setRole(t.getAttribute("data-role")); });
  });
  setRole("admin");

  /* ---------- Tampil/sembunyi kata sandi ---------- */
  var toggle = document.getElementById("togglePassword");
  toggle.addEventListener("click", function () {
    var show = password.type === "password";
    password.type = show ? "text" : "password";
    document.getElementById("eyeIcon").classList.toggle("hidden", show);
    document.getElementById("eyeSlashIcon").classList.toggle("hidden", !show);
    toggle.setAttribute("aria-pressed", show ? "true" : "false");
  });

  /* ---------- Tautan yang belum tersedia di versi demo ---------- */
  document.querySelectorAll('a[href="#"]').forEach(function (a) {
    if (/lupa/i.test(a.textContent)) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        showAlert("info", "Untuk mengatur ulang kata sandi, hubungi BAAK melalui helpdesk@nexus.ac.id.");
      });
    }
  });
  var formCard = form.parentNode;
  formCard.querySelectorAll('button[type="button"]').forEach(function (b) {
    if (/Google|Microsoft|SAML/i.test(b.textContent)) {
      b.addEventListener("click", function () { showAlert("info", "Login SSO belum tersedia pada versi demo. Gunakan email dan kata sandi."); });
    }
  });

  /* ---------- Hitung mundur saat terkunci ---------- */
  var timer = null;
  function lockCountdown() {
    clearInterval(timer);
    var tick = function () {
      var s = auth.lockRemaining();
      if (s <= 0) {
        clearInterval(timer);
        submit.disabled = false;
        submit.innerHTML = submitHTML;
        hideAlert();
        return;
      }
      submit.disabled = true;
      submit.textContent = "Coba lagi dalam " + s + " detik";
      showAlert("error", "Terlalu banyak percobaan gagal. Login dikunci sementara demi keamanan.");
    };
    tick();
    timer = setInterval(tick, 1000);
  }
  if (auth.lockRemaining() > 0) lockCountdown();

  /* ---------- Submit ---------- */
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    hideAlert();
    fieldError(identifier, null);
    fieldError(password, null);

    submit.disabled = true;
    submit.textContent = "Memproses…";
    try {
      await auth.login(identifier.value, password.value, { remember: remember.checked });
      submit.textContent = "Berhasil, mengalihkan…";
      location.replace("pages/" + next);
    } catch (err) {
      submit.disabled = false;
      submit.innerHTML = submitHTML;
      if (err.code === "INVALID_INPUT") {
        if (err.errors.identifier) fieldError(identifier, err.errors.identifier);
        if (err.errors.password) fieldError(password, err.errors.password);
        (err.errors.identifier ? identifier : password).focus();
      } else if (err.code === "LOCKED") {
        lockCountdown();
      } else if (err.code === "INVALID_CREDENTIALS") {
        showAlert("error", err.message);
        password.value = "";
        password.focus();
      } else {
        showAlert("error", "Terjadi kesalahan: " + (err.message || err));
        console.error(err);
      }
    }
  });

  /* ---------- Periode aktif dari Pengaturan (fallback: teks statis di HTML) ---------- */
  Nexus.storage.list("pengaturan").then(function (rows) {
    var row = rows.filter(function (r) { return r.kunci === "periode_aktif"; })[0];
    var m = row && /^(\d{4}\/\d{4})-(\w+)$/.exec(row.nilai);
    if (!m) return;
    document.querySelectorAll("[data-periode]").forEach(function (el) {
      el.textContent = "TA " + m[1] + (el.getAttribute("data-periode") === "lengkap" ? " " + m[2] : "");
    });
  }).catch(function () { /* tetap tampilkan teks statis */ });
})();
