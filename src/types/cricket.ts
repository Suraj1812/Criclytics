export type MatchStatus = "live" | "upcoming" | "completed";

export interface SeriesOption {
  value: string;
  label: string;
  count: number;
}

export interface MediaItem {
  id: string;
  kind: string;
  title: string;
  href: string;
  imageUrl: string | null;
  summary: string | null;
  contextLabel: string | null;
  publishedLabel: string | null;
  durationLabel: string | null;
}

export interface GalleryImage {
  id: string;
  imageUrl: string;
  caption: string | null;
  altText: string | null;
}

export interface MediaDetail extends MediaItem {
  sourceLabel: string | null;
  streamUrl: string | null;
  galleryImages: GalleryImage[];
}

export interface SeriesMediaBundle {
  seriesId: string;
  seriesName: string;
  seriesUrl: string;
  coverImageUrl: string | null;
  stories: MediaItem[];
  videos: MediaItem[];
  photos: MediaItem[];
  photosUrl: string | null;
}

export interface TeamSummary {
  name: string;
  shortName: string;
  code: string;
  imageId: number | null;
  logoUrl: string | null;
}

export interface ScoreLine {
  inning: string;
  teamName: string;
  runs: number | null;
  wickets: number | null;
  overs: string | null;
  display: string;
}

export interface MatchSummary {
  id: string;
  seriesName: string;
  venue: string;
  startTime: string | null;
  matchType: string;
  status: MatchStatus;
  statusText: string;
  summary: string;
  tossSummary: string | null;
  resultText: string;
  teams: [TeamSummary, TeamSummary] | TeamSummary[];
  scoreLines: ScoreLine[];
  lastUpdated: string;
  hasScorecard: boolean;
}

export interface TopPerformer {
  label: string;
  playerName: string;
  value: string;
  secondary: string;
}

export interface BatterRow {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: string;
  dismissal: string;
  isOut: boolean;
}

export interface BowlerRow {
  name: string;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
  economy: string;
}

export interface InningScorecard {
  id: string;
  name: string;
  battingRows: BatterRow[];
  bowlingRows: BowlerRow[];
  fallOfWickets: string[];
  extras: string | null;
  total: string | null;
  partnershipNote: string | null;
}

export interface SquadInfo {
  teamName: string;
  players: string[];
}

export interface TimelineEvent {
  id: string;
  label: string;
  detail: string;
}

export interface MatchDetail extends MatchSummary {
  dateLabel: string;
  playerOfMatch: string | null;
  topBatters: TopPerformer[];
  topBowlers: TopPerformer[];
  innings: InningScorecard[];
  timeline: TimelineEvent[];
  squads: SquadInfo[];
  partnershipInfo: string | null;
  detailNotice: string | null;
  featuredMedia: SeriesMediaBundle | null;
}

export interface DashboardPayload {
  provider: string;
  fetchedAt: string;
  isStale: boolean;
  cacheAgeSeconds: number;
  refreshIntervalSeconds: number;
  fallbackMessage: string | null;
  appliedSeriesFilter: string | null;
  defaultSeriesFilter: string | null;
  seriesOptions: SeriesOption[];
  live: MatchSummary[];
  upcoming: MatchSummary[];
  completed: MatchSummary[];
  featuredMedia: SeriesMediaBundle | null;
}

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
}
