import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Play, RefreshCw, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorPanel } from "@/components/shared/ErrorPanel";
import { LoadingCardGrid } from "@/components/shared/LoadingCardGrid";
import { MediaViewer } from "@/components/shared/MediaViewer";
import { SeriesFilter } from "@/components/shared/SeriesFilter";
import { Button } from "@/components/ui/button";
import { useDashboardQuery } from "@/hooks/use-dashboard-query";
import { useMediaDetailQuery } from "@/hooks/use-media-detail-query";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { normalizeSearchValue } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/error-utils";
import type { MediaItem } from "@/types/cricket";

const TABS = [
  { value: "all", label: "All stories" },
  { value: "story", label: "News & features" },
  { value: "video", label: "Watch" },
  { value: "photo", label: "In pictures" },
];
export function MediaPage() {
  const [params] = useSearchParams();
  const search = normalizeSearchValue(useDeferredValue(params.get("q") ?? ""));
  const query = useDashboardQuery(params.get("series"));
  const [tab, setTab] = useState("all");
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const viewer = useRef<HTMLDivElement>(null);
  const detail = useMediaDetailQuery(selected?.href ?? null);
  const media = query.data?.featuredMedia;
  const items = useMemo(() => {
    const seen = new Set<string>();
    return [
      ...(media?.stories ?? []),
      ...(media?.videos ?? []),
      ...(media?.photos ?? []),
    ].filter((item) => {
      if (seen.has(item.href)) return false;
      seen.add(item.href);
      return `${item.title} ${item.summary ?? ""} ${item.contextLabel ?? ""}`
        .toLowerCase()
        .includes(search);
    });
  }, [media, search]);
  const visible = items.filter((item) => tab === "all" || item.kind === tab);
  useEffect(() => {
    if (selected)
      viewer.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selected]);
  useEffect(() => setSelected(null), [params.get("series")]);
  usePageMetadata({
    title: "The Clubhouse — Cricket News, Videos & Stories",
    description:
      "Beyond the scorecard. Cricket stories, conversations, videos and moments from around the game.",
    path: "/media",
  });
  if (query.isPending && !query.data) return <LoadingCardGrid count={6} page />;
  if (!query.data)
    return (
      <ErrorPanel
        title="The clubhouse is taking a moment"
        message={getErrorMessage(query.error, "Please try again in a moment.")}
        onRetry={() => void query.refetch()}
      />
    );
  return (
    <div className="space-y-8">
      <section className="border-b border-border pb-8">
        <p className="eyebrow mb-4">The clubhouse / Beyond the boundary</p>
        <h1 className="editorial-title text-5xl sm:text-7xl">
          More than <em className="text-primary">a game.</em>
        </h1>
        <p className="mt-5 text-sm text-muted-foreground">
          The stories, the conversations, the moments in between.
        </p>
      </section>
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div
          className="flex gap-2 overflow-x-auto"
          role="group"
          aria-label="Media category"
        >
          {TABS.map((item) => (
            <button
              aria-pressed={tab === item.value}
              className={`series-chip ${tab === item.value ? "active" : ""}`}
              onClick={() => setTab(item.value)}
              key={item.value}
            >
              {item.label}
              <span className="ml-2 opacity-50">
                {
                  items.filter(
                    (i) => item.value === "all" || i.kind === item.value,
                  ).length
                }
              </span>
            </button>
          ))}
        </div>
        <SeriesFilter options={query.data.seriesOptions} />
      </div>
      {selected && (
        <div
          ref={viewer}
          className="scroll-mt-40 rounded-lg border border-border bg-card p-4 sm:p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <p className="eyebrow">Now in focus</p>
            <Button
              aria-label="Close story"
              size="sm"
              variant="ghost"
              onClick={() => setSelected(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <MediaViewer
            item={selected}
            detail={detail.data}
            error={detail.error as Error | null}
            isLoading={detail.isFetching}
          />
        </div>
      )}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <p className="text-xs text-muted-foreground">
          {visible.length} stories to explore
        </p>
        <Button onClick={() => void query.refetch()} variant="ghost" size="sm">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>
      {visible.length ? (
        <div className="grid gap-x-7 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((item, index) => (
            <button
              className="group flex h-full min-w-0 flex-col items-stretch text-left"
              key={item.id}
              onClick={() => setSelected(item)}
            >
              <div className="relative overflow-hidden rounded-md bg-secondary">
                {item.imageUrl ? (
                  <img
                    alt={item.title}
                    className="news-image transition-transform duration-500 group-hover:scale-105"
                    src={item.imageUrl}
                    loading={index < 3 ? "eager" : "lazy"}
                  />
                ) : (
                  <div className="news-image flex items-center justify-center text-muted-foreground">
                    No image available
                  </div>
                )}
                {item.kind === "video" && (
                  <span className="absolute bottom-4 left-4 rounded-full bg-white p-3 text-black">
                    <Play className="h-4 w-4" />
                  </span>
                )}
              </div>
              <div className="mt-4 flex justify-between gap-3">
                <p className="eyebrow !text-[9px]">
                  {item.contextLabel ||
                    (item.kind === "photo"
                      ? "In pictures"
                      : item.kind === "video"
                        ? "Watch"
                        : "News & features")}
                </p>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
              <h2 className="mt-2 text-xl font-semibold leading-snug tracking-tight group-hover:text-primary">
                {item.title}
              </h2>
              {item.summary && (
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {item.summary}
                </p>
              )}
              {item.publishedLabel && (
                <p className="mt-4 text-[10px] text-muted-foreground">
                  {item.publishedLabel}
                </p>
              )}
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nothing here just yet"
          description="Try another competition, category or search term."
        />
      )}
    </div>
  );
}
