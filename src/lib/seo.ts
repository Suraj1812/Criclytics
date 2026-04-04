import type { MatchDetail, MatchStatus } from "@/types/cricket";
import { toAbsoluteUrl } from "@/hooks/use-page-metadata";

export function buildWebsiteSchema() {
  const origin = toAbsoluteUrl("/");

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Criclytics",
    url: origin,
    description:
      "Criclytics is a live cricket match centre for scores, fixtures, completed results, full scorecards, and cricket media.",
    potentialAction: {
      "@type": "SearchAction",
      target: `${origin}?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
}

export function buildCollectionPageSchema({
  name,
  description,
  path
}: {
  name: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: toAbsoluteUrl(path),
    isPartOf: {
      "@type": "WebSite",
      name: "Criclytics",
      url: toAbsoluteUrl("/")
    }
  };
}

export function buildSportsEventSchema(match: MatchDetail) {
  const [teamA, teamB] = match.teams;

  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${teamA.name} vs ${teamB.name}`,
    sport: "Cricket",
    description: `${match.statusText}. ${match.resultText}${match.tossSummary ? ` ${match.tossSummary}` : ""}`,
    eventStatus: getEventStatusUrl(match.status),
    startDate: match.startTime,
    location: {
      "@type": "Place",
      name: match.venue
    },
    competitor: [
      {
        "@type": "SportsTeam",
        name: teamA.name,
        logo: teamA.logoUrl || undefined
      },
      {
        "@type": "SportsTeam",
        name: teamB.name,
        logo: teamB.logoUrl || undefined
      }
    ],
    url: toAbsoluteUrl(`/match/${match.id}`),
    image: [teamA.logoUrl, teamB.logoUrl].filter(Boolean)
  };
}

function getEventStatusUrl(status: MatchStatus) {
  switch (status) {
    case "live":
      return "https://schema.org/EventInProgress";
    case "completed":
      return "https://schema.org/EventCompleted";
    case "upcoming":
    default:
      return "https://schema.org/EventScheduled";
  }
}
