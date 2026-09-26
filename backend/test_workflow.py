import asyncio
from uuid import UUID

from agents.cook_together.workflow import cook_together


CLARA_ID = UUID(
    "65bb98b1-4cfd-4bba-a73c-19b1634b7f86"
)

LEO_ID = UUID(
    "e1516a40-1a23-425d-9123-37371ccb84d2"
)


async def main():

    print("\n=== TESTING COOK TOGETHER WORKFLOW ===\n")

    result = await cook_together(
        user_ids=[
            CLARA_ID,
            LEO_ID,
        ],

        # =====================================================
        # MOCK MODE — 0 GEMINI REQUESTS
        #
        # FINAL REAL TEST:
        # Change True -> False
        # =====================================================
        use_mock_agents=True,
    )


    print("=== FINAL RANKING ===\n")

    for i, recipe in enumerate(
        result.ranking,
        start=1,
    ):

        print(
            f"{i}. {recipe.recipe_id} "
            f"({recipe.group_score}/10)"
        )

        for reason in recipe.why:
            print(f"   - {reason}")


    print(
        "\nTOP PICK:",
        result.top_pick,
    )


if __name__ == "__main__":
    asyncio.run(main())