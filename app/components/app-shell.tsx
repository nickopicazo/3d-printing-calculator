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
  { to: "/", label: "Calculator" },
  { to: "/projects", label: "Projects", auth: true },
  { to: "/materials", label: "Materials", auth: true },
  { to: "/customers", label: "Customers", auth: true },
];

function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)] text-white shadow-[0_6px_16px_rgba(124,92,255,0.35)]",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none">
        <path
          d="M5 17.5 12 4l7 13.5H5Z"
          fill="currentColor"
          opacity="0.95"
        />
        <path d="M9.2 14.2h5.6L12 8.6 9.2 14.2Z" fill="#C6F04D" />
      </svg>
    </span>
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

  function isActive(to: string) {
    return (
      location.pathname === to ||
      (to !== "/" && location.pathname.startsWith(to))
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-[var(--color-paper)]/85 backdrop-blur-xl">
        <div className="page-shell !py-3 sm:!py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4 md:gap-6">
              <Link
                to="/"
                className="flex items-center gap-2.5 font-display text-lg font-extrabold tracking-tight"
              >
                <BrandMark />
                <span>PrintCost</span>
              </Link>

              <nav className="hidden items-center gap-1 rounded-full bg-white/80 p-1 shadow-[0_4px_20px_rgba(22,22,26,0.04)] ring-1 ring-[var(--color-line)] md:flex">
                {visible.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                      isActive(link.to)
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
                      className="size-10 rounded-full object-cover ring-2 ring-white"
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
                aria-label="Menu"
              >
                {open ? <X /> : <Menu />}
              </Button>
            </div>
          </div>
        </div>

        {open && (
          <div className="border-t border-[var(--color-line)] px-5 py-3 md:hidden">
            <nav className="flex flex-col gap-1">
              {visible.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-full px-3 py-2 text-sm font-semibold",
                    isActive(link.to)
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
      {children}
    </div>
  );
}
