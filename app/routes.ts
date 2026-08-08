import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),
  route("materials", "routes/materials.tsx"),
  route("customers", "routes/customers.tsx"),
  route("filaments", "routes/filaments.redirect.tsx"),
  route("clients", "routes/clients.redirect.tsx"),
  route("quotes", "routes/quotes._index.tsx"),
  route("quotes/:id", "routes/quotes.$id.tsx"),
  route("quotes/:id/invoice", "routes/quotes.$id.invoice.tsx"),
  route("api/auth/*", "routes/api.auth.$.ts"),
  route("api/quotes", "routes/api.quotes.ts"),
  route("api/projects", "routes/api.projects.ts"),
  route("api/customers", "routes/api.customers.ts"),
  route("uploads/*", "routes/uploads.$.ts"),
] satisfies RouteConfig;
