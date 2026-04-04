import { useDeferredValue } from "react";
import { BarChart3, Radio, RefreshCw } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { MatchGrid } from "@/components/dashboard/MatchGrid";
import { ErrorPanel } from "@/components/shared/ErrorPanel";
import { FeedHealthBanner } from "@/components/shared/FeedHealthBanner";
import { LoadingCardGrid } from "@/components/shared/LoadingCardGrid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardQuery } from "@/hooks/use-dashboard-query";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useRuntimeState } from "@/hooks/use-runtime-state";
import {
  filterMatches,
  formatRelativeUpdate,
  formatSeriesLabel,
  getStatusDescription,
  getStatusEmptyMessage,
  getStatusLabel
} from "@/lib/formatters";
import { getErrorMessage } from "@/lib/error-utils";
import { buildCollectionPageSchema } from "@/lib/seo";
import type { MatchStatus } from "@/types/cricket";

export function MatchesPage({ status }: { status: MatchStatus }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const seriesParam = searchParams.get("series");
  const deferredQuery = useDeferredValue(searchParams.get("q") ?? "");
  const query = useDashboardQuery(seriesParam, status);
  const runtime = useRuntimeState();
  const routePath = `/${status}`;
  const routeLabel = getStatusLabel(status);
  const isTransitionLoading = query.isFetching && query.isPlaceholderData;

  usePageMetadata({
    title: `${routeLabel} Cricket Matches`,
    description: `${routeLabel} cricket matches with direct URLs, stable scorecards, venue data, and route-level filtering inside Criclytics.`,
    path: routePath,
    keywords: [`${routeLabel.toLowerCase()} cricket matches`, "cricket schedule", "cricket match route", "Criclytics"],
    jsonLd: buildCollectionPageSchema({
      name: `${routeLabel} cricket matches`,
      description: `${routeLabel} cricket matches with route-based navigation and real score data in Criclytics.`,
      path: routePath
    })
  });

  if ((query.isPending && !query.data) || isTransitionLoading) {
    return <LoadingCardGrid count={8} page />;
  }

  if (!query.data) {
    return (
      <ErrorPanel
        message={getErrorMessage(query.error, "Something went wrong while loading this route.")}
        onRetry={() => void query.refetch()}
        title={`Unable to load ${getStatusLabel(status).toLowerCase()} matches`}
      />
    );
  }

  const matches = filterMatches(query.data[status], deferredQuery);

  return (
    <div className="space-y-8">
      <section className="lg:hidden">
        <Card className="rounded-[28px]">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">{routeLabel}</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight">{getStatusDescription(status)}</h1>
              </div>
              <Button onClick={() => void query.refetch()} size="icon" type="button" variant="outline">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <StatusRouteLink active={status === "live"} compact href={buildRouteWithParams("/live", searchParams)} label="Live" />
              <StatusRouteLink active={status === "upcoming"} compact href={buildRouteWithParams("/upcoming", searchParams)} label="Upcoming" />
              <StatusRouteLink active={status === "completed"} compact href={buildRouteWithParams("/completed", searchParams)} label="Completed" />
            </div>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Series</span>
              <select
                className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) => {
                  const nextParams = new URLSearchParams(searchParams);
                  const nextValue = event.target.value;

                  if (nextValue === "__default__") {
                    nextParams.delete("series");
                  } else {
                    nextParams.set("series", nextValue);
                  }

                  setSearchParams(nextParams, { replace: true });
                }}
                value={seriesParam ?? "__default__"}
              >
                <option value="__default__">Default feed</option>
                <option value="all">All series</option>
                {query.data.seriesOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.count})
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-2 sm:grid-cols-3">
              <InfoRow icon={BarChart3} label="Visible" value={`${matches.length} matches`} />
              <InfoRow icon={Radio} label="Coverage" value={formatSeriesLabel(query.data.appliedSeriesFilter || "all")} />
              <InfoRow icon={RefreshCw} label="Updated" value={formatRelativeUpdate(query.data.fetchedAt)} />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="hidden gap-4 lg:grid lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
        <Card className="self-start rounded-3xl">
          <CardContent className="p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-muted-foreground">{getStatusLabel(status)} route</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{getStatusLabel(status)} matches in a stable, direct URL view.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{getStatusDescription(status)}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <StatusRouteLink active={status === "live"} href={buildRouteWithParams("/live", searchParams)} label="Live" />
              <StatusRouteLink active={status === "upcoming"} href={buildRouteWithParams("/upcoming", searchParams)} label="Upcoming" />
              <StatusRouteLink active={status === "completed"} href={buildRouteWithParams("/completed", searchParams)} label="Completed" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>View controls</CardTitle>
            <CardDescription>Keep the route stable while changing series, with route-specific fetches and cached recovery.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Series</span>
              <select
                className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) => {
                  const nextParams = new URLSearchParams(searchParams);
                  const nextValue = event.target.value;

                  if (nextValue === "__default__") {
                    nextParams.delete("series");
                  } else {
                    nextParams.set("series", nextValue);
                  }

                  setSearchParams(nextParams, { replace: true });
                }}
                value={seriesParam ?? "__default__"}
              >
                <option value="__default__">Default feed</option>
                <option value="all">All series</option>
                {query.data.seriesOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.count})
                  </option>
                ))}
              </select>
            </label>

            <InfoRow icon={BarChart3} label="Visible" value={`${matches.length} matches`} />
            <InfoRow icon={Radio} label="Coverage" value={formatSeriesLabel(query.data.appliedSeriesFilter || "all")} />
            <InfoRow icon={RefreshCw} label="Updated" value={formatRelativeUpdate(query.data.fetchedAt)} />
          </CardContent>
        </Card>
      </section>

      <FeedHealthBanner
        cacheAgeSeconds={query.data.cacheAgeSeconds}
        fallbackMessage={query.data.fallbackMessage}
        isFetching={query.isFetching}
        isOnline={runtime.isOnline}
        isStale={query.data.isStale}
        isVisible={runtime.isVisible}
        refreshIntervalSeconds={query.data.refreshIntervalSeconds}
      />

      {query.error ? <ErrorPanel compact message={getErrorMessage(query.error, "Something went wrong while loading this route.")} onRetry={() => void query.refetch()} title="Feed warning" /> : null}

      <MatchGrid
        emptyDescription={getStatusEmptyMessage(status)}
        emptyTitle={`No ${getStatusLabel(status).toLowerCase()} matches`}
        matches={matches}
      />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-secondary/40 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold leading-6">{value}</p>
    </div>
  );
}

function StatusRouteLink({ href, label, active, compact = false }: { href: string; label: string; active: boolean; compact?: boolean }) {
  return (
    <Button asChild size={compact ? "sm" : "default"} variant={active ? "default" : "outline"}>
      <Link to={href}>{label}</Link>
    </Button>
  );
}

function buildRouteWithParams(pathname: string, searchParams: URLSearchParams) {
  const nextParams = new URLSearchParams();

  for (const key of ["q", "series"]) {
    const value = searchParams.get(key);

    if (value) {
      nextParams.set(key, value);
    }
  }

  return `${pathname}${nextParams.toString() ? `?${nextParams.toString()}` : ""}`;
}
