import { Form, Link, useLocation } from "react-router";
import { LogOut, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { FeedbackButton } from "~/components/feedback-button";
import { SignInDialog } from "~/components/sign-in-dialog";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { withSignInSearch } from "~/lib/sign-in";
import { cn } from "~/lib/utils";

export type NavUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
} | null;

const links: Array<{
  to: string;
  label: string;
  auth?: boolean;
  match?: string;
}> = [
  { to: "/?new=1", label: "Calculator", match: "/" },
  { to: "/projects", label: "Projects", auth: true },
  { to: "/materials", label: "Materials", auth: true },
  { to: "/customers", label: "Customers", auth: true },
];

function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src="/favicon.svg"
      alt=""
      width={32}
      height={32}
      className={cn("size-8 shrink-0 rounded-xl", className)}
      role="presentation"
      decoding="async"
    />
  );
}

export function AppShell({
  user,
  userJotProjectId,
  children,
}: {
  user: NavUser;
  userJotProjectId?: string;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const visible = links.filter((l) => !l.auth || user);
  const feedbackUser = user
    ? { id: user.id, name: user.name, email: user.email }
    : null;

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  function isActive(to: string, match?: string) {
    const path = match ?? to;
    return (
      location.pathname === path ||
      (path !== "/" && location.pathname.startsWith(path))
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 shrink-0 border-b border-[var(--color-line)] bg-white">
        <div className="page-shell !py-3 sm:!py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex min-w-0 items-center gap-3 md:gap-6">
              <Link
                to="/"
                className="flex min-w-0 items-center gap-2 font-display text-base font-extrabold tracking-tight sm:gap-2.5 sm:text-lg"
              >
                <BrandMark />
                <span className="truncate">
                  <span className="sm:hidden">3D Calculator</span>
                  <span className="hidden sm:inline">
                    3D Printing Calculator
                  </span>
                </span>
              </Link>

              <nav
                aria-label="Primary"
                className="hidden items-center gap-1 rounded-full bg-white/80 p-1 shadow-[0_4px_20px_rgba(22,22,26,0.04)] ring-1 ring-[var(--color-line)] md:flex"
              >
                {visible.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                      isActive(link.to, link.match)
                        ? "bg-[var(--color-paper)] text-[var(--color-ink)] shadow-sm"
                        : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]",
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {userJotProjectId ? (
                <FeedbackButton
                  projectId={userJotProjectId}
                  user={feedbackUser}
                  className="hidden sm:inline-flex"
                />
              ) : null}
              {user ? (
                <div className="hidden items-center gap-3 sm:flex">
                  <div className="text-right text-xs">
                    <p className="font-semibold text-[var(--color-ink)]">
                      {user.name}
                    </p>
                    <p className="text-[var(--color-ink-muted)]">{user.email}</p>
                  </div>
                  {user.image ? (
                    <img
                      src={user.image}
                      alt=""
                      width={40}
                      height={40}
                      className="size-10 rounded-full object-cover ring-2 ring-white"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex size-10 items-center justify-center rounded-full bg-[var(--color-accent)] text-sm font-bold text-white">
                      {user.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <Form method="post" action="/logout">
                    <Button
                      type="submit"
                      variant="outline"
                      size="icon"
                      aria-label="Sign Out"
                    >
                      <LogOut />
                    </Button>
                  </Form>
                </div>
              ) : (
                <Button asChild size="sm" className="hidden sm:inline-flex">
                  <Link to={{ search: withSignInSearch(location.search) }}>
                    Sign In
                  </Link>
                </Button>
              )}

              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 md:hidden [&_svg]:size-6"
                    aria-label="Open menu"
                    aria-controls="mobile-nav"
                  >
                    <Menu strokeWidth={2.25} />
                  </Button>
                </SheetTrigger>
                <SheetContent id="mobile-nav" side="right">
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                    <SheetDescription className="sr-only">
                      Site navigation
                    </SheetDescription>
                  </SheetHeader>

                  {user ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)]/70 p-3">
                      {user.image ? (
                        <img
                          src={user.image}
                          alt=""
                          width={40}
                          height={40}
                          className="size-10 rounded-full object-cover ring-2 ring-white"
                          decoding="async"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex size-10 items-center justify-center rounded-full bg-[var(--color-accent)] text-sm font-bold text-white">
                          {user.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[var(--color-ink)]">
                          {user.name}
                        </p>
                        <p className="truncate text-xs text-[var(--color-ink-muted)]">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <nav aria-label="Mobile" className="flex flex-col gap-1">
                    {visible.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "rounded-xl px-3 py-3 text-base font-semibold transition-colors",
                          isActive(link.to, link.match)
                            ? "bg-[var(--color-paper)] text-[var(--color-ink)]"
                            : "text-[var(--color-ink)] hover:bg-[var(--color-paper)]",
                        )}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </nav>

                  <SheetFooter>
                    {userJotProjectId ? (
                      <FeedbackButton
                        projectId={userJotProjectId}
                        user={feedbackUser}
                        fullWidth
                      />
                    ) : null}
                    {user ? (
                      <Form method="post" action="/logout">
                        <Button
                          type="submit"
                          variant="outline"
                          className="w-full"
                        >
                          <LogOut />
                          Sign Out
                        </Button>
                      </Form>
                    ) : (
                      <Button asChild className="w-full">
                        <Link
                          to={{ search: withSignInSearch(location.search) }}
                          onClick={() => setOpen(false)}
                        >
                          Sign In
                        </Link>
                      </Button>
                    )}
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <div id="main-content" className="flex-1">
        {children}
      </div>

      <SignInDialog loggedIn={Boolean(user)} />

      <footer className="mt-auto shrink-0 border-t border-[var(--color-line)] bg-white/60">
        <div className="page-shell !py-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-md space-y-2">
              <p className="flex items-center gap-2 font-display text-sm font-extrabold">
                <BrandMark className="size-6" />
                3D Printing Calculator
              </p>
              <p className="text-sm text-[var(--color-ink-muted)]">
                Free FDM and SLA cost estimator for filament, resin, machine
                time, labor, electricity, and printable quotes.
              </p>
            </div>
            <nav
              aria-label="Footer"
              className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"
            >
              <Link
                to="/"
                className="font-semibold text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                Calculator
              </Link>
              {userJotProjectId ? (
                <FeedbackButton
                  projectId={userJotProjectId}
                  user={feedbackUser}
                  variant="ghost"
                  size="sm"
                  className="-ml-2 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                />
              ) : null}
              {user ? null : (
                <Link
                  to={{ search: withSignInSearch(location.search) }}
                  className="font-semibold text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                >
                  Sign In
                </Link>
              )}
            </nav>
          </div>
          <p className="mt-6 text-xs text-[var(--color-ink-muted)]">
            ©{" "}
            <span suppressHydrationWarning>{new Date().getFullYear()}</span> 3D
            Printing Calculator. Estimate accurately. Price confidently.
          </p>
        </div>
      </footer>
    </div>
  );
}
