import { Upload } from "lucide-react";
import { remapMaterialsForTech } from "~/components/calculator/materials-editor";
import { MaterialsEditor } from "~/components/calculator/materials-editor";
import { Button } from "~/components/ui/button";
import { Combobox } from "~/components/ui/combobox";
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
  onUploadFile?: (file: File) => void;
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
  onUploadFile,
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
        <div className="flex flex-wrap items-center gap-2">
          {loggedIn && onUploadFile ? (
            <label className="inline-flex">
              <input
                type="file"
                accept=".gcode,.3mf,.zip,.gcode.3mf,image/*"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadFile(f);
                  e.target.value = "";
                }}
              />
              <Button type="button" variant="secondary" size="sm" asChild>
                <span className="inline-flex cursor-pointer items-center gap-2">
                  <Upload className="size-4" />
                  {uploading ? "Importing…" : "Upload 3MF / G-code"}
                </span>
              </Button>
            </label>
          ) : null}
          {canRemove && onRemove ? (
            <Button type="button" variant="destructive" size="sm" onClick={onRemove}>
              Remove Print
            </Button>
          ) : null}
        </div>
      </div>

      <Tabs
        value={print.technology}
        onValueChange={(v) => setTech(v as Technology)}
      >
        <TabsList>
          <TabsTrigger value="fdm">Filament · FDM</TabsTrigger>
          <TabsTrigger value="sla">Resin · SLA</TabsTrigger>
        </TabsList>
      </Tabs>

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
            <Label htmlFor={`ph-${print.id}`}>Print Hours</Label>
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
          <Label htmlFor={`labor-${print.id}`}>Labor Time (Min)</Label>
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
          <Label htmlFor={`hw-${print.id}`}>Hardware Cost</Label>
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
          <Label htmlFor={`pkg-${print.id}`}>Packaging Cost</Label>
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

      {print.plates.filter((p) => p.sliced && p.imageDataUrl).length > 0 ? (
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
