export type FilamentLine = {
  id: string;
  label: string;
  grams: number;
  pricePerKg: number;
  inventoryFilamentId?: string | null;
  slot?: number | null;
  type?: string | null;
  color?: string | null;
};

export type QuoteInput = {
  filaments: FilamentLine[];
  printMinutes: number;
  machineRatePerHour: number;
  markupPercent: number;
};

export type QuoteBreakdown = {
  materialCost: number;
  machineCost: number;
  subtotal: number;
  markupAmount: number;
  total: number;
  printHours: number;
};

export function printMinutesToHours(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  return minutes / 60;
}

export function materialCostForLine(line: FilamentLine): number {
  const grams = Number.isFinite(line.grams) ? Math.max(0, line.grams) : 0;
  const pricePerKg = Number.isFinite(line.pricePerKg)
    ? Math.max(0, line.pricePerKg)
    : 0;
  return (grams / 1000) * pricePerKg;
}

export function calculateQuote(input: QuoteInput): QuoteBreakdown {
  const materialCost = input.filaments.reduce(
    (sum, line) => sum + materialCostForLine(line),
    0,
  );

  const printHours = printMinutesToHours(input.printMinutes);
  const machineRate = Number.isFinite(input.machineRatePerHour)
    ? Math.max(0, input.machineRatePerHour)
    : 0;
  const machineCost = printHours * machineRate;

  const subtotal = materialCost + machineCost;
  const markupPercent = Number.isFinite(input.markupPercent)
    ? Math.max(0, input.markupPercent)
    : 0;
  const markupAmount = subtotal * (markupPercent / 100);
  const total = subtotal + markupAmount;

  return {
    materialCost,
    machineCost,
    subtotal,
    markupAmount,
    total,
    printHours,
  };
}

export function formatMoney(
  amount: number,
  currencySymbol: string,
  fractionDigits = 2,
): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return `${currencySymbol}${value.toFixed(fractionDigits)}`;
}

export function createFilamentId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `f-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyFilament(
  pricePerKg: number,
  label = "Filament 1",
): FilamentLine {
  return {
    id: createFilamentId(),
    label,
    grams: 0,
    pricePerKg,
    inventoryFilamentId: null,
    slot: null,
    type: null,
    color: null,
  };
}
