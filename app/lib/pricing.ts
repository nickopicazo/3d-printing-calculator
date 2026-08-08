import type { AppSettings } from "~/lib/settings";

export type Technology = "fdm" | "sla";

export type MaterialUnit = "g" | "ml";

export type MaterialLine = {
  id: string;
  label: string;
  /** Quantity in grams (FDM) or ml (SLA) */
  quantity: number;
  unit: MaterialUnit;
  /** Price per kg (FDM) or per litre (SLA) */
  pricePerUnit: number;
  inventoryMaterialId?: string | null;
  slot?: number | null;
  type?: string | null;
  color?: string | null;
};

/** @deprecated Use MaterialLine — legacy fields for old call sites */
export type FilamentLine = {
  id: string;
  label: string;
  grams?: number;
  pricePerKg?: number;
  quantity?: number;
  unit?: MaterialUnit;
  pricePerUnit?: number;
  inventoryFilamentId?: string | null;
  inventoryMaterialId?: string | null;
  slot?: number | null;
  type?: string | null;
  color?: string | null;
};

export type PrintInput = {
  technology: Technology;
  materials: MaterialLine[];
  printMinutes: number;
  laborMinutes: number;
  hardwareCost: number;
  packagingCost: number;
  settings: AppSettings;
};

export type PrintBreakdown = {
  materialCost: number;
  electricityCost: number;
  laborCost: number;
  machineCost: number;
  hardwareCost: number;
  packagingCost: number;
  consumablesCost: number;
  landed: number;
  failureUplift: number;
  markupAmount: number;
  preVat: number;
  vatAmount: number;
  total: number;
  printHours: number;
};

export type ProjectBreakdown = PrintBreakdown & {
  printCount: number;
  prints: Array<{ id: string; name: string; breakdown: PrintBreakdown }>;
};

export function printMinutesToHours(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  return minutes / 60;
}

function clampNonNeg(value: unknown): number {
  return Number.isFinite(value as number) ? Math.max(0, value as number) : 0;
}

/** Cost for one material line. quantity/1000 × pricePerUnit (kg or L). */
export function materialCostForLine(
  line: MaterialLine,
  options?: { supportWastePercent?: number },
): number {
  let qty = clampNonNeg(line.quantity);
  const waste = clampNonNeg(options?.supportWastePercent);
  if (waste > 0 && line.unit === "ml") {
    qty = qty * (1 + waste / 100);
  }
  const price = clampNonNeg(line.pricePerUnit);
  return (qty / 1000) * price;
}

export function calculatePrint(input: PrintInput): PrintBreakdown {
  const { settings, technology } = input;
  const wastePercent =
    technology === "sla" ? settings.slaSupportWastePercent : 0;

  const materialCost = input.materials.reduce(
    (sum, line) =>
      sum + materialCostForLine(line, { supportWastePercent: wastePercent }),
    0,
  );

  const printHours = printMinutesToHours(input.printMinutes);
  const laborHours = printMinutesToHours(input.laborMinutes);

  const electricityCost =
    (clampNonNeg(settings.powerWatts) / 1000) *
    printHours *
    clampNonNeg(settings.electricityPerKwh);

  const laborCost = laborHours * clampNonNeg(settings.laborRatePerHour);
  const machineCost = printHours * clampNonNeg(settings.machineRatePerHour);
  const hardwareCost = clampNonNeg(input.hardwareCost);
  const packagingCost = clampNonNeg(input.packagingCost);
  const consumablesCost =
    technology === "sla" ? clampNonNeg(settings.slaConsumablesPerPrint) : 0;

  const landed =
    materialCost +
    electricityCost +
    laborCost +
    machineCost +
    hardwareCost +
    packagingCost +
    consumablesCost;

  const failureUplift =
    landed * (clampNonNeg(settings.failurePercent) / 100);
  const markupAmount =
    (landed + failureUplift) * (clampNonNeg(settings.markupPercent) / 100);
  const preVat = landed + failureUplift + markupAmount;
  const vatAmount = preVat * (clampNonNeg(settings.vatRate) / 100);
  const total = preVat + vatAmount;

  return {
    materialCost,
    electricityCost,
    laborCost,
    machineCost,
    hardwareCost,
    packagingCost,
    consumablesCost,
    landed,
    failureUplift,
    markupAmount,
    preVat,
    vatAmount,
    total,
    printHours,
  };
}

export function calculateProject(
  prints: Array<{ id: string; name: string; input: PrintInput }>,
): ProjectBreakdown {
  const results = prints.map((p) => ({
    id: p.id,
    name: p.name,
    breakdown: calculatePrint(p.input),
  }));

  const empty: PrintBreakdown = {
    materialCost: 0,
    electricityCost: 0,
    laborCost: 0,
    machineCost: 0,
    hardwareCost: 0,
    packagingCost: 0,
    consumablesCost: 0,
    landed: 0,
    failureUplift: 0,
    markupAmount: 0,
    preVat: 0,
    vatAmount: 0,
    total: 0,
    printHours: 0,
  };

  const rolled = results.reduce((acc, r) => {
    const b = r.breakdown;
    return {
      materialCost: acc.materialCost + b.materialCost,
      electricityCost: acc.electricityCost + b.electricityCost,
      laborCost: acc.laborCost + b.laborCost,
      machineCost: acc.machineCost + b.machineCost,
      hardwareCost: acc.hardwareCost + b.hardwareCost,
      packagingCost: acc.packagingCost + b.packagingCost,
      consumablesCost: acc.consumablesCost + b.consumablesCost,
      landed: acc.landed + b.landed,
      failureUplift: acc.failureUplift + b.failureUplift,
      markupAmount: acc.markupAmount + b.markupAmount,
      preVat: acc.preVat + b.preVat,
      vatAmount: acc.vatAmount + b.vatAmount,
      total: acc.total + b.total,
      printHours: acc.printHours + b.printHours,
    };
  }, empty);

  return {
    ...rolled,
    printCount: results.length,
    prints: results,
  };
}

export function formatMoney(
  amount: number,
  currencyCodeOrSymbol: string,
  fractionDigits = 2,
): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const token = (currencyCodeOrSymbol || "").trim();
  if (/^[A-Za-z]{3}$/.test(token)) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: token.toUpperCase(),
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(value);
    } catch {
      /* fall through to symbol prefix */
    }
  }
  return `${token}${value.toFixed(fractionDigits)}`;
}

export function createId(prefix = "id"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createFilamentId(): string {
  return createId("mat");
}

export function createEmptyMaterial(
  technology: Technology,
  pricePerUnit: number,
  label?: string,
): MaterialLine {
  const isSla = technology === "sla";
  return {
    id: createId("mat"),
    label: label ?? (isSla ? "Resin 1" : "Filament 1"),
    quantity: 0,
    unit: isSla ? "ml" : "g",
    pricePerUnit,
    inventoryMaterialId: null,
    slot: null,
    type: null,
    color: null,
  };
}

/** @deprecated Use createEmptyMaterial */
export function createEmptyFilament(
  pricePerKg: number,
  label = "Filament 1",
): MaterialLine {
  return createEmptyMaterial("fdm", pricePerKg, label);
}

/** @deprecated Use materialCostForLine */
export function materialCostForFilament(line: FilamentLine): number {
  return materialCostForLine({
    id: line.id,
    label: line.label,
    quantity: line.grams ?? line.quantity ?? 0,
    unit: "g",
    pricePerUnit: line.pricePerKg ?? line.pricePerUnit ?? 0,
    inventoryMaterialId: line.inventoryFilamentId ?? line.inventoryMaterialId,
    slot: line.slot,
    type: line.type,
    color: line.color,
  });
}

/** Legacy shim for older call sites */
export function calculateQuote(input: {
  filaments: FilamentLine[];
  printMinutes: number;
  machineRatePerHour: number;
  markupPercent: number;
}): PrintBreakdown {
  const materials: MaterialLine[] = input.filaments.map((f) => ({
    id: f.id,
    label: f.label,
    quantity: f.grams ?? f.quantity ?? 0,
    unit: "g" as const,
    pricePerUnit: f.pricePerKg ?? f.pricePerUnit ?? 0,
    inventoryMaterialId: f.inventoryFilamentId ?? f.inventoryMaterialId,
    slot: f.slot,
    type: f.type,
    color: f.color,
  }));

  return calculatePrint({
    technology: "fdm",
    materials,
    printMinutes: input.printMinutes,
    laborMinutes: 0,
    hardwareCost: 0,
    packagingCost: 0,
    settings: {
      currencyCode: "PHP",
      currencySymbol: "₱",
      machineRatePerHour: input.machineRatePerHour,
      markupPercent: input.markupPercent,
      vatRate: 0,
      laborRatePerHour: 0,
      powerWatts: 0,
      electricityPerKwh: 0,
      failurePercent: 0,
      printerPurchasePrice: 0,
      printerLifespanHours: 5000,
      slaConsumablesPerPrint: 0,
      slaSupportWastePercent: 0,
      defaultFilamentPricePerKg: 650,
      defaultResinPricePerLitre: 2500,
    },
  });
}

export const FDM_MATERIALS = [
  "PLA",
  "PETG",
  "ABS",
  "ASA",
  "TPU",
  "Nylon",
  "PC",
  "PVA",
  "HIPS",
  "Other",
] as const;

export const SLA_MATERIALS = [
  "Standard Resin",
  "Tough Resin",
  "Flexible Resin",
  "Water-Washable",
  "ABS-Like",
  "Castable",
  "Dental",
  "Other",
] as const;

export const PRINTER_PRESETS = [
  "Bambu Lab H2S",
  "Bambu Lab X1 Carbon",
  "Bambu Lab P1S",
  "Bambu Lab A1",
  "Bambu Lab A1 mini",
  "Prusa MK4",
  "Prusa Mini",
  "Creality Ender 3",
  "Creality K1",
  "Elegoo Mars 4",
  "Elegoo Saturn 4",
  "Anycubic Photon Mono",
  "Formlabs Form 3",
  "Generic FDM",
  "Generic SLA",
] as const;
