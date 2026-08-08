export type AppSettings = {
  currencyCode: string;
  currencySymbol: string;
  machineRatePerHour: number;
  markupPercent: number;
  vatRate: number;
  laborRatePerHour: number;
  powerWatts: number;
  electricityPerKwh: number;
  failurePercent: number;
  printerPurchasePrice: number;
  printerLifespanHours: number;
  /** SLA: flat consumables (IPA, gloves, etc.) per print */
  slaConsumablesPerPrint: number;
  /** SLA: % waste uplift on resin volume */
  slaSupportWastePercent: number;
  defaultFilamentPricePerKg: number;
  defaultResinPricePerLitre: number;
};

export const DEFAULT_SETTINGS: AppSettings = {
  currencyCode: "PHP",
  currencySymbol: "₱",
  machineRatePerHour: 50,
  markupPercent: 20,
  vatRate: 0,
  laborRatePerHour: 150,
  powerWatts: 200,
  electricityPerKwh: 12,
  failurePercent: 0,
  printerPurchasePrice: 0,
  printerLifespanHours: 5000,
  slaConsumablesPerPrint: 0,
  slaSupportWastePercent: 0,
  defaultFilamentPricePerKg: 650,
  defaultResinPricePerLitre: 2500,
};

const STORAGE_KEY = "3d-cost-estimator:settings";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function num(
  value: unknown,
  fallback: number,
  min = 0,
): number {
  return isFiniteNumber(value) ? Math.max(min, value) : fallback;
}

export function normalizeSettings(
  partial: Partial<AppSettings> | null | undefined,
): AppSettings {
  const merged = { ...DEFAULT_SETTINGS, ...(partial ?? {}) };
  const legacy = partial as Partial<AppSettings> & {
    defaultFilamentPricePerKg?: number;
  };

  return {
    currencyCode: (merged.currencyCode || DEFAULT_SETTINGS.currencyCode)
      .trim()
      .toUpperCase()
      .slice(0, 8),
    currencySymbol: (merged.currencySymbol || DEFAULT_SETTINGS.currencySymbol)
      .trim()
      .slice(0, 4),
    machineRatePerHour: num(
      merged.machineRatePerHour,
      DEFAULT_SETTINGS.machineRatePerHour,
    ),
    markupPercent: num(merged.markupPercent, DEFAULT_SETTINGS.markupPercent),
    vatRate: num(merged.vatRate, DEFAULT_SETTINGS.vatRate),
    laborRatePerHour: num(
      merged.laborRatePerHour,
      DEFAULT_SETTINGS.laborRatePerHour,
    ),
    powerWatts: num(merged.powerWatts, DEFAULT_SETTINGS.powerWatts),
    electricityPerKwh: num(
      merged.electricityPerKwh,
      DEFAULT_SETTINGS.electricityPerKwh,
    ),
    failurePercent: num(merged.failurePercent, DEFAULT_SETTINGS.failurePercent),
    printerPurchasePrice: num(
      merged.printerPurchasePrice,
      DEFAULT_SETTINGS.printerPurchasePrice,
    ),
    printerLifespanHours: num(
      merged.printerLifespanHours,
      DEFAULT_SETTINGS.printerLifespanHours,
      1,
    ),
    slaConsumablesPerPrint: num(
      merged.slaConsumablesPerPrint,
      DEFAULT_SETTINGS.slaConsumablesPerPrint,
    ),
    slaSupportWastePercent: num(
      merged.slaSupportWastePercent,
      DEFAULT_SETTINGS.slaSupportWastePercent,
    ),
    defaultFilamentPricePerKg: num(
      legacy.defaultFilamentPricePerKg ?? merged.defaultFilamentPricePerKg,
      DEFAULT_SETTINGS.defaultFilamentPricePerKg,
    ),
    defaultResinPricePerLitre: num(
      merged.defaultResinPricePerLitre,
      DEFAULT_SETTINGS.defaultResinPricePerLitre,
    ),
  };
}

/** Suggested machine rate from purchase price ÷ lifespan hours */
export function suggestedMachineRate(settings: AppSettings): number {
  if (settings.printerLifespanHours <= 0 || settings.printerPurchasePrice <= 0) {
    return 0;
  }
  return settings.printerPurchasePrice / settings.printerLifespanHours;
}

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return normalizeSettings(parsed);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(normalizeSettings(settings)),
  );
}
