import asyncio
from uuid import UUID

from agents.cook_together.schemas import (
    PersonalAgentOutput,
    PlannerOutput,
    RankedRecipe,
    RecipeEvaluation,
)

from services.candidate_service import get_group_candidates
from services.user_context_service import get_user_context


async def cook_together(
    user_ids: list[UUID],
    intent: str | None = None,
    use_mock_agents: bool = True,
) -> PlannerOutput:
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
    """

    if not user_ids:
        raise ValueError("Cook Together requires at least one user.")

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

        from agents.cook_together.personal_agent import (
            evaluate_for_user,
        )

        personal_outputs = await asyncio.gather(
            *[
                evaluate_for_user(
                    user_context,
                    candidates,
                )
                for user_context in user_contexts
            ]
        )


    # ---------------------------------------------------------
    # STEP 4: Planner
    # ---------------------------------------------------------

    if use_mock_agents:

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
        )

    else:

        # =====================================================
        # REAL GEMINI / GOOGLE ADK PLANNER
        #
        # This is approximately 1 additional Gemini request.
        # =====================================================

        from agents.cook_together.planner_agent import (
            plan_group_meal,
        )

        planner_output = await plan_group_meal(
            personal_outputs,
            candidates,
        )


    return planner_output


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
                    reasons=[
                        "Mock evaluation for workflow testing."
                    ],
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
) -> PlannerOutput:

    ranking = []

    for candidate in candidates:

        ranking.append(
            RankedRecipe(
                recipe_id=candidate.recipe_id,
                group_score=7.0,
                why=[
                    "Mock Planner result for workflow testing."
                ],
                conflicts=[],
            )
        )

    return PlannerOutput(
        ranking=ranking,
        top_pick=candidates[0].recipe_id,
        conflicts_resolved=[],
    )