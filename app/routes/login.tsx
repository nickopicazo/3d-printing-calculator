import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/login";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { authClient } from "~/lib/auth-client";
import { getSession } from "~/lib/session.server";
import { redirect } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Sign in · Print Quote" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  if (session?.user) {
    const url = new URL(request.url);
    throw redirect(url.searchParams.get("redirectTo") || "/");
  }
  return null;
}

export default function LoginPage() {
  const [params] = useSearchParams();
  const redirectTo = params.get("redirectTo") || "/";

  async function signInGoogle() {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: redirectTo,
    });
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-16">
      <Card className="w-full animate-fade-up">
        <CardHeader>
          <p className="font-display text-sm font-semibold tracking-[0.18em] text-[var(--color-accent-deep)] uppercase">
            Print Quote
          </p>
          <CardTitle className="mt-2 text-3xl">Sign in</CardTitle>
          <CardDescription>
            Use Google to save quotes, manage materials, and keep customer
            projects organized.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button type="button" className="w-full" onClick={() => void signInGoogle()}>
            Continue with Google
          </Button>
          <p className="text-center text-sm text-[var(--color-ink-muted)]">
            Or{" "}
            <Link to="/" className="text-[var(--color-accent-deep)] underline-offset-2 hover:underline">
              keep estimating as a guest
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
