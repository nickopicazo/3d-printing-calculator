import { Form, Link, useLocation } from "react-router";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
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
  children,
}: {
  user: NavUser;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const visible = links.filter((l) => !l.auth || user);

  function isActive(to: string, match?: string) {
    const path = match ?? to;
    return (
      location.pathname === path ||
      (path !== "/" && location.pathname.startsWith(path))
    );
  }

  return (
    <div className="min-h-screen">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 bg-[var(--color-paper)]/85 backdrop-blur-xl">
        <div className="page-shell !py-3 sm:!py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4 md:gap-6">
              <Link
                to="/"
                className="flex min-w-0 items-center gap-2.5 font-display text-base font-extrabold tracking-tight sm:text-lg"
              >
                <BrandMark />
                <span className="truncate">3D Printing Calculator</span>
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

            <div className="flex items-center gap-2">
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
                      variant="secondary"
                      size="icon"
                      aria-label="Sign Out"
                    >
                      <LogOut />
                    </Button>
                  </Form>
                </div>
              ) : (
                <Button asChild size="sm">
                  <Link
                    to={`/login?redirectTo=${encodeURIComponent(location.pathname)}`}
                  >
                    Sign In
                  </Link>
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
                aria-controls="mobile-nav"
              >
                {open ? <X /> : <Menu />}
              </Button>
            </div>
          </div>
        </div>

        {open && (
          <div
            id="mobile-nav"
            className="border-t border-[var(--color-line)] px-5 py-3 md:hidden"
          >
            <nav aria-label="Mobile" className="flex flex-col gap-1">
              {visible.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-full px-3 py-2 text-sm font-semibold",
                    isActive(link.to, link.match)
                      ? "bg-white text-[var(--color-ink)]"
                      : "text-[var(--color-ink)]",
                  )}
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <Form method="post" action="/logout">
                  <Button type="submit" variant="secondary" className="mt-2 w-full">
                    Sign Out
                  </Button>
                </Form>
              ) : null}
            </nav>
          </div>
        )}
      </header>

      <div id="main-content">{children}</div>

      <footer className="border-t border-[var(--color-line)] bg-white/60">
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
            <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <Link
                to="/"
                className="font-semibold text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                Calculator
              </Link>
              <Link
                to="/login"
                className="font-semibold text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                Sign In
              </Link>
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
