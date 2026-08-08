export type ParsedFilament = {
  slot: number;
  grams: number;
  label: string;
  type: string | null;
  color: string | null;
};

export type ParsedBambuGcode = {
  filaments: ParsedFilament[];
  totalMinutes: number | null;
  sourcePlate: string | null;
  /** Friendly model name from `; printer_model = …` */
  printerModel: string | null;
  warnings: string[];
};

const HEADER_WEIGHT_RE =
  /;\s*total filament weight\s*\[g\]\s*:\s*([0-9.,\s]+)/i;
const HEADER_SLOTS_RE = /;\s*filament\s*:\s*([0-9,\s]+)/i;
const TOTAL_TIME_RE =
  /total estimated time\s*:\s*((?:\d+\s*h)?\s*(?:\d+\s*m)?\s*(?:\d+\s*s)?)/i;
const MODEL_TIME_RE =
  /model printing time\s*:\s*((?:\d+\s*h)?\s*(?:\d+\s*m)?\s*(?:\d+\s*s)?)/i;
const FILAMENT_TYPE_RE = /;\s*filament_type\s*=\s*(.+)$/im;
const FILAMENT_COLOUR_RE = /;\s*filament_colour\s*=\s*(.+)$/im;
const FILAMENT_SETTINGS_RE = /;\s*filament_settings_id\s*=\s*(.+)$/im;
const PRINTER_MODEL_RE = /;\s*printer_model\s*=\s*(.+)$/im;

/**
 * Parse Bambu Studio / OrcaSlicer G-code header for exact quote inputs.
 * Only the header + early config comments are needed (first ~64KB).
 */
export function parseBambuGcodeHeader(
  text: string,
  sourcePlate: string | null = null,
): ParsedBambuGcode {
  const warnings: string[] = [];
  const headerEnd = text.indexOf("HEADER_BLOCK_END");
  const header =
    headerEnd >= 0 ? text.slice(0, headerEnd + "HEADER_BLOCK_END".length) : text.slice(0, 8192);
  // Config block may follow immediately; keep some more for type/colour
  const configSlice = text.slice(0, Math.min(text.length, 256 * 1024));

  const weightMatch = header.match(HEADER_WEIGHT_RE);
  const weights = weightMatch
    ? parseNumberList(weightMatch[1]!)
    : ([] as number[]);

  const slotsMatch = header.match(HEADER_SLOTS_RE);
  const slots = slotsMatch ? parseIntList(slotsMatch[1]!) : [];

  const types = parseSemicolonList(configSlice.match(FILAMENT_TYPE_RE)?.[1]);
  const colours = parseSemicolonList(configSlice.match(FILAMENT_COLOUR_RE)?.[1]);
  const settingsIds = parseQuotedOrSemicolonList(
    configSlice.match(FILAMENT_SETTINGS_RE)?.[1],
  );
  const printerModelRaw = configSlice.match(PRINTER_MODEL_RE)?.[1]?.trim() ?? "";
  const printerModel = printerModelRaw
    ? printerModelRaw.replace(/^"|"$/g, "").trim() || null
    : null;

  let totalMinutes: number | null = null;
  const totalTimeMatch = header.match(TOTAL_TIME_RE);
  if (totalTimeMatch?.[1]) {
    totalMinutes = durationToMinutes(totalTimeMatch[1]);
  }
  if (totalMinutes == null) {
    const modelTimeMatch = header.match(MODEL_TIME_RE);
    if (modelTimeMatch?.[1]) {
      totalMinutes = durationToMinutes(modelTimeMatch[1]);
      warnings.push("Used model printing time (total estimated time not found).");
    }
  }
  if (totalMinutes == null) {
    warnings.push("Could not read print time from G-code header.");
  }

  const filaments: ParsedBambuGcode["filaments"] = [];

  if (weights.length === 0) {
    warnings.push("Could not read filament weight from G-code header.");
  } else if (slots.length > 0 && slots.length === weights.length) {
    for (let i = 0; i < weights.length; i++) {
      const slot = slots[i]!;
      const type = types[slot - 1] ?? null;
      const color = colours[slot - 1] ?? null;
      const setting = settingsIds[slot - 1] ?? null;
      filaments.push({
        slot,
        grams: round2(weights[i]!),
        label: buildLabel(slot, type, setting),
        type,
        color,
      });
    }
  } else {
    if (slots.length > 0 && slots.length !== weights.length) {
      warnings.push(
        "Filament slot list length did not match weight list; labeled by order.",
      );
    }
    for (let i = 0; i < weights.length; i++) {
      const slot = slots[i] ?? i + 1;
      const type = types[slot - 1] ?? null;
      const setting = settingsIds[slot - 1] ?? null;
      filaments.push({
        slot,
        grams: round2(weights[i]!),
        label: buildLabel(slot, type, setting),
        type,
        color: colours[slot - 1] ?? null,
      });
    }
  }

  return {
    filaments,
    totalMinutes,
    sourcePlate,
    printerModel,
    warnings,
  };
}

function buildLabel(
  slot: number,
  type: string | null,
  setting: string | null,
): string {
  if (type && setting) return `Filament ${slot} · ${type}`;
  if (type) return `Filament ${slot} · ${type}`;
  return `Filament ${slot}`;
}

function parseNumberList(raw: string): number[] {
  return raw
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isFinite(n) && n >= 0);
}

function parseIntList(raw: string): number[] {
  return raw
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function parseSemicolonList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(";")
    .map((part) => part.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}

function parseQuotedOrSemicolonList(raw: string | undefined): string[] {
  if (!raw) return [];
  const quoted = [...raw.matchAll(/"([^"]*)"/g)].map((m) => m[1]!.trim());
  if (quoted.length > 0) return quoted.filter(Boolean);
  return parseSemicolonList(raw);
}

function durationToMinutes(chunk: string): number | null {
  const cleaned = chunk.trim().toLowerCase();
  if (!cleaned) return null;
  const hours = Number(cleaned.match(/(\d+)\s*h/)?.[1] ?? 0);
  const minutes = Number(cleaned.match(/(\d+)\s*m/)?.[1] ?? 0);
  const seconds = Number(cleaned.match(/(\d+)\s*s/)?.[1] ?? 0);
  if (hours === 0 && minutes === 0 && seconds === 0) return null;
  return hours * 60 + minutes + Math.round(seconds / 60);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
