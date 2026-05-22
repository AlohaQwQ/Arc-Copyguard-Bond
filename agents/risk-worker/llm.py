import json
import logging
from concurrent.futures import ThreadPoolExecutor, TimeoutError
from typing import Callable

from config import settings
from schemas import LeaderMetrics
from scoring import generate_reasons

logger = logging.getLogger(__name__)

LLM_TIMEOUT_SECONDS = 10


def generate_rationale(metrics: LeaderMetrics, risk_score_bps: int) -> list[str]:
    provider = (settings.LLM_PROVIDER or "").strip().lower()
    api_key = (settings.LLM_API_KEY or "").strip()

    if not provider or not api_key:
        return generate_reasons(metrics, risk_score_bps)

    try:
        prompt = _build_prompt(metrics, risk_score_bps)
        if provider == "claude":
            raw_response = _run_with_timeout(lambda: _call_claude(api_key, prompt))
        elif provider == "openai":
            raw_response = _run_with_timeout(lambda: _call_openai(api_key, prompt))
        elif provider == "gemini":
            raw_response = _run_with_timeout(lambda: _call_gemini(api_key, prompt))
        else:
            logger.warning("Unsupported LLM provider '%s'; fallback to deterministic reasons", provider)
            return generate_reasons(metrics, risk_score_bps)

        return _parse_reasons(raw_response)
    except Exception as exc:
        logger.warning(
            "LLM rationale failed for provider '%s' with %s; fallback to deterministic reasons",
            provider,
            type(exc).__name__,
        )
        return generate_reasons(metrics, risk_score_bps)


def _build_prompt(metrics: LeaderMetrics, risk_score_bps: int) -> str:
    return f"""You are a crypto trading risk analyst. Based on the following leader metrics and computed risk score, generate a brief risk analysis.

Risk Score: {risk_score_bps}/10000 basis points

Leader Metrics (latest):
- 7d PnL: {metrics.pnl7d}, 30d PnL: {metrics.pnl30d}
- 7d Max Drawdown: {metrics.maxDrawdown7d}, 30d Max Drawdown: {metrics.maxDrawdown30d}
- 7d Win Rate: {metrics.winRate7d}, 30d Win Rate: {metrics.winRate30d}
- Avg Leverage: {metrics.avgLeverage}x
- Position Concentration: {metrics.positionConcentration}
- Trade Frequency Change: {metrics.tradeFrequencyChange}x

Respond ONLY with valid JSON in this exact format, no other text:
{{"reasons": ["reason 1", "reason 2", "reason 3"]}}"""


def _run_with_timeout(call: Callable[[], str]) -> str:
    executor = ThreadPoolExecutor(max_workers=1)
    future = executor.submit(call)
    try:
        return future.result(timeout=LLM_TIMEOUT_SECONDS)
    except TimeoutError:
        future.cancel()
        raise
    finally:
        executor.shutdown(wait=False, cancel_futures=True)


def _call_claude(api_key: str, prompt: str) -> str:
    from anthropic import Anthropic

    client = Anthropic(api_key=api_key, timeout=LLM_TIMEOUT_SECONDS)
    message = client.messages.create(
        model="claude-3-5-haiku-latest",
        max_tokens=300,
        temperature=0,
        messages=[{"role": "user", "content": prompt}],
    )
    return "".join(getattr(block, "text", "") for block in message.content)


def _call_openai(api_key: str, prompt: str) -> str:
    from openai import OpenAI

    client = OpenAI(api_key=api_key, timeout=LLM_TIMEOUT_SECONDS)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        max_tokens=300,
        response_format={"type": "json_object"},
    )
    return response.choices[0].message.content or ""


def _call_gemini(api_key: str, prompt: str) -> str:
    from google import genai

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.0-flash-lite",
        contents=prompt,
    )
    return response.text or ""


def _parse_reasons(raw_response: str) -> list[str]:
    data = json.loads(raw_response.strip())
    reasons = data.get("reasons")
    if not isinstance(reasons, list) or not reasons:
        raise ValueError("missing reasons")

    parsed: list[str] = []
    for reason in reasons[:5]:
        if not isinstance(reason, str):
            raise ValueError("reason must be string")
        clean_reason = reason.strip()
        if len(clean_reason) < 10 or len(clean_reason) > 200:
            raise ValueError("reason length out of range")
        parsed.append(clean_reason)

    if not parsed:
        raise ValueError("empty reasons")
    return parsed
