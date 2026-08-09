# Project Context: 3D Printing Calculator (UI/UX Redesign Brief)

Read-only snapshot of the product, IA, visual system, and constraints for handing to another AI for redesign.

---

## 1. Product

**Brand / product name:** **3D Printing Calculator**  
**Tagline:** Accurate Cost Estimation  
**Full SEO title:** `3D Printing Calculator - Accurate Cost Estimation`  
**Short mobile nav:** “3D Calculator” · PWA short name: “3D Calc”

**One-liner (SEO / footer):**  
> Calculate filament consumption, electricity, and print costs in seconds. Free FDM and SLA cost estimator for 3D printing shops and makers.

**What it does:** Estimate **FDM** (filament by weight) and **SLA** (resin by volume) print costs from material usage, print time, and shop rates. Guests can quote and browser-print; signed-in users save projects, inventory, customers, and PDF-ready invoices. Optional import of Bambu Studio / OrcaSlicer `.3mf` / `.gcode` / `.zip`.

**Audience:** print farms, makerspaces, freelance 3D printing businesses, makers who want transparent quotes without spreadsheets.

**Key on-page copy (home):**
- H1: **“3D Printing Cost Calculator”**
- Sub: “Welcome {firstName} · Estimate FDM & SLA print costs”
- SEO section H2: **“Price every print with confidence”**
- Feature cards: “FDM & SLA ready”, “Import slicer exports”, “Shop-rate math”
- Footer: “Estimate accurately. Price confidently.”

**Sources:** `README.md`, `package.json`, `app/lib/seo.ts`, `app/routes/home.tsx`, `app/components/app-shell.tsx`, `public/site.webmanifest`

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| App | React Router 8 (SSR/framework), React 19, Vite 8 |
| UI | Tailwind CSS 4, shadcn-style Radix primitives, Lucide icons, CVA, `clsx` / `tailwind-merge` |
| Fonts | Plus Jakarta Sans Variable (display/sans), IBM Plex Mono (mono/money) |
| DB | PostgreSQL 16, Drizzle ORM |
| Auth | Better Auth + Google OAuth only |
| Import | JSZip (3MF / ZIP / G-code archives) |
| Deploy | Docker → Railway |
| Analytics | Google Analytics (`app/components/google-analytics.tsx`) |

**Env (from README):** `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `UPLOAD_DIR`

---

## 3. App routes and main user flows

### Routes (`app/routes.ts`)

| Path | File | Purpose |
|---|---|---|
| `/` | `app/routes/home.tsx` | Main calculator |
| `/login` | `login.tsx` | Google sign-in |
| `/logout` | `logout.tsx` | Sign out (POST) |
| `/materials` | `materials.tsx` | Filament/resin inventory (auth) |
| `/customers` | `customers.tsx` | Customers + attached projects (auth) |
| `/projects` | `projects._index.tsx` | Project list (auth) |
| `/projects/:id` | `projects.$id.tsx` | Redirect → `/?projectId=:id` |
| `/projects/:id/invoice` | `projects.$id.invoice.tsx` | Printable quote / Export PDF (auth) |
| `/api/auth/*` | `api.auth.$.ts` | Better Auth |
| `/api/projects` | `api.projects.ts` | Load/save/delete projects |
| `/api/customers` | `api.customers.ts` | Customer API |
| `/uploads/*` | `uploads.$.ts` | Plate images |
| `/robots.txt`, `/sitemap.xml` | SEO |
| Legacy | `/filaments` → materials, `/clients` → customers, `/quotes/*` → projects |

**Public SEO:** `/` and `/login` in sitemap; app pages generally `noindex`. Theme-color meta: `#0F172A`.

### Primary flows

1. **Guest estimate** → open `/` → set currency/rates → edit print(s) → see sticky total → **Print Quote** (`window.print` + hidden `GuestInvoicePrint`).
2. **Sign in** → Google → unlock Save, Materials, Customers, Projects, multi-file 3MF/G-code upload, Export PDF.
3. **Save project** → `POST /api/projects` → reopen via `/?projectId=…` or `/projects`.
4. **Invoice** → `/projects/:id/invoice` → screen + print via shared `QuoteDocument`.
5. **Inventory** → `/materials` → pick materials in calculator by type/name match on import.
6. **Customers** → attach on calculator or manage on `/customers`; filter projects by customer.

Query params on home: `?projectId=` load; `?new=1` blank estimate.

---

## 4. Design system / visual language

**Global CSS:** `app/app.css`

| Token | Value | Role |
|---|---|---|
| `--color-ink` | `#16161a` | Primary text |
| `--color-ink-muted` | `#6b6b76` | Secondary text |
| `--color-paper` | `#f0f0f2` | Page background |
| `--color-panel` | `#ffffff` | Cards |
| `--color-line` | `#e4e4e8` | Borders |
| `--color-accent` | `#6f52f0` | Primary purple (WCAG AA on white) |
| `--color-accent-deep` | `#5b45e0` | Hover / emphasis |
| `--color-lime` | `#c6f04d` | “Total” badge on dark card |
| `--color-charcoal` | `#1e1e22` | Dark cost card |
| `--color-warm` | `#c45c26` | Warm accent (available) |
| `--color-warn` | `#9a6700` | Warnings |

**Typography:** Plus Jakarta Sans (extrabold display headlines); IBM Plex Mono for tabular money. Labels often uppercase, small, muted (`field-label` / `Label`).

**Shape / elevation:**
- Cards: `rounded-3xl` (Card) or `dash-card` `border-radius: 1.5rem`, soft shadow
- Buttons: **pill** (`rounded-full`)
- Inputs: `rounded-xl`, bg `#fafafa`, accent focus ring `rgba(111,82,240,0.18)`
- Nav pill cluster with ring + light shadow
- Max content width: `.page-shell` **1400px**; list pages often `max-w-4xl` / `max-w-5xl`

**Motion:** `animate-fade-up` (+ delays), sheet slide animations, `prefers-reduced-motion` respected. Header hidden on print (`@media print { header { display: none } }`).

**shadcn primitives** (`app/components/ui/`): Button, Input, Textarea, Label, Select, Combobox, InputGroup, Card, Tabs, Separator, Collapsible, Dialog, Sheet, Popover, Tooltip, Command, FieldHelp, ConfirmDeleteDialog.

**Brand assets:** `/favicon.svg`, `/logo.svg`, `/og-image.png` (1200×630), quote doc uses purple “P” mark + product name.

**Visual character today:** Light gray paper app shell, white cards, purple CTAs, charcoal sticky total with lime “Total” chip — utility dashboard, not a marketing landing hero.

---

## 5. Feature areas / screens

| Area | Where | What |
|---|---|---|
| **Calculator** | `/` | Project name, currency, machine rate, service fee, VAT; multi-print tabs; customer; advanced settings; sticky project total |
| **Print editor** | `print-editor.tsx` | FDM/SLA toggle, name, printer, time, labor, materials, addons, plate previews, per-print upload (auth) |
| **Materials editor** | `materials-editor.tsx` | Material lines (g/ml, price/kg or /L, inventory match, color swatches) |
| **Addons editor** | `addons-editor.tsx` | Named lines: qty × unit cost (e.g. Packaging) |
| **Cost breakdown** | `cost-breakdown.tsx` | Light (per print) / dark (project total) |
| **Advanced settings** | `advanced-settings.tsx` | Power, kWh, labor, failure %, printer depreciation → suggested machine rate, default material prices, SLA waste/consumables |
| **Customer section** | `customer-section.tsx` | Inline customer draft + save when logged in |
| **Materials inventory** | `/materials` | CRUD filament/resin; dialog create; table/list in dash-card |
| **Customers** | `/customers` | Card list, dialog create, linked projects |
| **Projects** | `/projects` | Card grid with plate thumb, total, filter by customer; open / invoice / delete |
| **Invoice / quote** | `/projects/:id/invoice` + guest print | Shared `QuoteDocument` (inline styles for print) |
| **Auth** | `/login` | Centered Card: “Continue With Google” / guest link |
| **Shell** | `app-shell.tsx` | Sticky header, desktop pill nav, mobile Sheet, footer |

There is **no separate Settings route** — shop rates live in **localStorage** (`printcost:settings:v4`) via Advanced Settings + top-of-form rate fields.

---

## 6. Key data models / domain concepts

**Schema:** `app/db/schema.ts`

| Concept | Meaning |
|---|---|
| **User / Session / Account** | Better Auth + Google |
| **Customer** | name, email, phone, address; owned by user |
| **Project** | name; optional `customerId`; contains prints |
| **Material** (inventory) | kind `filament` \| `resin`; type, color; `pricePerUnit` (per kg or per L) |
| **Print** | technology `fdm` \| `sla`; time, labor; **rolled cost columns**; `metadataSnapshot` JSON |
| **PrintMaterial** | line items linked to optional inventory; unit `g` \| `ml` |
| **PrintAddon** | name, quantity, unitCost, sortOrder |
| **PrintPlate** | plate index, image path, minutes, sliced flag |
| **Quote** | persisted quote snapshots (legacy/parallel; UI emphasizes project invoice) |

**Client drafts:** `ProjectDraft` / `PrintDraft` / `CustomerDraft` in `app/lib/calculator-types.ts`.

**Pricing engine:** `app/lib/pricing.ts` — per print: material (+ SLA waste), electricity, labor, machine, addons, SLA consumables → landed → failure uplift → % service fee → VAT; fixed service fee once at project level. Defaults currency **PHP**; default filament ₱650/kg, resin ₱2500/L.

**Import:** fingerprint + basename duplicate guard; inventory match is exact type/name (case-insensitive).

---

## 7. Current layout patterns

```
┌─ sticky white header (brand + pill nav + user/Sign In) ─┐
│ page-shell (max 1400px)                                 │
│ ┌─ page title + primary actions ─────────────────────┐  │
│ │ xl: [ main column ~1fr ] [ aside 380px sticky ]    │  │
│ │   · dash-card: project + rates                     │  │
│ │   · Prints h2 + upload                             │  │
│ │   · Tabs (print names) in dash-card                │  │
│ │   · CustomerSection                                │  │
│ │   · Advanced Settings collapsible                  │  │
│ │                    aside: dark total + Print/PDF   │  │
│ │                    Recent Projects (auth)          │  │
│ └─ SEO features + FAQ (home only) ───────────────────┘  │
└─ footer (brand blurb + Calculator / Sign In) ───────────┘
```

**Patterns:** `page-shell` + `dash-card` / `Card`; Tabs for prints; Dialog for create; Sheet for mobile nav; ConfirmDeleteDialog; sticky aside totals; print layouts use **inline styles** + visibility hacks (`guest-invoice-print.tsx`).

---

## 8. Redesign constraints

1. **Must use shadcn under `app/components/ui/`** (workspace rule `.cursor/rules/shadcn-ui.mdc`): Input/Select/Combobox/Button/Dialog/etc.; InputGroup for compound fields; no raw selects or alternate UI kits. Missing primitives → add to `ui/` matching `rounded-xl`, `--color-line`, accent focus.
2. **Print-only layouts may use inline styles** (quote/invoice reliability). Header is print-hidden globally.
3. **Guest vs auth:** Nav hides Projects/Materials/Customers until signed in; upload gated; save gated. Guest path must stay first-class.
4. **Calculator is the product home** — not a separate marketing site; SEO FAQ/features sit below the tool.
5. **Settings are local**, not server — redesign shouldn’t imply cloud sync of rates unless product changes.
6. **Accessibility:** skip link, LabelWithHelp tips/dialogs, focus rings on accent.
7. **Currency-aware** money formatting; mono for numbers.
8. Existing accent is **purple** (`#6f52f0`); redesign may change tokens but should update Button/Input/quote brand mark consistently.

---

## 9. Notable WIP: Addons

**Change:** Replaces flat **hardware_cost** + **packaging_cost** with flexible **`print_addons`** lines (`name`, `quantity`, `unitCost`). Migration backfills “Hardware” / “Packaging” rows. UI: “Addons” section in each print; breakdown/quote show **Addons** when > 0.

**Implication for redesign:** Treat addons as a first-class cost line (not two fixed fields). Keep editable list UX (name / qty / cost / remove / add).

---

## File map (redesign-critical)

```
app/
  app.css                          # tokens, shell utilities, print header hide
  root.tsx                         # AppShell wrap, SEO defaults
  routes.ts                        # route table
  routes/home.tsx                  # calculator UX + SEO footer
  components/app-shell.tsx         # nav / brand / footer
  components/calculator/*          # feature UI + quote print
  components/ui/*                  # design system
  lib/seo.ts                       # brand strings, FAQs
  lib/pricing.ts, settings.ts, calculator-types.ts
  db/schema.ts
```

---

## Redesign AI takeaways

- **Job to be done:** Fast, trustworthy print job pricing + printable quote; account unlocks CRM-lite (materials, customers, saved multi-print projects).
- **IA:** Calculator-first; secondary auth surfaces for inventory/customers/projects; invoice is a document view, not a dashboard.
- **Current look:** Light utility app, purple accent, pill CTAs, soft white cards on gray paper, charcoal total card — denser form UI than marketing hero.
- **Hard constraints:** shadcn-only interactive UI; preserve guest flow and print/PDF quote fidelity; shop rates stay local unless scope expands; addons are the new flexible cost model.
