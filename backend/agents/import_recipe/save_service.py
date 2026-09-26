import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def save_recipe(extracted: dict, source_url: str):
    conn = psycopg.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO recipes (title, source, source_url)
        VALUES (%s, %s, %s)
        ON CONFLICT (title) DO UPDATE SET source_url = EXCLUDED.source_url
        RETURNING id
        """,
        (extracted["title"], "instagram", source_url)
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
            INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, preparation, optional)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
            """,
            (recipe_id, ingredient_id, ing.get("quantity"), ing.get("unit"), ing.get("preparation"), ing.get("optional", False))
        )

        # Clear existing instructions before inserting fresh ones (in case this recipe already existed)
    cur.execute(
        "DELETE FROM recipe_instructions WHERE recipe_id = %s",
        (recipe_id,)
    )

    for i, step_text in enumerate(extracted["steps"], start=1):
        cur.execute(
            """
            INSERT INTO recipe_instructions (recipe_id, step_number, instruction)
            VALUES (%s, %s, %s)
            """,
            (recipe_id, i, step_text)
        )

    conn.commit()
    cur.close()
    conn.close()

    return str(recipe_id)