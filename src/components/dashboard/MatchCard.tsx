import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TeamAvatar } from "@/components/shared/TeamAvatar";
import {
  formatMatchDate,
  formatMatchStatusText,
  formatVenue,
} from "@/lib/formatters";
import { fetchMatchDetail } from "@/services/api-client";
import type { MatchSummary, TeamSummary } from "@/types/cricket";

// Keep the latest innings for each team together, including multi-innings Tests.
export function teamScore(match: MatchSummary, team: TeamSummary) {
  const scores = match.scoreLines.filter(
    (line) =>
      line.teamName.toLowerCase() === team.name.toLowerCase() ||
      line.teamName.toLowerCase() === team.shortName.toLowerCase(),
  );
  return scores;
}
export function MatchCard({ match }: { match: MatchSummary }) {
  const queryClient = useQueryClient();
  function prefetch() {
    if (match.hasScorecard)
      void queryClient.prefetchQuery({
        queryKey: ["match-detail", match.id],
        queryFn: ({ signal }) => fetchMatchDetail(match.id, signal),
        staleTime: 10_000,
      });
  }
  return (
    <article className="group flex h-full min-w-0 flex-col rounded-lg border border-border bg-card transition-colors hover:border-primary/50">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3">
        <p className="eyebrow truncate !text-[9px]">
          {match.matchType} <span className="mx-1 opacity-40">/</span>{" "}
          {match.seriesName}
        </p>
        <StatusBadge status={match.status} />
      </div>
      <div className="space-y-4 px-5 py-5">
        {match.teams.slice(0, 2).map((team) => {
          const scores = teamScore(match, team);
          const last = scores[scores.length - 1];
          return (
            <div className="score-row" key={team.code || team.name}>
              <div className="flex min-w-0 items-center gap-3">
                <TeamAvatar size="sm" team={team} />
                <span className="truncate text-sm font-bold">{team.name}</span>
              </div>
              <div className="shrink-0 text-right">
                <p className="score-number text-xl font-bold">
                  {last
                    ? `${last.runs ?? "—"}${last.wickets != null ? `/${last.wickets}` : ""}`
                    : "—"}
                </p>
                {last?.overs && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {last.overs} overs
                    {scores.length > 1
                      ? ` · 1st: ${scores[0].runs}/${scores[0].wickets}`
                      : ""}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-auto px-5 pb-4">
        <p
          className={`line-clamp-2 text-xs font-medium leading-5 ${match.status === "live" ? "text-primary" : "text-muted-foreground"}`}
        >
          {match.status === "upcoming"
            ? formatMatchDate(match.startTime)
            : formatMatchStatusText(match)}
        </p>
      </div>
      <Link
        className="flex items-center justify-between gap-3 border-t border-border/60 px-5 py-3 text-xs transition-colors hover:bg-secondary/50"
        onFocus={prefetch}
        onMouseEnter={prefetch}
        to={`/match/${match.id}`}
      >
        <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{formatVenue(match.venue)}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 font-semibold">
          Scorecard <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </Link>
    </article>
  );
}
