import { eq } from "drizzle-orm";
import { Download, Plus, Printer, Save, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  useLoaderData,
  useNavigate,
  useRevalidator,
  useSearchParams,
} from "react-router";
import type { Route } from "./+types/home";
import { AdvancedSettingsPanel } from "~/components/calculator/advanced-settings";
import { CostBreakdown } from "~/components/calculator/cost-breakdown";
import { CustomerSection } from "~/components/calculator/customer-section";
import { GuestInvoicePrint } from "~/components/calculator/guest-invoice-print";
import { PrintEditor } from "~/components/calculator/print-editor";
import { Combobox } from "~/components/ui/combobox";
import { ConfirmDeleteDialog } from "~/components/ui/confirm-delete-dialog";
import { Button } from "~/components/ui/button";
import { LabelWithHelp } from "~/components/ui/field-help";
import { Input } from "~/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "~/components/ui/input-group";
import { Label } from "~/components/ui/label";
import { MoneyInput } from "~/components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { db } from "~/db/index.server";
import { customers, materials, projects } from "~/db/schema";
import {
  emptyPrint,
  emptyProject,
  findDuplicatePrint,
  nextPrintName,
  normalizeSourceName,
  printContentFingerprint,
  printDraftMinutes,
  type InventoryMaterial,
  type PrintDraft,
  type ProjectDraft,
  type SavedCustomer,
  type SavedProject,
} from "~/lib/calculator-types";
import { withParentMeta, SITE_DESCRIPTION, SITE_FAQS, SITE_TITLE } from "~/lib/seo";
import { createId, calculateProject } from "~/lib/pricing";
import { minutesToHoursMinutes } from "~/lib/pricing";
import { getSession } from "~/lib/session.server";
import {
  DEFAULT_SETTINGS,
  listCurrencies,
  loadSettings,
  normalizeSettings,
  saveSettings,
  type AppSettings,
} from "~/lib/settings";
import {
  validateCustomerEmail,
  validateProjectForSave,
  type ProjectFieldErrors,
} from "~/lib/validate-project";

export function meta({ matches }: Route.MetaArgs) {
  return withParentMeta(matches, [
    { title: SITE_TITLE },
    { name: "description", content: SITE_DESCRIPTION },
  ]);
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  const empty = {
    user: null as null | { id: string; name: string; email: string },
    inventory: [] as InventoryMaterial[],
    customers: [] as SavedCustomer[],
    projects: [] as SavedProject[],
  };

  if (!session?.user) return empty;

  try {
    const [inventory, customerRows, projectRows] = await Promise.all([
      db.select().from(materials).where(eq(materials.userId, session.user.id)),
      db.select().from(customers).where(eq(customers.userId, session.user.id)),
      db.select().from(projects).where(eq(projects.userId, session.user.id)),
    ]);

    return {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
      inventory: inventory.map((f) => ({
        id: f.id,
        name: f.name,
        kind: f.kind,
        type: f.type,
        color: f.color,
        pricePerUnit: f.pricePerUnit,
      })),
      customers: customerRows.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        address: c.address,
      })),
      projects: projectRows.map((p) => ({
        id: p.id,
        name: p.name,
        customerId: p.customerId,
      })),
    };
  } catch (error) {
    console.warn("Home loader DB failed:", error);
    return empty;
  }
}

export default function Home() {
  const data = useLoaderData<typeof loader>();
  const loggedIn = Boolean(data.user);
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [searchParams] = useSearchParams();

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [project, setProject] = useState<ProjectDraft>(() =>
    emptyProject(DEFAULT_SETTINGS),
  );
  const [customers, setCustomers] = useState(data.customers);
  const [busy, setBusy] = useState(false);
  const [uploadPrintId, setUploadPrintId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ProjectFieldErrors>({});
  const [activePrintId, setActivePrintId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const projectNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    const draft = emptyProject(loaded);
    setProject(draft);
    setActivePrintId(draft.prints[0]?.id ?? null);
  }, []);

  useEffect(() => {
    setCustomers(data.customers);
  }, [data.customers]);

  useEffect(() => {
    if (project.prints.length === 0) {
      setActivePrintId(null);
      return;
    }
    setActivePrintId((current) => {
      if (current && project.prints.some((p) => p.id === current)) {
        return current;
      }
      return project.prints[0].id;
    });
  }, [project.prints]);

  // Load existing project when ?projectId=
  useEffect(() => {
    const projectId = searchParams.get("projectId");
    const isNew = searchParams.get("new") === "1";
    if (isNew) {
      const nextSettings = loadSettings();
      setSettings(nextSettings);
      setProject(emptyProject(nextSettings));
      setActivePrintId(null);
      setMessage(null);
      setWarning(null);
      setError(null);
      setFieldErrors({});
      navigate("/", { replace: true });
      return;
    }
    if (!projectId || !loggedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/projects?id=${encodeURIComponent(projectId)}`);
        if (!res.ok) return;
        const payload = await res.json();
        if (cancelled || !payload.project) return;
        const loadedSettings = loadSettings();
        const prints: PrintDraft[] = (payload.prints ?? []).map(
          (p: {
            id: string;
            name: string;
            technology: string;
            printerName: string | null;
            sourceName: string | null;
            printMinutes: number;
            laborMinutes: number;
            addons?: Array<{
              id: string;
              name: string;
              quantity: number;
              unitCost: number;
            }>;
            materials: Array<{
              id: string;
              label: string;
              unit: string;
              quantity: number;
              pricePerUnit: number;
              inventoryMaterialId: string | null;
              slot: number | null;
              type: string | null;
              color: string | null;
            }>;
            plates: Array<{
              plateIndex: number;
              sliced: boolean;
              printMinutes: number | null;
              imagePath: string | null;
              metadata: Record<string, unknown>;
            }>;
            metadataSnapshot: Record<string, unknown>;
          }) => {
            const hm = minutesToHoursMinutes(p.printMinutes);
            return {
              id: p.id,
              name: p.name,
              technology: p.technology === "sla" ? "sla" : "fdm",
              printerName: p.printerName ?? "",
              sourceName: p.sourceName,
              printHours: hm.hours,
              printMinutesPart: hm.minutes,
              laborMinutes: p.laborMinutes,
              addons: (p.addons ?? []).map((a) => ({
                id: a.id,
                name: a.name ?? "",
                quantity: a.quantity,
                unitCost: a.unitCost,
              })),
              materials: (p.materials ?? []).map((m) => ({
                id: m.id,
                label: m.label,
                quantity: m.quantity,
                unit: m.unit === "ml" ? "ml" : "g",
                pricePerUnit: m.pricePerUnit,
                inventoryMaterialId: m.inventoryMaterialId,
                slot: m.slot,
                type: m.type,
                color: m.color,
              })),
              plates: (p.plates ?? []).map((pl) => ({
                plateIndex: pl.plateIndex,
                sliced: pl.sliced,
                filaments: [],
                totalMinutes: pl.printMinutes,
                sourcePath: null,
                imageDataUrl: pl.imagePath ? `/uploads/${pl.imagePath}` : null,
                metadata: pl.metadata ?? {},
                warnings: [],
              })),
              metadataSnapshot: p.metadataSnapshot ?? null,
            } satisfies PrintDraft;
          },
        );

        const cust = payload.project.customerId
          ? data.customers.find((c) => c.id === payload.project.customerId)
          : null;

        setProject({
          id: payload.project.id,
          name: payload.project.name,
          customer: cust
            ? {
                id: cust.id,
                name: cust.name,
                email: cust.email ?? "",
                phone: cust.phone ?? "",
                address: cust.address ?? "",
              }
            : emptyProject(loadedSettings).customer,
          prints: prints.length > 0 ? prints : [emptyPrint(loadedSettings)],
        });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, loggedIn, data.customers]);

  function updateSettings(next: AppSettings) {
    const normalized = normalizeSettings(next);
    setSettings(normalized);
    saveSettings(normalized);
  }

  const projectCalc = useMemo(() => {
    const inputs = project.prints.map((p) => ({
      id: p.id,
      name: p.name,
      input: {
        technology: p.technology,
        materials: p.materials,
        printMinutes: printDraftMinutes(p),
        laborMinutes: p.laborMinutes,
        addons: p.addons,
        settings,
      },
    }));
    return calculateProject(inputs);
  }, [project.prints, settings]);

  const showSla = project.prints.some((p) => p.technology === "sla");

  function updatePrint(id: string, next: PrintDraft) {
    setProject((prev) => ({
      ...prev,
      prints: prev.prints.map((p) => (p.id === id ? next : p)),
    }));
  }

  function addPrint() {
    const id = createId("print");
    setProject((prev) => {
      const name = nextPrintName(prev.prints);
      return {
        ...prev,
        prints: [
          ...prev.prints,
          {
            ...emptyPrint(settings, "fdm", name),
            id,
            name,
          },
        ],
      };
    });
    setActivePrintId(id);
  }

  function removePrint(id: string) {
    const nextPrints = project.prints.filter((p) => p.id !== id);
    setProject((prev) => ({
      ...prev,
      prints: nextPrints,
    }));
    if (activePrintId === id) {
      setActivePrintId(nextPrints[0]?.id ?? null);
    }
  }

  async function applyFileToPrint(
    file: File,
    base: PrintDraft,
  ): Promise<PrintDraft> {
    const { extractFromGcodeUpload, isSupportedGcodeImport } = await import(
      "~/lib/gcode/loadFromArchive"
    );
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
    const price = settings.defaultFilamentPricePerKg;
    const filamentInv = data.inventory.filter((m) => m.kind === "filament");
    const materials =
      result.filaments.length > 0
        ? result.filaments.map((f) => {
            const typeKey = (f.type || "").trim().toLowerCase();
            const matched =
              typeKey
                ? filamentInv.find(
                    (i) =>
                      (i.type ?? "").trim().toLowerCase() === typeKey ||
                      i.name.trim().toLowerCase() === typeKey,
                  ) ?? null
                : null;
            return {
              id: createId("mat"),
              label: matched?.name || f.type || f.label || "Filament",
              quantity: f.grams,
              unit: "g" as const,
              pricePerUnit: matched?.pricePerUnit ?? price,
              inventoryMaterialId: matched?.id ?? null,
              slot: f.slot ?? null,
              type: matched?.type ?? f.type ?? null,
              color: matched?.color ?? f.color ?? null,
            };
          })
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

  async function handleUploadFiles(printId: string, files: File[]) {
    if (files.length === 0) return;
    setUploadPrintId(printId);
    setError(null);
    setMessage(null);
    setWarning(null);
    try {
      const current = project.prints.find((p) => p.id === printId);
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
        prints: PrintDraft[],
        excludeId?: string,
      ): PrintDraft | "batch" | null {
        const src = normalizeSourceName(candidate.sourceName);
        if (src && acceptedSources.has(src)) return "batch";
        if (acceptedFingerprints.has(printContentFingerprint(candidate))) {
          return "batch";
        }
        return findDuplicatePrint(prints, candidate, excludeId);
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
      let workingPrints = project.prints;

      if (first) {
        const imported = await applyFileToPrint(first, current);
        const dup = isDuplicateOf(imported, workingPrints, printId);
        if (dup) {
          skipped.push(skipLabel(first.name, dup));
          if (files.length === 1 && dup !== "batch") {
            setActivePrintId(dup.id);
            setWarning(
              `Already imported as “${dup.name.trim() || "another print"}”. Skipped.`,
            );
            return;
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
        const imported = await applyFileToPrint(file, blank);
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

      if (updatedCurrent || extras.length > 0) {
        setProject((prev) => ({
          ...prev,
          prints: [
            ...(updatedCurrent
              ? prev.prints.map((p) =>
                  p.id === printId ? updatedCurrent! : p,
                )
              : prev.prints),
            ...extras,
          ],
        }));
        setActivePrintId(extras.at(-1)?.id ?? printId);
      }

      const importedCount =
        (updatedCurrent ? 1 : 0) + extras.length;
      if (skipped.length > 0 && importedCount > 0) {
        setWarning(
          `Imported ${importedCount}. Skipped ${skipped.length} duplicate${skipped.length === 1 ? "" : "s"}: ${skipped.join("; ")}.`,
        );
      } else if (skipped.length > 0) {
        setWarning(
          `Skipped ${skipped.length} duplicate${skipped.length === 1 ? "" : "s"}: ${skipped.join("; ")}.`,
        );
      } else if (files.length > 1) {
        setWarning(
          `Imported ${importedCount} file${importedCount === 1 ? "" : "s"} as ${importedCount} print${importedCount === 1 ? "" : "s"}.`,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setUploadPrintId(null);
    }
  }

  async function saveCustomer() {
    if (!loggedIn || !project.customer.name.trim()) return;
    const emailError = validateCustomerEmail(project.customer.email);
    if (emailError) {
      setFieldErrors((prev) => ({ ...prev, customerEmail: emailError }));
      setError(emailError);
      return;
    }
    setBusy(true);
    setError(null);
    setFieldErrors((prev) => ({ ...prev, customerEmail: undefined }));
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project.customer),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Could not save customer.");
      setCustomers((prev) => {
        const rest = prev.filter((c) => c.id !== payload.id);
        return [
          ...rest,
          {
            id: payload.id,
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            address: payload.address,
          },
        ];
      });
      setProject((prev) => ({
        ...prev,
        customer: { ...prev.customer, id: payload.id },
      }));
      setMessage("Customer saved.");
      setWarning(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveProject(options?: { navigate?: boolean }) {
    if (!loggedIn) {
      navigate("/login");
      return null;
    }

    const { errors, warnings } = validateProjectForSave(project);
    setFieldErrors(errors);
    if (errors.projectName || errors.printName || errors.customerEmail) {
      const first =
        errors.projectName ?? errors.printName ?? errors.customerEmail ?? null;
      setError(first);
      setMessage(null);
      setWarning(null);
      if (errors.projectName) {
        projectNameRef.current?.focus();
      } else if (errors.printName) {
        const blank = project.prints.find((p) => !p.name.trim());
        if (blank) setActivePrintId(blank.id);
      }
      return null;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/projects", {
        method: project.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: project.id,
          name: project.name.trim(),
          customerId: project.customer.id,
          customer: project.customer.name.trim()
            ? project.customer
            : undefined,
          settings,
          prints: project.prints.map((p) => ({
            id: p.id,
            name: p.name.trim(),
            technology: p.technology,
            printerName: p.printerName,
            sourceName: p.sourceName,
            printMinutes: printDraftMinutes(p),
            laborMinutes: p.laborMinutes,
            addons: p.addons,
            materials: p.materials,
            plates: p.plates
              .filter((pl) => pl.sliced)
              .map((pl) => ({
                plateIndex: pl.plateIndex,
                sliced: pl.sliced,
                printMinutes: pl.totalMinutes,
                imageDataUrl: pl.imageDataUrl?.startsWith("data:")
                  ? pl.imageDataUrl
                  : null,
                metadata: pl.metadata,
              })),
            metadataSnapshot: p.metadataSnapshot,
          })),
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Could not save project.");
      setProject((prev) => ({ ...prev, id: payload.id }));
      setMessage("Project saved.");
      setWarning(warnings.length > 0 ? warnings.join(" ") : null);
      setFieldErrors({});
      if (options?.navigate !== false) {
        navigate(`/?projectId=${payload.id}`, { replace: true });
      }
      return payload.id as string;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function deleteSavedProject(id: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof payload.error === "string" ? payload.error : "Delete failed.",
        );
      }
      setPendingDelete(null);
      if (project.id === id) {
        setProject(emptyProject(settings));
        navigate("/", { replace: true });
      }
      revalidator.revalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  function startNewProject() {
    const nextSettings = loadSettings();
    setSettings(nextSettings);
    setProject(emptyProject(nextSettings));
    setActivePrintId(null);
    setMessage(null);
    setWarning(null);
    setError(null);
    setFieldErrors({});
    navigate("/", { replace: true });
  }

  const firstName = data.user?.name?.split(" ")[0] ?? "there";

  return (
    <main className="page-shell animate-fade-up">
      <ConfirmDeleteDialog
        open={pendingDelete != null}
        title="Delete Project"
        description={
          pendingDelete
            ? `Delete “${pendingDelete.name}”? This cannot be undone.`
            : ""
        }
        confirming={busy && pendingDelete != null}
        onOpenChange={(open) => {
          if (!open && !busy) setPendingDelete(null);
        }}
        onConfirm={() => {
          if (pendingDelete) void deleteSavedProject(pendingDelete.id);
        }}
      />
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
            3D Printing Cost Calculator
          </h1>
          <p className="mt-1.5 text-sm text-[var(--color-ink-muted)]">
            Welcome {firstName}
            <span className="mx-1.5 opacity-40">·</span>
            Estimate FDM &amp; SLA print costs
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          {loggedIn ? (
            <Button
              type="button"
              disabled={busy}
              className="col-span-2 sm:col-span-1"
              onClick={() => void saveProject()}
            >
              <Save />
              Save Project
            </Button>
          ) : (
            <Button asChild className="col-span-2 sm:col-span-1">
              <Link to="/login">Sign In to Save</Link>
            </Button>
          )}
          {loggedIn && project.id ? (
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={startNewProject}
            >
              <Plus />
              New Project
            </Button>
          ) : null}
          {loggedIn && project.id ? (
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() =>
                setPendingDelete({
                  id: project.id!,
                  name: project.name.trim() || "this project",
                })
              }
            >
              <Trash2 />
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <div className="dash-card space-y-5">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_13rem]">
              <div className="space-y-2">
                <Label htmlFor="project-name">
                  Project Name <span className="text-[#a33b2b]">*</span>
                </Label>
                <Input
                  ref={projectNameRef}
                  id="project-name"
                  required
                  aria-invalid={Boolean(fieldErrors.projectName)}
                  aria-describedby={
                    fieldErrors.projectName ? "project-name-error" : undefined
                  }
                  placeholder="e.g. Keychain Batch"
                  value={project.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setProject((prev) => ({ ...prev, name: value }));
                    if (value.trim()) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        projectName: undefined,
                      }));
                    }
                  }}
                  className={
                    fieldErrors.projectName
                      ? "border-[#e8c4be] focus:border-[#a33b2b] focus:shadow-[0_0_0_3px_rgba(163,59,43,0.15)]"
                      : undefined
                  }
                />
                {fieldErrors.projectName ? (
                  <p
                    id="project-name-error"
                    className="text-xs text-[#a33b2b]"
                  >
                    {fieldErrors.projectName}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Combobox
                  id="currency"
                  aria-label="Currency"
                  options={listCurrencies().map((c) => ({
                    value: c.code,
                    label: c.code,
                    keywords: c.name,
                  }))}
                  value={settings.currencyCode}
                  onChange={(code) =>
                    updateSettings({
                      ...settings,
                      currencyCode: code.toUpperCase(),
                    })
                  }
                  placeholder="Currency"
                  searchPlaceholder="Search currency…"
                  emptyText="No currency found."
                  allowCustom={false}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <LabelWithHelp
                  htmlFor="machine-rate"
                  tip="Needs print time on each print to affect cost."
                  title="Machine Rate / Hr"
                  details={
                    <>
                      <p>
                        Machine cost = print hours × this rate. Leave at 0 to
                        exclude machine time from the estimate.
                      </p>
                      <p>
                        You can also set Printer Purchase Price and Lifespan in
                        Advanced Settings, then Apply the suggested rate.
                      </p>
                    </>
                  }
                >
                  Machine Rate / Hr
                </LabelWithHelp>
                <MoneyInput
                  id="machine-rate"
                  currencySymbol={settings.currencySymbol}
                  value={settings.machineRatePerHour}
                  onChange={(e) =>
                    updateSettings({
                      ...settings,
                      machineRatePerHour: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <LabelWithHelp
                  htmlFor="service-fee"
                  tip="Percent is per print; Fixed is once per project."
                  title="Service Fee"
                  details={
                    <>
                      <p>
                        <strong className="font-semibold text-[var(--color-ink)]">
                          Percent
                        </strong>{" "}
                        — markup on each print&apos;s landed cost + failure
                        uplift.
                      </p>
                      <p>
                        <strong className="font-semibold text-[var(--color-ink)]">
                          Fixed
                        </strong>{" "}
                        — a flat fee added once at the project level (not per
                        print).
                      </p>
                    </>
                  }
                >
                  Service Fee
                </LabelWithHelp>
                <InputGroup>
                  {settings.serviceFeeMode === "fixed" ? (
                    <InputGroupAddon align="inline-start">
                      <InputGroupText aria-hidden>
                        {settings.currencySymbol}
                      </InputGroupText>
                    </InputGroupAddon>
                  ) : null}
                  <InputGroupInput
                    id="service-fee"
                    type="number"
                    min={0}
                    step={1}
                    value={settings.serviceFeeValue}
                    onChange={(e) =>
                      updateSettings({
                        ...settings,
                        serviceFeeValue: Math.max(
                          0,
                          Math.round(Number(e.target.value) || 0),
                        ),
                      })
                    }
                  />
                  <InputGroupAddon align="inline-end" className="p-0 pr-0">
                    <Select
                      value={settings.serviceFeeMode}
                      onValueChange={(value) =>
                        updateSettings({
                          ...settings,
                          serviceFeeMode:
                            value === "fixed" ? "fixed" : "percent",
                        })
                      }
                    >
                      <SelectTrigger
                        aria-label="Service fee type"
                        className="h-10 w-[7.25rem] rounded-none rounded-r-[0.7rem] border-0 border-l border-[var(--color-line)] bg-transparent shadow-none focus:border-[var(--color-line)] focus:shadow-none"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">Percent</SelectItem>
                        <SelectItem value="fixed">Fixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </InputGroupAddon>
                </InputGroup>
              </div>
              <div className="space-y-2">
                <LabelWithHelp
                  htmlFor="vat"
                  tip="Applied to the pre-VAT total (costs + fees)."
                  title="VAT %"
                  details={
                    <p>
                      VAT amount = pre-VAT total × (VAT % ÷ 100). Pre-VAT
                      includes materials, electricity, labor, machine,
                      addons, consumables, failure uplift, and
                      service fee.
                    </p>
                  }
                >
                  VAT %
                </LabelWithHelp>
                <Input
                  id="vat"
                  type="number"
                  min={0}
                  value={settings.vatRate}
                  onChange={(e) =>
                    updateSettings({
                      ...settings,
                      vatRate: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {activePrintId ? (
            <div className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <h2 className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">
                  Prints
                </h2>
                {loggedIn ? (
                  <label className="inline-flex w-full sm:w-auto">
                    <input
                      type="file"
                      accept=".gcode,.3mf,.zip,.gcode.3mf"
                      multiple
                      className="sr-only"
                      disabled={uploadPrintId != null}
                      onChange={(e) => {
                        const list = e.target.files;
                        if (list && list.length > 0 && activePrintId) {
                          void handleUploadFiles(
                            activePrintId,
                            Array.from(list),
                          );
                        }
                        e.target.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full sm:w-auto"
                      asChild
                    >
                      <span className="inline-flex cursor-pointer items-center justify-center gap-2">
                        <Upload className="size-4" aria-hidden />
                        {uploadPrintId != null
                          ? "Importing…"
                          : "Upload 3MF / G-code"}
                      </span>
                    </Button>
                  </label>
                ) : null}
              </div>
              {message || warning || error ? (
                <div className="space-y-2">
                  {message ? (
                    <p className="rounded-xl border border-[rgba(111,82,240,0.25)] bg-[rgba(111,82,240,0.08)] px-3 py-2 text-sm font-medium text-[var(--color-accent-deep)]">
                      {message}
                    </p>
                  ) : null}
                  {warning ? (
                    <p className="rounded-xl border border-[#e8d9a8] bg-[#fffbeb] px-3 py-2 text-sm text-[#9a6700]">
                      {warning}
                    </p>
                  ) : null}
                  {error ? (
                    <p className="rounded-xl border border-[#e8c4be] bg-[#fdf4f2] px-3 py-2 text-sm text-[#a33b2b]">
                      {error}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <Tabs
                value={activePrintId}
                onValueChange={setActivePrintId}
                className="dash-card !p-0"
              >
                <div className="flex items-center gap-1.5 border-b border-[var(--color-line)] bg-[var(--color-paper)]/70 px-2 py-2 sm:gap-2 sm:px-4">
                  <div className="min-w-0 flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <TabsList className="inline-flex h-auto w-max min-w-0 flex-nowrap justify-start gap-1 border-0 bg-transparent p-0">
                      {project.prints.map((print, index) => {
                        const label =
                          print.name.trim() || `Print ${index + 1}`;
                        return (
                          <TabsTrigger
                            key={print.id}
                            value={print.id}
                            title={label}
                            className="max-w-[10rem] shrink-0 truncate data-[state=active]:bg-white sm:max-w-[14rem]"
                          >
                            {label}
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addPrint}
                    className="h-8 shrink-0 rounded-full px-2.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] sm:px-3"
                  >
                    <Plus />
                    <span className="hidden sm:inline">Add Print</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </div>

                {project.prints.map((print) => {
                  const printCalc = projectCalc.prints.find(
                    (p) => p.id === print.id,
                  );
                  return (
                    <TabsContent
                      key={print.id}
                      value={print.id}
                      className="mt-0 space-y-6 p-4 sm:p-6"
                    >
                      <PrintEditor
                        print={print}
                        settings={settings}
                        inventory={data.inventory}
                        loggedIn={loggedIn}
                        canRemove={project.prints.length > 1}
                        uploading={uploadPrintId === print.id}
                        embedded
                        nameError={
                          !print.name.trim() && fieldErrors.printName
                            ? fieldErrors.printName
                            : undefined
                        }
                        onChange={(next) => {
                          updatePrint(print.id, next);
                          if (next.name.trim() && fieldErrors.printName) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              printName: undefined,
                            }));
                          }
                        }}
                        onRemove={() => removePrint(print.id)}
                        onUploadFiles={
                          loggedIn
                            ? (files) => handleUploadFiles(print.id, files)
                            : undefined
                        }
                      />
                      {printCalc ? (
                        <CostBreakdown
                          breakdown={printCalc.breakdown}
                          currencySymbol={settings.currencyCode}
                          title="Print Cost"
                        />
                      ) : null}
                    </TabsContent>
                  );
                })}
              </Tabs>
            </div>
          ) : null}

          <CustomerSection
            customer={project.customer}
            saved={customers}
            loggedIn={loggedIn}
            saving={busy}
            emailError={fieldErrors.customerEmail}
            onChange={(customer) => {
              setProject((prev) => ({ ...prev, customer }));
              if (fieldErrors.customerEmail) {
                setFieldErrors((prev) => ({
                  ...prev,
                  customerEmail: undefined,
                }));
              }
            }}
            onSave={loggedIn ? saveCustomer : undefined}
          />

          <AdvancedSettingsPanel
            settings={settings}
            onChange={updateSettings}
            showSla={showSla}
          />
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <div className="space-y-3">
            <CostBreakdown
              breakdown={projectCalc}
              currencySymbol={settings.currencyCode}
              variant="dark"
              title={
                project.prints.length > 1
                  ? `Project Total (${project.prints.length} Prints)`
                  : "Estimated Total"
              }
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="secondary"
                className="w-full flex-1"
                onClick={() => window.print()}
              >
                <Printer />
                Print Quote
              </Button>
              {loggedIn && project.id ? (
                <Button asChild variant="secondary" className="w-full flex-1">
                  <Link to={`/projects/${project.id}/invoice`}>
                    <Download />
                    Export PDF
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>

          {loggedIn && data.projects.length > 0 ? (
            <div className="dash-card text-sm">
              <p className="mb-3 font-display text-sm font-bold">Recent Projects</p>
              <ul className="space-y-2">
                {data.projects.slice(0, 8).map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-1 rounded-xl px-2 py-1.5 transition-colors hover:bg-[var(--color-paper)]"
                  >
                    <Link
                      className="min-w-0 flex-1 truncate font-medium"
                      to={`/?projectId=${p.id}`}
                    >
                      {p.name}
                    </Link>
                    <button
                      type="button"
                      className="shrink-0 rounded-lg px-2 py-1 text-xs text-[var(--color-ink-muted)] hover:bg-[#fdf4f2] hover:text-[#a33b2b]"
                      disabled={busy}
                      aria-label={`Delete ${p.name}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setPendingDelete({ id: p.id, name: p.name });
                      }}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>

      <section
        aria-labelledby="seo-features-heading"
        className="mt-14 space-y-8 border-t border-[var(--color-line)] pt-12"
      >
        <div className="max-w-2xl">
          <h2
            id="seo-features-heading"
            className="font-display text-2xl font-extrabold tracking-tight"
          >
            Price every print with confidence
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
            Built for print farms, makerspaces, and freelance 3D printing
            businesses that need fast, transparent quotes—without a spreadsheet.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "FDM & SLA ready",
              body: "Price filament by the gram or resin by the millilitre, with per-print technology switching.",
            },
            {
              title: "Import slicer exports",
              body: "Drop in Bambu Studio or OrcaSlicer 3MF and G-code to auto-fill weight, volume, and time.",
            },
            {
              title: "Shop-rate math",
              body: "Include machine rate, labor, electricity, failure uplift, service fees, and VAT in one total.",
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-[var(--color-line)] bg-white/70 p-5"
            >
              <h3 className="font-display text-base font-bold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                {item.body}
              </p>
            </article>
          ))}
        </div>
        <div className="w-full space-y-4">
          <h2 className="font-display text-xl font-extrabold tracking-tight">
            Frequently asked questions
          </h2>
          <div className="space-y-3">
            {SITE_FAQS.map((item) => (
              <details
                key={item.question}
                className="rounded-xl border border-[var(--color-line)] bg-white/70 px-4 py-3"
              >
                <summary className="cursor-pointer font-semibold">
                  {item.question}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <GuestInvoicePrint
        projectName={project.name}
        customer={project.customer}
        prints={project.prints}
        breakdowns={projectCalc.prints}
        rolled={projectCalc}
        currencySymbol={settings.currencyCode}
      />
    </main>
  );
}
