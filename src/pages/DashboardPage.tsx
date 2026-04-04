import { useDeferredValue } from "react";
import { Activity, CalendarDays, Film, MapPin, RefreshCw, Trophy, Waves } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { MatchSection } from "@/components/dashboard/MatchSection";
import { ErrorPanel } from "@/components/shared/ErrorPanel";
import { FeedHealthBanner } from "@/components/shared/FeedHealthBanner";
import { LoadingCardGrid } from "@/components/shared/LoadingCardGrid";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TeamAvatar } from "@/components/shared/TeamAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDashboardQuery } from "@/hooks/use-dashboard-query";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useRuntimeState } from "@/hooks/use-runtime-state";
import {
  filterMatches,
  formatMatchDate,
  formatMatchStatusText,
  formatMatchSummaryText,
  formatRelativeUpdate,
  formatSeriesLabel,
  formatVenue,
  getStatusDescription,
  getStatusEmptyMessage,
  getLocalTimeZoneLabel
} from "@/lib/formatters";
import { getErrorMessage } from "@/lib/error-utils";
import { buildCollectionPageSchema, buildWebsiteSchema } from "@/lib/seo";
import { cn } from "@/lib/utils";
import type { MatchSummary } from "@/types/cricket";

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const seriesParam = searchParams.get("series");
  const deferredQuery = useDeferredValue(searchParams.get("q") ?? "");
  const query = useDashboardQuery(seriesParam);
  const runtime = useRuntimeState();
  const isTransitionLoading = query.isFetching && query.isPlaceholderData;

  usePageMetadata({
    title: "Live Cricket Scores, Fixtures and Results",
    description:
      "Track live cricket scores, upcoming fixtures, completed results, and full scorecards across series from one polished Criclytics dashboard.",
    path: "/",
    keywords: [
      "live cricket scores",
      "cricket fixtures",
      "cricket results",
      "cricket scorecards",
      "IPL live scores",
      "Criclytics dashboard"
    ],
    jsonLd: [
      buildWebsiteSchema(),
      buildCollectionPageSchema({
        name: "Criclytics Dashboard",
        description:
          "Criclytics dashboard for live cricket scores, fixtures, completed matches, and scorecards.",
        path: "/"
      })
    ]
  });

  if ((query.isPending && !query.data) || isTransitionLoading) {
    return <LoadingCardGrid count={8} page />;
  }

  if (!query.data) {
    return <ErrorPanel message={getErrorMessage(query.error, "Something went wrong while loading the live match centre.")} onRetry={() => void query.refetch()} title="Unable to load the match centre" />;
  }

  const liveMatches = filterMatches(query.data.live, deferredQuery);
  const upcomingMatches = filterMatches(query.data.upcoming, deferredQuery);
  const completedMatches = filterMatches(query.data.completed, deferredQuery);
  const totalMatches = liveMatches.length + upcomingMatches.length + completedMatches.length;
  const spotlightMatch = liveMatches[0] ?? upcomingMatches[0] ?? completedMatches[0] ?? null;

  return (
    <div className="space-y-8">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <Card className="h-full overflow-hidden rounded-[32px] border-border/70 bg-panel-glow dark:bg-panel-glow-dark">
          <CardContent className="flex h-full flex-col p-6 sm:p-8">
            <div className="flex flex-col gap-5 border-b border-border/60 pb-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="rounded-full px-3 py-1.5 tracking-[0.28em]" variant="outline">
                    Match centre
                  </Badge>
                  <span className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">{getLocalTimeZoneLabel()}</span>
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Live cricket desk</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                  Track the live board, the next scheduled start, and the freshest completed result from one cleaner match route.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" variant="secondary">
                  <Link to={buildRouteWithParams("/media", searchParams)}>
                    <Film className="h-4 w-4" />
                    Media room
                  </Link>
                </Button>
                <Button onClick={() => void query.refetch()} size="lg" type="button" variant="outline">
                  <RefreshCw className="h-4 w-4" />
                  Refresh feed
                </Button>
              </div>
            </div>

            <div className="mt-6 grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-stretch">
              <div className="min-w-0">
                {spotlightMatch ? <BoardSpotlight match={spotlightMatch} searchParams={searchParams} /> : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:auto-rows-fr lg:grid-cols-1">
                <DeskStatCard
                  accentClassName="text-emerald-600 dark:text-emerald-300"
                  href={buildRouteWithParams("/live", searchParams)}
                  label="Live"
                  sublabel={liveMatches.length ? "Active now" : "Quiet window"}
                  value={liveMatches.length.toString()}
                />
                <DeskStatCard
                  accentClassName="text-amber-600 dark:text-amber-300"
                  href={buildRouteWithParams("/upcoming", searchParams)}
                  label="Upcoming"
                  sublabel="Scheduled ahead"
                  value={upcomingMatches.length.toString()}
                />
                <DeskStatCard
                  accentClassName="text-slate-600 dark:text-slate-300"
                  href={buildRouteWithParams("/completed", searchParams)}
                  label="Completed"
                  sublabel="Results archived"
                  value={completedMatches.length.toString()}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full rounded-[32px] border-border/70 bg-card/90">
          <CardContent className="space-y-5 p-6">
            <SelectBlock
              label="Series"
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
            </SelectBlock>

            <InfoTile icon={Waves} label="Coverage" value={formatSeriesLabel(query.data.appliedSeriesFilter || "all")} />
            <InfoTile icon={Activity} label="Updated" value={formatRelativeUpdate(query.data.fetchedAt)} />
            <InfoTile icon={Trophy} label="Visible cards" value={`${totalMatches} matches`} />

            <div className="space-y-3">
              {upcomingMatches[0] ? <RailMatchCard label="Next fixture" match={upcomingMatches[0]} /> : null}
              {liveMatches[0] ? <RailMatchCard label="Live board" match={liveMatches[0]} /> : null}
              {!liveMatches[0] && completedMatches[0] ? <RailMatchCard label="Latest result" match={completedMatches[0]} /> : null}
            </div>
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

      {query.error ? <ErrorPanel compact message={getErrorMessage(query.error, "Something went wrong while loading the live match centre.")} onRetry={() => void query.refetch()} title="Feed warning" /> : null}

      <MatchSection
        actionHref={buildRouteWithParams("/live", searchParams)}
        description={getStatusDescription("live")}
        emptyDescription={getStatusEmptyMessage("live")}
        emptyTitle="No live matches"
        matches={liveMatches}
        title="Live now"
      />

      <MatchSection
        actionHref={buildRouteWithParams("/upcoming", searchParams)}
        description={getStatusDescription("upcoming")}
        emptyDescription={getStatusEmptyMessage("upcoming")}
        emptyTitle="No upcoming fixtures"
        matches={upcomingMatches}
        title="Upcoming"
      />

      <MatchSection
        actionHref={buildRouteWithParams("/completed", searchParams)}
        description={getStatusDescription("completed")}
        emptyDescription={getStatusEmptyMessage("completed")}
        emptyTitle="No completed matches"
        matches={completedMatches}
        title="Completed"
      />
    </div>
  );
}

function BoardSpotlight({ match, searchParams }: { match: MatchSummary; searchParams: URLSearchParams }) {
  const [teamA, teamB] = match.teams.slice(0, 2);
  const detailHref = buildRouteWithParams(`/match/${match.id}`, searchParams);

  return (
    <div className="flex h-full flex-col rounded-[28px] border border-border/70 bg-background/65 p-5 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">{match.seriesName}</p>
          <p className="mt-3 max-w-2xl text-xl font-semibold leading-8 sm:text-2xl">{formatMatchSummaryText(match)}</p>
        </div>
        <StatusBadge status={match.status} />
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <SpotlightTeam team={teamA} />
        <div className="shrink-0 rounded-full border border-border/70 bg-secondary/65 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          VS
        </div>
        <SpotlightTeam align="right" team={teamB} />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {match.scoreLines.length ? (
          match.scoreLines.slice(0, 2).map((line) => (
            <div className="rounded-2xl border border-border/70 bg-secondary/45 p-4" key={line.inning}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{line.teamName}</p>
                {line.overs ? <span className="text-xs font-medium text-muted-foreground">{line.overs} ov</span> : null}
              </div>
              <p className="mt-2 text-xl font-semibold tracking-tight">{line.display}</p>
            </div>
          ))
        ) : (
          <>
            <MetaTile icon={CalendarDays} label="Scheduled start" value={formatMatchDate(match.startTime, "long")} />
            <MetaTile icon={MapPin} label="Venue" value={formatVenue(match.venue)} />
          </>
        )}
      </div>

      {!match.scoreLines.length && match.status === "upcoming" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <SpotlightMiniTile label="Matchday" value={getSpotlightMatchday(match)} />
          <SpotlightMiniTile label="Starts in" value={getCountdownToStart(match.startTime)} />
          <SpotlightMiniTile label="Local zone" value={getLocalTimeZoneLabel()} />
        </div>
      ) : null}

      <div className="mt-auto grid gap-3 pt-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="rounded-2xl border border-border/70 bg-background/75 p-4 text-sm leading-6 text-muted-foreground">
          {match.tossSummary || match.resultText || formatMatchStatusText(match)}
        </div>
        <Button asChild className="w-full md:w-auto" variant={match.status === "live" ? "default" : "secondary"}>
          <Link to={detailHref}>Open scorecard</Link>
        </Button>
      </div>
    </div>
  );
}

function SelectBlock({
  label,
  value,
  onChange,
  children
}: React.PropsWithChildren<{ label: string; value: string; onChange: React.ChangeEventHandler<HTMLSelectElement> }>) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{label}</span>
      <select
        className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        onChange={onChange}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}

function SpotlightTeam({
  team,
  align = "left"
}: {
  team: MatchSummary["teams"][number];
  align?: "left" | "right";
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", align === "right" ? "flex-row-reverse justify-end text-right" : "justify-start text-left")}>
      <TeamAvatar size="md" team={team} />
      <div className="min-w-0">
        <p className="text-xl font-semibold tracking-tight sm:text-2xl">{team.shortName}</p>
        <p className="mt-1 hidden truncate text-sm text-muted-foreground sm:block">{team.name}</p>
      </div>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-secondary/40 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-3 text-sm font-semibold leading-6">{value}</p>
    </div>
  );
}

function SpotlightMiniTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-foreground">{value}</p>
    </div>
  );
}

function getSpotlightMatchday(match: MatchSummary) {
  const lead = match.summary
    .split("•")
    .map((part) => part.trim())
    .find(Boolean);

  if (!lead) {
    return match.seriesName;
  }

  if (/starts /i.test(lead) || /\b(gmt|utc)\b/i.test(lead)) {
    return match.seriesName;
  }

  return lead;
}

function getCountdownToStart(value: string | null) {
  if (!value) {
    return "Awaiting schedule";
  }

  const startMs = Date.parse(value);

  if (Number.isNaN(startMs)) {
    return "Awaiting schedule";
  }

  const deltaMs = startMs - Date.now();

  if (deltaMs <= 0) {
    return "Starting soon";
  }

  const totalMinutes = Math.round(deltaMs / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function DeskStatCard({
  label,
  value,
  href,
  sublabel,
  accentClassName
}: {
  label: string;
  value: string;
  href: string;
  sublabel: string;
  accentClassName?: string;
}) {
  return (
    <Link className="flex h-full flex-col rounded-2xl border border-border/70 bg-background/75 p-4 transition hover:border-primary/40 hover:shadow-soft" to={href}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
        <div className={cn("h-2.5 w-2.5 rounded-full bg-current", accentClassName)} />
      </div>
      <div className="mt-auto flex items-end justify-between gap-4 pt-4">
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
        <p className="text-right text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{sublabel}</p>
      </div>
    </Link>
  );
}

function RailMatchCard({ match, label }: { match: MatchSummary; label: string }) {
  const [teamA, teamB] = match.teams.slice(0, 2);
  const primaryMeta = match.scoreLines[0]?.display || formatMatchDate(match.startTime, "short");

  return (
    <Link className="block rounded-2xl border border-border/70 bg-background/70 p-4 transition hover:border-primary/35 hover:shadow-soft" to={`/match/${match.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
          <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6">
            {teamA.shortName} vs {teamB.shortName}
          </p>
        </div>
        <StatusBadge status={match.status} />
      </div>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{match.seriesName}</p>
      <p className="mt-3 text-sm font-semibold">{primaryMeta}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{match.status === "upcoming" ? formatVenue(match.venue) : formatMatchStatusText(match)}</p>
    </Link>
  );
}

function MetaTile({
  icon: Icon,
  label,
  value
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-secondary/45 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold leading-6">{value}</p>
    </div>
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
