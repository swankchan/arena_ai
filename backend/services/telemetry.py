"""Best-effort live chat telemetry without provider-specific APIs."""

import time
from collections.abc import Callable

LIVE_METRICS_INTERVAL_SECONDS = 0.25


def estimate_tokens(text: str) -> int:
    """Estimate output tokens consistently for live and final chat metrics."""
    try:
        import tiktoken

        encoding = tiktoken.get_encoding("cl100k_base")
        return len(encoding.encode(text))
    except Exception:  # noqa: BLE001 - telemetry must not interrupt generation.
        return int(len(text.split()) * 1.3)


class LiveMetricsMeter:
    """Throttle cumulative token/time estimates from streamed text chunks."""

    def __init__(
        self,
        interval: float = LIVE_METRICS_INTERVAL_SECONDS,
        clock: Callable[[], float] = time.perf_counter,
    ):
        self.interval = interval
        self.clock = clock
        self.started_at = clock()
        self.last_emitted_at = self.started_at
        self.text_parts: list[str] = []

    def add_text(self, text: str) -> dict[str, float | int] | None:
        if text:
            self.text_parts.append(text)
        now = self.clock()
        duration = now - self.started_at
        if (
            not self.text_parts
            or now - self.last_emitted_at < self.interval
            or duration <= 0
        ):
            return None

        self.last_emitted_at = now
        token_count = estimate_tokens("".join(self.text_parts))
        return {
            "total_tokens": token_count,
            "tokens_per_second": round(token_count / duration, 2),
            "duration": round(duration, 2),
        }
