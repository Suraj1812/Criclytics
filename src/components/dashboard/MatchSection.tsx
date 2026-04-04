import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { MatchGrid } from "@/components/dashboard/MatchGrid";
import { Button } from "@/components/ui/button";
import type { MatchSummary } from "@/types/cricket";

export function MatchSection({
  title,
  description,
  matches,
  actionHref,
  emptyTitle,
  emptyDescription
}: {
  title: string;
  description: string;
  matches: MatchSummary[];
  actionHref?: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <section className="space-y-3 sm:space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">{title}</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{description}</h2>
        </div>

        {actionHref ? (
          <Button asChild className="shrink-0 self-start sm:self-auto" size="sm" variant="ghost">
            <Link to={actionHref}>
              View all
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </div>

      <MatchGrid emptyDescription={emptyDescription} emptyTitle={emptyTitle} matches={matches} />
    </section>
  );
}
