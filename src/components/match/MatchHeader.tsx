import { ArrowLeft, CalendarDays, MapPin, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { MatchFeature } from "./MatchFeature";
import { formatMatchDate } from "@/lib/formatters";
import type { MatchDetail } from "@/types/cricket";

export function MatchHeader({ match }: { match: MatchDetail }) {
  return (
    <section className="space-y-6">
      <Link
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
        to="/"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to the match centre
      </Link>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <h1 className="sr-only">
            {match.teams.map((team) => team.name).join(" vs ")}
          </h1>
          <MatchFeature match={match} detail />
        </div>
        <aside className="rounded-lg border border-border bg-card p-6 sm:p-8">
          <p className="eyebrow">The match brief</p>
          <h2 className="mt-5 text-2xl font-semibold leading-snug tracking-tight">
            {match.resultText || match.statusText}
          </h2>
          {match.tossSummary && (
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {match.tossSummary}
            </p>
          )}
          <div className="mt-7 space-y-5 border-t border-border pt-5">
            <div className="flex gap-3">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="eyebrow !text-[9px]">First ball · local time</p>
                <p className="mt-1.5 text-xs leading-5">
                  {formatMatchDate(match.startTime, "long")}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="eyebrow !text-[9px]">The ground</p>
                <p className="mt-1.5 text-xs leading-5">{match.venue}</p>
              </div>
            </div>
            {match.playerOfMatch && (
              <div className="flex gap-3">
                <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="eyebrow !text-[9px]">Player of the match</p>
                  <p className="mt-1.5 text-sm font-semibold">
                    {match.playerOfMatch}
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
