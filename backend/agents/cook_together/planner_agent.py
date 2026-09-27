import json

from google.adk.agents import Agent
from google.adk.models.google_llm import Gemini
from google.adk.runners import InMemoryRunner
from google.genai import types

from agents.cook_together.gemini_config import PRIMARY_MODEL, build_thinking_planner
from agents.cook_together.schemas import (
    CandidateRecipe,
    PersonalAgentOutput,
    PlannerOutput,
)


PLANNER_INSTRUCTION = """
You are the KitchenOS Cook Together Planner.

Your job is to compare Personal Agent evaluations and rank
the candidate recipes for the entire group.

IMPORTANT RULES:

1. Every Personal Agent has already evaluated the same candidate recipes.

2. Do NOT invent new recipes.

3. Do NOT invent information about users.

3b. There is no pantry feature. Do not consider or mention pantries,
    ingredients on hand, or shopping. Judge recipes only by each person's
    fit score, dealbreakers, and their taste-based reasons.

4. Use only the supplied Personal Agent evaluations and candidate data.

5. A recipe with a dealbreaker for ANY user should not be the top pick.

6. Balance the group fairly.
Do not simply choose the recipe with the highest score from one person.

7. Consider:
- each person's fit score
- dealbreakers
- reasons
- conflicts between users

8. Prefer recipes that work reasonably well for everyone over recipes
that are amazing for one person but poor for another.

9. group_score must be between 0 and 10.

10. Rank the supplied recipes from best group fit to worst group fit.

11. top_pick must be the recipe_id of the #1 ranked recipe.

12. Explain briefly WHY each recipe ranked where it did. Name who it suits
    and use the personal reasons (similar saved recipes, cuisines they like).

Return only the structured PlannerOutput.
"""


def build_planner_agent(model_name: str) -> Agent:
    return Agent(
        name="cook_together_planner",
        model=Gemini(
            model=model_name,
            retry_options=types.HttpRetryOptions(
                # One attempt per model: the workflow handles the fallback model.
                attempts=1,
            ),
        ),
        description=(
            "Chooses the best recipes for a group by comparing "
            "evaluations from each person's Personal Agent."
        ),
        instruction=PLANNER_INSTRUCTION,
        planner=build_thinking_planner(model_name),
        output_schema=PlannerOutput,
    )


planner_agent = build_planner_agent(PRIMARY_MODEL)


async def plan_group_meal(
    personal_outputs: list[PersonalAgentOutput],
    candidates: list[CandidateRecipe],
    model: str | None = None,
) -> PlannerOutput:
    """model: override the model for this call (used for the fallback model)."""

    agent = planner_agent if model is None else build_planner_agent(model)

    payload = {
        "candidate_recipes": [
            candidate.model_dump()
            for candidate in candidates
        ],
        "personal_agent_evaluations": [
            output.model_dump()
            for output in personal_outputs
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
            user_id="cook-together-planner",
        )

        final_text = None

        async for event in runner.run_async(
            user_id="cook-together-planner",
            session_id=session.id,
            new_message=message,
        ):
            if event.is_final_response():
                if event.content and event.content.parts:
                    # Skip the model's "thought" parts, like the Personal Agent does.
                    final_text = "".join(
                        part.text for part in event.content.parts
                        if part.text and not part.thought
                    )

    if not final_text:
        raise RuntimeError(
            "Planner Agent returned no final response."
        )

    return PlannerOutput.model_validate_json(final_text)
