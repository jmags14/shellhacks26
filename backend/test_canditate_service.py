from uuid import UUID

from services.candidate_service import get_group_candidates


CLARA_ID = UUID(
    "65bb98b1-4cfd-4bba-a73c-19b1634b7f86"
)

LEO_ID = UUID(
    "e1516a40-1a23-425d-9123-37371ccb84d2"
)


GROUP = [
    CLARA_ID,
    LEO_ID,
]


candidates = get_group_candidates(GROUP)


print("\n=== COOK TOGETHER CANDIDATES ===\n")

for i, recipe in enumerate(candidates, start=1):

    print(f"{i}. {recipe.title}")
    print(f"   ID: {recipe.recipe_id}")
    print(f"   Time: {recipe.time_minutes}")
    print(f"   Tags: {recipe.tags}")

    print("   Ingredients:")

    for ingredient in recipe.ingredients:
        print(
            f"      - {ingredient.quantity} "
            f"{ingredient.unit or ''} "
            f"{ingredient.name}"
        )

    print()