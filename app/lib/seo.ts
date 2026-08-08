import type { MetaDescriptor } from "react-router";

export const SITE_NAME = "3D Printing Calculator";
export const SITE_TAGLINE = "Accurate Cost Estimation";
export const SITE_TITLE = `${SITE_NAME} - ${SITE_TAGLINE}`;
export const SITE_DESCRIPTION =
  "Calculate filament consumption, electricity, and print costs in seconds. Free FDM and SLA cost estimator for 3D printing shops and makers.";

export const OG_IMAGE_PATH = "/og-image.png";

/** Public paths included in the sitemap (auth-gated app pages stay noindex). */
export const PUBLIC_PATHS = ["/", "/login"] as const;

export function absoluteUrl(origin: string, path: string): string {
  const base = origin.replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

export function withParentMeta(
  matches: Array<{ meta?: MetaDescriptor[] } | undefined>,
  pageMeta: MetaDescriptor[],
): MetaDescriptor[] {
  const parentMeta = matches
    .slice(0, -1)
    .flatMap((match) => match?.meta ?? []);
  const pageHasTitle = pageMeta.some((tag) => tag && "title" in tag);
  const pageHasDescription = pageMeta.some(
    (tag) =>
      tag && "name" in tag && (tag as { name?: string }).name === "description",
  );
  const pageHasRobots = pageMeta.some(
    (tag) =>
      tag &&
      "name" in tag &&
      ((tag as { name?: string }).name === "robots" ||
        (tag as { name?: string }).name === "googlebot"),
  );

  const filtered = parentMeta.filter((tag) => {
    if (!tag) return false;
    if (pageHasTitle && "title" in tag) return false;
    if (
      pageHasDescription &&
      "name" in tag &&
      (tag as { name?: string }).name === "description"
    ) {
      return false;
    }
    if (
      pageHasRobots &&
      "name" in tag &&
      ((tag as { name?: string }).name === "robots" ||
        (tag as { name?: string }).name === "googlebot")
    ) {
      return false;
    }
    return true;
  });

  return [...filtered, ...pageMeta];
}

type PageSeoInput = {
  origin: string;
  title: string;
  description: string;
  path: string;
  /** Defaults to index,follow for public marketing pages */
  robots?: string;
  imagePath?: string;
  type?: "website" | "article";
};

export function buildPageMeta({
  origin,
  title,
  description,
  path,
  robots = "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
  imagePath = OG_IMAGE_PATH,
  type = "website",
}: PageSeoInput): MetaDescriptor[] {
  const url = absoluteUrl(origin, path);
  const image = absoluteUrl(origin, imagePath);
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} · ${SITE_NAME}`;

  return [
    { title: fullTitle },
    { name: "description", content: description },
    { name: "robots", content: robots },
    { name: "googlebot", content: robots },
    { name: "theme-color", content: "#0F172A" },
    { name: "application-name", content: SITE_NAME },
    { name: "author", content: SITE_NAME },
    { name: "keywords", content: "3D printing calculator, filament cost calculator, FDM cost estimator, SLA resin calculator, print cost estimator, 3D print pricing" },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:locale", content: "en_US" },
    { property: "og:type", content: type },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { property: "og:image:type", content: "image/png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: SITE_TITLE },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
    { name: "twitter:image:alt", content: SITE_TITLE },
  ];
}

export function webAppJsonLd(origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: absoluteUrl(origin, "/"),
    description: SITE_DESCRIPTION,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "FDM filament cost estimation",
      "SLA resin cost estimation",
      "G-code and 3MF import",
      "Machine, labor, and electricity costs",
      "VAT and service fee pricing",
      "Printable quotes and invoices",
    ],
    image: absoluteUrl(origin, OG_IMAGE_PATH),
    screenshot: absoluteUrl(origin, OG_IMAGE_PATH),
  };
}

export function websiteJsonLd(origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl(origin, "/"),
    description: SITE_DESCRIPTION,
    potentialAction: {
      "@type": "UseAction",
      target: absoluteUrl(origin, "/"),
    },
  };
}

export function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do I calculate 3D printing cost?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Enter material usage (grams or millilitres), print time, and your rates for machine time, labor, electricity, and markup. The calculator totals material, hardware, packaging, labor, machine, and electricity costs with optional VAT.",
        },
      },
      {
        "@type": "Question",
        name: "Does this work for FDM and SLA printers?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Switch each print between FDM (filament by weight) and SLA (resin by volume) and price materials from your inventory or custom rates.",
        },
      },
      {
        "@type": "Question",
        name: "Can I import Bambu Studio or OrcaSlicer files?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Upload 3MF or G-code exports to auto-fill filament weight, resin volume, and print time from slicer metadata.",
        },
      },
    ],
  };
}

export function jsonLdScript(
  ...graphs: Record<string, unknown>[]
): MetaDescriptor {
  if (graphs.length === 1) {
    return { "script:ld+json": graphs[0] };
  }
  return {
    "script:ld+json": {
      "@context": "https://schema.org",
      "@graph": graphs.map((graph) => {
        const { ["@context"]: _ctx, ...rest } = graph;
        return rest;
      }),
    },
  };
}
