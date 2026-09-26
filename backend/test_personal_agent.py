import asyncio
from uuid import UUID

from dotenv import load_dotenv

from agents.cook_together.personal_agent import evaluate_for_user
from services.recipe_service import get_recipes_by_ids
from services.user_context_service import get_user_context


load_dotenv()


CLARA_ID = UUID(
    "65bb98b1-4cfd-4bba-a73c-19b1634b7f86"
)


RECIPE_IDS = [
    UUID("480e6a1f-deed-4371-b4bf-2263c4bf8790"),  # Black Bean Tacos
    UUID("8217a0d6-4001-444d-b038-ca7b3b3f20e1"),  # Chicken Alfredo
    UUID("b54cd9cc-8be9-4479-8f37-31b41a2eaa6d"),  # Spicy Tofu Rice Bowl
]


async def main():

    print("\n=== LOADING CLARA ===\n")

    clara = get_user_context(CLARA_ID)

    print("User:", clara.name)
    print("Saved recipes:", len(clara.saved_recipes))
    print("History entries:", len(clara.recipe_history))
    print("Pantry items:", len(clara.pantry))

    print("\n=== LOADING CANDIDATES ===\n")

    candidates = get_recipes_by_ids(RECIPE_IDS)

    for candidate in candidates:
        print("-", candidate.title)

    print("\n=== CALLING PERSONAL AGENT ===\n")

    result = await evaluate_for_user(
        clara,
        candidates,
    )

    print("\n=== CLARA'S EVALUATIONS ===\n")

    for evaluation in result.evaluations:

        recipe = next(
            (
                candidate
                for candidate in candidates
                if candidate.recipe_id == evaluation.recipe_id
            ),
            None,
        )

        title = recipe.title if recipe else evaluation.recipe_id

        print(f"{title}: {evaluation.fit_score}/10")

        print("Reasons:")
        for reason in evaluation.reasons:
            print(f"  - {reason}")

        print("Dealbreakers:")
        for dealbreaker in evaluation.dealbreakers:
            print(f"  - {dealbreaker}")

        print("Can bring:")
        for ingredient in evaluation.can_bring:
            print(f"  - {ingredient}")

        print("Missing:")
        for ingredient in evaluation.missing:
            print(f"  - {ingredient}")

        print()


if __name__ == "__main__":
    asyncio.run(main())
