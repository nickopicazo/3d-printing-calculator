import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),
  route("filaments", "routes/filaments.tsx"),
  route("clients", "routes/clients.tsx"),
  route("quotes", "routes/quotes._index.tsx"),
  route("quotes/:id", "routes/quotes.$id.tsx"),
  route("api/auth/*", "routes/api.auth.$.ts"),
  route("api/quotes", "routes/api.quotes.ts"),
  route("uploads/*", "routes/uploads.$.ts"),
] satisfies RouteConfig;
