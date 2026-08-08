# 3D Print Cost Estimator

React Router app that estimates 3D printing price from **filament weight**, **print time**, and your **material / machine rates**. Signed-in users can save quotes, manage filament inventory, and attach clients/projects.

## Pricing

```
materialCost = Σ (grams / 1000 × pricePerKg)
machineCost  = printHours × machineRatePerHour
subtotal     = materialCost + machineCost
total        = subtotal × (1 + markupPercent / 100)
```

Local rates stay in `localStorage`. Saved quotes snapshot rates, metadata, and plate images in Postgres.

## Setup

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:push
npm run dev
```

App runs at `http://localhost:5173`.

### Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `BETTER_AUTH_SECRET` | Auth signing secret (≥32 chars) |
| `BETTER_AUTH_URL` | Public app URL (e.g. `http://localhost:5173`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `UPLOAD_DIR` | Plate image storage (default `./uploads`) |

Google Cloud Console redirect URI: `{BETTER_AUTH_URL}/api/auth/callback/google`

## Features

- **Guest mode** — estimate without signing in
- **Google login** — Better Auth + Postgres
- **Saved quotes** — client (name/email/phone), optional project, totals snapshot
- **Multi-plate 3MF** — all sliced `plate_N.gcode` / `slice_info` plates summed; thumbnails from `plate_N.png`
- **Filament inventory** — reusable materials with prices; pick via dropdown on the estimator
- **shadcn/ui** — shared UI primitives with the existing Print Quote brand tokens

## G-code / 3MF import

Upload a Bambu Studio export:

- `.gcode.3mf` / `.3mf` / `.zip` — unzipped in-browser
- Standalone `.gcode` — header only (first 64KB)

Multiple plates in one package become **one quote with N plates**. Unsliced plates (thumbnail only) are kept for reference.

```bash
npm run check:gcode
npm run check:parser
```

## Railway

1. Add a Postgres plugin and set `DATABASE_URL`
2. Set auth/Google env vars and `BETTER_AUTH_URL` to the public domain
3. Attach a volume at `/app/uploads` and set `UPLOAD_DIR=/app/uploads`
4. Run `npm run db:push` (or migrate) against production once
5. Build with the included `Dockerfile`

```bash
npm run build
npm start
```
