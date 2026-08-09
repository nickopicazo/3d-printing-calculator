import type { Route } from "./+types/philippines";
import { LandingPageView } from "~/components/landing/landing-page-view";
import { PHILIPPINES_PAGE } from "~/lib/landing-pages";
import { landingMeta } from "~/lib/landing-meta";
import type { LandingPage } from "~/lib/landing-pages";

export async function loader({ request }: Route.LoaderArgs) {
  return { origin: new URL(request.url).origin };
}

export function meta({ loaderData, matches }: Route.MetaArgs) {
  return landingMeta({
    matches,
    origin: loaderData?.origin ?? "",
    path: "/philippines",
    title: PHILIPPINES_PAGE.title,
    description: PHILIPPINES_PAGE.description,
    faqs: PHILIPPINES_PAGE.faqs,
  });
}

export default function PhilippinesPage({ loaderData }: Route.ComponentProps) {
  const page: LandingPage = {
    section: "calculators",
    slug: "philippines",
    title: PHILIPPINES_PAGE.title,
    description: PHILIPPINES_PAGE.description,
    h1: PHILIPPINES_PAGE.h1,
    intro: PHILIPPINES_PAGE.intro,
    body: PHILIPPINES_PAGE.body,
    faqs: PHILIPPINES_PAGE.faqs,
    preset: PHILIPPINES_PAGE.preset,
    example: PHILIPPINES_PAGE.example,
  };
  return <LandingPageView page={page} origin={loaderData.origin} />;
}
