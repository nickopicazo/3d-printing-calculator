import {
  emptyPrint,
  findDuplicatePrint,
  nextPrintName,
  normalizeSourceName,
  printContentFingerprint,
  type PrintDraft,
} from "~/lib/calculator-types";
import { createId, minutesToHoursMinutes } from "~/lib/pricing";
import type { AppSettings } from "~/lib/settings";
import {
  extractFromGcodeUpload,
  isSupportedGcodeImport,
} from "~/lib/gcode/loadFromArchive";

/** Apply a single G-code / 3MF file onto a print draft (materials, time, plates). */
export async function applyFileToPrint(
  file: File,
  base: PrintDraft,
  defaultFilamentPricePerKg: number,
): Promise<PrintDraft> {
  if (!isSupportedGcodeImport(file)) {
    throw new Error(`Unsupported file: ${file.name}`);
  }
  const result = await extractFromGcodeUpload(file);
  const hm = minutesToHoursMinutes(result.totalMinutes ?? 0);
  const plateMeta = result.metadataSnapshot.plates[0]?.metadata ?? {};
  const printer =
    (typeof plateMeta.printer_model === "string" &&
    plateMeta.printer_model.trim()
      ? plateMeta.printer_model.trim()
      : null) ??
    (typeof plateMeta.printer_model_id === "string" &&
    plateMeta.printer_model_id.trim()
      ? plateMeta.printer_model_id.trim()
      : null) ??
    "";
  const price = defaultFilamentPricePerKg;
  // Keep slicer/3MF metadata as-is; do not auto-bind inventory.
  const materials =
    result.filaments.length > 0
      ? result.filaments.map((f) => ({
          id: createId("mat"),
          label: f.type || f.label || "Filament",
          quantity: f.grams,
          unit: "g" as const,
          pricePerUnit: price,
          inventoryMaterialId: null,
          slot: f.slot ?? null,
          type: f.type ?? null,
          color: f.color ?? null,
        }))
      : base.materials;

  return {
    ...base,
    technology: "fdm",
    sourceName: result.sourceName,
    printerName: printer || base.printerName,
    printHours: hm.hours,
    printMinutesPart: hm.minutes,
    materials,
    plates: result.plates,
    metadataSnapshot: result.metadataSnapshot as unknown as Record<
      string,
      unknown
    >,
  };
}

export type ImportGcodeFilesResult = {
  prints: PrintDraft[];
  /** Print to focus after import (last new extra, or the target print). */
  activePrintId: string;
  warning: string | null;
  /** When true, no prints were changed (e.g. single duplicate skip). */
  unchanged: boolean;
};

/**
 * Import one or more files onto `printId`. First file updates that print
 * (unless duplicate); further files become new prints.
 */
export async function importGcodeFiles(args: {
  printId: string;
  files: File[];
  prints: PrintDraft[];
  settings: AppSettings;
}): Promise<ImportGcodeFilesResult> {
  const { printId, files, prints, settings } = args;
  if (files.length === 0) {
    return {
      prints,
      activePrintId: printId,
      warning: null,
      unchanged: true,
    };
  }

  const current = prints.find((p) => p.id === printId);
  if (!current) throw new Error("Print not found.");

  const skipped: string[] = [];
  const acceptedFingerprints = new Set<string>();
  const acceptedSources = new Set<string>();

  function markAccepted(print: PrintDraft) {
    acceptedFingerprints.add(printContentFingerprint(print));
    const src = normalizeSourceName(print.sourceName);
    if (src) acceptedSources.add(src);
  }

  function isDuplicateOf(
    candidate: PrintDraft,
    list: PrintDraft[],
    excludeId?: string,
  ): PrintDraft | "batch" | null {
    const src = normalizeSourceName(candidate.sourceName);
    if (src && acceptedSources.has(src)) return "batch";
    if (acceptedFingerprints.has(printContentFingerprint(candidate))) {
      return "batch";
    }
    return findDuplicatePrint(list, candidate, excludeId);
  }

  function skipLabel(fileName: string, dup: PrintDraft | "batch") {
    if (dup === "batch") {
      return `${fileName} (already in this upload)`;
    }
    const label = dup.name.trim() || "another print";
    return `${fileName} → ${label}`;
  }

  const [first, ...rest] = files;
  let updatedCurrent: PrintDraft | null = null;
  let workingPrints = prints;
  let focusId = printId;

  if (first) {
    const imported = await applyFileToPrint(
      first,
      current,
      settings.defaultFilamentPricePerKg,
    );
    const dup = isDuplicateOf(imported, workingPrints, printId);
    if (dup) {
      skipped.push(skipLabel(first.name, dup));
      if (files.length === 1 && dup !== "batch") {
        return {
          prints,
          activePrintId: dup.id,
          warning: `Already imported as “${dup.name.trim() || "another print"}”. Skipped.`,
          unchanged: true,
        };
      }
    } else {
      updatedCurrent = imported;
      markAccepted(imported);
      workingPrints = workingPrints.map((p) =>
        p.id === printId ? imported : p,
      );
    }
  }

  const extras: PrintDraft[] = [];
  let nameSeed = workingPrints;
  for (const file of rest) {
    const id = createId("print");
    const name = nextPrintName(nameSeed);
    const blank = {
      ...emptyPrint(settings, "fdm", name),
      id,
      name,
    };
    const imported = await applyFileToPrint(
      file,
      blank,
      settings.defaultFilamentPricePerKg,
    );
    const dup = isDuplicateOf(imported, workingPrints);
    if (dup) {
      skipped.push(skipLabel(file.name, dup));
      continue;
    }
    extras.push(imported);
    markAccepted(imported);
    nameSeed = [...nameSeed, imported];
    workingPrints = [...workingPrints, imported];
  }

  const nextPrints =
    updatedCurrent || extras.length > 0
      ? [
          ...(updatedCurrent
            ? prints.map((p) => (p.id === printId ? updatedCurrent! : p))
            : prints),
          ...extras,
        ]
      : prints;

  if (extras.length > 0) {
    focusId = extras.at(-1)!.id;
  }

  const importedCount = (updatedCurrent ? 1 : 0) + extras.length;
  let warning: string | null = null;
  if (skipped.length > 0 && importedCount > 0) {
    warning = `Imported ${importedCount}. Skipped ${skipped.length} duplicate${skipped.length === 1 ? "" : "s"}: ${skipped.join("; ")}.`;
  } else if (skipped.length > 0) {
    warning = `Skipped ${skipped.length} duplicate${skipped.length === 1 ? "" : "s"}: ${skipped.join("; ")}.`;
  } else if (files.length > 1) {
    warning = `Imported ${importedCount} file${importedCount === 1 ? "" : "s"} as ${importedCount} print${importedCount === 1 ? "" : "s"}.`;
  }

  return {
    prints: nextPrints,
    activePrintId: focusId,
    warning,
    unchanged: importedCount === 0,
  };
}
