---
name: Academic Admin Studio
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fc'
  on-secondary-container: '#57657a'
  tertiary: '#4d556b'
  on-tertiary: '#ffffff'
  tertiary-container: '#656d84'
  on-tertiary-container: '#eef0ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d5e3fc'
  secondary-fixed-dim: '#b9c7df'
  on-secondary-fixed: '#0d1c2e'
  on-secondary-fixed-variant: '#3a485b'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-xs:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-xs:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

This design system is engineered for higher education academic administrative portals, registrar back-offices, and institutional LMS operations. The visual posture reflects institutional authority, clarity, and utilitarian rigor. It rejects decorative digital noise, excessive gradients, and gratuitous novelty in favor of structured information density, predictable interactions, and sustained visual comfort across full working days.

### Design Tone & Voice
- **Authoritative & Reliable:** Built on structured layouts, strict contrast governance, and crisp geometric hierarchy.
- **Utilitarian & Calm:** Prioritizes dense tabular data, multi-tiered course hierarchies, and student lifecycle management without cognitive fatigue.
- **Pragmatic Modernism:** Combines crisp borders (`1px solid`), neutral slate layering, and standard desktop interface conventions reminiscent of GitHub Enterprise, Stripe Dashboard, and Linear.

## Colors

The palette is rooted in slate neutrals with functional semantic accents. It eliminates neon highlights, saturated glow overlays, and tinted ambient drop shadows.

### Core Canvas & Neutrals
- **Canvas Base (`#ffffff`):** Dedicated to primary workspaces, data sheets, cards, and modal dialogs.
- **Subtle Surface (`#f8fafc`):** Utilized for structural background scaffolding, inactive tabs, table header rows, and page canvas underlays.
- **Muted Surface (`#f1f5f9`):** Input field disabled states, inner container borders, and secondary tag fills.
- **Structural Borders (`#e2e8f0` default, `#cbd5e1` strong):** Delimits all data cells, panels, sidebar dividers, and form boundaries with exact `1px` geometry.

### Typography Hierarchy Tokens
- **Primary Text (`#0f172a`):** Headings, active values, high-priority status text, table cell data.
- **Secondary Body (`#334155`):** Standard paragraph text, form labels, contextual summaries.
- **Muted Caption (`#475569`):** Table column titles, breadcrumbs, supporting metadata, helper copy.
- **Subtle Placeholder (`#94a3b8`):** Form field placeholder text, inactive icons, empty-state indicators.

### Brand & Interactive Accents
- **Primary Cobalt (`#2563eb`):** Primary action buttons, active navigation markers, key pagination controls.
- **Primary Hover (`#1d4ed8`):** Pressed/hover state for primary actions.
- **Subtle Interactive Tint (`#eff6ff`):** Row selection background, selected menu pill, active tab indicator wash.

### Semantic Status Tokens
- **Success (`#10b981` text / `#059669` icon / `#ecfdf5` background / `#a7f3d0` border):** Active enrollments, verified transcripts, published syllabus items.
- **Warning (`#d97706` text / `#b45309` icon / `#fffbeb` background / `#fde68a` border):** Pending approvals, payment verifications, grade dispute flags.
- **Critical / Danger (`#dc2626` text / `#b91c1c` icon / `#fef2f2` background / `#fecaca` border):** Expelled status, failed prerequisites, system maintenance locks.
- **Info (`#0284c7` text / `#0369a1` icon / `#f0f9ff` background / `#bae6fd` border):** Scheduled term dates, draft revisions.

## Typography

The typography scale relies on **Inter** to ensure maximum legibility for dense tables, complex ID numbers, academic codes (e.g., `CS-302`, `NIM 13521099`), and multi-column administrative forms.

### Hierarchy Guidelines
- **Numbers and Data Cells:** Always use `font-feature-settings: 'tnum' 1, 'cv05' 1` for tabular alignment of student IDs, grade point averages (IPK/SKS), currency amounts, and dates.
- **Section Headers:** Reserved for `headline-md` (20px) and `headline-sm` (16px), styled in weight `600` with subtle negative tracking (`-0.01em`) to maintain optical balance.
- **Form Labels & Table Headings:** Use `label-sm` or `label-xs` in uppercase tracking (`0.04em`) with `#475569` coloring for column titles to establish clear distinction between meta-labels and user data.
- **Inline Monospaced Data:** Course code references, student identification numbers, and cryptographic verification hashes use `JetBrains Mono` at `12px`.

## Layout & Spacing

The portal layout adheres to a fixed-sidebar, fluid-workbench architecture optimized for standard widescreen displays (`1280px` to `1920px`).

### Grid & Canvas Structure
- **Persistent Navigation:** Fixed-width left navigation rail at `256px` (collapsible to `64px` icon-only state for data-heavy views).
- **Workbench Canvas:** Fluid container with max-width bounding box set to `1600px` on wide screens to prevent overextended table rows.
- **Breakpoints:**
  - `Desktop (>= 1280px)`: Fixed navigation, multi-column filter bar, 12-column sub-grids, table margins at `2rem`.
  - `Compact Desktop / Tablet Landscape (1024px - 1279px)`: 64px compact icon rail, 2-column card layouts, horizontal overflow tables.
  - `Mobile / Tablet Portrait (< 1024px)`: Drawer-based navigation, stacked full-width controls, single-column forms.

### Spacing Governance
- Component internal padding strictly uses `space-xs` (4px), `space-sm` (8px), `space-md` (12px), and `space-lg` (16px).
- Vertical stack separation between form fields defaults to `space-lg` (16px).
- Table cell padding adheres to a compact standard: `8px 12px` (dense mode) or `12px 16px` (standard mode).

## Elevation & Depth

Visual separation relies on structural boundaries rather than ambient drop shadows or heavy blurs. The design system mimics tangible printed paperwork and technical instruments.

### Layering Model
1. **Underlay Canvas (`Level 0`):** `#f8fafc` — Ground surface for the entire application outside cards and tables.
2. **Surface Plane (`Level 1`):** `#ffffff` with `border: 1px solid #e2e8f0` — Standard panels, cards, data grids, toolbars, and forms.
3. **Resting Layer Elevation:** Uses minimal physical offset:
   - `box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)`
4. **Interactive Hover Elevation:**
   - `box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`
5. **Popovers, Dropdowns & Modals (`Level 2`):** `#ffffff` with `border: 1px solid #cbd5e1`:
   - `box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03)`
6. **Modal Backdrop:** `rgba(15, 23, 42, 0.45)` with `backdrop-filter: blur(1px)`. No tinted or colored blurs.

## Shapes

The geometric signature is disciplined, structured, and compact. 

- **Corner Radius Scale:**
  - Base input elements, select menus, standard buttons, and small tags: `4px` (`rounded-sm`).
  - Cards, modals, slide-overs, and data containers: `6px` to `8px` (`rounded-md`).
  - Badges and status pills: `9999px` (`rounded-full`) exclusively for compact state pills to contrast against rectangular form structures.
- **Borders:** Consistent `1px solid` thickness throughout. Avoid 2px or decorative thick borders on interactive surfaces; focus rings use standard outer box-shadow offsets (`2px` focus offset).

## Components

### Buttons
- **Primary Button:** Background `#2563eb`, border `1px solid #1d4ed8`, text `#ffffff`, font-weight `500`, radius `4px`. Shadow: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`. Hover: `#1d4ed8`. Active: `#1e40af`.
- **Secondary / Outline Button:** Background `#ffffff`, border `1px solid #cbd5e1`, text `#0f172a`, font-weight `500`, radius `4px`. Hover: `#f8fafc` with border `#94a3b8`.
- **Ghost / Tertiary Button:** Transparent background, text `#475569`, hover background `#f1f5f9`, hover text `#0f172a`.
- **Destructive Button:** Background `#ffffff`, border `1px solid #fecaca`, text `#dc2626`, hover background `#fef2f2`.
- **Sizing:**
  - Standard: Height `36px`, padding `0 12px`, font-size `14px`.
  - Compact (table row actions): Height `28px`, padding `0 8px`, font-size `12px`.

### Text Inputs & Form Controls
- **Standard Input:** Background `#ffffff`, border `1px solid #cbd5e1`, text `#0f172a`, radius `4px`, padding `6px 12px`, height `36px`, font-size `14px`.
- **Placeholder:** `#94a3b8`.
- **Focus State:** Border `#2563eb`, outline `none`, box-shadow `0 0 0 3px rgba(37, 99, 235, 0.15)`.
- **Error State:** Border `#ef4444`, focus ring `rgba(239, 68, 68, 0.15)`. Validation error text rendered in `#dc2626` with `body-xs` (12px) paired with an inline error icon.
- **Labels:** Text `#334155`, weight `500`, font-size `13px`, margin-bottom `4px`. Optional markers indicated by `(Opsional)` in `#64748b`.

### Checkboxes & Radio Buttons
- **Checkbox:** Square `16px x 16px`, radius `3px`, border `1px solid #cbd5e1`. Checked: Background `#2563eb`, border `#2563eb`, white checkmark icon. Indeterminate state supported for multi-select tables.
- **Radio Button:** Circle `16px x 16px`, border `1px solid #cbd5e1`. Checked: Inner dot `#2563eb` with diameter `6px`.

### Badges & Status Chips
- **Structural Spec:** Height `20px` or `22px`, padding `0 8px`, font-size `11px`, font-weight `500`, corner radius `9999px`.
- **Status Green (Active / Lulus / Terverifikasi):** Text `#065f46`, background `#ecfdf5`, border `1px solid #a7f3d0`.
- **Status Amber (Pending / Menunggu Persetujuan):** Text `#92400e`, background `#fffbeb`, border `1px solid #fde68a`.
- **Status Red (Inactive / Ditolak / Cuti Akademik):** Text `#991b1b`, background `#fef2f2`, border `1px solid #fecaca`.
- **Status Neutral (Draft / Arsip):** Text `#475569`, background `#f1f5f9`, border `1px solid #e2e8f0`.

### Data Tables (The Central Workhorse)
- **Container:** Wrapped in `1px solid #e2e8f0` with `rounded-md` corners and overflow hidden.
- **Header Row (`<thead>`):** Background `#f8fafc`, bottom border `1px solid #e2e8f0`. Column headers use `label-xs` (11px), uppercase, color `#475569`, weight `600`, padding `10px 16px`.
- **Data Rows (`<tr>`):** Height `44px`, background `#ffffff`, border-bottom `1px solid #f1f5f9`. Hover: Background `#f8fafc`. Selected state: Background `#eff6ff` with border-bottom `1px solid #bfdbfe`.
- **Data Cells (`<td>`):** Padding `8px 16px`, font-size `13px`, color `#0f172a`. Monospace values for IDs, registration codes, and semester codes.
- **Pagination Footer:** Height `48px`, background `#ffffff`, border-top `1px solid #e2e8f0`, padding `0 16px`, flex layout with row counts ("Menampilkan 1-25 dari 1.420 data") and compact numeric pager buttons.

### Filter & Action Toolbars
- Height `52px`, background `#ffffff`, border `1px solid #e2e8f0`, radius `6px`, padding `8px 12px`.
- Left-aligned search input with leading magnifier icon (`#64748b`), segmented dropdowns for Faculty/Prodi filters, right-aligned secondary Export (CSV/XLSX) and primary Add Record actions.