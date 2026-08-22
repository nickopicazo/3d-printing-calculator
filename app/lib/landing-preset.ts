import {
  createEmptyMaterial,
  createId,
  type Technology,
} from "~/lib/pricing";
import {
  emptyCustomer,
  emptyProject,
  type PrintDraft,
  type ProjectDraft,
} from "~/lib/calculator-types";
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  type AppSettings,
} from "~/lib/settings";

/** Partial shop + print defaults applied when opening a landing, embed, or share seed. */
export type LandingPreset = {
  settings?: Partial<AppSettings>;
  technology?: Technology;
  printerName?: string;
  materialType?: string;
  materialLabel?: string;
  /** Grams (FDM) or ml (SLA) sample quantity */
  quantity?: number;
  /** Sample print duration */
  printHours?: number;
  printMinutesPart?: number;
  laborMinutes?: number;
  postProcessMinutes?: number;
  projectName?: string;
  printName?: string;
};

export type AppliedLanding = {
  settings: AppSettings;
  project: ProjectDraft;
};

/**
 * Build settings + a single-print project from a landing preset.
 * Uses stable draft IDs so SSR/client first paint stays aligned.
 */
export function applyLandingPreset(
  preset: LandingPreset | null | undefined,
): AppliedLanding {
  const settings = normalizeSettings({
    ...DEFAULT_SETTINGS,
    ...(preset?.settings ?? {}),
  });

  const technology = preset?.technology ?? "fdm";
  const price =
    technology === "sla"
      ? settings.defaultResinPricePerLitre
      : settings.defaultFilamentPricePerKg;

  const material = createEmptyMaterial(
    technology,
    price,
    preset?.materialLabel,
    "draft-mat",
  );
  if (preset?.materialType) material.type = preset.materialType;
  if (preset?.quantity != null && Number.isFinite(preset.quantity)) {
    material.quantity = Math.max(0, preset.quantity);
  }

  const print: PrintDraft = {
    id: "draft-print",
    name: preset?.printName ?? "Print 1",
    technology,
    printerName: preset?.printerName ?? "",
    sourceName: null,
    printHours: Math.max(0, preset?.printHours ?? 0),
    printMinutesPart: Math.max(0, preset?.printMinutesPart ?? 0),
    laborMinutes: Math.max(0, preset?.laborMinutes ?? 0),
    postProcessMinutes: Math.max(0, preset?.postProcessMinutes ?? 0),
    addons: [],
    materials: [material],
    plates: [],
    metadataSnapshot: null,
  };

  const project: ProjectDraft = {
    id: null,
    name: preset?.projectName ?? "",
    customer: emptyCustomer(),
    prints: [print],
  };

  return { settings, project };
}

/** Clone a shared payload into a fresh editable draft (new material/print ids kept stable for SSR if provided). */
export function projectFromSharePayload(payload: {
  settings: Partial<AppSettings>;
  project: ProjectDraft;
}): AppliedLanding {
  const settings = normalizeSettings(payload.settings);
  const project = payload.project;
  return {
    settings,
    project: {
      ...project,
      id: null,
      customer: project.customer ?? emptyCustomer(),
      prints:
        project.prints?.length > 0
          ? project.prints.map((p) => ({
              ...p,
              postProcessMinutes: p.postProcessMinutes ?? 0,
              addons: p.addons ?? [],
              materials: p.materials ?? [],
              plates: (p.plates ?? []).map((plate) => ({
                ...plate,
                imagePath: null,
              })),
            }))
          : emptyProject(settings).prints,
    },
  };
}

export function createSharePayload(
  settings: AppSettings,
  project: ProjectDraft,
): { settings: AppSettings; project: ProjectDraft } {
  return {
    settings: normalizeSettings(settings),
    project: {
      ...project,
      id: null,
      prints: project.prints.map((p) => ({
        ...p,
        id: p.id || createId("print"),
        plates: p.plates.map((plate) => ({
          ...plate,
          imagePath: null,
        })),
        metadataSnapshot: null,
      })),
    },
  };
}
