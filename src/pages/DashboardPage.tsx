import { useDeferredValue } from "react";
import { ArrowRight, ArrowUpRight, RefreshCw } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { MatchSection } from "@/components/dashboard/MatchSection";
import { MatchFeature } from "@/components/match/MatchFeature";
import { ErrorPanel } from "@/components/shared/ErrorPanel";
import { FeedHealthBanner } from "@/components/shared/FeedHealthBanner";
import { LoadingCardGrid } from "@/components/shared/LoadingCardGrid";
import { TeamAvatar } from "@/components/shared/TeamAvatar";
import { SeriesFilter } from "@/components/shared/SeriesFilter";
import { Button } from "@/components/ui/button";
import { useDashboardQuery } from "@/hooks/use-dashboard-query";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useRuntimeState } from "@/hooks/use-runtime-state";
import {
  filterMatches,
  formatMatchDate,
  formatRelativeUpdate,
  getStatusEmptyMessage,
} from "@/lib/formatters";
import { getErrorMessage } from "@/lib/error-utils";
import { buildWebsiteSchema } from "@/lib/seo";

export function DashboardPage() {
  const [params, setParams] = useSearchParams();
  const search = useDeferredValue(params.get("q") ?? "");
  const query = useDashboardQuery(params.get("series"));
  const runtime = useRuntimeState();
  usePageMetadata({
    title: "Live Cricket Scores, Fixtures and Results",
    description:
      "Follow every session. Live cricket scores, upcoming matches, results and stories from around the world.",
    path: "/",
    jsonLd: buildWebsiteSchema(),
  });
  if (query.isPending && !query.data) return <LoadingCardGrid count={6} page />;
  if (!query.data)
    return (
      <ErrorPanel
        title="The scores are taking a moment"
        message={getErrorMessage(query.error, "Please try again in a moment.")}
        onRetry={() => void query.refetch()}
      />
    );
  const data = query.data;
  const live = filterMatches(data.live, search),
    upcoming = filterMatches(data.upcoming, search),
    completed = filterMatches(data.completed, search);
  const featured = live[0] ?? upcoming[0] ?? completed[0];
  const stories = data.featuredMedia?.stories.slice(0, 3) ?? [];
  const target = (path: string) =>
    `${path}${params.toString() ? `?${params}` : ""}`;
  return (
    <div className="space-y-9 sm:space-y-12">
      <section>
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow mb-4">
              The match centre <span className="mx-2 opacity-40">/</span>{" "}
              Cricket, worldwide
            </p>
            <h1 className="editorial-title text-[48px] sm:text-[70px]">
              The game, <em className="text-primary">in focus.</em>
            </h1>
            <p className="mt-4 text-sm text-muted-foreground">
              Every session. Every score. Closer to the cricket.
            </p>
          </div>
          <div className="flex items-center gap-6 sm:pb-1">
            {[
              { key: "live", label: "In play", count: live.length },
              { key: "upcoming", label: "Coming up", count: upcoming.length },
              { key: "completed", label: "Results", count: completed.length },
            ].map((item) => (
              <Link
                to={target("/" + item.key)}
                key={item.key}
                className="group border-l border-border pl-5"
              >
                <p className="score-number text-3xl font-semibold group-hover:text-primary">
                  {String(item.count).padStart(2, "0")}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {item.label}
                </p>
              </Link>
            ))}
          </div>
        </div>
        <div
          className="mt-8 flex gap-2 overflow-x-auto border-y border-border py-3"
          aria-label="Competition shortcuts"
        >
          <button
            className={`series-chip ${!params.get("series") || params.get("series") === "all" ? "active" : ""}`}
            onClick={() => {
              const next = new URLSearchParams(params);
              next.set("series", "all");
              setParams(next, { replace: true });
            }}
          >
            All cricket
          </button>
          {data.seriesOptions.map((option) => (
            <button
              key={option.value}
              className={`series-chip ${params.get("series") === option.value ? "active" : ""}`}
              onClick={() => {
                const next = new URLSearchParams(params);
                next.set("series", option.value);
                setParams(next, { replace: true });
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          {featured ? (
            <MatchFeature match={featured} />
          ) : (
            <div className="rounded-lg border border-border p-10">
              <h2 className="text-xl font-bold">No matches found</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Try another competition or search term.
              </p>
            </div>
          )}
        </div>
        <aside className="flex min-w-0 flex-col rounded-lg border border-border bg-card px-6 py-5">
          <div className="section-heading !pb-3">
            <h2 className="!text-base">On the horizon</h2>
            <Link aria-label="See full schedule" to={target("/upcoming")}>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          {upcoming.slice(0, 3).map((match) => (
            <Link
              key={match.id}
              className="group border-b border-border/60 py-4 last:border-0"
              to={`/match/${match.id}`}
            >
              <p className="eyebrow truncate !text-[9px]">{match.seriesName}</p>
              <div className="my-3 flex items-center gap-2">
                {match.teams.slice(0, 2).map((team, i) => (
                  <div
                    className="flex min-w-0 items-center gap-2"
                    key={team.name}
                  >
                    {i === 1 && (
                      <span className="mx-1 text-[10px] text-muted-foreground">
                        vs
                      </span>
                    )}
                    <TeamAvatar size="sm" team={team} />
                    <span className="text-sm font-bold group-hover:text-primary">
                      {team.shortName}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {formatMatchDate(match.startTime)}
              </p>
            </Link>
          ))}
          {!upcoming.length && (
            <p className="py-8 text-sm text-muted-foreground">
              No upcoming fixtures in this view.
            </p>
          )}
          <Link
            className="mt-auto flex items-center justify-between border-t border-border pt-4 text-xs font-semibold"
            to={target("/upcoming")}
          >
            Explore the schedule <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </aside>
      </section>
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-center">
        <SeriesFilter options={data.seriesOptions} />
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {formatRelativeUpdate(data.fetchedAt)}
          <Button
            aria-label="Refresh scores"
            onClick={() => void query.refetch()}
            size="sm"
            variant="ghost"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>
      <FeedHealthBanner
        cacheAgeSeconds={data.cacheAgeSeconds}
        fallbackMessage={data.fallbackMessage}
        isFetching={query.isFetching}
        isOnline={runtime.isOnline}
        isStale={data.isStale}
        isVisible={runtime.isVisible}
        refreshIntervalSeconds={data.refreshIntervalSeconds}
      />
      {query.error && (
        <ErrorPanel
          compact
          title="Score update delayed"
          message={getErrorMessage(
            query.error,
            "Please try again in a moment.",
          )}
          onRetry={() => void query.refetch()}
        />
      )}
      <MatchSection
        title="Around the grounds"
        description="Live cricket matches"
        matches={live.slice(0, 6)}
        actionHref={target("/live")}
        emptyTitle="A quiet moment between games"
        emptyDescription={getStatusEmptyMessage("live")}
      />
      {stories.length > 0 && (
        <section className="space-y-5">
          <div className="section-heading">
            <h2>Beyond the boundary</h2>
            <Link
              className="flex items-center gap-2 text-xs font-semibold"
              to={target("/media")}
            >
              The clubhouse <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {stories.map((story) => (
              <Link
                className="group min-w-0"
                to={target("/media")}
                key={story.id}
              >
                {story.imageUrl && (
                  <div className="overflow-hidden rounded-md">
                    <img
                      alt={story.title}
                      src={story.imageUrl}
                      className="news-image transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                )}
                <p className="eyebrow mt-4 !text-[9px]">
                  {story.contextLabel || "From the clubhouse"}
                </p>
                <h3 className="mt-2 text-lg font-semibold leading-snug tracking-tight group-hover:text-primary">
                  {story.title}
                </h3>
              </Link>
            ))}
          </div>
        </section>
      )}
      <MatchSection
        title="Next to the crease"
        description="Upcoming cricket fixtures"
        matches={upcoming.slice(0, 6)}
        actionHref={target("/upcoming")}
        emptyTitle="No upcoming matches"
        emptyDescription={getStatusEmptyMessage("upcoming")}
      />
      <MatchSection
        title="The final word"
        description="Recent cricket results"
        matches={completed.slice(0, 6)}
        actionHref={target("/completed")}
        emptyTitle="No results yet"
        emptyDescription={getStatusEmptyMessage("completed")}
      />
    </div>
  );
}
