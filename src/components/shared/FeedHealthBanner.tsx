import { CloudOff, DatabaseZap, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function FeedHealthBanner({
  isOnline,
  isVisible,
  isFetching: _isFetching,
  isStale,
  cacheAgeSeconds,
  refreshIntervalSeconds: _refreshIntervalSeconds,
  fallbackMessage
}: {
  isOnline: boolean;
  isVisible: boolean;
  isFetching: boolean;
  isStale: boolean;
  cacheAgeSeconds: number;
  refreshIntervalSeconds: number;
  fallbackMessage: string | null;
}) {
  const states = [
    !isOnline
      ? {
          label: "Offline",
          detail: "Network is unavailable. The last cached feed stays visible until you reconnect.",
          icon: CloudOff
        }
      : null,
    !isVisible
      ? {
          label: "Refresh paused",
          detail: "The tab is hidden, so automatic refresh is paused to reduce unnecessary work.",
          icon: EyeOff
        }
      : null,
    isStale
      ? {
          label: "Warm cache",
          detail: fallbackMessage || `Serving the last successful feed snapshot from ${cacheAgeSeconds}s ago while the source recovers.`,
          icon: DatabaseZap
        }
      : null
  ].filter(Boolean) as Array<{ label: string; detail: string; icon: React.ComponentType<{ className?: string }> }>;

  if (!states.length) {
    return null;
  }

  return (
    <Card className="rounded-md border-border/70 bg-secondary/35">
      <CardContent className="grid gap-3 p-4 lg:grid-cols-2 xl:grid-cols-3">
        {states.map(({ label, detail, icon: Icon }) => (
          <div className="rounded-md border border-border/70 bg-background/70 p-4" key={label}>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <Icon className="h-4 w-4" />
              {label}
            </div>
            <p className="mt-2 text-sm leading-6 text-foreground">{detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
