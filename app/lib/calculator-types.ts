import type { PlateImport } from "~/lib/gcode/loadFromArchive";
import {
  createEmptyMaterial,
  createId,
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
  hardwareCost: number;
  packagingCost: number;
  materials: MaterialLine[];
  plates: PlateImport[];
  metadataSnapshot: Record<string, unknown> | null;
};

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
): PrintDraft {
  const price =
    technology === "sla"
      ? settings.defaultResinPricePerLitre
      : settings.defaultFilamentPricePerKg;
  return {
    id: createId("print"),
    name: "Print 1",
    technology,
    printerName: "",
    sourceName: null,
    printHours: 0,
    printMinutesPart: 0,
    laborMinutes: 0,
    hardwareCost: 0,
    packagingCost: 0,
    materials: [createEmptyMaterial(technology, price)],
    plates: [],
    metadataSnapshot: null,
  };
}

export function emptyProject(settings: AppSettings): ProjectDraft {
  return {
    id: null,
    name: "Untitled project",
    customer: emptyCustomer(),
    prints: [emptyPrint(settings)],
  };
}

export function printDraftMinutes(print: PrintDraft): number {
  return Math.max(0, print.printHours) * 60 + Math.max(0, print.printMinutesPart);
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
