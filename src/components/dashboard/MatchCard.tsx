import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronRight, Clock3, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TeamAvatar } from "@/components/shared/TeamAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatMatchDate, formatMatchStatusText, formatMatchSummaryText, formatVenue } from "@/lib/formatters";
import { fetchMatchDetail } from "@/services/api-client";
import type { MatchSummary } from "@/types/cricket";

export function MatchCard({ match }: { match: MatchSummary }) {
  const queryClient = useQueryClient();
  const teams = match.teams.slice(0, 2);
  const [teamA, teamB] = teams;

  function prefetchDetail() {
    if (!match.hasScorecard) {
      return;
    }

    void queryClient.prefetchQuery({
      queryKey: ["match-detail", match.id],
      queryFn: ({ signal }) => fetchMatchDetail(match.id, signal),
      staleTime: 10_000
    });
  }

  return (
    <motion.article className="min-w-0" transition={{ duration: 0.2, ease: "easeOut" }} whileHover={{ scale: 1.01, y: -4 }}>
      <Card className="h-full min-w-0 rounded-2xl border-border/70 bg-card/85 backdrop-blur">
        <CardContent className="flex h-full min-w-0 flex-col p-4">
          <div className="flex items-start justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">{match.seriesName}</p>
              <p className="mt-2 text-sm text-muted-foreground">{formatMatchSummaryText(match)}</p>
            </div>
            <StatusBadge status={match.status} />
          </div>

          <div className="mt-6 grid grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[1fr_auto_1fr] sm:gap-4">
            <TeamColumn team={teamA} />
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground sm:h-12 sm:w-12 sm:text-xs sm:tracking-[0.3em]">
              VS
            </div>
            <TeamColumn team={teamB} />
          </div>

          <div className="mt-6 space-y-3">
            {match.scoreLines.length ? (
              match.scoreLines.slice(0, 2).map((scoreLine) => (
                <div className="rounded-xl border border-border/70 bg-secondary/40 p-3" key={scoreLine.inning}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{scoreLine.teamName}</p>
                    {scoreLine.overs ? <span className="text-xs font-medium text-muted-foreground">{scoreLine.overs} ov</span> : null}
                  </div>
                  <p className="mt-2 text-base font-semibold">{scoreLine.display}</p>
                </div>
              ))
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-border/70 bg-secondary/40 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    Scheduled start
                  </div>
                  <p className="mt-2 text-base font-semibold">{formatMatchDate(match.startTime)}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-secondary/40 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    Venue
                  </div>
                  <p className="mt-2 text-sm leading-6 text-foreground">{formatVenue(match.venue)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formatMatchStatusText(match)}</span>
            </div>
            <p>{match.tossSummary || match.resultText}</p>
          </div>

          <div className="mt-auto pt-5">
            <Button asChild className="w-full justify-between rounded-xl" variant={match.status === "live" ? "default" : "secondary"}>
              <Link onFocus={prefetchDetail} onMouseEnter={prefetchDetail} to={`/match/${match.id}`}>
                View details
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.article>
  );
}

function TeamColumn({ team }: { team: MatchSummary["teams"][number] }) {
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <TeamAvatar size="md" team={team} />
      <p className="mt-3 text-base font-semibold sm:text-lg">{team.shortName}</p>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">{team.name}</p>
    </div>
  );
}
