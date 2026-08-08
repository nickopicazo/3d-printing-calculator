import JSZip from "jszip";
import {
  parseBambuGcodeHeader,
  type ParsedBambuGcode,
} from "./parseBambuGcode";

const HEADER_BYTES = 64 * 1024;

export type GcodeImportResult = ParsedBambuGcode & {
  sourceName: string;
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
 *
 * Archives: prefer Metadata/plate_1.gcode header (exact slicer values).
 * If that entry is missing, fall back to Metadata/slice_info.config.
 */
export async function extractFromGcodeUpload(
  file: File,
): Promise<GcodeImportResult> {
  if (isStandaloneGcode(file)) {
    const headerText = await file.slice(0, HEADER_BYTES).text();
    const parsed = parseBambuGcodeHeader(headerText, file.name);
    return { ...parsed, sourceName: file.name };
  }

  if (!isGcodeArchive(file)) {
    throw new Error(
      "Unsupported file. Upload a .gcode.3mf, .3mf, .zip, or .gcode file.",
    );
  }

  const zip = await JSZip.loadAsync(await file.arrayBuffer());

  // Prefer slice_info.config when present — same grams/time, tiny file.
  // plate_*.gcode headers are authoritative but often tens of MB to inflate.
  const sliceInfoPath = findSliceInfoPath(zip);
  if (sliceInfoPath) {
    const entry = zip.file(sliceInfoPath);
    if (entry) {
      const xml = await entry.async("string");
      const parsed = parseSliceInfoConfig(xml, sliceInfoPath);
      if (parsed.filaments.length > 0 || parsed.totalMinutes != null) {
        return { ...parsed, sourceName: `${file.name} → ${sliceInfoPath}` };
      }
    }
  }

  const platePath = findPlateGcodePath(zip);
  if (platePath) {
    const entry = zip.file(platePath);
    if (entry) {
      const bytes = await entry.async("uint8array");
      const slice = bytes.subarray(0, Math.min(bytes.length, HEADER_BYTES));
      const headerText = new TextDecoder("utf-8", { fatal: false }).decode(slice);
      const parsed = parseBambuGcodeHeader(headerText, platePath);
      return { ...parsed, sourceName: `${file.name} → ${platePath}` };
    }
  }

  throw new Error(
    "No Metadata/plate_*.gcode or slice_info.config found. Export a sliced .gcode.3mf from Bambu Studio.",
  );
}

function findPlateGcodePath(zip: JSZip): string | null {
  const names = Object.keys(zip.files).filter((name) => !zip.files[name]!.dir);

  const normalized = names.map((name) => ({
    name,
    lower: name.replace(/\\/g, "/").toLowerCase(),
  }));

  const plate1 = normalized.find((n) =>
    /(^|\/)metadata\/plate_1\.gcode$/.test(n.lower),
  );
  if (plate1) return plate1.name;

  const anyPlate = normalized
    .filter((n) => /(^|\/)metadata\/plate_\d+\.gcode$/.test(n.lower))
    .sort((a, b) =>
      a.lower.localeCompare(b.lower, undefined, { numeric: true }),
    );

  return anyPlate[0]?.name ?? null;
}

function findSliceInfoPath(zip: JSZip): string | null {
  const names = Object.keys(zip.files).filter((name) => !zip.files[name]!.dir);
  const hit = names.find((name) =>
    /(^|\/)metadata\/slice_info\.config$/i.test(name.replace(/\\/g, "/")),
  );
  return hit ?? null;
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

  const filamentTagRe =
    /<filament\b([^>]*)\/?>/gi;
  const filaments: ParsedBambuGcode["filaments"] = [];

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
      grams: Math.round(usedG * 100) / 100,
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

function attr(attrs: string, name: string): string {
  const re = new RegExp(`${name}="([^"]*)"`, "i");
  return attrs.match(re)?.[1] ?? "";
}
