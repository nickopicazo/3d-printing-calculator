import { redirect } from "react-router";
import { auth } from "./auth.server";
import { signInLocation } from "./sign-in";

export async function getSession(request: Request) {
  try {
    return await auth.api.getSession({ headers: request.headers });
  } catch (error) {
    console.warn("Session lookup failed (is DATABASE_URL configured?):", error);
    return null;
  }
}

export async function requireUser(request: Request) {
  const session = await getSession(request);
  if (!session?.user) {
    throw redirect(signInLocation(new URL(request.url).pathname));
  }
  return session;
}

export function newId(): string {
  return crypto.randomUUID();
}
