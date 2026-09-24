/**
 * Lingkungan uji: memuat ulang script browser (seed.js, storage.js, …) di Node
 * dengan localStorage tiruan, sehingga setiap tes mulai dari kondisi bersih.
 */
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");

class FakeStorage {
  constructor({ throwOnAccess = false, quotaBytes = Infinity } = {}) {
    this.map = new Map();
    this.throwOnAccess = throwOnAccess;
    this.quotaBytes = quotaBytes;
  }
  guard() {
    if (this.throwOnAccess) throw new Error("SecurityError: localStorage diblokir");
  }
  getItem(k) { this.guard(); return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) {
    this.guard();
    const size = [...this.map].reduce((n, [key, val]) => n + (key === k ? 0 : key.length + val.length), 0) + k.length + String(v).length;
    if (size > this.quotaBytes) {
      const e = new Error("QuotaExceededError");
      e.name = "QuotaExceededError";
      throw e;
    }
    this.map.set(k, String(v));
  }
  removeItem(k) { this.guard(); this.map.delete(k); }
}

/** Muat script browser dari folder proyek ke globalThis (fresh, tanpa cache require). */
function loadScripts(files, { storage = new FakeStorage(), session = new FakeStorage() } = {}) {
  delete globalThis.Nexus;
  delete globalThis.NexusSeed;
  globalThis.localStorage = storage;
  globalThis.sessionStorage = session;
  for (const f of files) {
    const full = path.join(ROOT, f);
    delete require.cache[require.resolve(full)];
    require(full);
  }
  return { Nexus: globalThis.Nexus, NexusSeed: globalThis.NexusSeed, storage, session };
}

const CORE = ["assets/data/seed.js", "assets/js/core/storage.js"];

module.exports = { FakeStorage, loadScripts, CORE, ROOT };
