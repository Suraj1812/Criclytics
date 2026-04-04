import { ArrowLeft, CalendarDays, MapPin, Sparkles, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TeamAvatar } from "@/components/shared/TeamAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatMatchDate, formatMatchStatusText, getLocalTimeZoneLabel } from "@/lib/formatters";
import type { MatchDetail } from "@/types/cricket";

export function MatchHeader({ match }: { match: MatchDetail }) {
  const teams = match.teams.slice(0, 2);
  const [teamA, teamB] = teams;
  const localTimeZone = getLocalTimeZoneLabel();

  return (
    <section className="space-y-4">
      <Button asChild className="px-0 text-muted-foreground" variant="ghost">
        <Link to="/">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </Button>

      <Card className="overflow-hidden rounded-3xl">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex-1 space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.34em] text-muted-foreground">{match.seriesName}</p>
                  <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                    {teamA.shortName} vs {teamB.shortName}
                  </h1>
                </div>
                <StatusBadge status={match.status} />
              </div>

              <div className="grid gap-4 rounded-3xl border border-border/70 bg-secondary/30 p-5 md:grid-cols-[1fr_auto_1fr]">
                <TeamDisplay team={teamA} />
                <div className="flex items-center justify-center">
                  <div className="rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">VS</div>
                </div>
                <TeamDisplay team={teamB} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {match.scoreLines.length ? (
                  match.scoreLines.map((scoreLine) => (
                    <div className="rounded-2xl border border-border/70 bg-background/80 p-4" key={scoreLine.inning}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{scoreLine.teamName}</p>
                        {scoreLine.overs ? <span className="text-xs font-medium text-muted-foreground">{scoreLine.overs} ov</span> : null}
                      </div>
                      <p className="mt-3 text-lg font-semibold">{scoreLine.display}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-border/70 bg-background/80 p-4 md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Status</p>
                    <p className="mt-3 text-lg font-semibold">{formatMatchStatusText(match)}</p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm font-semibold text-foreground">{match.resultText}</p>
                {match.tossSummary ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{match.tossSummary}</p> : null}
              </div>
            </div>

            <div className="grid w-full gap-3 xl:w-80">
              <InfoCard icon={CalendarDays} label={`Date (${localTimeZone})`} value={formatMatchDate(match.startTime, "long")} />
              <InfoCard icon={MapPin} label="Venue" value={match.venue} />
              <InfoCard icon={Sparkles} label="Status" value={formatMatchStatusText(match)} />
              {match.playerOfMatch ? <InfoCard icon={Trophy} label="Player of the match" value={match.playerOfMatch} /> : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function TeamDisplay({ team }: { team: MatchDetail["teams"][number] }) {
  return (
    <div className="flex flex-col items-center text-center">
      <TeamAvatar size="lg" team={team} />
      <p className="mt-3 text-xl font-semibold">{team.shortName}</p>
      <p className="mt-1 text-sm text-muted-foreground">{team.name}</p>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-3 text-sm font-semibold leading-6">{value}</p>
    </div>
  );
}
