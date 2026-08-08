import { formatMoney, type PrintBreakdown } from "~/lib/pricing";
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

/** Hidden/print-only invoice used for guest window.print() */
export function GuestInvoicePrint({
  projectName,
  customer,
  prints,
  breakdowns,
  rolled,
  currencySymbol,
}: Props) {
  const m = (n: number) => formatMoney(n, currencySymbol);

  return (
    <div id="guest-invoice-print" className="hidden print:block">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #guest-invoice-print, #guest-invoice-print * { visibility: visible !important; }
          #guest-invoice-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 24px;
            background: white;
            color: black;
          }
        }
      `}</style>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Print Quote</h1>
      <p style={{ marginBottom: 16 }}>{projectName}</p>
      {customer.name ? (
        <div style={{ marginBottom: 16 }}>
          <strong>Customer</strong>
          <div>{customer.name}</div>
          {customer.email ? <div>{customer.email}</div> : null}
          {customer.phone ? <div>{customer.phone}</div> : null}
          {customer.address ? <div>{customer.address}</div> : null}
        </div>
      ) : null}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 6 }}>
              Part
            </th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 6 }}>
              Tech
            </th>
            <th style={{ textAlign: "right", borderBottom: "1px solid #ccc", padding: 6 }}>
              Time
            </th>
            <th style={{ textAlign: "right", borderBottom: "1px solid #ccc", padding: 6 }}>
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {prints.map((p) => {
            const b = breakdowns.find((x) => x.id === p.id)?.breakdown;
            const mins = printDraftMinutes(p);
            return (
              <tr key={p.id}>
                <td style={{ padding: 6 }}>{p.name}</td>
                <td style={{ padding: 6 }}>{p.technology.toUpperCase()}</td>
                <td style={{ padding: 6, textAlign: "right" }}>
                  {Math.floor(mins / 60)}h {mins % 60}m
                </td>
                <td style={{ padding: 6, textAlign: "right" }}>
                  {m(b?.total ?? 0)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ maxWidth: 320, marginLeft: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Material</span>
          <span>{m(rolled.materialCost)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Labor</span>
          <span>{m(rolled.laborCost)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Machine</span>
          <span>{m(rolled.machineCost)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Markup</span>
          <span>{m(rolled.markupAmount)}</span>
        </div>
        {rolled.vatAmount > 0 ? (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>VAT</span>
            <span>{m(rolled.vatAmount)}</span>
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 8,
            fontWeight: 700,
            fontSize: 18,
          }}
        >
          <span>Total</span>
          <span>{m(rolled.total)}</span>
        </div>
      </div>
    </div>
  );
}
