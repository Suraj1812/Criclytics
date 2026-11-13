import { useDeferredValue } from "react";
import { RefreshCw } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { MatchGrid } from "@/components/dashboard/MatchGrid";
import { ErrorPanel } from "@/components/shared/ErrorPanel";
import { FeedHealthBanner } from "@/components/shared/FeedHealthBanner";
import { LoadingCardGrid } from "@/components/shared/LoadingCardGrid";
import { SeriesFilter } from "@/components/shared/SeriesFilter";
import { Button } from "@/components/ui/button";
import { useDashboardQuery } from "@/hooks/use-dashboard-query";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useRuntimeState } from "@/hooks/use-runtime-state";
import {
  filterMatches,
  formatRelativeUpdate,
  getStatusEmptyMessage,
  getStatusLabel,
} from "@/lib/formatters";
import { getErrorMessage } from "@/lib/error-utils";
import { buildCollectionPageSchema } from "@/lib/seo";
import type { MatchStatus } from "@/types/cricket";

const COPY = {
  live: {
    title: "Right here. Right now.",
    description:
      "The latest from every ground. Follow the matches as they unfold.",
  },
  upcoming: {
    title: "Mark your calendar.",
    description:
      "The next innings, the next rivalry. Find out what’s coming up.",
  },
  completed: {
    title: "In the scorebook.",
    description:
      "The runs, the wickets, the result. Catch up on the games you missed.",
  },
};
export function MatchesPage({ status }: { status: MatchStatus }) {
  const [params] = useSearchParams();
  const search = useDeferredValue(params.get("q") ?? "");
  const query = useDashboardQuery(params.get("series"), status);
  const runtime = useRuntimeState();
  const label = getStatusLabel(status);
  usePageMetadata({
    title: `${label} Cricket Matches`,
    description: COPY[status].description,
    path: `/${status}`,
    jsonLd: buildCollectionPageSchema({
      name: `${label} cricket matches`,
      description: COPY[status].description,
      path: `/${status}`,
    }),
  });
  if (query.isPending && !query.data) return <LoadingCardGrid count={6} page />;
  if (!query.data)
    return (
      <ErrorPanel
        title="Scores are taking a moment"
        message={getErrorMessage(query.error, "Please try again in a moment.")}
        onRetry={() => void query.refetch()}
      />
    );
  const data = query.data,
    matches = filterMatches(data[status], search);
  return (
    <div className="space-y-8">
      <section className="border-b border-border pb-8">
        <p className="eyebrow mb-4">The match centre / {label}</p>
        <h1 className="editorial-title text-5xl sm:text-7xl">
          {COPY[status].title}
        </h1>
        <p className="mt-5 text-sm text-muted-foreground">
          {COPY[status].description}
        </p>
      </section>
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <nav aria-label="Match status" className="flex gap-2">
          {(["live", "upcoming", "completed"] as const).map((value) => (
            <Link
              className={`series-chip ${status === value ? "active" : ""}`}
              key={value}
              to={`/${value}${params.toString() ? `?${params}` : ""}`}
            >
              {getStatusLabel(value)}
            </Link>
          ))}
        </nav>
        <SeriesFilter options={data.seriesOptions} />
      </div>
      <div className="flex items-center justify-between border-b border-border pb-3">
        <p className="text-xs text-muted-foreground">
          <strong className="font-semibold text-foreground">
            {matches.length}
          </strong>{" "}
          {matches.length === 1 ? "match" : "matches"}
          {search ? ` matching “${search}”` : ""}
        </p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
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
      <MatchGrid
        matches={matches}
        emptyTitle={`No ${label.toLowerCase()} matches`}
        emptyDescription={getStatusEmptyMessage(status)}
      />
    </div>
  );
}
