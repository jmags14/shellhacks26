import json

from google.adk.agents import Agent
from google.adk.runners import InMemoryRunner
from google.genai import types

from agents.cook_together.schemas import (
    CandidateRecipe,
    PersonalAgentOutput,
    PlannerOutput,
)


planner_agent = Agent(
    name="cook_together_planner",
    model="gemini-3.8-flash",
    description=(
        "Chooses the best recipes for a group by comparing "
        "evaluations from each person's Personal Agent."
    ),
    instruction="""
You are the KitchenOS Cook Together Planner.

Your job is to compare Personal Agent evaluations and rank
the candidate recipes for the entire group.

IMPORTANT RULES:

1. Every Personal Agent has already evaluated the same candidate recipes.

2. Do NOT invent new recipes.

3. Do NOT invent information about users.

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

12. Explain briefly WHY each recipe ranked where it did.

Return only the structured PlannerOutput.
""",
    output_schema=PlannerOutput,
)


async def plan_group_meal(
    personal_outputs: list[PersonalAgentOutput],
    candidates: list[CandidateRecipe],
) -> PlannerOutput:

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

    runner = InMemoryRunner(
        agent=planner_agent,
        app_name="kitchenos",
    )

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
                final_text = event.content.parts[0].text

    if not final_text:
        raise RuntimeError(
            "Planner Agent returned no final response."
        )

    return PlannerOutput.model_validate_json(final_text)