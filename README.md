# 3D Printing Calculator

Estimate **FDM** and **SLA** print costs from material usage, print time, and your shop rates. Upload Bambu Studio / OrcaSlicer exports to auto-fill filament weight and time. Guests can quote in the browser; signed-in users save projects, inventory, customers, and invoices.

## Features

- **Guest mode** — full estimate and browser print quote without an account
- **Google sign-in** — Better Auth + Postgres
- **Multi-print projects** — tabs per print, FDM or SLA per print
- **G-code / 3MF import** — multi-file upload at the Prints heading; single-file upload inside a print tab
- **Duplicate import guard** — skips files that match an existing print by filename or extracted content
- **Materials inventory** — filament (per kg) and resin (per L); exact type/name match on import (case-insensitive)
- **Customers & projects** — contacts, attach projects, open calculator or invoice
- **Cost breakdown** — material, labor, machine, electricity, hardware, packaging, failure uplift, service fee, VAT
- **Print quote / Export PDF** — browser print for guests and saved projects; PDF invoice when the project is saved
- **Field help** — hover tips and detail dialogs on rate-dependent inputs

## Pricing model

Per print:

```
materialCost     = Σ (quantity / 1000 × pricePerUnit)
                   [SLA: quantity × (1 + supportWaste% / 100) before ÷ 1000]
electricityCost  = printHours × (powerWatts / 1000) × electricityPerKwh
laborCost        = (laborMinutes / 60) × laborRatePerHour
machineCost      = printHours × machineRatePerHour
consumablesCost  = SLA only → slaConsumablesPerPrint
landed           = material + electricity + labor + machine
                   + hardware + packaging + consumables
failureUplift    = landed × (failurePercent / 100)
serviceFee       = percent → (landed + failure) × (fee / 100)
                   fixed  → applied once at project level (not per print)
preVat           = landed + failure + percent service fee
vatAmount        = preVat × (vatRate / 100)
total            = preVat + vat
```

Shop rates (machine, labor, electricity, VAT, service fee, SLA helpers) live in **localStorage** (`printcost:settings:v4`). Saved projects store print snapshots and plate images in Postgres.

## Stack

| Layer | Choice |
|---|---|
| App | React Router 8 (SSR), React 19, Vite |
| UI | Tailwind 4, shadcn/Radix, Lucide |
| DB | PostgreSQL 16, Drizzle ORM |
| Auth | Better Auth + Google OAuth |
| Import | JSZip (archives), Tesseract.js (slicer screenshot OCR) |
| Deploy | Docker → Railway |

## Setup

```bash
cp .env.example .env
docker compose up -d    # Postgres on localhost:5432
npm install
npm run db:push
npm run dev             # http://localhost:5173
```

### Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres URL (default compose: `postgresql://estimator:estimator@localhost:5432/estimator`) |
| `BETTER_AUTH_SECRET` | Auth signing secret (≥32 characters) |
| `BETTER_AUTH_URL` | Public app URL (`http://localhost:5173` in dev) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `UPLOAD_DIR` | Plate image storage (default `./uploads`) |

Google Cloud Console redirect URI:

```text
{BETTER_AUTH_URL}/api/auth/callback/google
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server (port 5173) |
| `npm run build` | Production build |
| `npm start` | Serve production build |
| `npm run typecheck` | React Router typegen + TypeScript |
| `npm run db:push` | Push Drizzle schema to the database |
| `npm run db:generate` / `db:migrate` | Generate / run migrations |
| `npm run db:studio` | Drizzle Studio |
| `npm run check:gcode` | Smoke-test G-code / 3MF import |
| `npm run check:parser` | Smoke-test header parser |

## G-code / 3MF import

Supported uploads:

| Input | Behavior |
|---|---|
| `.gcode.3mf`, `.3mf`, `.zip` | Unzipped in-browser; multi-plate |
| Standalone `.gcode` | First ~64KB header only |
| Slicer screenshot (`image/*`) | OCR for grams and print time |

**Extracted fields** (Bambu / Orca headers and `Metadata/slice_info.config`):

- Filament slots, weight (g), `filament_type`, colour
- Print time, printer model
- Plate thumbnails (`Metadata/plate_N.png`) for sliced plates

**Inventory mapping:** imported `filament_type` (e.g. `PETG`) matches inventory when **type** or **name** equals that string exactly (case-insensitive). No substring matching.

**Duplicates:** same basename or same content fingerprint (time + printer + materials + plates) against another print is skipped (re-upload onto the same print still replaces).

```bash
npm run check:gcode
npm run check:parser
```

## App routes

| Path | Description |
|---|---|
| `/` | Calculator (`/?projectId=…` loads a project; `/?new=1` clears to a blank estimate) |
| `/materials` | Filament / resin inventory |
| `/customers` | Customers and attached projects |
| `/projects` | Project list |
| `/projects/:id/invoice` | Printable / exportable invoice |
| `/login` | Google sign-in |
| `/uploads/*` | Served plate images |

Legacy redirects: `/filaments` → materials, `/clients` → customers, `/quotes/*` → projects.

## Project layout

```text
app/
  routes/                 # pages + API routes
  components/
    calculator/           # print editor, breakdown, quote docs
    ui/                   # shadcn primitives
  lib/
    pricing.ts            # cost engine
    settings.ts           # local rates
    calculator-types.ts   # drafts + import fingerprints
    gcode/                # 3MF / ZIP / G-code import
    ocr/                  # screenshot OCR
    auth*.ts, storage.server.ts
  db/                     # Drizzle schema + client
drizzle/                  # migrations
scripts/                  # parser / gcode checks
uploads/                  # runtime plate images (gitignored)
Dockerfile
docker-compose.yml
railway.toml
```

## Deploy (Railway)

1. Add Postgres and set `DATABASE_URL`
2. Set `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (public domain), and Google OAuth vars
3. Attach a volume at `/app/uploads` and set `UPLOAD_DIR=/app/uploads`
4. Run `npm run db:push` (or migrate) once against production
5. Build with the included `Dockerfile` (`railway.toml` uses Docker builder; healthcheck `/`)

```bash
npm run build
npm start   # serves on port 3000 in the container
```
