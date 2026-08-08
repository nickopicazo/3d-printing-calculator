import { redirect } from "react-router";
import type { Route } from "./+types/logout";
import { auth } from "~/lib/auth.server";

export async function action({ request }: Route.ActionArgs) {
  const response = await auth.handler(
    new Request(new URL("/api/auth/sign-out", request.url), {
      method: "POST",
      headers: request.headers,
    }),
  );
  const headers = new Headers(response.headers);
  return redirect("/", { headers });
}

export async function loader() {
  return redirect("/");
}
