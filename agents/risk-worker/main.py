import json

from Crypto.Hash import keccak
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from mock_data import get_all_leaders, get_latest_metrics, get_leader, get_metrics_history
from schemas import Leader, LeaderDetail, LeaderSnapshot, RiskCheckRequest, RiskReport, RiskSummary
from scoring import calculate_risk_score, generate_reasons

app = FastAPI(title="CopyGuard Risk Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/leaders", response_model=list[Leader])
async def list_leaders():
    return get_all_leaders()


@app.get("/api/leaders/{leader_id}", response_model=LeaderDetail)
async def get_leader_detail(leader_id: str):
    leader = get_leader(leader_id)
    if leader is None:
        raise HTTPException(status_code=404, detail="leader not found")

    history = [
        LeaderSnapshot(date=date, metrics=metrics)
        for date, metrics in get_metrics_history(leader_id)
    ]
    return LeaderDetail(
        id=leader.id,
        name=leader.name,
        venue=leader.venue,
        metrics=leader.metrics,
        metricsHistory=history,
    )


@app.get("/api/risk/{leader_id}", response_model=RiskSummary)
async def get_risk_summary(leader_id: str):
    metrics = get_latest_metrics(leader_id)
    if metrics is None:
        raise HTTPException(status_code=404, detail="leader not found")

    risk_score_bps = calculate_risk_score(metrics)
    reasons = generate_reasons(metrics, risk_score_bps)
    return RiskSummary(
        leaderId=leader_id,
        riskScoreBps=risk_score_bps,
        action=_action_for_score(risk_score_bps),
        confidenceBps=7500,
        summaryReason=reasons[0],
    )


@app.post("/api/oracle/run-risk-check", response_model=RiskReport)
async def run_risk_check(request: RiskCheckRequest):
    metrics = get_latest_metrics(request.leaderId)
    if metrics is None:
        raise HTTPException(status_code=404, detail="leader not found")

    risk_score_bps = calculate_risk_score(metrics)
    reasons = generate_reasons(metrics, risk_score_bps)
    payload = {
        "leaderId": request.leaderId,
        "bondId": request.bondId,
        "riskScoreBps": risk_score_bps,
        "degradationDetected": risk_score_bps > 5000,
        "action": _action_for_score(risk_score_bps),
        "recommendedAllocationBps": max(0, 10000 - risk_score_bps),
        "confidenceBps": 7500,
        "reasons": reasons,
        "bondAction": "NONE",
    }
    return RiskReport(**payload, reportHash=_hash_report(payload))


def _action_for_score(risk_score_bps: int) -> str:
    if risk_score_bps < 3000:
        return "FOLLOW"
    if risk_score_bps <= 7000:
        return "REDUCE"
    return "EXIT"


def _hash_report(payload: dict) -> str:
    canonical_json = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    digest = keccak.new(digest_bits=256)
    digest.update(canonical_json.encode("utf-8"))
    return "0x" + digest.hexdigest()


_ = settings
