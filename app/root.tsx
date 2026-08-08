import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "react-router";

import type { Route } from "./+types/root";
import { AppShell } from "~/components/app-shell";
import { getSession } from "~/lib/session.server";
import {
  SITE_DESCRIPTION,
  SITE_TITLE,
  buildPageMeta,
  faqJsonLd,
  jsonLdScript,
  webAppJsonLd,
  websiteJsonLd,
} from "~/lib/seo";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
  { rel: "manifest", href: "/site.webmanifest" },
];

export function headers() {
  return {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  return {
    origin: new URL(request.url).origin,
    user: session?.user
      ? {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        }
      : null,
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  const origin = loaderData?.origin ?? "";
  return [
    ...buildPageMeta({
      origin,
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      path: "/",
    }),
    jsonLdScript(websiteJsonLd(origin), webAppJsonLd(origin), faqJsonLd()),
  ];
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { user } = useLoaderData<typeof loader>();
  return (
    <AppShell user={user}>
      <Outlet />
    </AppShell>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="font-display text-3xl font-bold">{message}</h1>
      <p className="mt-2 text-[var(--color-ink-muted)]">{details}</p>
      {stack && (
        <pre className="mt-4 w-full overflow-x-auto rounded-lg bg-white/80 p-4 text-sm">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
