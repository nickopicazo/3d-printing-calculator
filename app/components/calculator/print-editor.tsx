import { Upload } from "lucide-react";
import { useState } from "react";
import { AddonsEditor } from "~/components/calculator/addons-editor";
import { remapMaterialsForTech } from "~/components/calculator/materials-editor";
import { MaterialsEditor } from "~/components/calculator/materials-editor";
import { Button } from "~/components/ui/button";
import { Combobox } from "~/components/ui/combobox";
import { ConfirmDeleteDialog } from "~/components/ui/confirm-delete-dialog";
import { LabelWithHelp } from "~/components/ui/field-help";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type {
  InventoryMaterial,
  PrintDraft,
} from "~/lib/calculator-types";
import { PRINTER_PRESETS, type Technology } from "~/lib/pricing";
import type { AppSettings } from "~/lib/settings";
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
  embedded = false,
  nameError,
}: Props) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const defaultPrice =
    print.technology === "sla"
      ? settings.defaultResinPricePerLitre
      : settings.defaultFilamentPricePerKg;

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
    <div className={embedded ? "space-y-4" : "dash-card space-y-4"}>
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

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="w-1/2 min-w-0 space-y-1.5">
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
        <div className="flex w-full flex-col gap-2 self-stretch sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:self-end">
          {loggedIn && onUploadFiles && print.technology === "fdm" ? (
            <label className="inline-flex w-full sm:w-auto">
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
              <Button type="button" className="w-full sm:w-auto" asChild>
                <span className="inline-flex cursor-pointer items-center justify-center gap-2">
                  <Upload className="size-4" aria-hidden />
                  {uploading ? "Importing…" : "Upload 3MF / G-code"}
                </span>
              </Button>
            </label>
          ) : null}
          {canRemove && onRemove ? (
            <Button
              type="button"
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={() => setConfirmRemove(true)}
            >
              Remove Print
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
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
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
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
              Print Hours
            </LabelWithHelp>
            <Input
              id={`ph-${print.id}`}
              type="number"
              min={0}
              value={print.printHours}
              onChange={(e) =>
                onChange({ ...print, printHours: Number(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`pm-${print.id}`}>Minutes</Label>
            <Input
              id={`pm-${print.id}`}
              type="number"
              min={0}
              max={59}
              value={print.printMinutesPart}
              onChange={(e) =>
                onChange({
                  ...print,
                  printMinutesPart: Number(e.target.value) || 0,
                })
              }
            />
          </div>
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

      <div className="max-w-xs space-y-1.5">
        <LabelWithHelp
          htmlFor={`labor-${print.id}`}
          tip="Needs Labor Rate / Hour in Advanced Settings to affect cost."
          title="Labor time"
          details={
            <>
              <p>
                Labor cost = (labor minutes ÷ 60) × Labor Rate / Hour from
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
          Labor Time (Min)
        </LabelWithHelp>
        <Input
          id={`labor-${print.id}`}
          type="number"
          min={0}
          value={print.laborMinutes}
          onChange={(e) =>
            onChange({ ...print, laborMinutes: Number(e.target.value) || 0 })
          }
        />
      </div>

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
