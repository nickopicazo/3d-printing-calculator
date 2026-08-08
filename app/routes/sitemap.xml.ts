import type { Route } from "./+types/sitemap.xml";
import { PUBLIC_PATHS, absoluteUrl } from "~/lib/seo";

export async function loader({ request }: Route.LoaderArgs) {
  const origin = new URL(request.url).origin;
  const lastmod = new Date().toISOString().slice(0, 10);

  const urls = PUBLIC_PATHS.map((path) => {
    const loc = absoluteUrl(origin, path);
    const priority = path === "/" ? "1.0" : "0.6";
    const changefreq = path === "/" ? "weekly" : "monthly";
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
