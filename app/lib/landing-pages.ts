import type { LandingPreset } from "~/lib/landing-preset";

export type LandingSection = "calculators" | "printers" | "materials";

export type LandingPage = {
  section: LandingSection;
  slug: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  body: Array<{ heading: string; paragraphs: string[] }>;
  faqs: Array<{ question: string; answer: string }>;
  preset: LandingPreset;
  /** Optional sample example shown above the calculator */
  example?: {
    title: string;
    lines: string[];
  };
};

const phShopSettings: LandingPreset["settings"] = {
  currencyCode: "PHP",
  electricityPerKwh: 12,
  powerWatts: 350,
  defaultFilamentPricePerKg: 650,
  machineRatePerHour: 50,
  laborRatePerHour: 150,
  failurePercent: 10,
  serviceFeeMode: "percent",
  serviceFeeValue: 40,
};

const bambuBase = (printerName: string, watts: number): LandingPreset => ({
  settings: {
    ...phShopSettings,
    powerWatts: watts,
    printerPurchasePrice: 0,
  },
  printerName,
  technology: "fdm",
  materialType: "PLA",
  materialLabel: "PLA",
  quantity: 120,
  printHours: 6,
  printMinutesPart: 30,
  laborMinutes: 20,
  projectName: `${printerName} sample quote`,
  printName: "Sample print",
});

const materialPage = (
  slug: string,
  type: string,
  title: string,
  description: string,
  h1: string,
  intro: string,
  pricePerKg: number,
  notes: string[],
): LandingPage => ({
  section: "materials",
  slug,
  title,
  description,
  h1,
  intro,
  body: [
    {
      heading: `How ${type} cost is calculated`,
      paragraphs: [
        `Filament cost = (grams used ÷ 1000) × your ${type} price per kilogram. This page pre-fills a typical ${type} price so you can see material, electricity, machine time, and recommended selling price in one place.`,
        ...notes,
      ],
    },
  ],
  faqs: [
    {
      question: `How much does ${type} filament cost per gram?`,
      answer: `Divide your spool price by 1000. At ₱${pricePerKg}/kg, ${type} costs ₱${(pricePerKg / 1000).toFixed(2)} per gram before electricity, machine, labor, and margin.`,
    },
    {
      question: `Can I use this ${type} calculator for multi-color prints?`,
      answer:
        "Yes. Add more material lines on the print, or open the full calculator and import a Bambu Studio / OrcaSlicer 3MF with multiple filaments.",
    },
  ],
  preset: {
    settings: {
      ...phShopSettings,
      defaultFilamentPricePerKg: pricePerKg,
    },
    technology: "fdm",
    materialType: type,
    materialLabel: type,
    quantity: 100,
    printHours: 5,
    printMinutesPart: 0,
    laborMinutes: 15,
    projectName: `${type} cost example`,
  },
  example: {
    title: `Example ${type} print`,
    lines: [
      `100 g ${type} @ ₱${pricePerKg}/kg`,
      "5 h print time",
      "Includes electricity, machine rate, labor, failure uplift, and service fee",
    ],
  },
});

export const LANDING_PAGES: LandingPage[] = [
  {
    section: "calculators",
    slug: "3d-printing-cost-calculator",
    title: "3D Printing Cost Calculator",
    description:
      "Free 3D printing cost calculator for FDM and SLA. Estimate filament, electricity, machine time, labor, failure, and recommended selling price.",
    h1: "3D Printing Cost Calculator",
    intro:
      "Know exactly what to charge. Enter material usage and print time—or start from the sample below—and get a transparent cost breakdown plus a recommended selling price.",
    body: [
      {
        heading: "What this calculator includes",
        paragraphs: [
          "Material (filament grams or resin millilitres), electricity (watts × hours × ₱/kWh), machine rate, labor, failure uplift, service fee / markup, and VAT.",
          "Built for makers and 3D printing businesses who need quotes, not just hobby math.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is this 3D printing cost calculator free?",
        answer:
          "Yes. Guests can estimate costs in the browser. Sign in to save projects, inventory, customers, and printable invoices.",
      },
      {
        question: "How do I get a recommended selling price?",
        answer:
          "Set a service fee (percent or fixed) and optional failure uplift. The dark total card shows your recommended selling price after costs and fees.",
      },
    ],
    preset: {
      settings: phShopSettings,
      quantity: 150,
      printHours: 8,
      printMinutesPart: 0,
      laborMinutes: 30,
      materialType: "PLA",
      materialLabel: "PLA",
      projectName: "Sample shop quote",
    },
    example: {
      title: "Sample quote",
      lines: [
        "150 g PLA · 8 h print · 30 min labor",
        "PHP rates with failure + service fee",
      ],
    },
  },
  {
    section: "calculators",
    slug: "3d-print-price-calculator",
    title: "3D Print Price Calculator",
    description:
      "3D print price calculator to turn true cost into a selling price with markup, failure buffer, and VAT.",
    h1: "3D Print Price Calculator",
    intro:
      "Price jobs the way a shop would: true cost first, then markup. Adjust service fee and failure percent until the margin matches your business.",
    body: [
      {
        heading: "From cost to price",
        paragraphs: [
          "True cost covers material, power, machine, labor, and addons. Selling price adds failure buffer and your service fee so you stop underpricing prints.",
        ],
      },
    ],
    faqs: [
      {
        question: "What markup should I use?",
        answer:
          "Many small shops start around 30–50% service fee on landed cost after failure uplift. Raise it for design-heavy or rush work.",
      },
    ],
    preset: {
      settings: { ...phShopSettings, serviceFeeValue: 50 },
      quantity: 80,
      printHours: 4,
      materialType: "PETG",
      materialLabel: "PETG",
      projectName: "Price example",
    },
  },
  {
    section: "calculators",
    slug: "filament-cost-calculator",
    title: "Filament Cost Calculator",
    description:
      "Calculate filament cost from grams and ₱/kg, then layer electricity and shop rates for a full print quote.",
    h1: "Filament Cost Calculator",
    intro:
      "Enter grams used and your spool price per kilogram. Add print time to include electricity and machine depreciation in the same estimate.",
    body: [
      {
        heading: "Filament formula",
        paragraphs: [
          "Filament cost = (grams ÷ 1000) × price per kg. Example: 125 g at ₱650/kg = ₱81.25 in material alone.",
        ],
      },
    ],
    faqs: [
      {
        question: "Where do I get grams used?",
        answer:
          "From your slicer estimate, or upload a Bambu Studio / OrcaSlicer 3MF or G-code in the full calculator after signing in.",
      },
    ],
    preset: {
      settings: phShopSettings,
      quantity: 125,
      printHours: 3,
      printMinutesPart: 20,
      materialType: "PLA",
      materialLabel: "PLA",
      projectName: "Filament example",
    },
  },
  {
    section: "calculators",
    slug: "3d-printing-electricity-calculator",
    title: "3D Printing Electricity Calculator",
    description:
      "Estimate 3D printer electricity cost from watts, print hours, and your kWh rate.",
    h1: "3D Printing Electricity Calculator",
    intro:
      "Electricity is often small but real. Set printer watts and ₱/kWh, then enter print hours to see power cost alongside material and machine rates.",
    body: [
      {
        heading: "Electricity formula",
        paragraphs: [
          "kWh used ≈ (watts ÷ 1000) × print hours. Cost = kWh × electricity rate. A 350 W printer for 10 hours at ₱12/kWh ≈ ₱42.",
        ],
      },
    ],
    faqs: [
      {
        question: "What wattage should I use for Bambu printers?",
        answer:
          "Use your printer’s rated power or a measured average. This site’s Bambu pages pre-fill typical watt estimates you can edit.",
      },
    ],
    preset: {
      settings: {
        ...phShopSettings,
        powerWatts: 350,
        electricityPerKwh: 12,
      },
      quantity: 50,
      printHours: 10,
      materialType: "PLA",
      projectName: "Electricity example",
    },
    example: {
      title: "10-hour print power",
      lines: ["350 W · 10 h · ₱12/kWh ≈ ₱42 electricity"],
    },
  },
  {
    section: "calculators",
    slug: "3d-printing-profit-calculator",
    title: "3D Printing Profit Calculator",
    description:
      "3D printing profit calculator: see true cost, service fee, and margin so you know what to charge.",
    h1: "3D Printing Profit Calculator",
    intro:
      "Dial in failure uplift and service fee to see how much profit sits on top of true cost. The recommended selling price is your quote-ready total.",
    body: [
      {
        heading: "Margin at a glance",
        paragraphs: [
          "Landed cost is materials + power + machine + labor + addons. Failure uplift and service fee create the gap between cost and selling price.",
        ],
      },
    ],
    faqs: [
      {
        question: "Does this include platform fees like Etsy?",
        answer:
          "Not automatically. Raise your service fee or add a fixed fee to cover marketplace cuts and payment processing.",
      },
    ],
    preset: {
      settings: {
        ...phShopSettings,
        failurePercent: 15,
        serviceFeeValue: 45,
      },
      quantity: 200,
      printHours: 12,
      laborMinutes: 45,
      materialType: "PETG",
      materialLabel: "PETG",
      projectName: "Profit example",
    },
  },
  {
    section: "calculators",
    slug: "3d-printing-pricing-calculator",
    title: "3D Printing Pricing Calculator",
    description:
      "Business-ready 3D printing pricing calculator with shop rates, VAT, and recommended selling price.",
    h1: "3D Printing Pricing Calculator",
    intro:
      "For print farms and freelancers who need consistent quotes. Set shop rates once, then price each job from grams and hours—or import slicer data in the full app.",
    body: [
      {
        heading: "Shop-rate pricing",
        paragraphs: [
          "Machine rate/hr, labor/hr, electricity, failure %, service fee, and VAT combine into one total you can print or share with a customer.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I share a quote with a customer?",
        answer:
          "Yes. Use Share to create a link, or Print Quote for a PDF-style printout. Signed-in users can also save projects and invoices.",
      },
    ],
    preset: {
      settings: { ...phShopSettings, vatRate: 12 },
      quantity: 175,
      printHours: 9,
      laborMinutes: 25,
      materialType: "PLA",
      projectName: "Pricing example",
    },
  },
  {
    section: "calculators",
    slug: "embed",
    title: "Embed the 3D Printing Calculator",
    description:
      "Free embeddable 3D printing cost calculator for your website. Copy the iframe snippet and link back to the full tool.",
    h1: "Embed this calculator",
    intro:
      "Add a live pricing calculator to your print shop, blog, or resource page. Visitors get an instant estimate; you get a useful tool and a link back to the full app.",
    body: [
      {
        heading: "How to embed",
        paragraphs: [
          "Copy the iframe below into your site. You can also embed printer- or material-specific calculators by changing the src path to /embed/printers/bambu-lab-a1 or /embed/materials/pla.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is embedding free?",
        answer:
          "Yes. Keep the “Open full calculator” / powered-by link so users can save projects and import 3MF files on the main site.",
      },
    ],
    preset: {
      settings: phShopSettings,
      quantity: 100,
      printHours: 5,
      materialType: "PLA",
    },
  },

  // Printers
  {
    section: "printers",
    slug: "bambu-lab-a1",
    title: "Bambu Lab A1 Cost Calculator",
    description:
      "Bambu Lab A1 3D printing cost calculator with typical power draw, filament, and recommended selling price.",
    h1: "Bambu Lab A1 Cost Calculator",
    intro:
      "Estimate what an A1 print actually costs to run—and what you should charge—using sample PLA usage you can edit.",
    body: [
      {
        heading: "A1 pricing notes",
        paragraphs: [
          "Pre-filled with an estimated ~350 W draw and PHP shop rates. Replace grams and hours with your Bambu Studio slice, or import a 3MF in the full calculator.",
        ],
      },
    ],
    faqs: [
      {
        question: "How much does it cost to run a Bambu Lab A1 for 10 hours?",
        answer:
          "Electricity ≈ (350/1000)×10×your ₱/kWh. Add filament, machine rate, and labor for true cost, then apply your service fee for selling price.",
      },
    ],
    preset: bambuBase("Bambu Lab A1", 350),
  },
  {
    section: "printers",
    slug: "bambu-lab-a1-mini",
    title: "Bambu Lab A1 mini Cost Calculator",
    description:
      "Bambu Lab A1 mini print cost and selling price calculator.",
    h1: "Bambu Lab A1 mini Cost Calculator",
    intro:
      "Price A1 mini jobs with filament, electricity, and shop rates tuned for a compact Bambu printer.",
    body: [
      {
        heading: "A1 mini",
        paragraphs: [
          "Uses a lower watt estimate than larger Bambu machines. Edit power watts in Advanced Settings if you have a measured average.",
        ],
      },
    ],
    faqs: [
      {
        question: "Does this support AMS multi-color?",
        answer:
          "Add multiple filament lines for each color, or import a multi-filament 3MF in the signed-in full calculator.",
      },
    ],
    preset: bambuBase("Bambu Lab A1 mini", 200),
  },
  {
    section: "printers",
    slug: "bambu-lab-p1s",
    title: "Bambu Lab P1S Cost Calculator",
    description:
      "Bambu Lab P1S cost calculator for filament, power, and print shop pricing.",
    h1: "Bambu Lab P1S Cost Calculator",
    intro:
      "Built for P1S owners selling prints. Start from the sample PETG-friendly rates and adjust to your spool prices.",
    body: [
      {
        heading: "P1S",
        paragraphs: [
          "Enclosed printers often run hotter materials—swap the material type to PETG, ABS, or ASA and update ₱/kg.",
        ],
      },
    ],
    faqs: [
      {
        question: "How much does a Bambu Lab P1S cost per hour?",
        answer:
          "Combine electricity (watts × rate) with your machine rate/hr. Set machine rate from purchase price ÷ lifespan hours in Advanced Settings.",
      },
    ],
    preset: {
      ...bambuBase("Bambu Lab P1S", 650),
      materialType: "PETG",
      materialLabel: "PETG",
    },
  },
  {
    section: "printers",
    slug: "bambu-lab-x1-carbon",
    title: "Bambu Lab X1 Carbon Cost Calculator",
    description:
      "Bambu Lab X1 Carbon (X1C) 3D print cost and pricing calculator.",
    h1: "Bambu Lab X1 Carbon Cost Calculator",
    intro:
      "Quote X1C jobs with higher typical power draw and engineering filaments when needed.",
    body: [
      {
        heading: "X1 Carbon",
        paragraphs: [
          "Pre-filled for a longer engineering-style print. Change material to PA/CF or ABS as needed and update inventory prices in the full app.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I import X1C 3MF files?",
        answer:
          "Yes. Sign in on the main calculator and upload Bambu Studio plate exports to auto-fill time and filament.",
      },
    ],
    preset: {
      ...bambuBase("Bambu Lab X1 Carbon", 1000),
      quantity: 180,
      printHours: 10,
    },
  },
  {
    section: "printers",
    slug: "bambu-lab-h2s",
    title: "Bambu Lab H2S Cost Calculator",
    description:
      "Bambu Lab H2S cost calculator—estimate filament, electricity, and selling price.",
    h1: "Bambu Lab H2S Cost Calculator",
    intro:
      "How much does it cost to run an H2S? Start here with sample hours and grams, then refine with your slice data.",
    body: [
      {
        heading: "H2S power & pricing",
        paragraphs: [
          "Larger machines mean electricity and machine depreciation matter more. Use Advanced Settings to set purchase price and lifespan for a suggested machine rate.",
        ],
      },
    ],
    faqs: [
      {
        question: "How much does a Bambu Lab H2S cost for 10 hours?",
        answer:
          "Set watts and ₱/kWh for electricity, add filament grams, then include machine and labor. This page seeds a 10-hour example you can edit.",
      },
    ],
    preset: {
      ...bambuBase("Bambu Lab H2S", 1200),
      printHours: 10,
      quantity: 220,
    },
    example: {
      title: "10-hour H2S example",
      lines: ["220 g filament · 10 h · elevated watt estimate"],
    },
  },

  // Materials
  materialPage(
    "pla",
    "PLA",
    "PLA Cost Calculator",
    "PLA filament cost calculator—grams to ₱, plus electricity and recommended selling price.",
    "PLA Cost Calculator",
    "Calculate PLA print cost from grams and price per kilogram. Ideal for decorative and general-purpose FDM jobs.",
    550,
    [
      "PLA is usually the cheapest common filament; still include failure and margin when selling.",
    ],
  ),
  materialPage(
    "petg",
    "PETG",
    "PETG Cost Calculator",
    "PETG filament cost calculator for stronger functional prints.",
    "PETG Cost Calculator",
    "PETG often costs more per kg than PLA and may need slightly more failure buffer for first-layer / adhesion issues.",
    750,
    ["Use PETG for mechanical parts where PLA is too brittle."],
  ),
  materialPage(
    "abs",
    "ABS",
    "ABS Cost Calculator",
    "ABS filament cost calculator with shop rates and selling price.",
    "ABS Cost Calculator",
    "Price ABS jobs including electricity and enclosure-friendly printer time.",
    800,
    ["Factor warping risk into failure percent for ABS."],
  ),
  materialPage(
    "asa",
    "ASA",
    "ASA Cost Calculator",
    "ASA filament cost calculator for outdoor / UV-stable prints.",
    "ASA Cost Calculator",
    "ASA is popular for outdoor parts—price the material premium and print time accordingly.",
    900,
    ["Outdoor products often support higher service fees."],
  ),
  materialPage(
    "tpu",
    "TPU",
    "TPU Cost Calculator",
    "TPU flexible filament cost calculator.",
    "TPU Cost Calculator",
    "TPU prints slower—expect higher machine and electricity cost per gram than PLA.",
    950,
    ["Increase print hours vs PLA for the same model when estimating TPU."],
  ),
];

export const PHILIPPINES_PAGE: Omit<LandingPage, "section" | "slug"> & {
  path: "/philippines";
} = {
  path: "/philippines",
  title: "3D Printing Cost Calculator Philippines",
  description:
    "3D printing cost calculator for the Philippines—₱ rates, typical kWh and filament prices, and recommended selling price.",
  h1: "3D Printing Cost Calculator Philippines",
  intro:
    "How much should you charge for a 3D print in the Philippines? This page pre-fills peso rates for electricity and filament so local makers and small shops can quote with confidence.",
  body: [
    {
      heading: "Built for ₱ pricing",
      paragraphs: [
        "Defaults use Philippine peso, a typical residential/commercial-style ₱/kWh, and common local filament ₱/kg. Edit every field to match your Meralco bill and supplier prices.",
        "Pair this with Bambu Lab printer pages if you run an A1, P1S, X1C, or H2S.",
      ],
    },
  ],
  faqs: [
    {
      question: "What electricity rate should I use in the Philippines?",
      answer:
        "Check your bill’s effective ₱/kWh. This page starts at ₱12/kWh as a simple midpoint—adjust up or down for your area and commercial rates.",
    },
    {
      question: "How much should I charge per hour for 3D printing in PH?",
      answer:
        "Machine rate/hr is separate from labor/hr. Many freelancers combine a modest machine rate with labor for design and post-processing, then add 30–50% service fee.",
    },
  ],
  preset: {
    settings: phShopSettings,
    quantity: 140,
    printHours: 7,
    laborMinutes: 30,
    materialType: "PLA",
    materialLabel: "PLA",
    printerName: "Bambu Lab A1",
    projectName: "PH sample quote",
  },
  example: {
    title: "Philippines sample",
    lines: [
      "₱650/kg PLA · ₱12/kWh · ₱50/hr machine · ₱150/hr labor",
      "40% service fee · 10% failure uplift",
    ],
  },
};

const bySectionSlug = new Map(
  LANDING_PAGES.map((p) => [`${p.section}/${p.slug}`, p] as const),
);

export function getLandingPage(
  section: LandingSection,
  slug: string,
): LandingPage | undefined {
  return bySectionSlug.get(`${section}/${slug}`);
}

export function landingPath(page: Pick<LandingPage, "section" | "slug">): string {
  // Auth inventory lives at /materials — SEO filament tools use /filament/:slug.
  if (page.section === "materials") return `/filament/${page.slug}`;
  return `/${page.section}/${page.slug}`;
}

/** Public indexable paths for sitemap (excludes /login and auth app pages). */
export function publicContentPaths(): string[] {
  const paths = [
    "/",
    "/philippines",
    "/guides",
    "/calculators",
    "/printers",
    "/filament",
  ];
  for (const page of LANDING_PAGES) {
    paths.push(landingPath(page));
  }
  return paths;
}

export function embedSrcPath(
  section?: LandingSection,
  slug?: string,
): string {
  if (section && slug && slug !== "embed") {
    if (section === "materials") return `/embed/filament/${slug}`;
    return `/embed/${section}/${slug}`;
  }
  return "/embed";
}
