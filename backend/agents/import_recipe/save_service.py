import psycopg
import os
from dotenv import load_dotenv

load_dotenv()


def save_recipe(extracted: dict, source_url: str, owner_id: str):
    conn = psycopg.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO recipes (title, source, source_url, owner_id)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (title) DO UPDATE
        SET source_url = EXCLUDED.source_url,
            owner_id = EXCLUDED.owner_id
        RETURNING id
        """,
        (
            extracted["title"],
            "instagram",
            source_url,
            owner_id
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
        SELECT id, title, source, source_url
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
        "source_url": row[3]
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
        SELECT step_number, instruction
        FROM recipe_instructions
        WHERE recipe_id = %s
        ORDER BY step_number
        """,
        (recipe_id,)
    )

    recipe["steps"] = [r[1] for r in cur.fetchall()]

    cur.close()
    conn.close()

    return recipe