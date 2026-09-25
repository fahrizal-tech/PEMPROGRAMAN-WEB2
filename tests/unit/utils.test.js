const test = require("node:test");
const assert = require("node:assert/strict");
const { loadScripts } = require("../helpers/env");

const { Nexus } = loadScripts(["assets/js/core/utils.js"]);
const u = Nexus.utils;

test("escapeHTML menetralkan tag & atribut berbahaya (anti-XSS)", () => {
  assert.equal(u.escapeHTML('<img src=x onerror="alert(1)">'), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  assert.equal(u.escapeHTML("O'Neil & Co"), "O&#39;Neil &amp; Co");
  assert.equal(u.escapeHTML(null), "");
});

test("toCSV: kutip aman, BOM UTF-8, dan cegah formula injection Excel", () => {
  const csv = u.toCSV(
    [{ a: '=HYPERLINK("x")', b: "koma, dan \"kutip\"" }],
    [{ label: "A", value: "a" }, { label: "B", value: (r) => r.b }]
  );
  assert.ok(csv.startsWith("﻿"));
  const [, row] = csv.slice(1).split("\n");
  assert.ok(row.startsWith("\"'=HYPERLINK"), "formula diawali petik tunggal");
  assert.ok(row.endsWith('"koma, dan ""kutip"""'));
});

test("format Indonesia: angka, persen, tanggal", () => {
  assert.equal(u.formatNumber(1234.5, 1), "1.234,5");
  assert.equal(u.formatPercent(1, 3), "33,3%");
  assert.equal(u.formatPercent(1, 0), "0%");
  assert.equal(u.formatDate("2026-09-24T07:30:00Z"), "24 Sep 2026");
  assert.equal(u.formatDate("bukan tanggal"), "-");
});

test("initials melewati gelar akademik", () => {
  assert.equal(u.initials("Prof. Dr. Ir. Budi Rahardjo, M.Sc."), "BR");
  assert.equal(u.initials("Siti Paramitha, S.T., M.Sc."), "SP");
  assert.equal(u.initials(""), "?");
});

test("timeAgo relatif terhadap waktu acuan", () => {
  const now = "2026-09-24T10:00:00Z";
  assert.equal(u.timeAgo("2026-09-24T09:58:00Z", now), "2 menit lalu");
  assert.equal(u.timeAgo("2026-09-22T10:00:00Z", now), "2 hari lalu");
});

test("localDate memakai tanggal lokal (bukan UTC)", () => {
  const d = new Date(2026, 8, 25, 0, 30); // 25 Sep 00.30 waktu lokal
  assert.equal(u.localDate(d), "2026-09-25");
  assert.equal(u.localDate(d.toISOString()), "2026-09-25", "ISO UTC dikonversi kembali ke tanggal lokal");
  assert.equal(u.localDate("bukan tanggal"), "");
});
