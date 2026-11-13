import { useParams } from "react-router-dom";
import { MatchHeader } from "@/components/match/MatchHeader";
import { ScorecardPanel } from "@/components/match/ScorecardPanel";
import { StatsPanel } from "@/components/match/StatsPanel";
import { TimelinePanel } from "@/components/match/TimelinePanel";
import { ErrorPanel } from "@/components/shared/ErrorPanel";
import { LoadingCardGrid } from "@/components/shared/LoadingCardGrid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMatchDetailQuery } from "@/hooks/use-match-detail-query";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { formatMatchStatusText } from "@/lib/formatters";
import { buildSportsEventSchema } from "@/lib/seo";

export function MatchDetailsPage() {
  const { id } = useParams();
  const query = useMatchDetailQuery(id);
  const match = query.data;

  usePageMetadata(
    match
      ? {
          title: `${match.teams[0].shortName} vs ${match.teams[1].shortName} ${match.status === "live" ? "Live Score" : "Match Scorecard"}`,
          description: `${formatMatchStatusText(match)}. ${match.venue}.${match.tossSummary ? ` ${match.tossSummary}` : ""}`,
          path: `/match/${match.id}`,
          type: "article",
          keywords: [
            `${match.teams[0].shortName} vs ${match.teams[1].shortName}`,
            `${match.seriesName}`,
            "cricket scorecard",
            "live cricket score",
            "match details"
          ],
          image: "/og-cover.png",
          jsonLd: buildSportsEventSchema(match)
        }
      : {
          title: "Cricket Match Details",
          description: "Open the full Cric Lytics scorecard, timeline, and stats for this cricket match.",
          path: id ? `/match/${id}` : "/match"
        }
  );

  if (query.isPending && !query.data) {
    return <LoadingCardGrid count={4} page />;
  }

  if (!query.data) {
    return <ErrorPanel message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} title="Unable to load match details" />;
  }

  return (
    <div className="space-y-8">
      <MatchHeader match={query.data} />

      {query.error ? <ErrorPanel compact message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} title="Live update warning" /> : null}

      <Tabs defaultValue="scorecard">
        <TabsList>
          <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>
        <TabsContent value="scorecard">
          <ScorecardPanel innings={query.data.innings} />
        </TabsContent>
        <TabsContent value="timeline">
          <TimelinePanel detailNotice={query.data.detailNotice} timeline={query.data.timeline} />
        </TabsContent>
        <TabsContent value="stats">
          <StatsPanel match={query.data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function getErrorMessage(error: Error | null) {
  return error?.message || "Something went wrong while loading the full scorecard.";
}
