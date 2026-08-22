import { Share2, Printer, Plus, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdvancedSettingsPanel } from "~/components/calculator/advanced-settings";
import { CostBreakdown } from "~/components/calculator/cost-breakdown";
import { GuestInvoicePrint } from "~/components/calculator/guest-invoice-print";
import { Import3mfTour } from "~/components/calculator/import-3mf-tour";
import { PrintEditor } from "~/components/calculator/print-editor";
import { ShareCalculationDialog } from "~/components/calculator/share-calculation-dialog";
import { Combobox } from "~/components/ui/combobox";
import { Button } from "~/components/ui/button";
import { LabelWithHelp } from "~/components/ui/field-help";
import { Input } from "~/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "~/components/ui/input-group";
import { Label } from "~/components/ui/label";
import { MoneyInput } from "~/components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  emptyPrint,
  nextPrintName,
  printDraftMinutes,
  type ProjectDraft,
} from "~/lib/calculator-types";
import { importGcodeFiles } from "~/lib/gcode/applyImportToPrint";
import {
  applyLandingPreset,
  projectFromSharePayload,
  type LandingPreset,
} from "~/lib/landing-preset";
import { calculateProject } from "~/lib/pricing";
import {
  DEFAULT_SETTINGS,
  listCurrencies,
  normalizeSettings,
  saveSettings,
  type AppSettings,
} from "~/lib/settings";
import { cn } from "~/lib/utils";

export type CalculatorSurfaceProps = {
  /** Applied once on mount (and when seedKey changes). */
  preset?: LandingPreset | null;
  /** Shared calculation payload (wins over preset). */
  initialShare?: {
    settings: Partial<AppSettings>;
    project: ProjectDraft;
  } | null;
  /** Remount seed when this changes (e.g. slug). */
  seedKey?: string;
  heading?: string;
  subheading?: string;
  /** Hide project name / customer chrome for embeds */
  compact?: boolean;
  /** Persist setting edits to localStorage */
  persistSettings?: boolean;
  showShare?: boolean;
  showPrintQuote?: boolean;
  showOpenFullApp?: boolean;
  className?: string;
};

function seedState(
  preset: LandingPreset | null | undefined,
  initialShare:
    | { settings: Partial<AppSettings>; project: ProjectDraft }
    | null
    | undefined,
) {
  if (initialShare) return projectFromSharePayload(initialShare);
  if (preset) return applyLandingPreset(preset);
  return {
    settings: { ...DEFAULT_SETTINGS },
    project: applyLandingPreset({}).project,
  };
}

export function CalculatorSurface({
  preset = null,
  initialShare = null,
  seedKey = "default",
  heading,
  subheading,
  compact = false,
  persistSettings = false,
  showShare = true,
  showPrintQuote = true,
  showOpenFullApp = false,
  className,
}: CalculatorSurfaceProps) {
  const seeded = useMemo(
    () => seedState(preset, initialShare),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-seed via seedKey
    [seedKey],
  );

  const [settings, setSettings] = useState<AppSettings>(seeded.settings);
  const [project, setProject] = useState<ProjectDraft>(seeded.project);
  const [activePrintId, setActivePrintId] = useState<string | null>(
    seeded.project.prints[0]?.id ?? null,
  );
  const [shareOpen, setShareOpen] = useState(false);
  const [uploadPrintId, setUploadPrintId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importWarning, setImportWarning] = useState<string | null>(null);
  const [importTourOpen, setImportTourOpen] = useState(false);

  useEffect(() => {
    const next = seedState(preset, initialShare);
    setSettings(next.settings);
    setProject(next.project);
    setActivePrintId(next.project.prints[0]?.id ?? null);
  }, [seedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (project.prints.length === 0) {
      setActivePrintId(null);
      return;
    }
    setActivePrintId((current) => {
      if (current && project.prints.some((p) => p.id === current)) {
        return current;
      }
      return project.prints[0].id;
    });
  }, [project.prints]);

  const projectCalc = useMemo(() => {
    const inputs = project.prints.map((p) => ({
      id: p.id,
      name: p.name,
      input: {
        technology: p.technology,
        materials: p.materials,
        printMinutes: printDraftMinutes(p),
        laborMinutes: p.laborMinutes,
        postProcessMinutes: p.postProcessMinutes,
        addons: p.addons,
        settings,
      },
    }));
    return calculateProject(inputs);
  }, [project.prints, settings]);

  const showSla = project.prints.some((p) => p.technology === "sla");
  const activePrint = project.prints.find((p) => p.id === activePrintId);

  function updateSettings(next: AppSettings) {
    const normalized = normalizeSettings(next);
    setSettings(normalized);
    if (persistSettings) saveSettings(normalized);
  }

  function updatePrint(id: string, next: (typeof project.prints)[0]) {
    setProject((prev) => ({
      ...prev,
      prints: prev.prints.map((p) => (p.id === id ? next : p)),
    }));
  }

  function addPrint() {
    setProject((prev) => {
      const print = emptyPrint(settings, "fdm", nextPrintName(prev.prints));
      return { ...prev, prints: [...prev.prints, print] };
    });
  }

  function removePrint(id: string) {
    setProject((prev) => {
      if (prev.prints.length <= 1) return prev;
      return { ...prev, prints: prev.prints.filter((p) => p.id !== id) };
    });
  }

  async function handleUploadFiles(printId: string, files: File[]) {
    if (files.length === 0) return;
    setUploadPrintId(printId);
    setImportError(null);
    setImportWarning(null);
    try {
      const result = await importGcodeFiles({
        printId,
        files,
        prints: project.prints,
        settings,
      });
      if (!result.unchanged) {
        setProject((prev) => ({ ...prev, prints: result.prints }));
      }
      setActivePrintId(result.activePrintId);
      if (result.warning) setImportWarning(result.warning);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setUploadPrintId(null);
    }
  }

  return (
    <div className={cn(compact ? "space-y-4" : "space-y-6", className)}>
      <Import3mfTour
        open={importTourOpen}
        loggedIn
        onOpenChange={setImportTourOpen}
      />
      {(heading || subheading || showOpenFullApp) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {heading ? (
              <h2 className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">
                {heading}
              </h2>
            ) : null}
            {subheading ? (
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                {subheading}
              </p>
            ) : null}
          </div>
          {showOpenFullApp ? (
            <Button asChild variant="outline" size="sm">
              <a href="/" target="_blank" rel="noopener noreferrer">
                Open full calculator
              </a>
            </Button>
          ) : null}
        </div>
      )}

      <div
        className={cn(
          "grid gap-6",
          compact ? "xl:grid-cols-1" : "xl:grid-cols-[minmax(0,1fr)_340px]",
        )}
      >
        <div className="space-y-5">
          <div className="dash-card space-y-5">
            <div
              className={cn(
                "grid gap-4",
                compact
                  ? "sm:grid-cols-1"
                  : "sm:grid-cols-[minmax(0,1fr)_13rem]",
              )}
            >
              {!compact ? (
                <div className="space-y-2">
                  <Label htmlFor="surface-project-name">Project Name</Label>
                  <Input
                    id="surface-project-name"
                    placeholder="e.g. Keychain Batch"
                    value={project.name}
                    onChange={(e) =>
                      setProject((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="surface-currency">Currency</Label>
                <Combobox
                  id="surface-currency"
                  aria-label="Currency"
                  options={listCurrencies().map((c) => ({
                    value: c.code,
                    label: c.code,
                    keywords: c.name,
                  }))}
                  value={settings.currencyCode}
                  onChange={(code) =>
                    updateSettings({
                      ...settings,
                      currencyCode: code.toUpperCase(),
                    })
                  }
                  placeholder="Currency"
                  searchPlaceholder="Search currency…"
                  emptyText="No currency found."
                  allowCustom={false}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <LabelWithHelp
                  htmlFor="surface-machine-rate"
                  tip="Needs print time on each print to affect cost."
                  title="Machine Rate / Hr"
                >
                  Machine Rate / Hr
                </LabelWithHelp>
                <MoneyInput
                  id="surface-machine-rate"
                  currencySymbol={settings.currencySymbol}
                  value={settings.machineRatePerHour}
                  onChange={(e) =>
                    updateSettings({
                      ...settings,
                      machineRatePerHour: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <LabelWithHelp
                  htmlFor="surface-service-fee"
                  tip="Percent is per print; Fixed is once per project."
                  title="Service Fee"
                >
                  Service Fee
                </LabelWithHelp>
                <InputGroup>
                  {settings.serviceFeeMode === "fixed" ? (
                    <InputGroupAddon align="inline-start">
                      <InputGroupText aria-hidden>
                        {settings.currencySymbol}
                      </InputGroupText>
                    </InputGroupAddon>
                  ) : null}
                  <InputGroupInput
                    id="surface-service-fee"
                    type="number"
                    min={0}
                    step={1}
                    value={settings.serviceFeeValue}
                    onChange={(e) =>
                      updateSettings({
                        ...settings,
                        serviceFeeValue: Math.max(
                          0,
                          Math.round(Number(e.target.value) || 0),
                        ),
                      })
                    }
                  />
                  <InputGroupAddon align="inline-end" className="p-0 pr-0">
                    <Select
                      value={settings.serviceFeeMode}
                      onValueChange={(value) =>
                        updateSettings({
                          ...settings,
                          serviceFeeMode:
                            value === "fixed" ? "fixed" : "percent",
                        })
                      }
                    >
                      <SelectTrigger
                        aria-label="Service fee type"
                        className="h-10 w-[7.25rem] rounded-none rounded-r-[0.7rem] border-0 border-l border-[var(--color-line)] bg-transparent shadow-none focus:border-[var(--color-line)] focus:shadow-none"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">Percent</SelectItem>
                        <SelectItem value="fixed">Fixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </InputGroupAddon>
                </InputGroup>
              </div>
              <div className="space-y-2">
                <Label htmlFor="surface-vat">VAT %</Label>
                <Input
                  id="surface-vat"
                  type="number"
                  min={0}
                  value={settings.vatRate}
                  onChange={(e) =>
                    updateSettings({
                      ...settings,
                      vatRate: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {activePrint ? (
            <div className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <h3 className="font-display text-lg font-extrabold tracking-tight">
                  Prints
                </h3>
                <label className="inline-flex w-full sm:w-auto">
                  <input
                    type="file"
                    accept=".gcode,.3mf,.zip,.gcode.3mf"
                    multiple
                    className="sr-only"
                    disabled={uploadPrintId != null}
                    onChange={(e) => {
                      const list = e.target.files;
                      if (list && list.length > 0 && activePrintId) {
                        void handleUploadFiles(
                          activePrintId,
                          Array.from(list),
                        );
                      }
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full sm:w-auto"
                    asChild
                  >
                    <span className="inline-flex cursor-pointer items-center justify-center gap-2">
                      <Upload className="size-4" aria-hidden />
                      {uploadPrintId != null
                        ? "Importing…"
                        : "Upload 3MF / G-code"}
                    </span>
                  </Button>
                </label>
              </div>
              {importWarning || importError ? (
                <div className="space-y-2">
                  {importWarning ? (
                    <p className="rounded-xl border border-[#e8d9a8] bg-[#fffbeb] px-3 py-2 text-sm text-[#9a6700]">
                      {importWarning}
                    </p>
                  ) : null}
                  {importError ? (
                    <p className="rounded-xl border border-[#e8c4be] bg-[#fdf4f2] px-3 py-2 text-sm text-[#a33b2b]">
                      {importError}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <Tabs
                value={activePrintId ?? undefined}
                onValueChange={setActivePrintId}
                className="dash-card !p-0"
              >
                <div className="flex items-center gap-1.5 border-b border-[var(--color-line)] bg-[var(--color-paper)]/70 px-2 py-2 sm:px-4">
                  <div className="min-w-0 flex-1 overflow-x-auto">
                    <TabsList className="inline-flex h-auto w-max min-w-0 flex-nowrap justify-start gap-1 border-0 bg-transparent p-0">
                      {project.prints.map((print, index) => {
                        const label =
                          print.name.trim() || `Print ${index + 1}`;
                        return (
                          <TabsTrigger
                            key={print.id}
                            value={print.id}
                            title={label}
                            className="max-w-[10rem] shrink-0 truncate data-[state=active]:bg-white sm:max-w-[14rem]"
                          >
                            {label}
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>
                  </div>
                  {!compact ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addPrint}
                      className="h-8 shrink-0 rounded-full px-2.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                    >
                      <Plus />
                      Add
                    </Button>
                  ) : null}
                </div>

                {project.prints.map((print) => {
                  const printCalc = projectCalc.prints.find(
                    (p) => p.id === print.id,
                  );
                  return (
                    <TabsContent
                      key={print.id}
                      value={print.id}
                      className="mt-0 space-y-6 p-4 sm:p-6"
                    >
                      <PrintEditor
                        print={print}
                        settings={settings}
                        inventory={[]}
                        loggedIn={false}
                        canRemove={project.prints.length > 1}
                        uploading={uploadPrintId === print.id}
                        embedded
                        onChange={(next) => updatePrint(print.id, next)}
                        onRemove={() => removePrint(print.id)}
                        onUploadFiles={(files) =>
                          handleUploadFiles(print.id, files)
                        }
                        onOpenImportGuide={() => setImportTourOpen(true)}
                      />
                      {printCalc ? (
                        <CostBreakdown
                          breakdown={printCalc.breakdown}
                          currencySymbol={settings.currencyCode}
                          title="Print Cost"
                          postProcessMinutes={print.postProcessMinutes}
                        />
                      ) : null}
                    </TabsContent>
                  );
                })}
              </Tabs>
            </div>
          ) : null}

          <AdvancedSettingsPanel
            settings={settings}
            onChange={updateSettings}
            showSla={showSla}
          />
        </div>

        <aside
          className={cn(
            "space-y-4",
            !compact && "xl:sticky xl:top-24 xl:self-start",
          )}
        >
          <CostBreakdown
            breakdown={projectCalc}
            currencySymbol={settings.currencyCode}
            variant="dark"
            postProcessMinutes={project.prints.reduce(
              (sum, p) => sum + p.postProcessMinutes,
              0,
            )}
            title={
              project.prints.length > 1
                ? `Project Total (${project.prints.length} Prints)`
                : "Recommended selling price"
            }
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {showPrintQuote ? (
              <Button
                type="button"
                variant="outline"
                className="w-full flex-1"
                onClick={() => window.print()}
              >
                <Printer />
                Print Quote
              </Button>
            ) : null}
            {showShare ? (
              <Button
                type="button"
                variant="outline"
                className="w-full flex-1"
                onClick={() => setShareOpen(true)}
              >
                <Share2 />
                Share
              </Button>
            ) : null}
          </div>
          {showOpenFullApp ? (
            <p className="text-xs text-[var(--color-ink-muted)]">
              Powered by{" "}
              <a
                className="font-semibold underline"
                href="/"
                target="_blank"
                rel="noopener noreferrer"
              >
                3D Printing Calculator
              </a>
            </p>
          ) : null}
        </aside>
      </div>

      {showPrintQuote ? (
        <GuestInvoicePrint
          projectName={project.name}
          customer={project.customer}
          prints={project.prints}
          breakdowns={projectCalc.prints}
          rolled={projectCalc}
          currencySymbol={settings.currencyCode}
        />
      ) : null}

      {showShare ? (
        <ShareCalculationDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          settings={settings}
          project={project}
        />
      ) : null}
    </div>
  );
}
