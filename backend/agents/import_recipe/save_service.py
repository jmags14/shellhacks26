import psycopg
import os
from dotenv import load_dotenv

load_dotenv()


def save_recipe(extracted: dict, source_url: str, owner_id: str):
    conn = psycopg.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO recipes (title, description, source, source_url, owner_id, cuisine, servings, prep_time_minutes, cook_time_minutes)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (title) DO UPDATE
        SET source_url = EXCLUDED.source_url,
            owner_id = EXCLUDED.owner_id,
            description = EXCLUDED.description,
            cuisine = EXCLUDED.cuisine,
            servings = EXCLUDED.servings,
            prep_time_minutes = EXCLUDED.prep_time_minutes,
            cook_time_minutes = EXCLUDED.cook_time_minutes
        RETURNING id
        """,
        (
            extracted["title"],
            extracted.get("description"),
            extracted.get("cuisine"),
            source_url,
            owner_id,
            extracted.get("cuisine"),
            extracted.get("servings"),
            extracted.get("prep_time_minutes"),
            extracted.get("cook_time_minutes")
        )
    )

    recipe_id = cur.fetchone()[0]

    for ing in extracted["ingredients"]:
        cur.execute(
            """
            INSERT INTO ingredients (name)
            VALUES (%s)
            ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
            """,
            (ing["name"],)
        )

        ingredient_id = cur.fetchone()[0]

        cur.execute(
            """
            INSERT INTO recipe_ingredients
            (recipe_id, ingredient_id, quantity, unit, preparation, optional)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (recipe_id, ingredient_id)
            DO UPDATE SET
                quantity = EXCLUDED.quantity,
                unit = EXCLUDED.unit,
                preparation = EXCLUDED.preparation,
                optional = EXCLUDED.optional
            """,
            (
                recipe_id,
                ingredient_id,
                ing.get("quantity"),
                ing.get("unit"),
                ing.get("preparation"),
                ing.get("optional", False)
            )
        )

    cur.execute(
        "DELETE FROM recipe_instructions WHERE recipe_id = %s",
        (recipe_id,)
    )

    for i, step_text in enumerate(extracted["steps"], start=1):
        cur.execute(
            """
            INSERT INTO recipe_instructions
            (recipe_id, step_number, instruction)
            VALUES (%s, %s, %s)
            """,
            (recipe_id, i, step_text)
        )

    conn.commit()
    cur.close()
    conn.close()

    return str(recipe_id)


def get_recipe(recipe_id: str, owner_id: str):
    conn = psycopg.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, title, source, source_url, description, cuisine,
               servings, prep_time_minutes, cook_time_minutes
        FROM recipes
        WHERE id = %s
          AND (owner_id = %s OR owner_id IS NULL)
        """,
        (recipe_id, owner_id)
    )

    row = cur.fetchone()

    if row is None:
        cur.close()
        conn.close()
        return None

    recipe = {
        "id": str(row[0]),
        "title": row[1],
        "source": row[2],
        "source_url": row[3],
        "description": row[4],
        "cuisine": row[5],
        "servings": row[6],
        "time_minutes": (row[7] or 0) + (row[8] or 0) or None
    }

    cur.execute(
        """
        SELECT i.name, ri.quantity, ri.unit, ri.preparation, ri.optional
        FROM recipe_ingredients ri
        JOIN ingredients i ON i.id = ri.ingredient_id
        WHERE ri.recipe_id = %s
        """,
        (recipe_id,)
    )

    recipe["ingredients"] = [
        {
            "name": r[0],
            "quantity": r[1],
            "unit": r[2],
            "preparation": r[3],
            "optional": r[4]
        }
        for r in cur.fetchall()
    ]

    cur.execute(
        """
        SELECT instruction
        FROM recipe_instructions
        WHERE recipe_id = %s
        ORDER BY step_number
        """,
        (recipe_id,)

    )

    recipe["steps"] = [r[0] for r in cur.fetchall()]

    cur.close()
    conn.close()

    return recipe