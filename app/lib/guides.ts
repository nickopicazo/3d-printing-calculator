export type GuideArticle = {
  slug: string;
  title: string;
  description: string;
  paragraphs: string[];
  related: Array<{ href: string; label: string }>;
};

export const GUIDE_ARTICLES: GuideArticle[] = [
  {
    slug: "how-to-price-3d-prints",
    title: "How to Price 3D Prints",
    description:
      "A practical guide to pricing 3D prints: true cost, failure buffer, markup, and what to charge customers.",
    paragraphs: [
      "Start with true cost: filament or resin, electricity, machine time, labor, and any hardware addons. That number is what it costs you to produce the part—not what you should charge.",
      "Add a failure uplift (often 5–15%) so reprints and first-layer fails do not erase your margin. Then apply a service fee or markup that reflects design effort, packing, and profit.",
      "Use the 3D printing pricing calculator to keep quotes consistent. Save shop rates once, then price each job from grams and hours—or import a Bambu Studio 3MF in the full app.",
    ],
    related: [
      { href: "/calculators/3d-printing-pricing-calculator", label: "Pricing calculator" },
      { href: "/calculators/3d-printing-profit-calculator", label: "Profit calculator" },
      { href: "/", label: "Full calculator" },
    ],
  },
  {
    slug: "3d-printing-electricity-cost",
    title: "How Much Electricity Does a 3D Printer Use?",
    description:
      "Estimate 3D printer electricity cost from watts, hours, and your kWh rate.",
    paragraphs: [
      "Electricity cost ≈ (printer watts ÷ 1000) × print hours × ₱ (or $) per kWh. A 350 W machine running 10 hours at ₱12/kWh uses about 3.5 kWh and costs roughly ₱42.",
      "Rated wattage is a ceiling; real average draw is often lower. If you have a plug meter, use the measured average for better quotes.",
      "Electricity is usually a smaller line than filament or labor—but including it keeps quotes honest for long engineering prints.",
    ],
    related: [
      {
        href: "/calculators/3d-printing-electricity-calculator",
        label: "Electricity calculator",
      },
      { href: "/printers/bambu-lab-h2s", label: "Bambu H2S cost calculator" },
    ],
  },
  {
    slug: "pla-and-petg-cost-per-gram",
    title: "PLA and PETG Cost Per Gram",
    description:
      "Convert filament ₱/kg into cost per gram and build a full print quote.",
    paragraphs: [
      "Cost per gram = price per kilogram ÷ 1000. At ₱650/kg, PLA is ₱0.65/g. At ₱750/kg, PETG is ₱0.75/g before any shop overhead.",
      "Slicer estimates (or 3MF import) give grams used. Multiply by cost per gram for material, then add electricity, machine, labor, failure, and markup.",
      "Multi-color plates need one line per filament. Inventory in the signed-in app keeps your real spool prices handy.",
    ],
    related: [
      { href: "/filament/pla", label: "PLA cost calculator" },
      { href: "/filament/petg", label: "PETG cost calculator" },
      { href: "/calculators/filament-cost-calculator", label: "Filament cost calculator" },
    ],
  },
  {
    slug: "3d-printing-pricing-philippines",
    title: "How to Price 3D Prints in the Philippines",
    description:
      "Philippines-focused guidance for ₱/kWh, filament prices, and what to charge for 3D prints.",
    paragraphs: [
      "Use your actual electricity rate from your bill and local filament ₱/kg. Defaults on our Philippines calculator are starting points, not regulations.",
      "Many PH freelancers underprice by quoting filament alone. Include machine time, labor for finishing, failure buffer, and a clear service fee.",
      "If you sell on marketplaces, raise markup to cover fees and shipping materials.",
    ],
    related: [
      { href: "/philippines", label: "PH cost calculator" },
      { href: "/calculators/3d-print-price-calculator", label: "Price calculator" },
    ],
  },
  {
    slug: "bambu-lab-cost-per-hour",
    title: "Bambu Lab Cost Per Hour",
    description:
      "Estimate Bambu Lab printer cost per hour including electricity and machine depreciation.",
    paragraphs: [
      "Hourly electricity ≈ (watts ÷ 1000) × ₱/kWh. Machine rate ≈ purchase price ÷ expected lifespan hours. Add them for a simple cost-per-hour floor before filament and labor.",
      "A1, P1S, X1 Carbon, and H2S pages on this site pre-fill different watt estimates. Edit them to match your measurements.",
      "For accurate job quotes, multiply hourly costs by print hours and add filament grams from your slice.",
    ],
    related: [
      { href: "/printers/bambu-lab-a1", label: "A1 calculator" },
      { href: "/printers/bambu-lab-p1s", label: "P1S calculator" },
      { href: "/printers/bambu-lab-x1-carbon", label: "X1C calculator" },
      { href: "/printers/bambu-lab-h2s", label: "H2S calculator" },
    ],
  },
];

export function getGuide(slug: string): GuideArticle | undefined {
  return GUIDE_ARTICLES.find((g) => g.slug === slug);
}

export function guidePaths(): string[] {
  return GUIDE_ARTICLES.map((g) => `/guides/${g.slug}`);
}
