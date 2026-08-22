import { CircleHelp, Clock, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router";
import { AddonsEditor } from "~/components/calculator/addons-editor";
import { remapMaterialsForTech } from "~/components/calculator/materials-editor";
import { MaterialsEditor } from "~/components/calculator/materials-editor";
import { Button } from "~/components/ui/button";
import { Combobox } from "~/components/ui/combobox";
import { ConfirmDeleteDialog } from "~/components/ui/confirm-delete-dialog";
import { LabelWithHelp } from "~/components/ui/field-help";
import { TimeInput } from "~/components/ui/hours-input";
import { Input } from "~/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "~/components/ui/input-group";
import { Label } from "~/components/ui/label";
import type {
  InventoryMaterial,
  PrintDraft,
} from "~/lib/calculator-types";
import {
  minutesToHoursMinutes,
  PRINTER_PRESETS,
  type Technology,
} from "~/lib/pricing";
import type { AppSettings } from "~/lib/settings";
import { withSignInSearch } from "~/lib/sign-in";
import { cn } from "~/lib/utils";

type Props = {
  print: PrintDraft;
  settings: AppSettings;
  inventory: InventoryMaterial[];
  loggedIn: boolean;
  canRemove: boolean;
  onChange: (print: PrintDraft) => void;
  onRemove?: () => void;
  onUploadFiles?: (files: File[]) => void;
  uploading?: boolean;
  /** Opens the 3MF / Bambu Studio export guide. */
  onOpenImportGuide?: () => void;
  /** When true, skip the outer card chrome (parent already provides it). */
  embedded?: boolean;
  nameError?: string;
};

export function PrintEditor({
  print,
  settings,
  inventory,
  loggedIn,
  canRemove,
  onChange,
  onRemove,
  onUploadFiles,
  uploading,
  onOpenImportGuide,
  embedded = false,
  nameError,
}: Props) {
  const location = useLocation();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const defaultPrice =
    print.technology === "sla"
      ? settings.defaultResinPricePerLitre
      : settings.defaultFilamentPricePerKg;
  const postProcess = minutesToHoursMinutes(print.postProcessMinutes);

  function setTech(technology: Technology) {
    const price =
      technology === "sla"
        ? settings.defaultResinPricePerLitre
        : settings.defaultFilamentPricePerKg;
    onChange({
      ...print,
      technology,
      materials: remapMaterialsForTech(print.materials, technology, price),
    });
  }

  return (
    <div className={embedded ? "space-y-6" : "dash-card space-y-6"}>
      <ConfirmDeleteDialog
        open={confirmRemove}
        title="Remove Print"
        description={`Remove “${print.name.trim() || "this print"}”?`}
        confirmLabel="Remove"
        confirmingLabel="Removing…"
        onOpenChange={setConfirmRemove}
        onConfirm={() => {
          onRemove?.();
          setConfirmRemove(false);
        }}
      />

      <div
        role="radiogroup"
        aria-label="Print technology"
        className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] p-1"
      >
        {(
          [
            { value: "fdm", label: "Filament · FDM" },
            { value: "sla", label: "Resin · SLA" },
          ] as const
        ).map((opt) => {
          const active = print.technology === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTech(opt.value)}
              className={cn(
                "inline-flex w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
                active
                  ? "bg-[var(--color-panel)] text-[var(--color-accent-deep)] shadow-sm"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-x-4 gap-y-4 sm:grid-cols-[minmax(0,5fr)_minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-2">
          <Label htmlFor={`part-${print.id}`}>
            Part / File Name <span className="text-[#a33b2b]">*</span>
          </Label>
          <Input
            id={`part-${print.id}`}
            required
            value={print.name}
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? `part-${print.id}-error` : undefined}
            onChange={(e) => onChange({ ...print, name: e.target.value })}
            className={
              nameError
                ? "w-full border-[#e8c4be] focus:border-[#a33b2b] focus:shadow-[0_0_0_3px_rgba(163,59,43,0.15)]"
                : "w-full"
            }
          />
          {nameError ? (
            <p id={`part-${print.id}-error`} className="text-xs text-[#a33b2b]">
              {nameError}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end">
          {print.technology === "fdm" ? (
            <div className="flex w-full items-center gap-1.5 sm:w-auto">
              {onUploadFiles ? (
                <label className="inline-flex min-w-0 flex-1 sm:flex-initial">
                  <input
                    type="file"
                    accept=".gcode,.3mf,.zip,.gcode.3mf"
                    className="sr-only"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        onUploadFiles([file]);
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
                      {uploading ? "Importing…" : "Upload 3MF / G-code"}
                    </span>
                  </Button>
                </label>
              ) : !loggedIn ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full min-w-0 flex-1 sm:w-auto sm:flex-initial"
                  asChild
                >
                  <Link
                    to={{ search: withSignInSearch(location.search) }}
                    className="inline-flex items-center justify-center gap-2"
                  >
                    <Upload className="size-4" aria-hidden />
                    Upload 3MF / G-code
                  </Link>
                </Button>
              ) : null}
              {onOpenImportGuide ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  aria-label="How to export a 3MF from Bambu Studio"
                  title="How to export a 3MF"
                  onClick={onOpenImportGuide}
                >
                  <CircleHelp className="size-4" aria-hidden />
                </Button>
              ) : null}
            </div>
          ) : null}
          {canRemove && onRemove ? (
            <Button
              type="button"
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={() => setConfirmRemove(true)}
            >
              <Trash2 />
              Remove Print
            </Button>
          ) : null}
        </div>

        <div className="space-y-2 sm:col-span-3">
          <Label htmlFor={`printer-${print.id}`}>Printer</Label>
          <Combobox
            id={`printer-${print.id}`}
            aria-label="Printer"
            options={PRINTER_PRESETS.map((p) => ({ value: p, label: p }))}
            value={print.printerName}
            onChange={(v) => onChange({ ...print, printerName: v })}
            placeholder="Printer Name"
            allowCustom
          />
        </div>
      </div>

      <div className="grid gap-x-4 gap-y-4 sm:grid-cols-3">
        <div className="min-w-0 space-y-2">
          <LabelWithHelp
            htmlFor={`ph-${print.id}`}
            tip="Print time drives machine and electricity cost."
            title="Print time"
            details={
              <>
                <p>
                  Machine cost = print hours × Machine Rate / Hr (project
                  settings).
                </p>
                <p>
                  Electricity cost = (Power W ÷ 1000) × print hours ×
                  Electricity / kWh (Advanced Settings). Leave those at 0 to
                  exclude them.
                </p>
              </>
            }
          >
            Print time
          </LabelWithHelp>
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <Clock aria-hidden />
            </InputGroupAddon>
            <InputGroupInput
              id={`ph-${print.id}`}
              type="number"
              min={0}
              aria-label="Hours"
              value={print.printHours}
              onChange={(e) =>
                onChange({ ...print, printHours: Number(e.target.value) || 0 })
              }
            />
            <InputGroupText aria-hidden>hr</InputGroupText>
            <InputGroupInput
              id={`pm-${print.id}`}
              type="number"
              min={0}
              max={59}
              aria-label="Minutes"
              value={print.printMinutesPart}
              onChange={(e) =>
                onChange({
                  ...print,
                  printMinutesPart: Number(e.target.value) || 0,
                })
              }
            />
            <InputGroupText className="pr-3" aria-hidden>
              min
            </InputGroupText>
          </InputGroup>
        </div>
        <div className="min-w-0 space-y-2">
          <LabelWithHelp
            htmlFor={`labor-${print.id}`}
            tip="Needs Labor Rate / Hour in Advanced Settings to affect cost."
            title="Labor time"
            details={
              <>
                <p>
                  Setup, slicing, and handling time. Labor cost = (labor minutes
                  ÷ 60) × Labor Rate / Hour from Advanced Settings.
                </p>
                <p>
                  Current rate: {settings.currencySymbol}
                  {settings.laborRatePerHour}/hr
                  {settings.laborRatePerHour <= 0
                    ? " — set a rate above 0 or this field will not change the total."
                    : "."}
                </p>
              </>
            }
          >
            Labor time
          </LabelWithHelp>
          <TimeInput
            id={`labor-${print.id}`}
            min={0}
            unit="min"
            value={print.laborMinutes}
            onChange={(e) =>
              onChange({
                ...print,
                laborMinutes: Number(e.target.value) || 0,
              })
            }
          />
        </div>
        <div className="min-w-0 space-y-2">
          <LabelWithHelp
            htmlFor={`pp-h-${print.id}`}
            tip="Cleaning, sanding, and finishing. Billed at Labor Rate / Hour."
            title="Post-processing time"
            details={
              <>
                <p>
                  Cleaning, sanding, painting, and assembly. Billed as its own
                  quote line: post-processing hours × Labor Rate / Hour from
                  Advanced Settings.
                </p>
                <p>
                  Current rate: {settings.currencySymbol}
                  {settings.laborRatePerHour}/hr
                  {settings.laborRatePerHour <= 0
                    ? " — set a rate above 0 or this field will not change the total."
                    : "."}
                </p>
              </>
            }
          >
            Post-processing time
          </LabelWithHelp>
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <Clock aria-hidden />
            </InputGroupAddon>
            <InputGroupInput
              id={`pp-h-${print.id}`}
              type="number"
              min={0}
              aria-label="Post-processing hours"
              value={postProcess.hours}
              onChange={(e) =>
                onChange({
                  ...print,
                  postProcessMinutes:
                    Math.max(0, Number(e.target.value) || 0) * 60 +
                    postProcess.minutes,
                })
              }
            />
            <InputGroupText aria-hidden>hr</InputGroupText>
            <InputGroupInput
              id={`pp-m-${print.id}`}
              type="number"
              min={0}
              max={59}
              aria-label="Post-processing minutes"
              value={postProcess.minutes}
              onChange={(e) =>
                onChange({
                  ...print,
                  postProcessMinutes:
                    postProcess.hours * 60 +
                    Math.max(0, Number(e.target.value) || 0),
                })
              }
            />
            <InputGroupText className="pr-3" aria-hidden>
              min
            </InputGroupText>
          </InputGroup>
        </div>
      </div>

      <MaterialsEditor
        technology={print.technology}
        materials={print.materials}
        inventory={inventory}
        defaultPrice={defaultPrice}
        currencySymbol={settings.currencySymbol}
        onChange={(materials) => onChange({ ...print, materials })}
      />

      <AddonsEditor
        addons={print.addons}
        currencySymbol={settings.currencySymbol}
        onChange={(addons) => onChange({ ...print, addons })}
      />

      {print.technology === "fdm" &&
      print.plates.filter((p) => p.sliced && p.imageDataUrl).length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {print.plates
            .filter((p) => p.sliced && p.imageDataUrl)
            .map((p) => (
              <img
                key={p.plateIndex}
                src={p.imageDataUrl!}
                alt={`Plate ${p.plateIndex}`}
                className="h-20 w-20 rounded-md border border-[var(--color-line)] object-cover"
              />
            ))}
        </div>
      ) : null}
    </div>
  );
}
