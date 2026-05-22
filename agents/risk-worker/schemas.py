from pydantic import BaseModel


class LeaderMetrics(BaseModel):
    pnl7d: float
    pnl30d: float
    maxDrawdown7d: float
    maxDrawdown30d: float
    winRate7d: float
    winRate30d: float
    avgLeverage: float
    positionConcentration: float
    tradeFrequencyChange: float


class Leader(BaseModel):
    id: str
    name: str
    venue: str
    metrics: LeaderMetrics | None = None


class LeaderSnapshot(BaseModel):
    date: str
    metrics: LeaderMetrics


class LeaderDetail(Leader):
    metricsHistory: list[LeaderSnapshot]


class RiskSummary(BaseModel):
    leaderId: str
    riskScoreBps: int
    action: str
    confidenceBps: int
    summaryReason: str


class RiskReport(BaseModel):
    leaderId: str
    bondId: int
    riskScoreBps: int
    degradationDetected: bool
    action: str
    recommendedAllocationBps: int
    confidenceBps: int
    reasons: list[str]
    bondAction: str
    reportHash: str


class RiskCheckRequest(BaseModel):
    leaderId: str
    bondId: int
