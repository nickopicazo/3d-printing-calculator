import {
  QuoteDocument,
  type QuoteDocumentProps,
} from "~/components/calculator/quote-document";
import type { PrintBreakdown } from "~/lib/pricing";
import type { CustomerDraft, PrintDraft } from "~/lib/calculator-types";
import { printDraftMinutes } from "~/lib/calculator-types";

type Props = {
  projectName: string;
  customer: CustomerDraft;
  prints: PrintDraft[];
  breakdowns: Array<{ id: string; name: string; breakdown: PrintBreakdown }>;
  rolled: PrintBreakdown;
  currencySymbol: string;
};

/** Hidden/print-only quote layout used by Print Quote (window.print). */
export function GuestInvoicePrint({
  projectName,
  customer,
  prints,
  breakdowns,
  rolled,
  currencySymbol,
}: Props) {
  const doc: QuoteDocumentProps = {
    id: "guest-invoice-print-inner",
    projectName,
    documentLabel: "Quote",
    customer: customer.name.trim()
      ? {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
        }
      : null,
    prints: prints.map((p) => ({
      id: p.id,
      name: p.name,
      technology: p.technology,
      printerName: p.printerName,
      printMinutes: printDraftMinutes(p),
      postProcessMinutes: p.postProcessMinutes,
      total: breakdowns.find((x) => x.id === p.id)?.breakdown.total ?? 0,
      materials: p.materials.map((mat) => ({
        label: mat.label || mat.type || "Material",
        quantity: mat.quantity,
        unit: mat.unit,
      })),
      previewUrls: p.plates
        .filter((pl) => pl.sliced && pl.imageDataUrl)
        .map((pl) => pl.imageDataUrl!),
    })),
    totals: {
      materialCost: rolled.materialCost,
      electricityCost: rolled.electricityCost,
      laborCost: rolled.laborCost,
      postProcessCost: rolled.postProcessCost,
      postProcessMinutes: prints.reduce(
        (sum, p) => sum + p.postProcessMinutes,
        0,
      ),
      machineCost: rolled.machineCost,
      addonsCost: rolled.addonsCost,
      consumablesCost: rolled.consumablesCost,
      failureUplift: rolled.failureUplift,
      markupAmount: rolled.markupAmount,
      vatAmount: rolled.vatAmount,
      total: rolled.total,
    },
    currencyCode: currencySymbol,
  };

  return (
    <div id="guest-invoice-print" className="hidden print:block">
      <style>{`
        @media print {
          @page { margin: 14mm 14mm 16mm; }
          body * { visibility: hidden !important; }
          #guest-invoice-print, #guest-invoice-print * { visibility: visible !important; }
          #guest-invoice-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #fff;
            color: #16161a;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
      <QuoteDocument {...doc} />
    </div>
  );
}
