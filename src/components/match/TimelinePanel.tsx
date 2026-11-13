import { Clock3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { TimelineEvent } from "@/types/cricket";

export function TimelinePanel({ timeline, detailNotice }: { timeline: TimelineEvent[]; detailNotice: string | null }) {
  return (
    <div className="space-y-4">
      {detailNotice ? (
        <Card className="rounded-lg border-primary/20 bg-primary/5">
          <CardContent className="p-5">
            <p className="text-sm leading-6 text-foreground">{detailNotice}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-lg">
        <CardContent className="p-6">
          {timeline.length ? (
            <ol className="space-y-5">
              {timeline.map((event, index) => (
                <li className="relative pl-9" key={event.id}>
                  <span className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                  </span>
                  {index < timeline.length - 1 ? <span className="absolute left-3 top-8 h-[calc(100%-1rem)] w-px bg-border" /> : null}
                  <p className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">{event.label}</p>
                  <p className="mt-2 text-sm leading-7 text-foreground">{event.detail}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">No timeline events are available for this match yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
