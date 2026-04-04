import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MatchDetail, TopPerformer } from "@/types/cricket";

export function StatsPanel({ match }: { match: MatchDetail }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <PerformerGrid performers={match.topBatters} title="Top scorers" />
        <PerformerGrid performers={match.topBowlers} title="Top bowlers" />
      </div>

      <div className="space-y-6">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Match notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7">
            {match.playerOfMatch ? (
              <p>
                <span className="font-semibold">Player of the match:</span> {match.playerOfMatch}
              </p>
            ) : null}
            {match.partnershipInfo ? (
              <p>
                <span className="font-semibold">Partnership:</span> {match.partnershipInfo}
              </p>
            ) : null}
            <p>
              <span className="font-semibold">Result:</span> {match.resultText}
            </p>
            {match.tossSummary ? (
              <p>
                <span className="font-semibold">Toss:</span> {match.tossSummary}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Squads</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {match.squads.map((squad) => (
              <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4" key={squad.teamName}>
                <p className="text-sm font-semibold">{squad.teamName}</p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {squad.players.map((player) => (
                    <li key={`${squad.teamName}-${player}`}>{player}</li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PerformerGrid({ title, performers }: { title: string; performers: TopPerformer[] }) {
  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {performers.length ? (
          performers.map((performer) => (
            <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4" key={`${title}-${performer.playerName}-${performer.value}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{performer.label}</p>
              <p className="mt-3 text-lg font-semibold">{performer.playerName}</p>
              <p className="mt-1 text-sm font-medium text-foreground">{performer.value}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{performer.secondary}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Stats will appear here when the feed exposes them.</p>
        )}
      </CardContent>
    </Card>
  );
}
