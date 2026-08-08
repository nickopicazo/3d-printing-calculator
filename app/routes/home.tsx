import { eq } from "drizzle-orm";
import { useEffect, useId, useRef, useState } from "react";
import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/home";
import { SaveQuoteDialog } from "~/components/save-quote-dialog";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { db } from "~/db/index.server";
import { clients, filaments, projects } from "~/db/schema";
import type { PlateImport } from "~/lib/gcode/loadFromArchive";
import { minutesToHoursMinutes } from "~/lib/ocr/parseSlicerResult";
import type { OcrProgress } from "~/lib/ocr/runOcr";
import {
  calculateQuote,
  createEmptyFilament,
  createFilamentId,
  formatMoney,
  materialCostForLine,
  type FilamentLine,
} from "~/lib/pricing";
import { getSession } from "~/lib/session.server";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type AppSettings,
} from "~/lib/settings";

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

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  const empty = {
    user: null as null | {
      id: string;
      name: string;
      email: string;
    },
    inventory: [] as Array<{
      id: string;
      name: string;
      type: string | null;
      color: string | null;
      pricePerKg: number;
    }>,
    clients: [] as Array<{
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
    }>,
    projects: [] as Array<{ id: string; clientId: string; name: string }>,
  };

  if (!session?.user) return empty;

  try {
    const [inventory, clientRows, projectRows] = await Promise.all([
      db
        .select()
        .from(filaments)
        .where(eq(filaments.userId, session.user.id)),
      db
        .select()
        .from(clients)
        .where(eq(clients.userId, session.user.id)),
      db
        .select()
        .from(projects)
        .where(eq(projects.userId, session.user.id)),
    ]);

    return {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
      inventory: inventory.map((f) => ({
        id: f.id,
        name: f.name,
        type: f.type,
        color: f.color,
        pricePerKg: f.pricePerKg,
      })),
      clients: clientRows.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
      })),
      projects: projectRows.map((p) => ({
        id: p.id,
        clientId: p.clientId,
        name: p.name,
      })),
    };
  } catch (error) {
    console.warn("Home loader DB query failed:", error);
    return {
      ...empty,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
    };
  }
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
  const data = useLoaderData<typeof loader>();
  const fileInputId = useId();
  const gcodeInputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const gcodeRef = useRef<HTMLInputElement>(null);

  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  const [filamentLines, setFilamentLines] = useState<FilamentLine[]>([
    createEmptyFilament(DEFAULT_SETTINGS.defaultFilamentPricePerKg),
  ]);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [plates, setPlates] = useState<PlateImport[]>([]);
  const [metadataSnapshot, setMetadataSnapshot] = useState<Record<
    string,
    unknown
  > | null>(null);

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
    setFilamentLines([createEmptyFilament(loaded.defaultFilamentPricePerKg)]);
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
    filaments: filamentLines,
    printMinutes,
    machineRatePerHour: settings.machineRatePerHour,
    markupPercent: settings.markupPercent,
  });

  function updateFilament(id: string, patch: Partial<FilamentLine>) {
    setFilamentLines((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function addFilament() {
    setFilamentLines((rows) => [
      ...rows,
      createEmptyFilament(
        settings.defaultFilamentPricePerKg,
        `Filament ${rows.length + 1}`,
      ),
    ]);
  }

  function removeFilament(id: string) {
    setFilamentLines((rows) => {
      if (rows.length <= 1) {
        return [createEmptyFilament(settings.defaultFilamentPricePerKg)];
      }
      return rows.filter((row) => row.id !== id);
    });
  }

  function applyInventory(lineId: string, inventoryId: string) {
    if (inventoryId === "custom") {
      updateFilament(lineId, { inventoryFilamentId: null });
      return;
    }
    const inv = data.inventory.find((f) => f.id === inventoryId);
    if (!inv) return;
    updateFilament(lineId, {
      inventoryFilamentId: inv.id,
      pricePerKg: inv.pricePerKg,
      label: inv.name,
      type: inv.type,
      color: inv.color,
    });
  }

  function applyImport(args: {
    filaments: Array<{
      label: string;
      grams: number;
      slot?: number | null;
      type?: string | null;
      color?: string | null;
    }>;
    totalMinutes: number | null;
    warnings: string[];
    source: string;
    plates?: PlateImport[];
    metadataSnapshot?: Record<string, unknown> | null;
  }) {
    if (args.filaments.length > 0) {
      setFilamentLines(
        args.filaments.map((line) => ({
          id: createFilamentId(),
          label: line.label,
          grams: line.grams,
          pricePerKg: settings.defaultFilamentPricePerKg,
          inventoryFilamentId: null,
          slot: line.slot ?? null,
          type: line.type ?? null,
          color: line.color ?? null,
        })),
      );
    }

    if (args.totalMinutes != null) {
      const hm = minutesToHoursMinutes(args.totalMinutes);
      setHours(hm.hours);
      setMinutes(hm.minutes);
    }

    setPlates(args.plates ?? []);
    setMetadataSnapshot(args.metadataSnapshot ?? null);

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
        plates: [],
        metadataSnapshot: { source: "ocr", fileName: file.name },
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
          slot: line.slot,
          type: line.type,
          color: line.color,
        })),
        totalMinutes: result.totalMinutes,
        warnings: result.warnings,
        source: result.sourceName,
        plates: result.plates,
        metadataSnapshot: result.metadataSnapshot,
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
  const slicedPlates = plates.filter((p) => p.sliced);

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

      <Card className="animate-fade-up-delay mb-6">
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Settings</CardTitle>
            <CardDescription>
              {settings.currencyCode} ({symbol}) · machine{" "}
              {formatMoney(settings.machineRatePerHour, symbol)}/hr · markup{" "}
              {settings.markupPercent}%
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setSettingsOpen((open) => !open)}
          >
            {settingsOpen ? "Hide" : "Edit rates"}
          </Button>
        </CardHeader>
        {settingsOpen ? (
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Currency code</Label>
              <Input
                value={settings.currencyCode}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    currencyCode: e.target.value.toUpperCase(),
                  }))
                }
              />
            </div>
            <div>
              <Label>Currency symbol</Label>
              <Input
                value={settings.currencySymbol}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    currencySymbol: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>Machine rate ({symbol}/hour)</Label>
              <Input
                className="font-mono"
                inputMode="decimal"
                value={settings.machineRatePerHour}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    machineRatePerHour: parseNumberInput(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <Label>Markup (%)</Label>
              <Input
                className="font-mono"
                inputMode="decimal"
                value={settings.markupPercent}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    markupPercent: parseNumberInput(e.target.value),
                  }))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Default filament price ({symbol}/kg)</Label>
              <Input
                className="font-mono"
                inputMode="decimal"
                value={settings.defaultFilamentPricePerKg}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    defaultFilamentPricePerKg: parseNumberInput(e.target.value),
                  }))
                }
              />
            </div>
          </CardContent>
        ) : null}
      </Card>

      <Card className="animate-fade-up-delay mb-6">
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Import print data</CardTitle>
            <CardDescription>
              Prefer a Bambu <span className="font-mono">.gcode.3mf</span>. Multi-plate
              packages sum all sliced plates.
            </CardDescription>
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
            <Button
              type="button"
              disabled={importStatus.running}
              onClick={() => gcodeRef.current?.click()}
            >
              {importStatus.running && importStatus.kind === "gcode"
                ? "Reading…"
                : "Upload 3MF / G-code"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={importStatus.running}
              onClick={() => fileRef.current?.click()}
            >
              {importStatus.running && importStatus.kind === "ocr"
                ? "Reading…"
                : "Upload screenshot"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {importStatus.running ? (
            <div className="rounded-xl border border-[var(--color-line)] bg-[#f7fafb] px-4 py-3 text-sm">
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
          ) : null}

          {importStatus.source && !importStatus.running && !importStatus.error ? (
            <p className="text-sm text-[var(--color-ink-muted)]">
              Loaded from{" "}
              <span className="font-mono text-[var(--color-ink)]">
                {importStatus.source}
              </span>
              {slicedPlates.length > 1
                ? ` · ${slicedPlates.length} sliced plates`
                : null}
            </p>
          ) : null}

          {importStatus.error ? (
            <p className="text-sm text-[#a33b2b]" role="alert">
              {importStatus.error}
            </p>
          ) : null}

          {importStatus.warnings.length > 0 && !importStatus.running ? (
            <ul className="mt-3 space-y-1 text-sm text-[var(--color-warn)]">
              {importStatus.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}

          {plates.length > 0 ? (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {plates.map((plate) => (
                <div
                  key={plate.plateIndex}
                  className="w-28 shrink-0 text-center"
                >
                  {plate.imageDataUrl ? (
                    <img
                      src={plate.imageDataUrl}
                      alt={`Plate ${plate.plateIndex}`}
                      className="aspect-square w-full rounded-lg border border-[var(--color-line)] bg-black object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-[var(--color-line)] text-xs text-[var(--color-ink-muted)]">
                      No img
                    </div>
                  )}
                  <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                    Plate {plate.plateIndex}
                    {!plate.sliced ? " · unsliced" : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="animate-fade-up-delay-2 mb-6">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Filaments</CardTitle>
            <CardDescription>
              Multi-color prints: one row per filament.
              {data.user ? (
                <>
                  {" "}
                  Pick from your{" "}
                  <Link
                    to="/filaments"
                    className="text-[var(--color-accent-deep)] hover:underline"
                  >
                    inventory
                  </Link>
                  .
                </>
              ) : null}
            </CardDescription>
          </div>
          <Button type="button" variant="secondary" onClick={addFilament}>
            Add filament
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {filamentLines.map((line, index) => (
            <div
              key={line.id}
              className="grid gap-3 rounded-xl border border-[var(--color-line)] bg-[#fbfcfd] p-4 sm:grid-cols-[1.2fr_1fr_1fr_auto]"
            >
              <div className="space-y-3 sm:col-span-4">
                {data.inventory.length > 0 ? (
                  <div>
                    <Label>From inventory</Label>
                    <Select
                      value={line.inventoryFilamentId ?? "custom"}
                      onValueChange={(v) => applyInventory(line.id, v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Custom / default price" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">
                          Custom / default price
                        </SelectItem>
                        {data.inventory.map((inv) => (
                          <SelectItem key={inv.id} value={inv.id}>
                            {inv.name}
                            {inv.type ? ` · ${inv.type}` : ""} ·{" "}
                            {formatMoney(inv.pricePerKg, symbol)}/kg
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
              <div>
                <Label>Label</Label>
                <Input
                  value={line.label}
                  onChange={(e) =>
                    updateFilament(line.id, { label: e.target.value })
                  }
                  placeholder={`Filament ${index + 1}`}
                />
              </div>
              <div>
                <Label>Weight (g)</Label>
                <Input
                  className="font-mono"
                  inputMode="decimal"
                  value={line.grams || ""}
                  onChange={(e) =>
                    updateFilament(line.id, {
                      grams: parseNumberInput(e.target.value),
                    })
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Price ({symbol}/kg)</Label>
                <Input
                  className="font-mono"
                  inputMode="decimal"
                  value={line.pricePerKg || ""}
                  onChange={(e) =>
                    updateFilament(line.id, {
                      pricePerKg: parseNumberInput(e.target.value),
                      inventoryFilamentId: null,
                    })
                  }
                  placeholder="0"
                />
              </div>
              <div className="flex items-end justify-between gap-2 sm:flex-col sm:items-stretch">
                <p className="font-mono text-sm text-[var(--color-ink-muted)] sm:text-right">
                  {formatMoney(materialCostForLine(line), symbol)}
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => removeFilament(line.id)}
                  aria-label={`Remove ${line.label}`}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Print time</CardTitle>
          <CardDescription>
            Uses total time from the slicer when available (summed across plates).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid max-w-md grid-cols-2 gap-3">
            <div>
              <Label>Hours</Label>
              <Input
                className="font-mono"
                inputMode="numeric"
                value={hours || ""}
                onChange={(e) =>
                  setHours(Math.max(0, parseNumberInput(e.target.value)))
                }
                placeholder="0"
              />
            </div>
            <div>
              <Label>Minutes</Label>
              <Input
                className="font-mono"
                inputMode="numeric"
                value={minutes || ""}
                onChange={(e) => {
                  const value = Math.max(0, parseNumberInput(e.target.value));
                  setMinutes(Math.min(59, Math.round(value)));
                }}
                placeholder="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[var(--color-accent)]/25 bg-[linear-gradient(160deg,#ffffff_0%,#eef8f6_100%)] shadow-[0_16px_48px_rgba(13,143,124,0.12)]">
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <CardTitle>Quote</CardTitle>
          <Button type="button" onClick={() => setSaveOpen(true)}>
            Save quote
          </Button>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2 text-sm sm:text-base">
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
            <Separator className="my-2 bg-[var(--color-accent)]/30" />
            <div className="flex justify-between gap-4">
              <dt className="font-display text-lg font-bold">Total</dt>
              <dd className="font-display text-2xl font-extrabold text-[var(--color-accent-deep)] sm:text-3xl">
                {formatMoney(quote.total, symbol)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <p className="mt-8 text-center text-xs text-[var(--color-ink-muted)]">
        Rates stay in this browser. OCR runs locally. Sign in to save quotes and
        filament inventory.
      </p>

      <SaveQuoteDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        userLoggedIn={Boolean(data.user)}
        clients={data.clients}
        projects={data.projects}
        titleDefault={
          importStatus.source
            ? importStatus.source.split("/").pop()?.replace(/\.(gcode\.)?3mf$/i, "") ||
              "New quote"
            : "New quote"
        }
        settings={settings}
        filaments={filamentLines}
        printMinutes={printMinutes}
        sourceName={importStatus.source}
        plates={plates}
        metadataSnapshot={metadataSnapshot}
      />
    </main>
  );
}
