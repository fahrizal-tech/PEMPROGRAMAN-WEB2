// Nomor versi aplikasi harus sama di package.json, layout (footer/sidebar) dan halaman login.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

test("versi aplikasi konsisten di semua tempat", () => {
  const versi = JSON.parse(read("package.json")).version;
  assert.match(read("assets/js/components/layout.js"), new RegExp(`version: "${versi.replace(/\./g, "\\.")}"`));
  const login = [...read("index.html").matchAll(/data-app-version>[^<]*v(\d+\.\d+\.\d+)</g)].map((m) => m[1]);
  assert.strictEqual(login.length, 2);
  login.forEach((v) => assert.strictEqual(v, versi));
});
