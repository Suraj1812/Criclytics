import { EmptyState } from "@/components/shared/EmptyState";
import { MatchCard } from "./MatchCard";
import type { MatchSummary } from "@/types/cricket";

export function MatchGrid({
  matches,
  emptyTitle,
  emptyDescription
}: {
  matches: MatchSummary[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (!matches.length) {
    return <EmptyState description={emptyDescription} title={emptyTitle} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} />
      ))}
    </div>
  );
}
