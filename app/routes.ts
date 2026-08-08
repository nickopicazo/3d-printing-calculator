import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),
  route("materials", "routes/materials.tsx"),
  route("customers", "routes/customers.tsx"),
  route("filaments", "routes/filaments.redirect.tsx"),
  route("clients", "routes/clients.redirect.tsx"),
  route("projects", "routes/projects._index.tsx"),
  route("projects/:id", "routes/projects.$id.tsx"),
  route("projects/:id/invoice", "routes/projects.$id.invoice.tsx"),
  route("quotes/*", "routes/quotes.redirect.tsx"),
  route("api/auth/*", "routes/api.auth.$.ts"),
  route("api/projects", "routes/api.projects.ts"),
  route("api/customers", "routes/api.customers.ts"),
  route("uploads/*", "routes/uploads.$.ts"),
  route("robots.txt", "routes/robots.txt.ts"),
  route("sitemap.xml", "routes/sitemap.xml.ts"),
] satisfies RouteConfig;
