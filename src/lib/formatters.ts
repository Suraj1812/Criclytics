import type { MatchStatus, MatchSummary } from "@/types/cricket";

const DEFAULT_LOCALE = typeof navigator !== "undefined" ? navigator.language : "en-US";

function getDateFormatter(format: "short" | "long") {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    weekday: format === "long" ? "long" : "short",
    day: "numeric",
    month: format === "long" ? "long" : "short",
    year: format === "long" ? "numeric" : undefined,
    hour: "numeric",
    minute: "2-digit"
  });
}

export function formatMatchDate(value: string | null, format: "short" | "long" = "short") {
  if (!value) {
    return "Schedule to be confirmed";
  }

  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    return value;
  }

  return getDateFormatter(format).format(parsed);
}

export function formatMatchDateWithZone(value: string | null, format: "short" | "long" = "short") {
  if (!value) {
    return "Schedule to be confirmed";
  }

  const formatted = formatMatchDate(value, format);
  const zone = getLocalTimeZoneLabel();

  return `${formatted} ${zone}`.trim();
}

export function formatRelativeUpdate(value: string) {
  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    return "Updated just now";
  }

  const deltaMs = Date.now() - parsed;
  const deltaSeconds = Math.max(Math.round(deltaMs / 1_000), 0);

  if (deltaSeconds < 60) {
    return `Updated ${deltaSeconds}s ago`;
  }

  const deltaMinutes = Math.round(deltaSeconds / 60);

  if (deltaMinutes < 60) {
    return `Updated ${deltaMinutes}m ago`;
  }

  const deltaHours = Math.round(deltaMinutes / 60);

  if (deltaHours < 24) {
    return `Updated ${deltaHours}h ago`;
  }

  const deltaDays = Math.round(deltaHours / 24);
  return `Updated ${deltaDays}d ago`;
}

export function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

export function filterMatches(matches: MatchSummary[], searchValue: string) {
  const normalized = normalizeSearchValue(searchValue);

  if (!normalized) {
    return matches;
  }

  return matches.filter((match) => getMatchSearchText(match).includes(normalized));
}

export function getMatchSearchText(match: MatchSummary) {
  return [
    match.seriesName,
    match.venue,
    match.statusText,
    match.summary,
    match.tossSummary || "",
    match.resultText,
    ...match.teams.map((team) => `${team.name} ${team.shortName} ${team.code}`)
  ]
    .join(" ")
    .toLowerCase();
}

export function getStatusLabel(status: MatchStatus) {
  return {
    live: "Live",
    upcoming: "Upcoming",
    completed: "Completed"
  }[status];
}

export function getStatusDescription(status: MatchStatus) {
  return {
    live: "Matches updating in real time.",
    upcoming: "Fixtures, venues, and scheduled starts.",
    completed: "Final scorecards and closing results."
  }[status];
}

export function getStatusEmptyMessage(status: MatchStatus) {
  return {
    live: "No live matches are in progress right now.",
    upcoming: "No upcoming matches are available for this filter yet.",
    completed: "No completed matches are available for this filter yet."
  }[status];
}

export function formatMatchStatusText(match: Pick<MatchSummary, "status" | "statusText" | "startTime">) {
  if (match.status === "upcoming" && match.startTime) {
    return `Starts ${formatMatchDateWithZone(match.startTime, "short")}`;
  }

  return localizeProviderTimeText(match.statusText, match.startTime);
}

export function formatMatchSummaryText(match: Pick<MatchSummary, "status" | "summary" | "statusText" | "startTime">) {
  if (match.status === "upcoming" && match.startTime) {
    const [prefix] = match.summary.split("•").map((part) => part.trim()).filter(Boolean);

    if (prefix && prefix.toLowerCase() !== match.statusText.trim().toLowerCase()) {
      return `${prefix} • Starts ${formatMatchDateWithZone(match.startTime, "short")}`;
    }

    return `Starts ${formatMatchDateWithZone(match.startTime, "short")}`;
  }

  return localizeProviderTimeText(match.summary, match.startTime);
}

export function formatVenue(value: string) {
  if (!value) {
    return "Venue to be confirmed";
  }

  return value;
}

export function formatSeriesLabel(value: string | null | undefined) {
  if (!value || value === "all") {
    return "All series";
  }

  return value;
}

export function getLocalTimeZoneLabel() {
  try {
    const parts = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
      hour: "numeric",
      timeZoneName: "short"
    }).formatToParts(new Date());

    return parts.find((part) => part.type === "timeZoneName")?.value || Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time";
  } catch {
    return "Local time";
  }
}

function localizeProviderTimeText(text: string, startTime: string | null) {
  if (!text) {
    return text;
  }

  if (!startTime || Number.isNaN(Date.parse(startTime))) {
    return text;
  }

  if (!/\b(gmt|utc)\b/i.test(text) && !/match starts at/i.test(text)) {
    return text;
  }

  return text
    .replace(/match starts at\s+[^.,;]+/i, `Starts ${formatMatchDateWithZone(startTime, "short")}`)
    .replace(/\b(gmt|utc)\b/gi, getLocalTimeZoneLabel())
    .replace(/\s{2,}/g, " ")
    .trim();
}
