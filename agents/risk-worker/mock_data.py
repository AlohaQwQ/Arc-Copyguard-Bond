from schemas import Leader, LeaderMetrics


START_DATE = "2026-04"


def _date(day: int) -> str:
    return f"{START_DATE}-{day:02d}"


def _metrics(
    pnl7d: float,
    pnl30d: float,
    max_drawdown7d: float,
    max_drawdown30d: float,
    win_rate7d: float,
    win_rate30d: float,
    avg_leverage: float,
    position_concentration: float,
    trade_frequency_change: float,
) -> LeaderMetrics:
    return LeaderMetrics(
        pnl7d=pnl7d,
        pnl30d=pnl30d,
        maxDrawdown7d=max_drawdown7d,
        maxDrawdown30d=max_drawdown30d,
        winRate7d=win_rate7d,
        winRate30d=win_rate30d,
        avgLeverage=avg_leverage,
        positionConcentration=position_concentration,
        tradeFrequencyChange=trade_frequency_change,
    )


def _series(values: list[LeaderMetrics]) -> list[tuple[str, LeaderMetrics]]:
    return [(_date(index + 1), metrics) for index, metrics in enumerate(values)]


LEADERS: dict[str, Leader] = {
    "hl_leader_01": Leader(id="hl_leader_01", name="Alpha Whale", venue="Hyperliquid"),
    "hl_leader_02": Leader(id="hl_leader_02", name="Steady Eddie", venue="Hyperliquid"),
    "hl_leader_03": Leader(id="hl_leader_03", name="Reckless Raj", venue="Hyperliquid"),
    "hl_leader_04": Leader(id="hl_leader_04", name="Danger Dan", venue="Hyperliquid"),
    "hl_leader_05": Leader(id="hl_leader_05", name="Volatile Vera", venue="Hyperliquid"),
}


METRICS_HISTORY: dict[str, list[tuple[str, LeaderMetrics]]] = {
    "hl_leader_01": _series(
        [
            _metrics(0.030 + day * 0.0002, 0.105 + day * 0.0005, 0.060 + (day % 3) * 0.005, 0.085, 0.63, 0.62, 2.9 + (day % 2) * 0.1, 0.30, 1.04)
            for day in range(29)
        ]
        + [_metrics(0.036, 0.120, 0.080, 0.090, 0.64, 0.62, 3.1, 0.32, 1.08)]
    ),
    "hl_leader_02": _series(
        [
            _metrics(0.020 + day * 0.0001, 0.085 + day * 0.0004, 0.055 + (day % 4) * 0.004, 0.080, 0.60, 0.61, 2.7 + (day % 3) * 0.1, 0.29, 0.95)
            for day in range(29)
        ]
        + [_metrics(0.024, 0.096, 0.075, 0.085, 0.61, 0.61, 3.0, 0.31, 0.92)]
    ),
    "hl_leader_03": _series(
        [
            _metrics(0.020, 0.090, 0.100 + day * 0.002, 0.140, 0.55 - day * 0.002, 0.56, 4.0 + day * 0.05, 0.35, 1.10)
            for day in range(10)
        ]
        + [
            _metrics(0.005 - day * 0.001, 0.070, 0.200 + day * 0.004, 0.250, 0.45 - day * 0.003, 0.53, 6.0 + day * 0.08, 0.45, 1.35)
            for day in range(10)
        ]
        + [
            _metrics(-0.015 - day * 0.0025, 0.030, 0.270 + day * 0.003, 0.320, 0.40 - day * 0.002, 0.50, 7.4 + day * 0.06, 0.52 + day * 0.003, 1.60 + day * 0.02)
            for day in range(9)
        ]
        + [_metrics(-0.040, 0.020, 0.300, 0.320, 0.38, 0.50, 8.0, 0.55, 1.80)]
    ),
    "hl_leader_04": _series(
        [
            _metrics(-0.055 - day * 0.002, -0.010 - day * 0.001, 0.300 + day * 0.004, 0.360 + day * 0.003, 0.35 - day * 0.002, 0.55, 8.5 + day * 0.08, 0.66 + day * 0.002, 0.60 + day * 0.01)
            for day in range(29)
        ]
        + [_metrics(-0.150, -0.050, 0.420, 0.450, 0.25, 0.55, 12.0, 0.78, 0.35)]
    ),
    "hl_leader_05": _series(
        [
            _metrics(0.020 + (day % 5) * 0.010, 0.120 + (day % 4) * 0.012, 0.140 + (day % 6) * 0.020, 0.220 + (day % 3) * 0.020, 0.45 + (day % 4) * 0.03, 0.54, 4.8 + (day % 4) * 0.25, 0.42 + (day % 3) * 0.04, 0.70 + (day % 6) * 0.25)
            for day in range(29)
        ]
        + [_metrics(0.060, 0.180, 0.220, 0.280, 0.48, 0.55, 5.5, 0.50, 2.00)]
    ),
}


def get_all_leaders() -> list[Leader]:
    return [
        leader.model_copy(update={"metrics": get_latest_metrics(leader.id)})
        for leader in LEADERS.values()
    ]


def get_leader(leader_id: str) -> Leader | None:
    leader = LEADERS.get(leader_id)
    if leader is None:
        return None
    return leader.model_copy(update={"metrics": get_latest_metrics(leader_id)})


def get_latest_metrics(leader_id: str) -> LeaderMetrics | None:
    history = METRICS_HISTORY.get(leader_id)
    if not history:
        return None
    return history[-1][1]


def get_metrics_history(leader_id: str) -> list[tuple[str, LeaderMetrics]]:
    return list(METRICS_HISTORY.get(leader_id, []))
