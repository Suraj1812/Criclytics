import { ArrowUpRight, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { TeamAvatar } from "@/components/shared/TeamAvatar";
import { teamScore } from "@/components/dashboard/MatchCard";
import { formatMatchDate, formatMatchStatusText } from "@/lib/formatters";
import type { MatchSummary } from "@/types/cricket";

export function MatchFeature({
  match,
  detail = false,
}: {
  match: MatchSummary;
  detail?: boolean;
}) {
  return (
    <div className="feature-board flex h-full flex-col rounded-lg p-6 sm:p-8">
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-white/65">
          {match.status === "live"
            ? "In play / Featured match"
            : match.status === "upcoming"
              ? "Next on the field"
              : "From the final whistle"}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-[#d7f395] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#153326]">
          {match.status === "live" && (
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
          )}
          {match.status === "live"
            ? "Live"
            : match.status === "completed"
              ? "Result"
              : match.matchType}
        </span>
      </div>
      <div className="relative z-10 mt-6 flex flex-wrap items-center gap-2 text-xs text-white/65">
        <span>{match.seriesName}</span>
        <span className="text-white/25">/</span>
        <span>{match.matchType}</span>
      </div>
      <div className="relative z-10 my-6 space-y-6 sm:my-7">
        {match.teams.slice(0, 2).map((team) => {
          const scores = teamScore(match, team);
          const last = scores[scores.length - 1];
          return (
            <div className="score-row" key={team.name}>
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <TeamAvatar size="md" team={team} />
                <div>
                  <p className="hidden text-2xl font-semibold tracking-tight sm:block">
                    {team.name}
                  </p>
                  <p className="text-2xl font-semibold sm:hidden">
                    {team.shortName}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-white/65">
                    {team.code}
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="score-number text-4xl font-semibold sm:text-5xl">
                  {last
                    ? `${last.runs ?? "—"}${last.wickets != null ? `/${last.wickets}` : ""}`
                    : "—"}
                </p>
                <p className="mt-1 text-[10px] text-white/65">
                  {last?.overs ? `${last.overs} overs` : "Yet to bat"}
                  {scores.length > 1
                    ? ` · 1st innings ${scores[0].runs}/${scores[0].wickets}`
                    : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="relative z-10 mb-6 text-sm font-medium text-[#d7f395]">
        {match.status === "upcoming"
          ? formatMatchDate(match.startTime, "long")
          : formatMatchStatusText(match)}
      </p>
      <div className="relative z-10 mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-4">
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-white/65">
          <MapPin className="h-3 w-3 shrink-0" />
          {match.venue}
        </span>
        {!detail && (
          <Link
            className="flex shrink-0 items-center gap-2 text-xs font-semibold text-white hover:text-[#d7f395]"
            to={`/match/${match.id}`}
          >
            Full scorecard <ArrowUpRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
