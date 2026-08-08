import { eq } from "drizzle-orm";
import { Plus, Printer, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLoaderData, useNavigate, useSearchParams } from "react-router";
import type { Route } from "./+types/home";
import { AdvancedSettingsPanel } from "~/components/calculator/advanced-settings";
import { CostBreakdown } from "~/components/calculator/cost-breakdown";
import { CustomerSection } from "~/components/calculator/customer-section";
import { GuestInvoicePrint } from "~/components/calculator/guest-invoice-print";
import { PrintEditor } from "~/components/calculator/print-editor";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { db } from "~/db/index.server";
import { customers, materials, projects } from "~/db/schema";
import {
  emptyPrint,
  emptyProject,
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
  loadSettings,
  saveSettings,
  type AppSettings,
} from "~/lib/settings";

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
  const [searchParams] = useSearchParams();

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [project, setProject] = useState<ProjectDraft>(() =>
    emptyProject(DEFAULT_SETTINGS),
  );
  const [customers, setCustomers] = useState(data.customers);
  const [busy, setBusy] = useState(false);
  const [uploadPrintId, setUploadPrintId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setProject(emptyProject(loaded));
  }, []);

  useEffect(() => {
    setCustomers(data.customers);
  }, [data.customers]);

  // Load existing project when ?projectId=
  useEffect(() => {
    const projectId = searchParams.get("projectId");
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
    setSettings(next);
    saveSettings(next);
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
    if (!loggedIn) return;
    setProject((prev) => ({
      ...prev,
      prints: [
        ...prev.prints,
        {
          ...emptyPrint(settings),
          name: `Print ${prev.prints.length + 1}`,
          id: createId("print"),
        },
      ],
    }));
  }

  function removePrint(id: string) {
    setProject((prev) => ({
      ...prev,
      prints: prev.prints.filter((p) => p.id !== id),
    }));
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
              name: p.name || file.name,
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
      const printer =
        (result.metadataSnapshot.plates[0]?.metadata?.printer_model_id as
          | string
          | undefined) ?? "";

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
            name: p.name === "Print 1" || !p.name ? file.name : p.name,
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
      setMessage(`Imported ${result.sourceName}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setUploadPrintId(null);
    }
  }

  async function saveCustomer() {
    if (!loggedIn || !project.customer.name.trim()) return;
    setBusy(true);
    setError(null);
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
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: project.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: project.id,
          name: project.name,
          customerId: project.customer.id,
          customer: project.customer.name.trim()
            ? project.customer
            : undefined,
          settings,
          prints: project.prints.map((p) => ({
            id: p.id,
            name: p.name,
            technology: p.technology,
            printerName: p.printerName,
            sourceName: p.sourceName,
            printMinutes: printDraftMinutes(p),
            laborMinutes: p.laborMinutes,
            hardwareCost: p.hardwareCost,
            packagingCost: p.packagingCost,
            materials: p.materials,
            plates: p.plates.map((pl) => ({
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

  async function generateQuote() {
    setBusy(true);
    setError(null);
    try {
      const projectId = await saveProject({ navigate: false });
      if (!projectId) return;
      setBusy(true);
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title: `${project.name} — Quote`,
          settings,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Could not create quote.");
      navigate(`/quotes/${payload.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Quote failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 animate-fade-up">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wider text-[var(--color-accent-deep)]">
          3D Printing Calculator
        </p>
        <h1 className="font-display mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Print Quote
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--color-ink-muted)]">
          Price FDM and SLA jobs with materials, labor, machine time, and VAT.
          {loggedIn
            ? " Upload slicer files, manage multi-print projects, and generate invoices."
            : " Sign in to upload G-code / 3MF and save projects."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div className="space-y-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="project-name">Project name</Label>
                <Input
                  id="project-name"
                  value={project.name}
                  onChange={(e) =>
                    setProject((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={settings.currencyCode}
                    onChange={(e) =>
                      updateSettings({
                        ...settings,
                        currencyCode: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="symbol">Symbol</Label>
                  <Input
                    id="symbol"
                    value={settings.currencySymbol}
                    onChange={(e) =>
                      updateSettings({
                        ...settings,
                        currencySymbol: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="machine-rate">Machine rate / hr</Label>
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

          {project.prints.map((print) => (
            <PrintEditor
              key={print.id}
              print={print}
              settings={settings}
              inventory={data.inventory}
              loggedIn={loggedIn}
              canRemove={loggedIn && project.prints.length > 1}
              uploading={uploadPrintId === print.id}
              onChange={(next) => updatePrint(print.id, next)}
              onRemove={() => removePrint(print.id)}
              onUploadFile={
                loggedIn
                  ? (file) => handleUpload(print.id, file)
                  : undefined
              }
            />
          ))}

          {loggedIn ? (
            <Button type="button" variant="secondary" onClick={addPrint}>
              <Plus />
              Add print
            </Button>
          ) : (
            <p className="text-sm text-[var(--color-ink-muted)]">
              <Link className="underline" to="/login">
                Sign in
              </Link>{" "}
              to add multiple prints to a project.
            </p>
          )}

          <AdvancedSettingsPanel
            settings={settings}
            onChange={updateSettings}
            showSla={showSla}
          />

          <CustomerSection
            customer={project.customer}
            saved={customers}
            loggedIn={loggedIn}
            saving={busy}
            onChange={(customer) =>
              setProject((prev) => ({ ...prev, customer }))
            }
            onSave={loggedIn ? saveCustomer : undefined}
          />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <CostBreakdown
            breakdown={projectCalc}
            currencySymbol={settings.currencySymbol}
            title={
              project.prints.length > 1
                ? `Project total (${project.prints.length} prints)`
                : "Cost breakdown"
            }
          />
          {project.prints.length > 1
            ? projectCalc.prints.map((p) => (
                <CostBreakdown
                  key={p.id}
                  breakdown={p.breakdown}
                  currencySymbol={settings.currencySymbol}
                  title={p.name}
                />
              ))
            : null}

          <div className="flex flex-col gap-2">
            <Button type="button" variant="secondary" onClick={() => window.print()}>
              <Printer />
              Print / Download PDF
            </Button>
            {loggedIn ? (
              <>
                <Button type="button" variant="secondary" disabled={busy} onClick={() => void saveProject()}>
                  <Save />
                  Save project
                </Button>
                <Button type="button" disabled={busy} onClick={generateQuote}>
                  Generate quote
                </Button>
              </>
            ) : (
              <Button asChild>
                <Link to="/login">Sign in to save quotes</Link>
              </Button>
            )}
          </div>

          {message ? (
            <p className="text-sm text-[var(--color-accent-deep)]">{message}</p>
          ) : null}
          {error ? (
            <p className="text-sm text-[#a33b2b]">{error}</p>
          ) : null}

          {loggedIn && data.projects.length > 0 ? (
            <div className="rounded-lg border border-[var(--color-line)] p-3 text-sm">
              <p className="mb-2 font-semibold">Your projects</p>
              <ul className="space-y-1">
                {data.projects.slice(0, 8).map((p) => (
                  <li key={p.id}>
                    <Link
                      className="text-[var(--color-accent-deep)] underline-offset-2 hover:underline"
                      to={`/?projectId=${p.id}`}
                    >
                      {p.name}
                    </Link>
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
        currencySymbol={settings.currencySymbol}
      />
    </main>
  );
}
