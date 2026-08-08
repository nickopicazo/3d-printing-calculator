export type AppSettings = {
  currencyCode: string;
  currencySymbol: string;
  machineRatePerHour: number;
  markupPercent: number;
  defaultFilamentPricePerKg: number;
};

export const DEFAULT_SETTINGS: AppSettings = {
  currencyCode: "PHP",
  currencySymbol: "₱",
  machineRatePerHour: 50,
  markupPercent: 20,
  defaultFilamentPricePerKg: 650,
};

const STORAGE_KEY = "3d-cost-estimator:settings";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function normalizeSettings(
  partial: Partial<AppSettings> | null | undefined,
): AppSettings {
  const merged = { ...DEFAULT_SETTINGS, ...(partial ?? {}) };

  return {
    currencyCode: (merged.currencyCode || DEFAULT_SETTINGS.currencyCode)
      .trim()
      .toUpperCase()
      .slice(0, 8),
    currencySymbol: (merged.currencySymbol || DEFAULT_SETTINGS.currencySymbol)
      .trim()
      .slice(0, 4),
    machineRatePerHour: isFiniteNumber(merged.machineRatePerHour)
      ? Math.max(0, merged.machineRatePerHour)
      : DEFAULT_SETTINGS.machineRatePerHour,
    markupPercent: isFiniteNumber(merged.markupPercent)
      ? Math.max(0, merged.markupPercent)
      : DEFAULT_SETTINGS.markupPercent,
    defaultFilamentPricePerKg: isFiniteNumber(merged.defaultFilamentPricePerKg)
      ? Math.max(0, merged.defaultFilamentPricePerKg)
      : DEFAULT_SETTINGS.defaultFilamentPricePerKg,
  };
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
