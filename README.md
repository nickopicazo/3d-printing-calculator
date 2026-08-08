# 3D Print Cost Estimator

Remix-compatible React Router app that estimates 3D printing price from **filament weight**, **print time**, and your **material / machine rates**, with optional free on-device OCR from Bambu Studio / OrcaSlicer “Slicing Result” screenshots.

## Pricing

```
materialCost = Σ (grams / 1000 × pricePerKg)
machineCost  = printHours × machineRatePerHour
subtotal     = materialCost + machineCost
total        = subtotal × (1 + markupPercent / 100)
```

Currency, machine rate, markup %, and default filament ₱/kg (or your currency) are editable and stored in `localStorage`.

Multi-color prints use one row per filament with its own price per kg.

## Development

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`.

```bash
npm run build
npm start
```

## Screenshot OCR

- Upload a file or paste an image (⌘V / Ctrl+V)
- Image is preprocessed (invert / contrast) then read with **Tesseract.js** in the browser
- Parsed grams and total time fill the form; you can always edit them
- Nothing is sent to a remote OCR API

## G-code / 3MF import (preferred)

Upload a Bambu Studio export directly:

- `.gcode.3mf` / `.3mf` / renamed `.zip` — unzipped in-browser with JSZip
- Standalone `.gcode` — reads the header only (first 64KB)

Exact values come from `Metadata/plate_1.gcode` header comments (or `slice_info.config` in the same package):

```
; total estimated time: 9h 43m 14s
; total filament weight [g] : 106.98,7.68
; filament: 1,3
```

No need to rename the 3MF to `.zip` yourself — the app opens it as a zip archive.

Slim fixtures for automated checks live under `sample/fixtures/` (header-only G-code + `slice_info.config`). Keep full Bambu exports under `sample/` locally if you want; they are gitignored.

```bash
npm run check:gcode
```

Check OCR parser fixtures:

```bash
npm run check:parser
```

## Railway

The repo includes a `Dockerfile` and `railway.toml`.

1. Create a Railway project from this repo
2. Railway builds with the Dockerfile and starts with `npm run start`
3. Set the public HTTP port to the service’s `PORT` (React Router serve respects it)

No database or API keys required.
