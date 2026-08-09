import type { Route } from "./+types/robots.txt";

export async function loader({ request }: Route.LoaderArgs) {
  const origin = new URL(request.url).origin;
  const body = `# ${origin}
User-agent: *
Allow: /
Allow: /calculators
Allow: /printers
Allow: /filament
Allow: /guides
Allow: /philippines
Allow: /favicon.svg
Allow: /og-image.png
Allow: /site.webmanifest

Disallow: /api/
Disallow: /uploads/
Disallow: /logout
Disallow: /login
Disallow: /projects
Disallow: /materials
Disallow: /customers
Disallow: /filaments
Disallow: /clients
Disallow: /quotes
Disallow: /c/
Disallow: /embed

Sitemap: ${origin}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
