# backend/agents/cook_together/personal_agent.py

from google.adk.agents import Agent
from google.adk.models.google_llm import Gemini

import json
from google.adk.runners import InMemoryRunner
from google.genai import types
from agents.cook_together.schemas import (
    CandidateRecipe,
    PersonalAgentOutput,
    UserContext,
)


personal_agent = Agent(
    name="personal_recipe_agent",

    model=Gemini(
        model="gemini-3.8-flash",
        retry_options=types.HttpRetryOptions(
            attempts=5,
            initial_delay=2,
            max_delay=16,
            http_status_codes=[429, 500, 502, 503, 504],
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

    instruction="""
You are a Personal Recipe Agent for our app.

Your job is to evaluate EVERY candidate recipe from the perspective
of the ONE person whose context you receive.

Use only the information provided in the request.

Preference evidence can come from:
- recipes the person saved
- recipes the person previously cooked
- ratings they gave previously cooked recipes
- ingredients currently in their pantry

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

5. Pantry availability affects convenience, NOT taste preference.

6. "can_bring" must contain only ingredients explicitly present in
   this person's pantry.

7. "missing" should contain candidate ingredients not present in
   this person's pantry.

8. Score each candidate from 0 through 10.

9. Evaluate EVERY candidate supplied.

Return only the structured PersonalAgentOutput.
""",

    output_schema=PersonalAgentOutput,
)


async def evaluate_for_user(
    user_context: UserContext,
    candidates: list[CandidateRecipe],
) -> PersonalAgentOutput:

    # Build ONLY this user's context + the candidate recipes
    payload = {
        "user_context": user_context.model_dump(),
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
        agent=personal_agent,
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
