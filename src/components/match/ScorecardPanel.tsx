import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InningScorecard } from "@/types/cricket";

export function ScorecardPanel({ innings }: { innings: InningScorecard[] }) {
  if (!innings.length) {
    return (
      <Card className="rounded-lg">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Scorecard data is not available for this match yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {innings.map((inning) => (
        <Card className="rounded-lg" key={inning.id}>
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl">{inning.name}</CardTitle>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {inning.total ? <span className="rounded-full bg-secondary px-3 py-1">{inning.total}</span> : null}
              {inning.extras ? <span className="rounded-full bg-secondary px-3 py-1">Extras: {inning.extras}</span> : null}
              {inning.partnershipNote ? <span className="rounded-full bg-secondary px-3 py-1">Partnership: {inning.partnershipNote}</span> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <TableCard title="Batting">
              <table className="min-w-[680px] w-full text-left text-sm">
                <thead className="bg-secondary/60 text-muted-foreground">
                  <tr>
                    <HeaderCell>Batter</HeaderCell>
                    <HeaderCell>Dismissal</HeaderCell>
                    <HeaderCell>R</HeaderCell>
                    <HeaderCell>B</HeaderCell>
                    <HeaderCell>4s</HeaderCell>
                    <HeaderCell>6s</HeaderCell>
                    <HeaderCell>SR</HeaderCell>
                  </tr>
                </thead>
                <tbody>
                  {inning.battingRows.map((row) => (
                    <tr className="border-t border-border/70" key={`${inning.id}-${row.name}`}>
                      <BodyCell className="font-medium">{row.name}</BodyCell>
                      <BodyCell>{row.dismissal}</BodyCell>
                      <BodyCell>{row.runs}</BodyCell>
                      <BodyCell>{row.balls}</BodyCell>
                      <BodyCell>{row.fours}</BodyCell>
                      <BodyCell>{row.sixes}</BodyCell>
                      <BodyCell>{row.strikeRate}</BodyCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableCard>

            <TableCard title="Bowling">
              <table className="min-w-[620px] w-full text-left text-sm">
                <thead className="bg-secondary/60 text-muted-foreground">
                  <tr>
                    <HeaderCell>Bowler</HeaderCell>
                    <HeaderCell>Overs</HeaderCell>
                    <HeaderCell>M</HeaderCell>
                    <HeaderCell>Runs</HeaderCell>
                    <HeaderCell>Wkts</HeaderCell>
                    <HeaderCell>Econ</HeaderCell>
                  </tr>
                </thead>
                <tbody>
                  {inning.bowlingRows.map((row) => (
                    <tr className="border-t border-border/70" key={`${inning.id}-${row.name}`}>
                      <BodyCell className="font-medium">{row.name}</BodyCell>
                      <BodyCell>{row.overs}</BodyCell>
                      <BodyCell>{row.maidens}</BodyCell>
                      <BodyCell>{row.runs}</BodyCell>
                      <BodyCell>{row.wickets}</BodyCell>
                      <BodyCell>{row.economy}</BodyCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableCard>

            {inning.fallOfWickets.length ? (
              <div className="rounded-md border border-border/70 bg-secondary/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Fall of wickets</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {inning.fallOfWickets.map((entry) => (
                    <span className="rounded-full bg-background px-3 py-1 text-sm" key={entry}>
                      {entry}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableCard({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return (
    <div className="rounded-md border border-border/70 bg-background/70">
      <div className="border-b border-border/70 px-4 py-3">
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function HeaderCell({ children }: React.PropsWithChildren) {
  return <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em]">{children}</th>;
}

function BodyCell({ children, className }: React.PropsWithChildren<{ className?: string }>) {
  return <td className={`px-4 py-3 align-top ${className || ""}`}>{children}</td>;
}
