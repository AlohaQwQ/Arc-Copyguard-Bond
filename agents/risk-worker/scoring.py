from schemas import LeaderMetrics


def _scale(value: float, low: float, high: float) -> float:
    if value <= low:
        return 0.0
    if value >= high:
        return 10000.0
    return ((value - low) / (high - low)) * 10000.0


def _subscores(metrics: LeaderMetrics) -> dict[str, float]:
    drawdown_base = _scale(metrics.maxDrawdown7d, 0.04, 0.34) * 0.70
    drawdown_acceleration = _scale(
        metrics.maxDrawdown7d - metrics.maxDrawdown30d * 0.5,
        0.0,
        0.18,
    ) * 0.30
    drawdown_score = drawdown_base + drawdown_acceleration

    win_rate_decay_score = _scale(metrics.winRate30d - metrics.winRate7d, 0.02, 0.18)
    leverage_score = _scale(metrics.avgLeverage, 1.5, 9.5)
    concentration_score = _scale(metrics.positionConcentration, 0.20, 0.70)
    trade_frequency_score = _scale(abs(metrics.tradeFrequencyChange - 1.0), 0.10, 1.20)

    expected_7d_pnl = metrics.pnl30d / 4
    pnl_gap_score = _scale(expected_7d_pnl - metrics.pnl7d, 0.0, 0.08) * 0.80
    pnl_drawdown_score = _scale(metrics.maxDrawdown7d, 0.12, 0.35) * 0.20
    pnl_decay_score = pnl_gap_score + pnl_drawdown_score

    return {
        "drawdown": drawdown_score,
        "winRate": win_rate_decay_score,
        "leverage": leverage_score,
        "concentration": concentration_score,
        "tradeFrequency": trade_frequency_score,
        "pnlDecay": pnl_decay_score,
    }


def calculate_risk_score(metrics: LeaderMetrics) -> int:
    scores = _subscores(metrics)
    raw_score = (
        0.25 * scores["drawdown"]
        + 0.20 * scores["winRate"]
        + 0.20 * scores["leverage"]
        + 0.15 * scores["concentration"]
        + 0.10 * scores["tradeFrequency"]
        + 0.10 * scores["pnlDecay"]
    )
    return max(0, min(10000, int(raw_score)))


def generate_reasons(metrics: LeaderMetrics, risk_score_bps: int) -> list[str]:
    reasons: list[tuple[float, str]] = []
    scores = _subscores(metrics)

    if scores["winRate"] >= 3000:
        reasons.append((scores["winRate"], "7d win rate dropped significantly below 30d baseline"))
    if scores["leverage"] >= 3500:
        reasons.append((scores["leverage"], "Leverage regime shifted upward, indicating increased risk"))
    if scores["drawdown"] >= 3500:
        reasons.append((scores["drawdown"], "Drawdown acceleration exceeded safe threshold"))
    if scores["concentration"] >= 4500:
        reasons.append((scores["concentration"], "Position concentration is elevated"))
    if scores["tradeFrequency"] >= 3500:
        reasons.append((scores["tradeFrequency"], "Trade frequency deviated from baseline behavior"))
    if scores["pnlDecay"] >= 3500:
        reasons.append((scores["pnlDecay"], "Recent PnL deteriorated relative to 30d baseline"))

    if not reasons:
        return ["No significant risk detected from recent metrics"]

    reasons.sort(key=lambda item: item[0], reverse=True)
    return [reason for _, reason in reasons[:3]]
