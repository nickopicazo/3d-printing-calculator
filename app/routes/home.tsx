import { eq } from "drizzle-orm";
import { Download, Plus, Printer, Save, Trash2 } from "lucide-react";
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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { db } from "~/db/index.server";
import { customers, materials, projects } from "~/db/schema";
import {
  emptyPrint,
  emptyProject,
  nextPrintName,
  printDraftMinutes,
  type InventoryMaterial,
  type PrintDraft,
  type ProjectDraft,
  type SavedCustomer,
  type SavedProject,
} from "~/lib/calculator-types";
import { createId, calculateProject } from "~/lib/pricing";
import { minutesToHoursMinutes } from "~/lib/ocr/parseSlicerResult";
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

export function meta({}: Route.MetaArgs) {
  return [
    { title: "3D Printing Calculator" },
    {
      name: "description",
      content:
        "Estimate FDM and SLA print costs with materials, labor, machine time, VAT, and PDF invoices.",
    },
  ];
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
            hardwareCost: number;
            packagingCost: number;
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
              hardwareCost: p.hardwareCost,
              packagingCost: p.packagingCost,
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
        hardwareCost: p.hardwareCost,
        packagingCost: p.packagingCost,
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

  async function handleUpload(printId: string, file: File) {
    setUploadPrintId(printId);
    setError(null);
    try {
      if (file.type.startsWith("image/")) {
        const { extractFromSlicerScreenshot } = await import("~/lib/ocr/runOcr");
        const result = await extractFromSlicerScreenshot(file);
        const hm = minutesToHoursMinutes(result.totalMinutes ?? 0);
        setProject((prev) => ({
          ...prev,
          prints: prev.prints.map((p) => {
            if (p.id !== printId) return p;
            const price =
              p.technology === "sla"
                ? settings.defaultResinPricePerLitre
                : settings.defaultFilamentPricePerKg;
            return {
              ...p,
              name: p.name,
              sourceName: file.name,
              printHours: hm.hours,
              printMinutesPart: hm.minutes,
              materials:
                result.filamentGrams.length > 0
                  ? result.filamentGrams.map((grams, i) => ({
                      id: createId("mat"),
                      label: `Imported ${i + 1}`,
                      quantity: grams,
                      unit: "g" as const,
                      pricePerUnit: price,
                      inventoryMaterialId: null,
                      slot: null,
                      type: null,
                      color: null,
                    }))
                  : p.materials,
            };
          }),
        }));
        setMessage("Imported values from slicer screenshot.");
        return;
      }

      const { extractFromGcodeUpload, isSupportedGcodeImport } = await import(
        "~/lib/gcode/loadFromArchive"
      );
      if (!isSupportedGcodeImport(file)) {
        throw new Error("Unsupported file type.");
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

      setProject((prev) => ({
        ...prev,
        prints: prev.prints.map((p) => {
          if (p.id !== printId) return p;
          const price = settings.defaultFilamentPricePerKg;
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
              : p.materials;
          return {
            ...p,
            technology: "fdm" as const,
            name: p.name,
            sourceName: result.sourceName,
            printerName: printer || p.printerName,
            printHours: hm.hours,
            printMinutesPart: hm.minutes,
            materials,
            plates: result.plates,
            metadataSnapshot: result.metadataSnapshot as unknown as Record<
              string,
              unknown
            >,
          };
        }),
      }));
      setMessage(null);
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
            hardwareCost: p.hardwareCost,
            packagingCost: p.packagingCost,
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

  const firstName = data.user?.name?.split(" ")[0] ?? "there";

  return (
    <main className="page-shell animate-fade-up">
      <ConfirmDeleteDialog
        open={pendingDelete != null}
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
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Welcome {firstName}
          </h1>
          <p className="mt-1.5 text-sm text-[var(--color-ink-muted)]">
            Calculator <span className="mx-1 opacity-40">›</span> Estimate Print
            Costs
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {loggedIn ? (
            <Button
              type="button"
              disabled={busy}
              onClick={() => void saveProject()}
            >
              <Save />
              Save Project
            </Button>
          ) : (
            <Button asChild>
              <Link to="/login">Sign In to Save</Link>
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={() => window.print()}
          >
            <Printer />
            Print Quote
          </Button>
          {loggedIn && project.id ? (
            <Button asChild variant="secondary">
              <Link to={`/projects/${project.id}/invoice`}>
                <Download />
                Export PDF
              </Link>
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
          <div className="dash-card space-y-4">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]">
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
                <Label htmlFor="currency">Currency</Label>
                <Combobox
                  id="currency"
                  options={listCurrencies().map((c) => ({
                    value: c.code,
                    label: `${c.code} · ${c.symbol}`,
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
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="machine-rate">Machine Rate / Hr</Label>
                <Input
                  id="machine-rate"
                  type="number"
                  min={0}
                  value={settings.machineRatePerHour}
                  onChange={(e) =>
                    updateSettings({
                      ...settings,
                      machineRatePerHour: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="markup">Markup %</Label>
                <Input
                  id="markup"
                  type="number"
                  min={0}
                  value={settings.markupPercent}
                  onChange={(e) =>
                    updateSettings({
                      ...settings,
                      markupPercent: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vat">VAT %</Label>
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
              <h2 className="font-display text-2xl font-extrabold tracking-tight">
                Prints
              </h2>
              <Tabs
                value={activePrintId}
                onValueChange={setActivePrintId}
                className="dash-card !p-0"
              >
                <div className="flex items-center gap-2 border-b border-[var(--color-line)] bg-[var(--color-paper)]/70 px-3 py-2 sm:px-4">
                  <div className="min-w-0 flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:thin]">
                    <TabsList className="inline-flex h-auto w-max min-w-0 flex-nowrap justify-start gap-1 border-0 bg-transparent p-0">
                      {project.prints.map((print, index) => {
                        const label =
                          print.name.trim() || `Print ${index + 1}`;
                        return (
                          <TabsTrigger
                            key={print.id}
                            value={print.id}
                            title={label}
                            className="max-w-[14rem] shrink-0 truncate data-[state=active]:bg-white"
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
                    className="h-8 shrink-0 rounded-full px-3 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                  >
                    <Plus />
                    Add Print
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
                      className="mt-0 space-y-4 p-4 sm:p-6"
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
                        onUploadFile={
                          loggedIn
                            ? (file) => handleUpload(print.id, file)
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

          {message ? (
            <p className="text-sm font-medium text-[var(--color-accent-deep)]">
              {message}
            </p>
          ) : null}
          {warning ? (
            <p className="rounded-xl border border-[#e8d9a8] bg-[#fffbeb] px-3 py-2 text-sm text-[#9a6700]">
              {warning}
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-[#a33b2b]">{error}</p>
          ) : null}

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
