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

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}m`;
  if (m <= 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 24,
        padding: "5px 0",
        color: "#6b6b76",
        fontSize: 12,
      }}
    >
      <span>{label}</span>
      <span
        style={{
          fontVariantNumeric: "tabular-nums",
          fontWeight: 600,
          color: "#16161a",
        }}
      >
        {value}
      </span>
    </div>
  );
}

/** Hidden/print-only quote layout used by Print Quote (window.print). */
export function GuestInvoicePrint({
  projectName,
  customer,
  prints,
  breakdowns,
  rolled,
  currencySymbol,
}: Props) {
  const m = (n: number) => formatMoney(n, currencySymbol);
  const issued = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const hasCustomer = Boolean(customer.name?.trim());

  const costLines: Array<{ label: string; amount: number }> = [
    { label: "Material", amount: rolled.materialCost },
    { label: "Machine", amount: rolled.machineCost },
    { label: "Electricity", amount: rolled.electricityCost },
    { label: "Labor", amount: rolled.laborCost },
    { label: "Hardware", amount: rolled.hardwareCost },
    { label: "Packaging", amount: rolled.packagingCost },
    { label: "Consumables", amount: rolled.consumablesCost },
    { label: "Failure uplift", amount: rolled.failureUplift },
    { label: "Markup", amount: rolled.markupAmount },
    { label: "VAT", amount: rolled.vatAmount },
  ].filter((line) => line.amount > 0.005 || line.label === "Material");

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
            font-family: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 24,
            paddingBottom: 20,
            borderBottom: "2px solid #16161a",
            marginBottom: 28,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "#7c5cff",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 800,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                P
              </span>
              <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em" }}>
                PrintCost
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#7c5cff",
              }}
            >
              Quote
            </p>
            <h1
              style={{
                margin: "6px 0 0",
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1.15,
              }}
            >
              {projectName.trim() || "Untitled project"}
            </h1>
          </div>
          <div style={{ textAlign: "right", fontSize: 12, color: "#6b6b76", lineHeight: 1.55 }}>
            <div>Issued {issued}</div>
            <div>
              {prints.length} print{prints.length === 1 ? "" : "s"}
            </div>
          </div>
        </header>

        {hasCustomer ? (
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
              marginBottom: 28,
              padding: 16,
              background: "#f7f7f9",
              borderRadius: 12,
            }}
          >
            <div>
              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#8a8a96",
                }}
              >
                Bill To
              </p>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                {customer.name}
              </p>
              {customer.email ? (
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b6b76" }}>
                  {customer.email}
                </p>
              ) : null}
              {customer.phone ? (
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b6b76" }}>
                  {customer.phone}
                </p>
              ) : null}
            </div>
            {customer.address?.trim() ? (
              <div>
                <p
                  style={{
                    margin: "0 0 6px",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#8a8a96",
                  }}
                >
                  Address
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: "#6b6b76",
                    whiteSpace: "pre-line",
                    lineHeight: 1.5,
                  }}
                >
                  {customer.address}
                </p>
              </div>
            ) : null}
          </section>
        ) : null}

        <section style={{ marginBottom: 28 }}>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#8a8a96",
            }}
          >
            Line Items
          </p>
          <div style={{ borderTop: "1px solid #e4e4e8" }}>
            {prints.map((p, index) => {
              const b = breakdowns.find((x) => x.id === p.id)?.breakdown;
              const mins = printDraftMinutes(p);
              const previews = p.plates
                .filter((pl) => pl.sliced && pl.imageDataUrl)
                .slice(0, 3);
              return (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    gap: 14,
                    padding: "14px 0",
                    borderBottom: "1px solid #e4e4e8",
                    alignItems: "flex-start",
                  }}
                >
                  {previews.length > 0 ? (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      {previews.map((pl) => (
                        <img
                          key={pl.plateIndex}
                          src={pl.imageDataUrl!}
                          alt=""
                          style={{
                            width: 52,
                            height: 52,
                            objectFit: "cover",
                            borderRadius: 8,
                            border: "1px solid #e4e4e8",
                            background: "#f0f0f2",
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        flexShrink: 0,
                        borderRadius: 8,
                        background: "#f0f0f2",
                        border: "1px solid #e4e4e8",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#8a8a96",
                      }}
                    >
                      {index + 1}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 16,
                        alignItems: "baseline",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: 14,
                          fontWeight: 700,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {p.name.trim() || `Print ${index + 1}`}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 14,
                          fontWeight: 800,
                          fontVariantNumeric: "tabular-nums",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {m(b?.total ?? 0)}
                      </p>
                    </div>
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: 12,
                        color: "#6b6b76",
                      }}
                    >
                      {p.technology.toUpperCase()}
                      {p.printerName?.trim() ? ` · ${p.printerName.trim()}` : ""}
                      {" · "}
                      {formatDuration(mins)}
                    </p>
                    {p.materials.length > 0 ? (
                      <p
                        style={{
                          margin: "6px 0 0",
                          fontSize: 11,
                          color: "#8a8a96",
                        }}
                      >
                        {p.materials
                          .map((mat) => {
                            const bits = [
                              mat.label || mat.type || "Material",
                              `${mat.quantity}${mat.unit}`,
                            ];
                            return bits.join(" · ");
                          })
                          .join("  ·  ")}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 280px",
            gap: 28,
            alignItems: "start",
          }}
        >
          <div style={{ fontSize: 11, color: "#8a8a96", lineHeight: 1.55 }}>
            <p style={{ margin: 0 }}>
              Prices are estimates based on the inputs in this quote. Final
              invoice may vary with material used, reprints, and finishing.
            </p>
          </div>
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              background: "#f7f7f9",
              border: "1px solid #e4e4e8",
              color: "#16161a",
            }}
          >
            {costLines.map((line) => (
              <Row
                key={line.label}
                label={line.label}
                value={m(line.amount)}
              />
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 16,
                marginTop: 10,
                paddingTop: 12,
                borderTop: "1px solid #e4e4e8",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#7c5cff",
                }}
              >
                Total
              </span>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {m(rolled.total)}
              </span>
            </div>
          </div>
        </section>

        <footer
          style={{
            marginTop: 36,
            paddingTop: 14,
            borderTop: "1px solid #e4e4e8",
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: "#8a8a96",
          }}
        >
          <span>Prepared with PrintCost</span>
          <span>Thank you for your business</span>
        </footer>
      </div>
    </div>
  );
}
