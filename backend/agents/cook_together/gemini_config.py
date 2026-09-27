# Shared Gemini settings for the Cook Together / recommendation agents.
# Everything can be changed from the root .env without touching code.

import os
from pathlib import Path

from dotenv import load_dotenv
from google.adk.planners import BuiltInPlanner
from google.genai import types

load_dotenv(Path(__file__).resolve().parents[3] / ".env")

# Tried first. Measured on a real Personal Agent request (5 candidates):
#   gemini-3.1-flash-lite  ~5s   correct allergy flags
#   gemini-3.6-flash       ~8s   correct allergy flags (thinking LOW)
#   gemini-3.8-flash       503 "high demand", then 429 quota exceeded
PRIMARY_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")

# Tried if the primary model errors (e.g. 503 "overloaded") or times out.
# Set GEMINI_FALLBACK_MODEL= (empty) to disable.
# (gemini-2.5-flash is NOT usable: "no longer available to new users".)
FALLBACK_MODEL = os.getenv("GEMINI_FALLBACK_MODEL", "gemini-3.6-flash")

# Seconds to wait for one stage (all Personal Agents, or the Planner) on one model.
AGENT_TIMEOUT_SECONDS = float(os.getenv("AGENT_TIMEOUT_SECONDS", "30"))


def build_thinking_planner(model: str) -> BuiltInPlanner | None:
    """Turn "thinking" down for models that think by default.

    Scoring/ranking recipes doesn't need deep reasoning, and thinking was the
    main source of latency. Lite models don't think by default, so they are
    left alone.
    """
    if "lite" in model:
        return None

    return BuiltInPlanner(
        thinking_config=types.ThinkingConfig(
            thinking_level=types.ThinkingLevel.LOW,
        )
    )


def model_chain() -> list[str]:
    chain = [PRIMARY_MODEL]
    if FALLBACK_MODEL and FALLBACK_MODEL != PRIMARY_MODEL:
        chain.append(FALLBACK_MODEL)
    return chain
