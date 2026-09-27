# backend/agents/cook_together/personal_agent.py

from google.adk.agents import Agent
from google.adk.models.google_llm import Gemini

import json
from google.adk.runners import InMemoryRunner
from google.genai import types
from agents.cook_together.gemini_config import PRIMARY_MODEL, build_thinking_planner
from agents.cook_together.schemas import (
    CandidateRecipe,
    PersonalAgentOutput,
    UserContext,
)


PERSONAL_INSTRUCTION = """
You are a Personal Recipe Agent for our app.

Your job is to evaluate EVERY candidate recipe from the perspective
of the ONE person whose context you receive.

Use only the information provided in the request.

Preference evidence can come from:
- recipes the person saved
- recipes the person previously cooked
- ratings they gave previously cooked recipes
- "taste_evidence": facts we already computed for each candidate recipe,
  keyed by recipe_id. It contains:
    cuisine, cuisine_matches, saved_or_cooked_total,
    most_similar_recipe (title + similarity_pct), taste_match_pct,
    already_saved_or_cooked, your_rating

There is NO pantry information. Never mention a pantry, ingredients on hand,
or shopping. Do not lower a score because of what someone does or does not own.

IMPORTANT RULES:

1. Allergies are hard constraints.
   If a candidate contains an ingredient matching an explicit allergy,
   add it as a dealbreaker and give the recipe a very low fit score.

2. Saved recipes are evidence of interest, not proof that the person
   definitely likes every ingredient in them.

3. Cook history with ratings is stronger evidence.
   High ratings are positive evidence.
   Low ratings are negative evidence.

4. Do not invent preferences.
   If there is not enough evidence, say so.

5. Base the fit score mainly on taste_evidence:
   - a high taste_match_pct means it resembles what they like overall
   - a most_similar_recipe means a very similar dish they saved or cooked
   - cuisine_matches > 0 means they keep saving that cuisine
   - your_rating: a high rating is strong positive evidence, a low one negative
   Missing evidence is not negative evidence: with little to go on, score near 5.

6. Every reason must cite concrete evidence from taste_evidence or the
   person's saved/cooked recipes, for example:
   "Similar to Garlic Parmesan Pasta they saved (89% similar)" or
   "Same cuisine as 2 of the 4 recipes they saved or cooked".
   Never invent evidence that is not in the request.
   Write reasons in the third person using the person's name (or "they"),
   never "you", because the reasons are shown to the whole group.

7. "can_bring" and "missing" must always be empty lists.

8. Score each candidate from 0 through 10.

9. Evaluate EVERY candidate supplied.

Return only the structured PersonalAgentOutput.
"""


def build_personal_agent(model_name: str) -> Agent:
    return Agent(
        name="personal_recipe_agent",

        model=Gemini(
            model=model_name,
            retry_options=types.HttpRetryOptions(
                # One attempt per model: retrying across models is handled by
                # the workflow (primary model, then the fallback model).
                attempts=1,
            ),
        ),
        # ADK manages tool calls; SDK automatic function calling is unnecessary.
        generate_content_config=types.GenerateContentConfig(
            automatic_function_calling=types.AutomaticFunctionCallingConfig(
                disable=True,
            ),
        ),

        description=(
            "Evaluates candidate recipes from one person's perspective "
            "using only that person's provided context."
        ),

        instruction=PERSONAL_INSTRUCTION,

        planner=build_thinking_planner(model_name),

        output_schema=PersonalAgentOutput,
    )


personal_agent = build_personal_agent(PRIMARY_MODEL)


async def evaluate_for_user(
    user_context: UserContext,
    candidates: list[CandidateRecipe],
    model: str | None = None,
    evidence: dict | None = None,
) -> PersonalAgentOutput:
    """
    model: override the model for this call (used for the fallback model).
    evidence: recipe_id -> taste evidence for this user (similar recipes,
    cuisine habits). Replaces the pantry, which the app no longer has.
    """

    agent = personal_agent if model is None else build_personal_agent(model)

    # Build ONLY this user's context + the candidate recipes
    payload = {
        # No pantry: the feature was removed, and an empty pantry made
        # every recipe look like "nothing to cook with".
        "user_context": user_context.model_dump(exclude={"pantry"}),
        "taste_evidence": evidence or {},
        "candidate_recipes": [
            candidate.model_dump()
            for candidate in candidates
        ],
    }

    message = types.Content(
        role="user",
        parts=[
            types.Part(
                text=json.dumps(payload, indent=2)
            )
        ],
    )

    async with InMemoryRunner(
        agent=agent,
        app_name="kitchenos",
    ) as runner:
        session = await runner.session_service.create_session(
            app_name="kitchenos",
            user_id=user_context.user_id,
        )

        final_text = None

        async for event in runner.run_async(
            user_id=user_context.user_id,
            session_id=session.id,
            new_message=message,
        ):
            if event.is_final_response():
                if event.content and event.content.parts:
                    final_text = "".join(
                        part.text for part in event.content.parts
                        if part.text and not part.thought
                    )

    if not final_text:
        raise RuntimeError("Personal Agent returned no final response.")

    return PersonalAgentOutput.model_validate_json(final_text)
