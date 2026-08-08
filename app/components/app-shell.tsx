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

const links = [
  { to: "/", label: "Estimator" },
  { to: "/quotes", label: "Quotes", auth: true },
  { to: "/materials", label: "Materials", auth: true },
  { to: "/customers", label: "Customers", auth: true },
];

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

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--color-line)]/80 bg-[rgba(243,246,248,0.85)] backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="font-display text-lg font-extrabold tracking-tight">
            Print Quote
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {visible.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  location.pathname === link.to ||
                    (link.to !== "/" && location.pathname.startsWith(link.to))
                    ? "bg-[rgba(13,143,124,0.12)] text-[var(--color-accent-deep)]"
                    : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="hidden items-center gap-3 sm:flex">
                <div className="text-right text-xs">
                  <p className="font-medium text-[var(--color-ink)]">{user.name}</p>
                  <p className="text-[var(--color-ink-muted)]">{user.email}</p>
                </div>
                <Form method="post" action="/logout">
                  <Button type="submit" variant="secondary" size="sm">
                    <LogOut />
                    Sign out
                  </Button>
                </Form>
              </div>
            ) : (
              <Button asChild size="sm">
                <Link to={`/login?redirectTo=${encodeURIComponent(location.pathname)}`}>
                  Sign in
                </Link>
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
            >
              {open ? <X /> : <Menu />}
            </Button>
          </div>
        </div>

        {open && (
          <div className="border-t border-[var(--color-line)] px-4 py-3 md:hidden">
            <nav className="flex flex-col gap-1">
              {visible.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-ink)]"
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <Form method="post" action="/logout">
                  <Button type="submit" variant="secondary" className="mt-2 w-full">
                    Sign out
                  </Button>
                </Form>
              ) : null}
            </nav>
          </div>
        )}
      </header>
      {children}
    </div>
  );
}
