/**
 * Komponen layout bersama: sidebar, topbar, dan footer.
 *
 * Pemakaian di setiap halaman (folder pages/):
 *   <aside data-component="sidebar"></aside>
 *   <header data-component="topbar" data-title="Judul Halaman"></header>
 *   <footer data-component="footer"></footer>
 *   <script src="../assets/js/components/layout.js" defer></script>
 *
 * Daftar menu mengikuti hirarki final di docs/perancangan.md §2.
 */
(function () {
  "use strict";

  var APP = { name: "Nexus LMS", version: "1.1.0" };

  // Sumber tunggal navigasi. `match` = halaman lain yang ikut menandai menu ini aktif.
  var MENU = [
    {
      group: "Main",
      items: [
        { label: "Dashboard", href: "dashboard.html", icon: "dashboard" },
        { label: "Laporan & Analitik", href: "laporan.html", icon: "monitoring" },
      ],
    },
    {
      group: "Akademik & Kursus",
      items: [
        { label: "Data Master Kursus", href: "data-master.html", icon: "menu_book", match: ["form.html"] },
        { label: "Tugas & Kuis", href: "tugas-kuis.html", icon: "fact_check" },
        { label: "Kelas Virtual", href: "kelas-virtual.html", icon: "video_camera_front" },
      ],
    },
    {
      group: "Pengguna",
      items: [
        { label: "Mahasiswa", href: "mahasiswa.html", icon: "school" },
        { label: "Instruktur / Dosen", href: "instruktur.html", icon: "co_present" },
      ],
    },
    {
      group: "Manajemen",
      items: [
        { label: "Sertifikasi Digital", href: "sertifikasi.html", icon: "workspace_premium" },
        { label: "Pengaturan Sistem", href: "pengaturan.html", icon: "settings" },
      ],
    },
  ];

  // Pengguna dari sesi login (Nexus.auth); cadangan bila auth belum dimuat.
  var auth = window.Nexus && window.Nexus.auth;
  var sessionUser = auth ? auth.currentUser() : null;
  var USER = sessionUser
    ? { name: sessionUser.nama, role: auth.roleLabel(sessionUser.peran) }
    : { name: "Administrator", role: "Admin" };

  var LG_BREAKPOINT = 1024;

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function initials(name) {
    return name
      .replace(/^(Dr|Prof|Ir)\.?\s+/i, "")
      .split(/[\s,]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (w) { return w.charAt(0).toUpperCase(); })
      .join("");
  }

  var currentPage = location.pathname.split("/").pop() || "dashboard.html";

  function findActive() {
    for (var g = 0; g < MENU.length; g++) {
      for (var i = 0; i < MENU[g].items.length; i++) {
        var item = MENU[g].items[i];
        if (item.href === currentPage || (item.match || []).indexOf(currentPage) !== -1) {
          return { group: MENU[g].group, item: item };
        }
      }
    }
    return null;
  }

  var active = findActive();

  /* ---------- Sidebar ---------- */
  function renderSidebar(el) {
    el.id = "sidebar";
    el.setAttribute("aria-label", "Navigasi utama");
    el.className =
      "fixed inset-y-0 left-0 z-50 flex w-64 -translate-x-full flex-col border-r border-slate-200 bg-white " +
      "transition-transform duration-200 ease-out lg:translate-x-0";

    var groups = MENU.map(function (group) {
      var links = group.items.map(function (item) {
        var isActive = active && active.item === item;
        var cls = isActive
          ? "bg-blue-50 text-blue-700 font-semibold"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900";
        return (
          '<li><a href="' + item.href + '"' + (isActive ? ' aria-current="page"' : "") +
          ' class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ' +
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 " + cls + '">' +
          '<span class="material-symbols-outlined text-[20px]' + (isActive ? " text-blue-600" : "") +
          '" aria-hidden="true">' + item.icon + "</span>" +
          "<span>" + escapeHTML(item.label) + "</span></a></li>"
        );
      });
      return (
        '<div class="space-y-1">' +
        '<p class="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">' +
        escapeHTML(group.group) + "</p>" +
        '<ul class="space-y-0.5">' + links.join("") + "</ul></div>"
      );
    });

    el.innerHTML =
      '<div class="flex h-16 flex-shrink-0 items-center gap-3 border-b border-slate-200 px-5">' +
      '<a href="dashboard.html" class="flex items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">' +
      '<img src="../assets/img/logo-nexus-lms.svg" alt="" class="h-8 w-8 object-cover object-left" width="32" height="32">' +
      '<span class="text-base font-bold tracking-tight text-slate-900">' + APP.name + "</span></a>" +
      '<span class="ml-auto rounded border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-700">v' +
      APP.version + "</span></div>" +
      '<nav aria-label="Menu utama" class="flex-1 space-y-5 overflow-y-auto px-3 py-4">' + groups.join("") + "</nav>" +
      '<div class="border-t border-slate-200 p-3">' +
      '<a href="../index.html" data-action="logout" class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500">' +
      '<span class="material-symbols-outlined text-[20px]" aria-hidden="true">logout</span><span>Keluar</span></a></div>';

    var overlay = document.createElement("div");
    overlay.id = "sidebar-overlay";
    overlay.className = "fixed inset-0 z-40 hidden bg-slate-900/40 lg:hidden";
    overlay.setAttribute("aria-hidden", "true");
    el.insertAdjacentElement("afterend", overlay);
  }

  /* ---------- Topbar ---------- */
  function renderTopbar(el) {
    var title = el.getAttribute("data-title") || (active ? active.item.label : document.title);
    el.className =
      "sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-6";

    var crumbs = '<span class="hidden sm:inline">' + APP.name + "</span>";
    if (active) {
      crumbs +=
        '<span class="material-symbols-outlined hidden text-[14px] text-slate-400 sm:inline" aria-hidden="true">chevron_right</span>' +
        '<span class="hidden sm:inline">' + escapeHTML(active.group) + "</span>";
    }

    el.innerHTML =
      '<button type="button" id="sidebar-toggle" class="-ml-1 rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:hidden" ' +
      'aria-controls="sidebar" aria-expanded="false" aria-label="Buka menu navigasi">' +
      '<span class="material-symbols-outlined text-[22px]" aria-hidden="true">menu</span></button>' +
      '<div class="min-w-0 flex-1">' +
      '<nav aria-label="Breadcrumb" class="flex items-center gap-1.5 text-xs font-medium text-slate-500">' + crumbs + "</nav>" +
      '<h1 class="truncate text-base font-semibold text-slate-900">' + escapeHTML(title) + "</h1></div>" +
      '<div class="flex items-center gap-3">' +
      '<div class="hidden text-right md:block">' +
      '<p class="text-xs font-semibold leading-tight text-slate-800">' + escapeHTML(USER.name) + "</p>" +
      '<p class="text-[11px] leading-tight text-slate-500">' + escapeHTML(USER.role) + "</p></div>" +
      '<div class="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white" aria-hidden="true">' +
      escapeHTML(initials(USER.name)) + "</div></div>";
  }

  /* ---------- Footer ---------- */
  function renderFooter(el) {
    el.className =
      "border-t border-slate-200 bg-white px-4 py-4 text-xs text-slate-500 lg:px-6 " +
      "flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between";
    el.innerHTML =
      "<p>&copy; " + new Date().getFullYear() + " " + APP.name + " — Admin Panel</p>" +
      "<p>Versi " + APP.version + " · Data demo (tersimpan lokal di browser)</p>";
  }

  /* ---------- Drawer (mobile) ---------- */
  function setupDrawer() {
    var sidebar = document.getElementById("sidebar");
    var overlay = document.getElementById("sidebar-overlay");
    var toggle = document.getElementById("sidebar-toggle");
    if (!sidebar || !overlay || !toggle) return;

    function isOpen() {
      return toggle.getAttribute("aria-expanded") === "true";
    }

    function open() {
      sidebar.classList.remove("-translate-x-full");
      overlay.classList.remove("hidden");
      document.body.classList.add("overflow-hidden");
      toggle.setAttribute("aria-expanded", "true");
      var first = sidebar.querySelector("nav a");
      if (first) first.focus();
    }

    function close(returnFocus) {
      if (!isOpen()) return;
      sidebar.classList.add("-translate-x-full");
      overlay.classList.add("hidden");
      document.body.classList.remove("overflow-hidden");
      toggle.setAttribute("aria-expanded", "false");
      if (returnFocus) toggle.focus();
    }

    toggle.addEventListener("click", function () {
      if (isOpen()) close(false);
      else open();
    });
    overlay.addEventListener("click", function () { close(true); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close(true);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth >= LG_BREAKPOINT) close(false);
    });
  }

  /* ---------- Skip link ---------- */
  function addSkipLink() {
    var main = document.querySelector("main");
    if (!main) return;
    if (!main.id) main.id = "konten-utama";
    var link = document.createElement("a");
    link.href = "#" + main.id;
    link.textContent = "Lewati ke konten utama";
    link.className =
      "sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white " +
      "focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-blue-700 focus:shadow-lg";
    document.body.insertBefore(link, document.body.firstChild);
  }

  function init() {
    var sidebar = document.querySelector('[data-component="sidebar"]');
    var topbar = document.querySelector('[data-component="topbar"]');
    var footer = document.querySelector('[data-component="footer"]');
    if (sidebar) renderSidebar(sidebar);
    if (topbar) renderTopbar(topbar);
    if (footer) renderFooter(footer);
    setupDrawer();
    addSkipLink();
    var logout = document.querySelector('[data-action="logout"]');
    if (logout && auth) {
      logout.addEventListener("click", function () { auth.logout(); });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
