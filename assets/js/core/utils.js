/**
 * Nexus.utils — fungsi bantu umum (format Indonesia, keamanan, dll.).
 */
(function (global) {
  "use strict";

  var Nexus = (global.Nexus = global.Nexus || {});
  var TZ = "Asia/Jakarta";

  var HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

  var utils = {
    /** Wajib dipakai sebelum menyisipkan data pengguna ke innerHTML. */
    escapeHTML: function (value) {
      return value == null ? "" : String(value).replace(/[&<>"']/g, function (c) { return HTML_ESCAPES[c]; });
    },

    /** 24 Sep 2026 · atau 24 Sep 2026, 14.30 bila withTime. */
    formatDate: function (iso, withTime) {
      if (!iso) return "-";
      var d = new Date(iso);
      if (isNaN(d)) return "-";
      var opt = { day: "2-digit", month: "short", year: "numeric", timeZone: TZ };
      if (withTime) { opt.hour = "2-digit"; opt.minute = "2-digit"; }
      return new Intl.DateTimeFormat("id-ID", opt).format(d);
    },

    /** Tanggal lokal "YYYY-MM-DD" dari ISO (UTC atau lokal) / Date; default hari ini. */
    localDate: function (value) {
      var d = value ? new Date(value) : new Date();
      if (isNaN(d)) return "";
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    },

    /** "3 menit lalu", "2 hari lalu", atau tanggal bila > 7 hari. */
    timeAgo: function (iso, now) {
      var diff = ((now ? new Date(now) : new Date()) - new Date(iso)) / 1000;
      if (isNaN(diff)) return "-";
      if (diff < 60) return "baru saja";
      if (diff < 3600) return Math.floor(diff / 60) + " menit lalu";
      if (diff < 86400) return Math.floor(diff / 3600) + " jam lalu";
      if (diff < 604800) return Math.floor(diff / 86400) + " hari lalu";
      return utils.formatDate(iso);
    },

    /** 1.234,5 (pemisah Indonesia). */
    formatNumber: function (n, decimals) {
      if (n == null || isNaN(n)) return "-";
      return new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: decimals || 0,
        maximumFractionDigits: decimals || 0,
      }).format(n);
    },

    formatPercent: function (part, total, decimals) {
      if (!total) return "0%";
      return utils.formatNumber((part / total) * 100, decimals == null ? 1 : decimals) + "%";
    },

    initials: function (name) {
      return String(name || "")
        .replace(/^((Prof|Dr|Ir)\.?\s+)+/i, "")
        .split(/[\s,]+/)
        .filter(function (w) { return /^[A-Za-z]/.test(w); })
        .slice(0, 2)
        .map(function (w) { return w.charAt(0).toUpperCase(); })
        .join("") || "?";
    },

    debounce: function (fn, ms) {
      var t;
      return function () {
        var args = arguments, ctx = this;
        clearTimeout(t);
        t = setTimeout(function () { fn.apply(ctx, args); }, ms || 250);
      };
    },

    /** Ambil parameter URL, mis. ?id=krs_101. */
    param: function (name) {
      return new URLSearchParams(global.location ? global.location.search : "").get(name);
    },

    /** Unduh teks sebagai file (CSV/JSON) tanpa server. */
    download: function (filename, content, mime) {
      var blob = new Blob([content], { type: mime || "text/plain;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    },

    /** Baris objek → CSV (aman untuk Excel: kutip ganda & BOM UTF-8). */
    toCSV: function (rows, columns) {
      var cell = function (v) {
        var s = v == null ? "" : String(v);
        if (/^[=+\-@]/.test(s)) s = "'" + s; // cegah formula injection di Excel
        return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      };
      var head = columns.map(function (c) { return cell(c.label); }).join(",");
      var body = rows.map(function (r) {
        return columns.map(function (c) { return cell(typeof c.value === "function" ? c.value(r) : r[c.value]); }).join(",");
      });
      return "﻿" + [head].concat(body).join("\n");
    },
  };

  Nexus.utils = utils;
})(typeof window !== "undefined" ? window : globalThis);
