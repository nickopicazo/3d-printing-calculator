import type { PlateImport } from "~/lib/gcode/loadFromArchive";
import {
  createEmptyMaterial,
  createId,
  type AddonLine,
  type MaterialLine,
  type Technology,
} from "~/lib/pricing";
import type { AppSettings } from "~/lib/settings";

export type CustomerDraft = {
  id: string | null;
  name: string;
  email: string;
  phone: string;
  address: string;
};

export type PrintDraft = {
  id: string;
  name: string;
  technology: Technology;
  printerName: string;
  sourceName: string | null;
  printHours: number;
  printMinutesPart: number;
  laborMinutes: number;
  addons: AddonLine[];
  materials: MaterialLine[];
  plates: PlateImport[];
  metadataSnapshot: Record<string, unknown> | null;
};

export type { AddonLine };

export type ProjectDraft = {
  id: string | null;
  name: string;
  customer: CustomerDraft;
  prints: PrintDraft[];
};

export function emptyCustomer(): CustomerDraft {
  return {
    id: null,
    name: "",
    email: "",
    phone: "",
    address: "",
  };
}

export function emptyPrint(
  settings: AppSettings,
  technology: Technology = "fdm",
  name = "Print 1",
  ids?: { printId?: string; materialId?: string },
): PrintDraft {
  const price =
    technology === "sla"
      ? settings.defaultResinPricePerLitre
      : settings.defaultFilamentPricePerKg;
  return {
    id: ids?.printId ?? createId("print"),
    name,
    technology,
    printerName: "",
    sourceName: null,
    printHours: 0,
    printMinutesPart: 0,
    laborMinutes: 0,
    addons: [],
    materials: [
      createEmptyMaterial(technology, price, undefined, ids?.materialId),
    ],
    plates: [],
    metadataSnapshot: null,
  };
}

/** Next default label like Print 2, Print 3, … based on existing prints. */
export function nextPrintName(prints: { name: string }[]): string {
  let max = prints.length;
  for (const print of prints) {
    const match = /^Print\s+(\d+)$/i.exec(print.name.trim());
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `Print ${max + 1}`;
}

/** True when the name is still an auto-generated Print N label (or empty). */
export function isDefaultPrintName(name: string): boolean {
  return !name.trim() || /^Print\s+\d+$/i.test(name.trim());
}

export function emptyProject(settings: AppSettings): ProjectDraft {
  return {
    id: null,
    name: "",
    customer: emptyCustomer(),
    // Stable IDs so SSR HTML matches the client's first paint (avoids React #418).
    prints: [
      emptyPrint(settings, "fdm", "Print 1", {
        printId: "draft-print",
        materialId: "draft-mat",
      }),
    ],
  };
}

export function printDraftMinutes(print: PrintDraft): number {
  return Math.max(0, print.printHours) * 60 + Math.max(0, print.printMinutesPart);
}

/** Basename, lowercased — used to spot the same file uploaded again. */
export function normalizeSourceName(
  name: string | null | undefined,
): string | null {
  if (!name?.trim()) return null;
  const base = name.trim().replace(/^.*[/\\]/, "").toLowerCase();
  return base || null;
}

/**
 * Content signature from importable fields (time, printer, materials, plates).
 * Ignores print display name and costs the user may have edited.
 */
export function printContentFingerprint(
  print: Pick<
    PrintDraft,
    "printHours" | "printMinutesPart" | "printerName" | "materials" | "plates"
  >,
): string {
  const minutes = printDraftMinutes(print as PrintDraft);
  const materials = [...print.materials]
    .map(
      (m) =>
        `${m.slot ?? ""}|${(m.type ?? "").trim().toLowerCase()}|${m.quantity}|${m.unit}`,
    )
    .sort()
    .join(";");
  const plates = [...print.plates]
    .map((p) => `${p.plateIndex}:${p.totalMinutes ?? ""}`)
    .sort()
    .join(";");
  return [
    minutes,
    print.printerName.trim().toLowerCase(),
    materials,
    plates,
  ].join("|");
}

function hasImportSignal(print: PrintDraft): boolean {
  return Boolean(
    normalizeSourceName(print.sourceName) ||
      print.plates.length > 0 ||
      printDraftMinutes(print) > 0 ||
      print.materials.some((m) => m.quantity > 0),
  );
}

/**
 * Find an existing print that looks like the same upload (same filename and/or
 * same extracted content). Pass `excludeId` to allow re-import onto that print.
 */
export function findDuplicatePrint(
  prints: PrintDraft[],
  candidate: PrintDraft,
  excludeId?: string,
): PrintDraft | null {
  if (!hasImportSignal(candidate)) return null;

  const candSource = normalizeSourceName(candidate.sourceName);
  const candFp = printContentFingerprint(candidate);

  for (const print of prints) {
    if (excludeId && print.id === excludeId) continue;
    if (!hasImportSignal(print)) continue;

    const existingSource = normalizeSourceName(print.sourceName);
    if (candSource && existingSource && candSource === existingSource) {
      return print;
    }
    if (printContentFingerprint(print) === candFp) {
      return print;
    }
  }
  return null;
}

export type InventoryMaterial = {
  id: string;
  name: string;
  kind: string;
  type: string | null;
  color: string | null;
  pricePerUnit: number;
};

export type SavedCustomer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
};

export type SavedProject = {
  id: string;
  name: string;
  customerId: string | null;
};

export function dataUrlToBuffer(dataUrl: string): Buffer | null {
  const match = /^data:image\/\w+;base64,(.+)$/.exec(dataUrl);
  if (!match?.[1]) return null;
  return Buffer.from(match[1], "base64");
}
