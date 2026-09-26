from dotenv import load_dotenv

from services.embedding_service import embed_all_recipes


load_dotenv()

from services.embedding_service import find_similar_recipes

from uuid import UUID

from services.candidate_service import get_group_candidates


CLARA_ID = UUID(
    "65bb98b1-4cfd-4bba-a73c-19b1634b7f86"
)

LEO_ID = UUID(
    "e1516a40-1a23-425d-9123-37371ccb84d2"
)


candidates = get_group_candidates([
    CLARA_ID,
    LEO_ID,
])


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

"""
SPICY_TOFU_ID = "b54cd9cc-8be9-4479-8f37-31b41a2eaa6d"


print("\n=== SIMILAR TO SPICY TOFU RICE BOWL ===\n")


results = find_similar_recipes(
    recipe_id=SPICY_TOFU_ID,
    limit=5,
)


for i, (recipe_id, title, similarity) in enumerate(
    results,
    start=1,
):
    print(
        f"{i}. {title} "
        f"(similarity: {float(similarity):.3f})"
    )
"""
"""   emedding all the recipes
print("\n=== EMBEDDING ALL RECIPES ===\n")

results = embed_all_recipes()


successful = [
    result
    for result in results
    if result["success"]
]

failed = [
    result
    for result in results
    if not result["success"]
]


print("\n=== RESULTS ===\n")

print(f"Total: {len(results)}")
print(f"Successful: {len(successful)}")
print(f"Failed: {len(failed)}")


if failed:

    print("\nFailed recipes:")

    for result in failed:
        print(
            f"- {result['title']}: "
            f"{result['error']}"
        )
        """