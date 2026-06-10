"""Pricing table per provider+model.

The builder uses this to convert the SDK's token counts into a dollar amount
which it ships down the SSE stream as part of the final `meta` event.

Operators: these numbers are best-effort approximations. Verify against the
provider's current pricing page before billing or expense reporting:

  * OpenAI:    https://openai.com/pricing
  * Anthropic: https://www.anthropic.com/pricing

If a (provider, model) pair is missing, `estimate_cost_dollars` returns 0.0;
the builder still emits the meta event but the dollar field will read zero,
which the route persists as zero. Add new rows here when a model is deployed.
"""

from __future__ import annotations

from typing import Final


# (provider, model) -> (USD per 1M input tokens, USD per 1M output tokens).
# Dollars per million tokens. The conversion in `estimate_cost_dollars`
# divides by 1_000_000.
COST_PER_MILLION: Final[dict[tuple[str, str], tuple[float, float]]] = {
    # OpenAI
    ("openai", "gpt-4o-mini"): (0.15, 0.60),
    ("openai", "gpt-4o"): (2.50, 10.00),
    ("openai", "gpt-4.1-mini"): (0.40, 1.60),
    # Anthropic. Verify these against current Anthropic pricing before
    # treating cost numbers as authoritative.
    ("anthropic", "claude-haiku-4-5-20251001"): (1.00, 5.00),
    ("anthropic", "claude-sonnet-4-6"): (3.00, 15.00),
    ("anthropic", "claude-opus-4-7"): (15.00, 75.00),
}


def estimate_cost_dollars(
    provider: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
) -> float:
    """Compute USD cost from token counts.

    Returns 0.0 when the (provider, model) pair is unknown. Tokens are clamped
    to non-negative; a negative value indicates a buggy SDK shape and we treat
    it as zero rather than refunding cost.
    """
    rate = COST_PER_MILLION.get((provider, model))
    if rate is None:
        return 0.0
    in_rate, out_rate = rate
    in_tokens = max(0, int(input_tokens))
    out_tokens = max(0, int(output_tokens))
    return (in_tokens / 1_000_000) * in_rate + (out_tokens / 1_000_000) * out_rate


__all__ = ["COST_PER_MILLION", "estimate_cost_dollars"]
