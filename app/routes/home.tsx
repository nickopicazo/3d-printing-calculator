import { useEffect, useId, useRef, useState } from "react";
import type { Route } from "./+types/home";
import {
  calculateQuote,
  createEmptyFilament,
  createFilamentId,
  formatMoney,
  materialCostForLine,
  type FilamentLine,
} from "../lib/pricing";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type AppSettings,
} from "../lib/settings";
import { minutesToHoursMinutes } from "../lib/ocr/parseSlicerResult";
import type { OcrProgress } from "../lib/ocr/runOcr";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "3D Print Cost Estimator" },
    {
      name: "description",
      content:
        "Estimate 3D printing price from filament weight, print time, and your material rates. Upload a Bambu .gcode.3mf / G-code, a slicer screenshot, or enter values manually.",
    },
  ];
}

type ImportStatus = {
  running: boolean;
  kind: "ocr" | "gcode" | null;
  progress: OcrProgress | null;
  warnings: string[];
  error: string | null;
  source: string | null;
};

function parseNumberInput(value: string): number {
  const cleaned = value.replace(/,/g, "").trim();
  if (cleaned === "") return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export default function Home() {
  const fileInputId = useId();
  const gcodeInputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const gcodeRef = useRef<HTMLInputElement>(null);

  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [filaments, setFilaments] = useState<FilamentLine[]>([
    createEmptyFilament(DEFAULT_SETTINGS.defaultFilamentPricePerKg),
  ]);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);

  const [importStatus, setImportStatus] = useState<ImportStatus>({
    running: false,
    kind: null,
    progress: null,
    warnings: [],
    error: null,
    source: null,
  });

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setFilaments([createEmptyFilament(loaded.defaultFilamentPricePerKg)]);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveSettings(settings);
  }, [settings, hydrated]);

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            event.preventDefault();
            void runOcr(file);
          }
          break;
        }
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [settings.defaultFilamentPricePerKg]);

  const printMinutes = hours * 60 + minutes;
  const quote = calculateQuote({
    filaments,
    printMinutes,
    machineRatePerHour: settings.machineRatePerHour,
    markupPercent: settings.markupPercent,
  });

  function updateFilament(id: string, patch: Partial<FilamentLine>) {
    setFilaments((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function addFilament() {
    setFilaments((rows) => [
      ...rows,
      createEmptyFilament(
        settings.defaultFilamentPricePerKg,
        `Filament ${rows.length + 1}`,
      ),
    ]);
  }

  function removeFilament(id: string) {
    setFilaments((rows) => {
      if (rows.length <= 1) {
        return [createEmptyFilament(settings.defaultFilamentPricePerKg)];
      }
      return rows.filter((row) => row.id !== id);
    });
  }

  function applyImport(args: {
    filaments: Array<{ label: string; grams: number }>;
    totalMinutes: number | null;
    warnings: string[];
    source: string;
  }) {
    if (args.filaments.length > 0) {
      setFilaments(
        args.filaments.map((line) => ({
          id: createFilamentId(),
          label: line.label,
          grams: line.grams,
          pricePerKg: settings.defaultFilamentPricePerKg,
        })),
      );
    }

    if (args.totalMinutes != null) {
      const hm = minutesToHoursMinutes(args.totalMinutes);
      setHours(hm.hours);
      setMinutes(hm.minutes);
    }

    setImportStatus({
      running: false,
      kind: null,
      progress: null,
      warnings: args.warnings,
      error: null,
      source: args.source,
    });
  }

  async function runOcr(file: File) {
    setImportStatus({
      running: true,
      kind: "ocr",
      progress: { status: "starting", progress: 0 },
      warnings: [],
      error: null,
      source: null,
    });

    try {
      const { extractFromSlicerScreenshot } = await import("../lib/ocr/runOcr");
      const result = await extractFromSlicerScreenshot(file, (progress) => {
        setImportStatus((prev) => ({ ...prev, progress }));
      });

      applyImport({
        filaments: result.filamentGrams.map((grams, index) => ({
          label: `Filament ${index + 1}`,
          grams,
        })),
        totalMinutes: result.totalMinutes,
        warnings: result.warnings,
        source: file.name,
      });
    } catch (error) {
      setImportStatus({
        running: false,
        kind: null,
        progress: null,
        warnings: [],
        error:
          error instanceof Error
            ? error.message
            : "OCR failed. Enter values manually.",
        source: null,
      });
    }
  }

  async function runGcodeImport(file: File) {
    setImportStatus({
      running: true,
      kind: "gcode",
      progress: { status: "reading file", progress: 0.2 },
      warnings: [],
      error: null,
      source: null,
    });

    try {
      const { extractFromGcodeUpload } = await import(
        "../lib/gcode/loadFromArchive"
      );
      setImportStatus((prev) => ({
        ...prev,
        progress: { status: "parsing slicer data", progress: 0.6 },
      }));
      const result = await extractFromGcodeUpload(file);

      applyImport({
        filaments: result.filaments.map((line) => ({
          label: line.label,
          grams: line.grams,
        })),
        totalMinutes: result.totalMinutes,
        warnings: result.warnings,
        source: result.sourceName,
      });
    } catch (error) {
      setImportStatus({
        running: false,
        kind: null,
        progress: null,
        warnings: [],
        error:
          error instanceof Error
            ? error.message
            : "Could not read G-code / 3MF. Enter values manually.",
        source: null,
      });
    }
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void runOcr(file);
    event.target.value = "";
  }

  function onGcodeFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void runGcodeImport(file);
    event.target.value = "";
  }

  const symbol = settings.currencySymbol;

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="animate-fade-up mb-10">
        <p className="font-display text-sm font-semibold tracking-[0.18em] text-[var(--color-accent-deep)] uppercase">
          Print Quote
        </p>
        <h1 className="font-display mt-2 text-4xl font-extrabold tracking-tight text-[var(--color-ink)] sm:text-5xl">
          3D Cost Estimator
        </h1>
        <p className="mt-3 max-w-xl text-[var(--color-ink-muted)]">
          Price a print from filament weight and machine time. Upload a Bambu
          .gcode.3mf / G-code for exact values, a slicer screenshot, or enter
          the numbers yourself.
        </p>
      </header>

      <section className="animate-fade-up-delay mb-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]/90 p-5 shadow-[0_12px_40px_rgba(26,35,50,0.06)] backdrop-blur-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">Settings</h2>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              {settings.currencyCode} ({symbol}) · machine{" "}
              {formatMoney(settings.machineRatePerHour, symbol)}/hr · markup{" "}
              {settings.markupPercent}%
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setSettingsOpen((open) => !open)}
          >
            {settingsOpen ? "Hide" : "Edit rates"}
          </button>
        </div>

        {settingsOpen && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="field-label">Currency code</span>
              <input
                className="field-input"
                value={settings.currencyCode}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    currencyCode: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="PHP"
              />
            </label>
            <label>
              <span className="field-label">Currency symbol</span>
              <input
                className="field-input"
                value={settings.currencySymbol}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    currencySymbol: e.target.value,
                  }))
                }
                placeholder="₱"
              />
            </label>
            <label>
              <span className="field-label">
                Machine rate ({symbol}/hour)
              </span>
              <input
                className="field-input font-mono"
                inputMode="decimal"
                value={settings.machineRatePerHour}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    machineRatePerHour: parseNumberInput(e.target.value),
                  }))
                }
              />
            </label>
            <label>
              <span className="field-label">Markup (%)</span>
              <input
                className="field-input font-mono"
                inputMode="decimal"
                value={settings.markupPercent}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    markupPercent: parseNumberInput(e.target.value),
                  }))
                }
              />
            </label>
            <label className="sm:col-span-2">
              <span className="field-label">
                Default filament price ({symbol}/kg)
              </span>
              <input
                className="field-input font-mono"
                inputMode="decimal"
                value={settings.defaultFilamentPricePerKg}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    defaultFilamentPricePerKg: parseNumberInput(e.target.value),
                  }))
                }
              />
            </label>
          </div>
        )}
      </section>

      <section className="animate-fade-up-delay mb-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]/90 p-5 shadow-[0_12px_40px_rgba(26,35,50,0.06)] backdrop-blur-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">Import print data</h2>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              Prefer a Bambu <span className="font-mono">.gcode.3mf</span> for
              exact grams and time (no rename needed). Screenshot OCR works as
              a fallback — paste an image with ⌘V / Ctrl+V.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={gcodeRef}
              id={gcodeInputId}
              type="file"
              accept=".gcode.3mf,.3mf,.gcode,.zip,application/zip"
              className="sr-only"
              onChange={onGcodeFileChange}
            />
            <input
              ref={fileRef}
              id={fileInputId}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={onFileChange}
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={importStatus.running}
              onClick={() => gcodeRef.current?.click()}
            >
              {importStatus.running && importStatus.kind === "gcode"
                ? "Reading…"
                : "Upload 3MF / G-code"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={importStatus.running}
              onClick={() => fileRef.current?.click()}
            >
              {importStatus.running && importStatus.kind === "ocr"
                ? "Reading…"
                : "Upload screenshot"}
            </button>
          </div>
        </div>

        {importStatus.running && (
          <div className="mt-4 rounded-xl border border-[var(--color-line)] bg-[#f7fafb] px-4 py-3 text-sm">
            <p className="animate-pulse-soft font-medium text-[var(--color-accent-deep)]">
              {importStatus.progress?.status ?? "Working…"}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-line)]">
              <div
                className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-300"
                style={{
                  width: `${Math.round((importStatus.progress?.progress ?? 0) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {importStatus.source && !importStatus.running && !importStatus.error && (
          <p className="mt-4 text-sm text-[var(--color-ink-muted)]">
            Loaded from{" "}
            <span className="font-mono text-[var(--color-ink)]">
              {importStatus.source}
            </span>
          </p>
        )}

        {importStatus.error && (
          <p className="mt-4 text-sm text-[#a33b2b]" role="alert">
            {importStatus.error}
          </p>
        )}

        {importStatus.warnings.length > 0 && !importStatus.running && (
          <ul className="mt-4 space-y-1 text-sm text-[var(--color-warn)]">
            {importStatus.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="animate-fade-up-delay-2 mb-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]/90 p-5 shadow-[0_12px_40px_rgba(26,35,50,0.06)] backdrop-blur-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold">Filaments</h2>
          <button type="button" className="btn btn-ghost" onClick={addFilament}>
            Add filament
          </button>
        </div>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Multi-color prints: one row per filament with its own price per kg.
        </p>

        <div className="mt-5 space-y-4">
          {filaments.map((line, index) => (
            <div
              key={line.id}
              className="grid gap-3 rounded-xl border border-[var(--color-line)] bg-[#fbfcfd] p-4 sm:grid-cols-[1.2fr_1fr_1fr_auto]"
            >
              <label>
                <span className="field-label">Label</span>
                <input
                  className="field-input"
                  value={line.label}
                  onChange={(e) =>
                    updateFilament(line.id, { label: e.target.value })
                  }
                  placeholder={`Filament ${index + 1}`}
                />
              </label>
              <label>
                <span className="field-label">Weight (g)</span>
                <input
                  className="field-input font-mono"
                  inputMode="decimal"
                  value={line.grams || ""}
                  onChange={(e) =>
                    updateFilament(line.id, {
                      grams: parseNumberInput(e.target.value),
                    })
                  }
                  placeholder="0"
                />
              </label>
              <label>
                <span className="field-label">Price ({symbol}/kg)</span>
                <input
                  className="field-input font-mono"
                  inputMode="decimal"
                  value={line.pricePerKg || ""}
                  onChange={(e) =>
                    updateFilament(line.id, {
                      pricePerKg: parseNumberInput(e.target.value),
                    })
                  }
                  placeholder="0"
                />
              </label>
              <div className="flex items-end justify-between gap-2 sm:flex-col sm:items-stretch">
                <p className="font-mono text-sm text-[var(--color-ink-muted)] sm:text-right">
                  {formatMoney(materialCostForLine(line), symbol)}
                </p>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => removeFilament(line.id)}
                  aria-label={`Remove ${line.label}`}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]/90 p-5 shadow-[0_12px_40px_rgba(26,35,50,0.06)] backdrop-blur-sm sm:p-6">
        <h2 className="font-display text-xl font-bold">Print time</h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Uses total time from the slicer when available.
        </p>
        <div className="mt-4 grid max-w-md grid-cols-2 gap-3">
          <label>
            <span className="field-label">Hours</span>
            <input
              className="field-input font-mono"
              inputMode="numeric"
              value={hours || ""}
              onChange={(e) => setHours(Math.max(0, parseNumberInput(e.target.value)))}
              placeholder="0"
            />
          </label>
          <label>
            <span className="field-label">Minutes</span>
            <input
              className="field-input font-mono"
              inputMode="numeric"
              value={minutes || ""}
              onChange={(e) => {
                const value = Math.max(0, parseNumberInput(e.target.value));
                setMinutes(Math.min(59, Math.round(value)));
              }}
              placeholder="0"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-accent)]/25 bg-[linear-gradient(160deg,#ffffff_0%,#eef8f6_100%)] p-5 shadow-[0_16px_48px_rgba(13,143,124,0.12)] sm:p-6">
        <h2 className="font-display text-xl font-bold">Quote</h2>
        <dl className="mt-4 space-y-2 text-sm sm:text-base">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--color-ink-muted)]">Material</dt>
            <dd className="font-mono font-medium">
              {formatMoney(quote.materialCost, symbol)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--color-ink-muted)]">
              Machine ({quote.printHours.toFixed(2)} hr ×{" "}
              {formatMoney(settings.machineRatePerHour, symbol)})
            </dt>
            <dd className="font-mono font-medium">
              {formatMoney(quote.machineCost, symbol)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-[var(--color-line)] pt-2">
            <dt className="text-[var(--color-ink-muted)]">Subtotal</dt>
            <dd className="font-mono font-medium">
              {formatMoney(quote.subtotal, symbol)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--color-ink-muted)]">
              Markup ({settings.markupPercent}%)
            </dt>
            <dd className="font-mono font-medium">
              {formatMoney(quote.markupAmount, symbol)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-[var(--color-accent)]/30 pt-3">
            <dt className="font-display text-lg font-bold">Total</dt>
            <dd className="font-display text-2xl font-extrabold text-[var(--color-accent-deep)] sm:text-3xl">
              {formatMoney(quote.total, symbol)}
            </dd>
          </div>
        </dl>
      </section>

      <p className="mt-8 text-center text-xs text-[var(--color-ink-muted)]">
        Settings stay in this browser. OCR runs locally — nothing is uploaded to
        a server.
      </p>
    </main>
  );
}
