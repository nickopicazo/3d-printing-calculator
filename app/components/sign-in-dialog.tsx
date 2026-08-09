import { useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { authClient } from "~/lib/auth-client";
import { SIGN_IN_PARAM, clearSignInSearch } from "~/lib/sign-in";

export function SignInDialog({ loggedIn }: { loggedIn: boolean }) {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const open = !loggedIn && params.get(SIGN_IN_PARAM) === "1";
  const redirectTo =
    params.get("redirectTo") ||
    `${location.pathname}${clearSignInSearch(location.search) || ""}`;

  useEffect(() => {
    if (!loggedIn || params.get(SIGN_IN_PARAM) !== "1") return;
    const search = clearSignInSearch(location.search);
    navigate({ pathname: location.pathname, search }, { replace: true });
  }, [loggedIn, params, location.pathname, location.search, navigate]);

  function handleOpenChange(next: boolean) {
    if (next) return;
    const search = clearSignInSearch(location.search);
    navigate(
      { pathname: location.pathname, search },
      { replace: true },
    );
  }

  async function signInGoogle() {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: redirectTo.startsWith("/") ? redirectTo : "/",
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl sm:text-3xl">Sign In</DialogTitle>
          <DialogDescription>
            Use Google to save projects, manage materials, and keep customers
            organized.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Button
            type="button"
            className="w-full"
            onClick={() => void signInGoogle()}
          >
            Continue With Google
          </Button>
          <p className="text-center text-sm text-[var(--color-ink-muted)]">
            Or{" "}
            <Button
              type="button"
              variant="link"
              className="h-auto p-0"
              onClick={() => handleOpenChange(false)}
            >
              keep estimating as a guest
            </Button>
            .
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
