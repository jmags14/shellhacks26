import asyncio
from typing import NamedTuple
from uuid import UUID

from agents.cook_together.gemini_config import AGENT_TIMEOUT_SECONDS, model_chain

from agents.cook_together.schemas import (
    CandidateRecipe,
    PersonalAgentOutput,
    PlannerOutput,
    RankedRecipe,
    RecipeEvaluation,
)

from services.candidate_service import get_group_candidates
from services.taste_evidence_service import build_taste_evidence
from services.user_context_service import get_user_context


class CookTogetherRun(NamedTuple):
    planner: PlannerOutput
    personal_outputs: list[PersonalAgentOutput]
    candidates: list[CandidateRecipe]
    agent_status: str
    # user_id -> recipe_id -> taste evidence (similar recipes, cuisine habits)
    evidence: dict[str, dict[str, dict]]


async def run_cook_together(
    user_ids: list[UUID],
    intent: str | None = None,
    use_mock_agents: bool = True,
) -> CookTogetherRun:
    """
    Complete Cook Together workflow.

    1. Get group candidates
    2. Load each user's private context
    3. Run Personal Agents
    4. Send Personal Agent outputs to Planner
    5. Return final group ranking

    During development:
        use_mock_agents=True
        -> 0 Gemini requests

    Final/demo:
        use_mock_agents=False
        -> Real Gemini/ADK agents

    Real agents never leave the caller with an error just because Gemini is
    busy. Each stage tries the primary model, then the fallback model (see
    gemini_config.py). The last element of the returned tuple says what ran:

        "mock"             mock agents (Gemini off)
        "ok"               real Personal Agents + real Planner
        "planner_fallback" real Personal Agents; the Planner was unavailable,
                           so the group ranking is the average of their scores
        "unavailable"      Gemini could not be reached at all; placeholder scores
    """

    if not user_ids:
        raise ValueError("Cook Together requires at least one user.")

    agent_status = "mock" if use_mock_agents else "ok"

    # ---------------------------------------------------------
    # STEP 1: Candidate Service
    # No Gemini request.
    # ---------------------------------------------------------

    candidates = get_group_candidates(user_ids)

    if not candidates:
        raise ValueError(
            "No candidate recipes found for this group."
        )


    # ---------------------------------------------------------
    # STEP 2: Load private user contexts
    # No Gemini request.
    # ---------------------------------------------------------

    user_contexts = [
        get_user_context(user_id)
        for user_id in user_ids
    ]


    # ---------------------------------------------------------
    # Taste evidence: why each recipe might suit each person
    # (similar recipes they saved, cuisines they keep saving).
    # No Gemini request. This replaces pantry data, which the app
    # no longer has.
    # ---------------------------------------------------------

    evidence = {
        user_context.user_id: build_taste_evidence(user_context, candidates)
        for user_context in user_contexts
    }


    # ---------------------------------------------------------
    # STEP 3: Personal Agents
    # ---------------------------------------------------------

    if use_mock_agents:

        # =====================================================
        # MOCK MODE
        #
        # DEVELOPMENT:
        # Keep this enabled so testing costs 0 Gemini requests.
        #
        # REAL GEMINI VERSION:
        # Set use_mock_agents=False.
        # The `else` block below will run the real ADK agents.
        # =====================================================

        personal_outputs = create_mock_personal_outputs(
            user_contexts,
            candidates,
        )

    else:

        # =====================================================
        # REAL GEMINI / GOOGLE ADK SECTION
        #
        # This imports and calls your existing Personal Agent.
        #
        # Each user = 1 Gemini request.
        #
        # Example:
        # 3 users = ~3 Gemini requests here.
        #
        # asyncio.gather() runs the Personal Agents concurrently.
        # =====================================================

        try:
            personal_outputs = await run_personal_agents(
                user_contexts,
                candidates,
                evidence,
            )
        except AgentUnavailable:
            # Gemini is down/overloaded on every model: placeholder scores so
            # the app still answers. The status tells the UI to say so.
            personal_outputs = create_mock_personal_outputs(
                user_contexts,
                candidates,
                reason=UNAVAILABLE_NOTE,
            )
            agent_status = "unavailable"


    # ---------------------------------------------------------
    # STEP 4: Planner
    # ---------------------------------------------------------

    if use_mock_agents or agent_status == "unavailable":

        # =====================================================
        # MOCK PLANNER
        #
        # DEVELOPMENT:
        # Costs 0 Gemini requests.
        #
        # REAL GEMINI VERSION:
        # Set use_mock_agents=False.
        # The `else` block below calls your real Planner Agent.
        # =====================================================

        planner_output = create_mock_planner_output(
            personal_outputs,
            candidates,
            reason=UNAVAILABLE_NOTE if agent_status == "unavailable" else None,
        )

    else:

        # =====================================================
        # REAL GEMINI / GOOGLE ADK PLANNER
        #
        # This is approximately 1 additional Gemini request.
        # =====================================================

        try:
            planner_output = await run_planner(
                personal_outputs,
                candidates,
            )
        except AgentUnavailable:
            # The real Personal Agent scores are still good: rank by them.
            planner_output = create_fallback_planner_output(
                personal_outputs,
                candidates,
            )
            agent_status = "planner_fallback"


    return CookTogetherRun(
        planner_output,
        list(personal_outputs),
        candidates,
        agent_status,
        evidence,
    )


async def cook_together(
    user_ids: list[UUID],
    intent: str | None = None,
    use_mock_agents: bool = True,
) -> PlannerOutput:
    """
    Same workflow as run_cook_together, but returns only the Planner's
    final ranking. Kept for the tests/scripts that already call it.
    """

    run = await run_cook_together(
        user_ids,
        intent,
        use_mock_agents,
    )

    return run.planner


# =============================================================
# REAL-AGENT HELPERS (fallback chain + output checks)
# =============================================================

UNAVAILABLE_NOTE = "The AI was unavailable, so this is a placeholder score."


class AgentUnavailable(Exception):
    """Every model in the chain failed for this stage."""


async def _try_models(stage: str, make_call):
    """Run make_call(model) on the primary model, then on the fallback model."""

    last_error = None

    for model in model_chain():
        try:
            return await asyncio.wait_for(
                make_call(model),
                timeout=AGENT_TIMEOUT_SECONDS,
            )
        except Exception as error:
            # 503 overloaded, 429 quota, timeouts, malformed model output, ...
            last_error = error
            # A TaskGroup wraps the real error (e.g. the 503) in an ExceptionGroup.
            if isinstance(error, BaseExceptionGroup):
                error = error.exceptions[0]
            print(
                f"[cook_together] {stage} failed on {model}: "
                f"{type(error).__name__}: {str(error)[:200]}"
            )

    raise AgentUnavailable(stage) from last_error


def _check_personal_output(output, user_context, candidates):
    expected = {c.recipe_id for c in candidates}
    got = [e.recipe_id for e in output.evaluations]

    if len(got) != len(expected) or set(got) != expected:
        raise ValueError(
            f"Personal Agent for {user_context.name} did not evaluate "
            "exactly the supplied candidates."
        )

    # Identity comes from our data, not from what the model echoed back.
    return output.model_copy(
        update={
            "user_id": user_context.user_id,
            "user_name": user_context.name,
        }
    )


def _check_planner_output(planner_output, candidates):
    expected = {c.recipe_id for c in candidates}
    ranked = [r.recipe_id for r in planner_output.ranking]

    if not ranked or not set(ranked) <= expected:
        raise ValueError("Planner ranked recipes that were not candidates.")

    if planner_output.top_pick not in ranked:
        raise ValueError("Planner top_pick is not in its own ranking.")

    return planner_output


async def run_personal_agents(user_contexts, candidates, evidence=None):
    from agents.cook_together.personal_agent import evaluate_for_user

    evidence = evidence or {}

    async def call(model):
        # TaskGroup cancels the other users' requests if one fails.
        async with asyncio.TaskGroup() as group:
            tasks = [
                group.create_task(
                    evaluate_for_user(
                        user_context,
                        candidates,
                        model=model,
                        evidence=evidence.get(user_context.user_id),
                    )
                )
                for user_context in user_contexts
            ]

        return [
            _check_personal_output(task.result(), user_context, candidates)
            for task, user_context in zip(tasks, user_contexts)
        ]

    return await _try_models("Personal Agents", call)


async def run_planner(personal_outputs, candidates):
    from agents.cook_together.planner_agent import plan_group_meal

    async def call(model):
        planner_output = await plan_group_meal(
            personal_outputs,
            candidates,
            model=model,
        )
        return _check_planner_output(planner_output, candidates)

    return await _try_models("Planner", call)


def create_fallback_planner_output(
    personal_outputs,
    candidates,
) -> PlannerOutput:
    """
    Used when only the Planner is unavailable. Ranks by the real Personal
    Agent scores: average fit score, with any recipe that has a dealbreaker
    for someone placed below every recipe that has none.
    """

    rows = []

    for candidate in candidates:
        evaluations = []

        for output in personal_outputs:
            for evaluation in output.evaluations:
                if evaluation.recipe_id == candidate.recipe_id:
                    evaluations.append((output.user_name, evaluation))

        scores = [evaluation.fit_score for _, evaluation in evaluations]
        average = sum(scores) / len(scores) if scores else 0.0

        conflicts = [
            f"{name}: {', '.join(evaluation.dealbreakers)}"
            for name, evaluation in evaluations
            if evaluation.dealbreakers
        ]

        why = [
            f"Average fit {average:.1f}/10 across {len(scores)} "
            f"{'person' if len(scores) == 1 else 'people'} "
            "(the group planner was unavailable)."
        ]

        rows.append(
            (
                bool(conflicts),
                -average,
                RankedRecipe(
                    recipe_id=candidate.recipe_id,
                    group_score=round(average, 1),
                    why=why,
                    conflicts=conflicts,
                ),
            )
        )

    rows.sort(key=lambda row: (row[0], row[1]))
    ranking = [row[2] for row in rows]

    return PlannerOutput(
        ranking=ranking,
        top_pick=ranking[0].recipe_id,
        conflicts_resolved=[],
    )


# =============================================================
# MOCK FUNCTIONS
#
# Everything below exists ONLY so we can develop/test without
# burning Gemini quota.
#
# These functions are NOT used when:
#
#     use_mock_agents=False
#
# =============================================================


def create_mock_personal_outputs(
    user_contexts,
    candidates,
    reason: str = "Mock evaluation for workflow testing.",
) -> list[PersonalAgentOutput]:

    outputs = []

    for user in user_contexts:

        evaluations = []

        for candidate in candidates:

            # Simple fake score.
            # This is NOT supposed to be intelligent.
            # It only lets us test the workflow.

            evaluations.append(
                RecipeEvaluation(
                    recipe_id=candidate.recipe_id,
                    fit_score=7,
                    dealbreakers=[],
                    reasons=[reason],
                    can_bring=[],
                    missing=[],
                )
            )

        outputs.append(
            PersonalAgentOutput(
                user_id=user.user_id,
                user_name=user.name,
                evaluations=evaluations,
            )
        )

    return outputs


def create_mock_planner_output(
    personal_outputs,
    candidates,
    reason: str | None = None,
) -> PlannerOutput:

    ranking = []

    for candidate in candidates:

        ranking.append(
            RankedRecipe(
                recipe_id=candidate.recipe_id,
                group_score=7.0,
                why=[
                    reason or "Mock Planner result for workflow testing."
                ],
                conflicts=[],
            )
        )

    return PlannerOutput(
        ranking=ranking,
        top_pick=candidates[0].recipe_id,
        conflicts_resolved=[],
    )