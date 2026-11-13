import { startTransition, useEffect, useState } from "react";
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { Moon, Search, Sun, X } from "lucide-react";
import { CriclyticsLogo } from "@/components/shared/CriclyticsLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/hooks/use-theme";

const NAV_ITEMS = [
  { to: "/", label: "Overview" },
  { to: "/live", label: "Live scores" },
  { to: "/upcoming", label: "Schedule" },
  { to: "/completed", label: "Results" },
  { to: "/media", label: "The clubhouse" },
];
const FILTER_ROUTES = new Set(NAV_ITEMS.map((item) => item.to));

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const pathname = FILTER_ROUTES.has(location.pathname)
      ? location.pathname
      : "/";
    const params = new URLSearchParams(
      FILTER_ROUTES.has(location.pathname) ? searchParams : undefined,
    );
    if (query.trim()) params.set("q", query.trim());
    else params.delete("q");
    startTransition(() => navigate({ pathname, search: params.toString() }));
  }
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="container hidden items-center justify-between border-b border-border/60 py-2 md:flex">
        <span className="eyebrow !text-[9px]">
          An everyday companion to cricket
        </span>
        <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Across
          grounds. Around the world.
        </span>
      </div>
      <div className="container flex h-[76px] items-center gap-8">
        <Link aria-label="Cric Lytics home" className="shrink-0" to="/">
          <CriclyticsLogo className="!h-11 !w-11" />
        </Link>
        <nav
          aria-label="Main navigation"
          className="hidden h-full items-center gap-7 lg:flex"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              end={item.to === "/"}
              key={item.to}
              to={buildNavTarget(item.to, searchParams)}
              className={({ isActive }) =>
                `site-nav-link ${isActive ? "active" : ""}`
              }
            >
              {item.to === "/live" && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              )}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <form
            className="relative hidden w-60 xl:w-64 lg:block"
            onSubmit={handleSubmit}
            role="search"
          >
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search cricket"
              className="h-9 border-border bg-secondary/40 pl-9 text-xs"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search teams, matches, stories"
              value={query}
            />
          </form>
          <Button
            aria-label={searchOpen ? "Close search" : "Open search"}
            aria-expanded={searchOpen}
            aria-controls="mobile-search"
            className="lg:hidden"
            onClick={() => setSearchOpen(!searchOpen)}
            size="icon"
            variant="ghost"
          >
            {searchOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
          <Button
            aria-label="Toggle dark mode"
            onClick={toggleTheme}
            size="icon"
            variant="ghost"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      {searchOpen && (
        <form
          id="mobile-search"
          className="container pb-3 lg:hidden"
          onSubmit={handleSubmit}
          role="search"
        >
          <Input
            autoFocus
            aria-label="Search cricket"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search teams, matches, stories"
            value={query}
          />
        </form>
      )}
      <nav
        aria-label="Mobile navigation"
        className="container flex gap-6 overflow-x-auto lg:hidden"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            end={item.to === "/"}
            key={item.to}
            to={buildNavTarget(item.to, searchParams)}
            className={({ isActive }) =>
              `site-nav-link !h-11 !text-xs ${isActive ? "active" : ""}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
function buildNavTarget(pathname: string, params: URLSearchParams) {
  const next = new URLSearchParams();
  for (const key of ["q", "series"]) {
    const value = params.get(key);
    if (value) next.set(key, value);
  }
  return { pathname, search: next.toString() };
}
