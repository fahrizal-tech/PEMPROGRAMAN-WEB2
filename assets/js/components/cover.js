/**
 * Nexus.cover — sampul kursus.
 *  - render(kursus, prodiKode): <img> dari sampul unggahan, atau ilustrasi SVG otomatis
 *    (warna & ikon per program studi, pola dekoratif deterministik dari kode MK).
 *  - compress(file): ubah gambar unggahan menjadi data URL 16:9 yang kecil (WebP/JPEG).
 *
 * Bergantung pada: ui.js (Nexus.ui.html).
 */
(function (global) {
  "use strict";

  var Nexus = (global.Nexus = global.Nexus || {});

  // Warna gradien & ikon per program studi (path SVG di kotak 120×120, garis putih).
  var THEMES = {
    TIF: { from: "#1e40af", to: "#3b82f6", icon: "M42 34 L16 60 L42 86 M78 34 L104 60 L78 86 M68 24 L52 96" },
    SIF: { from: "#3730a3", to: "#818cf8", icon: "M22 32 C22 20 98 20 98 32 C98 44 22 44 22 32 Z M22 32 L22 88 C22 100 98 100 98 88 L98 32 M22 60 C22 72 98 72 98 60" },
    SDA: { from: "#065f46", to: "#34d399", icon: "M18 100 L102 100 M28 100 L28 64 M50 100 L50 40 M72 100 L72 72 M94 100 L94 24 M22 58 L50 34 L72 62 L100 20" },
    TKM: { from: "#155e75", to: "#22d3ee", icon: "M34 34 L86 34 L86 86 L34 86 Z M48 48 L72 48 L72 72 L48 72 Z M46 34 L46 18 M60 34 L60 18 M74 34 L74 18 M46 86 L46 102 M60 86 L60 102 M74 86 L74 102 M34 46 L18 46 M34 74 L18 74 M86 46 L102 46 M86 74 L102 74" },
    DKV: { from: "#9d174d", to: "#f472b6", icon: "M60 18 C30 18 16 40 16 60 C16 84 36 102 58 102 C68 102 70 94 64 88 C58 82 62 74 72 74 L86 74 C98 74 104 64 104 56 C104 34 84 18 60 18 Z M40 50 A1 1 0 0 0 40 51 M58 36 A1 1 0 0 0 58 37 M78 44 A1 1 0 0 0 78 45" },
    BDG: { from: "#92400e", to: "#fbbf24", icon: "M18 42 L102 42 L102 96 L18 96 Z M44 42 L44 30 C44 24 48 22 52 22 L68 22 C72 22 76 24 76 30 L76 42 M18 64 L102 64 M54 64 L54 72 L66 72 L66 64" },
  };
  var DEFAULT = { from: "#334155", to: "#94a3b8", icon: "M20 40 L60 20 L100 40 L60 60 Z M36 48 L36 76 C36 84 84 84 84 76 L84 48 M100 40 L100 70" };

  // Ikon berdasarkan kata kunci nama kursus (lebih spesifik daripada ikon prodi).
  var KEYWORD_ICONS = [
    [/cloud|awan/i, "M34 88 C18 88 12 70 26 62 C24 44 44 36 56 46 C62 30 88 30 92 50 C106 50 110 70 100 80 C98 86 92 88 86 88 Z"],
    [/keamanan|siber|hacking|security/i, "M60 16 L96 30 L96 58 C96 80 80 96 60 104 C40 96 24 80 24 58 L24 30 Z M44 60 L56 72 L78 48"],
    [/web|front-?end|client/i, "M16 28 L104 28 L104 92 L16 92 Z M16 44 L104 44 M26 36 L28 36 M36 36 L38 36 M46 36 L48 36 M42 58 L32 68 L42 78 M78 58 L88 68 L78 78 M66 54 L56 82"],
    [/machine|learning|deep|neural|\bai\b/i, "M24 30 L60 60 L96 30 M24 90 L60 60 L96 90 M24 30 L24 90 M96 30 L96 90 M18 30 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M90 30 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M18 90 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M90 90 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M52 60 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0"],
    [/algoritma|struktur data|graf/i, "M60 20 L32 60 M60 20 L88 60 M32 60 L18 98 M32 60 L46 98 M88 60 L100 98 M54 20 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M26 60 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M82 60 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0"],
  ];

  function iconFor(kursus, theme) {
    for (var i = 0; i < KEYWORD_ICONS.length; i++) if (KEYWORD_ICONS[i][0].test(kursus.nama || "")) return KEYWORD_ICONS[i][1];
    return theme.icon;
  }

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < String(str).length; i++) { h ^= String(str).charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  var uid = 0;

  /** Ilustrasi SVG 16:9 untuk kursus tanpa sampul unggahan. */
  function svg(kursus, prodiKode, cls) {
    var html = Nexus.ui.html;
    var t = THEMES[prodiKode] || DEFAULT;
    var h = hash(kursus.kode_mk || kursus.id || "x");
    var id = "cv" + (++uid);
    var c1x = 380 + (h % 180), c1y = 40 + ((h >> 8) % 120), r1 = 90 + ((h >> 4) % 70);
    var c2x = 60 + ((h >> 12) % 200), c2y = 300 + ((h >> 16) % 50), r2 = 60 + ((h >> 20) % 60);
    var wave = 250 + ((h >> 6) % 60);
    return html`<svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" class="${cls || "h-full w-full"}" role="img" aria-label="Sampul kursus ${kursus.kode_mk} ${kursus.nama || ""}">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.from}"/><stop offset="1" stop-color="${t.to}"/></linearGradient></defs>
      <rect width="640" height="360" fill="url(#${id})"/>
      <circle cx="${c1x}" cy="${c1y}" r="${r1}" fill="#fff" fill-opacity=".10"/>
      <circle cx="${c2x}" cy="${c2y}" r="${r2}" fill="#fff" fill-opacity=".08"/>
      <path d="M0 ${wave} C160 ${wave - 40} 320 ${wave + 50} 640 ${wave - 10} L640 360 L0 360 Z" fill="#000" fill-opacity=".10"/>
      <g transform="translate(430 110) scale(1.35)" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" stroke-opacity=".9"><path d="${iconFor(kursus, t)}"/></g>
      <rect x="32" y="30" rx="10" width="${36 + String(kursus.kode_mk || "").length * 15}" height="40" fill="#fff" fill-opacity=".18"/>
      <text x="50" y="58" fill="#fff" font-family="JetBrains Mono, ui-monospace, monospace" font-size="22" font-weight="700">${kursus.kode_mk || ""}</text>
    </svg>`;
  }

  /** Sampul kursus: gambar unggahan bila ada, selain itu ilustrasi otomatis. */
  function render(kursus, prodiKode, cls) {
    var html = Nexus.ui.html;
    if (kursus.cover && /^data:image\/(webp|jpeg|png);base64,/.test(kursus.cover)) {
      return html`<img src="${kursus.cover}" alt="Sampul kursus ${kursus.kode_mk} ${kursus.nama || ""}" class="${cls || "h-full w-full"} object-cover" loading="lazy">`;
    }
    return svg(kursus, prodiKode, cls);
  }

  /**
   * Kompres gambar unggahan: potong tengah 16:9, 640×360, WebP (cadangan JPEG), ≤ ~150 KB.
   * @returns Promise<string> data URL
   */
  function compress(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\/(png|jpe?g|webp|gif|bmp)$/.test(file.type)) return reject(new Error("File harus berupa gambar (PNG, JPG, atau WebP)."));
      if (file.size > 5 * 1024 * 1024) return reject(new Error("Ukuran gambar maksimal 5 MB."));
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var W = 640, H = 360;
        var canvas = document.createElement("canvas");
        canvas.width = W; canvas.height = H;
        var ctx = canvas.getContext("2d");
        var scale = Math.max(W / img.width, H / img.height);
        var w = img.width * scale, h = img.height * scale;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
        var out = canvas.toDataURL("image/webp", 0.8);
        if (out.indexOf("data:image/webp") !== 0) out = canvas.toDataURL("image/jpeg", 0.82);
        for (var q = 0.7; out.length > 150000 && q >= 0.4; q -= 0.1) out = canvas.toDataURL(out.indexOf("webp") > 0 ? "image/webp" : "image/jpeg", q);
        resolve(out);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Gambar tidak dapat dibaca.")); };
      img.src = url;
    });
  }

  Nexus.cover = { render: render, svg: svg, compress: compress, themes: THEMES };
})(window);
