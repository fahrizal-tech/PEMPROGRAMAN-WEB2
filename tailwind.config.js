/**
 * Konfigurasi Tailwind CSS — Nexus LMS Admin Panel
 * Token berasal dari design system "Academic Admin Studio" (Google Stitch),
 * yang memakai skema color roles Material Design 3. Lihat docs/perancangan.md §5.
 * Build: npm run build:css  →  assets/css/app.css
 */
/** @type {import("tailwindcss").Config} */
module.exports = {
  content: ["./index.html", "./pages/**/*.html", "./assets/js/**/*.js"],
  theme: {
    extend: {
      "colors": {
        "background": "#f8f9ff",
        "brand": {
          "50": "#eff6ff",
          "100": "#dbeafe",
          "200": "#bfdbfe",
          "300": "#93c5fd",
          "400": "#60a5fa",
          "500": "#3b82f6",
          "600": "#2563eb",
          "700": "#1d4ed8",
          "800": "#1e40af",
          "900": "#1e3a8a",
          "950": "#172554"
        },
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "inverse-on-surface": "#eaf1ff",
        "inverse-primary": "#b4c5ff",
        "inverse-surface": "#213145",
        "on-background": "#0b1c30",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
        "on-primary": "#ffffff",
        "on-primary-container": "#eeefff",
        "on-primary-fixed": "#00174b",
        "on-primary-fixed-variant": "#003ea8",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#57657a",
        "on-secondary-fixed": "#0d1c2e",
        "on-secondary-fixed-variant": "#3a485b",
        "on-surface": "#0b1c30",
        "on-surface-variant": "#434655",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#eef0ff",
        "on-tertiary-fixed": "#131b2e",
        "on-tertiary-fixed-variant": "#3f465c",
        "outline": "#737686",
        "outline-variant": "#c3c6d7",
        "primary": "#004ac6",
        "primary-container": "#2563eb",
        "primary-fixed": "#dbe1ff",
        "primary-fixed-dim": "#b4c5ff",
        "secondary": "#515f74",
        "secondary-container": "#d5e3fc",
        "secondary-fixed": "#d5e3fc",
        "secondary-fixed-dim": "#b9c7df",
        "surface": "#f8f9ff",
        "surface-bright": "#f8f9ff",
        "surface-container": "#e5eeff",
        "surface-container-high": "#dce9ff",
        "surface-container-highest": "#d3e4fe",
        "surface-container-low": "#eff4ff",
        "surface-container-lowest": "#ffffff",
        "surface-dim": "#cbdbf5",
        "surface-tint": "#0053db",
        "surface-variant": "#d3e4fe",
        "tertiary": "#4d556b",
        "tertiary-container": "#656d84",
        "tertiary-fixed": "#dae2fd",
        "tertiary-fixed-dim": "#bec6e0"
      },
      "spacing": {
        "gutter": "1rem",
        "gutter-desktop": "1.5rem",
        "margin": "1rem",
        "margin-desktop": "2rem",
        "space-2xl": "2rem",
        "space-lg": "1rem",
        "space-md": "0.75rem",
        "space-sm": "0.5rem",
        "space-xl": "1.5rem",
        "space-xs": "0.25rem"
      },
      "fontFamily": {
        "body-lg": [
          "Inter"
        ],
        "body-md": [
          "Inter",
          "sans-serif"
        ],
        "body-sm": [
          "Inter"
        ],
        "body-xs": [
          "Inter"
        ],
        "code-sm": [
          "JetBrains Mono"
        ],
        "code-tabular": [
          "JetBrains Mono",
          "monospace"
        ],
        "display-lg": [
          "Inter"
        ],
        "display-lg-mobile": [
          "Inter"
        ],
        "headline-lg": [
          "Inter"
        ],
        "headline-md": [
          "Inter",
          "sans-serif"
        ],
        "headline-sm": [
          "Inter"
        ],
        "headline-xl": [
          "Inter",
          "sans-serif"
        ],
        "label-md": [
          "Inter"
        ],
        "label-sm": [
          "Inter"
        ],
        "label-xs": [
          "Inter"
        ],
        "mono": [
          "JetBrains Mono",
          "ui-monospace",
          "monospace"
        ],
        "sans": [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif"
        ]
      },
      "fontSize": {
        "body-lg": [
          "16px",
          {
            "lineHeight": "24px",
            "fontWeight": "400"
          }
        ],
        "body-md": [
          "14px",
          {
            "lineHeight": "20px",
            "fontWeight": "400"
          }
        ],
        "body-sm": [
          "13px",
          {
            "lineHeight": "18px",
            "fontWeight": "400"
          }
        ],
        "body-xs": [
          "12px",
          {
            "lineHeight": "16px",
            "fontWeight": "400"
          }
        ],
        "code-sm": [
          "12px",
          {
            "lineHeight": "16px",
            "fontWeight": "400"
          }
        ],
        "display-lg": [
          "32px",
          {
            "lineHeight": "40px",
            "letterSpacing": "-0.02em",
            "fontWeight": "700"
          }
        ],
        "display-lg-mobile": [
          "26px",
          {
            "lineHeight": "34px",
            "letterSpacing": "-0.015em",
            "fontWeight": "700"
          }
        ],
        "headline-lg": [
          "24px",
          {
            "lineHeight": "32px",
            "letterSpacing": "-0.015em",
            "fontWeight": "600"
          }
        ],
        "headline-md": [
          "20px",
          {
            "lineHeight": "28px",
            "letterSpacing": "-0.01em",
            "fontWeight": "600"
          }
        ],
        "headline-sm": [
          "16px",
          {
            "lineHeight": "24px",
            "letterSpacing": "-0.005em",
            "fontWeight": "600"
          }
        ],
        "label-md": [
          "14px",
          {
            "lineHeight": "20px",
            "fontWeight": "500"
          }
        ],
        "label-sm": [
          "12px",
          {
            "lineHeight": "16px",
            "letterSpacing": "0.01em",
            "fontWeight": "500"
          }
        ],
        "label-xs": [
          "11px",
          {
            "lineHeight": "14px",
            "letterSpacing": "0.04em",
            "fontWeight": "600"
          }
        ]
      }
    },
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/container-queries")],
};
