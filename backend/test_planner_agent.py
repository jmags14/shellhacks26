import asyncio

from dotenv import load_dotenv

from agents.cook_together.planner_agent import plan_group_meal
from agents.cook_together.schemas import (
    CandidateRecipe,
    Ingredient,
    PersonalAgentOutput,
    RecipeEvaluation,
)


load_dotenv()


# --------------------------------------------------
# Fake candidate recipes
# --------------------------------------------------

candidates = [
    CandidateRecipe(
        recipe_id="tofu-bowl",
        title="Spicy Tofu Rice Bowl",
        ingredients=[
            Ingredient(name="tofu"),
            Ingredient(name="rice"),
            Ingredient(name="broccoli"),
        ],
        tags=["Asian"],
        time_minutes=30,
    ),

    CandidateRecipe(
        recipe_id="black-bean-tacos",
        title="Black Bean Tacos",
        ingredients=[
            Ingredient(name="black beans"),
            Ingredient(name="tortillas"),
            Ingredient(name="avocado"),
        ],
        tags=["Mexican"],
        time_minutes=25,
    ),

    CandidateRecipe(
        recipe_id="chicken-alfredo",
        title="Chicken Alfredo",
        ingredients=[
            Ingredient(name="chicken"),
            Ingredient(name="pasta"),
            Ingredient(name="heavy cream"),
            Ingredient(name="parmesan"),
        ],
        tags=["Italian"],
        time_minutes=35,
    ),
]


# --------------------------------------------------
# Pretend Clara's Personal Agent already ran
# --------------------------------------------------

clara_output = PersonalAgentOutput(
    user_id="clara-test",
    user_name="clara",
    evaluations=[
        RecipeEvaluation(
            recipe_id="tofu-bowl",
            fit_score=10,
            reasons=[
                "Previously cooked and rated highly."
            ],
            can_bring=["tofu", "rice"],
            missing=["broccoli"],
        ),

        RecipeEvaluation(
            recipe_id="black-bean-tacos",
            fit_score=8,
            reasons=[
                "Previously enjoyed similar recipes."
            ],
            can_bring=["black beans"],
            missing=["tortillas", "avocado"],
        ),

        RecipeEvaluation(
            recipe_id="chicken-alfredo",
            fit_score=0,
            dealbreakers=[
                "Contains dairy, which conflicts with Clara's dairy allergy."
            ],
            reasons=[
                "Heavy cream and parmesan are dairy."
            ],
        ),
    ],
)


# --------------------------------------------------
# Pretend Leo's Personal Agent already ran
# --------------------------------------------------

leo_output = PersonalAgentOutput(
    user_id="leo-test",
    user_name="leo",
    evaluations=[
        RecipeEvaluation(
            recipe_id="tofu-bowl",
            fit_score=6,
            reasons=[
                "Reasonable option but weaker match to past behavior."
            ],
        ),

        RecipeEvaluation(
            recipe_id="black-bean-tacos",
            fit_score=8,
            reasons=[
                "Good overall match."
            ],
        ),

        RecipeEvaluation(
            recipe_id="chicken-alfredo",
            fit_score=10,
            reasons=[
                "Previously cooked and rated highly."
            ],
        ),
    ],
)


async def main():

    print("\n=== RUNNING PLANNER ONLY ===\n")

    result = await plan_group_meal(
        personal_outputs=[
            clara_output,
            leo_output,
        ],
        candidates=candidates,
    )


    candidate_names = {
        candidate.recipe_id: candidate.title
        for candidate in candidates
    }


    print("\n=== GROUP RANKING ===\n")

    for i, recipe in enumerate(result.ranking, start=1):

        title = candidate_names.get(
            recipe.recipe_id,
            recipe.recipe_id,
        )

        print(
            f"{i}. {title} "
            f"({recipe.group_score}/10)"
        )

        for reason in recipe.why:
            print(f"   - {reason}")

        for conflict in recipe.conflicts:
            print(f"   CONFLICT: {conflict}")


    print(
        "\nTOP PICK:",
        candidate_names.get(
            result.top_pick,
            result.top_pick,
        ),
    )


if __name__ == "__main__":
    asyncio.run(main())