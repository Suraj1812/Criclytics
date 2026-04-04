from __future__ import annotations

import re
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Iterable, Optional

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover
    ZoneInfo = None

from .models import (
    BatterRow,
    BowlerRow,
    DashboardPayload,
    InningScorecard,
    MediaItem,
    MatchDetail,
    MatchStatus,
    MatchSummary,
    ScoreLine,
    SeriesMediaBundle,
    SeriesOption,
    SquadInfo,
    TeamSummary,
    TimelineEvent,
    TopPerformer,
)
from .sources.cricbuzz import DashboardSourceSnapshot


IST_ZONE = ZoneInfo("Asia/Kolkata") if ZoneInfo else None


def build_dashboard_payload(
    snapshot: DashboardSourceSnapshot,
    *,
    requested_series: Optional[str],
    default_series_filter: Optional[str],
    status_filter: Optional[MatchStatus] = None,
    is_stale: bool = False,
    cache_age_seconds: int = 0,
    refresh_interval_seconds: int = 0,
    fallback_message: Optional[str] = None,
) -> DashboardPayload:
    applied_series_filter = normalize_filter(requested_series) if requested_series is not None else normalize_filter(default_series_filter)
    filtered_matches = apply_series_filter(snapshot.raw_matches, applied_series_filter)
    normalized_matches = [normalize_match_summary(match, slug_map=snapshot.slug_map, fetched_at=snapshot.fetched_at) for match in filtered_matches]

    live = [match for match in normalized_matches if match.status == MatchStatus.LIVE]
    upcoming = [match for match in normalized_matches if match.status == MatchStatus.UPCOMING]
    completed = [match for match in normalized_matches if match.status == MatchStatus.COMPLETED]

    live.sort(key=lambda match: (status_priority(match.statusText), sort_time(match.startTime), match.seriesName, match.id))
    upcoming.sort(key=lambda match: (sort_time(match.startTime), match.seriesName, match.id))
    completed.sort(key=lambda match: (sort_time(match.startTime), match.seriesName, match.id), reverse=True)

    if status_filter is not None:
        live = live if status_filter == MatchStatus.LIVE else []
        upcoming = upcoming if status_filter == MatchStatus.UPCOMING else []
        completed = completed if status_filter == MatchStatus.COMPLETED else []

    featured_media = select_featured_media_bundle(snapshot, filtered_matches)

    return DashboardPayload(
        provider="Criclytics Match Engine",
        fetchedAt=snapshot.fetched_at,
        isStale=is_stale,
        cacheAgeSeconds=max(cache_age_seconds, 0),
        refreshIntervalSeconds=max(refresh_interval_seconds, 0),
        fallbackMessage=fallback_message,
        appliedSeriesFilter=applied_series_filter,
        defaultSeriesFilter=normalize_filter(default_series_filter),
        seriesOptions=build_series_options(snapshot.raw_matches),
        live=live,
        upcoming=upcoming,
        completed=completed,
        featuredMedia=featured_media,
    )


def normalize_match_summary(raw_match: dict[str, Any], *, slug_map: dict[str, str], fetched_at: str) -> MatchSummary:
    match_info = as_dict(raw_match.get("matchInfo"))
    match_score = as_dict(raw_match.get("matchScore"))
    match_id = first_text(match_info.get("matchId"), raw_match.get("matchId"))
    teams = [normalize_team(match_info.get("team1")), normalize_team(match_info.get("team2"))]
    venue = build_venue(match_info.get("venueInfo")) or "Venue not listed"
    start_time = to_iso_datetime(match_info.get("startDate"))
    state = first_text(match_info.get("state"), match_info.get("stateTitle"))
    status_text = first_text(match_info.get("status"), state, match_info.get("matchDesc"), "Status update pending")

    return MatchSummary(
        id=match_id,
        seriesName=first_text(match_info.get("seriesName"), "Unknown series"),
        venue=venue,
        startTime=start_time,
        matchType=first_text(match_info.get("matchFormat"), match_info.get("matchType"), match_info.get("matchDesc"), "Match"),
        status=map_match_status(state, status_text),
        statusText=status_text,
        summary=build_summary(match_info, status_text),
        tossSummary=None,
        resultText=first_text(match_info.get("status"), status_text),
        teams=teams,
        scoreLines=extract_score_lines(match_score, teams),
        lastUpdated=fetched_at,
        hasScorecard=bool(slug_map.get(match_id)),
    )


def normalize_match_detail(
    raw_match: dict[str, Any],
    *,
    slug: Optional[str],
    scorecard_payload: Optional[dict[str, Any]],
    source_fetched_at: str,
    series_media_map: Optional[dict[str, dict[str, Any]]] = None,
    fallback_error_message: Optional[str] = None,
) -> MatchDetail:
    summary = normalize_match_summary(
        raw_match,
        slug_map={summary_id: slug for summary_id in [first_text(as_dict(raw_match.get("matchInfo")).get("matchId"), raw_match.get("matchId"))] if slug},
        fetched_at=source_fetched_at,
    )
    match_info = as_dict(raw_match.get("matchInfo"))
    match_header = as_dict((scorecard_payload or {}).get("matchHeader"))
    innings_payload = as_list((scorecard_payload or {}).get("scoreCard"))
    detail_status_text = first_text((scorecard_payload or {}).get("status"), match_header.get("status"), summary.statusText)
    detail_status = map_match_status(first_text(match_header.get("state"), match_info.get("state")), detail_status_text)
    start_time = first_text(
        to_iso_datetime(match_header.get("matchStartTimestamp")),
        to_iso_datetime(match_header.get("startTimestamp")),
        summary.startTime,
    )
    venue = build_venue(match_header.get("venue"), match_info.get("venueInfo")) or summary.venue
    toss_summary = build_toss_summary(match_header)
    innings = [normalize_inning(index, inning) for index, inning in enumerate(innings_payload)]
    innings = [inning for inning in innings if inning.battingRows or inning.bowlingRows or inning.total]
    top_batters = build_top_batters(innings)
    top_bowlers = build_top_bowlers(innings)
    squads = build_squads(innings, summary.teams)
    partnership_info = next((inning.partnershipNote for inning in reversed(innings) if inning.partnershipNote), None)
    player_of_match = extract_player_name(first_item(as_list(match_header.get("playersOfTheMatch")))) or None
    last_updated = first_text(to_iso_datetime((scorecard_payload or {}).get("responseLastUpdated")), source_fetched_at)
    detail_notice = None

    if not innings:
        if detail_status == MatchStatus.UPCOMING:
            detail_notice = "Full batting and bowling scorecards will appear here once the match starts."
        elif fallback_error_message:
            detail_notice = fallback_error_message
        else:
            detail_notice = "Detailed innings tables are not available in the embedded feed yet."

    series_id = first_text(match_header.get("seriesId"), match_info.get("seriesId"))
    series_media = build_series_media_bundle(series_id=series_id, media_data=(series_media_map or {}).get(series_id))
    payload = summary.model_dump()
    payload.update(
        {
            "seriesName": first_text(match_header.get("seriesName"), summary.seriesName),
            "venue": venue,
            "startTime": start_time,
            "status": detail_status,
            "statusText": detail_status_text,
            "summary": detail_status_text,
            "tossSummary": toss_summary,
            "resultText": first_text(detail_status_text, summary.resultText),
            "scoreLines": build_detail_score_lines(innings, summary.scoreLines),
            "lastUpdated": last_updated,
            "hasScorecard": bool(slug),
            "dateLabel": format_date_label(start_time),
            "playerOfMatch": player_of_match,
            "topBatters": top_batters,
            "topBowlers": top_bowlers,
            "innings": innings,
            "timeline": build_timeline(
                series_name=first_text(match_header.get("seriesName"), summary.seriesName),
                venue=venue,
                date_label=format_date_label(start_time),
                status_text=detail_status_text,
                toss_summary=toss_summary,
                result_text=first_text(detail_status_text, summary.resultText),
                player_of_match=player_of_match,
                innings=innings,
            ),
            "squads": squads,
            "partnershipInfo": partnership_info,
            "detailNotice": detail_notice,
            "featuredMedia": series_media,
        }
    )

    return MatchDetail(**payload)


def build_series_options(raw_matches: list[dict[str, Any]]) -> list[SeriesOption]:
    counts: dict[str, SeriesOption] = {}

    for match in raw_matches:
        series_name = first_text(as_dict(match.get("matchInfo")).get("seriesName"))
        if not series_name:
            continue
        key = normalize_filter(series_name) or series_name.lower()
        if key not in counts:
            counts[key] = SeriesOption(value=key, label=series_name, count=0)
        counts[key].count += 1

    return sorted(counts.values(), key=lambda item: (item.label.lower(), item.value))


def apply_series_filter(raw_matches: list[dict[str, Any]], series_filter: Optional[str]) -> list[dict[str, Any]]:
    if not series_filter or series_filter == "all":
        return raw_matches

    filtered: list[dict[str, Any]] = []

    for match in raw_matches:
        match_info = as_dict(match.get("matchInfo"))
        haystack = " ".join(
            [
                first_text(match_info.get("seriesName")),
                first_text(match_info.get("matchDesc")),
                first_text(as_dict(match_info.get("team1")).get("teamName")),
                first_text(as_dict(match_info.get("team2")).get("teamName")),
            ]
        ).lower()

        if series_filter in haystack:
            filtered.append(match)

    return filtered


def find_match_by_id(raw_matches: Iterable[dict[str, Any]], match_id: str) -> Optional[dict[str, Any]]:
    for match in raw_matches:
        match_info = as_dict(match.get("matchInfo"))
        if first_text(match_info.get("matchId"), match.get("matchId")) == str(match_id):
            return match
    return None


def normalize_team(payload: Any) -> TeamSummary:
    team = as_dict(payload)
    name = first_text(team.get("teamName"), team.get("name"), "Team")
    short_name = first_text(team.get("teamSName"), team.get("teamShortName"), team.get("shortName"), abbreviate(name))
    code = first_text(team.get("teamSName"), team.get("code"), short_name)
    image_id = nullable_int(team.get("imageId"))
    return TeamSummary(name=name, shortName=short_name, code=code, imageId=image_id, logoUrl=build_team_logo_url(image_id))


def build_team_logo_url(image_id: Optional[int]) -> Optional[str]:
    if image_id is None:
        return None

    return f"https://static.cricbuzz.com/a/img/v1/72x72/i1/c{image_id}/i.jpg"


def select_featured_media_bundle(snapshot: DashboardSourceSnapshot, filtered_matches: list[dict[str, Any]]) -> Optional[SeriesMediaBundle]:
    if not filtered_matches:
        return None

    bundles: list[SeriesMediaBundle] = []
    seen_series: set[str] = set()

    for match in filtered_matches:
        series_id = first_text(as_dict(match.get("matchInfo")).get("seriesId"))
        if not series_id or series_id in seen_series:
            continue

        seen_series.add(series_id)
        bundle = build_series_media_bundle(series_id=series_id, media_data=snapshot.series_media_map.get(series_id))
        if bundle:
            bundles.append(bundle)

        if len(bundles) >= 3:
            break

    if not bundles:
        return None

    if len(bundles) == 1:
        return bundles[0]

    return SeriesMediaBundle(
        seriesId="criclytics-desk",
        seriesName="Criclytics media desk",
        seriesUrl=bundles[0].seriesUrl,
        coverImageUrl=next((bundle.coverImageUrl for bundle in bundles if bundle.coverImageUrl), None),
        stories=merge_media_items(*(bundle.stories for bundle in bundles), limit=30),
        videos=merge_media_items(*(bundle.videos for bundle in bundles), limit=40),
        photos=merge_media_items(*(bundle.photos for bundle in bundles), limit=24),
        photosUrl=next((bundle.photosUrl for bundle in bundles if bundle.photosUrl), None),
    )


def build_series_media_bundle(*, series_id: Optional[str], media_data: Optional[dict[str, Any]]) -> Optional[SeriesMediaBundle]:
    if not series_id or not media_data:
        return None

    stories = [MediaItem(**item) for item in media_data.get("stories", [])]
    videos = [MediaItem(**item) for item in media_data.get("videos", [])]
    photos = [MediaItem(**item) for item in media_data.get("photos", [])]

    if not stories and not videos and not photos:
        return None

    return SeriesMediaBundle(
        seriesId=series_id,
        seriesName=first_text(media_data.get("seriesName"), "Featured series"),
        seriesUrl=first_text(media_data.get("seriesUrl"), "#"),
        coverImageUrl=first_text(media_data.get("coverImageUrl")) or None,
        stories=stories,
        videos=videos,
        photos=photos,
        photosUrl=first_text(media_data.get("photosUrl")) or None,
    )


def merge_media_items(*groups: list[MediaItem], limit: int) -> list[MediaItem]:
    merged: list[MediaItem] = []
    seen: set[str] = set()

    for group in groups:
        for item in group:
            href = item.href

            if href in seen:
                continue

            seen.add(href)
            merged.append(item)

            if len(merged) >= limit:
                return merged

    return merged


def extract_score_lines(match_score: dict[str, Any], teams: list[TeamSummary]) -> list[ScoreLine]:
    lines: list[ScoreLine] = []

    for index, key in enumerate(("team1Score", "team2Score")):
        innings_payload = as_dict(match_score.get(key))
        if not innings_payload:
            continue

        team = teams[index] if index < len(teams) else TeamSummary(name=f"Team {index + 1}", shortName=f"T{index + 1}", code=f"T{index + 1}")

        for inning_key, inning_score in sort_keyed_objects(innings_payload):
            inning_data = as_dict(inning_score)
            runs = nullable_int(inning_data.get("runs"))
            wickets = nullable_int(inning_data.get("wickets"))
            overs = format_overs(inning_data.get("overs")) or None

            if runs is None and wickets is None and not overs:
                continue

            lines.append(
                ScoreLine(
                    inning=first_text(
                        inning_data.get("inning"),
                        inning_data.get("inningDesc"),
                        f"{team.shortName} innings {extract_suffix_number(inning_key) or 1}",
                    ),
                    teamName=team.name,
                    runs=runs,
                    wickets=wickets,
                    overs=overs,
                    display=f"{team.shortName} {format_score(runs, wickets)}",
                )
            )

    return lines


def normalize_inning(index: int, inning: dict[str, Any]) -> InningScorecard:
    bat_team = as_dict(inning.get("batTeamDetails"))
    bowl_team = as_dict(inning.get("bowlTeamDetails"))
    score_details = as_dict(inning.get("scoreDetails"))
    extras_data = as_dict(inning.get("extrasData"))
    wickets_data = as_dict(inning.get("wicketsData"))
    partnerships_data = as_dict(inning.get("partnershipsData"))

    return InningScorecard(
        id=first_text(inning.get("inningsId"), index + 1),
        name=first_text(bat_team.get("batTeamName"), bat_team.get("batTeamShortName"), f"Innings {index + 1}"),
        battingRows=normalize_batting_rows(bat_team.get("batsmenData")),
        bowlingRows=normalize_bowling_rows(bowl_team.get("bowlersData")),
        fallOfWickets=build_fall_of_wickets(wickets_data),
        extras=format_extras(extras_data),
        total=format_total(score_details),
        partnershipNote=extract_partnership_note(partnerships_data),
    )


def normalize_batting_rows(payload: Any) -> list[BatterRow]:
    rows: list[BatterRow] = []

    for _, batter in sort_keyed_objects(payload):
        name = extract_player_name(batter)
        if not name:
            continue

        runs = to_int(batter.get("runs"))
        balls = to_int(batter.get("balls"))
        dismissal = first_text(
            batter.get("outDesc"),
            batter.get("dismissalText"),
            "not out" if not truthy(batter.get("isOut")) else "Out",
        )

        if dismissal.lower() == "batting":
            dismissal = "not out"

        rows.append(
            BatterRow(
                name=name,
                runs=runs,
                balls=balls,
                fours=to_int(first_non_null(batter.get("fours"), batter.get("boundaries"))),
                sixes=to_int(first_non_null(batter.get("sixes"), batter.get("sixers"))),
                strikeRate=format_decimal(batter.get("strikeRate")),
                dismissal=dismissal,
                isOut=truthy(batter.get("isOut")) or dismissal.lower() not in {"not out", "batting"},
            )
        )

    return rows


def normalize_bowling_rows(payload: Any) -> list[BowlerRow]:
    rows: list[BowlerRow] = []

    for _, bowler in sort_keyed_objects(payload):
        name = extract_player_name(bowler)
        if not name:
            continue

        rows.append(
            BowlerRow(
                name=name,
                overs=format_overs(bowler.get("overs")),
                maidens=to_int(bowler.get("maidens")),
                runs=to_int(bowler.get("runs")),
                wickets=to_int(first_non_null(bowler.get("wickets"), bowler.get("wkts"))),
                economy=format_decimal(first_non_null(bowler.get("economy"), bowler.get("econ"))),
            )
        )

    return rows


def build_top_batters(innings: list[InningScorecard]) -> list[TopPerformer]:
    rows: list[tuple[int, int, TopPerformer]] = []

    for inning in innings:
        for batter in inning.battingRows:
            rows.append(
                (
                    batter.runs,
                    batter.balls,
                    TopPerformer(
                        label=inning.name,
                        playerName=batter.name,
                        value=f"{batter.runs} ({batter.balls})",
                        secondary=f"{inning.name} • SR {batter.strikeRate}",
                    ),
                )
            )

    rows.sort(key=lambda item: (-item[0], item[1], item[2].playerName))
    return [item[2] for item in rows[:4]]


def build_top_bowlers(innings: list[InningScorecard]) -> list[TopPerformer]:
    rows: list[tuple[int, float, int, TopPerformer]] = []

    for inning in innings:
        innings_label = inning.name
        for bowler in inning.bowlingRows:
            rows.append(
                (
                    bowler.wickets,
                    decimal_value(bowler.economy),
                    bowler.runs,
                    TopPerformer(
                        label=f"Bowling vs {innings_label}",
                        playerName=bowler.name,
                        value=f"{bowler.wickets}/{bowler.runs}",
                        secondary=f"Against {innings_label} • Econ {bowler.economy}",
                    ),
                )
            )

    rows.sort(key=lambda item: (-item[0], item[1], item[2], item[3].playerName))
    return [item[3] for item in rows[:4]]


def build_squads(innings: list[InningScorecard], teams: list[TeamSummary]) -> list[SquadInfo]:
    player_map: dict[str, set[str]] = defaultdict(set)

    for inning in innings:
        for batter in inning.battingRows:
            player_map[inning.name].add(batter.name)

    squads: list[SquadInfo] = []

    for team in teams:
        players = sorted(player_map.get(team.name) or [])
        if players:
            squads.append(SquadInfo(teamName=team.name, players=players))

    return squads


def build_timeline(
    *,
    series_name: str,
    venue: str,
    date_label: str,
    status_text: str,
    toss_summary: Optional[str],
    result_text: str,
    player_of_match: Optional[str],
    innings: list[InningScorecard],
) -> list[TimelineEvent]:
    timeline = [
        TimelineEvent(id="overview", label="Overview", detail=f"{series_name} • {venue} • {date_label}"),
        TimelineEvent(id="status", label="Status", detail=status_text),
    ]

    if toss_summary:
        timeline.append(TimelineEvent(id="toss", label="Toss", detail=toss_summary))

    for inning in innings:
        detail_bits = [inning.total or "Score pending"]
        if inning.extras:
            detail_bits.append(f"Extras {inning.extras}")
        if inning.partnershipNote:
            detail_bits.append(f"Partnership {inning.partnershipNote}")
        timeline.append(TimelineEvent(id=f"innings-{inning.id}", label=inning.name, detail=" • ".join(detail_bits)))

    if result_text and result_text != status_text:
        timeline.append(TimelineEvent(id="result", label="Result", detail=result_text))

    if player_of_match:
        timeline.append(TimelineEvent(id="pom", label="Player of the match", detail=player_of_match))

    return timeline


def build_detail_score_lines(innings: list[InningScorecard], fallback: list[ScoreLine]) -> list[ScoreLine]:
    lines: list[ScoreLine] = []

    for index, inning in enumerate(innings, start=1):
        if not inning.total:
            continue
        lines.append(
            ScoreLine(
                inning=f"{inning.name} innings {index}",
                teamName=inning.name,
                runs=parse_runs_from_total(inning.total),
                wickets=parse_wickets_from_total(inning.total),
                overs=parse_overs_from_total(inning.total),
                display=f"{inning.name} {inning.total}",
            )
        )

    return lines or fallback


def build_summary(match_info: dict[str, Any], status_text: str) -> str:
    match_desc = first_text(match_info.get("matchDesc"))
    if match_desc and status_text and match_desc.lower() not in status_text.lower():
        return f"{match_desc} • {status_text}"
    return status_text or match_desc or "Match update pending"


def build_venue(*payloads: Any) -> str:
    for payload in payloads:
        venue = as_dict(payload)
        if not venue:
            continue
        parts = [
            first_text(venue.get("ground")),
            first_text(venue.get("name")),
            first_text(venue.get("city")),
            first_text(venue.get("country")),
        ]
        unique_parts: list[str] = []
        for part in parts:
            if part and part not in unique_parts:
                unique_parts.append(part)
        if unique_parts:
            return ", ".join(unique_parts)
    return ""


def build_toss_summary(match_header: dict[str, Any]) -> Optional[str]:
    toss = as_dict(match_header.get("tossResults"))
    if not toss:
        return None
    winner = first_text(toss.get("tossWinnerName"), toss.get("winningTeam"), toss.get("tossWinner"))
    decision = normalize_toss_decision(first_text(toss.get("decision"), toss.get("tossDecision")))
    if winner and decision:
        return f"{winner} won the toss and chose to {decision.lower()} first."
    return winner or decision or None


def build_fall_of_wickets(wickets_data: dict[str, Any]) -> list[str]:
    wickets: list[str] = []

    for _, wicket in sort_keyed_objects(wickets_data):
        wicket_data = as_dict(wicket)
        batter = first_text(wicket_data.get("batName"), wicket_data.get("batsmanName"), wicket_data.get("name"))
        wicket_number = first_text(wicket_data.get("wktNbr"), wicket_data.get("wicketNumber"))
        wicket_runs = first_text(wicket_data.get("wktRuns"), wicket_data.get("score"), wicket_data.get("runs"))
        wicket_over = first_text(wicket_data.get("wktOver"), wicket_data.get("overs"), wicket_data.get("overNum"))
        if not batter:
            continue
        score_part = f"{wicket_number}-{wicket_runs}" if wicket_number and wicket_runs else wicket_runs or wicket_number
        over_part = f", {wicket_over} ov" if wicket_over else ""
        wickets.append(f"{score_part} ({batter}{over_part})".strip())

    return wickets


def extract_partnership_note(partnerships_data: dict[str, Any]) -> Optional[str]:
    partnerships = [as_dict(item) for _, item in sort_keyed_objects(partnerships_data)]
    partnerships = [item for item in partnerships if item]

    if not partnerships:
        return None

    latest = partnerships[-1]
    batters = " & ".join([first_text(latest.get("bat1Name")), first_text(latest.get("bat2Name"))]).strip(" &")
    runs = first_text(latest.get("runs"), latest.get("partnershipRuns"))
    balls = first_text(latest.get("balls"), latest.get("partnershipBalls"))
    parts = [part for part in [batters or None, f"{runs} runs" if runs else None, f"{balls} balls" if balls else None] if part]

    if not parts:
        return None

    if len(parts) == 1:
        return parts[0]

    return f"{parts[0]} • {' • '.join(parts[1:])}"


def format_total(score_details: dict[str, Any]) -> Optional[str]:
    runs = nullable_int(score_details.get("runs"))
    wickets = nullable_int(score_details.get("wickets"))
    overs = format_overs(score_details.get("overs"))
    if runs is None and wickets is None and not overs:
        return None
    score = format_score(runs, wickets)
    return f"{score} ({overs} ov)" if overs else score


def format_extras(extras_data: dict[str, Any]) -> Optional[str]:
    total = nullable_int(extras_data.get("total"))
    if total is None:
        return None
    parts = []
    for label, key in (("b", "byes"), ("lb", "legByes"), ("nb", "noBalls"), ("w", "wides"), ("pen", "penalty")):
        value = nullable_int(extras_data.get(key))
        if value:
            parts.append(f"{label} {value}")
    return f'{total} ({", ".join(parts)})' if parts else str(total)


def parse_runs_from_total(total: str) -> Optional[int]:
    match = re.match(r"(\d+)", total)
    return int(match.group(1)) if match else None


def parse_wickets_from_total(total: str) -> Optional[int]:
    match = re.match(r"\d+/(\d+)", total)
    return int(match.group(1)) if match else None


def parse_overs_from_total(total: str) -> Optional[str]:
    match = re.search(r"\(([^)]+) ov\)", total)
    return match.group(1) if match else None


def map_match_status(state: Optional[str], status_text: Optional[str]) -> MatchStatus:
    haystack = " ".join([first_text(state), first_text(status_text)]).lower()
    if any(keyword in haystack for keyword in ("preview", "upcoming", "fixture", "scheduled", "not started")):
        return MatchStatus.UPCOMING
    if any(keyword in haystack for keyword in ("complete", "completed", "result", "won by", "draw", "abandon", "stumps", "no result", "cancel")):
        return MatchStatus.COMPLETED
    return MatchStatus.LIVE


def normalize_toss_decision(value: str) -> str:
    lowered = value.lower()
    if lowered.startswith("bowl"):
        return "bowl"
    if lowered.startswith("bat"):
        return "bat"
    return value


def status_priority(status_text: str) -> int:
    lowered = status_text.lower()
    if "live" in lowered:
        return 0
    if any(keyword in lowered for keyword in ("innings break", "tea", "lunch")):
        return 1
    return 2


def sort_time(value: Optional[str]) -> str:
    return value or ""


def format_score(runs: Optional[int], wickets: Optional[int]) -> str:
    if runs is None and wickets is None:
        return "Score pending"
    if runs is None:
        return f"0/{wickets}"
    if wickets is None:
        return str(runs)
    return f"{runs}/{wickets}"


def format_overs(value: Any) -> str:
    text = first_text(value)
    if not text:
        return ""
    if text.endswith(".0"):
        return text[:-2]
    return text


def format_decimal(value: Any) -> str:
    if value is None or first_text(value) == "":
        return "0.0"
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return first_text(value) or "0.0"
    return f"{parsed:.1f}" if parsed.is_integer() else f"{parsed:.2f}".rstrip("0").rstrip(".")


def decimal_value(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 9999.0


def format_date_label(value: Optional[str]) -> str:
    if not value:
        return "Date not listed"

    parsed = parse_datetime(value)
    if not parsed:
        return value

    if IST_ZONE:
        parsed = parsed.astimezone(IST_ZONE)
        return parsed.strftime("%a, %d %b %Y • %I:%M %p IST")

    return parsed.strftime("%a, %d %b %Y • %I:%M %p UTC")


def to_iso_datetime(value: Any) -> Optional[str]:
    text = first_text(value)
    if not text:
        return None

    if text.isdigit():
        timestamp = int(text)
        if timestamp > 10_000_000_000:
            timestamp /= 1000
        return datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat().replace("+00:00", "Z")

    parsed = parse_datetime(text)
    if parsed:
        return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")

    return text


def parse_datetime(value: str) -> Optional[datetime]:
    try:
        if value.endswith("Z"):
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def first_text(*values: Any) -> str:
    for value in values:
        text = clean_text(value)
        if text:
            return text
    return ""


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return " ".join(value.replace("\xa0", " ").split())
    if isinstance(value, (int, float)):
        return str(value)
    return ""


def normalize_filter(value: Any) -> Optional[str]:
    text = first_text(value).lower()
    return text or None


def as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def extract_player_name(payload: Any) -> str:
    player = as_dict(payload)
    return first_text(player.get("batName"), player.get("bowlName"), player.get("fullName"), player.get("name"))


def first_item(value: list[Any]) -> Any:
    return value[0] if value else None


def sort_keyed_objects(payload: Any) -> list[tuple[str, dict[str, Any]]]:
    if not isinstance(payload, dict):
        return []
    items = [(key, as_dict(item)) for key, item in payload.items() if isinstance(item, dict)]
    items.sort(key=lambda item: (extract_suffix_number(item[0]), item[0]))
    return items


def extract_suffix_number(value: str) -> int:
    match = re.search(r"(\d+)$", value or "")
    return int(match.group(1)) if match else 0


def first_non_null(*values: Any) -> Any:
    for value in values:
        if value is not None and first_text(value) != "":
            return value
    return None


def truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return first_text(value).lower() in {"1", "true", "yes", "y"}


def nullable_int(value: Any) -> Optional[int]:
    text = first_text(value)
    if not text:
        return None
    try:
        return int(float(text))
    except (TypeError, ValueError):
        return None


def to_int(value: Any) -> int:
    parsed = nullable_int(value)
    return parsed if parsed is not None else 0


def abbreviate(value: str) -> str:
    words = [word for word in re.split(r"\s+", value) if word]
    if not words:
        return "TEAM"
    if len(words) == 1:
        return words[0][:3].upper()
    return "".join(word[0].upper() for word in words[:4])
