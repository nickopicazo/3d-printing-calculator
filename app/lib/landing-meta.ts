import type { MetaDescriptor } from "react-router";
import {
  buildPageMeta,
  faqJsonLd,
  jsonLdScript,
  withParentMeta,
} from "~/lib/seo";

export function landingMeta(args: {
  matches: Array<{ meta?: MetaDescriptor[] } | undefined>;
  origin: string;
  path: string;
  title: string;
  description: string;
  faqs: Array<{ question: string; answer: string }>;
}): MetaDescriptor[] {
  return withParentMeta(args.matches, [
    ...buildPageMeta({
      origin: args.origin,
      title: args.title,
      description: args.description,
      path: args.path,
    }),
    jsonLdScript(faqJsonLd(args.faqs)),
  ]);
}

export function noIndexMeta(
  matches: Array<{ meta?: MetaDescriptor[] } | undefined>,
  title: string,
  description: string,
): MetaDescriptor[] {
  return withParentMeta(matches, [
    { title },
    { name: "description", content: description },
    { name: "robots", content: "noindex,nofollow" },
    { name: "googlebot", content: "noindex,nofollow" },
  ]);
}
