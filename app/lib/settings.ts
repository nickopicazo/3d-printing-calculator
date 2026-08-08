export type ServiceFeeMode = "percent" | "fixed";

export type AppSettings = {
  currencyCode: string;
  /** Derived from currencyCode via Intl; kept for display convenience. */
  currencySymbol: string;
  machineRatePerHour: number;
  /** percent = % of landed+failure; fixed = flat amount once per project */
  serviceFeeMode: ServiceFeeMode;
  serviceFeeValue: number;
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

/** Resolve a display symbol (e.g. ₱, $) from an ISO 4217 currency code. */
export function currencySymbolForCode(code: string): string {
  const currency = (code || "PHP").trim().toUpperCase().slice(0, 3) || "PHP";
  try {
    const parts = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}

const PRIORITY_CURRENCIES = [
  "PHP",
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CNY",
  "AUD",
  "CAD",
  "SGD",
  "HKD",
  "KRW",
  "INR",
  "AED",
  "CHF",
  "NZD",
];

export type CurrencyOption = {
  code: string;
  symbol: string;
  name: string;
  label: string;
};

let cachedCurrencies: CurrencyOption[] | null = null;

/** All ISO currencies supported by the runtime, with symbol + localized name. */
export function listCurrencies(): CurrencyOption[] {
  if (cachedCurrencies) return cachedCurrencies;

  const codes =
    typeof Intl !== "undefined" && "supportedValuesOf" in Intl
      ? (Intl.supportedValuesOf("currency") as string[])
      : [...PRIORITY_CURRENCIES];

  const displayNames =
    typeof Intl !== "undefined" && "DisplayNames" in Intl
      ? new Intl.DisplayNames(undefined, { type: "currency" })
      : null;

  const priority = new Map(PRIORITY_CURRENCIES.map((c, i) => [c, i]));

  cachedCurrencies = codes
    .map((code) => {
      const symbol = currencySymbolForCode(code);
      const name = displayNames?.of(code) ?? code;
      return {
        code,
        symbol,
        name,
        label: `${code} · ${symbol} · ${name}`,
      };
    })
    .sort((a, b) => {
      const pa = priority.get(a.code);
      const pb = priority.get(b.code);
      if (pa != null && pb != null) return pa - pb;
      if (pa != null) return -1;
      if (pb != null) return 1;
      return a.code.localeCompare(b.code);
    });

  return cachedCurrencies;
}

export const DEFAULT_SETTINGS: AppSettings = {
  currencyCode: "PHP",
  currencySymbol: currencySymbolForCode("PHP"),
  machineRatePerHour: 0,
  serviceFeeMode: "percent",
  serviceFeeValue: 0,
  vatRate: 0,
  laborRatePerHour: 0,
  powerWatts: 0,
  electricityPerKwh: 0,
  failurePercent: 0,
  printerPurchasePrice: 0,
  printerLifespanHours: 0,
  slaConsumablesPerPrint: 0,
  slaSupportWastePercent: 0,
  defaultFilamentPricePerKg: 650,
  defaultResinPricePerLitre: 2500,
};

/** Bump when defaults change so stale localStorage cannot revive old rates. */
const STORAGE_KEY = "printcost:settings:v4";

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
    markupPercent?: number;
  };

  const legacyMarkup =
    legacy.markupPercent != null &&
    legacy.serviceFeeValue == null &&
    Number.isFinite(legacy.markupPercent)
      ? Number(legacy.markupPercent)
      : null;

  const modeRaw = String(merged.serviceFeeMode ?? "percent").toLowerCase();
  const serviceFeeMode: ServiceFeeMode =
    modeRaw === "fixed" ? "fixed" : "percent";

  return {
    currencyCode: (merged.currencyCode || DEFAULT_SETTINGS.currencyCode)
      .trim()
      .toUpperCase()
      .slice(0, 8),
    currencySymbol: currencySymbolForCode(
      (merged.currencyCode || DEFAULT_SETTINGS.currencyCode)
        .trim()
        .toUpperCase()
        .slice(0, 8),
    ),
    machineRatePerHour: num(
      merged.machineRatePerHour,
      DEFAULT_SETTINGS.machineRatePerHour,
    ),
    serviceFeeMode,
    serviceFeeValue: num(
      legacyMarkup ?? merged.serviceFeeValue,
      DEFAULT_SETTINGS.serviceFeeValue,
    ),
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
