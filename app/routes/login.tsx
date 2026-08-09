import { redirect } from "react-router";
import type { Route } from "./+types/login";
import { getSession } from "~/lib/session.server";
import { signInLocation } from "~/lib/sign-in";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("redirectTo") || "/";
  const session = await getSession(request);
  if (session?.user) {
    throw redirect(redirectTo);
  }
  throw redirect(signInLocation(redirectTo));
}
