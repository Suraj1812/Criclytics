import { AnimatePresence, motion } from "framer-motion";
import { startTransition, useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Menu, MoonStar, Search, SunMedium, X } from "lucide-react";
import { CriclyticsLogo } from "@/components/shared/CriclyticsLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";

const NAV_ITEMS = [
  { to: "/live", label: "Live" },
  { to: "/upcoming", label: "Upcoming" },
  { to: "/completed", label: "Completed" }
] as const;

const FILTER_ROUTES = new Set(["/", "/live", "/upcoming", "/completed", "/media"]);

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const targetPath = FILTER_ROUTES.has(location.pathname) ? location.pathname : "/";
    const nextParams = new URLSearchParams(targetPath === location.pathname ? searchParams : undefined);
    const nextQuery = query.trim();

    if (nextQuery) {
      nextParams.set("q", nextQuery);
    } else {
      nextParams.delete("q");
    }

    startTransition(() => {
      navigate({
        pathname: targetPath,
        search: nextParams.toString() ? `?${nextParams.toString()}` : ""
      });
    });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container py-4">
        <div className="flex min-w-0 items-center justify-between gap-4 lg:gap-6">
          <Link className="flex min-w-0 items-center gap-3" to="/">
            <div className="rounded-2xl bg-primary/10 p-1 shadow-soft ring-1 ring-primary/15">
              <CriclyticsLogo />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold tracking-tight">Criclytics</p>
              <p className="truncate text-[10px] uppercase tracking-[0.28em] text-muted-foreground sm:text-xs">Live cricket intelligence</p>
            </div>
          </Link>

          <div className="hidden min-w-0 flex-1 items-center justify-end gap-3 lg:flex">
            <nav className="flex items-center gap-1 rounded-2xl border border-border/70 bg-card/70 p-1 shadow-soft">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  className={({ isActive }) =>
                    cn(
                      "rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                      isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )
                  }
                  key={item.to}
                  to={buildNavTarget(item.to, searchParams)}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <form className="relative w-full max-w-sm xl:max-w-md" onSubmit={handleSubmit}>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9 pr-4"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search teams, venue, toss, result"
                value={query}
              />
            </form>

            <Button aria-label="Toggle dark mode" onClick={toggleTheme} size="icon" type="button" variant="ghost">
              {theme === "dark" ? <SunMedium className="h-5 w-5" /> : <MoonStar className="h-5 w-5" />}
            </Button>
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            <Button aria-label="Toggle dark mode" className="lg:hidden" onClick={toggleTheme} size="icon" type="button" variant="ghost">
              {theme === "dark" ? <SunMedium className="h-5 w-5" /> : <MoonStar className="h-5 w-5" />}
            </Button>
            <Button
              aria-controls="mobile-nav-panel"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              className="lg:hidden"
              onClick={() => setMobileMenuOpen((open) => !open)}
              size="icon"
              type="button"
              variant="ghost"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-3 lg:hidden">
          <form className="relative min-w-0 w-full" onSubmit={handleSubmit}>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 pr-4"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search teams, venue, toss, result"
              value={query}
            />
          </form>

          <AnimatePresence initial={false}>
            {mobileMenuOpen ? (
              <motion.div
                animate={{ opacity: 1, height: "auto", y: 0 }}
                className="overflow-hidden rounded-2xl border border-border/70 bg-card/85 shadow-soft"
                exit={{ opacity: 0, height: 0, y: -6 }}
                id="mobile-nav-panel"
                initial={{ opacity: 0, height: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <div className="grid gap-2 p-3">
                  {NAV_ITEMS.map((item) => (
                    <NavLink
                      className={({ isActive }) =>
                        cn(
                          "rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
                          isActive ? "bg-foreground text-background" : "bg-background/70 text-foreground hover:bg-secondary"
                        )
                      }
                      key={item.to}
                      to={buildNavTarget(item.to, searchParams)}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

function buildNavTarget(pathname: string, searchParams: URLSearchParams) {
  const nextParams = new URLSearchParams();
  const query = searchParams.get("q");
  const series = searchParams.get("series");

  if (query) {
    nextParams.set("q", query);
  }

  if (series) {
    nextParams.set("series", series);
  }

  return {
    pathname,
    search: nextParams.toString() ? `?${nextParams.toString()}` : ""
  };
}
