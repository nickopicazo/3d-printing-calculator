import { data } from "react-router";
import type { Route } from "./+types/printers.$slug";
import { LandingPageView } from "~/components/landing/landing-page-view";
import { getLandingPage } from "~/lib/landing-pages";
import { landingMeta } from "~/lib/landing-meta";

export async function loader({ params, request }: Route.LoaderArgs) {
  const page = getLandingPage("printers", params.slug);
  if (!page) {
    throw data(null, { status: 404 });
  }
  return {
    page,
    origin: new URL(request.url).origin,
  };
}

export function meta({ loaderData, matches, location }: Route.MetaArgs) {
  const page = loaderData?.page;
  if (!page) return [{ title: "Not found" }];
  return landingMeta({
    matches,
    origin: loaderData.origin,
    path: location.pathname,
    title: page.title,
    description: page.description,
    faqs: page.faqs,
  });
}

export default function PrintersSlug({ loaderData }: Route.ComponentProps) {
  return <LandingPageView page={loaderData.page} origin={loaderData.origin} />;
}
