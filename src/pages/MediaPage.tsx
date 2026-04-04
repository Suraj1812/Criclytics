import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Camera, Clapperboard, Images, RefreshCw, Sparkles } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorPanel } from "@/components/shared/ErrorPanel";
import { LoadingCardGrid } from "@/components/shared/LoadingCardGrid";
import { MediaViewer } from "@/components/shared/MediaViewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardQuery } from "@/hooks/use-dashboard-query";
import { useMediaDetailQuery } from "@/hooks/use-media-detail-query";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { formatRelativeUpdate, formatSeriesLabel, normalizeSearchValue } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/error-utils";
import { buildCollectionPageSchema } from "@/lib/seo";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/types/cricket";

type MediaTab = "all" | "videos" | "stories" | "photos";

const MEDIA_TABS: Array<{ value: MediaTab; label: string }> = [
  { value: "all", label: "All media" },
  { value: "videos", label: "Videos" },
  { value: "stories", label: "Stories" },
  { value: "photos", label: "Photo galleries" }
];

export function MediaPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const seriesParam = searchParams.get("series");
  const searchValue = useDeferredValue(searchParams.get("q") ?? "");
  const dashboardQuery = useDashboardQuery(seriesParam);
  const [activeTab, setActiveTab] = useState<MediaTab>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const media = dashboardQuery.data?.featuredMedia ?? null;
  const normalizedSearch = normalizeSearchValue(searchValue);

  const filteredStories = useMemo(
    () => media?.stories.filter((item) => getMediaSearchText(item).includes(normalizedSearch)) ?? [],
    [media?.stories, normalizedSearch]
  );
  const filteredVideos = useMemo(
    () => media?.videos.filter((item) => getMediaSearchText(item).includes(normalizedSearch)) ?? [],
    [media?.videos, normalizedSearch]
  );
  const filteredPhotos = useMemo(
    () => media?.photos.filter((item) => getMediaSearchText(item).includes(normalizedSearch)) ?? [],
    [media?.photos, normalizedSearch]
  );
  const filteredAll = useMemo(() => mergeMediaItems(filteredVideos, filteredStories, filteredPhotos), [filteredPhotos, filteredStories, filteredVideos]);

  const activeItems = useMemo(() => {
    switch (activeTab) {
      case "videos":
        return filteredVideos;
      case "stories":
        return filteredStories;
      case "photos":
        return filteredPhotos;
      default:
        return filteredAll;
    }
  }, [activeTab, filteredAll, filteredPhotos, filteredStories, filteredVideos]);

  const mediaCounts = {
    all: filteredAll.length,
    videos: filteredVideos.length,
    stories: filteredStories.length,
    photos: filteredPhotos.length
  };

  usePageMetadata({
    title: "Cricket Media Desk",
    description:
      "Browse live cricket videos, editorial stories, and full photo galleries inside the Criclytics media desk with clean previews and in-app playback.",
    path: "/media",
    keywords: ["cricket media", "cricket videos", "cricket galleries", "IPL stories", "Criclytics media"],
    jsonLd: buildCollectionPageSchema({
      name: "Criclytics media desk",
      description: "A Criclytics collection page for cricket videos, editorial stories, and photo galleries.",
      path: "/media"
    })
  });

  useEffect(() => {
    if (!activeItems.length) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !activeItems.some((item) => item.id === selectedId)) {
      setSelectedId(activeItems[0].id);
    }
  }, [activeItems, selectedId]);

  if (dashboardQuery.isPending && !dashboardQuery.data) {
    return <LoadingCardGrid count={6} page />;
  }

  if (!dashboardQuery.data) {
    return (
      <ErrorPanel
        message={getErrorMessage(dashboardQuery.error, "Something went wrong while loading the media desk.")}
        onRetry={() => void dashboardQuery.refetch()}
        title="Unable to load the media desk"
      />
    );
  }

  if (!media) {
    return <EmptyState description="The current feed does not expose videos, stories, or galleries for this coverage filter yet." title="No media available" />;
  }

  const selectedItem = activeItems.find((item) => item.id === selectedId) ?? activeItems[0] ?? null;
  const mediaQuery = useMediaDetailQuery(selectedItem?.href ?? null);
  const leadItems = filteredAll.slice(0, 4);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="relative overflow-hidden rounded-[28px] border-border/70 bg-panel-glow dark:bg-panel-glow-dark">
          {media.coverImageUrl ? (
            <div className="absolute inset-0 opacity-15">
              <img alt={media.seriesName} className="h-full w-full object-cover" src={media.coverImageUrl} />
            </div>
          ) : null}

          <CardContent className="relative p-6 sm:p-8">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-muted-foreground">Criclytics media desk</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">A deeper stream of cricket videos, image stories, and photo galleries.</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                The media desk now pulls a wider editorial mix from the live web feed, keeps galleries fully viewable, and gives you a larger in-app browsing surface for every active series.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon={Sparkles} label="Desk items" value={mediaCounts.all.toString()} />
              <MetricCard icon={Clapperboard} label="Videos" value={mediaCounts.videos.toString()} />
              <MetricCard icon={Camera} label="Stories" value={mediaCounts.stories.toString()} />
              <MetricCard icon={Images} label="Galleries" value={mediaCounts.photos.toString()} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px]">
          <CardHeader>
            <CardTitle>Coverage controls</CardTitle>
            <CardDescription>Change the series focus, refresh the desk, and keep the media workspace pointed at the live feed.</CardDescription>
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
                {dashboardQuery.data.seriesOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.count})
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <DeskInfoTile label="Coverage" value={formatSeriesLabel(dashboardQuery.data.appliedSeriesFilter || "all")} />
              <DeskInfoTile label="Updated" value={formatRelativeUpdate(dashboardQuery.data.fetchedAt)} />
            </div>

            <div className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Search scope</p>
              <p className="mt-2 text-sm font-semibold">{searchValue ? `${mediaCounts.all} items match "${searchValue}"` : `${mediaCounts.all} items ready in this desk`}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Global navbar search applies here too, so you can narrow the desk by team, series, headline, gallery, or editorial context.
              </p>
            </div>

            <Button onClick={() => void dashboardQuery.refetch()} type="button" variant="outline">
              <RefreshCw className="h-4 w-4" />
              Refresh desk
            </Button>
          </CardContent>
        </Card>
      </section>

      {dashboardQuery.error ? (
        <ErrorPanel
          compact
          message={getErrorMessage(dashboardQuery.error, "Something went wrong while loading media from the live feed.")}
          onRetry={() => void dashboardQuery.refetch()}
          title="Media warning"
        />
      ) : null}

      {leadItems.length ? (
        <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          {leadItems.map((item) => (
            <LeadMediaCard item={item} key={item.id} onSelect={setSelectedId} selected={item.id === selectedId} />
          ))}
        </section>
      ) : null}

      <Tabs onValueChange={(value) => setActiveTab(value as MediaTab)} value={activeTab}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <TabsList className="h-auto flex-wrap rounded-2xl p-1">
            {MEDIA_TABS.map((tab) => (
              <TabsTrigger className="rounded-xl px-4" key={tab.value} value={tab.value}>
                {tab.label}
                <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{mediaCounts[tab.value]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="text-sm text-muted-foreground">{activeItems.length} items visible in this view</div>
        </div>
      </Tabs>

      <MediaWorkspace items={activeItems} mediaQuery={mediaQuery} onSelect={setSelectedId} selectedId={selectedId} selectedItem={selectedItem} />

      <div className="grid gap-6">
        <MediaLaneSection
          description="The widest editorial story stack currently available from the desk."
          items={filteredStories}
          onSelect={setSelectedId}
          selectedId={selectedId}
          title="Editorial radar"
        />
        <MediaLaneSection
          description="Studio videos, shows, and cricket clips ready to open in the player."
          items={filteredVideos}
          onSelect={setSelectedId}
          selectedId={selectedId}
          title="Studio stream"
        />
        <MediaLaneSection
          description="Photo-led coverage with gallery sets that open into full multi-frame viewing."
          items={filteredPhotos}
          onSelect={setSelectedId}
          selectedId={selectedId}
          title="Gallery wall"
        />
      </div>
    </div>
  );
}

function MediaWorkspace({
  items,
  selectedId,
  onSelect,
  selectedItem,
  mediaQuery
}: {
  items: MediaItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  selectedItem: MediaItem | null;
  mediaQuery: ReturnType<typeof useMediaDetailQuery>;
}) {
  if (!items.length) {
    return <EmptyState description="Try a different series or search term to find more videos, stories, and galleries." title="No media items matched this filter" />;
  }

  const queueItems = items.filter((item) => item.id !== selectedId);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_390px]">
        <div className="space-y-6">
          <MediaViewer detail={mediaQuery.data} error={mediaQuery.error as Error | null} isLoading={mediaQuery.isFetching} item={selectedItem} />

          {queueItems.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {queueItems.slice(0, 4).map((item) => (
                <CompactMediaCard item={item} key={item.id} onSelect={onSelect} />
              ))}
            </div>
          ) : null}
        </div>

        <Card className="rounded-[28px] border-border/70">
          <CardHeader>
            <CardTitle>Desk queue</CardTitle>
            <CardDescription>Jump between media without leaving the preview workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.slice(0, 16).map((item) => (
              <button
                className={cn(
                  "flex w-full items-start gap-3 rounded-2xl border border-border/70 bg-secondary/25 p-3 text-left transition hover:border-primary/40 hover:bg-secondary/40",
                  selectedId === item.id ? "border-primary/50 bg-primary/5 ring-2 ring-primary/15" : ""
                )}
                key={item.id}
                onClick={() => onSelect(item.id)}
                type="button"
              >
                <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-background/70 p-2">
                  {item.imageUrl ? (
                    <img alt={item.title} className="h-full w-full object-contain" loading="lazy" src={item.imageUrl} />
                  ) : (
                    <div className="text-xs text-muted-foreground">No preview</div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{getMediaKindLabel(item.kind)}</Badge>
                    {item.publishedLabel ? <span className="text-xs text-muted-foreground">{item.publishedLabel}</span> : null}
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {item.summary || item.contextLabel || "Open this item to inspect it in the media workspace."}
                  </p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[28px] border-border/70">
        <CardHeader>
          <CardTitle>Browse the active desk</CardTitle>
          <CardDescription>Every visible media card for the current tab, ready to open in the in-app viewer.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {items.map((item) => (
              <MediaGridCard item={item} key={item.id} onSelect={onSelect} selected={selectedId === item.id} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LeadMediaCard({ item, selected, onSelect }: { item: MediaItem; selected: boolean; onSelect: (id: string) => void }) {
  return (
    <button
      className={cn(
        "overflow-hidden rounded-[28px] border border-border/70 bg-card text-left shadow-soft transition hover:-translate-y-0.5 hover:border-primary/40",
        selected ? "border-primary/50 ring-2 ring-primary/15" : ""
      )}
      onClick={() => onSelect(item.id)}
      type="button"
    >
      <div className="flex aspect-[16/10] items-center justify-center overflow-hidden border-b border-border/70 bg-secondary/20 p-4">
        {item.imageUrl ? (
          <img alt={item.title} className="h-full w-full object-contain" loading="lazy" src={item.imageUrl} />
        ) : (
          <div className="text-sm text-muted-foreground">Preview unavailable</div>
        )}
      </div>

      <div className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{getMediaKindLabel(item.kind)}</Badge>
          {item.contextLabel ? <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.contextLabel}</span> : null}
        </div>
        <p className="text-xl font-semibold leading-8">{item.title}</p>
        <p className="text-sm leading-6 text-muted-foreground">{item.summary || "Open this media item to view it inside the Criclytics workspace."}</p>
      </div>
    </button>
  );
}

function MediaLaneSection({
  title,
  description,
  items,
  selectedId,
  onSelect
}: {
  title: string;
  description: string;
  items: MediaItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (!items.length) {
    return null;
  }

  return (
    <Card className="rounded-[28px] border-border/70">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {items.slice(0, 8).map((item) => (
            <MediaGridCard item={item} key={`${title}-${item.id}`} onSelect={onSelect} selected={selectedId === item.id} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CompactMediaCard({ item, onSelect }: { item: MediaItem; onSelect: (id: string) => void }) {
  return (
    <button
      className="rounded-[24px] border border-border/70 bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/40"
      onClick={() => onSelect(item.id)}
      type="button"
    >
      <div className="flex aspect-video items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-secondary/20 p-3">
        {item.imageUrl ? (
          <img alt={item.title} className="h-full w-full object-contain" loading="lazy" src={item.imageUrl} />
        ) : (
          <div className="text-sm text-muted-foreground">Preview unavailable</div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{getMediaKindLabel(item.kind)}</Badge>
        {item.publishedLabel ? <span className="text-xs text-muted-foreground">{item.publishedLabel}</span> : null}
      </div>
      <p className="mt-3 text-base font-semibold leading-7">{item.title}</p>
    </button>
  );
}

function MediaGridCard({ item, selected, onSelect }: { item: MediaItem; selected: boolean; onSelect: (id: string) => void }) {
  return (
    <button
      className={cn(
        "flex h-full flex-col rounded-[24px] border border-border/70 bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/40",
        selected ? "border-primary/50 ring-2 ring-primary/15" : ""
      )}
      onClick={() => onSelect(item.id)}
      type="button"
    >
      <div className="flex aspect-video items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-secondary/20 p-3">
        {item.imageUrl ? (
          <img alt={item.title} className="h-full w-full object-contain" loading="lazy" src={item.imageUrl} />
        ) : (
          <div className="text-sm text-muted-foreground">Preview unavailable</div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant="outline">{getMediaKindLabel(item.kind)}</Badge>
        {item.contextLabel ? <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.contextLabel}</span> : null}
      </div>

      <p className="mt-3 text-lg font-semibold leading-7">{item.title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.summary || "Open this media card to inspect the full in-app preview."}</p>

      {item.publishedLabel ? <p className="mt-4 text-xs text-muted-foreground">{item.publishedLabel}</p> : null}
    </button>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function DeskInfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6">{value}</p>
    </div>
  );
}

function getMediaKindLabel(kind: string) {
  switch (kind) {
    case "video":
      return "Video";
    case "photo":
      return "Gallery";
    default:
      return "Story";
  }
}

function getMediaSearchText(item: MediaItem) {
  return `${item.title} ${item.summary || ""} ${item.contextLabel || ""} ${item.publishedLabel || ""}`.toLowerCase();
}

function mergeMediaItems(...groups: MediaItem[][]) {
  const merged: MediaItem[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    for (const item of group) {
      if (seen.has(item.href)) {
        continue;
      }

      seen.add(item.href);
      merged.push(item);
    }
  }

  return merged;
}
