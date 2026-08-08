import { Upload } from "lucide-react";
import { remapMaterialsForTech } from "~/components/calculator/materials-editor";
import { MaterialsEditor } from "~/components/calculator/materials-editor";
import { Button } from "~/components/ui/button";
import { Combobox } from "~/components/ui/combobox";
import { LabelWithHelp } from "~/components/ui/field-help";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type {
  InventoryMaterial,
  PrintDraft,
} from "~/lib/calculator-types";
import { PRINTER_PRESETS, type Technology } from "~/lib/pricing";
import type { AppSettings } from "~/lib/settings";

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
      <Tabs
        value={print.technology}
        onValueChange={(v) => setTech(v as Technology)}
        className="w-full"
      >
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl p-1">
          <TabsTrigger value="fdm" className="w-full rounded-lg px-3 py-2">
            Filament · FDM
          </TabsTrigger>
          <TabsTrigger value="sla" className="w-full rounded-lg px-3 py-2">
            Resin · SLA
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
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
                ? "min-w-[200px] border-[#e8c4be] focus:border-[#a33b2b] focus:shadow-[0_0_0_3px_rgba(163,59,43,0.15)]"
                : "min-w-[200px]"
            }
          />
          {nameError ? (
            <p id={`part-${print.id}-error`} className="text-xs text-[#a33b2b]">
              {nameError}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 self-end">
          {loggedIn && onUploadFiles && print.technology === "fdm" ? (
            <label className="inline-flex">
              <input
                type="file"
                accept=".gcode,.3mf,.zip,.gcode.3mf,image/*"
                multiple
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  const list = e.target.files;
                  if (list && list.length > 0) {
                    onUploadFiles(Array.from(list));
                  }
                  e.target.value = "";
                }}
              />
              <Button type="button" asChild>
                <span className="inline-flex cursor-pointer items-center gap-2">
                  <Upload className="size-4" />
                  {uploading ? "Importing…" : "Upload 3MF / G-code"}
                </span>
              </Button>
            </label>
          ) : null}
          {canRemove && onRemove ? (
            <Button type="button" variant="destructive" onClick={onRemove}>
              Remove Print
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Printer</Label>
          <Combobox
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
        onChange={(materials) => onChange({ ...print, materials })}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
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
        <div className="space-y-1.5">
          <LabelWithHelp
            htmlFor={`hw-${print.id}`}
            tip="Flat add-on (screws, inserts, etc.). No hourly rate."
          >
            Hardware Cost
          </LabelWithHelp>
          <Input
            id={`hw-${print.id}`}
            type="number"
            min={0}
            value={print.hardwareCost}
            onChange={(e) =>
              onChange({ ...print, hardwareCost: Number(e.target.value) || 0 })
            }
          />
        </div>
        <div className="space-y-1.5">
          <LabelWithHelp
            htmlFor={`pkg-${print.id}`}
            tip="Flat add-on for boxes, mailers, or packing. No hourly rate."
          >
            Packaging Cost
          </LabelWithHelp>
          <Input
            id={`pkg-${print.id}`}
            type="number"
            min={0}
            value={print.packagingCost}
            onChange={(e) =>
              onChange({
                ...print,
                packagingCost: Number(e.target.value) || 0,
              })
            }
          />
        </div>
      </div>

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
