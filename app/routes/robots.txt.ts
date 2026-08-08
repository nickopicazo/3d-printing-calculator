import type { Route } from "./+types/robots.txt";

export async function loader({ request }: Route.LoaderArgs) {
  const origin = new URL(request.url).origin;
  const body = `# ${origin}
User-agent: *
Allow: /
Allow: /login
Allow: /favicon.svg
Allow: /og-image.png
Allow: /site.webmanifest

Disallow: /api/
Disallow: /uploads/
Disallow: /logout
Disallow: /projects
Disallow: /materials
Disallow: /customers
Disallow: /filaments
Disallow: /clients
Disallow: /quotes

Sitemap: ${origin}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
