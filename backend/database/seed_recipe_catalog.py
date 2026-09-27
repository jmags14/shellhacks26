"""Add shared recipes and Gemini vectors in one command; never modify user data.

From the repository root:
    python backend/database/seed_recipe_catalog.py --preview
    python backend/database/seed_recipe_catalog.py

Requires the existing database schema (including recipe_embeddings), DATABASE_URL
and a Gemini API key in the root .env. Each recipe and its embedding commit
together. Reruns skip current vectors and resume after failures. Existing recipes
with matching titles are left alone unless created by this script.
"""
import argparse
import math
import sys
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

SOURCE = "seeded-catalog-expansion"


def recipe(title, description, cuisine, servings, prep, cook, ingredients, steps):
    return dict(title=title, description=description, cuisine=cuisine,
                servings=servings, prep=prep, cook=cook,
                ingredients=ingredients, steps=steps)


# Ingredients: (name, quantity, unit). Quantities cover the entire recipe.
# Cook time includes passive chilling/freezing where noted in the instructions.
RECIPES = [
    recipe("Garlic Tofu and Broccoli", "Savory vegan tofu and broccoli skillet with garlic soy sauce.", "Asian", 2, 10, 15,
           [("tofu", 400, "g"), ("broccoli", 300, "g"), ("garlic", 3, "cloves"), ("soy sauce", 2, "tbsp"), ("olive oil", 1, "tbsp")],
           ["Drain and cube the tofu; cut broccoli into florets and mince garlic.", "Heat oil in a skillet and brown tofu for 8 minutes, turning occasionally.", "Add broccoli and 3 tablespoons water; cover for 4 minutes.", "Add garlic and soy sauce; stir-fry for 2 minutes and serve."]),
    recipe("Black Bean Stuffed Peppers", "Savory vegan bell peppers filled with black beans, rice and tomato.", "Mexican-inspired", 4, 15, 35,
           [("bell pepper", 4, "whole"), ("black beans", 400, "g"), ("rice", 150, "g"), ("tomato", 2, "whole"), ("taco seasoning", 2, "tsp"), ("olive oil", 1, "tbsp")],
           ["Heat oven to 190 C / 375 F. Cook the dry rice according to its package.", "Halve and deseed peppers. Drain canned beans and dice tomatoes.", "Mix rice, beans, tomato and seasoning. Fill peppers and drizzle with oil.", "Place in a baking dish with a splash of water, cover and bake for 30 minutes; uncover for 5 minutes."]),
    recipe("Tomato Spinach Chickpea Stew", "Savory vegan chickpea stew with tomato, spinach and mild curry spices.", "Indian-inspired", 4, 10, 20,
           [("chickpeas", 500, "g"), ("tomato", 4, "whole"), ("spinach", 150, "g"), ("onion", 1, "whole"), ("garlic", 2, "cloves"), ("curry powder", 2, "tsp"), ("olive oil", 1, "tbsp")],
           ["Drain canned chickpeas. Chop onion and tomatoes; mince garlic.", "Soften onion in oil for 5 minutes, then stir in garlic and curry powder.", "Add tomatoes, chickpeas and 250 ml water; simmer for 12 minutes.", "Stir in spinach and simmer until wilted."]),
    recipe("Lime Chicken Broccoli Rice", "Savory chicken and broccoli rice bowls with fresh lime and garlic.", "American", 2, 10, 25,
           [("chicken breast", 300, "g"), ("rice", 150, "g"), ("broccoli", 250, "g"), ("lime", 1, "whole"), ("garlic", 2, "cloves"), ("olive oil", 1, "tbsp")],
           ["Cook dry rice according to its package. Cube chicken and cut broccoli into florets.", "Heat oil and cook chicken for 8 to 10 minutes; add minced garlic for the last minute.", "Add broccoli and 3 tablespoons water. Cover and cook until tender and chicken reaches 74 C / 165 F.", "Serve over rice with lime juice."]),
    recipe("Baked Salmon with Tomato Spinach", "Savory baked salmon with juicy tomatoes and wilted spinach.", "Mediterranean-inspired", 2, 10, 18,
           [("salmon", 300, "g"), ("tomato", 2, "whole"), ("spinach", 150, "g"), ("garlic", 2, "cloves"), ("olive oil", 1, "tbsp"), ("black pepper", 0.25, "tsp")],
           ["Heat oven to 200 C / 400 F. Slice tomatoes and mince garlic.", "Place salmon and tomatoes in a baking dish; coat with oil, garlic and pepper.", "Bake for 12 to 18 minutes until salmon reaches 63 C / 145 F.", "Wilt spinach in a pan with a splash of water and serve with salmon and tomatoes."]),
    recipe("Spinach Tomato Egg Skillet", "Savory vegetarian eggs gently cooked in a garlic tomato and spinach sauce.", "Mediterranean-inspired", 2, 10, 20,
           [("egg", 4, "whole"), ("tomato", 4, "whole"), ("spinach", 100, "g"), ("onion", 1, "whole"), ("garlic", 2, "cloves"), ("olive oil", 1, "tbsp")],
           ["Dice onion and tomatoes; mince garlic.", "Soften onion in oil for 5 minutes. Add garlic and tomatoes and simmer for 8 minutes.", "Stir in spinach, then make four wells and crack an egg into each.", "Cover and cook gently until the egg whites and yolks are set."]),
    recipe("Cinnamon Baked Apples", "Sweet vegan baked apple dessert with cinnamon and a light sugar syrup.", "American", 4, 10, 30,
           [("apple", 4, "whole"), ("cinnamon", 1, "tsp"), ("sugar", 2, "tbsp")],
           ["Heat oven to 190 C / 375 F. Core and slice apples into wedges.", "Place apples in a baking dish with sugar, cinnamon and 4 tablespoons water.", "Cover and bake for 20 minutes; uncover and bake for 10 minutes until tender."]),
    recipe("Banana Oat Cookies", "Sweet soft vegan banana and rolled oat cookies with cinnamon.", "American", 4, 10, 18,
           [("banana", 2, "whole"), ("rolled oats", 100, "g"), ("cinnamon", 0.5, "tsp")],
           ["Heat oven to 180 C / 350 F and line a baking tray with parchment.", "Mash ripe bananas and mix with oats and cinnamon; rest for 5 minutes.", "Shape into 8 flattened cookies. Bake for 15 to 18 minutes and cool before serving."]),
    recipe("Strawberry Chia Pudding", "Sweet vegan strawberry chia dessert made with plain coconut milk; chill for four hours.", "International", 2, 10, 240,
           [("strawberry", 200, "g"), ("chia seeds", 40, "g"), ("plain coconut milk", 250, "ml"), ("sugar", 1, "tbsp")],
           ["Mash half the strawberries with sugar and stir in coconut milk and chia seeds.", "Let stand 10 minutes, stir again, then refrigerate covered for at least 4 hours.", "Divide into two bowls and top with the remaining sliced strawberries."]),
    recipe("Cocoa Banana Frozen Dessert", "Sweet vegan frozen banana and unsweetened cocoa treat with no dairy; includes freezing time.", "International", 2, 10, 180,
           [("banana", 3, "whole"), ("unsweetened cocoa powder", 2, "tbsp")],
           ["Peel and slice ripe bananas, spread on a lined tray and freeze for at least 3 hours.", "Blend frozen bananas and cocoa in a food processor, scraping down the sides as needed.", "Add water one tablespoon at a time only if needed to blend; serve immediately."]),
    recipe("Vanilla Strawberry Yogurt Cups", "Sweet vegetarian dessert cups with plain yogurt, fresh strawberry and vanilla.", "International", 2, 10, 0,
           [("plain yogurt", 300, "g"), ("strawberry", 200, "g"), ("sugar", 1, "tbsp"), ("vanilla extract", 0.5, "tsp")],
           ["Wash and slice strawberries. Mix half with sugar and mash lightly.", "Stir vanilla into plain yogurt.", "Layer yogurt and mashed strawberries in two cups and top with the remaining fruit. Refrigerate until serving."]),
    recipe("Coconut Cinnamon Rice Pudding", "Sweet vegan rice pudding with plain coconut milk and cinnamon.", "International", 4, 5, 30,
           [("rice", 100, "g"), ("plain coconut milk", 400, "ml"), ("sugar", 3, "tbsp"), ("cinnamon", 0.5, "tsp"), ("vanilla extract", 1, "tsp")],
           ["Combine dry rice, coconut milk and 250 ml water in a saucepan and bring to a gentle simmer.", "Cook over low heat for 25 to 30 minutes, stirring often, until rice is tender; add water if needed.", "Stir in sugar, cinnamon and vanilla. Divide into four bowls and serve warm."]),
]


def seed_one(conn, item, create_embedding, model, dimensions):
    """One transaction per recipe; failed embedding leaves no partial new recipe."""
    recipe_id = uuid5(NAMESPACE_URL, f"kitchenos/catalog-expansion/{item['title']}")
    with conn.transaction(), conn.cursor() as cur:
        cur.execute("""
            INSERT INTO recipes (id, owner_id, title, description, source, cuisine,
                                 servings, prep_time_minutes, cook_time_minutes)
            VALUES (%s, NULL, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING RETURNING id
        """, (recipe_id, item["title"], item["description"], SOURCE,
              item["cuisine"], item["servings"], item["prep"], item["cook"]))
        inserted = cur.fetchone() is not None
        cur.execute("SELECT id, owner_id, source, description, cuisine FROM recipes WHERE title = %s", (item["title"],))
        row = cur.fetchone()
        if not row or row[0] != recipe_id or row[1] is not None or row[2] != SOURCE:
            return "skipped (existing recipe belongs to another source)"
        if inserted:
            for name, quantity, unit in item["ingredients"]:
                cur.execute("INSERT INTO ingredients (name) VALUES (%s) ON CONFLICT (name) DO NOTHING", (name,))
                cur.execute("""INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
                               SELECT %s, id, %s, %s FROM ingredients WHERE name = %s""",
                            (recipe_id, quantity, unit, name))
            for number, instruction in enumerate(item["steps"], 1):
                cur.execute("INSERT INTO recipe_instructions (recipe_id, step_number, instruction) VALUES (%s, %s, %s)",
                            (recipe_id, number, instruction))

        # Match embedding_service.build_recipe_embedding_text, using this transaction.
        cur.execute("""SELECT i.name FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id
                       WHERE ri.recipe_id = %s ORDER BY i.name""", (recipe_id,))
        names = [r[0] for r in cur.fetchall()]
        parts = [f"Title: {item['title']}"]
        if row[4]:
            parts.append(f"Cuisine: {row[4]}")
        if row[3]:
            parts.append(f"Description: {row[3]}")
        if names:
            parts.append(f"Ingredients: {', '.join(names)}")
        embedding_text = "\n".join(parts)
        cur.execute("""SELECT embedding_text, model_name, vector_dims(embedding)
                       FROM recipe_embeddings WHERE recipe_id = %s""", (recipe_id,))
        if cur.fetchone() == (embedding_text, model, dimensions):
            return "skipped (embedding current)"
        vector = create_embedding(embedding_text)
        if len(vector) != dimensions or not all(math.isfinite(v) for v in vector) or not any(vector):
            raise ValueError(f"Expected a finite, nonzero {dimensions}-dimensional embedding")
        cur.execute("""
            INSERT INTO recipe_embeddings (recipe_id, embedding, embedding_text, model_name)
            VALUES (%s, %s::vector, %s, %s)
            ON CONFLICT (recipe_id) DO UPDATE SET embedding = EXCLUDED.embedding,
                embedding_text = EXCLUDED.embedding_text, model_name = EXCLUDED.model_name, updated_at = NOW()
        """, (recipe_id, "[" + ",".join(map(str, vector)) + "]", embedding_text, model))
    return "added and embedded" if inserted else "embedding refreshed"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--preview", action="store_true", help="List recipes without database access or API requests.")
    args = parser.parse_args()
    if args.preview:
        for item in RECIPES:
            print(f"{item['title']} ({len(item['ingredients'])} ingredients, {item['servings']} servings)")
        print(f"{len(RECIPES)} shared recipes; no user records or saved recipes will be added.")
        return 0

    # Load .env through database.db before embedding_service constructs its client.
    from database.db import get_db_connection
    from services.embedding_service import create_embedding, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS

    failures = 0
    with get_db_connection() as conn:
        for item in RECIPES:
            try:
                result = seed_one(conn, item, create_embedding, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS)
                print(f"{item['title']}: {result}")
            except Exception as error:
                failures += 1
                print(f"{item['title']}: FAILED ({type(error).__name__}); recipe transaction rolled back", file=sys.stderr)
    print(f"Finished: {len(RECIPES) - failures} successful/skipped, {failures} failed. Rerun to retry failures.")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
