from uuid import UUID

from agents.cook_together.schemas import CandidateRecipe, Ingredient
from database.db import get_db_connection


def get_recipes_by_ids(recipe_ids: list[UUID]) -> list[CandidateRecipe]:
    """
    Fetch complete candidate recipe information from TigerData.
    """

    if not recipe_ids:
        return []

    conn = get_db_connection()

    try:
        with conn.cursor() as cursor:

            # 1. Get basic recipe information
            cursor.execute(
                """
                SELECT
                    id,
                    title,
                    cuisine,
                    prep_time_minutes,
                    cook_time_minutes
                FROM recipes
                WHERE id = ANY(%s);
                """,
                (recipe_ids,),
            )

            recipe_rows = cursor.fetchall()

            # 2. Get ingredients for those recipes
            cursor.execute(
                """
                SELECT
                    ri.recipe_id,
                    i.name,
                    ri.quantity,
                    ri.unit
                FROM recipe_ingredients ri
                JOIN ingredients i
                    ON i.id = ri.ingredient_id
                WHERE ri.recipe_id = ANY(%s);
                """,
                (recipe_ids,),
            )

            ingredient_rows = cursor.fetchall()

        # Group ingredients by recipe
        ingredients_by_recipe = {}

        for recipe_id, name, quantity, unit in ingredient_rows:

            ingredient = Ingredient(
                name=name,
                quantity=float(quantity) if quantity is not None else None,
                unit=unit,
            )

            ingredients_by_recipe.setdefault(recipe_id, []).append(ingredient)

        # Build CandidateRecipe objects
        candidates = []

        for recipe_id, title, cuisine, prep_time, cook_time in recipe_rows:

            total_time = (prep_time or 0) + (cook_time or 0)

            candidate = CandidateRecipe(
                recipe_id=str(recipe_id),
                title=title,
                ingredients=ingredients_by_recipe.get(recipe_id, []),

                # For now cuisine can act as a lightweight tag.
                tags=[cuisine] if cuisine else [],

                # We are NOT guessing dietary classifications.
                dietary=[],

                time_minutes=total_time if total_time > 0 else None,
            )

            candidates.append(candidate)

        return candidates

    finally:
        conn.close()

def list_recipes_for_user(user_id: str) -> list[dict]:
    """
    Recipes a user can see: their own, plus unowned (seeded) ones.
    """

    conn = get_db_connection()

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    r.id,
                    r.title,
                    r.source,
                    r.source_url,
                    r.cuisine,
                    r.servings,
                    COALESCE(r.prep_time_minutes, 0)
                        + COALESCE(r.cook_time_minutes, 0) AS total_time,
                    (
                        SELECT COUNT(*)
                        FROM recipe_ingredients ri
                        WHERE ri.recipe_id = r.id
                    ) AS ingredient_count
                FROM recipes r
                WHERE r.owner_id = %s OR r.owner_id IS NULL
                ORDER BY r.created_at DESC;
                """,
                (user_id,),
            )

            return [
                {
                    "id": str(row[0]),
                    "title": row[1],
                    "source": row[2],
                    "source_url": row[3],
                    "cuisine": row[4],
                    "servings": row[5],
                    "time_minutes": row[6] or None,
                    "ingredient_count": row[7],
                }
                for row in cursor.fetchall()
            ]

    finally:
        conn.close()
