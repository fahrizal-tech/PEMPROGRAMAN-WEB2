/**
 * Nexus.validate — validasi berbasis skema, dipakai bersama oleh form (pesan per kolom)
 * dan service (lapisan terakhir sebelum data disimpan).
 *
 * Contoh skema:
 *   { kode_mk: { label: "Kode MK", required: true, transform: "upper",
 *                pattern: [/^[A-Z]{2,4}-\d{3}$/, "Format: CS-301"] } }
 *
 * Aturan: required, type ("string"|"integer"|"number"|"boolean"|"datetime"|"date"),
 * minLength, maxLength, min, max, pattern [regex, pesan], email, url (https), oneOf [...],
 * transform ("trim"|"upper"|"lower"), custom (fn(value, data) → pesan|null).
 * Aturan lintas data (unique, ref) dicek oleh service.
 */
(function (global) {
  "use strict";

  var Nexus = (global.Nexus = global.Nexus || {});

  function ValidationError(errors, message) {
    this.name = "ValidationError";
    this.code = "VALIDATION";
    this.errors = errors; // { kolom: "pesan" }
    var first = Object.keys(errors)[0];
    this.message = message || (first ? errors[first] : "Data tidak valid.");
  }
  ValidationError.prototype = Object.create(Error.prototype);
  ValidationError.prototype.constructor = ValidationError;

  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var URL_HTTPS = /^https:\/\/[^\s/$.?#].[^\s]*$/i;

  function isEmpty(v) {
    return v == null || (typeof v === "string" && v.trim() === "");
  }

  /** Bersihkan & ubah tipe sesuai skema (string angka dari form → number). */
  function normalize(schema, data) {
    var out = Object.assign({}, data);
    Object.keys(schema).forEach(function (field) {
      var rule = schema[field];
      var v = out[field];
      if (v === undefined) return;
      if (typeof v === "string") {
        v = v.trim();
        if (rule.transform === "upper") v = v.toUpperCase();
        if (rule.transform === "lower") v = v.toLowerCase();
      }
      if ((rule.type === "integer" || rule.type === "number") && typeof v === "string") {
        v = v === "" ? null : Number(v.replace(",", "."));
      }
      if (rule.type === "boolean" && typeof v === "string") v = v === "true" || v === "on" || v === "1";
      if (v === "" && !rule.required) v = null;
      out[field] = v;
    });
    return out;
  }

  function checkField(rule, v, data) {
    var label = rule.label || "Kolom";
    if (isEmpty(v)) return rule.required ? label + " wajib diisi." : null;

    switch (rule.type) {
      case "integer":
        if (typeof v !== "number" || !Number.isInteger(v)) return label + " harus berupa bilangan bulat.";
        break;
      case "number":
        if (typeof v !== "number" || isNaN(v)) return label + " harus berupa angka.";
        break;
      case "boolean":
        if (typeof v !== "boolean") return label + " tidak valid.";
        break;
      case "datetime":
      case "date":
        if (isNaN(Date.parse(v))) return label + " harus berupa tanggal yang valid.";
        break;
    }
    if (rule.minLength != null && String(v).length < rule.minLength) return label + " minimal " + rule.minLength + " karakter.";
    if (rule.maxLength != null && String(v).length > rule.maxLength) return label + " maksimal " + rule.maxLength + " karakter.";
    if (rule.min != null && v < rule.min) return label + " minimal " + rule.min + ".";
    if (rule.max != null && v > rule.max) return label + " maksimal " + rule.max + ".";
    if (rule.email && !EMAIL.test(v)) return label + " harus berupa alamat email yang valid.";
    if (rule.url && !URL_HTTPS.test(v)) return label + " harus berupa tautan yang diawali https://.";
    if (rule.pattern && !rule.pattern[0].test(v)) return rule.pattern[1] || label + " formatnya tidak sesuai.";
    if (rule.oneOf && rule.oneOf.indexOf(v) === -1) return label + " harus salah satu dari: " + rule.oneOf.join(", ") + ".";
    if (rule.custom) return rule.custom(v, data) || null;
    return null;
  }

  /**
   * Validasi data terhadap skema.
   * @param {object} options.only  daftar kolom yang dicek (untuk validasi per kolom saat mengetik)
   * @returns {{ valid: boolean, errors: object, data: object }}
   */
  function validate(schema, data, options) {
    var clean = normalize(schema, data || {});
    var errors = {};
    var fields = (options && options.only) || Object.keys(schema);
    fields.forEach(function (field) {
      if (!schema[field]) return;
      var msg = checkField(schema[field], clean[field], clean);
      if (msg) errors[field] = msg;
    });
    return { valid: Object.keys(errors).length === 0, errors: errors, data: clean };
  }

  Nexus.ValidationError = ValidationError;
  Nexus.validate = validate;
  Nexus.validate.normalize = normalize;
})(typeof window !== "undefined" ? window : globalThis);
