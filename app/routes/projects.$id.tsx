import { redirect } from "react-router";
import type { Route } from "./+types/projects.$id";
import { requireUser } from "~/lib/session.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);
  const id = params.id;
  if (!id) throw new Response("Not found", { status: 404 });
  throw redirect(`/?projectId=${id}`);
}
