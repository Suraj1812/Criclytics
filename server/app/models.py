from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class MatchStatus(str, Enum):
    LIVE = "live"
    UPCOMING = "upcoming"
    COMPLETED = "completed"


class ApiErrorModel(BaseModel):
    code: str
    message: str
    retryable: bool


class ApiErrorPayload(BaseModel):
    error: ApiErrorModel


class SeriesOption(BaseModel):
    value: str
    label: str
    count: int


class MediaItem(BaseModel):
    id: str
    kind: str
    title: str
    href: str
    imageUrl: Optional[str] = None
    summary: Optional[str] = None
    contextLabel: Optional[str] = None
    publishedLabel: Optional[str] = None
    durationLabel: Optional[str] = None


class GalleryImage(BaseModel):
    id: str
    imageUrl: str
    caption: Optional[str] = None
    altText: Optional[str] = None


class MediaDetail(MediaItem):
    sourceLabel: Optional[str] = None
    streamUrl: Optional[str] = None
    galleryImages: List[GalleryImage] = Field(default_factory=list)


class SeriesMediaBundle(BaseModel):
    seriesId: str
    seriesName: str
    seriesUrl: str
    coverImageUrl: Optional[str] = None
    stories: List[MediaItem] = Field(default_factory=list)
    videos: List[MediaItem] = Field(default_factory=list)
    photos: List[MediaItem] = Field(default_factory=list)
    photosUrl: Optional[str] = None


class TeamSummary(BaseModel):
    name: str
    shortName: str
    code: str
    imageId: Optional[int] = None
    logoUrl: Optional[str] = None


class ScoreLine(BaseModel):
    inning: str
    teamName: str
    runs: Optional[int] = None
    wickets: Optional[int] = None
    overs: Optional[str] = None
    display: str


class MatchSummary(BaseModel):
    id: str
    seriesName: str
    venue: str
    startTime: Optional[str] = None
    matchType: str
    status: MatchStatus
    statusText: str
    summary: str
    tossSummary: Optional[str] = None
    resultText: str
    teams: List[TeamSummary] = Field(default_factory=list)
    scoreLines: List[ScoreLine] = Field(default_factory=list)
    lastUpdated: str
    hasScorecard: bool


class TopPerformer(BaseModel):
    label: str
    playerName: str
    value: str
    secondary: str


class BatterRow(BaseModel):
    name: str
    runs: int
    balls: int
    fours: int
    sixes: int
    strikeRate: str
    dismissal: str
    isOut: bool


class BowlerRow(BaseModel):
    name: str
    overs: str
    maidens: int
    runs: int
    wickets: int
    economy: str


class InningScorecard(BaseModel):
    id: str
    name: str
    battingRows: List[BatterRow] = Field(default_factory=list)
    bowlingRows: List[BowlerRow] = Field(default_factory=list)
    fallOfWickets: List[str] = Field(default_factory=list)
    extras: Optional[str] = None
    total: Optional[str] = None
    partnershipNote: Optional[str] = None


class SquadInfo(BaseModel):
    teamName: str
    players: List[str] = Field(default_factory=list)


class TimelineEvent(BaseModel):
    id: str
    label: str
    detail: str


class MatchDetail(MatchSummary):
    dateLabel: str
    playerOfMatch: Optional[str] = None
    topBatters: List[TopPerformer] = Field(default_factory=list)
    topBowlers: List[TopPerformer] = Field(default_factory=list)
    innings: List[InningScorecard] = Field(default_factory=list)
    timeline: List[TimelineEvent] = Field(default_factory=list)
    squads: List[SquadInfo] = Field(default_factory=list)
    partnershipInfo: Optional[str] = None
    detailNotice: Optional[str] = None
    featuredMedia: Optional[SeriesMediaBundle] = None


class DashboardPayload(BaseModel):
    provider: str
    fetchedAt: str
    isStale: bool = False
    cacheAgeSeconds: int = 0
    refreshIntervalSeconds: int = 0
    fallbackMessage: Optional[str] = None
    appliedSeriesFilter: Optional[str] = None
    defaultSeriesFilter: Optional[str] = None
    seriesOptions: List[SeriesOption] = Field(default_factory=list)
    live: List[MatchSummary] = Field(default_factory=list)
    upcoming: List[MatchSummary] = Field(default_factory=list)
    completed: List[MatchSummary] = Field(default_factory=list)
    featuredMedia: Optional[SeriesMediaBundle] = None
