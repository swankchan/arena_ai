"""Deterministic tests for throttled live chat performance estimates."""

import unittest
from unittest.mock import Mock, patch

from backend.services.telemetry import LiveMetricsMeter, estimate_tokens


class TelemetryTest(unittest.TestCase):
    def test_live_metrics_are_throttled_and_cumulative(self):
        clock = Mock(side_effect=[10.0, 10.1, 10.35])
        meter = LiveMetricsMeter(interval=0.25, clock=clock)

        self.assertIsNone(meter.add_text("hello"))
        with patch(
            "backend.services.telemetry.estimate_tokens",
            return_value=8,
        ) as estimate:
            metrics = meter.add_text(" world")

        self.assertEqual(metrics, {
            "total_tokens": 8,
            "tokens_per_second": 22.86,
            "duration": 0.35,
        })
        estimate.assert_called_once_with("hello world")

    def test_token_estimator_uses_encoder_when_available(self):
        with patch("tiktoken.get_encoding") as get_encoding:
            get_encoding.return_value.encode.return_value = [1, 2, 3]
            self.assertEqual(estimate_tokens(" streamed text "), 3)
        get_encoding.return_value.encode.assert_called_once_with(" streamed text ")

    def test_token_estimator_failure_has_bounded_fallback(self):
        with patch("tiktoken.get_encoding", side_effect=RuntimeError("unavailable")):
            self.assertEqual(estimate_tokens("one two three"), 3)
            self.assertEqual(estimate_tokens(""), 0)


if __name__ == "__main__":
    unittest.main()
