from uuid import UUID

from agents.cook_together.schemas import (
    PantryItem,
    RecipeHistoryItem,
    SavedRecipe,
    UserContext,
)
from database.db import get_db_connection


def get_user_context(user_id: UUID) -> UserContext:

    conn = get_db_connection()

    try:
        with conn.cursor() as cursor:

            # -------------------------------------------------
            # 1. User
            # -------------------------------------------------

            cursor.execute(
                """
                SELECT username
                FROM users
                WHERE id = %s;
                """,
                (user_id,),
            )

            user = cursor.fetchone()

            if not user:
                raise ValueError(f"User {user_id} not found")

            username = user[0]

            # -------------------------------------------------
            # 2. Explicit allergies
            # -------------------------------------------------

            cursor.execute(
                """
                SELECT a.name
                FROM user_allergies ua
                JOIN allergies a
                    ON a.id = ua.allergy_id
                WHERE ua.user_id = %s;
                """,
                (user_id,),
            )

            allergies = [
                row[0]
                for row in cursor.fetchall()
            ]

            # -------------------------------------------------
            # 3. Pantry
            # -------------------------------------------------

            cursor.execute(
                """
                SELECT
                    i.name,
                    p.quantity,
                    p.unit
                FROM pantry_items p
                JOIN ingredients i
                    ON i.id = p.ingredient_id
                WHERE p.user_id = %s
                  AND p.availability_confidence > 0;
                """,
                (user_id,),
            )

            pantry = [
                PantryItem(
                    name=name,
                    quantity=float(quantity)
                    if quantity is not None
                    else None,
                    unit=unit,
                )
                for name, quantity, unit in cursor.fetchall()
            ]

            # -------------------------------------------------
            # 4. Saved/imported recipes
            # -------------------------------------------------

            cursor.execute(
                """
                SELECT
                    r.id,
                    r.title
                FROM saved_recipes sr
                JOIN recipes r
                    ON r.id = sr.recipe_id
                WHERE sr.user_id = %s
                ORDER BY sr.saved_at DESC;
                """,
                (user_id,),
            )

            saved_recipes = [
                SavedRecipe(
                    recipe_id=str(recipe_id),
                    title=title,
                )
                for recipe_id, title in cursor.fetchall()
            ]

            # -------------------------------------------------
            # 5. Cook history + ratings
            # -------------------------------------------------

            cursor.execute(
                """
                SELECT
                    r.id,
                    r.title,
                    rh.rating
                FROM recipe_history rh
                JOIN recipes r
                    ON r.id = rh.recipe_id
                WHERE rh.user_id = %s
                ORDER BY rh.cooked_at DESC;
                """,
                (user_id,),
            )

            recipe_history = [
                RecipeHistoryItem(
                    recipe_id=str(recipe_id),
                    title=title,
                    rating=rating,
                )
                for recipe_id, title, rating in cursor.fetchall()
            ]

        return UserContext(
            user_id=str(user_id),
            name=username,
            allergies=allergies,
            pantry=pantry,
            saved_recipes=saved_recipes,
            recipe_history=recipe_history,
        )

    finally:
        conn.close()