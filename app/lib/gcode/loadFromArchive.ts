import JSZip from "jszip";
import {
  parseBambuGcodeHeader,
  type ParsedBambuGcode,
  type ParsedFilament,
} from "./parseBambuGcode";

const HEADER_BYTES = 64 * 1024;

export type PlateImport = {
  plateIndex: number;
  sliced: boolean;
  filaments: ParsedFilament[];
  totalMinutes: number | null;
  sourcePath: string | null;
  /** Base64 PNG data URL for preview / save; null if missing */
  imageDataUrl: string | null;
  metadata: Record<string, unknown>;
  warnings: string[];
};

export type GcodeImportResult = {
  sourceName: string;
  plates: PlateImport[];
  /** Aggregated filaments across sliced plates (merged by slot+type+color when possible) */
  filaments: ParsedFilament[];
  totalMinutes: number | null;
  warnings: string[];
  metadataSnapshot: {
    sourceName: string;
    plateCount: number;
    slicedPlateCount: number;
    plates: Array<{
      plateIndex: number;
      sliced: boolean;
      totalMinutes: number | null;
      filaments: ParsedFilament[];
      sourcePath: string | null;
      metadata: Record<string, unknown>;
    }>;
  };
};

function fileNameLower(file: File): string {
  return file.name.toLowerCase();
}

export function isGcodeArchive(file: File): boolean {
  const name = fileNameLower(file);
  return (
    name.endsWith(".gcode.3mf") ||
    name.endsWith(".3mf") ||
    name.endsWith(".zip") ||
    file.type === "application/zip" ||
    file.type === "application/x-zip-compressed"
  );
}

export function isStandaloneGcode(file: File): boolean {
  const name = fileNameLower(file);
  return name.endsWith(".gcode") && !name.endsWith(".gcode.3mf");
}

export function isSupportedGcodeImport(file: File): boolean {
  return isGcodeArchive(file) || isStandaloneGcode(file);
}

/**
 * Load filament/time data from a Bambu .gcode.3mf / .3mf / .zip or standalone .gcode.
 * Archives may contain multiple plates — each sliced plate becomes a plate entry.
 */
export async function extractFromGcodeUpload(
  file: File,
): Promise<GcodeImportResult> {
  if (isStandaloneGcode(file)) {
    const headerText = await file.slice(0, HEADER_BYTES).text();
    const parsed = parseBambuGcodeHeader(headerText, file.name);
    const plate: PlateImport = {
      plateIndex: 1,
      sliced: true,
      filaments: parsed.filaments,
      totalMinutes: parsed.totalMinutes,
      sourcePath: file.name,
      imageDataUrl: null,
      metadata: { source: "standalone-gcode" },
      warnings: parsed.warnings,
    };
    return finalizeResult(file.name, [plate]);
  }

  if (!isGcodeArchive(file)) {
    throw new Error(
      "Unsupported file. Upload a .gcode.3mf, .3mf, .zip, or .gcode file.",
    );
  }

  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const platesFromSlice = await loadPlatesFromSliceInfo(zip);
  const gcodePaths = findAllPlateGcodePaths(zip);
  const pngPaths = findAllPlatePngPaths(zip);

  const plateIndexes = new Set<number>([
    ...platesFromSlice.map((p) => p.plateIndex),
    ...gcodePaths.map((p) => p.index),
    ...pngPaths.map((p) => p.index),
  ]);

  if (plateIndexes.size === 0) {
    // Legacy fallback: single plate_1 or first gcode
    const platePath = findPlateGcodePath(zip);
    if (platePath) {
      const entry = zip.file(platePath);
      if (entry) {
        const bytes = await entry.async("uint8array");
        const slice = bytes.subarray(0, Math.min(bytes.length, HEADER_BYTES));
        const headerText = new TextDecoder("utf-8", { fatal: false }).decode(
          slice,
        );
        const parsed = parseBambuGcodeHeader(headerText, platePath);
        const imageDataUrl = await loadPlatePng(zip, 1);
        const plate: PlateImport = {
          plateIndex: 1,
          sliced: true,
          filaments: parsed.filaments,
          totalMinutes: parsed.totalMinutes,
          sourcePath: platePath,
          imageDataUrl,
          metadata: { source: "gcode-header" },
          warnings: parsed.warnings,
        };
        return finalizeResult(file.name, [plate]);
      }
    }
    throw new Error(
      "No Metadata/plate_*.gcode or slice_info.config found. Export a sliced .gcode.3mf from Bambu Studio.",
    );
  }

  const plates: PlateImport[] = [];
  for (const index of [...plateIndexes].sort((a, b) => a - b)) {
    const fromSlice = platesFromSlice.find((p) => p.plateIndex === index);
    const gcode = gcodePaths.find((p) => p.index === index);
    let parsed: ParsedBambuGcode | null = fromSlice?.parsed ?? null;
    let sourcePath = fromSlice?.sourcePath ?? null;
    let metadata: Record<string, unknown> = fromSlice?.metadata ?? {};

    if ((!parsed || parsed.filaments.length === 0) && gcode) {
      const entry = zip.file(gcode.name);
      if (entry) {
        const bytes = await entry.async("uint8array");
        const slice = bytes.subarray(0, Math.min(bytes.length, HEADER_BYTES));
        const headerText = new TextDecoder("utf-8", { fatal: false }).decode(
          slice,
        );
        parsed = parseBambuGcodeHeader(headerText, gcode.name);
        sourcePath = gcode.name;
        metadata = { ...metadata, source: "gcode-header" };
      }
    }

    const sliced = Boolean(
      parsed &&
        (parsed.filaments.length > 0 || parsed.totalMinutes != null) &&
        gcode,
    );

    // Prefer slice_info when present even without matching gcode path naming
    const effectivelySliced = Boolean(
      parsed && (parsed.filaments.length > 0 || parsed.totalMinutes != null),
    );

    const imageDataUrl = await loadPlatePng(zip, index);

    plates.push({
      plateIndex: index,
      sliced: effectivelySliced || sliced,
      filaments: parsed?.filaments ?? [],
      totalMinutes: parsed?.totalMinutes ?? null,
      sourcePath,
      imageDataUrl,
      metadata,
      warnings: parsed?.warnings ?? [],
    });
  }

  const slicedPlates = plates.filter((p) => p.sliced);
  if (slicedPlates.length === 0) {
    throw new Error(
      "Found plate thumbnails but no sliced plate data. Export a sliced .gcode.3mf from Bambu Studio.",
    );
  }

  return finalizeResult(file.name, plates);
}

function finalizeResult(
  sourceName: string,
  plates: PlateImport[],
): GcodeImportResult {
  const sliced = plates.filter((p) => p.sliced);
  const filaments = aggregateFilaments(sliced.flatMap((p) => p.filaments));
  const totalMinutes = sliced.reduce((sum, p) => sum + (p.totalMinutes ?? 0), 0);
  const warnings = [
    ...plates.flatMap((p) =>
      p.warnings.map((w) => `Plate ${p.plateIndex}: ${w}`),
    ),
  ];
  if (plates.some((p) => !p.sliced)) {
    warnings.push(
      `${plates.filter((p) => !p.sliced).length} unsliced plate(s) included as thumbnails only.`,
    );
  }

  return {
    sourceName,
    plates,
    filaments,
    totalMinutes: totalMinutes > 0 ? totalMinutes : null,
    warnings,
    metadataSnapshot: {
      sourceName,
      plateCount: plates.length,
      slicedPlateCount: sliced.length,
      plates: plates.map((p) => ({
        plateIndex: p.plateIndex,
        sliced: p.sliced,
        totalMinutes: p.totalMinutes,
        filaments: p.filaments,
        sourcePath: p.sourcePath,
        metadata: p.metadata,
      })),
    },
  };
}

function aggregateFilaments(lines: ParsedFilament[]): ParsedFilament[] {
  const map = new Map<string, ParsedFilament>();
  for (const line of lines) {
    const key = `${line.slot}|${line.type ?? ""}|${line.color ?? ""}`;
    const existing = map.get(key);
    if (existing) {
      existing.grams = round2(existing.grams + line.grams);
    } else {
      map.set(key, { ...line });
    }
  }
  return [...map.values()].sort((a, b) => a.slot - b.slot);
}

async function loadPlatesFromSliceInfo(zip: JSZip): Promise<
  Array<{
    plateIndex: number;
    parsed: ParsedBambuGcode;
    sourcePath: string;
    metadata: Record<string, unknown>;
  }>
> {
  const sliceInfoPath = findSliceInfoPath(zip);
  if (!sliceInfoPath) return [];
  const entry = zip.file(sliceInfoPath);
  if (!entry) return [];
  const xml = await entry.async("string");
  return parseSliceInfoPlates(xml, sliceInfoPath);
}

/** Parse each <plate> block from slice_info.config */
export function parseSliceInfoPlates(
  xml: string,
  sourcePath: string,
): Array<{
  plateIndex: number;
  parsed: ParsedBambuGcode;
  sourcePath: string;
  metadata: Record<string, unknown>;
}> {
  const plateBlocks = [...xml.matchAll(/<plate>([\s\S]*?)<\/plate>/gi)];
  if (plateBlocks.length === 0) {
    // Whole-file fallback (legacy single scrape)
    const parsed = parseSliceInfoConfig(xml, sourcePath);
    return [
      {
        plateIndex: 1,
        parsed,
        sourcePath,
        metadata: { source: "slice_info", legacy: true },
      },
    ];
  }

  return plateBlocks.map((block, i) => {
    const body = block[1] ?? "";
    const indexMatch = body.match(
      /<metadata\s+key="index"\s+value="(\d+)"/i,
    );
    const plateIndex = indexMatch ? Number(indexMatch[1]) : i + 1;
    const parsed = parseSliceInfoConfig(`<plate>${body}</plate>`, sourcePath);
    const metaKeys = [
      "prediction",
      "weight",
      "printer_model_id",
      "nozzle_diameters",
      "support_used",
    ];
    const metadata: Record<string, unknown> = { source: "slice_info" };
    for (const key of metaKeys) {
      const m = body.match(
        new RegExp(`<metadata\\s+key="${key}"\\s+value="([^"]*)"`, "i"),
      );
      if (m?.[1] != null) metadata[key] = m[1];
    }
    return { plateIndex, parsed, sourcePath, metadata };
  });
}

/** Fallback parser for Metadata/slice_info.config (same numbers, much smaller). */
export function parseSliceInfoConfig(
  xml: string,
  sourcePlate: string | null = null,
): ParsedBambuGcode {
  const warnings: string[] = [];
  const prediction = xml.match(
    /<metadata\s+key="prediction"\s+value="(\d+(?:\.\d+)?)"/i,
  );
  const totalMinutes = prediction
    ? Math.round(Number(prediction[1]) / 60)
    : null;
  if (totalMinutes == null) {
    warnings.push("Could not read prediction time from slice_info.config.");
  }

  const filamentTagRe = /<filament\b([^>]*)\/?>/gi;
  const filaments: ParsedFilament[] = [];

  for (const match of xml.matchAll(filamentTagRe)) {
    const attrs = match[1] ?? "";
    const id = Number(attr(attrs, "id"));
    const usedG = Number(attr(attrs, "used_g"));
    const type = attr(attrs, "type");
    const color = attr(attrs, "color");
    if (!Number.isFinite(usedG) || usedG < 0) continue;
    const slot = Number.isFinite(id) && id > 0 ? id : filaments.length + 1;
    filaments.push({
      slot,
      grams: round2(usedG),
      label: type ? `Filament ${slot} · ${type}` : `Filament ${slot}`,
      type: type || null,
      color: color || null,
    });
  }

  if (filaments.length === 0) {
    warnings.push("Could not read filament usage from slice_info.config.");
  }

  return {
    filaments,
    totalMinutes,
    sourcePlate,
    warnings,
  };
}

async function loadPlatePng(
  zip: JSZip,
  plateIndex: number,
): Promise<string | null> {
  const names = Object.keys(zip.files).filter((name) => !zip.files[name]!.dir);
  const re = new RegExp(
    `(^|/)metadata/plate_${plateIndex}\\.png$`,
    "i",
  );
  const hit = names.find((name) => re.test(name.replace(/\\/g, "/")));
  if (!hit) return null;
  const entry = zip.file(hit);
  if (!entry) return null;
  const base64 = await entry.async("base64");
  return `data:image/png;base64,${base64}`;
}

function findAllPlateGcodePaths(
  zip: JSZip,
): Array<{ index: number; name: string }> {
  const names = Object.keys(zip.files).filter((name) => !zip.files[name]!.dir);
  const results: Array<{ index: number; name: string }> = [];
  for (const name of names) {
    const lower = name.replace(/\\/g, "/").toLowerCase();
    const m = lower.match(/(^|\/)metadata\/plate_(\d+)\.gcode$/);
    if (m) results.push({ index: Number(m[2]), name });
  }
  return results.sort((a, b) => a.index - b.index);
}

function findAllPlatePngPaths(
  zip: JSZip,
): Array<{ index: number; name: string }> {
  const names = Object.keys(zip.files).filter((name) => !zip.files[name]!.dir);
  const results: Array<{ index: number; name: string }> = [];
  for (const name of names) {
    const lower = name.replace(/\\/g, "/").toLowerCase();
    const m = lower.match(/(^|\/)metadata\/plate_(\d+)\.png$/);
    if (m) results.push({ index: Number(m[2]), name });
  }
  return results.sort((a, b) => a.index - b.index);
}

function findPlateGcodePath(zip: JSZip): string | null {
  const all = findAllPlateGcodePaths(zip);
  const plate1 = all.find((p) => p.index === 1);
  return plate1?.name ?? all[0]?.name ?? null;
}

function findSliceInfoPath(zip: JSZip): string | null {
  const names = Object.keys(zip.files).filter((name) => !zip.files[name]!.dir);
  const hit = names.find((name) =>
    /(^|\/)metadata\/slice_info\.config$/i.test(name.replace(/\\/g, "/")),
  );
  return hit ?? null;
}

function attr(attrs: string, name: string): string {
  const re = new RegExp(`${name}="([^"]*)"`, "i");
  return attrs.match(re)?.[1] ?? "";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
